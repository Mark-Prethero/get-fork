import type { Show } from "@shared/shows.ts";
import { api, runToken, saveRunToken } from "./api.ts";
import { mountExplore } from "./explore.ts";
import { esc, shell } from "./render.ts";

interface Card {
  id: string;
  question: string;
  variantId: "browse" | "ask" | "guide";
  variantName: string;
  assumption: string;
  profileName: string;
  personality: string;
  missionText: string;
  viewport: { width: number; height: number };
  textScale: number;
  deviceMode: "desktop" | "mobile-emulation";
  deviceLabel: string;
  twist: { prompt: string } | null;
  status: string;
  buildId: string;
  evidenceLabel: string;
}

interface FullRun extends Card {
  device: { label?: string } | null;
  outcome: {
    provisional?: { showTitle: string | null; evaluation: { passed: boolean } };
    final?: {
      showTitle: string | null;
      reason: string | null;
      evaluation: { passed: boolean; constraints: Array<{ label: string; pass: boolean; detail: string }> } | null;
      agentTimingSeconds: number | null;
      timingLabel: string;
      twistApplied: boolean;
    };
  } | null;
  observations: Array<{ trace: string; commentary: Array<{ text: string }> }>;
}

export async function renderRun(root: HTMLElement, runId: string): Promise<void> {
  const card = await api<Card>(`/api/runs/${runId}/card`);
  const token = runToken(runId);
  if (!token) {
    root.innerHTML = shell("", missionCard(card, `
      <form class="form" data-token-form>
        <label for="token">Run session</label>
        <input id="token" name="token" type="password" autocomplete="off" />
        <button class="primary" type="submit">Continue</button>
      </form>
      <p class="note">The session stays in this tab. It is not put in the address bar.</p>
    `));
    root.querySelector("form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = String(new FormData(event.currentTarget as HTMLFormElement).get("token") ?? "").trim();
      if (!value) return;
      saveRunToken(runId, value);
      void renderRun(root, runId);
    });
    return;
  }
  let full: FullRun;
  try {
    full = await api<FullRun>(`/api/runs/${runId}`, {}, token);
  } catch (error) {
    sessionStorage.removeItem(`fork.token.${runId}`);
    root.innerHTML = shell("", `<p class="note">${esc(error instanceof Error ? error.message : "Could not open the run.")}</p>`);
    return;
  }
  if (full.outcome?.final || ["completed", "blocked", "timed_out", "error", "unsupported"].includes(full.status)) {
    root.innerHTML = shell("", missionCard(full, receipt(full)));
    return;
  }
  if (full.status === "queued") {
    root.innerHTML = shell("", missionCard(full, `<button class="primary" type="button" data-start>Start</button>`));
    root.querySelector("[data-start]")?.addEventListener("click", () => {
      void start(root, full, token);
    });
    return;
  }
  drawVariant(root, full, token, false);
}

async function start(root: HTMLElement, card: FullRun, token: string): Promise<void> {
  const device = measure(card);
  await api(`/api/runs/${card.id}/start`, { method: "POST", body: JSON.stringify({ device }) }, token);
  await track(card.id, token, "start", device);
  const full = await api<FullRun>(`/api/runs/${card.id}`, {}, token);
  drawVariant(root, full, token, false);
}

function drawVariant(root: HTMLElement, card: FullRun, token: string, twistMode: boolean): void {
  const configPromise = api<{ shows: Show[] }>("/api/config");
  root.innerHTML = shell("", `
    ${missionCard(card, twistMode ? `<p>${esc(card.twist?.prompt ?? "")}</p>` : "")}
    <p class="device-label">${esc(card.device?.label ?? card.deviceLabel)} · build ${esc(card.buildId)}</p>
    <div class="frame ${card.deviceMode === "mobile-emulation" ? "mobile" : ""}" data-variant></div>
    <form class="form" data-report>
      <label for="trace">Factual trace</label>
      <textarea id="trace" name="trace" maxlength="4000" placeholder="What happened, in order."></textarea>
      <label for="remark">Remark, only if an event supports it</label>
      <input id="remark" name="remark" type="text" maxlength="240" />
      <label for="shot">Screenshot</label>
      <input id="shot" name="shot" type="file" accept="image/png,image/jpeg,image/webp" />
      <button class="ghost" type="submit">Save trace</button>
      <button class="ghost" type="button" data-block>Record a blocker</button>
      <button class="ghost" type="button" data-error>Record an error</button>
    </form>
    <p class="note" data-report-status></p>
  `);
  void configPromise.then((config) => {
    const host = root.querySelector<HTMLElement>("[data-variant]");
    if (!host) return;
    mountExplore(host, {
      variantId: card.variantId,
      shows: config.shows,
      evidenceLabel: card.evidenceLabel,
      runId: card.id,
      token,
      textScale: card.textScale,
      onEvent: (type, payload) => void track(card.id, token, type, payload),
      onChoose: (showId) => void choose(root, card, token, showId, twistMode),
    }, true);
  });
  root.querySelector("[data-report]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const trace = String(data.get("trace") ?? "").trim();
    const remark = String(data.get("remark") ?? "").trim();
    const shot = data.get("shot");
    void (async () => {
      await api(`/api/runs/${card.id}/observations`, {
        method: "POST",
        body: JSON.stringify({ trace, commentary: remark ? [{ text: remark }] : [] }),
      }, token);
      if (shot instanceof File && shot.size > 0) {
        const upload = new FormData();
        upload.set("file", shot);
        upload.set("description", "Screenshot");
        upload.set("type", "screenshot");
        await api(`/api/runs/${card.id}/artifacts`, { method: "POST", body: upload }, token);
      }
      const status = root.querySelector("[data-report-status]");
      if (status) status.textContent = "Trace saved.";
    })().catch((error: unknown) => {
      const status = root.querySelector("[data-report-status]");
      if (status) status.textContent = error instanceof Error ? error.message : "Could not save the trace.";
    });
  });
  const finishAs = (outcome: "blocked" | "error") => {
    const reason = root.querySelector<HTMLTextAreaElement>("#trace")?.value.trim() || "Stopped before a choice.";
    void api(`/api/runs/${card.id}/finish`, { method: "POST", body: JSON.stringify({ outcome, reason }) }, token)
      .then(() => renderRun(root, card.id));
  };
  root.querySelector("[data-block]")?.addEventListener("click", () => finishAs("blocked"));
  root.querySelector("[data-error]")?.addEventListener("click", () => finishAs("error"));
}

