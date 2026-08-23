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
    // operate on the canonical snapshot the validation produced
    let manifest = manageable_manifest(&app, Path::new(&id))?;
    let new_manifest = skills::toggle_enabled(&manifest, enabled).map_err(|e| e.to_string())?;

    find_skill_by_manifest(&app, &new_manifest).ok_or_else(|| "skill not found after toggle".into())
}

#[tauri::command]
pub fn delete_skill(app: AppHandle, id: String) -> Result<(), String> {
    let manifest = manageable_manifest(&app, Path::new(&id))?;
    skills::delete_skill_dir(&manifest).map_err(|e| e.to_string())?;
    // A project count is only a cache; clear it after a mutation rather than
    // scanning the project again in the background. Stored paths are
    // canonical since enrollment normalizes them, but tolerate older
    // records by also comparing canonical forms.
    if let Some(project) = projects::list(&app)
        .unwrap_or_default()
        .into_iter()
        .find(|p| {
            manifest.starts_with(&p.path)
                || fs::canonicalize(&p.path)
                    .map(|cp| manifest.starts_with(cp))
                    .unwrap_or(false)
        })
    {
        let _ = projects::clear_skill_count(&app, &project.path);
    }
    Ok(())
}

#[tauri::command]
pub fn read_skill_content(app: AppHandle, id: String) -> Result<String, String> {
    let manifest = manageable_manifest(&app, Path::new(&id))?;
    fs::read_to_string(manifest).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_skill_content(app: AppHandle, id: String, content: String) -> Result<(), String> {
    let manifest = manageable_manifest(&app, Path::new(&id))?;
    fs::write(manifest, content).map_err(|e| e.to_string())
}
