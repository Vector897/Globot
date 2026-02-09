"""
Portfolio Optimizer Script

Optimizes hedging portfolio allocation across multiple instruments
to minimize cost while achieving target protection level.

Uses simplified portfolio optimization approach.
"""

from typing import List, Dict, Tuple
import json


class HedgeInstrument:
    """Represents a hedging instrument"""
    def __init__(self, name: str, cost_per_unit: float, protection_per_unit: float, max_capacity: float):
        self.name = name
        self.cost_per_unit = cost_per_unit
        self.protection_per_unit = protection_per_unit
        self.max_capacity = max_capacity


def optimize_hedge_portfolio(
    exposure: float,
    target_hedge_ratio: float,
    instruments: List[HedgeInstrument],
    budget_constraint: float = None
) -> Dict:
    """
    Optimize hedge portfolio allocation.
    
    This uses a greedy approach: prioritize instruments with best cost/protection ratio.
    For production, use proper optimization (scipy.optimize or cvxpy).
    
    Args:
        exposure: Total exposure to hedge
        target_hedge_ratio: Target hedge ratio (e.g., 0.70 for 70%)
        instruments: List of available hedging instruments
        budget_constraint: Optional maximum budget
        
    Returns:
        Optimized portfolio allocation
    """
    target_protection = exposure * target_hedge_ratio
    
    # Calculate cost-effectiveness ratio for each instrument
    instrument_scores = []
    for inst in instruments:
        if inst.protection_per_unit > 0:
            ratio = inst.cost_per_unit / inst.protection_per_unit
            instrument_scores.append((inst, ratio))
    
    # Sort by cost-effectiveness (lower ratio = better)
    instrument_scores.sort(key=lambda x: x[1])
    
    # Allocate greedily
    allocations = []
    total_cost = 0
    total_protection = 0
    remaining_target = target_protection
    
    for inst, _ in instrument_scores:
        if remaining_target <= 0:
            break
        
        # Determine allocation for this instrument
        desired_units = min(
            remaining_target / inst.protection_per_unit,
            inst.max_capacity
        )
        
        # Check budget constraint
        if budget_constraint:
            max_affordable = (budget_constraint - total_cost) / inst.cost_per_unit
            desired_units = min(desired_units, max_affordable)
        
        if desired_units > 0:
            allocation_cost = desired_units * inst.cost_per_unit
            allocation_protection = desired_units * inst.protection_per_unit
            
            allocations.append({
                'instrument': inst.name,
                'units': desired_units,
                'cost': allocation_cost,
                'protection': allocation_protection,
                'percentage_of_target': (allocation_protection / target_protection) * 100
            })
            
            total_cost += allocation_cost
            total_protection += allocation_protection
            remaining_target -= allocation_protection
    
    achieved_ratio = total_protection / exposure if exposure > 0 else 0
    
    return {
        'target_hedge_ratio': target_hedge_ratio * 100,
        'achieved_hedge_ratio': achieved_ratio * 100,
        'total_cost': total_cost,
        'total_protection': total_protection,
        'cost_per_protection': total_cost / total_protection if total_protection > 0 else 0,
        'allocations': allocations,
        'optimization_efficiency': (achieved_ratio / target_hedge_ratio) * 100 if target_hedge_ratio > 0 else 0
    }


def create_fuel_hedging_portfolio(
    exposure_tons: float,
    current_price: float,
    target_ratio: float = 0.70,
    budget: float = None
) -> Dict:
    """
    Create optimized fuel hedging portfolio.
    
    Example instruments:
    - Futures: Low cost, high liquidity
    - Swaps: Medium cost, long-term stability
    - Options: Higher cost, downside protection only
    """
    exposure_usd = exposure_tons * current_price
    
    instruments = [
        HedgeInstrument(
            name="Futures (3-month rolling)",
            cost_per_unit=current_price * 0.02,  # 2% margin requirement
            protection_per_unit=current_price * 1.0,  # Full protection
            max_capacity=exposure_tons * 0.50  # Max 50% in futures
        ),
        HedgeInstrument(
            name="Swaps (6-month)",
            cost_per_unit=2.0,  # $2/ton fee
            protection_per_unit=current_price * 1.0,  # Full protection
            max_capacity=exposure_tons * 0.30  # Max 30% in swaps
        ),
        HedgeInstrument(
            name="Put Options (protective)",
            cost_per_unit=current_price * 0.05,  # 5% premium
            protection_per_unit=current_price * 0.90,  # 90% protection (strike at 90%)
            max_capacity=exposure_tons * 0.25  # Max 25% in options
        ),
        HedgeInstrument(
            name="Collar Options (zero-cost)",
            cost_per_unit=current_price * 0.01,  # Net 1% after selling call
            protection_per_unit=current_price * 0.85,  # 85% protection
            max_capacity=exposure_tons * 0.20  # Max 20% in collars
        )
    ]
    
    portfolio = optimize_hedge_portfolio(
        exposure=exposure_usd,
        target_hedge_ratio=target_ratio,
        instruments=instruments,
        budget_constraint=budget
    )
    
    return portfolio


