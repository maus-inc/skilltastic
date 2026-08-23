import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import { IN_TAURI } from "../../api/runtime";
import { HOME_TAB_ID, type TitleTab } from "../../types";

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
        <HomeGlyph />
      </button>

      {/* file tabs */}
      <div className="tb-tabs">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tb-tab ${tab.id === activeTabId ? "active" : ""}`}
            onClick={() => onActivateTab(tab.id)}
            onAuxClick={(e) => {
              if (e.button === 1) onCloseTab(tab.id); // middle-click closes
            }}
            title={tab.kind === "project" ? tab.project.path : tab.label}
          >
            <span className="tb-tab-icon">
              {tab.kind === "project" ? <FolderGlyph /> : <ToolGlyph />}
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
              <CloseGlyph size={9} />
            </button>
          </div>
        ))}

        <button className="tb-plus" onClick={onNewSkill} title="new skill">
          <PlusGlyph />
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
          {IS_MAC ? <DotsGlyph /> : <ChevronGlyph />}
        </button>
        {menuOpen && (
          <div className="tb-menu">
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
          </div>
        )}
      </div>

      {/* window controls — Windows/Linux only; macOS has traffic lights */}
      {!IS_MAC && (
        <div className="tb-controls">
          <button className="tb-ctl" onClick={winCtl("minimize")} title="minimize">
            <MinimizeGlyph />
          </button>
          <button className="tb-ctl" onClick={winCtl("toggleMaximize")} title={maximized ? "restore" : "maximize"}>
            {maximized ? <RestoreGlyph /> : <MaximizeGlyph />}
          </button>
          <button className="tb-ctl tb-ctl-close" onClick={winCtl("close")} title="close">
            <CloseGlyph size={10} />
          </button>
        </div>
      )}
    </header>
  );
}

/* ---------- glyphs (1px strokes, drawn to match Figma/Windows metrics) ---------- */

function HomeGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M2.5 6.5 7.5 2.5l5 4v5.5a.5.5 0 0 1-.5.5H9.5V9h-4v3.5H3a.5.5 0 0 1-.5-.5V6.5z" strokeLinejoin="round" />
    </svg>
  );
}

function ToolGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.1">
      <rect x="1" y="1" width="4" height="4" rx="0.8" />
      <rect x="7" y="1" width="4" height="4" rx="0.8" />
      <rect x="1" y="7" width="4" height="4" rx="0.8" />
      <rect x="7" y="7" width="4" height="4" rx="0.8" />
    </svg>
  );
}

function FolderGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.1">
      <path d="M1 3a1 1 0 0 1 1-1h2.6l1.2 1.4H10a1 1 0 0 1 1 1V9a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3z" strokeLinejoin="round" />
    </svg>
  );
}

function PlusGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M7 2.5v9M2.5 7h9" strokeLinecap="round" />
    </svg>
  );
}

function ChevronGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="m2.5 4.5 3.5 3.5 3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DotsGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <circle cx="3" cy="7" r="1.1" />
      <circle cx="7" cy="7" r="1.1" />
      <circle cx="11" cy="7" r="1.1" />
    </svg>
  );
}

function MinimizeGlyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1">
      <path d="M0.5 5.5h9" />
    </svg>
  );
}

function MaximizeGlyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
      <rect x="0.5" y="0.5" width="9" height="9" />
    </svg>
  );
}

function RestoreGlyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
      <rect x="0.5" y="2.5" width="7" height="7" />
      <path d="M2.5 2.5v-2h7v7h-2" />
    </svg>
  );
}

function CloseGlyph({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.1">
      <path d="m0.8 0.8 8.4 8.4M9.2 0.8 0.8 9.2" strokeLinecap="round" />
    </svg>
  );
}
