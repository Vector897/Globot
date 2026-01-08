import { motion } from 'motion/react';
import { Shield, CheckCircle2, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import React from 'react';

export function AzureIntegration() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      className="bg-[#0f1621] border border-[#1a2332] rounded-sm overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#0078d4]/20 border border-[#0078d4]/30 rounded-sm">
            <Shield className="w-4 h-4 text-[#0078d4]" strokeWidth={1.5} />
          </div>
          <span className="text-sm font-medium text-white/80 tracking-wide">
            Powered by Microsoft Azure
          </span>
        </div>
        
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-white/40" strokeWidth={1.5} />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/40" strokeWidth={1.5} />
        )}
      </button>

      {/* Status indicators - Always visible */}
      <div className="px-4 pb-3 space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#5a9a7a]" strokeWidth={2} />
          <span className="text-xs text-white/60">All systems secure</span>
        </div>
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-[#5a9a7a]" strokeWidth={2} />
          <span className="text-xs text-white/60">Compliance validated</span>
        </div>
      </div>

      {/* Expanded details */}
      <motion.div
        initial={false}
        animate={{
          height: isExpanded ? 'auto' : 0,
          opacity: isExpanded ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <div className="px-4 pb-4 pt-2 border-t border-white/5 space-y-3">
          {/* Services */}
          <div>
            <div className="text-[10px] font-medium text-white/40 uppercase tracking-wider mb-2">
              Active Services
            </div>
            <div className="space-y-1.5">
              {[
                'Azure OpenAI Service',
                'Azure Cognitive Search',
                'Azure Monitor',
                'Azure Key Vault',
              ].map((service, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-[#0078d4]" />
                  <span className="text-xs text-white/50">{service}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Compliance */}
          <div>
            <div className="text-[10px] font-medium text-white/40 uppercase tracking-wider mb-2">
              Compliance
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['SOC 2', 'ISO 27001', 'GDPR', 'HIPAA'].map((cert, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 bg-[#5a9a7a]/10 text-[#5a9a7a] border border-[#5a9a7a]/30 rounded-sm font-mono"
                >
                  {cert}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
