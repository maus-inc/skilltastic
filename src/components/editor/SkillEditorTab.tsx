import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { basicSetup } from "codemirror";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { linter, lintGutter, type Diagnostic } from "@codemirror/lint";
import { autocompletion } from "@codemirror/autocomplete";
import { api } from "../../api";
import { openInExternalEditor } from "../../api/shell";
import { IN_TAURI } from "../../api/runtime";
import { renderMarkdown } from "../../utils/markdown";
import { provider } from "../ui/providers";
import { Button } from "../ui/Button";
import { TimedUndoAction } from "../ui/TimedUndoAction";
import {
  ArrowUpRightIcon,
  CheckIcon,
  FileIcon,
  FolderIcon,
  GlobeIcon,
  InfoCircleIcon,
  TrashIcon,
} from "../ui/icons";
import { frontmatterDecorations, parseFrontmatterFields } from "./frontmatter";
import { lintSkillDoc, skillLinter } from "./lint";
import { skillCompletion } from "./completion";
import { skilltasticHighlight, skilltasticTheme } from "./theme";
import { ProblemsPanel } from "./ProblemsPanel";
import { DiffPanel } from "./DiffPanel";
import type { Skill, SkillDiagnostic, ToolEntry } from "../../types";

export interface EditorTabApi {
  save: () => Promise<void>;
  setContent: (text: string) => void;
  togglePreview: () => void;
  isDirty: () => boolean;
}

interface SkillEditorTabProps {
  skill: Skill;
  toolEntries: ToolEntry[];
  onDirtyChange: (tabId: string, dirty: boolean) => void;
  registerApi: (tabId: string, api: EditorTabApi | null) => void;
  onDelete: (skill: Skill) => void;
  /** fires after a successful save, with the freshly-parsed name/description */
  onSaved: (skill: Skill) => void;
  tabId: string;
}

const PREVIEW_KEY = "skilltastic:editor-preview";
const PREVIEW_PCT_KEY = "skilltastic:editor-preview-pct";

/**
 * The SKILL.md workbench: CodeMirror 6 engine under a VS Code-style
 * chrome built from our own chrome vocabulary (breadcrumb bar, status
 * bar, tab integration, split preview) — Watermelon-refined, token-
 * themed. Linting, suggestions and completions are local and instant.
 */
