import { useEffect, useMemo, useRef, useState } from "react";
import { AddProjectModal } from "./components/modals/AddProjectModal";
import { CreateSkillModal } from "./components/modals/CreateSkillModal";
import { EditorModal } from "./components/modals/EditorModal";
import { ProjectsModal } from "./components/modals/ProjectsModal";
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
import { HOME_TAB_ID, projectTabId, toolTabId } from "./types";
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
  const [editing, setEditing] = useState<Skill | null>(null);
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
  const activeTabId =
    view.kind === "project"
      ? projectTabId(view.project.path)
      : activeToolId === ALL
        ? HOME_TAB_ID
        : toolTabId(activeToolId);

  useEffect(() => {
    skillListRef.current?.scrollTo(0, 0);
  }, [view, activeToolId]);

  function ensureTab(tab: TitleTab) {
    setTabs((prev) => (prev.some((t) => t.id === tab.id) ? prev : [...prev, tab]));
  }

  function selectAll() {
    setView({ kind: "global" });
    setActiveToolId(ALL);
  }

  function selectTool(toolId: string) {
    const entry = global.toolEntries.find((t) => t.id === toolId);
    ensureTab({ id: toolTabId(toolId), kind: "tool", toolId, label: entry?.label ?? toolId });
    setView({ kind: "global" });
    setActiveToolId(toolId);
  }

  function openProject(project: ProjectInfo) {
    ensureTab({ id: projectTabId(project.path), kind: "project", project, label: project.name });
    setView({ kind: "project", project });
    projects.touch(project); // records the open for latest-first ordering
  }

  /** Title-bar tab clicks route back through the normal view switches. */
  function activateTab(id: string) {
    if (id === HOME_TAB_ID) return selectAll();
    const tab = tabs.find((t) => t.id === id);
    if (!tab) return;
    if (tab.kind === "tool") {
      setView({ kind: "global" });
      setActiveToolId(tab.toolId);
    } else {
      setView({ kind: "project", project: tab.project });
      projects.touch(tab.project);
    }
  }

  /** Closing the active tab falls back to its left neighbour, then home. */
  function closeTab(id: string) {
    const index = tabs.findIndex((t) => t.id === id);
    if (index === -1) return;
    const remaining = tabs.filter((t) => t.id !== id);
    setTabs(remaining);
    if (id !== activeTabId) return;
    const neighbour = remaining[index - 1] ?? remaining[index] ?? null;
    if (!neighbour) return selectAll();
    if (neighbour.kind === "tool") {
      setView({ kind: "global" });
      setActiveToolId(neighbour.toolId);
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

  async function removeProjectSkill(skill: Skill) {
    await projectView.remove(skill);
    await projects.refresh(); // keep sidebar skill-count badges honest
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
        <Topbar
          title={title}
          subtitle={subtitle}
          folders={view.kind === "global" ? activeTool?.folders : undefined}
          query={query}
          onQueryChange={setQuery}
          onForgetProject={view.kind === "project" ? () => forgetProject(view.project) : undefined}
          onNewSkill={() => setCreatingSkill(true)}
        />

        <div className={`skill-list ${viewMode === "cards" ? "skill-list--cards" : ""}`} ref={skillListRef}>
          {view.kind === "global" ? (
            <SkillList
              skills={filteredGlobal}
              toolEntries={global.toolEntries}
              emptyHint="No skills found."
              onToggle={global.toggle}
              onOpen={setEditing}
            />
          ) : projectView.loading ? (
            <div className="empty-state">loading...</div>
          ) : (
            <SkillList
              skills={filteredProjectSkills}
              toolEntries={global.toolEntries}
              emptyHint="No skills found in this project."
              onToggle={projectView.toggle}
              onOpen={setEditing}
            />
          )}
        </div>
      </main>

      {editing && (
        <EditorModal
          skill={editing}
          toolEntries={global.toolEntries}
          onClose={() => setEditing(null)}
          onDelete={view.kind === "global" ? global.remove : removeProjectSkill}
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
            setEditing(skill); // the instructions are the user's to write
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
