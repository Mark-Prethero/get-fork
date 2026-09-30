import { brand } from "@shared/brand.ts";
import { adminToken } from "./api.ts";
import { api } from "./api.ts";
import { esc, shell } from "./render.ts";

interface Cell {
  profileId: string;
  variantId: string;
  required: boolean;
  status: string;
  runId: string | null;
  missionPassed?: boolean | null;
  showTitle?: string | null;
  agentTimingSeconds?: number | null;
  timingLabel?: string | null;
  deviceLabel?: string | null;
  artifactUrl?: string | null;
  buildId?: string;
  attemptCount?: number;
}

interface Results {
  question: string;
  evidenceLabel: string;
  buildId: string;
  variants: Array<{ id: string; name: string; assumption: string }>;
  profiles: Array<{ id: string; name: string; deviceLabel: string; stretch: boolean }>;
  cells: Cell[];
  decisions: Array<{ id: string; action: string; variantId: string | null; rationale: string }>;
  adopted: { variantId: string; decisionId: string } | null;
}

interface RunDetail {
  id: string;
  status: string;
  buildId: string;
  startedAt: string | null;
  finishedAt: string | null;
  device: { label?: string } | null;
  outcome: {
    final?: {
      showTitle?: string | null;
      evaluation?: { passed: boolean; constraints: Array<{ label: string; pass: boolean; detail: string }> } | null;
      agentTimingSeconds?: number | null;
      timingLabel?: string;
    };
  } | null;
  events: Array<{ type: string; recordedAt: string; payload: unknown }>;
  observations: Array<{ trace: string; commentary: Array<{ text: string }> }>;
  artifacts: Array<{ url: string | null; description: string; available: boolean; capturedAt: string }>;
}

