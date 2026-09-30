import { flowSteps } from "./flow.ts";
import { shell } from "./render.ts";

export function walkthrough(): string {
  return shell("compare", `
    ${flowSteps(1)}
    <p class="kicker">Grok Bot · real browser walkthrough</p>
    <h2>A smaller budget. A different choice.</h2>
    <p class="lede">Grok Bot tried the same demo, then adapted when the budget changed.</p>
    <div class="walkthrough-summary"><div><span>At £80 per person</span><strong>Faulty Towers</strong><small>Demo £68 each</small></div><span class="walk-arrow" aria-hidden="true">→</span><div><span>At £50 per person</span><strong>The Play That Goes Wrong</strong><small>Demo £29 each</small></div></div>
    <div class="cards walkthrough-shots">
      <figure><a href="/walkthroughs/tickadoo-browse/initial.png" target="_blank" rel="noopener noreferrer"><img src="/walkthroughs/tickadoo-browse/initial.png" alt="Grok Bot’s captured initial Browse screen" width="1024" height="525"></a><figcaption>Initial screen · captured by Grok Bot</figcaption></figure>
      <figure><a href="/walkthroughs/tickadoo-browse/final.png" target="_blank" rel="noopener noreferrer"><img src="/walkthroughs/tickadoo-browse/final.png" alt="Grok Bot’s captured final screen after the £50 budget and selection" width="1024" height="525"></a><figcaption>Final screen · captured by Grok Bot</figcaption></figure>
    </div>
    <p><strong>What it noticed:</strong> missing venue details and no party-size control. That is useful product feedback to take into the next iteration.</p>
    <div class="row"><a class="primary" href="/compare#decision" data-link>Choose your direction →</a><a class="ghost" href="/compare" data-link>Inspect all recorded evidence</a></div>
    <details class="walkthrough-detail"><summary>View the action trace and provenance</summary>
      <p>Mission: a laugh-out-loud show tonight for two on a date. Start at £80 per person, then lower the budget to £50.</p>
      <ol><li>Apply Tonight.</li><li>Apply comedy.</li><li>Pick The Play That Goes Wrong initially.</li><li>Apply the £80 filter.</li><li>Pick Faulty Towers provisionally.</li><li>Apply the £50 filter.</li><li>Pick The Play That Goes Wrong finally.</li></ol>
      <p>Captured build 2026-09-30.3. Grok Bot reported a 1024 × 525 viewport, about one minute and seven successful clicks, plus one stale-element retry. Prices, times and suitability are demo scenarios.</p>
      <p class="note">This operator-archived public walkthrough had no run session token. It has no server constraint receipt or per-action timestamps and stays separate from the formal comparison grid. The screenshots and report are genuine Bot output; capture timestamps were not provided. Agent walkthroughs are not real-user research.</p>
      <a href="https://github.com/Mark-Prethero/get-fork/tree/main/walkthroughs/tickadoo-browse" target="_blank" rel="noopener noreferrer">Read the archived report ↗</a>
    </details>
  `);
}
