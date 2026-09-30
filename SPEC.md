# Fork: build spec

> Visual identity for this build follows the September 2026 identity board: monochrome Y mark, lowercase wordmark, and the lines “One question. More possibilities.” and “Explore before you commit.” The earlier colour palette and dinner-fork mascot in section 12 are not the interface.

> Fork — stop guessing. Try the alternatives.

**Revision:** 30 September 2026 — concise positioning and explicit usefulness.

**Short description:** When your coding agent asks “How should this work?”, Fork builds the options. Grok Bot tries them with different user goals, shows the trade-offs, and saves your decision so the agent can keep building.

**Who it is for:** developers and founders who need to see it working before they know what they want.

**When they would use it:** a coding agent reaches a meaningful product choice—filters or chat, a form or a guided flow—and the builder cannot confidently choose from a written explanation. They run `/fork`, try the working options, inspect Grok Bot’s observations, and choose a direction. The decision stays with the code for future agent sessions.

**Why use it:** it brings alternative implementations, browser walkthrough evidence and the decision record into one repeatable development workflow. The intended benefit is less manual setup and less repeated explanation when exploring a product choice. Do not claim measured time savings, customer adoption or demand without evidence. Cheap, obvious decisions do not need Fork.

**Why now:** agents make it cheaper to explore working alternatives. People still need to choose between them.

This is the implementation brief for a solo, 4.5-hour Cursor Hackathon Prague build. Put it in the repo as `SPEC.md`. Follow the build order. Stretch features are only built after the core is working and rehearsed.

**This revision replaces the human A/B experiment.** No audience recruitment, Slack nudges, human-participant target, synthetic participant generator, conversion confidence intervals, revenue-uplift estimates, prediction-versus-human-results reveal, or automatic Ship/Kill verdict. The primary demo is a short stage pitch; it also works whenever a judge walks over. Neither format requires audience participation.

---

## 1. Product and core loop

Fork is a Cursor workflow for resolving product decisions through working code. Grok Bot explores the alternatives, and the human choice becomes context for the next coding agent. It explores different product assumptions, not multiple attempts at the same prompt or cosmetic design variations.

**Developer-tool identity:** the demo starts in Cursor with `/fork`, shows actual implementation files and working alternatives, follows Grok Bot into its browser investigation, and finishes in the repository with a recorded decision and an explicitly adopted implementation. The show catalogue is an example application, not the product. The evidence dashboard supports this development loop; it is not a standalone persona-testing product.

**Event constraints:** doors/networking at 12:30; kickoff at 13:00; build 13:30–18:00; pitches and voting 18:00–19:00. Solo builds are preferred. Individual pitch length and who votes are not specified in the supplied event information: confirm at kickoff. Cursor/Grok Bot credits are supplied at check-in; verify whether separate xAI API usage is included before relying on them. Grok Bot is optional at the event, so its value must be demonstrated through useful work rather than sponsor branding. Follow the organiser’s rules on pre-event preparation; this document is a plan, not an assumption that advance implementation is permitted.

1. **Question:** a meaningful product ambiguity comes up during development.
2. **Frame:** Grok Bot proposes up to four distinct approaches and names the assumption each explores. The developer approves the shortlist and budget.
3. **Build:** the coding agent implements alternatives in isolated variant directories using shared data and visual components.
4. **Investigate:** Grok Bot uses the actual alternatives on its own cloud computer, following explicit persona missions under specified device conditions.
5. **Compare:** Fork displays live previews, actual run evidence and contextual trade-offs. A judge can optionally choose one supported run or twist.
6. **Choose:** the developer chooses an approach, asks for a revision, or defers the decision.
7. **Remember:** Fork saves the decision, evidence references, caveats and rationale in the repo. Explicit adoption sets the selected implementation as the default.

**Positioning:** try the alternatives before committing to the build.

**What the evidence means:** these are agent walkthroughs of defined scenarios. They can reveal behaviour, constraint failures, friction and implementation costs. They do not establish human preferences, accessibility compliance, conversion impact or market demand. Display “Agent walkthroughs · not real-user research” on the comparison and evidence views.

**Scope:** configuration supports 2–4 alternatives; the hackathon implements three. One starter application and one question. The minimum complete demo has four authentic runs: The Planner across all three alternatives, plus The Speedrunner on one explicitly selected alternative already covered by The Planner. Full nine-run coverage is a target, not a release gate. Generic repository integration and real git worktrees are stretch scope.

