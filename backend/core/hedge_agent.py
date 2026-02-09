"""
Financial Hedge Agent

AI-powered agent that analyzes financial risks and provides hedging recommendations
for global boat operations. Covers:
- Fuel price risk
- Currency (FX) risk  
- Freight rate risk

The agent integrates with the existing multi-agent system and can be called
during crisis scenarios to provide real-time hedging strategies.
"""

import logging
import json
from typing import Dict, List, Optional
from datetime import datetime

from services.market_data_service import get_market_data_service, MarketRegime
from core.hedging_strategies import (
    create_comprehensive_hedge_strategy,
    FuelHedgingStrategy,
    CurrencyHedgingStrategy,
    FreightRateStrategy
)

logger = logging.getLogger(__name__)


class FinancialHedgeAgent:
    """
    AI agent for financial risk hedging.
    
    This agent:
    1. Monitors market conditions and detects crisis indicators
    2. Assesses current risk exposure
    3. Recommends optimal hedging strategies
    4. Provides crisis-specific emergency hedging plans
    """
    
    def __init__(self, crisis_scenario: Optional[str] = None):
        """
        Initialize hedge agent.
        
        Args:
            crisis_scenario: Optional crisis scenario ('red_sea', 'fuel_spike', etc.)
        """
        self.crisis_scenario = crisis_scenario
        self.market_service = get_market_data_service(crisis_scenario)
        logger.info(f"FinancialHedgeAgent initialized (crisis={crisis_scenario})")
    
    def assess_risk(self, operation_params: Dict) -> Dict:
        """
        Assess current financial risk exposure.
        
        Args:
            operation_params: Dict with:
                - fuel_consumption_monthly: Tons per month
                - revenue_foreign_monthly: Revenue in foreign currency
                - fx_pair: Currency pair (e.g., "USD/EUR")
                - monthly_voyages: Number of voyages
                - current_route: Route name
                
        Returns:
            Risk assessment with exposure calculations and VaR
        """
        logger.info("Assessing financial risk exposure...")
        
        # Get market data
        market_data = self.market_service.get_market_summary()
        regime = market_data["market_regime"]
        crisis_indicators = market_data["crisis_indicators"]
        
        # Extract operation parameters
        fuel_consumption = operation_params.get("fuel_consumption_monthly", 1000)
        revenue_foreign = operation_params.get("revenue_foreign_monthly", 1_800_000)  # EUR
        fx_pair = operation_params.get("fx_pair", "EUR")
        monthly_voyages = operation_params.get("monthly_voyages", 4)
        
        # Get prices
        fuel_price = market_data["fuel"]["fuel_oil_380"]["spot_price"]
        fx_rate = market_data["fx"]["spot_rate"]
        freight_rate = market_data["freight"]["time_charter_rates"]["capesize"]["usd_per_day"]
        
        # Calculate exposures
        fuel_exposure_6m = fuel_consumption * 6 * fuel_price
        currency_exposure_6m = revenue_foreign * 6 * fx_rate
        freight_exposure_monthly = freight_rate * 30 * monthly_voyages
        freight_exposure_6m = freight_exposure_monthly * 6
        
        # Calculate VaR for each risk type
        fuel_var = self.market_service.calculate_var(
            exposure_usd=fuel_exposure_6m,
            asset_type='fuel',
            confidence=0.95,
            horizon_days=180
        )
        
        currency_var = self.market_service.calculate_var(
            exposure_usd=currency_exposure_6m,
            asset_type='currency',
            confidence=0.95,
            horizon_days=180
        )
        
        freight_var = self.market_service.calculate_var(
            exposure_usd=freight_exposure_6m,
            asset_type='freight',
            confidence=0.95,
            horizon_days=180
        )
        
        # Aggregate risk
        total_exposure = fuel_exposure_6m + currency_exposure_6m + freight_exposure_6m
        total_var = fuel_var["var_usd"] + currency_var["var_usd"] + freight_var["var_usd"]
        
        # Determine urgency
        crisis_mode = regime == MarketRegime.CRISIS.value
        urgency = "CRITICAL" if crisis_mode else "MODERATE" if regime == MarketRegime.ELEVATED.value else "LOW"
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "market_regime": regime,
            "crisis_indicators": crisis_indicators,
            "urgency": urgency,
            "total_exposure_usd": total_exposure,
            "total_var_95_usd": total_var,
            "var_as_pct_of_exposure": (total_var / total_exposure * 100) if total_exposure > 0 else 0,
            "risk_breakdown": {
                "fuel": {
                    "6m_exposure_usd": fuel_exposure_6m,
                    "var_95_usd": fuel_var["var_usd"],
                    "volatility_pct": fuel_var["annualized_volatility"],
                    "current_price": fuel_price,
                    "consumption_tons_monthly": fuel_consumption
                },
                "currency": {
                    "6m_exposure_usd": currency_exposure_6m,
                    "var_95_usd": currency_var["var_usd"],
                    "volatility_pct": currency_var["annualized_volatility"],
                    "current_rate": fx_rate,
                    "revenue_monthly": revenue_foreign,
                    "pair": fx_pair
                },
                "freight": {
                    "6m_exposure_usd": freight_exposure_6m,
                    "var_95_usd": freight_var["var_usd"],
                    "current_rate_usd_day": freight_rate,
                    "monthly_voyages": monthly_voyages
                }
            },
            "recommendations": {
                "immediate_action_required": crisis_mode,
                "suggested_hedge_ratio": "75-85%" if crisis_mode else "60-70%",
                "review_frequency": "daily" if crisis_mode else "weekly",
                "should_activate_crisis_plan": crisis_mode
            }
        }
    
    def recommend_hedging_strategy(self, operation_params: Dict, crisis_override: bool = False) -> Dict:
        """
        Recommend optimal hedging strategy.
        
        Args:
            operation_params: Operation parameters (same as assess_risk)
            crisis_override: Force crisis hedging mode
            
        Returns:
            Comprehensive hedging strategy with specific positions
        """
        logger.info("Generating hedging recommendations...")
        
        # Get market data
        market_data = self.market_service.get_market_summary()
        regime = market_data["market_regime"]
        
        # Determine if crisis mode
        crisis_mode = (regime == MarketRegime.CRISIS.value) or crisis_override
        
        # Extract parameters with defaults
        fuel_consumption = operation_params.get("fuel_consumption_monthly", 1000)
        revenue_foreign = operation_params.get("revenue_foreign_monthly", 1_800_000)
        fx_rate = market_data["fx"]["spot_rate"]
        monthly_voyages = operation_params.get("monthly_voyages", 4)
        
        # Create comprehensive strategy
        strategy = create_comprehensive_hedge_strategy(
            fuel_consumption_tons_monthly=fuel_consumption,
            revenue_foreign_currency_monthly=revenue_foreign,
            fx_pair="EUR",
            current_fx_rate=fx_rate,
            monthly_voyages=monthly_voyages,
            market_data=market_data,
            crisis_mode=crisis_mode
        )
        
        # Add execution timeline
        strategy["execution_timeline"] = self._create_execution_timeline(crisis_mode)
        
        # Add agent reasoning
        strategy["agent_reasoning"] = self._generate_reasoning(market_data, strategy, crisis_mode)
        
        return strategy
    
    def activate_crisis_hedging(self, operation_params: Dict) -> Dict:
        """
        Activate emergency crisis hedging protocol.
        
        This is called when crisis indicators are detected and immediate
        action is required.
        
        Args:
            operation_params: Operation parameters
            
        Returns:
            Crisis hedging plan with immediate actions
        """
        logger.warning("🚨 CRISIS HEDGING ACTIVATED")
        
        # Force crisis mode
        strategy = self.recommend_hedging_strategy(operation_params, crisis_override=True)
        
        # Add crisis-specific actions
        crisis_plan = {
            "alert_level": "CRITICAL",
            "timestamp": datetime.utcnow().isoformat(),
            "crisis_type": self.crisis_scenario or "detected",
            "immediate_actions": [
                {
                    "action": "Contact brokers for emergency option quotes",
                    "priority": "IMMEDIATE",
                    "deadline": "Within 4 hours",
                    "responsible": "Risk Manager"
                },
                {
                    "action": "Execute protective put options on fuel",
                    "priority": "HIGH",
                    "deadline": "Within 24 hours",
                    "details": f"Cover {strategy['fuel_hedging']['positions'][0]['coverage_pct']}% exposure"
                },
                {
                    "action": "Add near-month fuel futures",
                    "priority": "HIGH",
                    "deadline": "Within 24 hours"
                },
                {
                    "action": "Adjust currency hedge ratio to 55%",
                    "priority": "MEDIUM",
                    "deadline": "Within 48 hours"
                },
                {
                    "action": "Secure alternative route capacity",
                    "priority": "HIGH",
                    "deadline": "Within 72 hours"
                },
                {
                    "action": "Activate customer force majeure notifications",
                    "priority": "MEDIUM",
                    "deadline": "Within 24 hours"
                }
            ],
            "hedging_strategy": strategy,
            "monitoring_protocol": {
                "frequency": "Every 4 hours",
                "metrics_to_watch": [
                    "Fuel price movements >3%",
                    "FX rate changes >1%",
                    "New crisis indicators",
                    "Market volatility spikes"
                ],
                "escalation_triggers": [
                    "Fuel price >15% spike in 24h",
                    "Multiple route disruptions",
                    "Currency collapse >10%"
                ]
            },
            "communication_plan": {
                "internal": [
                    "Alert CFO and Risk Committee",
                    "Daily status updates to executive team",
                    "Real-time hedge P&L reporting"
                ],
                "external": [
                    "Notify key customers of potential delays",
                    "Coordinate with bunker suppliers",
                    "Update insurance underwriters"
                ]
            }
        }
        
        return crisis_plan
    
    def generate_agent_report(self, operation_params: Dict) -> str:
        """
        Generate natural language report from the hedge agent.
        
        This creates a human-readable summary suitable for executives.
        
        Args:
            operation_params: Operation parameters
            
        Returns:
            Formatted report string
        """
        # Get risk assessment and strategy
        risk = self.assess_risk(operation_params)
        strategy = self.recommend_hedging_strategy(operation_params)
        
        regime = risk["market_regime"]
        crisis_mode = regime == MarketRegime.CRISIS.value
        
        # Build report
        report_lines = [
            "=" * 70,
            "FINANCIAL HEDGE AGENT REPORT",
            "=" * 70,
            f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
            f"Market Regime: {regime.upper()}",
            f"Urgency Level: {risk['urgency']}",
            "",
            "📊 RISK EXPOSURE SUMMARY",
            "-" * 70,
            f"Total 6-Month Exposure: ${risk['total_exposure_usd']:,.0f}",
            f"Value at Risk (95%): ${risk['total_var_95_usd']:,.0f} ({risk['var_as_pct_of_exposure']:.1f}%)",
            "",
            "Breakdown:",
            f"  • Fuel Risk: ${risk['risk_breakdown']['fuel']['6m_exposure_usd']:,.0f} "
            f"(VaR: ${risk['risk_breakdown']['fuel']['var_95_usd']:,.0f})",
            f"  • Currency Risk: ${risk['risk_breakdown']['currency']['6m_exposure_usd']:,.0f} "
            f"(VaR: ${risk['risk_breakdown']['currency']['var_95_usd']:,.0f})",
            f"  • Freight Risk: ${risk['risk_breakdown']['freight']['6m_exposure_usd']:,.0f}",
        ]
        
        if risk["crisis_indicators"]:
            report_lines.extend([
                "",
                "🚨 ACTIVE CRISIS INDICATORS:",
                "-" * 70,
            ])
            for indicator in risk["crisis_indicators"]:
                report_lines.append(f"  ⚠️  {indicator.replace('_', ' ').title()}")
        
        report_lines.extend([
            "",
            "💡 RECOMMENDED HEDGING STRATEGY",
            "-" * 70,
            f"Regime: {strategy['regime'].upper()}",
            "",
            f"Fuel Hedging ({strategy['fuel_hedging']['hedge_ratio']}):",
        ])
        
        for pos in strategy['fuel_hedging']['positions']:
            report_lines.append(
                f"  • {pos['instrument'].replace('_', ' ').title()}: "
                f"{pos['coverage_pct']:.0f}% coverage @ ${pos['price']:.2f}/ton "
                f"({pos['duration_months']}mo) - Cost: ${pos['cost_usd']:,.0f}"
            )
        
        report_lines.extend([
            f"  Total Cost: ${strategy['fuel_hedging']['total_cost_usd']:,.0f}",
            f"  Expected Protection: ${strategy['fuel_hedging']['expected_protection_usd']:,.0f}",
            "",
            f"Currency Hedging ({strategy['currency_hedging']['hedge_ratio']}):",
        ])
        
        for pos in strategy['currency_hedging']['positions']:
            report_lines.append(
                f"  • {pos['instrument'].replace('_', ' ').title()}: "
                f"{pos['coverage_pct']:.0f}% coverage @ {pos['rate']:.4f} "
                f"({pos['duration_months']}mo)"
            )
        
        report_lines.extend([
            "",
            f"Freight Strategy: {strategy['freight_strategy']['strategy']}",
            "",
            "💰 COST-BENEFIT ANALYSIS",
            "-" * 70,
            f"Total Hedging Cost: ${strategy['summary']['total_hedging_cost_usd']:,.0f}",
            f"Expected Protection: ${strategy['summary']['total_expected_protection_usd']:,.0f}",
            f"ROI Ratio: {strategy['summary']['roi_ratio']:.1f}x",
            f"Next Review: {strategy['summary']['next_review'].title()}",
        ])
        
        if crisis_mode:
            report_lines.extend([
                "",
                "⚡ IMMEDIATE ACTIONS REQUIRED",
                "-" * 70,
                "1. Contact brokers for emergency options (within 4 hours)",
                "2. Execute protective puts on fuel (within 24 hours)",
                "3. Add near-month futures to lock prices (within 24 hours)",
                "4. Adjust currency hedges (within 48 hours)",
                "5. Secure alternative route capacity (within 72 hours)",
            ])
        
        report_lines.extend([
            "",
            "=" * 70,
            "End of Report",
            "=" * 70,
        ])
        
        return "\n".join(report_lines)
    
    # ========== Private Helper Methods ==========
    
    def _create_execution_timeline(self, crisis_mode: bool) -> Dict:
        """Create execution timeline for hedging actions"""
        if crisis_mode:
            return {
                "phase_1_immediate": {
                    "timeframe": "0-24 hours",
                    "actions": [
                        "Contact brokers for quotes",
                        "Execute protective puts",
                        "Add near-month futures"
                    ]
                },
                "phase_2_short_term": {
                    "timeframe": "1-7 days",
                    "actions": [
                        "Rebalance portfolio to crisis ratios",
                        "Secure alternative freight capacity",
                        "Daily monitoring and adjustments"
                    ]
                },
                "phase_3_stabilization": {
                    "timeframe": "2-4 weeks",
                    "actions": [
                        "Assess crisis duration",
                        "Plan hedge rollovers",
                        "Weekly portfolio review"
                    ]
                }
            }
        else:
            return {
                "phase_1_setup": {
                    "timeframe": "Week 1",
                    "actions": [
                        "Execute futures contracts",
                        "Set up layered forwards",
                        "Establish collar positions"
                    ]
                },
                "phase_2_monitoring": {
                    "timeframe": "Months 1-3",
                    "actions": [
                        "Monthly portfolio review",
                        "Roll maturing positions",
                        "Adjust for exposure changes"
                    ]
                },
                "phase_3_renewal": {
                    "timeframe": "Month 4-6",
                    "actions": [
                        "Evaluate strategy effectiveness",
                        "Plan next 6-month hedging",
                        "Update based on market conditions"
                    ]
                }
            }
    
    def _generate_reasoning(self, market_data: Dict, strategy: Dict, crisis_mode: bool) -> str:
        """Generate AI reasoning for the strategy"""
        regime = market_data["market_regime"]
        fuel_vol = market_data["fuel"]["volatility"]["annualized"]
        
        reasoning_parts = [
            f"Given the current {regime} market regime with fuel volatility at {fuel_vol}%, "
        ]
        
        if crisis_mode:
            reasoning_parts.append(
                f"I recommend an aggressive hedging approach with {strategy['fuel_hedging']['hedge_ratio']} "
                "fuel coverage. The crisis indicators suggest elevated risk, warranting protective "
                "options to limit downside while maintaining some flexibility. Currency hedging is "
                "reduced to 55% due to increased uncertainty - flexibility is more valuable than "
                "locking rates in unpredictable conditions."
            )
        else:
            reasoning_parts.append(
                f"I recommend a balanced hedging approach with {strategy['fuel_hedging']['hedge_ratio']} "
                "fuel coverage and 70% currency coverage. This provides cost certainty for budgeting "
                "while maintaining upside participation through the unhedged portion. The mix of "
                "futures and options offers flexibility at reasonable cost."
            )
        
        reasoning_parts.append(
            f"\n\nExpected hedging cost of ${strategy['summary']['total_hedging_cost_usd']:,.0f} "
            f"provides ${strategy['summary']['total_expected_protection_usd']:,.0f} in protection, "
            f"representing a {strategy['summary']['roi_ratio']:.1f}x return on hedging investment "
            "if adverse price movements occur."
        )
        
        return "".join(reasoning_parts)


# ========== Singleton ==========

_hedge_agent = None


def get_hedge_agent(crisis_scenario: Optional[str] = None) -> FinancialHedgeAgent:
    """
    Get hedge agent instance (singleton).
    
    Args:
        crisis_scenario: Optional crisis scenario
        
    Returns:
        FinancialHedgeAgent instance
    """
    global _hedge_agent
    
    if _hedge_agent is None or crisis_scenario:
        _hedge_agent = FinancialHedgeAgent(crisis_scenario=crisis_scenario)
    
    return _hedge_agent
