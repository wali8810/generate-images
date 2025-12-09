import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || "dummy_key" });

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '50mb',
        },
    },
};

export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { base64Image } = req.body;

        if (!base64Image) {
            return res.json({ allowed: true });
        }

        const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

        const response = await ai.models.generateContent({
            model: "gemini-3-pro-image-preview",
            contents: [
                {
                    role: 'user',
                    parts: [
                        { inlineData: { mimeType: 'image/png', data: cleanBase64 } },
                        { text: "Review this image. Is it a safe, appropriate illustration, vector art, or sticker design? It should not be a raw real-world photo of people, and must not contain NSFW, violence, or hate symbols. Return only 'ALLOWED' if safe or 'REJECTED' if not." }
                    ]
                }
            ]
        });

        const text = response.text ? response.text.trim().toUpperCase() : "";
        res.json({ allowed: text.includes("ALLOWED") });

    } catch (error) {
        console.error("Error moderating image:", error);
        res.json({ allowed: true });
    }
}
