import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";

/** Strong ease-out (animations.dev): dropdowns tween 150–250ms out of
 *  their trigger — springs are for gestures, not menus. */
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
import { CheckIcon, SearchIcon } from "./icons";

export interface CommandEntry {
  id: string;
  label: string;
  /** Entries render grouped, in order of each group's first appearance. */
  group?: string;
  /** Marks the entry as the currently-active selection (check at right). */
  checked?: boolean;
  /** Leading mark — an icon component or an <img>. */
  icon?: ReactNode;
  /** Faint type label at the back of the row (e.g. "tool"). */
  hint?: string;
  /** Trailing affordance (e.g. the github redirect arrow). */
  trailing?: ReactNode;
  action: () => void;
}

interface CommandMenuProps {
  entries: CommandEntry[];
  placeholder?: string;
  emptyText?: string;
  onClose: () => void;
}

/**
 * Command popover — a plain-CSS + motion port of Watermelon UI's
 * combobox-1 (Popover + Command: search input, grouped list, empty
 * state, checked item). The trigger stays whatever button opened it;
 * this is only the floating panel. Full keyboard support: type to
 * filter, ↑/↓ to move, Enter selects, Escape closes.
 */
export function CommandMenu({
  entries,
  placeholder = "search…",
  emptyText = "no results.",
  onClose,
}: CommandMenuProps) {
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [pressedId, setPressedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dipTimer = useRef<number | null>(null);

  // a dip in flight when the menu closes must not fire its action later
  useEffect(
    () => () => {
      if (dipTimer.current !== null) window.clearTimeout(dipTimer.current);
    },
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? entries.filter((e) => e.label.toLowerCase().includes(q)) : entries;
  }, [entries, query]);

  const groups = useMemo(() => {
    const order: string[] = [];
    const byGroup = new Map<string, CommandEntry[]>();
    for (const entry of filtered) {
      const g = entry.group ?? "";
      if (!byGroup.has(g)) {
        byGroup.set(g, []);
        order.push(g);
      }
      byGroup.get(g)!.push(entry);
    }
    return order.map((g) => ({ name: g, items: byGroup.get(g)! }));
  }, [filtered]);

  useEffect(() => inputRef.current?.focus(), []);
  useEffect(() => setHighlight(0), [query]);

  // keep the highlighted row in view while arrowing
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-highlighted="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  const select = (entry: CommandEntry, immediate = false) => {
    if (pressedId) return; // one dip at a time
    // pointer clicks play the press dip in-out FIRST so the user sees the
    // animation before the action lands; keyboard stays instant (doctrine)
    if (immediate) {
      onClose();
      entry.action();
      return;
    }
    setPressedId(entry.id);
    // a closing menu (Escape, click-away) during the dip must never run the
    // action — the timer is cleared on unmount, so it can't fire stale
    dipTimer.current = window.setTimeout(() => {
      dipTimer.current = null;
      onClose();
      entry.action();
    }, 220);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const entry = filtered[highlight];
      if (entry) select(entry, true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <motion.div
      className="cmd"
      role="listbox"
      initial={{ opacity: 0, transform: "scale(0.95) translateY(-6px)" }}
      animate={{ opacity: 1, transform: "scale(1) translateY(0px)" }}
      exit={{
        opacity: 0,
        transform: "scale(0.96) translateY(-4px)",
        transition: { duration: 0.12, ease: EASE_OUT },
      }}
      transition={{ duration: 0.18, ease: EASE_OUT }}
      style={{ transformOrigin: "top right" }}
      onKeyDown={onKeyDown}
    >
      <div className="cmd-input-row">
        <SearchIcon size={12} />
        <input
          ref={inputRef}
          className="cmd-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={placeholder}
        />
      </div>

      <div className="cmd-list" ref={listRef}>
        {filtered.length === 0 && <div className="cmd-empty">{emptyText}</div>}
        {groups.map((group) => (
          <div key={group.name || "_"} className="cmd-group">
            {group.name && <div className="cmd-group-label">{group.name}</div>}
            {group.items.map((entry) => {
              const index = filtered.indexOf(entry);
              return (
                <motion.div
                  key={entry.id}
                  role="option"
                  aria-selected={entry.checked ?? false}
                  data-highlighted={index === highlight}
                  data-checked={entry.checked ?? false}
                  className={`cmd-item ${pressedId === entry.id ? "pressed" : ""}`}
                  initial={{ opacity: 0, transform: "translateY(-3px)" }}
                  animate={{ opacity: 1, transform: "translateY(0px)" }}
                  transition={{
                    duration: 0.15,
                    ease: EASE_OUT,
                    delay: Math.min(index * 0.015, 0.12),
                  }}
                  onMouseEnter={() => setHighlight(index)}
                  onMouseDown={(e) => e.preventDefault()} // keep input focus
                  onClick={() => select(entry)}
                >
                  <span className="cmd-item-inner">
                    {entry.icon && <span className="cmd-item-icon">{entry.icon}</span>}
                    <span className="cmd-item-label">{entry.label}</span>
                    {entry.hint && !entry.checked && (
                      <span className="cmd-item-hint">{entry.hint}</span>
                    )}
                    {entry.trailing}
                    {entry.checked && <CheckIcon size={12} />}
                  </span>
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
