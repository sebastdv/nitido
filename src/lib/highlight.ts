/** Splits already-valid JSON into tokens for syntax coloring. */

export type TokenType = "key" | "string" | "number" | "literal" | "punct" | "space";

export interface Token {
  type: TokenType;
  text: string;
}

const PATTERN =
  /("(?:[^"\\]|\\.)*")(?=\s*:)|("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(true|false|null)|([{}[\],:])|(\s+)/gy;

export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while (PATTERN.lastIndex < text.length && (match = PATTERN.exec(text))) {
    const [whole, key, string, number, literal, punct] = match;
    const type: TokenType = key
      ? "key"
      : string
        ? "string"
        : number
          ? "number"
          : literal
            ? "literal"
            : punct
              ? "punct"
              : "space";
    tokens.push({ type, text: whole });
  }
  // Anything the pattern does not know (should not happen for formatted output) stays plain.
  if (PATTERN.lastIndex < text.length) tokens.push({ type: "space", text: text.slice(PATTERN.lastIndex) });
  return tokens;
}
