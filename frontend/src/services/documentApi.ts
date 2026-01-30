import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Types
export interface Vessel {
  id: number;
  name: string;
  imo_number: string;
  vessel_type: string;
  flag_state: string;
  gross_tonnage: number;
  document_count: number;
}

export interface DocumentInfo {
  id: string;
  title: string;
  document_type: string;
  file_name: string | null;
  file_size: number | null;
  ocr_confidence: number | null;
  issuing_authority: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  document_number: string | null;
  is_validated: boolean;
  created_at: string;
}

export interface DocumentSummary {
  document_type: string;
  title?: string | null;
  expiry_date: string | null;
  status: 'valid' | 'expired' | 'expiring_soon';
  days_until_expiry: number | null;
  category: 'vessel' | 'cargo';
}

export interface MissingDocument {
  document_type: string;
  required_by: string[];
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  category: 'vessel' | 'cargo';
}

export interface Port {
  id: number;
  name: string;
  un_locode: string;
  country: string;
  region: string;
  latitude?: number;
  longitude?: number;
  psc_regime?: string;
  is_eca?: boolean;
}

export interface Recommendation {
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  action: string;
  documents: string[];
  deadline: string | null;
}

export interface DocumentAnalysisResponse {
  success: boolean;
  overall_status: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | 'ERROR' | 'PENDING_REVIEW';
  compliance_score: number;
  documents_analyzed: number;
  valid_documents: DocumentSummary[];
  expiring_soon_documents: DocumentSummary[];
  expired_documents: DocumentSummary[];
  missing_documents: MissingDocument[];
  recommendations: Recommendation[];
  agent_reasoning: string | null;
  vessel_info: {
    name: string;
    imo_number: string;
    vessel_type: string;
    flag_state: string;
    gross_tonnage: number;
  };
  route_ports: string[];
}

export interface UploadDocumentParams {
  customer_id: number;
  vessel_id: number;
  document_type: string;
  title: string;
  file: File;
  issue_date?: string;
  expiry_date?: string;
  document_number?: string;
  issuing_authority?: string;
}

export interface AnalyzeDocumentsParams {
  vessel_id: number;
  port_codes: string[];
  document_ids?: string[];
}

