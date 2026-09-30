import type { Show } from "../../shared/shows.ts";

export const askAssumption = "People can describe nuanced needs in their own words.";

export function catalogueForPrompt(shows: Show[]) {
  return shows.map((show) => ({
    id: show.id,
    title: show.title,
    genre: show.genre,
    tonight: show.tonight,
    when: show.whenLabel,
    time: show.time,
    priceGbp: show.priceGbp,
    runtimeMins: show.runtimeMins,
    minAge: show.minAge,
    dateSuitable: show.dateSuitable,
    vibeTags: show.vibeTags,
    description: show.description,
  }));
}

export function askSystemPrompt(shows: Show[]): string {
  return [
    "You help a person choose a show from the catalogue below.",
    "The real show names use illustrative demo prices, schedules and suitability. Do not present them as live offers or use outside knowledge to override the supplied scenario.",
    "Use only these shows. Return JSON only, with no markdown:",
    '{"reply":"short explanation","showIds":["id"]}',
    "showIds must contain 0 to 3 ids copied from the catalogue.",
    "If nothing fits, return an empty showIds array and say so in reply.",
    "Do not invent titles, prices, or ids.",
    "",
    "Catalogue:",
    JSON.stringify(catalogueForPrompt(shows)),
  ].join("\n");
}
