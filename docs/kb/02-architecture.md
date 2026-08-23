# 02 — Architecture

## Big picture

```
┌────────────────────────────── Skilltastic (Tauri v2) ─────────────────────────────┐
│                                                                                   │
│  Webview (React 19 + TS, Vite)              Rust core (crate: skilltastic)        │
│  ┌───────────────────────────┐   invoke()   ┌───────────────────────────────┐     │
│  │ components/ hooks/ utils/ │ ───────────► │ commands/  (16 tauri commands)│     │
│  │ api/  = typed invoke      │ ◄─────────── │   ├─ skills.rs   list/toggle/ │     │
│  │        wrappers           │    JSON      │   │              read/write/delete  │
│  └───────────────────────────┘              │   ├─ create_skill.rs          │     │
│                                             │   ├─ projects.rs              │     │
│                                             │   └─ mod.rs  path validation  │     │
│                                             │ skills/   11 SkillAdapters +  │     │
│                                             │           tools.rs registry   │     │
│                                             │ projects.rs  tracked projects │     │
│                                             │ detect.rs    project discovery│     │
│                                             └───────────────┬───────────────┘     │
│                                                             │ fs                  │
└─────────────────────────────────────────────────────────────┼─────────────────────┘
                                                              ▼
                                    ~/.claude/skills, ~/.agents/skills, ~/.cursor/skills, …
                                    <project>/.claude/skills, …   (+ sibling .disabled/)
```

- The **webview is untrusted**. All filesystem work happens in Rust behind
  16 `#[tauri::command]`s registered in `src-tauri/src/lib.rs`. File-taking
  commands validate paths against managed roots (see `04-backend.md`).
- The frontend never touches the filesystem directly; `src/api/*` is the only
  place `invoke()` is called.
- State lives on disk (the skill folders themselves + two JSON stores in the
  app config dir) and in `localStorage` for pure UI preferences. There is no
  database.

## Command surface (frontend ⇄ backend contract)

| Domain | Commands |
| --- | --- |
| Skills | `list_tool_entries`, `list_skills`, `set_skill_enabled`, `delete_skill`, `read_skill_content`, `write_skill_content`, `create_skill` |
| Projects | `list_projects`, `add_project`, `remove_project`, `set_project_pinned`, `touch_project`, `list_project_skills`, `list_project_skill_counts`, `list_detected_projects`, `refresh_detected_projects` |

The TypeScript side of the contract is `src/api/skills.ts` and
`src/api/projects.ts`; shared shapes live in `src/types/` (mirroring the
serde-serialized Rust structs in `src-tauri/src/skills/mod.rs` and
`projects.rs`).

## Repository map

```
src/                    React frontend (see 03-frontend.md)
src-tauri/              Rust core + Tauri config (see 04-backend.md)
  tauri.conf.json       product name, version, identifier, publisher, bundle icons
  icons/                generated icon set (source: skilltastic.png at repo root)
public/                 static assets served by Vite (skilltastic.png, legacy svg logos)
docs/                   GitHub Pages landing page (index.html) + assets
  kb/                   ← this knowledge base
  superpowers/          historical specs/plans for past refactors
.github/workflows/      release.yml — tag-triggered cross-platform build
index.html              webview entry (favicon, #root, loads src/main.tsx)
```

## Key design decisions

- **Adapter trait over config:** every tool's folder layout is identical
  (`<dir>/<skill>/SKILL.md`), so `SkillAdapter` only supplies `skills_dir()`
  and `project_subpath()`; discovery/toggling logic is shared.
- **Tools vs folders are decoupled:** the sidebar lists *tools*; each tool
  maps to one or more *folders* (`own`/`compat`) in `skills/tools.rs`. Tools
  with no folder of their own (Goose, Amp) exist only in the registry.
- **Manifest path as identity:** a skill's `id` is the absolute `SKILL.md`
  path — stable, unique, and exactly what the validation layer can check.
- **Disable = move, not delete:** `.disabled/` sibling folder keeps the
  operation reversible and tool-agnostic.
