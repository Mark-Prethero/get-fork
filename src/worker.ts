import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { showSearch } from "./config/show-search.ts";
import { bearer, isAdmin, isBot, newToken } from "./server/auth.ts";
import { askCatalogue, boundMessages, type AskMessage } from "./server/ask.ts";
import {
  addArtifact,
  addObservation,
  appendEvent,
  countEvents,
  createDecision,
  findEvent,
  createRun,
  ensureExperiment,
  finishRun,
  getArtifact,
  getRun,
  listArtifacts,
  listDecisions,
  listEvents,
  listObservations,
  listRuns,
  readMeta,
  snapshotOf,
  startRun,
  tokenMatches,
  writeMeta,
  type RunRow,
} from "./server/store.ts";
import { BUILD_ID } from "./shared/build.ts";
import { brand } from "./shared/brand.ts";
import { assumptionFor, forkConfig, validateConfig } from "./shared/config.ts";
import { fallbackDeviceLabel } from "./shared/device.ts";
import { shows } from "./shared/shows.ts";
import type { DecisionAction } from "./shared/types.ts";

type Env = WorkerBindings;

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", bodyLimit({ maxSize: 5_100_000, onError: (c) => c.json({ error: "Request is too large." }, 413) }));

app.use("/api/*", async (c, next) => {
  const problems = validateConfig(forkConfig);
  if (problems.length > 0) return c.json({ error: problems.join(" ") }, 500);
  await ensureExperiment(c.env.DB, forkConfig);
  await next();
});

app.onError((error, c) => {
  console.log(JSON.stringify({ message: error.message }));
  return c.json({ error: "The request failed." }, 500);
});

app.get("/api/health", (c) => c.json({ ok: true, buildId: BUILD_ID }));

app.get("/api/config", async (c) => {
  const adopted = await readAdoption(c.env.DB);
  return c.json({
    ...forkConfig,
    buildId: BUILD_ID,
    brand,
    assumptions: Object.fromEntries(forkConfig.variants.map((variant) => [variant.id, assumptionFor(variant.id)])),
    shows,
    askAvailable: Boolean(c.env.XAI_API_KEY),
    model: c.env.GROK_MODEL || "grok-4.20-0309-non-reasoning",
    adopted,
  });
});

app.get("/api/results", async (c) => c.json(await resultsPayload(c.env.DB)));

app.post("/api/runs", async (c) => {
  if (!(await isAdmin(c.req.raw, c.env.ADMIN_KEY))) return c.json({ error: "Admin authentication is required." }, 401);
  const body = await readJson<{ variantId?: string; profileId?: string; parentRunId?: string }>(c);
  if (!body?.variantId || !body.profileId) return c.json({ error: "variantId and profileId are required." }, 400);
  try {
    const token = newToken();
    const row = await createRun(c.env.DB, forkConfig, {
      variantId: body.variantId,
      profileId: body.profileId,
      parentRunId: body.parentRunId,
      model: c.env.GROK_MODEL || "grok-4.20-0309-non-reasoning",
      token,
    });
    return c.json({ run: publicRun(row), token, prompt: dispatchPrompt(c.env, row, token) });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Could not create the run." }, 400);
  }
});

app.post("/api/queue", async (c) => {
  if (!(await isAdmin(c.req.raw, c.env.ADMIN_KEY))) return c.json({ error: "Admin authentication is required." }, 401);
  const body = await readJson<{ retryErrors?: boolean }>(c);
  const existing = await listRuns(c.env.DB);
  const created = [];
  for (const required of forkConfig.requiredRuns) {
    const found = existing.filter((run) => run.profile_id === required.profileId && run.variant_id === required.variantId).at(-1);
    if (found && !(body?.retryErrors === true && ["error", "blocked", "timed_out"].includes(found.status))) {
      created.push({ run: publicRun(found), token: null, prompt: null, existing: true });
      continue;
    }
    const token = newToken();
    const row = await createRun(c.env.DB, forkConfig, {
      ...required,
      parentRunId: found?.id ?? null,
      model: c.env.GROK_MODEL || "grok-4.20-0309-non-reasoning",
      token,
    });
    created.push({ run: publicRun(row), token, prompt: dispatchPrompt(c.env, row, token), existing: false });
  }
  return c.json({ runs: created });
});

