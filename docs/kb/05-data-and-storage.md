# 05 — Data & Storage

Skilltastic has no database and makes no network calls. Everything it knows
lives in one of four places:

## 1. The skill folders themselves (source of truth)

User-level (from each adapter's `skills_dir()`):

| Folder (enum) | User directory | Project subpath |
| --- | --- | --- |
| Claude | `~/.claude/skills` | `.claude/skills` |
| Agents (shared) | `~/.agents/skills` | `.agents/skills` |
| Cursor | `~/.cursor/skills` | `.cursor/skills` |
| Gemini | `~/.gemini/skills` | `.gemini/skills` |
| Copilot / VS Code | `~/.copilot/skills` | `.github/skills` |
| Crush | `~/.config/crush/skills` | `.crush/skills` |
| Roo | `~/.roo/skills` | `.roo/skills` |
| Kiro | `~/.kiro/skills` | `.kiro/skills` |
| Junie | `~/.junie/skills` | `.junie/skills` |
| Factory | `~/.factory/skills` | `.factory/skills` |
| OpenCode | `~/.config/opencode/skills` | `.opencode/skills` |

Layout inside each: `<dir>/<skill-name>/SKILL.md` (+ any support files).
Disabled skills live at `<dir>/.disabled/<skill-name>/…`.

A skill's **id** is the absolute path of its `SKILL.md`. Toggling a skill
therefore *changes its id* (the path moves) — the frontend refreshes after
mutations rather than assuming stable ids across a toggle.

## 2. App config dir (Tauri `app_config_dir`)

Resolved per-platform from the identifier `com.mausinc.skilltastic`
(e.g. `~/Library/Application Support/com.mausinc.skilltastic/` on macOS,
`~/.config/com.mausinc.skilltastic/` on Linux, `%APPDATA%` on Windows):

| File | Contents |
| --- | --- |
| `projects.json` | Tracked projects: path, pinned flag, usage timestamps. Older files predate pinning — loader treats missing fields as unpinned. |
| `detected-projects.json` | Cached results of project auto-discovery (`detect.rs`). |

## 3. Webview localStorage (UI preferences only)

| Key | Contents |
| --- | --- |
| `skilltastic:pinned-tools` | JSON array of pinned tool ids. |

Rule of thumb: anything that must survive an app reinstall goes in the config
dir via Rust; pure UI preference goes in localStorage under `skilltastic:*`.

## 4. Temp dirs (tests only)

Rust tests create sandboxes under the OS temp dir with prefixes
`skilltastic-test-*`, `skilltastic-cmd-*`, `skilltastic-create-*`,
`skilltastic-outside-*`. They are self-cleaning; nothing at runtime writes
there.

## Frontmatter contract

The scanner reads exactly two fields from `SKILL.md` YAML frontmatter:

```yaml
---
name: my-skill          # falls back to the folder name
description: what it does
---
```

Everything else in the manifest is opaque to Skilltastic and passed through
untouched by the editor.
