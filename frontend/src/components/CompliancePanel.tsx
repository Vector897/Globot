/**
 * CompliancePanel - Sidebar-optimized compliance analysis panel
 *
 * Provides full compliance workflow inside the DemoPage sidebar:
 *  - Clerk user provisioning
 *  - Port selector with search (reuses MAJOR_PORTS)
 *  - Saved route selection
 *  - Document count summary
 *  - Gap analysis via documentAPI.detectMissingDocuments()
 *  - GapAnalysisReport display
 *
 * Pre-populates with the DemoPage's current origin/destination ports.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import { motion, AnimatePresence } from "motion/react";
import {
  Shield,
  Search,
  Navigation,
  Anchor,
  FileText,
  ChevronRight,
  Plus,
  X,
  AlertCircle,
  RefreshCw,
  Upload,
  CheckCircle2,
} from "lucide-react";
import { documentAPI } from "../services/documentApi";
import type { VesselRoute, MissingDocsResponse, DocumentInfo } from "../services/documentApi";
import { GapAnalysisReport } from "./documents";
import { MAJOR_PORTS } from "../data/ports";
import type { GlobalPort } from "../utils/routeCalculator";

// ---------- helpers ----------

const COUNTRY_CODE_MAP: Record<string, string> = {
  China: "CN", Singapore: "SG", Netherlands: "NL", Germany: "DE",
  USA: "US", UK: "GB", Belgium: "BE", Spain: "ES", France: "FR",
  Italy: "IT", Japan: "JP", "South Korea": "KR", India: "IN",
  UAE: "AE", "Saudi Arabia": "SA", Malaysia: "MY", Thailand: "TH",
  Vietnam: "VN", Indonesia: "ID", Philippines: "PH", Taiwan: "TW",
  Australia: "AU", "New Zealand": "NZ", Brazil: "BR", Mexico: "MX",
  Canada: "CA", Argentina: "AR", Chile: "CL", Colombia: "CO",
  Peru: "PE", Panama: "PA", Egypt: "EG", Turkey: "TR",
  "South Africa": "ZA", Kenya: "KE", Morocco: "MA", Nigeria: "NG",
  Ghana: "GH", "Ivory Coast": "CI", Senegal: "SN", Tanzania: "TZ",
  Djibouti: "DJ", Oman: "OM", Kuwait: "KW", Israel: "IL",
  Greece: "GR", Poland: "PL", Sweden: "SE", Denmark: "DK",
  Finland: "FI", Norway: "NO", Estonia: "EE", Latvia: "LV",
  Russia: "RU", Ukraine: "UA", Romania: "RO", Ireland: "IE",
  Portugal: "PT", Bangladesh: "BD", Pakistan: "PK", "Sri Lanka": "LK",
  Malta: "MT", Jamaica: "JM", Bahamas: "BS", "Puerto Rico": "PR",
  Uruguay: "UY", Ecuador: "EC", Iran: "IR", Mauritius: "MU",
};

interface PortEntry {
  id: number;
  name: string;
  country: string;
  region: string;
  un_locode: string;
  latitude: number;
  longitude: number;
}

function buildPortEntries(): PortEntry[] {
  return MAJOR_PORTS.map((port, idx) => {
    const cc = COUNTRY_CODE_MAP[port.country] || port.country.substring(0, 2).toUpperCase();
    const pc = port.name.replace(/\s+/g, "").substring(0, 3).toUpperCase();
    return {
      id: idx + 1,
      name: port.name,
      country: port.country,
      region: port.region,
      un_locode: `${cc}${pc}`,
      latitude: port.coordinates[1],
      longitude: port.coordinates[0],
    };
  });
}

// ---------- component ----------

export interface CompliancePanelProps {
  originPort?: GlobalPort | null;
  destinationPort?: GlobalPort | null;
  activeMapRoute?: { name: string; distance: number; estimatedTime: number; riskLevel: string; waypointNames: string[]; description: string } | null;
}

export function CompliancePanel({ originPort, destinationPort, activeMapRoute }: CompliancePanelProps) {
  const { user } = useUser();

  // identity
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [vesselId, setVesselId] = useState<number | null>(null);

  // routes & docs
  const [vesselRoutes, setVesselRoutes] = useState<VesselRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<VesselRoute | null>(null);
  const [vesselDocuments, setVesselDocuments] = useState<DocumentInfo[]>([]);

  // port selector
  const [selectedRoutePorts, setSelectedRoutePorts] = useState<PortEntry[]>([]);
  const [portSearchQuery, setPortSearchQuery] = useState("");
  const [showPortDropdown, setShowPortDropdown] = useState(false);

  // route creation
  const [newRouteName, setNewRouteName] = useState("");
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);

  // analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [missingDocsResult, setMissingDocsResult] = useState<MissingDocsResponse | null>(null);

  // loading state
  const [isLoading, setIsLoading] = useState(false);

  // upload state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allPorts = useMemo(buildPortEntries, []);

  // ---- provision user ----
  useEffect(() => {
    if (!user) return;
    const provision = async () => {
      try {
        const res = await documentAPI.provisionUser({
          clerk_id: user.id,
          email: user.primaryEmailAddress?.emailAddress || "",
          name: user.fullName || undefined,
        });
        setCustomerId(res.customer_id);
        if (res.vessel_id) setVesselId(res.vessel_id);
      } catch {
        // fallback
        setCustomerId(1);
        setVesselId(1);
      }
    };
    provision();
  }, [user]);

  // ---- pre-populate ports from DemoPage origin/destination ----
  useEffect(() => {
    if (selectedRoutePorts.length > 0) return; // user already picked ports
    const initial: PortEntry[] = [];
    if (originPort) {
      const found = allPorts.find((p) => p.name === originPort.name);
      if (found) initial.push(found);
    }
    if (destinationPort) {
      const found = allPorts.find((p) => p.name === destinationPort.name);
      if (found && !initial.find((p) => p.un_locode === found.un_locode)) initial.push(found);
    }
    if (initial.length > 0) setSelectedRoutePorts(initial);
  }, [originPort, destinationPort]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- load compliance data once provisioned ----
  useEffect(() => {
    if (!customerId) return;
    const load = async () => {
      setIsLoading(true);
      try {
        if (vesselId) {
          const routes = await documentAPI.getVesselRoutes(vesselId);
          setVesselRoutes(routes);
          const active = routes.find((r) => r.is_active);
          if (active) setSelectedRoute(active);
          else if (routes.length > 0) setSelectedRoute(routes[0]);
        }
        const docs = await documentAPI.getCustomerDocuments(customerId);
        setVesselDocuments(docs);
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [customerId, vesselId]);

  // ---- handlers ----

  const handleCreateRoute = useCallback(async () => {
    if (!newRouteName.trim() || selectedRoutePorts.length === 0 || !vesselId) return;
    setIsCreatingRoute(true);
    setAnalysisError(null);
    try {
      const portCodes = selectedRoutePorts.map((p) => p.un_locode);
      const created = await documentAPI.createRoute(vesselId, {
        route_name: newRouteName,
        port_codes: portCodes,
        set_active: true,
      });
      setVesselRoutes((prev) => [created, ...prev]);
      setSelectedRoute(created);
      setNewRouteName("");
    } catch {
      setAnalysisError("Failed to create route.");
    } finally {
      setIsCreatingRoute(false);
    }
  }, [newRouteName, selectedRoutePorts, vesselId]);

  const handleRunAnalysis = useCallback(async () => {
    const hasRoute = selectedRoute && selectedRoute.port_codes?.length > 0;
    const hasPorts = selectedRoutePorts.length > 0;
    if (!customerId || (!hasRoute && !hasPorts)) {
      setAnalysisError("Select a route or add ports first.");
      return;
    }
    setIsAnalyzing(true);
    setAnalysisError(null);
    setMissingDocsResult(null);
    try {
      const portCodes = hasRoute ? selectedRoute!.port_codes : selectedRoutePorts.map((p) => p.un_locode);
      const result = await documentAPI.detectMissingDocuments({ port_codes: portCodes, customer_id: customerId });
      setMissingDocsResult(result);
    } catch (err: any) {
      setAnalysisError(err?.response?.data?.detail || err?.message || "Analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedRoute, selectedRoutePorts, customerId]);

  const refreshData = useCallback(async () => {
    if (!customerId) return;
    setIsLoading(true);
    try {
      const promises: Promise<any>[] = [documentAPI.getCustomerDocuments(customerId)];
      if (vesselId) promises.unshift(documentAPI.getVesselRoutes(vesselId));
      const results = await Promise.all(promises);
      if (vesselId) {
        setVesselRoutes(results[0]);
        setVesselDocuments(results[1]);
      } else {
        setVesselDocuments(results[0]);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [customerId, vesselId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
      setUploadDescription("");
      // setIsUploadModalOpen(true); // Modal should already be open if triggered from button
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadDescription("");
    }
  };

  const handleUploadConfirm = async () => {
    if (!uploadFile || !customerId || !vesselId) return;
    setIsUploading(true);
    setUploadProgress(0);
    setAnalysisError(null);

    // Progress simulation
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 300);

    try {
      await documentAPI.uploadDocument({
        customer_id: customerId,
        vessel_id: vesselId,
        document_type: "other",
        title: uploadDescription.trim() || uploadFile.name,
        file: uploadFile,
      });
      
      setUploadProgress(100);
      clearInterval(interval);
      
      // Short delay before closing
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      setIsUploadModalOpen(false);
      setUploadFile(null);
      setUploadDescription("");
      refreshData();
    } catch (err) {
      console.error("Upload failed", err);
      clearInterval(interval);
      setAnalysisError("Failed to upload document.");
      setIsUploading(false); // Stop uploading state on error so user can retry
      setUploadProgress(0);
    } finally {
      // setIsUploading(false); // Only set false on error or close
    }
  };

  // ---- derived ----

  const validCount = vesselDocuments.filter((d) => {
    if (!d.expiry_date) return true;
    return new Date(d.expiry_date) > new Date();
  }).length;

  const expiringCount = vesselDocuments.filter((d) => {
    if (!d.expiry_date) return false;
    const days = Math.ceil((new Date(d.expiry_date).getTime() - Date.now()) / 86_400_000);
    return days > 0 && days <= 30;
  }).length;

  const expiredCount = vesselDocuments.filter((d) => {
    if (!d.expiry_date) return false;
    return new Date(d.expiry_date) <= new Date();
  }).length;

  // filtered ports for dropdown
  const filteredPorts = useMemo(() => {
    const q = portSearchQuery.toLowerCase();
    return allPorts
      .filter((p) => {
        if (!q) return true;
        return p.name.toLowerCase().includes(q) || p.country.toLowerCase().includes(q) || p.un_locode.toLowerCase().includes(q);
      })
      .filter((p) => !selectedRoutePorts.find((sp) => sp.un_locode === p.un_locode))
      .slice(0, 12);
  }, [allPorts, portSearchQuery, selectedRoutePorts]);

  // ---- render ----

  return (
    <div className="space-y-3 text-xs">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Compliance</span>
        <div className="flex items-center gap-1">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileSelect}
          />
          <button 
            onClick={() => {
              setUploadFile(null);
              setUploadDescription("");
              setIsUploadModalOpen(true);
            }} 
            className="text-white/40 hover:text-white transition-colors p-1"
            title="Upload Document"
          >
            <Upload className="w-3 h-3" />
          </button>
          <button onClick={refreshData} disabled={isLoading} className="text-white/40 hover:text-white transition-colors p-1">
            <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ---- Active Route Context ---- */}
      {activeMapRoute && (
        <div className="p-2.5 rounded-lg border border-white/10 bg-white/[0.03]">
          <div className="flex items-center gap-2 mb-1.5">
            <Navigation className="w-3 h-3 text-blue-400" />
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Active Route</span>
          </div>
          <p className="text-xs text-white/80 font-medium mb-1">{activeMapRoute.name}</p>
          <div className="flex items-center gap-3 text-[10px] text-white/50">
            <span>{activeMapRoute.distance.toLocaleString()} nm</span>
            <span>~{activeMapRoute.estimatedTime}d</span>
            <span className={`uppercase font-bold ${activeMapRoute.riskLevel === 'high' ? 'text-red-400' : activeMapRoute.riskLevel === 'medium' ? 'text-amber-400' : 'text-emerald-400'}`}>
              {activeMapRoute.riskLevel}
            </span>
          </div>
          {activeMapRoute.waypointNames.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mt-1.5">
              {activeMapRoute.waypointNames.slice(0, 5).map((wp, idx) => (
                <React.Fragment key={wp + idx}>
                  <span className="text-[10px] text-white/60 font-mono">{wp}</span>
                  {idx < Math.min(activeMapRoute.waypointNames.length, 5) - 1 && <ChevronRight className="w-2.5 h-2.5 text-white/20" />}
                </React.Fragment>
              ))}
              {activeMapRoute.waypointNames.length > 5 && (
                <span className="text-[10px] text-white/30">+{activeMapRoute.waypointNames.length - 5} more</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---- Route Selection ---- */}
      {vesselRoutes.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Saved Routes</label>
          <select
            value={selectedRoute?.id || ""}
            onChange={(e) => {
              const route = vesselRoutes.find((r) => r.id === parseInt(e.target.value));
              setSelectedRoute(route || null);
            }}
            className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-blue-500/50 outline-none transition-all appearance-none"
          >
            <option value="">Select route...</option>
            {vesselRoutes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.route_name} {r.is_active ? "(Active)" : ""}
              </option>
            ))}
          </select>

          {selectedRoute && (
            <div className="flex flex-wrap items-center gap-1 mt-1">
              {selectedRoute.port_codes.map((pc, idx) => (
                <React.Fragment key={pc}>
                  <span className="bg-white/10 text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold">{pc}</span>
                  {idx < selectedRoute.port_codes.length - 1 && <ChevronRight className="w-3 h-3 text-white/20" />}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- Port Selector ---- */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase font-bold text-white/30 tracking-widest flex items-center gap-1">
            <Plus className="w-3 h-3 text-blue-400" />
            Ports
            <span className="text-blue-400/60">({allPorts.length})</span>
          </label>
          {selectedRoutePorts.length > 0 && (
            <button onClick={() => { setSelectedRoutePorts([]); setPortSearchQuery(""); }} className="text-white/30 hover:text-white text-[10px]">
              Clear
            </button>
          )}
        </div>

        <div className="relative">
          <input
            type="text"
            value={portSearchQuery}
            onChange={(e) => { setPortSearchQuery(e.target.value); setShowPortDropdown(true); }}
            onFocus={() => setShowPortDropdown(true)}
            onBlur={() => setTimeout(() => setShowPortDropdown(false), 200)}
            placeholder="Search ports..."
            className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-blue-500/50 outline-none transition-all placeholder:text-white/20"
          />
          {showPortDropdown && filteredPorts.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-[#0f172a] border border-white/10 rounded-lg shadow-2xl max-h-48 overflow-y-auto">
              {filteredPorts.map((port) => (
                <button
                  key={port.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setSelectedRoutePorts((prev) => [...prev, port]); setPortSearchQuery(""); setShowPortDropdown(false); }}
                  className="w-full px-3 py-2 text-left hover:bg-blue-500/10 border-b border-white/5 last:border-0 transition-colors flex items-center justify-between"
                >
                  <span className="font-medium text-xs">{port.name} <span className="text-white/40">({port.un_locode})</span></span>
                  <span className="text-white/20 text-[10px]">{port.country}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected port chips */}
        {selectedRoutePorts.length > 0 && (
          <div className="space-y-1">
            {selectedRoutePorts.map((port, idx) => (
              <div key={port.un_locode} className="flex items-center justify-between bg-white/5 rounded-lg px-2 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-white/30 text-[10px] font-bold w-3 text-right">{idx + 1}</span>
                  <span className="font-medium text-xs">{port.name}</span>
                  <span className="text-white/30 text-[10px] font-mono">{port.un_locode}</span>
                </div>
                <button onClick={() => setSelectedRoutePorts((prev) => prev.filter((p) => p.un_locode !== port.un_locode))} className="text-red-400/60 hover:text-red-400 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- Save as Route ---- */}
      {vesselId && selectedRoutePorts.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-white/5">
          <input
            type="text"
            value={newRouteName}
            onChange={(e) => setNewRouteName(e.target.value)}
            placeholder="Route name (optional, to save)"
            className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-blue-500/50 outline-none transition-all placeholder:text-white/20"
          />
          {newRouteName.trim() && (
            <button
              onClick={handleCreateRoute}
              disabled={isCreatingRoute}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 text-white rounded-lg font-bold text-xs transition-all"
            >
              {isCreatingRoute ? "Saving..." : "Save Route"}
            </button>
          )}
        </div>
      )}

      {/* ---- Document Summary ---- */}
      {vesselDocuments.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-white/5">
          <DocStatBadge label="Valid" count={validCount} color="emerald" />
          <DocStatBadge label="Expiring" count={expiringCount} color="amber" />
          <DocStatBadge label="Expired" count={expiredCount} color="red" />
        </div>
      )}

      {/* ---- Run Analysis Button ---- */}
      <div className="pt-1">
        {analysisError && (
          <div className="mb-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-[10px] flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            {analysisError}
          </div>
        )}
        <button
          onClick={handleRunAnalysis}
          disabled={(!selectedRoute && selectedRoutePorts.length === 0) || isAnalyzing}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-white/10 disabled:text-white/30 text-white rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2"
        >
          {isAnalyzing ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Search className="w-3.5 h-3.5" />
              Run Compliance Analysis
            </>
          )}
        </button>
      </div>

      {/* ---- Analysis Results ---- */}
      {missingDocsResult && (
        <div className="pt-2 border-t border-white/5">
          <GapAnalysisReport
            overallStatus={missingDocsResult.overall_status}
            complianceScore={missingDocsResult.compliance_score}
            validDocuments={missingDocsResult.valid_documents}
            expiringDocuments={missingDocsResult.expiring_soon_documents}
            expiredDocuments={missingDocsResult.expired_documents}
            missingDocuments={missingDocsResult.missing_documents}
            vesselMissingDocuments={missingDocsResult.vessel_missing_documents}
            cargoMissingDocuments={missingDocsResult.cargo_missing_documents}
            vesselValidDocuments={missingDocsResult.vessel_valid_documents}
            cargoValidDocuments={missingDocsResult.cargo_valid_documents}
            recommendations={missingDocsResult.recommendations}
            dark
          />
        </div>
      )}

      {/* ---- Upload Modal ---- */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#0a0e1a]/95 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#0f172a] border border-white/10 rounded-[2rem] w-full max-w-lg p-8 relative shadow-2xl overflow-hidden"
            >
              {/* Decorative Elements */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-500" />
              
              <button 
                onClick={() => setIsUploadModalOpen(false)} 
                disabled={isUploading}
                className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-white">Upload Document</h2>
                <p className="text-white/40 text-xs">Upload vessel certificates or shipping docs for compliance analysis</p>
              </div>

              {!isUploading ? (
                <div className="space-y-6">
                  {!uploadFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-blue-500/40 hover:bg-blue-500/5 transition-all cursor-pointer group"
                    >
                      <Plus className="w-8 h-8 text-white/20 group-hover:text-blue-500 mx-auto mb-3 transition-all group-hover:scale-110" />
                      <p className="font-bold text-sm mb-1 text-white/80">Drag and Drop Files Here</p>
                      <p className="text-xs text-white/30">Supports PDF, PNG, JPG (Max 50MB)</p>
                      <div className="mt-6 flex justify-center gap-2">
                        <FileIcon /> <FileIcon /> <FileIcon />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 bg-white/5 px-4 py-3 rounded-xl border border-white/5">
                        <FileText className="w-5 h-5 text-blue-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{uploadFile.name}</p>
                          <p className="text-[10px] text-white/40">{(uploadFile.size / 1024).toFixed(0)} KB</p>
                        </div>
                        <button 
                          onClick={() => { setUploadFile(null); setUploadDescription(""); }}
                          className="text-white/20 hover:text-white transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-white/60 uppercase tracking-wide">
                          Description (Optional)
                        </label>
                        <textarea
                          value={uploadDescription}
                          onChange={(e) => setUploadDescription(e.target.value)}
                          className="w-full bg-[#0a0e1a] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-blue-500/50 outline-none h-24 resize-none placeholder:text-white/20 transition-all"
                          placeholder="e.g. Bill of Lading for voyage 123..."
                          autoFocus
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={handleUploadConfirm}
                          className="w-full py-3 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                        >
                          Upload Document
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {analysisError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {analysisError}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 px-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-blue-400 font-bold uppercase tracking-widest text-[10px] animate-pulse">Processing Document...</span>
                    <span className="text-white/60 font-mono text-xs">{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 mb-8">
                    <motion.div 
                      animate={{ width: `${uploadProgress}%` }}
                      className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                    />
                  </div>
                  <div className="space-y-3">
                    <ParsingStep label="Uploading to secure storage" active={uploadProgress > 0 && uploadProgress < 40} completed={uploadProgress >= 40} />
                    <ParsingStep label="OCR Text Extraction" active={uploadProgress >= 40 && uploadProgress < 70} completed={uploadProgress >= 70} />
                    <ParsingStep label="Compliance Check" active={uploadProgress >= 70 && uploadProgress < 100} completed={uploadProgress === 100} />
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---- tiny sub-components ----

function FileIcon() {
  return <div className="w-6 h-6 bg-white/5 border border-white/10 rounded flex items-center justify-center text-white/20"><FileText className="w-3 h-3" /></div>;
}

function ParsingStep({ label, active, completed }: { label: string; active: boolean; completed: boolean }) {
  return (
    <div className="flex items-center gap-3 py-0.5">
       {completed ? (
         <CheckCircle2 className="w-4 h-4 text-emerald-500" />
       ) : active ? (
         <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
       ) : (
         <div className="w-4 h-4 border-2 border-white/10 rounded-full" />
       )}
       <span className={`text-xs font-medium ${completed ? 'text-white/90' : active ? 'text-white' : 'text-white/20'}`}>{label}</span>
    </div>
  );
}

// ---- tiny sub-components ----

function DocStatBadge({ label, count, color }: { label: string; count: number; color: string }) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <div className={`p-2 rounded-lg border text-center ${colors[color] || colors.emerald}`}>
      <div className="text-sm font-black">{count}</div>
      <div className="text-[9px] uppercase font-bold tracking-wider opacity-70">{label}</div>
    </div>
  );
}

export default CompliancePanel;


