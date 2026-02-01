"""
Google Maps Static API Diagnostic Script
Identifies exactly WHY the API call is failing
"""
import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GOOGLE_API_KEY")

async def run_diagnostics():
    print("=" * 60)
    print("Google Maps Static API Diagnostic")
    print("=" * 60)
    
    if not API_KEY:
        print("❌ FATAL: GOOGLE_API_KEY not found in environment!")
        return
        
    print(f"\n🔑 API Key: {API_KEY[:8]}...{API_KEY[-4:]}")
    print(f"   Key Length: {len(API_KEY)} characters")
    
    # Test 1: Basic connectivity to Google
    print("\n--- Test 1: Google Connectivity ---")
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            r = await client.get("https://www.google.com")
            print(f"✅ Google reachable (HTTP {r.status_code})")
        except Exception as e:
            print(f"❌ Cannot reach Google: {e}")
            return
    
    # Test 2: Static Maps API Call
    print("\n--- Test 2: Maps Static API Call ---")
    url = "https://maps.googleapis.com/maps/api/staticmap"
    params = {
        "center": "30.45,32.35",
        "zoom": "14",
        "size": "640x640",
        "maptype": "satellite",
        "key": API_KEY
    }
    
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(url, params=params)
        
        print(f"📥 Status Code: {response.status_code}")
        content_type = response.headers.get("content-type", "unknown")
        print(f"📄 Content-Type: {content_type}")
        
        if response.status_code == 200:
            if "image" in content_type:
                print(f"✅ SUCCESS! Received valid image ({len(response.content)} bytes)")
                # Save the image for verification
                with open("test_satellite.png", "wb") as f:
                    f.write(response.content)
                print("📸 Image saved as 'test_satellite.png' for verification")
            else:
                print(f"⚠️ Got 200 but content is not image: {response.text[:200]}")
        else:
            print(f"\n❌ API FAILED!")
            print("-" * 40)
            
            # Parse error response
            error_text = response.text
            print(f"Error Response:\n{error_text}")
            
            # Provide specific troubleshooting advice
            print("\n" + "=" * 60)
            print("🔍 DIAGNOSIS & FIX")
            print("=" * 60)
            
            if "This API project is not authorized" in error_text:
                print("""
Problem: API Key is not authorized for this API.

Fix Steps:
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your API Key
3. Under 'API restrictions':
   - Either select 'Don't restrict key'
   - OR add 'Maps Static API' to the allowed list
4. Click SAVE and wait 2-3 minutes
""")
            elif "API is not activated" in error_text:
                print("""
Problem: Maps Static API service is not enabled.

Fix Steps:
1. Go to: https://console.cloud.google.com/apis/library/static-maps-backend.googleapis.com
2. Make sure you're in the CORRECT Google Cloud project!
3. Click 'ENABLE'
4. Wait 2-3 minutes for propagation
""")
            elif "REQUEST_DENIED" in error_text or "ApiNotActivatedMapError" in error_text:
                print("""
Problem: API Key configuration issue.

Possible Causes:
- API Key belongs to a DIFFERENT project than where Static Maps is enabled
- API Key has HTTP Referrer restrictions blocking server-side calls

Fix Steps:
1. Create a NEW API Key specifically for this project:
   https://console.cloud.google.com/apis/credentials
2. Set restrictions to 'None' temporarily for testing
3. Update your .env file with the new key
""")
            elif "BillingNotEnabled" in error_text or "billing" in error_text.lower():
                print("""
Problem: Billing is not enabled for this project.

Fix Steps:
1. Go to: https://console.cloud.google.com/billing
2. Link a billing account to your project
3. Retry after 5 minutes
""")
            else:
                print(f"""
Problem: Unknown error.

Response: {error_text}

General Fix Steps:
1. Verify you're editing the correct Google Cloud Project
2. Check that billing is enabled
3. Check that Maps Static API is enabled
4. Check that your API Key has no restrictive settings
""")

if __name__ == "__main__":
    asyncio.run(run_diagnostics())
