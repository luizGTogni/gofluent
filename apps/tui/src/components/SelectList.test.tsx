import { describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import { SelectList } from "./SelectList.js";

async function tick(ms = 20): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

const LONG_LIST = Array.from({ length: 30 }, (_, i) => ({ label: `item-${i}`, value: i }));

describe("SelectList", () => {
  it("renders every item when the list fits within maxVisible", async () => {
    const items = [{ label: "a", value: "a" }, { label: "b", value: "b" }];
    const { lastFrame, unmount } = render(<SelectList items={items} onSelect={() => {}} />);

    await tick();
    expect(lastFrame()).toContain("a");
    expect(lastFrame()).toContain("b");
    expect(lastFrame()).not.toContain("more");

    unmount();
  });

  it("windows a list longer than maxVisible instead of printing every row (avoids overflowing the terminal height)", async () => {
    const { lastFrame, unmount } = render(<SelectList items={LONG_LIST} onSelect={() => {}} maxVisible={10} />);

    await tick();
    const frame = lastFrame() ?? "";
    const renderedRows = frame.split("\n").filter((line) => /item-\d+/.test(line));
    expect(renderedRows.length).toBe(10);
    expect(frame).toContain("item-0");
    expect(frame).toContain("↓");
    expect(frame).not.toContain("more above");

    unmount();
  });

  it("scrolls the window as the cursor moves down, keeping the cursor visible", async () => {
    const { lastFrame, stdin, unmount } = render(<SelectList items={LONG_LIST} onSelect={() => {}} maxVisible={10} />);

    await tick();
    for (let i = 0; i < 25; i += 1) {
      stdin.write("\x1B[B"); // down arrow
      await tick(5);
    }

    const frame = lastFrame() ?? "";
    expect(frame).toContain("item-25"); // the cursor's row must still be visible
    expect(frame).toContain("↑");

    unmount();
  });

  it("still selects the right item by value after scrolling", async () => {
    const onSelect = vi.fn();
    const { stdin, unmount } = render(<SelectList items={LONG_LIST} onSelect={onSelect} maxVisible={10} />);

    await tick();
    for (let i = 0; i < 20; i += 1) {
      stdin.write("\x1B[B");
      await tick(5);
    }
    stdin.write("\r");
    await tick();

    expect(onSelect).toHaveBeenCalledWith([20]);

    unmount();
  });
});
