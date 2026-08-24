# 01 — Overview

## What Skilltastic is

Skilltastic is a local, cross-platform (macOS / Windows / Linux) desktop app
that gives you **one dashboard for every AI coding agent skill installed on
your machine**. It discovers, enables, disables, edits, creates, and deletes
skills across the skill folders of eleven tools — Claude Code, Codex (via the
shared `~/.agents/skills`), Cursor, Gemini CLI, VS Code / Copilot, Crush,
Roo Code, Kiro, Junie, Factory Droid, and OpenCode — plus any tool that reads
the shared agents folder (Goose, Amp, …).

## The problem it solves

Skills are scattered across `~/.claude/skills`, `~/.agents/skills`,
`~/.cursor/skills`, and eight more folders with zero shared view. Left
unchecked this becomes "skill hell": every skill ever installed stays active,
competing for a trigger match and degrading agent accuracy. Skilltastic makes
the whole inventory visible and lets you disable the noise reversibly.

## Vocabulary

| Term | Meaning |
| --- | --- |
| **Skill** | A folder containing a `SKILL.md` manifest (Anthropic's Agent Skills format) that an agent can load on demand. |
| **Manifest** | The `SKILL.md` file. Its absolute path doubles as the skill's stable `id` throughout the app. |
| **Adapter** | A Rust module (`src-tauri/src/skills/<tool>.rs`) that knows one tool's user-level skills dir and project-relative subpath. |
| **Tool** | An entry in the registry (`skills/tools.rs`). Tools are *readers* of folders — some own a folder, some only read shared ones. |
| **Folder role** | `own` = the tool's documented primary directory; `compat` = a shared/alias path it also scans. |
| **Scope** | `user` (in `~/...`) vs `project` (inside a tracked project folder). |
| **Enabled/disabled** | Skilltastic's own convention: a disabled skill is moved into a sibling `.disabled/` folder in the same skills dir. Reversible; never touches tool config. |
| **Tracked project** | A project folder the user added (or accepted from detection) so its project-level skills show in the per-project breakdown. |

## Product principles

1. **Local only.** No telemetry, no network calls; it reads and writes skill
   directories already on disk.
2. **Never touch a tool's own config.** Enable/disable is folder movement;
   editing is direct `SKILL.md` writes. Nothing else.
3. **Reversible by default.** Nothing is destroyed until the user explicitly
   deletes.
4. **Verified paths, not guessed.** Every adapter's directories cite the
   tool's own documentation.

## Feature summary

- Unified skill view across all tools, with search over names/descriptions
- Enable/disable toggle (the `.disabled/` move), delete, create
- Markdown-rendered `SKILL.md` viewer with one-click raw edit
- Per-project skill breakdown, separate from global skills
- Auto-detected project suggestions (Claude Code history, editor recents, git repos)
- Pinned tools/projects and most-used-first sidebar ordering (30-day window)
