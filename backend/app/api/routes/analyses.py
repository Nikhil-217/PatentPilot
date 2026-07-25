from fastapi import APIRouter, HTTPException, BackgroundTasks, status, Response
from typing import List, Optional
from app.models.analysis import AnalysisRecord
from app.schemas.analysis import AnalysisRequest, AnalysisResponse, AnalysisStatus, RecommendationTier
from app.services.molecule_service import canonicalize_smiles, get_inchikey, MoleculeError, render_smiles_to_svg
from app.services.retrieval_service import RetrievalService
from beanie import PydanticObjectId
from datetime import datetime, timezone
from pydantic import BaseModel

router = APIRouter()
retrieval_service = RetrievalService()

@router.get("/render", response_class=Response)
async def render_molecule(smiles: str):
    try:
        svg_content = render_smiles_to_svg(smiles)
        return Response(content=svg_content, media_type="image/svg+xml")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class PatchPatentRequest(BaseModel):
    flagged_for_manual_review: Optional[bool] = None
    researcher_note: Optional[str] = None

@router.post("", response_model=AnalysisResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_analysis(request: AnalysisRequest, background_tasks: BackgroundTasks):
    try:
        canon_smiles = canonicalize_smiles(request.smiles)
        inchikey = get_inchikey(request.smiles)
    except MoleculeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    analysis = AnalysisRecord(
        smiles_input=request.smiles,
        canonical_smiles=canon_smiles,
        inchikey=inchikey,
        target=request.target,
        indication=request.indication,
        status=AnalysisStatus.PENDING
    )
    await analysis.insert()
    
    background_tasks.add_task(retrieval_service.run_retrieval, analysis.id)
    
    return AnalysisResponse(
        analysis_id=str(analysis.id),
        status=analysis.status,
        canonical_smiles=analysis.canonical_smiles
    )

@router.get("", response_model=List[AnalysisRecord])
async def list_analyses(skip: int = 0, limit: int = 10):
    return await AnalysisRecord.find_all().sort("-created_at").skip(skip).limit(limit).to_list()

from app.models.patent import PatentRecord

@router.get("/{id}")
async def get_analysis(id: PydanticObjectId):
    analysis = await AnalysisRecord.get(id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
        
    patent_ids = [m.patent_id for m in analysis.patent_matches]
    patents = await PatentRecord.find({"_id": {"$in": patent_ids}}).to_list()
    patents_map = {p.id: p for p in patents}
    
    analysis_dict = analysis.model_dump()
    analysis_dict["id"] = str(analysis.id)
    
    for match in analysis_dict.get("patent_matches", []):
        p_id = match["patent_id"]
        match["patent_id"] = str(p_id)
        patent = patents_map.get(p_id)
        if patent:
            match["patent_number"] = patent.patent_number
            match["title"] = patent.title
            match["publication_date"] = patent.publication_date.isoformat() if patent.publication_date else None
            match["assignee"] = patent.assignee or "Unknown"
            match["abstract"] = patent.abstract or "N/A"
            match["source"] = patent.source
            match["source_url"] = patent.source_url
            match["legal_status"] = patent.legal_status or "Active"
            
    return analysis_dict

@router.patch("/{id}/patents/{patent_id}", response_model=AnalysisRecord)
async def update_analysis_patent(id: PydanticObjectId, patent_id: PydanticObjectId, req: PatchPatentRequest):
    analysis = await AnalysisRecord.get(id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    updated = False
    for p in analysis.patent_matches:
        if p.patent_id == patent_id:
            if req.flagged_for_manual_review is not None:
                p.flagged_for_manual_review = req.flagged_for_manual_review
            if req.researcher_note is not None:
                p.researcher_note = req.researcher_note
            updated = True
            break
            
    if not updated:
        raise HTTPException(status_code=404, detail="Patent match not found in this analysis")
        
    analysis.updated_at = datetime.now(timezone.utc)
    await analysis.save()
    return analysis

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_analysis(id: PydanticObjectId):
    analysis = await AnalysisRecord.get(id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    await analysis.delete()
