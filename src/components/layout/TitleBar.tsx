import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import { IN_TAURI } from "../../api/runtime";
import { HOME_TAB_ID, projectTabId, toolTabId, type TitleTab } from "../../types";
import { CommandMenu, type CommandEntry } from "../ui/CommandMenu";
import {
  ArrowUpRightIcon,
  CloseIcon,
  FolderIcon,
  FolderPlusIcon,
  GithubIcon,
  HomeIcon,
  ListIcon,
  MinimizeIcon,
  MoreIcon,
  PagePlusIcon,
  PlusIcon,
} from "../ui/icons";
import { MorphChevron, MorphMaxRestore, ToolTabMark } from "../ui/morphs";

const REPO_URL = "https://github.com/maus-inc/skilltastic";

/** macOS gets native traffic lights (overlay title bar); everything else
 *  gets the custom minimize/maximize/close cluster, exactly like Figma. */
const IS_MAC = navigator.userAgent.includes("Mac");

interface TitleBarProps {
  tabs: TitleTab[];
  activeTabId: string;
  onActivateTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewSkill: () => void;
  onAddProject: () => void;
  onShowAllProjects: () => void;
  /** Everything the dropdown can jump to. `mark` is the provider icon url. */
  tools: { id: string; label: string; mark: string }[];
  projects: { path: string; name: string }[];
  onOpenTool: (toolId: string) => void;
  onOpenProject: (path: string) => void;
}

