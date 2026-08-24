import { invoke } from "./runtime";
import type { AgentTool, Skill, SkillDiagnostic, SkillScope, ToolEntry } from "../types";

/** Invoke wrappers over the skill commands in src-tauri/src/commands/skills.rs
 *  and create_skill.rs. */
export const skillsApi = {
  listToolEntries(): Promise<ToolEntry[]> {
    return invoke("list_tool_entries");
  },
  listSkills(): Promise<Skill[]> {
    return invoke("list_skills");
  },
  setSkillEnabled(id: string, enabled: boolean): Promise<Skill> {
    return invoke("set_skill_enabled", { id, enabled });
  },
  deleteSkill(id: string): Promise<void> {
    return invoke("delete_skill", { id });
  },
  readSkillContent(id: string): Promise<string> {
    return invoke("read_skill_content", { id });
  },
  writeSkillContent(id: string, content: string): Promise<void> {
    return invoke("write_skill_content", { id, content });
  },
  /** Authoritative frontmatter/markdown checks — the Rust side's second
   *  opinion over a just-saved (or in-flight) manifest. */
  lintSkillContent(id: string, content: string): Promise<SkillDiagnostic[]> {
    return invoke("lint_skill_content", { id, content });
  },
  /** Relative paths of supporting files (references/, scripts/, …) in a
   *  skill's folder, excluding SKILL.md — for the level-3 resource tree. */
  listSkillResources(id: string): Promise<string[]> {
    return invoke("list_skill_resources", { id });
  },
  /** Reads one supporting file from a skill's folder (read-only, contained). */
  readSkillResource(id: string, relative: string): Promise<string> {
    return invoke("read_skill_resource", { id, relative });
  },
  /** Creates `<skills-dir>/<name>/SKILL.md` with minimal frontmatter and
   *  returns the new skill; the caller opens it in the editor. */
  createSkill(input: {
    tool: AgentTool;
    scope: SkillScope;
    projectPath?: string;
    name: string;
    description: string;
  }): Promise<Skill> {
    return invoke("create_skill", {
      tool: input.tool,
      scope: input.scope,
      projectPath: input.projectPath ?? null,
      name: input.name,
      description: input.description,
    });
  },
};
