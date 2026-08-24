import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { unifiedMergeView } from "@codemirror/merge";
import { CloseIcon } from "../ui/icons";
import { skilltasticTheme } from "./theme";

interface DiffPanelProps {
  /** the on-disk content (the last saved state) */
  saved: string;
  /** the current in-memory buffer */
  current: string;
  onClose: () => void;
}

/**
 * Read-only "review changes" view: a unified diff between the last saved
 * state and the working buffer, so an unsaved edit can be audited before
 * commit. The live editor underneath stays mounted as the source of truth.
 */
export function DiffPanel({ saved, current, onClose }: DiffPanelProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const view = new EditorView({
      parent: el,
      state: EditorState.create({
        doc: current,
        extensions: [
          basicSetup,
          skilltasticTheme,
          EditorView.editable.of(false),
          unifiedMergeView({
            original: saved,
            highlightChanges: true,
            mergeControls: false,
            collapseUnchanged: { margin: 6, minSize: 2 },
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [saved, current]);

  return (
    <div className="ed-diff">
      <div className="ed-diff-head">
        <span className="ed-diff-title">review changes</span>
        <span className="ed-diff-hint">disk → buffer · read-only</span>
        <button type="button" className="icon-btn-plain" onClick={onClose} aria-label="close diff">
          <CloseIcon size={12} />
        </button>
      </div>
      <div className="ed-diff-body" ref={mountRef} />
    </div>
  );
}
