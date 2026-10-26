

# Thyroid Disease Classification

Predicts **negative** or **hypothyroid** from four blood tests plus age and sex.
A random forest makes the call; a depth-3 decision tree supplies the reason.

> Decision support for exploration only. Not a diagnostic device.

## Inputs

| | |
|---|---|
| Blood tests | `TSH` `TT4` `T4U` `FTI` |
| Demographics | `age` `sex` |

Clinical history is excluded on purpose. Flags like `on thyroxine` mean the condition was
*already* diagnosed, which a screening model would not know.

## Results

3,658 patients, 291 hypothyroid (7.96%). Held-out set of 732 with 58 cases.

| | recall | avg precision | role |
|---|---|---|---|
| **Random forest** | **0.9931 ± 0.0097** | **0.8935** | serving |
| Decision tree (d3) | 0.9897 ± 0.0137 | 0.8073 | explains |
| SVM (RBF) | 0.8344 ± 0.0538 | 0.8304 | rejected |

Recall and average precision from 25-fit repeated stratified CV. On the held-out set the forest
misses nobody for 10 false alarms.

Accuracy is not the headline: at 7.96% prevalence, always answering "negative" scores 92.0%.

## Why the forest

Highest recall and average precision. The SVM trails by 16 recall points — outside either
standard deviation. The tree matches on recall but emits 3 distinct scores against the forest's
367, so its threshold cannot be tuned.

The tree still ships as the explanation layer. Its first split is `TSH <= 6.05`, the standard
clinical cutoff, recovered from the data. It agrees with the forest on 99.5% of test patients;
the API returns both so disagreements are visible.

## Limits

- **The label is nearly a rule on TSH.** Only 2 of 291 cases sit below TSH 6.05, and the original
  diagnoses applied that cutoff to these same columns. Drop TSH and average precision falls to 0.447.
- **FTI is derived**, not measured — it is `TT4 / T4U`.
- **The population was referred, not screened.** Prevalence is far above a general population, and
  every hypothyroid patient had TSH ordered.
- **Binary only.** No hyperthyroid cases exist in the source data.

## Run

```bash
python3 -m venv .venv && .venv/bin/pip install -r backend/requirements.txt
.venv/bin/python backend/train_model.py        # writes models/
cd frontend && npm install && npm run build    # writes frontend/dist/
cd .. && .venv/bin/uvicorn backend.main:app --reload
```

Or `docker build -t thyroid-app . && docker run -p 7860:7860 thyroid-app`, which trains during
the build.

## Layout

```
backend/     FastAPI service + training script
frontend/    Vite + React UI
notebook/    cleaning, EDA, three models, comparison
dataset/     hypothyroid.csv (UCI)
```

Cleaning is reproduced step by step in `notebook/thyroid.ipynb` section 3.
