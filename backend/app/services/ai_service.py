import os
from typing import Dict, Any, List
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from app.models.analysis import AnalysisRecord
from app.models.patent import PatentRecord
from app.schemas.analysis import Report, RecommendationTier, RiskTier
from app.core.config import settings

class AIService:
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY if hasattr(settings, 'GROQ_API_KEY') else os.getenv("GROQ_API_KEY", "")
        self.llm = None
        if self.api_key:
            try:
                self.llm = ChatGroq(temperature=0.1, groq_api_key=self.api_key, model_name="llama-3.3-70b-versatile")
            except Exception:
                pass

    def explain_patent(self, patent: PatentRecord, query_context: str, score_breakdown: dict) -> str:
        if not self.llm:
            return self._fallback_explain(patent, score_breakdown)
            
        prompt = PromptTemplate(
            input_variables=["title", "abstract", "query_context", "structural", "semantic", "metadata", "composite"],
            template="""You are a patent analysis AI. Explain why this patent was matched to the user's query.
Avoid generic boilerplate phrasing. Be specific about what overlaps.
Do NOT include any conversational introduction, preamble, or concluding text. Start directly with the numbered list.
You MUST structure your explanation to answer the following four questions clearly:
1. Why was this patent retrieved?
2. Which aspects appear similar?
3. What possible overlap exists?
4. How confident is this assessment?

Patent Title: {title}
Abstract: {abstract}
Query Context: {query_context}

Scores: 
Structural Similarity (Tanimoto): {structural}/50
Semantic Similarity (Cosine): {semantic}/30
Metadata / Age / Status: {metadata}/20
Composite Risk Score: {composite}/100

Explanation:"""
        )
        try:
            chain = prompt | self.llm
            result = chain.invoke({
                "title": patent.title,
                "abstract": patent.abstract or "N/A",
                "query_context": query_context,
                "structural": score_breakdown.get('structural_score', 0),
                "semantic": score_breakdown.get('semantic_score', 0),
                "metadata": score_breakdown.get('metadata_score', 0),
                "composite": score_breakdown.get('composite_risk_score', 0)
            })
            return result.content.strip()
        except Exception:
            return self._fallback_explain(patent, score_breakdown)

    def _fallback_explain(self, patent: PatentRecord, score_breakdown: dict) -> str:
        comp = score_breakdown.get('composite_risk_score', 0)
        struc = score_breakdown.get('structural_score', 0)
        sem = score_breakdown.get('semantic_score', 0)
        meta = score_breakdown.get('metadata_score', 0)
        
        confidence = "High" if comp >= 75 else ("Medium" if comp >= 50 else "Low")
        
        reasons = []
        if struc > 0:
            reasons.append(f"structural overlap (Tanimoto score of {int(struc*2)}%) in core molecular subgraphs")
        if sem > 0:
            reasons.append(f"semantic alignment ({int(sem*3.3)}% similarity) regarding the therapeutic target/claims described in the abstract")
        if patent.legal_status:
            reasons.append(f"active IP tracking under legal status '{patent.legal_status}'")
            
        reason_str = " and ".join(reasons) if reasons else "general system query guidelines"
        
        return (
            f"1. Why retrieved: Matched due to {reason_str}. "
            f"2. Similar aspects: Key similarities lie in the documented pharmacological target and structural composition of '{patent.title}'. "
            f"3. Potential overlap: Overlap may exist in the therapeutic claims and derivative formulations associated with {patent.assignee or 'the assignee'}. "
            f"4. Confidence: We are {confidence}ly confident in this assessment (composite score: {comp}/100, metadata contribution: {meta}/20)."
        )

    def synthesize_report(self, analysis_record: AnalysisRecord, patents: List[PatentRecord]) -> Report:
        overall_rec = RecommendationTier.LOW_RISK
        has_requires_review = False
        
        manual_reviews = []
        key_similar = []
        
        for match in analysis_record.patent_matches:
            patent = next((p for p in patents if p.id == match.patent_id), None)
            
            p_dict = {
                "patent_id": str(match.patent_id),
                "composite_risk_score": match.composite_risk_score
            }
            if patent:
                p_dict["patent_number"] = patent.patent_number
                p_dict["title"] = patent.title
            
            key_similar.append(p_dict)
            
            if match.risk_tier == RiskTier.HIGH:
                overall_rec = RecommendationTier.HIGH_RISK
            elif match.risk_tier == RiskTier.REQUIRES_REVIEW:
                has_requires_review = True
                
            if match.risk_tier == RiskTier.REQUIRES_REVIEW or match.flagged_for_manual_review:
                manual_reviews.append({
                    "patent_id": str(match.patent_id),
                    "patent_number": patent.patent_number if patent else str(match.patent_id),
                    "reason": "Flagged for expert inspection: " + (match.researcher_note or "algorithmic mid-tier risk threshold trigger.")
                })

        if overall_rec != RecommendationTier.HIGH_RISK and has_requires_review:
            overall_rec = RecommendationTier.REQUIRES_REVIEW

        # Sort key similar by score descending
        key_similar.sort(key=lambda x: x["composite_risk_score"], reverse=True)

        # Calibrate confidence dynamically
        confidence_level = 0.95
        if not patents:
            confidence_level = 0.80
        else:
            # 1. Structural similarity margin deduction (Near-misses)
            near_misses = [m for m in analysis_record.patent_matches if 20.0 <= m.structural_score < 40.0]
            if near_misses:
                confidence_level -= 0.15
                
            # 2. Missing patent metadata deductions
            missing_metadata_deduction = 0.0
            for p in patents:
                if not p.abstract:
                    missing_metadata_deduction += 0.03
                if not p.assignee or p.assignee.lower() == "unknown assignee":
                    missing_metadata_deduction += 0.02
            confidence_level -= min(0.15, missing_metadata_deduction)
            
        confidence_level = max(0.50, min(0.99, confidence_level))
        confidence_level = round(confidence_level, 2)

        # Check if query compound is a known public domain drug/chemical
        is_public_domain = False
        chem_name = getattr(analysis_record, "chemical_name", "") or ""
        chem_name_lower = chem_name.lower().strip()
        public_domain_chemicals = ["caffeine", "acetaminophen", "paracetamol", "aspirin", "salicylic acid", "curcumin", "salicin", "benzene"]
        if any(pd in chem_name_lower for pd in public_domain_chemicals):
            is_public_domain = True
            
        # Also check if closest patent matches are all expired (older than 20 years)
        from datetime import datetime, timezone
        current_year = datetime.now(timezone.utc).date().year
        if patents and all(
            (current_year - p.publication_date.year > 20) if p.publication_date else True
            for p in patents
        ):
            is_public_domain = True

        # Synthesize summaries based on risk tier and public domain status
        if is_public_domain:
            exec_summary = (
                f"The freedom-to-operate (FTO) review identifies the subject compound as a public domain compound "
                f"({chem_name or 'off-patent composition of matter'}). While the core chemical composition is off-patent "
                f"and carries low composition-of-matter risk, formulation patents apply. Active secondary patents "
                f"protecting specific formulations, dosage forms, delivery methods, or combinations may still represent "
                f"an FTO block, requiring expert review."
            )
            novelty_concerns = (
                f"Novelty concerns for the core compound are negligible as it represents a widely known public domain "
                f"active substance. However, secondary formulation and composition-of-use claims by competitors (such as "
                f"{', '.join(list(set(p.assignee for p in patents if p.assignee))[:2]) or 'existing assignees'}) require careful "
                f"clearance prior to commercial formulation development."
            )
            methodology = (
                f"Clearance status resolved recognizing the public domain nature of the core compound. Risk is categorized "
                f"based on the active status of secondary patents containing formulation/dosage claims rather than core "
                f"chemical structure similarity."
            )
            # If there are active formulation patents, it requires review
            if overall_rec == RecommendationTier.LOW_RISK:
                overall_rec = RecommendationTier.REQUIRES_REVIEW
        elif overall_rec == RecommendationTier.HIGH_RISK:
            exec_summary = (
                f"The freedom-to-operate (FTO) review of the subject compound indicates a HIGH PATENT RISK. "
                f"Multiple active patents exhibit substantial structural and semantic overlap with the submitted SMILES string. "
                f"Immediate chemical design iterations or in-depth legal counseling are strongly advised before proceeding."
            )
            novelty_concerns = (
                f"Novelty concerns are severe. Direct structural matching identified active patents (such as "
                f"'{key_similar[0].get('patent_number', 'N/A')}' with a risk score of {key_similar[0].get('composite_risk_score', 0)}%) "
                f"that claim similar chemical classes, functional equivalents, or specific target indications."
            )
            methodology = (
                f"Recommendation reached via a multi-dimensional scoring protocol: Tanimoto structural fingerprint "
                f"matching (50% weight), Cosine semantic embedding similarity of abstracts (30% weight), and Legal status / "
                f"Publication date metadata (20% weight). The presence of matches exceeding a composite threshold of 75/100 triggers "
                f"a High Patent Risk classification."
            )
        elif overall_rec == RecommendationTier.REQUIRES_REVIEW:
            exec_summary = (
                f"The freedom-to-operate review indicates that the compound REQUIRES EXPERT REVIEW. "
                f"While no direct structural duplicates were identified, several active patents protect closely related "
                f"formulations, therapeutic indications, or biological targets. Expert legal/scientific analysis is necessary."
            )
            novelty_concerns = (
                f"Novelty concerns are moderate. Broad therapeutic claims in existing patent families may overlap with the "
                f"subject's target pathways, specifically within patents like "
                f"'{key_similar[0].get('patent_number', 'N/A')}' (risk score: {key_similar[0].get('composite_risk_score', 0)}%)."
            )
            methodology = (
                f"Recommendation reached via composite scoring. Matches scoring between 50 and 75 reflect moderate risk "
                f"due to overlapping target claims or close structural analogies, necessitating manual validation of claim boundaries."
            )
        else:
            exec_summary = (
                f"The freedom-to-operate review indicates a LOW PATENT RISK. "
                f"No significant structural duplicates or narrow target/claims conflicts have been identified in active patent indexes. "
                f"The subject molecule exhibits favorable characteristics for novelty clearance."
            )
            novelty_concerns = (
                f"Novelty concerns are low. The nearest matching patent documents represent distant chemical domains "
                f"or distinct therapeutic targets, suggesting a clear path to claim drafting."
            )
            methodology = (
                f"Recommendation reached via composite scoring. All matched records scored below the 50/100 threshold, "
                f"indicating negligible structural and claim overlap under active patent jurisdictions."
            )

        return Report(
            executive_summary=exec_summary,
            key_similar_patents=key_similar,
            novelty_concerns=novelty_concerns,
            manual_review_patents=manual_reviews,
            overall_recommendation=overall_rec,
            methodology_notes=methodology,
            confidence_level=confidence_level
        )
