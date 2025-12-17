from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Admin Credentials
    ADMIN_PHONE: str
    ADMIN_OTP: str

    # Database
    DATABASE_URL: str

    # CORS
    CORS_ORIGINS: str

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
