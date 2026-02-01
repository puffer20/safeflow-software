import axios from 'axios';

// --- CONFIGURATION ---
const API_BASE = 'http://localhost:3001/api';
const POLL_INTERVAL_MS = 5000; 

console.log("🚀 Starting Realistic Traffic Gen (Additive Model)...");

// --- STATE MANAGEMENT ---
const runningSimulations = new Map(); 

// --- HELPERS ---
const getRandomIP = () => `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`;
const generateBotnet = (size) => Array.from({length: size}, () => getRandomIP());

function startSimulation(site) {
  if (runningSimulations.has(site.id)) return;

  console.log(`   👉 [STARTED] Worker for: ${site.name}`);

  // STATE VARIABLES
  let eventMode = 'normal';   
  let eventTimer = 0;         
  let currentBotnet = [];     
  let currentAttackerIP = null; 

  const intervalSpeed = Math.floor(Math.random() * 800) + 400;

  const intervalId = setInterval(async () => {
    
    // 1. CALCULATE NORMAL TRAFFIC (Always exists)
    // ------------------------------------------------
    let normalRequests = site.baseTraffic;
    // Add volatility (+/- 20%)
    normalRequests += Math.floor(Math.random() * (site.baseTraffic * 0.4)) - (site.baseTraffic * 0.2);
    if (normalRequests < 50) normalRequests = 50; // Minimum baseline
    
    let normalErrorRate = 0.005; // 0.5% error rate is standard
    let normalLatency = Math.floor(Math.random() * 30) + 20; // 20-50ms
    let normalUserIP = getRandomIP(); // Unique visitor every time


    // ... (Previous imports and setup remain the same) ...

    // 2. CALCULATE ATTACK TRAFFIC (Conditional)
    // ------------------------------------------------
    let attackRequests = 0;
    let attackErrorRate = 0;
    let attackLatency = 0;
    
    // --- UPDATED EVENT CONTROLLER (Rare Attacks) ---
    if (eventMode === 'normal') {
      const rand = Math.random();
      
      // SCENARIO 1: DDoS Attack (Very Rare - Once per ~15 mins)
      // This ensures the demo stays clean until YOU trigger it externally
      if (rand > 0.9995) { 
        eventMode = 'ddos';
        eventTimer = Math.floor(Math.random() * 300) + 120; // 2-5 mins
        
        const armySize = Math.floor(Math.random() * 50) + 10; 
        currentBotnet = generateBotnet(armySize); 
        currentAttackerIP = currentBotnet[0];
        console.log(`🔥 [${site.name}] RANDOM AUTO-ATTACK LAUNCHED!`);
      }
      // SCENARIO 2: Flash Sale (Occasional)
      else if (rand > 0.995) {
        eventMode = 'flash_sale';
        eventTimer = 15; 
        console.log(`🛍️ [${site.name}] Flash Sale Triggered.`);
      }
    }
    // --------------------------------------------------

// ... (Rest of the code remains exactly the same) ...

    if (eventMode === 'ddos') {
      // Attack is HUGE (e.g., 6x normal traffic)
      attackRequests = site.baseTraffic * 6; 
      attackErrorRate = 0.45; // Hackers cause errors
      attackLatency = 400;    // And lag
    } 
    else if (eventMode === 'flash_sale') {
      // Flash sale is HIGH (e.g., 4x normal traffic) but CLEAN
      attackRequests = site.baseTraffic * 4;
      attackErrorRate = 0.01;
      attackLatency = 150; // Little laggy
    }

    // 3. COMBINE TRAFFIC (The "Summation")
    // ------------------------------------------------
    let totalRequests = normalRequests + attackRequests;
    let finalErrorRate = (eventMode === 'ddos') ? attackErrorRate : normalErrorRate;
    let finalLatency = Math.max(normalLatency, attackLatency);
    
    // Who is the "Face" of this traffic?
    // If attacking, the Attacker IP is dominant. If normal, random user.
    let dominantIP = (eventMode === 'ddos') ? currentAttackerIP : normalUserIP;


    // 4. COUNTDOWN
    if (eventTimer > 0) {
      eventTimer--;
      if (eventTimer === 0) {
        console.log(`✅ [${site.name}] Event Ended.`);
        eventMode = 'normal';
      }
    }

    // 5. SEND TO SERVER
    // ------------------------------------------------
    try {
      await axios.post(`${API_BASE}/traffic-log`, {
        websiteId: site.id,
        name: site.name,
        requests: Math.floor(totalRequests),
        errorRate: finalErrorRate,
        latency: finalLatency,
        sourceIP: dominantIP, 
        timestamp: new Date().toISOString()
      });

      // If DDoS is active and NOT blocked, maybe rotate IP naturally
      if (eventMode === 'ddos' && Math.random() > 0.9) {
         currentAttackerIP = currentBotnet[Math.floor(Math.random() * currentBotnet.length)];
      }

    } catch (e) {
      // 6. THE SMART FALLBACK (The "Resurrection")
      // ------------------------------------------------
      if (e.response && e.response.status === 403) {
          // If we got blocked...
          if (eventMode === 'ddos') {
             console.log(`🚫 [BLOCKED] Attacker ${dominantIP} rejected.`);
             
             // A. Rotate the Attacker for next time
             currentAttackerIP = getRandomIP();
             currentBotnet.push(currentAttackerIP);

             // B. CRITICAL: Resend the NORMAL traffic immediately!
             // This ensures the graph drops to "Green" (Normal), not "Zero" (Dead).
             try {
                await axios.post(`${API_BASE}/traffic-log`, {
                    websiteId: site.id,
                    name: site.name,
                    requests: Math.floor(normalRequests), // Only the clean traffic
                    errorRate: normalErrorRate,
                    latency: normalLatency,
                    sourceIP: normalUserIP, // From a clean IP
                    timestamp: new Date().toISOString()
                  });
             } catch (err) {
                 // If even normal traffic fails, server is dead
             }
          }
      }
      else if (e.response && e.response.status === 404) {
          clearInterval(intervalId); 
          runningSimulations.delete(site.id); 
      }
    }

  }, intervalSpeed);

  runningSimulations.set(site.id, intervalId);
}

// ... Sync Logic (Same as before) ...
async function syncWebsites() {
    try {
      const response = await axios.get(`${API_BASE}/websites`);
      const serverWebsites = response.data;
      const serverIds = new Set(serverWebsites.map(s => s.id));
      serverWebsites.forEach(site => startSimulation(site));
      for (const [id, intervalId] of runningSimulations) {
          if (!serverIds.has(id)) {
              clearInterval(intervalId);
              runningSimulations.delete(id);
          }
      }
    } catch (error) {
      console.log("⚠️ Server sync failed.");
    }
}
setInterval(syncWebsites, POLL_INTERVAL_MS);
syncWebsites();