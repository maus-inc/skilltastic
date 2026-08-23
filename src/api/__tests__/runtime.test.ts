import { describe, expect, it } from "vitest";
import { invoke } from "../runtime";
import type { ProjectInfo, Skill, ToolEntry } from "../../types";

/**
 * The browser-preview fixture backs every click in `npm run dev` outside
 * the desktop app. These tests guard the full invoke surface — a handler
 * throwing (or returning un-cloneable values) is exactly what silently
 * breaks UI flows.
 */

describe("preview invoke fixtures", () => {
  it("lists tools, skills and projects", async () => {
    const tools = await invoke<ToolEntry[]>("list_tool_entries");
    const skills = await invoke<Skill[]>("list_skills");
    const projects = await invoke<ProjectInfo[]>("list_projects");
    expect(tools.length).toBeGreaterThan(0);
    expect(skills.every((s) => s.scope === "user")).toBe(true);
    expect(projects.length).toBeGreaterThanOrEqual(2);
  });

  it("toggles a skill through the .disabled convention and back", async () => {
    const skills = await invoke<Skill[]>("list_skills");
    const target = skills[0];
    const off = await invoke<Skill>("set_skill_enabled", { id: target.id, enabled: false });
    expect(off.enabled).toBe(false);
    expect(off.path).toContain("/.disabled/");
    const on = await invoke<Skill>("set_skill_enabled", { id: off.id, enabled: true });
    expect(on.enabled).toBe(true);
    expect(on.path).not.toContain("/.disabled/");
    expect(on.id).toBe(target.id);
  });

  it("reads and writes skill content (save returns cloneable null)", async () => {
    const skills = await invoke<Skill[]>("list_skills");
    const id = skills[0].id;
    await expect(invoke("write_skill_content", { id, content: "# edited" })).resolves.toBeNull();
    await expect(invoke<string>("read_skill_content", { id })).resolves.toBe("# edited");
  });

  it("creates skills from flat args — user and project scope", async () => {
    const created = await invoke<Skill>("create_skill", {
      tool: "claude",
      scope: "user",
      projectPath: null,
      name: "brand-new",
      description: "fresh fixture skill",
    });
    expect(created.scope).toBe("user");
    expect(created.id).toContain("/brand-new/SKILL.md");

    const projects = await invoke<ProjectInfo[]>("list_projects");
    const projSkill = await invoke<Skill>("create_skill", {
      tool: "claude",
      scope: "project",
      projectPath: projects[0].path,
      name: "proj-new",
      description: "project fixture skill",
    });
    expect(projSkill.scope).toBe("project");
    expect(projSkill.path.startsWith(projects[0].path)).toBe(true);

    await expect(
      invoke("create_skill", {
        tool: "claude",
        scope: "user",
        projectPath: null,
        name: "brand-new",
        description: "duplicate",
      }),
    ).rejects.toThrow(/already exists/);
  });

  it("deletes a skill without throwing", async () => {
    const created = await invoke<Skill>("create_skill", {
      tool: "cursor",
      scope: "user",
      projectPath: null,
      name: "to-delete",
      description: "short-lived",
    });
    await expect(invoke("delete_skill", { id: created.id })).resolves.toBeNull();
    const skills = await invoke<Skill[]>("list_skills");
    expect(skills.some((s) => s.id === created.id)).toBe(false);
  });

  it("project lifecycle: add, open (counts), pin, forget", async () => {
    const added = await invoke<ProjectInfo>("add_project", { path: "/preview/projects/api-server" });
    expect(added.name).toBe("api-server");

    await expect(invoke("touch_project", { path: added.path })).resolves.toBeNull();

    const rows = await invoke<{ path: string; count: number }[]>("list_project_skill_counts");
    expect(Array.isArray(rows)).toBe(true);

    await expect(invoke("set_project_pinned", { path: added.path, pinned: true })).resolves.toBeNull();
    await expect(invoke("remove_project", { path: added.path })).resolves.toBeNull();

    const projects = await invoke<ProjectInfo[]>("list_projects");
    expect(projects.some((p) => p.path === added.path)).toBe(false);
  });

  it("project skills are scoped per project and untracked paths get none", async () => {
    const projects = await invoke<ProjectInfo[]>("list_projects");
    const list = await invoke<Skill[]>("list_project_skills", { path: projects[0].path });
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((s) => s.path.startsWith(`${projects[0].path}/`))).toBe(true);

    const none = await invoke<Skill[]>("list_project_skills", { path: "/preview/projects/nope" });
    expect(none).toEqual([]);
  });

  it("detection is opt-in: null until refreshed, then honors excludes", async () => {
    await expect(invoke("list_detected_projects", { exclude: [] })).resolves.toBeNull();
    const detected = await invoke<{ path: string }[]>("refresh_detected_projects", { exclude: [] });
    expect(detected.length).toBeGreaterThan(0);
    const excluded = await invoke<{ path: string }[]>("list_detected_projects", {
      exclude: [detected[0].path],
    });
    expect(excluded!.some((d) => d.path === detected[0].path)).toBe(false);
    expect(excluded!.length).toBe(detected.length - 1);
  });
});