app.get("/api/runs/:id/card", async (c) => {
  const row = await getRun(c.env.DB, c.req.param("id"));
  if (!row) return c.json({ error: "Run not found." }, 404);
  return c.json(cardFor(row));
});

app.get("/api/runs/:id", async (c) => {
  const row = await getRun(c.env.DB, c.req.param("id"));
  if (!row) return c.json({ error: "Run not found." }, 404);
  if (!isTerminal(row.status) && !(await canReadRun(c, row))) return c.json({ error: "Run authentication is required." }, 401);
  return c.json(await fullRun(c.env.DB, row));
});

app.post("/api/runs/:id/start", async (c) => {
  const row = await getRun(c.env.DB, c.req.param("id"));
  if (!row) return c.json({ error: "Run not found." }, 404);
  if (!(await tokenMatches(row, bearer(c.req.raw)))) return c.json({ error: "Run authentication is required." }, 401);
  if (isTerminal(row.status)) return c.json(await fullRun(c.env.DB, row));
  const body = await readJson<{ device?: unknown }>(c);
  const next = await startRun(c.env.DB, row, body?.device ?? null);
  return c.json(await fullRun(c.env.DB, next));
});

app.post("/api/runs/:id/events", async (c) => {
  const row = await getRun(c.env.DB, c.req.param("id"));
  if (!row) return c.json({ error: "Run not found." }, 404);
  if (!(await tokenMatches(row, bearer(c.req.raw)))) return c.json({ error: "Run authentication is required." }, 401);
  if (isTerminal(row.status)) return c.json({ error: "This run is already finished." }, 409);
  const body = await readJson<{ clientEventId?: string; type?: string; payload?: unknown }>(c);
  if (typeof body?.clientEventId !== "string" || typeof body.type !== "string" || !body.clientEventId || !body.type) return c.json({ error: "clientEventId and type are required." }, 400);
  if (body.clientEventId.length > 80 || body.type.length > 40) return c.json({ error: "Event fields are too long." }, 400);
  const payload = JSON.stringify(body.payload ?? {});
  if (payload.length > 4000) return c.json({ error: "Event payload is too large." }, 400);
  const count = await countEvents(c.env.DB, row.id);
  if (count >= forkConfig.runBudget.maxActions) {
    const existing = await findEvent(c.env.DB, row.id, body.clientEventId);
    if (existing) return c.json({ ok: true, duplicate: true, id: existing });
    return c.json({ error: "This run has reached its action budget.", code: "budget" }, 409);
  }
  const saved = await appendEvent(c.env.DB, row.id, { clientEventId: body.clientEventId, type: body.type, payload: body.payload });
  if (saved.budget) return c.json({ error: "This run has reached its action budget.", code: "budget" }, 409);
  return c.json({ ok: true, id: saved.id, duplicate: saved.duplicate });
});

app.post("/api/runs/:id/observations", async (c) => {
  const row = await getRun(c.env.DB, c.req.param("id"));
  if (!row) return c.json({ error: "Run not found." }, 404);
  if (!(await canReport(c, row))) return c.json({ error: "Reporting authentication is required." }, 401);
  const body = await readJson<{ trace?: string; commentary?: Array<{ text?: string; eventId?: string }> }>(c);
  const trace = String(body?.trace ?? "").trim().slice(0, 4000);
  if (!trace) return c.json({ error: "A factual trace is required." }, 400);
  const commentary = (Array.isArray(body?.commentary) ? body.commentary : [])
    .slice(0, 2)
    .filter((item) => item && typeof item === "object")
    .map((item) => ({ text: String(item.text ?? "").slice(0, 240), eventId: item.eventId ? String(item.eventId).slice(0, 80) : null }))
    .filter((item) => item.text);
  const id = await addObservation(c.env.DB, row.id, { trace, commentary });
  return c.json({ ok: true, id });
});

