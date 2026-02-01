import { useState, useEffect, useRef } from 'react';
import { Plus, Eye, Globe, Activity, TrendingUp, X, AlertTriangle, Shield, CheckCircle, Server, Layout, BarChart3, Trash2, Zap, Play, Square, Terminal, ShieldAlert, Cpu, Bug, RotateCcw, ShieldCheck } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { useSocket } from '../context/SocketContext'; 
import axios from 'axios';

// --- 1. CONFIGURATION ---
const PATTERN_MAP: Record<string, string> = {
  'E-commerce': 'sine', 'API': 'spiky', 'Blog': 'flat', 'Corporate': 'flat', 'Gaming': 'spiky'
};

const LOG_STEPS = [
    "⚠️ ANOMALY DETECTED: Volumetric Spike (L7 Flood)",
    "🛡️ AI CORE: Analyzing Packet Signatures...",
    "🔒 FIREWALL: Applying Rate Limiting Rules...",
    "🚫 MITIGATION: Blocking Malicious IPs...",
    "⚡ NETWORK: Rerouting Valid Traffic...",
    "✅ SYSTEM: Attack Traffic Dropped. Service Recovering...",
    "♻️ MONITORING: Server Healthy. Shield Holding..."
];

const CYCLE_LOGS = [
    "🛡️ MITIGATION ACTIVE: Dropping Packets...",
    "✨ SERVER STABLE: 100% Availability",
    "🔒 FIREWALL: Blocking 5k+ IPs",
    "⚡ TRAFFIC ANALYSIS: DDoS Pattern Matched"
];

// --- 2. HELPER FUNCTIONS ---
const generateUniqueHistory = (siteId: string, category: string = 'Blog', baseTraffic: number = 500) => {
  const history = [];
  const now = new Date();
  const currentHour = now.getHours();
  const pattern = PATTERN_MAP[category] || 'flat';
  const volatility = baseTraffic * 0.3; 

  for (let i = 11; i >= 0; i--) {
    let hourVal = currentHour - (i * 2);
    if (hourVal < 0) hourVal += 24;
    const label = `${hourVal.toString().padStart(2, '0')}:00`;
    let traffic = baseTraffic;
    if (pattern === 'sine') traffic += (Math.sin((hourVal - 6) * (Math.PI / 12)) * volatility); 
    else if (pattern === 'spiky') traffic += Math.random() > 0.7 ? volatility * 1.5 : 0;
    else traffic += (Math.random() * volatility) - (volatility / 2);
    traffic = Math.max(50, Math.floor(traffic));
    const isPastAttack = (Math.random() < 0.15) && (i === 4); 
    if (isPastAttack) traffic = traffic * 8; 
    history.push({ time: label, requests: Math.max(50, Math.floor(traffic)), isAttack: isPastAttack });
  }
  return history;
};

const CustomizedDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (payload && payload.isAttack) {
    return (
      <svg x={cx - 10} y={cy - 10} width={20} height={20} viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="8" fill="#ef4444" fillOpacity="0.4"><animate attributeName="r" from="4" to="10" dur="1s" repeatCount="indefinite" /><animate attributeName="opacity" from="1" to="0" dur="1s" repeatCount="indefinite" /></circle>
        <circle cx="10" cy="10" r="4" fill="#ef4444" stroke="white" strokeWidth="2" />
      </svg>
    );
  }
  return null;
};