export function SkillEditorTab({
  skill,
  toolEntries,
  onDirtyChange,
  registerApi,
  onDelete,
  onSaved,
  tabId,
}: SkillEditorTabProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const savedTextRef = useRef("");
  const saveFnRef = useRef<() => Promise<void>>(async () => {});
  const openEditorRef = useRef<(editor: "code" | "zed") => void>(() => {});

  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState({ line: 1, col: 1, words: 0, chars: 0, lints: 0 });
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [diskText, setDiskText] = useState("");
  const [bufferText, setBufferText] = useState("");
  const [previewOn, setPreviewOn] = useState(() => {
    try {
      return localStorage.getItem(PREVIEW_KEY) !== "0";
    } catch {
      return true;
    }
  });
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewPct, setPreviewPct] = useState(() => {
    try {
      const n = Number(localStorage.getItem(PREVIEW_PCT_KEY));
      return Number.isFinite(n) && n > 0 ? n : 42;
    } catch {
      return 42;
    }
  });
  // bumped on every doc change so the preview refreshes even for edits
  // that keep the character count identical (status.chars alone misses them)
  const [docVersion, setDocVersion] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [strictIssues, setStrictIssues] = useState<SkillDiagnostic[]>([]);
  const [showProblems, setShowProblems] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [resourcePaths, setResourcePaths] = useState<string[]>([]);
  const [activeResource, setActiveResource] = useState<string | null>(null);
  const [resourceContent, setResourceContent] = useState("");
  const shellRef = useRef<HTMLDivElement>(null);

  const folderName = useMemo(() => {
    // split on both separators: the desktop backend serializes `\` on Windows
    const parts = skill.path.split(/[\\/]/);
    return parts[parts.length - 1];
  }, [skill.path]);
  const seers = useMemo(
    () => toolEntries.filter((t) => t.folders.some((f) => f.tool === skill.tool)),
    [toolEntries, skill.tool],
  );

  // Linting runs inside CM6's update listener (and the linter extension);
  // a thrown lint can never be allowed to abort the editor's transaction or
  // it would freeze typing. Every lint call is funnelled through here.
  const safeLint = (doc: EditorState["doc"]): Diagnostic[] => {
    try {
      return lintSkillDoc(doc, folderName);
    } catch {
      return [];
    }
  };

  // ---- editor lifecycle ----
  useEffect(() => {
    let cancelled = false;
    api.readSkillContent(skill.id).then((text) => {
      if (cancelled || !mountRef.current) return;
      savedTextRef.current = text;
      setDiskText(text);
      setBufferText(text);
      const view = new EditorView({
        parent: mountRef.current,
        state: EditorState.create({
          doc: text,
          extensions: [
            basicSetup,
            lintGutter(),
            markdown(),
            frontmatterDecorations,
            skilltasticTheme,
            skilltasticHighlight,
            EditorView.lineWrapping,
            autocompletion({ override: [skillCompletion] }),
            linter(skillLinter(folderName), { delay: 250 }),
            keymap.of([
              {
                key: "Mod-s",
                run: () => {
                  void saveFnRef.current().catch(() => {});
                  return true;
                },
              },
              {
                key: "Mod-Shift-v",
                run: () => {
                  togglePreviewRef.current();
                  return true;
                },
              },
            ]),
            EditorView.updateListener.of((u) => {
              if (u.selectionSet || u.docChanged || u.focusChanged) {
                const head = u.state.selection.main.head;
                const line = u.state.doc.lineAt(head);
                const text = u.state.doc.toString();
                setStatus({
                  line: line.number,
                  col: head - line.from + 1,
                  words: text.trim() ? text.trim().split(/\s+/).length : 0,
                  chars: text.length,
                  lints: safeLint(u.state.doc).length,
                });
              }
              if (u.docChanged) {
                setDocVersion((v) => v + 1);
                setBufferText(u.state.doc.toString());
                setDiagnostics(safeLint(u.state.doc));
                const d = u.state.doc.toString() !== savedTextRef.current;
                setDirty((prev) => {
                  if (prev !== d) onDirtyChange(tabId, d);
                  return d;
                });
              }
            }),
          ],
        }),
      });
      viewRef.current = view;
      setDiagnostics(safeLint(view.state.doc));
      setStatus((s) => ({
        ...s,
        chars: text.length,
        words: text.trim() ? text.trim().split(/\s+/).length : 0,
        lints: safeLint(view.state.doc).length,
      }));
      setLoading(false);
      view.focus(); // a newly opened skill should be immediately editable

      registerApi(tabId, {
        save: () => saveFnRef.current(),
        setContent: (t: string) => {
          view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: t } });
        },
        togglePreview: () => togglePreviewRef.current(),
        isDirty: () => view.state.doc.toString() !== savedTextRef.current,
      });
    });

    return () => {
      cancelled = true;
      registerApi(tabId, null);
      // unmounting always discards the in-memory doc — clear the dirty dot
      // so a tab never shows unsaved changes for content that no longer exists
      onDirtyChange(tabId, false);
      viewRef.current?.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill.id]);

  // ---- actions ----
  saveFnRef.current = async () => {
    const view = viewRef.current;
    if (!view) return;
    const text = view.state.doc.toString();
    try {
      await api.writeSkillContent(skill.id, text);
    } catch (e) {
      setSaveError(String(e));
      throw e; // keep the dirty flag — callers (unsaved guard) need to know
    }
    setSaveError(null);
    savedTextRef.current = text;
    setDiskText(text);
    setDirty(false);
    onDirtyChange(tabId, false);

    // authoritative second opinion from the Rust side (non-blocking)
    try {
      setStrictIssues(await api.lintSkillContent(skill.id, text));
    } catch {
      setStrictIssues([]);
    }

    // propagate name/description edits so the dashboard + tab label refresh
    const fields = parseFrontmatterFields(view.state.doc);
    onSaved({
      ...skill,
      name: fields.name || skill.name,
      description: fields.description ?? skill.description,
    });
  };

  openEditorRef.current = (editor: "code" | "zed") => {
    openInExternalEditor(editor, skill.path, status.line, status.col).catch((e) => {
      setSaveError(String(e));
    });
  };

  const togglePreviewRef = useRef(() => {});
  togglePreviewRef.current = () => {
    setPreviewOn((on) => {
      const next = !on;
      try {
        localStorage.setItem(PREVIEW_KEY, next ? "1" : "0");
      } catch {
        /* preference just won't persist */
      }
      return next;
    });
  };

  const setPreviewWidth = (pct: number) => {
    setPreviewPct(pct);
    try {
      localStorage.setItem(PREVIEW_PCT_KEY, String(pct));
    } catch {
      /* preference just won't persist */
    }
  };

  // ---- preview rendering (debounced) ----
  useEffect(() => {
    const view = viewRef.current;
    if (!previewOn || !view) return;
    const t = window.setTimeout(() => {
      setPreviewHtml(renderMarkdown(view.state.doc.toString()));
    }, 150);
    return () => window.clearTimeout(t);
  }, [previewOn, status.chars, docVersion, loading]);

  // ---- resource tree (level-3 references) ----
  useEffect(() => {
    if (!showFiles) return;
    let active = true;
    api
      .listSkillResources(skill.id)
      .then((paths) => active && setResourcePaths(paths))
      .catch(() => active && setResourcePaths([]));
    return () => {
      active = false;
    };
  }, [showFiles, skill.id]);

  function openResource(path: string) {
    setActiveResource(path);
    api
      .readSkillResource(skill.id, path)
      .then(setResourceContent)
      .catch((e) => setResourceContent(`couldn't read ${path}: ${String(e)}`));
  }

  function jumpTo(pos: number) {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      selection: { anchor: pos },
      effects: EditorView.scrollIntoView(pos, { y: "center" }),
    });
    view.focus();
  }

  const lineOf = (pos: number) => viewRef.current?.state.doc.lineAt(pos).number ?? 1;
  const problemCount = diagnostics.length;

  // ---- divider drag ----
  const onDividerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const shell = shellRef.current;
    if (!shell) return;
    const move = (ev: PointerEvent) => {
      const rect = shell.getBoundingClientRect();
      const pct = ((rect.right - ev.clientX) / rect.width) * 100;
      setPreviewWidth(Math.min(70, Math.max(24, pct)));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className="ed-shell" ref={shellRef}>
      {/* breadcrumb bar */}
      <div className="ed-crumb">
        <span className="ed-crumb-title">
          {skill.name} <span className="ed-crumb-file">/ SKILL.md</span>
        </span>
        <span
          className="chip chip--iconic"
          data-tip={skill.scope === "user" ? "global skill" : "project skill"}
          data-tip-side="top"
        >
          {skill.scope === "user" ? <GlobeIcon size={10} /> : <FolderIcon size={10} />}
          <span className="chip-label">{skill.scope === "user" ? "global" : "project"}</span>
        </span>
        <span className="ed-readers">
          read by
          {seers.length > 1 && (
            <span
              className="readers-info"
              data-tip="These tools share one folder, so disabling or deleting the skill affects all of them."
              data-tip-side="top"
              data-tip-align="start"
            >
              <InfoCircleIcon size={12} />
            </span>
          )}
          {seers.slice(0, 4).map((t) => (
            <img
              key={t.id}
              className="ed-reader-mark"
              src={provider((t.folders.find((f) => f.role === "own") ?? t.folders[0]).tool).icon}
              alt={t.label}
              title={t.label}
            />
          ))}
        </span>
        <span className="ed-crumb-path">{skill.path}</span>
        {IN_TAURI && (
          <span className="ed-open-external">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditorRef.current("code")}
              title="open this SKILL.md in VS Code"
              aria-label="open in vs code"
            >
              <ArrowUpRightIcon size={12} />
              code
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditorRef.current("zed")}
              title="open this SKILL.md in Zed"
              aria-label="open in zed"
            >
              <ArrowUpRightIcon size={12} />
              zed
            </Button>
          </span>
        )}
      </div>

      {showProblems && (
        <ProblemsPanel
          diagnostics={diagnostics}
          lineOf={lineOf}
          onJump={jumpTo}
          onClose={() => setShowProblems(false)}
        />
      )}

      {/* editor + optional files strip + preview split */}
      <div className="ed-body" style={{ "--preview-pct": `${previewPct}%` } as CSSProperties}>
        {showFiles && (
          <div className="ed-files">
            <div className="ed-files-head">files</div>
            <div className="ed-files-list">
              {resourcePaths.length === 0 ? (
                <span className="ed-files-empty">no supporting files</span>
              ) : (
                resourcePaths.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`ed-file ${activeResource === p ? "active" : ""}`}
                    onClick={() => openResource(p)}
                    title={p}
                  >
                    <FileIcon size={12} />
                    <span className="ed-file-name">{p}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
        <div className="ed-cm" ref={mountRef}>
          {loading && <div className="empty-state">loading…</div>}
        </div>
        {previewOn && (
          <>
            <div className="ed-divider" onPointerDown={onDividerDown} title="drag to resize" />
            <div className="ed-preview">
              {activeResource ? (
                <>
                  <div className="ed-preview-res-head">
                    <span className="ed-preview-res-name">{activeResource}</span>
                    <button
                      type="button"
                      className="icon-btn-plain"
                      onClick={() => setActiveResource(null)}
                      aria-label="back to skill preview"
                    >
                      <ArrowUpRightIcon size={12} />
                    </button>
                  </div>
                  {activeResource.endsWith(".md") ? (
                    <div
                      className="markdown-body ed-preview-body"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(resourceContent) }}
                    />
                  ) : (
                    <pre className="ed-resource-pre">{resourceContent}</pre>
                  )}
                </>
              ) : (
                <div
                  className="markdown-body ed-preview-body"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              )}
            </div>
          </>
        )}
        {showDiff && (
          <DiffPanel
            saved={diskText}
            current={bufferText}
            onClose={() => setShowDiff(false)}
          />
        )}
      </div>

      {/* status bar */}
      <div className="ed-status">
        <span className="ed-status-item">
          Ln {status.line}, Col {status.col}
        </span>
        <span className="ed-status-item">
          {status.words} words · {status.chars} chars
        </span>
        <button
          type="button"
          className={`ed-status-item ed-status-btn ${problemCount ? "warn" : ""}`}
          onClick={() => setShowProblems((s) => !s)}
          aria-label="toggle problems"
          title="problems"
        >
          {problemCount ? `${problemCount} suggestion${problemCount === 1 ? "" : "s"}` : "clean"}
        </button>
        {strictIssues.length > 0 && (
          <span
            className="ed-status-item warn"
            title={strictIssues.map((d) => `${d.line}: ${d.message}`).join("\n")}
          >
            {strictIssues.length} policy
          </span>
        )}
        <span className="footer-spacer" />
        {saveError && (
          <span className="ed-status-item error" title={saveError}>
            save failed
          </span>
        )}
        <span className={`ed-status-item ${dirty ? "dirty" : ""}`}>{dirty ? "● unsaved" : "saved"}</span>
        <Button
          variant="default"
          size="sm"
          className={dirty ? "btn-morph" : undefined}
          disabled={!dirty}
          onClick={() => void saveFnRef.current().catch(() => {})}
          aria-label="save"
          title="⌘S"
        >
          <span className="btn-morph-label">save</span>
          <span className="btn-morph-icon">
            <CheckIcon size={14} />
          </span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => togglePreviewRef.current()}
          aria-label={previewOn ? "hide preview" : "show preview"}
          title="⌘⇧V"
        >
          {previewOn ? "hide preview" : "preview"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={showFiles ? "is-active" : undefined}
          onClick={() => setShowFiles((s) => !s)}
          aria-label="toggle files"
          title="supporting files"
        >
          files
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={showDiff ? "is-active" : undefined}
          onClick={() => setShowDiff((s) => !s)}
          aria-label="review changes"
          title="diff against the saved state"
        >
          diff
        </Button>
        <TimedUndoAction
          label="delete"
          undoLabel="cancel"
          seconds={6}
          onCommit={() => onDelete(skill)}
          hoverIcon={<TrashIcon size={14} />}
        />
      </div>
    </div>
  );
}
