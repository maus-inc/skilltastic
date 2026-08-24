mod agents;
mod claude;
mod copilot;
mod crush;
mod cursor;
mod factory;
mod gemini;
mod junie;
mod kiro;
mod opencode;
mod roo;
pub mod tools;

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

pub use agents::AgentsAdapter;
pub use claude::ClaudeAdapter;
pub use copilot::CopilotAdapter;
pub use crush::CrushAdapter;
pub use cursor::CursorAdapter;
pub use factory::FactoryAdapter;
pub use gemini::GeminiAdapter;
pub use junie::JunieAdapter;
pub use kiro::KiroAdapter;
pub use opencode::OpenCodeAdapter;
pub use roo::RooAdapter;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AgentTool {
    Claude,
    /// The shared `~/.agents/skills` folder — the Agent Skills standard's
    /// interop directory, read natively by Codex, Goose, and Amp. Named
    /// "Agents" rather than after any one tool because it has no owner.
    Agents,
    Copilot,
    Crush,
    Cursor,
    Factory,
    Gemini,
    Junie,
    Kiro,
    Opencode,
    Roo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SkillScope {
    #[serde(rename = "user")]
    User,
    #[serde(rename = "project")]
    Project,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Skill {
    /// Absolute path to the skill's manifest file (SKILL.md). Doubles as
    /// a stable, unique identifier across the app's lifetime.
    pub id: String,
    pub tool: AgentTool,
    pub name: String,
    pub description: String,
    pub path: String,
    pub scope: SkillScope,
    pub enabled: bool,
}

/// Every supported coding agent implements this the same way: a directory
/// of `<skill-name>/SKILL.md` folders. None of these tools ship a native
/// enable/disable switch, so Skilltastic introduces its own convention:
/// disabled skills are moved into a sibling `.disabled/` folder inside the
/// same skills directory. That keeps the operation reversible and leaves
/// the tool's own files untouched otherwise.
pub trait SkillAdapter: Send + Sync {
    fn tool(&self) -> AgentTool;

    /// User-level skills directory for this tool, e.g. `~/.claude/skills`.
    fn skills_dir(&self) -> PathBuf;

    /// Path to this tool's skills directory relative to a project root,
    /// e.g. `.claude/skills`. Used to find project-level skills alongside
    /// the user-level ones from `skills_dir()`.
    fn project_subpath(&self) -> &'static str;

    fn discover(&self) -> Vec<Skill> {
        scan_scope(self.tool(), &self.skills_dir(), SkillScope::User)
    }

    fn discover_at(&self, project_root: &Path) -> Vec<Skill> {
        scan_scope(
            self.tool(),
            &project_root.join(self.project_subpath()),
            SkillScope::Project,
        )
    }
}

fn scan_scope(tool: AgentTool, dir: &Path, scope: SkillScope) -> Vec<Skill> {
    let mut skills = scan_dir(tool, dir, scope.clone(), true);
    skills.extend(scan_dir(tool, &dir.join(DISABLED_DIR), scope, false));
    skills
}

const MANIFEST_FILE: &str = "SKILL.md";
const DISABLED_DIR: &str = ".disabled";

fn scan_dir(tool: AgentTool, dir: &Path, scope: SkillScope, enabled: bool) -> Vec<Skill> {
    let mut out = Vec::new();
    let Ok(entries) = fs::read_dir(dir) else {
        return out;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        if path.file_name().and_then(|n| n.to_str()) == Some(DISABLED_DIR) {
            continue;
        }
        let manifest = path.join(MANIFEST_FILE);
        if !manifest.is_file() {
            continue;
        }
        let raw = fs::read_to_string(&manifest).unwrap_or_default();
        let (name, description) = parse_frontmatter(&raw);
        let fallback_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();
        out.push(Skill {
            id: manifest.to_string_lossy().to_string(),
            tool,
            name: if name.is_empty() { fallback_name } else { name },
            description,
            path: path.to_string_lossy().to_string(),
            scope: scope.clone(),
            enabled,
        });
    }
    out
}

/// Minimal YAML frontmatter reader for the two fields Skilltastic cares
/// about (`name`, `description`). Intentionally not a full YAML parser —
/// SKILL.md frontmatter is a flat key: value list.
pub(crate) fn parse_frontmatter(raw: &str) -> (String, String) {
    let mut name = String::new();
    let mut description = String::new();

    let mut lines = raw.lines();
    if lines.next() != Some("---") {
        return (name, description);
    }
    for line in lines {
        if line.trim() == "---" {
            break;
        }
        let Some((key, value)) = line.split_once(':') else {
            continue;
        };
        let value = decode_yaml_scalar(value);
        match key.trim() {
            "name" => name = value,
            "description" => description = value,
            _ => {}
        }
    }
    (name, description)
}

/// Decodes the two quoting styles this app reads and writes. Double-quoted
/// YAML scalars carry escapes (`\n`, `\t`, `\r`, `\"`, `\\` — exactly what
/// `create_skill`'s emitter produces); single-quoted ones double `''` to
/// escape a quote. Unquoted values pass through untouched. Without this a
/// created description containing a newline or quote would surface with
/// literal escape text.
pub(crate) fn decode_yaml_scalar(value: &str) -> String {
    let v = value.trim();
    if let Some(inner) = v.strip_prefix('"').and_then(|s| s.strip_suffix('"')) {
        let mut out = String::with_capacity(inner.len());
        let mut chars = inner.chars();
        while let Some(c) = chars.next() {
            if c != '\\' {
                out.push(c);
                continue;
            }
            match chars.next() {
                Some('n') => out.push('\n'),
                Some('t') => out.push('\t'),
                Some('r') => out.push('\r'),
                Some('"') => out.push('"'),
                Some('\\') => out.push('\\'),
                Some(other) => {
                    out.push('\\');
                    out.push(other);
                }
                None => out.push('\\'),
            }
        }
        return out;
    }
    if let Some(inner) = v.strip_prefix('\'').and_then(|s| s.strip_suffix('\'')) {
        return inner.replace("''", "'");
    }
    v.to_string()
}

/// One authoritative diagnostic from the Rust-side second opinion
/// (`lint_skill_content`). Mirrors `create_skill`'s hard policy plus a
/// couple of markdown-health checks.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillDiagnostic {
    pub severity: &'static str,
    pub message: String,
    pub line: usize,
}

/// The authoritative frontmatter/markdown check. The editor lints live on
/// the keystroke path (advisory); this is the `create_skill`-parity second
/// opinion run over a saved (or about-to-be-saved) manifest.
pub(crate) fn lint_manifest(raw: &str, folder_name: &str) -> Vec<SkillDiagnostic> {
    let mut out: Vec<SkillDiagnostic> = Vec::new();
    let lines: Vec<&str> = raw.lines().collect();

    if lines.first().map(|l| l.trim()) != Some("---") {
        out.push(SkillDiagnostic {
            severity: "error",
            message: "Missing YAML frontmatter — a SKILL.md starts with ---.".into(),
            line: 1,
        });
        return out;
    }

    let mut name: Option<String> = None;
    let mut description: Option<String> = None;
    let mut name_line = 0usize;
    let mut desc_line = 0usize;
    let mut body_start = lines.len();
    for (i, line) in lines.iter().enumerate().skip(1) {
        let trimmed = line.trim();
        if trimmed == "---" {
            body_start = i + 1;
            break;
        }
        if let Some((key, value)) = trimmed.split_once(':') {
            let value = decode_yaml_scalar(value);
            match key.trim() {
                "name" => {
                    name = Some(value);
                    name_line = i + 1;
                }
                "description" => {
                    description = Some(value);
                    desc_line = i + 1;
                }
                _ => {}
            }
        }
    }

    match &name {
        None => out.push(SkillDiagnostic {
            severity: "error",
            message: "Frontmatter needs a `name` field.".into(),
            line: name_line.max(2),
        }),
        Some(n) => {
            if n.chars().count() > 64 {
                out.push(SkillDiagnostic {
                    severity: "error",
                    message: "`name` must be at most 64 characters.".into(),
                    line: name_line,
                });
            } else if n.starts_with('.')
                || !n
                    .chars()
                    .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '-' | '.'))
            {
                out.push(SkillDiagnostic {
                    severity: "error",
                    message: "`name` allows only letters, digits, `_`, `-`, `.` and no leading dot.".into(),
                    line: name_line,
                });
            } else if n != folder_name {
                out.push(SkillDiagnostic {
                    severity: "warning",
                    message: format!("`name` “{n}” differs from the folder “{folder_name}”; agents expect them to match."),
                    line: name_line,
                });
            }
        }
    }

    match &description {
        None => out.push(SkillDiagnostic {
            severity: "error",
            message: "Frontmatter needs a `description` field — it is the trigger agents match against.".into(),
            line: desc_line.max(2),
        }),
        Some(d) => {
            if d.chars().count() > 1024 {
                out.push(SkillDiagnostic {
                    severity: "error",
                    message: "description must be at most 1024 characters.".into(),
                    line: desc_line,
                });
            }
            if d.contains('<') || d.contains('>') {
                out.push(SkillDiagnostic {
                    severity: "error",
                    message: "description must not contain '<' or '>' — they read like injected markup.".into(),
                    line: desc_line,
                });
            }
        }
    }

    // markdown health on the body (a lightweight second opinion)
    if body_start < lines.len() {
        let mut saw_h1 = false;
        for (i, line) in lines.iter().enumerate().skip(body_start) {
            if line.starts_with("# ") {
                saw_h1 = true;
            }
            if line.ends_with(' ') || line.ends_with('\t') {
                out.push(SkillDiagnostic {
                    severity: "info",
                    message: "Trailing whitespace.".into(),
                    line: i + 1,
                });
            }
        }
        if !saw_h1 {
            out.push(SkillDiagnostic {
                severity: "warning",
                message: "No `# Title` heading — agents scan headings first.".into(),
                line: body_start + 1,
            });
        }
    }

    out
}

