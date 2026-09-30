import { brand } from "@shared/brand.ts";
import { matchesBrowse, matchesGuide, type BrowseFilters, type GuideAnswers } from "@shared/match.ts";
import { type Show } from "@shared/shows.ts";
import { describeFilters, emptyBrowseFilters, genreOptions, priceOptions, runtimeOptions } from "../../src/variants/browse/index.ts";
import { answersFromGuide, guideSteps } from "../../src/variants/guide/steps.ts";
import { flowSteps, saveTrial } from "./flow.ts";
import { api } from "./api.ts";
import { esc, shell, showCard } from "./render.ts";

export interface ExploreContext {
  variantId: "browse" | "ask" | "guide";
  shows: Show[];
  evidenceLabel: string;
  runId?: string;
  token?: string;
  textScale?: number;
  onChoose?: (showId: string) => void;
  onEvent?: (type: string, payload: unknown) => void;
}

export function mountExplore(root: HTMLElement, ctx: ExploreContext, embedded = false): () => void {
  let active = true;
  const paint = (body: string) => {
    if (!active) return;
    root.innerHTML = embedded ? `<div class="variant" style="font-size:${ctx.textScale ?? 1}em">${body}</div>` : standalone(ctx, body);
  };
  if (ctx.variantId === "browse") mountBrowse(root, ctx, paint);
  else if (ctx.variantId === "ask") mountAsk(root, ctx, paint);
  else mountGuide(root, ctx, paint);
  return () => { active = false; };
}

function standalone(ctx: ExploreContext, body: string): string {
  const copy = brand.variants[ctx.variantId];
  const titles = { browse: "Find your next show.", ask: "Tell Grok what you're looking for.", guide: "Let's narrow it down." };
  const help = { browse: "Set your filters, explore the cards and choose a show.", ask: "Describe your evening. Grok will find matching shows from this demo catalogue.", guide: "Answer five quick questions, then choose from your matches." };
  return shell("", `
    ${flowSteps(0)}
    <nav class="variant-tabs" aria-label="Approaches">${(["browse", "ask", "guide"] as const).map(id => `<a href="/v/${id}" data-link ${id === ctx.variantId ? 'aria-current="page"' : ""}>${brand.variants[id].name}</a>`).join("")}</nav>
    <div class="explore-heading"><p class="kicker">Try ${esc(copy.name)}</p><h2>${esc(titles[ctx.variantId])}</h2><p class="lede">${esc(help[ctx.variantId])}</p></div>
    <div class="variant" style="font-size:${ctx.textScale ?? 1}em">${body}</div>
    <p class="demo-disclosure">${esc(brand.demoBanner)}</p>
  `);
}

function mountBrowse(root: HTMLElement, ctx: ExploreContext, paint: (body: string) => void): void {
  const filters = emptyBrowseFilters();
  const draw = () => {
    const active = describeFilters(filters);
    const matched = ctx.shows.filter((show) => matchesBrowse(show, filters));
    paint(`
      <div class="filters filter-panel" style="margin-top:18px">
        ${chip("Tonight", filters.tonight, "tonight")}
        ${genreOptions.map((genre) => chip(genre, filters.genres.includes(genre), `genre:${genre}`)).join("")}
        ${priceOptions.map((option) => chip(option.label, option.value !== null && filters.maxPrice === option.value, `price:${option.id}`)).join("")}
        ${runtimeOptions.map((option) => chip(option.label, option.value !== null && filters.maxRuntime === option.value, `runtime:${option.id}`)).join("")}
        ${chip("Suitable for age 15", filters.maxMinAge === 15, "age")}
      </div>
      <p class="active-filters">${active.length ? `Showing ${active.map(esc).join(" · ")}` : "No filters yet. The full catalogue is visible."}</p>
      <div class="shows">${matched.length ? matched.map(showCard).join("") : `<p class="note">Nothing in the catalogue matches these controls.</p>`}</div>
    `);
    root.querySelectorAll<HTMLButtonElement>("[data-chip]").forEach((button) => {
      button.addEventListener("click", () => {
        toggle(filters, button.dataset.chip ?? "");
        ctx.onEvent?.("filter", { ...filters });
        draw();
      });
    });
    bindChoose(root, ctx);
  };
  draw();
}

