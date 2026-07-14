import json
import re
import pandas as pd
from groq import Groq

from .config import settings

# provider="hf-inference" forces the free, rate-limited serverless Inference API
# rather than routing to a paid third-party provider (Together, Fireworks, etc.),
# which would draw down paid Inference Provider credits instead.
_client = (
    Groq(api_key=settings.GROQ_API_KEY) if settings.GROQ_API_KEY else None
)


def _require_client():
    if _client is None:
        raise RuntimeError(
            "GROQ_API_KEY is not set. Add it to your .env file (see .env.example)."
        )
    return _client


def _extract_json(text: str) -> dict:
    """Strip markdown code fences if the model wrapped its JSON in them, then parse."""
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    # some open models add stray text before/after the JSON object; grab the outermost braces
    match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
    if match:
        cleaned = match.group(0)
    return json.loads(cleaned)


SQL_SYSTEM_PROMPT = """You are a senior data analyst that translates business questions into DuckDB SQL.

Rules:
- Only write a single SELECT statement (or a WITH ... SELECT). Never write INSERT/UPDATE/DELETE/DDL.
- Only use tables and columns that appear in the provided schema. Never invent column or table names.
- Prefer explicit column lists over SELECT * when the question implies specific fields.
- Use clear aliases for aggregated/computed columns (e.g. AS total_revenue).
- If the question is ambiguous, make the most reasonable business interpretation and state your
  assumption in the explanation field.
- Return ONLY a JSON object, no markdown fences, no commentary outside the JSON, in this exact shape:
  {"sql": "...", "explanation": "..."}
- "explanation" should be 1-3 plain-English sentences a non-technical stakeholder can understand,
  describing what the query computes (not restating the SQL syntax).
"""

INSIGHT_SYSTEM_PROMPT = """You are a data analyst summarizing query results for a business stakeholder.

You will be given: the original question, a statistical summary of the result set, and a list of
any statistically detected anomalies (outliers or period-over-period spikes/dips).

Write a concise (2-5 sentence) plain-English insight. Lead with the direct answer to the question,
then call out any notable trend or anomaly and, if useful, a plausible business interpretation
(clearly framed as a possibility, not a certainty, since you don't have causal information).
Do not invent numbers that are not present in the provided summary. Return plain text only, no JSON,
no markdown headers.
"""


def generate_sql(question: str, schema_text: str) -> dict:
    client = _require_client()
    user_msg = f"""Database schema (relevant tables only):

{schema_text}

Business question: {question}

Respond with the JSON object described in your instructions."""

    completion = client.chat.completions.create(
        model=settings.MODEL_NAME,
        messages=[
            {"role": "system", "content": SQL_SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        max_tokens=1000,
        temperature=0.1,
    )
    text = completion.choices[0].message.content
    try:
        parsed = _extract_json(text)
    except Exception as e:
        raise ValueError(f"Could not parse SQL generation response as JSON: {text}") from e

    if "sql" not in parsed:
        raise ValueError(f"Model response missing 'sql' field: {parsed}")
    return parsed


def generate_insight(question: str, df: pd.DataFrame, anomalies: list[dict]) -> str:
    client = _require_client()

    summary = _summarize_dataframe(df)
    user_msg = f"""Question: {question}

Result set summary:
{summary}

Detected anomalies ({len(anomalies)} found):
{json.dumps(anomalies[:10], default=str, indent=2) if anomalies else "None"}

Write the insight now."""

    completion = client.chat.completions.create(
        model=settings.MODEL_NAME,
        messages=[
            {"role": "system", "content": INSIGHT_SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        max_tokens=400,
        temperature=0.3,
    )
    return completion.choices[0].message.content.strip()


def _summarize_dataframe(df: pd.DataFrame, max_rows_shown: int = 15) -> str:
    lines = [f"Row count: {len(df)}", f"Columns: {list(df.columns)}"]
    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    if numeric_cols:
        lines.append("Numeric summary:")
        lines.append(df[numeric_cols].describe().round(2).to_string())
    lines.append("Sample rows:")
    lines.append(df.head(max_rows_shown).to_string(index=False))
    return "\n".join(lines)