/// Level-3 resources: supporting files inside the skill folder (everything
/// except SKILL.md), returned as forward-slash relative paths.
pub(crate) fn list_resources(manifest: &Path) -> Result<Vec<String>, String> {
    let skill_dir = manifest.parent().ok_or("invalid skill path")?;
    let mut out: Vec<String> = Vec::new();
    walk_resources(skill_dir, skill_dir, 0, &mut out);
    out.sort();
    Ok(out)
}

const RESOURCE_MAX_DEPTH: usize = 8;
const RESOURCE_MAX_ENTRIES: usize = 500;
const RESOURCE_MAX_BYTES: u64 = 256 * 1024;

fn walk_resources(dir: &Path, base: &Path, depth: usize, out: &mut Vec<String>) {
    if depth > RESOURCE_MAX_DEPTH || out.len() >= RESOURCE_MAX_ENTRIES {
        return;
    }
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        if out.len() >= RESOURCE_MAX_ENTRIES {
            return;
        }
        let path = entry.path();
        if path.is_dir() {
            walk_resources(&path, base, depth + 1, out);
            continue;
        }
        if path.file_name().and_then(|n| n.to_str()) == Some(MANIFEST_FILE) {
            continue;
        }
        let Ok(rel) = path.strip_prefix(base) else {
            continue;
        };
        out.push(rel.to_string_lossy().replace('\\', "/"));
    }
}

