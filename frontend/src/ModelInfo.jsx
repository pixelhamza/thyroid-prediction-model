import { HEADLINE, COMPARISON } from "./model.js";

const BAR = { served: "var(--blue)", explains: "var(--aqua)", rejected: "var(--orange)" };

export default function ModelInfo() {
  return (
    <>
      <div className="card">
        <h2>What this predicts</h2>
        <p>
          A random forest estimates the probability that a patient is <strong>hypothyroid</strong>,
          from four blood tests plus age and sex. It was trained on 3,658 patients, of whom 291
          (8.0%) were hypothyroid.
        </p>
        <p>
          The six inputs are <code>TSH</code>, <code>TT4</code>, <code>T4U</code>,{" "}
          <code>FTI</code>, <code>age</code> and <code>sex</code>. Clinical history is
          deliberately left out: flags such as being on thyroxine record that a thyroid problem
          was <em>already</em> diagnosed and treated, which a screening model would not know.
        </p>
        <p>
          The target is <strong>binary</strong> &mdash; negative versus hypothyroid. The source
          dataset contains no hyperthyroid cases, so that class cannot be predicted here.
        </p>
        <div className="stats" style={{ marginTop: 14 }}>
          {HEADLINE.map((s) => (
            <div className="stat" key={s.k}>
              <div className="v">{s.v}</div>
              <div className="k">{s.k}</div>
            </div>
          ))}
        </div>
        <p className="hint">
          On a held-out set of 732 patients containing 58 hypothyroid cases. Accuracy is
          deliberately not shown: at 8.0% prevalence, answering &ldquo;negative&rdquo; every time
          scores 92.0%.
        </p>
      </div>

      <div className="card">
        <h2>Why a random forest</h2>
        <p>
          Four models were compared under 25-fit repeated stratified cross-validation, so each
          gap can be judged against its own variability. Bars show recall &mdash; the share of
          hypothyroid patients actually caught.
        </p>
        <div className="cmp">
          {COMPARISON.map((m) => (
            <div className="cmp-row" key={m.name}>
              <div className="cmp-name">
                {m.name}
                {m.pick === "served" && <span className="badge">serving</span>}
              </div>
              <div className="cmp-track">
                <div
                  className="cmp-fill"
                  style={{ width: `${m.recall * 100}%`, background: BAR[m.pick] }}
                />
              </div>
              <div className="cmp-val">{m.recall.toFixed(3)}</div>
            </div>
          ))}
        </div>
        <table style={{ marginTop: 18 }}>
          <thead>
            <tr>
              <th>Model</th>
              <th>Recall (CV)</th>
              <th>Avg precision</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map((m) => (
              <tr key={m.name}>
                <td>{m.name}</td>
                <td className="num">
                  {m.recall.toFixed(4)} ± {m.sd.toFixed(4)}
                </td>
                <td className="num">{m.ap.toFixed(4)}</td>
                <td>{m.pick}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3>The reasoning</h3>
        <p>
          The forest has the highest recall and the highest average precision. The SVM is 16
          points behind on recall &mdash; far outside either standard deviation &mdash; so it was
          rejected. The depth-3 tree comes close on recall, but it emits only 3 distinct scores
          against the forest&rsquo;s 367, which is what makes the threshold slider meaningful.
        </p>
        <p>
          Logistic regression is the closest rival on recall (0.9911) but the weakest on precision
          (0.6563), so at a matched 95% recall it raises 29 false alarms where the forest raises 9.
        </p>
        <p>
          The tree still ships, as the explanation layer: every prediction is accompanied by the
          rule path that a clinician can check by hand. Its first split is{" "}
          <code>TSH &le; 6.05</code> &mdash; the standard clinical cutoff, recovered from the data.
        </p>
      </div>

      <div className="card">
        <h2>Limits worth knowing</h2>
        <p>
          <strong>The label is nearly a rule on TSH.</strong> Only 2 of 291 hypothyroid cases sit
          below TSH 6.05, and the original diagnoses were made by clinicians applying that cutoff
          to these same columns. Remove TSH and average precision collapses from 0.932 to 0.447,
          so the model is partly recovering its own label definition.
        </p>
        <p>
          <strong>FTI is not an independent test.</strong> It is TT4 divided by T4U, so the four
          blood tests are really three measurements plus a derived index.
        </p>
        <p>
          <strong>The population was referred for testing, not screened.</strong> Prevalence here
          is 8.0%, far above a general population, and TSH was ordered for every hypothyroid
          patient in the data. Expect weaker performance where TSH is often never ordered.
        </p>
        <div className="warn">
          Decision support for exploration only. Not a diagnostic device, and not validated for
          clinical use.
        </div>
      </div>
    </>
  );
}
