// Input id -> label. Ids match the backend's Pydantic field names exactly.
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
};

// The headline. 25-fit repeated stratified cross-validation (5 folds x 5 repeats)
// over all 3,658 patients — not a single split, because one patient moves recall
// by 1.7 points on a 58-positive test set.
export const HERO = { v: "0.9931", pm: "± 0.0097", k: "cross-validated recall" };

export const HEADLINE = [
  { v: "0.8935", pm: "± 0.0350", k: "average precision" },
  { v: "0.8068", pm: "± 0.0338", k: "precision" },
  { v: "25", k: "fits (5 folds × 5 repeats)" },
];

// Mean ± sd over those 25 fits.
export const COMPARISON = [
  { slug: "rf", name: "Random forest", recall: 0.9931, sd: 0.0097, ap: 0.8935, apSd: 0.0350, prec: 0.8068, pick: "served" },
  { slug: "lr", name: "Logistic regression", recall: 0.9911, sd: 0.0086, ap: 0.8573, apSd: 0.0440, prec: 0.6563, pick: "rejected" },
  { slug: "dt", name: "Decision tree (d3)", recall: 0.9897, sd: 0.0137, ap: 0.8073, apSd: 0.0402, prec: 0.7943, pick: "rejected" },
  { slug: "svm", name: "SVM (RBF)", recall: 0.8344, sd: 0.0538, ap: 0.8304, apSd: 0.0527, prec: 0.8027, pick: "rejected" },
];

// Lowest threshold still reaching 95% recall, judged on what it costs.
export const MATCHED = [
  { slug: "rf", name: "Random forest", thr: 0.674, missed: 2, fa: 9 },
  { slug: "dt", name: "Decision tree (d3)", thr: 0.980, missed: 1, fa: 9 },
  { slug: "svm", name: "SVM (RBF)", thr: 0.241, missed: 2, fa: 20 },
  { slug: "lr", name: "Logistic regression", thr: 0.452, missed: 2, fa: 29 },
];

// Forest retrained on each feature subset, scored on the held-out split.
export const ABLATION = {
  base: { label: "all six features", ap: 0.9315 },
  rows: [
    { slug: "no-tsh", label: "without TSH", ap: 0.4471 },
    { slug: "tsh-only", label: "TSH only", ap: 0.8646 },
    { slug: "no-fti", label: "without FTI", ap: 0.9318 },
    { slug: "no-age", label: "without age", ap: 0.9354 },
    { slug: "no-tt4", label: "without TT4", ap: 0.9359 },
    { slug: "no-t4u", label: "without T4U", ap: 0.9446 },
    { slug: "no-sex", label: "without sex", ap: 0.9467 },
  ],
};

// One 80/20 split, reported as a secondary check rather than the headline.
export const HELDOUT = { n: 732, pos: 58, tp: 58, fn: 0, fp: 10, tn: 664, ap: 0.9315 };

export const EXAMPLES = [
  {
    label: "Clear hypothyroid",
    patch: { age: 55, sex: "F", tsh: 14.2, tt4: 71, t4u: 0.95, fti: 74 },
  },
  {
    label: "Healthy",
    patch: { age: 41, sex: "F", tsh: 1.3, tt4: 125, t4u: 1.14, fti: 109 },
  },
  {
    label: "Only TSH measured",
    patch: { age: 60, sex: "M", tsh: 22, tt4: "", t4u: "", fti: "" },
  },
  {
    label: "Borderline",
    patch: { age: 50, sex: "F", tsh: 6.5, tt4: 95, t4u: 1.0, fti: 96 },
  },
  {
    label: "High TSH, normal T4",
    patch: { age: 48, sex: "F", tsh: 9.1, tt4: 160, t4u: 1.05, fti: 152 },
  },
];