---

## 2. Demo question and alternatives

**Question:** “How should this product help someone choose a show: browse, ask, or guide?”

| ID | Name | Experience | Assumption explored |
|---|---|---|---|
| browse | Browse | Show cards with filters | People can express their needs as explicit constraints |
| ask | Ask | Open-ended Grok conversation returning show cards | People can describe nuanced needs in their own words |
| guide | Guide | Short sequence of structured choices, then matching cards | People benefit from help narrowing the choice |
| hybrid | Hybrid — stretch only | Browsable list with conversational refinement | Conversation is useful as an enhancement to browsing |

All variants use the same catalogue, price data, style, card component and final “Choose this show” action. Vary the finding mechanism deliberately. Do not handicap a variant to manufacture a result. Keep ordinary affordances such as Back and visible loading states.

This is a choice between potentially valid approaches. The demo is not about catching a planted bug. Do not assume which variant will win or claim one approach takes weeks based on a prototype built this afternoon.

---

## 3. Grok Bot: the main character

Grok Bot owns framing, browser investigation and evidence synthesis. Cursor/coding agents implement the variants. The xAI API powers the Ask variant and may generate commentary, but API calls alone do not count as Grok Bot operating its computer.

### Three named profiles

| Profile | Device and explicit needs | Mission | Personality |
|---|---|---|---|
| The Planner | Desktop, 1440×900 target viewport, enlarged text at 125%; prefers visible choices and is unfamiliar with conversational interfaces. Illustrative older desktop-user scenario. | Find a comedy tonight, suitable for a date, at most £80 per person. | Treats a night out like a military operation |
| The Speedrunner | Mobile-sized viewport, 390×844 target; minimise unnecessary text entry; no hover-dependent actions. Illustrative younger phone-user scenario. | Find a funny show tonight for a date, at most £80 per person. | Personally offended by unnecessary steps |
| The Group Organiser | Desktop, 1280×800 target; several competing requirements; revise the request without restarting. | Find a show tonight for adults and a 15-year-old, at most £80 each, runtime at most 150 minutes. Then lower the budget to £50 each. | Has been involuntarily appointed to organise everyone's happiness |

Age is optional descriptive context, not a behavioural rule. Never instruct the Bot to simulate cognitive limitations because of age. Comedy is about the situation, not age or ability. Keep the character title prominent; concrete device settings, needs and mission determine the run.

A desktop browser with a narrow viewport is **mobile emulation**, not a real iPhone or Safari test. Do not claim touch, virtual-keyboard behaviour or mobile latency unless actually reproduced with supported tooling. Record actual settings and unsupported capabilities; do not silently label a desktop run “iPhone tested.”

**Required queue:** The Planner runs Browse, Ask and Guide, then The Speedrunner runs one of those alternatives chosen before collecting results (default: Ask). This gives three comparable implementations plus one contrasting device/interaction scenario. Do not infer that the single mobile run ranks all alternatives on mobile.

**Stretch queue:** complete the other two Speedrunner runs and all three Group Organiser runs, for nine cells total. The Group Organiser, its standard budget twist and optional live twists are stretch until the four-run core and repo decision loop work. Keep the profile definitions ready without requiring those runs.

One Bot runs sequentially. Each run gets a fresh session and the same mission for its profile. Rotate variant order for additional profiles. Fresh browser state does not erase the Bot’s prior knowledge; describe these as comparable scripted investigations, not blinded experiments.

### Core Bot workflow

- Read the question and variant shortlist; state what each option explores.
- Open the run URL and use the application visibly through its browser.
- Follow only the mission, interface and catalogue shown to it. No reading source code, hidden answer keys or selecting via backend APIs.
- Record a short factual action trace, observed friction and evidence attachments.
- Submit the final selection or a blocked/timeout outcome through the run protocol.
- Let deterministic application code evaluate explicit mission constraints.
- Summarise observations and unresolved hypotheses after the runs.

The Bot may use terminal/API tools for run setup, artifact upload and reporting. Those tools must not substitute for using the interface during the mission. Record every attempt; retries create a new linked run and never replace a failed first attempt.

---

## 4. Funny and impressive, without fake findings

**Rule: characterful commentary, factual evidence.**

Each run has four beats:
1. Character entrance card: name, mission and device.
2. Real browser action with a concise factual caption.
3. One or two dry observations, only when supported by what happened.
4. Evidence receipt: selected show, constraint result, screenshot and trade-off.