async function choose(root: HTMLElement, card: FullRun, token: string, showId: string, twistMode: boolean): Promise<void> {
  if (card.twist && !twistMode) {
    await api(`/api/runs/${card.id}/finish`, { method: "POST", body: JSON.stringify({ outcome: "selected", showId, stage: "provisional" }) }, token);
    await track(card.id, token, "twist", { showId });
    const full = await api<FullRun>(`/api/runs/${card.id}`, {}, token);
    drawVariant(root, full, token, true);
    return;
  }
  await api(`/api/runs/${card.id}/finish`, {
    method: "POST",
    body: JSON.stringify({ outcome: "selected", showId, stage: "final" }),
  }, token);
  await renderRun(root, card.id);
}

function missionCard(card: Card, extra: string): string {
  return `<article class="mission enter">
    <p class="kicker">${esc(card.profileName)}</p>
    <h2>${esc(card.missionText)}</h2>
    <p>${esc(card.personality)}</p>
    <p class="quiet">${esc(card.variantName)} · ${esc(card.assumption)}</p>
    <p class="quiet">${esc(card.deviceLabel)} · text ${Math.round(card.textScale * 100)}%</p>
    ${extra}
  </article>`;
}

function receipt(run: FullRun): string {
  const final = run.outcome?.final;
  if (!final) return `<p>Status: ${esc(run.status)}. No final receipt.</p>`;
  const constraints = final.evaluation?.constraints.map((item) => `
    <div class="constraint"><span>${esc(item.label)}<br><small>${esc(item.detail)}</small></span><span class="${item.pass ? "pass" : "fail"}">${item.pass ? "Pass" : "Fail"}</span></div>
  `).join("") ?? "";
  const remarks = run.observations.flatMap((item) => item.commentary.map((remark) => remark.text)).slice(0, 2);
  const trace = run.observations.map((item) => item.trace).join("\n\n");
  return `<div class="receipt">
    <p class="kicker">Recorded agent run</p>
    <p>Status: ${esc(run.status)}. ${final.showTitle ? `Selected ${esc(final.showTitle)}.` : esc(final.reason ?? "No show selected.")}</p>
    ${final.evaluation ? `<p>${final.evaluation.passed ? "Mission constraints passed." : "Mission constraints failed."}</p>` : ""}
    ${constraints}
    <p>${esc(final.timingLabel)}: ${final.agentTimingSeconds === null ? "Not captured." : `${final.agentTimingSeconds}s`}</p>
    <p class="quiet">${esc(run.evidenceLabel)}</p>
    ${trace ? `<h3>Trace</h3><p>${esc(trace)}</p>` : `<p>Trace: Not captured.</p>`}
    ${remarks.length ? `<h3>Remark</h3>${remarks.map((remark) => `<p>${esc(remark)}</p>`).join("")}` : ""}
  </div>`;
}

function measure(card: Card) {
  const outer = { width: window.innerWidth, height: window.innerHeight };
  const close = Math.abs(outer.width - card.viewport.width) < 80 && Math.abs(outer.height - card.viewport.height) < 120;
  let label = card.deviceLabel;
  if (card.deviceMode === "mobile-emulation") label = "Mobile emulation";
  else if (close) label = `Desktop · ${outer.width}×${outer.height} · text ${Math.round(card.textScale * 100)}%`;
  else label = `Layout preview · target ${card.viewport.width}×${card.viewport.height} · actual ${outer.width}×${outer.height}`;
  return {
    mode: card.deviceMode,
    label,
    target: card.viewport,
    outerViewport: outer,
    frame: card.deviceMode === "mobile-emulation" ? { width: 390, height: 844 } : outer,
    textScale: card.textScale,
    resizeSupported: false,
    userAgent: navigator.userAgent,
  };
}

function track(runId: string, token: string, type: string, payload: unknown): Promise<void> {
  return api(`/api/runs/${runId}/events`, {
    method: "POST",
    body: JSON.stringify({ clientEventId: crypto.randomUUID(), type, payload }),
  }, token).then(() => undefined).catch(() => undefined);
}
