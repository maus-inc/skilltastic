import type { Dispatch, SetStateAction } from "react";
import { api } from "../api";
import { stableSkillKey } from "../utils/stableSkillKey";
import type { Skill } from "../types";

/**
 * Toggle/delete work identically for a skill regardless of which list it's
 * displayed in (global vs. a project's) - only the setter differs.
 *
 * Matching is done on the STABLE key, not the manifest id: toggling moves
 * the folder into/out of `.disabled`, which changes the id — matching on
 * the raw id would drop the update (or a fast second toggle) the moment
 * the first one lands.
 */
export function useSkillMutations(setSkills: Dispatch<SetStateAction<Skill[]>>) {
  async function toggle(skill: Skill) {
    const updated = await api.setSkillEnabled(skill.id, !skill.enabled);
    const key = stableSkillKey(skill);
    setSkills((prev) => prev.map((s) => (stableSkillKey(s) === key ? updated : s)));
  }

  async function remove(skill: Skill) {
    // confirmation is the caller's job — destructive actions run through
    // TimedUndoAction (arm → countdown → commit); this hook only executes
    await api.deleteSkill(skill.id);
    const key = stableSkillKey(skill);
    setSkills((prev) => prev.filter((s) => stableSkillKey(s) !== key));
  }

  return { toggle, remove };
}