Tone examples, not mandatory lines or prewritten findings:
- Planner, only after an over-budget suggestion: “An interesting interpretation of ‘under £80’.”
- Speedrunner, only after avoidable additional inputs: “We've turned choosing a show into homework.”
- Group Organiser, when the budget twist arrives: “Update: apparently Dave has opinions.”

Separate factual narration from character commentary in the run data. Attach commentary to the event that prompted it. Do not invent frustration, hesitations, errors or clicks. No constant roasting or compulsory negative verdicts. A smooth run may get a positive remark or no joke.

**Live twist:** allow a judge to select a character, an alternative and one supported change, such as lowering the budget to £50 or adding the teenager constraint. The Bot then attempts to revise the result. Use only predefined, evaluable twist types. For the Group Organiser, the £50 twist is part of the standard mission and must occur in every compared variant.

Judge involvement is optional. The complete story must work using saved actual runs. Voice is stretch; captions are the default.

---

## 5. Stack and integration spike

Keep one deployable comparison application:
- Cloudflare Workers with Hono.
- Cloudflare D1 for configurations, runs, events and decision records.
- TypeScript + Vite, shared components, no heavy framework required.
- Poll active run state every 1 second; no websockets required.
- xAI API via server-side calls, model from `GROK_MODEL`; confirm availability before building.
- One Node CLI, `scripts/fork.mjs`.
- Grok Bot on its actual computer, using the deployed app and a small authenticated run protocol. Screenshots and concise action traces are the core evidence format; full video is stretch.
- Prefer the Bot's supported local screenshot/video capture; store artifacts as files in the evidence directory and upload them through a bounded authenticated endpoint if needed. Optional R2 binding serves uploaded media; use screenshots plus event replay if video capture/storage is unavailable. Never put image/video base64 blobs in D1.

Environment:
```
XAI_API_KEY=
GROK_MODEL=
ADMIN_KEY=
BOT_INGEST_KEY=
PUBLIC_BASE_URL=
```
D1 is a Worker binding. Optional R2 is a separate binding. No Slack configuration is needed.

**First 20-minute gate:** prove that Grok Bot can open the deployed URL, perform one real browser interaction, capture one piece of evidence, and submit a result. Also check whether viewport adjustment is supported. Do this before building the gallery.

Do not assume a native API for remotely starting Grok Bot runs. Core dispatch is an explicit mission handed to the Bot in its conversation, using a ready-to-copy prompt/run link. The app tracks queued runs; a button alone must not imply the Bot has started. A verified automation mechanism may replace the manual handoff later.

If viewport resizing is unsupported, run a fixed-width device preview and label it “layout preview,” or mark the profile unsupported. If video is unsupported, use timestamped screenshots and action events. If actual Bot browser operation cannot be demonstrated, flag that core blocker rather than substituting fake activity.

---

## 6. Repository structure

```
SPEC.md
AGENTS.md
fork.config.json
decisions/
evidence/<run-id>/
src/worker.ts
src/db/schema.sql
src/shared/shows.ts
src/shared/evaluate.ts
src/shared/types.ts
src/shared/components/
src/config/show-search.ts
src/variants/browse/
src/variants/ask/
src/variants/guide/
src/gallery/
src/run-host/
src/admin/
scripts/fork.mjs
.cursor/commands/fork.md
.cursor/rules/fork.mdc
bot/FORK_BOT.md
```

`evidence/<run-id>/` holds exported screenshots/video, action trace and manifest. Remote media references must retain a stable artifact ID; export media with decision evidence when available. Missing artifacts stay explicitly missing.

---

## 7. Configuration

