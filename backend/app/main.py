from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
# Patch AsyncIOMotorClient to prevent Beanie initialization failure with Motor 3.x
if not hasattr(AsyncIOMotorClient, "append_metadata"):
    AsyncIOMotorClient.append_metadata = lambda self, *args, **kwargs: None

from beanie import init_beanie
from contextlib import asynccontextmanager

from app.api.health import router as health_router
from app.api.routes.analyses import router as analyses_router
from app.api.routes.reports import router as reports_router
from app.core.config import settings
from app.models.analysis import AnalysisRecord
from app.models.patent import PatentRecord

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize MongoDB connection and Beanie on startup
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    try:
        db = client.get_default_database()
    except Exception:
        db = client.get_database("patent_pilot")
    await init_beanie(database=db, document_models=[AnalysisRecord, PatentRecord])
    yield
    # Cleanup on shutdown (if any)
    client.close()

app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

# Configure CORS
origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "PatentPilot API Backend",
        "version": "1.0.0",
        "docs_url": "/docs",
        "health_url": "/api/health"
    }

app.include_router(health_router, prefix="/api")
app.include_router(analyses_router, prefix="/api/analyses", tags=["Analyses"])
app.include_router(reports_router, prefix="/api/analyses", tags=["Reports"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
