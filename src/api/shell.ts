import { Command } from "@tauri-apps/plugin-shell";
import { IN_TAURI } from "./runtime";

/**
 * "Open in VS Code / Zed" — the workbench's escape hatch into the user's
 * daily driver. Desktop-only: the shell plugin (and its scoped command
 * allowlist in capabilities) does not exist in the browser preview, so
 * there we simply do nothing and callers hide the affordances.
 *
 * Note: spawn() resolves once the process launches, not when it exits;
 * if the binary is missing the underlying `sh` still starts (and exits
 * 127), so the helpful error below is best-effort rather than a
 * guaranteed "not installed" probe.
 */
export function openInExternalEditor(
  editor: "code" | "zed",
  path: string,
  line?: number,
  column?: number,
): Promise<void> {
  if (!IN_TAURI) return Promise.resolve();
  const args =
    editor === "code" && line != null
      ? ["--goto", `${path}:${line}:${column ?? 1}`]
      : [path];
  return Command.create(editor, args)
    .spawn()
    .then(() => undefined)
    .catch((err) => {
      throw new Error(
        `couldn't open ${editor} (is it installed and on PATH?): ${String(err)}`,
      );
    });
}