export function TitleBar({
  tabs,
  activeTabId,
  onActivateTab,
  onCloseTab,
  onNewSkill,
  onAddProject,
  onShowAllProjects,
  tools,
  projects,
  onOpenTool,
  onOpenProject,
}: TitleBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [maximized, setMaximized] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const markByToolId = new Map(tools.map((t) => [t.id, t.mark]));

  // Track native maximize state so the restore glyph stays honest.
  useEffect(() => {
    if (!IN_TAURI) return;
    const win = getCurrentWindow();
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    win.isMaximized().then((m) => !cancelled && setMaximized(m)).catch(console.error);
    win
      .onResized(() => {
        win.isMaximized().then((m) => !cancelled && setMaximized(m)).catch(console.error);
      })
      .then((u) => (unlisten = u))
      .catch(console.error);
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  // Close the overflow menu on any outside press.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const winCtl = (action: "minimize" | "toggleMaximize" | "close") => () => {
    if (!IN_TAURI) return;
    getCurrentWindow()[action]().catch(console.error);
  };

  // views first — the menu is mostly a switcher between the modes that
  // appear as tabs; the one-shot actions live at the bottom
  const menuEntries: CommandEntry[] = [
    ...tools.map((tool) => ({
      id: `tool:${tool.id}`,
      label: tool.label,
      group: "tools",
      hint: "view",
      icon: <img className="cmd-item-mark" src={tool.mark} alt="" />,
      checked: activeTabId === toolTabId(tool.id),
      action: () => onOpenTool(tool.id),
    })),
    ...projects.map((project) => ({
      id: `project:${project.path}`,
      label: project.name,
      group: "projects",
      hint: "view",
      icon: <FolderIcon size={12} />,
      checked: activeTabId === projectTabId(project.path),
      action: () => onOpenProject(project.path),
    })),
    {
      id: "act:new-skill",
      label: "new skill…",
      group: "actions",
      icon: <PagePlusIcon size={12} />,
      action: onNewSkill,
    },
    {
      id: "act:add-project",
      label: "add project…",
      group: "actions",
      icon: <FolderPlusIcon size={12} />,
      action: onAddProject,
    },
    {
      id: "act:all-projects",
      label: "all projects",
      group: "actions",
      icon: <ListIcon size={12} />,
      action: onShowAllProjects,
    },
    {
      id: "act:github",
      label: "skilltastic on github",
      group: "actions",
      icon: <GithubIcon size={12} />,
      trailing: (
        <span className="cmd-arrow">
          <ArrowUpRightIcon size={12} />
        </span>
      ),
      action: () => openUrl(REPO_URL).catch(console.error),
    },
  ];

  return (
    <header className={`tb ${IS_MAC ? "tb-mac" : ""}`} data-tauri-drag-region>
      {/* native traffic lights live here on macOS */}
      {IS_MAC && <div className="tb-mac-inset" data-tauri-drag-region />}

      {/* home tab — house icon only, like Figma's recents tab */}
      <button type="button"
        className={`tb-home ${activeTabId === HOME_TAB_ID ? "active" : ""}`}
        onClick={() => onActivateTab(HOME_TAB_ID)}
        data-tip="all skills"
        aria-label="all skills"
      >
        <HomeIcon size={16} />
      </button>

      {/* file tabs */}
      <div className="tb-tabs">
        <AnimatePresence initial={false}>
        {tabs.map((tab) => (
          <motion.div
            key={tab.id}
            layout
            initial={{ width: 0, opacity: 0, paddingLeft: 0, paddingRight: 0 }}
            animate={{ width: "auto", opacity: 1, paddingLeft: 11, paddingRight: 7 }}
            exit={{ width: 0, opacity: 0, paddingLeft: 0, paddingRight: 0 }}
            transition={{ type: "spring", stiffness: 520, damping: 38, mass: 0.7 }}
            className={`tb-tab ${tab.id === activeTabId ? "active" : ""}`}
            onClick={() => onActivateTab(tab.id)}
            onMouseEnter={() => setHoveredTab(tab.id)}
            onMouseLeave={() => setHoveredTab((h) => (h === tab.id ? null : h))}
            onAuxClick={(e) => {
              if (e.button === 1) onCloseTab(tab.id); // middle-click closes
            }}
            title={tab.kind === "project" ? tab.project.path : tab.label}
          >
            <span className="tb-tab-icon">
              {tab.kind === "project" ? (
                <FolderIcon size={12} />
              ) : (
                <ToolTabMark
                  hover={hoveredTab === tab.id}
                  mark={markByToolId.get(tab.toolId) ?? ""}
                  label={tab.label}
                />
              )}
            </span>
            <span className="tb-tab-label">{tab.label}</span>
            <button type="button"
              className="tb-tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              title="close tab"
            >
              <CloseIcon size={12} />
            </button>
          </motion.div>
        ))}
        </AnimatePresence>

        <button type="button" className="tb-plus" onClick={onNewSkill} data-tip="new skill" aria-label="new skill">
          <PlusIcon size={16} />
        </button>
      </div>

      {/* draggable dead zone */}
      <div className="tb-spacer" data-tauri-drag-region />

      {/* overflow menu — "…" on macOS, "⌄" next to the controls elsewhere */}
      <div className="tb-menu-wrap" ref={menuRef}>
        <button type="button"
          className={`tb-menu-btn ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen((o) => !o)}
          data-tip="menu"
          aria-label="menu"
        >
          <span className="tb-menu-icon">
            {IS_MAC ? <MoreIcon size={16} /> : <MorphChevron open={menuOpen} />}
          </span>
        </button>
        <AnimatePresence>
        {menuOpen && (
          <CommandMenu
            entries={menuEntries}
            placeholder="search…"
            emptyText="nothing found."
            onClose={() => setMenuOpen(false)}
          />
        )}
        </AnimatePresence>
      </div>

      {/* window controls — Windows/Linux only; macOS has traffic lights */}
      {!IS_MAC && (
        <div className="tb-controls">
          <button type="button" className="tb-ctl" onClick={winCtl("minimize")} data-tip="minimize" aria-label="minimize">
            <MinimizeIcon size={16} />
          </button>
          <button type="button" className="tb-ctl" onClick={winCtl("toggleMaximize")} data-tip={maximized ? "restore" : "maximize"} aria-label={maximized ? "restore" : "maximize"}>
            <MorphMaxRestore maximized={maximized} />
          </button>
          <button type="button" className="tb-ctl tb-ctl-close" onClick={winCtl("close")} data-tip="close" aria-label="close">
            <CloseIcon size={16} />
          </button>
        </div>
      )}
    </header>
  );
}