app.post("/api/runs/:id/finish", async (c) => {
  const row = await getRun(c.env.DB, c.req.param("id"));
  if (!row) return c.json({ error: "Run not found." }, 404);
  if (!(await tokenMatches(row, bearer(c.req.raw)))) return c.json({ error: "Run authentication is required." }, 401);
  const body = await readJson<{ outcome?: "selected" | "blocked" | "timeout" | "error"; showId?: string; stage?: "provisional" | "final"; reason?: string }>(c);
  if (!body?.outcome || !["selected", "blocked", "timeout", "error"].includes(body.outcome ?? "")) return c.json({ error: "Invalid outcome." }, 400);
  if (body.stage && !["provisional", "final"].includes(body.stage)) return c.json({ error: "Invalid stage." }, 400);
  if (body.reason !== undefined && typeof body.reason !== "string") return c.json({ error: "Invalid reason." }, 400);
  if (row.status === "queued") return c.json({ error: "Start the run before finishing it." }, 409);
  if (body.outcome === "selected" && !snapshotOf(row).catalogue.some((show) => show.id === body.showId)) return c.json({ error: "Unknown show." }, 400);
  const next = await finishRun(c.env.DB, row, {
    outcome: body.outcome,
    showId: body.showId,
    stage: body.stage,
    reason: body.reason?.slice(0, 400),
  });
  return c.json(await fullRun(c.env.DB, next));
});

app.post("/api/runs/:id/artifacts", async (c) => {
  const row = await getRun(c.env.DB, c.req.param("id"));
  if (!row) return c.json({ error: "Run not found." }, 404);
  if (!(await canReport(c, row))) return c.json({ error: "Reporting authentication is required." }, 401);
  const form = await c.req.formData();
  const file = form.get("file");
  const description = String(form.get("description") ?? "Screenshot").slice(0, 240);
  const type = String(form.get("type") ?? "screenshot").slice(0, 40);
  if (!(file instanceof File)) return c.json({ error: "An image file is required." }, 400);
  if (file.size > 5_000_000) return c.json({ error: "Images must be 5MB or smaller." }, 400);
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    return c.json({ error: "Use a PNG, JPEG, or WebP screenshot." }, 400);
  }
  const existing = await listArtifacts(c.env.DB, row.id);
  if (existing.length >= 12) return c.json({ error: "This run already has 12 artifacts." }, 409);
  const id = crypto.randomUUID();
  const key = `runs/${row.id}/${id}`;
  await c.env.EVIDENCE.put(key, await file.arrayBuffer(), { metadata: { contentType: file.type } });
  await addArtifact(c.env.DB, {
    runId: row.id,
    type,
    storageReference: key,
    contentType: file.type,
    description,
    available: true,
  });
  const stored = await listArtifacts(c.env.DB, row.id);
  const artifact = stored.find((item) => item.description === description && item.url);
  return c.json({ ok: true, artifact: stored[stored.length - 1] ?? artifact });
});

app.get("/api/artifacts/:id", async (c) => {
  const row = await getArtifact(c.env.DB, c.req.param("id"));
  if (!row || row.available !== 1) return c.json({ error: "Artifact not captured." }, 404);
  if (row.storage_reference.startsWith("asset:")) {
    return c.env.ASSETS.fetch(new Request(new URL(row.storage_reference.slice(6), c.req.url)));
  }
  const object = await c.env.EVIDENCE.get(row.storage_reference, "arrayBuffer");
  if (!object) return c.json({ error: "Artifact not captured." }, 404);
  return new Response(object, {
    headers: {
      "content-type": row.content_type ?? "application/octet-stream",
      "cache-control": "public, max-age=3600",
    },
  });
});

