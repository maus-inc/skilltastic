import { type Diagnostic, type LintSource } from "@codemirror/lint";
import type { Text } from "@codemirror/state";
import { frontmatterRange, parseFrontmatterFields } from "./frontmatter";

/**
 * Local, instant SKILL.md linting. Three layers, all offline (the
 * local-only principle):
 *  1. frontmatter policy parity with the Rust side (authoritative there,
 *     mirrored here for keystroke feedback),
 *  2. skill-craft heuristics — the 2026 authoring craft: the description
 *     is a trigger, not a summary,
 *  3. markdown health with mechanical quick-fixes.
 */

export const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/; // Agent Skills spec
export const NAME_RE_LOOSE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/; // Rust policy

export function lintSkillDoc(doc: Text, folderName: string): Diagnostic[] {
  const out: Diagnostic[] = [];
  const range = frontmatterRange(doc);

  if (!range) {
    out.push({
      from: 0,
      to: Math.min(doc.length, doc.line(1).to),
      severity: "error",
      message: "Missing YAML frontmatter. A SKILL.md starts with --- and needs name and description.",
    });
    return out;
  }

  const fields = parseFrontmatterFields(doc);
  const nameLine = findFieldLine(doc, range, "name");
  const descLine = findFieldLine(doc, range, "description");

  // ---- name ----
  if (!("name" in fields)) {
    out.push(diag(doc, range, "error", "Frontmatter needs a `name` field.", nameLine));
  } else {
    const name = fields.name;
    if (name.length > 64) {
      out.push(diag(doc, range, "error", "`name` must be at most 64 characters.", nameLine));
    } else if (!NAME_RE_LOOSE.test(name)) {
      out.push(diag(doc, range, "error", "`name` allows only letters, digits, `_`, `-`, `.` and no leading dot.", nameLine));
    } else if (!NAME_RE.test(name)) {
      out.push(diag(doc, range, "warning", "The Agent Skills spec prefers lowercase-hyphenated names (they also become folder names).", nameLine));
    } else if (name !== folderName) {
      out.push(diag(doc, range, "warning", `name “${name}” differs from the folder “${folderName}”; agents expect them to match.`, nameLine));
    }
  }

  // ---- description ----
  if (!("description" in fields)) {
    out.push(diag(doc, range, "error", "Frontmatter needs a `description` field. It is the trigger agents match against.", descLine));
  } else {
    const d = fields.description;
    if (d.length > 1024) {
      out.push(diag(doc, range, "error", `description is ${d.length} chars; the spec caps it at 1024.`, descLine));
    }
    if (/[<>]/.test(d)) {
      out.push(diag(doc, range, "warning", "Avoid < > in the description; angle brackets can read like injected markup.", descLine));
    }
    if (d.length > 0 && d.length < 20) {
      out.push(diag(doc, range, "warning", "Description is too vague to trigger. State the capability and “Use when…” conditions.", descLine));
    } else if (d.length >= 20 && !/use when/i.test(d)) {
      out.push(diag(doc, range, "hint", "Strong descriptions open with the trigger: start with “Use when …” so agents know when to load this skill.", descLine));
    }
    if (d.length > 300) {
      out.push(diag(doc, range, "hint", "Keep the description trigger-focused (≤~300 chars); put process detail in the body, never in the trigger.", descLine));
    }
  }

  // ---- body craft + markdown health ----
  const bodyFrom = doc.lineAt(range.to).number + 1;
  if (bodyFrom <= doc.lines) {
    let bodyChars = 0;
    let sawH1 = false;
    let blankRun = 0;
    for (let i = bodyFrom; i <= doc.lines; i++) {
      const text = doc.line(i).text;
      bodyChars += text.length;
      if (/^#\s/.test(text)) sawH1 = true;
      if (/[ \t]+$/.test(text)) {
        const m = text.match(/[ \t]+$/)!;
        out.push({
          from: doc.line(i).to - m[0].length,
          to: doc.line(i).to,
          severity: "hint",
          message: "Trailing whitespace.",
          actions: [
            {
              name: "Trim",
              apply: (view, from, to) =>
                view.dispatch({ changes: { from, to, insert: "" } }),
            },
          ],
        });
      }
      blankRun = text.trim() === "" ? blankRun + 1 : 0;
      if (blankRun === 3) {
        out.push({
          from: doc.line(i - 1).from,
          to: doc.line(i).to,
          severity: "hint",
          message: "More than one consecutive blank line.",
          actions: [
            {
              name: "Collapse blanks",
              apply: (view, from, to) =>
                view.dispatch({ changes: { from, to, insert: "" } }),
            },
          ],
        });
        blankRun = 1;
      }
      if (text.length > 120 && !/^\s*(#|>|\||-|http)/.test(text)) {
        out.push(diagAt(doc.line(i), "hint", "Line over 120 chars; short lines render better in skill bodies."));
      }
    }
    if (!sawH1) {
      out.push(diagAt(doc.line(bodyFrom), "warning", "No `# Title` heading. Agents scan headings first; give the body a title."));
    }
    if (bodyChars > 20000) {
      out.push(diagAt(doc.line(bodyFrom), "info", "Body is over ~5k tokens. Move long references into references/ files; progressive disclosure keeps the skill cheap to load."));
    }
  }

  return out;
}

export function skillLinter(folderName: string): LintSource {
  return (view) => lintSkillDoc(view.state.doc, folderName);
}

// ---- helpers ----

function findFieldLine(doc: Text, range: { from: number; to: number }, key: string): number {
  const from = doc.lineAt(range.from).number;
  const to = doc.lineAt(range.to).number;
  for (let i = from + 1; i < to; i++) {
    if (doc.line(i).text.startsWith(`${key}:`)) return i;
  }
  return from + 1;
}

function diag(doc: Text, _range: { from: number; to: number }, severity: Diagnostic["severity"], message: string, lineNo: number): Diagnostic {
  const line = doc.line(Math.min(lineNo, doc.lines));
  return { from: line.from, to: line.to, severity, message };
}

function diagAt(line: { from: number; to: number }, severity: Diagnostic["severity"], message: string): Diagnostic {
  return { from: line.from, to: line.to, severity, message };
}
