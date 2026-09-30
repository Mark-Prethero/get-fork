import type { VariantId } from "@shared/brand.ts";
import { flowSteps } from "./flow.ts";
import { brand } from "@shared/brand.ts";
import { esc, icon, mark, shell } from "./render.ts";

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
        <h1>${esc(brand.headline[0])}<br>${esc(brand.headline[1])}</h1>
        <p class="lede">Try a show search. Watch Grok Bot explore. Take the decision back to Cursor.</p>
        <a class="primary pitch-start" href="/v/ask" data-link>Start the 60-second demo →</a>
      </div>
      <aside class="plaque">${mark("mark")}<p>${esc(brand.plaque)}</p></aside>
    </section>
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
