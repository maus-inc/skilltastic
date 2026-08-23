# 08 — Improvement Backlog

Roadmap items and improvement candidates for Skilltastic, with enough
context to pick one up cold. Ordered roughly by value. Propose additions via
a feature-request issue first (see `CONTRIBUTING.md`).

## Roadmap (inherited, still valid)

### 1. Skill browser & install
Browse community skills and install them into any tool's skills folder in
one click. Touches: new Rust command(s) for install (must go through the
managed-roots validation), a browse UI, and a curated source/index decision.
Biggest product lever in the app.

### 2. Auto-update support
In-app update checks so users stop reinstalling by hand. Tauri v2 has an
updater plugin; requires signed update artifacts and appending update
metadata to releases — pairs with the signing work below.

### 3. Code-signed builds
Apple notarization + Windows signing to kill the Gatekeeper/SmartScreen
warnings. Publisher: Owie Emmanuel / maus-inc. Blocked on certificates and
CI secrets; the release workflow (`.github/workflows/release.yml`) is where
signing hooks in.

### 4. More tool adapters
Windsurf and Trae are on the radar; their skill-folder conventions are not
verified yet. Adding an adapter is a well-worn path — see `CONTRIBUTING.md`
and [04-backend.md](04-backend.md). Directory paths must be cited from the
tool's own docs, never guessed.

## Engineering improvements (candidates)

- **Automate the release chore.** Version is duplicated across five files
  plus hardcoded download URLs in `docs/index.html` (see
  [06-build-and-release.md](06-build-and-release.md)). A single
  `npm run bump -- X.Y.Z` script (or CI job) would remove the most
  error-prone manual step in the project.
- **CI for PRs.** Only releases build in CI today. A workflow running
  `tsc --noEmit`, `vitest`, `cargo check/clippy/fmt/test` on pull requests
  would catch breakage before review.
- **Refresh `docs/assets/demo.gif`** — it still shows the pre-rebrand UI.
  Re-record once the Skilltastic UI is stable.
- **Frontend component tests.** Utils are covered by vitest, components are
  not; consider Testing Library for the modals' edit/save flows.
- **Watchdog for external changes.** Skills changed on disk outside the app
  (tool installs a skill, user deletes a folder) only appear after a manual
  refresh; a filesystem watcher would keep the dashboard live.

## When you complete an item

Move it to a "Done" note in the PR description, update the README roadmap,
and keep this file pruned — it should always reflect *open* work only.
