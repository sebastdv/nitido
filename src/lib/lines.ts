/** Side-by-side line diff (longest common subsequence). */

export const MAX_DIFF_LINES = 3000;

export interface Line {
  n: number;
  text: string;
}

export type Row =
  | { kind: "same" | "changed"; left: Line; right: Line }
  | { kind: "removed"; left: Line }
  | { kind: "added"; right: Line };

type Op = { kind: "same"; i: number; j: number } | { kind: "removed"; i: number } | { kind: "added"; j: number };

/** null when an input has more than MAX_DIFF_LINES lines (the LCS table would be too big). */
export function lineDiff(a: string[], b: string[]): Row[] | null {
  if (a.length > MAX_DIFF_LINES || b.length > MAX_DIFF_LINES) return null;

  // Common prefix and suffix need no table.
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }

  const n = endA - start;
  const m = endB - start;
  // lcs[i * (m + 1) + j] = LCS length of a[start+i..endA) and b[start+j..endB).
  const lcs = new Uint16Array((n + 1) * (m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i * (m + 1) + j] =
        a[start + i] === b[start + j]
          ? lcs[(i + 1) * (m + 1) + j + 1] + 1
          : Math.max(lcs[(i + 1) * (m + 1) + j], lcs[i * (m + 1) + j + 1]);
    }
  }

  const ops: Op[] = [];
  for (let k = 0; k < start; k++) ops.push({ kind: "same", i: k, j: k });
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[start + i] === b[start + j]) {
      ops.push({ kind: "same", i: start + i, j: start + j });
      i++;
      j++;
    } else if (j >= m || (i < n && lcs[(i + 1) * (m + 1) + j] >= lcs[i * (m + 1) + j + 1])) {
      ops.push({ kind: "removed", i: start + i });
      i++;
    } else {
      ops.push({ kind: "added", j: start + j });
      j++;
    }
  }
  for (let k = 0; k < a.length - endA; k++) ops.push({ kind: "same", i: endA + k, j: endB + k });

  return toRows(ops, a, b);
}

/** Pairs each run of removals with the additions next to it, so replacements line up. */
function toRows(ops: Op[], a: string[], b: string[]): Row[] {
  const rows: Row[] = [];
  const left = (i: number): Line => ({ n: i + 1, text: a[i] });
  const right = (j: number): Line => ({ n: j + 1, text: b[j] });
  let k = 0;
  while (k < ops.length) {
    const op = ops[k];
    if (op.kind === "same") {
      rows.push({ kind: "same", left: left(op.i), right: right(op.j) });
      k++;
      continue;
    }
    const removed: number[] = [];
    const added: number[] = [];
    while (k < ops.length && ops[k].kind !== "same") {
      const o = ops[k];
      if (o.kind === "removed") removed.push(o.i);
      else if (o.kind === "added") added.push(o.j);
      k++;
    }
    const paired = Math.min(removed.length, added.length);
    for (let p = 0; p < paired; p++) {
      rows.push({ kind: "changed", left: left(removed[p]), right: right(added[p]) });
    }
    for (const r of removed.slice(paired)) rows.push({ kind: "removed", left: left(r) });
    for (const ad of added.slice(paired)) rows.push({ kind: "added", right: right(ad) });
  }
  return rows;
}
