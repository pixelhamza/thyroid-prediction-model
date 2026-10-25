"""Train and save the models the API serves.

Writes models/rf.joblib (predictions) and models/dt.joblib (explanations).
Run from anywhere: python backend/train_model.py
"""
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, average_precision_score
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

ROOT = Path(__file__).resolve().parent.parent
CSV = ROOT / "dataset" / "cleaned_dataset_Thyroid1.csv"
OUT = ROOT / "models"

# Value column -> the flag saying whether the test was actually run.
LAB_FLAGS = {"TSH": "TSH measured", "TT4": "TT4 measured",
             "T4U": "T4U measured", "FTI": "FTI measured"}


def load_clean():
    """Same cleaning as the notebooks: drop duplicates, undo the mean-imputation."""
    df = pd.read_csv(CSV).drop_duplicates()
    for value, flag in LAB_FLAGS.items():
        df.loc[df[flag] == 0, value] = np.nan
    df.loc[~df["sex"].isin([0.0, 1.0]), "sex"] = np.nan
    return df.drop(columns=["hypopituitary"])


def main():
    df = load_clean()
    X = df.drop(columns=["binaryClass"])
    y = df["binaryClass"]

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
        "features": list(X.columns),      # column order the models expect
        "lab_flags": LAB_FLAGS,
        "default_threshold": 0.5,
    }, indent=2))

    for f in ["rf.joblib", "dt.joblib", "metadata.json"]:
        print(f"wrote models/{f}  ({(OUT / f).stat().st_size / 1e6:.2f} MB)")


if __name__ == "__main__":
    main()
