from beanie import Document, Indexed
from pydantic import Field
from typing import Optional, List
from datetime import datetime, timezone, date
from app.schemas.analysis import SourceEnum

class PatentRecord(Document):
    patent_number: Indexed(str, unique=True)
    title: str
    publication_date: Optional[date] = None
    assignee: Optional[str] = None
    abstract: Optional[str] = None
    source: SourceEnum
    source_url: str
    legal_status: Optional[str] = None
    smiles: Optional[str] = None
    embedding: Optional[List[float]] = None
    first_seen_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "patents"
