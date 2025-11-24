import { GoogleGenAI, Modality } from "@google/genai";
import { GroundingChunk, ImageRatio, ImageSize } from "../types";

// Helper to get fresh instance (needed for Veo key selection updates)
export const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateChatResponse(
  model: string,
  history: any[],
  message: string,
  images: string[] = [],
  video?: { mimeType: string; data: string },
  tools: 'search' | 'maps' | 'none' = 'none',
  thinking: boolean = false
) {
  const ai = getAiClient();
  const parts: any[] = [{ text: message }];

  images.forEach(img => {
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: img } });
  });

  if (video) {
      parts.push({ inlineData: { mimeType: video.mimeType, data: video.data } });
  }

  const toolConfig: any = { tools: [] };
  if (tools === 'search') {
    toolConfig.tools.push({ googleSearch: {} });
  } else if (tools === 'maps') {
    toolConfig.tools.push({ googleMaps: {} });
    // Try to get location
    try {
        const pos: GeolocationPosition = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        toolConfig.toolConfig = {
            retrievalConfig: {
                latLng: {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude
                }
            }
        };
    } catch (e) {
        console.warn("Location denied for maps", e);
    }
  }

  if (thinking) {
    toolConfig.thinkingConfig = { thinkingBudget: 32768 };
  }

  // If using thinking, we cannot use tools currently in same request easily with some models,
  // but for gemini-3-pro-preview it is the primary target.
  // Note: Thinking model is gemini-3-pro-preview.
  
  const response = await ai.models.generateContent({
    model: model,
    contents: { parts },
    config: {
        ...toolConfig
    }
  });

  return response;
}

export async function generateImage(prompt: string, size: ImageSize, ratio: ImageRatio) {
  const ai = getAiClient();
  // Using generateContent for nano banana series as per instructions
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: {
        aspectRatio: ratio,
        imageSize: size
      }
    }
  });
  return response;
}

export async function editImage(prompt: string, base64Image: string) {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data: base64Image } },
        { text: prompt }
      ]
    }
  });
  return response;
}

export async function generateVeoVideo(prompt: string, imageBase64?: string, aspectRatio: '16:9' | '9:16' = '16:9') {
  const ai = getAiClient();
  let operation;

  const commonConfig = {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: aspectRatio
  };

  if (imageBase64) {
    operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt || "Animate this",
      image: {
        imageBytes: imageBase64,
        mimeType: 'image/png'
      },
      config: commonConfig
    });
  } else {
    operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: commonConfig
    });
  }

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  return operation.response?.generatedVideos?.[0]?.video?.uri;
}

export async function transcribeAudioFile(base64Audio: string, mimeType: string) {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { inlineData: { mimeType, data: base64Audio } },
                { text: "Transcribe this audio exactly as spoken." }
            ]
        }
    });
    return response.text;
}

export async function generateTextToSpeech(text: string) {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
            },
        },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
}
