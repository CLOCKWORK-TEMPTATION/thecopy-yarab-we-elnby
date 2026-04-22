from __future__ import annotations

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = BASE_DIR / "director_copilot.db"
DEFAULT_STORAGE_DIR = BASE_DIR / "storage"
DEFAULT_EXPORT_DIR = BASE_DIR / "exports"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="DIRECTOR_COPILOT_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Director Copilot Arabic API"
    app_version: str = "0.2.0-mvp"
    api_prefix: str = "/api/v1"

    database_url: str = f"sqlite:///{DEFAULT_DB_PATH}"
    storage_dir: Path = Field(default=DEFAULT_STORAGE_DIR)
    export_dir: Path = Field(default=DEFAULT_EXPORT_DIR)

    default_organization_name: str = "Default Organization"
    default_organization_slug: str = "default-org"
    default_workspace_name: str = "Default Workspace"
    default_workspace_slug: str = "default-workspace"
    default_timezone: str = "Africa/Cairo"
    default_locale: str = "ar"

    cors_allow_origins: list[str] = Field(default_factory=lambda: ["*"])

    def ensure_paths(self) -> None:
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.export_dir.mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_paths()
