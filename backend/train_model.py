"""Train and save the models the API serves.

Writes models/rf.joblib (predictions) and models/dt.joblib (explanations).
Run from anywhere: python backend/train_model.py
"""
import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import average_precision_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

ROOT = Path(__file__).resolve().parent.parent
CSV = ROOT / "dataset" / "hypothyroid.csv"
OUT = ROOT / "models"

FEATURES = ["age", "sex", "TSH", "TT4", "T4U", "FTI"]
TARGET = "binaryClass"


def load_clean():
    """Same cleaning as notebook/thyroid.ipynb, section 3.

    The notebook uses LabelEncoder and checks which label is which; the mappings it
    arrives at are written out directly here.
    """
    df = pd.read_csv(CSV, na_values="?")
    df["sex"] = df["sex"].map({"F": 0.0, "M": 1.0})
    df[TARGET] = (df[TARGET] == "N").astype(int)    # "N" is the hypothyroid group
    df = df[~(df["age"] > 120)]                     # one impossible age
    # Missing blood tests stay missing; both models read NaN directly.
    return df[FEATURES + [TARGET]].drop_duplicates()


def main():
    df = load_clean()
    X = df[FEATURES]
    y = df[TARGET]
    print(f"{len(df)} patients, {y.sum()} hypothyroid ({100 * y.mean():.2f}%)")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    # n_jobs=1 so predict_proba is bit-reproducible; threaded averaging of 500 trees
    # drifts by ~2e-16 between calls, which makes a served endpoint hard to test.
    rf = RandomForestClassifier(n_estimators=500, min_samples_leaf=2,
                                class_weight="balanced", random_state=42, n_jobs=1)
    dt = DecisionTreeClassifier(max_depth=3, class_weight="balanced", random_state=42)
    rf.fit(X_train, y_train)
    dt.fit(X_train, y_train)

    proba = rf.predict_proba(X_test)[:, 1]
    print(classification_report(y_test, (proba >= 0.5).astype(int),
                                target_names=["negative", "hypothyroid"], digits=4))
    print(f"average precision: {average_precision_score(y_test, proba):.4f}")

    OUT.mkdir(exist_ok=True)
    joblib.dump(rf, OUT / "rf.joblib", compress=3)
    joblib.dump(dt, OUT / "dt.joblib", compress=3)
    (OUT / "metadata.json").write_text(json.dumps({
        "features": FEATURES,          # column order the models expect
        "default_threshold": 0.5,
    }, indent=2))

    for f in ["rf.joblib", "dt.joblib", "metadata.json"]:
        print(f"wrote models/{f}  ({(OUT / f).stat().st_size / 1e6:.2f} MB)")


if __name__ == "__main__":
    main()
