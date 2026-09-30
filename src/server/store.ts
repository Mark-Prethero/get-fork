import { assumptionFor } from "../shared/config.ts";
import { profileCopy } from "../shared/brand.ts";
import { BUILD_ID, CATALOGUE_VERSION } from "../shared/build.ts";
import { applyTwist, evaluateShow, missions, type Mission } from "../shared/evaluate.ts";
import { shows } from "../shared/shows.ts";
import type { ForkConfig, RunStatus } from "../shared/types.ts";
import { digest, safeEqual } from "./auth.ts";
import { forkConfig } from "../shared/config.ts";

export interface RunRow {
  id: string;
  experiment_id: string;
  variant_id: string;
  profile_id: string;
  mission_snapshot_json: string;
  config_version: string;
  build_id: string;
  actual_device_json: string | null;
  status: RunStatus;
  started_at: string | null;
  finished_at: string | null;
  parent_run_id: string | null;
  outcome_json: string | null;
  session_token_hash: string;
  created_at: string;
}

export interface Snapshot {
  mission: Mission;
  profile: ForkConfig["profiles"][number];
  profileCopy: { personality: string; missionText: string } | null;
  assumption: string;
  catalogue: typeof shows;
  catalogueVersion: string;
  model: string;
  buildId: string;
  question: string;
}

