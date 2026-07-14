"""
Guard rails around LLM-generated SQL before it ever touches the database.

Rules enforced:
- Must be a single SELECT (or WITH ... SELECT) statement. No writes, no DDL,
  no multi-statement injection via semicolons.
- Blocklist of dangerous keywords as a defense-in-depth backstop.
- Automatic LIMIT injection if the query doesn't already have one, capped at
  settings.MAX_ROWS.
"""
import re

from .config import settings

FORBIDDEN_KEYWORDS = [
    "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE",
    "GRANT", "REVOKE", "ATTACH", "DETACH", "COPY", "EXPORT", "IMPORT",
    "PRAGMA", "CALL", "INSTALL", "LOAD",
]


class SQLValidationError(Exception):
    pass


def validate_and_prepare(sql: str) -> str:
    cleaned = sql.strip().rstrip(";").strip()

    if not cleaned:
        raise SQLValidationError("Empty SQL statement.")

    # disallow multiple statements
    if ";" in cleaned:
        raise SQLValidationError("Multiple SQL statements are not allowed.")

    first_word = cleaned.split(None, 1)[0].upper()
    if first_word not in ("SELECT", "WITH"):
        raise SQLValidationError("Only SELECT queries are allowed.")

    upper = cleaned.upper()
    for kw in FORBIDDEN_KEYWORDS:
        if re.search(rf"\b{kw}\b", upper):
            raise SQLValidationError(f"Query contains a forbidden keyword: {kw}")

    # enforce a row limit if none is present
    if not re.search(r"\bLIMIT\s+\d+\b", upper):
        cleaned = f"{cleaned}\nLIMIT {settings.MAX_ROWS}"
    else:
        # clamp any existing LIMIT to MAX_ROWS
        def clamp(match):
            n = int(match.group(1))
            return f"LIMIT {min(n, settings.MAX_ROWS)}"
        cleaned = re.sub(r"LIMIT\s+(\d+)", clamp, cleaned, flags=re.IGNORECASE)

    return cleaned
