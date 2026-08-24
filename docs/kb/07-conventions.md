# 07 — Conventions

## Commits

- Imperative mood, lowercase start: `fix sidebar pin ordering`,
  `add windsurf adapter`.
- Explain *why* in the body when it isn't obvious from the diff.
- No `Co-Authored-By` trailers in this repo.

## Pull requests

- One concern per PR; keep the diff scoped.
- Describe the *why*, link the issue it resolves if any.
- All checks in [06-build-and-release.md](06-build-and-release.md) must pass
  clean before opening.
- Behaviour/structure/process changes update the matching KB page in the
  same PR.

## Code conventions

### Rust

- `cargo fmt` formatting, `clippy --all-targets` warning-free.
- Every adapter cites the tool documentation it was verified against in a
  doc comment.
- New disk-touching commands **must** validate through
  `validate_manifest_at()` / `skills_roots()` in `commands/mod.rs` — the
  webview is untrusted input (see [04-backend.md](04-backend.md)).
- Tests colocated in `#[cfg(test)]` modules; temp sandboxes prefixed
  `skilltastic-…` under the OS temp dir.

### TypeScript / React

- Strict TS; `npx tsc --noEmit` must be clean.
- IPC only in `src/api/`; data fetching/mutations only in `src/hooks/`;
  components stay presentational.
- Pure logic goes in `src/utils/` with vitest coverage.
- Types in `src/types/` mirror the serde `camelCase` output of Rust structs.
- Skill markdown always renders through the `marked` + DOMPurify pipeline in
  `utils/markdown.ts`.
- localStorage keys are namespaced `skilltastic:*`.

## Naming & branding

- Product name: **Skilltastic** (one word, capital S).
- Package/crate/slug: `skilltastic`; lib: `skilltastic_lib`;
  identifier: `com.mausinc.skilltastic`.
- Publisher: **Owie Emmanuel**; org: **maus-inc**
  (`github.com/maus-inc/skilltastic`); copyright: © maus-inc.
- Master logo: `skilltastic.png` at repo root — all icons derive from it
  (see [06-build-and-release.md](06-build-and-release.md)).

## Community

- Bug reports / feature requests / directory corrections go through the
  issue templates in `.github/ISSUE_TEMPLATE/`.
- `CODE_OF_CONDUCT.md` applies to all project spaces.
