"""
Lightweight, explainable anomaly detection for query results.

Intentionally avoids ML models: z-score / IQR outlier detection is
transparent, requires no training data, and is easy to justify to a business
user ("this point is 4.2 standard deviations from the mean").
"""
import pandas as pd
import numpy as np


def detect_anomalies(df: pd.DataFrame, z_threshold: float = 3.0) -> list[dict]:
    """
    Looks for numeric columns and flags rows that are statistical outliers,
    using z-score on the column distribution and, if a date/time column is
    present, on period-over-period percent change as well.
    """
    if df.empty:
        return []

    anomalies = []
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    date_cols = [c for c in df.columns if _looks_like_date(df[c])]

    for col in numeric_cols:
        series = df[col].dropna()
        if len(series) < 5 or series.std() == 0:
            continue
        z_scores = (series - series.mean()) / series.std()
        outlier_idx = z_scores[abs(z_scores) >= z_threshold].index
        for idx in outlier_idx:
            anomalies.append({
                "type": "outlier",
                "column": col,
                "row_index": int(idx),
                "value": float(df.loc[idx, col]),
                "z_score": round(float(z_scores.loc[idx]), 2),
                "context": {c: _jsonable(df.loc[idx, c]) for c in df.columns if c != col},
            })

    # period-over-period spike/dip detection if there's a date column
    if date_cols and numeric_cols:
        date_col = date_cols[0]
        try:
            sorted_df = df.sort_values(date_col)
            for col in numeric_cols:
                pct_change = sorted_df[col].pct_change()
                spikes = pct_change[abs(pct_change) >= 1.0]  # >=100% swing period-over-period
                for idx in spikes.index:
                    anomalies.append({
                        "type": "spike_or_dip",
                        "column": col,
                        "row_index": int(idx),
                        "value": float(sorted_df.loc[idx, col]),
                        "pct_change": round(float(pct_change.loc[idx]) * 100, 1),
                        "date": _jsonable(sorted_df.loc[idx, date_col]),
                    })
        except Exception:
            pass

    return anomalies[:25]  # cap so this never floods the response


def _looks_like_date(series: pd.Series) -> bool:
    if pd.api.types.is_datetime64_any_dtype(series):
        return True
    name = str(series.name).lower()
    return "date" in name or "time" in name or "day" in name or "month" in name


def _jsonable(val):
    if isinstance(val, (pd.Timestamp,)):
        return val.isoformat()
    if isinstance(val, (np.integer,)):
        return int(val)
    if isinstance(val, (np.floating,)):
        return float(val)
    return val