export async function renderCompare(root: HTMLElement): Promise<() => void> {
  const results = await api<Results>("/api/results");
  if (root.dataset.page !== "/compare") return () => {};
  let selected = results.cells.find((cell) => cell.runId) ?? null;
  let detail: RunDetail | null = null;
  let shot = 0;
  let playing = false;
  let timer = 0;
  let requestVersion = 0;
  let disposed = false;

  const draw = () => {
    const core = results.profiles.filter((profile) => !profile.stretch);
    const stretch = results.profiles.filter((profile) => profile.stretch);
    root.innerHTML = shell("compare", `
      <p class="kicker">Evidence</p>
      <h2>${esc(brand.sectionTitle)}</h2>
      <p class="lede">${esc(results.question)}</p>
      <p class="quiet">${esc(results.evidenceLabel)}</p>
      <p class="note">Each walkthrough keeps its original build and catalogue. Earlier recordings use the invented-show catalogue; new runs use the tickadoo examples.</p>
      ${table(core, results)}
      <details>
        <summary>The Group Organiser, when those runs exist</summary>
        ${table(stretch, results)}
      </details>
      <section class="panel" data-detail></section>
      <section class="panel">
        <h2>Decision</h2>
        <p class="quiet">Choosing stays with a person. This does not publish or ship on its own.</p>
        ${results.adopted ? `<p><span class="stamp">Chosen</span> ${esc(results.adopted.variantId)} · decision ${esc(results.adopted.decisionId)}</p>` : ""}
        <form class="form" data-decision>
          <label for="action">Action</label>
          <div class="choices">
            <button class="choice" type="button" data-action="choose" aria-pressed="true">Choose this approach</button>
            <button class="choice" type="button" data-action="revise">Revise</button>
            <button class="choice" type="button" data-action="defer">Defer</button>
          </div>
          <label for="variant">Approach</label>
          <div class="choices">${results.variants.map((variant) => `<button class="choice" type="button" data-variant="${esc(variant.id)}" aria-pressed="${variant.id === "guide"}">${esc(variant.name)}</button>`).join("")}</div>
          <label for="reason">Rationale</label>
          <textarea id="reason" name="reason" required placeholder="Why this direction, and what is still open."></textarea>
          <button class="primary" type="submit">Record decision</button>
        </form>
        <p class="note" data-decision-status></p>
        ${results.decisions.map((decision) => `<p><strong>${esc(decision.action)}</strong> ${esc(decision.variantId ?? "")} — ${esc(decision.rationale)}</p>`).join("")}
      </section>
    `);
    root.querySelectorAll<HTMLButtonElement>("[data-cell]").forEach((button) => {
      button.addEventListener("click", () => {
        selected = results.cells.find((cell) => cell.profileId === button.dataset.profile && cell.variantId === button.dataset.variant) ?? null;
        shot = 0;
        stop();
        void loadDetail();
      });
    });
    const form = root.querySelector<HTMLFormElement>("[data-decision]");
    let action = "choose";
    let variant = "guide";
    form?.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        action = button.dataset.action ?? "choose";
        form.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      });
    });
    form?.querySelectorAll<HTMLButtonElement>("[data-variant]").forEach((button) => {
      button.addEventListener("click", () => {
        variant = button.dataset.variant ?? variant;
        form.querySelectorAll<HTMLButtonElement>("[data-variant]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      });
    });
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const reason = String(new FormData(form).get("reason") ?? "");
      void record(action, variant, reason);
    });
    paintDetail();
  };

  async function loadDetail(): Promise<void> {
    const version = ++requestVersion;
    detail = null;
    if (selected?.runId) {
      try {
        const loaded = await api<RunDetail>(`/api/runs/${selected.runId}`, {}, adminToken());
        if (disposed || version !== requestVersion) return;
        detail = loaded;
      } catch {
        detail = null;
      }
    }
    paintDetail();
  }

  function paintDetail(): void {
    if (disposed || root.dataset.page !== "/compare") return;
    const host = root.querySelector("[data-detail]");
    if (!host || !selected) {
      if (host) host.innerHTML = `<p class="note">Select a cell to inspect a run.</p>`;
      return;
    }
    if (!selected.runId) {
      host.innerHTML = `<h2>${esc(selected.profileId)} · ${esc(selected.variantId)}</h2><p>Not run.</p>`;
      return;
    }
    const shots = detail?.artifacts.filter((artifact) => artifact.available && artifact.url) ?? [];
    const current = shots[shot];
    const final = detail?.outcome?.final;
    host.innerHTML = `
      <p class="kicker">Recorded browser investigation</p>
      <h2>${esc(selected.profileId)} · ${esc(selected.variantId)}</h2>
      <p>Status: ${esc(selected.status)}. Build ${esc(selected.buildId ?? results.buildId)}. ${esc(selected.deviceLabel ?? "Device: Not captured.")}</p>
      <p>${selected.missionPassed === null || selected.missionPassed === undefined ? "Constraints: Not captured." : selected.missionPassed ? "Mission constraints passed." : "Mission constraints failed."} ${selected.showTitle ? `· ${esc(selected.showTitle)}` : ""}</p>
      <p>${selected.timingLabel ?? "Agent timing"}: ${selected.agentTimingSeconds === null || selected.agentTimingSeconds === undefined ? "Not captured." : `${selected.agentTimingSeconds}s`}</p>
      ${shots.length ? `<img class="shot" alt="${esc(current?.description ?? "Screenshot")}" src="${esc(current?.url ?? "")}" />` : `<p>Screenshot: Not captured.</p>`}
      <div class="replay">
        <button class="ghost" type="button" data-play ${shots.length < 2 ? "disabled" : ""}>${playing ? "Pause" : "Play"}</button>
        <button class="ghost" type="button" data-restart ${!shots.length ? "disabled" : ""}>Restart</button>
      </div>
      <p class="quiet">Saved screenshots and factual actions. Playback does not change the run. Live Grok Bot missions are dispatched from Runs.</p>
      ${final?.evaluation ? final.evaluation.constraints.map((item) => `<div class="constraint"><span>${esc(item.label)} — ${esc(item.detail)}</span><span class="${item.pass ? "pass" : "fail"}">${item.pass ? "Pass" : "Fail"}</span></div>`).join("") : ""}
      ${(detail?.observations ?? []).map((item) => `<h3>Trace</h3><p>${esc(item.trace)}</p>${item.commentary.map((remark) => `<p><strong>Remark.</strong> ${esc(remark.text)}</p>`).join("")}`).join("")}
      <ol>${(detail?.events ?? []).map((event) => `<li>${esc(event.recordedAt)} · ${esc(event.type)}</li>`).join("")}</ol>
      ${detail ? "" : `<p class="note">This run is still active. Its trace is available to the operator until it finishes.</p>`}
    `;
    host.querySelector("[data-play]")?.addEventListener("click", () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        shot = Math.min(shots.length - 1, shot + 1);
        paintDetail();
        return;
      }
      playing = !playing;
      if (playing) {
        timer = window.setInterval(() => {
          if (!shots.length) return;
          shot = (shot + 1) % shots.length;
          paintDetail();
        }, 1600);
      } else stop();
      paintDetail();
    });
    host.querySelector("[data-restart]")?.addEventListener("click", () => {
      shot = 0;
      stop();
      paintDetail();
    });
  }

  function stop(): void {
    playing = false;
    if (timer) window.clearInterval(timer);
    timer = 0;
  }

  async function record(action: string, variant: string, reason: string): Promise<void> {
    const status = root.querySelector("[data-decision-status]");
    try {
      const saved = await api<{ id: string }>("/api/decisions", {
        method: "POST",
        body: JSON.stringify({
          action,
          variantId: action === "defer" ? undefined : variant,
          rationale: reason,
          runIds: results.cells.map((cell) => cell.runId).filter(Boolean),
        }),
      }, adminToken());
      if (status) status.textContent = `Recorded ${saved.id}. Save this same decision to your repo with: node scripts/fork.mjs record --decision ${saved.id}`;
    } catch (error) {
      if (status) status.textContent = error instanceof Error ? error.message : "Could not record the decision.";
    }
  }

  draw();
  await loadDetail();
  return () => { disposed = true; requestVersion += 1; stop(); };
}

