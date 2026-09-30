import type { ProfileConfig } from "./types.ts";

export function fallbackDeviceLabel(profile: Pick<ProfileConfig, "deviceMode" | "viewport">): string {
  if (profile.deviceMode === "mobile-emulation") return "Mobile emulation";
  return `Layout preview · target ${profile.viewport.width}×${profile.viewport.height}`;
}