export async function ensureExperiment(db: D1Database, config: ForkConfig): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO experiments (id, question, config_json, version, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         question = excluded.question,
         config_json = excluded.config_json,
         version = excluded.version`,
    )
    .bind(config.id, config.question, JSON.stringify(config), BUILD_ID, now)
    .run();
}

export async function createRun(
  db: D1Database,
  config: ForkConfig,
  input: { variantId: string; profileId: string; parentRunId?: string | null; model: string; token: string },
): Promise<RunRow> {
  const profile = config.profiles.find((item) => item.id === input.profileId);
  const variant = config.variants.find((item) => item.id === input.variantId);
  if (!profile || !variant) throw new Error("Unknown profile or variant.");
  const mission = missions[profile.missionId];
  if (!mission) throw new Error("Unknown mission.");
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const snapshot: Snapshot = {
    mission,
    profile,
    profileCopy: profileCopy[profile.id] ?? null,
    assumption: assumptionFor(variant.id),
    catalogue: shows,
    catalogueVersion: CATALOGUE_VERSION,
    model: input.model,
    buildId: BUILD_ID,
    question: config.question,
  };
  const tokenHash = await digest(input.token);
  await db
    .prepare(
      `INSERT INTO runs (
        id, experiment_id, variant_id, profile_id, mission_snapshot_json, config_version,
        build_id, status, parent_run_id, session_token_hash, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?)`,
    )
    .bind(
      id,
      config.id,
      variant.id,
      profile.id,
      JSON.stringify(snapshot),
      BUILD_ID,
      BUILD_ID,
      input.parentRunId ?? null,
      tokenHash,
      now,
    )
    .run();
  const row = await getRun(db, id);
  if (!row) throw new Error("Run was not stored.");
  return row;
}

export async function getRun(db: D1Database, id: string): Promise<RunRow | null> {
  return db.prepare("SELECT * FROM runs WHERE id = ?").bind(id).first<RunRow>();
}

export async function listRuns(db: D1Database): Promise<RunRow[]> {
  const result = await db.prepare("SELECT * FROM runs ORDER BY created_at ASC").all<RunRow>();
  return result.results ?? [];
}

export async function tokenMatches(row: RunRow, token: string): Promise<boolean> {
  if (!token) return false;
  return safeEqual(await digest(token), row.session_token_hash);
}

export function snapshotOf(row: RunRow): Snapshot {
  return JSON.parse(row.mission_snapshot_json) as Snapshot;
}

export async function startRun(db: D1Database, row: RunRow, device: unknown): Promise<RunRow> {
  if (row.status === "queued") {
    await db
      .prepare("UPDATE runs SET status = 'running', started_at = ?, actual_device_json = ? WHERE id = ? AND status = 'queued'")
      .bind(new Date().toISOString(), JSON.stringify(device ?? null), row.id)
      .run();
  } else if (row.status === "running" && device) {
    await db.prepare("UPDATE runs SET actual_device_json = ? WHERE id = ?").bind(JSON.stringify(device), row.id).run();
  }
  return (await getRun(db, row.id)) ?? row;
}

export async function findEvent(db: D1Database, runId: string, clientEventId: string): Promise<string | null> {
  const existing = await db
    .prepare("SELECT id FROM events WHERE run_id = ? AND client_event_id = ?")
    .bind(runId, clientEventId)
    .first<{ id: string }>();
  return existing?.id ?? null;
}

export async function appendEvent(
  db: D1Database,
  runId: string,
  input: { clientEventId: string; type: string; payload: unknown },
): Promise<{ id: string; duplicate: boolean }> {
  const existing = await db
    .prepare("SELECT id FROM events WHERE run_id = ? AND client_event_id = ?")
    .bind(runId, input.clientEventId)
    .first<{ id: string }>();
  if (existing) return { id: existing.id, duplicate: true };
  const count = await db
    .prepare("SELECT COUNT(*) AS n FROM events WHERE run_id = ?")
    .bind(runId)
    .first<{ n: number }>();
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO events (id, run_id, client_event_id, type, payload_json, recorded_at, sequence)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, runId, input.clientEventId, input.type, JSON.stringify(input.payload ?? {}), new Date().toISOString(), (count?.n ?? 0) + 1)
    .run();
  return { id, duplicate: false };
}

export async function countEvents(db: D1Database, runId: string): Promise<number> {
  const row = await db.prepare("SELECT COUNT(*) AS n FROM events WHERE run_id = ?").bind(runId).first<{ n: number }>();
  return row?.n ?? 0;
}

export async function listEvents(db: D1Database, runId: string) {
  const result = await db
    .prepare("SELECT id, client_event_id, type, payload_json, recorded_at, sequence FROM events WHERE run_id = ? ORDER BY sequence ASC")
    .bind(runId)
    .all<{ id: string; client_event_id: string; type: string; payload_json: string; recorded_at: string; sequence: number }>();
  return (result.results ?? []).map((event) => ({
    id: event.id,
    clientEventId: event.client_event_id,
    type: event.type,
    payload: JSON.parse(event.payload_json) as unknown,
    recordedAt: event.recorded_at,
    sequence: event.sequence,
  }));
}

export async function addObservation(
  db: D1Database,
  runId: string,
  input: { trace: string; commentary: unknown },
): Promise<string> {
  const id = crypto.randomUUID();
  await db
    .prepare("INSERT INTO observations (id, run_id, trace, commentary_json, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(id, runId, input.trace, JSON.stringify(input.commentary ?? []), new Date().toISOString())
    .run();
  return id;
}

export async function listObservations(db: D1Database, runId: string) {
  const result = await db
    .prepare("SELECT id, trace, commentary_json, created_at FROM observations WHERE run_id = ? ORDER BY created_at ASC")
    .bind(runId)
    .all<{ id: string; trace: string; commentary_json: string; created_at: string }>();
  return (result.results ?? []).map((row) => ({
    id: row.id,
    trace: row.trace,
    commentary: JSON.parse(row.commentary_json) as unknown,
    createdAt: row.created_at,
  }));
}

export async function addArtifact(
  db: D1Database,
  input: { runId: string; type: string; storageReference: string; contentType: string; description: string; available: boolean },
): Promise<string> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO artifacts (id, run_id, type, storage_reference, content_type, captured_at, available, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.runId,
      input.type,
      input.storageReference,
      input.contentType,
      new Date().toISOString(),
      input.available ? 1 : 0,
      input.description,
    )
    .run();
  return id;
}

export async function listArtifacts(db: D1Database, runId: string) {
  const result = await db
    .prepare("SELECT id, type, storage_reference, content_type, captured_at, available, description FROM artifacts WHERE run_id = ? ORDER BY captured_at ASC")
    .bind(runId)
    .all<{
      id: string;
      type: string;
      storage_reference: string;
      content_type: string | null;
      captured_at: string;
      available: number;
      description: string;
    }>();
  return (result.results ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    contentType: row.content_type,
    capturedAt: row.captured_at,
    available: row.available === 1,
    description: row.description,
    url: row.available === 1 ? `/api/artifacts/${row.id}` : null,
  }));
}

export async function getArtifact(db: D1Database, id: string) {
  return db
    .prepare("SELECT id, run_id, type, storage_reference, content_type, available, description FROM artifacts WHERE id = ?")
    .bind(id)
    .first<{
      id: string;
      run_id: string;
      type: string;
      storage_reference: string;
      content_type: string | null;
      available: number;
      description: string;
    }>();
}

export interface FinishInput {
  outcome: "selected" | "blocked" | "timeout" | "error";
  showId?: string;
  stage?: "provisional" | "final";
  reason?: string;
}

export async function finishRun(db: D1Database, row: RunRow, input: FinishInput): Promise<RunRow> {
  if (row.status === "completed" || row.status === "blocked" || row.status === "timed_out" || row.status === "error" || row.status === "unsupported") {
    return row;
  }
  const snapshot = snapshotOf(row);
  const previous = row.outcome_json ? (JSON.parse(row.outcome_json) as Record<string, unknown>) : {};
  const twistRequired = Boolean(snapshot.profile.twistId && snapshot.mission.twist);
  const now = new Date().toISOString();
  const started = row.started_at ? Date.parse(row.started_at) : Number.NaN;
  const elapsedSeconds = Number.isFinite(started) ? Math.max(0, Math.round((Date.now() - started) / 1000)) : null;

  if (input.outcome === "selected" && input.stage !== "final" && twistRequired) {
    const show = snapshot.catalogue.find((item) => item.id === input.showId);
    const provisional = evaluateShow(show, snapshot.mission.constraints);
    const outcome = {
      ...previous,
      provisional: {
        showId: input.showId ?? null,
        showTitle: show?.title ?? null,
        evaluation: provisional,
      },
    };
    await db.prepare("UPDATE runs SET outcome_json = ?, status = 'running', started_at = COALESCE(started_at, ?) WHERE id = ?").bind(JSON.stringify(outcome), now, row.id).run();
    return (await getRun(db, row.id)) ?? row;
  }

  let status: RunStatus = "completed";
  if (input.outcome === "blocked") status = "blocked";
  if (input.outcome === "timeout") status = "timed_out";
  if (input.outcome === "error") status = "error";
  if (input.outcome === "selected" && elapsedSeconds !== null && elapsedSeconds > forkConfig.runBudget.maxDurationSeconds) {
    status = "timed_out";
  }

  const twistApplied = twistRequired && (input.stage === "final" || previous.provisional !== undefined);
  const constraints = applyTwist(snapshot.mission, twistApplied);
  const show = input.showId ? snapshot.catalogue.find((item) => item.id === input.showId) : undefined;
  const evaluation = input.outcome === "selected" ? evaluateShow(show, constraints) : null;
  const twistSeen = twistRequired ? twistApplied : false;
  if (evaluation && twistRequired && !twistSeen) {
    evaluation.constraints.push({
      kind: "twist-applied",
      label: "Budget twist applied",
      pass: false,
      detail: "The £50 revision was not applied before the final choice.",
    });
    evaluation.passed = false;
  }
  const outcome = {
    ...previous,
    final: {
      outcome: input.outcome,
      showId: show?.id ?? null,
      showTitle: show?.title ?? null,
      reason: input.reason ?? null,
      evaluation,
      twistApplied: twistRequired ? twistApplied : false,
      agentTimingSeconds: elapsedSeconds,
      timingLabel: "Agent timing",
    },
  };
  await db
    .prepare("UPDATE runs SET status = ?, finished_at = ?, outcome_json = ?, started_at = COALESCE(started_at, ?) WHERE id = ?")
    .bind(status, now, JSON.stringify(outcome), now, row.id)
    .run();
  return (await getRun(db, row.id)) ?? row;
}

export async function listDecisions(db: D1Database) {
  const result = await db
    .prepare("SELECT id, experiment_id, action, selected_variant_id, rationale, evidence_snapshot_json, created_at FROM decisions ORDER BY created_at ASC")
    .all<{
      id: string;
      experiment_id: string;
      action: string;
      selected_variant_id: string | null;
      rationale: string;
      evidence_snapshot_json: string;
      created_at: string;
    }>();
  return result.results ?? [];
}

export async function createDecision(
  db: D1Database,
  input: { experimentId: string; action: string; variantId: string | null; rationale: string; snapshot: unknown },
): Promise<string> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO decisions (id, experiment_id, action, selected_variant_id, rationale, evidence_snapshot_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, input.experimentId, input.action, input.variantId, input.rationale, JSON.stringify(input.snapshot), new Date().toISOString())
    .run();
  return id;
}

export async function readMeta(db: D1Database, key: string): Promise<string | null> {
  const row = await db.prepare("SELECT value FROM meta WHERE key = ?").bind(key).first<{ value: string }>();
  return row?.value ?? null;
}

export async function writeMeta(db: D1Database, key: string, value: string): Promise<void> {
  await db.prepare("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(key, value).run();
}
