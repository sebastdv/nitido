import type { ParseError } from "../lib/parse";

interface Props {
  error: ParseError;
  text: string;
  onGoTo(): void;
}

const WINDOW = 70;

/** The error the way a compiler shows it: the line, a caret under the column, then the fix. */
export function ErrorPanel({ error, text, onGoTo }: Props) {
  const lineText = (text.split("\n")[error.line - 1] ?? "").replace(/\t/g, " ").replace(/\r$/, "");
  // Long lines: show a window around the column.
  const from = Math.max(0, Math.min(error.column - 1 - WINDOW / 2, lineText.length - WINDOW));
  const shown = (from > 0 ? "…" : "") + lineText.slice(from, from + WINDOW) + (from + WINDOW < lineText.length ? "…" : "");
  const caretAt = error.column - 1 - from + (from > 0 ? 1 : 0);
  const number = String(error.line);

  return (
    <div role="alert" className="rounded-lg border border-error/40 bg-error-soft p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-semibold text-error">{error.message}</p>
        <button type="button" onClick={onGoTo} className="text-sm font-medium text-error underline-offset-4 hover:underline">
          Línea {error.line}, columna {error.column}
        </button>
      </div>
      <pre className="code mt-3 overflow-x-auto text-ink">
        <span className="text-muted">{number} │ </span>
        {shown}
        {"\n"}
        <span className="text-muted">{" ".repeat(number.length)} │ </span>
        <span className="font-bold text-error">{" ".repeat(Math.max(0, caretAt))}^</span>
      </pre>
      {error.hint && <p className="mt-3 text-sm">{error.hint}</p>}
    </div>
  );
}
