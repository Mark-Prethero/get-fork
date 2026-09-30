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