```json
{
  "id": "show-discovery-001",
  "question": "How should someone choose a show: browse, ask, or guide?",
  "variants": [
    {"id": "browse", "name": "Browse", "path": "src/variants/browse"},
    {"id": "ask", "name": "Ask", "path": "src/variants/ask"},
    {"id": "guide", "name": "Guide", "path": "src/variants/guide"}
  ],
  "profiles": [
    {"id": "planner", "name": "The Planner", "missionId": "date-night", "viewport": {"width": 1440, "height": 900}, "textScale": 1.25, "deviceMode": "desktop"},
    {"id": "speedrunner", "name": "The Speedrunner", "missionId": "date-night", "viewport": {"width": 390, "height": 844}, "textScale": 1, "deviceMode": "mobile-emulation"},
    {"id": "organiser", "name": "The Group Organiser", "missionId": "group-night", "viewport": {"width": 1280, "height": 800}, "textScale": 1, "deviceMode": "desktop", "twistId": "budget-50"}
  ],
  "runBudget": {"maxVariants": 4, "maxActions": 25, "maxDurationSeconds": 150, "maxChatTurns": 5},
  "requiredRuns": [
    {"profileId": "planner", "variantId": "browse"},
    {"profileId": "planner", "variantId": "ask"},
    {"profileId": "planner", "variantId": "guide"},
    {"profileId": "speedrunner", "variantId": "ask"}
  ],
  "evidenceLabel": "Agent walkthroughs — not real-user research",
  "commercialScenario": null
}
```

Validate 2–4 variants, unique IDs, valid profile/mission references and required-run pairs. Use arrays and dynamic layouts; do not hardcode A/B column assumptions. Three alternatives are required for the main demo; Hybrid is stretch.

Create immutable snapshots of config, catalogue, variant/build version, model and mission for each run. Editing any of these after capture produces a new version; never silently compare results from different builds as identical conditions.

---

## 8. Catalogue and mission evaluation

Use 14 invented West End-style shows. No real titles or live bookings.

Each show has:
`id, title, genre, tonight, time, priceGbp, runtimeMins, minAge, dateSuitable, vibeTags, description, posterColour`.

Use a concrete fictional price, not an ambiguous “from” price. All variants expose the same relevant fields. Include multiple valid choices for each mission and near-misses: over budget, wrong night, age restriction or excessive runtime. Ensure the £50 twist still has at least one valid choice.

Keep explicit constraints in structured mission definitions. Example date-night mission: tonight, funny (comedy genre or defined laugh-out-loud tag), price ≤ £80, dateSuitable. Group mission: tonight, minAge ≤ 15, price ≤ £80, runtime ≤ 150; after twist, price ≤ £50.

`evaluate.ts` checks a selected show against the mission snapshot on the server. It returns pass/fail per explicit constraint. Descriptions like “romantic” or “easy to use” are observations/hypotheses, not fabricated objective scores.

Test evaluator boundaries, invalid IDs, missing data and twist evaluation. This is not statistical inference: remove Wilson intervals, bootstrap code, participant rates and confidence meters.

---

## 9. Variant experience

All three use a shared header, catalogue cards, GBP prices, visible constraints and large tap targets (minimum 48px). A small banner says “Demo catalogue · no booking or payment.”

- **Browse:** filter chips for tonight, genre, price, runtime and age suitability; consistent results and visible active filters.
- **Ask:** short conversation plus up to three matching cards. Send the catalogue and bounded message history to Grok. Follow-up changes are supported. Validate JSON and show IDs server-side. Render text safely. Log invalid IDs or malformed replies; never silently turn them into invented successes.
- **Guide:** a few steps for date, budget and preferences, then matching cards. Allow Back/edit without restarting. Age/runtime needs remain expressible.

The Ask system prompt requires JSON: `{"reply":"short explanation","showIds":["id"]}`. Only IDs from the catalogue may be rendered. Timeout after eight seconds with an honest retry state; record timeout events. Do not substitute Browse on failure.

Final action: “Choose this show.” In a twist run, the first choice is provisional; apply the new constraint and require a final choice. Count mission success on the final criteria and retain both stages.

Separate free exploration URLs from tracked run URLs. A judge browsing must not modify recorded evidence. Confirm API access at check-in; if credits do not cover the Ask variant, use only an explicitly configured available API budget and show errors honestly rather than implying free sponsor-funded access. Rate-limit chat, bound input/history, keep API keys server-side and disable live calls when the configured spending budget is reached.

---

## 10. Run protocol and data model

API routes:
- `GET /api/config`: public non-secret configuration.
- `POST /api/runs`: admin creates a run from a frozen variant/profile snapshot and obtains a run-scoped session token.
- `GET /run/:id`: mission card then variant host; only the run-scoped token authorises event submission.
- `POST /api/runs/:id/events`: append idempotent application events, not arbitrary cross-run events.
- `POST /api/runs/:id/observations`: authenticated Bot trace, commentary and artifact references.
- `POST /api/runs/:id/finish`: server finalises outcome and computes constraints from catalogue/mission data. Do not trust a client-supplied pass value.
- `GET /api/results`: sanitised evidence grid and run statuses.
- `POST /api/explain`: admin-triggered, cached synthesis of a specified evidence snapshot.
- `POST /api/decisions`: explicit human decision with rationale and referenced run IDs.

