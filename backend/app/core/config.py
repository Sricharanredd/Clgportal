"""Environment-based application configuration (pydantic-settings)."""
from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central settings loaded from environment / .env file."""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # Application
    app_env: str = "development"
    app_name: str = "Intermediate College Management Portal"
    debug: bool = False

    # Database
    db_host: str = "localhost"
    db_port: int = 3306
    db_name: str = "cmp_portal"
    db_user: str = "cmp_app"
    db_password: str = ""
    db_echo: bool = False

    # Security
    jwt_secret: str = Field(default="insecure-dev-secret")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # CORS
    cors_origins: str = "http://localhost:5173"

    # Rate limiting
    login_rate_limit: str = "5/minute"
    lookup_rate_limit: str = "10/minute"

    # Parent verification
    parent_verification_enabled: bool = True

    @field_validator("jwt_secret")
    @classmethod
    def _warn_weak_secret(cls, value: str) -> str:
        if len(value) < 16:
            raise ValueError("JWT_SECRET must be at least 16 characters")
        return value

    @property
    def database_url(self) -> str:  # sync URL (pymysql driver)
        from urllib.parse import quote_plus

        # Credentials are URL-encoded so special characters (e.g. '@', ':')
        # in passwords never corrupt the connection string.
        user = quote_plus(self.db_user)
        password = quote_plus(self.db_password)
        return (
            f"mysql+pymysql://{user}:{password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
            f"?charset=utf8mb4"
        )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_test(self) -> bool:
        return self.app_env == "test"


@lru_cache
def get_settings() -> Settings:
    """Cached application settings singleton."""
    return Settings()
