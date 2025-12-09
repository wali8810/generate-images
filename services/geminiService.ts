import { Preset } from "../types";
import { API_URL } from "../constants";

export const generateStamp = async (
  userText: string,
  preset: Preset | null,
  referenceImageBase64?: string,
  isMockupGeneration: boolean = false
): Promise<string> => {

  try {
    const response = await fetch(`${API_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        userText,
        preset,
        referenceImageBase64,
        isMockupGeneration
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Falha na conexão com o servidor.");
    }

    const data = await response.json();

    if (!data.text) {
      throw new Error("A IA gerou uma resposta vazia.");
    }

    return data.text;

  } catch (error: any) {
    console.error("Erro Gemini:", error);
    throw new Error(error.message || "Falha na conexão com a IA.");
  }
};

export const moderateImage = async (base64Image: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/api/moderate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ base64Image }),
    });

    if (!response.ok) {
      console.warn("Moderation check failed via backend");
      return true; // Fail safe
    }

    const data = await response.json();
    return data.allowed;

  } catch (error) {
    console.error("Moderation error:", error);
    return true;
  }
};
