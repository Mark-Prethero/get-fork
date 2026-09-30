import forkConfigJson from "../../fork.config.json" with { type: "json" };
import { missions } from "./evaluate.ts";
import type { ForkConfig } from "./types.ts";

export const forkConfig = forkConfigJson as ForkConfig;

export function validateConfig(config: ForkConfig): string[] {
  const errors: string[] = [];
  if (config.variants.length < 2 || config.variants.length > config.runBudget.maxVariants) {
    errors.push("Configuration must list 2–4 variants.");
  }
  const variantIds = new Set<string>();
  for (const variant of config.variants) {
    if (variantIds.has(variant.id)) errors.push(`Duplicate variant id ${variant.id}.`);
    variantIds.add(variant.id);
  }
  const profileIds = new Set<string>();
  for (const profile of config.profiles) {
    if (profileIds.has(profile.id)) errors.push(`Duplicate profile id ${profile.id}.`);
    profileIds.add(profile.id);
    if (!missions[profile.missionId]) errors.push(`Profile ${profile.id} references unknown mission ${profile.missionId}.`);
    if (profile.twistId && missions[profile.missionId]?.twist?.id !== profile.twistId) {
      errors.push(`Profile ${profile.id} references unknown twist ${profile.twistId}.`);
    }
  }
  for (const required of config.requiredRuns) {
    if (!profileIds.has(required.profileId) || !variantIds.has(required.variantId)) {
      errors.push(`Required run ${required.profileId}/${required.variantId} is not in the configuration.`);
    }
  }
  return errors;
}

export function assumptionFor(variantId: string): string {
  const known: Record<string, string> = {
    browse: "People can express their needs as explicit constraints.",
    ask: "People can describe nuanced needs in their own words.",
    guide: "People benefit from help narrowing the choice.",
  };
  return known[variantId] ?? "A distinct way of choosing.";
}
