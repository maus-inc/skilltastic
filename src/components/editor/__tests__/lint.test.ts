import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { lintSkillDoc } from "../lint";

const doc = (s: string) => EditorState.create({ doc: s }).doc;

describe("lintSkillDoc", () => {
  it("does not throw on a frontmatter-only manifest (fresh skill)", () => {
    const d = doc("---\nname: x\ndescription: does things\n---\n");
    expect(() => lintSkillDoc(d, "x")).not.toThrow();
    const diags = lintSkillDoc(d, "x");
    expect(diags.some((x) => x.severity === "warning" && /body|Title/i.test(x.message))).toBe(true);
  });

  it("does not throw on an empty frontmatter block", () => {
    const d = doc("---\n---\n");
    expect(() => lintSkillDoc(d, "x")).not.toThrow();
  });

  it("flags a missing title on a doc that has a body", () => {
    const d = doc("---\nname: x\ndescription: does things\n---\n\njust body text\n");
    expect(() => lintSkillDoc(d, "x")).not.toThrow();
    expect(lintSkillDoc(d, "x").some((x) => x.message.includes("Title"))).toBe(true);
  });
});
