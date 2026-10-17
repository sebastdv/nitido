import { useDeferredValue, useMemo, useRef } from "react";
import { type Change, diffJson } from "../lib/diff";
import { formatJson } from "../lib/format";
import { type Row, lineDiff } from "../lib/lines";
import { type ParseResult, parseJson } from "../lib/parse";
import { usePersistentState } from "../lib/storage";
import { CodeInput, type CodeInputHandle } from "./CodeInput";
import { ActionButton } from "./controls";

const BEFORE = `{
  "pedido": "PED-10234",
  "cliente": { "nombre": "Laura Gómez", "ciudad": "Medellín" },
  "items": [
    { "sku": "CAF-500", "cantidad": 2, "precio": 28900 },
    { "sku": "PAN-001", "cantidad": 6, "precio": 1800 }
  ],
  "pagado": false
}`;

const AFTER = `{
  "pedido": "PED-10234",
  "pagado": true,
  "cliente": { "nombre": "Laura Gómez", "ciudad": "Envigado" },
  "items": [
    { "sku": "CAF-500", "cantidad": 3, "precio": 28900 }
  ],
  "guia": "SERV-55871"
}`;

const plural = (n: number, word: string) => `${n} ${n === 1 ? word : `${word}s`}`;

const KIND_LABEL: Record<Change["kind"], string> = { added: "Añadido", removed: "Eliminado", changed: "Modificado" };
const KIND_CLASS: Record<Change["kind"], string> = {
  added: "bg-added-soft text-added",
  removed: "bg-removed-soft text-removed",
  changed: "bg-changed-soft text-changed",
};

function Status({ result, empty, onGoTo }: { result: ParseResult; empty: boolean; onGoTo(offset: number): void }) {
  if (empty) return <p className="mt-2 text-sm text-muted">Pega un JSON.</p>;
  if (result.ok) return <p className="mt-2 text-sm font-medium text-added">JSON válido.</p>;
  return (
    <p className="mt-2 text-sm text-error">
      {result.error.message}{" "}
      <button type="button" className="font-medium underline underline-offset-4" onClick={() => onGoTo(result.error.offset)}>
        Línea {result.error.line}, columna {result.error.column}
      </button>
    </p>
  );
}

export function CompareView() {
  const [left, setLeft] = usePersistentState("nitido:antes", BEFORE);
  const [right, setRight] = usePersistentState("nitido:despues", AFTER);
  const leftEditor = useRef<CodeInputHandle>(null);
  const rightEditor = useRef<CodeInputHandle>(null);
  const a = useDeferredValue(left);
  const b = useDeferredValue(right);
  const leftResult = useMemo(() => parseJson(a), [a]);
  const rightResult = useMemo(() => parseJson(b), [b]);

  const comparison = useMemo(() => {
    if (!leftResult.ok || !rightResult.ok) return null;
    const changes = diffJson(leftResult.value, rightResult.value);
    // Sorted keys: reordering alone never shows up as a difference.
    const leftLines = formatJson(leftResult.value, { sortKeys: true }).split("\n");
    const rightLines = formatJson(rightResult.value, { sortKeys: true }).split("\n");
    return { changes, rows: lineDiff(leftLines, rightLines) };
  }, [leftResult, rightResult]);

  const counts = comparison?.changes.reduce(
    (acc, c) => ({ ...acc, [c.kind]: acc[c.kind] + 1 }),
    { added: 0, removed: 0, changed: 0 },
  );

  return (
    <section aria-label="Comparar dos JSON">
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <CodeInput
            ref={leftEditor}
            id="antes"
            label="Antes"
            value={left}
            onChange={setLeft}
            errorLine={left.trim() && !leftResult.ok ? leftResult.error.line : undefined}
          />
          <Status result={leftResult} empty={!left.trim()} onGoTo={(o) => leftEditor.current?.focusAt(o)} />
        </div>
        <div>
          <CodeInput
            ref={rightEditor}
            id="despues"
            label="Después"
            value={right}
            onChange={setRight}
            errorLine={right.trim() && !rightResult.ok ? rightResult.error.line : undefined}
          />
          <Status result={rightResult} empty={!right.trim()} onGoTo={(o) => rightEditor.current?.focusAt(o)} />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <ActionButton
          onClick={() => {
            setLeft(right);
            setRight(left);
          }}
        >
          Intercambiar
        </ActionButton>
      </div>

      {comparison && counts && (
        <div className="mt-10 space-y-10" aria-live="polite">
          <div>
            <h2 className="text-lg font-semibold">
              {comparison.changes.length === 0
                ? "Son iguales."
                : `${comparison.changes.length} ${comparison.changes.length === 1 ? "cambio" : "cambios"}`}
            </h2>
            {comparison.changes.length > 0 && (
              <p className="mt-1 text-sm text-muted">
                {plural(counts.changed, "modificado")}, {plural(counts.added, "añadido")} y{" "}
                {plural(counts.removed, "eliminado")}. El orden de las claves no cuenta como cambio.
              </p>
            )}
          </div>

          {comparison.changes.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-line bg-panel">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Cambios por ruta</caption>
                <thead className="border-b border-line text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-medium">Ruta</th>
                    <th scope="col" className="px-4 py-2 font-medium">Cambio</th>
                    <th scope="col" className="px-4 py-2 font-medium">Antes</th>
                    <th scope="col" className="px-4 py-2 font-medium">Después</th>
                  </tr>
                </thead>
                <tbody className="code">
                  {comparison.changes.map((c) => (
                    <tr key={c.path} className="border-b border-line last:border-0">
                      <td className="px-4 py-2">{c.path}</td>
                      <td className="px-4 py-2 font-sans">
                        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${KIND_CLASS[c.kind]}`}>
                          {KIND_LABEL[c.kind]}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-muted">{"before" in c ? c.before : ""}</td>
                      <td className="px-4 py-2">{"after" in c ? c.after : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {comparison.changes.length > 0 &&
            (comparison.rows ? (
              <SideBySide rows={comparison.rows} />
            ) : (
              <p className="text-sm text-muted">
                Los documentos son demasiado largos para la vista línea a línea; la lista de cambios de arriba está
                completa.
              </p>
            ))}
        </div>
      )}
    </section>
  );
}

const ROW_CLASS = {
  same: ["", ""],
  changed: ["bg-changed-soft", "bg-changed-soft"],
  removed: ["bg-removed-soft", ""],
  added: ["", "bg-added-soft"],
} as const;

function SideBySide({ rows }: { rows: Row[] }) {
  return (
    <div>
      <h3 className="mb-3 font-semibold">Línea a línea</h3>
      <div className="code overflow-x-auto rounded-lg border border-line bg-panel py-2">
        <table className="w-full border-collapse">
          <caption className="sr-only">Comparación línea a línea, con las claves ordenadas</caption>
          <tbody>
            {rows.map((row, i) => {
              const [leftClass, rightClass] = ROW_CLASS[row.kind];
              const leftLine = "left" in row ? row.left : undefined;
              const rightLine = "right" in row ? row.right : undefined;
              return (
                <tr key={i}>
                  <td className={`w-10 select-none pr-2 text-right text-muted/70 ${leftClass}`}>{leftLine?.n}</td>
                  <td className={`w-1/2 whitespace-pre px-2 ${leftClass}`}>{leftLine?.text}</td>
                  <td className={`w-10 select-none border-l border-line pr-2 text-right text-muted/70 ${rightClass}`}>
                    {rightLine?.n}
                  </td>
                  <td className={`w-1/2 whitespace-pre px-2 ${rightClass}`}>{rightLine?.text}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
