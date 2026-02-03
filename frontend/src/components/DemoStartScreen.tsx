import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Ship, MapPin, Play, X, Search } from 'lucide-react';
import { GlobalPort } from '../utils/routeCalculator';
import { MAJOR_PORTS as PORTS } from '../data/ports';

interface DemoStartScreenProps {
  onStart: (origin: GlobalPort, destination: GlobalPort) => void;
  currentOrigin?: GlobalPort | null;
  currentDestination?: GlobalPort | null;
  isChanging?: boolean;
  onCancel?: () => void;
}

export function DemoStartScreen({ onStart, currentOrigin, currentDestination, isChanging = false, onCancel }: DemoStartScreenProps) {
  useEffect(() => {
    console.log('[DemoStartScreen] Mounted', { PORTS_LENGTH: PORTS?.length, currentOrigin, currentDestination });
  }, []);

  const [origin, setOrigin] = useState<GlobalPort | null>(currentOrigin || null);
  const [destination, setDestination] = useState<GlobalPort | null>(currentDestination || null);
  const [originSearch, setOriginSearch] = useState('');
  const [destSearch, setDestSearch] = useState('');

  // Filter ports based on search query (name or country)
  const filteredOriginPorts = useMemo(() => {
    if (!originSearch.trim()) return PORTS;
    const query = originSearch.toLowerCase();
    return PORTS.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.country.toLowerCase().includes(query)
    );
  }, [originSearch]);

  const filteredDestPorts = useMemo(() => {
    if (!destSearch.trim()) return PORTS;
    const query = destSearch.toLowerCase();
    return PORTS.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.country.toLowerCase().includes(query)
    );
  }, [destSearch]);

  const handleStart = () => {
    if (origin && destination) {
      onStart(origin, destination);
    }
  };

  return (
    <motion.div
      className="font-sans fixed inset-0 bg-[#0a0e1a]/95 backdrop-blur-sm z-50 flex items-center justify-center p-6 box-border antialiased text-left"
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="bg-[#0f1621] border border-[#1a2332] rounded-lg max-w-4xl w-full p-8 relative box-border"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {/* Close button - only show when changing route */}
        {isChanging && onCancel && (
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-2 rounded-sm hover:bg-white/5 transition-all box-border leading-none"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-6 box-border">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-[#0078d4]/20 border border-[#0078d4]/30 rounded-lg mb-3 box-border">
            <Ship className="w-7 h-7 text-[#0078d4]" strokeWidth={1.5} />
          </div>
          <h1 className="text-xl font-semibold mb-1 tracking-wide leading-tight m-0 p-0" style={{ color: 'rgba(255,255,255,0.9)' }}>
            {isChanging ? 'Change Crisis Route' : 'Globot Crisis Scenario Demo'}
          </h1>
          <p className="text-xs leading-relaxed m-0 p-0" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {isChanging 
              ? 'Select new origin and destination ports'
              : 'Select origin and destination ports to simulate a geopolitical shipping crisis'
            }
          </p>
        </div>

        {/* Port Selection */}
        <div className="grid grid-cols-2 gap-6 mb-6 box-border">
          {/* Origin Selection */}
          <div className="box-border">
            <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider mb-2 leading-tight" style={{ color: 'rgba(255,255,255,0.6)' }}>
              <MapPin className="w-4 h-4 text-[#4a90e2]" strokeWidth={2} />
              Origin Port
            </label>
            {/* Search Input */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" strokeWidth={2} />
              <input
                type="text"
                placeholder="Search port..."
                value={originSearch}
                onChange={(e) => setOriginSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#0a0e1a] border border-[#1a2332] rounded-sm text-sm text-white/80 placeholder-white/30 focus:outline-none focus:border-[#4a90e2]/50"
              />
            </div>
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#1a2332] scrollbar-track-transparent pr-2 box-border">
              {filteredOriginPorts.length === 0 ? (
                <div className="text-center py-4 text-white/40 text-sm">No ports found</div>
              ) : (
                filteredOriginPorts.map((port) => (
                  <button
                    key={port.name}
                    onClick={() => setOrigin(port)}
                    className={`w-full text-left px-3 py-2 rounded-sm border transition-all box-border ${
                      origin?.name === port.name
                        ? 'bg-[#4a90e2]/10 border-[#4a90e2]'
                        : 'bg-[#0a0e1a] border-[#1a2332] hover:border-[#4a90e2]/50'
                    }`}
                    style={{ 
                      color: origin?.name === port.name ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)'
                    }}
                    disabled={destination?.name === port.name}
                  >
                    <div className="font-medium text-sm leading-tight m-0 p-0" style={{ color: 'inherit' }}>{port.name}</div>
                    <div className="text-xs leading-tight m-0 p-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{port.country}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Destination Selection */}
          <div className="box-border">
            <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider mb-2 leading-tight" style={{ color: 'rgba(255,255,255,0.6)' }}>
              <MapPin className="w-4 h-4 text-[#c94444]" strokeWidth={2} />
              Destination Port
            </label>
            {/* Search Input */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" strokeWidth={2} />
              <input
                type="text"
                placeholder="Search port..."
                value={destSearch}
                onChange={(e) => setDestSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#0a0e1a] border border-[#1a2332] rounded-sm text-sm text-white/80 placeholder-white/30 focus:outline-none focus:border-[#c94444]/50"
              />
            </div>
            <div className="space-y-1.5 max-h-[260px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#1a2332] scrollbar-track-transparent pr-2 box-border">
              {filteredDestPorts.length === 0 ? (
                <div className="text-center py-4 text-white/40 text-sm">No ports found</div>
              ) : (
                filteredDestPorts.map((port) => (
                  <button
                    key={port.name}
                    onClick={() => setDestination(port)}
                    className={`w-full text-left px-3 py-2 rounded-sm border transition-all box-border ${
                      destination?.name === port.name
                        ? 'bg-[#c94444]/10 border-[#c94444]'
                        : 'bg-[#0a0e1a] border-[#1a2332] hover:border-[#c94444]/50'
                    }`}
                    style={{ 
                      color: destination?.name === port.name ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)'
                    }}
                    disabled={origin?.name === port.name}
                  >
                    <div className="font-medium text-sm leading-tight m-0 p-0" style={{ color: 'inherit' }}>{port.name}</div>
                    <div className="text-xs leading-tight m-0 p-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{port.country}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Selected Route Summary */}
        {origin && destination && (
          <motion.div
            className="bg-[#0a0e1a] border border-[#1a2332] rounded-sm p-3 mb-4 box-border"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between box-border">
              <div className="flex items-center gap-3 box-border">
                <div className="flex items-center gap-2 box-border">
                  <div className="w-2 h-2 rounded-full bg-[#4a90e2]" />
                  <span className="text-sm leading-tight" style={{ color: 'rgba(255,255,255,0.8)' }}>{origin.name}</span>
                </div>
                <Ship className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.4)' }} strokeWidth={1.5} />
                <div className="flex items-center gap-2 box-border">
                  <div className="w-2 h-2 rounded-full bg-[#c94444]" />
                  <span className="text-sm leading-tight" style={{ color: 'rgba(255,255,255,0.8)' }}>{destination.name}</span>
                </div>
              </div>
              <span className="text-xs leading-tight" style={{ color: 'rgba(255,255,255,0.4)' }}>Crisis route selected</span>
            </div>
          </motion.div>
        )}

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={!origin || !destination}
          className={`w-full py-3 rounded-sm font-medium tracking-wide flex items-center justify-center gap-3 transition-all box-border leading-none ${
            origin && destination
              ? 'bg-[#0078d4] hover:bg-[#0078d4]/90 border border-[#0078d4]'
              : 'bg-[#1a2332] border border-[#1a2332] cursor-not-allowed'
          }`}
          style={{ 
            color: origin && destination ? '#ffffff' : 'rgba(255,255,255,0.3)'
          }}
        >
          <Play className="w-5 h-5" strokeWidth={2} />
          {isChanging ? 'Update Crisis Route' : 'Start Crisis Simulation'}
        </button>

        {/* Footer Note */}
        <p className="text-center text-xs mt-4 leading-relaxed m-0 p-0" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {isChanging 
            ? 'Changing route will update the simulation with new origin and destination'
            : 'This demo simulates AI-powered trade risk management in a geopolitical crisis scenario'
          }
        </p>
      </motion.div>
    </motion.div>
  );
}