/// Reads one supporting file, read-only and strictly contained in the
/// skill folder (symlinks followed, must still land inside it).
pub(crate) fn read_resource(manifest: &Path, relative: &str) -> Result<String, String> {
    let rel_path = Path::new(relative);
    if relative.is_empty()
        || rel_path.is_absolute()
        || relative.split(|c| c == '/' || c == '\\').any(|c| c == "..")
    {
        return Err("not a contained resource path".into());
    }
    let skill_dir = manifest.parent().ok_or("invalid skill path")?;
    let resolved_dir = fs::canonicalize(skill_dir).map_err(|e| e.to_string())?;
    let target = fs::canonicalize(skill_dir.join(rel_path))
        .map_err(|_| "resource does not exist".to_string())?;
    if !target.starts_with(&resolved_dir) {
        return Err("resource escapes the skill folder".into());
    }
    if target.file_name().and_then(|n| n.to_str()) == Some(MANIFEST_FILE) {
        return Err("SKILL.md is not a resource".into());
    }
    let meta = fs::metadata(&target).map_err(|e| e.to_string())?;
    if meta.len() > RESOURCE_MAX_BYTES {
        return Err("resource is too large to preview".into());
    }
    fs::read_to_string(&target).map_err(|e| e.to_string())
}

pub fn toggle_enabled(skill_path: &Path, enable: bool) -> std::io::Result<PathBuf> {
    let invalid = || std::io::Error::new(std::io::ErrorKind::NotFound, "invalid skill path");

    let skill_dir = skill_path.parent().ok_or_else(invalid)?;
    let name = skill_dir.file_name().ok_or_else(invalid)?;
    let parent = skill_dir.parent().ok_or_else(invalid)?;

    // A disabled skill's manifest lives one level deeper, under a
    // `.disabled` folder inside the real skills directory - skip that
    // extra segment so `skills_dir` is correct in both directions.
    let skills_dir = if parent.file_name().and_then(|n| n.to_str()) == Some(DISABLED_DIR) {
        parent.parent().ok_or_else(invalid)?
    } else {
        parent
    };

    let (from, to) = if enable {
        (
            skills_dir.join(DISABLED_DIR).join(name),
            skills_dir.join(name),
        )
    } else {
        let disabled_root = skills_dir.join(DISABLED_DIR);
        fs::create_dir_all(&disabled_root)?;
        (skills_dir.join(name), disabled_root.join(name))
    };

    move_skill_entry(&from, &to)?;
    Ok(to.join(MANIFEST_FILE))
}

