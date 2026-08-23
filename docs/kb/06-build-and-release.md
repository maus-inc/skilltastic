# 06 — Build & Release

## Prerequisites

- Node.js ≥ 20, npm
- Rust toolchain (stable) + Tauri v2 prerequisites
  (<https://tauri.app/start/prerequisites/>) — on Linux that includes
  `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf`.

## Everyday commands

```bash
npm install
npm run tauri dev        # run the desktop app with hot reload (vite on :1420)
npm run dev              # frontend only, in a browser (no IPC — limited use)
npm run tauri build      # release bundle for the current platform
```

## Required checks before any PR

```bash
npx tsc --noEmit                 # typecheck — clean
npm test                         # vitest — green
cd src-tauri
cargo check                      # clean
cargo fmt                        # no diff remains
cargo clippy --all-targets       # warning-free
cargo test                       # required if src-tauri/src/ changed
```

## Icons & brand assets

`skilltastic.png` at the repo root is the master logo. Regenerate the full
icon set after changing it:

```bash
npx tauri icon skilltastic.png -o src-tauri/icons   # then delete the
                                                    # android/ and ios/ output — desktop only
cp skilltastic.png public/skilltastic.png           # in-app logo + favicon
cp skilltastic.png docs/skilltastic.png             # landing page
```

Also regenerate `docs/assets/social-card.png` (1280×640) if the brand look
changes.

## Release process (entirely manual — do every step)

Version lives in **five files** and the landing page hardcodes download URLs.

1. Bump the version in:
   - `package.json` (`version`)
   - `package-lock.json` (top-level `version` **and** `packages[""].version`)
   - `src-tauri/tauri.conf.json` (`version`)
   - `src-tauri/Cargo.toml` (`version`)
   - refresh `src-tauri/Cargo.lock` with `cargo update -p skilltastic` from
     `src-tauri/` (don't hand-edit when a toolchain is available).
2. Update `docs/index.html`:
   - the three asset URLs under `<div class="downloads" id="downloads">`
     (`releases/download/vX.Y.Z/Skilltastic_X.Y.Z_...`) for macOS, Windows, Linux
   - the `vX.Y.Z · free · open source · mit licensed ·` text below the buttons
   - the installation-note version mentions
3. Update version mentions in `README.md` (download/signing notes).
4. Commit, push to `main`, then `git tag vX.Y.Z && git push origin vX.Y.Z`.
   The tag triggers `.github/workflows/release.yml`: tauri-action builds
   macOS (universal), Windows, and Linux and attaches installers to a
   **draft** GitHub release named `Skilltastic vX.Y.Z`.
5. Publish the draft once the workflow is green:
   `gh release edit vX.Y.Z --draft=false`.

## Signing status

Builds are **unsigned** (no Apple notarization, no Windows publisher
signature — bundle publisher metadata says "Owie Emmanuel" but that is not a
SmartScreen-verified certificate). Gatekeeper/SmartScreen warnings on first
launch are expected and documented in the README; code signing is a roadmap
item, not a bug.