def create_currency_hedging_portfolio(
    exposure_foreign_currency: float,
    fx_rate: float,
    target_ratio: float = 0.70
) -> Dict:
    """Create optimized currency hedging portfolio"""
    exposure_usd = exposure_foreign_currency * fx_rate
    
    instruments = [
        HedgeInstrument(
            name="1-month Forward",
            cost_per_unit=0,  # Zero-cost
            protection_per_unit=fx_rate * 1.0,
            max_capacity=exposure_foreign_currency * 0.30
        ),
        HedgeInstrument(
            name="3-month Forward",
            cost_per_unit=0,
            protection_per_unit=fx_rate * 0.995,  # Slightly less favorable rate
            max_capacity=exposure_foreign_currency * 0.30
        ),
        HedgeInstrument(
            name="6-month Forward",
            cost_per_unit=0,
            protection_per_unit=fx_rate * 0.99,
            max_capacity=exposure_foreign_currency * 0.20
        ),
        HedgeInstrument(
            name="FX Options (protective put)",
            cost_per_unit=fx_rate * 0.02,  # 2% premium
            protection_per_unit=fx_rate * 0.95,
            max_capacity=exposure_foreign_currency * 0.20
        )
    ]
    
    portfolio = optimize_hedge_portfolio(
        exposure=exposure_usd,
        target_hedge_ratio=target_ratio,
        instruments=instruments
    )
    
    return portfolio


def print_portfolio_summary(portfolio: Dict, title: str):
    """Print formatted portfolio summary"""
    print("\n" + "=" * 70)
    print(f"{title}")
    print("=" * 70)
    
    print(f"\nTarget Hedge Ratio: {portfolio['target_hedge_ratio']:.1f}%")
    print(f"Achieved Hedge Ratio: {portfolio['achieved_hedge_ratio']:.1f}%")
    print(f"Optimization Efficiency: {portfolio['optimization_efficiency']:.1f}%")
    print(f"\nTotal Cost: ${portfolio['total_cost']:,.0f}")
    print(f"Total Protection: ${portfolio['total_protection']:,.0f}")
    print(f"Cost per $ Protected: ${portfolio['cost_per_protection']:.4f}")
    
    print(f"\nAllocations:")
    for alloc in portfolio['allocations']:
        print(f"\n  {alloc['instrument']}:")
        print(f"    Units: {alloc['units']:,.2f}")
        print(f"    Cost: ${alloc['cost']:,.0f}")
        print(f"    Protection: ${alloc['protection']:,.0f}")
        print(f"    % of Target: {alloc['percentage_of_target']:.1f}%")
    
    print("\n" + "=" * 70)


if __name__ == '__main__':
    # Example: Optimize fuel hedging portfolio
    print("\nFUEL HEDGING PORTFOLIO OPTIMIZATION")
    
    fuel_portfolio = create_fuel_hedging_portfolio(
        exposure_tons=6000,  # 6-month exposure
        current_price=650,
        target_ratio=0.70,
        budget=100000  # $100k budget
    )
    
    print_portfolio_summary(fuel_portfolio, "FUEL HEDGING PORTFOLIO")
    
    # Example: Optimize currency hedging
    print("\n\nCURRENCY HEDGING PORTFOLIO OPTIMIZATION")
    
    currency_portfolio = create_currency_hedging_portfolio(
        exposure_foreign_currency=10_000_000,  # 10M EUR
        fx_rate=1.10,
        target_ratio=0.70
    )
    
    print_portfolio_summary(currency_portfolio, "CURRENCY HEDGING PORTFOLIO")
    
    # Export to JSON
    output = {
        'fuel_portfolio': fuel_portfolio,
        'currency_portfolio': currency_portfolio
    }
    
    with open('optimized_portfolios.json', 'w') as f:
        json.dump(output, f, indent=2)
    
    print("\n\n✅ Portfolios exported to optimized_portfolios.json")
