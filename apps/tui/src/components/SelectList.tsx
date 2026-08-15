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
}

/** Minimal keyboard-driven list picker shared by onboarding/placement/home menus — no extra Ink deps. */
export function SelectList<T>({ items, mode = "single", minSelected = 1, onSelect }: SelectListProps<T>): React.JSX.Element {
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

  return (
    <Box flexDirection="column">
      {items.map((item, index) => {
        const isCursor = index === cursor;
        const isChecked = mode === "multi" && selected.has(index);
        const marker = mode === "multi" ? (isChecked ? "[x]" : "[ ]") : isCursor ? ">" : " ";
        return (
          <Text key={item.label} {...(isCursor ? { color: "cyan" as const } : {})}>
            {marker} {item.label}
          </Text>
        );
      })}
      {mode === "multi" && <Text dimColor>Space to toggle, Enter to confirm (min {minSelected}).</Text>}
    </Box>
  );
}
