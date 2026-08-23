import type { KeyboardEvent, MouseEvent } from "react";
import { motion } from "motion/react";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Accessible name — required, the control renders no text. */
  "aria-label": string;
  title?: string;
  disabled?: boolean;
}

/**
 * Square switch — a plain-CSS port of watermelon.sh's `switch-2`
 * (the shadcn/Base UI switch with `rounded-xs [&_span]:rounded-xs`):
 * a 32×18 track and 14px thumb, both squared to a 2px radius.
 * Proper `role="switch"` semantics: Space/Enter toggle, aria-checked
 * carries state. The thumb is spring-animated via motion.
 */
export function Switch({
  checked,
  onCheckedChange,
  title,
  disabled,
  "aria-label": ariaLabel,
}: SwitchProps) {
  const toggle = (e: MouseEvent) => {
    e.stopPropagation(); // cards open on click; the switch must not
    if (!disabled) onCheckedChange(!checked);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) onCheckedChange(!checked);
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      transition={{ type: "spring", stiffness: 700, damping: 30 }}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      title={title}
      disabled={disabled}
      className="switch"
      data-state={checked ? "checked" : "unchecked"}
      onClick={toggle}
      onKeyDown={onKeyDown}
    >
      <motion.span
        className="switch-thumb"
        initial={false}
        animate={{ transform: checked ? "translateX(14px)" : "translateX(0px)" }}
        transition={{ type: "spring", stiffness: 700, damping: 32 }}
      />
    </motion.button>
  );
}