/// Moves a skill folder from `from` to `to`. Plain directories are renamed
/// as usual, but a symlinked skill (common for tools like Cursor that share
/// skills with other tools via a link) needs special care: naively renaming
/// the link node would leave a relative target (e.g.
/// `../../.claude/skills/x`) resolving from the wrong depth once it's
/// nested one level into/out of `.disabled`, silently turning it into a
/// dangling link. Resolve the link's real target first and recreate an
/// absolute symlink at the destination instead.
fn move_skill_entry(from: &Path, to: &Path) -> std::io::Result<()> {
    if from.is_symlink() {
        let target = fs::canonicalize(from)?;
        create_symlink(&target, to)?;
        fs::remove_file(from)
    } else {
        fs::rename(from, to)
    }
}

#[cfg(unix)]
fn create_symlink(target: &Path, link: &Path) -> std::io::Result<()> {
    std::os::unix::fs::symlink(target, link)
}

#[cfg(windows)]
fn create_symlink(target: &Path, link: &Path) -> std::io::Result<()> {
    if target.is_dir() {
        std::os::windows::fs::symlink_dir(target, link)
    } else {
        std::os::windows::fs::symlink_file(target, link)
    }
}

pub fn delete_skill_dir(skill_path: &Path) -> std::io::Result<()> {
    let dir = skill_path
        .parent()
        .ok_or_else(|| std::io::Error::new(std::io::ErrorKind::NotFound, "invalid skill path"))?;
    // A symlinked skill points at a folder elsewhere on disk — usually
    // another tool's skills dir, the standard cross-tool sharing setup.
    // Deleting must unlink the link itself and NEVER recurse into the
    // target: remove_dir_all would follow the link and wipe the user's
    // original folder. symlink_metadata inspects the link node itself.
    if fs::symlink_metadata(dir)?.file_type().is_symlink() {
        return fs::remove_file(dir);
    }
    fs::remove_dir_all(dir)
}

