import { describe, expect, it } from "vitest";
import { type JsonNode, parseJson } from "./parse";

function ok(text: string): JsonNode {
  const result = parseJson(text);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function err(text: string) {
  const result = parseJson(text);
  if (result.ok) throw new Error("expected an error");
  return result.error;
}

describe("parseJson: valid input", () => {
  it("parses every kind of value", () => {
    expect(ok('{"a": [1, "x", true, false, null, {}]}')).toEqual({
      kind: "object",
      entries: [
        {
          key: "a",
          value: {
            kind: "array",
            items: [
              { kind: "number", raw: "1" },
              { kind: "string", value: "x" },
              { kind: "boolean", value: true },
              { kind: "boolean", value: false },
              { kind: "null" },
              { kind: "object", entries: [] },
            ],
          },
        },
      ],
    });
  });

  it("keeps the exact text of numbers, even beyond double precision", () => {
    expect(ok("12345678901234567890")).toEqual({ kind: "number", raw: "12345678901234567890" });
    expect(ok("-0.000001e+10")).toEqual({ kind: "number", raw: "-0.000001e+10" });
  });

  it("decodes escapes and unicode, including surrogate pairs", () => {
    expect(ok(String.raw`"línea\n\t\"cita\" é 😀 \/"`)).toEqual({
      kind: "string",
      value: 'línea\n\t"cita" é 😀 /',
    });
  });

  it("ignores surrounding whitespace and a leading BOM", () => {
    expect(ok("﻿ \n [ ] \n")).toEqual({ kind: "array", items: [] });
  });

  it("keeps the last value of a duplicated key and warns where it is", () => {
    const result = parseJson('{\n  "a": 1,\n  "a": 2\n}');
    expect(result.ok && result.value).toEqual({
      kind: "object",
      entries: [{ key: "a", value: { kind: "number", raw: "2" } }],
    });
    expect(result.ok && result.warnings).toEqual([
      { message: 'La clave "a" está repetida; se usa el último valor.', line: 3, column: 3 },
    ]);
  });
});

describe("parseJson: errors with position and hints", () => {
  it.each([
    ["", "El texto está vacío.", 1, 1],
    ["   \n  ", "El texto está vacío.", 2, 3],
  ])("empty input %j", (text, message, line, column) => {
    expect(err(text)).toMatchObject({ message, line, column });
  });

  it("points at a trailing comma", () => {
    expect(err('{\n  "a": 1,\n}')).toMatchObject({
      message: "Sobra una coma antes de '}'.",
      hint: "JSON no permite una coma después del último elemento.",
      line: 2,
      column: 9,
    });
    expect(err("[1, 2,]")).toMatchObject({ message: "Sobra una coma antes de ']'.", line: 1, column: 6 });
  });

  it("explains single quotes and unquoted keys", () => {
    expect(err("{'a': 1}")).toMatchObject({
      message: "Las claves y los textos van entre comillas dobles.",
      hint: "Cambia las comillas simples (') por dobles (\").",
      line: 1,
      column: 2,
    });
    expect(err("{a: 1}")).toMatchObject({
      message: "Las claves deben ir entre comillas dobles.",
      hint: 'Escribe "a" en lugar de a.',
      column: 2,
    });
  });

  it("explains comments", () => {
    expect(err('{\n  // nombre\n  "a": 1\n}')).toMatchObject({
      message: "JSON no permite comentarios.",
      line: 2,
      column: 3,
    });
  });

  it("finds a missing comma or colon", () => {
    expect(err('{"a": 1 "b": 2}')).toMatchObject({
      message: "Falta una coma entre los elementos.",
      column: 9,
    });
    expect(err("[1 2]")).toMatchObject({ message: "Falta una coma entre los elementos.", column: 4 });
    expect(err('{"a" 1}')).toMatchObject({ message: "Falta ':' después de la clave.", column: 6 });
  });

  it("explains invalid literals", () => {
    expect(err('{"ok": True}')).toMatchObject({
      message: "'True' no es un valor JSON.",
      hint: "Usa true, false o null, en minúsculas.",
      column: 8,
    });
    expect(err("[undefined]")).toMatchObject({
      message: "'undefined' no es un valor JSON.",
      hint: "JSON no tiene undefined, NaN ni Infinity; usa null.",
    });
  });

  it("rejects malformed numbers", () => {
    for (const text of ["012", ".5", "1.", "+1", "1e", "-"]) {
      expect(err(text).message, text).toBe("Número no válido.");
    }
  });

  it("explains string problems", () => {
    expect(err('{"a": "sin cerrar}')).toMatchObject({
      message: "Falta cerrar las comillas de este texto.",
      column: 7,
    });
    expect(err('"dos\nlíneas"')).toMatchObject({
      message: "Un texto no puede tener saltos de línea.",
      hint: "Escribe \\n para representar un salto de línea.",
      line: 1,
      column: 5,
    });
    expect(err(String.raw`"mal \x escape"`)).toMatchObject({
      message: "Secuencia de escape no válida: \\x.",
      column: 6,
    });
  });

  it("says which bracket is left open", () => {
    expect(err('{\n  "a": [1, 2\n')).toMatchObject({
      message: "El JSON termina antes de tiempo.",
      hint: "Falta cerrar el arreglo que empieza en la línea 2.",
      line: 3,
      column: 1,
    });
  });

  it("detects content after the end", () => {
    expect(err('{"a": 1}\n{"b": 2}')).toMatchObject({
      message: "Hay contenido después del final del JSON.",
      hint: "Si son varios JSON, envuélvelos en un arreglo: [ ... , ... ].",
      line: 2,
      column: 1,
    });
  });
});
