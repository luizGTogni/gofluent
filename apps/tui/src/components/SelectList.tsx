import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

export interface SelectListItem<T> {
  label: string;
  value: T;
}

export interface SelectListProps<T> {
  items: Array<SelectListItem<T>>;
  /** "single": Enter selects immediately. "multi": Space toggles, Enter confirms the current set. */
  mode?: "single" | "multi";
  minSelected?: number;
  onSelect: (values: T[]) => void;
  /** Caps how many rows render at once (default 10) — a list longer than the terminal's height corrupts Ink's diffing across renders (it assumes no scroll happened), so long lists must scroll within a fixed window instead of printing every row. */
  maxVisible?: number;
}

const DEFAULT_MAX_VISIBLE = 10;

/** Minimal keyboard-driven list picker shared by onboarding/placement/home menus — no extra Ink deps. */
export function SelectList<T>({ items, mode = "single", minSelected = 1, onSelect, maxVisible = DEFAULT_MAX_VISIBLE }: SelectListProps<T>): React.JSX.Element {
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useInput((input, key) => {
    if (key.upArrow) setCursor((c) => Math.max(0, c - 1));
    else if (key.downArrow) setCursor((c) => Math.min(items.length - 1, c + 1));
    else if (mode === "multi" && input === " ") {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(cursor)) next.delete(cursor);
        else next.add(cursor);
        return next;
      });
    } else if (key.return) {
      if (mode === "single") {
        const item = items[cursor];
        if (item) onSelect([item.value]);
      } else if (selected.size >= minSelected) {
        onSelect([...selected].sort((a, b) => a - b).map((i) => items[i]).filter((i): i is SelectListItem<T> => i !== undefined).map((i) => i.value));
      }
    }
  });

  const windowStart = Math.max(0, Math.min(cursor - Math.floor(maxVisible / 2), items.length - maxVisible));
  const windowEnd = Math.min(items.length, windowStart + maxVisible);
  const hiddenAbove = windowStart;
  const hiddenBelow = items.length - windowEnd;

  return (
    <Box flexDirection="column">
      {hiddenAbove > 0 && <Text dimColor>↑ {hiddenAbove} more</Text>}
      {items.slice(windowStart, windowEnd).map((item, offset) => {
        const index = windowStart + offset;
        const isCursor = index === cursor;
        const isChecked = mode === "multi" && selected.has(index);
        const marker = mode === "multi" ? (isChecked ? "[x]" : "[ ]") : isCursor ? ">" : " ";
        return (
          <Text key={index} {...(isCursor ? { color: "cyan" as const } : {})}>
            {marker} {item.label}
          </Text>
        );
      })}
      {hiddenBelow > 0 && <Text dimColor>↓ {hiddenBelow} more</Text>}
      {mode === "multi" && <Text dimColor>Space to toggle, Enter to confirm (min {minSelected}).</Text>}
    </Box>
  );
}
