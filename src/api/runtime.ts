import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import type { ProjectInfo, Skill, ToolEntry } from "../types";

/** True when running inside the Tauri webview (vs a plain browser tab). */
export const IN_TAURI = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/**
 * In-memory store for running `npm run dev` in a plain browser, where
 * there is no Rust side to talk to. It exists purely so the UI is a
 * usable, interactive preview (toggle, edit, delete, create all work
 * against this session-local state). The desktop app never touches
 * this path, and nothing here persists.
 */
const previewTools: ToolEntry[] = [
  {
    id: "claude-code",
    label: "Claude Code",
    folders: [{ tool: "claude", dir: "~/.claude/skills", role: "own", dirExists: true }],
  },
  {
    id: "codex",
    label: "Codex",
    folders: [{ tool: "agents", dir: "~/.agents/skills", role: "own", dirExists: true }],
  },
  {
    id: "cursor",
    label: "Cursor",
    folders: [{ tool: "cursor", dir: "~/.cursor/skills", role: "own", dirExists: true }],
  },
  {
    id: "opencode",
    label: "OpenCode",
    folders: [
      { tool: "opencode", dir: "~/.config/opencode/skills", role: "own", dirExists: true },
      { tool: "agents", dir: "~/.agents/skills", role: "compat", dirExists: true },
    ],
  },
];

const makeSkill = (tool: Skill["tool"], name: string, description: string): Skill => ({
  id: `/preview/${tool}/skills/${name}/SKILL.md`,
  tool,
  name,
  description,
  path: `/preview/${tool}/skills/${name}`,
  scope: "user",
  enabled: true,
});

const skills: Skill[] = [
  makeSkill("claude", "code-review", "Structured review checklist for pull requests."),
  makeSkill("claude", "commit-style", "Write commits in this repo's imperative style."),
  makeSkill("agents", "changelog", "Draft changelog entries from merged PRs."),
  makeSkill("agents", "release-notes", "Summarize a release for end users."),
  makeSkill("cursor", "tests-first", "Propose failing tests before implementations."),
  makeSkill("opencode", "docs-sync", "Keep docs in sync with code changes."),
];

const contents = new Map<string, string>();

const projects: ProjectInfo[] = [
  { path: "/preview/projects/skilltastic", name: "skilltastic", pinned: true, lastOpened: 0, opens: [] },
  { path: "/preview/projects/website", name: "website", pinned: false, lastOpened: 0, opens: [] },
];

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function defaultContent(skill: Skill): string {
  return `---\nname: ${skill.name}\ndescription: ${skill.description}\n---\n\n# ${skill.name}\n\n${skill.description}\n\n_(preview mode — edits live only in this browser session)_\n`;
}

/** Command handlers mirroring the Rust side closely enough for a demo. */
const handlers: Record<string, (args: Record<string, unknown>) => unknown> = {
  list_tool_entries: () => previewTools,
  list_skills: () => skills,
  set_skill_enabled: ({ id, enabled }) => {
    const skill = skills.find((s) => s.id === id);
    if (!skill) throw new Error("unknown skill");
    skill.enabled = Boolean(enabled);
    return skill;
  },
  delete_skill: ({ id }) => {
    const index = skills.findIndex((s) => s.id === id);
    if (index !== -1) skills.splice(index, 1);
  },
  read_skill_content: ({ id }) => {
    const skill = skills.find((s) => s.id === id);
    if (!skill) throw new Error("unknown skill");
    return contents.get(skill.id) ?? defaultContent(skill);
  },
  write_skill_content: ({ id, content }) => {
    contents.set(String(id), String(content));
  },
  create_skill: (args) => {
    const input = args.input as { tool: Skill["tool"]; name: string };
    const skill = makeSkill(input.tool, input.name, "");
    skills.unshift(skill);
    return skill;
  },
  list_projects: () => projects,
  list_project_skill_counts: () => ({}),
  list_detected_projects: () => [],
  refresh_detected_projects: () => [],
  list_project_skills: () => skills.slice(0, 2),
  touch_project: ({ path }) => projects.find((p) => p.path === path) ?? projects[0],
  set_project_pinned: ({ path, pinned }) => {
    const project = projects.find((p) => p.path === path);
    if (project) project.pinned = Boolean(pinned);
    return project;
  },
  remove_project: () => undefined,
};

/**
 * Drop-in for @tauri-apps/api/core's invoke: real IPC inside the desktop
 * app, the interactive in-memory store in a browser preview. All api
 * modules route through this.
 */
export function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (IN_TAURI) return tauriInvoke<T>(cmd, args);
  const handler = handlers[cmd];
  if (!handler) {
    return Promise.reject(new Error(`${cmd}: only available inside the desktop app`));
  }
  try {
    return Promise.resolve(clone(handler(args ?? {}) as T));
  } catch (err) {
    return Promise.reject(err);
  }
}
