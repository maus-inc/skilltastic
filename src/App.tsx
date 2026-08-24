import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddProjectModal } from "./components/modals/AddProjectModal";
import { CreateSkillModal } from "./components/modals/CreateSkillModal";
import { UnsavedCloseModal } from "./components/modals/UnsavedCloseModal";
import { ProjectsModal } from "./components/modals/ProjectsModal";
import { SkillEditorTab, type EditorTabApi } from "./components/editor/SkillEditorTab";
import { IN_TAURI } from "./api/runtime";
import { Sidebar } from "./components/layout/Sidebar";
import { SkillList } from "./components/skills/SkillList";
import { TitleBar } from "./components/layout/TitleBar";
import { Topbar } from "./components/layout/Topbar";
import { useGlobalSkills } from "./hooks/useGlobalSkills";
import { usePinnedTools } from "./hooks/usePinnedTools";
import { useProjects } from "./hooks/useProjects";
import { useProjectSkills } from "./hooks/useProjectSkills";
import { filterSkills } from "./utils/filterSkills";
import { provider } from "./components/ui/providers";
import { HOME_TAB_ID, editorTabId, projectTabId, toolTabId } from "./types";
import type { AgentTool, ProjectInfo, Skill, TitleTab, ToolEntry, View } from "./types";
import "./App.css";

const ALL = "all" as const;

