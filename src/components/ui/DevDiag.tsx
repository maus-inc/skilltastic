import { useEffect, useState } from "react";

interface DiagRow {
  what: string;
  cls: string;
  opacity: string;
  visibility: string;
  display: string;
  rect: string;
  transform: string;
}

/**
 * TEMPORARY preview-only on-screen diagnostics. The disappearing-button bug
 * only reproduces in a real browser; this reports the computed style/rect of
 * the controls the user interacts with, right on screen, so a screenshot of
 * the preview yields ground truth without opening DevTools.
 *
 * Remove once the bug is fixed.
 */
export function DevDiag() {
  const [rows, setRows] = useState<DiagRow[]>([]);

  useEffect(() => {
    function probe(el: Element | null, what: string) {
      if (!el) return null;
      const cs = getComputedStyle(el as HTMLElement);
      const r = (el as HTMLElement).getBoundingClientRect();
      return {
        what,
        cls: (el.getAttribute("class") || el.tagName).slice(0, 28),
        opacity: cs.opacity,
        visibility: cs.visibility,
        display: cs.display,
        rect: `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`,
        transform: cs.transform === "none" ? "none" : cs.transform.slice(0, 22),
      } as DiagRow;
    }

    function onClick(e: MouseEvent) {
      const t = e.target as Element;
      const btn = t.closest(".wm-btn") || t.closest(".switch") || t.closest("button");
      const next = [
        probe(btn, "clicked-btn"),
        probe(document.querySelector(".topbar .btn-morph"), "topbar-newskill"),
        probe(document.querySelector(".skill-card"), "first-card"),
        probe(document.querySelector(".modal"), "modal"),
      ].filter(Boolean) as DiagRow[];
      setRows(next);
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        left: 8,
        bottom: 8,
        zIndex: 9999,
        background: "rgba(20,20,20,0.92)",
        color: "#8f8",
        fontFamily: "monospace",
        fontSize: 10,
        lineHeight: 1.5,
        padding: "6px 8px",
        borderRadius: 6,
        border: "1px solid #333",
        pointerEvents: "none",
        maxWidth: 420,
        whiteSpace: "pre",
      }}
    >
      {rows.length === 0
        ? "diag: click anything…"
        : rows.map((r) => `${r.what} [${r.cls}]\n  op=${r.opacity} vis=${r.visibility} disp=${r.display}\n  rect=${r.rect} tf=${r.transform}`).join("\n")}
    </div>
  );
}
