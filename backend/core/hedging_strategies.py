"""
Financial Hedging Strategies

Implements specific hedging strategies for:
- Fuel price risk
- Currency (FX) risk
- Freight rate risk

Each strategy calculates optimal hedge ratios, instrument selection,
and provides recommendations for both normal and crisis conditions.
"""

import logging
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class HedgeInstrument(Enum):
    """Types of hedging instruments"""
    FUTURES = "futures"
    SWAP = "swap"
    CALL_OPTION = "call_option"
    PUT_OPTION = "put_option"
    COLLAR = "collar"
    FORWARD = "forward"
    TIME_CHARTER = "time_charter"


@dataclass
class HedgePosition:
    """Represents a single hedge position"""
    instrument: HedgeInstrument
    coverage_tons_or_amount: float  # Tons for fuel, USD for currency
    coverage_pct: float  # Percentage of total exposure
    price_or_rate: float  # Locked-in price/rate
    duration_months: int
    cost_usd: float  # Upfront cost (premiums, fees)
    expiry_date: Optional[str] = None


@dataclass
class HedgePortfolio:
    """Complete hedging portfolio"""
    positions: List[HedgePosition]
    total_exposure: float
    hedged_amount: float
    hedge_ratio: float
    total_cost_usd: float
    expected_protection_usd: float
    regime: str  # 'normal' or 'crisis'


class FuelHedgingStrategy:
    """
    Fuel price hedging strategy implementation.
    
    Uses futures, swaps, and options to manage fuel cost volatility.
    """
    
    @staticmethod
    def calculate_optimal_hedge(
        monthly_consumption_tons: float,
        horizon_months: int,
        current_price: float,
        volatility: float,
        crisis_mode: bool = False
    ) -> HedgePortfolio:
        """
        Calculate optimal fuel hedging portfolio.
        
        Args:
            monthly_consumption_tons: Monthly fuel consumption
            horizon_months: Planning horizon (typically 3-6 months)
            current_price: Current spot price per ton
            volatility: Annualized volatility (e.g., 0.20 for 20%)
            crisis_mode: If True, use crisis hedging parameters
            
        Returns:
            HedgePortfolio with recommended positions
        """
        total_exposure_tons = monthly_consumption_tons * horizon_months
        total_exposure_usd = total_exposure_tons * current_price
        
        # Determine hedge ratio based on regime
        if crisis_mode:
            target_ratio = 0.80  # 80% in crisis
        else:
            target_ratio = 0.60  # 60% in normal conditions
        
        # Calculate hedge amounts
        hedge_tons = total_exposure_tons * target_ratio
        
        positions = []
        
        if crisis_mode:
            # Crisis strategy: More defensive, use options
            
            # 1. Futures for base coverage (50%)
            futures_tons = total_exposure_tons * 0.50
            futures_cost = futures_tons * current_price * 0.02  # 2% margin
            positions.append(HedgePosition(
                instrument=HedgeInstrument.FUTURES,
                coverage_tons_or_amount=futures_tons,
                coverage_pct=50.0,
                price_or_rate=current_price * 1.01,  # Small contango
                duration_months=min(horizon_months, 3),
                cost_usd=futures_cost
            ))
            
            # 2. 6-month swaps (20%)
            swap_tons = total_exposure_tons * 0.20
            swap_fee = swap_tons * 2.0  # $2/ton swap fee
            positions.append(HedgePosition(
                instrument=HedgeInstrument.SWAP,
                coverage_tons_or_amount=swap_tons,
                coverage_pct=20.0,
                price_or_rate=current_price * 1.03,  # Swap at premium
                duration_months=6,
                cost_usd=swap_fee
            ))
            
            # 3. Protective put options (10%)
            put_tons = total_exposure_tons * 0.10
            put_strike = current_price * 0.95  # 5% out of money
            put_premium = FuelHedgingStrategy._calculate_option_cost(
                put_tons, current_price, volatility, is_put=True
            )
            positions.append(HedgePosition(
                instrument=HedgeInstrument.PUT_OPTION,
                coverage_tons_or_amount=put_tons,
                coverage_pct=10.0,
                price_or_rate=put_strike,
                duration_months=3,
                cost_usd=put_premium
            ))
            
        else:
            # Normal strategy: Mix of futures and collars
            
            # 1. Futures (40%)
            futures_tons = total_exposure_tons * 0.40
            futures_cost = futures_tons * current_price * 0.02
            positions.append(HedgePosition(
                instrument=HedgeInstrument.FUTURES,
                coverage_tons_or_amount=futures_tons,
                coverage_pct=40.0,
                price_or_rate=current_price,
                duration_months=3,
                cost_usd=futures_cost
            ))
            
            # 2. Collar options (20%): Buy put + sell call
            collar_tons = total_exposure_tons * 0.20
            # Buy put at 95% of spot
            put_cost = FuelHedgingStrategy._calculate_option_cost(
                collar_tons, current_price, volatility, is_put=True, strike_pct=0.95
            )
            # Sell call at 105% of spot (premium received)
            call_revenue = FuelHedgingStrategy._calculate_option_cost(
                collar_tons, current_price, volatility, is_put=False, strike_pct=1.05
            )
            net_collar_cost = put_cost - call_revenue * 0.8  # Assume capture 80% of call premium
            
            positions.append(HedgePosition(
                instrument=HedgeInstrument.COLLAR,
                coverage_tons_or_amount=collar_tons,
                coverage_pct=20.0,
                price_or_rate=current_price,  # Midpoint
                duration_months=6,
                cost_usd=max(net_collar_cost, 0)  # Net cost after call premium
            ))
        
        # Calculate totals
        hedged_tons = sum(p.coverage_tons_or_amount for p in positions)
        total_cost = sum(p.cost_usd for p in positions)
        hedge_ratio = hedged_tons / total_exposure_tons
        
        # Estimate protection value (expected savings from adverse 1-sigma move)
        expected_protection = hedged_tons * current_price * volatility
        
        return HedgePortfolio(
            positions=positions,
            total_exposure=total_exposure_usd,
            hedged_amount=hedged_tons * current_price,
            hedge_ratio=hedge_ratio,
            total_cost_usd=total_cost,
            expected_protection_usd=expected_protection,
            regime='crisis' if crisis_mode else 'normal'
        )
    
    @staticmethod
    def _calculate_option_cost(
        tons: float, 
        spot_price: float, 
        volatility: float,
        is_put: bool = True,
        strike_pct: float = 1.0,
        time_to_expiry: float = 0.25  # 3 months
    ) -> float:
        """
        Calculate option premium cost (simplified).
        
        Real implementation would use Black-Scholes.
        """
        strike = spot_price * strike_pct
        
        # Intrinsic value
        if is_put:
            intrinsic = max(strike - spot_price, 0)
        else:
            intrinsic = max(spot_price - strike, 0)
        
        # Time value
        time_value = spot_price * volatility * (time_to_expiry ** 0.5) * 0.4
        
        premium_per_ton = intrinsic + time_value
        
        return tons * premium_per_ton


