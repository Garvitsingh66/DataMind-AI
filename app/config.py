import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    # Any chat-capable model available via Hugging Face's free "hf-inference" provider.
    # Browse options at https://huggingface.co/models?inference_provider=hf-inference&pipeline_tag=text-generation
    MODEL_NAME: str = os.getenv("MODEL_NAME", "llama-3.1-8b-instant")
    DATA_DIR: str = os.getenv("DATA_DIR", "./data")
    DUCKDB_PATH: str = os.getenv("DUCKDB_PATH", "")  # empty => in-memory
    MAX_ROWS: int = int(os.getenv("MAX_ROWS", "5000"))
    QUERY_TIMEOUT_SECONDS: int = int(os.getenv("QUERY_TIMEOUT_SECONDS", "15"))


settings = Settings()
