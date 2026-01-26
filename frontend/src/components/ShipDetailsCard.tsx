import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Ship } from '../utils/shipData';
import { X, Navigation, Fuel, Box, Anchor, AlertTriangle, Clock, MapPin } from 'lucide-react';

interface ShipDetailsCardProps {
  ship: Ship | null;
  onClose: () => void;
}

export function ShipDetailsCard({ ship, onClose }: ShipDetailsCardProps) {
  if (!ship) return null;

  return (
    <AnimatePresence>
      <motion.div
        drag
        dragMomentum={false}
        className="absolute top-24 left-32 z-50 w-80 bg-[#0f1621]/95 border border-[#1a2332] rounded-md shadow-2xl backdrop-blur-md overflow-hidden"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header - Draggable Area */}
        <div className="relative h-24 bg-gradient-to-r from-[#1a2332] to-[#0f1621] p-4 flex flex-col justify-end border-b border-[#1a2332] cursor-move group">
            {/* Type Icon Background */}
            <div className="absolute top-2 right-2 opacity-10">
                <Anchor className="w-16 h-16 text-white" />
            </div>
            
            <button 
                onClick={onClose}
                className="absolute top-2 right-2 p-1 rounded-sm text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-1">
                <span className={`px-1.5 py-0.5 rounded-xs text-[10px] font-bold uppercase tracking-wider border ${
                    ship.status === 'At Risk' ? 'bg-red-500/20 text-red-500 border-red-500/30' : 
                    ship.status === 'Diverting' ? 'bg-orange-500/20 text-orange-500 border-orange-500/30' :
                    'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
                }`}>
                    {ship.status}
                </span>
                <span className="text-[10px] text-white/40 font-mono tracking-wider">{ship.type.toUpperCase()}</span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-wide">{ship.name}</h2>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
            
            {/* Key Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0a0e1a] border border-[#1a2332] p-2 rounded-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <Navigation className="w-3 h-3 text-[#4a90e2]" />
                        <span className="text-[10px] text-white/40 uppercase">Speed / Crs</span>
                    </div>
                    <div className="text-sm font-medium text-white/90">{ship.speed} kn <span className="text-white/30">|</span> {Math.round(ship.heading)}°</div>
                </div>
                <div className="bg-[#0a0e1a] border border-[#1a2332] p-2 rounded-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <Fuel className="w-3 h-3 text-[#4a90e2]" />
                        <span className="text-[10px] text-white/40 uppercase">Fuel Lvl</span>
                    </div>
                     <div className="text-sm font-medium text-white/90">{ship.fuelLevel}%</div>
                </div>
            </div>
            
            {/* Position Display (New Task 26) */}
            <div className="bg-[#0a0e1a] border border-[#1a2332] p-2 rounded-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-[#4a90e2]" />
                    <span className="text-[10px] text-white/40 uppercase">Position</span>
                </div>
                <div className="text-sm font-medium text-white/90 font-mono tracking-tight">
                    {Math.abs(ship.position[1]).toFixed(2)}°{ship.position[1] >= 0 ? 'N' : 'S'} 
                    <span className="mx-2 text-white/20">|</span>
                    {Math.abs(ship.position[0]).toFixed(2)}°{ship.position[0] >= 0 ? 'E' : 'W'}
                </div>
            </div>

            {/* Route Info */}
            <div className="space-y-2">
                 <div className="flex items-start gap-3">
                    <div className="flexflex-col items-center gap-1 pt-1">
                        <div className="w-2 h-2 rounded-full bg-[#4a90e2]" />
                        <div className="w-0.5 h-6 bg-[#1a2332]" />
                        <div className="w-2 h-2 rounded-full border border-[#c94444]" />
                    </div>
                    <div className="flex-1 space-y-3">
                        <div>
                            <div className="text-[10px] text-white/40 uppercase mb-0.5">Origin</div>
                            <div className="text-sm text-white/80">{ship.origin}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-white/40 uppercase mb-0.5">Destination</div>
                            <div className="text-sm text-white/80">{ship.destination}</div>
                        </div>
                    </div>
                    <div className="text-right">
                         <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#1a2332] rounded-sm mb-2">
                            <Clock className="w-3 h-3 text-white/40" />
                            <span className="text-xs font-mono text-white/80">ETA: {ship.eta}</span>
                         </div>
                         <div className="text-[10px] text-red-400/80 font-medium flex items-center justify-end gap-1">
                            {ship.riskFactor !== 'Low' && <AlertTriangle className="w-3 h-3" />}
                            Risk: {ship.riskFactor}
                         </div>
                    </div>
                 </div>
            </div>
            
            {/* Cargo Manifest */}
             <div className="bg-[#0a0e1a]/50 border border-[#1a2332] p-3 rounded-sm flex items-center gap-3">
                <div className="p-2 bg-[#1a2332] rounded-sm">
                    <Box className="w-4 h-4 text-[#4a90e2]" />
                </div>
                <div>
                     <div className="text-[10px] text-white/40 uppercase">Cargo Manifest</div>
                     <div className="text-xs text-white/90 font-medium">{ship.cargo}</div>
                </div>
             </div>

             {/* Actions */}
             <div className="grid grid-cols-2 gap-2 pt-2">

                <button className="px-3 py-2 bg-[#4a90e2]/10 border border-[#4a90e2]/30 hover:bg-[#4a90e2]/20 text-xs text-[#4a90e2] transition-colors rounded-sm">
                    Contact Channel
                </button>
             </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
