# 04 — Backend (Rust + Tauri v2)

Crate: `skilltastic` (lib name `skilltastic_lib`, see `src-tauri/Cargo.toml`).
`main.rs` is a shim calling `skilltastic_lib::run()`; `lib.rs` wires plugins
(opener, dialog) and registers the 16 commands.

## Layout

```
src-tauri/src/
  lib.rs               builder + generate_handler! command registration
  commands/
    mod.rs             shared security layer: skills_roots(), validate_manifest_at(),
                       MANIFEST_FILE ("SKILL.md"), DISABLED_DIR (".disabled")
    skills.rs          list_tool_entries, list_skills, set_skill_enabled,
                       delete_skill, read_skill_content, write_skill_content
    create_skill.rs    create_skill (scaffolds <dir>/<name>/SKILL.md)
    projects.rs        tracked-project + detection commands
  skills/
    mod.rs             AgentTool enum, Skill struct, SkillScope, SkillAdapter trait,
                       shared scanner (scan_scope), frontmatter reader, tests
    tools.rs           TOOLS registry: ToolDef { id, label, folders[own|compat] }
    claude.rs agents.rs cursor.rs gemini.rs copilot.rs crush.rs roo.rs
    kiro.rs junie.rs factory.rs opencode.rs     — one adapter per folder
  projects.rs          persisted tracked-project list (projects.json)
  detect.rs            project discovery (Claude history, editor recents, git repos)
```

## The adapter model

`SkillAdapter` (in `skills/mod.rs`) is the whole abstraction:

```rust
fn tool(&self) -> AgentTool;             // which folder enum this is
fn skills_dir(&self) -> PathBuf;         // e.g. ~/.claude/skills
fn project_subpath(&self) -> &'static str; // e.g. ".claude/skills"
// discover() / discover_at() have shared default impls via scan_scope()
```

Adding a tool = new adapter file + register in `all_adapters()` /
`adapter_for()` + extend `AgentTool` + add a `ToolDef` in `tools.rs`, citing
the tool's docs in a comment. Full recipe in `CONTRIBUTING.md`.

The scanner reads only two frontmatter fields (`name`, `description`) with a
minimal purpose-built YAML reader — do not pull in a YAML crate for this.

## Security model (do not weaken)

The webview is treated as untrusted. Every file-taking command
(`read_skill_content`, `write_skill_content`, `delete_skill`,
`set_skill_enabled`) must pass `validate_manifest_at()` against
`skills_roots()` (all adapter user dirs + every tracked project's adapter
subdirs). Two bars, both required:

1. **Shape** — the id must look like scanner output:
   `<root>/<skill>/SKILL.md` or `<root>/.disabled/<skill>/SKILL.md`, never
   the root itself (blocks `<root>/SKILL.md` wiping a whole directory).
2. **Resolution** — the path must exist and, with symlinks followed, resolve
   inside a managed root (blocks planted-symlink escapes, while still
   allowing skills shared across tools by linking, since every tool's folder
   is itself a root).

Any new command that touches disk goes through the same gate. The CSP in
`tauri.conf.json` is deliberately tight (`self` + ipc only); capabilities in
`src-tauri/capabilities/default.json` only allow opening the repo URLs.

Two hardening rules on top:

- **Operate on the validated snapshot.** `manageable_manifest()` returns the
  canonical path produced by the resolution check, and commands run their
  filesystem operation on exactly that path — never on the raw webview
  string — so a symlink swapped between check and use changes nothing.
- **Deleting never follows links.** `delete_skill_dir()` inspects the skill
  folder with `symlink_metadata`: a linked skill is unlinked (the user's
  original folder elsewhere survives), only plain folders recurse.

`projects::add()` normalizes webview-supplied paths the same way — a tracked
project becomes managed roots, so enrollment canonicalizes the path and
requires an existing directory.

## Enable/disable semantics

Disabling moves `<dir>/<skill>/` → `<dir>/.disabled/<skill>/`; enabling moves
it back. This is Skilltastic's own convention (no tool ships a native
switch). It never edits tool config files.

## Checks

```bash
cd src-tauri
cargo check                  # must pass clean
cargo fmt                    # no diff should remain
cargo clippy --all-targets   # must pass warning-free
cargo test                   # required when src-tauri/src/ changed
```
