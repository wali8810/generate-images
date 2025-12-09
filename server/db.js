import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance = null;

export async function getDb() {
  if (dbInstance) return dbInstance;

  const dbPath = path.join(__dirname, '..', 'database.sqlite');
  console.log(`📂 Connecting to Database at: ${dbPath}`); // DEBUG LOG

  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      credits INTEGER DEFAULT 0,
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'active',
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migrations for existing tables (safe to run multiple times)
  try { await dbInstance.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'"); } catch (e) { }
  try { await dbInstance.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'"); } catch (e) { }
  try { await dbInstance.exec("ALTER TABLE users ADD COLUMN name TEXT"); } catch (e) { }

  // New columns for Daily Plan & Payments
  try { await dbInstance.exec("ALTER TABLE users ADD COLUMN plan_type TEXT DEFAULT 'free'"); } catch (e) { } // 'free', 'daily'
  try { await dbInstance.exec("ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'inactive'"); } catch (e) { } // 'active', 'pending', 'overdue', 'cancelled', 'inactive'
  try { await dbInstance.exec("ALTER TABLE users ADD COLUMN subscription_start DATE"); } catch (e) { }
  try { await dbInstance.exec("ALTER TABLE users ADD COLUMN subscription_renewal DATE"); } catch (e) { }
  try { await dbInstance.exec("ALTER TABLE users ADD COLUMN last_daily_reset DATE"); } catch (e) { }

  // Device Credits Table - Track free credits usage by device
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS device_credits (
      device_id TEXT PRIMARY KEY,
      credits_used INTEGER DEFAULT 0,
      first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return dbInstance;
}
