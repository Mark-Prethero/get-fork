import { flowSteps } from "./flow.ts";
import { shell } from "./render.ts";

export function walkthrough(): string {
  const persona = new URLSearchParams(location.search).get("persona");
  if (persona === "speedrunner" || persona === "group") return personaWalkthrough(persona);
  return shell("compare", `
    ${flowSteps(1)}
    <p class="kicker">Grok Bot · real browser walkthrough</p>
    <nav class="variant-tabs persona-tabs" aria-label="Grok Bot persona"><a href="/walkthrough" data-link aria-current="page">Browse</a><a href="/walkthrough?persona=speedrunner" data-link>Speedrunner · Ask</a><a href="/walkthrough?persona=group" data-link>Group Organiser · Guide</a></nav>
    <h2>A smaller budget. A different choice.</h2>
    <p class="lede">Grok Bot tried the same demo, then adapted when the budget changed.</p>
    <div class="walkthrough-summary"><div><span>At £80 per person</span><strong>Faulty Towers</strong><small>Demo £68 each</small></div><span class="walk-arrow" aria-hidden="true">→</span><div><span>At £50 per person</span><strong>The Play That Goes Wrong</strong><small>Demo £29 each</small></div></div>
    <div class="cards walkthrough-shots">
      <figure><a href="/walkthroughs/tickadoo-browse/initial.png" target="_blank" rel="noopener noreferrer"><img src="/walkthroughs/tickadoo-browse/initial.png" alt="Grok Bot’s captured initial Browse screen" width="1024" height="525"></a><figcaption>Initial screen · captured by Grok Bot</figcaption></figure>
      <figure><a href="/walkthroughs/tickadoo-browse/final.png" target="_blank" rel="noopener noreferrer"><img src="/walkthroughs/tickadoo-browse/final.png" alt="Grok Bot’s captured final screen after the £50 budget and selection" width="1024" height="525"></a><figcaption>Final screen · captured by Grok Bot</figcaption></figure>
    </div>
    <p><strong>What it noticed:</strong> missing venue details and no party-size control. That is useful product feedback to take into the next iteration.</p>
    <div class="row"><a class="primary" href="/compare#human-review" data-link>Next: compare & decide →</a><a class="ghost" href="/compare" data-link>Inspect all recorded evidence</a></div>
    <details class="walkthrough-detail"><summary>View the action trace and provenance</summary>
      <p>Mission: a laugh-out-loud show tonight for two on a date. Start at £80 per person, then lower the budget to £50.</p>
      <ol><li>Apply Tonight.</li><li>Apply comedy.</li><li>Pick The Play That Goes Wrong initially.</li><li>Apply the £80 filter.</li><li>Pick Faulty Towers provisionally.</li><li>Apply the £50 filter.</li><li>Pick The Play That Goes Wrong finally.</li></ol>
      <p>Captured build 2026-09-30.3. Grok Bot reported a 1024 × 525 viewport, about one minute and seven successful clicks, plus one stale-element retry. Prices, times and suitability are demo scenarios.</p>
      <p class="note">This operator-archived public walkthrough had no run session token. It has no server constraint receipt or per-action timestamps and stays separate from the formal comparison grid. The screenshots and report are genuine Bot output; capture timestamps were not provided. Agent walkthroughs are not real-user research.</p>
      <a href="https://github.com/Mark-Prethero/get-fork/tree/main/walkthroughs/tickadoo-browse" target="_blank" rel="noopener noreferrer">Read the archived report ↗</a>
    </details>
  `);
}

function personaWalkthrough(persona: "speedrunner" | "group"): string {
  const speed = persona === "speedrunner";
  const folder = speed ? "speedrunner-ask" : "group-organiser-guide";
  return shell("compare", `
    ${flowSteps(1)}
    <p class="kicker">Grok Bot · real browser walkthrough</p>
    <nav class="variant-tabs persona-tabs" aria-label="Grok Bot persona"><a href="/walkthrough" data-link>Browse</a><a href="/walkthrough?persona=speedrunner" data-link ${speed ? 'aria-current="page"' : ""}>Speedrunner · Ask</a><a href="/walkthrough?persona=group" data-link ${!speed ? 'aria-current="page"' : ""}>Group Organiser · Guide</a></nav>
    <h2>${speed ? "One request. One matching show." : "Every constraint. Then a budget twist."}</h2>
    <p class="lede">${speed ? "Speedrunner asked Grok for a funny date night, then chose The Comedy About Spies at a demo £50 each." : "Group Organiser checked age, runtime and budget, then changed from Faulty Towers (£68) to The Mousetrap (£48)."}</p>
    <div class="bot-feature"><div><h3>${speed ? "A useful friction point" : "A clear next step"}</h3><p>${speed ? "The Bot found the next action below the show card on mobile. We moved it above the artwork in the next build." : "The Bot used ‘Make another show choice’ to repeat the Guide with a £50 budget and confirmed the next step was clear."}</p></div><a class="primary" href="/compare#human-review" data-link>Next: compare & decide →</a></div>
    <figure class="persona-shot ${speed ? "mobile-shot" : ""}"><a href="/walkthroughs/${folder}/${speed ? "reply" : "final"}.png" target="_blank" rel="noopener noreferrer"><img src="/walkthroughs/${folder}/${speed ? "reply" : "final"}.png" alt="${speed ? "Grok Bot's actual mobile Ask reply" : "Grok Bot's actual final Guide selection"}" width="${speed ? 390 : 1024}" height="${speed ? 844 : 525}"></a><figcaption>Actual capture returned by Grok Bot · captured build 2026-09-30.5</figcaption></figure>
    <details class="walkthrough-detail"><summary>View the action trace and provenance</summary>
      <p>${speed ? "Mission: a funny show tonight for two adults on a date, at £80 or less each. Open Ask, send the request, inspect Grok's result, select The Comedy About Spies and inspect the confirmation. The Bot reported seven interactions and about one minute." : "Mission: tonight, adults and a 15-year-old, maximum 150 minutes, £80 then £50 each. Answer five Guide questions, select Faulty Towers (120 minutes, age 14+), use Make another show choice, repeat at £50, select The Mousetrap (130 minutes, age 12+). The Bot reported 13 in-page interactions, 14 including the tab, and about two minutes."}</p>
      <p>${speed ? "The Bot reported a 390 × 844 viewport at normal text scale. Resizing worked; this was mobile browser emulation, not a real-phone test." : "The Bot reported a 1024 × 525 viewport at normal text scale. Its requested 1280 × 800 resize was unsupported."}</p>
      <p class="note">Operator-archived public walkthrough with no run token, server constraint receipt or per-action timestamps. These are genuine Bot screenshots and reported observations. Prices, times and suitability are demo scenarios. Agent walkthroughs are not real-user research.</p>
      <a href="https://github.com/Mark-Prethero/get-fork/tree/main/walkthroughs/${folder}" target="_blank" rel="noopener noreferrer">Read the archived report ↗</a>
    </details>
  `);
}
