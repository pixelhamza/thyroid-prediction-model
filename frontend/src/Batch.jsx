import { useRef, useState } from "react";

const MAX_SHOWN = 100;

export default function Batch() {
  const [file, setFile] = useState(null);
  const [threshold, setThreshold] = useState(0.5);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  function pick(f) {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);
  }

  async function upload(e) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.append("file", file);
    try {
      const res = await fetch(`/predict-batch?threshold=${threshold}`, { method: "POST", body });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : data.detail?.[0]?.msg || "upload failed"
        );
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function download() {
    const header = result.rows[0].actual !== undefined
      ? "row,probability,prediction,actual"
      : "row,probability,prediction";
    const lines = result.rows.map((r) =>
      [r.row, r.probability, r.prediction, r.actual].filter((v) => v !== undefined).join(",")
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "predictions.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const ev = result?.evaluation;

  return (
    <form onSubmit={upload}>
      <div className="card">
        <h2>Upload a CSV</h2>
        <p>
          One patient per row. An <code>age</code> column is required; the rest are optional and
          default to &ldquo;not measured&rdquo;. Column names follow the dataset &mdash;{" "}
          <code>age</code>, <code>sex</code>, <code>TSH</code>, <code>TT4</code>,{" "}
          <code>T4U</code> and <code>FTI</code>.
        </p>

        <div
          className={`drop${dragging ? " drag" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files[0]); }}
        >
          <input
            ref={inputRef} type="file" accept=".csv,text/csv" hidden
            onChange={(e) => pick(e.target.files[0])}
          />
          {file ? (
            <>
              <strong>{file.name}</strong>
              <div className="vsub">{(file.size / 1024).toFixed(1)} KB · click to replace</div>
            </>
          ) : (
            <>
              <strong>Drop a CSV here</strong>
              <div className="vsub">or click to choose a file</div>
            </>
          )}
        </div>

        <p className="hint">
          Up to 5,000 rows. If your file includes a <code>binaryClass</code> column, the model is
          also scored against it. <a href="/template.csv" download>Download a template</a>.
        </p>
      </div>

      <div className="card">
        <h2>Decision threshold</h2>
        <label htmlFor="bthr">
          Flag at or above{" "}
          <strong style={{ color: "var(--ink)" }}>{Number(threshold).toFixed(2)}</strong>
        </label>
        <input
          id="bthr" type="range" min="0.05" max="0.95" step="0.05"
          value={threshold} onChange={(e) => setThreshold(e.target.value)}
        />
      </div>

      <button className="submit" type="submit" disabled={busy || !file}>
        {busy ? "Scoring…" : file ? "Score all rows" : "Choose a file first"}
      </button>

      {error && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2>Error</h2>
          <p className="err">{error}</p>
        </div>
      )}

      {result && (
        <>
          <div className="card" style={{ marginTop: 16 }}>
            <h2>Summary</h2>
            <div className="stats">
              <div className="stat">
                <div className="v">{result.n_rows}</div>
                <div className="k">rows scored</div>
              </div>
              <div className="stat">
                <div className="v" style={{ color: "var(--orange)" }}>{result.n_flagged}</div>
                <div className="k">flagged hypothyroid</div>
              </div>
              <div className="stat">
                <div className="v">{(100 * result.n_flagged / result.n_rows).toFixed(1)}%</div>
                <div className="k">flag rate</div>
              </div>
              <div className="stat">
                <div className="v">{result.threshold}</div>
                <div className="k">threshold</div>
              </div>
            </div>

            {result.features_defaulted.length > 0 && (
              <div className="warn">
                {result.features_defaulted.length} feature
                {result.features_defaulted.length === 1 ? "" : "s"} absent from your file and
                defaulted: {result.features_defaulted.join(", ")}.
              </div>
            )}
            {result.columns_ignored.length > 0 && (
              <p className="hint">Ignored unrecognised columns: {result.columns_ignored.join(", ")}.</p>
            )}

            <button type="button" className="ex-btn" style={{ marginTop: 14 }} onClick={download}>
              ↓ Download predictions.csv
            </button>
          </div>

          {ev && (
            <div className="card">
              <h2>Scored against your labels</h2>
              <div className="stats">
                <div className="stat">
                  <div className="v">{ev.recall ?? "—"}</div>
                  <div className="k">recall</div>
                </div>
                <div className="stat">
                  <div className="v">{ev.precision ?? "—"}</div>
                  <div className="k">precision</div>
                </div>
                <div className="stat">
                  <div className="v" style={{ color: ev.missed ? "var(--orange)" : undefined }}>
                    {ev.missed}
                  </div>
                  <div className="k">missed cases</div>
                </div>
                <div className="stat">
                  <div className="v">{ev.false_alarms}</div>
                  <div className="k">false alarms</div>
                </div>
              </div>
              <p className="hint">
                From {ev.n_labelled} labelled rows. Accuracy is {ev.accuracy}, but recall is the
                number that matters at this prevalence. If any of these rows were part of the
                model&rsquo;s training data, these figures are optimistic &mdash; the model has
                seen them before.
              </p>
            </div>
          )}

          <div className="card">
            <h2>Rows</h2>
            <div className="scroll">
              <table>
                <thead>
                  <tr>
                    <th>CSV row</th>
                    <th>Probability</th>
                    <th>Prediction</th>
                    {ev && <th>Actual</th>}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.slice(0, MAX_SHOWN).map((r) => {
                    const wrong = r.actual && r.actual !== r.prediction;
                    return (
                      <tr key={r.row}>
                        <td className="num">{r.row}</td>
                        <td className="num">{(r.probability * 100).toFixed(1)}%</td>
                        <td style={{
                          color: r.prediction === "hypothyroid" ? "var(--orange)" : "var(--ink-2)",
                        }}>
                          {r.prediction}
                        </td>
                        {ev && (
                          <td style={{ color: wrong ? "var(--orange)" : "var(--ink-3)" }}>
                            {r.actual ?? "—"}{wrong ? " ✗" : ""}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {result.rows.length > MAX_SHOWN && (
              <p className="hint">
                Showing the first {MAX_SHOWN} of {result.rows.length} rows. Download the CSV for
                all of them.
              </p>
            )}
          </div>
        </>
      )}
    </form>
  );
}
