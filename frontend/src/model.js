// Checkbox id -> label. Ids match the backend's Pydantic field names exactly.
export const FLAGS = [
  ["t3_measured", "T3 measured"],
  ["on_thyroxine", "On thyroxine"],
  ["query_on_thyroxine", "Query on thyroxine"],
  ["on_antithyroid_medication", "On antithyroid medication"],
  ["sick", "Sick"],
  ["pregnant", "Pregnant"],
  ["thyroid_surgery", "Thyroid surgery"],
  ["i131_treatment", "I131 treatment"],
  ["query_hypothyroid", "Query hypothyroid"],
  ["query_hyperthyroid", "Query hyperthyroid"],
  ["lithium", "Lithium"],
  ["goitre", "Goitre"],
  ["tumor", "Tumor"],
  ["psych", "Psych"],
];

export const LABS = [
  ["tsh", "TSH", "mIU/L"],
  ["tt4", "TT4", "nmol/L"],
  ["t4u", "T4U", "ratio"],
  ["fti", "FTI", "—"],
];

export const EMPTY = {
  age: 50,
  sex: "",
  tsh: "", tt4: "", t4u: "", fti: "",
  threshold: 0.5,
  ...Object.fromEntries(FLAGS.map(([id]) => [id, false])),
};

// Held-out test set: 742 patients, 58 hypothyroid.
export const HEADLINE = [
  { v: "1.000", k: "recall (0 missed)" },
  { v: "0.951", k: "precision" },
  { v: "0.996", k: "avg precision" },
  { v: "3", k: "false alarms" },
];

// Recall from 25-fold repeated stratified CV (mean ± sd).
export const COMPARISON = [
  { name: "Random forest", recall: 0.9931, sd: 0.0108, ap: 0.9885, pick: "served" },
  { name: "Decision tree (d3)", recall: 0.9931, sd: 0.0108, ap: 0.9452, pick: "explains" },
  { name: "SVM (RBF)", recall: 0.8406, sd: 0.0577, ap: 0.9460, pick: "rejected" },
];

export const EXAMPLES = [
  {
    label: "Clear hypothyroid",
    patch: { age: 55, sex: "F", tsh: 14.2, tt4: 71, t4u: 0.95, fti: 74, t3_measured: true },
  },
  {
    label: "Healthy",
    patch: { age: 41, sex: "F", tsh: 1.3, tt4: 125, t4u: 1.14, fti: 109, t3_measured: true },
  },
  {
    label: "Only TSH measured",
    patch: { age: 60, sex: "M", tsh: 22, tt4: "", t4u: "", fti: "" },
  },
  {
    label: "Treated (on thyroxine)",
    patch: { age: 70, sex: "F", tsh: 9.5, tt4: 110, t4u: 1.0, fti: 105, on_thyroxine: true },
  },
  {
    label: "Borderline",
    patch: { age: 50, sex: "F", tsh: 6.5, tt4: 95, t4u: 1.0, fti: 96 },
  },
];
