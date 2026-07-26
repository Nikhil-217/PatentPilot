import httpx
import asyncio
import time

from urllib.parse import quote

async def test_similarity():
    # SMILES for a derivative of Aspirin or similar
    smiles = "CC(=O)OC1=CC=CC=C1C(=O)O"
    
    # PubChem similarity search is an asynchronous task on their end.
    # We POST or GET to initiate the search, which returns a ListKey, and then we poll it.
    init_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/similarity/smiles/{quote(smiles)}/JSON?Threshold=85&MaxRecords=10"
    
    async with httpx.AsyncClient() as client:
        print("Initiating similarity search...")
        res = await client.get(init_url)
        print("Init status:", res.status_code)
        if res.status_code not in [200, 202]:
            print("Response:", res.text)
            return
            
        data = res.json()
        print("Init response keys:", data.keys())
        
        # Check if it returned the results directly or a ListKey to poll
        if "Waiting" in data or "ListKey" in data.get("Waiting", {}):
            listkey = data["Waiting"]["ListKey"]
            print("Search queued. ListKey:", listkey)
            
            # Poll
            poll_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/listkey/{listkey}/cids/JSON"
            for i in range(10):
                await asyncio.sleep(2)
                print(f"Polling check {i+1}...")
                poll_res = await client.get(poll_url)
                if poll_res.status_code == 200:
                    poll_data = poll_res.json()
                    cids = poll_data.get("IdentifierList", {}).get("CID", [])
                    print(f"Success! Found {len(cids)} similar CIDs: {cids}")
                    return
                elif poll_res.status_code == 202:
                    print("Still processing...")
                else:
                    print("Error polling:", poll_res.status_code, poll_res.text)
                    return
        elif "IdentifierList" in data:
            cids = data["IdentifierList"].get("CID", [])
            print(f"Immediate success! Found {len(cids)} CIDs: {cids}")
            
if __name__ == "__main__":
    asyncio.run(test_similarity())
