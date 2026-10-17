import { describe, expect, it } from "vitest";
import { tokenize } from "./highlight";

describe("tokenize", () => {
  it("tells keys from string values and colors numbers and literals", () => {
    expect(tokenize('{\n  "a": "x\\"y",\n  "n": -1.5e3, "t": true, "z": null\n}')).toEqual([
      { type: "punct", text: "{" },
      { type: "space", text: "\n  " },
      { type: "key", text: '"a"' },
      { type: "punct", text: ":" },
      { type: "space", text: " " },
      { type: "string", text: '"x\\"y"' },
      { type: "punct", text: "," },
      { type: "space", text: "\n  " },
      { type: "key", text: '"n"' },
      { type: "punct", text: ":" },
      { type: "space", text: " " },
      { type: "number", text: "-1.5e3" },
      { type: "punct", text: "," },
      { type: "space", text: " " },
      { type: "key", text: '"t"' },
      { type: "punct", text: ":" },
      { type: "space", text: " " },
      { type: "literal", text: "true" },
      { type: "punct", text: "," },
      { type: "space", text: " " },
      { type: "key", text: '"z"' },
      { type: "punct", text: ":" },
      { type: "space", text: " " },
      { type: "literal", text: "null" },
      { type: "space", text: "\n" },
      { type: "punct", text: "}" },
    ]);
  });

  it("reproduces the input exactly when joined", () => {
    const text = '[1,{"k":["v",false]}]';
    expect(tokenize(text).map((t) => t.text).join("")).toBe(text);
  });
});
