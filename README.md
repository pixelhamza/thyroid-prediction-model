---
title: Thyroid Screening
emoji: 🩺
colorFrom: blue
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# Thyroid Disease Classification

Predicts whether a patient is **negative** or **hypothyroid** from five routine blood tests and
fourteen clinical flags. A random forest makes the call; a depth-3 decision tree supplies the
reason for every prediction.

> Decision support for exploration only. Not a diagnostic device, and not validated for clinical use.

## Using it

- **Try it** — enter one patient, or load a preset. Leave a blood test blank if it was not run;
  the model handles missing values directly rather than substituting a figure.
- **Upload CSV** — score up to 5,000 patients at once and download the results. If your file has a
  `binaryClass` column, the model is also scored against it.
- **About the model** — performance, the model comparison, and the limits.

## Performance

On a held-out set of 742 patients containing 58 hypothyroid cases:

| metric | value |
|---|---|
| recall | 1.000 — none missed |
| precision | 0.951 — 3 false alarms |
| average precision | 0.996 |

Accuracy (0.996) is deliberately not the headline: at 7.7% prevalence, answering "negative" every
time scores 92.3%.

## Model choice

Three candidates under 25-fold repeated stratified cross-validation:

| model | recall | avg precision | outcome |
|---|---|---|---|
| Random forest (500 trees) | 0.9931 ± 0.0108 | 0.9885 | **serving** |
| Decision tree (depth 3) | 0.9931 ± 0.0108 | 0.9452 | **explains predictions** |
| SVM (RBF, C=10) | 0.8406 ± 0.0577 | 0.9460 | rejected |

The forest and the tree tie on recall to four decimals. The SVM is 15 points behind — well outside
either standard deviation — so it was dropped. The forest was preferred over the tree because it
emits 731 distinct scores against the tree's 4, which is what makes the threshold control
meaningful, and because it reads a missing blood test as information instead of needing a fill.

## Known limits

- **The label is nearly a rule on TSH.** Only 2 of 291 hypothyroid cases sit below TSH 6.05, and
  the original diagnoses were made by clinicians applying that cutoff to these same columns.
  Remove TSH and average precision collapses from 0.996 to 0.360.
- **The population was already referred, not screened.** `on thyroxine` is the second strongest
  feature and is circular — replacement therapy means the condition was already diagnosed.
- **Binary only.** The source data contains no hyperthyroid cases, so that class cannot be
  predicted.

## Running locally

```bash
python3 -m venv .venv && .venv/bin/pip install -r backend/requirements.txt
.venv/bin/python backend/train_model.py        # writes models/
cd frontend && npm install && npm run build    # writes frontend/dist/
cd .. && .venv/bin/uvicorn backend.main:app --reload
```

Or with Docker, which also trains the model during the build:

```bash
docker build -t thyroid-app . && docker run -p 7860:7860 thyroid-app
```

## Layout

```
backend/     FastAPI service + training script
frontend/    Vite + React UI
notebook/    EDA, per-model notebooks, model comparison
dataset/     the source CSV
```

Data: UCI thyroid disease dataset, pre-collapsed to a binary label.
