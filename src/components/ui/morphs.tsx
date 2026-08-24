import { MorphIcon } from "morphicons/react";
import { svgToIcon } from "morphicons/adapters";
import chevronDownRaw from "iconoir/icons/regular/nav-arrow-down.svg?raw";
import chevronUpRaw from "iconoir/icons/regular/nav-arrow-up.svg?raw";
import viewGridRaw from "iconoir/icons/regular/view-grid.svg?raw";
import flaskRaw from "iconoir/icons/regular/flask.svg?raw";
import squareRaw from "iconoir/icons/regular/square.svg?raw";

/**
 * Morphing icons (morphicons + Iconoir path data): reactive icons whose
 * two states share one <path> that spring-morphs between shapes —
 * rotation falls out of the math, interruptions preserve velocity.
 * Parse each icon ONCE at module scope so morphicons' plan cache holds.
 */
const CHEVRON_DOWN = svgToIcon(chevronDownRaw);
const CHEVRON_UP = svgToIcon(chevronUpRaw);
const VIEW_GRID = svgToIcon(viewGridRaw);
const FLASK = svgToIcon(flaskRaw);
const SQUARE = svgToIcon(squareRaw);
/** windows "restore down" — same glyph the static RestoreIcon draws */
const RESTORE = svgToIcon(
  '<path d="M4 8h12v12H4z M8 8V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-3" stroke="currentColor" fill="none"/>',
);

interface MorphProps {
  size?: number;
}

/** Title-bar menu chevron: down at rest, morphs up while open. */
export function MorphChevron({ open, size = 14 }: MorphProps & { open: boolean }) {
  return (
    <MorphIcon
      icon={open ? CHEVRON_UP : CHEVRON_DOWN}
      size={size}
      strokeWidth={1.5}
      spring="snappy"
      reducedMotion="user"
      className="icn-morph"
    />
  );
}

/** Tool tabs: grid mark at rest, flask while hovered. */
export function MorphGridFlask({ hover, size = 12 }: MorphProps & { hover: boolean }) {
  return (
    <MorphIcon
      icon={hover ? FLASK : VIEW_GRID}
      size={size}
      strokeWidth={1.5}
      spring="snappy"
      reducedMotion="user"
      className="icn-morph"
    />
  );
}

/** Window control: maximize square morphs into the restore glyph. */
export function MorphMaxRestore({ maximized, size = 12 }: MorphProps & { maximized: boolean }) {
  return (
    <MorphIcon
      icon={maximized ? RESTORE : SQUARE}
      size={size}
      strokeWidth={1.5}
      spring="smooth"
      reducedMotion="user"
      className="icn-morph"
    />
  );
}
