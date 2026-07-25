import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load settings from .env
load_dotenv()
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/patent_pilot")

async def preview_database():
    print(f"Connecting to: {MONGODB_URI.split('@')[-1] if '@' in MONGODB_URI else MONGODB_URI}")
    client = AsyncIOMotorClient(MONGODB_URI)
    
    try:
        db = client.get_default_database()
    except Exception:
        db = client.get_database("patent_pilot")
        
    print(f"Connected successfully! Active Database: '{db.name}'")
    
    collections = await db.list_collection_names()
    print(f"Collections found: {collections}")
    
    for coll_name in collections:
        count = await db[coll_name].count_documents({})
        print(f"\n=========================================")
        print(f" Collection: {coll_name} | Total Records: {count}")
        print(f"=========================================")
        
        # Query and display records
        cursor = db[coll_name].find({}).limit(5)
        async for doc in cursor:
            print(f"\n* Record ID: {doc.get('_id')}")
            for k, v in doc.items():
                if k == "_id":
                    continue
                # Truncate long lists/embeddings/texts for readable console view
                val_str = str(v)
                if len(val_str) > 120:
                    val_str = val_str[:120] + "... (truncated)"
                print(f"  - {k}: {val_str}")
                
    client.close()

if __name__ == "__main__":
    asyncio.run(preview_database())
