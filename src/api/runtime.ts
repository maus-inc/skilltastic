import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import type { DetectedProject, ProjectInfo, Skill, ToolEntry } from "../types";

/** True when running inside the Tauri webview (vs a plain browser tab). */
export const IN_TAURI = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/**
 * In-memory store for running `npm run dev` in a plain browser, where
 * there is no Rust side to talk to. It exists purely so the UI is a
 * usable, interactive preview (toggle, edit, delete, create all work
 * against this session-local state). The desktop app never touches
 * this path, and nothing here persists.
 *
 * Contract: every handler returns a JSON-cloneable value — `null` for
 * void commands, mirroring how Rust's `()` arrives over IPC. A handler
 * returning `undefined` would throw in `clone()` and silently break the
 * UI flow that invoked it.
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

/** Project-relative skills subfolder per tool (mirrors each adapter's
 *  `project_subpath`). */
const PROJECT_SUBPATH: Record<string, string> = {
  claude: ".claude/skills",
  agents: ".agents/skills",
  copilot: ".github/skills", // mirrors CopilotAdapter.project_subpath
  crush: ".crush/skills",
  cursor: ".cursor/skills",
  factory: ".factory/skills",
  gemini: ".gemini/skills",
  junie: ".junie/skills",
  kiro: ".kiro/skills",
  opencode: ".opencode/skills",
  roo: ".roo/skills",
};

function userSkillDir(tool: Skill["tool"]): string {
  return `/preview/${PROJECT_SUBPATH[tool]}`;
}

const makeSkill = (
  tool: Skill["tool"],
  name: string,
  description: string,
  opts: { dir?: string; scope?: Skill["scope"] } = {},
): Skill => {
  const dir = opts.dir ?? `${userSkillDir(tool)}/${name}`;
  return {
    id: `${dir}/SKILL.md`,
    tool,
    name,
    description,
    path: dir,
    scope: opts.scope ?? "user",
    enabled: true,
  };
};

const skills: Skill[] = [
  makeSkill("claude", "code-review", "Structured review checklist for pull requests."),
  makeSkill("claude", "commit-style", "Write commits in this repo's imperative style."),
  makeSkill("agents", "changelog", "Draft changelog entries from merged PRs."),
  makeSkill("agents", "release-notes", "Summarize a release for end users."),
  makeSkill("cursor", "tests-first", "Propose failing tests before implementations."),
  makeSkill("opencode", "docs-sync", "Keep docs in sync with code changes."),
  makeSkill("claude", "ci-checklist", "Pre-flight checks before pushing CI.", {
    dir: "/preview/projects/skilltastic/.claude/skills/ci-checklist",
    scope: "project",
  }),
  makeSkill("agents", "deploy-notes", "What to verify before a deploy.", {
    dir: "/preview/projects/skilltastic/.agents/skills/deploy-notes",
    scope: "project",
  }),
  makeSkill("cursor", "component-style", "House style for new UI components.", {
    dir: "/preview/projects/website/.cursor/skills/component-style",
    scope: "project",
  }),
];

const contents = new Map<string, string>();

const now = () => Math.floor(Date.now() / 1000);
const USAGE_WINDOW_SECS = 30 * 24 * 60 * 60;

const projects: ProjectInfo[] = [
  {
    path: "/preview/projects/skilltastic",
    name: "skilltastic",
    pinned: true,
    lastOpened: now() - 3600,
    opens: [now() - 3600, now() - 90000],
  },
  {
    path: "/preview/projects/website",
    name: "website",
    pinned: false,
    lastOpened: now() - 86400,
    opens: [now() - 86400],
  },
];

/** Cached per-project skill counts — populated when a project is opened
 *  (mirrors the Rust store, which never batch-scans at startup). */
const skillCountCache = new Map<string, number>();

/** Detection is opt-in: `null` until the user explicitly refreshes, so
 *  the picker shows the consent screen first — same as the desktop app. */
let detectedStore: DetectedProject[] | null = null;

function fakeDetected(): DetectedProject[] {
  const t = now();
  return [
    {
      path: "/preview/projects/api-server",
      name: "api-server",
      lastActive: t - 7200,
      sources: ["git repos"],
    },
    {
      path: "/preview/projects/notes-app",
      name: "notes-app",
      lastActive: t - 172800,
      sources: ["claude history", "cursor recents"],
    },
    {
      path: "/preview/projects/playground",
      name: "playground",
      lastActive: t - 432000,
      sources: ["git repos"],
    },
  ];
}

/** Folder-pick dialog stand-in for the browser preview: cycles through
 *  plausible folders so the browse flow works end-to-end. */
const browsePool = ["/preview/projects/playground", "/preview/projects/api-server", "/preview/projects/notes-app"];
let browseIndex = 0;
export function previewPickProjectFolder(): Promise<string | null> {
  // one new folder per open, then the pool is exhausted like a cancelled dialog
  if (browseIndex >= browsePool.length) return Promise.resolve(null);
  return Promise.resolve(browsePool[browseIndex++]);
}

// JSON round-trip mirrors IPC serialization; undefined is a handler bug
// (void commands return null) and must surface loudly, not flow on
const clone = <T,>(v: T): T => {
  if (v === undefined) {
    throw new Error("fixture handler returned undefined — void commands must return null");
  }
  return JSON.parse(JSON.stringify(v));
};

function defaultContent(skill: Skill): string {
  return `---\nname: ${skill.name}\ndescription: ${skill.description}\n---\n\n# ${skill.name}\n\n${skill.description}\n\n_(preview mode — edits live only in this browser session)_\n`;
}

