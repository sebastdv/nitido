import { describe, expect, it } from "vitest";
import { formatJson, minifyJson } from "./format";
import { type JsonNode, parseJson } from "./parse";

function node(text: string): JsonNode {
  const r = parseJson(text);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}

const SAMPLE = '{"b": [1, {"y": null, "x": "a\\"b"}], "a": {}, "c": [], "big": 12345678901234567890}';

describe("formatJson", () => {
  it("indents with two spaces by default and keeps key order", () => {
    expect(formatJson(node(SAMPLE))).toBe(
      [
        "{",
        '  "b": [',
        "    1,",
        "    {",
        '      "y": null,',
        '      "x": "a\\"b"',
        "    }",
        "  ],",
        '  "a": {},',
        '  "c": [],',
        '  "big": 12345678901234567890',
        "}",
      ].join("\n"),
    );
  });

  it("supports four spaces, tabs and sorted keys", () => {
    expect(formatJson(node('{"b": 1, "a": [true]}'), { indent: 4, sortKeys: true })).toBe(
      '{\n    "a": [\n        true\n    ],\n    "b": 1\n}',
    );
    expect(formatJson(node('{"a": 1}'), { indent: "tab" })).toBe('{\n\t"a": 1\n}');
  });

  it("formats scalars on their own", () => {
    expect(formatJson(node('"hola"'))).toBe('"hola"');
    expect(formatJson(node("-1.5e3"))).toBe("-1.5e3");
  });
});

describe("minifyJson", () => {
  it("removes all whitespace outside strings", () => {
    expect(minifyJson(node('{ "a" : [ 1 , "x y" ] , "b" : null }'))).toBe('{"a":[1,"x y"],"b":null}');
  });

  it("can sort keys recursively", () => {
    expect(minifyJson(node('{"b": {"d": 1, "c": 2}, "a": 0}'), { sortKeys: true })).toBe(
      '{"a":0,"b":{"c":2,"d":1}}',
    );
  });

  it("escapes control characters and keeps unicode", () => {
    expect(minifyJson(node('"tab\\t ñ \\u0001"'))).toBe('"tab\\t ñ \\u0001"');
  });
});
