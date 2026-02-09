/**
 * VisualRiskPanel - Visual Risk Analysis Display Component
 * 
 * Displays Gemini Vision analysis results for supply chain risks.
 * Shows satellite imagery analysis, detected risks, and recommendations.
 * 
 * Demonstrates Gemini 2.0 Flash multimodal capabilities for the hackathon.
 */

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Satellite,
  AlertTriangle,
  Ship,
  Anchor,
  TrendingUp,
  Eye,
  Cpu,
  MapPin,
  Route,
  Zap,
} from "lucide-react";

interface VisualRiskAnalysis {
  risk_type: string;
  severity: number;
  confidence: number;
  description: string;
  affected_routes?: string[];
  affected_ports?: string[];
  raw_insights?: string[];
  gemini_model?: string;
  analysis_type?: string;
}

interface VisualRiskPanelProps {
  isAnalyzing?: boolean;
  analysisSource?: string;
  analysisLocation?: string;
  analysis?: VisualRiskAnalysis | null;
  selectedRoute?: { name: string; distance: number; estimatedTime: number; riskLevel: string; waypointNames: string[]; description: string } | null;
  onRunAnalysis?: (scenario?: string) => void;
}

// Severity color mapping
const getSeverityColor = (severity: number) => {
  if (severity >= 0.8) return { bg: "#c75050", text: "#ff6b6b", label: "CRITICAL" };
  if (severity >= 0.6) return { bg: "#f5a623", text: "#ffc107", label: "HIGH" };
  if (severity >= 0.4) return { bg: "#4a90e2", text: "#64b5f6", label: "MEDIUM" };
  return { bg: "#5a9a7a", text: "#81c784", label: "LOW" };
};

// Risk type icon mapping
const getRiskIcon = (riskType: string) => {
  switch (riskType) {
    case "canal_blockage":
      return <Ship className="w-5 h-5" />;
    case "port_congestion":
      return <Anchor className="w-5 h-5" />;
    default:
      return <AlertTriangle className="w-5 h-5" />;
  }
};

