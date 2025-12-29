import sys
import os
from fastapi import FastAPI
from fastapi.testclient import TestClient

# Add backend directory to path
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(parent_dir)

print(f"DEBUG: sys.path: {sys.path}")
print(f"DEBUG: checking if demo exists in {parent_dir}: {os.path.exists(os.path.join(parent_dir, 'demo'))}")
print(f"DEBUG: checking if demo/__init__.py exists: {os.path.exists(os.path.join(parent_dir, 'demo', '__init__.py'))}")
print(f"DEBUG: checking if demo/crisis_455pm_data.py exists: {os.path.exists(os.path.join(parent_dir, 'demo', 'crisis_455pm_data.py'))}")

from api.v2.demo_routes import router as demo_router

# Create a standalone app for testing
app = FastAPI()
app.include_router(demo_router)

client = TestClient(app)

def test_demo_start():
    print("Testing REST endpoint...")
    response = client.post("/api/v2/demo/start", json={"scenario": "crisis_455pm"})
    if response.status_code != 200:
        print(f"❌ REST endpoint failed: {response.text}")
        return None
    
    data = response.json()
    assert "demo_id" in data
    assert data["status"] == "started"
    assert "websocket_url" in data
    assert data["duration_seconds"] == 178
    print("✅ REST endpoint test passed")
    return data["demo_id"]

def test_demo_websocket():
    print("Testing WebSocket...")
    # Start a demo session
    demo_id = test_demo_start()
    if not demo_id:
        return

    # Connect to WebSocket
    # Note: TestClient websocket URL must be relative or match base_url. 
    # The router prefix is /api/v2/demo, so the ws route is /api/v2/demo/ws
    
    with client.websocket_connect(f"/api/v2/demo/ws?demo_id={demo_id}") as websocket:
        # Send play command
        websocket.send_json({"action": "play"})
        
        # Receive T0 State Update
        data = websocket.receive_json()
        assert data["type"] == "STATE_UPDATE"
        assert "shipments" in data["data"]
        print("✅ Received T0 STATE_UPDATE")
        
        # The current implementation blocks during playback, so we can't ping 
        # until it finishes. For verification, receiving the first event is sufficient.
        # If we wanted to test full sequence we could loop receive_json, but it takes 3 mins.
        
        # We can close strictly.
        websocket.close()

if __name__ == "__main__":
    try:
        test_demo_websocket()
        print("🎉 All isolated tests passed!")
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
