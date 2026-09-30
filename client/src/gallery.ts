import type { VariantId } from "@shared/brand.ts";
import { flowSteps } from "./flow.ts";
import { brand } from "@shared/brand.ts";
import { esc, icon, mark, shell } from "./render.ts";

export const CURSOR_START_PROMPT = "/fork How should people find their next show? Compare browse, ask and a guided flow. Build working alternatives, give me the Fork preview and Grok Bot missions, then wait for my decision before adoption.";

interface Config {
  question: string;
  evidenceLabel: string;
  adopted: { variantId: string } | null;
}

export function gallery(config: Config): string {
  const cards = (Object.keys(brand.variants) as VariantId[]).map((id) => {
    const variant = brand.variants[id];
    const chosen = config.adopted?.variantId === id;
    return `<a class="option${chosen ? " chosen" : ""}" href="/v/${id}" data-link>
      ${icon(id)}
      <h3>${esc(variant.name)}</h3>
      <p>${esc(variant.line)}</p>
      <span class="open">${chosen ? '<span class="stamp">Chosen</span>' : `Try ${variant.name} →`}</span>
    </a>`;
  }).join("");
  return shell("home", `
    <section class="hero">
      <div>
        <div class="lockup">${mark("mark large")}<span class="word">${brand.wordmark}</span></div>
        <p class="kicker">For solo builders & small to medium teams</p>
        <h1>Explore the options.<br>Choose what ships.</h1>
        <p class="lede">Make product decisions inside your development workflow, even without a dedicated product team. Start with /fork in Cursor. Grok Bot explores the working options; you decide what Cursor builds next.</p>
        <a class="primary pitch-start" href="/pitch" data-link>Start the one-minute pitch →</a>
        <a class="ghost pitch-start" href="https://github.com/Mark-Prethero/get-fork#start-from-cursor" target="_blank" rel="noopener noreferrer">Use in Cursor ↗</a>
      </div>
      <aside class="cursor-start"><p class="kicker">01 · Start in Cursor</p><h2>A product question.<br>One command.</h2><pre><code>/fork How should people find
their next show?</code></pre><p>Open this repo in Cursor, type <strong>/fork</strong> in chat, then add your question.</p><div class="row"><button class="primary" type="button" data-copy-start>Copy Cursor prompt</button><a href="https://github.com/Mark-Prethero/get-fork/blob/main/.cursor/commands/fork.md" target="_blank" rel="noopener noreferrer">View the command ↗</a></div><p class="copy-start-status" role="status"></p></aside>
    </section>
    <div class="cursor-loop" aria-label="Cursor workflow"><span><strong>Cursor</strong> Frame & build</span><span aria-hidden="true">→</span><span><strong>Fork</strong> Try alternatives</span><span aria-hidden="true">→</span><span><strong>Grok Bot</strong> Investigate</span><span aria-hidden="true">→</span><span><strong>Cursor</strong> Continue with your choice</span></div>
    <div class="product-context"><strong>One workflow. Any product.</strong><span>Checkout · Onboarding · Search · Pricing</span><p>This demo uses show discovery to make the alternatives tangible.</p></div>
    ${flowSteps(0)}
    <section class="interface">
      <p class="kicker">${esc(brand.kicker)}</p>
      <h2>${esc(brand.sectionTitle)}</h2>
      <p class="lede">${esc(brand.lede)}</p>
      <p class="question">${esc(config.question)}</p>
      <div class="cards">${cards}</div>
      <p class="note">Try the same question in each approach. Choose a show, review Grok Bot’s evidence, then take your direction back to Cursor.</p>
    </section>
    <section class="bot-feature">
      <div><p class="kicker">Grok Bot · browser investigations</p>
      <h2>Watch Grok Bot change its mind.</h2>
      <p>A fresh browser walkthrough of the tickadoo demo: when the budget fell from £80 to £50, Grok Bot changed its choice. See its actual screenshots and report, then compare the formal recorded runs.</p></div>
      <a class="primary" href="/walkthrough" data-link>Watch the fresh walkthrough →</a>
    </section>
    <p class="foot">${esc(brand.footer)}</p>
    <p class="foot">${esc(config.evidenceLabel)}</p>
  `);
}

export function bindGallery(root: HTMLElement): () => void {
  const button = root.querySelector("[data-copy-start]");
  let active = true;
  const copy = () => {
    void navigator.clipboard.writeText(CURSOR_START_PROMPT).then(() => {
      if (active) { const status = root.querySelector(".copy-start-status"); if (status) status.textContent = "Copied. Paste into Cursor chat in this repo."; }
    }).catch(() => {
      if (active) { const status = root.querySelector(".copy-start-status"); if (status) status.textContent = "Type /fork in Cursor chat, then add your product question."; }
    });
  };
  button?.addEventListener("click", copy);
  return () => { active = false; button?.removeEventListener("click", copy); };
}