// Route types
export interface VesselRoute {
  id: number;
  vessel_id: number;
  route_name: string;
  port_codes: string[];
  origin_port: string | null;
  destination_port: string | null;
  departure_date: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CreateRouteParams {
  route_name: string;
  port_codes: string[];
  departure_date?: string;
  set_active?: boolean;
}

export interface DetectMissingParams {
  vessel_id?: number;
  route_id?: number;
  port_codes?: string[];
  customer_id?: number;
}

export interface MissingDocsResponse {
  success: boolean;
  overall_status: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | 'ERROR' | 'PENDING_REVIEW';
  compliance_score: number;
  vessel_info: {
    name: string;
    imo_number: string;
    vessel_type: string;
    flag_state: string;
    gross_tonnage: number;
  };
  route_ports: string[];
  route_name: string;
  // All documents
  missing_documents: MissingDocument[];
  expired_documents: DocumentSummary[];
  expiring_soon_documents: DocumentSummary[];
  valid_documents: DocumentSummary[];
  // Categorized documents (vessel = ship owner/operator, cargo = cargo-related)
  vessel_missing_documents: MissingDocument[];
  cargo_missing_documents: MissingDocument[];
  vessel_valid_documents: DocumentSummary[];
  cargo_valid_documents: DocumentSummary[];
  recommendations: Recommendation[];
  agent_reasoning: string | null;
  total_documents_on_file: number;
}

// Provisioning types
export interface ProvisionParams {
  clerk_id: string;
  email: string;
  name?: string;
}

export interface ProvisionResponse {
  customer_id: number;
  vessel_id: number | null;
  vessel_name: string | null;
  is_new: boolean;
}

// Document API service
export const documentAPI = {
  // Auto-provision customer (and discover default vessel) for a Clerk user
  provisionUser: async (params: ProvisionParams): Promise<ProvisionResponse> => {
    const response = await api.post('/v2/maritime/me/provision', params);
    return response.data;
  },

  // Upload a document with OCR processing
  uploadDocument: async (params: UploadDocumentParams): Promise<DocumentInfo> => {
    const formData = new FormData();
    formData.append('customer_id', params.customer_id.toString() || "fake_customer_id");
    formData.append('vessel_id', params.vessel_id.toString() || "1");
    formData.append('document_type', params.document_type || "fake_document_type");
    formData.append('title', params.title || "fake_title");
    formData.append('file', params.file || "fake_file");

    if (params.issue_date) {
      formData.append('issue_date', params.issue_date);
    }
    if (params.expiry_date) {
      formData.append('expiry_date', params.expiry_date);
    }
    if (params.document_number) {
      formData.append('document_number', params.document_number);
    }
    if (params.issuing_authority) {
      formData.append('issuing_authority', params.issuing_authority);
    }

    const response = await api.post('/v2/maritime/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Run CrewAI document analysis
  analyzeDocuments: async (params: AnalyzeDocumentsParams): Promise<DocumentAnalysisResponse> => {
    const response = await api.post('/v2/maritime/documents/analyze', params);
    return response.data;
  },

  // Get all documents for a vessel
  getVesselDocuments: async (vesselId: number, documentType?: string): Promise<DocumentInfo[]> => {
    const params = documentType ? { document_type: documentType } : {};
    const response = await api.get(`/v2/maritime/documents/vessel/${vesselId}`, { params });
    return response.data;
  },

  // Get all documents for a customer (user)
  getCustomerDocuments: async (customerId: number, documentType?: string): Promise<DocumentInfo[]> => {
    const params = documentType ? { document_type: documentType } : {};
    const response = await api.get(`/v2/maritime/documents/customer/${customerId}`, { params });
    return response.data;
  },

  // Get single document with full details
  getDocument: async (documentId: string): Promise<DocumentInfo & { extracted_text: string; extracted_fields: Record<string, any> }> => {
    const response = await api.get(`/v2/maritime/documents/${documentId}`);
    return response.data;
  },

  // Delete a document
  deleteDocument: async (documentId: string): Promise<{ status: string; document_id: string }> => {
    const response = await api.delete(`/v2/maritime/documents/${documentId}`);
    return response.data;
  },

  // Get all vessels for a customer
  getVessels: async (customerId: number): Promise<Vessel[]> => {
    const response = await api.get('/v2/maritime/vessels', { params: { customer_id: customerId } });
    return response.data;
  },

  // Get vessel details
  getVessel: async (vesselId: number): Promise<Vessel> => {
    const response = await api.get(`/v2/maritime/vessels/${vesselId}`);
    return response.data;
  },

  // Get all available ports
  getPorts: async (region?: string, limit?: number): Promise<Port[]> => {
    const params: Record<string, any> = {};
    if (region) params.region = region;
    if (limit) params.limit = limit;
    const response = await api.get('/v2/maritime/ports', { params });
    return response.data;
  },

  // Get port requirements
  getPortRequirements: async (portCode: string, vesselType?: string): Promise<{
    port_code: string;
    required_documents: Array<{
      document_type: string;
      regulation_source: string;
      description: string;
      port_code: string;
    }>;
    regulations: Array<{
      content: string;
      source: string;
      metadata: Record<string, any>;
    }>;
  }> => {
    const params = vesselType ? { vessel_type: vesselType } : {};
    const response = await api.get(`/v2/maritime/kb/port/${portCode}/requirements`, { params });
    return response.data;
  },

  // Get document types
  getDocumentTypes: async (): Promise<{
    document_types: Array<{
      code: string;
      name: string;
      description: string;
    }>;
  }> => {
    const response = await api.get('/v2/maritime/kb/document-types');
    return response.data;
  },

  // ========== Route Management ==========

  // Get all routes for a vessel
  getVesselRoutes: async (vesselId: number): Promise<VesselRoute[]> => {
    const response = await api.get(`/v2/maritime/vessels/${vesselId}/routes`);
    return response.data;
  },

  // Get active route for a vessel
  getActiveRoute: async (vesselId: number): Promise<VesselRoute | null> => {
    try {
      const response = await api.get(`/v2/maritime/vessels/${vesselId}/routes/active`);
      return response.data;
    } catch {
      return null;
    }
  },

  // Create a new route for a vessel
  createRoute: async (vesselId: number, params: CreateRouteParams): Promise<VesselRoute> => {
    const response = await api.post(`/v2/maritime/vessels/${vesselId}/routes`, params);
    return response.data;
  },

  // Activate a route
  activateRoute: async (vesselId: number, routeId: number): Promise<VesselRoute> => {
    const response = await api.put(`/v2/maritime/vessels/${vesselId}/routes/${routeId}/activate`);
    return response.data;
  },

  // Delete a route
  deleteRoute: async (vesselId: number, routeId: number): Promise<{ status: string; route_id: number }> => {
    const response = await api.delete(`/v2/maritime/vessels/${vesselId}/routes/${routeId}`);
    return response.data;
  },

  // ========== Missing Documents Detection ==========

  // Detect missing documents for a vessel's route
  detectMissingDocuments: async (params: DetectMissingParams): Promise<MissingDocsResponse> => {
    const response = await api.post('/v2/maritime/documents/detect-missing', params);
    return response.data;
  },

  // ========== Health & Utility ==========

  // Health check
  healthCheck: async (): Promise<{
    status: string;
    knowledge_base: {
      collections: string[];
      embeddings_configured: boolean;
    };
    crewai_compliance_available: boolean;
    crewai_document_analysis_available: boolean;
    crewai_missing_docs_available: boolean;
    timestamp: string;
  }> => {
    const response = await api.get('/v2/maritime/health');
    return response.data;
  }
};

export default documentAPI;
