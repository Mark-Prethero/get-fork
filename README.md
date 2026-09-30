# Fork

When a coding agent asks “How should this work?”, Fork builds the options. Grok Bot tries them, shows the trade-offs, and saves the choice so the next agent can keep building.

The show catalogue is the example. Fork is the workflow.

## Run locally

```bash
npm install
cp .dev.vars.example .dev.vars
npm run setup
npm run dev
```

Open http://127.0.0.1:8787

Set `ADMIN_KEY` and `BOT_INGEST_KEY` in `.dev.vars`. Set `XAI_API_KEY` when Ask should call Grok. Until that key exists, Ask says it is unavailable and does not invent matches.

```bash
node scripts/fork.mjs status
node scripts/fork.mjs queue
node scripts/fork.mjs record --action defer --reason "Need another mission"
node scripts/fork.mjs adopt --variant guide --decision <id>
```

`adopt` updates `src/config/show-search.ts` only after a recorded choose decision. It does not deploy.

## Evidence

Agent walkthroughs are not real-user research. Comparison cells that were not run stay labelled “Not run”. Mobile frames are labelled “Mobile emulation”.

## Live demo and deployment

Landing: https://get-fork.pages.dev/

App and evidence: https://get-fork-demo.proud-wood-517d.workers.dev/

Both use Northbound Studio account `718dee00a59bf7488ca530d0f80c465b`. Pages deploys `landing/` from `main`. The Worker uses `wrangler.worker.jsonc` explicitly, so the Pages build does not ingest the app's Worker configuration.

```bash
npm ci
npm run check
npx wrangler d1 migrations apply fork-demo --remote -c wrangler.worker.jsonc
npm run deploy
```

Configure server secrets with `wrangler secret put XAI_API_KEY -c wrangler.worker.jsonc` (and ADMIN_KEY, BOT_INGEST_KEY). Never commit `.dev.vars`. Worker binding types are generated with `wrangler types src/worker-bindings.d.ts -c wrangler.worker.jsonc --include-runtime=false --strict-vars=false --env-interface=WorkerBindings`.

D1 holds runs, immutable decision snapshots and model-call reservations. Workers KV holds new screenshot uploads; the original six captured screenshots ship as static assets. Original exports retain build `2026-09-30.1`; the snapshot fields were reconstructed from that build's committed source, and uncaptured finish/capture timestamps are not inferred.

Ask uses the verified available `grok-4.20-0309-non-reasoning` model. The shared upstream timeout is twenty seconds: the original eight-second limit consistently expired before valid responses arrived. Upstream attempts are reserved before fetch and consume the configured 40-call demo budget even on failure. Ask failure is visible; no recommendations are substituted.

Retry unsuccessful required runs from Runs after saving an admin session. These are new attempts linked to the original run; they never overwrite historical outcomes. New runs are queued until the operator hands their mission to Grok Bot.

A decision recorded in the browser can be exported without creating a duplicate:

```bash
PUBLIC_BASE_URL=https://get-fork-demo.proud-wood-517d.workers.dev node scripts/fork.mjs record --decision <id>
```

The export uses the decision's saved evidence snapshot. Adoption must succeed on the server before the CLI writes the repo target; the app highlights the adopted option and reads the committed default after redeployment.

Reviewed and completed by Mark Prethero via Codex on Mark MacBook.
