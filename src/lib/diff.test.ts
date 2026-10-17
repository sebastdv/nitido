import { describe, expect, it } from "vitest";
import { diffJson, jsonPath } from "./diff";
import { type JsonNode, parseJson } from "./parse";

function node(text: string): JsonNode {
  const r = parseJson(text);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}

describe("jsonPath", () => {
  it("uses dot notation for identifiers and brackets otherwise", () => {
    expect(jsonPath([])).toBe("$");
    expect(jsonPath(["usuario", "direccion", "ciudad"])).toBe("$.usuario.direccion.ciudad");
    expect(jsonPath(["items", 0, "precio total"])).toBe('$.items[0]["precio total"]');
  });
});

describe("diffJson", () => {
  it("returns nothing for equal documents, whatever the key order", () => {
    expect(diffJson(node('{"a": 1, "b": [1, 2]}'), node('{"b": [1, 2], "a": 1}'))).toEqual([]);
  });

  it("treats equal numbers written differently as equal", () => {
    expect(diffJson(node("[1.0, 1e2]"), node("[1, 100]"))).toEqual([]);
  });

  it("compares big integers exactly", () => {
    expect(diffJson(node("12345678901234567890"), node("12345678901234567891"))).toEqual([
      { kind: "changed", path: "$", before: "12345678901234567890", after: "12345678901234567891" },
    ]);
  });

  it("lists added, removed and changed paths", () => {
    const before = node('{"nombre": "Ana", "edad": 30, "tags": ["a", "b"], "dir": {"ciudad": "Bogotá"}}');
    const after = node('{"nombre": "Ana", "edad": 31, "tags": ["a"], "dir": {"ciudad": "Medellín", "zip": "050001"}, "activo": true}');
    expect(diffJson(before, after)).toEqual([
      { kind: "changed", path: "$.edad", before: "30", after: "31" },
      { kind: "removed", path: "$.tags[1]", before: '"b"' },
      { kind: "changed", path: "$.dir.ciudad", before: '"Bogotá"', after: '"Medellín"' },
      { kind: "added", path: "$.dir.zip", after: '"050001"' },
      { kind: "added", path: "$.activo", after: "true" },
    ]);
  });

  it("reports a type change as a single change with short previews", () => {
    const long = `[${Array.from({ length: 40 }, (_, i) => i).join(",")}]`;
    const changes = diffJson(node(`{"a": ${long}}`), node('{"a": null}'));
    expect(changes).toHaveLength(1);
    const [change] = changes;
    if (change.kind !== "changed") throw new Error("expected a change");
    expect(change.before.endsWith("…")).toBe(true);
    expect(change.before.length).toBeLessThanOrEqual(61);
  });
});
