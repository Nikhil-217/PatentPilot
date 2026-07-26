import httpx
import json
import asyncio

async def test_pubchem():
    smiles = "CC(=O)OC1=CC=CC=C1C(=O)O"
    
    # 1. Get CID
    cid_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/{smiles}/cids/JSON"
    async with httpx.AsyncClient() as client:
        res = await client.get(cid_url)
        print("CID Response Status:", res.status_code)
        if res.status_code != 200:
            return
        
        cid_data = res.json()
        cids = cid_data.get("IdentifierList", {}).get("CID", [])
        if not cids:
            print("No CIDs found")
            return
        cid = cids[0]
        print("CID found:", cid)
        
        # 2. Get PatentIDs
        patents_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/xrefs/PatentID/JSON"
        res = await client.get(patents_url)
        print("Patent Xrefs Status:", res.status_code)
        if res.status_code != 200:
            return
        
        patents_data = res.json()
        patent_ids = patents_data.get("InformationList", {}).get("Information", [{}])[0].get("PatentID", [])
        print(f"Found {len(patent_ids)} patent IDs. Top 5: {patent_ids[:5]}")
        
        # 3. Fetch details for one patent using PUG-View
        if patent_ids:
            test_pid = patent_ids[0]
            print(f"\nFetching details for patent: {test_pid}")
            view_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/patent/{test_pid}/JSON"
            res = await client.get(view_url)
            print("PUG-View Status:", res.status_code)
            if res.status_code == 200:
                data = res.json()
                print("JSON keys:", data.keys())
                # Let's save a snippet to a local scratch file to view it
                with open("pubchem_patent_sample.json", "w") as f:
                    json.dump(data, f, indent=2)
                print("Saved sample response to pubchem_patent_sample.json")

if __name__ == "__main__":
    asyncio.run(test_pubchem())
