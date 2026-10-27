import { useState } from "react";
import { COMPARISON, ABLATION } from "./model.js";

/* A shared hover tooltip. Marks call show(e, text); the wrapper is position:relative. */
function useTip() {
  const [tip, setTip] = useState(null);
  const show = (e, text) => {
    const wrap = e.currentTarget.closest(".chart");
    const m = e.currentTarget.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    setTip({ text, x: m.left + m.width / 2 - w.left, y: m.top - w.top });
  };
  return [tip, show, () => setTip(null)];
}

function Tip({ tip }) {
  if (!tip) return null;
  return (
    <div className="tip" style={{ left: tip.x, top: tip.y }}>
      {tip.text}
    </div>
  );
}

/* ---------- Cross-validated recall, mean with ±1 sd whiskers ---------- */

const X0 = 162;
const X1 = 470;
const LO = 0.75;
const sx = (v) => X0 + ((v - LO) / (1 - LO)) * (X1 - X0);
const rowY = (i) => 36 + i * 38;
const TICKS = [0.75, 0.8, 0.85, 0.9, 0.95, 1];

export function RecallChart() {
  const [tip, show, hide] = useTip();
  const lead = COMPARISON[0];
  const bandLo = sx(lead.recall - lead.sd);
  const bandHi = sx(Math.min(lead.recall + lead.sd, 1));

  return (
    <figure className="chart">
      <svg viewBox="0 0 560 210" role="img"
           aria-label="Cross-validated recall per model with one standard deviation. Random forest 0.9931, logistic regression 0.9911, decision tree 0.9897, SVM 0.8344.">
        <rect x={bandLo} y="18" width={bandHi - bandLo} height="152" className="c-band" />
        <text x={(bandLo + bandHi) / 2} y="13" className="c-note" textAnchor="middle">
          forest ±1 sd
        </text>

        <g className="c-grid">
          {TICKS.map((t) => (
            <line key={t} x1={sx(t)} x2={sx(t)} y1="18" y2="170" />
          ))}
        </g>

        {COMPARISON.map((m, i) => {
          const y = rowY(i);
          const lo = sx(m.recall - m.sd);
          const hi = sx(Math.min(m.recall + m.sd, 1));
          const on = m.pick === "served";
          const cls = on ? "c-lead" : "c-mute";
          const label = `${m.name}: recall ${m.recall.toFixed(4)} ± ${m.sd.toFixed(4)}`;
          return (
            <g key={m.slug}>
              <text x="150" y={y + 4} textAnchor="end"
                    className={on ? "c-name c-name-on" : "c-name"}>
                {m.name}
              </text>
              <g
                onMouseEnter={(e) => show(e, label)}
                onMouseLeave={hide}
                tabIndex={0}
                onFocus={(e) => show(e, label)}
                onBlur={hide}
              >
                {/* generous hit target, invisible */}
                <rect x={X0 - 6} y={y - 16} width={X1 - X0 + 12} height="32" className="c-hit" />
                <line x1={lo} x2={hi} y1={y} y2={y} className={`c-whisk ${cls}`} />
                <line x1={lo} x2={lo} y1={y - 6} y2={y + 6} className={`c-cap ${cls}`} />
                <line x1={hi} x2={hi} y1={y - 6} y2={y + 6} className={`c-cap ${cls}`} />
                <circle cx={sx(m.recall)} cy={y} r="4.5" className={`c-dot ${cls}`} />
              </g>
              {(m.slug === "rf" || m.slug === "svm") && (
                <text x={hi + 10} y={y + 4}
                      className={on ? "c-val c-val-on" : "c-val"}>
                  {m.recall.toFixed(4)}
                </text>
              )}
            </g>
          );
        })}

        <line x1={X0} x2={X1} y1="170" y2="170" className="c-axis" />
        {TICKS.map((t) => (
          <text key={t} x={sx(t)} y="188" className="c-tick" textAnchor="middle">
            {t.toFixed(2)}
          </text>
        ))}
        <text x={(X0 + X1) / 2} y="205" className="c-unit" textAnchor="middle">
          recall on the hypothyroid class · axis starts at 0.75
        </text>
      </svg>
      <Tip tip={tip} />
    </figure>
  );
}

/* ---------- Feature ablation ---------- */

const A_X0 = 132;
const A_W = 362;
const ax = (v) => A_X0 + v * A_W;

export function AblationChart() {
  const [tip, show, hide] = useTip();
  const { base, rows } = ABLATION;
  const refX = ax(base.ap);

  return (
    <figure className="chart">
      <svg viewBox={`0 0 560 ${44 + rows.length * 34}`} role="img"
           aria-label="Average precision when each feature is removed. Without TSH it falls to 0.4471; every other removal stays near the 0.9315 baseline.">
        <text x={refX} y="11" className="c-note" textAnchor="end">
          {`${base.label} · ${base.ap.toFixed(4)}`}
        </text>
        <line x1={refX} x2={refX} y1="16" y2={20 + rows.length * 34} className="c-ref" />

        {rows.map((r, i) => {
          const y = 22 + i * 34;
          const on = r.slug === "no-tsh";
          const label = `${r.label}: average precision ${r.ap.toFixed(4)}`;
          return (
            <g key={r.slug}
               onMouseEnter={(e) => show(e, label)}
               onMouseLeave={hide}
               tabIndex={0}
               onFocus={(e) => show(e, label)}
               onBlur={hide}>
              <rect x="0" y={y - 2} width="560" height="28" className="c-hit" />
              <text x={A_X0 - 12} y={y + 17} textAnchor="end"
                    className={on ? "c-name c-name-on" : "c-name"}>
                {r.label}
              </text>
              <path d={barPath(A_X0, y + 5, ax(r.ap) - A_X0, 15)}
                    className={on ? "c-bar c-bar-on" : "c-bar"} />
              <text x={ax(r.ap) + 10} y={y + 17}
                    className={on ? "c-val c-val-on" : "c-val"}>
                {r.ap.toFixed(4)}
              </text>
            </g>
          );
        })}

        <line x1={A_X0} x2={A_X0} y1="16" y2={20 + rows.length * 34} className="c-axis" />
        <text x={A_X0 + A_W / 2} y={40 + rows.length * 34} className="c-unit" textAnchor="middle">
          average precision · no-skill baseline at this prevalence is 0.0796
        </text>
      </svg>
      <Tip tip={tip} />
    </figure>
  );
}

/* Bar with a 4px rounded data-end and a square baseline end. */
function barPath(x, y, w, h) {
  const r = Math.min(4, w);
  return `M${x} ${y}h${w - r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - r)}z`;
}
