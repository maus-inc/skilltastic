import type { HTMLAttributes, ReactNode } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Leading mark, rendered in a small rounded tile (badge-16 recipe). */
  icon?: string;
  iconAlt?: string;
  children: ReactNode;
}

/**
 * Outline badge — a plain-CSS port of Watermelon UI's badge-16
 * (shadcn Badge, variant="outline" rounded-md, with a leading image
 * tile and tight left padding). Used for provider marks and scope
 * tags on skill cards.
 */
export function Badge({ icon, iconAlt = "", children, className, ...props }: BadgeProps) {
  return (
    <span
      className={["wm-badge", icon ? "wm-badge--with-icon" : "", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {icon && (
        <span className="wm-badge-tile">
          <img src={icon} alt={iconAlt} loading="lazy" />
        </span>
      )}
      {children}
    </span>
  );
}
