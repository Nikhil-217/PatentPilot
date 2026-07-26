from fastapi import APIRouter, HTTPException, status
from app.models.analysis import AnalysisRecord
from app.models.patent import PatentRecord
from app.schemas.analysis import Report
from app.services.ai_service import AIService
from beanie import PydanticObjectId
from datetime import datetime, timezone

router = APIRouter()
ai_service = AIService()

@router.post("/{id}/report", response_model=Report, status_code=status.HTTP_201_CREATED)
async def generate_report(id: PydanticObjectId):
    analysis = await AnalysisRecord.get(id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
        
    # Fetch all referenced patents
    patent_ids = [m.patent_id for m in analysis.patent_matches]
    patents = await PatentRecord.find({"_id": {"$in": patent_ids}}).to_list()
    
    report = ai_service.synthesize_report(analysis, patents)
    analysis.report = report
    analysis.overall_recommendation = report.overall_recommendation
    analysis.status = "reported"
    analysis.updated_at = datetime.now(timezone.utc)
    await analysis.save()
    
    return report

@router.get("/{id}/report", response_model=Report)
async def get_report(id: PydanticObjectId):
    analysis = await AnalysisRecord.get(id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
        
    if not analysis.report:
        raise HTTPException(status_code=404, detail="Report not generated yet")
        
    return analysis.report

from fastapi import Response

@router.get("/{id}/report/download", response_class=Response)
async def download_report_pdf(id: PydanticObjectId):
    analysis = await AnalysisRecord.get(id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
        
    if not analysis.report:
        raise HTTPException(status_code=400, detail="Report not generated yet")
        
    from app.services.pdf_service import generate_pdf_report
    pdf_bytes = generate_pdf_report(analysis, analysis.report)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=Patentability_Report_{id}.pdf",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )
