# Skilltastic Knowledge Base

The canonical reference for anyone (human or agent) working on Skilltastic.
Read `01-overview.md` first; everything else is topic-scoped and standalone.

| Doc | What it covers |
| --- | --- |
| [01-overview.md](01-overview.md) | What Skilltastic is, the problem it solves, product vocabulary |
| [02-architecture.md](02-architecture.md) | System design: webview ↔ Rust IPC, module map, data flow |
| [03-frontend.md](03-frontend.md) | React/TypeScript layer: components, hooks, api client, utils |
| [04-backend.md](04-backend.md) | Rust/Tauri layer: commands, adapters, tool registry, security model |
| [05-data-and-storage.md](05-data-and-storage.md) | Everything persisted on disk: skills dirs, `.disabled/` convention, app state |
| [06-build-and-release.md](06-build-and-release.md) | Dev commands, required checks, the (manual) release process |
| [07-conventions.md](07-conventions.md) | Commit/PR style, code conventions, review bars |
| [08-improvement-backlog.md](08-improvement-backlog.md) | Roadmap and candidate improvements, with context |
| [09-button-system.md](09-button-system.md) | The button system: variants, sizes, states, usage mapping |
| [10-skill-editor-research.md](10-skill-editor-research.md) | Tab-based SKILL.md editor: engine research (CM6 vs Monaco vs Zed), linting & suggestion design, phasing |

## Fact sheet

- **Product:** Skilltastic — desktop dashboard for AI coding agent skills
- **Version:** 0.1.1
- **Publisher:** Owie Emmanuel
- **Org / repo:** [maus-inc/skilltastic](https://github.com/maus-inc/skilltastic)
- **Landing page:** https://maus-inc.github.io/skilltastic/ (served from `docs/`)
- **License:** MIT (© 2026 maus-inc)
- **Stack:** Tauri v2 (Rust) + React 19 + TypeScript + Vite; tests via vitest (frontend) and `cargo test` (backend)
- **App identifier:** `com.mausinc.skilltastic`
- **Brand asset:** `skilltastic.png` (repo root — source of truth; copies in `public/` and `docs/`, generated icon set in `src-tauri/icons/`)

## Keeping this KB honest

Update the relevant KB page **in the same PR** as any change that alters
behaviour, structure, storage locations, or process. A stale KB is worse
than none.
