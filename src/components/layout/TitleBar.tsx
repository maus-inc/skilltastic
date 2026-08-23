import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import { IN_TAURI } from "../../api/runtime";
import { HOME_TAB_ID, type TitleTab } from "../../types";
import {
  ChevronDownIcon,
  CloseIcon,
  FolderIcon,
  GridIcon,
  HomeIcon,
  MaximizeIcon,
  MinimizeIcon,
  MoreIcon,
  PlusIcon,
  RestoreIcon,
} from "../ui/icons";

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
}

export function TitleBar({
  tabs,
  activeTabId,
  onActivateTab,
  onCloseTab,
  onNewSkill,
  onAddProject,
  onShowAllProjects,
}: TitleBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const menuAction = (fn: () => void) => () => {
    setMenuOpen(false);
    fn();
  };

  return (
    <header className={`tb ${IS_MAC ? "tb-mac" : ""}`} data-tauri-drag-region>
      {/* native traffic lights live here on macOS */}
      {IS_MAC && <div className="tb-mac-inset" data-tauri-drag-region />}

      {/* home tab — house icon only, like Figma's recents tab */}
      <button
        className={`tb-home ${activeTabId === HOME_TAB_ID ? "active" : ""}`}
        onClick={() => onActivateTab(HOME_TAB_ID)}
        title="all skills"
      >
        <HomeIcon size={16} strokeWidth={1.5} />
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
            onAuxClick={(e) => {
              if (e.button === 1) onCloseTab(tab.id); // middle-click closes
            }}
            title={tab.kind === "project" ? tab.project.path : tab.label}
          >
            <span className="tb-tab-icon">
              {tab.kind === "project" ? <FolderIcon size={13} /> : <GridIcon size={13} />}
            </span>
            <span className="tb-tab-label">{tab.label}</span>
            <button
              className="tb-tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              title="close tab"
            >
              <CloseIcon size={12} strokeWidth={2} />
            </button>
          </motion.div>
        ))}
        </AnimatePresence>

        <button className="tb-plus" onClick={onNewSkill} title="new skill">
          <PlusIcon size={15} strokeWidth={1.6} />
        </button>
      </div>

      {/* draggable dead zone */}
      <div className="tb-spacer" data-tauri-drag-region />

      {/* overflow menu — "…" on macOS, "⌄" next to the controls elsewhere */}
      <div className="tb-menu-wrap" ref={menuRef}>
        <button
          className={`tb-menu-btn ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen((o) => !o)}
          title="menu"
        >
          {IS_MAC ? <MoreIcon size={15} /> : <ChevronDownIcon size={14} />}
        </button>
        <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="tb-menu"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.1 } }}
            transition={{ type: "spring", stiffness: 560, damping: 34, mass: 0.7 }}
            style={{ transformOrigin: "top right" }}
          >
            <button className="tb-menu-item" onClick={menuAction(onNewSkill)}>
              new skill…
            </button>
            <button className="tb-menu-item" onClick={menuAction(onAddProject)}>
              add project…
            </button>
            <button className="tb-menu-item" onClick={menuAction(onShowAllProjects)}>
              all projects
            </button>
            <div className="tb-menu-sep" />
            <button
              className="tb-menu-item"
              onClick={menuAction(() => openUrl(REPO_URL).catch(console.error))}
            >
              skilltastic on github
            </button>
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      {/* window controls — Windows/Linux only; macOS has traffic lights */}
      {!IS_MAC && (
        <div className="tb-controls">
          <button className="tb-ctl" onClick={winCtl("minimize")} title="minimize">
            <MinimizeIcon size={15} strokeWidth={1.4} />
          </button>
          <button className="tb-ctl" onClick={winCtl("toggleMaximize")} title={maximized ? "restore" : "maximize"}>
            {maximized ? <RestoreIcon size={13} strokeWidth={1.4} /> : <MaximizeIcon size={12} strokeWidth={1.4} />}
          </button>
          <button className="tb-ctl tb-ctl-close" onClick={winCtl("close")} title="close">
            <CloseIcon size={15} strokeWidth={1.4} />
          </button>
        </div>
      )}
    </header>
  );
}