Protect admin operations through an authenticated session/header; do not use `?key=...` URLs that leak into screenshots, history or links. Use run-scoped credentials for run events. Bot credentials are restricted to needed reporting actions. Normal public previews cannot reset data or finalise someone else's run.

D1 entities:
- `experiments`: id, question, config_json, version, created_at.
- `runs`: id, experiment_id, variant_id, profile_id, mission_snapshot_json, config_version, build_id, actual_device_json, status, started_at, finished_at, parent_run_id, outcome_json.
- `events`: id, run_id, client_event_id UNIQUE within run, type, payload_json, recorded_at, sequence.
- `artifacts`: id, run_id, type, storage_reference, captured_at, available, description.
- `decisions`: id, experiment_id, action, selected_variant_id nullable, rationale, evidence_snapshot_json, created_at.

Run states: queued → running → completed | blocked | timed_out | error | unsupported. Unscheduled comparison cells display “Not run” and do not require a run record. A completed run can fail mission constraints. Distinguish infrastructure errors from application observations. Enforce idempotent start/finish and preserve unfinished/error runs.

Record:
- Actual navigation/selection/filter/guide/chat events where instrumented.
- Bot action count only if supported by a trace; otherwise unknown, never infer an exact count from application events.
- Browser-run wall time, explicitly labelled agent timing, not human completion time.
- Ask API latency, token usage and actual/estimated cost provenance.
- Constraint result, chosen show, backtracking observed, screenshots/video and commentary.

Missing measurements display “Not captured.” If API pricing is not configured from a verified source, show usage rather than an invented cost. Separate chat-service cost from Grok Bot orchestration cost; the latter may be unavailable.

---

## 11. Evidence and recommendations

Use profiles as rows and alternatives as columns. The core view shows the two required profiles with four captured cells; unrun cells say “Not run,” with no implied verdict. The third profile is an expandable stretch row. Each captured cell shows run status, mission-constraint outcome and a screenshot thumbnail. On selection, open the action trace and receipt. Nine cells are not required for a complete demo.

There is no aggregate persona “conversion rate,” weighted winner score, high-confidence human prediction or statistical ranking. One run per cell provides examples, not reliable estimates. Compare alternatives within the same profile, not different missions against each other.

Separate three layers:
1. **Observed:** what the actual run and backend recorded.
2. **Interpretation:** Grok's explanation linked to those observations.
3. **Human choice:** selected approach, reason and unresolved questions.

Synthesis prompt:
> Compare only the supplied run evidence. Cite run/event IDs for factual claims. Distinguish explicit-constraint outcomes from subjective interpretation and missing evidence. Describe trade-offs by mission; do not invent a universal winner, customer preferences, conversion effects, age-based behaviours or commercial uplift. End with what these agent walkthroughs cannot establish and one useful next investigation. Keep the main summary under 120 words.

A successful, unchanged recommendation after investigation is allowed. If the Bot changes its initial view, show the evidence that changed it; do not force a twist for entertainment.

Core actions: **Choose this approach**, **Revise**, **Defer**. Choosing remains human-controlled. No automatic shipping or publication.

Optional commercial panel, only after rehearsal: estimate operating costs from observed API usage and explicit volume assumptions. Label it a cost scenario, not an ROI or revenue forecast. Currency conversion requires an explicit rate; keep GBP catalogue prices separate from any EUR cost scenario.

---

## 12. Gallery and presentation design

Preserve the original light, playful visual identity:

| Token | Hex | Use |
|---|---|---|
| Paper | #FFFFFF | Background |
| Mist | #F2F3F8 | Secondary surfaces |
| Ink | #1C1B3A | Text and outlines |
| Tangerine | #FF7A1A | Browse |
| Grape | #7B5CFF | Ask |
| Teal | #008C95 | Guide |
| Mint | #12B886 | Verified constraint pass |
| Sunshine | #FFC933 | Open questions or pending |
| Coral | #FF5A5F | Failed constraints or run error |

Display: Bricolage Grotesque. Body: Onest. Font fallbacks required. Flat colours, generous space, no decorative gradients or soft-shadow card wall. Primary buttons may use a crisp 2px Ink offset shadow. Labels accompany colour.

