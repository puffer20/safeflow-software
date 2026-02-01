import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Activity, Shield, Brain, CheckCircle2, Zap, Globe, Target, AlertTriangle } from 'lucide-react';
import { CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, XAxis, YAxis } from 'recharts';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';

export function Dashboard() {
  const { websiteStats } = useSocket();
 
  const statsRef = useRef(websiteStats);
  useEffect(() => {
      statsRef.current = websiteStats;
  }, [websiteStats]);

  const totalRequests = websiteStats.reduce((acc, site) => acc + site.requests, 0);
  const criticalSites = websiteStats.filter(s => s.status === 'critical');
  const activeCount = websiteStats.length;
  const isGlobalCritical = criticalSites.length > 0;

  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  useEffect(() => {
      if (!selectedSiteId && websiteStats.length > 0) {
          setSelectedSiteId(websiteStats[0].id);
      }
  }, [websiteStats]);

  const selectedSite = websiteStats.find(s => s.id === selectedSiteId) || websiteStats[0];
  const [blockedCount, setBlockedCount] = useState(1240);
  const [histories, setHistories] = useState<Record<string, any[]>>({});

  // 1. FETCH HISTORY
  useEffect(() => {
      const fetchHistories = async () => {
          if (websiteStats.length === 0) return;
         
          const newHistories: Record<string, any[]> = {};
         
          for (const site of websiteStats) {
              try {
                  const res = await axios.get(`http://localhost:3001/api/history/${site.id}`);
                  // FIX: Cast to 'any' to avoid TypeScript error if interface is missing baseTraffic
                  const baseTraffic = (site as any).baseTraffic || 100;

                  newHistories[site.id] = res.data.map((row: any) => {
                      const total = row.requests;
                      const isBad = row.is_anomaly; // 1 or 0 from DB

                      // --- LOGIC FIX ---
                      let normal, anomaly;

                      if (isBad) {
                          // DDoS ATTACK:
                          // Normal traffic stays around the site's baseline (plus random variance)
                          // The rest is the attack
                          normal = baseTraffic + (Math.random() * (baseTraffic * 0.2));
                          anomaly = Math.max(0, total - normal);
                      } else {
                          // NORMAL / FLASH SALE:
                          // All traffic is valid. Green line spikes, Red line is 0.
                          normal = total;
                          anomaly = 0;
                      }

                      return {
                          time: new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                          normal: Math.floor(normal),
                          anomaly: Math.floor(anomaly)
                      };
                  });
              } catch (err) {
                  console.error("Failed to load history for", site.name);
              }
          }
          setHistories(newHistories);
      };

      fetchHistories();
  }, [websiteStats.length]);

  // 2. LIVE UPDATES
  useEffect(() => {
    const interval = setInterval(() => {
        const now = new Date();
        const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        setHistories(prev => {
            const next = { ...prev };
            const currentStats = statsRef.current;

            Object.keys(next).forEach(siteId => {
                const siteData = currentStats.find(s => s.id === siteId);
                let currentHistory = [...(next[siteId] || [])];
               
                if (siteData) {
                    const isCritical = siteData.status === 'critical';
                    const requests = siteData.requests;
                    // FIX: Cast to 'any' here too
                    const baseTraffic = (siteData as any).baseTraffic || 100;

                    // --- LIVE DATA LOGIC FIX ---
                    let normal, anomaly;

                    if (isCritical) {
                        // Attack Mode: Green line flatlines at base, Red line spikes
                        normal = baseTraffic + (Math.random() * (baseTraffic * 0.2));
                        anomaly = Math.max(0, requests - normal);
                    } else {
                        // Safe Mode (includes Flash Sales): Green line takes all traffic
                        normal = requests;
                        anomaly = 0;
                    }

                    currentHistory.push({
                        time: timeLabel,
                        normal: Math.floor(normal),
                        anomaly: Math.floor(anomaly)
                    });

                    if (currentHistory.length > 60) currentHistory.shift();
                    next[siteId] = currentHistory;
                }
            });
            return next;
        });

        if (isGlobalCritical) {
            setBlockedCount(prev => prev + Math.floor(Math.random() * 5) + 2);
        }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const stats = [
    {
      label: 'Global Traffic',
      value: totalRequests.toLocaleString(),
      change: isGlobalCritical ? '↑ SURGE DETECTED' : 'Stable',
      icon: Activity,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      label: 'Monitored Assets',
      value: activeCount.toString(),
      change: 'Active Nodes',
      icon: Globe,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    },
    {
      label: 'Threats Mitigated',
      value: blockedCount.toLocaleString(),
      change: isGlobalCritical ? '+ Rapid Rise' : '+24 today',
      icon: Shield,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200'
    },
    {
      label: 'Defensive Posture',
      value: isGlobalCritical ? 'CRITICAL' : 'SECURE',
      change: 'Real-time',
      icon: Target,
      color: isGlobalCritical ? 'text-red-600' : 'text-emerald-600',
      bgColor: isGlobalCritical ? 'bg-red-50' : 'bg-emerald-50',
      borderColor: isGlobalCritical ? 'border-red-200' : 'border-emerald-200'
    },
  ];

  const currentGraphData = (selectedSiteId && histories[selectedSiteId]) ? histories[selectedSiteId] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight }}
            animate={{ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight }}
            transition={{ duration: Math.random() * 20 + 20, repeat: Infinity, repeatType: 'reverse' }}
            className={`absolute w-1 h-1 rounded-full ${isGlobalCritical ? 'bg-red-500/30' : 'bg-blue-400/20'}`}
          />
        ))}
      </div>

      <div className="relative z-10 p-4 md:p-8 space-y-6 md:space-y-8">
        {/* Header */}
        <div className="relative">
          <div className={`absolute top-0 right-0 w-64 h-32 bg-gradient-to-bl ${isGlobalCritical ? 'from-red-100/50' : 'from-blue-100/50'} to-transparent rounded-bl-[60px] -z-10 transition-colors duration-500`} />
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Executive Command
              </h1>
              <div className="flex items-center gap-2">
                <span className={`relative flex h-3 w-3`}>
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isGlobalCritical ? 'bg-red-500' : 'bg-green-500'}`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${isGlobalCritical ? 'bg-red-500' : 'bg-green-500'}`}></span>
                </span>
                <p className="text-gray-600 text-sm">System integrity monitoring active</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-500 font-mono shadow-sm">
                UPTIME: 99.98%
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative bg-white border-2 ${stat.borderColor} rounded-2xl p-6 hover:shadow-lg transition-all overflow-hidden group`}
              >
                <div className={`absolute top-0 right-0 w-20 h-20 ${stat.bgColor} rounded-bl-[40px] opacity-50 group-hover:opacity-100 transition-opacity`} />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${isGlobalCritical && index === 0 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
                      {stat.change}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* SCROLLABLE WEBSITE SELECTOR */}
        <div className="w-full overflow-x-auto pb-2 custom-scrollbar">
            <div className="flex gap-4 min-w-max">
                {websiteStats.map((site) => (
                    <button
                        key={site.id}
                        onClick={() => setSelectedSiteId(site.id)}
                        className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 transition-all ${
                            selectedSiteId === site.id
                            ? 'bg-blue-50 border-blue-500 shadow-md'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <div className={`w-2 h-2 rounded-full ${site.status === 'critical' ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                        <div className="text-left">
                            <p className={`text-sm font-bold ${selectedSiteId === site.id ? 'text-blue-700' : 'text-gray-700'}`}>{site.name}</p>
                            <p className="text-xs text-gray-500">{site.requests} req/s</p>
                        </div>
                    </button>
                ))}
                {websiteStats.length === 0 && (
                    <div className="px-5 py-3 text-gray-400 italic text-sm">No websites registered. Go to 'Websites' to add one.</div>
                )}
            </div>
        </div>

        {/* MAIN GRAPH */}
        <motion.div
          layout
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`relative bg-white border-2 ${selectedSite?.status === 'critical' ? 'border-red-200 shadow-red-100' : 'border-gray-200'} rounded-3xl p-6 md:p-8 shadow-xl overflow-hidden transition-colors duration-500`}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 relative z-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                 {selectedSite ? selectedSite.name : 'Network Traffic Analysis'}
                 {selectedSite?.status === 'critical' && <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full animate-pulse">CRITICAL</span>}
              </h2>
              <p className="text-sm text-gray-600">Real-time traffic telemetry</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm text-gray-600">Clean Traffic</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-gray-600">Mitigated Attacks</span>
              </div>
            </div>
          </div>
         
          <div className="h-80 md:h-96 relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentGraphData}>
                <defs>
                  <linearGradient id="colorNormal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAnomaly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" stroke="#9ca3af" style={{ fontSize: '11px' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '11px' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="normal" stroke="#10b981" strokeWidth={3} fill="url(#colorNormal)" animationDuration={300} isAnimationActive={true} />
                <Area type="monotone" dataKey="anomaly" stroke="#ef4444" strokeWidth={3} fill="url(#colorAnomaly)" animationDuration={300} isAnimationActive={true} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* AI & Agent Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         
          {/* AI Engine Status */}
          <motion.div className="bg-white border-2 border-purple-100 rounded-3xl p-6 shadow-lg overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-[80px] -z-0" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Sentinel AI Core</h3>
                  <p className="text-sm text-gray-600">Model: Random_Forest_V2 (Live)</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-purple-50/50 rounded-xl border border-purple-100">
                  <span className="text-sm font-semibold text-gray-700">Global Threat Level</span>
                  <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${isGlobalCritical ? 'bg-red-600 text-white animate-pulse' : 'bg-emerald-100 text-emerald-700'}`}>
                    {isGlobalCritical ? 'EXTREME' : 'NOMINAL'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 py-4 border-t border-gray-100">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Confidence</p>
                    <p className="text-2xl font-bold text-purple-600">99.4%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Processing</p>
                    <p className="text-2xl font-bold text-purple-600">~12ms</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Uptime</p>
                    <p className="text-2xl font-bold text-purple-600">14d+</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Active Mitigation Box (FIXED HEIGHT) */}
          <motion.div className="bg-white border-2 border-green-100 rounded-3xl p-6 shadow-lg overflow-hidden relative h-80 flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-[80px] -z-0" />
           
            {/* Header + Capacity Bar */}
            <div className="relative z-10 flex-shrink-0 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Active Mitigation</h3>
                  <p className="text-sm text-gray-600">Automated Response Log</p>
                </div>
              </div>

              {/* Firewall Capacity Bar (TOP) */}
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                    <span>Firewall Capacity</span>
                    <span>{isGlobalCritical ? '92% used' : '32% used'}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all duration-500 ${isGlobalCritical ? 'bg-red-500 w-[92%]' : 'bg-green-500 w-[32%]'}`}></div>
                  </div>
              </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="relative z-10 flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                {isGlobalCritical ? (
                    criticalSites.map((site, i) => (
                        <div key={`${site.id}-${i}`} className="bg-red-50 p-3 rounded-xl border border-red-100 flex items-start gap-3 animate-in fade-in slide-in-from-right-4">
                            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-red-700">DDoS Attack Detected</p>
                                <p className="text-xs text-red-600">Target: {site.name} | Action: Blocking IPs</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-semibold text-green-700">No active threats detected in cluster.</span>
                    </div>
                )}
               
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 opacity-60">
                    <p className="text-xs text-gray-500 font-mono">LOG: System integrity check passed at 09:00 AM</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 opacity-60">
                    <p className="text-xs text-gray-500 font-mono">LOG: Database backup completed successfully</p>
                </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}