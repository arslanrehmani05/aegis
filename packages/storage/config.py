from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    
    # Database Configuration
    DATABASE_URL: str = "postgresql+asyncpg://aegis_user:aegis_password@localhost:5432/aegis_db"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    
    # Redis Queue & Lease Configuration
    REDIS_URL: str = "redis://localhost:6379/0"
    DEFAULT_LEASE_TTL_SECONDS: int = 30
    HEARTBEAT_INTERVAL_SECONDS: int = 10
    
    # Security Configuration
    SECRET_KEY: str = "super-secret-aegis-key-change-in-production"
    WEBHOOK_SIGNING_SECRET: str = "aegis-webhook-signing-secret"
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