**Signature screen:** three possible futures, three character cards and actual browser evidence. Replace participant jars, falling balls, euro value bands and sealed cards entirely.

- Gallery: three preview cards with approach, assumption and Open action.
- Compare: profile × alternative grid, concise verdicts, click to inspect evidence.
- Run view: browser capture/replay, active character card, factual action caption and occasional separate character remark.
- Decision: selected approach plus evidence and rationale; show the repo output.

One persistent “Agent walkthroughs · not real-user research” label. Actual viewport/mode is inspectable. A 390px-wide view says “Mobile emulation,” not “iPhone tested.” On the projector, show a clear overview and drill down; do not cram nine videos into one unreadable screen.

**Fork logo/mascot:** keep the chunky dinner-fork/git-branch SVG, lowercase fork wordmark, dot eyes and rounded Ink handle. Three tines may carry the variant colours. The mascot introduces options and acknowledges the human choice. It does not spear participants, announce statistical winners or perform Kill animations.

Motion: brief character entrance, highlight the active approach, selection stamp once. Respect reduced motion. Captions first; voice and elaborate character art are stretch. No fake terminal activity or fabricated browser motion.

Puns are limited to “Fork it” and “Forked.” Operational buttons remain plain.

---

## 13. Replay and optional live mode

Primary stage demo mode uses actual saved Bot screenshots and action traces, available instantly with no recruitment or judge action. Keep a short cut for roaming judges. Full video replay and live twists are stretch; basic screenshot navigation is sufficient.

- Replay a short recording when supported; otherwise show an explicitly labelled “Screenshot replay” with timestamped action events.
- Label “Recorded agent run,” its build and captured time. Never present prerecorded evidence as live.
- Allow play, pause, restart and selecting another grid cell. Playback does not modify run data.
- Show gaps/missing captures explicitly; do not fabricate transitions or force a successful outcome.
- Export a local backup of evidence and the demo video before rehearsal.

Optional live run: a judge chooses profile, approach and a supported twist. Operator dispatches the ready-to-copy mission to Grok Bot. Show queued/running accurately, with a time limit. If it blocks or times out, retain that result and return to the saved comparison. Nothing in the pitch depends on it finishing.

One Bot's shared computer must not be subject to competing manual and automated browser control. Operator hands control back before a live run.

---

## 14. Bot instructions (`bot/FORK_BOT.md`)

The implementation must create a reusable instruction file covering:

1. Read approved variant shortlist, profile, mission and run budget.
2. Establish a fresh browser context or verified reset. Report actual viewport/text settings and unsupported emulation.
3. Open the run URL, read the visible mission and click Start.
4. Use the interface only to fulfil the mission. Do not inspect hidden evaluation data or source.
5. Keep a brief factual trace, capture at least the initial state, noteworthy friction and final state when possible.
6. If the standard mission includes a twist, apply it consistently after a provisional choice. Record original and revised constraints.
7. Add at most two character remarks, grounded in actual events. No demographic jokes.
8. Stop at completion, an explicit blocker or the budget. Preserve API failures and unsuccessful attempts.
9. Submit observations and artifacts; let the server evaluate the selected show.
10. Move to the next queued run with reset state. After the batch, synthesise trade-offs without human-behaviour claims.

The builder must validate the actual Grok Bot setup rather than invent an invocation API. Core operation can be one user message asking the Bot to execute the approved queue. Automatic background scheduling is unnecessary.

---

## 15. CLI, repo memory and Cursor integration

```
node scripts/fork.mjs status
node scripts/fork.mjs export-evidence
node scripts/fork.mjs record --action defer --reason "Need to explore another mission"
node scripts/fork.mjs record --action choose --variant guide --reason "Selected for explicit step-by-step choices"
node scripts/fork.mjs adopt --variant guide --decision <id>
```

`record` fetches an immutable results snapshot, writes `decisions/<id>.md`, and idempotently updates a short entry under `## Product decisions` in AGENTS.md. It does not change the product default. Support choose, revise and defer; no winner is required.

`adopt` requires an explicit variant and compatible chosen decision. It updates `src/config/show-search.ts` and offers an optional commit containing only Fork-owned changes. Never stage unrelated work, overwrite a dirty conflicting file, deploy or publish automatically. Real branch merging is stretch; the core selects a default in one application.

