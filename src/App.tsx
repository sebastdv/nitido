import { CompareView } from "./components/CompareView";
import { FormatView } from "./components/FormatView";
import { usePersistentState } from "./lib/storage";

type Mode = "formatear" | "comparar";

const MODES: { value: Mode; label: string }[] = [
  { value: "formatear", label: "Formatear y validar" },
  { value: "comparar", label: "Comparar" },
];

export function App() {
  const [mode, setMode] = usePersistentState<Mode>("nitido:modo", "formatear");

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="code text-lg font-semibold">
            <span className="text-accent">{"{"}</span> nitido <span className="text-accent">{"}"}</span>
          </p>
          <h1 className="mt-3 max-w-[32ch] text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
            Formatea, valida y compara JSON sin que salga de tu navegador.
          </h1>
        </div>
        <div role="tablist" aria-label="Herramienta" className="flex gap-1 rounded-lg border border-line bg-panel p-1">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              role="tab"
              aria-selected={mode === m.value}
              aria-controls="herramienta"
              onClick={() => setMode(m.value)}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                mode === m.value ? "bg-accent text-on-accent" : "text-muted hover:text-ink"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </header>

      <main id="herramienta" role="tabpanel" className="mt-10">
        {mode === "formatear" ? <FormatView /> : <CompareView />}
      </main>

      <footer className="mt-16 border-t border-line pt-6 text-sm text-muted">
        <p className="max-w-[70ch]">
          Todo se procesa en tu navegador: tu JSON no se envía a ningún servidor. Los números se conservan tal cual, así
          que los enteros grandes (como los ID de 19 dígitos) no se redondean.
        </p>
        <p className="mt-3">
          Hecho por{" "}
          <a href="https://sebastdv.vercel.app" className="underline underline-offset-4 hover:text-ink">
            Sebastián Ardila
          </a>
          . <a href="https://github.com/sebastdv/nitido" className="underline underline-offset-4 hover:text-ink">Código en GitHub</a>.
        </p>
      </footer>
    </div>
  );
}
