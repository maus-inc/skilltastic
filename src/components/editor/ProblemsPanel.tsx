import type { Diagnostic } from "@codemirror/lint";
import { CloseIcon } from "../ui/icons";

export interface ProblemsPanelProps {
  diagnostics: Diagnostic[];
  /** maps a diagnostic to its 1-based line, resolved against the live doc */
  lineOf: (pos: number) => number;
  onJump: (pos: number) => void;
  onClose: () => void;
}

const SEVERITY_ORDER: Record<string, number> = {
  error: 0,
  warning: 1,
  info: 2,
  hint: 3,
};

/**
 * The workbench "problems" panel — the craft-hints gutter grown into a
 * flat, clickable list (VS Code's Problems panel, restyled to our
 * tokens). Clicking a row jumps the cursor to the diagnostic.
 */
export function ProblemsPanel({ diagnostics, lineOf, onJump, onClose }: ProblemsPanelProps) {
  const rows = [...diagnostics].sort(
    (a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9) ||
      a.from - b.from,
  );

  return (
    <div className="ed-problems">
      <div className="ed-problems-head">
        <span className="ed-problems-title">
          {diagnostics.length} suggestion{diagnostics.length === 1 ? "" : "s"}
        </span>
        <button type="button" className="icon-btn-plain" onClick={onClose} aria-label="close problems">
          <CloseIcon size={12} />
        </button>
      </div>
      <div className="ed-problems-list">
        {rows.length === 0 ? (
          <div className="ed-problems-empty">clean — nothing to fix.</div>
        ) : (
          rows.map((d, i) => (
            <button
              key={i}
              type="button"
              className={`ed-problem ed-problem--${d.severity}`}
              onClick={() => onJump(d.from)}
            >
              <span className="ed-problem-mark" />
              <span className="ed-problem-msg">{d.message}</span>
              <span className="ed-problem-line">Ln {lineOf(d.from)}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