/** Mirrors the backend's folder-name policy closely enough for instant
 *  feedback (the Rust side stays authoritative in the real app). */
const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function projectOf(skillPath: string): ProjectInfo | undefined {
  return projects.find((p) => skillPath.startsWith(`${p.path}/`));
}

/** Toggle moves the folder into/out of `.disabled`, exactly like the
 *  desktop convention — the id/path change with it. */
function applyToggle(skill: Skill, enabled: boolean): Skill {
  const segments = skill.path.split("/");
  const name = segments[segments.length - 1];
  const isDisabled = segments[segments.length - 2] === ".disabled";
  if (enabled === !isDisabled) return skill; // already in the right place
  const nextDir = enabled
    ? [...segments.slice(0, -2), name].join("/") // drop the .disabled segment
    : [...segments.slice(0, -1), ".disabled", name].join("/"); // nest into it
  const content = contents.get(skill.id);
  const next: Skill = { ...skill, enabled, path: nextDir, id: `${nextDir}/SKILL.md` };
  if (content !== undefined) {
    contents.delete(skill.id);
    contents.set(next.id, content);
  }
  return next;
}

/** Command handlers mirroring the Rust side closely enough for a demo. */
const handlers: Record<string, (args: Record<string, unknown>) => unknown> = {
  list_tool_entries: () => previewTools,
  list_skills: () => skills.filter((s) => s.scope === "user"),
  set_skill_enabled: ({ id, enabled }) => {
    const index = skills.findIndex((s) => s.id === id);
    if (index === -1) throw new Error("unknown skill");
    const updated = applyToggle(skills[index], Boolean(enabled));
    skills[index] = updated;
    return updated;
  },
  delete_skill: ({ id }) => {
    const index = skills.findIndex((s) => s.id === id);
    if (index !== -1) {
      const project = projectOf(skills[index].path);
      skills.splice(index, 1);
      // drop the saved content too — a recreate at the same path must not
      // resurrect the deleted skill's last edit
      contents.delete(String(id));
      if (project) skillCountCache.set(project.path, skills.filter((s) => projectOf(s.path)?.path === project.path).length);
    }
    return null;
  },
  read_skill_content: ({ id }) => {
    const skill = skills.find((s) => s.id === id);
    if (!skill) throw new Error("unknown skill");
    return contents.get(skill.id) ?? defaultContent(skill);
  },
  write_skill_content: ({ id, content }) => {
    contents.set(String(id), String(content));
    return null;
  },
  create_skill: ({ tool, scope, projectPath, name, description }) => {
    const t = String(tool) as Skill["tool"];
    const n = String(name ?? "").trim();
    if (!n || n.length > 64 || !NAME_PATTERN.test(n)) {
      throw new Error(`invalid skill name: "${n}"`);
    }
    const desc = String(description ?? "").trim();
    if (!desc) throw new Error("description is empty");
    const isProject = scope === "project";
    if (isProject && !projects.some((p) => p.path === projectPath)) {
      throw new Error("project is not tracked");
    }
    const dir = isProject
      ? `${projectPath}/${PROJECT_SUBPATH[t]}/${n}`
      : `${userSkillDir(t)}/${n}`;
    if (skills.some((s) => s.path === dir)) {
      throw new Error(`a skill named "${n}" already exists in this folder`);
    }
    const skill = makeSkill(t, n, desc, { dir, scope: isProject ? "project" : "user" });
    skills.unshift(skill);
    if (isProject) skillCountCache.set(String(projectPath), skills.filter((s) => projectOf(s.path)?.path === projectPath).length);
    return skill;
  },
  list_projects: () => projects,
  list_project_skill_counts: () =>
    [...skillCountCache.entries()].map(([path, count]) => ({ path, count })),
  list_detected_projects: ({ exclude }) => {
    if (detectedStore === null) return null;
    const excluded = new Set((exclude as string[]) ?? []);
    return detectedStore.filter((d) => !excluded.has(d.path));
  },
  refresh_detected_projects: ({ exclude }) => {
    if (detectedStore === null) detectedStore = fakeDetected();
    const excluded = new Set((exclude as string[]) ?? []);
    return detectedStore.filter((d) => !excluded.has(d.path));
  },
  list_project_skills: ({ path }) => {
    // only tracked projects get a breakdown — anything else is ignored
    if (!projects.some((p) => p.path === path)) return [];
    const list = skills.filter((s) => s.scope === "project" && s.path.startsWith(`${path}/`));
    skillCountCache.set(String(path), list.length);
    return list;
  },
  add_project: ({ path }) => {
    const p = String(path ?? "").replace(/\/+$/, "");
    if (!p || p === "/") throw new Error("not a project folder");
    const existing = projects.find((x) => x.path === p);
    if (existing) return existing;
    const project: ProjectInfo = {
      path: p,
      name: p.split("/").filter(Boolean).pop() ?? p,
      pinned: false,
      lastOpened: 0,
      opens: [],
    };
    projects.push(project);
    return project;
  },
  touch_project: ({ path }) => {
    const project = projects.find((p) => p.path === path);
    if (!project) return null;
    const t = now();
    project.lastOpened = t;
    project.opens = [...project.opens, t].filter((x) => t - x <= USAGE_WINDOW_SECS);
    return null;
  },
  set_project_pinned: ({ path, pinned }) => {
    const project = projects.find((p) => p.path === path);
    if (project) project.pinned = Boolean(pinned);
    return null;
  },
  remove_project: ({ path }) => {
    const index = projects.findIndex((p) => p.path === path);
    if (index !== -1) projects.splice(index, 1);
    skillCountCache.delete(String(path));
    return null;
  },
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
