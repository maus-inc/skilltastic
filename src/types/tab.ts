import type { ProjectInfo } from "./project";
import type { Skill } from "./skill";

/**
 * A tab in the Figma-style title bar. The home tab is implicit (always
 * present, id "home"); these descriptors are the user-opened tabs.
 * Editor tabs host the SKILL.md workbench (one per open skill).
 */
export type TitleTab =
  | { id: string; kind: "tool"; toolId: string; label: string }
  | { id: string; kind: "project"; project: ProjectInfo; label: string }
  | { id: string; kind: "editor"; skill: Skill; label: string };

export const HOME_TAB_ID = "home";

export const toolTabId = (toolId: string) => `tool:${toolId}`;
export const projectTabId = (path: string) => `project:${path}`;
export const editorTabId = (manifestId: string) => `editor:${manifestId}`;