function table(profiles: Results["profiles"], results: Results): string {
  const head = `<tr><th></th>${results.variants.map((variant) => `<th>${esc(variant.name)}<br><small>${esc(variant.assumption)}</small></th>`).join("")}</tr>`;
  const rows = profiles.map((profile) => {
    const cells = results.variants.map((variant) => {
      const cell = results.cells.find((item) => item.profileId === profile.id && item.variantId === variant.id);
      return `<td>${cellButton(cell, profile.id, variant.id)}</td>`;
    }).join("");
    return `<tr><th>${esc(profile.name)}<br><small>${esc(profile.deviceLabel)}</small></th>${cells}</tr>`;
  }).join("");
  return `<div class="grid-scroll" tabindex="0" aria-label="Run comparison"><table class="grid"><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
}

function cellButton(cell: Cell | undefined, profileId: string, variantId: string): string {
  if (!cell || cell.status === "not-run") {
    return `<button class="cell" type="button" data-cell data-profile="${esc(profileId)}" data-variant="${esc(variantId)}"><span class="status">Not run</span></button>`;
  }
  const verdict = cell.missionPassed === true ? "Pass" : cell.missionPassed === false ? "Fail" : cell.status;
  return `<button class="cell" type="button" data-cell data-profile="${esc(profileId)}" data-variant="${esc(variantId)}">
    <span class="status">${esc(cell.status)}${cell.required ? " · required" : ""}</span>
    <strong class="${cell.missionPassed === true ? "pass" : cell.missionPassed === false ? "fail" : ""}">${esc(verdict)}</strong>
    <span>${esc(cell.showTitle ?? "No show")}</span>
    ${cell.artifactUrl ? `<img alt="" src="${esc(cell.artifactUrl)}" />` : `<span>Screenshot: Not captured.</span>`}
  </button>`;
}
