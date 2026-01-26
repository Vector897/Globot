import React, { useState, useEffect, useRef } from 'react';
import { useUser, SignOutButton } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { 
  Home, 
  Zap, 
  Clock, 
  Shield, 
  ArrowLeft, 
  Database, 
  CreditCard,
  History,
  TrendingUp,
  Activity,
  Ship,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ChevronRight,
  ClipboardCheck,
  Package,
  MapPin,
  Calendar,
  Layers,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function UsersHome() {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  
  // --- States ---
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'vessel'
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
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

  const simulateFileUpload = async (files) => {
    setIsParsing(true);
    setUploadProgress(0);
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    // Wait for "Parsing"
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Auto-fill mock data extracted from the document
    setShipData({
      vesselName: 'COSCO SHIPPING NEBULA',
      callSign: 'VRAB2',
      imoNumber: '9876543',
      mmsiCode: '477123456',
      flag: 'Hong Kong, China',
      vesselType: 'Ultra Large Container Vessel (ULCV)',
      originalVoyage: '045W (via Suez)',
      newVoyage: '045W (via Good Hope)',
      portOfLoading: 'Shanghai Yangshan (CNYSN)',
      portOfDischarge: 'Rotterdam Gateway (NLRTM)',
      etaOriginal: '2026-02-22',
      etaNew: '2026-03-08',
      cargoName: 'Smartwatch Components',
      hsCode: '8517.7900',
      dgClass: 'Class 9, UN 3481',
      weight: '12,500 KGS',
      volume: '45 CBM'
    });

    setIsParsing(false);
    setShowUploadModal(false);
    setActiveTab('vessel');
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
          {activeTab === 'overview' ? (
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
          ) : (
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
                  <div 
                    onClick={() => simulateFileUpload()}
                    className="border-2 border-dashed border-white/10 rounded-3xl p-12 text-center hover:border-blue-500/40 hover:bg-blue-500/5 transition-all cursor-pointer group"
                  >
                     <Plus className="w-10 h-10 text-white/20 group-hover:text-blue-500 mx-auto mb-4 transition-all group-hover:scale-110" />
                     <p className="font-bold text-lg mb-1">Drag and Drop Files Here</p>
                     <p className="text-sm text-white/30">Support PDF, TXT, JPG (Max 50MB per file)</p>
                     <div className="mt-8 flex justify-center gap-2">
                        <FileIcon /> <FileIcon /> <FileIcon />
                     </div>
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
