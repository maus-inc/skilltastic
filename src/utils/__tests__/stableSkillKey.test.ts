import { describe, expect, it } from "vitest";
import { stableSkillKey } from "../stableSkillKey";
import type { Skill } from "../../types";

const skill = (id: string): Skill => ({
  id,
  tool: "claude",
  name: "x",
  description: "",
  path: id.replace(/\/SKILL\.md$/, ""),
  scope: "user",
  enabled: true,
});

describe("stableSkillKey", () => {
  it("is identical across the .disabled move", () => {
    const enabled = skill("/home/u/.claude/skills/x/SKILL.md");
    const disabled = skill("/home/u/.claude/skills/.disabled/x/SKILL.md");
    expect(stableSkillKey(enabled)).toBe(stableSkillKey(disabled));
  });

  it("keeps distinct skills distinct", () => {
    const a = skill("/home/u/.claude/skills/a/SKILL.md");
    const b = skill("/home/u/.claude/skills/b/SKILL.md");
    expect(stableSkillKey(a)).not.toBe(stableSkillKey(b));
  });

  it("passes plain ids through", () => {
    const s = skill("/home/u/.agents/skills/y/SKILL.md");
    expect(stableSkillKey(s)).toBe(s.id);
  });

  it("strips only the managed marker, never an ancestor named .disabled", () => {
    const enabled = skill("/data/.disabled/proj/.claude/skills/x/SKILL.md");
    const disabled = skill("/data/.disabled/proj/.claude/skills/.disabled/x/SKILL.md");
    expect(stableSkillKey(disabled)).toBe(stableSkillKey(enabled));
    expect(stableSkillKey(enabled)).toBe(enabled.id); // ancestor survives
  });

  it("is stable across the .disabled move on Windows-style ids", () => {
    const enabled = skill("C:\\Users\\u\\.claude\\skills\\x\\SKILL.md");
    const disabled = skill("C:\\Users\\u\\.claude\\skills\\.disabled\\x\\SKILL.md");
    expect(stableSkillKey(enabled)).toBe(stableSkillKey(disabled));
    expect(stableSkillKey(enabled)).toContain(".claude/skills/x/SKILL.md");
  });

  it("keeps Windows skills distinct and leaves an ancestor .disabled alone", () => {
    const a = skill("C:\\Users\\u\\.claude\\skills\\a\\SKILL.md");
    const b = skill("C:\\Users\\u\\.claude\\skills\\b\\SKILL.md");
    expect(stableSkillKey(a)).not.toBe(stableSkillKey(b));
    const ancestorEnabled = skill("C:\\data\\.disabled\\proj\\.claude\\skills\\x\\SKILL.md");
    expect(stableSkillKey(ancestorEnabled)).toContain("data/.disabled/proj");
  });
});
