
import { GoogleGenAI } from "@google/genai";

export async function removeBackground(base64Image: string): Promise<string> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });
  
  // Clean up base64 string if it contains prefix
  const base64Data = base64Image.replace(/^data:image\/(png|jpeg|webp);base64,/, '');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/png'
            }
          },
          {
            text: `Please remove the background of this image. Keep the main subject (person, animal, or object) perfectly intact with crisp edges. The output MUST be an image where the entire background is replaced with transparency (alpha channel). Do not change the subject. Return only the edited image.`
          }
        ]
      }
    });

    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) throw new Error("No response from AI");

    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    throw new Error("Could not find image in AI response");
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
}
