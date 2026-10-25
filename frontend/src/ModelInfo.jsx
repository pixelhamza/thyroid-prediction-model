import { HEADLINE, COMPARISON } from "./model.js";

const BAR = { served: "var(--blue)", explains: "var(--aqua)", rejected: "var(--orange)" };

export default function ModelInfo() {
  return (
    <>
      <div className="card">
        <h2>What this predicts</h2>
        <p>
          A random forest estimates the probability that a patient is <strong>hypothyroid</strong>,
          from five routine blood tests and fourteen clinical flags. It was trained on 3,708
          patients, of whom 291 (7.8%) were hypothyroid.
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
          On a held-out set of 742 patients containing 58 hypothyroid cases. Accuracy is
          deliberately not shown: at 7.7% prevalence, answering &ldquo;negative&rdquo; every time
          scores 92.3%.
        </p>
      </div>

      <div className="card">
        <h2>Why a random forest</h2>
        <p>
          Three models were compared under 25-fold repeated stratified cross-validation, so each
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
          The forest and the depth-3 tree tie on recall to four decimals. The SVM is 15 points
          behind &mdash; far outside either standard deviation &mdash; so it was rejected. The
          forest was chosen over the tree because it emits 731 distinct scores against the
          tree&rsquo;s 4, which is what makes the threshold slider meaningful. It also reads a
          missing blood test as information instead of needing a substitute value.
        </p>
        <p>
          The tree still ships, as the explanation layer: every prediction below is accompanied by
          the rule path that a clinician can check by hand.
        </p>
      </div>

      <div className="card">
        <h2>Limits worth knowing</h2>
        <p>
          <strong>The label is nearly a rule on TSH.</strong> Only 2 of 291 hypothyroid cases sit
          below TSH 6.05, and the original diagnoses were made by clinicians applying that cutoff
          to these same columns. Remove TSH and average precision collapses from 0.996 to 0.360, so
          the model is partly recovering its own label definition.
        </p>
        <p>
          <strong>The population was already referred, not screened.</strong> Being on thyroxine is
          the second strongest feature, and it is circular &mdash; replacement therapy means
          somebody had already diagnosed the condition. Expect weaker performance on an unscreened
          population where TSH is often never ordered.
        </p>
        <div className="warn">
          Decision support for exploration only. Not a diagnostic device, and not validated for
          clinical use.
        </div>
      </div>
    </>
  );
}
