import { useCallback, useState } from "react";

/**
 * A user-dragged ordering (array of ids), persisted per list in
 * localStorage — a pure UI preference, same policy as pinned tools.
 */
export function useManualOrder(storageKey: string) {
  const [order, setOrder] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const save = useCallback(
    (ids: string[]) => {
      setOrder(ids);
      try {
        localStorage.setItem(storageKey, JSON.stringify(ids));
      } catch {
        /* private mode etc — order just won't persist */
      }
    },
    [storageKey],
  );

  return [order, save] as const;
}
