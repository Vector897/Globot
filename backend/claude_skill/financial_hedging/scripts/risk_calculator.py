#!/usr/bin/env python3
"""
Risk Calculator Script

Calculates various risk metrics for financial hedging decisions:
- Value at Risk (VaR)
- Hedge ratios
- Expected protection value
- Cost-benefit analysis

Usage:
    python risk_calculator.py --exposure 5000000 --volatility 0.20 --confidence 0.95
"""

import argparse
import math
from typing import Dict


def calculate_var(
    exposure: float,
    volatility: float,
    confidence: float = 0.95,
    horizon_days: int = 180
) -> Dict:
    """
    Calculate Value at Risk using parametric method.
    
    Args:
        exposure: Total exposure in USD
        volatility: Annualized volatility (e.g., 0.20 for 20%)
        confidence: Confidence level (0.95 = 95%, 0.99 = 99%)
        horizon_days: Time horizon in days
        
    Returns:
        Dict with VaR calculation results
    """
    # Scale volatility to horizon
    horizon_volatility = volatility * math.sqrt(horizon_days / 252)
    
    # Z-score for confidence level
    z_scores = {0.90: 1.282, 0.95: 1.645, 0.99: 2.326}
    z_score = z_scores.get(confidence, 1.645)
    
    # VaR calculation
    var = exposure * z_score * horizon_volatility
    var_pct = (var / exposure) * 100
    
    return {
        'exposure': exposure,
        'volatility_annual': volatility * 100,
        'horizon_days': horizon_days,
        'confidence_level': confidence * 100,
        'var_usd': var,
        'var_pct': var_pct,
        'interpretation': _interpret_var(var_pct)
    }


def calculate_optimal_hedge_ratio(
    correlation: float,
    spot_volatility: float,
    futures_volatility: float
) -> Dict:
    """
    Calculate optimal hedge ratio using minimum variance approach.
    
    h* = ρ * (σ_spot / σ_futures)
    
    Where:
    - h* = optimal hedge ratio
    - ρ = correlation between spot and futures
    - σ = volatility
    """
    optimal_ratio = correlation * (spot_volatility / futures_volatility)
    
    # Variance reduction
    variance_reduction = correlation ** 2
    
    return {
        'optimal_hedge_ratio': optimal_ratio,
        'recommended_pct': min(optimal_ratio * 100, 85.0),  # Cap at 85%
        'variance_reduction_pct': variance_reduction * 100,
        'hedge_effectiveness': 'High' if correlation > 0.85 else 'Medium' if correlation > 0.70 else 'Low'
    }


def calculate_hedge_cost_benefit(
    exposure: float,
    hedge_cost: float,
    volatility: float,
    hedge_ratio: float = 0.70
) -> Dict:
    """
    Analyze cost-benefit of hedging strategy.
    """
    # Expected protection (1 standard deviation move)
    expected_loss_unhedged = exposure * volatility
    expected_protection = expected_loss_unhedged * hedge_ratio
    
    # ROI
    roi = expected_protection / hedge_cost if hedge_cost > 0 else float('inf')
    
    # Break-even
    breakeven_move_pct = (hedge_cost / exposure) * 100
    
    return {
        'hedge_cost_usd': hedge_cost,
        'hedge_cost_pct': (hedge_cost / exposure) * 100,
        'expected_protection_usd': expected_protection,
        'roi_ratio': roi,
        'breakeven_move_pct': breakeven_move_pct,
        'recommendation': 'Hedge' if roi > 5 else 'Consider' if roi > 2 else 'Not Recommended'
    }


