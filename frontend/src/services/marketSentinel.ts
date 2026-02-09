/**
 * Market Sentinel API Service
 * Provides functions to interact with the Market Sentinel geopolitical risk detection API
 */

const MARKET_SENTINEL_BASE_URL = 'http://localhost:8000/api/v2/market-sentinel';

// Response types
export interface AffectedLane {
  origin: string;
  destination: string;
  risk: string;
}

export interface Entity {
  name: string;
  type: string;
}

export interface Citation {
  title: string;
  url: string;
}

export interface SignalPacket {
  signal_id: string;
  timestamp_utc: string;
  summary: string;
  affected_lanes: AffectedLane[];
  entities: Entity[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  expected_horizon_days: number;
  recommended_next_flows: string[];
  citations: Citation[];
  confidence: number;
}

export interface MarketSentinelResponse {
  thread_id: string;
  signal_packet: SignalPacket;
  raw_text: string;
  request_echo: object;
}

export interface HealthCheckResponse {
  status: string;
  message: string;
}

export interface AgentStatusResponse {
  agents: Array<{
    name: string;
    status: string;
    last_run?: string;
  }>;
}

// Request types
export interface Lane {
  origin: string;
  destination: string;
  commodities?: string[];
}

export interface WatchlistEntity {
  name: string;
  type?: string;
}

export interface Sensitivity {
  min_severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  min_confidence?: number;
}

export interface MarketSentinelRequest {
  watchlist: {
    lanes: Lane[];
    entities: string[];
  };
  time_window_hours: number;
  sensitivity: Sensitivity;
  // Optional fields
  active_shipments_subset?: string[] | null;
  returns_symbols?: string[];
  returns_days?: number;
}

/**
 * Check if the Market Sentinel API is healthy
 */
export async function checkHealth(): Promise<HealthCheckResponse> {
  const response = await fetch(`${MARKET_SENTINEL_BASE_URL}/health`);
  
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Default request for simple analysis - monitors major shipping lanes
 */
const DEFAULT_REQUEST: MarketSentinelRequest = {
  watchlist: {
    lanes: [
      { origin: 'CNSHA', destination: 'USLAX', commodities: ['electronics', 'semiconductors'] },
      { origin: 'CNNGB', destination: 'DEHAM', commodities: ['machinery', 'auto parts'] },
    ],
    entities: ['Port of Shanghai', 'Port of Los Angeles', 'COSCO', 'Maersk'],
  },
  time_window_hours: 24,
  sensitivity: {
    min_severity: 'MEDIUM',
    min_confidence: 0.6,
  },
};

/**
 * Run Market Sentinel analysis with default parameters
 */
export async function runSimpleAnalysis(): Promise<MarketSentinelResponse> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/05d36e09-cd94-4f96-af55-b3946c76739f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H6',location:'frontend/src/services/marketSentinel.ts:runSimpleAnalysis',message:'runSimpleAnalysis invoked with DEFAULT_REQUEST',data:{defaultLanes:DEFAULT_REQUEST.watchlist.lanes,defaultEntities:DEFAULT_REQUEST.watchlist.entities},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return runAnalysis(DEFAULT_REQUEST);
}

/**
 * Run Market Sentinel analysis with custom parameters
 */
export async function runAnalysis(params: MarketSentinelRequest): Promise<MarketSentinelResponse> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/05d36e09-cd94-4f96-af55-b3946c76739f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H7',location:'frontend/src/services/marketSentinel.ts:runAnalysis',message:'runAnalysis called',data:{lanes:params.watchlist?.lanes ?? [],entities:params.watchlist?.entities ?? [],time_window_hours:params.time_window_hours,sensitivity:params.sensitivity},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  const response = await fetch(`${MARKET_SENTINEL_BASE_URL}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || 'Market Sentinel analysis failed');
  }

  const parsed = await response.json();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/05d36e09-cd94-4f96-af55-b3946c76739f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H8',location:'frontend/src/services/marketSentinel.ts:runAnalysis',message:'runAnalysis response parsed',data:{summary:parsed?.signal_packet?.summary ?? null,severity:parsed?.signal_packet?.severity ?? null,affectedLanes:parsed?.signal_packet?.affected_lanes ?? []},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  return parsed;
}

/**
 * @deprecated Use runAnalysis instead
 */
export const runFullAnalysis = runAnalysis;

/**
 * Get the status of all Market Sentinel agents
 */
export async function getAgentsStatus(): Promise<AgentStatusResponse> {
  const response = await fetch(`${MARKET_SENTINEL_BASE_URL}/agents/status`);
  
  if (!response.ok) {
    throw new Error(`Failed to get agents status: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Helper to create a watchlist for specific origin-destination lanes
 */
export function createLaneWatchlist(
  origin: string,
  destination: string,
  commodities: string[] = ['general cargo'],
  entities: string[] = []
): MarketSentinelRequest {
  // Get default entities for common ports
  const portEntities: Record<string, string> = {
    'CNSHA': 'Port of Shanghai',
    'CNNGB': 'Port of Ningbo',
    'CNSZX': 'Port of Shenzhen',
    'HKHKG': 'Port of Hong Kong',
    'SGSIN': 'Port of Singapore',
    'USLAX': 'Port of Los Angeles',
    'USLGB': 'Port of Long Beach',
    'USNYC': 'Port of New York',
    'NLRTM': 'Port of Rotterdam',
    'DEHAM': 'Port of Hamburg',
    'BEANR': 'Port of Antwerp',
    'GBFXT': 'Port of Felixstowe',
    'AEJEA': 'Port of Jebel Ali',
    'KRPUS': 'Port of Busan',
    'JPTYO': 'Port of Tokyo',
    'INBOM': 'Port of Mumbai',
  };

  const defaultEntities = [
    portEntities[origin],
    portEntities[destination],
    'COSCO',
    'Maersk',
  ].filter(Boolean) as string[];

  return {
    watchlist: {
      lanes: [{ origin, destination, commodities }],
      entities: entities.length > 0 ? entities : defaultEntities,
    },
    time_window_hours: 24,
    sensitivity: {
      min_severity: 'MEDIUM',
      min_confidence: 0.6,
    },
  };
}

/**
 * Get severity color for UI display
 */
export function getSeverityColor(severity: SignalPacket['severity']): string {
  switch (severity) {
    case 'CRITICAL':
      return '#dc2626'; // red-600
    case 'HIGH':
      return '#ea580c'; // orange-600
    case 'MEDIUM':
      return '#ca8a04'; // yellow-600
    case 'LOW':
      return '#16a34a'; // green-600
    default:
      return '#6b7280'; // gray-500
  }
}

/**
 * Get severity label for UI display
 */
export function getSeverityLabel(severity: SignalPacket['severity']): string {
  return severity;
}

