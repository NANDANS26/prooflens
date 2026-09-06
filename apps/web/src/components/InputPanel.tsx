import { useState } from "react";
import { importFormalIR, previewLeanSource } from "@prooflens/formal-ir";
import { runPipeline, type PipelineBundle } from "@prooflens/pipeline";

export function InputPanel({
  onLoad,
  onExamples,
}: {
  onLoad: (bundle: PipelineBundle, text: string, name: string, skipped: number) => Promise<void>;
  onExamples: () => void;
}): JSX.Element {
  const [mode, setMode] = useState<"lean" | "json">("lean");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(true);
  async function explore(text: string, format: "lean" | "json", name: string): Promise<void> {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const preview =
        format === "lean"
          ? previewLeanSource(text)
          : { document: importFormalIR(text), skipped: [] };
      const bundle = runPipeline(preview.document);
      await onLoad(bundle, text, name, preview.skipped.length);
      setNotice(
        `${bundle.analyses.length} statements loaded.${preview.skipped.length ? ` ${preview.skipped.length} skipped: ${preview.skipped.map((s) => `${s.name}: ${s.reason}`).join("; ")}` : ""}`,
      );
      if (preview.skipped.length === 0) setOpen(false);
    } catch (err) {
      setError((err instanceof Error ? err.message : String(err)).slice(0, 2000));
    } finally {
      setBusy(false);
    }
  }
  return (
    <details
      className="workspace-details input-panel"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>Explore your own Lean</summary>
      <p>Paste a theorem or open a Lean file. Your input is processed in this browser.</p>
      <div className="input-toolbar">
        <label>
          Input format{" "}
          <select value={mode} onChange={(e) => setMode(e.target.value as "lean" | "json")}>
            <option value="lean">Lean source preview</option>
            <option value="json">Extracted Lean JSON</option>
          </select>
        </label>
        <label className="file-picker">
          Open a file{" "}
          <input
            type="file"
            accept=".lean,.json"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              const format = file.name.endsWith(".json") ? "json" : "lean";
              if (file.size > (format === "lean" ? 200_000 : 8_000_000)) {
                setError("This file is too large. Use a smaller Lean module or extraction.");
                return;
              }
              setMode(format);
              void file
                .text()
                .then((text) => {
                  setInput(text);
                  return explore(text, format, file.name);
                })
                .catch(() => setError("The file could not be read. Please try again."));
            }}
          />
        </label>
      </div>
      <label className="input-source-label" htmlFor="statement-input">
        {mode === "lean" ? "Lean source" : "Extraction JSON"}
      </label>
      <textarea
        id="statement-input"
        className="source-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        spellCheck={false}
        rows={5}
        maxLength={mode === "lean" ? 200_000 : 8_000_000}
        placeholder={"theorem square_nonnegative (x : ℝ) : 0 ≤ x ^ 2 := by\n  positivity"}
      />
      <div className="input-toolbar">
        <button
          type="button"
          disabled={busy || !input.trim()}
          onClick={() =>
            void explore(input, mode, mode === "lean" ? "Pasted Lean" : "Pasted extraction")
          }
        >
          {busy ? "Preparing…" : "Visualize statement"}
        </button>
        <button
          type="button"
          className="button-secondary"
          disabled={busy}
          onClick={() => {
            onExamples();
            setError("");
            setNotice("");
            setOpen(false);
          }}
        >
          Browse examples
        </button>
      </div>
      <p className="input-help">
        Source preview reads explicit real variables, standard arithmetic, comparisons, quantifiers,
        and supported limits. It does not run Lean or check proofs. For project definitions and
        custom syntax, import JSON from ProofLens’s Lean extractor.{" "}
        <a href="https://github.com/jdhart81/prooflens/blob/main/docs/quickstart.md">
          Extraction guide
        </a>
      </p>
      {error ? (
        <p className="input-error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="input-notice" role="status">
          {notice}
        </p>
      ) : null}
    </details>
  );
}
