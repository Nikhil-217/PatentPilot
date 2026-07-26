import httpx
import asyncio
from typing import List, Dict, Any
from urllib.parse import quote

class PubChemClient:
    async def fetch_patents_for_inchikey(self, inchikey: str) -> List[Dict[str, Any]]:
        # Fetch CID from InChIKey
        cids = await self._get_cids_by_inchikey(inchikey)
        if not cids:
            return []
        
        # Limit to top 2 CIDs to avoid hitting rate limits
        cids = cids[:2]
        
        patents = []
        for cid in cids:
            smiles = await self._get_smiles_by_cid(cid)
            pids = await self._get_patent_ids_by_cid(cid)
            # Limit to top 2 patent IDs per CID
            for pid in pids[:2]:
                detail = await self._get_patent_detail(pid)
                if detail:
                    detail["source"] = "pubchem"
                    detail["smiles"] = smiles
                    patents.append(detail)
        return patents

    async def _get_cids_by_inchikey(self, inchikey: str) -> List[int]:
        url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey/{inchikey}/cids/JSON"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    return data.get("IdentifierList", {}).get("CID", [])
        except Exception as e:
            print(f"Error fetching CID from inchikey: {e}")
        return []

    async def _get_patent_ids_by_cid(self, cid: int) -> List[str]:
        url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/xrefs/PatentID/JSON"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    info = data.get("InformationList", {}).get("Information", [{}])
                    if info:
                        return info[0].get("PatentID", [])
        except Exception as e:
            print(f"Error fetching Patent IDs from CID: {e}")
        return []

    async def _get_patent_detail(self, patent_id: str) -> Dict[str, Any] | None:
        url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/patent/{patent_id}/JSON"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    record = data.get("Record", {})
                    title = record.get("RecordTitle", "No Title Available")
                    if title.startswith("[Translated] "):
                        title = title[len("[Translated] "):]
                    
                    abstract = ""
                    assignee = "Unknown Assignee"
                    pub_date = "2023-01-01"
                    
                    sections = record.get("Section", [])
                    for s in sections:
                        heading = s.get("TOCHeading")
                        if heading == "Abstract":
                            info = s.get("Information", [])
                            if info:
                                val = info[0].get("Value", {})
                                swm = val.get("StringWithMarkup", [])
                                if swm:
                                    abstract = swm[0].get("String", "")
                        elif heading == "Assignee":
                            info = s.get("Information", [])
                            if info:
                                val = info[0].get("Value", {})
                                swm = val.get("StringWithMarkup", [])
                                if swm:
                                    assignee = swm[0].get("String", "")
                        elif heading == "Important Dates":
                            subsections = s.get("Section", [])
                            for subs in subsections:
                                if subs.get("TOCHeading") == "Publication Date":
                                    subinfo = subs.get("Information", [])
                                    if subinfo:
                                        val = subinfo[0].get("Value", {})
                                        dates = val.get("DateISO8601", [])
                                        if dates:
                                            pub_date = dates[0].replace("/", "-")
                                            
                    return {
                        "patent_number": patent_id,
                        "title": title,
                        "abstract": abstract,
                        "source_url": f"https://patents.google.com/patent/{patent_id.replace('-', '')}",
                        "publication_date": pub_date,
                        "assignee": assignee,
                        "legal_status": "Active"
                    }
        except Exception as e:
            print(f"Error fetching patent details for {patent_id}: {e}")
        return None

    async def _get_smiles_by_cid(self, cid: int) -> str | None:
        url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/property/CanonicalSMILES/JSON"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    props = data.get("PropertyTable", {}).get("Properties", [])
                    if props:
                        return props[0].get("CanonicalSMILES")
        except Exception as e:
            print(f"Error fetching SMILES for CID {cid}: {e}")
        return None