/// Renames a skill folder in place (keeping it inside `.disabled` when it
/// is disabled). Link-aware via `move_skill_entry`, so a shared symlinked
/// skill is re-linked, never followed. The caller must validate the name
/// and collision-check first.
pub fn rename_skill_dir(skill_path: &Path, new_name: &str) -> std::io::Result<PathBuf> {
    let invalid = || std::io::Error::new(std::io::ErrorKind::NotFound, "invalid skill path");

    let skill_dir = skill_path.parent().ok_or_else(invalid)?;
    let parent = skill_dir.parent().ok_or_else(invalid)?;

    let disabled = parent.file_name().and_then(|n| n.to_str()) == Some(DISABLED_DIR);
    let skills_dir = if disabled {
        parent.parent().ok_or_else(invalid)?
    } else {
        parent
    };
    let to = if disabled {
        skills_dir.join(DISABLED_DIR).join(new_name)
    } else {
        skills_dir.join(new_name)
    };

    move_skill_entry(skill_dir, &to)?;
    Ok(to.join(MANIFEST_FILE))
}

pub fn all_adapters() -> Vec<Box<dyn SkillAdapter>> {
    vec![
        Box::new(ClaudeAdapter),
        Box::new(AgentsAdapter),
        Box::new(CopilotAdapter),
        Box::new(CrushAdapter),
        Box::new(CursorAdapter),
        Box::new(FactoryAdapter),
        Box::new(GeminiAdapter),
        Box::new(JunieAdapter),
        Box::new(KiroAdapter),
        Box::new(OpenCodeAdapter),
        Box::new(RooAdapter),
    ]
}

pub fn adapter_for(tool: AgentTool) -> Box<dyn SkillAdapter> {
    match tool {
        AgentTool::Claude => Box::new(ClaudeAdapter),
        AgentTool::Agents => Box::new(AgentsAdapter),
        AgentTool::Copilot => Box::new(CopilotAdapter),
        AgentTool::Crush => Box::new(CrushAdapter),
        AgentTool::Cursor => Box::new(CursorAdapter),
        AgentTool::Factory => Box::new(FactoryAdapter),
        AgentTool::Gemini => Box::new(GeminiAdapter),
        AgentTool::Junie => Box::new(JunieAdapter),
        AgentTool::Kiro => Box::new(KiroAdapter),
        AgentTool::Opencode => Box::new(OpenCodeAdapter),
        AgentTool::Roo => Box::new(RooAdapter),
    }
}

pub fn home_dir() -> PathBuf {
    dirs::home_dir().unwrap_or_else(|| PathBuf::from("."))
}

/// The user-level config directory, honoring `$XDG_CONFIG_HOME` per the
/// XDG Base Directory spec (only absolute values count — the spec says
/// relative ones must be ignored). Falls back to `~/.config`, which is
/// also the documented location on macOS and Windows for the tools that
/// use it.
pub fn config_dir() -> PathBuf {
    std::env::var_os("XDG_CONFIG_HOME")
        .map(PathBuf::from)
        .filter(|p| p.is_absolute())
        .unwrap_or_else(|| home_dir().join(".config"))
}

