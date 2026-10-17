import { minifyJson } from "./format";
import type { JsonNode } from "./parse";

export type Change =
  | { kind: "added"; path: string; after: string }
  | { kind: "removed"; path: string; before: string }
  | { kind: "changed"; path: string; before: string; after: string };

type Segment = string | number;

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const PREVIEW_LENGTH = 60;

export function jsonPath(segments: Segment[]): string {
  return segments.reduce<string>((path, s) => {
    if (typeof s === "number") return `${path}[${s}]`;
    return IDENTIFIER.test(s) ? `${path}.${s}` : `${path}[${JSON.stringify(s)}]`;
  }, "$");
}

function preview(node: JsonNode): string {
  const text = minifyJson(node);
  return text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH)}…` : text;
}

/**
 * Exact canonical form of a JSON number: "1.0", "1e0" and "1" all become "1e0", while
 * 12345678901234567890 and 12345678901234567891 stay different (no floating point involved).
 */
export function canonicalNumber(raw: string): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(raw);
  if (!match) return raw;
  const [, sign, int, frac = "", exp = "0"] = match;
  let digits = (int + frac).replace(/^0+/, "");
  let exponent = Number(exp) - frac.length;
  if (!digits) return "0";
  const trailing = digits.length - digits.replace(/0+$/, "").length;
  digits = digits.slice(0, digits.length - trailing);
  exponent += trailing;
  return `${sign}${digits}e${exponent}`;
}

function sameScalar(a: JsonNode, b: JsonNode): boolean {
  if (a.kind === "number" && b.kind === "number") return canonicalNumber(a.raw) === canonicalNumber(b.raw);
  if (a.kind === "string" && b.kind === "string") return a.value === b.value;
  if (a.kind === "boolean" && b.kind === "boolean") return a.value === b.value;
  return a.kind === "null" && b.kind === "null";
}

/** Changes from `a` to `b`, by path. Object keys are compared regardless of order. */
export function diffJson(a: JsonNode, b: JsonNode): Change[] {
  const changes: Change[] = [];
  const walk = (x: JsonNode, y: JsonNode, path: Segment[]) => {
    if (x.kind === "object" && y.kind === "object") {
      const right = new Map(y.entries.map((e) => [e.key, e.value]));
      const leftKeys = new Set(x.entries.map((e) => e.key));
      for (const { key, value } of x.entries) {
        const other = right.get(key);
        if (other === undefined) {
          changes.push({ kind: "removed", path: jsonPath([...path, key]), before: preview(value) });
        } else {
          walk(value, other, [...path, key]);
        }
      }
      for (const { key, value } of y.entries) {
        if (!leftKeys.has(key)) {
          changes.push({ kind: "added", path: jsonPath([...path, key]), after: preview(value) });
        }
      }
      return;
    }
    if (x.kind === "array" && y.kind === "array") {
      const length = Math.max(x.items.length, y.items.length);
      for (let i = 0; i < length; i++) {
        const left = x.items[i];
        const right = y.items[i];
        if (!right) changes.push({ kind: "removed", path: jsonPath([...path, i]), before: preview(left) });
        else if (!left) changes.push({ kind: "added", path: jsonPath([...path, i]), after: preview(right) });
        else walk(left, right, [...path, i]);
      }
      return;
    }
    if (!sameScalar(x, y)) {
      changes.push({ kind: "changed", path: jsonPath(path), before: preview(x), after: preview(y) });
    }
  };
  walk(a, b, []);
  return changes;
}