app.post("/api/ask", async (c) => {
  const body = await readJson<{ messages?: AskMessage[]; runId?: string }>(c);
  const bounded = boundMessages(body?.messages ?? []);
  if ("error" in bounded) return c.json({ error: bounded.error }, 400);
  if (!c.env.XAI_API_KEY) return c.json({ error: "Ask is unavailable. XAI_API_KEY is not configured.", code: "ask-unconfigured" }, 503);
  let runId: string | null = null;
  if (body?.runId) {
    const row = await getRun(c.env.DB, body.runId);
    if (!row) return c.json({ error: "Run not found." }, 404);
    if (!(await tokenMatches(row, bearer(c.req.raw)))) return c.json({ error: "Run authentication is required." }, 401);
    if (row.status !== "running") return c.json({ error: "Ask requires an active run." }, 409);
    runId = row.id;
  }
  const callId = await reserveCall(c.env, runId);
  if (!callId) return c.json({ error: "Ask has reached its call or rate budget. Try later or ask the operator to review the budget.", code: "ask-budget" }, 429);
  const result = await askCatalogue(c.env, bounded.messages);
  await c.env.DB.prepare(
    "UPDATE chat_calls SET model = ?, prompt_tokens = ?, completion_tokens = ?, latency_ms = ?, status = ?, error = ? WHERE id = ?",
  ).bind(result.model, result.ok ? result.usage.promptTokens : null, result.ok ? result.usage.completionTokens : null,
    result.latencyMs, result.ok ? "ok" : result.code, result.ok ? null : result.error, callId).run();
  if (!result.ok) return c.json({ error: result.error, code: result.code, model: result.model, latencyMs: result.latencyMs }, result.status as 422);
  return c.json(result);
});

