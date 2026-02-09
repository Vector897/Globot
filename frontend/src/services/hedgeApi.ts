/**
 * Hedge API Service
 * Provides functions to interact with the Financial Hedging backend API
 */

const HEDGE_BASE_URL = 'http://localhost:8000/api/hedge';

// ========== Request Models ==========

export interface HedgeOperationParams {
  fuel_consumption_monthly: number;   // tons
  revenue_foreign_monthly: number;    // EUR
  fx_pair: string;
  monthly_voyages: number;
  current_route: string;
}

export interface CrisisActivationRequest {
  crisis_scenario: 'red_sea' | 'fuel_spike' | 'currency_crisis';
  operation_params: HedgeOperationParams;
}

// ========== Response Models ==========

export interface RiskBreakdown {
  fuel_risk?: Record<string, unknown>;
  currency_risk?: Record<string, unknown>;
  freight_risk?: Record<string, unknown>;
}

export interface RiskAssessment {
  market_regime: string;
  urgency: string;
  total_exposure_usd: number;
  total_var_95_usd: number;
  risk_breakdown: RiskBreakdown;
}

export interface HedgePosition {
  instrument: string;
  action: string;
  quantity?: string;
  strike?: string;
  expiry?: string;
  cost?: string;
}

export interface FuelHedging {
  hedge_ratio: string;
  positions: HedgePosition[];
}

export interface CurrencyHedging {
  hedge_ratio?: string;
  positions?: HedgePosition[];
  [key: string]: unknown;
}

export interface FreightStrategy {
  [key: string]: unknown;
}

export interface HedgeRecommendation {
  regime: string;
  fuel_hedging: FuelHedging;
  currency_hedging: CurrencyHedging;
  freight_strategy: FreightStrategy;
}

export interface CrisisActivationResponse {
  alert_level: string;
  immediate_actions: string[];
  hedging_strategy: Record<string, unknown>;
  monitoring_protocol: Record<string, unknown>;
}

export interface MarketDataResponse {
  market_regime: string;
  crisis_indicators: string[];
  fuel: Record<string, unknown>;
  fx: Record<string, unknown>;
  freight: Record<string, unknown>;
}

export interface HedgeHealthResponse {
  status: string;
  hedge_agent: string;
  market_data_service: string;
  current_regime: string;
  timestamp: string;
}

// ========== Default Operation Params ==========

export const DEFAULT_OPERATION_PARAMS: HedgeOperationParams = {
  fuel_consumption_monthly: 1000,
  revenue_foreign_monthly: 1_800_000,
  fx_pair: 'EUR',
  monthly_voyages: 4,
  current_route: 'Shanghai → Rotterdam',
};

// ========== API Functions ==========

/**
 * Assess financial risk exposure
 */
export async function assessRisk(
  params: HedgeOperationParams = DEFAULT_OPERATION_PARAMS
): Promise<RiskAssessment> {
  const response = await fetch(`${HEDGE_BASE_URL}/assess-risk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || 'Risk assessment failed');
  }

  return response.json();
}

/**
 * Get optimal hedging strategy recommendations
 */
export async function recommendStrategy(
  params: HedgeOperationParams = DEFAULT_OPERATION_PARAMS,
  crisisOverride: boolean = false
): Promise<HedgeRecommendation> {
  const url = new URL(`${HEDGE_BASE_URL}/recommend`);
  if (crisisOverride) {
    url.searchParams.set('crisis_override', 'true');
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || 'Strategy recommendation failed');
  }

  return response.json();
}

/**
 * Activate emergency crisis hedging protocol
 */
export async function activateCrisisHedging(
  request: CrisisActivationRequest
): Promise<CrisisActivationResponse> {
  const response = await fetch(`${HEDGE_BASE_URL}/crisis-activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || 'Crisis activation failed');
  }

  return response.json();
}

/**
 * Get current market data for all asset classes
 */
export async function getMarketData(
  crisisScenario?: string
): Promise<MarketDataResponse> {
  const url = new URL(`${HEDGE_BASE_URL}/market-data`);
  if (crisisScenario) {
    url.searchParams.set('crisis_scenario', crisisScenario);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || 'Market data retrieval failed');
  }

  return response.json();
}

/**
 * Check health status of hedging module
 */
export async function checkHedgeHealth(): Promise<HedgeHealthResponse> {
  const response = await fetch(`${HEDGE_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error(`Hedge health check failed: ${response.statusText}`);
  }

  return response.json();
}
