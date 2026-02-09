/**
 * ReasoningStep - 鍗曟鎺ㄧ悊鍙鍖栫粍浠? * 
 * 灞曠ずAgent鐨勫崟涓帹鐞嗘楠わ紝鍖呭惈锛? * - Agent鍥炬爣鍜岀姸鎬? * - 鎺ㄧ悊鍐呭锛堟墦瀛楁満鏁堟灉锛? * - 缃俊搴﹀拰鎵ц鏃堕暱
 * - 鍙睍寮€鐨凴AG鏉ユ簮
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  AlertTriangle, 
  TrendingUp, 
  Package, 
  Shield, 
  GitBranch,
  Clock,
  Zap,
  LucideIcon
} from 'lucide-react';
import { RAGSourceCard } from './RAGSourceCard';

// Agent閰嶇疆
const AGENT_CONFIG: Record<string, { icon: LucideIcon; color: string; name: string }> = {
  market_sentinel: { icon: AlertTriangle, color: '#c94444', name: 'Market Sentinel' },
  risk_hedger: { icon: TrendingUp, color: '#c9a227', name: 'Risk Hedger' },
};

// 鍔ㄤ綔绫诲瀷缈昏瘧
const ACTION_LABELS: Record<string, string> = {
  detect: 'DETECTING',
  analyze: 'ANALYZING',
  validate: 'VALIDATING',
  challenge: 'CHALLENGING',
  calculate: 'CALCULATING',
  search: 'SEARCHING',
  recommend: 'RECOMMENDING',
};

interface RAGSource {
  document_id: string;
  title: string;
  section?: string;
  content_snippet?: string;
  relevance_score: number;
  azure_service: string;
}

interface ReasoningStepProps {
  stepId: string;
  agentId: string;
  action: string;
  title: string;
  content: string;
  confidence: number;
  azureService: string;
  sources?: RAGSource[];
  durationMs?: number;
  isActive?: boolean;
  isComplete?: boolean;
  showTypewriter?: boolean;
}

export function ReasoningStep({
  stepId,
  agentId,
  action,
  title,
  content,
  confidence,
  azureService,
  sources = [],
  durationMs = 0,
  isActive = false,
  isComplete = false,
  showTypewriter = false,
}: ReasoningStepProps) {
  const [displayedContent, setDisplayedContent] = useState(showTypewriter ? '' : content);
  
  const agentConfig = AGENT_CONFIG[agentId] || AGENT_CONFIG.market_sentinel;
  const Icon = agentConfig.icon;
  
  // Typewriter effect
  useEffect(() => {
    if (!showTypewriter || !isActive) {
      if (!showTypewriter) setDisplayedContent(content);
      return;
    }
    
    let animationFrameId: number;
    let startTime: number | null = null;
    const charDelay = 30; // 30ms per character

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const charCount = Math.floor(elapsed / charDelay);

      if (charCount <= content.length) {
        setDisplayedContent(content.slice(0, charCount));
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setDisplayedContent(content);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [content, showTypewriter, isActive]);

  // Confidence color
  const getConfidenceColor = () => {
    if (confidence >= 0.9) return '#5a9a7a';
    if (confidence >= 0.8) return '#4a90e2';
    if (confidence >= 0.7) return '#c9a227';
    return '#c94444';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`relative bg-[#0f1621] border rounded-sm p-4 overflow-hidden ${
        isActive 
          ? 'border-[#4a90e2]/50 shadow-lg shadow-[#4a90e2]/10' 
          : isComplete 
            ? 'border-[#5a9a7a]/30' 
            : 'border-[#1a2332]'
      }`}
    >
      {/* Active indicator glow */}
      {isActive && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-[#4a90e2]/5 to-transparent pointer-events-none"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {/* Agent icon */}
          <div
            className="p-2 rounded-sm shrink-0"
            style={{
              backgroundColor: `${agentConfig.color}15`,
              border: `1px solid ${agentConfig.color}30`,
            }}
          >
            <Icon
              className="w-4 h-4"
              style={{ color: agentConfig.color }}
              strokeWidth={1.5}
            />
          </div>

          {/* Title and agent info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="font-medium text-white/90 text-sm truncate">
                {title}
              </h4>
              <span
                className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-sm shrink-0"
                style={{
                  color: agentConfig.color,
                  backgroundColor: `${agentConfig.color}20`,
                  border: `1px solid ${agentConfig.color}40`,
                }}
              >
                {ACTION_LABELS[action] || action.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-white/40">{agentConfig.name}</p>
          </div>
        </div>

        {/* Content */}
        <div className="text-xs text-white/70 leading-relaxed mb-3">
          {displayedContent}
          {showTypewriter && isActive && displayedContent.length < content.length && (
            <motion.span
              className="inline-block w-2 h-4 bg-[#4a90e2] ml-0.5"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}
        </div>

        {/* Metadata row */}
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-3">
            {/* Confidence */}
            <div className="flex items-center gap-1">
              <span className="text-white/30">Confidence:</span>
              <span
                className="font-mono"
                style={{ color: getConfidenceColor() }}
              >
                {(confidence * 100).toFixed(0)}%
              </span>
            </div>
            
            {/* Duration */}
            {durationMs > 0 && (
              <div className="flex items-center gap-1 text-white/30">
                <Clock className="w-3 h-3" />
                <span>{durationMs}ms</span>
              </div>
            )}
          </div>

          {/* Azure service badge */}
          <div className="flex items-center gap-1 text-white/30 bg-[#1a2332] px-2 py-1 rounded-sm">
            <Zap className="w-3 h-3 text-[#0078d4]" />
            <span className="text-[9px]">{azureService}</span>
          </div>
        </div>

        {/* RAG Sources */}
        {sources.length > 0 && (
          <RAGSourceCard sources={sources} />
        )}
      </div>

      {/* Progress indicator for active step */}
      {isActive && (
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 bg-[#4a90e2]"
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 3, ease: 'linear' }}
        />
      )}
    </motion.div>
  );
}
