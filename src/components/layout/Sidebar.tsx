import { useEffect, useRef, useState } from "react";
import { motion, Reorder } from "motion/react";
import { getVersion } from "@tauri-apps/api/app";
import { IN_TAURI } from "../../api/runtime";
import { openUrl } from "@tauri-apps/plugin-opener";
import { applyManualOrder, orderToolsByPin, selectVisibleProjects } from "../../utils/sidebarLists";
import { useManualOrder } from "../../hooks/useManualOrder";
import { GridIcon, ListIcon, PinIcon } from "../ui/icons";
import { provider } from "../ui/providers";
import type { ProjectInfo, ToolEntry, View } from "../../types";

const ALL = "all" as const;
const REPO_URL = "https://github.com/maus-inc/skilltastic";
/** Rows shown for tools before the list collapses behind "more". */
const PREVIEW_COUNT = 6;
/** Most-used projects (30-day window) shown before the "more" dialog. */
const MOST_USED_COUNT = 3;
/** Minimum project rows in the sidebar for a fresh, usage-less setup. */
const MIN_PROJECT_ROWS = 3;

function link(url: string) {
  return () => openUrl(url).catch(console.error);
}

interface SidebarProps {
  toolEntries: ToolEntry[];
  viewMode: "list" | "cards";
  onViewModeChange: (mode: "list" | "cards") => void;
  totalSkillCount: number;
  countForEntry: (entry: ToolEntry) => number;
  pinnedTools: Set<string>;
  onTogglePinTool: (toolId: string) => void;
  projects: ProjectInfo[];
  /** tracked path → skill count, for row badges */
  skillCounts: Record<string, number>;
  onTogglePinProject: (project: ProjectInfo) => void;
  onShowAllProjects: () => void;
  view: View;
  activeToolId: string | typeof ALL;
  onSelectAll: () => void;
  onSelectTool: (toolId: string) => void;
  onOpenProject: (project: ProjectInfo) => void;
  onAddProject: () => void;
}

const BRAND_ASCII = `███████╗██╗  ██╗██╗██╗     ██╗     
██╔════╝██║ ██╔╝██║██║     ██║     
███████╗█████╔╝ ██║██║     ██║     
╚════██║██╔═██╗ ██║██║     ██║     
███████║██║  ██╗██║███████╗███████╗
╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝
████████╗ █████╗ ███████╗████████╗██╗ ██████╗
╚══██╔══╝██╔══██╗██╔════╝╚══██╔══╝██║██╔════╝
   ██║   ███████║███████╗   ██║   ██║██║     
   ██║   ██╔══██║╚════██║   ██║   ██║██║     
   ██║   ██║  ██║███████║   ██║   ██║╚██████╗
   ╚═╝   ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝ ╚═════╝`;