function App() {
  const [view, setView] = useState<View>({ kind: "global" });
  const [activeToolId, setActiveToolId] = useState<string | typeof ALL>(ALL);
  const [tabs, setTabs] = useState<TitleTab[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "cards">(() => {
    try {
      return localStorage.getItem("skilltastic:view-mode") === "cards" ? "cards" : "list";
    } catch {
      return "list";
    }
  });
  const [query, setQuery] = useState("");
  const [editorSkill, setEditorSkill] = useState<Skill | null>(null);
  const [dirtyTabs, setDirtyTabs] = useState<Record<string, boolean>>({});
  const [pendingClose, setPendingClose] = useState<{
    tab: TitleTab;
    /** deferred navigation, when the guard was raised by leaving a dirty
     *  editor (rather than closing its tab) */
    after?: () => void;
  } | null>(null);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const editorApis = useRef(new Map<string, EditorTabApi>());
  const [addingProject, setAddingProject] = useState(false);
  const [creatingSkill, setCreatingSkill] = useState(false);
  const [showingAllProjects, setShowingAllProjects] = useState(false);
  const skillListRef = useRef<HTMLDivElement>(null);

  const global = useGlobalSkills();
  const projects = useProjects();
  const pinnedTools = usePinnedTools();
  const activeProject = view.kind === "project" ? view.project : null;
  const projectView = useProjectSkills(activeProject);

  function changeViewMode(mode: "list" | "cards") {
    setViewMode(mode);
    try {
      localStorage.setItem("skilltastic:view-mode", mode);
    } catch {
      /* preference just won't persist */
    }
  }

  const activeTool =
    activeToolId === ALL
      ? null
      : global.toolEntries.find((t) => t.id === activeToolId) ?? null;

  /** Which title-bar tab mirrors the current view. */
  const activeTabId = editorSkill
    ? editorTabId(editorSkill.id)
    : view.kind === "project"
      ? projectTabId(view.project.path)
      : activeToolId === ALL
        ? HOME_TAB_ID
        : toolTabId(activeToolId);

  const registerApi = useCallback((id: string, api: EditorTabApi | null) => {
    if (api) editorApis.current.set(id, api);
    else editorApis.current.delete(id);
    // preview-only seam so the click-through suite can drive the editor
    if (!IN_TAURI) {
      (window as unknown as { __skilltasticEditorApis?: Map<string, EditorTabApi> }).__skilltasticEditorApis =
        editorApis.current;
    }
  }, []);

  const handleDirtyChange = useCallback((id: string, dirty: boolean) => {
    setDirtyTabs((prev) => (prev[id] === dirty ? prev : { ...prev, [id]: dirty }));
  }, []);

  useEffect(() => {
    skillListRef.current?.scrollTo(0, 0);
  }, [view, activeToolId]);

  function ensureTab(tab: TitleTab) {
    setTabs((prev) => (prev.some((t) => t.id === tab.id) ? prev : [...prev, tab]));
  }

  /** Every way of leaving an editor routes through here: when the open
   *  editor has unsaved edits, the action is deferred behind the
   *  unsaved-changes guard instead of silently dropping the doc. */
  function leaveEditor(action: () => void) {
    if (!editorSkill) return action();
    const id = editorTabId(editorSkill.id);
    if (dirtyTabs[id]) {
      setPendingClose({
        tab: { id, kind: "editor", skill: editorSkill, label: editorSkill.name },
        after: action,
      });
      return;
    }
    action();
  }

  function selectAll() {
    leaveEditor(() => {
      setEditorSkill(null);
      setView({ kind: "global" });
      setActiveToolId(ALL);
    });
  }

  function selectTool(toolId: string) {
    leaveEditor(() => {
      const entry = global.toolEntries.find((t) => t.id === toolId);
      ensureTab({ id: toolTabId(toolId), kind: "tool", toolId, label: entry?.label ?? toolId });
      setEditorSkill(null);
      setView({ kind: "global" });
      setActiveToolId(toolId);
    });
  }

  function openProject(project: ProjectInfo) {
    leaveEditor(() => {
      ensureTab({ id: projectTabId(project.path), kind: "project", project, label: project.name });
      setEditorSkill(null);
      setView({ kind: "project", project });
      projects.touch(project); // records the open for latest-first ordering
    });
  }

  /** Skills open as editor tabs in the title bar, not modals. */
  function openEditor(skill: Skill) {
    if (editorSkill?.id === skill.id) return; // already open
    leaveEditor(() => {
      ensureTab({ id: editorTabId(skill.id), kind: "editor", skill, label: skill.name });
      setEditorSkill(skill);
    });
  }

  async function deleteFromEditor(skill: Skill) {
    await global.remove(skill);
    const id = editorTabId(skill.id);
    setTabs((prev) => prev.filter((t) => t.id !== id));
    setDirtyTabs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setEditorSkill((cur) => (cur?.id === skill.id ? null : cur));
    if (skill.scope === "project") {
      await projects.refresh(); // keep the sidebar skill-count badge honest
      projectView.reload(); // drop the deleted skill from the open project view
    }
  }

  /** After a save, re-sync the dashboard with the freshly-written
   *  name/description and refresh the open editor + its tab label. */
  function handleEditorSaved(saved: Skill) {
    setEditorSkill((cur) => (cur?.id === saved.id ? { ...cur, name: saved.name, description: saved.description } : cur));
    setTabs((prev) =>
      prev.map((t) =>
        t.kind === "editor" && t.skill.id === saved.id
          ? { ...t, skill: { ...t.skill, name: saved.name, description: saved.description }, label: saved.name }
          : t,
      ),
    );
    void global.refresh();
    if (saved.scope === "project") {
      void projects.refresh();
      projectView.reload();
    }
  }

  /** Title-bar tab clicks route back through the normal view switches. */
  function activateTab(id: string) {
    if (id === HOME_TAB_ID) return selectAll();
    const tab = tabs.find((t) => t.id === id);
    if (!tab) return;
    if (tab.kind === "tool") {
      leaveEditor(() => {
        setEditorSkill(null);
        setView({ kind: "global" });
        setActiveToolId(tab.toolId);
      });
    } else if (tab.kind === "editor") {
      if (editorSkill?.id === tab.skill.id) return; // already active
      leaveEditor(() => setEditorSkill(tab.skill));
    } else {
      leaveEditor(() => {
        setEditorSkill(null);
        setView({ kind: "project", project: tab.project });
        projects.touch(tab.project);
      });
    }
  }

  /** Closing the active tab falls back to its left neighbour, then home. */
  function closeTab(id: string) {
    const index = tabs.findIndex((t) => t.id === id);
    if (index === -1) return;
    const tab = tabs[index];
    // dirty editor tabs go through the unsaved-changes guard first
    if (tab.kind === "editor" && dirtyTabs[id]) {
      setPendingClose({ tab });
      return;
    }
    doCloseTab(id);
  }

  /** Discard the pending editor's edits, then run the deferred action
   *  (navigation) or close the tab. */
  function resolveDiscard() {
    const pending = pendingClose;
    if (!pending) return;
    setPendingClose(null);
    setPendingError(null);
    setDirtyTabs((prev) => {
      const next = { ...prev };
      delete next[pending.tab.id];
      return next;
    });
    if (pending.after) pending.after();
    else doCloseTab(pending.tab.id);
  }

  /** Save the pending editor, then run the deferred action or close the
   *  tab. A failed write keeps the guard open with the error surfaced. */
  async function resolveSave() {
    const pending = pendingClose;
    if (!pending) return;
    const id = pending.tab.id;
    try {
      await editorApis.current.get(id)?.save();
    } catch (e) {
      setPendingError(String(e));
      return;
    }
    setPendingClose(null);
    setPendingError(null);
    if (pending.after) pending.after();
    else doCloseTab(id);
  }

  function doCloseTab(id: string) {
    const index = tabs.findIndex((t) => t.id === id);
    if (index === -1) return;
    const tab = tabs[index];
    const remaining = tabs.filter((t) => t.id !== id);
    setTabs(remaining);
    setDirtyTabs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (tab.kind === "editor") {
      setEditorSkill((cur) => (cur?.id === tab.skill.id ? null : cur));
    }
    if (id !== activeTabId) return;
    const neighbour = remaining[index - 1] ?? remaining[index] ?? null;
    if (!neighbour) return selectAll();
    if (neighbour.kind === "tool") {
      setView({ kind: "global" });
      setActiveToolId(neighbour.toolId);
    } else if (neighbour.kind === "editor") {
      setEditorSkill(neighbour.skill);
    } else {
      setView({ kind: "project", project: neighbour.project });
    }
  }

  async function addDetectedProject(path: string) {
    const project = await projects.add(path);
    if (project) openProject(project);
    return project;
  }

  async function browseAndAddProject() {
    const project = await projects.pickAndAdd();
    if (project) openProject(project);
    return project;
  }

  async function forgetProject(project: ProjectInfo) {
    await projects.forget(project);
    setTabs((prev) => prev.filter((t) => t.id !== projectTabId(project.path)));
    if (activeProject?.path === project.path) setView({ kind: "global" });
  }


  // Stable identity: AddProjectModal's load effect depends on this list,
  // so it must not be a fresh array on every render.
  const trackedPaths = useMemo(() => projects.projects.map((p) => p.path), [projects.projects]);

  // A tool's view is the union of every skills folder it reads — a skill
  // in the shared ~/.agents folder correctly shows under Codex, Goose,
  // Amp, and every tool that scans it.
  const folderFilter = useMemo(
    () => (activeTool ? new Set(activeTool.folders.map((f) => f.tool)) : undefined),
    [activeTool],
  );

  const filteredGlobal = useMemo(
    () => filterSkills(global.skills, query, folderFilter),
    [global.skills, query, folderFilter],
  );

  const filteredProjectSkills = useMemo(
    () => filterSkills(projectView.skills, query),
    [projectView.skills, query],
  );

  const countForEntry = (entry: ToolEntry) =>
    global.skills.filter((s) => entry.folders.some((f) => f.tool === s.tool)).length;

  const title =
    view.kind === "global" ? (activeTool ? activeTool.label : "all skills") : view.project.name;

  const subtitle =
    view.kind === "global" ? `${filteredGlobal.length} shown` : view.project.path;

  // an empty list reads identically in both presentations — the card grid
  // only rearranges actual cards, never the empty state
  const currentSkills = view.kind === "global" ? filteredGlobal : filteredProjectSkills;

  return (
    <div className="shell">
      <TitleBar
        tabs={tabs}
        activeTabId={activeTabId}
        onActivateTab={activateTab}
        onCloseTab={closeTab}
        onNewSkill={() => setCreatingSkill(true)}
        onAddProject={() => setAddingProject(true)}
        onShowAllProjects={() => setShowingAllProjects(true)}
        tools={global.toolEntries.map((t) => ({
          id: t.id,
          label: t.label,
          mark: provider((t.folders.find((f) => f.role === "own") ?? t.folders[0]).tool).icon,
        }))}
        projects={projects.projects.map((p) => ({ path: p.path, name: p.name }))}
        onOpenTool={selectTool}
        onOpenProject={(path) => {
          const project = projects.projects.find((p) => p.path === path);
          if (project) openProject(project);
        }}
        editorActions={
          editorSkill
            ? {
                save: () => void editorApis.current.get(editorTabId(editorSkill.id))?.save(),
                togglePreview: () =>
                  editorApis.current.get(editorTabId(editorSkill.id))?.togglePreview(),
              }
            : null
        }
        dirtyTabs={dirtyTabs}
      />
      <div className="app">
      <Sidebar
        toolEntries={global.toolEntries}
        totalSkillCount={global.skills.length}
        countForEntry={countForEntry}
        pinnedTools={pinnedTools.pinned}
        onTogglePinTool={pinnedTools.toggle}
        projects={projects.projects}
        skillCounts={projects.skillCounts}
        onTogglePinProject={projects.togglePin}
        onShowAllProjects={() => setShowingAllProjects(true)}
        view={view}
        activeToolId={activeToolId}
        viewMode={viewMode}
        onViewModeChange={changeViewMode}
        onSelectAll={selectAll}
        onSelectTool={selectTool}
        onOpenProject={openProject}
        onAddProject={() => setAddingProject(true)}
      />

      <main className="main">
        {editorSkill ? (
          <SkillEditorTab
            key={editorSkill.id}
            tabId={editorTabId(editorSkill.id)}
            skill={editorSkill}
            toolEntries={global.toolEntries}
            onDirtyChange={handleDirtyChange}
            registerApi={registerApi}
            onDelete={deleteFromEditor}
            onSaved={handleEditorSaved}
          />
        ) : (
          <>
            <Topbar
              title={title}
              subtitle={subtitle}
              folders={view.kind === "global" ? activeTool?.folders : undefined}
              query={query}
              onQueryChange={setQuery}
              onForgetProject={view.kind === "project" ? () => forgetProject(view.project) : undefined}
              onNewSkill={() => setCreatingSkill(true)}
            />

            <div className={`skill-list ${viewMode === "cards" && currentSkills.length > 0 ? "skill-list--cards" : ""}`} ref={skillListRef}>
              {view.kind === "global" ? (
                <SkillList
                  skills={filteredGlobal}
                  toolEntries={global.toolEntries}
                  emptyHint="No skills found."
                  onToggle={global.toggle}
                  onOpen={openEditor}
                />
              ) : projectView.loading ? (
                <div className="empty-state">loading...</div>
              ) : (
                <SkillList
                  skills={filteredProjectSkills}
                  toolEntries={global.toolEntries}
                  emptyHint="No skills found in this project."
                  onToggle={projectView.toggle}
                  onOpen={openEditor}
                />
              )}
            </div>
          </>
        )}
      </main>

      {pendingClose && pendingClose.tab.kind === "editor" && (
        <UnsavedCloseModal
          skillName={pendingClose.tab.skill.name}
          saveLabel={pendingClose.after ? "save & leave" : "save & close"}
          error={pendingError}
          onCancel={() => {
            setPendingClose(null);
            setPendingError(null);
          }}
          onDiscard={resolveDiscard}
          onSaveAndClose={resolveSave}
        />
      )}

      {creatingSkill && (
        <CreateSkillModal
          toolEntries={global.toolEntries}
          projects={projects.projects}
          activeProject={activeProject}
          defaultTool={
            activeTool
              ? (activeTool.folders.find((f) => f.role === "own")?.tool ??
                activeTool.folders[0]?.tool) as AgentTool | undefined
              : undefined
          }
          onClose={() => setCreatingSkill(false)}
          onCreated={async (skill) => {
            setCreatingSkill(false);
            await global.refresh();
            if (skill.scope === "project") {
              await projects.refresh(); // keep sidebar skill-count badges honest
              projectView.reload();
            }
            openEditor(skill); // the instructions are the user's to write
          }}
        />
      )}

      {addingProject && (
        <AddProjectModal
          trackedPaths={trackedPaths}
          onClose={() => setAddingProject(false)}
          onAdd={addDetectedProject}
          onBrowse={browseAndAddProject}
        />
      )}

      {showingAllProjects && (
        <ProjectsModal
          projects={projects.projects}
          skillCounts={projects.skillCounts}
          activePath={activeProject?.path}
          onClose={() => setShowingAllProjects(false)}
          onOpen={openProject}
        />
      )}
      </div>
    </div>
  );
}

export default App;