pub fn discover_project_skills(project_root: &Path) -> Vec<Skill> {
    all_adapters()
        .into_iter()
        .flat_map(|adapter| adapter.discover_at(project_root))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lint_manifest_flags_policy_issues() {
        // missing name match, angle brackets in description, missing H1
        let raw = "---\nname: other\ndescription: does <stuff>\n---\n\nbody text\n";
        let diags = lint_manifest(raw, "demo");
        let messages: Vec<&str> = diags.iter().map(|d| d.message.as_str()).collect();
        assert!(diags.iter().any(|d| d.severity == "warning" && d.message.contains("differs from the folder")));
        assert!(diags.iter().any(|d| d.severity == "error" && d.message.contains("'<'")));
        assert!(diags.iter().any(|d| d.severity == "warning" && d.message.contains("heading")));
        assert!(messages.iter().all(|m| !m.is_empty()));
    }

    #[test]
    fn lint_manifest_accepts_a_clean_manifest() {
        let raw = "---\nname: demo\ndescription: Use when drafting a changelog.\n---\n\n# demo\n\nWrites a changelog.\n";
        assert!(lint_manifest(raw, "demo").is_empty());
    }

    #[test]
    fn lint_manifest_requires_frontmatter_and_fields() {
        assert!(lint_manifest("no frontmatter\n", "demo")
            .iter()
            .any(|d| d.message.contains("frontmatter")));
        assert!(lint_manifest("---\n---\n", "demo")
            .iter()
            .any(|d| d.message.contains("`name`")));
        assert!(lint_manifest("---\nname: demo\n---\n", "demo")
            .iter()
            .any(|d| d.message.contains("`description`")));
    }

    #[test]
    fn resources_are_listed_and_read_contained() {
        let skills_dir = temp_skills_dir("resources");
        let manifest = skills_dir.join("demo").join(MANIFEST_FILE);
        fs::create_dir_all(skills_dir.join("demo/references")).unwrap();
        fs::write(skills_dir.join("demo/references/guide.md"), "# guide\n").unwrap();
        fs::write(skills_dir.join("demo/script.sh"), "#!/bin/sh\n").unwrap();

        let list = list_resources(&manifest).unwrap();
        assert_eq!(list, vec!["references/guide.md".to_string(), "script.sh".to_string()]);

        assert_eq!(read_resource(&manifest, "references/guide.md").unwrap(), "# guide\n");
        // escapes and the manifest itself are rejected
        assert!(read_resource(&manifest, "../escape.md").is_err());
        assert!(read_resource(&manifest, "/abs/path.md").is_err());
        assert!(read_resource(&manifest, "SKILL.md").is_err());
        assert!(read_resource(&manifest, "missing.md").is_err());

        fs::remove_dir_all(&skills_dir).unwrap();
    }

    fn temp_skills_dir(tag: &str) -> PathBuf {
        let dir =
            std::env::temp_dir().join(format!("skilltastic-test-{tag}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(dir.join("demo")).unwrap();
        fs::write(
            dir.join("demo").join(MANIFEST_FILE),
            "---\nname: demo\n---\n",
        )
        .unwrap();
        dir
    }

    #[test]
    fn disable_then_enable_round_trips() {
        let skills_dir = temp_skills_dir("roundtrip");
        let manifest = skills_dir.join("demo").join(MANIFEST_FILE);

        let disabled_manifest = toggle_enabled(&manifest, false).expect("disable should succeed");
        assert!(disabled_manifest.starts_with(skills_dir.join(DISABLED_DIR)));
        assert!(disabled_manifest.is_file());

        let re_enabled_manifest =
            toggle_enabled(&disabled_manifest, true).expect("re-enable should succeed");
        assert_eq!(
            re_enabled_manifest,
            skills_dir.join("demo").join(MANIFEST_FILE)
        );
        assert!(re_enabled_manifest.is_file());

        fs::remove_dir_all(&skills_dir).unwrap();
    }

    #[test]
    #[cfg(unix)]
    fn disabling_a_relative_symlinked_skill_keeps_it_resolvable() {
        // Mirrors a real setup: a skill directory that lives elsewhere,
        // linked into a tool's skills dir with a relative target (e.g.
        // Cursor sharing a skill from `~/.claude/skills` via
        // `../../.claude/skills/<name>`).
        let real_dir =
            std::env::temp_dir().join(format!("skilltastic-test-real-{}", std::process::id()));
        let _ = fs::remove_dir_all(&real_dir);
        fs::create_dir_all(&real_dir).unwrap();
        fs::write(real_dir.join(MANIFEST_FILE), "---\nname: linked\n---\n").unwrap();

        let skills_dir = temp_skills_dir("symlink");
        let link = skills_dir.join("linked");
        std::os::unix::fs::symlink(&real_dir, &link).unwrap();
        let manifest = link.join(MANIFEST_FILE);

        let disabled_manifest = toggle_enabled(&manifest, false).expect("disable should succeed");
        assert!(
            disabled_manifest.is_file(),
            "symlink must still resolve once disabled"
        );

        let re_enabled_manifest =
            toggle_enabled(&disabled_manifest, true).expect("re-enable should succeed");
        assert!(
            re_enabled_manifest.is_file(),
            "symlink must still resolve once re-enabled"
        );

        fs::remove_dir_all(&skills_dir).unwrap();
        fs::remove_dir_all(&real_dir).unwrap();
    }

    #[test]
    fn deleting_a_plain_skill_removes_its_folder() {
        let skills_dir = temp_skills_dir("delete-plain");
        let skill_dir = skills_dir.join("victim");
        fs::create_dir_all(&skill_dir).unwrap();
        fs::write(skill_dir.join(MANIFEST_FILE), "---\nname: victim\n---\n").unwrap();

        delete_skill_dir(&skill_dir.join(MANIFEST_FILE)).expect("delete should succeed");
        assert!(!skill_dir.exists());

        fs::remove_dir_all(&skills_dir).unwrap();
    }

    #[test]
    #[cfg(unix)]
    fn deleting_a_symlinked_skill_never_follows_the_link() {
        // The data-loss case: a skill linked into a tool's folder from
        // elsewhere on disk. Deleting it must unlink the link node only —
        // the user's original folder has to survive untouched.
        let real_dir = std::env::temp_dir().join(format!(
            "skilltastic-test-delreal-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&real_dir);
        fs::create_dir_all(&real_dir).unwrap();
        fs::write(real_dir.join(MANIFEST_FILE), "---\nname: linked\n---\n").unwrap();
        fs::write(real_dir.join("precious.txt"), "do not delete").unwrap();

        let skills_dir = temp_skills_dir("delete-symlink");
        let link = skills_dir.join("linked");
        std::os::unix::fs::symlink(&real_dir, &link).unwrap();

        delete_skill_dir(&link.join(MANIFEST_FILE)).expect("delete should succeed");

        assert!(!link.exists(), "the link itself must be gone");
        assert!(
            real_dir.join("precious.txt").is_file(),
            "the original folder must survive — deleting a linked skill never follows the link"
        );

        fs::remove_dir_all(&skills_dir).unwrap();
        fs::remove_dir_all(&real_dir).unwrap();
    }

    #[test]
    fn rename_moves_the_folder_and_keeps_content() {
        let skills_dir = temp_skills_dir("rename");
        let manifest = skills_dir.join("demo").join(MANIFEST_FILE);
        fs::write(&manifest, "---\nname: renamed\n---\n").unwrap();

        let new_manifest = rename_skill_dir(&manifest, "renamed").expect("rename should succeed");
        assert_eq!(new_manifest, skills_dir.join("renamed").join(MANIFEST_FILE));
        assert!(new_manifest.is_file());
        assert!(!skills_dir.join("demo").exists());
        assert_eq!(fs::read_to_string(&new_manifest).unwrap(), "---\nname: renamed\n---\n");

        fs::remove_dir_all(&skills_dir).unwrap();
    }

    #[test]
    fn rename_keeps_a_disabled_skill_disabled() {
        let skills_dir = temp_skills_dir("rename-disabled");
        let manifest = skills_dir.join("demo").join(MANIFEST_FILE);
        let disabled = toggle_enabled(&manifest, false).expect("disable should succeed");

        let renamed = rename_skill_dir(&disabled, "renamed").expect("rename should succeed");
        assert!(renamed.starts_with(skills_dir.join(DISABLED_DIR)));
        assert_eq!(renamed, skills_dir.join(DISABLED_DIR).join("renamed").join(MANIFEST_FILE));
        assert!(renamed.is_file());

        fs::remove_dir_all(&skills_dir).unwrap();
    }
}
