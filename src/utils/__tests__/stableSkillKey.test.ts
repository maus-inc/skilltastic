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
});
