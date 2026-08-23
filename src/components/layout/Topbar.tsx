import { useEffect, useRef } from "react";
import type { ToolFolderInfo } from "../../types";
import { Button } from "../ui/Button";
import { PlusIcon } from "../ui/icons";

interface TopbarProps {
  title: string;
  subtitle: string;
  /** Folders the selected tool reads — shown as the page header. */
  folders?: ToolFolderInfo[];
  query: string;
  onQueryChange: (query: string) => void;
  onForgetProject?: () => void;
  /** Opens the new-skill flow. */
  onNewSkill?: () => void;
}

export function Topbar({ title, subtitle, folders, query, onQueryChange, onForgetProject, onNewSkill }: TopbarProps) {
  const searchRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K focuses search whenever nothing else has claimed it;
  // Escape hands focus back. Keyboard-initiated, so no animation (the
  // keycap chip just fades since focus state changed).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="topbar">
      <div className="topbar-title">
        <h1>{title}</h1>
        <span className="subtitle">{subtitle}</span>
        {folders && folders.length > 0 && (
          <div className="folder-chips">
            {folders.map((f) => (
              <span
                key={f.tool}
                className={`folder-chip ${f.role === "compat" ? "compat" : ""} ${f.dirExists ? "" : "missing"}`}
                title={f.role === "compat" ? `${f.dir} — compatibility path` : f.dir}
              >
                {f.dir}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="topbar-actions">
        {onNewSkill && (
          <Button
            variant="default"
            size="sm"
            className="btn-morph"
            onClick={onNewSkill}
            title="create a new skill from a minimal template"
            aria-label="new skill"
          >
            <span className="btn-morph-label">new skill</span>
            <span className="btn-morph-plus">
              <PlusIcon size={14} strokeWidth={2} />
            </span>
          </Button>
        )}
        <div className="search-wrap">
          <input
            ref={searchRef}
            className="search"
            placeholder="search skills..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") (e.target as HTMLInputElement).blur();
            }}
          />
          <kbd className="kbd">⌘K</kbd>
        </div>
        {onForgetProject && (
          <Button variant="destructive" size="sm" onClick={onForgetProject}>
            forget project
          </Button>
        )}
      </div>
    </div>
  );
}
