import { useState, useCallback } from "react";

export interface SelectionState {
  selectionMode: boolean;
  selectedIds: Set<string>;
  count: number;
  isSelected: (id: string) => boolean;
  enterSelection: (initialId?: string) => void;
  exitSelection: () => void;
  toggle: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearAll: () => void;
}

export function useSelection(): SelectionState {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const enterSelection = useCallback((initialId?: string) => {
    setSelectionMode(true);
    if (initialId) {
      setSelectedIds(new Set([initialId]));
    }
  }, []);

  const exitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds],
  );

  return {
    selectionMode,
    selectedIds,
    count: selectedIds.size,
    isSelected,
    enterSelection,
    exitSelection,
    toggle,
    selectAll,
    clearAll,
  };
}