app.post("/api/explain", async (c) => {
  if (!(await isAdmin(c.req.raw, c.env.ADMIN_KEY))) return c.json({ error: "Admin authentication is required." }, 401);
  const snapshot = await resultsPayload(c.env.DB);
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(snapshot.cells)));
  const snapshotHash = [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const cached = await c.env.DB.prepare("SELECT text, model, created_at FROM syntheses WHERE snapshot_hash = ?").bind(snapshotHash).first<{
    text: string;
    model: string | null;
    created_at: string;
  }>();
  if (cached) return c.json({ ok: true, text: cached.text, model: cached.model, cached: true, createdAt: cached.created_at });
  if (!c.env.XAI_API_KEY) {
    return c.json({ ok: false, error: "Synthesis is unavailable. XAI_API_KEY is not configured. Constraint receipts are unchanged." }, 503);
  }
  const callId = await reserveCall(c.env, null);
  if (!callId) return c.json({ error: "The model call budget is exhausted." }, 429);
  const prompt = synthesisPrompt(snapshot);
  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${c.env.XAI_API_KEY}`, "content-type": "application/json" },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        model: c.env.GROK_MODEL || "grok-4.20-0309-non-reasoning",
        temperature: 0.2,
        ...(c.env.GROK_MODEL.includes("non-reasoning") ? {} : { reasoning_effort: "low" }),
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: JSON.stringify(snapshot.cells) },
        ],
      }),
    });
    if (!response.ok) {
      return c.json({ ok: false, error: "Synthesis failed. Constraint receipts are unchanged." }, 502);
    }
    const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = String(body.choices?.[0]?.message?.content ?? "").trim();
    if (!text) return c.json({ ok: false, error: "Synthesis returned nothing. Constraint receipts are unchanged." }, 502);
    await c.env.DB.prepare("INSERT INTO syntheses (snapshot_hash, text, created_at, model) VALUES (?, ?, ?, ?)").bind(
      snapshotHash,
      text,
      new Date().toISOString(),
      c.env.GROK_MODEL || "grok-4.20-0309-non-reasoning",
    ).run();
    return c.json({ ok: true, text, model: c.env.GROK_MODEL || "grok-4.20-0309-non-reasoning", cached: false });
  } catch {
    return c.json({ ok: false, error: "Synthesis failed. Constraint receipts are unchanged." }, 502);
  }
});

app.post("/api/decisions", async (c) => {
  if (!(await isAdmin(c.req.raw, c.env.ADMIN_KEY))) return c.json({ error: "Admin authentication is required." }, 401);
  const body = await readJson<{ action?: DecisionAction; variantId?: string; rationale?: string; runIds?: string[] }>(c);
  if (!body?.action || !["choose", "revise", "defer"].includes(body.action)) return c.json({ error: "action must be choose, revise, or defer." }, 400);
  if (typeof body.rationale !== "string" || !body.rationale.trim()) return c.json({ error: "A rationale is required." }, 400);
  if (body.action === "choose" && !body.variantId) return c.json({ error: "Choosing requires a variant." }, 400);
  if (body.variantId && !forkConfig.variants.some((variant) => variant.id === body.variantId)) {
    return c.json({ error: "Unknown variant." }, 400);
  }
  const snapshot = await resultsPayload(c.env.DB);
  const id = await createDecision(c.env.DB, {
    experimentId: forkConfig.id,
    action: body.action,
    variantId: body.action === "choose" ? body.variantId ?? null : body.variantId ?? null,
    rationale: body.rationale.trim().slice(0, 2000),
    snapshot: { ...snapshot, referencedRunIds: body.runIds ?? [] },
  });
  return c.json({ ok: true, id });
});

app.post("/api/adopt", async (c) => {
  if (!(await isAdmin(c.req.raw, c.env.ADMIN_KEY))) return c.json({ error: "Admin authentication is required." }, 401);
  const body = await readJson<{ decisionId?: string; variantId?: string }>(c);
  if (!body?.decisionId || !body.variantId) return c.json({ error: "decisionId and variantId are required." }, 400);
  const decisions = await listDecisions(c.env.DB);
  const decision = decisions.find((item) => item.id === body.decisionId);
  if (!decision) return c.json({ error: "Decision not found." }, 404);
  if (decision.action !== "choose" || decision.selected_variant_id !== body.variantId) {
    return c.json({ error: "Adoption requires a choose decision for that variant." }, 400);
  }
  await writeMeta(c.env.DB, "adopted", JSON.stringify({ variantId: body.variantId, decisionId: body.decisionId, at: new Date().toISOString() }));
  return c.json({ ok: true, adopted: await readAdoption(c.env.DB) });
});

app.get("/api/decisions", async (c) => {
  const decisions = await listDecisions(c.env.DB);
  return c.json({
    decisions: decisions.map((decision) => ({
      id: decision.id,
      action: decision.action,
      variantId: decision.selected_variant_id,
      rationale: decision.rationale,
      createdAt: decision.created_at,
    })),
    adopted: await readAdoption(c.env.DB),
  });
});


app.get("/api/decisions/:id", async (c) => {
  const decision = (await listDecisions(c.env.DB)).find((item) => item.id === c.req.param("id"));
  if (!decision) return c.json({ error: "Decision not found." }, 404);
  return c.json({ id: decision.id, action: decision.action, variantId: decision.selected_variant_id,
    rationale: decision.rationale, createdAt: decision.created_at, snapshot: JSON.parse(decision.evidence_snapshot_json) });
});

async function reserveCall(env: Env, runId: string | null): Promise<string | null> {
  const configured = Number(env.ASK_CALL_BUDGET || "40");
  const budget = Number.isFinite(configured) ? Math.max(0, Math.floor(configured)) : 40;
  const id = crypto.randomUUID();
  // Reserving before fetch makes concurrent requests share the same hard budget.
  // Failed or timed-out upstream attempts still consume a reservation.
  const result = await env.DB.prepare(`INSERT INTO chat_calls (id, created_at, run_id, model, status)
    SELECT ?, ?, ?, ?, 'pending'
    WHERE (SELECT COUNT(*) FROM chat_calls) < ?
      AND (SELECT COUNT(*) FROM chat_calls WHERE created_at > ?) < 12
      AND (? IS NULL OR (SELECT COUNT(*) FROM chat_calls WHERE run_id = ?) < ?)`)
    .bind(id, new Date().toISOString(), runId, env.GROK_MODEL, budget,
      new Date(Date.now() - 60_000).toISOString(), runId, runId, forkConfig.runBudget.maxChatTurns).run();
  return result.meta.changes === 1 ? id : null;
}

function dispatchPrompt(env: Env, row: RunRow, token: string): string {
  const card = cardFor(row);
  const base = (env.PUBLIC_BASE_URL || "http://127.0.0.1:8787").replace(/\/$/, "");
  return [
    "You are Grok Bot running one Fork investigation on your computer.",
    `Question: ${card.question}`,
    `Approach: ${card.variantName}. Assumption: ${card.assumption}`,
    `Profile: ${card.profileName}. ${card.personality}`,
    `Mission: ${card.missionText}`,
    `Device: ${card.deviceLabel}. Target viewport ${card.viewport.width}×${card.viewport.height}. Text scale ${card.textScale}.`,
    `Open ${base}/run/${row.id}`,
    "The address bar must stay free of secrets. When the page asks for the run session, enter this token and click Start:",
    token,
    "Use only the visible interface. Do not open source code, hidden evaluation data, or backend shortcuts.",
    "Capture the initial screen, any noteworthy friction, and the final screen.",
    "Keep a short factual trace. Add at most two remarks, each tied to something that actually happened.",
    `Stop at a choice, a blocker, or the budget of ${forkConfig.runBudget.maxActions} actions and ${forkConfig.runBudget.maxDurationSeconds} seconds.`,
    "Submit the trace from the run page. Let the server judge the selected show.",
    card.twist ? `This mission includes a twist after the first choice: ${card.twist.prompt}` : "This mission has no twist.",
  ].join("\n");
}

function publicRun(row: RunRow) {
  const card = cardFor(row);
  return {
    id: row.id,
    status: row.status,
    variantId: card.variantId,
    variantName: card.variantName,
    profileId: card.profileId,
    profileName: card.profileName,
  };
}

function cardFor(row: RunRow) {
  const snapshot = snapshotOf(row);
  const variant = forkConfig.variants.find((item) => item.id === row.variant_id);
  return {
    id: row.id,
    question: snapshot.question,
    variantId: row.variant_id,
    variantName: variant?.name ?? row.variant_id,
    assumption: snapshot.assumption,
    profileId: row.profile_id,
    profileName: snapshot.profile.name,
    personality: snapshot.profileCopy?.personality ?? "",
    missionText: snapshot.profileCopy?.missionText ?? snapshot.mission.title,
    viewport: snapshot.profile.viewport,
    textScale: snapshot.profile.textScale,
    deviceMode: snapshot.profile.deviceMode,
    deviceLabel: fallbackDeviceLabel(snapshot.profile),
    twist: snapshot.profile.twistId ? snapshot.mission.twist ?? null : null,
    status: row.status,
    buildId: row.build_id,
    evidenceLabel: forkConfig.evidenceLabel,
  };
}

async function fullRun(db: D1Database, row: RunRow) {
  return {
    ...cardFor(row),
    snapshot: snapshotOf(row),
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    parentRunId: row.parent_run_id,
    device: row.actual_device_json ? JSON.parse(row.actual_device_json) : null,
    outcome: row.outcome_json ? JSON.parse(row.outcome_json) : null,
    events: await listEvents(db, row.id),
    observations: await listObservations(db, row.id),
    artifacts: await listArtifacts(db, row.id),
  };
}

async function canReadRun(c: { req: { raw: Request }; env: Env }, row: RunRow): Promise<boolean> {
  if (await tokenMatches(row, bearer(c.req.raw))) return true;
  if (await isAdmin(c.req.raw, c.env.ADMIN_KEY)) return true;
  return isBot(c.req.raw, c.env.BOT_INGEST_KEY);
}

async function canReport(c: { req: { raw: Request }; env: Env }, row: RunRow): Promise<boolean> {
  return canReadRun(c, row);
}

function isTerminal(status: string): boolean {
  return ["completed", "blocked", "timed_out", "error", "unsupported"].includes(status);
}

async function resultsPayload(db: D1Database) {
  const runs = await listRuns(db);
  const cells = [];
  for (const profile of forkConfig.profiles) {
    for (const variant of forkConfig.variants) {
      const matches = runs.filter((run) => run.profile_id === profile.id && run.variant_id === variant.id);
      const latest = matches[matches.length - 1];
      const required = forkConfig.requiredRuns.some((item) => item.profileId === profile.id && item.variantId === variant.id);
      if (!latest) {
        cells.push({ profileId: profile.id, variantId: variant.id, status: "not-run", required, runId: null });
        continue;
      }
      const outcome = latest.outcome_json ? (JSON.parse(latest.outcome_json) as { final?: { evaluation?: { passed?: boolean }; showTitle?: string; agentTimingSeconds?: number }; provisional?: { showTitle?: string } }) : null;
      const artifacts = await listArtifacts(db, latest.id);
      const device = latest.actual_device_json ? (JSON.parse(latest.actual_device_json) as { label?: string }) : null;
      cells.push({
        profileId: profile.id,
        variantId: variant.id,
        required,
        runId: latest.id,
        status: latest.status,
        buildId: latest.build_id,
        missionPassed: outcome?.final?.evaluation?.passed ?? null,
        showTitle: outcome?.final?.showTitle ?? outcome?.provisional?.showTitle ?? null,
        agentTimingSeconds: outcome?.final?.agentTimingSeconds ?? null,
        timingLabel: outcome?.final ? "Agent timing" : null,
        deviceLabel: device?.label ?? null,
        artifactUrl: artifacts.find((artifact) => artifact.available && artifact.url)?.url ?? null,
        attemptCount: matches.length,
      });
    }
  }
  const decisions = await listDecisions(db);
  return {
    question: forkConfig.question,
    evidenceLabel: forkConfig.evidenceLabel,
    buildId: BUILD_ID,
    variants: forkConfig.variants.map((variant) => ({ ...variant, assumption: assumptionFor(variant.id) })),
    profiles: forkConfig.profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      deviceMode: profile.deviceMode,
      deviceLabel: fallbackDeviceLabel(profile),
      stretch: profile.id === "organiser",
    })),
    cells,
    decisions: decisions.map((decision) => ({
      id: decision.id,
      action: decision.action,
      variantId: decision.selected_variant_id,
      rationale: decision.rationale,
      createdAt: decision.created_at,
    })),
    adopted: await readAdoption(db),
  };
}

async function readAdoption(db: D1Database): Promise<{ variantId: string; decisionId: string; at: string } | null> {
  const raw = await readMeta(db, "adopted");
  if (!raw) return showSearch.variantId && showSearch.decisionId ? { variantId: showSearch.variantId, decisionId: showSearch.decisionId, at: "repository" } : null;
  return JSON.parse(raw) as { variantId: string; decisionId: string; at: string };
}

function synthesisPrompt(snapshot: { question: string; evidenceLabel: string }): string {
  return [
    "Compare only the supplied run evidence.",
    `Question: ${snapshot.question}`,
    "Cite run ids for factual claims.",
    "Distinguish explicit-constraint outcomes from subjective interpretation and missing evidence.",
    "Describe trade-offs by mission. Do not invent a universal winner, customer preferences, conversion effects, age-based behaviours, or commercial uplift.",
    "End with what these agent walkthroughs cannot establish and one useful next investigation.",
    "Keep the main summary under 120 words.",
    snapshot.evidenceLabel,
  ].join(" ");
}

async function readJson<T>(c: { req: { json: () => Promise<T> } }): Promise<T | null> {
  try {
    const value = await c.req.json();
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

export default app;
