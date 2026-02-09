/**
 * Visual Risk API Service
 * Provides functions to interact with the Visual Risk Analysis backend API (Gemini Vision)
 */

const VISUAL_RISK_BASE_URL = 'http://localhost:8000/api/v2/visual-risk';

// ========== Response Models ==========

export interface VisualRiskAnalysis {
  risk_type: string;
  severity: number;
  confidence: number;
  description: string;
  affected_routes?: string[];
  affected_ports?: string[];
  raw_insights?: string[];
  gemini_model?: string;
  analysis_type?: string;
  source_type?: string;
}

export interface DemoAnalysisResponse {
  success: boolean;
  scenario: string;
  analysis: VisualRiskAnalysis;
  demo_mode: boolean;
}

export interface ImageAnalysisResponse {
  success: boolean;
  filename: string;
  analysis: VisualRiskAnalysis;
  fallback?: boolean;
  error?: string;
}

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  severity: string;
  image_type: string;
}

export interface ScenariosResponse {
  scenarios: DemoScenario[];
}

export interface ServiceStatusResponse {
  status: string;
  service: string;
  model: string;
  api_configured: boolean;
  static_maps_reachable: boolean;
  capabilities: string[];
}

// ========== API Functions ==========

/**
 * Get demo visual risk analysis result for a given scenario
 */
export async function getDemoAnalysis(
  scenario: string = 'suez_blockage'
): Promise<DemoAnalysisResponse> {
  const url = new URL(`${VISUAL_RISK_BASE_URL}/demo`);
  url.searchParams.set('scenario', scenario);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || 'Demo analysis failed');
  }

  return response.json();
}

/**
 * List available demo scenarios
 */
export async function listScenarios(): Promise<ScenariosResponse> {
  const response = await fetch(`${VISUAL_RISK_BASE_URL}/scenarios`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || 'Failed to list scenarios');
  }

  return response.json();
}

/**
 * Get Visual Risk service status
 */
export async function getServiceStatus(): Promise<ServiceStatusResponse> {
  const response = await fetch(`${VISUAL_RISK_BASE_URL}/status`);

  if (!response.ok) {
    throw new Error(`Visual Risk status check failed: ${response.statusText}`);
  }

  return response.json();
}
