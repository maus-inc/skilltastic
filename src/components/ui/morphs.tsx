import { motion } from "motion/react";
import { MorphIcon } from "morphicons/react";
import { svgToIcon } from "morphicons/adapters";
import chevronDownRaw from "iconoir/icons/regular/nav-arrow-down.svg?raw";
import chevronUpRaw from "iconoir/icons/regular/nav-arrow-up.svg?raw";
import squareRaw from "iconoir/icons/regular/square.svg?raw";
import { GridIcon } from "./icons";

/**
 * Morphing icons (morphicons + Iconoir path data): reactive icons whose
 * two states share one <path> that spring-morphs between shapes —
 * rotation falls out of the math, interruptions preserve velocity.
 * Parse each icon ONCE at module scope so morphicons' plan cache holds.
 */
const CHEVRON_DOWN = svgToIcon(chevronDownRaw);
const CHEVRON_UP = svgToIcon(chevronUpRaw);
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

/**
 * Tool tabs: grid glyph at rest, the tool's OWN model mark springs in on
 * hover. This one is a cross-morph rather than a path morph — provider
 * logos are fill-drawn, and morphicons' svgToIcon honestly rejects
 * fill-only icons — so the two states swap with the same spring
 * vocabulary instead (rotating out/in through center, exclusive
 * transforms, reduced motion honored by the root MotionConfig).
 */
export function ToolTabMark({
  hover,
  mark,
  label,
  size = 12,
}: MorphProps & { hover: boolean; mark: string; label: string }) {
  const spring = { type: "spring", stiffness: 520, damping: 30, mass: 0.6 } as const;
  return (
    <span className="tab-mark" style={{ width: size, height: size }}>
      <motion.span
        className="tab-mark-slot"
        initial={false}
        animate={{
          opacity: hover ? 0 : 1,
          transform: hover ? "rotate(90deg) scale(0.5)" : "rotate(0deg) scale(1)",
        }}
        transition={spring}
      >
        <GridIcon size={size} />
      </motion.span>
      <motion.span
        className="tab-mark-slot"
        initial={false}
        animate={{
          opacity: hover ? 1 : 0,
          transform: hover ? "rotate(0deg) scale(1)" : "rotate(-90deg) scale(0.5)",
        }}
        transition={spring}
      >
        <img className="tab-mark-img" src={mark} alt={label} width={size} height={size} />
      </motion.span>
    </span>
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
