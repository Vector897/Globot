/**
 * AgentCoTPanel - Agent Chain-of-Thought Main Panel
 *
 * Integrated display:
 * - Real-time reasoning step stream (typewriter effect)
 * - Adversarial debate view
 * - Final decision card
 * - Execution progress view (NEW)
 *
 * Used to demonstrate transparent and traceable AI decision-making to Imagine Cup judges
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Brain,
  ListTree,
  Swords,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Activity,
  Rocket,
  Check,
  FileText,
  UserCog,
} from "lucide-react";
import { ReasoningStep } from "./ReasoningStep";
import { DebateView } from "./DebateView";
import { ExecutionView } from "./ExecutionView";
import "../styles/reasoning.css";

// Type Definitions
interface RAGSource {
  document_id: string;
  title: string;
  section?: string;
  content_snippet?: string;
  relevance_score: number;
  azure_service: string;
}

interface CoTStep {
  step_id: string;
  agent_id: string;
  action: string;
  title: string;
  content: string;
  confidence: number;
  azure_service: string;
  sources?: RAGSource[];
  duration_ms?: number;
}

interface DebateExchange {
  exchange_id: string;
  challenger_agent: string;
  defender_agent: string;
  challenge: string;
  challenge_reason: string;
  response?: string;
  resolution?: string;
  resolution_accepted?: boolean;
  sources?: RAGSource[];
}

interface FinalDecision {
  decision_id: string;
  final_recommendation: string;
  recommendation_details?: {
    route_change?: string;
    additional_days?: number;
    additional_cost?: string;
    risk_reduction?: string;
    savings?: string;
  };
  total_duration_ms?: number;
  approval_options?: Array<{
    id: string;
    label: string;
    action: string;
  }>;
}

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

interface AgentCoTPanelProps {
  steps: CoTStep[];
  debates: DebateExchange[];
  decision?: FinalDecision | null;
  activeStepIndex?: number;
  activeDebateIndex?: number;
  debatePhase?: "challenge" | "response" | "resolve" | "complete";
  isActive?: boolean;
  // NEW: Execution props
  executionSteps?: ExecutionStep[];
  activeExecutionIndex?: number;
  executionPhase?: "pending" | "executing" | "complete";
  executionSummary?: ExecutionSummary | null;
  awaitingConfirmation?: boolean;
  onConfirmDecision?: (action: string) => void;
}

type TabType = "stream" | "debate" | "decision" | "execution";

export function AgentCoTPanel({
  steps = [],
  debates = [],
  decision = null,
  activeStepIndex = -1,
  activeDebateIndex = 0,
  debatePhase = "challenge",
  isActive = false,
  // NEW
  executionSteps = [],
  activeExecutionIndex = -1,
  executionPhase = "pending",
  executionSummary = null,
  awaitingConfirmation = false,
  onConfirmDecision,
}: AgentCoTPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("stream");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto switch to debate tab
  useEffect(() => {
    if (debates.length > 0 && activeStepIndex >= steps.length - 1) {
      setActiveTab("debate");
    }
  }, [debates.length, activeStepIndex, steps.length]);

  // Auto switch to decision tab
  useEffect(() => {
    if (decision && executionSteps.length === 0) {
      setActiveTab("decision");
    }
  }, [decision, executionSteps.length]);

  // Auto switch to execution tab
  useEffect(() => {
    if (executionSteps.length > 0 || executionPhase !== "pending") {
      setActiveTab("execution");
    }
  }, [executionSteps.length, executionPhase]);

  // Auto scroll to latest step
  useEffect(() => {
    if (scrollContainerRef.current && activeStepIndex >= 0) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  }, [activeStepIndex, steps.length]);

  const tabs: {
    id: TabType;
    label: string;
    icon: React.ReactNode;
    count?: number;
  }[] = [
    {
      id: "stream",
      label: "Reasoning",
      icon: <ListTree className="w-3.5 h-3.5" />,
      count: steps.length,
    },
    {
      id: "debate",
      label: "Debate",
      icon: <Swords className="w-3.5 h-3.5" />,
      count: debates.length,
    },
    {
      id: "decision",
      label: "Decision",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    {
      id: "execution",
      label: "Execution",
      icon: <Rocket className="w-3.5 h-3.5" />,
      count: executionSteps.length > 0 ? executionSteps.length : undefined,
    },
  ];

  return (
    <div className="bg-[#0a0e1a] border-b border-[#1a2332]">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[#0f1621]/50 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <Brain className="w-4 h-4 text-[#4a90e2]" />
            {(isActive || executionPhase === "executing") && (
              <motion.div
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#4a90e2]"
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </div>
          <h2 className="text-xs font-semibold text-white/70 tracking-wider uppercase">
            Chain-of-Thought
          </h2>
          {isActive && (
            <span className="flex items-center gap-1 text-[10px] text-[#4a90e2] bg-[#4a90e2]/10 px-2 py-0.5 rounded-sm">
              <Activity className="w-3 h-3" />
              LIVE
            </span>
          )}
          {executionPhase === "executing" && (
            <span className="flex items-center gap-1 text-[10px] text-[#f5a623] bg-[#f5a623]/10 px-2 py-0.5 rounded-sm">
              <Rocket className="w-3 h-3" />
              EXECUTING
            </span>
          )}
          {executionPhase === "complete" && (
            <span className="flex items-center gap-1 text-[10px] text-[#5a9a7a] bg-[#5a9a7a]/10 px-2 py-0.5 rounded-sm">
              <CheckCircle2 className="w-3 h-3" />
              COMPLETE
            </span>
          )}
        </div>
        {isCollapsed ? (
          <ChevronDown className="w-4 h-4 text-white/40" />
        ) : (
          <ChevronUp className="w-4 h-4 text-white/40" />
        )}
      </div>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Tabs */}
            <div className="flex border-b border-[#1a2332]">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-all ${
                    activeTab === tab.id
                      ? "text-[#4a90e2] border-b-2 border-[#4a90e2] bg-[#4a90e2]/5"
                      : "text-white/40 hover:text-white/60"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="text-[9px] bg-[#1a2332] px-1.5 py-0.5 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div
              ref={scrollContainerRef}
              className="max-h-[400px] overflow-y-auto cot-scroll-container"
            >
              {/* Reasoning Stream */}
              {activeTab === "stream" && (
                <div className="p-4 space-y-3">
                  {steps.length === 0 ? (
                    <div className="text-center py-8">
                      <Brain className="w-8 h-8 text-white/20 mx-auto mb-2" />
                      <p className="text-xs text-white/40">
                        Waiting for reasoning chain...
                      </p>
                    </div>
                  ) : (
                    steps.map((step, index) => (
                      <ReasoningStep
                        key={step.step_id}
                        stepId={step.step_id}
                        agentId={step.agent_id}
                        action={step.action}
                        title={step.title}
                        content={step.content}
                        confidence={step.confidence}
                        azureService={step.azure_service}
                        sources={step.sources}
                        durationMs={step.duration_ms}
                        isActive={index === activeStepIndex}
                        isComplete={index < activeStepIndex}
                        showTypewriter={index === activeStepIndex}
                      />
                    ))
                  )}
                </div>
              )}

              {/* Debate View */}
              {activeTab === "debate" && (
                <div className="p-4">
                  {debates.length === 0 ? (
                    <div className="text-center py-8">
                      <Swords className="w-8 h-8 text-white/20 mx-auto mb-2" />
                      <p className="text-xs text-white/40">No debates yet...</p>
                    </div>
                  ) : (
                    <DebateView
                      exchanges={debates}
                      activeExchangeIndex={activeDebateIndex}
                      phase={debatePhase}
                    />
                  )}
                </div>
              )}

              {/* Decision View */}
              {activeTab === "decision" && (
                <div className="p-4">
                  {!decision ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-8 h-8 text-white/20 mx-auto mb-2" />
                      <p className="text-xs text-white/40">
                        Decision pending...
                      </p>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-gradient-to-br from-[#5a9a7a]/10 to-transparent border border-[#5a9a7a]/30 rounded-sm p-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-5 h-5 text-[#5a9a7a]" />
                        <h3 className="text-sm font-semibold text-white/90">
                          Recommended Action
                        </h3>
                      </div>

                      <p className="text-lg font-medium text-white mb-4">
                        {decision.final_recommendation}
                      </p>

                      {decision.recommendation_details && (
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          {decision.recommendation_details.route_change && (
                            <div className="bg-[#0a0e1a] p-2 rounded-sm">
                              <span className="text-white/40 block mb-1">
                                Route
                              </span>
                              <span className="text-white/80">
                                {decision.recommendation_details.route_change}
                              </span>
                            </div>
                          )}
                          {decision.recommendation_details.additional_days && (
                            <div className="bg-[#0a0e1a] p-2 rounded-sm">
                              <span className="text-white/40 block mb-1">
                                Extra Days
                              </span>
                              <span className="text-white/80">
                                +
                                {
                                  decision.recommendation_details
                                    .additional_days
                                }
                              </span>
                            </div>
                          )}
                          {decision.recommendation_details.additional_cost && (
                            <div className="bg-[#0a0e1a] p-2 rounded-sm">
                              <span className="text-white/40 block mb-1">
                                Cost
                              </span>
                              <span className="text-white/80">
                                {
                                  decision.recommendation_details
                                    .additional_cost
                                }
                              </span>
                            </div>
                          )}
                          {decision.recommendation_details.savings && (
                            <div className="bg-[#0a0e1a] p-2 rounded-sm">
                              <span className="text-white/40 block mb-1">
                                Savings
                              </span>
                              <span className="text-[#5a9a7a] font-medium">
                                {decision.recommendation_details.savings}
                              </span>
                            </div>
                          )}
                          {decision.recommendation_details.risk_reduction && (
                            <div className="bg-[#0a0e1a] p-2 rounded-sm col-span-2">
                              <span className="text-white/40 block mb-1">
                                Risk Reduction
                              </span>
                              <span className="text-[#5a9a7a] font-medium">
                                {decision.recommendation_details.risk_reduction}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {decision.total_duration_ms && (
                        <div className="mt-4 pt-3 border-t border-[#1a2332] text-center">
                          <span className="text-[10px] text-white/40">
                            Decision made in{" "}
                            {(decision.total_duration_ms / 1000).toFixed(1)}s
                          </span>
                        </div>
                      )}

                      {/* Human-in-the-Loop Confirmation Buttons */}
                      {onConfirmDecision && executionPhase === "pending" && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 pt-4 border-t border-[#1a2332]"
                        >
                          <div className="flex items-center justify-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-[#f5a623] animate-pulse" />
                            <p className="text-[10px] text-[#f5a623] font-medium uppercase tracking-wider">
                              Human Approval Required
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => onConfirmDecision("approve")}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#5a9a7a] hover:bg-[#4a8a6a] text-white text-xs font-medium rounded-sm transition-colors"
                            >
                              <Check className="w-4 h-4" />
                              Approve & Execute
                            </button>
                            <button
                              onClick={() => onConfirmDecision("details")}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1a2332] hover:bg-[#252f42] text-white/70 text-xs font-medium rounded-sm transition-colors"
                            >
                              <FileText className="w-4 h-4" />
                              Details
                            </button>
                            <button
                              onClick={() => onConfirmDecision("manual")}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#c75050] hover:bg-[#b74040] text-white text-xs font-medium rounded-sm transition-colors"
                            >
                              <UserCog className="w-4 h-4" />
                              Override
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </div>
              )}

              {/* Execution View - NEW */}
              {activeTab === "execution" && (
                <div className="p-4">
                  <ExecutionView
                    steps={executionSteps}
                    activeStepIndex={activeExecutionIndex}
                    summary={executionSummary}
                    phase={executionPhase}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
