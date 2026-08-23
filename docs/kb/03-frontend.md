# 03 — Frontend (React + TypeScript)

Entry: `index.html` → `src/main.tsx` → `src/App.tsx`. Vite dev server runs on
port 1420 (`vite.config.ts`), which `tauri.conf.json` points at during dev.

## Layout

```
src/
  api/            typed invoke() wrappers — the ONLY place IPC happens
    runtime.ts    the invoke() shim: real IPC in the desktop app, a fully
                  interactive session-local fixture store in a plain-browser
                  dev preview (never in prod). Handlers mirror the Rust
                  commands' shapes — void commands return `null`, and unit
                  tests in src/api/__tests__ guard the whole surface.
    skills.ts     skill commands (list, toggle, read/write, create, delete)
    projects.ts   project commands (tracked + detected projects)
    index.ts      barrel
  components/
    layout/       app chrome — TitleBar.tsx (Figma-style window chrome:
                  home tab + view tabs + drag region + window controls),
                  Sidebar.tsx (tools, projects, pins, version, repo link),
                  Topbar.tsx (search, view controls)
    skills/       SkillList.tsx grid, SkillCard.tsx, SortToggle.tsx
    modals/       EditorModal (view/edit SKILL.md), CreateSkillModal,
                  AddProjectModal, ProjectsModal — all built on ui/ModalShell
    ui/           ModalShell.tsx, icons.tsx (inline SVG icon set)
  hooks/
    useGlobalSkills.ts    loads tool entries + all user-level skills
    useProjects.ts        tracked + detected projects, add/remove/pin/touch
    useProjectSkills.ts   per-project skill lists and counts
    useSkillMutations.ts  toggle/delete/save/create with optimistic updates
    usePinnedTools.ts     localStorage-backed tool pins ("skilltastic:pinned-tools")
    useManualOrder.ts     drag-reorder persistence ("skilltastic:tool-order",
                          "skilltastic:project-order"); view mode persists as
                          "skilltastic:view-mode"
  utils/          pure, unit-tested helpers
    filterSkills.ts       search/tool/view filtering
    sidebarLists.ts       pin ordering + most-used project selection
    projectUsage.ts       30-day usage window logic
    relativeTime.ts       "3d ago" formatting
    markdown.ts           marked + DOMPurify pipeline for SKILL.md rendering
    __tests__/            vitest specs (helpers, sidebarLists)
  types/          domain types (skill.ts, project.ts, tool.ts, view.ts),
                  barrel at types/index.ts — keep in sync with Rust structs
```

## Patterns and rules

- **Data flows through hooks.** Components stay presentational; fetching and
  mutations live in `hooks/`, IPC in `api/`. Keep it that way.
- **Skill lists key on `stableSkillKey`, never the raw manifest id.**
  Toggling moves the folder into/out of `.disabled`, changing the id; a
  key change would remount the card (exit animation — the skill visibly
  "disappears"). Mutations match on the stable key for the same reason.
- **Types mirror serde.** Rust structs serialize `camelCase`
  (`#[serde(rename_all = "camelCase")]`); the TS types in `src/types/` must
  match field-for-field.
- **Markdown is sanitized.** `SKILL.md` content renders through
  `marked` → `DOMPurify` (`utils/markdown.ts`). Never render skill content
  without that pipeline — manifests are untrusted input.
- **UI preferences → localStorage** (namespaced `skilltastic:*`), never the
  Rust side. Anything that must survive reinstall belongs in the backend
  stores instead.
- **Branding:** the in-app logo is `/skilltastic.png` (from `public/`),
  referenced as the favicon in `index.html`; the sidebar brand is a
  skills.sh-style ANSI-Shadow figlet banner (`BRAND_ASCII` in `Sidebar.tsx`).

## Design language (phase 2)

- **Type:** Satoshi (self-hosted woff2 in `public/fonts/satoshi/`,
  `src/fonts.css`, ITF Free Font License) at 13px base with tight
  −0.01em tracking — condensed, compact. Monospace stays for terminal
  accents: skill names, paths, chips, the search box, empty states, and
  the ASCII brand.
- **Provider marks:** brand icons for every supported tool live in
  `public/agents/*.svg` (source: `@lobehub/icons-static-svg`, recolored
  to the mono theme; Crush/Factory are local monograms, the shared
  agents dir a prompt glyph), mapped through the store in
  `components/ui/providers.ts`. Skill cards show them in outline
  badges (`ui/Badge.tsx`, port of Watermelon badge-16). A new tool
  adapter requires a mark + store entry.
- **Icons:** Iconoir (`iconoir-react`, MIT) — 24px grid. All icons
  route through the wrappers in `components/ui/icons.tsx`; never
  import from `iconoir-react` directly in feature code. The Windows
  "restore down" glyph is the one local exception. Crispness contract:
  every wrapper emits the `icn` class — strokes are non-scaling (a
  uniform 1.5 screen px at any icon size) with geometricPrecision
  rendering. Don't pass per-site strokeWidth overrides; the uniform
  stroke IS the system look.
- **Layout:** Figma-UI3-style floating panels — the sidebar and main
  content are rounded (12px), bordered, translucent panels floating on
  an 8px-gapped black canvas under the title bar.
