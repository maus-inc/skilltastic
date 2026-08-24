import { Decoration, ViewPlugin, type DecorationSet, type ViewUpdate, type EditorView } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import type { EditorState, Text } from "@codemirror/state";

/** `[from, to)` of the leading YAML frontmatter block, or null. */
export function frontmatterRange(doc: Text): { from: number; to: number } | null {
  if (doc.line(1).text.trim() !== "---") return null;
  for (let i = 2; i <= doc.lines; i++) {
    if (doc.line(i).text.trim() === "---") {
      return { from: 0, to: doc.line(i).to };
    }
  }
  return null;
}

export function inFrontmatter(state: EditorState, pos: number): boolean {
  const range = frontmatterRange(state.doc);
  return range !== null && pos <= range.to;
}

/** Parsed frontmatter fields (minimal, mirrors the Rust reader). */
export function parseFrontmatterFields(doc: Text): Record<string, string> {
  const range = frontmatterRange(doc);
  const out: Record<string, string> = {};
  if (!range) return out;
  const from = doc.lineAt(range.from).number;
  const to = doc.lineAt(range.to).number;
  for (let i = from + 1; i < to; i++) {
    const m = doc.line(i).text.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^"(.*)"$/, "$1");
  }
  return out;
}

/** Tints the frontmatter block and colors `key:` / `---` marks. */
export const frontmatterDecorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.build(view.state);
    }
    update(u: ViewUpdate) {
      if (u.docChanged) this.decorations = this.build(u.state);
    }
    build(state: EditorState) {
      const range = frontmatterRange(state.doc);
      if (!range) return Decoration.none;
      // RangeSetBuilder needs ranges sorted by `from` — gather then sort
      const spans: { from: number; to: number; deco: Decoration }[] = [];
      const fromLine = state.doc.lineAt(range.from).number;
      const toLine = state.doc.lineAt(range.to).number;
      for (let i = fromLine; i <= toLine; i++) {
        const line = state.doc.line(i);
        spans.push({ from: line.from, to: line.to, deco: lineDeco });
      }
      for (const s of collect(state, range)) {
        spans.push({ from: s.from, to: s.to, deco: s.cls === "k" ? keyDeco : delimDeco });
      }
      spans.sort((a, b) => a.from - b.from);
      const builder = new RangeSetBuilder<Decoration>();
      for (const s of spans) builder.add(s.from, s.to, s.deco);
      return builder.finish();
    }
  },
  { decorations: (v) => v.decorations },
);

const lineDeco = Decoration.line({ class: "cm-frontmatter-line" });
const keyDeco = Decoration.mark({ class: "cm-fm-key" });
const delimDeco = Decoration.mark({ class: "cm-fm-delim" });

function collect(
  state: EditorState,
  range: { from: number; to: number },
): { from: number; to: number; cls: string }[] {
  const out: { from: number; to: number; cls: string }[] = [];
  const fromLine = state.doc.lineAt(range.from).number;
  const toLine = state.doc.lineAt(range.to).number;
  for (let i = fromLine; i <= toLine; i++) {
    const line = state.doc.line(i);
    if (line.text.trim() === "---") {
      out.push({ from: line.from, to: line.to, cls: "d" });
      continue;
    }
    const m = line.text.match(/^[A-Za-z][A-Za-z0-9_-]*(?=:)/);
    if (m) out.push({ from: line.from, to: line.from + m[0].length, cls: "k" });
  }
  return out.sort((a, b) => a.from - b.from);
}
