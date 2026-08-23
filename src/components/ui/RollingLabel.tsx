import { AnimatePresence, motion } from "motion/react";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

interface RollingLabelProps {
  /** The current text; changing it rolls the old value out. */
  text: string;
  /** Roll direction for the incoming text. */
  direction?: "up" | "down";
  className?: string;
}

/**
 * Odometer-style text roll: on change the old value slides out one way
 * and the new slides in from the other, inside a masked window. Fast
 * and transform/opacity-only — toggles fire constantly, so the motion
 * stays near-imperceptible (160ms strong ease-out, ~7px travel).
 */
export function RollingLabel({ text, direction = "up", className }: RollingLabelProps) {
  const from = direction === "up" ? 7 : -7;
  return (
    <span className={["rolling-label", className].filter(Boolean).join(" ")}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={text}
          className="rolling-label-text"
          initial={{ opacity: 0, transform: `translateY(${from}px)` }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          exit={{ opacity: 0, transform: `translateY(${-from}px)` }}
          transition={{ duration: 0.16, ease: EASE_OUT }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
