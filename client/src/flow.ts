import { brand, type VariantId } from "@shared/brand.ts";
import type { Show } from "@shared/shows.ts";
import { BUILD_ID } from "@shared/build.ts";
import { esc, shell } from "./render.ts";

export interface Trial { variantId: VariantId; showId: string; buildId: string }
export function readTrial(): Trial | null {
  try {
    const value = JSON.parse(sessionStorage.getItem("fork.trial") ?? "null") as Trial | null;
    return value && ["browse", "ask", "guide"].includes(value.variantId) && typeof value.showId === "string" ? value : null;
  } catch { return null; }
}
export function saveTrial(variantId: VariantId, showId: string): void {
  sessionStorage.removeItem("fork.handoff");
  sessionStorage.setItem("fork.trial", JSON.stringify({ variantId, showId, buildId: BUILD_ID }));
}
export function flowSteps(current: number): string {
  return `<nav class="flow-steps" aria-label="Demo journey">${[
    ["/", "Try an approach"], ["/compare", "Review the evidence"], ["/compare#decision", "Choose your direction"],
  ].map(([href, label], index) => `<a href="${href}" data-link ${index === current ? 'aria-current="step"' : ""}><span>${index + 1}</span>${label}</a>`).join("")}</nav>`;
}
export function selection(shows: Show[]): string {
  const trial = readTrial();
  const show = shows.find(item => item.id === trial?.showId);
  if (!trial || !show) return shell("", `<h2>Try an approach first.</h2><p>Choose a show to see how the experience works.</p><a class="primary" href="/" data-link>Explore the approaches →</a>`);
  const name = brand.variants[trial.variantId].name;
  return shell("", `${flowSteps(0)}
    <p class="kicker">You tried ${esc(name)}</p><h2>You found your example show.</h2>
    <p class="lede">Now decide how people should find it.</p>
    <div class="selection-layout">
      <article class="selection-show">${show.imageUrl ? `<img src="${esc(show.imageUrl)}" width="960" height="540" alt="${esc(show.title)} artwork" />` : ""}
        <div><span class="stamp">Your choice</span><h3>${esc(show.title)}</h3><p>${esc(show.description)}</p><p class="quiet">Demo scenario · ${esc(show.whenLabel)} ${esc(show.time)} · £${show.priceGbp} per person</p></div>
      </article>
      <aside class="next-step"><p class="kicker">Next: evaluate the approach</p><h3>Did ${esc(name)} make the choice easier?</h3><p>You’ve tried the experience. Review Grok Bot’s walkthroughs, compare the trade-offs, then choose a direction for your coding agent.</p>
        <a class="primary" href="/walkthrough" data-link>Next: watch Grok Bot →</a>
        <a href="/" data-link>Try another approach</a>
        <a href="/v/${trial.variantId}" data-link>Make another show choice</a>
      </aside>
    </div>
    <p class="note">This is an example selection, saved in this tab. It is not a booking or an agent investigation.</p>
    ${show.sourceUrl ? `<a href="${esc(show.sourceUrl)}" target="_blank" rel="noopener noreferrer">See the real show on tickadoo ↗</a>` : ""}`);
}

export interface Handoff { action: string; variantId: string | null; rationale: string; decisionId?: string; runIds: string[]; trial: Trial | null }
export function handoffText(value: Handoff): string {
  return `# Fork — Cursor handoff\n\nStatus: ${value.decisionId ? "Server-recorded decision " + value.decisionId : "Human decision draft; not server-recorded or adopted"}\nAction: ${value.action}\nApproach: ${value.variantId ?? "No approach chosen"}\nRationale: ${value.rationale}\n\n## Context\nQuestion: How should someone choose a show: browse, ask, or guide?\nRepository: https://github.com/Mark-Prethero/get-fork\nEvidence: https://get-fork-demo.proud-wood-517d.workers.dev/compare\nFresh Bot walkthrough: https://get-fork-demo.proud-wood-517d.workers.dev/walkthrough\nRecorded run IDs: ${value.runIds.join(", ") || "None"}\n${value.trial ? `Manual demo trial: ${value.trial.variantId}, selected ${value.trial.showId}, build ${value.trial.buildId}. This is not an agent run.` : "No manual demo trial saved."}\n\n## Continue in Cursor\nFetch the latest upstream source and read AGENTS.md and SPEC.md before changing code. Review the linked evidence and preserve its original build labels and unsuccessful outcomes. Agent walkthroughs are not user research.\n${value.action === "choose" ? `Use ${value.variantId} as the intended direction. Explain the implementation, validate it, and preserve the other alternatives as evidence. Do not claim this draft was adopted or deployed.` : value.action === "revise" ? `Revise ${value.variantId} using the rationale, then run a fresh investigation before deciding.` : "The decision is deferred. Investigate the open questions in the rationale before selecting an approach."}\n${value.decisionId ? `\nExport this exact saved decision: node scripts/fork.mjs record --decision ${value.decisionId}\n${value.action === "choose" ? `Adopt after review: node scripts/fork.mjs adopt --variant ${value.variantId} --decision ${value.decisionId}\n` : ""}` : "\nThis downloadable handoff is a draft. An operator can record it in Fork before adoption.\n"}`;
}
export function readHandoff(): Handoff | null {
  try {
    const value = JSON.parse(sessionStorage.getItem("fork.handoff") ?? "null") as Handoff | null;
    return value && ["choose", "revise", "defer"].includes(value.action) && typeof value.rationale === "string" && Array.isArray(value.runIds) ? value : null;
  } catch { return null; }
}
export function mountHandoff(host: Element, value: Handoff, focus = true): void {
  const text = handoffText(value);
  sessionStorage.setItem("fork.handoff", JSON.stringify(value));
  host.innerHTML = `<section class="handoff-card"><p class="kicker">Next: continue in Cursor</p><h3>Your handoff is ready.</h3><p>${value.decisionId ? "Your decision and evidence snapshot are recorded." : "Your decision draft is saved in this tab."} Copy the handoff into Cursor or download it into your project.</p><div class="row"><button class="primary" type="button" data-copy-handoff>Copy Cursor handoff</button><button class="ghost" type="button" data-download-handoff>Download handoff</button><a class="ghost" href="/" data-link>Explore again</a></div><p data-copy-status role="status"></p><details><summary>Preview the handoff</summary><pre>${esc(text)}</pre></details></section>`;
  host.querySelector("[data-copy-handoff]")?.addEventListener("click", () => {
    const status = host.querySelector("[data-copy-status]");
    void navigator.clipboard.writeText(text).then(() => { if (status) status.textContent = "Copied. Paste into your Cursor chat to continue."; }).catch(() => { if (status) status.textContent = "Clipboard unavailable. Download the handoff or copy its preview."; });
  });
  host.querySelector("[data-download-handoff]")?.addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
    const link = document.createElement("a"); link.href = url; link.download = "fork-cursor-handoff.md"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    const status = host.querySelector("[data-copy-status]"); if (status) status.textContent = "Handoff downloaded. Add it to your project and ask Cursor to continue.";
  });
  if (focus) host.scrollIntoView({ block: "center" });
}