function toggle(filters: BrowseFilters, id: string): void {
  if (id === "tonight") filters.tonight = !filters.tonight;
  else if (id === "age") filters.maxMinAge = filters.maxMinAge === 15 ? null : 15;
  else if (id.startsWith("genre:")) {
    const genre = id.slice(6);
    filters.genres = filters.genres.includes(genre) ? filters.genres.filter((item) => item !== genre) : [...filters.genres, genre];
  } else if (id.startsWith("price:")) {
    const option = priceOptions.find((item) => item.id === id.slice(6));
    filters.maxPrice = filters.maxPrice === option?.value ? null : option?.value ?? null;
  } else if (id.startsWith("runtime:")) {
    const option = runtimeOptions.find((item) => item.id === id.slice(8));
    filters.maxRuntime = filters.maxRuntime === option?.value ? null : option?.value ?? null;
  }
}

function chip(label: string, pressed: boolean, id: string): string {
  return `<button class="chip" type="button" data-chip="${esc(id)}" aria-pressed="${pressed ? "true" : "false"}">${esc(label)}</button>`;
}

function mountAsk(root: HTMLElement, ctx: ExploreContext, paint: (body: string) => void): void {
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  let cards: Show[] = [];
  let status = "Choose an example or write your own request.";
  let diagnostics = "";
  const examples = ["A funny show tonight, for a date, under £80 per person.", "Something funny tonight for two adults, under £50 each.", "A show tonight for adults and a 15-year-old, under £80 each and 150 minutes."];
  let sending = false;
  let draft = "";
  const draw = () => {
    paint(`
      ${!messages.length ? `<section class="ask-start"><p class="kicker">Try a one-click example</p><div class="prompt-examples">${examples.map((text, i) => `<button class="example-prompt" type="button" data-example="${i}">${["Date night →", "A smaller budget →", "Taking a teenager →"][i]}<span>${esc(text)}</span></button>`).join("")}</div></section>` : ""}
      <div class="thread" aria-live="polite">${messages.map((message) => `<div class="bubble ${message.role}"><span class="speaker">${message.role === "user" ? "You" : "Grok"}</span>${esc(message.content)}</div>`).join("")}</div>
      <form class="composer"><label for="request">${messages.length ? "Refine your search" : "Your evening, in your words"}</label>
        <textarea id="request" name="message" aria-label="Your request" maxlength="400" ${sending ? "disabled" : ""} placeholder="Tell me about the occasion, budget and kind of show…">${esc(draft)}</textarea>
        <button class="primary" type="button" data-send ${sending ? "disabled" : ""}>${sending ? "Grok is finding your matches…" : "Find shows with Grok →"}</button>
      </form>
      <p class="note" data-status role="status">${esc(status)}</p>
      ${diagnostics ? `<details class="diagnostics"><summary>Response details</summary><p>${esc(diagnostics)}</p></details>` : ""}
      <div class="shows">${cards.map(showCard).join("")}</div>
    `);
    const sendFromForm = () => {
      const form = root.querySelector<HTMLFormElement>(".composer");
      if (!form) return;
      const message = String(new FormData(form).get("message") ?? "").trim();
      if (!message) return;
      void send(message);
    };
    root.querySelector("[data-send]")?.addEventListener("click", sendFromForm);
    root.querySelector(".composer")?.addEventListener("submit", (event) => {
      event.preventDefault();
      sendFromForm();
    });
    root.querySelectorAll<HTMLButtonElement>("[data-example]").forEach(button => button.addEventListener("click", () => { void send(examples[Number(button.dataset.example)] ?? ""); }));
    root.querySelector<HTMLTextAreaElement>("[name=message]")?.addEventListener("input", event => { draft = (event.target as HTMLTextAreaElement).value; });
    bindChoose(root, ctx);
  };
  async function send(message: string): Promise<void> {
    if (sending) return;
    sending = true;
    draft = "";
    messages.push({ role: "user", content: message });
    status = "Looking through the catalogue…";
    cards = [];
    draw();
    ctx.onEvent?.("chat", { role: "user", content: message });
    try {
      const result = await api<{
        reply: string;
        shows: Show[];
        rejectedIds: string[];
        latencyMs: number;
        model: string;
        usage: { promptTokens: number | null; completionTokens: number | null };
        cost: string;
      }>("/api/ask", { method: "POST", body: JSON.stringify({ messages, runId: ctx.runId }) }, ctx.token);
      messages.push({ role: "assistant", content: result.reply });
      cards = result.shows;
      const usage = `Tokens in ${result.usage.promptTokens ?? "not captured"}, out ${result.usage.completionTokens ?? "not captured"}. Cost ${result.cost}.`;
      status = cards.length ? `${cards.length} ${cards.length === 1 ? "match" : "matches"}. Choose a show or refine your request.` : "No matches yet. Try changing your budget or the kind of show.";
      diagnostics = `Reply in ${(result.latencyMs / 1000).toFixed(1)}s · ${result.model}. ${usage}`;
      if (result.rejectedIds.length) diagnostics += ` Rejected unknown ids: ${result.rejectedIds.join(", ")}.`;
      ctx.onEvent?.("chat", { role: "assistant", showIds: result.shows.map((show) => show.id), rejectedIds: result.rejectedIds, latencyMs: result.latencyMs });
    } catch (error) {
      draft = message;
      messages.pop();
      status = error instanceof Error ? error.message : "Ask did not answer.";
      ctx.onEvent?.("ask_error", { message: status });
    }
    sending = false;
    draw();
  }
  draw();
}

