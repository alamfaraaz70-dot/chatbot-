
import { GoogleGenAI, GenerateContentParameters } from "@google/genai";
import { TEXT_MODELS, IMAGE_MODELS, SYSTEM_INSTRUCTION, DEEP_RESEARCH_INSTRUCTION, PRODUCT_COMPARISON_INSTRUCTION } from "../constants";

export const generateCognitiveResponse = async (
  contents: any[],
  useDeepSearch: boolean = false,
  useCompareMode: boolean = false
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  // Combine instructions based on active modes
  let fullInstruction = SYSTEM_INSTRUCTION;
  
  if (useDeepSearch) {
    fullInstruction += `\n\n${DEEP_RESEARCH_INSTRUCTION}`;
  }
  
  if (useCompareMode) {
    fullInstruction += `\n\n${PRODUCT_COMPARISON_INSTRUCTION}`;
  }

  const config: GenerateContentParameters['config'] = {
    systemInstruction: fullInstruction,
    thinkingConfig: { thinkingBudget: 32768 },
  };

  // Force Google Search for either Research or Comparison modes
  if (useDeepSearch || useCompareMode) {
    config.tools = [{ googleSearch: {} }];
  }

  return ai.models.generateContentStream({
    model: TEXT_MODELS.CHAT,
    contents: contents,
    config: config,
  });
};

export const generateImage = async (prompt: string, aspectRatio: "1:1" | "16:9" | "9:16" = "1:1") => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const response = await ai.models.generateContent({
    model: IMAGE_MODELS.GENERATE,
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio,
      }
    }
  });

  // Extract the image from response parts
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  return null;
};
