import type { AgentTool } from "./tool";

export type SkillScope = "user" | "project";

export interface Skill {
  id: string;
  tool: AgentTool;
  name: string;
  description: string;
  path: string;
  scope: SkillScope;
  enabled: boolean;
}

/** One diagnostic from the Rust-side `lint_skill_content` second opinion
 *  (mirrors the serde-serialized struct in commands/skills.rs). */
export interface SkillDiagnostic {
  severity: "error" | "warning" | "info";
  message: string;
  /** 1-based line number */
  line: number;
}