- **Morphing icons:** `morphicons` (spring path-morphing, zero deps)
  drives reactive icons that transform between two STROKE shapes —
  configured wrappers live in `ui/morphs.tsx` (chevron open/close,
  maximize↔restore). Icon data comes from the `iconoir` package as
  `?raw` svg parsed ONCE at module scope (plan-cache requirement).
  Binary state swaps (pin fill) stay keyed re-mounts; morphs are for
  shape-to-shape transitions. Tool tabs are the exception: they swap
  the grid glyph for the tool's OWN provider mark (`ToolTabMark`), a
  spring cross-morph, because provider logos are fill-drawn and
  `svgToIcon` honestly rejects fill-only icons — never fake a fill
  logo into a path morph.
- **Morph buttons (`btn-morph`):** the label⇄icon hover morph (new
  skill, editor edit/delete) keeps the label in NORMAL FLOW — it alone
  sizes the button and keeps its footprint at opacity 0, so the button
  never changes size or collapses — while the icon sits absolutely
  centered over it and rotates in. Never animate the button's width;
  never stack the states with grid (grid-area stacking rendered as an
  unpainted button in real browsers); pointer-gated, reduced-motion
  keeps the fade only.
- **Tooltips:** `[data-tip]` / `[data-tip-side="top"]` css tooltips
  (350ms intent delay) replace native `title` on window chrome, pins
  and the scope chip. Prefer them over `title` on interactive chrome.
- **Perf contract (60fps):** backdrop blur only on floating layers
  (popover/modals, 14px) — never the full-height panels; declarative
  motion states (initial/animate/exit) use full `transform` strings
  (GPU-composited). Gesture props are the exception — see the doctrine.
- **Motion:** the `motion` package (Framer) via `motion/react`.
  Transform ownership is exclusive: if motion animates an element, CSS
  must not transition its transform. `MotionConfig reducedMotion="user"`
  is set at the root.
- **Animation doctrine** (per animations.dev / emilkowalski/skills,
  vendored knowledge — re-fetch with `git clone
  github.com/emilkowalski/skills`): springs are for gestures and
  physical interactions (switch thumb, tap feedback); menus/popovers/
  modals tween 150–250ms on the strong ease-out
  `cubic-bezier(0.23,1,0.32,1)` (`--ease-out` token), scaling from
  0.95–0.97 out of the trigger's transform-origin — never `scale(0)`,
  never `ease-in`, never >300ms on UI. Exits mirror entries but
  faster. In declarative motion props (initial/animate/exit) use full
  `transform` strings (GPU); in GESTURE props (`whileTap`,
  `whileHover`) use the `scale`/`x`/`y` shorthands instead — a full
  `transform` string there left controls stuck unpainted in real
  browsers (the "disappearing buttons" bug the shorthands fixed).
  Hover motion stays near-imperceptible
  (≤2px) and is CSS-owned with a reduced-motion gate. Keyboard-
  initiated actions (⌘K) get no animation.
- **Edge light ("streak"):** every raised dark surface carries a 1px
  white inset streak along its top edge — tokens `--streak` (0.07),
  `--streak-md` (0.11); white surfaces (default buttons, checked
  switch) instead carry `--streak-black` (inset bottom shade + faint
  dark ring). The streaks are folded into the depth tokens, so panels
  get them for free; when writing a custom box-shadow, put the streak
  first. Hover highlights are opaque grey (#2e2e2e + streak), never
  blue.
- **Depth:** layered shadow tokens in `:root` (`--shadow-panel`,
  `--shadow-float`, `--shadow-modal`: hairline ring → contact → ambient
  → cast) plus `--blur-panel` backdrop blur on panels, menus, and
  modals. Use the tokens; don't hand-roll box-shadows.

## The title bar (custom window chrome)

The OS title bar is replaced with a Figma-style one (`layout/TitleBar.tsx`):

- **Window config:** `decorations: false` in `tauri.conf.json` for
  Windows/Linux; macOS instead uses `tauri.macos.conf.json` with
  `titleBarStyle: "Overlay"` + `hiddenTitle`, so native traffic lights
  render over a reserved 72px inset (`.tb-mac-inset`).
- **Anatomy (matches Figma):** 40px `#1E1E1E` strip → home tab (house
  icon = "all skills") → one tab per opened tool/project view (active
  `#2C2C2C`, close on hover, middle-click closes, 1px dividers between
  inactive tabs) → `+` (new skill) → draggable spacer → overflow menu →
  minimize/maximize/close (46px flat buttons, `#E81123` close hover;
  hidden on macOS).
- **Dropdown:** the arrow opens a command popover
  (`ui/CommandMenu.tsx`, ported from Watermelon UI's combobox-1):
  search input, grouped list (actions / tools / projects), empty state,
  check on the active view, full keyboard support. Reuse `CommandMenu`
  for any future searchable-select surface instead of building menus.
- **Tab state** lives in `App.tsx` (`TitleTab[]`, `src/types/tab.ts`);
  the active tab is *derived* from the current view, never stored, so
  sidebar and tabs can't desync. Closing the active tab falls back to
  its left neighbour, then home.
- **Permissions:** dragging/minimize/toggle-maximize/is-maximized/close
  are granted in `src-tauri/capabilities/default.json`
  (`core:window:allow-*`). New window APIs need a matching grant there.
- The title bar intentionally uses a sans-serif stack (Figma look);
  the rest of the app stays monospace.

## Testing

```bash
npm test              # vitest: utils specs, api fixture surface, and the
                      # app click-through suite (src/**/__tests__)
npx tsc --noEmit      # strict typecheck, must pass clean
```

Pure logic (filtering, ordering, time windows) belongs in `utils/` precisely
so it stays unit-testable without a webview.
