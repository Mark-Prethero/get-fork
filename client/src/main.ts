import "./styles.css";
import { api } from "./api.ts";
import { renderAdmin } from "./admin.ts";
import { renderCompare } from "./compare.ts";
import { mountExplore } from "./explore.ts";
import { selection } from "./flow.ts";
import { pitch } from "./pitch.ts";
import { walkthrough } from "./walkthrough.ts";
import { bindGallery, gallery } from "./gallery.ts";
import { esc } from "./render.ts";
import { renderRun } from "./run.ts";
import type { Show } from "@shared/shows.ts";

const root = document.querySelector<HTMLElement>("#app");
let renderVersion = 0;
let dispose: (() => void) | undefined;

async function render(): Promise<void> {
  if (!root) return;
  const version = ++renderVersion;
  dispose?.();
  dispose = undefined;
  const path = location.pathname.replace(/\/$/, "") || "/";
  root.dataset.page = path;
  try {
    if (path === "/") {
      const config = await api<{ question: string; evidenceLabel: string; adopted: { variantId: string } | null }>("/api/config");
      if (version !== renderVersion) return;
      root.innerHTML = gallery(config);
      dispose = bindGallery(root);
    } else if (path === "/pitch") {
      root.innerHTML = pitch();
      dispose = bindGallery(root);
    } else if (path === "/selection") {
      const config = await api<{ shows: Show[] }>("/api/config");
      if (version !== renderVersion) return;
      root.innerHTML = selection(config.shows);
    } else if (path === "/walkthrough") {
      root.innerHTML = walkthrough();
    } else if (path === "/compare") {
      const cleanup = await renderCompare(root);
      if (version !== renderVersion) cleanup();
      else dispose = cleanup;
    } else if (path === "/admin") {
      await renderAdmin(root);
    } else if (path.startsWith("/run/")) {
      await renderRun(root, path.slice("/run/".length));
    } else if (path.startsWith("/v/")) {
      const variantId = path.slice("/v/".length);
      if (variantId !== "browse" && variantId !== "ask" && variantId !== "guide") {
        root.innerHTML = "<p class=\"shell\">That approach is not in this build.</p>";
      } else {
        const config = await api<{ shows: Show[]; evidenceLabel: string }>("/api/config");
        if (version !== renderVersion) return;
        dispose = mountExplore(root, { variantId, shows: config.shows, evidenceLabel: config.evidenceLabel });
      }
    } else {
      root.innerHTML = "<p class=\"shell\">This page is not part of Fork.</p>";
    }
  } catch (error) {
    if (version !== renderVersion) return;
    root.innerHTML = `<p class="shell">${esc(error instanceof Error ? error.message : "The page could not load.")}</p>`;
  }
}

document.addEventListener("click", (event) => {
  const link = (event.target as Element | null)?.closest?.("a[data-link]");
  if (!(link instanceof HTMLAnchorElement)) return;
  if (event.button !== 0 || link.origin !== location.origin) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  history.pushState({}, "", link.pathname + link.search + link.hash);
  void render().then(() => { if (link.hash) document.getElementById(link.hash.slice(1))?.scrollIntoView({ block: "start" }); else window.scrollTo({ top: 0 }); });
});

window.addEventListener("popstate", () => { void render().then(() => window.scrollTo({ top: 0 })); });
void render();
