import { useEffect, useRef, useState, type FC, type ReactNode } from "react";
import { motion, MotionConfig } from "motion/react";
import useMeasure from "react-use-measure";
import { TrashIcon, UndoIcon } from "./icons";
import { RollingLabel } from "./RollingLabel";

/**
 * Timed-undo confirmation for destructive actions — the Watermelon
 * `time-undo-action` pattern rebuilt in this app's own language (wm-btn
 * radii/typography, danger tints, streak depth tokens, Iconoir marks,
 * no blur filters per the 60fps contract). Everything is center-aligned.
 *
 * Three phases, no auto-commit anywhere:
 *  - idle:  reads as a plain destructive button; hover morphs the label
 *           into `hoverIcon` (btn-morph vocabulary)
 *  - armed: first click — [undo mark][undo label][countdown]; clicking it
 *           cancels back to idle
 *  - ready: countdown finished — the control becomes an explicit
 *           [trash][label] execute button; ONLY clicking it commits.
 * Escape or clicking outside disarms from armed/ready. Unmounting never
 * commits.
 */
export interface TimedUndoActionProps {
  /** countdown seconds once armed */
  seconds?: number;
  /** resting/execute label — the destructive action ("delete") */
  label: string;
  /** armed label — the way out ("cancel") */
  undoLabel: string;
  /** fires when the ready state is clicked */
  onCommit: () => void;
  /** icon the resting label morphs into on hover */
  hoverIcon?: ReactNode;
  disabled?: boolean;
}

type Phase = "idle" | "armed" | "ready";

export const TimedUndoAction: FC<TimedUndoActionProps> = ({
  seconds = 6,
  label,
  undoLabel,
  onCommit,
  hoverIcon,
  disabled,
}) => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [count, setCount] = useState(seconds);
  const [ref, bounds] = useMeasure({ offsetSize: true });
  const btnRef = useRef<HTMLButtonElement>(null);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  // tick while armed
  useEffect(() => {
    if (phase !== "armed") return;
    const interval = setInterval(() => setCount((c) => c - 1), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // expiry reveals the explicit execute button; it never commits by itself
  useEffect(() => {
    if (phase === "armed" && count <= 0) setPhase("ready");
  }, [phase, count]);

  // escape or outside press disarms — silence is not consent
  useEffect(() => {
    if (phase === "idle") return;
    const onDown = (e: MouseEvent) => {
      if (!btnRef.current?.contains(e.target as Node)) setPhase("idle");
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPhase("idle");
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [phase]);

  const onClick = () => {
    if (disabled) return;
    if (phase === "idle") {
      setCount(seconds);
      setPhase("armed");
    } else if (phase === "armed") {
      setPhase("idle");
    } else {
      setPhase("idle");
      commitRef.current();
    }
  };

  const armed = phase === "armed";
  const ready = phase === "ready";

  return (
    <MotionConfig transition={{ type: "spring", stiffness: 250, damping: 22 }}>
      <motion.button
        ref={btnRef}
        type="button"
        className={`tua ${armed ? "armed" : ""} ${ready ? "ready" : ""}`}
        onClick={onClick}
        disabled={disabled}
        aria-label={armed ? `${undoLabel} — ${count} seconds` : ready ? `confirm ${label}` : label}
        data-tip={ready ? label : undefined}
        animate={{ width: bounds.width > 0 ? bounds.width : "auto" }}
      >
        <span className="tua-inner" ref={ref}>
          {armed && (
            <motion.span
              className="tua-chip"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <UndoIcon size={12} />
            </motion.span>
          )}

          {!ready && (
            <span className="tua-textwrap">
              <span className="btn-morph-label">
                <AnimatedText text={armed ? undoLabel : label} className="tua-text" />
              </span>
              {phase === "idle" && hoverIcon && (
                <span className="btn-morph-icon">{hoverIcon}</span>
              )}
            </span>
          )}

          {armed && (
            <motion.span
              className="tua-count"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <RollingLabel text={String(Math.max(count, 0))} direction="down" />
            </motion.span>
          )}

          {ready && (
            /* icon-only execute — the label would only soften the moment */
            <motion.span
              className="tua-ready-icon"
              initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
            >
              <TrashIcon size={14} />
            </motion.span>
          )}
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
      <motion.span key={text} style={{ display: "inline-flex", willChange: "transform" }}>
        {text.split("").map((char, i) => (
          <motion.span
            key={`${text}-${i}`}
            initial={{ y: 8, opacity: 0, scale: 0.6 }}
            animate={{ y: 0, opacity: 1, scale: 1, transition: { delay: i * delayStep } }}
            style={{
              display: "inline-block",
              whiteSpace: char === " " ? "pre" : undefined,
            }}
          >
            {char}
          </motion.span>
        ))}
      </motion.span>
    </span>
  );
}

export default TimedUndoAction;
