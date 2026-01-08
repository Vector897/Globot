import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Ship, MapPin, Play, X } from 'lucide-react';
import { GlobalPort } from '../utils/routeCalculator';

const PORTS: GlobalPort[] = [
  { name: 'Shanghai', country: 'China', coordinates: [121.47, 31.23], region: 'Asia' },
  { name: 'Singapore', country: 'Singapore', coordinates: [103.85, 1.29], region: 'Asia' },
  { name: 'Rotterdam', country: 'Netherlands', coordinates: [4.47, 51.92], region: 'Europe' },
  { name: 'Hamburg', country: 'Germany', coordinates: [9.99, 53.55], region: 'Europe' },
  { name: 'Dubai', country: 'UAE', coordinates: [55.27, 25.2], region: 'Middle East' },
  { name: 'Los Angeles', country: 'USA', coordinates: [-118.24, 34.05], region: 'Americas' },
  { name: 'New York', country: 'USA', coordinates: [-74.01, 40.71], region: 'Americas' },
  { name: 'Mumbai', country: 'India', coordinates: [72.88, 19.08], region: 'Asia' },
  { name: 'Tokyo', country: 'Japan', coordinates: [139.69, 35.69], region: 'Asia' },
  { name: 'Cape Town', country: 'South Africa', coordinates: [18.42, -33.92], region: 'Africa' },
];

interface DemoStartScreenProps {
  onStart: (origin: GlobalPort, destination: GlobalPort) => void;
  currentOrigin?: GlobalPort | null;
  currentDestination?: GlobalPort | null;
  isChanging?: boolean;
  onCancel?: () => void;
}

export function DemoStartScreen({ onStart, currentOrigin, currentDestination, isChanging = false, onCancel }: DemoStartScreenProps) {
  const [origin, setOrigin] = useState<GlobalPort | null>(currentOrigin || null);
  const [destination, setDestination] = useState<GlobalPort | null>(currentDestination || null);

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
        <div className="text-center mb-8 box-border">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0078d4]/20 border border-[#0078d4]/30 rounded-lg mb-4 box-border">
            <Ship className="w-8 h-8 text-[#0078d4]" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-semibold mb-2 tracking-wide leading-tight m-0 p-0" style={{ color: 'rgba(255,255,255,0.9)' }}>
            {isChanging ? 'Change Crisis Route' : 'Globot Crisis Scenario Demo'}
          </h1>
          <p className="text-sm leading-relaxed m-0 p-0" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {isChanging 
              ? 'Select new origin and destination ports to update the simulation'
              : 'Select origin and destination ports to simulate a geopolitical shipping crisis'
            }
          </p>
        </div>

        {/* Port Selection */}
        <div className="grid grid-cols-2 gap-6 mb-8 box-border">
          {/* Origin Selection */}
          <div className="box-border">
            <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider mb-3 leading-tight" style={{ color: 'rgba(255,255,255,0.6)' }}>
              <MapPin className="w-4 h-4 text-[#4a90e2]" strokeWidth={2} />
              Origin Port
            </label>
            <div className="space-y-2 max-h-[320px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#1a2332] scrollbar-track-transparent pr-2 box-border">
              {PORTS.map((port) => (
                <button
                  key={port.name}
                  onClick={() => setOrigin(port)}
                  className={`w-full text-left px-4 py-3 rounded-sm border transition-all box-border ${
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
                  <div className="text-xs leading-tight m-0 p-0 mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{port.country}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Destination Selection */}
          <div className="box-border">
            <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider mb-3 leading-tight" style={{ color: 'rgba(255,255,255,0.6)' }}>
              <MapPin className="w-4 h-4 text-[#c94444]" strokeWidth={2} />
              Destination Port
            </label>
            <div className="space-y-2 max-h-[320px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#1a2332] scrollbar-track-transparent pr-2 box-border">
              {PORTS.map((port) => (
                <button
                  key={port.name}
                  onClick={() => setDestination(port)}
                  className={`w-full text-left px-4 py-3 rounded-sm border transition-all box-border ${
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
                  <div className="text-xs leading-tight m-0 p-0 mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{port.country}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Route Summary */}
        {origin && destination && (
          <motion.div
            className="bg-[#0a0e1a] border border-[#1a2332] rounded-sm p-4 mb-6 box-border"
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
          className={`w-full py-4 rounded-sm font-medium tracking-wide flex items-center justify-center gap-3 transition-all box-border leading-none ${
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
        <p className="text-center text-xs mt-6 leading-relaxed m-0 p-0" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {isChanging 
            ? 'Changing route will update the simulation with new origin and destination'
            : 'This demo simulates AI-powered trade risk management in a geopolitical crisis scenario'
          }
        </p>
      </motion.div>
    </motion.div>
  );
}
