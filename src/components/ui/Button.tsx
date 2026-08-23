import { forwardRef, type ButtonHTMLAttributes } from "react";
import { motion } from "motion/react";

export type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

export type ButtonSize = "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/**
 * The app's button system — a plain-CSS + motion port of Watermelon UI's
 * button (shadcn CVA structure: 6 variants × 6 sizes, focus ring,
 * disabled and aria-invalid states), scaled to this app's compact
 * density. Full spec: docs/kb/09-button-system.md.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "default", className, type = "button", ...props }, ref) => (
    <motion.button
      ref={ref}
      type={type}
      whileTap={{ transform: "scale(0.97)" }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      className={["wm-btn", `wm-btn--${variant}`, `wm-btn--size-${size}`, className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  ),
);

Button.displayName = "Button";
