from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from enum import Enum
from beanie import PydanticObjectId

class AnalysisStatus(str, Enum):
    PENDING = "pending"
    RETRIEVING = "retrieving"
    SCORING = "scoring"
    READY_FOR_REVIEW = "ready_for_review"
    REPORTED = "reported"
    FAILED = "failed"

class RecommendationTier(str, Enum):
    LOW_RISK = "low_risk"
    REQUIRES_REVIEW = "requires_review"
    HIGH_RISK = "high_risk"

class RiskTier(str, Enum):
    LOW = "low"
    REQUIRES_REVIEW = "requires_review"
    HIGH = "high"

class SourceEnum(str, Enum):
    PUBCHEM = "pubchem"
    SURECHEMBL = "surechembl"
    GOOGLE_PATENTS = "google_patents"

class PatentMatch(BaseModel):
    patent_id: PydanticObjectId
    structural_score: float = 0.0
    semantic_score: float = 0.0
    metadata_score: float = 0.0
    composite_risk_score: float = 0.0
    risk_tier: RiskTier = RiskTier.LOW
    ai_explanation: str = ""
    flagged_for_manual_review: bool = False
    researcher_note: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Report(BaseModel):
    executive_summary: str
    key_similar_patents: List[Dict[str, Any]]
    novelty_concerns: str
    manual_review_patents: List[Dict[str, Any]]
    overall_recommendation: RecommendationTier
    methodology_notes: str
    confidence_level: float
    generated_at: datetime = Field(default_factory=datetime.utcnow)

class AnalysisRequest(BaseModel):
    smiles: str
    target: Optional[str] = None
    indication: Optional[str] = None

class AnalysisResponse(BaseModel):
    analysis_id: str
    status: AnalysisStatus
    canonical_smiles: Optional[str] = None