Decision record fields:
- Question, date, chosen/deferred/revise action, variant and human rationale.
- Alternatives and assumptions investigated.
- Build/config/catalogue/model versions and run IDs.
- Profile/device/task matrix with explicit-constraint results.
- Evidence paths, observed limitations and missing captures.
- Grok interpretation separated from observed facts.
- “Agent walkthroughs, not real-user research.”
- Scope of the decision and conditions for revisiting it.

AGENTS.md contains a link and scoped instruction, not a permanent prohibition:
> Show discovery: currently use Guide, selected by the owner after the recorded Fork walkthroughs. See decisions/<id>.md for rationale, evidence and limitations. This does not establish customer preference or conversion benefit. Revisit when requirements or evidence change.

Use actual dates and outcomes; never copy invented sample numbers into the file.

**`.cursor/commands/fork.md`:** restate the product question; inspect existing decisions; propose 2–4 distinct approaches, each with an assumption and shared constraints; get the shortlist approved; implement in separate variant directories; register them in config and routing; validate each preview; generate run briefs; print the gallery URL and Grok Bot handoff. Do not claim evidence exists before runs complete.

**`.cursor/rules/fork.mdc`:** consult existing decisions before product clarification. Suggest Fork when experiencing alternatives would help a meaningful decision. For a cheap reversible choice, choose a simple default and explain it. Fork is not required for every UI detail.

---

## 16. Admin and resilience

Admin controls: inspect queued/completed runs, copy dispatch prompt, attach/import real evidence, request synthesis, replay, select/record decision, export backup. Reset is optional and requires confirmation; never needed during the demo.

No participant recruitment, Slack automation, synthetic-outcome toggle or public results mutation. A development fixture must remain visibly separate from captured evidence and must not enter decision exports as real work.

When the explanation API fails, show deterministic constraint receipts and observed events. When a variant fails, show its actual error and keep other evidence accessible. Do not silently switch implementation. Cache summaries by evidence snapshot, not just experiment ID.

Productboard integration is stretch: read an existing spec and, with explicit approval, post a scoped decision summary back using verified permissions. Sponsor integration must not block the core. No claim of native integration until it works.

---

## 17. Build order — 13:30 to 18:00

At check-in, verify Cursor/Grok Bot access and whether separate xAI API credits are included. At kickoff, confirm pitch duration and preparation rules. Do not depend on sponsor credits covering unconfirmed services.

| Time | Work | Completion gate |
|---|---|---|
| 13:30–13:50 | Deploy minimal app; verify Bot browser access, screenshot capture, reporting and available device setup | One authentic browser interaction and screenshot captured |
| 13:50–14:15 | Catalogue, explicit mission evaluator, shared cards and Browse | Selection evaluated server-side; catalogue constraints work |
| 14:15–14:45 | Ask and Guide; register all variants | Three working previews with shared styling and bounded API calls |
| 14:45–15:05 | Minimal run protocol, screenshots, profile setup and four-run queue | One end-to-end run with frozen build/task references |
| 15:05–15:45 | Bot performs four required runs; developer builds simple evidence comparison and `/fork` command | Planner across all variants plus one Speedrunner run; failures retained |
| 15:45–16:15 | `fork record`, `fork adopt`, AGENTS.md output and basic synthesis | Complete Cursor → alternatives → Bot evidence → chosen implementation loop |
| 16:15–16:45 | Verify core; add grounded character captions and limited visual polish | Restartable short pitch with saved screenshots; no live generation required |
| 16:45–17:15 | Only if core works: additional persona runs or one live-twist rehearsal; freeze and export backup | Evidence matches final demo build; local backup recorded |
| 17:15–18:00 | Rehearse stage pitch and short version; fix blockers only | Presentation fits confirmed slot and works without participation |

**16:15 gate:** if the end-to-end development loop is incomplete, stop adding walkthroughs and decoration. Finish decision recording and explicit adoption before expanding the matrix.

Bot runtime is uncertain. Four authentic attempted runs with visible outcomes are the core; do not fabricate missing results or call blocked runs successful walkthroughs. If mobile emulation is unavailable, show the supported layout preview with its limitation, or explicitly mark the device scenario unsupported.

**Stretch order after the core works:** remaining persona runs; Group Organiser twist; full video replay; richer animation; detailed costs; Hybrid; automatic dispatch; external integrations. Voice is last. Never spend rehearsal time filling the grid.

