"""Quick test for Maps API with new key"""
import asyncio
import os
from dotenv import load_dotenv
load_dotenv()

import httpx

async def test():
    key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not key:
        print("❌ GOOGLE_MAPS_API_KEY not found!")
        return
    
    print(f"🔑 Using Maps Key: {key[:8]}...{key[-4:]}")
    
    url = "https://maps.googleapis.com/maps/api/staticmap"
    params = {
        "center": "30.45,32.35",
        "zoom": "14",
        "size": "640x640",
        "maptype": "satellite",
        "key": key
    }
    
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(url, params=params)
        print(f"📥 Status: {r.status_code}")
        if r.status_code == 200 and "image" in r.headers.get("content-type", ""):
            print(f"✅ SUCCESS! Image size: {len(r.content)} bytes")
        else:
            print(f"❌ Failed: {r.text[:300]}")

asyncio.run(test())
