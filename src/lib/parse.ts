/**
 * JSON parser with precise, friendly errors.
 *
 * Unlike JSON.parse it reports line and column in Spanish, recognizes common mistakes
 * (trailing commas, single quotes, comments…), warns about duplicated keys, and keeps the
 * exact text of every number so big integers are never rounded.
 */

export type JsonNode =
  | { kind: "object"; entries: { key: string; value: JsonNode }[] }
  | { kind: "array"; items: JsonNode[] }
  | { kind: "string"; value: string }
  | { kind: "number"; raw: string }
  | { kind: "boolean"; value: boolean }
  | { kind: "null" };

export interface Position {
  line: number;
  column: number;
}

export interface ParseError extends Position {
  message: string;
  hint?: string;
  offset: number;
}

export interface ParseWarning extends Position {
  message: string;
}

export type ParseResult =
  | { ok: true; value: JsonNode; warnings: ParseWarning[] }
  | { ok: false; error: ParseError };

class Failure extends Error {
  constructor(
    readonly offset: number,
    message: string,
    readonly hint?: string,
  ) {
    super(message);
  }
}

const NUMBER = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
const WORD = /[A-Za-z_$][\w$-]*/y;
const ESCAPES: Record<string, string> = {
  '"': '"',
  "\\": "\\",
  "/": "/",
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
};

export function parseJson(input: string): ParseResult {
  const parser = new Parser(input);
  try {
    const value = parser.parseDocument();
    return { ok: true, value, warnings: parser.warnings };
  } catch (error) {
    if (!(error instanceof Failure)) throw error;
    return {
      ok: false,
      error: {
        message: error.message,
        hint: error.hint,
        offset: error.offset,
        ...positionAt(input, error.offset),
      },
    };
  }
}

export function positionAt(text: string, offset: number): Position {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < offset; i++) {
    if (text[i] === "\n") {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: offset - lineStart + 1 };
}

class Parser {
  private pos = 0;
  readonly warnings: ParseWarning[] = [];
  /** Containers still open, innermost last, to explain an early end. */
  private readonly open: { kind: "objeto" | "arreglo"; offset: number }[] = [];

  constructor(private readonly text: string) {
    if (text.charCodeAt(0) === 0xfeff) this.pos = 1;
  }

  parseDocument(): JsonNode {
    this.skipWhitespace();
    if (this.pos >= this.text.length) throw new Failure(this.pos, "El texto está vacío.");
    const value = this.parseValue();
    this.skipWhitespace();
    if (this.pos < this.text.length) {
      throw new Failure(
        this.pos,
        "Hay contenido después del final del JSON.",
        "Si son varios JSON, envuélvelos en un arreglo: [ ... , ... ].",
      );
    }
    return value;
  }

  private skipWhitespace(): void {
    while (this.pos < this.text.length) {
      const c = this.text[this.pos];
      if (c === " " || c === "\t" || c === "\n" || c === "\r") {
        this.pos++;
      } else if (c === "/" && (this.text[this.pos + 1] === "/" || this.text[this.pos + 1] === "*")) {
        throw new Failure(this.pos, "JSON no permite comentarios.", "Borra el comentario o guárdalo como un campo de texto.");
      } else {
        return;
      }
    }
  }

  private endOfInput(): Failure {
    const innermost = this.open.at(-1);
    const hint = innermost
      ? `Falta cerrar el ${innermost.kind} que empieza en la línea ${positionAt(this.text, innermost.offset).line}.`
      : undefined;
    return new Failure(this.pos, "El JSON termina antes de tiempo.", hint);
  }

  private parseValue(): JsonNode {
    this.skipWhitespace();
    if (this.pos >= this.text.length) throw this.endOfInput();
    const c = this.text[this.pos];
    if (c === "{") return this.parseObject();
    if (c === "[") return this.parseArray();
    if (c === '"') return { kind: "string", value: this.parseString() };
    if (c === "'") throw this.singleQuotes();
    if (c === "-" || (c >= "0" && c <= "9") || c === "." || c === "+") return this.parseNumber();
    return this.parseWord();
  }

  private singleQuotes(): Failure {
    return new Failure(
      this.pos,
      "Las claves y los textos van entre comillas dobles.",
      "Cambia las comillas simples (') por dobles (\").",
    );
  }

  private parseObject(): JsonNode {
    this.open.push({ kind: "objeto", offset: this.pos });
    this.pos++;
    const entries: { key: string; value: JsonNode }[] = [];
    const indexByKey = new Map<string, number>();
    this.skipWhitespace();
    if (this.text[this.pos] === "}") {
      this.pos++;
      this.open.pop();
      return { kind: "object", entries };
    }
    for (;;) {
      this.skipWhitespace();
      const keyOffset = this.pos;
      const key = this.parseKey();
      this.skipWhitespace();
      if (this.pos >= this.text.length) throw this.endOfInput();
      if (this.text[this.pos] !== ":") throw new Failure(this.pos, "Falta ':' después de la clave.");
      this.pos++;
      const value = this.parseValue();

      const existing = indexByKey.get(key);
      if (existing === undefined) {
        indexByKey.set(key, entries.length);
        entries.push({ key, value });
      } else {
        entries[existing] = { key, value };
        this.warnings.push({
          message: `La clave "${key}" está repetida; se usa el último valor.`,
          ...positionAt(this.text, keyOffset),
        });
      }

      if (this.closeOrContinue("}")) break;
    }
    this.open.pop();
    return { kind: "object", entries };
  }

