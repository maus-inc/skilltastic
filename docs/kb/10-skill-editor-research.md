# 10 — Skill Editor Research (tab-based SKILL.md IDE)

Goal: replace the modal editor with a proper code-editor experience that
opens as a **tab** in the existing title-bar tab system — linting,
proactive suggestions, preview — for `SKILL.md` authoring. Research
pass (2026-08); decisions and rationale live here so implementation
PRs stay small.

## Constraints that shape the choice

- **Tauri webview frontend.** The editor must be web tech; Rust-native
  UIs own their own windowing and cannot live inside our webview.
- **MIT-licensed product.** Copyleft (GPL) components would relicense
  the app; anything GPL is a reference, never a dependency.
- **Local-only principle.** No telemetry, no cloud calls — suggestions
  must come from local heuristics and local parsers, which conveniently
  is also what makes them fast.
- **Design language.** Satoshi/mono, token depth, streaks, reduced-motion
  doctrine — the editor chrome must theme to our tokens, not ship a
  foreign look.

## Engine candidates

| | Monaco (VS Code's engine) | CodeMirror 6 | Zed (Rust/GPUI) | Ace |
| --- | --- | --- | --- | --- |
| Bundle | ~5 MB gzipped, needs workers + lazy load | ~50–200 kB, modular, tree-shakable | n/a as a component | medium |
| Markdown support | basic tokenization only | first-class (`@codemirror/lang-markdown`, Lezer, GFM; 2M+ weekly dl) | excellent but unreachable | basic |
| Linting API | `setModelMarkers` (diagnostics) | `@codemirror/lint` `linter()` (8.7M weekly dl) | internal | session markers |
| Theming to our tokens | possible, fights its VS Code chrome | `EditorView.theme` — designed for it | n/a | possible |
| Custom React chrome (panels, tooltips) | hard — Replit left Monaco for exactly this | first-class — Replit/Obsidian/CodePen chose CM6 for it | n/a | limited |
| Accessibility | basic | excellent | excellent | weak |
| License | MIT | MIT | editor GPLv3, GPUI Apache-2 | Apache-2 |

Verdicts from the field: "for a markdown-first editor, pick CodeMirror 6
unless you specifically need IDE-ish language services" (community +
Replit's migration post: Monaco's 51 MB unpacked footprint and
uncustomizable chrome were the breaking points; CM6 gave them 1.26 MB
gzipped and React-rendered editor chrome).

### Why not Zed, despite the Rust sympathy

- The *editor* crates are **GPLv3** — linking them into Skilltastic
  would copyleft the whole app. GPUI is Apache-2 but is a windowing
  framework: it creates its own GPU windows and "is not designed to
  work outside of Zed" (zed-industries discussion #39322).
- `embedded_gpui` is an experimental spike in the *opposite* direction
  (wasm plugins rendered inside a GPUI host), and third-party bindings
  (gpuix) are early-stage native-window tech — none of it renders in a
  Tauri webview.
- What we DO take from Zed: the performance philosophy (incremental
  parsing, no main-thread work per keystroke — CM6's Lezer gives us the
  same property), the restraint of its chrome, and an **"Open in Zed /
  VS Code"** escape hatch via `@tauri-apps/plugin-shell` for users who
  want their daily driver on a file (scoped command allowlist, explicit
  user action — compatible with the local-only principle).

**Decision (confirmed with the user): CodeMirror 6**, Monaco rejected
(5 MB, unthemable chrome), Zed kept as reference only. The editor is a
**workbench**, not a minimal textarea-in-modal: `EditorModal` is
retired; skills open as `kind: "editor"` tabs in the title bar.

## What shipped (P1-max)

- `components/editor/`: `SkillEditorTab` (breadcrumb bar, CM6 surface,
  spring-drag split preview reusing `renderMarkdown`, status bar),
  `theme.ts` (token-mapped dark theme + markdown/frontmatter highlight
  style), `lint.ts`, `completion.ts`, `frontmatter.ts` (tinted
  frontmatter block + `key:`/`---` marks via decorations).
