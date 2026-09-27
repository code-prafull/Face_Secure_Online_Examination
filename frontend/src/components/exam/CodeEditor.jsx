import { useMemo, useRef } from "react";

const LANGUAGES = [
  { id: "javascript", label: "JavaScript" },
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
  { id: "cpp", label: "C++" },
  { id: "c", label: "C" },
  { id: "sql", label: "SQL" },
  { id: "text", label: "Plain text" },
];

/**
 * Lightweight interview-style code editor: monospace textarea with a line
 * number gutter, language selector, Tab-to-spaces and live line/char count.
 * No external editor dependency — the code stays in the parent's answer state.
 */
function CodeEditor({ value = "", language = "javascript", onChange, onLanguageChange, readOnly = false }) {
  const textareaRef = useRef(null);

  const lineCount = useMemo(() => value.split("\n").length, [value]);

  const handleKeyDown = (event) => {
    if (event.key === "Tab" && !readOnly) {
      event.preventDefault();
      const el = event.target;
      const { selectionStart, selectionEnd } = el;
      const inserted = "    ";
      const next = value.slice(0, selectionStart) + inserted + value.slice(selectionEnd);
      onChange?.(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = selectionStart + inserted.length;
      });
    }
  };

  const gutterLines = Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-3 py-2">
        <select
          value={language}
          onChange={(e) => onLanguageChange?.(e.target.value)}
          disabled={readOnly}
          aria-label="Programming language"
          className="rounded-lg border border-slate-600 bg-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-100 outline-none focus:border-blue-400 disabled:opacity-60"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.label}
            </option>
          ))}
        </select>

        <span className="text-[11px] tabular-nums text-slate-400">
          {lineCount} line{lineCount !== 1 && "s"} · {value.length} chars
        </span>
      </div>

      <div className="flex">
        <div
          aria-hidden="true"
          className="select-none border-r border-slate-700 bg-slate-800/60 px-2.5 py-3 text-right font-mono text-xs leading-6 text-slate-500"
        >
          {gutterLines.map((n) => (
            <div key={n}>{n}</div>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          spellCheck={false}
          placeholder="// Write your solution here..."
          rows={Math.min(Math.max(lineCount + 1, 10), 30)}
          className="w-full resize-y bg-transparent px-3 py-3 font-mono text-sm leading-6 text-slate-100 placeholder:text-slate-500 outline-none"
        />
      </div>
    </div>
  );
}

export default CodeEditor;
