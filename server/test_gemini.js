
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const apiKey = process.env.GEMINI_API_KEY;

console.log("--- Testing Gemini API Connection (Standard SDK) ---");
console.log(`API Key present: ${apiKey ? 'Yes' : 'No'}`);
if (apiKey) {
    console.log(`API Key length: ${apiKey.length}`);
    console.log(`API Key preview: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
}

async function testConnection() {
    if (!apiKey) {
        console.error("❌ No API Key found in .env");
        return;
    }

    try {
        console.log("Initializing GoogleGenerativeAI...");
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        console.log("sending request to gemini-1.5-flash...");
        const result = await model.generateContent("Hello, are you receiving this?");
        const response = await result.response;
        const text = response.text();

        console.log("✅ Response received!");
        console.log("Text:", text);

    } catch (error) {
        console.error("❌ Connection failed!");
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Full error:", error);
    }
}

testConnection();