class CurrencyHedgingStrategy:
    """
    Currency (FX) hedging strategy implementation.
    
    Uses forward contracts and options to manage exchange rate risk.
    """
    
    @staticmethod
    def calculate_optimal_hedge(
        monthly_revenue_foreign: float,  # e.g., EUR revenue
        horizon_months: int,
        current_fx_rate: float,  # e.g., 1.10 USD/EUR
        volatility: float,
        crisis_mode: bool = False
    ) -> HedgePortfolio:
        """
        Calculate optimal currency hedging portfolio.
        
        Args:
            monthly_revenue_foreign: Monthly revenue in foreign currency
            horizon_months: Planning horizon
            current_fx_rate: Current exchange rate
            volatility: FX volatility
            crisis_mode: Crisis hedging flag
            
        Returns:
            HedgePortfolio with FX hedge positions
        """
        total_exposure_foreign = monthly_revenue_foreign * horizon_months
        total_exposure_usd = total_exposure_foreign * current_fx_rate
        
        # In crisis, reduce hedge ratio (more uncertainty)
        if crisis_mode:
            target_ratio = 0.55  # 55% in crisis
        else:
            target_ratio = 0.70  # 70% in normal
        
        hedge_amount = total_exposure_foreign * target_ratio
        
        positions = []
        
        if crisis_mode:
            # Crisis: Use more options for flexibility
            
            # 1. Short-term forwards (30%)
            forward_1m = total_exposure_foreign * 0.30
            positions.append(HedgePosition(
                instrument=HedgeInstrument.FORWARD,
                coverage_tons_or_amount=forward_1m,
                coverage_pct=30.0,
                price_or_rate=current_fx_rate * 1.001,  # Slight premium
                duration_months=1,
                cost_usd=0  # Forwards are zero-cost
            ))
            
            # 2. 2-month forwards (15%)
            forward_2m = total_exposure_foreign * 0.15
            positions.append(HedgePosition(
                instrument=HedgeInstrument.FORWARD,
                coverage_tons_or_amount=forward_2m,
                coverage_pct=15.0,
                price_or_rate=current_fx_rate * 1.002,
                duration_months=2,
                cost_usd=0
            ))
            
            # 3. Protective put options (10%)
            put_amount = total_exposure_foreign * 0.10
            put_premium = put_amount * current_fx_rate * volatility * 0.5
            positions.append(HedgePosition(
                instrument=HedgeInstrument.PUT_OPTION,
                coverage_tons_or_amount=put_amount,
                coverage_pct=10.0,
                price_or_rate=current_fx_rate * 0.98,  # Strike 2% lower
                duration_months=3,
                cost_usd=put_premium
            ))
            
        else:
            # Normal: Layered forward contracts
            
            # 1. 1-month forward (30%)
            positions.append(HedgePosition(
                instrument=HedgeInstrument.FORWARD,
                coverage_tons_or_amount=total_exposure_foreign * 0.30,
                coverage_pct=30.0,
                price_or_rate=current_fx_rate,
                duration_months=1,
                cost_usd=0
            ))
            
            # 2. 3-month forward (25%)
            positions.append(HedgePosition(
                instrument=HedgeInstrument.FORWARD,
                coverage_tons_or_amount=total_exposure_foreign * 0.25,
                coverage_pct=25.0,
                price_or_rate=current_fx_rate * 1.003,
                duration_months=3,
                cost_usd=0
            ))
            
            # 3. 6-month forward (15%)
            positions.append(HedgePosition(
                instrument=HedgeInstrument.FORWARD,
                coverage_tons_or_amount=total_exposure_foreign * 0.15,
                coverage_pct=15.0,
                price_or_rate=current_fx_rate * 1.006,
                duration_months=6,
                cost_usd=0
            ))
        
        hedged_amount = sum(p.coverage_tons_or_amount for p in positions)
        total_cost = sum(p.cost_usd for p in positions)
        hedge_ratio = hedged_amount / total_exposure_foreign
        
        # Expected protection from 1-sigma adverse FX move
        expected_protection = hedged_amount * current_fx_rate * volatility
        
        return HedgePortfolio(
            positions=positions,
            total_exposure=total_exposure_usd,
            hedged_amount=hedged_amount * current_fx_rate,
            hedge_ratio=hedge_ratio,
            total_cost_usd=total_cost,
            expected_protection_usd=expected_protection,
            regime='crisis' if crisis_mode else 'normal'
        )


