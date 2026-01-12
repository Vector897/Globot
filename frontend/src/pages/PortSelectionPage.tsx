import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DemoStartScreen } from '../components/DemoStartScreen';
import { GlobalPort } from '../utils/routeCalculator';

export const PortSelectionPage: React.FC = () => {
  const navigate = useNavigate();

  const handleStart = (origin: GlobalPort, destination: GlobalPort) => {
    // Navigate to demo page with state or query params if needed.
    // For now, consistent with the requirement, we might just assume DemoPage defaults, 
    // BUT since we selected ports, we should probably pass them.
    // However, the requirement says "Test directly open ... default is Shanghai...".
    // This implies DemoPage has defaults. 
    // But if coming from PortSelectionPage, we should honor the selection.
    
    // We'll pass them in state location, which DemoPage can check.
    navigate('/demo', { 
      state: { 
        origin, 
        destination 
      } 
    });
  };

  return (
    <div className="h-screen w-screen bg-[#0a0e1a]">
        <DemoStartScreen onStart={handleStart} />
    </div>
  );
};