**Minimum complete product:** three working alternatives, evidence from the four required runs (including honest failures), one simple comparison screen, `fork record`, explicit adoption, and a saved demo. Preserve the funny character captions; make animation optional.

---

## 18. Acceptance checklist

- [ ] Config and gallery support 2–4 options; three actual options work.
- [ ] All variants use the same catalogue and shared card styling.
- [ ] Each mission and standard twist has valid catalogue answers.
- [ ] Actual Grok Bot browser operation is demonstrated, not replaced by API-generated narration.
- [ ] A run is tied to profile, task, build, model and actual device settings.
- [ ] Fresh sessions do not carry previous selections/chat history into the next run.
- [ ] Final selection is validated by server-side constraints; invalid IDs cannot pass.
- [ ] Runs record failures, timeouts and missing evidence without silent replacement.
- [ ] Mobile emulation/layout preview is labelled accurately; no unsupported iPhone claims.
- [ ] Commentary cites actual events and avoids demographic stereotypes.
- [ ] Run timing is labelled agent timing; no human conversion or ROI inference.
- [ ] Planner has recorded runs across all three options; one Speedrunner run is recorded on a preselected option.
- [ ] Every required run has an actual outcome, including honest failures; unrun cells are labelled.
- [ ] Additional five runs and Group Organiser twist are optional, not completion gates.
- [ ] Recorded replay is labelled and matches the saved evidence snapshot.
- [ ] If a live twist is implemented, it works or fails visibly without breaking the saved demo.
- [ ] API keys remain server-side and admin/run writes are authenticated and bounded.
- [ ] `record` supports defer/revise; `adopt` requires an explicit choice.
- [ ] AGENTS.md update is idempotent, scoped and linked to evidence.
- [ ] No unrelated changes are staged or committed.
- [ ] Saved stage pitch starts in Cursor and ends with the repo decision/default implementation.
- [ ] Show catalogue is presented as the example; Fork is presented as the developer workflow.
- [ ] Saved presentation works without participants, recruitment or live generation.
- [ ] Pitch duration and API-credit coverage are verified with the organisers.
- [ ] Local backup video and evidence are available.

---

## 19. Demo storyboard

### Primary: stage pitch, adjustable to the confirmed slot

**Judging:** execution is scored 1–5 and doubled; usefulness and clarity are each scored 1–5, for a maximum of 20. Demonstrate the working loop first. Answer “would someone use this?” with the specific user and trigger above, not an unsupported adoption claim. Keep the explanation short enough that a judge can repeat what Fork does.

Prepare a 90-second core and a three-minute expanded version. The supplied schedule allocates 18:00–19:00 to pitches and voting but does not state the individual pitch duration.

- **0:00 — Cursor:** “When your coding agent asks ‘How should this work?’, Fork builds the options. Grok Bot tries them, shows the trade-offs, and saves your choice so the agent can keep building.” Show the product question and `/fork` command. Make the user explicit: “For developers and founders who need to see it working before they know what they want.”
- **0:15 — Implementations:** show Browse, Ask and Guide, their actual variant files and working previews. “This show catalogue is our example. Fork is the workflow around it.” If generation is recorded or already completed, label that honestly.
- **0:30 — Grok Bot's computer:** replay an authentic screenshot sequence or recorded run, with one mission and at most one grounded comic remark. Explain that the Bot actually used the interface.
- **0:50 — Evidence:** show the Planner's three runs and the contrasting Speedrunner scenario. Describe one observed trade-off. These are agent investigations, not proof of human preference.
- **1:05 — Repository:** choose an implementation with a reason; run `fork record` and explicit `fork adopt`. Show the scoped AGENTS.md diff and the selected default working.
- **1:25 — Close:** “The next coding agent gets the implementation, the decision and the evidence. When your agent asks you a product question, stop guessing. Fork it.”

The three-minute version adds evidence detail, another captured profile if available, and a short actual twist recording if implemented. Avoid spending the pitch waiting for live generation.

### Secondary: roaming judges

Use the same loop in 60–90 seconds. Optionally offer a supported live mission only if the judge has time and the integration is rehearsed. Return to saved evidence if it exceeds the available window.

Do not script a specific winner, joke, failure or change of recommendation as if it already occurred. Use actual captured outcomes. Make the characters entertaining, but keep the opening and closing anchored in development: code alternatives in, an informed implementation decision back out.
