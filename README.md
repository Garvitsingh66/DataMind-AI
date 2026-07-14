# AI Data Analyst Copilot

Ask business questions in plain English → get generated SQL, a result table, an
auto-selected chart, statistically-detected anomalies, and a plain-English
insight. Runs against DuckDB, either querying local CSVs directly or a live
Postgres/MySQL database.

## Architecture

```
question
   │
   ▼
schema retrieval (keyword overlap over table/column names)
   │
   ▼
Hugging Face (free Inference API) → generates SQL + explanation (JSON)
   │
   ▼
SQL guard: SELECT-only, no multi-statement, blocklist, LIMIT clamp
   │
   ▼
DuckDB executes query
   │
   ├──► anomaly.py: z-score outliers + period-over-period spike/dip detection
   ├──► charting.py: rule-based chart-type selection → Plotly figure JSON
   └──► Hugging Face → plain-English insight, grounded in computed stats + anomalies
   │
   ▼
JSON response → frontend renders SQL, table, chart, insight, anomalies
```

Two separate LLM calls are used, not one: SQL generation and insight
narration have different failure modes and different amounts of context
(schema vs. computed results), so keeping them separate makes each prompt
simpler and easier to debug. Chart-type selection is deliberately **not**
an LLM call — it's a cheap, deterministic rule based on the result set's
column types, which is both faster and more reliable than asking a model to
pick a chart type from a text description.

This project uses Hugging Face's free serverless Inference API
(`app/llm.py`, via the `huggingface_hub` SDK, forced to the `hf-inference`
provider so it stays on the free rate-limited tier rather than billing
through a paid routed provider). Swapping to a different provider
(Anthropic, OpenAI, Gemini) only requires editing `app/llm.py` and
`app/config.py` — nothing else in the pipeline depends on which model is
behind it.

## Project layout

```
app/
  main.py            FastAPI app: /ask, /schema, /history, /health
  db.py               DuckDB connection, CSV loading, optional Postgres attach
  schema_catalog.py   Builds schema text for prompts; keyword-based table retrieval
  llm.py              Hugging Face API calls: NL->SQL, insight generation
  sql_guard.py        SELECT-only validation, keyword blocklist, LIMIT enforcement
  anomaly.py          Z-score + period-over-period anomaly detection
  charting.py         Rule-based chart type selection + Plotly figure builder
  models.py           Pydantic request/response schemas
  config.py           Settings from environment variables
data/
  sales.csv           Synthetic demo dataset (2 years of daily sales, with
                       two injected anomalies for testing)
frontend/
  index.html          Minimal single-page UI to exercise the API
```

## Setup

```bash
cd ai_data_analyst_copilot
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# edit .env and set HF_API_KEY
```

Get a free token from **https://huggingface.co/settings/tokens** (sign up if
you don't have an account, then click **Create new token**, type "Read" is
enough). No credit card required for the default free tier used here.

The default model (`Qwen/Qwen2.5-7B-Instruct`) runs on Hugging Face's free,
rate-limited serverless Inference API. If that specific model ever becomes
unavailable on the free tier, browse alternatives at
https://huggingface.co/models?inference_provider=hf-inference&pipeline_tag=text-generation
and swap `MODEL_NAME` in `.env` — any instruction-tuned chat model under
about 10B parameters listed there should work as a drop-in replacement.

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

Then open `frontend/index.html` directly in a browser (it calls
`http://localhost:8000` — update `API_BASE` in the file if you deploy the
API elsewhere), or use curl:

```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What was total revenue by region for 2025?"}'
```

Other endpoints:
- `GET /schema` — full introspected schema (tables, columns, sample rows)
- `GET /history` — recent questions asked this session
- `GET /health` — liveness check + list of loaded tables

## Using your own data

**CSVs:** drop any `.csv` files into `data/` — each becomes a table named
after the file (e.g. `orders.csv` → table `orders`). Restart the server to
reload.

**A live database:** call `engine.attach_postgres(connection_string)` from
`app/db.py` (or add an equivalent call at startup in `main.py`). DuckDB's
Postgres/MySQL scanner extensions let you query the live database directly
without copying data — the rest of the pipeline (schema retrieval, SQL
generation, guard rails, anomaly detection, charting) works unchanged.

## Troubleshooting the free Hugging Face tier

- **"Model not found" / 404 on a chat completion**: the free `hf-inference`
  provider only hosts a rotating subset of models, and availability changes.
  Pick a different model from the link above and update `MODEL_NAME`.
- **429 / rate limited**: the free tier has fairly tight per-hour request
  limits. Wait a bit, or upgrade to Hugging Face PRO ($9/month) for higher
  limits — see `app/llm.py`'s `InferenceClient(provider="hf-inference", ...)`
  call, which is the only place that would need to change if you switch to a
  paid routed provider (Together, Groq, Fireworks, etc. all work through the
  same `huggingface_hub` client, just with a different `provider=` value).
- **Malformed JSON from the model**: smaller open models are less reliable
  at strictly following "return only JSON" instructions than frontier
  closed models. `llm.py`'s `_extract_json()` already strips markdown
  fences and grabs the outermost `{...}` block to compensate, but if a
  specific model consistently fails, try a different one — instruction-
  tuned models in the 7B+ range (Qwen2.5, Llama 3.1) tend to be reliable
  enough for this structured-output task.

## Safety notes for going to production

- `sql_guard.py` currently blocks writes/DDL and multi-statement queries and
  clamps row limits. For a real production DB, also run the DB connection
  itself with a **read-only** role — the app-level guard is defense in depth,
  not a substitute for DB-level permissions.
- Consider adding a "confirm before run" step in the UI for anything that
  will inform a decision — the `/ask` endpoint already supports this via the
  `confirmed_sql` field, so you can show the generated SQL first and only
  execute after the user approves it.
- The schema-retrieval step is keyword-based, which is a fine baseline up to
  a few dozen tables. For larger schemas, swap `relevant_tables()` in
  `schema_catalog.py` for embedding-based retrieval over table/column
  descriptions.
- `/history` is in-memory only and resets on restart — swap for a database
  table if you need it to persist across deployments or across users.

## Demo data

`data/sales.csv` is synthetic: ~4,300 rows of daily transactions across 4
regions, 4 products, and 3 customer segments from July 2024–June 2026, with
two anomalies deliberately injected so you can test the detector:
- A revenue spike in APAC for "Insight Pro", March 10–14, 2026
- A revenue crash in LATAM, May 1–7, 2026

Try asking: *"Show daily revenue trend for APAC in March 2026"* or
*"Show weekly revenue for LATAM in 2026"* to see both flagged.
