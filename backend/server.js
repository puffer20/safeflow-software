import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import axios from 'axios';
import nodemailer from 'nodemailer';
import { getDb } from './database.js';

// --- CONFIGURATION ---
const PORT = 3001;
const AI_SERVICE_URL = 'http://127.0.0.1:5000/predict';
const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ["http://localhost:5173", "http://localhost:3000"], methods: ["GET", "POST"] }
});

// --- EMAIL CONFIG (Optional) ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: 'your-email@gmail.com', pass: 'your-app-password' }
});

// --- CACHE ---
let websiteStats = {}; 

// Load websites on start
(async () => {
  try {
    const db = await getDb();
    const sites = await db.all('SELECT * FROM websites');
    sites.forEach(site => {
      websiteStats[site.id] = {
        id: site.id,
        name: site.name,
        category: site.category,
        baseTraffic: site.baseTraffic,
        requests: 0,
        status: 'active',
        threatLevel: 'low',
        timestamp: new Date()
      };
    });
    console.log(`📂 Loaded ${sites.length} sites from SQLite.`);
  } catch (err) {
    console.error("❌ DB Init Error:", err);
  }
})();

// --- ENDPOINTS ---

// 1. GET WEBSITES
app.get('/api/websites', async (req, res) => {
  const db = await getDb();
  const sites = await db.all('SELECT * FROM websites');
  res.json(sites);
});