def calculate_portfolio_risk(
    fuel_exposure: float,
    currency_exposure: float,
    freight_exposure: float,
    fuel_vol: float,
    currency_vol: float,
    freight_vol: float,
    correlations: Dict[str, float] = None
) -> Dict:
    """
    Calculate portfolio risk considering correlations.
    
    Portfolio variance = w1²σ1² + w2²σ2² + w3²σ3² + 2w1w2ρ12σ1σ2 + ...
    """
    if correlations is None:
        correlations = {
            'fuel_currency': 0.0,
            'fuel_freight': 0.3,
            'currency_freight': 0.0
        }
    
    total_exposure = fuel_exposure + currency_exposure + freight_exposure
    
    # Weights
    w_fuel = fuel_exposure / total_exposure
    w_currency = currency_exposure / total_exposure
    w_freight = freight_exposure / total_exposure
    
    # Individual variances
    var_fuel = (w_fuel * fuel_vol) ** 2
    var_currency = (w_currency * currency_vol) ** 2
    var_freight = (w_freight * freight_vol) ** 2
    
    # Covariances
    cov_fuel_currency = 2 * w_fuel * w_currency * correlations['fuel_currency'] * fuel_vol * currency_vol
    cov_fuel_freight = 2 * w_fuel * w_freight * correlations['fuel_freight'] * fuel_vol * freight_vol
    cov_currency_freight = 2 * w_currency * w_freight * correlations['currency_freight'] * currency_vol * freight_vol
    
    # Portfolio variance and volatility
    portfolio_variance = var_fuel + var_currency + var_freight + cov_fuel_currency + cov_fuel_freight + cov_currency_freight
    portfolio_volatility = math.sqrt(portfolio_variance)
    
    # Diversification benefit
    simple_sum_volatility = w_fuel * fuel_vol + w_currency * currency_vol + w_freight * freight_vol
    diversification_benefit = simple_sum_volatility - portfolio_volatility
    
    return {
        'total_exposure_usd': total_exposure,
        'portfolio_volatility': portfolio_volatility * 100,
        'individual_risks': {
            'fuel': {'exposure': fuel_exposure, 'contribution': (var_fuel / portfolio_variance) * 100},
            'currency': {'exposure': currency_exposure, 'contribution': (var_currency / portfolio_variance) * 100},
            'freight': {'exposure': freight_exposure, 'contribution': (var_freight / portfolio_variance) * 100}
        },
        'diversification_benefit_pct': diversification_benefit * 100,
        'correlations': correlations
    }


def _interpret_var(var_pct: float) -> str:
    """Interpret VaR magnitude"""
    if var_pct > 20:
        return "Critical risk - immediate hedging required"
    elif var_pct > 15:
        return "High risk - hedging strongly recommended"
    elif var_pct > 10:
        return "Moderate risk - consider hedging"
    else:
        return "Low risk - selective hedging"


def main():
    parser = argparse.ArgumentParser(description='Calculate financial risk metrics')
    parser.add_argument('--exposure', type=float, required=True, help='Total exposure in USD')
    parser.add_argument('--volatility', type=float, required=True, help='Annualized volatility (e.g., 0.20 for 20%%)')
    parser.add_argument('--confidence', type=float, default=0.95, help='Confidence level (default: 0.95)')
    parser.add_argument('--horizon', type=int, default=180, help='Horizon in days (default: 180)')
    parser.add_argument('--hedge-cost', type=float, help='Hedging cost for cost-benefit analysis')
    
    args = parser.parse_args()
    
    print("=" * 70)
    print("RISK CALCULATOR RESULTS")
    print("=" * 70)
    
    # Calculate VaR
    var_result = calculate_var(
        exposure=args.exposure,
        volatility=args.volatility,
        confidence=args.confidence,
        horizon_days=args.horizon
    )
    
    print(f"\nValue at Risk ({var_result['confidence_level']:.0f}% confidence):")
    print(f"  Exposure: ${var_result['exposure']:,.0f}")
    print(f"  Volatility: {var_result['volatility_annual']:.1f}%")
    print(f"  Horizon: {var_result['horizon_days']} days")
    print(f"  VaR: ${var_result['var_usd']:,.0f} ({var_result['var_pct']:.1f}%)")
    print(f"  Interpretation: {var_result['interpretation']}")
    
    # Cost-benefit if hedge cost provided
    if args.hedge_cost:
        cb_result = calculate_hedge_cost_benefit(
            exposure=args.exposure,
            hedge_cost=args.hedge_cost,
            volatility=args.volatility
        )
        
        print(f"\nCost-Benefit Analysis:")
        print(f"  Hedge Cost: ${cb_result['hedge_cost_usd']:,.0f} ({cb_result['hedge_cost_pct']:.2f}%)")
        print(f"  Expected Protection: ${cb_result['expected_protection_usd']:,.0f}")
        print(f"  ROI Ratio: {cb_result['roi_ratio']:.1f}x")
        print(f"  Break-even Move: {cb_result['breakeven_move_pct']:.2f}%")
        print(f"  Recommendation: {cb_result['recommendation']}")
    
    print("\n" + "=" * 70)


if __name__ == '__main__':
    main()
