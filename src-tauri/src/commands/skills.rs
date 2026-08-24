use super::{find_skill_by_manifest, manageable_manifest};
use crate::projects;
use crate::skills::{self, tools::ToolEntry, Skill};
use std::fs;
use std::path::Path;
use tauri::AppHandle;

/// Tool-level registry entries (see `skills::tools`): one per coding
/// agent, listing every skills folder it reads.
#[tauri::command]
pub fn list_tool_entries() -> Vec<ToolEntry> {
    skills::tools::tool_entries()
}

#[tauri::command]
pub fn list_skills() -> Vec<Skill> {
    skills::all_adapters()
        .into_iter()
        .flat_map(|adapter| adapter.discover())
        .collect()
}

#[tauri::command]
pub fn set_skill_enabled(app: AppHandle, id: String, enabled: bool) -> Result<Skill, String> {
    // toggling is link-aware: it must move the managed entry (the link
    // node for a shared skill), never the canonical target — see
    // ManagedManifest
    let managed = manageable_manifest(&app, Path::new(&id))?;
    let new_manifest =
        skills::toggle_enabled(&managed.raw, enabled).map_err(|e| e.to_string())?;

    find_skill_by_manifest(&app, &new_manifest).ok_or_else(|| "skill not found after toggle".into())
}

#[tauri::command]
pub fn delete_skill(app: AppHandle, id: String) -> Result<(), String> {
    // deletion runs on the managed entry: for a symlinked skill that
    // unlinks the link and leaves the user's original folder alone
    let managed = manageable_manifest(&app, Path::new(&id))?;
    skills::delete_skill_dir(&managed.raw).map_err(|e| e.to_string())?;
    // A project count is only a cache; clear it after a mutation rather than
    // scanning the project again in the background. Match the RAW entry too:
    // deletion unlinks the managed link node, and for a symlinked project
    // skill the canonical target resolves OUTSIDE the project, so a
    // canonical-only match would never clear the cached count.
    if let Some(project) = projects::list(&app)
        .unwrap_or_default()
        .into_iter()
        .find(|p| {
            managed.raw.starts_with(&p.path)
                || managed.canonical.starts_with(&p.path)
                || fs::canonicalize(&p.path)
                    .map(|cp| managed.canonical.starts_with(cp))
                    .unwrap_or(false)
        })
    {
        let _ = projects::clear_skill_count(&app, &project.path);
    }
    Ok(())
}

#[tauri::command]
pub fn read_skill_content(app: AppHandle, id: String) -> Result<String, String> {
    // content ops use the canonical snapshot: a link swapped between
    // validation and use changes nothing, writes cannot escape a root
    let managed = manageable_manifest(&app, Path::new(&id))?;
    fs::read_to_string(managed.canonical).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_skill_content(app: AppHandle, id: String, content: String) -> Result<(), String> {
    let managed = manageable_manifest(&app, Path::new(&id))?;
    fs::write(managed.canonical, content).map_err(|e| e.to_string())
}

/// The authoritative second opinion over a manifest: `create_skill`-parity
/// frontmatter checks plus a couple of markdown-health rules. Runs on save,
/// on the caller-supplied content (the raw write is deliberately advisory).
#[tauri::command]
pub fn lint_skill_content(
    app: AppHandle,
    id: String,
    content: String,
) -> Result<Vec<crate::skills::SkillDiagnostic>, String> {
    let managed = manageable_manifest(&app, Path::new(&id))?;
    let folder_name = managed
        .raw
        .parent()
        .and_then(|d| d.file_name())
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();
    Ok(crate::skills::lint_manifest(&content, &folder_name))
}

/// Relative paths of the skill's supporting files (level-3 references),
/// excluding SKILL.md.
#[tauri::command]
pub fn list_skill_resources(app: AppHandle, id: String) -> Result<Vec<String>, String> {
    let managed = manageable_manifest(&app, Path::new(&id))?;
    crate::skills::list_resources(&managed.canonical)
}

/// Reads one supporting file, read-only and contained in the skill folder.
#[tauri::command]
pub fn read_skill_resource(
    app: AppHandle,
    id: String,
    relative: String,
) -> Result<String, String> {
    let managed = manageable_manifest(&app, Path::new(&id))?;
    crate::skills::read_resource(&managed.canonical, &relative)
}
