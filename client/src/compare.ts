import { flowSteps, readTrial, mountHandoff, readHandoff, type Trial } from "./flow.ts";
import { adminToken } from "./api.ts";
import { api } from "./api.ts";
import type { Show } from "@shared/shows.ts";
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
  const [results, config] = await Promise.all([api<Results>("/api/results"), api<{ shows: Show[] }>("/api/config")]);
  if (root.dataset.page !== "/compare") return () => {};
  const trial = readTrial();
  const initialVariant = trial?.variantId ?? "browse";
  let selected = results.cells.find((cell) => cell.variantId === initialVariant && cell.runId) ?? results.cells.find((cell) => cell.runId) ?? null;
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
      ${flowSteps(location.hash === "#decision" ? 2 : 1)}
      <p class="kicker">Review & decide</p>
      <h2>Which approach should we build?</h2>
      <p class="lede">${esc(results.question)}</p>
      <p class="quiet">${esc(results.evidenceLabel)}</p>
      ${humanComparison(trial, config.shows)}
      <details class="recorded-evidence">
        <summary>Inspect server-recorded investigations and earlier attempts</summary>
        <p class="note">These original recordings use their own builds and catalogues. Public Bot walkthroughs above have no server receipt and remain separate.</p>
        ${table(core, results)}
        <details><summary>Additional Group Organiser recordings, when available</summary>${table(stretch, results)}</details>
        <section class="panel" data-detail></section>
      </details>
      <section class="panel" id="decision">
        <p class="kicker">Your decision</p><h2>Choose what happens next.</h2>
        <p class="quiet">Your show choice was the trial. Now choose which product approach Cursor should build, explain why, and create the handoff.</p>
        ${results.adopted ? `<p><span class="stamp">Chosen</span> ${esc(results.adopted.variantId)} · decision ${esc(results.adopted.decisionId)}</p>` : ""}
        <form class="form" data-decision>
          <label for="action">Action</label>
          <div class="choices">
            <button class="choice" type="button" data-action="choose" aria-pressed="true">Choose this approach</button>
            <button class="choice" type="button" data-action="revise">Revise</button>
            <button class="choice" type="button" data-action="defer">Defer</button>
          </div>
          <label for="variant">Approach</label>
          <div class="choices">${results.variants.map((variant) => `<button class="choice" type="button" data-variant="${esc(variant.id)}" aria-pressed="${variant.id === initialVariant}">${esc(variant.name)}</button>`).join("")}</div>
          <label for="reason">Why this direction?</label>
          <button class="ghost" type="button" data-suggest-reason>Use a suggested reason</button>
          <textarea id="reason" name="reason" required placeholder="What made this approach feel right? What should Cursor build next?"></textarea>
          <button class="primary" type="submit">Next: create Cursor handoff →</button>
        </form>
        <p class="note" data-decision-status role="status"></p><div data-handoff></div>
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
    let variant: string = initialVariant;
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
    form?.querySelector("[data-suggest-reason]")?.addEventListener("click", () => {
      const input = form.querySelector<HTMLTextAreaElement>("[name=reason]");
      if (input) input.value = action === "defer" ? "I want more evidence before choosing a direction." : `I prefer ${variant} because ${results.variants.find(item => item.id === variant)?.assumption.toLowerCase() ?? "it fits the intended experience."}`;
    });
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const reason = String(new FormData(form).get("reason") ?? "");
      void record(action, variant, reason);
    });
    const savedHandoff = readHandoff();
    const handoffHost = root.querySelector("[data-handoff]");
    if (savedHandoff && handoffHost) mountHandoff(handoffHost, savedHandoff, false);
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
    const runIds = results.cells.map(cell => cell.runId).filter((id): id is string => Boolean(id));
    const handoff = { action, variantId: action === "defer" ? null : variant, rationale: reason.trim(), runIds, trial };
    if (!handoff.rationale) { if (status) status.textContent = "Add a reason so Cursor knows why you chose this direction."; return; }
    const host = root.querySelector("[data-handoff]");
    if (!adminToken()) {
      if (status) status.textContent = "Draft saved in this tab. An operator can record it before adoption.";
      if (host) mountHandoff(host, handoff);
      return;
    }
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
      if (status) status.textContent = "Decision recorded with its evidence snapshot.";
      if (host) mountHandoff(host, { ...handoff, decisionId: saved.id });
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

function humanComparison(trial: Trial | null, shows: Show[]): string {
  const show = shows.find(item => item.id === trial?.showId);
  const name = trial?.variantId ? trial.variantId.charAt(0).toUpperCase() + trial.variantId.slice(1) : "No trial yet";
  return `<section class="human-review" id="human-review"><p class="kicker">Your experience + the Bot’s observations</p><h3>Try it yourself. Then make the call.</h3><div class="human-comparison">
    <article class="review-card human-card"><p class="kicker">You · human trial</p><h3>${esc(name)}</h3>${show?.imageUrl ? `<img src="${esc(show.imageUrl)}" width="960" height="540" alt="Your selected example: ${esc(show.title)} artwork" />` : '<div class="trial-empty">Your experience belongs here.</div>'}<strong>${show ? esc(show.title) : "Choose an example show first"}</strong><p>${show ? `Demo £${show.priceGbp} each · saved in this tab` : "Try Browse, Ask or Guide. Your choice will appear here."}</p><a href="${show ? "/selection" : "/"}" data-link>${show ? "Review your trial →" : "Try an approach →"}</a></article>
    <article class="review-card"><p class="kicker">Grok Bot · Browse</p><h3>Budget changed</h3><img src="/walkthroughs/tickadoo-browse/final.png" width="1024" height="525" alt="Actual Bot Browse capture" /><strong>The Play That Goes Wrong</strong><p>Faulty Towers (£68) → Play (£29) after the £50 budget twist.</p><a href="/walkthrough" data-link>View Bot walkthrough →</a></article>
    <article class="review-card"><p class="kicker">Grok Bot · Speedrunner</p><h3>Ask on mobile</h3><img src="/walkthroughs/speedrunner-ask/reply.png" width="390" height="844" alt="Actual Bot mobile Ask reply capture" /><strong>The Comedy About Spies</strong><p>Demo £50 each. Found the next action below the show; we moved it up.</p><a href="/walkthrough?persona=speedrunner" data-link>View Bot walkthrough →</a></article>
    <article class="review-card"><p class="kicker">Grok Bot · Group Organiser</p><h3>Guide + constraints</h3><img src="/walkthroughs/group-organiser-guide/final.png" width="1024" height="525" alt="Actual Bot Guide final selection capture" /><strong>The Mousetrap</strong><p>Faulty Towers (£68) → Mousetrap (£48), keeping age and runtime needs.</p><a href="/walkthrough?persona=group" data-link>View Bot walkthrough →</a></article>
    </div><p class="note">These are show selections from different missions, not votes for a winning approach. Your trial is local; the three real Bot reports are operator-archived public walkthroughs. You make the final product decision.</p><a class="primary" href="/compare#decision" data-link>Next: make my final decision →</a></section>`;
}
