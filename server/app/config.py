from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

SERVER_ROOT = Path(__file__).resolve().parent.parent
_DEFAULT_DB = (SERVER_ROOT / "data" / "app.db").resolve().as_posix()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = f"sqlite:///{_DEFAULT_DB}"
    ollama_host: str = "http://127.0.0.1:11434"
    ollama_text_model: str = "mistral:7b"
    default_persist_generated_recipes: bool = False


settings = Settings()
