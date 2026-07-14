"""
Picks a chart type from the shape of the result set and builds a Plotly
figure. Deliberately rule-based rather than another LLM call: it's faster,
free, and deterministic, and result-set shape is a strong enough signal in
practice (time series -> line, category + number -> bar, two numerics ->
scatter, single number -> big-number/table).
"""
import json
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.io as pio


def pick_chart_and_build(df: pd.DataFrame, question: str) -> tuple[str | None, dict | None]:
    if df.empty or len(df.columns) == 0:
        return None, None

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    date_cols = [c for c in df.columns if _looks_like_date(df[c])]
    non_numeric_cols = [c for c in df.columns if c not in numeric_cols]

    fig = None
    chart_type = None

    try:
        if date_cols and numeric_cols:
            # time series -> line chart, one line per extra categorical column if present
            date_col = date_cols[0]
            color_col = next((c for c in non_numeric_cols if c != date_col), None)
            fig = px.line(
                df.sort_values(date_col), x=date_col, y=numeric_cols[0],
                color=color_col, title=_title(question),
            )
            chart_type = "line"

        elif len(non_numeric_cols) >= 1 and numeric_cols:
            # categorical breakdown -> bar chart
            cat_col = non_numeric_cols[0]
            # if too many categories, keep it readable by taking the top 20 by value
            plot_df = df.copy()
            if plot_df[cat_col].nunique() > 20:
                plot_df = plot_df.nlargest(20, numeric_cols[0])
            color_col = non_numeric_cols[1] if len(non_numeric_cols) > 1 else None
            fig = px.bar(
                plot_df, x=cat_col, y=numeric_cols[0], color=color_col,
                title=_title(question),
            )
            chart_type = "bar"

        elif len(numeric_cols) >= 2:
            # two numeric columns -> scatter
            fig = px.scatter(
                df, x=numeric_cols[0], y=numeric_cols[1], title=_title(question)
            )
            chart_type = "scatter"

        elif len(numeric_cols) == 1 and len(df) == 1:
            # single scalar result -> no chart, front-end can show a big number
            return None, None

    except Exception:
        return None, None

    if fig is None:
        return None, None

    fig.update_layout(
        margin=dict(l=40, r=20, t=50, b=40),
        template="plotly_white",
    )
    fig_json = json.loads(pio.to_json(fig))
    return chart_type, fig_json


def _looks_like_date(series: pd.Series) -> bool:
    if pd.api.types.is_datetime64_any_dtype(series):
        return True
    name = str(series.name).lower()
    return "date" in name or "time" in name or "month" in name or "day" in name


def _title(question: str) -> str:
    q = question.strip()
    return q if len(q) <= 80 else q[:77] + "..."
