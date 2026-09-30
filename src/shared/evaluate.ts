import type { Show } from "./shows.ts";

export type ConstraintKind =
  | "known-show"
  | "tonight"
  | "funny"
  | "max-price"
  | "date-suitable"
  | "max-min-age"
  | "max-runtime";

export interface Constraint {
  kind: ConstraintKind;
  label: string;
  value?: number;
}

export interface Twist {
  id: string;
  label: string;
  prompt: string;
  replace: Constraint[];
}

export interface Mission {
  id: string;
  title: string;
  constraints: Constraint[];
  twist?: Twist;
}

export interface ConstraintResult {
  kind: string;
  label: string;
  pass: boolean;
  detail: string;
}

export interface Evaluation {
  passed: boolean;
  constraints: ConstraintResult[];
}

export function isFunny(show: Pick<Show, "genre" | "vibeTags">): boolean {
  return show.genre === "comedy" || show.vibeTags.includes("laugh-out-loud");
}

export function applyTwist(mission: Mission, twistApplied: boolean): Constraint[] {
  if (!twistApplied || !mission.twist) return mission.constraints;
  const replaced = new Map(mission.twist.replace.map((constraint) => [constraint.kind, constraint]));
  const present = new Set(mission.constraints.map((constraint) => constraint.kind));
  const merged = mission.constraints.map((constraint) => replaced.get(constraint.kind) ?? constraint);
  for (const constraint of mission.twist.replace) {
    if (!present.has(constraint.kind)) merged.push(constraint);
  }
  return merged;
}

export function evaluateShow(show: Show | undefined, constraints: Constraint[]): Evaluation {
  if (!isCatalogueShow(show)) {
    return {
      passed: false,
      constraints: [
        {
          kind: "known-show",
          label: "Known catalogue show",
          pass: false,
          detail: "No catalogue record for that selection.",
        },
      ],
    };
  }
  const results = constraints.map((constraint) => check(show, constraint));
  return { passed: results.every((result) => result.pass), constraints: results };
}

function isCatalogueShow(show: Show | undefined): show is Show {
  return Boolean(
    show &&
      typeof show.id === "string" &&
      show.id &&
      typeof show.priceGbp === "number" &&
      Number.isFinite(show.priceGbp) &&
      typeof show.runtimeMins === "number" &&
      typeof show.minAge === "number" &&
      typeof show.tonight === "boolean" &&
      typeof show.dateSuitable === "boolean" &&
      Array.isArray(show.vibeTags),
  );
}

function check(show: Show, constraint: Constraint): ConstraintResult {
  switch (constraint.kind) {
    case "tonight": {
      const pass = show.tonight === true;
      return {
        kind: constraint.kind,
        label: constraint.label,
        pass,
        detail: pass ? `${show.title} is listed tonight.` : `${show.title} is not listed tonight.`,
      };
    }
    case "funny": {
      const pass = isFunny(show);
      return {
        kind: constraint.kind,
        label: constraint.label,
        pass,
        detail: pass
          ? "Comedy, or tagged laugh-out-loud."
          : "Neither a comedy nor tagged laugh-out-loud.",
      };
    }
    case "max-price": {
      const max = constraint.value ?? 0;
      const pass = show.priceGbp <= max;
      return {
        kind: constraint.kind,
        label: constraint.label,
        pass,
        detail: `£${show.priceGbp} against a maximum of £${max}.`,
      };
    }
    case "date-suitable": {
      const pass = show.dateSuitable === true;
      return {
        kind: constraint.kind,
        label: constraint.label,
        pass,
        detail: pass ? "Marked suitable for a date." : "Not marked suitable for a date.",
      };
    }
    case "max-min-age": {
      const max = constraint.value ?? 0;
      const pass = show.minAge <= max;
      return {
        kind: constraint.kind,
        label: constraint.label,
        pass,
        detail: `Minimum age ${show.minAge}. The party needs a minimum of ${max} or lower.`,
      };
    }
    case "max-runtime": {
      const max = constraint.value ?? 0;
      const pass = show.runtimeMins <= max;
      return {
        kind: constraint.kind,
        label: constraint.label,
        pass,
        detail: `${show.runtimeMins} minutes against a maximum of ${max}.`,
      };
    }
    default:
      return {
        kind: constraint.kind,
        label: constraint.label,
        pass: false,
        detail: "This constraint is not evaluated.",
      };
  }
}

export const missions: Record<string, Mission> = {
  "date-night": {
    id: "date-night",
    title: "Date night",
    constraints: [
      { kind: "tonight", label: "Tonight" },
      { kind: "funny", label: "Funny" },
      { kind: "max-price", label: "At most £80 per person", value: 80 },
      { kind: "date-suitable", label: "Suitable for a date" },
    ],
  },
  "group-night": {
    id: "group-night",
    title: "Group night",
    constraints: [
      { kind: "tonight", label: "Tonight" },
      { kind: "max-min-age", label: "Suitable for a 15-year-old", value: 15 },
      { kind: "max-price", label: "At most £80 each", value: 80 },
      { kind: "max-runtime", label: "Runtime at most 150 minutes", value: 150 },
    ],
    twist: {
      id: "budget-50",
      label: "Budget £50",
      prompt: "The budget is now £50 each. Revise the choice without starting over.",
      replace: [{ kind: "max-price", label: "At most £50 each", value: 50 }],
    },
  },
};
