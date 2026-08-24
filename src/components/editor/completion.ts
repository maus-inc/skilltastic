import { snippetCompletion, type CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import { inFrontmatter } from "./frontmatter";

/** Frontmatter-aware autocomplete: field keys at line starts, and a
 *  trigger-first description starter after `description: `. */
export function skillCompletion(context: CompletionContext): CompletionResult | null {
  const { state, pos } = context;
  if (!inFrontmatter(state, pos)) return null;
  const line = state.doc.lineAt(pos);
  const upto = line.text.slice(0, pos - line.from);

  // after "description: " → offer the trigger-first starter
  const descMatch = upto.match(/^description:\s*(.*)$/);
  if (descMatch) {
    const word = descMatch[1];
    return {
      from: pos - word.length,
      options: [
        snippetCompletion("Use when ${1:triggering conditions}", {
          label: "Use when …",
          detail: "trigger-first description",
          info: "Descriptions are triggers: state when the skill applies, not what it does.",
        }),
      ],
      validFor: /^\S*$/,
    };
  }

  // at a key position → offer the known fields
  if (/^[A-Za-z-]*$/.test(upto)) {
    return {
      from: line.from,
      options: [
        { label: "name:", detail: "required", info: "Lowercase-hyphenated, ≤64 chars, must match the folder name." },
        { label: "description:", detail: "required", info: "The trigger agents match against. Start with “Use when…”." },
        { label: "allowed-tools:", detail: "optional", info: "Restrict which tools the agent may call while active." },
        { label: "license:", detail: "optional", info: "e.g. MIT" },
        { label: "metadata:", detail: "optional", info: "Free-form author/version metadata." },
      ],
      validFor: /^[A-Za-z-]*$/,
    };
  }
  return null;
}
