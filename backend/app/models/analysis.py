from beanie import Document
from pydantic import Field
from typing import List, Optional
from datetime import datetime, timezone
from app.schemas.analysis import AnalysisStatus, PatentMatch, Report, RecommendationTier

class AnalysisRecord(Document):
    smiles_input: str
    canonical_smiles: Optional[str] = None
    inchikey: Optional[str] = None
    target: Optional[str] = None
    indication: Optional[str] = None
    status: AnalysisStatus = AnalysisStatus.PENDING
    overall_composite_score: Optional[float] = None
    overall_recommendation: Optional[RecommendationTier] = None
    patent_matches: List[PatentMatch] = []
    report: Optional[Report] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "analyses"