// --- 3. MAIN COMPONENT ---
export function Websites() {
  const { websiteStats, isConnected } = useSocket();
  const [historyMap, setHistoryMap] = useState<Record<string, any[]>>({});
  
  // UI States
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string | null>(null); 
  const [blockedIPs, setBlockedIPs] = useState<string[]>([]);
  
  // SIMULATION STATES
  const [isSimulationPanelOpen, setIsSimulationPanelOpen] = useState(false);
  const [attackState, setAttackState] = useState<'idle' | 'attacking' | 'normal'>('idle');
  const [consoleLogs, setConsoleLogs] = useState<any[]>([]);
  const [simulatedMetrics, setSimulatedMetrics] = useState({ requests: 0, errorRate: 0, latency: 0 });
  const [formData, setFormData] = useState({ name: '', category: 'E-commerce', tier: 'startup' });

  // REFS FOR INTERVAL SAFETY
  const attackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const logIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Data Lookup
  const liveSelectedWebsite = websiteStats.find(w => w.id === selectedWebsiteId);

  // Auto-scroll
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [consoleLogs]);

  // SYNC LOGIC (Flicker Proof)
  useEffect(() => {
    if (websiteStats.length === 0) return;
    setHistoryMap((prev) => {
      const newMap = { ...prev };
      websiteStats.forEach((site: any) => {
        // OVERRIDE: If we are simulating THIS site, ignore backend status completely
        const isSimulatingThis = (attackState !== 'idle') && (selectedWebsiteId === site.id);
        
        if (!newMap[site.id]) newMap[site.id] = generateUniqueHistory(site.id, site.category, site.baseTraffic);
        else {
          const history = [...newMap[site.id]];
          // Use simulated metrics if simulating, otherwise backend data
          const requests = isSimulatingThis ? simulatedMetrics.requests : site.requests;
          // Force red dot only if attacking
          const isAttack = isSimulatingThis ? (attackState === 'attacking') : (site.status === 'critical');

          history[history.length - 1] = { 
            ...history[history.length - 1], 
            requests: requests, 
            isAttack: isAttack
          };
          newMap[site.id] = history;
        }
      });
      return newMap;
    });
  }, [websiteStats, attackState, selectedWebsiteId, simulatedMetrics]);

  // IP BLOCKER PERSISTENCE
  useEffect(() => {
    const isForceAttack = attackState === 'attacking' && liveSelectedWebsite;
    if (liveSelectedWebsite && (liveSelectedWebsite.status === 'critical' || isForceAttack)) {
        setBlockedIPs(prev => {
            if (!liveSelectedWebsite.sourceIP || prev[0] === liveSelectedWebsite.sourceIP) return prev;
            return [liveSelectedWebsite.sourceIP, ...prev].slice(0, 50);
        });
    }
  }, [liveSelectedWebsite, attackState]);

  // CLEANUP FUNCTION (CRITICAL FOR PREVENTING CRASHES)
  const stopAllSimulation = () => {
      if (attackIntervalRef.current) clearInterval(attackIntervalRef.current);
      if (logIntervalRef.current) clearInterval(logIntervalRef.current);
      attackIntervalRef.current = null;
      logIntervalRef.current = null;
      setAttackState('idle');
  };

  const handleCloseModal = () => {
      stopAllSimulation();
      setIsSimulationPanelOpen(false);
      setSelectedWebsiteId(null);
      setConsoleLogs([]); // Safe to clear here
  };

  // HANDLERS
  const handleAddWebsite = async () => {
    if (!formData.name.trim()) return;
    const baseTraffic = formData.tier === 'enterprise' ? 5000 : formData.tier === 'scaleup' ? 1000 : 100;
    try {
      await axios.post('http://localhost:3001/api/add-website', { name: formData.name, category: formData.category, baseTraffic });
      setShowAddModal(false);
    } catch (e) { console.error(e); }
  };

  const handleDeleteWebsite = async (id: string) => {
    if(!confirm("Are you sure?")) return;
    try { await axios.delete(`http://localhost:3001/api/delete-website/${id}`); setSelectedWebsiteId(null); } catch (e) { console.error(e); }
  };

  // --- SAFE SIMULATION LOGIC ---

  // 1. NORMAL TRAFFIC TOGGLE
  const handleToggleNormal = () => {
      if (attackState === 'normal') {
          stopAllSimulation();
          setConsoleLogs(prev => [...prev, { id: `log-stop-${Date.now()}`, time: new Date().toLocaleTimeString(), text: "🟢 SIMULATION STOPPED." }]);
          return;
      }

      stopAllSimulation(); 
      setAttackState('normal');
      setConsoleLogs(prev => [...prev, { id: `log-start-norm-${Date.now()}`, time: new Date().toLocaleTimeString(), text: "🟢 GENERATING NORMAL TRAFFIC..." }]);

      attackIntervalRef.current = setInterval(() => {
          setSimulatedMetrics({
              requests: 250 + Math.floor(Math.random() * 150),
              errorRate: 0,
              latency: 45 + Math.floor(Math.random() * 20)
          });
      }, 1000);
  };

  // 2. ATTACK TRAFFIC TOGGLE
  const handleToggleAttack = () => {
      if (attackState === 'attacking') {
          stopAllSimulation();
          setConsoleLogs(prev => [...prev, { id: `log-stop-atk-${Date.now()}`, time: new Date().toLocaleTimeString(), text: "🛑 ATTACK STOPPED." }]);
          return;
      }
      if (!liveSelectedWebsite) return;

      stopAllSimulation(); 
      setAttackState('attacking');
      setConsoleLogs(prev => [...prev, { id: `log-start-atk-${Date.now()}`, time: new Date().toLocaleTimeString(), text: `🚀 INITIATING LOAD TEST...` }]);

      let attackTime = 0;
      
      // Traffic Simulation
      attackIntervalRef.current = setInterval(() => {
        attackTime += 1000;
        const isMitigated = attackTime > 4000;

        setSimulatedMetrics({
            requests: 6500 + Math.floor(Math.random() * 500),
            errorRate: isMitigated ? 0.01 : 0.85,
            latency: isMitigated ? 120 : 980
        });

        // Backend Hit (Optional, but keeps things synced)
        axios.post('http://localhost:3001/api/traffic-log', {
          websiteId: liveSelectedWebsite.id, name: liveSelectedWebsite.name, requests: 6500, 
          errorRate: isMitigated ? 0.01 : 0.8,
          latency: isMitigated ? 120 : 950,
          sourceIP: "10.0.0.1" 
        }).catch(() => {}); // Catch errors to prevent crash
      }, 1000); 

      // Story Log Simulation
      let stepIndex = 0;
      logIntervalRef.current = setInterval(() => {
        const time = new Date().toLocaleTimeString();
        if (stepIndex < LOG_STEPS.length) {
            const msg = LOG_STEPS[stepIndex];
            setConsoleLogs(prev => [...prev, { id: `story-${Date.now()}-${Math.random()}`, time, text: msg }]);
            stepIndex++;
        } else {
            const msg = CYCLE_LOGS[Math.floor(Math.random() * CYCLE_LOGS.length)];
            setConsoleLogs(prev => [...prev, { id: `cycle-${Date.now()}-${Math.random()}`, time, text: msg }]);
        }
      }, 1500);
  };

  const handleResetLogs = () => {
      setConsoleLogs([]);
      stopAllSimulation();
  };

  // --- UI HELPERS ---
  const displayRequests = (attackState !== 'idle') ? simulatedMetrics.requests : (liveSelectedWebsite?.requests || 0);
  const displayErrorRate = (attackState !== 'idle') ? simulatedMetrics.errorRate : (liveSelectedWebsite?.errorRate || 0);
  const displayLatency = (attackState !== 'idle') ? simulatedMetrics.latency : (liveSelectedWebsite?.latency || 0);
  const displayIsCritical = (attackState === 'attacking') || (liveSelectedWebsite?.status === 'critical');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 p-4 md:p-8 relative">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div><h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Protected Websites</h1><p className="text-gray-600">Monitor and manage your web properties</p></div>
        <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-full text-sm font-medium border ${isConnected ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>{isConnected ? '● System Live' : '○ Disconnected'}</div>
            <button onClick={() => setShowAddModal(true)} className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-xl shadow-lg shadow-red-200 transition-all font-medium">
                <Plus className="w-5 h-5" /> <span className="hidden sm:inline">Add Website</span>
            </button>
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {websiteStats.map((website) => {
             const isSimulatingThis = (attackState === 'attacking' && selectedWebsiteId === website.id);
             const isAttack = website.status === 'critical' || isSimulatingThis;
             return (
            <motion.div key={website.id} layout className={`bg-white border-2 ${isAttack ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-gray-200'} rounded-2xl p-6 transition-all relative group hover:shadow-xl`}>
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl ${isAttack ? 'bg-red-100' : 'bg-blue-100'} flex items-center justify-center border-2 border-transparent`}>{isAttack ? <AlertTriangle className="w-6 h-6 text-red-600 animate-pulse" /> : <Globe className="w-6 h-6 text-blue-600" />}</div>
                        <div><h3 className="text-lg font-bold text-gray-900">{website.name}</h3><p className="text-sm text-gray-500">https://{website.name}</p></div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${isAttack ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'}`}>{isAttack ? 'CRITICAL' : website.status}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div><p className="text-xs text-gray-500 font-semibold uppercase">Requests</p><p className="text-xl font-bold">{website.requests.toLocaleString()}</p></div>
                    <div><p className="text-xs text-gray-500 font-semibold uppercase">Error Rate</p><p className={`text-xl font-bold ${(website.errorRate * 100) > 5 ? 'text-amber-500' : 'text-green-500'}`}>{(website.errorRate * 100).toFixed(1)}%</p></div>
                    <div><p className="text-xs text-gray-500 font-semibold uppercase">Latency</p><p className="text-xl font-bold">{website.latency}ms</p></div>
                </div>
                <button onClick={() => { setSelectedWebsiteId(website.id); setBlockedIPs([]); }} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl border-2 border-gray-200 font-medium"><Eye className="w-4 h-4" /> View Live Monitor</button>
            </motion.div>
            );
        })}
      </div>

      {/* MONITOR MODAL */}
      <AnimatePresence>
        {liveSelectedWebsite && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={handleCloseModal}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
              
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-3xl font-bold flex items-center gap-3">
                    {liveSelectedWebsite?.name} 
                    {displayIsCritical && <span className="text-sm px-3 py-1 bg-red-100 text-red-600 rounded-full border border-red-200 animate-pulse">🔥 Attack Active</span>}
                 </h2>
                 <div className="flex gap-2"><button onClick={() => handleDeleteWebsite(liveSelectedWebsite!.id)} className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"><Trash2 className="w-5 h-5" /></button><button onClick={handleCloseModal} className="p-2 text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button></div>
              </div>

              {/* STATS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-5"><Activity className="w-5 h-5 text-blue-600 mb-2" /><span className="text-sm font-bold text-gray-700">Traffic Load</span><p className="text-3xl font-bold text-gray-900">{displayRequests.toLocaleString()}</p></div>
                <div className={`border-2 rounded-2xl p-5 ${displayIsCritical ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}><TrendingUp className={`w-5 h-5 mb-2 ${displayIsCritical ? 'text-red-600' : 'text-amber-600'}`} /><span className="text-sm font-bold text-gray-700">Error Rate</span><p className="text-3xl font-bold text-gray-900">{(displayErrorRate * 100).toFixed(1)}%</p></div>
                <div className="bg-gray-50 border-2 border-gray-100 rounded-2xl p-5"><Server className="w-5 h-5 text-gray-600 mb-2" /><span className="text-sm font-bold text-gray-700">Latency</span><p className="text-3xl font-bold text-gray-900">{displayLatency} ms</p></div>
              </div>

              {/* GRAPH */}
              <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-6 mb-6">
                 <div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={historyMap[liveSelectedWebsite.id] || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="time" /><YAxis /><Tooltip /><Line type="monotone" dataKey="requests" stroke={displayIsCritical ? '#ef4444' : '#3b82f6'} strokeWidth={3} dot={<CustomizedDot />} /></LineChart></ResponsiveContainer></div>
              </div>

              {/* LOGS */}
              <div className={`border-2 rounded-2xl p-6 mb-20 ${displayIsCritical ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                 <h4 className={`font-bold text-lg mb-4 ${displayIsCritical ? 'text-red-800' : 'text-gray-700'}`}><Shield className="w-5 h-5" /> Mitigation Logs</h4>
                 <div className="space-y-2 max-h-48 overflow-y-auto">
                    {blockedIPs.length > 0 ? blockedIPs.map((ip, i) => (<div key={i} className="bg-white p-3 rounded-lg border border-red-100 flex justify-between items-center shadow-sm"><div className="flex items-center gap-3"><span className="text-red-500 font-bold text-sm">⛔ BLOCKED</span><span className="font-mono text-gray-700">{ip}</span></div><span className="text-xs text-gray-400">DDoS Signature</span></div>)) : <div className="text-center py-6 text-gray-400"><CheckCircle className="w-12 h-12 mb-2 text-green-500/20" /><p>No active threats detected.</p></div>}
                 </div>
              </div>

              {/* PER-WEBSITE FAB */}
              <button 
                onClick={() => setIsSimulationPanelOpen(!isSimulationPanelOpen)} 
                className={`fixed bottom-8 right-8 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 z-50 border-4 border-white ${isSimulationPanelOpen ? 'bg-slate-800' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {isSimulationPanelOpen ? <X size={28} className="text-white"/> : <Bug size={28} className="fill-current text-white" />}
              </button>

              {/* SIMULATION POPUP */}
              <AnimatePresence>
                {isSimulationPanelOpen && (
                    <motion.div 
                        initial={{ y: 20, opacity: 0 }} 
                        animate={{ y: 0, opacity: 1 }} 
                        exit={{ y: 20, opacity: 0 }}
                        className="fixed bottom-28 right-8 w-[450px] bg-white border-2 border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col"
                    >
                        <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2"><Terminal size={18} className="text-emerald-400"/> Traffic Simulator</h3>
                            <div className={`text-[10px] px-2 py-1 rounded font-mono ${attackState === 'attacking' ? 'bg-red-500 animate-pulse' : attackState === 'normal' ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                {attackState === 'attacking' ? 'LIVE ATTACK' : attackState === 'normal' ? 'NORMAL LOAD' : 'IDLE'}
                            </div>
                        </div>
                        
                        <div className="p-3 bg-gray-50 border-b border-gray-200 grid grid-cols-3 gap-2">
                            <button onClick={handleToggleNormal} className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all shadow-sm ${attackState === 'normal' ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-white border-gray-200 hover:border-emerald-500 hover:text-emerald-600'}`}>
                                <ShieldCheck size={20} className="mb-1"/> <span className="text-[10px] font-bold uppercase">{attackState === 'normal' ? 'Stop' : 'Normal'}</span>
                            </button>
                            <button onClick={handleToggleAttack} className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all shadow-sm ${attackState === 'attacking' ? 'bg-red-50 border-red-500 text-red-600' : 'bg-white border-gray-200 hover:border-red-500 hover:text-red-600'}`}>
                                <Zap size={20} className="mb-1"/> <span className="text-[10px] font-bold uppercase">{attackState === 'attacking' ? 'Stop' : 'Attack'}</span>
                            </button>
                            <button onClick={handleResetLogs} className="flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-gray-200 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm">
                                <RotateCcw size={20} className="mb-1"/> <span className="text-[10px] font-bold uppercase">Reset</span>
                            </button>
                        </div>

                        <div className="bg-[#0f172a] p-4 h-56 overflow-y-auto font-mono text-[11px] space-y-2 custom-scrollbar" ref={scrollRef}>
                            {consoleLogs.length === 0 && <div className="text-slate-600 italic text-center mt-16 opacity-50">Console Ready. Select an action above.</div>}
                            {consoleLogs.map((log) => (
                                <div key={log.id} className="flex gap-2 border-b border-slate-800/50 pb-1">
                                    <span className="text-slate-500 shrink-0">[{log.time}]</span>
                                    <span className={log.text.includes("🛑") ? "text-blue-400 font-bold" : log.text.includes("🚀") ? "text-amber-400 font-bold" : "text-emerald-400"}>
                                        {log.text}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* ADD MODAL */}
      <AnimatePresence>
        {showAddModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
                <motion.div className="bg-white p-8 rounded-3xl max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6"><h3 className="text-2xl font-bold text-gray-900">Add New Property</h3><button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button></div>
                    <div className="mb-5"><label className="block text-sm font-bold text-gray-700 mb-2">Domain Name</label><input className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl outline-none focus:border-red-500 transition-colors" placeholder="example.com" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <select className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl outline-none focus:border-red-500" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}><option value="E-commerce">E-commerce</option><option value="API">API</option><option value="Blog">Blog</option><option value="Gaming">Gaming</option></select>
                        <select className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl outline-none focus:border-red-500" value={formData.tier} onChange={e => setFormData({...formData, tier: e.target.value})}><option value="startup">Startup</option><option value="scaleup">Scale-Up</option><option value="enterprise">Enterprise</option></select>
                    </div>
                    <button onClick={handleAddWebsite} className="w-full bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-red-200 transition-all">Deploy Protection</button>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}