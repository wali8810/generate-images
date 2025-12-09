import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkDB() {
    const dbPath = path.join(__dirname, '..', 'database.sqlite');
    console.log(`📂 Database path: ${dbPath}`);

    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    // Check schema
    const tableInfo = await db.all("PRAGMA table_info(users)");
    console.log('\n📋 Table Schema:');
    tableInfo.forEach(col => console.log(`  - ${col.name} (${col.type})`));

    // Check user 2 (teste@gmail.com)
    const user = await db.get("SELECT * FROM users WHERE email = 'teste@gmail.com'");
    if (user) {
        console.log('\n👤 User teste@gmail.com:');
        console.log(`  ID: ${user.id}`);
        console.log(`  Plan: ${user.plan_type || 'NULL'}`);
        console.log(`  Subscription Status: ${user.subscription_status || 'NULL'}`);
        console.log(`  Renewal: ${user.subscription_renewal || 'NULL'}`);
        console.log(`  Credits: ${user.credits}`);
    } else {
        console.log('\n❌ User teste@gmail.com not found');
    }

    await db.close();
}

checkDB();
