import httpx
from typing import List, Dict, Any

class GooglePatentsClient:
    async def search_patents(self, target: str, indication: str) -> List[Dict[str, Any]]:
        # Mocked for now
        return [
            {
                "patent_number": "US-9876543-B2",
                "title": f"Methods of treating {indication} targeting {target}",
                "source": "google_patents",
                "source_url": "https://patents.google.com/patent/US9876543B2",
                "abstract": f"Methods of modulating {target} for treating {indication}...",
                "legal_status": "Active",
                "publication_date": "2023-04-18",
                "assignee": "Centella Therapeutics Inc."
            }
        ]
