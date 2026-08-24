import { useEffect, useRef, useState, type FC } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import useMeasure from "react-use-measure";
import { UndoIcon } from "./icons";

/**
 * Timed-undo confirmation for destructive actions — the Watermelon
 * `time-undo-action` pattern rebuilt in this app's own language (wm-btn
 * radii/typography, danger tints, streak depth tokens, Iconoir mark,
 * no blur filters per the 60fps contract).
 *
 * Semantics (the real logic, not the demo's): first click ARMS a pending
 * destructive action — the control morphs into [undo mark][label][count]
 * and counts down. Clicking again cancels. When the countdown expires the
 * action commits exactly once. Unmounting while armed cancels; teardown
 * never commits.
 */
export interface TimedUndoActionProps {
  /** countdown seconds once armed */
  seconds?: number;
  /** resting label — the destructive action ("delete") */
  label: string;
  /** armed label — the way out ("cancel delete") */
  undoLabel: string;
  /** fires once when the countdown expires */
  onCommit: () => void;
  disabled?: boolean;
}

export const TimedUndoAction: FC<TimedUndoActionProps> = ({
  seconds = 6,
  label,
  undoLabel,
  onCommit,
  disabled,
}) => {
  const [armed, setArmed] = useState(false);
  const [count, setCount] = useState(seconds);
  const [ref, bounds] = useMeasure({ offsetSize: true });
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  // tick while armed
  useEffect(() => {
    if (!armed) return;
    const interval = setInterval(() => setCount((c) => c - 1), 1000);
    return () => clearInterval(interval);
  }, [armed]);

  // expiry commits exactly once; closing/unmounting before that cancels
  useEffect(() => {
    if (!armed || count > 0) return;
    setArmed(false);
    setCount(seconds);
    commitRef.current();
  }, [armed, count, seconds]);

  const toggle = () => {
    if (disabled) return;
    setArmed((a) => {
      if (!a) setCount(seconds);
      return !a;
    });
  };

  return (
    <MotionConfig transition={{ type: "spring", stiffness: 250, damping: 22 }}>
      <motion.button
        type="button"
        className={`tua ${armed ? "armed" : ""}`}
        onClick={toggle}
        disabled={disabled}
        aria-label={armed ? `${undoLabel} — ${count} seconds` : label}
        animate={{ width: bounds.width > 0 ? bounds.width : "auto" }}
      >
        <span className={`tua-inner ${armed ? "armed" : ""}`} ref={ref}>
          <AnimatePresence mode="popLayout" initial={false}>
            {armed && (
              <motion.span
                className="tua-chip"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
              >
                <UndoIcon size={12} />
              </motion.span>
            )}
          </AnimatePresence>

          <AnimatedText
            text={armed ? undoLabel : label}
            className={`tua-text ${armed ? "armed" : ""}`}
          />

          <AnimatePresence mode="popLayout" initial={false}>
            {armed && (
              <motion.span
                className="tua-count"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={count}
                    initial={{ opacity: 0, y: -10, scale: 0.6 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.6 }}
                    transition={{ type: "spring", stiffness: 240, damping: 20, mass: 1 }}
                  >
                    {Math.max(count, 0)}
                  </motion.span>
                </AnimatePresence>
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </motion.button>
    </MotionConfig>
  );
};

/** Per-character spring stagger — the watermelon charm, minus the blur
 *  filters (transform/opacity only, per the perf contract). */
function AnimatedText({
  text,
  className,
  delayStep = 0.014,
}: {
  text: string;
  className?: string;
  delayStep?: number;
}) {
  return (
    <span className={className} style={{ display: "inline-flex" }} aria-hidden="true">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={text} style={{ display: "inline-flex", willChange: "transform" }}>
          {text.split("").map((char, i) => (
            <motion.span
              key={i}
              initial={{ y: 8, opacity: 0, scale: 0.6 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -8, opacity: 0, scale: 0.6 }}
              transition={{
                type: "spring",
                stiffness: 240,
                damping: 16,
                mass: 1.2,
                delay: i * delayStep,
              }}
              style={{
                display: "inline-block",
                whiteSpace: char === " " ? "pre" : undefined,
              }}
            >
              {char}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default TimedUndoAction;
