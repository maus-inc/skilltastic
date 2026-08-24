import type { ProjectInfo } from "./project";

/**
 * A tab in the Figma-style title bar. The home tab is implicit (always
 * present, id "home"); these descriptors are the user-opened tabs.
 */
export type TitleTab =
  | { id: string; kind: "tool"; toolId: string; label: string }
  | { id: string; kind: "project"; project: ProjectInfo; label: string };

export const HOME_TAB_ID = "home";

export const toolTabId = (toolId: string) => `tool:${toolId}`;
export const projectTabId = (path: string) => `project:${path}`;
