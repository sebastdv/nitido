import { tokenize } from "../lib/highlight";

/** Read-only, syntax-colored JSON with line numbers. */
export function Highlighted({ text, label, emptyText }: { text: string; label: string; emptyText: string }) {
  const lines = text.split("\n");
  if (!text) {
    return (
      <div className="flex min-w-0 flex-col">
        <p className="mb-2 text-sm font-medium">{label}</p>
        <div className="flex h-[26rem] items-center justify-center rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">
          {emptyText}
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-w-0 flex-col">
      <p className="mb-2 text-sm font-medium" id="resultado-titulo">
        {label}
      </p>
      <div
        className="code flex h-[26rem] overflow-auto rounded-lg border border-line bg-panel"
        role="region"
        aria-labelledby="resultado-titulo"
        tabIndex={0}
      >
        <div aria-hidden="true" className="sticky left-0 w-12 shrink-0 select-none border-r border-line bg-panel py-3 text-right text-muted/70">
          {lines.map((_, i) => (
            <div key={i} className="pr-2">
              {i + 1}
            </div>
          ))}
        </div>
        <pre className="flex-1 px-3 py-3">
          {tokenize(text).map((t, i) =>
            t.type === "space" ? t.text : (
              <span key={i} className={`tok-${t.type}`}>
                {t.text}
              </span>
            ),
          )}
        </pre>
      </div>
    </div>
  );
}
