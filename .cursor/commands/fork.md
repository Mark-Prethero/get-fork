---
description: Frame a product choice, build the alternatives, and hand them to Grok Bot
---

The current example question is: How should someone choose a show: browse, ask, or guide?

1. Fetch the relevant upstream source and refresh stale work. Read `AGENTS.md` and `decisions/` before proposing anything. Use an adopted variant if one is recorded.
2. Restate the product question. If the choice is cheap and reversible, pick a simple default and explain it. Do not open Fork for every interface detail.
3. Propose 2–4 distinct approaches. Each needs an assumption and the constraints they share. Wait for the shortlist to be approved.
4. Implement the approved approaches in separate directories under `src/variants/`, using the shared catalogue, cards, and visual system.
5. Register them in `fork.config.json` and the app routes. Do not hardcode a two-column comparison.
6. Check that each preview loads and that the server evaluates a real selection.
7. With operator credentials configured locally, generate run briefs with `node scripts/fork.mjs queue` and print the gallery URL plus the Grok Bot handoff.
8. Do not claim evidence exists before those runs are finished. Failures stay visible.

## Current integration boundary

This is a repository-local Cursor command, not an installed extension or automatic remote dispatcher. Explain that the operator transfers each mission into the real Grok Bot app. Never expose xAI or admin keys in a handoff. Public demo walkthroughs remain separate from server-recorded runs. After the human decides, use the existing record/adopt CLI with operator authorization, then validate against fresh upstream before any push or deployment.
