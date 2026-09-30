export const brand = {
  wordmark: "fork",
  headline: ["One question.", "More possibilities."],
  plaque: "Explore before you commit.",
  kicker: "The interface",
  sectionTitle: "How should this work?",
  lede: "Build the options. Inspect the evidence. Choose your direction.",
  footer: "Agent walkthroughs. Human judgment.",
  demoBanner: "Demo catalogue · no booking or payment.",
  variants: {
    browse: {
      name: "Browse",
      line: "Visible choices. Precise controls.",
      assumption: "People can express their needs as explicit constraints.",
    },
    ask: {
      name: "Ask",
      line: "Express the request in your own words.",
      assumption: "People can describe nuanced needs in their own words.",
    },
    guide: {
      name: "Guide",
      line: "A little structure. One step at a time.",
      assumption: "People benefit from help narrowing the choice.",
    },
  },
} as const;

export type VariantId = keyof typeof brand.variants;

export const profileCopy: Record<
  string,
  { personality: string; missionText: string }
> = {
  planner: {
    personality: "Treats a night out like a military operation.",
    missionText: "Find a comedy tonight, suitable for a date, at most £80 per person.",
  },
  speedrunner: {
    personality: "Personally offended by unnecessary steps.",
    missionText: "Find a funny show tonight for a date, at most £80 per person.",
  },
  organiser: {
    personality: "Has been involuntarily appointed to organise everyone's happiness.",
    missionText:
      "Find a show tonight for adults and a 15-year-old, at most £80 each, runtime at most 150 minutes. Then lower the budget to £50 each.",
  },
};
