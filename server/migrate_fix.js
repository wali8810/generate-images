import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    const dbPath = path.join(__dirname, '..', 'database.sqlite');
    console.log(`📂 Opening database at: ${dbPath}`);

    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    console.log("🛠️ Checking and applying migrations...");

    const migrations = [
        "ALTER TABLE users ADD COLUMN plan_type TEXT DEFAULT 'free'",
        "ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'inactive'",
        "ALTER TABLE users ADD COLUMN subscription_start DATE",
        "ALTER TABLE users ADD COLUMN subscription_renewal DATE",
        "ALTER TABLE users ADD COLUMN last_daily_reset DATE"
    ];

    for (const query of migrations) {
        try {
            await db.exec(query);
            console.log(`✅ Applied: ${query}`);
        } catch (e) {
            if (e.message.includes("duplicate column name")) {
                console.log(`ℹ️ Already exists: ${query.split('ADD COLUMN ')[1].split(' ')[0]}`);
            } else {
                console.error(`❌ Error applying ${query}:`, e.message);
            }
        }
    }

    console.log("🔍 Verifying final schema...");
    const tableInfo = await db.all("PRAGMA table_info(users)");
    const columns = tableInfo.map(c => c.name);
    console.log("Columns:", columns);

    const required = ['plan_type', 'subscription_status', 'subscription_renewal'];
    const missing = required.filter(c => !columns.includes(c));

    if (missing.length === 0) {
        console.log("✨ SUCCESS: All columns are present!");
    } else {
        console.error("🚨 FAILURE: Still missing columns:", missing);
    }
}

runMigration();