  private parseKey(): string {
    if (this.pos >= this.text.length) throw this.endOfInput();
    const c = this.text[this.pos];
    if (c === '"') return this.parseString();
    if (c === "'") throw this.singleQuotes();
    WORD.lastIndex = this.pos;
    const word = WORD.exec(this.text);
    if (word) {
      throw new Failure(
        this.pos,
        "Las claves deben ir entre comillas dobles.",
        `Escribe "${word[0]}" en lugar de ${word[0]}.`,
      );
    }
    throw new Failure(this.pos, "Se esperaba una clave entre comillas dobles.");
  }

  private parseArray(): JsonNode {
    this.open.push({ kind: "arreglo", offset: this.pos });
    this.pos++;
    const items: JsonNode[] = [];
    this.skipWhitespace();
    if (this.text[this.pos] === "]") {
      this.pos++;
      this.open.pop();
      return { kind: "array", items };
    }
    for (;;) {
      items.push(this.parseValue());
      if (this.closeOrContinue("]")) break;
    }
    this.open.pop();
    return { kind: "array", items };
  }

  /** After an element: true when the container closes, false when a comma continues it. */
  private closeOrContinue(close: "}" | "]"): boolean {
    this.skipWhitespace();
    if (this.pos >= this.text.length) throw this.endOfInput();
    const c = this.text[this.pos];
    if (c === close) {
      this.pos++;
      return true;
    }
    if (c === ",") {
      const commaOffset = this.pos;
      this.pos++;
      this.skipWhitespace();
      if (this.text[this.pos] === close) {
        throw new Failure(
          commaOffset,
          `Sobra una coma antes de '${close}'.`,
          "JSON no permite una coma después del último elemento.",
        );
      }
      return false;
    }
    if (c === "}" || c === "]") {
      throw new Failure(this.pos, `Se esperaba '${close}' para cerrar, pero aparece '${c}'.`);
    }
    throw new Failure(this.pos, "Falta una coma entre los elementos.");
  }

  private parseString(): string {
    const start = this.pos;
    this.pos++;
    let out = "";
    for (;;) {
      if (this.pos >= this.text.length) {
        throw new Failure(start, "Falta cerrar las comillas de este texto.");
      }
      const c = this.text[this.pos];
      if (c === '"') {
        this.pos++;
        return out;
      }
      if (c === "\n" || c === "\r") {
        throw new Failure(
          this.pos,
          "Un texto no puede tener saltos de línea.",
          "Escribe \\n para representar un salto de línea.",
        );
      }
      if (c < " ") {
        throw new Failure(this.pos, "Un texto no puede tener caracteres de control.", "Usa su secuencia de escape, por ejemplo \\t.");
      }
      if (c === "\\") {
        const next = this.text[this.pos + 1];
        if (next === "u") {
          const hex = this.text.slice(this.pos + 2, this.pos + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
            throw new Failure(this.pos, "Secuencia \\u no válida: necesita 4 dígitos hexadecimales.");
          }
          out += String.fromCharCode(parseInt(hex, 16));
          this.pos += 6;
          continue;
        }
        if (next !== undefined && next in ESCAPES) {
          out += ESCAPES[next];
          this.pos += 2;
          continue;
        }
        throw new Failure(this.pos, `Secuencia de escape no válida: \\${next ?? ""}.`);
      }
      out += c;
      this.pos++;
    }
  }

  private parseNumber(): JsonNode {
    const start = this.pos;
    NUMBER.lastIndex = start;
    const match = NUMBER.exec(this.text);
    const after = match ? this.text[start + match[0].length] : undefined;
    if (!match || (after !== undefined && /[\d.eE+\-]/.test(after))) {
      throw new Failure(start, "Número no válido.", "Ejemplos válidos: 42, -3.5, 1e6. Sin ceros a la izquierda ni signo +.");
    }
    this.pos += match[0].length;
    return { kind: "number", raw: match[0] };
  }

  private parseWord(): JsonNode {
    WORD.lastIndex = this.pos;
    const match = WORD.exec(this.text);
    if (!match) {
      throw new Failure(this.pos, `Carácter inesperado: '${this.text[this.pos]}'.`);
    }
    const word = match[0];
    if (word === "true" || word === "false") {
      this.pos += word.length;
      return { kind: "boolean", value: word === "true" };
    }
    if (word === "null") {
      this.pos += 4;
      return { kind: "null" };
    }
    const lower = word.toLowerCase();
    const hint =
      lower === "true" || lower === "false" || lower === "null" || lower === "none" || lower === "nil"
        ? "Usa true, false o null, en minúsculas."
        : lower === "undefined" || lower === "nan" || lower === "infinity"
          ? "JSON no tiene undefined, NaN ni Infinity; usa null."
          : "Si es un texto, ponlo entre comillas dobles.";
    throw new Failure(this.pos, `'${word}' no es un valor JSON.`, hint);
  }
}
