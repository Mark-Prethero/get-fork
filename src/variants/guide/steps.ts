import type { GuideAnswers } from "../../shared/match.ts";

export const guideAssumption = "People benefit from help narrowing the choice.";

export interface GuideOption {
  id: string;
  label: string;
}

export interface GuideStep {
  id: "when" | "budget" | "party" | "mood" | "runtime";
  prompt: string;
  options: GuideOption[];
}

export const guideSteps: GuideStep[] = [
  {
    id: "when",
    prompt: "When are you going?",
    options: [
      { id: "tonight", label: "Tonight" },
      { id: "later", label: "Another time" },
    ],
  },
  {
    id: "budget",
    prompt: "What is the most you want to spend per person?",
    options: [
      { id: "50", label: "£50" },
      { id: "80", label: "£80" },
      { id: "120", label: "£120" },
    ],
  },
  {
    id: "party",
    prompt: "Who is it for?",
    options: [
      { id: "date", label: "A date" },
      { id: "teen", label: "Adults and a 15-year-old" },
      { id: "any", label: "No preference" },
    ],
  },
  {
    id: "mood",
    prompt: "What kind of evening?",
    options: [
      { id: "funny", label: "Something funny" },
      { id: "any", label: "No preference" },
    ],
  },
  {
    id: "runtime",
    prompt: "How long can the show run?",
    options: [
      { id: "150", label: "150 minutes or less" },
      { id: "any", label: "No limit" },
    ],
  },
];

export function answersFromGuide(selections: Record<string, string>): GuideAnswers | null {
  if (!selections.when || !selections.budget || !selections.party || !selections.mood || !selections.runtime) {
    return null;
  }
  const party = selections.party;
  if (party !== "date" && party !== "teen" && party !== "any") return null;
  return {
    tonight: selections.when === "tonight",
    maxPrice: Number(selections.budget),
    party,
    funny: selections.mood === "funny",
    maxRuntime: selections.runtime === "any" ? null : Number(selections.runtime),
  };
}
