import httpx
import asyncio
from typing import List, Dict, Any
from urllib.parse import quote

class SureChemblClient:
    async def fetch_patents_for_smiles(self, smiles: str) -> List[Dict[str, Any]]:
        # Perform similarity search to fetch related compound CIDs
        cids = await self._get_similar_cids(smiles)
        if not cids:
            return []
            
        # Limit to top 2 similar compounds to avoid over-fetching
        cids = cids[:2]
        
        patents = []
        # Reuse PubChem Client helper to get patent details
        from app.clients.pubchem_client import PubChemClient
        pubchem = PubChemClient()
        
        for cid in cids:
            compound_smiles = await pubchem._get_smiles_by_cid(cid)
            pids = await pubchem._get_patent_ids_by_cid(cid)
            # Limit to top 2 patents per CID
            for pid in pids[:2]:
                detail = await pubchem._get_patent_detail(pid)
                if detail:
                    detail["source"] = "surechembl"
                    detail["smiles"] = compound_smiles
                    patents.append(detail)
        return patents

    async def _get_similar_cids(self, smiles: str) -> List[int]:
        init_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/similarity/smiles/{quote(smiles)}/JSON?Threshold=80&MaxRecords=5"
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(init_url)
                if res.status_code not in [200, 202]:
                    return []
                data = res.json()
                
                # Check for ListKey polling
                if "Waiting" in data or "ListKey" in data.get("Waiting", {}):
                    listkey = data["Waiting"]["ListKey"]
                    poll_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/listkey/{listkey}/cids/JSON"
                    for _ in range(6):
                        await asyncio.sleep(2.0)
                        poll_res = await client.get(poll_url)
                        if poll_res.status_code == 200:
                            poll_data = poll_res.json()
                            return poll_data.get("IdentifierList", {}).get("CID", [])
                        elif poll_res.status_code == 202:
                            continue
                        else:
                            break
                elif "IdentifierList" in data:
                    return data["IdentifierList"].get("CID", [])
        except Exception as e:
            print(f"Error executing similarity search: {e}")
        return []
