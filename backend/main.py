"""Thyroid screening API.

Serves the random forest trained by train_model.py — run that first.

    uvicorn backend.main:app --reload
"""
import io
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.responses import PlainTextResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent.parent
MODELS = ROOT / "models"
FRONTEND_DIST = ROOT / "frontend" / "dist"   # built by: cd frontend && npm run build

if not (MODELS / "rf.joblib").exists():
    raise RuntimeError("models/ is empty — run: python backend/train_model.py")

rf = joblib.load(MODELS / "rf.joblib")
meta = json.loads((MODELS / "metadata.json").read_text())
FEATURES = meta["features"]

LABS = ["TSH", "TT4", "T4U", "FTI"]


class Patient(BaseModel):
    age: float = Field(..., ge=0, le=120)
    # 0.0 = female, 1.0 = male in the source data.
    sex: str | None = Field(None, pattern="^[FM]$")

    # Blood tests. None means "not measured" and is passed to the model as NaN —
    # both models read missingness directly rather than being given a fill.
    tsh: float | None = Field(None, ge=0)
    tt4: float | None = Field(None, ge=0)
    t4u: float | None = Field(None, ge=0)
    fti: float | None = Field(None, ge=0)

    threshold: float = Field(0.5, ge=0, le=1)


def build_row(p: Patient) -> pd.DataFrame:
    row = {
        "age": p.age,
        "sex": {"F": 0.0, "M": 1.0}.get(p.sex, np.nan),
        "TSH": p.tsh, "TT4": p.tt4, "T4U": p.t4u, "FTI": p.fti,
    }
    row = {k: (np.nan if v is None else v) for k, v in row.items()}
    return pd.DataFrame([row])[FEATURES]


MAX_ROWS = 5000   # the full dataset is 3,658 rows


def frame_from_csv(df: pd.DataFrame) -> pd.DataFrame:
    """Coerce an arbitrary uploaded CSV into the exact feature frame the models expect.

    Accepts the dataset's own column names. An absent blood test becomes NaN, which is
    what the models expect for "this test was not run".
    """
    if "age" not in df.columns:
        raise HTTPException(400, "CSV must contain an 'age' column")

    out = pd.DataFrame(index=df.index)
    out["age"] = pd.to_numeric(df["age"], errors="coerce")

    if "sex" in df.columns:
        sex = df["sex"]
        if sex.dtype == object:
            sex = sex.astype(str).str.strip().str.upper().map({"F": 0.0, "M": 1.0})
        else:
            sex = pd.to_numeric(sex, errors="coerce").where(lambda s: s.isin([0.0, 1.0]))
        out["sex"] = sex
    else:
        out["sex"] = np.nan

    for lab in LABS:
        out[lab] = (pd.to_numeric(df[lab], errors="coerce") if lab in df.columns
                    else np.nan)

    return out[FEATURES]


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
        "disclaimer": "Decision support only, not a diagnosis. "
                      "Trained on an already-referred population.",
    }


@app.get("/template.csv", response_class=PlainTextResponse)
def template():
    """A minimal CSV showing the accepted headers. Blank lab cells mean 'not measured'."""
    header = "age,sex,TSH,TT4,T4U,FTI"
    rows = [
        "55,F,14.2,71,0.95,74",
        "41,F,1.3,125,1.14,109",
        "60,M,22,,,",
        "70,F,9.5,110,1.0,105",
    ]
    return "\n".join([header, *rows]) + "\n"


@app.post("/predict-batch")
async def predict_batch(
    file: UploadFile = File(...),
    threshold: float = Query(0.5, ge=0, le=1),
):
    raw = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(raw))
    except Exception as exc:
        raise HTTPException(400, f"could not parse CSV: {exc}")

    if df.empty:
        raise HTTPException(400, "CSV has no rows")
    if len(df) > MAX_ROWS:
        raise HTTPException(400, f"{len(df)} rows exceeds the {MAX_ROWS}-row limit")

    X = frame_from_csv(df)
    # A single blank age is fine — the models read NaN. Every age missing means the
    # file did not parse as expected, which is worth rejecting.
    if X["age"].isna().all():
        raise HTTPException(400, "no usable 'age' values — check the file's delimiter")

    proba = rf.predict_proba(X)[:, 1]
    flagged = proba >= threshold

    rows = [
        {"row": int(i) + 2,  # +2 so it matches the spreadsheet line (1 = header)
         "probability": round(float(p), 4),
         "prediction": "hypothyroid" if f else "negative"}
        for i, (p, f) in enumerate(zip(proba, flagged))
    ]

    # If the upload carries ground truth, score against it.
    evaluation = None
    if "binaryClass" in df.columns:
        truth = pd.to_numeric(df["binaryClass"], errors="coerce")
        valid = truth.isin([0, 1])
        if valid.any():
            y = truth[valid].astype(int).to_numpy()
            pred = flagged[valid.to_numpy()].astype(int)
            tp = int(((pred == 1) & (y == 1)).sum())
            fp = int(((pred == 1) & (y == 0)).sum())
            fn = int(((pred == 0) & (y == 1)).sum())
            for row, actual in zip([r for r, v in zip(rows, valid) if v], y):
                row["actual"] = "hypothyroid" if actual == 1 else "negative"
            evaluation = {
                "n_labelled": int(valid.sum()),
                "accuracy": round(float((pred == y).mean()), 4),
                "recall": round(tp / (tp + fn), 4) if tp + fn else None,
                "precision": round(tp / (tp + fp), 4) if tp + fp else None,
                "missed": fn,
                "false_alarms": fp,
            }

    recognised = [c for c in df.columns if c in FEATURES or c == "binaryClass"]
    return {
        "n_rows": len(df),
        "n_flagged": int(flagged.sum()),
        "threshold": threshold,
        "columns_recognised": recognised,
        "columns_ignored": [c for c in df.columns if c not in recognised],
        "features_defaulted": [c for c in FEATURES if c not in df.columns],
        "evaluation": evaluation,
        "rows": rows,
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
