import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

export type AgentStatus = 'thinking' | 'completed' | 'alert' | 'idle';

interface AIAgentCardProps {
  icon: LucideIcon;
  name: string;
  role: string;
  status: AgentStatus;
  lastAction: string;
  isAdversarial?: boolean;
}

export function AIAgentCard({
  icon: Icon,
  name,
  role,
  status,
  lastAction,
  isAdversarial = false,
}: AIAgentCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'thinking':
        return '#4a90e2';
      case 'completed':
        return '#5a9a7a';
      case 'alert':
        return '#c94444';
      default:
        return '#3a4a5a';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'thinking':
        return 'PROCESSING';
      case 'completed':
        return 'COMPLETED';
      case 'alert':
        return 'ALERT';
      default:
        return 'IDLE';
    }
  };

  const getProgress = () => {
    switch (status) {
      case 'completed':
        return 100;
      case 'thinking':
        return 65;
      case 'alert':
        return 40;
      default:
        return 0;
    }
  };

  return (
    <motion.div
      className={`relative bg-[#0f1621] border ${
        isAdversarial ? 'border-purple-500/30' : 'border-[#1a2332]'
      } rounded-sm p-4 overflow-hidden`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Subtle glow for adversarial agent */}
      {isAdversarial && (
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent pointer-events-none" />
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="p-2 rounded-sm"
            style={{
              backgroundColor: `${getStatusColor()}15`,
              border: `1px solid ${getStatusColor()}30`,
            }}
          >
            <Icon
              className="w-5 h-5"
              style={{ color: getStatusColor() }}
              strokeWidth={1.5}
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-medium text-white/90 text-sm tracking-wide">
                {name}
              </h3>
              <span
                className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-sm"
                style={{
                  color: getStatusColor(),
                  backgroundColor: `${getStatusColor()}20`,
                  border: `1px solid ${getStatusColor()}40`,
                }}
              >
                {getStatusText()}
              </span>
            </div>
            <p className="text-xs text-white/40">{role}</p>
          </div>
        </div>

        {/* Status bar */}
        <div className="mb-3 h-1 bg-[#1a2332] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: getStatusColor() }}
            initial={{ width: 0 }}
            animate={{ width: `${getProgress()}%` }}
            transition={{
              duration: status === 'thinking' ? 2 : 1,
              ease: status === 'thinking' ? 'easeInOut' : 'easeOut',
            }}
          />
        </div>

        {/* Last action */}
        <div className="text-xs text-white/60 leading-relaxed">
          {isAdversarial ? (
            <div className="space-y-1">
              <div className="flex items-start gap-2">
                <span className="text-purple-400/80 font-medium shrink-0">Challenge:</span>
                <span className="text-white/50">{lastAction}</span>
              </div>
              {status === 'completed' && (
                <div className="flex items-start gap-2">
                  <span className="text-green-400/80 font-medium shrink-0">Resolution:</span>
                  <span className="text-white/50">Validated alternative route feasibility</span>
                </div>
              )}
            </div>
          ) : (
            lastAction
          )}
        </div>

        {/* Thinking animation */}
        {status === 'thinking' && (
          <div className="flex gap-1 mt-3">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1 h-1 rounded-full"
                style={{ backgroundColor: getStatusColor() }}
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
