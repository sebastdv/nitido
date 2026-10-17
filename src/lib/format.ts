import type { JsonNode } from "./parse";

export type Indent = 2 | 4 | "tab";

export interface FormatOptions {
  indent?: Indent;
  sortKeys?: boolean;
}

function entriesOf(node: Extract<JsonNode, { kind: "object" }>, sortKeys: boolean) {
  return sortKeys ? [...node.entries].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)) : node.entries;
}

function scalar(node: JsonNode): string {
  switch (node.kind) {
    case "string":
      return JSON.stringify(node.value);
    case "number":
      return node.raw; // exact text: big integers are never rounded
    case "boolean":
      return String(node.value);
    case "null":
      return "null";
    default:
      throw new Error("not a scalar");
  }
}

export function formatJson(node: JsonNode, { indent = 2, sortKeys = false }: FormatOptions = {}): string {
  const unit = indent === "tab" ? "\t" : " ".repeat(indent);
  const write = (n: JsonNode, depth: number): string => {
    const inner = unit.repeat(depth + 1);
    const outer = unit.repeat(depth);
    if (n.kind === "object") {
      if (n.entries.length === 0) return "{}";
      const body = entriesOf(n, sortKeys)
        .map((e) => `${inner}${JSON.stringify(e.key)}: ${write(e.value, depth + 1)}`)
        .join(",\n");
      return `{\n${body}\n${outer}}`;
    }
    if (n.kind === "array") {
      if (n.items.length === 0) return "[]";
      return `[\n${n.items.map((i) => inner + write(i, depth + 1)).join(",\n")}\n${outer}]`;
    }
    return scalar(n);
  };
  return write(node, 0);
}

export function minifyJson(node: JsonNode, { sortKeys = false }: Pick<FormatOptions, "sortKeys"> = {}): string {
  if (node.kind === "object") {
    return `{${entriesOf(node, sortKeys)
      .map((e) => `${JSON.stringify(e.key)}:${minifyJson(e.value, { sortKeys })}`)
      .join(",")}}`;
  }
  if (node.kind === "array") {
    return `[${node.items.map((i) => minifyJson(i, { sortKeys })).join(",")}]`;
  }
  return scalar(node);
}
