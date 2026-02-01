import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let dbInstance = null;

export async function getDb() {
  if (dbInstance) return dbInstance;

  dbInstance = await open({
    filename: './cyber_shield.db',
    driver: sqlite3.Database
  });

  // 1. Users
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT
    )
  `);

  // 2. Websites
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS websites (
      id TEXT PRIMARY KEY,
      name TEXT,
      category TEXT,
      baseTraffic INTEGER,
      status TEXT DEFAULT 'active'
    )
  `);

  // 3. Traffic Logs (History)
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS traffic_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      website_id TEXT,
      requests INTEGER,
      latency INTEGER,
      error_rate REAL,
      is_anomaly BOOLEAN,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(website_id) REFERENCES websites(id)
    )
  `);

  // 4. Blocked IPs
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS blocked_ips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      website_id TEXT,
      ip_address TEXT,
      banned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reason TEXT,
      FOREIGN KEY(website_id) REFERENCES websites(id)
    )
  `);

  // 5. ALERTS (NEW PERSISTENT TABLE)
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      website_id TEXT,
      website_name TEXT,
      severity TEXT,
      message TEXT,
      action TEXT,
      details_json TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("💾 Database initialized (SQLite): cyber_shield.db");
  return dbInstance;
}