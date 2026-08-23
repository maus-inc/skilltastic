import type { ProjectInfo, ToolEntry } from "../types";
import { lastUsed, usageCount } from "./projectUsage";

/** Pinned tools float to the top; the rest keep registry order (stable sort). */
export function orderToolsByPin(tools: ToolEntry[], pinned: Set<string>): ToolEntry[] {
  return [...tools].sort((a, b) => Number(pinned.has(b.id)) - Number(pinned.has(a.id)));
}

export interface VisibleProjects {
  visible: ProjectInfo[];
  /** tracked projects not shown — surfaced behind the "more" dialog */
  hiddenCount: number;
}

/**
 * The sidebar's default project rows: pins first, then the most-used
 * projects of the last 30 days, topped up to `minRows` for fresh setups
 * with no usage history yet.
 */
export function selectVisibleProjects(
  projects: ProjectInfo[],
  mostUsedCount: number,
  minRows: number,
): VisibleProjects {
  const pinned = projects.filter((p) => p.pinned);
  const mostUsed = projects
    .filter((p) => !p.pinned)
    .sort((a, b) => usageCount(b) - usageCount(a) || lastUsed(b) - lastUsed(a))
    .slice(0, mostUsedCount);

  const visible = [...pinned, ...mostUsed];
  for (const p of projects) {
    if (visible.length >= Math.max(pinned.length, minRows)) break;
    if (!visible.some((v) => v.path === p.path)) visible.push(p);
  }

  return { visible, hiddenCount: projects.length - visible.length };
}

/**
 * Applies a user-dragged manual order: items whose id appears in
 * `orderIds` sort by that position; unknown items keep their relative
 * order after the known ones. Stable, pure.
 */
export function applyManualOrder<T>(
  items: T[],
  orderIds: string[],
  getId: (item: T) => string,
): T[] {
  if (orderIds.length === 0) return items;
  const rank = new Map(orderIds.map((id, i) => [id, i]));
  return [...items].sort((a, b) => {
    const ra = rank.get(getId(a)) ?? Number.MAX_SAFE_INTEGER;
    const rb = rank.get(getId(b)) ?? Number.MAX_SAFE_INTEGER;
    return ra - rb;
  });
}
