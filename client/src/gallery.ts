import type { VariantId } from "@shared/brand.ts";
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
      <span class="open">${chosen ? '<span class="stamp">Chosen</span>' : "Open"}</span>
    </a>`;
  }).join("");
  const assumptions = (Object.keys(brand.variants) as VariantId[])
    .map((id) => `<li><strong>${esc(brand.variants[id].name)}.</strong> ${esc(brand.variants[id].assumption)}</li>`)
    .join("");
  return shell("home", `
    <section class="hero">
      <div>
        <div class="lockup">${mark("mark large")}<span class="word">${brand.wordmark}</span></div>
        <h1>${esc(brand.headline[0])}<br>${esc(brand.headline[1])}</h1>
      </div>
      <aside class="plaque">${mark("mark")}<p>${esc(brand.plaque)}</p></aside>
    </section>
    <section class="interface">
      <p class="kicker">${esc(brand.kicker)}</p>
      <h2>${esc(brand.sectionTitle)}</h2>
      <p class="lede">${esc(brand.lede)}</p>
      <p class="question">${esc(config.question)}</p>
      <div class="cards">${cards}</div>
      <ul class="assumption-list">${assumptions}</ul>
    </section>
    <p class="foot">${esc(brand.footer)}</p>
    <p class="foot">${esc(config.evidenceLabel)}</p>
  `);
}
