import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkUser() {
    const dbPath = path.join(__dirname, '..', 'database.sqlite');
    console.log(`📂 Database: ${dbPath}\n`);

    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    const user = await db.get("SELECT * FROM users WHERE email = 'teste@gmail.com'");

    if (user) {
        console.log('✅ User found:');
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.name || 'N/A'}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Status: ${user.status}`);
        console.log(`   Plan: ${user.plan_type || 'N/A'}`);
        console.log(`   Credits: ${user.credits}`);
        console.log(`   Password Hash: ${user.password.substring(0, 20)}...`);

        // Test common passwords
        const testPasswords = ['123456', 'teste', 'teste123', 'password', ''];
        console.log('\n🔐 Testing common passwords:');
        for (const pwd of testPasswords) {
            const match = await bcrypt.compare(pwd, user.password);
            if (match) {
                console.log(`   ✅ PASSWORD FOUND: "${pwd}"`);
                break;
            } else {
                console.log(`   ❌ Not: "${pwd}"`);
            }
        }
    } else {
        console.log('❌ User teste@gmail.com not found');
    }

    await db.close();
}

checkUser();
