import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

/**
 * The workbench theme: our token language, not VS Code's. Editor face is
 * the mono stack; chrome colors mirror App.css (:root values inlined —
 * Monaco-grade editors need literal colors in defineTheme-style maps).
 */
export const skilltasticTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#141414",
      color: "#e6e6e6",
      fontSize: "12.5px",
      height: "100%",
    },
    ".cm-content": {
      fontFamily: "var(--font-mono)",
      caretColor: "#fff",
      paddingBottom: "40vh",
    },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#fff" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "rgba(255,255,255,0.14)",
    },
    ".cm-activeLine": { backgroundColor: "rgba(255,255,255,0.035)" },
    ".cm-selectionMatch": { backgroundColor: "rgba(255,255,255,0.08)" },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: "#5c5c5c",
      border: "none",
      borderRight: "1px solid rgba(255,255,255,0.06)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
      color: "#e6e6e6",
    },
    ".cm-lineNumbers .cm-gutterElement": { minWidth: "34px" },
    ".cm-foldGutter .cm-gutterElement": { color: "#5c5c5c" },
    ".cm-matchingBracket": {
      outline: "1px solid rgba(255,255,255,0.25)",
      backgroundColor: "transparent",
    },
    ".cm-tooltip": {
      backgroundColor: "#232323",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "7px",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.09), 0 4px 12px rgba(0,0,0,0.5)",
      color: "#e6e6e6",
    },
    ".cm-tooltip-autocomplete ul li[aria-selected]": {
      backgroundColor: "#2e2e2e",
      color: "#fff",
    },
    ".cm-completionIcon": { opacity: "0.6" },
    ".cm-tooltip-lint": { fontFamily: "var(--font-sans)", fontSize: "11px" },
    ".cm-lint-marker": { opacity: "0.8" },
    ".cm-diagnostic": { padding: "4px 8px" },
    ".cm-diagnostic-error": { borderLeft: "2px solid #ef4444" },
    ".cm-diagnostic-warning": { borderLeft: "2px solid #f59e0b" },
    ".cm-diagnostic-info, .cm-diagnostic-hint": {
      borderLeft: "2px solid rgba(255,255,255,0.35)",
    },
    ".cm-lintRange-error": {
      backgroundImage: "none",
      borderBottom: "1px solid rgba(239,68,68,0.8)",
    },
    ".cm-lintRange-warning": {
      backgroundImage: "none",
      borderBottom: "1px solid rgba(245,158,11,0.7)",
    },
    ".cm-lintRange-info, .cm-lintRange-hint": {
      backgroundImage: "none",
      borderBottom: "1px dotted rgba(255,255,255,0.4)",
    },
    ".cm-searchMatch": { backgroundColor: "rgba(255,255,255,0.12)" },
    ".cm-searchMatch-selected": { backgroundColor: "rgba(255,255,255,0.25)" },
    ".cm-panel.cm-panel-search": {
      backgroundColor: "#1c1c1c",
      color: "#e6e6e6",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      fontFamily: "var(--font-sans)",
      fontSize: "11px",
    },
    ".cm-panel.cm-panel-search input": {
      backgroundColor: "#141414",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: "5px",
      color: "#e6e6e6",
    },
    ".cm-frontmatter-line": { backgroundColor: "rgba(255,255,255,0.028)" },
    ".cm-fm-key": { color: "#9cdcfe" },
    ".cm-fm-delim": { color: "#5c5c5c" },
  },
  { dark: true },
);

/** Syntax colors for markdown + the frontmatter overlay. */
export const skilltasticHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: t.heading1, color: "#ffffff", fontWeight: "700", fontSize: "1.35em" },
    { tag: t.heading2, color: "#f2f2f2", fontWeight: "700", fontSize: "1.2em" },
    { tag: t.heading3, color: "#e9e9e9", fontWeight: "600" },
    { tag: t.heading, color: "#ffffff", fontWeight: "700" },
    { tag: t.strong, color: "#f5f5f5", fontWeight: "700" },
    { tag: t.emphasis, fontStyle: "italic", color: "#d9d9d9" },
    { tag: t.strikethrough, color: "#6f6f6f", textDecoration: "line-through" },
    { tag: t.link, color: "#7aa2f7", textDecoration: "underline" },
    { tag: t.url, color: "#7aa2f7" },
    { tag: t.monospace, color: "#c8c8c8", backgroundColor: "rgba(255,255,255,0.05)" },
    { tag: t.quote, color: "#a8a8a8", fontStyle: "italic" },
    { tag: t.meta, color: "#5c5c5c" },
    { tag: t.processingInstruction, color: "#5c5c5c" },
    { tag: t.comment, color: "#6f6f6f" },
    { tag: t.string, color: "#ce9178" },
    { tag: t.bool, color: "#569cd6" },
    { tag: t.number, color: "#b5cea8" },
    { tag: t.propertyName, color: "#9cdcfe" },
    { tag: t.labelName, color: "#9cdcfe" },
  ]),
);
