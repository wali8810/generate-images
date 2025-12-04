
import { GoogleGenAI, Type } from "@google/genai";
import { Preset } from "../types";

export const generateStamp = async (
  userText: string, 
  preset: Preset | null, 
  referenceImageBase64?: string,
  isMockupGeneration: boolean = false
): Promise<string> => {
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let finalPrompt = "";
  
  if (isMockupGeneration && referenceImageBase64) {
       const variationSeed = Math.floor(Math.random() * 10000);
       const vibes = ['Soft Lighting', 'Bright Day', 'Cozy Indoor', 'Minimalist Studio', 'Natural Light', 'Warm Atmosphere', 'Cool Tones'];
       const randomVibe = vibes[Math.floor(Math.random() * vibes.length)];

       finalPrompt = `
        You are an expert product photographer and mockup generator.
        YOUR TASK: Take the attached artwork/design and realistically apply it to the product described below.
        
        Product Description: "${userText}"
        Context/Vibe: ${randomVibe} (Variation ID: ${variationSeed})
        
        CRITICAL RULES:
        1. The attached image MUST be the design printed/stamped on the product.
        2. Do NOT change the design itself, just apply it to the 3D surface of the product.
        3. Ensure realistic lighting, shadows, and fabric/material texture.
        4. The output must be a high-quality photo of the product with the design.
        5. Do not add random text or watermarks.
      `;
  } else if (referenceImageBase64) {
      finalPrompt = `
        You are an expert image editor and digital artist.
        YOUR TASK: Modify the attached reference image based strictly on the user's instruction.
        
        User Instruction: "${userText}"
        ${preset ? `Target Style: ${preset.promptSuffix}` : ''}

        CRITICAL RULES:
        1. USE THE ATTACHED IMAGE AS THE FOUNDATION. Do not generate a completely new random image.
        2. Apply the requested changes (e.g., add elements, change background, change style) to the existing subject/composition.
        3. Maintain high quality, clear outlines, and vivid colors.
        4. If asked to remove background, ensure pure white (#FFFFFF) background.
        5. Output as a high-quality 2D digital art/sticker.
      `;
  } else {
      finalPrompt = `
        Generate a high-quality 2D digital art sticker or clipart.
        Subject: ${userText}.
        ${preset ? `Style Details: ${preset.promptSuffix}` : ''}
        Requirements:
        - White background (pure white #FFFFFF).
        - Clear defined outlines.
        - No text inside the image.
        - High contrast, vivid colors.
        - Vector art style suitable for t-shirt printing.
      `;
  }

  try {
    const parts: any[] = [{ text: finalPrompt }];

    if (referenceImageBase64) {
       const base64Data = referenceImageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
       parts.unshift({
         inlineData: {
           data: base64Data,
           mimeType: 'image/png' 
         }
       });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: parts },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K"
        }
      }
    });

    let imageBase64 = null;
    
    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                imageBase64 = `data:image/png;base64,${part.inlineData.data}`;
                break;
            }
        }
    }

    if (!imageBase64) {
      throw new Error("A IA gerou uma resposta, mas não foi uma imagem válida.");
    }

    return imageBase64;

  } catch (error: any) {
    console.error("Erro Gemini:", error);
    throw new Error(error.message || "Falha na conexão com a IA.");
  }
};

export const moderateImage = async (base64Image: string): Promise<boolean> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: 'image/png'
            }
          },
          {
            text: "Review this image. Is it a safe, appropriate illustration, vector art, or sticker design? It should not be a raw real-world photo of people, and must not contain NSFW, violence, or hate symbols. Return JSON with 'allowed' boolean."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            allowed: { type: Type.BOOLEAN }
          }
        }
      }
    });

    if (response.text) {
        const json = JSON.parse(response.text);
        return json.allowed === true;
    }
    return true; // Default allow if unsure

  } catch (error) {
    console.error("Moderation error:", error);
    return true; // Fail open
  }
};
