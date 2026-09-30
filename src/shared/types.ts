export interface Viewport {
  width: number;
  height: number;
}

export interface VariantConfig {
  id: string;
  name: string;
  path: string;
}

export interface ProfileConfig {
  id: string;
  name: string;
  missionId: string;
  viewport: Viewport;
  textScale: number;
  deviceMode: "desktop" | "mobile-emulation";
  twistId?: string;
}

export interface RunBudget {
  maxVariants: number;
  maxActions: number;
  maxDurationSeconds: number;
  maxChatTurns: number;
}

export interface RequiredRun {
  profileId: string;
  variantId: string;
}

export interface ForkConfig {
  id: string;
  question: string;
  variants: VariantConfig[];
  profiles: ProfileConfig[];
  runBudget: RunBudget;
  requiredRuns: RequiredRun[];
  evidenceLabel: string;
  commercialScenario: null;
}

export type RunStatus =
  | "queued"
  | "running"
  | "completed"
  | "blocked"
  | "timed_out"
  | "error"
  | "unsupported";

export type DecisionAction = "choose" | "revise" | "defer";