class FreightRateStrategy:
    """
    Freight rate management strategy.
    
    Uses time charter contracts and spot market mix.
    """
    
    @staticmethod
    def calculate_optimal_strategy(
        monthly_voyages: int,
        current_time_charter_rate: float,
        spot_rate_range: Tuple[float, float],
        crisis_mode: bool = False
    ) -> Dict:
        """
        Calculate optimal freight rate strategy.
        
        Args:
            monthly_voyages: Number of voyages per month
            current_time_charter_rate: Current time charter rate (USD/day)
            spot_rate_range: (min, max) spot rate range
            crisis_mode: Crisis flag
            
        Returns:
            Dict with strategy recommendations
        """
        if crisis_mode:
            # Crisis: Need flexibility to reroute
            time_charter_pct = 0.60  # Reduce locked capacity
            spot_pct = 0.40  # Increase spot for flexibility
        else:
            # Normal: Lock in stable costs
            time_charter_pct = 0.70
            spot_pct = 0.30
        
        time_charter_voyages = monthly_voyages * time_charter_pct
        spot_voyages = monthly_voyages * spot_pct
        
        # Approximate costs
        avg_voyage_days = 30
        time_charter_cost = time_charter_voyages * avg_voyage_days * current_time_charter_rate
        spot_avg_rate = sum(spot_rate_range) / 2
        spot_cost = spot_voyages * avg_voyage_days * spot_avg_rate
        
        total_cost = time_charter_cost + spot_cost
        
        return {
            "strategy": f"{int(time_charter_pct*100)}% time charter, {int(spot_pct*100)}% spot",
            "time_charter": {
                "voyages_per_month": time_charter_voyages,
                "rate_usd_per_day": current_time_charter_rate,
                "monthly_cost_usd": time_charter_cost,
                "duration_months": 12 if not crisis_mode else 6
            },
            "spot_market": {
                "voyages_per_month": spot_voyages,
                "expected_rate_usd_per_day": spot_avg_rate,
                "monthly_cost_usd": spot_cost
            },
            "total_monthly_cost_usd": total_cost,
            "flexibility_score": spot_pct,  # Higher = more flexible
            "cost_certainty_score": time_charter_pct,  # Higher = more certain
            "regime": "crisis" if crisis_mode else "normal",
            "recommendations": FreightRateStrategy._get_recommendations(crisis_mode)
        }
    
    @staticmethod
    def _get_recommendations(crisis_mode: bool) -> List[str]:
        """Get strategy recommendations"""
        if crisis_mode:
            return [
                "Reduce time charter commitments for route flexibility",
                "Increase spot market participation",
                "Secure alternative route capacity (e.g., Cape vs Suez)",
                "Negotiate force majeure clauses",
                "Monitor Baltic Index daily for rate changes"
            ]
        else:
            return [
                "Lock majority capacity via time charters for cost certainty",
                "Maintain 30% spot exposure for flexibility",
                "Diversify vessel types and routes",
                "Review contracts quarterly",
                "Monitor fuel adjustment clauses (BAF)"
            ]


