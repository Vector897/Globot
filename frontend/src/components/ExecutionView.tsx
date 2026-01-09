/**
 * ExecutionView - Execution Phase View Component
 *
 * Displays real-time decision execution progress:
 * - Execution steps list (pending -> executing -> complete animation)
 * - Final execution summary
 */

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Loader2,
  CheckCircle2,
  Circle,
  Rocket,
  Ship,
  Shield,
  MapPin,
  Fuel,
  Bell,
  Zap,
} from "lucide-react";

interface ExecutionStep {
  step_id: string;
  action: string;
  title: string;
  description: string;
  azure_service: string;
  duration_ms: number;
  status?: "pending" | "executing" | "complete";
}

interface ExecutionSummary {
  total_steps: number;
  total_duration_ms: number;
  actions_completed: string[];
  final_status: string;
  risk_score_before: number;
  risk_score_after: number;
  estimated_savings: string;
}

interface ExecutionViewProps {
  steps: ExecutionStep[];
  activeStepIndex: number;
  summary?: ExecutionSummary | null;
  phase: "pending" | "executing" | "complete";
}

const getActionIcon = (action: string) => {
  switch (action) {
    case "carrier_notification":
    case "customer_notification":
      return <Bell className="w-4 h-4" />;
    case "slot_confirmation":
      return <Ship className="w-4 h-4" />;
    case "insurance_update":
      return <Shield className="w-4 h-4" />;
    case "route_activation":
      return <MapPin className="w-4 h-4" />;
    case "fuel_hedging":
      return <Fuel className="w-4 h-4" />;
    default:
      return <Zap className="w-4 h-4" />;
  }
};

export function ExecutionView({
  steps,
  activeStepIndex,
  summary,
  phase,
}: ExecutionViewProps) {
  if (phase === "pending" && steps.length === 0) {
    return (
      <div className="text-center py-8">
        <Rocket className="w-8 h-8 text-white/20 mx-auto mb-2" />
        <p className="text-xs text-white/40">
          Waiting for user confirmation...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Execution Steps List */}
      <div className="space-y-2">
        {steps.map((step, index) => {
          const isActive = index === activeStepIndex;
          const isComplete = index < activeStepIndex;
          const isPending = index > activeStepIndex;

          return (
            <motion.div
              key={step.step_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                relative p-3 rounded-sm border transition-all
                ${isActive
                  ? "bg-[#4a90e2]/10 border-[#4a90e2]/50"
                  : isComplete
                    ? "bg-[#5a9a7a]/10 border-[#5a9a7a]/30"
                    : "bg-[#0f1621] border-[#1a2332]"
                }
              `}
            >
              <div className="flex items-start gap-3">
                {/* Status Icon */}
                <div className="mt-0.5">
                  {isComplete ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-5 h-5 rounded-full bg-[#5a9a7a] flex items-center justify-center"
                    >
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </motion.div>
                  ) : isActive ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 rounded-full bg-[#4a90e2] flex items-center justify-center"
                    >
                      <Loader2 className="w-3 h-3 text-white" />
                    </motion.div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-[#1a2332] flex items-center justify-center">
                      <Circle className="w-3 h-3 text-white/20" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`${isActive ? "text-[#4a90e2]" : isComplete ? "text-[#5a9a7a]" : "text-white/40"}`}>
                      {getActionIcon(step.action)}
                    </span>
                    <h4 className={`text-xs font-medium ${isActive ? "text-white" : isComplete ? "text-white/80" : "text-white/50"}`}>
                      {step.title}
                    </h4>
                  </div>
                  <p className={`text-[10px] ${isActive ? "text-white/60" : "text-white/40"}`}>
                    {step.description}
                  </p>
                  {isActive && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: step.duration_ms / 1000, ease: "linear" }}
                      className="h-0.5 bg-[#4a90e2] mt-2 rounded-full"
                    />
                  )}
                </div>

                {/* Duration / Azure Service */}
                <div className="text-right shrink-0">
                  <span className={`text-[10px] ${isComplete ? "text-[#5a9a7a]" : "text-white/30"}`}>
                    {isComplete ? `${(step.duration_ms / 1000).toFixed(1)}s` : isPending ? "Pending" : "..."}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Execution Summary */}
      <AnimatePresence>
        {phase === "complete" && summary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-gradient-to-br from-[#5a9a7a]/20 to-transparent border border-[#5a9a7a]/30 rounded-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-[#5a9a7a]" />
              <h3 className="text-sm font-semibold text-white/90">
                Execution Complete
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#0a0e1a] p-2 rounded-sm">
                <span className="text-white/40 block mb-1">Total Time</span>
                <span className="text-white/80">
                  {(summary.total_duration_ms / 1000).toFixed(1)}s
                </span>
              </div>
              <div className="bg-[#0a0e1a] p-2 rounded-sm">
                <span className="text-white/40 block mb-1">Steps Completed</span>
                <span className="text-white/80">{summary.total_steps}</span>
              </div>
              <div className="bg-[#0a0e1a] p-2 rounded-sm">
                <span className="text-white/40 block mb-1">Risk Score</span>
                <span className="text-[#5a9a7a] font-medium">
                  {summary.risk_score_before} → {summary.risk_score_after}
                </span>
              </div>
              <div className="bg-[#0a0e1a] p-2 rounded-sm">
                <span className="text-white/40 block mb-1">Savings</span>
                <span className="text-[#5a9a7a] font-medium">
                  {summary.estimated_savings}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-[#1a2332]">
              <p className="text-[10px] text-white/40 mb-2">Actions Completed:</p>
              <ul className="space-y-1">
                {summary.actions_completed.map((action, i) => (
                  <li key={i} className="text-[10px] text-white/60 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5 text-[#5a9a7a]" />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
