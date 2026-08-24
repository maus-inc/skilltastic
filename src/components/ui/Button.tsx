import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type MouseEvent,
} from "react";

export type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

export type ButtonSize = "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg";

interface ButtonProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"
  > {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/**
 * The app's button system — a plain-CSS port of Watermelon UI's button
 * (shadcn CVA structure: 6 variants × 6 sizes, focus ring, disabled and
 * aria-invalid states), scaled to this app's compact density. Full spec:
 * docs/kb/09-button-system.md.
 *
 * Pointer clicks play the whole-button press dip (in-out) BEFORE the
 * action runs, so the press is seen; keyboard-activated clicks act
 * instantly (doctrine: keyboard gets no animation).
 */
/** Whether the OS asks for reduced motion — the press dip is invisible then,
 *  so there is nothing to show before the action runs. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "default", className, type = "button", onClick, ...props }, ref) => {
    const [dipping, setDipping] = useState(false);
    const dipTimer = useRef<number | null>(null);

    // a dip in flight when the button unmounts must not fire its action later
    useEffect(
      () => () => {
        if (dipTimer.current !== null) window.clearTimeout(dipTimer.current);
      },
      [],
    );

    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
      if (!onClick || dipping) return;
      // keyboard activation (detail 0) acts instantly; so does a pointer
      // click under reduced motion, where the dip would be invisible
      if (e.detail === 0 || prefersReducedMotion()) {
        onClick(e);
        return;
      }
      setDipping(true);
      dipTimer.current = window.setTimeout(() => {
        dipTimer.current = null;
        setDipping(false);
        onClick(e);
      }, 200);
    };

    return (
      <button
        ref={ref}
        type={type}
        className={
          ["wm-btn", `wm-btn--${variant}`, `wm-btn--size-${size}`, dipping ? "dipping" : "", className]
            .filter(Boolean)
            .join(" ")
        }
        onClick={handleClick}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