- Chrome ports in the Watermelon family: tabs (existing), breadcrumb +
  status bar (new, our tokens), combobox palette gains editor actions
  (save ⌘S, toggle preview ⌘⇧V), time-undo handles delete from the
  status bar.
- Lint sources: frontmatter policy parity (`create_skill` enforces it,
  the editor mirrors it), skill-craft heuristics (trigger-first
  descriptions, folder/name match, ≤1024, no angle brackets, body
  budget), markdown health with mechanical quick-fixes (trim trailing
  ws, collapse blanks).
- Completions: frontmatter keys + "Use when …" snippet.
- Save discipline: ⌘S, dirty dot on the tab, unsaved-close guard
  (`UnsavedCloseModal`: keep editing / discard / save & close).
- Everything local, per the no-telemetry principle.

Watermelon registry dig (2026-08): 600+ components at
`registry.watermelon.sh/r/<name>.json`; the editor chrome reuses the
same ported family (button, switch, badge, combobox-1, time-undo,
tabs, breadcrumb patterns) refined onto our tokens rather than copied
verbatim — Watermelon's own thesis is "tweak the variables, inherit
the DNA", which is exactly how the ports work here.

## What shipped (P2/P3)

- **Problems panel** (`ProblemsPanel.tsx`) — the craft-hints gutter grown
  into a flat, clickable list (VS Code's Problems panel, our tokens):
  severity dot, message, line; clicking jumps the cursor. Toggled from
  the status-bar suggestion count.
- **Diff-on-disk view** (`DiffPanel.tsx`) — a read-only unified diff
  (`@codemirror/merge`) between the last saved state and the working
  buffer, to audit an unsaved edit before commit. Status-bar "diff".
- **"Open in Zed/VS Code"** (`api/shell.ts`) — the escape hatch into the
  user's daily driver via `@tauri-apps/plugin-shell`, scoped in
  `capabilities/default.json` to the `code` and `zed` binaries. VS Code
  gets `--goto <path>:<line>:<col>`; desktop-only, hidden in the preview.
- **Rust-side second opinion** — `lint_skill_content` command runs
  `skills::lint_manifest` (create_skill-parity frontmatter checks plus a
  couple of markdown-health rules) over a saved manifest; the status bar
  surfaces a "N policy" item on failures.
- **Reference-file tree (level-3)** — `list_skill_resources` /
  `read_skill_resource` commands expose supporting files (references/,
  scripts/, …) read-only and contained; the editor's "files" strip lists
  them and the preview pane renders them (markdown for `.md`, plain text
  otherwise).
- **Behavioral fixes** — editor autofocuses on open; GFM markdown
  highlighting matches the preview renderer; lint debounced to 250ms;
  `name`/`description` edits propagate to the dashboard + tab label on
  save; preview width persisted; escaped YAML scalars decode correctly.

## Editor polish (post-P3)

- **Name → folder rename** — when the frontmatter `name` differs from the
  folder after a save, the status bar offers a "rename folder" action
  (the Agent Skills spec requires them to agree). `rename_skill` moves
  the folder link-aware (a shared symlinked skill is re-linked, never
  followed), keeps disabled skills inside `.disabled`, validates the name
  with the same policy as `create_skill`, and rejects collisions. The
  editor remounts at the new manifest id.
- **Autosave** — an "auto" toggle (persisted) debounce-saves 1.2s after
  the last keystroke; manual ⌘S stays. Save errors keep the dirty dot.
- **Rust lint on the enable toggle** — `set_skill_enabled` now runs the
  authoritative `lint_manifest` when enabling and refuses (rolling the
  move back) if the manifest fails the hard policy, so a broken skill
  can't be switched on.

## Linting & proactive suggestions (the interesting part)

Three local sources, merged into one diagnostics stream:

1. **Frontmatter policy parity.** `create_skill` enforces the hard
   policy (name charset/≤64 chars, description ≤1024 chars, no `<`/`>`
   in the description — an injection vector into system prompts); the
   editor mirrors those for instant feedback, plus the name-equals-folder
   rule from the Agent Skills spec. `write_skill_content` is deliberately
   a raw write — rejecting saves would brick edits of pre-existing
   skills — so on save the policy is advisory, surfaced by the editor
   lint rather than the backend.
2. **Markdown health.** `markdownlint` (npm in-webview) or the Rust
   crates (`markdownlint-rs` / `mkdlint`, 64 MD-rules, LSP-shaped
   output, front-matter auto-detect) over IPC. Prefer the JS lib for
   zero-latency keystroke linting; the Rust crate can power a
   "lint on save" second opinion and CLI parity later.
3. **Skill-craft suggestions** — encode the 2026 authoring craft as
   proactive, local, rule-based hints (no cloud):
   - description is the *trigger*, not a summary: suggest "Use when…"
     framing; flag workflow/process summaries in the description (the
     #1 real-world skill smell — agents may follow the summary instead
     of reading the skill);
   - Trigger Triad heuristic: capability verb + explicit trigger
     conditions + user vocabulary keywords; warn on vague one-liners
     ("Helps with documents.");
   - third person; technology-agnostic triggers unless the skill is
     technology-specific;
   - body budget ≈5 000 tokens — suggest moving long sections to
     `references/` (progressive disclosure level 3);
   - name: lowercase + hyphens, matches folder, no reserved words.

   Each hint ships with a **quick-fix** where mechanical (capitalize→
   third-person is not mechanical — suggest only; name/folder sync and
   over-length frontmatter ARE mechanical — offer one-click fixes).

## Architecture sketch (implementation plan)

- **Tab integration:** extend `TitleTab` with `kind: "editor"` (id
  `editor:<manifest-id>`, label = skill name, dirty dot). Clicking a
  skill card opens the tab instead of `EditorModal`; the modal retires
  once parity is proven. Active-tab derivation rules already exist —
  extend, don't fork.
- **Editor surface:** CM6 with `markdown()` + a small YAML overlay for
  the frontmatter block (Lezer `StreamLanguage` or `@codemirror/lang-yaml`
  nested via `parseMixed`); theme via `EditorView.theme` mapping to
  `--text/--border/--danger` tokens; mono stays the editor face.
- **Diagnostics:** `@codemirror/lint` `linter()` running the three
  sources (debounced ~250 ms); markers styled with `--danger`/warning
  tints; lint count + line/col in a status strip reusing chip styles.
- **Save/close discipline:** ⌘S saves via `write_skill_content`
  (canonical-path rules unchanged); dirty tabs show a dot; closing a
  dirty tab uses the existing confirm vocabulary (no silent discard);
  Escape blurs per doctrine.
- **Preview split:** reuse `renderMarkdown` (frontmatter already
  stripped) in a right pane with a spring-loaded divider; toggleable,
  persisted in `skilltastic:*` localStorage like every other preference.
- **Suggestions panel:** CM6 autocomplete for frontmatter keys + a
  "craft hints" gutter/panel fed by source 3; keyboard-first, no
  animation on keyboard-initiated opens.

## Phasing

1. **P1:** editor tab + CM6 + theming + frontmatter lint + save/close
   discipline (modal stays as fallback route). ✅ shipped
2. **P2:** markdown lint + craft suggestions + quick-fixes + preview
   split + problems panel; retire `EditorModal`. ✅ shipped
3. **P3:** "Open in Zed/VS Code" shell escape, diff-on-disk view,
   Rust-side second opinion, reference-file tree. ✅ shipped

## Open questions

- CM6 YAML overlay: `parseMixed` with `@codemirror/lang-yaml` vs a
  hand-rolled stream parser for just the two required keys (start
  hand-rolled, upgrade if `allowed-tools`/`metadata` editing lands).
- Worker or main thread: our documents are tiny (≤5k tokens) — main
  thread linting is fine; revisit only if we ever edit big markdown.
