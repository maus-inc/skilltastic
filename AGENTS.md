# Agent instructions — Skilltastic

Stack: [Tauri v2](https://tauri.app) (Rust backend) + React + TypeScript
frontend, built with Vite.

> **Knowledge base:** the full project reference lives in
> [`docs/kb/`](docs/kb/README.md) — overview, architecture, frontend,
> backend, data and storage, build and release, conventions, and the
> improvement backlog. Read it before making non-trivial changes, and
> update the matching KB page in the same PR when you change behaviour,
> structure, storage, or process.

## Rules

- Do not propose band-aid fixes to problems. Identify the root cause, whether
  architectural or logical, and address it directly. Remove broken code when
  needed. If something is broken, fix it at the root, even if that means
  refactoring and overhauling systems.
- When asked to review changes, read `REVIEW.md` and apply `FULL-REVIEW.md`.
- NEVER MERGE any branch without first confirming with the human in the loop,
  the branch being merged into, and explicit confirmation in exact wording:
  `Yes Merge Branch X into Branch Y`.
- Enforce DRY. If you copy and paste code, stop and refactor it into a
  reusable function or module.
- Avoid over-engineering. Build the simplest solution that still meets the
  requirement.
- Keep changes minimal. Do not break existing functionality.
- Write clear, maintainable code that is self documenting. Do not comment on
  new code except where it explains non-obvious behaviour.
- Prefer existing patterns: dialogs, state management, API interactions, and
  the invoke client.
- Pre-push: before pushing to any branch, run the gates in `FULL-REVIEW.md`
  Part I Section 9 for the changed areas. Lint, typecheck, and test locally so
  you do not push regressions. Check what CI validates and run it locally when
  you can.

## Writing style repo-wide

Before writing or editing any user-facing prose (README, docs, KB, the landing
page, issue and PR text), apply the repo's plain-prose rules:

- No em dashes. Do not use parentheses or connector colons as substitutes.
- Straight quotes only.
- Sentence-case headings.
- Active voice with a named actor.
- Plain words over jargon.
- Concrete facts (paths, numbers, mechanisms) instead of feel-good abstractions.

## Structure

```
src/
  api/                  the invoke client over Rust commands (skills.ts, projects.ts)
  components/
    layout/             app chrome (Sidebar, Topbar)
    skills/             skill grid (SkillList, SkillCard, SortToggle)
    modals/             the four dialogs (Editor, CreateSkill, AddProject, Projects)
    ui/                 shared primitives (ModalShell, icons, morphs, providers)
  hooks/                data + mutations (useGlobalSkills, useProjects, useProjectSkills)
  utils/                pure helpers + tests (filtering, sidebar lists, time, markdown)
  types/                shared frontend types split by domain, barrel at types/index.ts
src-tauri/src/
  commands/             tauri commands split by domain — skills.rs, create_skill.rs,
                        projects.rs; mod.rs holds the shared managed-path validation
                        (see the security note below)
  skills/               one adapter per skills folder (claude, agents, copilot, ...),
                        plus tools.rs — the tool to folder registry driving the sidebar
  projects.rs           persisted list of tracked project folders
  detect.rs             project-folder discovery for the add-project picker
docs/                   the landing page (GitHub Pages, docs/index.html)
                        and specs/plans under docs/superpowers/
```

Each skills folder implements the same `SkillAdapter` trait
(`src-tauri/src/skills/mod.rs`); tools are readers listed in
`src-tauri/src/skills/tools.rs`. See
[CONTRIBUTING.md](CONTRIBUTING.md) for how to add a new adapter or fix a
tool's skills-directory path.

## Commands

```bash
npm install
npm run tauri dev        # dev app
npm run tauri build      # release binary for your platform
npx tsc --noEmit         # typecheck — must pass clean before a PR
npm test                 # vitest unit tests (utils helpers) — must pass before a PR
cd src-tauri && cargo check     # must pass clean before a PR
cd src-tauri && cargo fmt       # run before committing; no diff should remain
cd src-tauri && cargo clippy --all-targets   # must pass warning-free before a PR
cd src-tauri && cargo test      # required if you touched src-tauri/src/
```

Security note: file-touching commands (`read_skill_content`,
`write_skill_content`, `delete_skill`, `set_skill_enabled`) validate
their paths against the skills roots the app manages (`skills_roots` /
`validate_manifest_at` in `src-tauri/src/commands/mod.rs`). Never
bypass that check when adding commands. The webview is untrusted input like
any other frontend.

## Release process

Version is duplicated across five files and the landing page has hardcoded
download links. None of this is automated, all of it must be updated by hand
every release:

1. Bump the version number in:
   - `package.json` (`version`)
   - `package-lock.json` (top-level `version` and `packages[""].version`)
   - `src-tauri/tauri.conf.json` (`version`)
   - `src-tauri/Cargo.toml` (version)
   - then run `cargo update -p skilltastic` from `src-tauri/` to refresh
     `src-tauri/Cargo.lock` (do not hand-edit the lockfile).
2. Update `docs/index.html`:
   - the three hardcoded asset URLs under `<div class="downloads" id="downloads">`
     (`releases/download/vX.Y.Z/Skilltastic_X.Y.Z_...`) for macOS, Windows,
     Linux
   - the `vX.Y.Z · free · open source · mit licensed ·` version text right
     below the download buttons
3. Commit the version bump, push to `main`.
4. `git tag vX.Y.Z && git push origin vX.Y.Z` — this triggers
   `.github/workflows/release.yml`, which builds macOS (universal), Windows,
   and Linux via `tauri-action` and creates a draft GitHub release with the
   installers attached.
5. Once the workflow succeeds, publish the draft so it becomes the public
   latest release and the download links on the site resolve:
   `gh release edit vX.Y.Z --draft=false`.

Builds are unsigned (see README's Download section). This is expected, code
signing is on the roadmap, not a bug to fix silently.

## Conventions

- No `Co-Authored-By` trailer on commits in this repo.
- Commit messages: imperative mood, lowercase start (`fix ...`, `add ...`),
  explain why in the body when it is not obvious from the diff.
- Keep PRs scoped to one concern (see [CONTRIBUTING.md](CONTRIBUTING.md)).
