import axios from 'axios';

// --- HACKER CONFIGURATION ---
// ✅ TARGET LOCKED: Your Server's Local IP
const TARGET_HOST = 'http://172.16.106.184:3001/api'; 

const ATTACK_INTENSITY = 20; // 20x Normal Traffic (Massive Load)
const TICK_SPEED_MS = 150;   // Speed of packets (Lower = Faster)

console.log("☠️  INITIALIZING ADVANCED BOTNET CONTROLLER...");
console.log(`📡 CONNECTING TO TARGET SYSTEM AT: ${TARGET_HOST}`);

// --- UTILS ---
const getRandomIP = () => `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`;

async function runAttack() {
    // 1. DISCOVER TARGETS (Reconnaissance Phase)
    let websites = [];
    try {
        const res = await axios.get(`${TARGET_HOST}/websites`);
        websites = res.data;
        if (websites.length === 0) throw new Error("No active targets found on server.");
        
        console.log(`🎯 FOUND ${websites.length} VULNERABLE TARGETS.`);
        websites.forEach((w, i) => console.log(`   [${i}] ${w.name} (Traffic: ${w.baseTraffic}/s)`));
        
    } catch (e) {
        console.error(`❌ CONNECTION FAILED: Could not reach ${TARGET_HOST}`);
        console.error(`   👉 Check if Laptop A (Server) allows incoming connections.`);
        console.error(`   👉 Check if Windows Firewall is blocking Node.js on Laptop A.`);
        return;
    }

    // 2. SELECT PRIMARY TARGET (Default: The first website found)
    const target = websites[0];
    console.log(`\n⚔️  LOCKING ORBITAL CANNON ON: ${target.name} (ID: ${target.id})`);
    console.log(`🚀 LAUNCHING DDoS ATTACK... (Press Ctrl+C to Abort)`);

    // 3. ATTACK LOOP
    let currentBotIP = getRandomIP();
    let packetsSent = 0;
    let blockedCount = 0;

    setInterval(async () => {
        // Calculate Damage (Massive Traffic Spike)
        const damage = Math.floor((target.baseTraffic || 100) * ATTACK_INTENSITY);
        
        // Add Chaos (High errors and latency to simulate stress)
        const error = 0.65; 
        const latency = Math.floor(Math.random() * 400) + 200; 

        try {
            await axios.post(`${TARGET_HOST}/traffic-log`, {
                websiteId: target.id,
                name: target.name,
                requests: damage,
                errorRate: error,
                latency: latency,
                sourceIP: currentBotIP, // We keep using this IP until it gets banned
                timestamp: new Date().toISOString()
            });
            
            packetsSent++;
            if (packetsSent % 10 === 0) process.stdout.write("💥"); // Visual impact

        } catch (e) {
            // 4. SMART EVASION PROTOCOL (If Blocked)
            if (e.response && e.response.status === 403) {
                blockedCount++;
                console.log(`\n🚫 [BLOCKED] Bot ${currentBotIP} was neutralized by AI Defense.`);
                
                // Rotate Identity
                currentBotIP = getRandomIP(); 
                console.log(`🔄 ROTATING IP IDENTITY -> ${currentBotIP}`);
                console.log(`👉 RESUMING ASSAULT...`);
            } else if (e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT') {
                console.log("\n⚠️  TARGET UNREACHABLE (Network Error or Server Down)");
            } else {
                console.log(`\n⚠️  Error: ${e.message}`);
            }
        }
    }, TICK_SPEED_MS);
}

runAttack();