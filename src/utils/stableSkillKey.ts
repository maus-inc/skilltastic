import type { Skill } from "../types";

/**
 * A list key for a skill that survives enable/disable. Toggling moves the
 * folder into/out of `.disabled`, so the manifest id changes — but the card
 * must not remount for that (a remount plays the exit/enter animations and
 * reads as the skill "disappearing"). Only the MANAGED marker — the segment
 * directly above the skill folder — is stripped; an unrelated ancestor
 * directory that happens to be named `.disabled` is left alone.
 * Collision-free: a skill can never be NAMED `.disabled` (reserved by the
 * backend), so the segment above the folder name is unambiguous.
 */
export function stableSkillKey(skill: Skill): string {
  // id shape: …/<skill-folder>/SKILL.md, with the managed `.disabled`
  // marker sitting directly above the folder when disabled. Split on
  // BOTH separators — the desktop backend serializes `\` on Windows, and
  // a `/`-only split would treat the whole path as one segment there,
  // changing the key on every toggle (the exact remount this key exists
  // to prevent).
  const parts = skill.id.split(/[\\/]/);
  const marker = parts.length - 3;
  if (marker >= 0 && parts[marker] === ".disabled") {
    parts.splice(marker, 1);
  }
  return parts.join("/");
}