export function VisualRiskPanel({
  isAnalyzing = false,
  analysisSource = "",
  analysisLocation = "",
  analysis = null,
  selectedRoute = null,
  onRunAnalysis,
}: VisualRiskPanelProps) {
  const severityInfo = analysis ? getSeverityColor(analysis.severity) : null;

  return (
    <div className="bg-[#0a0e1a] border border-[#1a2332] rounded-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#1a2332] to-transparent border-b border-[#1a2332]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Eye className="w-4 h-4 text-[#9b59b6]" />
              {isAnalyzing && (
                <motion.div
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#9b59b6]"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </div>
            <h2 className="text-xs font-semibold text-white/70 tracking-wider uppercase">
              Visual Risk Analysis
            </h2>
            <span className="flex items-center gap-1 text-[10px] text-[#9b59b6] bg-[#9b59b6]/10 px-2 py-0.5 rounded-sm">
              <Cpu className="w-3 h-3" />
              Gemini Vision
            </span>
          </div>
          
          {analysis && severityInfo && (
            <span
              className="text-[10px] font-bold px-2 py-1 rounded-sm"
              style={{
                backgroundColor: `${severityInfo.bg}20`,
                color: severityInfo.text,
              }}
            >
              {severityInfo.label}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          {/* Analyzing State */}
          {isAnalyzing && !analysis && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Source Info */}
              <div className="flex items-center gap-3 p-3 bg-[#9b59b6]/10 border border-[#9b59b6]/30 rounded-sm">
                <Satellite className="w-5 h-5 text-[#9b59b6]" />
                <div>
                  <p className="text-xs text-white/80">{analysisSource}</p>
                  <p className="text-[10px] text-white/50 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {analysisLocation}
                  </p>
                </div>
              </div>

              {/* Scanning Animation */}
              <div className="relative h-32 bg-[#0f1621] rounded-sm overflow-hidden">
                {/* Scan line animation */}
                <motion.div
                  className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#9b59b6] to-transparent"
                  animate={{ top: ["0%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
                
                {/* Grid overlay */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(155, 89, 182, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(155, 89, 182, 0.3) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                />

                {/* Center text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Satellite className="w-8 h-8 text-[#9b59b6] mx-auto mb-2" />
                    </motion.div>
                    <p className="text-xs text-white/60">Analyzing satellite imagery...</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Analysis Result */}
          {analysis && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Risk Header */}
              <div
                className="flex items-start gap-3 p-3 rounded-sm"
                style={{
                  backgroundColor: severityInfo ? `${severityInfo.bg}10` : "#1a2332",
                  borderLeft: `3px solid ${severityInfo?.bg || "#4a90e2"}`,
                }}
              >
                <div style={{ color: severityInfo?.text || "#fff" }}>
                  {getRiskIcon(analysis.risk_type)}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white/90 mb-1">
                    {analysis.risk_type.replace(/_/g, " ").toUpperCase()}
                  </h3>
                  <p className="text-xs text-white/70 leading-relaxed">
                    {analysis.description}
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#0f1621] p-2 rounded-sm">
                  <span className="text-[10px] text-white/40 block mb-1">Severity</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[#1a2332] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: severityInfo?.bg }}
                        initial={{ width: 0 }}
                        animate={{ width: `${analysis.severity * 100}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                    <span className="text-xs text-white/80">
                      {(analysis.severity * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="bg-[#0f1621] p-2 rounded-sm">
                  <span className="text-[10px] text-white/40 block mb-1">Confidence</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[#1a2332] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-[#5a9a7a] rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${analysis.confidence * 100}%` }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                      />
                    </div>
                    <span className="text-xs text-white/80">
                      {(analysis.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Affected Routes */}
              {analysis.affected_routes && analysis.affected_routes.length > 0 && (
                <div className="bg-[#0f1621] p-3 rounded-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Route className="w-3.5 h-3.5 text-[#c75050]" />
                    <span className="text-[10px] text-white/50 uppercase tracking-wider">
                      Affected Routes
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.affected_routes.map((route, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="text-[10px] bg-[#c75050]/20 text-[#ff6b6b] px-2 py-0.5 rounded-sm"
                      >
                        {route}
                      </motion.span>
                    ))}
                  </div>
                </div>
              )}

              {/* Affected Ports */}
              {analysis.affected_ports && analysis.affected_ports.length > 0 && (
                <div className="bg-[#0f1621] p-3 rounded-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Anchor className="w-3.5 h-3.5 text-[#f5a623]" />
                    <span className="text-[10px] text-white/50 uppercase tracking-wider">
                      Affected Ports
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.affected_ports.map((port, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 + 0.3 }}
                        className="text-[10px] bg-[#f5a623]/20 text-[#ffc107] px-2 py-0.5 rounded-sm"
                      >
                        {port}
                      </motion.span>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw Insights */}
              {analysis.raw_insights && analysis.raw_insights.length > 0 && (
                <div className="bg-[#0f1621] p-3 rounded-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-3.5 h-3.5 text-[#9b59b6]" />
                    <span className="text-[10px] text-white/50 uppercase tracking-wider">
                      Key Insights
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {analysis.raw_insights.map((insight, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.15 + 0.5 }}
                        className="text-[11px] text-white/70 flex items-start gap-2"
                      >
                        <span className="text-[#9b59b6] mt-0.5">•</span>
                        {insight}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Model Badge */}
              {analysis.gemini_model && (
                <div className="flex items-center justify-center gap-2 pt-2 border-t border-[#1a2332]">
                  <Cpu className="w-3 h-3 text-white/30" />
                  <span className="text-[10px] text-white/40">
                    Analyzed by {analysis.gemini_model} • {analysis.analysis_type?.replace(/_/g, " ")}
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {/* Idle State */}
          {!isAnalyzing && !analysis && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {selectedRoute && (
                <div className="p-2.5 rounded-sm border border-[#1a2332] bg-[#0f1621]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: selectedRoute.riskLevel === 'high' ? '#c94444' : selectedRoute.riskLevel === 'medium' ? '#e8a547' : '#5a9a7a' }} />
                    <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">Monitoring Route</span>
                  </div>
                  <p className="text-xs text-white/80 font-medium">{selectedRoute.name}</p>
                  <p className="text-[10px] text-white/50 mt-0.5">{selectedRoute.distance.toLocaleString()} nm · ~{selectedRoute.estimatedTime}d</p>
                </div>
              )}
              <div className="text-center py-6">
                <Satellite className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-xs text-white/40 mb-1">Visual Risk Analysis</p>
                <p className="text-[10px] text-white/30 mb-4">
                  Waiting for satellite imagery feed...
                </p>
                {onRunAnalysis && (
                  <div className="flex flex-col gap-2 items-center">
                    <button
                      onClick={() => onRunAnalysis('suez_blockage')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#9b59b6]/20 border border-[#9b59b6]/40 rounded-sm text-[11px] font-medium text-[#9b59b6] hover:bg-[#9b59b6]/30 transition-all"
                    >
                      <Eye className="w-3 h-3" />
                      Analyze Suez Canal
                    </button>
                    <button
                      onClick={() => onRunAnalysis('port_congestion')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#9b59b6]/20 border border-[#9b59b6]/40 rounded-sm text-[11px] font-medium text-[#9b59b6] hover:bg-[#9b59b6]/30 transition-all"
                    >
                      <Anchor className="w-3 h-3" />
                      Analyze Port Congestion
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
