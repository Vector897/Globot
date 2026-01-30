import React, { useState, useEffect, useRef } from 'react';
import { useUser, SignOutButton } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Clock,
  Shield,
  ArrowLeft,
  History,
  TrendingUp,
  Activity,
  Ship,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  ChevronRight,
  ClipboardCheck,
  Package,
  MapPin,
  Layers,
  Info,
  X,
  Anchor,
  Navigation,
  Search,
  RefreshCw
} from 'lucide-react';
import { documentAPI } from '../services/documentApi';
import { GapAnalysisReport } from '../components/documents';
import { MAJOR_PORTS } from '../data/ports';
import { motion, AnimatePresence } from 'motion/react';

export function UsersHome() {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  
  // --- States ---
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'vessel', or 'compliance'
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  // Customer/vessel identity from backend
  const [customerId, setCustomerId] = useState(null);
  const [vesselId, setVesselId] = useState(null);

  // Compliance Analysis State
  const [vesselRoutes, setVesselRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [vesselDocuments, setVesselDocuments] = useState([]);
  const [missingDocsResult, setMissingDocsResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [newRouteName, setNewRouteName] = useState('');
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);
  
  // Port selection state
  // availablePorts is now computed via useMemo (allPorts)
  const [selectedRoutePorts, setSelectedRoutePorts] = useState([]); // Array of port objects for new route
  const [portSearchQuery, setPortSearchQuery] = useState('');
  const [showPortDropdown, setShowPortDropdown] = useState(false);

  // Provision customer + vessel on mount once Clerk user is loaded
  useEffect(() => {
    if (!user) return;
    const provision = async () => {
      try {
        const res = await documentAPI.provisionUser({
          clerk_id: user.id,
          email: user.primaryEmailAddress?.emailAddress || '',
          name: user.fullName || undefined,
        });
        setCustomerId(res.customer_id);
        if (res.vessel_id) setVesselId(res.vessel_id);
      } catch (err) {
        console.error('Provisioning failed:', err);
        // Fallback to default IDs if provisioning fails
        setCustomerId(1);
        setVesselId(1);
      }
    };
    provision();
  }, [user]);

  // Pre-compute available ports from MAJOR_PORTS (no useEffect needed)
  const countryCodeMap = {
    'China': 'CN', 'Singapore': 'SG', 'Netherlands': 'NL', 'Germany': 'DE',
    'USA': 'US', 'UK': 'GB', 'Belgium': 'BE', 'Spain': 'ES', 'France': 'FR',
    'Italy': 'IT', 'Japan': 'JP', 'South Korea': 'KR', 'India': 'IN',
    'UAE': 'AE', 'Saudi Arabia': 'SA', 'Malaysia': 'MY', 'Thailand': 'TH',
    'Vietnam': 'VN', 'Indonesia': 'ID', 'Philippines': 'PH', 'Taiwan': 'TW',
    'Australia': 'AU', 'New Zealand': 'NZ', 'Brazil': 'BR', 'Mexico': 'MX',
    'Canada': 'CA', 'Argentina': 'AR', 'Chile': 'CL', 'Colombia': 'CO',
    'Peru': 'PE', 'Panama': 'PA', 'Egypt': 'EG', 'Turkey': 'TR',
    'South Africa': 'ZA', 'Kenya': 'KE', 'Morocco': 'MA', 'Nigeria': 'NG',
    'Ghana': 'GH', 'Ivory Coast': 'CI', 'Senegal': 'SN', 'Tanzania': 'TZ',
    'Djibouti': 'DJ', 'Oman': 'OM', 'Kuwait': 'KW', 'Israel': 'IL',
    'Greece': 'GR', 'Poland': 'PL', 'Sweden': 'SE', 'Denmark': 'DK',
    'Finland': 'FI', 'Norway': 'NO', 'Estonia': 'EE', 'Latvia': 'LV',
    'Russia': 'RU', 'Ukraine': 'UA', 'Romania': 'RO', 'Ireland': 'IE',
    'Portugal': 'PT', 'Bangladesh': 'BD', 'Pakistan': 'PK', 'Sri Lanka': 'LK',
    'Malta': 'MT', 'Jamaica': 'JM', 'Bahamas': 'BS', 'Puerto Rico': 'PR',
    'Uruguay': 'UY', 'Ecuador': 'EC', 'Iran': 'IR', 'Mauritius': 'MU',
  };

  // Generate ports with UN/LOCODE codes from MAJOR_PORTS immediately
  const allPorts = React.useMemo(() => {
    return MAJOR_PORTS.map((port, idx) => {
      const countryCode = countryCodeMap[port.country] || port.country.substring(0, 2).toUpperCase();
      const portCode = port.name.replace(/\s+/g, '').substring(0, 3).toUpperCase();
      return {
        id: idx + 1,
        name: port.name,
        country: port.country,
        region: port.region,
        un_locode: `${countryCode}${portCode}`,
        latitude: port.coordinates[1],
        longitude: port.coordinates[0],
      };
    });
  }, []);

  // Load routes and documents when switching to compliance tab (requires vesselId)
  useEffect(() => {
    if (activeTab !== 'compliance' || !customerId) return;
    
    const loadComplianceData = async () => {
      try {
        // Fetch vessel routes (if vesselId is available)
        if (vesselId) {
          const routes = await documentAPI.getVesselRoutes(vesselId);
          setVesselRoutes(routes);
          
          // Auto-select the active route if exists
          const activeRoute = routes.find(r => r.is_active);
          if (activeRoute) {
            setSelectedRoute(activeRoute);
          } else if (routes.length > 0) {
            setSelectedRoute(routes[0]);
          }
        }

        // Fetch customer documents (by user, not vessel)
        const docs = await documentAPI.getCustomerDocuments(customerId);
        setVesselDocuments(docs);
      } catch (err) {
        console.error('Failed to load compliance data:', err);
      }
    };
    
    loadComplianceData();
  }, [activeTab, customerId, vesselId]);

  // User metrics data
  const [metrics, setMetrics] = useState({
    totalTokens: 5000000,
    usedTokens: 1245800,
    remainingTokens: 3754200,
    activeTime: "4h 22m",
    lastSession: "2026-01-26 10:30",
    requests: 1420
  });

  // Ship Profile Data (Based on TXT reference)
  const [shipData, setShipData] = useState({
    // Vessel Particulars
    vesselName: '',
    callSign: '',
    imoNumber: '',
    mmsiCode: '',
    flag: '',
    vesselType: '',
    // Voyage Information
    originalVoyage: '',
    newVoyage: '',
    portOfLoading: '',
    portOfDischarge: '',
    etaOriginal: '',
    etaNew: '',
    // Cargo Details
    cargoName: '',
    hsCode: '',
    dgClass: '',
    weight: '',
    volume: ''
  });

  if (!isLoaded) return <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center text-blue-400 font-mono">INITIALIZING SYSTEM...</div>;

  const usedPercentage = (metrics.usedTokens / metrics.totalTokens) * 100;

  // --- Handlers ---
  const handleShipDataChange = (field, value) => {
    setShipData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      handleFileUpload(file);
    }
  };

  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file) => {
    setIsParsing(true);
    setUploadProgress(0);
    setUploadError(null);

    // Progress simulation for UX (real upload happens in parallel)
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 300);

    try {
      if (!customerId) {
        throw new Error('User account not ready. Please wait a moment and try again.');
      }

      // Step 1: Upload document to backend with OCR processing
      const uploadResult = await documentAPI.uploadDocument({
        customer_id: customerId,
        vessel_id: vesselId || 1,
        document_type: 'other',
        title: file.name,
        file: file,
      });

      setUploadProgress(95);

      // Step 2: Fetch full document details including extracted_fields from OCR
      const docDetails = await documentAPI.getDocument(uploadResult.id);
      const fields = docDetails.extracted_fields || {};

      clearInterval(interval);
      setUploadProgress(100);

      // Step 3: Map OCR-extracted fields to vessel form
      setShipData(prev => ({
        ...prev,
        vesselName: fields.vessel_name || prev.vesselName,
        imoNumber: fields.imo_number || prev.imoNumber,
        flag: fields.flag_state || prev.flag,
        vesselType: fields.vessel_type || prev.vesselType,
      }));

      // Short delay to show 100% before closing
      await new Promise(resolve => setTimeout(resolve, 500));

      setIsParsing(false);
      setShowUploadModal(false);
      setSelectedFile(null);
      setActiveTab('vessel');
    } catch (err) {
      clearInterval(interval);
      console.error('Upload failed:', err);
      setUploadError(err.response?.data?.detail || err.message || 'Upload failed. Please try again.');
      setIsParsing(false);
      setUploadProgress(0);
    }
  };

  // --- Compliance Analysis Handlers ---
  const handleCreateRoute = async () => {
    // Only save route if vesselId exists (guaranteed by UI)
    if (!newRouteName.trim() || selectedRoutePorts.length === 0 || !vesselId) return;
    
    setIsCreatingRoute(true);
    setAnalysisError(null);
    try {
      const portCodes = selectedRoutePorts.map(p => p.un_locode);
      
      const newRoute = await documentAPI.createRoute(vesselId, {
        route_name: newRouteName,
        port_codes: portCodes,
        set_active: true
      });
      
      setVesselRoutes(prev => [newRoute, ...prev]);
      setSelectedRoute(newRoute);
      setNewRouteName('');
      // Keep ports selected so user can run analysis immediately
    } catch (err) {
      console.error('Failed to create route:', err);
      setAnalysisError('Failed to create route. Please try again.');
    } finally {
      setIsCreatingRoute(false);
    }
  };

  const handleRunAnalysis = async () => {
    // Need either a selected route OR selected ports for route creation
    const hasRoute = selectedRoute && selectedRoute.port_codes?.length > 0;
    const hasPorts = selectedRoutePorts.length > 0;
    
    if (!customerId || (!hasRoute && !hasPorts)) {
      setAnalysisError('Please select a route or add ports for analysis.');
      return;
    }
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    setMissingDocsResult(null);
    
    try {
      // Use port_codes and customer_id for vesselless analysis
      const portCodes = hasRoute 
        ? selectedRoute.port_codes 
        : selectedRoutePorts.map(p => p.un_locode);
      
      const result = await documentAPI.detectMissingDocuments({
        port_codes: portCodes,
        customer_id: customerId
      });
      
      setMissingDocsResult(result);
    } catch (err) {
      console.error('Analysis failed:', err);
      setAnalysisError(err.response?.data?.detail || err.message || 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const refreshComplianceData = async () => {
    if (!customerId) return;
    try {
      const promises = [documentAPI.getCustomerDocuments(customerId)];
      if (vesselId) {
        promises.unshift(documentAPI.getVesselRoutes(vesselId));
      }
      const results = await Promise.all(promises);
      
      if (vesselId) {
        setVesselRoutes(results[0]);
        setVesselDocuments(results[1]);
      } else {
        setVesselDocuments(results[0]);
      }
    } catch (err) {
      console.error('Failed to refresh data:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[20%] left-[-5%] w-[400px] h-[400px] bg-emerald-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        {/* Navigation Header */}
        <div className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/demo')}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-all px-4 py-2 bg-white/5 border border-white/10 rounded-xl backdrop-blur-md group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Navigator</span>
            </button>
            <div className="h-6 w-px bg-white/10 hidden md:block" />
            <nav className="hidden md:flex items-center gap-2">
               <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Intelligence Center" />
               <TabButton active={activeTab === 'vessel'} onClick={() => setActiveTab('vessel')} label="Vessel Profile" icon={<Ship className="w-4 h-4" />} />
               <TabButton active={activeTab === 'compliance'} onClick={() => setActiveTab('compliance')} label="Compliance" icon={<Shield className="w-4 h-4" />} />
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-white/90 tracking-tight">{user?.fullName || "Commander"}</p>
                <div className="flex items-center gap-1.5 justify-end">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Global Ops Active</p>
                </div>
             </div>
             <img 
               src={user?.imageUrl} 
               alt="avatar" 
               className="w-11 h-11 rounded-2xl border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-2 ring-white/5" 
             />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              {/* Hero Overview */}
              <header className="mb-12">
                <h1 className="text-5xl font-extrabold tracking-tight mb-3">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300">
                    Mission Control
                  </span>
                </h1>
                <p className="text-white/40 text-lg max-w-2xl">
                  Real-time analytics for your Multi-Agent Maritime Logistics network. All systems operational.
                </p>
              </header>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <MetricCard 
                  title="System Active Time" 
                  value={metrics.activeTime} 
                  icon={<Clock className="text-blue-400" />} 
                  subText="Continuous monitoring active"
                />
                <MetricCard 
                  title="Network Requests" 
                  value={metrics.requests.toLocaleString()} 
                  icon={<TrendingUp className="text-emerald-400" />} 
                  subText="API Performance: 99.9%"
                />
                <MetricCard 
                  title="Remaining Capacity" 
                  value={(metrics.remainingTokens / 1000).toFixed(0) + "K"} 
                  icon={<Zap className="text-amber-400" />} 
                  subText={`${(100 - usedPercentage).toFixed(1)}% Credit Left`}
                />
                <MetricCard 
                  title="Total Allocation" 
                  value="5.0M" 
                  icon={<Layers className="text-indigo-400" />} 
                  subText="Enterprise Tier Plan"
                />
              </div>

              {/* Main Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-2 space-y-8">
                   <div className="bg-[#0f172a]/60 border border-white/5 rounded-[2rem] p-8 backdrop-blur-sm relative overflow-hidden">
                      <div className="flex justify-between items-start mb-10">
                         <div>
                            <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
                               <Activity className="w-5 h-5 text-blue-500" />
                               Neural Token Consumption
                            </h2>
                            <p className="text-white/40 text-sm">Monthly resource distribution across multi-agent cluster</p>
                         </div>
                         <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                            <Info className="w-4 h-4 text-white/30" />
                         </button>
                      </div>

                      <div className="relative h-4 bg-white/5 rounded-full mb-4 border border-white/5 overflow-hidden">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${usedPercentage}%` }}
                           className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-cyan-400 shadow-[0_0_20px_rgba(59,130,246,0.4)]"
                         />
                      </div>
                      <div className="flex justify-between items-center text-xs font-mono uppercase tracking-widest text-white/20">
                         <span>Start Pool: 0.0</span>
                         <span className="text-white/40">{metrics.usedTokens.toLocaleString()} Used</span>
                         <span>Max: 5,000,000</span>
                      </div>

                      <div className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-white/5">
                         <DetailBox label="Avg Latency" value="142ms" color="text-blue-400" />
                         <DetailBox label="Agent Uptime" value="100%" color="text-emerald-400" />
                         <DetailBox label="Encryption" value="AES-256" color="text-indigo-400" />
                      </div>
                   </div>
                   
                   {/* Vessel Quick-Access Link */}
                   <button 
                     onClick={() => setActiveTab('vessel')}
                     className="w-full group bg-gradient-to-r from-blue-600/10 to-transparent hover:from-blue-600/20 border border-blue-500/20 rounded-2xl p-6 flex justify-between items-center transition-all"
                   >
                     <div className="flex items-center gap-4 text-left">
                        <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                           <Ship className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                           <h3 className="font-bold text-lg">Configure Vessel Profile</h3>
                           <p className="text-white/40 text-sm">Set up ship particulars and cargo manifest for routing</p>
                        </div>
                     </div>
                     <ChevronRight className="w-6 h-6 text-white/20 group-hover:translate-x-1 group-hover:text-blue-400 transition-all" />
                   </button>
                 </div>

                 <div className="space-y-6">
                    <section className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 text-center backdrop-blur-md">
                       <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                          <Shield className="w-8 h-8 text-blue-400" />
                       </div>
                       <h2 className="text-xl font-bold mb-2">Defense Status</h2>
                       <p className="text-white/40 text-sm mb-8 leading-relaxed">Multi-factor authentication and role-based access control enabled.</p>
                       <div className="space-y-3">
                          <StatusButton label="Security Logs" />
                          <StatusButton label="Manage API Keys" />
                          <SignOutButton>
                             <button className="w-full py-3 text-red-400/80 hover:text-red-400 transition-colors font-semibold text-sm">
                               Disconnect Session
                             </button>
                          </SignOutButton>
                       </div>
                    </section>

                    <div className="bg-gradient-to-br from-indigo-600/20 to-blue-600/10 border border-indigo-500/20 rounded-[2rem] p-6">
                        <div className="flex items-center gap-3 mb-4">
                           <Package className="w-5 h-5 text-indigo-400" />
                           <span className="font-bold text-sm tracking-wide">SUBSCRIPTION</span>
                        </div>
                        <p className="text-2xl font-black mb-1">PRO PLAN</p>
                        <p className="text-white/40 text-xs">Renews Jan 22, 2026</p>
                    </div>
                 </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'vessel' && (
            <motion.div 
              key="vessel"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
               {/* Vessel Profile Section */}
               <div className="flex justify-between items-end mb-10">
                  <div>
                    <h1 className="text-4xl font-bold flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                        <Ship className="w-7 h-7 text-blue-500" />
                      </div>
                      Ship Intelligence Profile
                    </h1>
                    <p className="text-white/40 mt-2 ml-16">Define your vessel and cargo parameters for accurate simulation</p>
                  </div>
                  <button 
                    onClick={() => setShowUploadModal(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                  >
                    <Upload className="w-4 h-4" />
                    Auto-Fill from File
                  </button>
               </div>

               {/* Form Grid */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Category: Vessel Particulars */}
                  <FormSection title="Vessel Particulars (船舶基础信息)" icon={<ClipboardCheck className="w-5 h-5" />}>
                     <div className="grid grid-cols-2 gap-4">
                        <InputField label="Vessel Name (船名)" value={shipData.vesselName} onChange={(v) => handleShipDataChange('vesselName', v)} placeholder="COSCO SHIPPING..." />
                        <InputField label="Call Sign (呼号)" value={shipData.callSign} onChange={(v) => handleShipDataChange('callSign', v)} placeholder="VRAB2" />
                        <InputField label="IMO Number" value={shipData.imoNumber} onChange={(v) => handleShipDataChange('imoNumber', v)} placeholder="9876543" />
                        <InputField label="MMSI Code" value={shipData.mmsiCode} onChange={(v) => handleShipDataChange('mmsiCode', v)} placeholder="477..." />
                        <InputField label="Flag (船旗)" value={shipData.flag} onChange={(v) => handleShipDataChange('flag', v)} placeholder="Hong Kong" />
                        <InputField label="Vessel Type" value={shipData.vesselType} onChange={(v) => handleShipDataChange('vesselType', v)} placeholder="ULCV" />
                     </div>
                  </FormSection>

                  {/* Category: Voyage Information */}
                  <FormSection title="Voyage Information (航次信息)" icon={<MapPin className="w-5 h-5" />}>
                     <div className="grid grid-cols-2 gap-4">
                        <InputField label="Original Voyage" value={shipData.originalVoyage} onChange={(v) => handleShipDataChange('originalVoyage', v)} placeholder="045W" />
                        <InputField label="New Voyage" value={shipData.newVoyage} onChange={(v) => handleShipDataChange('newVoyage', v)} placeholder="045W-C" />
                        <InputField label="Port of Loading" value={shipData.portOfLoading} onChange={(v) => handleShipDataChange('portOfLoading', v)} placeholder="Shanghai" />
                        <InputField label="Port Of Discharge" value={shipData.portOfDischarge} onChange={(v) => handleShipDataChange('portOfDischarge', v)} placeholder="Rotterdam" />
                        <InputField label="Original ETA" type="date" value={shipData.etaOriginal} onChange={(v) => handleShipDataChange('etaOriginal', v)} />
                        <InputField label="Expected New ETA" type="date" value={shipData.etaNew} onChange={(v) => handleShipDataChange('etaNew', v)} />
                     </div>
                  </FormSection>

                  {/* Category: Cargo Details */}
                  <FormSection title="Cargo Details (货物信息)" icon={<Package className="w-5 h-5" />}>
                     <div className="grid grid-cols-2 gap-4">
                        <InputField label="Cargo Name" value={shipData.cargoName} onChange={(v) => handleShipDataChange('cargoName', v)} placeholder="Smartwatch Comp." />
                        <InputField label="HS Code" value={shipData.hsCode} onChange={(v) => handleShipDataChange('hsCode', v)} placeholder="8517.7900" />
                        <InputField label="Dangerous Attributes" value={shipData.dgClass} onChange={(v) => handleShipDataChange('dgClass', v)} placeholder="Class 9, UN 3481" />
                        <InputField label="Weight" value={shipData.weight} onChange={(v) => handleShipDataChange('weight', v)} placeholder="12,500 KGS" />
                        <InputField label="Volume" value={shipData.volume} onChange={(v) => handleShipDataChange('volume', v)} placeholder="45 CBM" />
                        <div className="flex items-end pb-1">
                           <button className="w-full h-11 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold transition-all">SAVE DRAFT</button>
                        </div>
                     </div>
                  </FormSection>

                  {/* Extra Analysis Info */}
                  <section className="bg-gradient-to-br from-blue-600/10 to-emerald-600/5 border border-white/5 rounded-3xl p-8">
                     <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <History className="w-5 h-5 text-emerald-400" />
                        Compliance Analysis Notes
                     </h3>
                     <div className="space-y-4">
                        <AnalysisPoint label="HS Code Stability" status="Stable" />
                        <AnalysisPoint label="Voyage Plan Status" status="Requires Update" alert />
                        <AnalysisPoint label="Legal Documentation" status="Verified" />
                        <div className="mt-8 pt-8 border-t border-white/10">
                           <button 
                             onClick={() => navigate('/port')}
                             className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black tracking-widest uppercase text-sm shadow-xl shadow-emerald-900/40 transition-all active:scale-95"
                           >
                              Apply to Simulation
                           </button>
                        </div>
                     </div>
                  </section>
               </div>
            </motion.div>
          )}

          {activeTab === 'compliance' && (
            <motion.div 
              key="compliance"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
               {/* Compliance Analysis Section */}
               <div className="flex justify-between items-end mb-10">
                  <div>
                    <h1 className="text-4xl font-bold flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                        <Shield className="w-7 h-7 text-emerald-500" />
                      </div>
                      Compliance Analysis
                    </h1>
                    <p className="text-white/40 mt-2 ml-16">Detect missing documents and compliance gaps for your voyage routes</p>
                  </div>
                  <button 
                    onClick={refreshComplianceData}
                    className="flex items-center gap-2 text-white/60 hover:text-white px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh Data
                  </button>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column - Route Selection & Documents */}
                  <div className="lg:col-span-2 space-y-6">
                     {/* Route Selection Panel */}
                     <section className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                           <Navigation className="w-5 h-5 text-blue-500" />
                           Route Selection
                        </h3>

                        {/* Route Dropdown */}
                        <div className="space-y-4">
                           <div className="space-y-2">
                              <label className="text-[10px] uppercase font-bold text-white/30 ml-1 tracking-widest">Select Route</label>
                              <div className="relative">
                                 <select 
                                    value={selectedRoute?.id || ''}
                                    onChange={(e) => {
                                       const route = vesselRoutes.find(r => r.id === parseInt(e.target.value));
                                       setSelectedRoute(route || null);
                                    }}
                                    className="w-full bg-[#0a0e1a] border border-white/10 rounded-xl px-4 py-3 text-sm font-medium focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all appearance-none cursor-pointer"
                                 >
                                    <option value="">Select a route...</option>
                                    {vesselRoutes.map(route => (
                                       <option key={route.id} value={route.id}>
                                          {route.route_name} {route.is_active ? '(Active)' : ''}
                                       </option>
                                    ))}
                                 </select>
                                 <ChevronRight className="w-4 h-4 text-white/30 absolute right-4 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                              </div>
                           </div>

                           {/* Selected Route Info */}
                           {selectedRoute && (
                              <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4">
                                 <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-widest mb-3">
                                    <Anchor className="w-4 h-4" />
                                    Route Ports
                                 </div>
                                 <div className="flex flex-wrap items-center gap-2">
                                    {selectedRoute.port_codes.map((port, idx) => (
                                       <React.Fragment key={port}>
                                          <span className="bg-white/10 text-white px-3 py-1.5 rounded-lg text-sm font-mono font-bold">
                                             {port}
                                          </span>
                                          {idx < selectedRoute.port_codes.length - 1 && (
                                             <ChevronRight className="w-4 h-4 text-white/20" />
                                          )}
                                       </React.Fragment>
                                    ))}
                                 </div>
                              </div>
                           )}

                           {/* Port Selector - Always Visible */}
                           <div className="pt-4 border-t border-white/5 space-y-4">
                                    <div className="flex items-center justify-between">
                                 <span className="text-sm font-bold flex items-center gap-2">
                                    <Plus className="w-4 h-4 text-blue-400" />
                                    Add Ports for Analysis
                                 </span>
                                 {selectedRoutePorts.length > 0 && (
                                    <button 
                                       onClick={() => {
                                          setSelectedRoutePorts([]);
                                          setPortSearchQuery('');
                                       }} 
                                       className="text-white/40 hover:text-white text-xs"
                                    >
                                       Clear All
                                       </button>
                                 )}
                                    </div>
                                    
                                    {/* Port Selector */}
                                    <div className="space-y-2">
                                       <label className="text-[10px] uppercase font-bold text-white/30 ml-1 tracking-widest">
                                          Select Ports 
                                          {allPorts.length > 0 && (
                                             <span className="text-blue-400 ml-2">({allPorts.length} available)</span>
                                          )}
                                       </label>
                                       
                                       {/* Search Input */}
                                       <div className="relative">
                                          <input 
                                             type="text"
                                             value={portSearchQuery}
                                             onChange={(e) => {
                                                setPortSearchQuery(e.target.value);
                                                setShowPortDropdown(true);
                                             }}
                                             onFocus={() => setShowPortDropdown(true)}
                                             onBlur={() => setTimeout(() => setShowPortDropdown(false), 300)}
                                             placeholder="Click to browse or type to search..."
                                             className="w-full bg-[#0a0e1a] border border-white/10 rounded-xl px-4 py-3 text-sm font-medium focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all placeholder:text-white/20"
                                          />
                                          
                                          {/* Dropdown */}
                                          {showPortDropdown && allPorts.length > 0 && (
                                             <div className="absolute z-50 w-full mt-2 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                                                {(() => {
                                                   const query = portSearchQuery.toLowerCase();
                                                   const filtered = allPorts
                                                      .filter(port => {
                                                         if (!query) return true; // Show all if no query
                                                         return (
                                                            port.name.toLowerCase().includes(query) ||
                                                            port.country.toLowerCase().includes(query) ||
                                                            port.un_locode.toLowerCase().includes(query)
                                                         );
                                                      })
                                                      .filter(port => !selectedRoutePorts.find(sp => sp.un_locode === port.un_locode))
                                                      .slice(0, 15);
                                                   
                                                   if (filtered.length === 0) {
                                                      return (
                                                         <div className="px-4 py-3 text-center text-white/30 text-sm">
                                                            No ports found
                                                         </div>
                                                      );
                                                   }
                                                   
                                                   return filtered.map(port => (
                                                      <button
                                                         key={port.id}
                                                         onClick={() => {
                                                            setSelectedRoutePorts(prev => [...prev, port]);
                                                            setPortSearchQuery('');
                                                            setShowPortDropdown(false);
                                                         }}
                                                         className="w-full px-4 py-3 text-left hover:bg-blue-500/10 border-b border-white/5 last:border-0 transition-colors"
                                                      >
                                                         <div className="flex items-center justify-between">
                                                            <div>
                                                               <span className="font-bold text-sm">{port.name}</span>
                                                               <span className="text-white/40 text-xs ml-2">({port.un_locode})</span>
                                                            </div>
                                                            <span className="text-white/30 text-xs">{port.country}</span>
                                                         </div>
                                                      </button>
                                                   ));
                                                })()}
                                             </div>
                                          )}
                                       </div>
                                       
                                       {/* Selected Ports */}
                                       {selectedRoutePorts.length > 0 && (
                                          <div className="space-y-2">
                                             <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-widest">
                                                <Anchor className="w-3 h-3" />
                                                Selected Route ({selectedRoutePorts.length} ports)
                                             </div>
                                             <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 space-y-2">
                                                {selectedRoutePorts.map((port, idx) => (
                                                   <div key={port.un_locode} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                                                      <div className="flex items-center gap-3">
                                                         <span className="text-white/40 text-xs font-bold">{idx + 1}</span>
                                                         <div>
                                                            <span className="font-bold text-sm">{port.name}</span>
                                                            <span className="text-white/40 text-xs ml-2">({port.un_locode})</span>
                                                         </div>
                                                      </div>
                                                      <button
                                                         onClick={() => setSelectedRoutePorts(prev => prev.filter(p => p.un_locode !== port.un_locode))}
                                                         className="text-red-400 hover:text-red-300 transition-colors"
                                                      >
                                                         <X className="w-4 h-4" />
                                                      </button>
                                                   </div>
                                                ))}
                                                
                                                {/* Route Preview */}
                                          <div className="pt-2 border-t border-white/10 flex items-center gap-2 text-xs flex-wrap">
                                                   <span className="text-white/30">Route:</span>
                                                   {selectedRoutePorts.map((port, idx) => (
                                                      <React.Fragment key={port.un_locode}>
                                                         <span className="font-mono text-white/60">{port.un_locode}</span>
                                                         {idx < selectedRoutePorts.length - 1 && (
                                                            <ChevronRight className="w-3 h-3 text-white/20" />
                                                         )}
                                                      </React.Fragment>
                                                   ))}
                                                </div>
                                             </div>
                                          </div>
                                       )}
                                    </div>
                                    
                              {/* Save as Route - Only show when vessel is available */}
                              {vesselId && selectedRoutePorts.length > 0 && (
                                 <div className="pt-4 border-t border-white/10 space-y-3">
                                    <span className="text-[10px] uppercase font-bold text-white/30 tracking-widest">
                                       Save as Route (Optional)
                                    </span>
                                    <input 
                                       type="text"
                                       value={newRouteName}
                                       onChange={(e) => setNewRouteName(e.target.value)}
                                       placeholder="Route name (e.g., Asia-Europe Express)"
                                       className="w-full bg-[#0a0e1a] border border-white/10 rounded-xl px-4 py-3 text-sm font-medium focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all placeholder:text-white/20"
                                    />
                                    <button 
                                       onClick={handleCreateRoute}
                                       disabled={isCreatingRoute || !newRouteName.trim()}
                                       className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/30 text-white rounded-xl font-bold text-sm transition-all"
                                    >
                                       {isCreatingRoute ? 'Saving...' : 'Save Route'}
                                    </button>
                                 </div>
                              )}
                           </div>
                        </div>
                     </section>

                     {/* Documents on File */}
                     <section className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8">
                        <div className="flex items-center justify-between mb-6">
                           <h3 className="text-lg font-bold flex items-center gap-2">
                              <FileText className="w-5 h-5 text-indigo-500" />
                              Documents on File
                           </h3>
                           <span className="text-white/40 text-sm">{vesselDocuments.length} documents</span>
                        </div>

                        {vesselDocuments.length === 0 ? (
                           <div className="text-center py-12">
                              <FileText className="w-12 h-12 text-white/10 mx-auto mb-4" />
                              <p className="text-white/40 text-sm mb-4">No documents uploaded yet</p>
                              <button 
                                 onClick={() => navigate('/documents')}
                                 className="text-blue-400 hover:text-blue-300 text-sm font-bold"
                              >
                                 Go to Document Upload
                              </button>
                           </div>
                        ) : (
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <DocumentCountCard label="Total Documents" count={vesselDocuments.length} color="indigo" />
                              <DocumentCountCard 
                                 label="Valid" 
                                 count={vesselDocuments.filter(d => {
                                    if (!d.expiry_date) return true;
                                    return new Date(d.expiry_date) > new Date();
                                 }).length} 
                                 color="emerald" 
                              />
                              <DocumentCountCard 
                                 label="Expiring Soon" 
                                 count={vesselDocuments.filter(d => {
                                    if (!d.expiry_date) return false;
                                    const daysUntil = Math.ceil((new Date(d.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
                                    return daysUntil > 0 && daysUntil <= 30;
                                 }).length} 
                                 color="amber" 
                              />
                              <DocumentCountCard 
                                 label="Expired" 
                                 count={vesselDocuments.filter(d => {
                                    if (!d.expiry_date) return false;
                                    return new Date(d.expiry_date) <= new Date();
                                 }).length} 
                                 color="red" 
                              />
                           </div>
                        )}
                     </section>

                     {/* Analysis Results */}
                     {missingDocsResult && (
                        <section className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8">
                           <div className="flex items-center justify-between mb-6">
                              <h3 className="text-lg font-bold flex items-center gap-2">
                                 <ClipboardCheck className="w-5 h-5 text-emerald-500" />
                                 Analysis Results
                              </h3>
                              <span className="text-white/40 text-sm">
                                 Route: {missingDocsResult.route_name}
                              </span>
                           </div>
                           <GapAnalysisReport
                              overallStatus={missingDocsResult.overall_status}
                              complianceScore={missingDocsResult.compliance_score}
                              validDocuments={missingDocsResult.valid_documents}
                              expiringDocuments={missingDocsResult.expiring_soon_documents}
                              expiredDocuments={missingDocsResult.expired_documents}
                              missingDocuments={missingDocsResult.missing_documents}
                              vesselMissingDocuments={missingDocsResult.vessel_missing_documents}
                              cargoMissingDocuments={missingDocsResult.cargo_missing_documents}
                              vesselValidDocuments={missingDocsResult.vessel_valid_documents}
                              cargoValidDocuments={missingDocsResult.cargo_valid_documents}
                              recommendations={missingDocsResult.recommendations}
                           />
                        </section>
                     )}
                  </div>

                  {/* Right Column - Action Panel */}
                  <div className="space-y-6">
                     {/* Run Analysis Card */}
                     <section className="bg-gradient-to-br from-emerald-600/20 to-blue-600/10 border border-emerald-500/20 rounded-[2rem] p-8">
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                           <Search className="w-8 h-8 text-emerald-400" />
                        </div>
                        <h2 className="text-xl font-bold mb-2 text-center">Run Compliance Analysis</h2>
                        <p className="text-white/40 text-sm mb-8 text-center leading-relaxed">
                           AI agents will analyze your documents against route requirements to identify gaps.
                        </p>

                        {analysisError && (
                           <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 flex-shrink-0" />
                              {analysisError}
                           </div>
                        )}

                        <button 
                           onClick={handleRunAnalysis}
                           disabled={(!selectedRoute && selectedRoutePorts.length === 0) || isAnalyzing}
                           className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-white/10 disabled:text-white/30 text-white rounded-2xl font-black tracking-widest uppercase text-sm shadow-xl shadow-emerald-900/40 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                           {isAnalyzing ? (
                              <>
                                 <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                 Analyzing...
                              </>
                           ) : (
                              <>
                                 <Search className="w-4 h-4" />
                                 Run Analysis
                              </>
                           )}
                        </button>

                        {!selectedRoute && selectedRoutePorts.length === 0 && (
                           <p className="text-amber-400/60 text-xs text-center mt-4">
                              Please select a route or add ports for analysis
                           </p>
                        )}
                        {vesselDocuments.length === 0 && (selectedRoute || selectedRoutePorts.length > 0) && (
                           <p className="text-blue-400/60 text-xs text-center mt-4">
                              No documents uploaded yet - analysis will show all required documents
                           </p>
                        )}
                     </section>

                     {/* Analysis Info */}
                     <section className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6">
                        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                           <Info className="w-4 h-4 text-blue-400" />
                           How It Works
                        </h3>
                        <div className="space-y-3 text-sm text-white/50">
                           <div className="flex gap-3">
                              <span className="text-blue-400 font-bold">1.</span>
                              <span>Route Requirements Analyst identifies all required documents</span>
                           </div>
                           <div className="flex gap-3">
                              <span className="text-blue-400 font-bold">2.</span>
                              <span>Gap Detector compares your documents against requirements</span>
                           </div>
                           <div className="flex gap-3">
                              <span className="text-blue-400 font-bold">3.</span>
                              <span>AI generates prioritized recommendations for compliance</span>
                           </div>
                        </div>
                     </section>

                     {/* Quick Stats */}
                     {missingDocsResult && (
                        <section className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-6">
                           <h3 className="text-sm font-bold mb-4">Quick Summary</h3>
                           <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                 <span className="text-white/50 text-sm">Compliance Score</span>
                                 <span className={`font-bold ${
                                    missingDocsResult.compliance_score >= 80 ? 'text-emerald-400' :
                                    missingDocsResult.compliance_score >= 50 ? 'text-amber-400' : 'text-red-400'
                                 }`}>
                                    {missingDocsResult.compliance_score}%
                                 </span>
                              </div>
                              <div className="flex justify-between items-center">
                                 <span className="text-white/50 text-sm">Missing Documents</span>
                                 <span className="font-bold text-red-400">{missingDocsResult.missing_documents.length}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                 <span className="text-white/50 text-sm">Recommendations</span>
                                 <span className="font-bold text-blue-400">{missingDocsResult.recommendations.length}</span>
                              </div>
                           </div>
                        </section>
                     )}
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Upload Modal (Overlay) */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#0a0e1a]/95 backdrop-blur-xl flex items-center justify-center p-6"
          >
             <motion.div 
               initial={{ scale: 0.9, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               exit={{ scale: 0.9, y: 20 }}
               className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] w-full max-w-xl p-10 relative shadow-2xl overflow-hidden"
             >
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-500" />
                
                <button 
                  onClick={() => setShowUploadModal(false)}
                  className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="text-center mb-10">
                   <div className="w-20 h-20 bg-blue-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                      <FileText className="w-10 h-10 text-blue-500" />
                   </div>
                   <h2 className="text-3xl font-bold mb-2">Multi-Document Upload</h2>
                   <p className="text-white/40">Upload your vessel certificates and shipping docs for analysis</p>
                </div>

                {!isParsing ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div
                      onClick={handleDropZoneClick}
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      className="border-2 border-dashed border-white/10 rounded-3xl p-12 text-center hover:border-blue-500/40 hover:bg-blue-500/5 transition-all cursor-pointer group"
                    >
                       <Plus className="w-10 h-10 text-white/20 group-hover:text-blue-500 mx-auto mb-4 transition-all group-hover:scale-110" />
                       <p className="font-bold text-lg mb-1">Drag and Drop Files Here</p>
                       <p className="text-sm text-white/30">Supports PDF, PNG, JPG (Max 50MB per file)</p>
                       <div className="mt-8 flex justify-center gap-2">
                          <FileIcon /> <FileIcon /> <FileIcon />
                       </div>
                    </div>
                    {uploadError && (
                      <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {uploadError}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12 px-6">
                    <div className="flex justify-between items-center mb-4">
                       <span className="text-blue-400 font-bold uppercase tracking-widest text-xs animate-pulse">Analyzing Documents...</span>
                       <span className="text-white/60 font-mono">{uploadProgress}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                       <motion.div 
                         animate={{ width: `${uploadProgress}%` }}
                         className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)]"
                       />
                    </div>
                    <div className="mt-8 space-y-4">
                       <ParsingStep label="Extracting Vessel Metadata" active={uploadProgress > 20} completed={uploadProgress > 50} />
                       <ParsingStep label="Cross-checking Voyage Plan" active={uploadProgress > 50} completed={uploadProgress > 80} />
                       <ParsingStep label="Validating Compliance HS-Codes" active={uploadProgress > 80} completed={uploadProgress === 100} />
                    </div>
                  </div>
                )}
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-components ---

function TabButton({ active, onClick, label, icon }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
        active 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
          : 'text-white/40 hover:text-white/70 bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/5'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MetricCard({ title, value, icon, subText }) {
  return (
    <div className="p-6 bg-[#0f172a]/40 border border-white/5 rounded-3xl backdrop-blur-sm group hover:border-blue-500/30 transition-all">
      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/30 mb-1">{title}</p>
      <h3 className="text-3xl font-black text-white/90 mb-2">{value}</h3>
      <p className="text-[10px] font-medium text-white/20 group-hover:text-blue-500/60 transition-colors uppercase">{subText}</p>
    </div>
  );
}

function DetailBox({ label, value, color }) {
  return (
    <div>
      <p className="text-[10px] uppercase font-bold text-white/20 mb-1 tracking-widest">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}

function StatusButton({ label }) {
  return (
    <button className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-bold text-white/60 transition-all hover:text-white">
      {label}
    </button>
  );
}

function FormSection({ title, icon, children }) {
  return (
    <section className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8">
       <h3 className="text-lg font-bold mb-8 flex items-center gap-2">
          <span className="text-blue-500">{icon}</span>
          {title}
       </h3>
       {children}
    </section>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="space-y-2">
       <label className="text-[10px] uppercase font-bold text-white/30 ml-1 tracking-widest">{label}</label>
       <input 
         type={type}
         value={value}
         onChange={(e) => onChange(e.target.value)}
         placeholder={placeholder}
         className="w-full bg-[#0a0e1a] border border-white/10 rounded-xl px-4 py-3 text-sm font-medium focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all placeholder:text-white/10"
       />
    </div>
  );
}

function AnalysisPoint({ label, status, alert }) {
  return (
    <div className="flex justify-between items-center py-2">
       <span className="text-sm font-medium text-white/60">{label}</span>
       <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full border ${alert ? 'border-amber-500/30 bg-amber-500/10 text-amber-500' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'}`}>
          {status}
       </span>
    </div>
  );
}

function FileIcon() {
  return <div className="w-8 h-8 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-white/20"><FileText className="w-4 h-4" /></div>;
}

function ParsingStep({ label, active, completed }) {
  return (
    <div className="flex items-center gap-4 py-1">
       {completed ? (
         <CheckCircle2 className="w-5 h-5 text-emerald-500" />
       ) : active ? (
         <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
       ) : (
         <div className="w-5 h-5 border-2 border-white/10 rounded-full" />
       )}
       <span className={`text-sm font-medium ${completed ? 'text-white/90' : active ? 'text-white' : 'text-white/20'}`}>{label}</span>
    </div>
  );
}

function DocumentCountCard({ label, count, color }) {
  const colorClasses = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };
  
  return (
    <div className={`p-4 rounded-2xl border ${colorClasses[color] || colorClasses.blue} text-center`}>
      <div className="text-2xl font-black">{count}</div>
      <div className="text-[10px] uppercase font-bold tracking-wider opacity-70 mt-1">{label}</div>
    </div>
  );
}
