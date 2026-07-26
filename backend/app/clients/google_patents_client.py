import httpx
import asyncio
from typing import List, Dict, Any
from urllib.parse import quote

class GooglePatentsClient:
    async def search_patents(self, target: str, indication: str) -> List[Dict[str, Any]]:
        query_word = target if target else indication
        if not query_word:
            return []
            
        cids = await self._get_cids_by_name(query_word)
        if not cids:
            # Try splitting and searching the first word
            words = query_word.split()
            if words:
                cids = await self._get_cids_by_name(words[0])
                
        if not cids:
            return []
            
        # Limit to top 2 CIDs to avoid rate limits
        cids = cids[:2]
        
        patents = []
        from app.clients.pubchem_client import PubChemClient
        pubchem = PubChemClient()
        
        for cid in cids:
            pids = await pubchem._get_patent_ids_by_cid(cid)
            # Limit to top 2 patents per CID
            for pid in pids[:2]:
                detail = await pubchem._get_patent_detail(pid)
                if detail:
                    detail["source"] = "google_patents"
                    patents.append(detail)
        return patents

    async def _get_cids_by_name(self, name: str) -> List[int]:
        url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{quote(name)}/cids/JSON"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    return data.get("IdentifierList", {}).get("CID", [])
        except Exception as e:
            print(f"Error fetching CID by name '{name}': {e}")
        return []
