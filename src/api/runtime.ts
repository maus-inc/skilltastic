import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import type { ProjectInfo, Skill, ToolEntry } from "../types";

/** True when running inside the Tauri webview (vs a plain browser tab). */
export const IN_TAURI = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/**
 * Read-only fixtures for running `npm run dev` in a plain browser, where
 * there is no Rust side to talk to. They exist purely so the UI renders a
 * populated preview (title bar, sidebar, cards) instead of crashing on
 * IPC — mutations are rejected. The desktop app never touches this path.
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

const previewSkill = (tool: Skill["tool"], name: string, description: string): Skill => ({
  id: `/preview/${tool}/skills/${name}/SKILL.md`,
  tool,
  name,
  description,
  path: `/preview/${tool}/skills/${name}`,
  scope: "user",
  enabled: true,
});

const previewSkills: Skill[] = [
  previewSkill("claude", "code-review", "Structured review checklist for pull requests."),
  previewSkill("claude", "commit-style", "Write commits in this repo's imperative style."),
  previewSkill("agents", "changelog", "Draft changelog entries from merged PRs."),
  previewSkill("agents", "release-notes", "Summarize a release for end users."),
  previewSkill("cursor", "tests-first", "Propose failing tests before implementations."),
  previewSkill("opencode", "docs-sync", "Keep docs in sync with code changes."),
];

const previewProjects: ProjectInfo[] = [
  { path: "/preview/projects/skilltastic", name: "skilltastic", pinned: true, lastOpened: 0, opens: [] },
  { path: "/preview/projects/website", name: "website", pinned: false, lastOpened: 0, opens: [] },
];

const fixtures: Record<string, unknown> = {
  list_tool_entries: previewTools,
  list_skills: previewSkills,
  list_projects: previewProjects,
  list_project_skill_counts: {},
  list_detected_projects: [],
  refresh_detected_projects: [],
  list_project_skills: previewSkills.slice(0, 2),
  touch_project: previewProjects[0],
};

/**
 * Drop-in for @tauri-apps/api/core's invoke: real IPC inside the desktop
 * app, fixtures in a browser preview. All api modules route through this.
 */
export function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (IN_TAURI) return tauriInvoke<T>(cmd, args);
  if (cmd in fixtures) {
    return Promise.resolve(JSON.parse(JSON.stringify(fixtures[cmd])) as T);
  }
  return Promise.reject(new Error(`${cmd}: only available inside the desktop app`));
}
