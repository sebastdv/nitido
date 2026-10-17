import { forwardRef, useImperativeHandle, useRef, useState } from "react";

export interface CodeInputHandle {
  /** Puts the cursor at `offset` and scrolls it into view. */
  focusAt(offset: number): void;
}

interface Props {
  id: string;
  label: string;
  value: string;
  onChange(value: string): void;
  /** 1-based line to mark as wrong. */
  errorLine?: number;
  placeholder?: string;
}

const LINE_HEIGHT = 22;
const PADDING = 12;

export const CodeInput = forwardRef<CodeInputHandle, Props>(function CodeInput(
  { id, label, value, onChange, errorLine, placeholder },
  ref,
) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [scroll, setScroll] = useState({ top: 0 });
  const [dragging, setDragging] = useState(false);
  const lineCount = Math.max(1, value.split("\n").length);

  useImperativeHandle(ref, () => ({
    focusAt(offset) {
      const el = textarea.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(offset, offset + 1);
      const line = value.slice(0, offset).split("\n").length;
      el.scrollTop = Math.max(0, (line - 4) * LINE_HEIGHT);
    },
  }));

  async function openDropped(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onChange(await file.text());
  }

  return (
    <div className="flex min-w-0 flex-col">
      <label htmlFor={id} className="mb-2 text-sm font-medium">
        {label}
      </label>
      <div
        className={`code relative flex h-[26rem] overflow-hidden rounded-lg border bg-panel focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25 ${
          dragging ? "border-accent" : "border-line"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={openDropped}
      >
        <div
          aria-hidden="true"
          className="w-12 shrink-0 select-none border-r border-line text-right text-muted/70"
          style={{ paddingTop: PADDING, transform: `translateY(${-scroll.top}px)` }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div
              key={i}
              className={`pr-2 ${i + 1 === errorLine ? "bg-error text-white" : ""}`}
              style={{ height: LINE_HEIGHT }}
            >
              {i + 1}
            </div>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          {errorLine !== undefined && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bg-error-soft"
              style={{ top: PADDING + (errorLine - 1) * LINE_HEIGHT - scroll.top, height: LINE_HEIGHT }}
            />
          )}
          <textarea
            ref={textarea}
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={(e) => setScroll({ top: e.currentTarget.scrollTop })}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            wrap="off"
            placeholder={placeholder}
            aria-invalid={errorLine !== undefined}
            className="code relative h-full w-full resize-none bg-transparent px-3 outline-none placeholder:text-muted/60"
            style={{ paddingTop: PADDING, paddingBottom: PADDING }}
          />
        </div>
      </div>
    </div>
  );
});
