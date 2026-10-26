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

// Held-out test set: 732 patients, 58 hypothyroid.
export const HEADLINE = [
  { v: "1.000", k: "recall (0 missed)" },
  { v: "0.853", k: "precision" },
  { v: "0.932", k: "avg precision" },
  { v: "10", k: "false alarms" },
];

// Recall from 25-fit repeated stratified CV (mean ± sd).
export const COMPARISON = [
  { name: "Random forest", recall: 0.9931, sd: 0.0097, ap: 0.8935, pick: "served" },
  { name: "Logistic regression", recall: 0.9911, sd: 0.0086, ap: 0.8573, pick: "rejected" },
  { name: "Decision tree (d3)", recall: 0.9897, sd: 0.0137, ap: 0.8073, pick: "explains" },
  { name: "SVM (RBF)", recall: 0.8344, sd: 0.0538, ap: 0.8304, pick: "rejected" },
];

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
