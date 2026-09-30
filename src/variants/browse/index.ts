import type { BrowseFilters } from "../../shared/match.ts";

export const browseAssumption = "People can express their needs as explicit constraints.";

export const genreOptions = ["comedy", "musical", "play", "drama"] as const;

export const priceOptions = [
  { id: "any", label: "Any price", value: null },
  { id: "50", label: "£50 or less", value: 50 },
  { id: "80", label: "£80 or less", value: 80 },
] as const;

export const runtimeOptions = [
  { id: "any", label: "Any length", value: null },
  { id: "150", label: "150 minutes or less", value: 150 },
] as const;

export function emptyBrowseFilters(): BrowseFilters {
  return { tonight: false, genres: [], maxPrice: null, maxRuntime: null, maxMinAge: null };
}

export function describeFilters(filters: BrowseFilters): string[] {
  const active: string[] = [];
  if (filters.tonight) active.push("Tonight");
  for (const genre of filters.genres) active.push(genre);
  if (filters.maxPrice !== null) active.push(`£${filters.maxPrice} or less`);
  if (filters.maxRuntime !== null) active.push(`${filters.maxRuntime} minutes or less`);
  if (filters.maxMinAge !== null) active.push(`Suitable from age ${filters.maxMinAge}`);
  return active;
}
