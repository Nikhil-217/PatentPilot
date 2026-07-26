import httpx
import json
import asyncio

from urllib.parse import quote

async def test_google_patents():
    query = "COX-2 inflammation"
    url = f"https://patents.google.com/xhr/query?q={quote(query)}&num=10"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    async with httpx.AsyncClient() as client:
        res = await client.get(url, headers=headers)
        print("Status Code:", res.status_code)
        if res.status_code == 200:
            try:
                data = res.json()
                print("JSON keys:", data.keys())
                # Let's save the sample to a local file
                with open("google_patents_sample.json", "w") as f:
                    json.dump(data, f, indent=2)
                print("Saved sample response to google_patents_sample.json")
            except Exception as e:
                print("Error parsing JSON:", e)
                print("Response preview:", res.text[:200])

if __name__ == "__main__":
    asyncio.run(test_google_patents())
