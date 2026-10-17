import { describe, expect, it } from "vitest";
import { MAX_DIFF_LINES, lineDiff } from "./lines";

describe("lineDiff", () => {
  it("aligns equal lines and pairs replaced ones side by side", () => {
    expect(lineDiff(["a", "b", "c"], ["a", "x", "c"])).toEqual([
      { kind: "same", left: { n: 1, text: "a" }, right: { n: 1, text: "a" } },
      { kind: "changed", left: { n: 2, text: "b" }, right: { n: 2, text: "x" } },
      { kind: "same", left: { n: 3, text: "c" }, right: { n: 3, text: "c" } },
    ]);
  });

  it("shows pure insertions and deletions on one side only", () => {
    expect(lineDiff(["a", "c"], ["a", "b", "c"])).toEqual([
      { kind: "same", left: { n: 1, text: "a" }, right: { n: 1, text: "a" } },
      { kind: "added", right: { n: 2, text: "b" } },
      { kind: "same", left: { n: 2, text: "c" }, right: { n: 3, text: "c" } },
    ]);
    expect(lineDiff(["a", "b"], ["a"])).toEqual([
      { kind: "same", left: { n: 1, text: "a" }, right: { n: 1, text: "a" } },
      { kind: "removed", left: { n: 2, text: "b" } },
    ]);
  });

  it("pairs as many lines as possible when a block changes size", () => {
    expect(lineDiff(["x", "y"], ["p", "q", "r"])).toEqual([
      { kind: "changed", left: { n: 1, text: "x" }, right: { n: 1, text: "p" } },
      { kind: "changed", left: { n: 2, text: "y" }, right: { n: 2, text: "q" } },
      { kind: "added", right: { n: 3, text: "r" } },
    ]);
  });

  it("gives up on huge inputs instead of freezing the page", () => {
    const big = Array.from({ length: MAX_DIFF_LINES + 1 }, (_, i) => String(i));
    expect(lineDiff(big, ["x"])).toBeNull();
  });
});
