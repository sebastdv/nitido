import { useDeferredValue, useMemo, useRef } from "react";
import { type Indent, formatJson, minifyJson } from "../lib/format";
import { parseJson } from "../lib/parse";
import { byteSize, usePersistentState } from "../lib/storage";
import { CodeInput, type CodeInputHandle } from "./CodeInput";
import { ErrorPanel } from "./ErrorPanel";
import { Highlighted } from "./Highlighted";
import { ActionButton, CopyButton, OpenFileButton, Segmented, Toggle, download } from "./controls";

const SAMPLE =
  '{"pedido":"PED-10234","cliente":{"nombre":"Laura Gómez","ciudad":"Medellín"},"items":[{"sku":"CAF-500","descripcion":"Café de Huila 500 g","cantidad":2,"precio":28900},{"sku":"PAN-001","descripcion":"Pandebono","cantidad":6,"precio":1800}],"pagado":true,"cupon":null,"id_transaccion":9007199254740993}';

export function FormatView() {
  const [input, setInput] = usePersistentState("nitido:formatear", SAMPLE);
  const [indent, setIndent] = usePersistentState<Indent>("nitido:sangria", 2);
  const [sortKeys, setSortKeys] = usePersistentState("nitido:ordenar", false);
  const [minify, setMinify] = usePersistentState("nitido:minificar", false);
  const editor = useRef<CodeInputHandle>(null);

  // Large documents: keep typing responsive while parsing catches up.
  const text = useDeferredValue(input);
  const result = useMemo(() => parseJson(text), [text]);
  const output = useMemo(() => {
    if (!result.ok) return "";
    return minify ? minifyJson(result.value, { sortKeys }) : formatJson(result.value, { indent, sortKeys });
  }, [result, minify, indent, sortKeys]);
  const isEmpty = !input.trim();

  return (
    <section aria-label="Formatear y validar">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Segmented
          label="Sangría"
          value={indent}
          onChange={(v) => {
            setIndent(v);
            setMinify(false);
          }}
          options={[
            { value: 2, label: "2 espacios" },
            { value: 4, label: "4 espacios" },
            { value: "tab", label: "Tabulador" },
          ]}
        />
        <Toggle label="Minificar" checked={minify} onChange={setMinify} />
        <Toggle label="Ordenar claves" checked={sortKeys} onChange={setSortKeys} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <CodeInput
          ref={editor}
          id="entrada"
          label="Tu JSON"
          value={input}
          onChange={setInput}
          errorLine={!isEmpty && !result.ok ? result.error.line : undefined}
          placeholder="Pega aquí tu JSON o arrastra un archivo .json"
        />
        <Highlighted
          label={minify ? "Minificado" : "Formateado"}
          text={output}
          emptyText={isEmpty ? "Aquí aparece tu JSON formateado." : "Corrige el error para ver el resultado."}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <OpenFileButton onOpen={setInput} />
        <ActionButton onClick={() => setInput("")} disabled={isEmpty}>
          Limpiar
        </ActionButton>
        <span className="flex-1" />
        <ActionButton onClick={() => setInput(output)} disabled={!output}>
          Reemplazar mi JSON con el resultado
        </ActionButton>
        <CopyButton text={output} label="Copiar resultado" disabled={!output} />
        <ActionButton onClick={() => download(output, "nitido.json")} disabled={!output}>
          Descargar
        </ActionButton>
      </div>

      <div className="mt-6" aria-live="polite">
        {isEmpty ? (
          <p className="text-sm text-muted">Pega un JSON para validarlo y formatearlo.</p>
        ) : result.ok ? (
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-semibold text-added">JSON válido.</span>{" "}
              <span className="text-muted">
                {output.split("\n").length} líneas; {byteSize(input)} de entrada, {byteSize(output)} de resultado.
              </span>
            </p>
            {result.warnings.map((w) => (
              <p key={`${w.line}:${w.column}`} className="text-sm text-changed">
                Línea {w.line}, columna {w.column}: {w.message}
              </p>
            ))}
          </div>
        ) : (
          <ErrorPanel error={result.error} text={text} onGoTo={() => editor.current?.focusAt(result.error.offset)} />
        )}
      </div>
    </section>
  );
}
