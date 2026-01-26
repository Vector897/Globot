from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, List
import json
import os
from collections import Counter
from datetime import datetime
from api.deps import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "virtual_users.json")

def load_virtual_data():
    if not os.path.exists(DATA_PATH):
        return []
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

@router.get("/dashboard")
def get_dashboard_data(user: dict = Depends(get_current_user)):
    """
    Get analytics dashboard data from virtual users.
    Requires authentication.
    """
    # Simply verify user is authenticated via dependency
    
    users = load_virtual_data()
    
    if not users:
        return {"error": "No data available"}

    # 1. KPI Cards
    total_users = len(users)
    total_tokens = sum(u.get("total_tokens", 0) for u in users)
    
    # 2. Location Distribution (Pie Chart) with "Others" grouping
    locations = []
    for u in users:
        loc = u.get("location", "Unknown")
        # Extract City if format is "City, Country"
        if "," in loc:
            city_name = loc.split(",")[0].strip()
            locations.append(city_name)
        else:
            locations.append(loc)
    
    total_locations = len(locations)
    location_counts = Counter(locations)
    
    # Process logic: Top 20 -> Specific, Rest -> Others
    # Convert Counter to list of dicts for sorting
    all_location_data = [{"name": k, "value": v} for k, v in location_counts.items()]
    # Sort by value descending
    all_location_data.sort(key=lambda x: x["value"], reverse=True)
    
    final_location_data = []
    
    if len(all_location_data) <= 20:
        final_location_data = all_location_data
    else:
        # Take Top 20
        final_location_data = all_location_data[:20]
        # Sum the rest
        others_count = sum(item["value"] for item in all_location_data[20:])
        if others_count > 0:
            final_location_data.append({"name": "Others", "value": others_count})
            
    # No need to resort as Top 20 are already sorted and Others is appended at end
    
    # 3. Top Token Users (Bar Chart)
    sorted_by_tokens = sorted(users, key=lambda x: x.get("total_tokens", 0), reverse=True)
    top_users = sorted_by_tokens[:5]
    top_users_data = [{"name": u["name"], "tokens": u["total_tokens"]} for u in top_users]
    
    # 4. Registration Trend (Line Chart) -- Mocking a bit based on register_date
    # Group by date
    dates = []
    for u in users:
        dt_str = u.get("register_date")
        if dt_str:
            dt = datetime.fromisoformat(dt_str)
            dates.append(dt.strftime("%Y-%m-%d"))
    
    date_counts = Counter(dates)
    trend_data = [{"date": k, "count": v} for k, v in sorted(date_counts.items())]

    return {
        "kpi": {
            "total_users": total_users,
            "total_tokens": total_tokens,
            "avg_tokens_per_user": int(total_tokens / total_users) if total_users > 0 else 0
        },
        "charts": {
            "location_distribution": final_location_data,
            "top_users": top_users_data,
            "registration_trend": trend_data
        }
    }
