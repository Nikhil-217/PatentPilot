from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "PatentPilot API"
    MONGODB_URI: str = "mongodb://localhost:27017/patent_pilot?serverSelectionTimeoutMS=2000"
    GROQ_API_KEY: Optional[str] = None
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
