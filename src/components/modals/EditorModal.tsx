import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { provider } from "../ui/providers";
import { api } from "../../api";
import { CloseIcon, EditIcon, TrashIcon } from "../ui/icons";
import { ModalShell } from "../ui/ModalShell";
import { renderMarkdown } from "../../utils/markdown";
import type { Skill, ToolEntry } from "../../types";

type EditorMode = "view" | "edit";

interface EditorModalProps {
  skill: Skill;
  toolEntries: ToolEntry[];
  onClose: () => void;
  onDelete: (skill: Skill) => void;
}

export function EditorModal({ skill, toolEntries, onClose, onDelete }: EditorModalProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<EditorMode>("view");

  // Switching skills resets the surface before the new content lands, and
  // a stale response from the previous skill can never overwrite the new
  // one (the `active` guard drops it on cleanup).
  useEffect(() => {
    let active = true;
    setLoading(true);
    setContent("");
    setMode("view");
    api
      .readSkillContent(skill.id)
      .then((text) => {
        if (!active) return;
        setContent(text);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [skill.id]);

  async function save() {
    setSaving(true);
    await api.writeSkillContent(skill.id, content);
    setSaving(false);
    setMode("view");
  }

  function remove() {
    onDelete(skill);
    onClose();
  }

  const html = useMemo(() => renderMarkdown(content), [content]);

  // Tools that read this skill's folder — toggling or deleting affects
  // all of them, since the folder holds one copy on disk.
  const seers = toolEntries.filter((t) => t.folders.some((f) => f.tool === skill.tool));

  return (
    <ModalShell onClose={onClose}>
        <div className="modal-header">
          <span className="title">{skill.name} / SKILL.md</span>
          <Button variant="ghost" size="icon-sm" onClick={onClose} title="close" aria-label="close">
            <CloseIcon />
          </Button>
        </div>

        {mode === "view" && (
          <div className="readers-box">
            <div className="readers-head">
              read by {seers.length} tool{seers.length === 1 ? "" : "s"}
            </div>
            <div className="readers-chips">
              {seers.map((t) => {
                const via = t.folders.find((f) => f.tool === skill.tool);
                return (
                  <span
                    key={t.id}
                    className={`chip chip--iconic ${via?.role === "compat" ? "compat" : ""}`}
                    title={via?.role === "compat" ? `${t.label} — via the shared ${skill.tool} folder` : `${t.label} — primary location`}
                  >
                    <img
                      className="chip-mark"
                      src={provider((t.folders.find((f) => f.role === "own") ?? t.folders[0]).tool).icon}
                      alt={t.label}
                    />
                    <span className="chip-label">{t.label}</span>
                  </span>
                );
              })}
            </div>
            {seers.length > 1 && (
              <div className="readers-warn">
                one copy on disk — disabling or deleting affects all {seers.length} tools
              </div>
            )}
          </div>
        )}

        {mode === "edit" ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading}
            spellCheck={false}
          />
        ) : (
          <div
            className="markdown-body"
            dangerouslySetInnerHTML={{ __html: loading ? "" : html }}
          />
        )}

        <div className="modal-footer">
          <Button
            variant={mode === "edit" ? "secondary" : "outline"}
            size="sm"
            className={mode === "edit" ? undefined : "btn-morph"}
            onClick={() => setMode(mode === "edit" ? "view" : "edit")}
            aria-label={mode === "edit" ? "view" : "edit"}
          >
            {mode === "edit" ? (
              "view"
            ) : (
              <>
                <span className="btn-morph-label">edit</span>
                <span className="btn-morph-icon">
                  <EditIcon size={13} />
                </span>
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="btn-morph"
            onClick={remove}
            aria-label="delete"
          >
            <span className="btn-morph-label">delete</span>
            <span className="btn-morph-icon">
              <TrashIcon size={13} />
            </span>
          </Button>
          {mode === "edit" && (
            <div className="footer-spacer">
              <Button variant="ghost" size="sm" onClick={() => setMode("view")}>
                cancel
              </Button>
              <Button variant="default" size="sm" onClick={save} disabled={loading || saving}>
                {saving ? "saving..." : "save"}
              </Button>
            </div>
          )}
        </div>
    </ModalShell>
  );
}
