import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { CheckIcon, SearchIcon } from "./icons";

export interface CommandEntry {
  id: string;
  label: string;
  /** Entries render grouped, in order of each group's first appearance. */
  group?: string;
  /** Marks the entry as the currently-active selection (check at right). */
  checked?: boolean;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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

  const select = (entry: CommandEntry) => {
    onClose();
    entry.action();
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
      if (entry) select(entry);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <motion.div
      className="cmd"
      role="listbox"
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.1 } }}
      transition={{ type: "spring", stiffness: 560, damping: 34, mass: 0.7 }}
      style={{ transformOrigin: "top right" }}
      onKeyDown={onKeyDown}
    >
      <div className="cmd-input-row">
        <SearchIcon size={13} />
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
                <div
                  key={entry.id}
                  role="option"
                  aria-selected={entry.checked ?? false}
                  data-highlighted={index === highlight}
                  data-checked={entry.checked ?? false}
                  className="cmd-item"
                  onMouseEnter={() => setHighlight(index)}
                  onMouseDown={(e) => e.preventDefault()} // keep input focus
                  onClick={() => select(entry)}
                >
                  <span className="cmd-item-label">{entry.label}</span>
                  {entry.checked && <CheckIcon size={13} />}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
