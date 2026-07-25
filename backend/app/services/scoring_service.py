import numpy as np
from datetime import datetime, timezone
from typing import Optional, List
from app.models.patent import PatentRecord
from app.schemas.analysis import RiskTier

def cosine_similarity(v1, v2):
    v1, v2 = np.array(v1), np.array(v2)
    norm1, norm2 = np.linalg.norm(v1), np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(v1, v2) / (norm1 * norm2))

def tanimoto_similarity(arr1, arr2):
    arr1, arr2 = np.array(arr1, dtype=bool), np.array(arr2, dtype=bool)
    intersect = np.sum(arr1 & arr2)
    union = np.sum(arr1 | arr2)
    if union == 0: return 0.0
    return float(intersect) / float(union)

class ScoringService:
    @staticmethod
    def score_patent(
        patent: PatentRecord,
        query_embedding: Optional[List[float]],
        query_fingerprint: Optional[np.ndarray] = None,
        patent_fingerprint: Optional[np.ndarray] = None,
    ) -> dict:
        
        # 1. Structural Component (0-50)
        structural_score = 0.0
        if query_fingerprint is not None and patent_fingerprint is not None:
            sim = tanimoto_similarity(query_fingerprint, patent_fingerprint)
            structural_score = float(sim * 50.0)

        # 2. Semantic Component (0-30)
        semantic_score = 0.0
        if query_embedding and patent.embedding:
            sim = cosine_similarity(query_embedding, patent.embedding)
            semantic_score = float(max(0.0, sim * 30.0))

        # 3. Metadata Component (0-20)
        metadata_score = 0.0
        if patent.legal_status and patent.legal_status.lower() in ["active", "pending", "granted"]:
            metadata_score += 10.0
        
        if patent.publication_date:
            years_ago = datetime.now(timezone.utc).date().year - patent.publication_date.year
            if years_ago <= 5:
                metadata_score += 5.0
                
        # Mock assignee overlap check
        if patent.assignee:
            metadata_score += 5.0

        # Composite and Tier
        composite = structural_score + semantic_score + metadata_score
        composite = min(100.0, max(0.0, composite))
        
        if composite >= 75:
            tier = RiskTier.HIGH
        elif composite >= 50:
            tier = RiskTier.REQUIRES_REVIEW
        else:
            tier = RiskTier.LOW
            
        return {
            "structural_score": round(structural_score, 2),
            "semantic_score": round(semantic_score, 2),
            "metadata_score": round(metadata_score, 2),
            "composite_risk_score": round(composite, 2),
            "risk_tier": tier
        }
