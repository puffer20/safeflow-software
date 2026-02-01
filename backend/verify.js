import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

(async () => {
  console.log("\n🕵️  FULL DATABASE INSPECTION");
  console.log("================================================");

  try {
    const db = await open({
      filename: './cyber_shield.db',
      driver: sqlite3.Database
    });

    // 1. WEBSITES
    console.log("\n🌐 [TABLE 1] REGISTERED WEBSITES (All)");
    const websites = await db.all("SELECT id, name, baseTraffic, status FROM websites");
    websites.length > 0 ? console.table(websites) : console.log("⚠️  (Empty)");

    // 2. TRAFFIC LOGS
    console.log("\n📈 [TABLE 2] TRAFFIC LOGS (Last 10 Entries)");
    const logs = await db.all(`
        SELECT time(timestamp) as time, requests, latency, is_anomaly 
        FROM traffic_logs ORDER BY id DESC LIMIT 10
    `);
    logs.length > 0 ? console.table(logs) : console.log("⚠️  (Empty)");

    // 3. BLOCKED IPS
    console.log("\n🚫 [TABLE 3] FIREWALL RULES (Last 10 Blocks)");
    const blocks = await db.all("SELECT ip_address, reason, time(banned_at) as time FROM blocked_ips ORDER BY id DESC LIMIT 10");
    blocks.length > 0 ? console.table(blocks) : console.log("✅ (Clean)");

    // 4. ALERTS
    console.log("\n🚨 [TABLE 4] PERSISTENT ALERTS (Last 10 Alerts)");
    const alerts = await db.all("SELECT website_name, severity, message, time(timestamp) as time FROM alerts ORDER BY timestamp DESC LIMIT 10");
    alerts.length > 0 ? console.table(alerts) : console.log("✅ (No Alerts)");

    // 5. USERS (New!)
    console.log("\n👤 [TABLE 5] REGISTERED USERS");
    // We select id and email. (Password is hashed/stored, usually better not to print raw pass if encrypted)
    const users = await db.all("SELECT id, email, password FROM users");
    users.length > 0 ? console.table(users) : console.log("⚠️  (No Users Found)");

    console.log("\n================================================");

  } catch (err) {
    console.error("❌ Error:", err);
  }
})();