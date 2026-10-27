import { HERO, HEADLINE, COMPARISON, MATCHED, HELDOUT } from "./model.js";
import { RecallChart, AblationChart } from "./Charts.jsx";

export default function ModelInfo() {
  return (
    <>
      <div className="card card-hero">
        <h2>Headline result</h2>
        <div className="hero">
          <div className="hero-v">
            {HERO.v}
            <span className="hero-pm">{HERO.pm}</span>
          </div>
          <div className="hero-k">{HERO.k}</div>
        </div>
        <div className="stats">
          {HEADLINE.map((s) => (
            <div className="stat" key={s.k}>
              <div className="v">
                {s.v}
                {s.pm && <span className="stat-pm">{s.pm}</span>}
              </div>
              <div className="k">{s.k}</div>
            </div>
          ))}
        </div>
        <p className="hint">
          Every figure above is the mean over <strong>25 fits</strong> of repeated stratified
          cross-validation across all 3,658 patients &mdash; not one lucky split. A single 20%
          test set holds just 58 hypothyroid patients, so one patient moves recall by 1.7
          points; the spread is the honest part of the number.
        </p>
      </div>

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
        <div className="warn warn-flat">
          <strong>Accuracy is not reported.</strong> At 8.0% prevalence, answering
          &ldquo;negative&rdquo; for every patient scores 92.0% and catches nobody. Recall,
          average precision, and the cost in false alarms are the metrics that mean something
          here.
        </div>
      </div>

      <div className="card">
        <h2>Why the random forest</h2>
        <p>
          Four models, identical data and identical folds, scored over the same 25 fits. Recall
          is the deciding metric &mdash; the share of hypothyroid patients actually caught.
        </p>
        <RecallChart />
        <figcaption className="figcap">
          <strong>Three models tie.</strong> The logistic regression and the decision tree both
          land inside the forest&rsquo;s own ±1 sd band, so those gaps are not real. Only the SVM
          separates, and it separates downward &mdash; 16 recall points behind.
        </figcaption>

        <table className="t-tight">
          <thead>
            <tr>
              <th>Model</th>
              <th>Recall (25-fit CV)</th>
              <th>Avg precision</th>
              <th>Precision</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map((m) => (
              <tr key={m.slug} className={m.pick === "served" ? "row-on" : undefined}>
                <td>{m.name}</td>
                <td className="num">
                  {m.recall.toFixed(4)} <span className="pm">± {m.sd.toFixed(4)}</span>
                </td>
                <td className="num">
                  {m.ap.toFixed(4)} <span className="pm">± {m.apSd.toFixed(4)}</span>
                </td>
                <td className="num">{m.prec.toFixed(4)}</td>
                <td>
                  {m.pick === "served" ? (
                    <span className="badge badge-on">serving</span>
                  ) : (
                    <span className="badge">rejected</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>The tie-breaker: what 95% recall costs</h3>
        <p>
          Recall alone cannot separate the top three, so each model was set to the lowest
          threshold still reaching 95% recall and judged on the false alarms that buys.
        </p>
        <table className="t-tight">
          <thead>
            <tr>
              <th>Model</th>
              <th>Threshold</th>
              <th>Missed</th>
              <th>False alarms</th>
            </tr>
          </thead>
          <tbody>
            {MATCHED.map((m) => (
              <tr key={m.slug} className={m.slug === "rf" ? "row-on" : undefined}>
                <td>{m.name}</td>
                <td className="num">{m.thr.toFixed(3)}</td>
                <td className="num">{m.missed}</td>
                <td className="num">{m.fa}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint">
          The forest and the tree tie at 9 false alarms; the logistic regression costs 29 for the
          same sensitivity. The forest wins the tie on a property the tree cannot match: it emits
          367 distinct scores against the tree&rsquo;s 3, which is what makes the threshold slider
          on the first tab do anything at all.
        </p>
      </div>

      <div className="card">
        <h2>Limits worth knowing</h2>
        <p>
          <strong>The label is nearly a rule on TSH.</strong> Remove TSH and the model collapses;
          remove anything else and it barely notices. Only 2 of 291 hypothyroid cases sit below
          TSH 6.05, and the original diagnoses were made by clinicians applying that cutoff to
          these same columns &mdash; so the model is partly recovering its own label definition.
        </p>
        <AblationChart />
        <figcaption className="figcap">
          A forest retrained on each feature subset. Dropping <code>sex</code> or{" "}
          <code>T4U</code> actually scores <em>higher</em> than the full model; dropping{" "}
          <code>TSH</code> halves it.
        </figcaption>
        <p>
          <strong>FTI is not an independent test.</strong> It is TT4 divided by T4U, so the four
          blood tests are really three measurements plus a derived index.
        </p>
        <p>
          <strong>The population was referred for testing, not screened.</strong> Prevalence here
          is 8.0%, far above a general population, and TSH was ordered for every hypothyroid
          patient in the data. Expect weaker performance where TSH is often never ordered.
        </p>
        <p className="hint">
          Secondary check &mdash; on one held-out split of {HELDOUT.n} patients ({HELDOUT.pos}{" "}
          hypothyroid) the served forest missed {HELDOUT.fn} and raised {HELDOUT.fp} false alarms,
          at average precision {HELDOUT.ap}. That is a favourable draw, which is exactly why the
          cross-validated figure leads this page instead.
        </p>
        <div className="warn">
          Decision support for exploration only. Not a diagnostic device, and not validated for
          clinical use.
        </div>
      </div>
    </>
  );
}
