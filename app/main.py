import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import time
import os
import shutil

from .db import engine
from .schema_catalog import build_full_catalog, relevant_tables, catalog_to_prompt_text
from .sql_guard import validate_and_prepare, SQLValidationError
from .llm import generate_sql, generate_insight
from .anomaly import detect_anomalies
from .charting import pick_chart_and_build
from .models import (
    AskRequest, AskResponse, SchemaResponse, HistoryResponse, HistoryItem,
    DatasetStat, DatasetListResponse
)
from .config import settings

app = FastAPI(title="AI Data Analyst Copilot", version="0.1.0")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this for production
    allow_methods=["*"],
    allow_headers=["*"],
)

# in-memory history for this process (swap for a DB table if you need persistence)
_history: list[HistoryItem] = []


@app.get("/health")
def health():
    return {"status": "ok", "tables": engine.list_tables()}


@app.get("/schema", response_model=SchemaResponse)
def get_schema():
    return SchemaResponse(tables=build_full_catalog())


@app.get("/history", response_model=HistoryResponse)
def get_history():
    return HistoryResponse(items=list(reversed(_history[-50:])))


@app.get("/datasets", response_model=DatasetListResponse)
def get_datasets():
    stats = engine.get_tables_stats()
    datasets = [DatasetStat(**stat) for stat in stats]
    return DatasetListResponse(datasets=datasets)


@app.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
    
    # ensure DATA_DIR exists
    os.makedirs(settings.DATA_DIR, exist_ok=True)
    
    file_path = os.path.join(settings.DATA_DIR, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")
        
    try:
        table_name = engine.load_single_csv(file_path)
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"Failed to load CSV into DuckDB: {e}")
        
    return {"status": "success", "table_name": table_name}


@app.delete("/datasets/{name}")
def delete_dataset(name: str):
    try:
        engine.drop_table(name)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to delete dataset: {e}")


@app.post("/ask", response_model=AskResponse)
def ask(req: AskRequest):
    question = req.question.strip()
    if not question:
        raise HTTPException(400, "question must not be empty")

    catalog = build_full_catalog()
    if not catalog:
        raise HTTPException(500, "No tables loaded. Add CSVs to DATA_DIR or attach a database.")

    # 1. Generate SQL (or use a pre-confirmed query from the user)
    if req.confirmed_sql:
        sql_raw = req.confirmed_sql
        explanation = "Using the SQL you confirmed."
    else:
        tables = relevant_tables(question, catalog)
        schema_text = catalog_to_prompt_text(catalog, tables)
        try:
            generated = generate_sql(question, schema_text)
        except Exception as e:
            raise HTTPException(502, f"SQL generation failed: {e}")
        sql_raw = generated["sql"]
        explanation = generated.get("explanation", "")

    # 2. Validate / sandbox the SQL before running anything
    try:
        sql_safe = validate_and_prepare(sql_raw)
    except SQLValidationError as e:
        raise HTTPException(400, f"Generated SQL rejected by safety checks: {e}")

    # 3. Execute
    start_time = time.time()
    try:
        df = engine.run_query(sql_safe)
    except Exception as e:
        raise HTTPException(400, f"Query execution failed: {e}")
    query_time_sec = time.time() - start_time

    truncated = len(df) >= _MAX_ROWS_HINT(sql_safe)

    # 4. Anomaly detection (deterministic, runs on the actual result set)
    anomalies = detect_anomalies(df)

    # 5. Chart selection (rule-based on result shape)
    chart_type, chart_json = pick_chart_and_build(df, question)

    # 6. Narrative insight (LLM, grounded in the computed summary + anomalies, not raw generation)
    try:
        insight = generate_insight(question, df, anomalies)
    except Exception as e:
        insight = f"(Insight generation unavailable: {e})"

    _history.append(HistoryItem(question=question, sql=sql_safe, row_count=len(df)))

    return AskResponse(
        question=question,
        sql=sql_safe,
        explanation=explanation,
        columns=list(df.columns),
        rows=_df_to_records(df),
        row_count=len(df),
        truncated=truncated,
        chart=chart_json,
        chart_type=chart_type,
        insight=insight,
        anomalies=anomalies,
        query_time_sec=round(query_time_sec, 3)
    )



def _df_to_records(df: pd.DataFrame) -> list[dict]:
    clean = df.copy()
    for col in clean.columns:
        if pd.api.types.is_datetime64_any_dtype(clean[col]):
            clean[col] = clean[col].astype(str)
    clean = clean.replace({np.nan: None})
    return clean.to_dict(orient="records")


def _MAX_ROWS_HINT(sql: str) -> int:
    import re
    m = re.search(r"LIMIT\s+(\d+)", sql, flags=re.IGNORECASE)
    return int(m.group(1)) if m else 10**9
