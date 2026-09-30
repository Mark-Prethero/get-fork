import { shell } from "./render.ts";

export function walkthrough(): string {
  return shell("compare", `
    <p class="kicker">Grok Bot · fresh browser walkthrough</p>
    <h2>A smaller budget. A different choice.</h2>
    <p class="lede">Watch what Grok Bot actually found in the tickadoo Browse alternative.</p>
    <p class="banner">Captured build 2026-09-30.3 · public walkthrough · operator-archived Bot report · not real-user research</p>
    <section class="mission">
      <h3>The mission</h3>
      <p>A laugh-out-loud show tonight for two on a date. Start at £80 per person, then lower the budget to £50.</p>
      <p><strong>First:</strong> Faulty Towers The Dining Experience · demo £68 each.</p>
      <p><strong>Then:</strong> The Play That Goes Wrong · demo £29 each.</p>
      <p class="note">Prices, times and suitability are demo scenarios. Grok Bot reported a 1024 × 525 viewport, about one minute and seven successful clicks, plus one stale-element retry.</p>
    </section>
    <div class="cards walkthrough-shots">
      <figure><img src="/walkthroughs/tickadoo-browse/initial.png" alt="Grok Bot’s captured initial Browse screen" width="1024" loading="lazy"><figcaption>Initial screen · captured by Grok Bot</figcaption></figure>
      <figure><img src="/walkthroughs/tickadoo-browse/final.png" alt="Grok Bot’s captured final screen after the £50 budget and selection" width="1024" loading="lazy"><figcaption>Final screen · captured by Grok Bot</figcaption></figure>
    </div>
    <h3>The steps</h3>
    <ol><li>Apply Tonight.</li><li>Apply comedy.</li><li>Pick The Play That Goes Wrong initially.</li><li>Apply the £80 filter.</li><li>Pick Faulty Towers provisionally.</li><li>Apply the £50 filter.</li><li>Pick The Play That Goes Wrong finally.</li></ol>
    <h3>What needs another pass</h3>
    <p>The Bot noted missing venues and no party-size control. It calculated the total from the per-person price. These are observations from one walkthrough.</p>
    <p class="note">This public walkthrough had no run session token. It has no server constraint receipt or per-action timestamps and stays separate from the formal comparison grid. The screenshots and report are genuine Bot output; capture timestamps were not provided.</p>
    <div class="row"><a class="primary" href="/v/browse" data-link>Try the same alternative →</a><a class="ghost" href="/compare" data-link>Compare recorded runs</a><a class="ghost" href="https://github.com/Mark-Prethero/get-fork/tree/main/walkthroughs/tickadoo-browse" target="_blank" rel="noopener noreferrer">View source report ↗</a></div>
  `);
}
