"""4:55 PM Crisis瀹屾暣Mock鏁版嵁"""

from datetime import datetime, timedelta
from typing import Dict, List

# 瀹屾暣鏃堕棿绾挎暟鎹?
CRISIS_TIMELINE = {
    "t0_normal_state": {
        "timestamp": "2025-12-26T16:50:00Z",
        "shipments": [
            {
                "id": "SHP-001",
                "product": "Medical Device - Ultrasound Machine",
                "hs_code": "9018.90",
                "value_usd": 250000,
                "status": "in_transit",
                "vessel": "MSC Aries",
                "location": {"lat": 33.7, "lng": -142.1},
                "eta_hours": 50,
                "route_to": "US-LAX",
                "route_from": "CN-SHA"
            },
            {
                "id": "SHP-002",
                "product": "Consumer Electronics - Drone X1",
                "hs_code": "8525.80",
                "value_usd": 120000,
                "status": "in_transit",
                "vessel": "Ever Given",
                "location": {"lat": 22.5, "lng": 114.1},
                "eta_hours": 120,
                "route_to": "US-NYC",
                "route_from": "CN-SZX"
            },
            {
                "id": "SHP-003",
                "product": "Industrial Components",
                "hs_code": "8471.60",
                "value_usd": 85000,
                "status": "at_port",
                "vessel": "HMM Algeciras",
                "location": {"lat": 30.0, "lng": 122.0},
                "eta_hours": 15,
                "route_to": "US-SEA",
                "route_from": "CN-NGB"
            }
        ],
        "risk_score": 12.5,
        "alerts": []
    },
    "t1_black_swan": {
        "title": "USTR Tariff Increase Detected",
        "description": "United States Trade Representative announces imminent tariff hike on specific HS codes.",
        "source": "Bing News API",
        "confidence": 0.997,
        "azure_service": "Azure Cognitive Services",
        "timestamp": "2025-12-26T16:55:00Z",
        "affected_shipments": ["SHP-001", "SHP-003"]
    },
    "t2_ai_reasoning": {
        "fermi_estimation": {
            "reasoning_steps": [
                "姝ラ1: 璇嗗埆鍙楀奖鍝?HS Code (9018.90, 8471.60)",
                "姝ラ2: 璁＄畻娼滃湪鍏崇◣澧炲姞 (25% -> 45%)",
                "姝ラ3: 浼扮畻鎬昏揣鍊奸闄?($335,000 * 20% = $67,000)",
                "姝ラ4: 鎼滅储鏇夸唬鐗╂祦鏂规 (缁忕敱澧ㄨタ鍝ユ垨鍔犳嬁澶ц浆杩?",
                "姝ラ5: 璇勪及鍚堣鎬ч闄╀笌鏃堕棿鎴愭湰"
            ]
        }
    },
    "t3_tactical_options": {
        "timestamp": "2025-12-26T16:58:20Z",
        "options": [
            {
                "id": "A",
                "title": "Logistics Reroute (via Mexico)",
                "cost": 8000,
                "savings": 112500,
                "roi": 14.06,
                "risk_level": "LOW",
                "execution_time": "2h"
            },
            {
                "id": "B",
                "title": "Expedited Air Freight",
                "cost": 45000,
                "savings": 67000,
                "roi": 1.49,
                "risk_level": "MEDIUM",
                "execution_time": "12h"
            },
            {
                "id": "C",
                "title": "Absorb Tariff Cost",
                "cost": 67000,
                "savings": 0,
                "roi": 0.0,
                "risk_level": "HIGH",
                "execution_time": "0h"
            }
        ]
    },
    "t4_execution": {
        "timestamp": "2025-12-26T16:58:58Z",
        "actions": [
            {
                "service": "DHL Integration API",
                "status": "SUCCESS",
                "details": "Booking confirmed: BKG-998877"
            },
            {
                "service": "Customs Form Generation (Azure Form Recognizer)",
                "status": "SUCCESS",
                "details": "Generated Form 7501"
            },
            {
                "service": "Notification Service",
                "status": "SUCCESS",
                "details": "Email sent to Logistics Manager"
            }
        ],
        "final_outcome": {
            "loss_avoided_usd": 104500,
            "execution_time_seconds": 178
        }
    }
}
