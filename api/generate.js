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
        const { userText, preset, referenceImageBase64, isMockupGeneration } = req.body;

        let finalPrompt = "";

        if (isMockupGeneration && referenceImageBase64) {
            const variationSeed = Math.floor(Math.random() * 10000);
            const vibes = ['Soft Lighting', 'Bright Day', 'Cozy Indoor', 'Minimalist Studio', 'Natural Light', 'Warm Atmosphere', 'Cool Tones'];
            const randomVibe = vibes[Math.floor(Math.random() * vibes.length)];

            finalPrompt = `You are an expert product photographer and mockup generator.
YOUR TASK: Take the attached artwork/design and realistically apply it to the product described below.

Product Description: "${userText}"
Context/Vibe: ${randomVibe} (Variation ID: ${variationSeed})

CRITICAL RULES:
1. The attached image MUST be the design printed/stamped on the product.
2. Do NOT change the design itself, just apply it to the 3D surface of the product.
3. Ensure realistic lighting, shadows, and fabric/material texture.
4. The output must be a high-quality photo of the product with the design.
5. Do not add random text or watermarks.`;
        } else if (referenceImageBase64) {
            finalPrompt = `You are an expert image editor and digital artist.
YOUR TASK: Modify the attached reference image based strictly on the user's instruction.

User Instruction: "${userText}"
${preset ? `Target Style: ${preset.promptSuffix}` : ''}

CRITICAL RULES:
1. USE THE ATTACHED IMAGE AS THE FOUNDATION. Do not generate a completely new random image.
2. Apply the requested changes (e.g., add elements, change background, change style) to the existing subject/composition.
3. Maintain high quality, clear outlines, and vivid colors.
4. If asked to remove background, ensure pure white (#FFFFFF) background.
5. Output as a high-quality 2D digital art/sticker.`;
        } else {
            finalPrompt = `Generate a high-quality 2D digital art sticker or clipart.
Subject: ${userText}.
${preset ? `Style Details: ${preset.promptSuffix}` : ''}
Requirements:
- White background (pure white #FFFFFF).
- Clear defined outlines.
- No text inside the image.
- High contrast, vivid colors.
- Vector art style suitable for t-shirt printing.`;
        }

        // --- TRY IMAGE GENERATION FIRST ---
        try {
            console.log("Attempting generation with gemini-3-pro-image-preview...");

            let generationContents = [];
            if (referenceImageBase64) {
                const base64Data = referenceImageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
                generationContents.push({
                    role: 'user',
                    parts: [
                        { inlineData: { mimeType: 'image/png', data: base64Data } },
                        { text: finalPrompt }
                    ]
                });
            } else {
                generationContents.push({
                    role: 'user',
                    parts: [{ text: finalPrompt }]
                });
            }

            const response = await ai.models.generateContent({
                model: "gemini-3-pro-image-preview",
                contents: generationContents,
                config: {
                    imageConfig: {
                        aspectRatio: "1:1",
                        imageSize: "1024x1024"
                    }
                }
            });

            let imageBase64 = null;
            let mimeType = 'image/png';

            if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                        imageBase64 = part.inlineData.data;
                        if (part.inlineData.mimeType) {
                            mimeType = part.inlineData.mimeType;
                        }
                        break;
                    }
                }
            }

            if (imageBase64) {
                const base64String = `data:${mimeType};base64,${imageBase64}`;
                return res.json({ text: base64String });
            }

            console.log("No image found in Gemini 3 response, falling back to SVG...");

        } catch (genError) {
            console.error("Image Generation Error:", genError.message);
            console.log("Falling back to SVG generation...");
        }

        // --- FALLBACK: SVG GENERATION ---
        let contents = [];
        if (referenceImageBase64) {
            const base64Data = referenceImageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
            contents.push({
                role: 'user',
                parts: [
                    { inlineData: { mimeType: 'image/png', data: base64Data } },
                    { text: finalPrompt + "\n\nIMPORTANT: Output ONLY the raw SVG code for the design. Do not wrap in markdown code blocks. Start with <svg and end with </svg>." }
                ]
            });
        } else {
            contents.push({
                role: 'user',
                parts: [{ text: finalPrompt + "\n\nIMPORTANT: Output ONLY the raw SVG code for the design. Do not wrap in markdown code blocks. Start with <svg and end with </svg>." }]
            });
        }

        const response = await ai.models.generateContent({
            model: "gemini-3-pro-image-preview",
            contents: contents,
        });

        console.log("Gemini Response Text:", response.text);

        let text = response.text || "";
        text = text.replace(/```xml/g, '').replace(/```svg/g, '').replace(/```/g, '');

        if (text.includes('<svg')) {
            const base64Svg = Buffer.from(text).toString('base64');
            text = `data:image/svg+xml;base64,${base64Svg}`;
        }

        res.json({ text: text });

    } catch (error) {
        console.error("Error generating content:", error);
        res.status(500).json({ error: error.message || "Failed to generate content" });
    }
}
