import httpx
from typing import List, Dict, Any

class PubChemClient:
    async def fetch_patents_for_inchikey(self, inchikey: str) -> List[Dict[str, Any]]:
        # Mocked for now
        return [
            {
                "patent_number": "US-20230123-A1",
                "title": "Novel compound related to InChIKey",
                "source": "pubchem",
                "source_url": "https://pubchem.ncbi.nlm.nih.gov/patent/US-20230123-A1",
                "abstract": "A novel compound for treatment of XYZ...",
                "legal_status": "Active",
                "publication_date": "2023-01-26",
                "assignee": "Pfizer Inc."
            }
        ]
