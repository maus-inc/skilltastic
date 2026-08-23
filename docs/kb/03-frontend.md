# 03 — Frontend (React + TypeScript)

Entry: `index.html` → `src/main.tsx` → `src/App.tsx`. Vite dev server runs on
port 1420 (`vite.config.ts`), which `tauri.conf.json` points at during dev.

## Layout

```
src/
  api/            typed invoke() wrappers — the ONLY place IPC happens
    skills.ts     skill commands (list, toggle, read/write, create, delete)
    projects.ts   project commands (tracked + detected projects)
    index.ts      barrel
  components/
    layout/       app chrome — Sidebar.tsx (tools, projects, pins, version,
                  repo link), Topbar.tsx (search, view controls)
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
  referenced in `Sidebar.tsx` and as the favicon in `index.html`.

## Testing

```bash
npm test              # vitest, runs src/utils/__tests__
npx tsc --noEmit      # strict typecheck, must pass clean
```

Pure logic (filtering, ordering, time windows) belongs in `utils/` precisely
so it stays unit-testable without a webview.
