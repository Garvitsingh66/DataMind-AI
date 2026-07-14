"""
DuckDB engine wrapper.

- Loads every CSV in DATA_DIR as a table (table name = filename without extension).
- Also supports attaching a live Postgres/MySQL database via DuckDB's scanner
  extensions if you want to query a real production DB instead of / in addition
  to CSVs (see `attach_postgres` below).
"""
import glob
import os
import duckdb

from .config import settings


class Engine:
    def __init__(self):
        self.con = duckdb.connect(settings.DUCKDB_PATH or ":memory:")
        self._load_csvs()

    def _load_csvs(self):
        pattern = os.path.join(settings.DATA_DIR, "*.csv")
        for path in glob.glob(pattern):
            table_name = os.path.splitext(os.path.basename(path))[0]
            # sanitize table name to be a safe SQL identifier
            safe_name = "".join(c if c.isalnum() or c == "_" else "_" for c in table_name)
            self.con.execute(
                f"CREATE OR REPLACE TABLE {safe_name} AS SELECT * FROM read_csv_auto(?, header=True)",
                [path],
            )

    def attach_postgres(self, connection_string: str, alias: str = "pg"):
        """
        Optional: attach a live Postgres database instead of / alongside CSVs.
        Requires the duckdb postgres extension (installed automatically on first use).
        Example connection_string: 'host=localhost port=5432 dbname=mydb user=me password=secret'
        """
        self.con.execute("INSTALL postgres;")
        self.con.execute("LOAD postgres;")
        self.con.execute(f"ATTACH '{connection_string}' AS {alias} (TYPE postgres);")

    def load_single_csv(self, file_path: str) -> str:
        table_name = os.path.splitext(os.path.basename(file_path))[0]
        safe_name = "".join(c if c.isalnum() or c == "_" else "_" for c in table_name)
        self.con.execute(
            f"CREATE OR REPLACE TABLE {safe_name} AS SELECT * FROM read_csv_auto(?, header=True)",
            [file_path],
        )
        return safe_name

    def drop_table(self, table_name: str):
        safe_name = "".join(c if c.isalnum() or c == "_" else "_" for c in table_name)
        self.con.execute(f"DROP TABLE IF EXISTS {safe_name}")
        # clean up the file
        csv_path = os.path.join(settings.DATA_DIR, f"{table_name}.csv")
        if os.path.exists(csv_path):
            try:
                os.remove(csv_path)
            except Exception:
                pass

    def get_tables_stats(self) -> list[dict]:
        stats = []
        for table in self.list_tables():
            try:
                row_count = self.con.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
                cols = self.table_schema(table)
                stats.append({
                    "name": table,
                    "row_count": row_count,
                    "column_count": len(cols)
                })
            except Exception:
                pass
        return stats

    def list_tables(self) -> list[str]:
        return [r[0] for r in self.con.execute("SHOW TABLES").fetchall()]

    def table_schema(self, table: str) -> list[tuple]:
        return self.con.execute(f"DESCRIBE {table}").fetchall()

    def sample_rows(self, table: str, n: int = 3) -> list[tuple]:
        return self.con.execute(f"SELECT * FROM {table} LIMIT {n}").fetchall()

    def run_query(self, sql: str):
        """Returns a pandas DataFrame. Caller is responsible for SQL validation."""
        return self.con.execute(sql).fetch_df()


# module-level singleton, reused across requests
engine = Engine()

