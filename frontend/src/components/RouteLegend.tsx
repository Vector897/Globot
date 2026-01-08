import React from 'react';
import { motion } from 'motion/react';
import { Ship, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface LegendItem {
  icon?: React.ReactNode;
  color: string;
  label: string;
  description?: string;
  status?: 'critical' | 'warning' | 'safe' | 'info';
}

const legendItems: LegendItem[] = [
  {
    color: '#c94444',
    label: 'Active Risk Route',
    description: 'Primary shipping route through crisis zone',
    status: 'critical',
    icon: <AlertTriangle className="w-3 h-3" strokeWidth={2} />,
  },
  {
    color: '#e8a547',
    label: 'Alternative Route',
    description: 'Backup route with moderate risk',
    status: 'warning',
  },
  {
    color: '#5a9a7a',
    label: 'Safe Route',
    description: 'Recommended diversion path',
    status: 'safe',
    icon: <CheckCircle className="w-3 h-3" strokeWidth={2} />,
  },
  {
    color: '#4a90e2',
    label: 'Origin Port',
    description: 'Departure point',
    status: 'info',
  },
  {
    color: '#c94444',
    label: 'Destination Port',
    description: 'Target arrival point',
    status: 'info',
  },
];

export function RouteLegend() {
  return (
    <motion.div
      className="absolute bottom-6 left-6 bg-[#0f1621] border border-[#1a2332] rounded-sm p-4 min-w-[280px] max-w-[320px]"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#1a2332]">
        <Ship className="w-4 h-4 text-[#4a90e2]" strokeWidth={2} />
        <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">
          Aviation Routes Legend
        </h3>
      </div>

      {/* Legend Items */}
      <div className="space-y-3">
        {legendItems.map((item, index) => (
          <motion.div
            key={item.label}
            className="flex items-start gap-3"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
          >
            {/* Color indicator or icon */}
            <div className="flex-shrink-0 mt-0.5">
              {item.icon ? (
                <div
                  className={`p-1 rounded-sm ${
                    item.status === 'critical'
                      ? 'bg-[#c94444]/20 text-[#c94444]'
                      : item.status === 'warning'
                      ? 'bg-[#e8a547]/20 text-[#e8a547]'
                      : item.status === 'safe'
                      ? 'bg-[#5a9a7a]/20 text-[#5a9a7a]'
                      : 'bg-[#4a90e2]/20 text-[#4a90e2]'
                  }`}
                >
                  {item.icon}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-0.5 rounded-full"
                    style={{
                      backgroundColor: item.color,
                      boxShadow: `0 0 8px ${item.color}40`,
                    }}
                  />
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: item.color,
                      boxShadow: `0 0 6px ${item.color}`,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Label and description */}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white/80 mb-0.5">
                {item.label}
              </div>
              {item.description && (
                <div className="text-[10px] text-white/40 leading-tight">
                  {item.description}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-4 pt-3 border-t border-[#1a2332] flex items-start gap-2">
        <Info className="w-3 h-3 text-white/30 flex-shrink-0 mt-0.5" strokeWidth={2} />
        <p className="text-[10px] text-white/30 leading-tight">
          Real-time route analysis powered by Azure AI and geopolitical risk data
        </p>
      </div>

      {/* Pulse indicator */}
      <div className="absolute top-4 right-4">
        <motion.div
          className="w-2 h-2 rounded-full bg-[#0078d4]"
          animate={{
            opacity: [1, 0.3, 1],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
    </motion.div>
  );
}