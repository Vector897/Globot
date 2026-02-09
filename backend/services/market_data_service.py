"""
Market Data Service for Financial Hedging

Provides real-time and historical market data for:
- Fuel oil prices (Brent Crude, Marine Fuel Oil)
- Currency exchange rates
- Freight rates (Baltic indices)
- Volatility metrics
- Crisis indicators

For demo purposes, this uses mock data with realistic patterns.
In production, connect to Bloomberg, Reuters, or other data providers.
"""

import logging
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from enum import Enum

logger = logging.getLogger(__name__)


class MarketRegime(Enum):
    """Market condition classification"""
    NORMAL = "normal"
    ELEVATED = "elevated"
    CRISIS = "crisis"


class CrisisIndicator(Enum):
    """Types of crisis indicators"""
    RED_SEA_CONFLICT = "red_sea_conflict"
    SUEZ_CANAL_DISRUPTION = "suez_canal_disruption"
    FUEL_PRICE_SPIKE = "fuel_price_spike"
    CURRENCY_VOLATILITY = "currency_volatility"
    OPEC_PRODUCTION_CUT = "opec_production_cut"
    REFINERY_OUTAGE = "refinery_outage"
    HURRICANE_SEASON = "hurricane_season"
    GEOPOLITICAL_TENSION = "geopolitical_tension"


