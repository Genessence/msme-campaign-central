from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    """Application settings"""
    
    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "MSME Campaign Central"
    
    # Database
    DATABASE_URL: str = "sqlite:///./msme_campaign.db"
    
    # Security
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Email
    SENDGRID_API_KEY: Optional[str] = None
    FROM_EMAIL: str = "noreply@yourcompany.com"
    
    # WhatsApp
    WHATSAPP_ACCESS_TOKEN: Optional[str] = None
    WHATSAPP_PHONE_NUMBER_ID: Optional[str] = None
    
    # Background Tasks
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    
    # File Upload
    MAX_FILE_SIZE: int = 10485760  # 10MB
    UPLOAD_DIR: str = "./uploads"
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8080"]
    
    # Supabase (Optional)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra environment variables


settings = Settings()
