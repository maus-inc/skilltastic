See [AGENTS.md](AGENTS.md) for full agent instructions (structure, dev
commands, conventions), and the knowledge base in
[docs/kb/](docs/kb/README.md) for the complete project reference
(architecture, data & storage, build & release, improvement backlog).

Product facts: the app is **Skilltastic** (package/crate `skilltastic`,
identifier `com.mausinc.skilltastic`), published by **Owie Emmanuel** under
the **maus-inc** GitHub org. The master logo is `skilltastic.png` at the
repo root — all app/installer icons derive from it.

The one thing most worth remembering: **the release process is entirely
manual**. Version is duplicated across `package.json`, `package-lock.json`,
`src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml`/`Cargo.lock`, and
`docs/index.html` has hardcoded per-version download URLs — nothing
regenerates these automatically. See the "Release process" section in
[AGENTS.md](AGENTS.md) for the exact steps and files.
