import {
  ArrowUpRight,
  Check,
  Flask,
  Folder,
  FolderPlus,
  Github,
  Globe,
  List,
  HomeSimple,
  Minus,
  MoreHoriz,
  NavArrowDown,
  PagePlus,
  Pin,
  PinSolid,
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
 *
 * Crispness rules: strokes are non-scaling (uniform 1.5 screen px, see
 * the .icn css) and icon SIZES SHOULD BE EVEN NUMBERS — an odd size in
 * an even container centers on a half pixel and antialiases soft.
 */

interface IconProps {
  size?: number;
  strokeWidth?: number;
}

/**
 * All icons ship with the `icn` class: strokes are non-scaling (1.5px
 * in screen pixels at any icon size) and geometry renders at full
 * precision — this is what keeps the set crisp at 10–16px.
 */
const p = ({ size = 14, strokeWidth = 1.5 }: IconProps) => ({
  width: size,
  height: size,
  strokeWidth,
  className: "icn",
});

export function PinIcon({
  size = 12,
  strokeWidth = 1.5,
  filled = false,
}: IconProps & { filled?: boolean }) {
  return filled ? <PinSolid {...p({ size, strokeWidth })} /> : <Pin {...p({ size, strokeWidth })} />;
}

export function CloseIcon({ size = 14, strokeWidth = 1.5 }: IconProps) {
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

export function CheckIcon(props: IconProps) {
  return <Check {...p(props)} />;
}

export function GlobeIcon(props: IconProps) {
  return <Globe {...p(props)} />;
}

export function FlaskIcon(props: IconProps) {
  return <Flask {...p(props)} />;
}

export function ListIcon(props: IconProps) {
  return <List {...p(props)} />;
}

export function GithubIcon(props: IconProps) {
  return <Github {...p(props)} />;
}

export function ArrowUpRightIcon(props: IconProps) {
  return <ArrowUpRight {...p(props)} />;
}

export function PagePlusIcon(props: IconProps) {
  return <PagePlus {...p(props)} />;
}

export function FolderPlusIcon(props: IconProps) {
  return <FolderPlus {...p(props)} />;
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
    <svg className="icn" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
      <rect x="4" y="8" width="12" height="12" rx="1" />
      <path d="M8 8V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-3" />
    </svg>
  );
}