function mountGuide(root: HTMLElement, ctx: ExploreContext, paint: (body: string) => void): void {
  const selections: Record<string, string> = {};
  let step = 0;
  let answers: GuideAnswers | null = null;
  const draw = () => {
    if (answers) {
      const matched = ctx.shows.filter((show) => matchesGuide(show, answers as GuideAnswers));
      paint(`
        <p class="steps">Step ${guideSteps.length} of ${guideSteps.length}</p>
        <h2>These match the steps you took.</h2>
        <p class="quiet">${summary(selections)}</p>
        <div class="row"><button class="ghost" type="button" data-back>Back</button></div>
        <div class="shows">${matched.length ? matched.map(showCard).join("") : `<p class="note">Nothing in the catalogue matches these steps.</p>`}</div>
      `);
      root.querySelector<HTMLButtonElement>("[data-back]")?.addEventListener("click", () => {
        answers = null;
        step = guideSteps.length - 1;
        ctx.onEvent?.("back", { step });
        draw();
      });
      bindChoose(root, ctx);
      return;
    }
    const current = guideSteps[step];
    if (!current) return;
    paint(`
      <p class="steps">Step ${step + 1} of ${guideSteps.length}</p>
      <h2>${esc(current.prompt)}</h2>
      <div class="choices">${current.options.map((option) => `<button class="choice" type="button" data-option="${esc(option.id)}" aria-pressed="${selections[current.id] === option.id}">${esc(option.label)}</button>`).join("")}</div>
      <div class="row" style="margin-top:16px">${step > 0 ? `<button class="ghost" type="button" data-back>Back</button>` : ""}</div>
    `);
    root.querySelector<HTMLButtonElement>("[data-back]")?.addEventListener("click", () => {
      step = Math.max(0, step - 1);
      ctx.onEvent?.("back", { step });
      draw();
    });
    root.querySelectorAll<HTMLButtonElement>("[data-option]").forEach((button) => {
      button.addEventListener("click", () => {
        selections[current.id] = button.dataset.option ?? "";
        ctx.onEvent?.("guide_step", { step: current.id, value: selections[current.id] });
        if (step === guideSteps.length - 1) answers = answersFromGuide(selections);
        else step += 1;
        draw();
      });
    });
  };
  draw();
}

function summary(selections: Record<string, string>): string {
  return guideSteps.map((step) => {
    const label = step.options.find((option) => option.id === selections[step.id])?.label ?? "";
    return `${step.prompt} ${label}`;
  }).join(" · ");
}

function bindChoose(root: HTMLElement, ctx: ExploreContext): void {
  root.querySelectorAll<HTMLButtonElement>("[data-choose]").forEach((button) => {
    button.addEventListener("click", () => {
      const showId = button.dataset.choose ?? "";
      const show = ctx.shows.find((item) => item.id === showId);
      ctx.onEvent?.("choose", { showId });
      if (ctx.onChoose) {
        ctx.onChoose(showId);
        return;
      }
      if (!show) return;
      saveTrial(ctx.variantId, showId);
      history.pushState({}, "", "/selection");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
  });
}
