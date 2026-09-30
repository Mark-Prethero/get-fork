# Fork landing preview

`index.html` is the supplied standalone Fork landing page. Its images and styles are embedded, so no build step is required. This folder is independent of the hackathon app on the Cursor branch.

## Cloudflare Pages

Connect `Mark-Prethero/get-fork` to a Pages project in the tickadoo account:

- Production branch: `main`
- Framework preset: None
- Build command: leave empty
- Build output directory: `landing`
- Build watch paths: `landing/*`

Changes to this folder on `main` update the hosted page. Other branches can receive preview deployments. Keep this folder when merging the Cursor app branch.

## Link the app

When the hackathon app has a public URL, set `window.FORK_DEMO_URL` in `index.html` to that HTTPS URL. Until then, the demo button opens the built-in walkthrough. The decision download remains an illustrative example.

## Local preview

From this folder, run `python3 -m http.server 8080` and open `http://localhost:8080`.

Added by Mark Prethero via Codex on Mark MacBook.