class MarketDataService:
    """
    Provides market data for hedging decisions.
    
    In demo mode, generates realistic mock data.
    Can be extended to connect to real data providers.
    """
    
    def __init__(self, demo_mode: bool = True, crisis_scenario: Optional[str] = None):
        """
        Initialize market data service.
        
        Args:
            demo_mode: If True, use mock data. If False, connect to real APIs.
            crisis_scenario: Optional crisis scenario to simulate
                           ('red_sea', 'fuel_spike', 'currency_crisis')
        """
        self.demo_mode = demo_mode
        self.crisis_scenario = crisis_scenario
        
        # Base prices (normal conditions)
        self.base_fuel_price = 650.0  # USD per ton
        self.base_usd_eur = 1.10
        self.base_freight_rate = 15000.0  # USD per day
        self.base_baltic_index = 1200
        
        # Apply crisis adjustments if scenario active
        if crisis_scenario == 'red_sea':
            self.base_fuel_price = 750.0
            self.base_freight_rate = 18000.0
            self.base_baltic_index = 1500
        elif crisis_scenario == 'fuel_spike':
            self.base_fuel_price = 820.0
        elif crisis_scenario == 'currency_crisis':
            self.base_usd_eur = 1.05
            
        logger.info(f"MarketDataService initialized (demo={demo_mode}, crisis={crisis_scenario})")
    
    def get_fuel_price(self, with_volatility: bool = True) -> Dict:
        """
        Get current fuel oil price.
        
        Args:
            with_volatility: Add random volatility to price
            
        Returns:
            Dict with spot price, futures, options, and metadata
        """
        # Calculate spot price with volatility
        volatility = self._get_current_volatility()
        spot_price = self.base_fuel_price
        
        if with_volatility:
            # Add random walk with volatility
            daily_volatility = volatility / (252 ** 0.5)  # Annualized to daily
            random_change = random.gauss(0, daily_volatility)
            spot_price *= (1 + random_change)
        
        # Futures curve (contango in normal markets)
        futures_1m = spot_price * 1.01
        futures_3m = spot_price * 1.025
        futures_6m = spot_price * 1.04
        
        # Options pricing (simplified Black-Scholes approximation)
        put_premium = self._calculate_option_premium(
            spot_price, strike=spot_price * 0.95, volatility=volatility, is_put=True
        )
        call_premium = self._calculate_option_premium(
            spot_price, strike=spot_price * 1.05, volatility=volatility, is_put=False
        )
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "market": "Singapore MOPS",
            "fuel_oil_380": {
                "spot_price": round(spot_price, 2),
                "bid": round(spot_price - 2.0, 2),
                "ask": round(spot_price + 2.0, 2),
                "change_24h": round(random.gauss(0, spot_price * 0.02), 2),
                "change_pct": round(random.gauss(0, 2.0), 2),
                "volume": random.randint(80000, 150000),
                "currency": "USD",
                "unit": "per_ton"
            },
            "futures": {
                "1_month": {
                    "price": round(futures_1m, 2),
                    "expiry": (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%d"),
                    "open_interest": random.randint(30000, 50000)
                },
                "3_month": {
                    "price": round(futures_3m, 2),
                    "expiry": (datetime.utcnow() + timedelta(days=90)).strftime("%Y-%m-%d"),
                    "open_interest": random.randint(25000, 40000)
                },
                "6_month": {
                    "price": round(futures_6m, 2),
                    "expiry": (datetime.utcnow() + timedelta(days=180)).strftime("%Y-%m-%d"),
                    "open_interest": random.randint(15000, 30000)
                }
            },
            "options": {
                "put_95": {
                    "strike": round(spot_price * 0.95, 2),
                    "premium": round(put_premium, 2),
                    "expiry": (datetime.utcnow() + timedelta(days=90)).strftime("%Y-%m-%d"),
                    "implied_vol": round(volatility * 100, 1)
                },
                "call_105": {
                    "strike": round(spot_price * 1.05, 2),
                    "premium": round(call_premium, 2),
                    "expiry": (datetime.utcnow() + timedelta(days=90)).strftime("%Y-%m-%d"),
                    "implied_vol": round(volatility * 100, 1)
                }
            },
            "volatility": {
                "annualized": round(volatility * 100, 1),
                "regime": self._get_market_regime().value
            }
        }
    
    def get_fx_rate(self, pair: str = "USD/EUR") -> Dict:
        """
        Get currency exchange rate.
        
        Args:
            pair: Currency pair (e.g., "USD/EUR", "USD/CNY")
            
        Returns:
            Dict with spot rate, forwards, options
        """
        # Get base rate for pair
        if pair == "USD/EUR":
            spot_rate = self.base_usd_eur
            volatility = 0.08 if self.crisis_scenario != 'currency_crisis' else 0.15
        elif pair == "USD/CNY":
            spot_rate = 7.25
            volatility = 0.05
        elif pair == "USD/JPY":
            spot_rate = 150.0
            volatility = 0.10
        else:
            spot_rate = 1.0
            volatility = 0.10
        
        # Add random variation
        spot_rate *= (1 + random.gauss(0, volatility / (252 ** 0.5)))
        
        # Forward rates (interest rate parity approximation)
        # USD typically has higher rates, so forwards show EUR strengthening
        forward_1m = spot_rate * 1.001
        forward_3m = spot_rate * 1.003
        forward_6m = spot_rate * 1.006
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "pair": pair,
            "spot_rate": round(spot_rate, 4),
            "bid": round(spot_rate - 0.002, 4),
            "ask": round(spot_rate + 0.002, 4),
            "change_24h": round(random.gauss(0, 0.01), 4),
            "change_pct": round(random.gauss(0, 0.5), 2),
            "forwards": {
                "1_month": round(forward_1m, 4),
                "3_month": round(forward_3m, 4),
                "6_month": round(forward_6m, 4)
            },
            "volatility": {
                "annualized_pct": round(volatility * 100, 1),
                "regime": "high" if volatility > 0.12 else "normal"
            }
        }
    
    def get_freight_rates(self) -> Dict:
        """
        Get freight rate indices and time charter rates.
        
        Returns:
            Dict with Baltic indices and charter rates
        """
        baltic_index = self.base_baltic_index
        baltic_index *= (1 + random.gauss(0, 0.02))
        
        time_charter_rate = self.base_freight_rate
        time_charter_rate *= (1 + random.gauss(0, 0.015))
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "baltic_dry_index": {
                "value": int(baltic_index),
                "change_24h": random.randint(-50, 50),
                "change_pct": round(random.gauss(0, 2.0), 2)
            },
            "time_charter_rates": {
                "capesize": {
                    "usd_per_day": int(time_charter_rate),
                    "route": "Pacific Round Voyage"
                },
                "panamax": {
                    "usd_per_day": int(time_charter_rate * 0.7),
                    "route": "Trans-Pacific"
                }
            },
            "spot_rates": {
                "shanghai_rotterdam": {
                    "usd_per_teu": random.randint(1800, 2500),
                    "change_pct": round(random.gauss(0, 3.0), 2)
                }
            }
        }
    
    def get_crisis_indicators(self) -> List[str]:
        """
        Get active crisis indicators.
        
        Returns:
            List of active crisis indicator codes
        """
        indicators = []
        
        if self.crisis_scenario == 'red_sea':
            indicators.extend([
                CrisisIndicator.RED_SEA_CONFLICT.value,
                CrisisIndicator.SUEZ_CANAL_DISRUPTION.value,
                CrisisIndicator.FUEL_PRICE_SPIKE.value,
                CrisisIndicator.GEOPOLITICAL_TENSION.value
            ])
        elif self.crisis_scenario == 'fuel_spike':
            indicators.extend([
                CrisisIndicator.FUEL_PRICE_SPIKE.value,
                CrisisIndicator.OPEC_PRODUCTION_CUT.value
            ])
        elif self.crisis_scenario == 'currency_crisis':
            indicators.append(CrisisIndicator.CURRENCY_VOLATILITY.value)
        else:
            # Normal conditions: random minor indicators
            if random.random() < 0.1:
                indicators.append(CrisisIndicator.HURRICANE_SEASON.value)
        
        return indicators
    
    def get_market_summary(self) -> Dict:
        """
        Get comprehensive market summary.
        
        Returns:
            Dict with all market data and crisis assessment
        """
        fuel_data = self.get_fuel_price()
        fx_data = self.get_fx_rate("USD/EUR")
        freight_data = self.get_freight_rates()
        crisis_indicators = self.get_crisis_indicators()
        
        regime = self._get_market_regime()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "market_regime": regime.value,
            "crisis_indicators": crisis_indicators,
            "fuel": fuel_data,
            "fx": fx_data,
            "freight": freight_data,
            "recommendations": self._get_regime_recommendations(regime)
        }
    
    def calculate_var(
        self, 
        exposure_usd: float, 
        asset_type: str,
        confidence: float = 0.95,
        horizon_days: int = 180
    ) -> Dict:
        """
        Calculate Value at Risk (VaR) for given exposure.
        
        Args:
            exposure_usd: Total exposure in USD
            asset_type: 'fuel', 'currency', or 'freight'
            confidence: Confidence level (0.95 = 95%)
            horizon_days: Time horizon in days
            
        Returns:
            Dict with VaR calculation
        """
        # Get volatility for asset type
        if asset_type == 'fuel':
            volatility = self._get_current_volatility()
        elif asset_type == 'currency':
            volatility = 0.08 if self.crisis_scenario != 'currency_crisis' else 0.15
        else:  # freight
            volatility = 0.20  # Freight is more volatile
        
        # Scale volatility to horizon
        horizon_volatility = volatility * (horizon_days / 252) ** 0.5
        
        # VaR calculation (assuming normal distribution)
        # For 95% confidence, use 1.645 std deviations
        z_score = 1.645 if confidence == 0.95 else 2.326  # 95% or 99%
        var_usd = exposure_usd * z_score * horizon_volatility
        
        return {
            "exposure_usd": exposure_usd,
            "asset_type": asset_type,
            "confidence_level": confidence,
            "horizon_days": horizon_days,
            "annualized_volatility": round(volatility * 100, 1),
            "var_usd": round(var_usd, 0),
            "var_pct": round((var_usd / exposure_usd) * 100, 1),
            "interpretation": self._interpret_var(var_usd, exposure_usd)
        }
    
    # ========== Private Helper Methods ==========
    
    def _get_current_volatility(self) -> float:
        """Get current fuel price volatility based on regime"""
        if self.crisis_scenario:
            return 0.35  # 35% annualized in crisis
        return 0.18  # 18% normal
    
    def _get_market_regime(self) -> MarketRegime:
        """Determine current market regime"""
        volatility = self._get_current_volatility()
        
        if volatility > 0.30:
            return MarketRegime.CRISIS
        elif volatility > 0.22:
            return MarketRegime.ELEVATED
        else:
            return MarketRegime.NORMAL
    
    def _calculate_option_premium(
        self, 
        spot: float, 
        strike: float, 
        volatility: float, 
        time_to_expiry: float = 0.25,  # 3 months
        is_put: bool = True
    ) -> float:
        """
        Simplified option pricing (Black-Scholes approximation).
        
        This is a simplified version for demo purposes.
        In production, use proper Black-Scholes or market prices.
        """
        # Intrinsic value
        if is_put:
            intrinsic = max(strike - spot, 0)
        else:
            intrinsic = max(spot - strike, 0)
        
        # Time value (simplified)
        time_value = spot * volatility * (time_to_expiry ** 0.5) * 0.4
        
        return intrinsic + time_value
    
    def _get_regime_recommendations(self, regime: MarketRegime) -> Dict:
        """Get hedging recommendations based on market regime"""
        if regime == MarketRegime.CRISIS:
            return {
                "fuel_hedge_ratio": "75-85%",
                "currency_hedge_ratio": "50-60%",
                "rebalance_frequency": "weekly",
                "instruments": ["futures", "protective_puts", "collars"],
                "urgency": "high"
            }
        elif regime == MarketRegime.ELEVATED:
            return {
                "fuel_hedge_ratio": "65-75%",
                "currency_hedge_ratio": "60-70%",
                "rebalance_frequency": "bi-weekly",
                "instruments": ["futures", "swaps", "options"],
                "urgency": "medium"
            }
        else:  # NORMAL
            return {
                "fuel_hedge_ratio": "50-65%",
                "currency_hedge_ratio": "60-75%",
                "rebalance_frequency": "monthly",
                "instruments": ["futures", "swaps"],
                "urgency": "low"
            }
    
    def _interpret_var(self, var_usd: float, exposure_usd: float) -> str:
        """Interpret VaR magnitude"""
        var_pct = (var_usd / exposure_usd) * 100
        
        if var_pct > 20:
            return "Critical risk - immediate hedging required"
        elif var_pct > 15:
            return "High risk - hedging strongly recommended"
        elif var_pct > 10:
            return "Moderate risk - consider hedging"
        else:
            return "Low risk - selective hedging"


# ========== Singleton ==========

_market_data_service = None


def get_market_data_service(crisis_scenario: Optional[str] = None) -> MarketDataService:
    """
    Get market data service instance (singleton).
    
    Args:
        crisis_scenario: Optional crisis scenario to activate
        
    Returns:
        MarketDataService instance
    """
    global _market_data_service
    
    if _market_data_service is None or crisis_scenario:
        _market_data_service = MarketDataService(
            demo_mode=True, 
            crisis_scenario=crisis_scenario
        )
    
    return _market_data_service
