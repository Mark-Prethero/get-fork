import { brand } from "@shared/brand.ts";
import { formatGbp, type Show } from "@shared/shows.ts";

export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

export function mark(className = "mark"): string {
  return `<svg class="${className}" viewBox="0 0 80 96" aria-hidden="true"><path fill="currentColor" d="M4 2h18L40 38l18-36h18L48 50v44H32V50z"/></svg>`;
}

export function icon(name: "browse" | "ask" | "guide"): string {
  if (name === "browse") {
    return `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`;
  }
  if (name === "ask") {
    return `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 6h14v9H8l-3 3z"/></svg>`;
  }
  return `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M8 7h12M8 12h12M8 17h12"/><circle cx="4" cy="7" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="17" r="1" fill="currentColor"/></svg>`;
}

export function shell(current: string, body: string): string {
  return `<div class="shell">
    <header class="top">
      <a class="brand" href="/" data-link>${mark()}<span>${brand.wordmark}</span></a>
      <nav class="nav">
        <a href="/" data-link ${current === "home" ? 'aria-current="page"' : ""}>Options</a>
        <a href="/compare" data-link ${current === "compare" ? 'aria-current="page"' : ""}>Evidence</a>
        <a href="/admin" data-link ${current === "admin" ? 'aria-current="page"' : ""}>Runs</a>
      </nav>
    </header>
    ${body}
  </div>`;
}

export function showCard(show: Show): string {
  return `<article class="show">
    ${show.imageUrl ? `<div class="show-art"><img src="${esc(show.imageUrl)}" alt="${esc(show.title)} artwork from tickadoo" width="960" height="540" loading="lazy" decoding="async" referrerpolicy="no-referrer" /></div>` : `<div class="swatch" style="background:${esc(show.posterColour)}"></div>`}
    <p class="genre">${esc(show.genre)}</p>
    <h3>${esc(show.title)}</h3>
    <p>${esc(show.description)}</p>
    <p class="scenario-label">Demo scenario</p>
    <div class="meta">
      <div><span>${esc(show.whenLabel)}</span><span>${esc(show.time)}</span></div>
      <div>${formatGbp(show.priceGbp)}</div>
      <div>${show.runtimeMins} min</div>
      <div>${show.minAge === 0 ? "All ages" : `Age ${show.minAge}+`}</div>
      <div>${show.dateSuitable ? "For a date" : "Not a date"}</div>
      <div>${esc(show.vibeTags.join(", "))}</div>
    </div>
    ${show.sourceUrl ? `<a class="show-source" href="${esc(show.sourceUrl)}" target="_blank" rel="noopener noreferrer">Show on tickadoo ↗</a>` : ""}
    <button class="primary" type="button" data-choose="${esc(show.id)}">Choose this show</button>
  </article>`;
}

export function bindLinks(root: HTMLElement, navigate: (path: string) => void): void {
  root.querySelectorAll<HTMLAnchorElement>("[data-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate(link.pathname);
    });
  });
}
