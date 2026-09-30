import { isFunny } from "./evaluate.ts";
import type { Show } from "./shows.ts";

export interface BrowseFilters {
  tonight: boolean;
  genres: string[];
  maxPrice: number | null;
  maxRuntime: number | null;
  maxMinAge: number | null;
}

export interface GuideAnswers {
  tonight: boolean;
  maxPrice: number;
  party: "date" | "teen" | "any";
  funny: boolean;
  maxRuntime: number | null;
}

export function matchesBrowse(show: Show, filters: BrowseFilters): boolean {
  if (filters.tonight && !show.tonight) return false;
  if (filters.genres.length > 0 && !filters.genres.includes(show.genre)) return false;
  if (filters.maxPrice !== null && show.priceGbp > filters.maxPrice) return false;
  if (filters.maxRuntime !== null && show.runtimeMins > filters.maxRuntime) return false;
  if (filters.maxMinAge !== null && show.minAge > filters.maxMinAge) return false;
  return true;
}

export function matchesGuide(show: Show, answers: GuideAnswers): boolean {
  if (answers.tonight && !show.tonight) return false;
  if (show.priceGbp > answers.maxPrice) return false;
  if (answers.party === "date" && !show.dateSuitable) return false;
  if (answers.party === "teen" && show.minAge > 15) return false;
  if (answers.funny && !isFunny(show)) return false;
  if (answers.maxRuntime !== null && show.runtimeMins > answers.maxRuntime) return false;
  return true;
}
