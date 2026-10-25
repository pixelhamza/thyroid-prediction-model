"""Thyroid screening API.

The random forest predicts; the depth-3 decision tree explains. Both were trained by
train_model.py — run that first.

    uvicorn backend.main:app --reload
"""
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent.parent
MODELS = ROOT / "models"
FRONTEND_DIST = ROOT / "frontend" / "dist"   # built by: cd frontend && npm run build

if not (MODELS / "rf.joblib").exists():
    raise RuntimeError("models/ is empty — run: python backend/train_model.py")

rf = joblib.load(MODELS / "rf.joblib")
dt = joblib.load(MODELS / "dt.joblib")
meta = json.loads((MODELS / "metadata.json").read_text())
FEATURES = meta["features"]
LAB_FLAGS = meta["lab_flags"]

# Pydantic field -> dataset column. The dataset uses spaces, which fields cannot.
FLAG_FIELDS = {
    "on_thyroxine": "on thyroxine",
    "query_on_thyroxine": "query on thyroxine",
    "on_antithyroid_medication": "on antithyroid medication",
    "sick": "sick",
    "pregnant": "pregnant",
    "thyroid_surgery": "thyroid surgery",
    "i131_treatment": "I131 treatment",
    "query_hypothyroid": "query hypothyroid",
    "query_hyperthyroid": "query hyperthyroid",
    "lithium": "lithium",
    "goitre": "goitre",
    "tumor": "tumor",
    "psych": "psych",
}


class Patient(BaseModel):
    age: float = Field(..., ge=0, le=120)
    # 0.0 = female, 1.0 = male in the source data (every pregnant patient is 0.0).
    sex: str | None = Field(None, pattern="^[FM]$")

    # Blood tests. None means "not measured" and is passed to the model as NaN —
    # the forest reads missingness as information rather than being given a fill.
    tsh: float | None = Field(None, ge=0)
    tt4: float | None = Field(None, ge=0)
    t4u: float | None = Field(None, ge=0)
    fti: float | None = Field(None, ge=0)
    t3_measured: bool = False  # the source CSV kept this flag but not the T3 value

    on_thyroxine: bool = False
    query_on_thyroxine: bool = False
    on_antithyroid_medication: bool = False
    sick: bool = False
    pregnant: bool = False
    thyroid_surgery: bool = False
    i131_treatment: bool = False
    query_hypothyroid: bool = False
    query_hyperthyroid: bool = False
    lithium: bool = False
    goitre: bool = False
    tumor: bool = False
    psych: bool = False

    threshold: float = Field(0.5, ge=0, le=1)


def build_row(p: Patient) -> pd.DataFrame:
    row = {c: 0.0 for c in FEATURES}
    row["age"] = p.age
    row["sex"] = {"F": 0.0, "M": 1.0}.get(p.sex, np.nan)
    for field, column in FLAG_FIELDS.items():
        row[column] = float(getattr(p, field))
    row["T3 measured"] = float(p.t3_measured)
    for name, value in [("TSH", p.tsh), ("TT4", p.tt4), ("T4U", p.t4u), ("FTI", p.fti)]:
        row[name] = np.nan if value is None else value
        row[LAB_FLAGS[name]] = 0.0 if value is None else 1.0
    return pd.DataFrame([row])[FEATURES]


def explain(X: pd.DataFrame) -> list[str]:
    """Walk the decision tree's path for this patient and describe each split."""
    tree = dt.tree_
    path = dt.decision_path(X).indices
    steps = []
    for node, nxt in zip(path, path[1:]):
        column = FEATURES[tree.feature[node]]
        cutoff = tree.threshold[node]
        value = X.iloc[0][column]
        went_left = nxt == tree.children_left[node]
        if np.isnan(value):
            steps.append(f"{column} not measured → {'left' if went_left else 'right'} branch")
        else:
            steps.append(f"{column} {value:g} {'≤' if went_left else '>'} {cutoff:g}")
    return steps


app = FastAPI(title="Thyroid Screening API")


@app.get("/health")
def health():
    return {"status": "ok", "n_features": len(FEATURES)}


@app.post("/predict")
def predict(patient: Patient):
    X = build_row(patient)
    try:
        probability = float(rf.predict_proba(X)[0, 1])
    except Exception as exc:  # feature-name or dtype mismatch
        raise HTTPException(status_code=500, detail=f"prediction failed: {exc}")

    return {
        "probability": round(probability, 4),
        "prediction": "hypothyroid" if probability >= patient.threshold else "negative",
        "threshold": patient.threshold,
        "tree_prediction": "hypothyroid" if dt.predict(X)[0] == 1 else "negative",
        "explanation": explain(X),
        "disclaimer": "Decision support only, not a diagnosis. "
                      "Trained on an already-referred population.",
    }


# Mounted last so /health and /predict are matched first.
# During `npm run dev` the Vite server proxies to this API instead, so a missing
# build is only a problem when serving the production bundle from here.
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
else:
    @app.get("/")
    def no_build():
        return {"detail": "frontend not built — run: cd frontend && npm run build"}