// 2. ADD WEBSITE
app.post('/api/add-website', async (req, res) => {
  const { name, category, baseTraffic } = req.body;
  const newId = Date.now().toString();
  const db = await getDb();

  try {
    await db.run(
      'INSERT INTO websites (id, name, category, baseTraffic) VALUES (?, ?, ?, ?)',
      [newId, name, category || 'Blog', baseTraffic || 100]
    );
    websiteStats[newId] = {
      id: newId,
      name: name,
      category: category || 'Blog',
      baseTraffic: baseTraffic || 100,
      requests: 0,
      status: 'active',
      threatLevel: 'low',
      timestamp: new Date()
    };
    io.emit('website-update', websiteStats[newId]);
    res.status(200).json({ success: true, id: newId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. DELETE WEBSITE
app.delete('/api/delete-website/:id', async (req, res) => {
  const { id } = req.params;
  const db = await getDb();
  try {
    await db.run('DELETE FROM websites WHERE id = ?', id);
    delete websiteStats[id];
    io.emit('website-removed', id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. GET TRAFFIC HISTORY (RAW - FOR DASHBOARD LIVE GRAPH)
app.get('/api/history/:websiteId', async (req, res) => {
    const { websiteId } = req.params;
    const db = await getDb();
    // Raw data, last 60 entries (High precision)
    const history = await db.all(
        'SELECT * FROM traffic_logs WHERE website_id = ? ORDER BY timestamp DESC LIMIT 60',
        websiteId
    );
    res.json(history.reverse());
});

// 4.5 GET 24-HOUR HISTORY (AGGREGATED - FOR WEBSITES PAGE)
app.get('/api/history-24h/:websiteId', async (req, res) => {
    const { websiteId } = req.params;
    const db = await getDb();
    
    // Group by MINUTE to create a 24h trend line (1440 points max)
    // This prevents the "clubbed" look while showing long-term data
    const history = await db.all(`
        SELECT 
            strftime('%Y-%m-%d %H:%M', timestamp) as time_bucket,
            AVG(requests) as avg_requests,
            MAX(requests) as peak_requests,
            MAX(is_anomaly) as has_anomaly
        FROM traffic_logs 
        WHERE website_id = ? 
        GROUP BY time_bucket 
        ORDER BY time_bucket DESC 
        LIMIT 1440
    `, websiteId);

    // Format for Recharts
    const formatted = history.map(row => ({
        timestamp: row.time_bucket,
        requests: Math.round(row.avg_requests), // Round decimals
        is_anomaly: row.has_anomaly
    }));

    res.json(formatted.reverse());
});

// 5. GET ALERTS
app.get('/api/alerts', async (req, res) => {
    const db = await getDb();
    try {
        const alerts = await db.all('SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 100');
        const parsedAlerts = alerts.map(a => ({
            ...a,
            details: JSON.parse(a.details_json || '{}')
        }));
        res.json(parsedAlerts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. TRAFFIC LOG (CORE LOGIC)
app.post('/api/traffic-log', async (req, res) => {
  const { websiteId, name, requests, errorRate, latency, sourceIP } = req.body;
  const db = await getDb();

  // A. Check Blocklist
  const blocked = await db.get(
      'SELECT * FROM blocked_ips WHERE website_id = ? AND ip_address = ?', 
      [websiteId, sourceIP]
  );

  if (blocked) {
      return res.status(403).json({ error: 'IP Blocked by AI Shield' });
  }

  // B. AI Analysis
  let analysis = { threatLevel: 'low', status: 'active', action: 'Monitor' };
  try {
    const aiResponse = await axios.post(AI_SERVICE_URL, { requests, errorRate, latency });
    analysis = aiResponse.data;
  } catch (error) {
    if (requests > 3000) analysis = { threatLevel: 'high', status: 'critical', action: 'Fallback Block' };
  }

  // C. Log Traffic
  await db.run(
    'INSERT INTO traffic_logs (website_id, requests, latency, error_rate, is_anomaly) VALUES (?, ?, ?, ?, ?)',
    [websiteId, requests, latency, errorRate, analysis.status === 'critical']
  );

  // D. Update Memory
  if (websiteStats[websiteId]) {
      websiteStats[websiteId] = {
        ...websiteStats[websiteId],
        requests,
        errorRate,
        latency,
        status: analysis.status,
        threatLevel: analysis.threatLevel,
        sourceIP
      };
      io.emit('website-update', websiteStats[websiteId]);
  }

  // E. ACTION: BLOCK & ALERT
  if (analysis.action === 'IP Blocked' || analysis.status === 'critical') {
      
      // 1. Block IP
      await db.run(
          'INSERT INTO blocked_ips (website_id, ip_address, reason) VALUES (?, ?, ?)',
          [websiteId, sourceIP, 'AI Detection: PPO Model Prediction']
      );

      // 2. CREATE PERSISTENT ALERT (With Random ID to fix crash)
      const alertId = `crit-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      const alertDetails = {
          ipAddress: sourceIP,
          requestCount: requests,
          anomalyScore: 99.8,
          blockedIPs: 1
      };

      try {
        await db.run(
            `INSERT INTO alerts (id, website_id, website_name, severity, message, action, details_json) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [alertId, websiteId, name, 'high', `🚨 DDoS Attack Detected`, 'IP Blocked', JSON.stringify(alertDetails)]
        );
      } catch (err) {
        console.error("Alert insert failed:", err.message);
      }

      const newAlert = {
          id: alertId,
          timestamp: new Date().toLocaleTimeString(),
          website: name,
          severity: 'high',
          message: `🚨 DDoS Attack Detected`,
          action: 'IP Blocked',
          details: alertDetails
      };
      
      io.emit('new-alert', newAlert);
  }

  res.sendStatus(200);
});

// 7. EMAIL ALERT
app.post('/api/send-alert-email', async (req, res) => {
    const { website, requests, ip, targetEmail } = req.body;
    const recipient = targetEmail || 'fallback-email@gmail.com';
    try {
      await transporter.sendMail({
        from: '"CyberShield AI" <no-reply@cybershield.com>',
        to: recipient,
        subject: `🚨 CRITICAL: IP Blocked on ${website}`,
        html: `<p>AI Agent blocked ${ip} doing ${requests} req/s.</p>`
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to send email' });
    }
});

// ... existing imports and code ...

// 8. USER LOGIN / REGISTER ENDPOINT
app.post('/api/login', async (req, res) => {
  const { email, password, domain } = req.body;
  const db = await getDb();

  try {
    // 1. Check if user exists
    const user = await db.get('SELECT * FROM users WHERE email = ?', email);

    if (user) {
      // EXISTING USER: Check Password
      // (In a real app, use bcrypt here. For demo, we compare plain text)
      if (user.password === password) {
        return res.json({ success: true, message: 'Welcome back!', userId: user.id });
      } else {
        return res.status(401).json({ success: false, error: 'Incorrect password' });
      }
    } else {
      // NEW USER: Auto-Register
      const result = await db.run(
        'INSERT INTO users (email, password) VALUES (?, ?)',
        [email, password]
      );
      
      // Auto-add their website if provided
      if (domain) {
        const siteId = Date.now().toString();
        await db.run(
          'INSERT INTO websites (id, name, category, baseTraffic) VALUES (?, ?, ?, ?)',
          [siteId, domain, 'Business', 100]
        );
      }

      return res.json({ success: true, message: 'Account created!', userId: result.lastID });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ... app.listen code ...

io.on('connection', (socket) => {
  socket.emit('init-stats', Object.values(websiteStats));
});

server.listen(PORT, () => {
  console.log(`🛡️  Node Server running on port ${PORT}`);
});