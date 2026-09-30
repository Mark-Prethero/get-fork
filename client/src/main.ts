import "./styles.css";
import { api } from "./api.ts";
import { renderAdmin } from "./admin.ts";
import { renderCompare } from "./compare.ts";
import { mountExplore } from "./explore.ts";
import { gallery } from "./gallery.ts";
import { bindLinks } from "./render.ts";
import { renderRun } from "./run.ts";
import type { Show } from "@shared/shows.ts";

const root = document.querySelector<HTMLElement>("#app");

async function render(): Promise<void> {
  if (!root) return;
  const path = location.pathname.replace(/\/$/, "") || "/";
  try {
    if (path === "/") {
      const config = await api<{ question: string; evidenceLabel: string; adopted: { variantId: string } | null }>("/api/config");
      root.innerHTML = gallery(config);
    } else if (path === "/compare") {
      await renderCompare(root);
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
        mountExplore(root, { variantId, shows: config.shows, evidenceLabel: config.evidenceLabel });
      }
    } else {
      root.innerHTML = "<p class=\"shell\">This page is not part of Fork.</p>";
    }
  } catch (error) {
    root.innerHTML = `<p class="shell">${error instanceof Error ? error.message : "The page could not load."}</p>`;
  }
  bindLinks(root, (next) => {
    history.pushState({}, "", next);
    void render();
  });
}

document.addEventListener("click", (event) => {
  const link = (event.target as Element | null)?.closest?.("a[data-link]");
  if (!(link instanceof HTMLAnchorElement)) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  history.pushState({}, "", link.pathname);
  void render();
});

window.addEventListener("popstate", () => void render());
void render();
