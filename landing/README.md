# Fork landing preview

`index.html` is the supplied standalone Fork landing page. Its supplied images and styles are embedded. No build step is required. The README hero is a browser capture of this original landing page. This folder is independent of the hackathon Worker app.

## Cloudflare Pages

Connect `Mark-Prethero/get-fork` to a Pages project in the Northbound Studio account:

- Production branch: `main`
- Framework preset: None
- Build command: leave empty
- Build output directory: `landing`
- Build watch paths: `landing/*`

Changes to this folder on `main` update the hosted page. Other branches can receive preview deployments. Keep this folder when merging the Cursor app branch.

## Link the app

The primary CTA opens the one-minute pitch at https://get-fork-demo.proud-wood-517d.workers.dev/pitch. The working demo remains linked separately. To change it, set `window.FORK_DEMO_URL` in `index.html` to that HTTPS URL. Until then, the demo button opens the built-in walkthrough. The decision download remains an illustrative example.

## Local preview

From this folder, run `python3 -m http.server 8080` and open `http://localhost:8080`.

Added by Mark Prethero via Codex on Mark MacBook.