export function Sidebar({
  toolEntries,
  viewMode,
  onViewModeChange,
  totalSkillCount,
  countForEntry,
  pinnedTools,
  onTogglePinTool,
  projects,
  skillCounts,
  onTogglePinProject,
  onShowAllProjects,
  view,
  activeToolId,
  onSelectAll,
  onSelectTool,
  onOpenProject,
  onAddProject,
}: SidebarProps) {
  const [version, setVersion] = useState("");
  const [toolsExpanded, setToolsExpanded] = useState(false);

  useEffect(() => {
    if (!IN_TAURI) return setVersion("preview");
    getVersion().then(setVersion).catch(console.error);
  }, []);

  const [toolOrder, setToolOrder] = useManualOrder("skilltastic:tool-order");
  const [projectOrder, setProjectOrder] = useManualOrder("skilltastic:project-order");

  // manual order first, then pins float (stable) — drag order survives
  // inside each pin group
  const sortedTools = orderToolsByPin(
    applyManualOrder(toolEntries, toolOrder, (t) => t.id),
    pinnedTools,
  );
  const visibleTools = toolsExpanded ? sortedTools : sortedTools.slice(0, PREVIEW_COUNT);
  const hiddenTools = sortedTools.length - visibleTools.length;

  const { visible: selectedProjects, hiddenCount: hiddenProjects } = selectVisibleProjects(
    projects,
    MOST_USED_COUNT,
    MIN_PROJECT_ROWS,
  );
  const visibleProjects = applyManualOrder(selectedProjects, projectOrder, (p) => p.path);

  // swallow the click that follows a drag so dropping never navigates
  const dragging = useRef(false);
  const dragGuard = {
    onDragStart: () => (dragging.current = true),
    onDragEnd: () => setTimeout(() => (dragging.current = false), 0),
  };
  const guardedClick = (fn: () => void) => () => {
    if (!dragging.current) fn();
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <pre className="brand-ascii" aria-label="Skilltastic">
          {BRAND_ASCII}
        </pre>
        <div className="brand-prompt">
          <span className="prompt-char">$</span> skilltastic <span className="prompt-dim">--all</span>
        </div>
      </div>

      <div
        className={`nav-item nav-item--stacked ${view.kind === "global" && activeToolId === ALL ? "active" : ""}`}
        onClick={onSelectAll}
      >
        <div className="nav-item-row">
          <span>all skills</span>
          <span className="count">{totalSkillCount}</span>
        </div>
        <div className="view-seg" onClick={(e) => e.stopPropagation()} role="radiogroup" aria-label="view mode">
          {(
            [
              { id: "list" as const, icon: <ListIcon size={12} />, label: "list view" },
              { id: "cards" as const, icon: <GridIcon size={12} />, label: "card view" },
            ]
          ).map((seg) => (
            <button
              key={seg.id}
              role="radio"
              aria-checked={viewMode === seg.id}
              className={`view-seg-btn ${viewMode === seg.id ? "active" : ""}`}
              onClick={() => onViewModeChange(seg.id)}
              title={seg.label}
            >
              {viewMode === seg.id && (
                <motion.span
                  className="view-seg-thumb"
                  layoutId="view-seg-thumb"
                  transition={{ type: "spring", stiffness: 620, damping: 38, mass: 0.7 }}
                />
              )}
              <span className="view-seg-icon">{seg.icon}</span>
            </button>
          ))}
        </div>
      </div>

      <Reorder.Group
        as="div"
        axis="y"
        values={visibleTools.map((t) => t.id)}
        onReorder={(ids: string[]) =>
          setToolOrder([...ids, ...sortedTools.map((t) => t.id).filter((id) => !ids.includes(id))])
        }
      >
      {visibleTools.map((entry) => {
        const anyDirExists = entry.folders.some((f) => f.dirExists);
        return (
          <Reorder.Item
            as="div"
            value={entry.id}
            key={entry.id}
            layout
            {...dragGuard}
            className={`nav-item ${view.kind === "global" && activeToolId === entry.id ? "active" : ""}`}
            onClick={guardedClick(() => onSelectTool(entry.id))}
            title={entry.folders.map((f) => f.dir).join("\n")}
          >
            <span className={`nav-label ${anyDirExists ? "" : "dir-missing"}`}>
              <img
                className="nav-mark"
                src={provider((entry.folders.find((f) => f.role === "own") ?? entry.folders[0]).tool).icon}
                alt=""
              />
              {entry.label}
            </span>
            <span className="nav-right">
              <button
                className={`pin-btn ${pinnedTools.has(entry.id) ? "pinned" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePinTool(entry.id);
                }}
                data-tip={pinnedTools.has(entry.id) ? "unpin" : "pin"}
                data-tip-side="top"
                aria-label={`${pinnedTools.has(entry.id) ? "unpin" : "pin"} ${entry.label}`}
              >
                <motion.span
                  key={String(pinnedTools.has(entry.id))}
                  initial={{ transform: "scale(0.5)" }}
                  animate={{ transform: "scale(1)" }}
                  transition={{ type: "spring", stiffness: 520, damping: 20, mass: 0.6 }}
                  style={{ display: "flex" }}
                >
                  <PinIcon filled={pinnedTools.has(entry.id)} />
                </motion.span>
              </button>
              <span className="count">{countForEntry(entry)}</span>
            </span>
          </Reorder.Item>
        );
      })}
      </Reorder.Group>

      {hiddenTools > 0 && (
        <div className="nav-item expand" onClick={() => setToolsExpanded(true)}>
          <span>+ {hiddenTools} more</span>
        </div>
      )}
      {toolsExpanded && sortedTools.length > PREVIEW_COUNT && (
        <div className="nav-item expand" onClick={() => setToolsExpanded(false)}>
          <span>show less</span>
        </div>
      )}

      <div className="nav-section-label">projects</div>

      <Reorder.Group
        as="div"
        axis="y"
        values={visibleProjects.map((p) => p.path)}
        onReorder={setProjectOrder}
      >
      {visibleProjects.map((p) => (
        <Reorder.Item
          as="div"
          value={p.path}
          key={p.path}
          layout
          {...dragGuard}
          className={`nav-item ${view.kind === "project" && view.project.path === p.path ? "active" : ""}`}
          onClick={guardedClick(() => onOpenProject(p))}
          title={p.path}
        >
          <span>{p.name}</span>
          <span className="nav-right">
            {skillCounts[p.path] !== undefined && (
              <span className="count">{skillCounts[p.path]}</span>
            )}
            <button
              className={`pin-btn ${p.pinned ? "pinned" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onTogglePinProject(p);
              }}
              data-tip={p.pinned ? "unpin" : "pin"}
              data-tip-side="top"
              aria-label={`${p.pinned ? "unpin" : "pin"} ${p.name}`}
            >
              <motion.span
                key={String(p.pinned)}
                initial={{ transform: "scale(0.5)" }}
                animate={{ transform: "scale(1)" }}
                transition={{ type: "spring", stiffness: 520, damping: 20, mass: 0.6 }}
                style={{ display: "flex" }}
              >
                <PinIcon filled={p.pinned} />
              </motion.span>
            </button>
          </span>
        </Reorder.Item>
      ))}
      </Reorder.Group>

      {hiddenProjects > 0 && (
        <div className="nav-item expand" onClick={onShowAllProjects}>
          <span>+ {hiddenProjects} more</span>
        </div>
      )}

      <div className="nav-item add-project" onClick={onAddProject}>
        <span>+ add project</span>
      </div>

      <div className="sidebar-footer">
        <div className="footer-row">
          <img src="/skilltastic.png" alt="Skilltastic" />
          <span className="footer-name">
            Skill <span className="accent">Manager</span>
          </span>
          {version && (
            <a
              className="footer-version"
              onClick={link(`${REPO_URL}/releases/latest`)}
              title="release notes"
            >
              v{version}
            </a>
          )}
        </div>
        <div className="footer-links">
          <a onClick={link(REPO_URL)}>github</a>
          <span className="sep">·</span>
          <a onClick={link(`${REPO_URL}/issues/new?template=bug_report.yml`)}>report a bug</a>
          <span className="sep">·</span>
          <a onClick={link(`${REPO_URL}/blob/main/LICENSE`)}>mit</a>
        </div>
      </div>
    </aside>
  );
}
