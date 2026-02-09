"""
Test script for Financial Hedging System

This script tests all components of the hedging system:
- Market data service
- Hedging strategies
- Financial hedge agent
- API endpoints (requires server running)
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.market_data_service import get_market_data_service
from core.hedging_strategies import (
    FuelHedgingStrategy,
    CurrencyHedgingStrategy,
    FreightRateStrategy,
    create_comprehensive_hedge_strategy
)
from core.hedge_agent import get_hedge_agent


def test_market_data_service():
    """Test market data service"""
    print("=" * 70)
    print("TEST 1: Market Data Service")
    print("=" * 70)
    
    # Normal conditions
    print("\n1. Normal Market Conditions:")
    market_service = get_market_data_service()
    fuel_data = market_service.get_fuel_price()
    print(f"   Fuel Price: ${fuel_data['fuel_oil_380']['spot_price']:.2f}/ton")
    print(f"   Volatility: {fuel_data['volatility']['annualized']}%")
    print(f"   Regime: {fuel_data['volatility']['regime']}")
    
    # Crisis conditions
    print("\n2. Crisis Market Conditions (Red Sea):")
    crisis_service = get_market_data_service(crisis_scenario='red_sea')
    crisis_fuel = crisis_service.get_fuel_price()
    print(f"   Fuel Price: ${crisis_fuel['fuel_oil_380']['spot_price']:.2f}/ton")
    print(f"   Volatility: {crisis_fuel['volatility']['annualized']}%")
    print(f"   Regime: {crisis_fuel['volatility']['regime']}")
    
    # Market summary
    print("\n3. Market Summary:")
    summary = crisis_service.get_market_summary()
    print(f"   Market Regime: {summary['market_regime']}")
    print(f"   Crisis Indicators: {summary['crisis_indicators']}")
    
    # VaR calculation
    print("\n4. Value at Risk Calculation:")
    var = market_service.calculate_var(
        exposure_usd=5_000_000,
        asset_type='fuel',
        confidence=0.95,
        horizon_days=180
    )
    print(f"   Exposure: ${var['exposure_usd']:,.0f}")
    print(f"   VaR (95%): ${var['var_usd']:,.0f} ({var['var_pct']:.1f}%)")
    print(f"   Interpretation: {var['interpretation']}")
    
    print("\n✅ Market Data Service Test PASSED\n")


def test_fuel_hedging_strategy():
    """Test fuel hedging strategy"""
    print("=" * 70)
    print("TEST 2: Fuel Hedging Strategy")
    print("=" * 70)
    
    # Normal hedging
    print("\n1. Normal Market Hedging:")
    normal_portfolio = FuelHedgingStrategy.calculate_optimal_hedge(
        monthly_consumption_tons=1000,
        horizon_months=6,
        current_price=650,
        volatility=0.18,
        crisis_mode=False
    )
    print(f"   Hedge Ratio: {normal_portfolio.hedge_ratio*100:.1f}%")
    print(f"   Total Exposure: ${normal_portfolio.total_exposure:,.0f}")
    print(f"   Hedged Amount: ${normal_portfolio.hedged_amount:,.0f}")
    print(f"   Total Cost: ${normal_portfolio.total_cost_usd:,.0f}")
    print(f"   Expected Protection: ${normal_portfolio.expected_protection_usd:,.0f}")
    print(f"\n   Positions:")
    for pos in normal_portfolio.positions:
        print(f"     - {pos.instrument.value}: {pos.coverage_pct:.0f}% @ ${pos.price_or_rate:.2f}")
    
    # Crisis hedging
    print("\n2. Crisis Market Hedging:")
    crisis_portfolio = FuelHedgingStrategy.calculate_optimal_hedge(
        monthly_consumption_tons=1000,
        horizon_months=6,
        current_price=750,
        volatility=0.35,
        crisis_mode=True
    )
    print(f"   Hedge Ratio: {crisis_portfolio.hedge_ratio*100:.1f}%")
    print(f"   Total Cost: ${crisis_portfolio.total_cost_usd:,.0f}")
    print(f"   Expected Protection: ${crisis_portfolio.expected_protection_usd:,.0f}")
    
    print("\n✅ Fuel Hedging Strategy Test PASSED\n")


def test_currency_hedging_strategy():
    """Test currency hedging strategy"""
    print("=" * 70)
    print("TEST 3: Currency Hedging Strategy")
    print("=" * 70)
    
    portfolio = CurrencyHedgingStrategy.calculate_optimal_hedge(
        monthly_revenue_foreign=1_800_000,  # EUR
        horizon_months=6,
        current_fx_rate=1.10,
        volatility=0.08,
        crisis_mode=False
    )
    
    print(f"   Hedge Ratio: {portfolio.hedge_ratio*100:.1f}%")
    print(f"   Total Exposure: ${portfolio.total_exposure:,.0f}")
    print(f"   Total Cost: ${portfolio.total_cost_usd:,.0f} (forwards are zero-cost)")
    print(f"\n   Positions:")
    for pos in portfolio.positions:
        print(f"     - {pos.instrument.value}: {pos.coverage_pct:.0f}% @ {pos.price_or_rate:.4f}")
    
    print("\n✅ Currency Hedging Strategy Test PASSED\n")


def test_freight_strategy():
    """Test freight rate strategy"""
    print("=" * 70)
    print("TEST 4: Freight Rate Strategy")
    print("=" * 70)
    
    strategy = FreightRateStrategy.calculate_optimal_strategy(
        monthly_voyages=4,
        current_time_charter_rate=15000,
        spot_rate_range=(14000, 16000),
        crisis_mode=False
    )
    
    print(f"   Strategy: {strategy['strategy']}")
    print(f"   Time Charter Cost: ${strategy['time_charter']['monthly_cost_usd']:,.0f}")
    print(f"   Spot Market Cost: ${strategy['spot_market']['monthly_cost_usd']:,.0f}")
    print(f"   Total Monthly Cost: ${strategy['total_monthly_cost_usd']:,.0f}")
    print(f"   Flexibility Score: {strategy['flexibility_score']*100:.0f}%")
    
    print("\n✅ Freight Rate Strategy Test PASSED\n")


def test_comprehensive_strategy():
    """Test comprehensive multi-risk strategy"""
    print("=" * 70)
    print("TEST 5: Comprehensive Hedging Strategy")
    print("=" * 70)
    
    # Get market data
    market_service = get_market_data_service()
    market_data = market_service.get_market_summary()
    
    # Create comprehensive strategy
    strategy = create_comprehensive_hedge_strategy(
        fuel_consumption_tons_monthly=1000,
        revenue_foreign_currency_monthly=1_800_000,
        fx_pair="EUR",
        current_fx_rate=market_data["fx"]["spot_rate"],
        monthly_voyages=4,
        market_data=market_data,
        crisis_mode=False
    )
    
    print(f"   Regime: {strategy['regime']}")
    print(f"\n   Fuel Hedging:")
    print(f"     - Hedge Ratio: {strategy['fuel_hedging']['hedge_ratio']}")
    print(f"     - Cost: ${strategy['fuel_hedging']['total_cost_usd']:,.0f}")
    print(f"     - Protection: ${strategy['fuel_hedging']['expected_protection_usd']:,.0f}")
    
    print(f"\n   Currency Hedging:")
    print(f"     - Hedge Ratio: {strategy['currency_hedging']['hedge_ratio']}")
    print(f"     - Cost: ${strategy['currency_hedging']['total_cost_usd']:,.0f}")
    
    print(f"\n   Summary:")
    print(f"     - Total Cost: ${strategy['summary']['total_hedging_cost_usd']:,.0f}")
    print(f"     - Total Protection: ${strategy['summary']['total_expected_protection_usd']:,.0f}")
    print(f"     - ROI Ratio: {strategy['summary']['roi_ratio']:.1f}x")
    
    print("\n✅ Comprehensive Strategy Test PASSED\n")


def test_hedge_agent():
    """Test financial hedge agent"""
    print("=" * 70)
    print("TEST 6: Financial Hedge Agent")
    print("=" * 70)
    
    agent = get_hedge_agent()
    
    operation_params = {
        "fuel_consumption_monthly": 1000,
        "revenue_foreign_monthly": 1_800_000,
        "fx_pair": "EUR",
        "monthly_voyages": 4,
        "current_route": "Shanghai → Rotterdam"
    }
    
    # Test risk assessment
    print("\n1. Risk Assessment:")
    risk = agent.assess_risk(operation_params)
    print(f"   Market Regime: {risk['market_regime']}")
    print(f"   Urgency: {risk['urgency']}")
    print(f"   Total Exposure: ${risk['total_exposure_usd']:,.0f}")
    print(f"   Total VaR: ${risk['total_var_95_usd']:,.0f}")
    
    # Test strategy recommendation
    print("\n2. Strategy Recommendation:")
    strategy = agent.recommend_hedging_strategy(operation_params)
    print(f"   Fuel Hedge Ratio: {strategy['fuel_hedging']['hedge_ratio']}")
    print(f"   Currency Hedge Ratio: {strategy['currency_hedging']['hedge_ratio']}")
    print(f"   Total Hedging Cost: ${strategy['summary']['total_hedging_cost_usd']:,.0f}")
    
    # Test crisis activation
    print("\n3. Crisis Activation (Red Sea):")
    crisis_agent = get_hedge_agent(crisis_scenario='red_sea')
    crisis_plan = crisis_agent.activate_crisis_hedging(operation_params)
    print(f"   Alert Level: {crisis_plan['alert_level']}")
    print(f"   Immediate Actions: {len(crisis_plan['immediate_actions'])} actions")
    print(f"   First Action: {crisis_plan['immediate_actions'][0]['action']}")
    
    # Test report generation
    print("\n4. Executive Report:")
    report = agent.generate_agent_report(operation_params)
    print(f"   Report Length: {len(report)} characters")
    print(f"   First 200 chars: {report[:200]}...")
    
    print("\n✅ Financial Hedge Agent Test PASSED\n")


def run_all_tests():
    """Run all tests"""
    print("\n")
    print("╔" + "=" * 68 + "╗")
    print("║" + " " * 15 + "FINANCIAL HEDGING SYSTEM TESTS" + " " * 23 + "║")
    print("╚" + "=" * 68 + "╝")
    print("\n")
    
    try:
        test_market_data_service()
        test_fuel_hedging_strategy()
        test_currency_hedging_strategy()
        test_freight_strategy()
        test_comprehensive_strategy()
        test_hedge_agent()
        
        print("\n")
        print("╔" + "=" * 68 + "╗")
        print("║" + " " * 22 + "ALL TESTS PASSED! ✅" + " " * 25 + "║")
        print("╚" + "=" * 68 + "╝")
        print("\n")
        
        print("Next Steps:")
        print("1. Start the server: python start_server.py")
        print("2. Test API endpoints:")
        print("   - GET  http://localhost:8000/api/hedge/health")
        print("   - GET  http://localhost:8000/api/hedge/market-data")
        print("   - POST http://localhost:8000/api/hedge/assess-risk")
        print("   - POST http://localhost:8000/api/hedge/recommend")
        print("   - POST http://localhost:8000/api/hedge/crisis-activate")
        print("   - POST http://localhost:8000/api/hedge/report")
        print("\n")
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
