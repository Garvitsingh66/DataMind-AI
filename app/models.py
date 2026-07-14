from typing import Any, Optional
from pydantic import BaseModel


class AskRequest(BaseModel):
    question: str
    # if the user already confirmed a specific SQL (e.g. after reviewing it), it can be
    # passed back in to skip regeneration and just execute + analyze it.
    confirmed_sql: Optional[str] = None


class AskResponse(BaseModel):
    question: str
    sql: str
    explanation: str
    columns: list[str]
    rows: list[dict[str, Any]]
    row_count: int
    truncated: bool
    chart: Optional[dict[str, Any]] = None
    chart_type: Optional[str] = None
    insight: str
    anomalies: list[dict[str, Any]]
    query_time_sec: float


class DatasetStat(BaseModel):
    name: str
    row_count: int
    column_count: int


class DatasetListResponse(BaseModel):
    datasets: list[DatasetStat]



class SchemaResponse(BaseModel):
    tables: dict[str, Any]


class HistoryItem(BaseModel):
    question: str
    sql: str
    row_count: int


class HistoryResponse(BaseModel):
    items: list[HistoryItem]
