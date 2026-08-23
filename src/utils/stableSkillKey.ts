import type { Skill } from "../types";

/**
 * A list key for a skill that survives enable/disable. Toggling moves the
 * folder into/out of `.disabled`, so the manifest id changes — but the card
 * must not remount for that (a remount plays the exit/enter animations and
 * reads as the skill "disappearing"). Stripping the `.disabled` segment is
 * collision-free: it sits mid-path, and a skill can never be named
 * `.disabled` (reserved by the backend).
 */
export function stableSkillKey(skill: Skill): string {
  return skill.id.replace("/.disabled/", "/");
}
