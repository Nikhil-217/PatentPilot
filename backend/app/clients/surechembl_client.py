import httpx
from typing import List, Dict, Any

class SureChemblClient:
    async def fetch_patents_for_smiles(self, smiles: str) -> List[Dict[str, Any]]:
        # Mocked for now
        return [
            {
                "patent_number": "EP-3141592-B1",
                "title": "Substituted derivatives",
                "source": "surechembl",
                "source_url": "https://www.surechembl.org/document/EP-3141592-B1",
                "abstract": "Substituted derivatives useful for indications...",
                "legal_status": "Granted",
                "publication_date": "2021-11-20",
                "assignee": "AstraZeneca AB"
            }
        ]
