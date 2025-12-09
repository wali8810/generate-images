const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const supabaseUrl = 'https://bhtyaonrgyfokbvomkia.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJodHlhb25yZ3lmb2tidm9ta2lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4ODM0MTIsImV4cCI6MjA4MDQ1OTQxMn0.XxiAlNoxLz55o5_uhtXyp6_sdKBbsycrBaVv4tIQOqQ';

try {
    let content = '';
    if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, 'utf8');
    }

    // Parse existing lines to preserve Gemini Key
    const lines = content.split('\n');
    const newLines = [];
    let geminiFound = false;

    lines.forEach(line => {
        if (line.startsWith('GEMINI_API_KEY=')) {
            newLines.push(line.trim());
            geminiFound = true;
        }
    });

    if (!geminiFound) {
        // If we couldn't find it cleanly, maybe keep the whole content but filter out supabase
        // Actually, let's just append if we are unsure, but we want to avoid duplicates.
        // Let's just rewrite with what we found + new keys.
        // If gemini key was multiline broken, this might be tricky.
        // Let's try to just read the whole file, remove any existing VITE_SUPABASE lines, and append new ones.

        // Reset
        newLines.length = 0;
        lines.forEach(line => {
            if (!line.startsWith('VITE_SUPABASE_URL') && !line.startsWith('VITE_SUPABASE_ANON_KEY') && line.trim() !== '') {
                newLines.push(line.trim());
            }
        });
    }

    newLines.push(`VITE_SUPABASE_URL=${supabaseUrl}`);
    newLines.push(`VITE_SUPABASE_ANON_KEY=${supabaseKey}`);

    fs.writeFileSync(envPath, newLines.join('\n'));
    console.log('Updated .env successfully');

} catch (e) {
    console.error('Error updating .env:', e);
}