def create_comprehensive_hedge_strategy(
    fuel_consumption_tons_monthly: float,
    revenue_foreign_currency_monthly: float,
    fx_pair: str,
    current_fx_rate: float,
    monthly_voyages: int,
    market_data: Dict,
    crisis_mode: bool = False
) -> Dict:
    """
    Create comprehensive hedging strategy across all risk types.
    
    Args:
        fuel_consumption_tons_monthly: Monthly fuel consumption
        revenue_foreign_currency_monthly: Monthly revenue in foreign currency
        fx_pair: Currency pair (e.g., "EUR")
        current_fx_rate: Current exchange rate
        monthly_voyages: Voyages per month
        market_data: Market data dict from MarketDataService
        crisis_mode: Crisis hedging flag
        
    Returns:
        Comprehensive hedging strategy with all components
    """
    # Extract market data
    fuel_price = market_data["fuel"]["fuel_oil_380"]["spot_price"]
    fuel_volatility = market_data["fuel"]["volatility"]["annualized"] / 100
    fx_volatility = market_data["fx"]["volatility"]["annualized_pct"] / 100
    freight_rate = market_data["freight"]["time_charter_rates"]["capesize"]["usd_per_day"]
    
    # Calculate individual strategies
    fuel_strategy = FuelHedgingStrategy.calculate_optimal_hedge(
        monthly_consumption_tons=fuel_consumption_tons_monthly,
        horizon_months=6,
        current_price=fuel_price,
        volatility=fuel_volatility,
        crisis_mode=crisis_mode
    )
    
    currency_strategy = CurrencyHedgingStrategy.calculate_optimal_hedge(
        monthly_revenue_foreign=revenue_foreign_currency_monthly,
        horizon_months=6,
        current_fx_rate=current_fx_rate,
        volatility=fx_volatility,
        crisis_mode=crisis_mode
    )
    
    freight_strategy = FreightRateStrategy.calculate_optimal_strategy(
        monthly_voyages=monthly_voyages,
        current_time_charter_rate=freight_rate,
        spot_rate_range=(freight_rate * 0.9, freight_rate * 1.1),
        crisis_mode=crisis_mode
    )
    
    # Calculate totals
    total_hedging_cost = fuel_strategy.total_cost_usd + currency_strategy.total_cost_usd
    total_protection = fuel_strategy.expected_protection_usd + currency_strategy.expected_protection_usd
    
    return {
        "regime": "crisis" if crisis_mode else "normal",
        "crisis_indicators": market_data.get("crisis_indicators", []),
        "fuel_hedging": {
            "hedge_ratio": f"{fuel_strategy.hedge_ratio*100:.1f}%",
            "total_exposure_usd": fuel_strategy.total_exposure,
            "hedged_amount_usd": fuel_strategy.hedged_amount,
            "positions": [
                {
                    "instrument": p.instrument.value,
                    "coverage_pct": p.coverage_pct,
                    "coverage_amount": p.coverage_tons_or_amount,
                    "price": p.price_or_rate,
                    "duration_months": p.duration_months,
                    "cost_usd": p.cost_usd
                }
                for p in fuel_strategy.positions
            ],
            "total_cost_usd": fuel_strategy.total_cost_usd,
            "expected_protection_usd": fuel_strategy.expected_protection_usd
        },
        "currency_hedging": {
            "hedge_ratio": f"{currency_strategy.hedge_ratio*100:.1f}%",
            "total_exposure_usd": currency_strategy.total_exposure,
            "hedged_amount_usd": currency_strategy.hedged_amount,
            "positions": [
                {
                    "instrument": p.instrument.value,
                    "coverage_pct": p.coverage_pct,
                    "coverage_amount": p.coverage_tons_or_amount,
                    "rate": p.price_or_rate,
                    "duration_months": p.duration_months,
                    "cost_usd": p.cost_usd
                }
                for p in currency_strategy.positions
            ],
            "total_cost_usd": currency_strategy.total_cost_usd,
            "expected_protection_usd": currency_strategy.expected_protection_usd
        },
        "freight_strategy": freight_strategy,
        "summary": {
            "total_hedging_cost_usd": total_hedging_cost,
            "total_expected_protection_usd": total_protection,
            "roi_ratio": total_protection / total_hedging_cost if total_hedging_cost > 0 else 0,
            "urgency": "high" if crisis_mode else "normal",
            "next_review": "weekly" if crisis_mode else "monthly"
        }
    }
