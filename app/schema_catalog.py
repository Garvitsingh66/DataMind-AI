"""
Builds a compact, LLM-friendly description of the database schema, and does a
lightweight keyword-based retrieval step so that on databases with many tables
we only feed the model the schema of tables that are actually relevant to the
question. This is the "RAG" layer: retrieval over schema metadata rather than
document text.

For a large production database (50+ tables) this keyword approach should be
swapped for embedding-based retrieval over table/column descriptions, but
keyword overlap is a strong, cheap baseline and keeps this dependency-light.
"""
from .db import engine


def build_full_catalog() -> dict:
    """Introspect every table: columns, types, and a few sample rows."""
    catalog = {}
    for table in engine.list_tables():
        cols = engine.table_schema(table)  # (column_name, column_type, null, key, default, extra)
        samples = engine.sample_rows(table, n=3)
        col_names = [c[0] for c in cols]
        catalog[table] = {
            "columns": [{"name": c[0], "type": c[1]} for c in cols],
            "sample_rows": [dict(zip(col_names, row)) for row in samples],
        }
    return catalog


def relevant_tables(question: str, catalog: dict, max_tables: int = 6) -> list[str]:
    """
    Rank tables by keyword overlap between the question and table/column names.
    Falls back to returning all tables if the catalog is small.
    """
    if len(catalog) <= max_tables:
        return list(catalog.keys())

    q_words = set(w.lower().strip(",.?!") for w in question.split())
    scores = []
    for table, meta in catalog.items():
        vocab = {table.lower()} | {c["name"].lower() for c in meta["columns"]}
        overlap = len(q_words & vocab)
        scores.append((overlap, table))
    scores.sort(reverse=True)
    top = [t for score, t in scores if score > 0][:max_tables]
    # guarantee at least one table is returned even with no keyword overlap
    return top or list(catalog.keys())[:max_tables]


def catalog_to_prompt_text(catalog: dict, tables: list[str]) -> str:
    """Render the schema of the given tables as compact text for the LLM prompt."""
    chunks = []
    for table in tables:
        meta = catalog.get(table)
        if not meta:
            continue
        col_lines = "\n".join(f"  - {c['name']} ({c['type']})" for c in meta["columns"])
        sample = meta["sample_rows"][0] if meta["sample_rows"] else {}
        chunks.append(
            f"Table: {table}\nColumns:\n{col_lines}\nExample row: {sample}"
        )
    return "\n\n".join(chunks)
