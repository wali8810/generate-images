import fetch from 'node-fetch';

const API_URL = 'http://localhost:5001/api';
const ADMIN_EMAIL = 'admin@admin.com'; // Assuming this is the admin
const ADMIN_PASSWORD = 'admin'; // Assuming default, need to verify or use a known one. 
// Actually, I need to know a valid admin credential. 
// I'll check the seed data or just try to register one if not exists? 
// Or I can just bypass auth for a second by modifying the server? No, that requires restart.

// Let's assume the user has a token in their localStorage, but I can't access that.
// I will try to login with the standard admin credentials if I can find them in the code.
// Looking at previous logs, I don't see hardcoded admin credentials.
// But I can check the database directly!

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testBackend() {
    console.log("🔍 Diagnosing Backend & Database...");

    const db = await open({
        filename: path.join(__dirname, 'database.sqlite'),
        driver: sqlite3.Database
    });

    // 1. Check Table Schema
    console.log("Checking table schema...");
    const tableInfo = await db.all("PRAGMA table_info(users)");
    const columns = tableInfo.map(c => c.name);
    console.log("Columns found:", columns);

    const missing = ['plan_type', 'subscription_status', 'subscription_renewal'].filter(c => !columns.includes(c));
    if (missing.length > 0) {
        console.error("❌ MISSING COLUMNS:", missing);
        console.error("The database migration did not run!");
        return;
    } else {
        console.log("✅ Database schema is correct.");
    }

    // 2. Check a user
    const user = await db.get("SELECT * FROM users LIMIT 1");
    if (!user) {
        console.log("No users found to test.");
        return;
    }
    console.log("Testing with user ID:", user.id, "Current Plan:", user.plan_type);

    // 3. Try to update directly via DB to verify DB is writable
    try {
        await db.run("UPDATE users SET plan_type = 'daily_test' WHERE id = ?", [user.id]);
        const updatedUser = await db.get("SELECT * FROM users WHERE id = ?", [user.id]);
        if (updatedUser.plan_type === 'daily_test') {
            console.log("✅ Database is writable directly.");
            // Revert
            await db.run("UPDATE users SET plan_type = ? WHERE id = ?", [user.plan_type, user.id]);
        } else {
            console.error("❌ Database write failed!");
        }
    } catch (e) {
        console.error("❌ Database write error:", e);
    }

    console.log("\nIf the above checks passed, the issue is likely in the Running Server Process (Zombie Process).");
    console.log("Please run: taskkill /F /IM node.exe");
}

testBackend();
