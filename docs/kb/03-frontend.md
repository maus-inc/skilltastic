# 03 — Frontend (React + TypeScript)

Entry: `index.html` → `src/main.tsx` → `src/App.tsx`. Vite dev server runs on
port 1420 (`vite.config.ts`), which `tauri.conf.json` points at during dev.

## Layout

```
src/
  api/            typed invoke() wrappers — the ONLY place IPC happens
    runtime.ts    the invoke() shim: real IPC in the desktop app, read-only
                  fixtures in a plain-browser dev preview (never in prod)
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
- **Icons:** Iconoir (`iconoir-react`, MIT) — 24px grid, ~1.5px stroke.
  All icons route through the wrappers in `components/ui/icons.tsx`;
  never import from `iconoir-react` directly in feature code. The
  Windows "restore down" glyph is the one local exception.
- **Layout:** Figma-UI3-style floating panels — the sidebar and main
  content are rounded (12px), bordered, translucent panels floating on
  an 8px-gapped black canvas under the title bar.
- **Motion:** the `motion` package (Framer) drives all state-driven
  animation — spring-based, through `motion/react`. Transform ownership
  is exclusive: if motion animates an element, CSS must not transition
  its transform. `MotionConfig reducedMotion="user"` is set at the root.
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
npm test              # vitest, runs src/utils/__tests__
npx tsc --noEmit      # strict typecheck, must pass clean
```

Pure logic (filtering, ordering, time windows) belongs in `utils/` precisely
so it stays unit-testable without a webview.
