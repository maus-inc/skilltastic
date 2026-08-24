import { marked } from "marked";
import DOMPurify from "dompurify";

/** Renders SKILL.md safely. The YAML frontmatter is metadata the app
 *  already shows in its own chrome, so it is stripped before rendering
 *  instead of leaking into the body as bold text. */
export function renderMarkdown(raw: string): string {
  const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  return DOMPurify.sanitize(marked.parse(body, { async: false }) as string);
}
