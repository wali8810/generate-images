
import 'dotenv/config';
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("No API Key found");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function listModels() {
    try {
        console.log("Fetching models...");
        const response = await ai.models.list();

        console.log("--- AVAILABLE MODELS ---");
        for await (const model of response) {
            console.log(`Name: ${model.name}`);
            console.log(`Display: ${model.displayName}`);
            console.log("-------------------------");
        }
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
