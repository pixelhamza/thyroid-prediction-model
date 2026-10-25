import { useState } from "react";
import { FLAGS, LABS, EMPTY, EXAMPLES } from "./model.js";

// "" means the test was not run — send null so the API passes NaN to the model.
const toNumber = (v) => (String(v).trim() === "" ? null : Number(v));

export default function Predict() {
  const [form, setForm] = useState(EMPTY);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = {
      age: Number(form.age),
      sex: form.sex || null,
      threshold: Number(form.threshold),
      ...Object.fromEntries(LABS.map(([id]) => [id, toNumber(form[id])])),
      ...Object.fromEntries(FLAGS.map(([id]) => [id, form[id]])),
    };
    try {
      const res = await fetch("/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail?.[0]?.msg || JSON.stringify(data.detail));
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err.message || "Request failed — is the API running?");
    } finally {
      setBusy(false);
    }
  }

  const positive = result?.prediction === "hypothyroid";
  const agrees = result?.tree_prediction === result?.prediction;

  return (
    <form onSubmit={submit}>
      <div className="card">
        <h2>Try it on new values</h2>
        <p>Load a preset, or enter your own.</p>
        <div className="examples">
          {EXAMPLES.map((ex) => (
            <button
              type="button"
              className="ex-btn"
              key={ex.label}
              onClick={() => {
                setForm({ ...EMPTY, ...ex.patch, threshold: form.threshold });
                setResult(null);
                setError(null);
              }}
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Patient</h2>
        <div className="row-2">
          <div>
            <label htmlFor="age">Age</label>
            <input
              id="age" type="number" min="0" max="120" required
              value={form.age} onChange={(e) => set("age", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="sex">Sex</label>
            <select id="sex" value={form.sex} onChange={(e) => set("sex", e.target.value)}>
              <option value="">Unknown</option>
              <option value="F">Female</option>
              <option value="M">Male</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Blood tests</h2>
        <div className="grid">
          {LABS.map(([id, name, unit]) => (
            <div key={id}>
              <label htmlFor={id}>
                {name} <span style={{ opacity: 0.6 }}>{unit}</span>
              </label>
              <input
                id={id} type="number" step="any" min="0" placeholder="not measured"
                value={form[id]} onChange={(e) => set(id, e.target.value)}
              />
            </div>
          ))}
        </div>
        <p className="hint">
          Leave a field blank if the test was not run. The forest handles that directly rather than
          substituting a value &mdash; which is the main reason it was chosen over the SVM. TSH is
          by far the strongest predictor.
        </p>
      </div>

      <div className="card">
        <h2>History &amp; symptoms</h2>
        <div className="checks">
          {FLAGS.map(([id, label]) => (
            <label className="chk" key={id}>
              <input
                type="checkbox" checked={form[id]}
                onChange={(e) => set(id, e.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Decision threshold</h2>
        <label htmlFor="thr">
          Flag as hypothyroid at or above{" "}
          <strong style={{ color: "var(--ink)" }}>{Number(form.threshold).toFixed(2)}</strong>
        </label>
        <input
          id="thr" type="range" min="0.05" max="0.95" step="0.05"
          value={form.threshold} onChange={(e) => set("threshold", e.target.value)}
        />
        <p className="hint">
          Lower catches more cases and raises more false alarms. On the test set, 0.50 missed
          nobody; 0.10 would add 23 more false alarms for no extra cases found.
        </p>
      </div>

      <button className="submit" type="submit" disabled={busy}>
        {busy ? "Predicting…" : "Predict"}
      </button>

      {error && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2>Error</h2>
          <p className="err">{error}</p>
        </div>
      )}

      {result && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2>Result</h2>
          <div
            className="verdict"
            style={{ color: positive ? "var(--orange)" : "var(--blue)" }}
          >
            {positive ? "Hypothyroid" : "Negative"}
          </div>
          <div className="vsub">
            {(result.probability * 100).toFixed(1)}% probability · threshold {result.threshold}
          </div>
          <div className="gauge">
            <div
              className="gauge-fill"
              style={{
                width: `${result.probability * 100}%`,
                background: positive ? "var(--orange)" : "var(--blue)",
              }}
            />
            <div className="gauge-mark" style={{ left: `${result.threshold * 100}%` }} />
          </div>
          <div className="vsub">marker shows the threshold</div>

          <h3>Why &mdash; the decision tree&rsquo;s path</h3>
          <ul className="why">
            {result.explanation.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ul>

          <div
            className="agree"
            style={{ color: agrees ? "var(--ink-3)" : "var(--orange)" }}
          >
            {agrees
              ? "The decision tree agrees with the forest."
              : `The tree disagrees (it says ${result.tree_prediction}) \u2014 treat this case as borderline.`}
          </div>

          <div className="warn">{result.disclaimer}</div>
        </div>
      )}
    </form>
  );
}
