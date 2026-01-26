import React, { useState, useEffect } from 'react';
import { useUser, useAuth, SignOutButton } from '@clerk/clerk-react';
import { DashboardCharts } from '../components/admin/DashboardCharts';

export function AdminPage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [backendData, setBackendData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getToken();
        const headers = {
            Authorization: `Bearer ${token}`,
            'X-User-Email': user?.primaryEmailAddress?.emailAddress || ''
        };

        // 1. Check Auth & Whitelist
        const res = await fetch('http://localhost:8000/api/protected', { headers });
        if (res.ok) {
           const data = await res.json();
           setBackendData(data);
           
           // 2. If Admin, fetch Analytics
           if (data.is_admin) {
              const analyticsRes = await fetch('http://localhost:8000/api/analytics/dashboard', { headers });
              if (analyticsRes.ok) {
                  const analytics = await analyticsRes.json();
                  setAnalyticsData(analytics);
              }
           }
        } else {
           setBackendData({ error: `Error: ${res.status}` });
        }
      } catch (err) {
        setBackendData({ error: err.message });
      }
    };
    if (isLoaded && user) {
      fetchData();
    }
  }, [isLoaded, user, getToken]);

  if (!isLoaded) return <div>Loading...</div>;

  // Access Control Check
  if (backendData && backendData.is_admin === false) {
      // ... (Access Denied View - Keep existing)
      return (
        <div style={{ 
          color: 'white', 
          height: '100vh', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: '#0f172a',
          flexDirection: 'column'
        }}>
            <h1>Access Denied</h1>
            <p>You are not an administrator.</p>
            <p className="text-gray-400 mt-2">Current Email: {user?.primaryEmailAddress?.emailAddress}</p>
            <div style={{ marginTop: '20px' }}>
             <SignOutButton>
               <button style={{
                 padding: '10px 20px',
                 backgroundColor: '#334155',
                 color: 'white',
                 border: 'none',
                 borderRadius: '4px',
                 cursor: 'pointer'
               }}>
                 Sign Out
               </button>
             </SignOutButton>
            </div>
        </div>
      )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
                    Admin Analytics Dashboard
                </h1>
                <p className="text-slate-400 mt-1">Real-time monitoring of user activity and token consumption</p>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                    <p className="font-semibold">{user?.fullName || user?.firstName}</p>
                    <p className="text-xs text-slate-500">Administrator</p>
                </div>
                <SignOutButton>
                    <button className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded text-sm font-medium transition-colors">
                        Sign Out
                    </button>
                </SignOutButton>
            </div>
        </header>
      
        {/* Analytics Section */}
        {analyticsData ? (
            <DashboardCharts data={analyticsData} />
        ) : (
            <div className="flex items-center justify-center h-64">
                <div className="text-cyan-500 animate-pulse text-lg">Loading Analytics Data...</div>
            </div>
        )}

        {/* System Status (Optimized UI) */}
        <div className="mt-12 p-6 bg-slate-800/50 rounded-xl border border-slate-700 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4 border-b border-slate-700 pb-3">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </div>
                <h3 className="text-lg font-semibold text-slate-200">System Connection Status</h3>
                <span className="ml-auto px-2 py-1 text-xs font-mono rounded bg-slate-900 text-emerald-400 border border-emerald-900/50">
                    ONLINE
                </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div>
                    <p className="text-slate-500 uppercase text-xs tracking-wider font-bold mb-2">Authentication</p>
                    <div className="space-y-2">
                        <StatusRow label="Identity Provider" value="Clerk Auth" />
                        <StatusRow label="Auth Type" value="Bearer JWT" />
                        <StatusRow label="User Email" value={backendData?.email} highlight />
                        <StatusRow 
                            label="Role" 
                            value={backendData?.is_admin ? "Administrator" : "User"} 
                            badge={backendData?.is_admin ? "bg-purple-500/20 text-purple-300" : "bg-slate-700 text-slate-300"} 
                        />
                    </div>
                </div>
                
                <div>
                    <p className="text-slate-500 uppercase text-xs tracking-wider font-bold mb-2">Session Details</p>
                    <div className="space-y-2">
                        <StatusRow label="User ID" value={backendData?.user_id} fontMono />
                        <StatusRow label="Session ID" value={backendData?.claims?.sid} fontMono />
                        <StatusRow label="Issuer" value={backendData?.claims?.iss?.substring(0, 30) + "..."} fontMono truncate />
                        <StatusRow label="Issued At" value={new Date(backendData?.claims?.iat * 1000).toLocaleString()} />
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, value, highlight, badge, fontMono, truncate }) {
    if (!value) return null;
    return (
        <div className="flex justify-between items-center py-1 border-b border-slate-700/50 last:border-0 hover:bg-slate-700/30 px-2 rounded -mx-2 transition-colors">
            <span className="text-slate-400">{label}</span>
            {badge ? (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge}`}>{value}</span>
            ) : (
                <span className={`text-slate-200 ${highlight ? 'text-cyan-400 font-medium' : ''} ${fontMono ? 'font-mono text-xs' : ''} ${truncate ? 'truncate max-w-[200px]' : ''}`}>
                    {value}
                </span>
            )}
        </div>
    );
}
