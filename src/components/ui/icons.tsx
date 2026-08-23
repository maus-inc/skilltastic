import {
  Folder,
  HomeSimple,
  Minus,
  MoreHoriz,
  NavArrowDown,
  Pin,
  Plus,
  Search,
  Square,
  ViewGrid,
  Xmark,
} from "iconoir-react";

/**
 * The app's icon stack is Iconoir (https://iconoir.com, MIT) — geometric
 * outlines on a 24px grid, 1.5px stroke. Everything routes through these
 * wrappers so sizing/stroke stay consistent app-wide; import from here,
 * never from iconoir-react directly.
 */

interface IconProps {
  size?: number;
  strokeWidth?: number;
}

const p = ({ size = 14, strokeWidth = 1.6 }: IconProps) => ({
  width: size,
  height: size,
  strokeWidth,
});

export function PinIcon({ size = 12, strokeWidth = 1.8 }: IconProps) {
  return <Pin {...p({ size, strokeWidth })} />;
}

export function CloseIcon({ size = 14, strokeWidth = 1.8 }: IconProps) {
  return <Xmark {...p({ size, strokeWidth })} />;
}

export function HomeIcon(props: IconProps) {
  return <HomeSimple {...p(props)} />;
}

export function FolderIcon(props: IconProps) {
  return <Folder {...p(props)} />;
}

export function GridIcon(props: IconProps) {
  return <ViewGrid {...p(props)} />;
}

export function PlusIcon(props: IconProps) {
  return <Plus {...p(props)} />;
}

export function ChevronDownIcon(props: IconProps) {
  return <NavArrowDown {...p(props)} />;
}

export function MoreIcon(props: IconProps) {
  return <MoreHoriz {...p(props)} />;
}

export function SearchIcon(props: IconProps) {
  return <Search {...p(props)} />;
}

export function MinimizeIcon(props: IconProps) {
  return <Minus {...p(props)} />;
}

export function MaximizeIcon(props: IconProps) {
  return <Square {...p(props)} />;
}

/** Windows "restore down" is a system glyph with no Iconoir equivalent —
 *  drawn locally to the same 24px/1.5px conventions. */
export function RestoreIcon({ size = 14, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
      <rect x="4" y="8" width="12" height="12" rx="1" />
      <path d="M8 8V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-3" />
    </svg>
  );
}
