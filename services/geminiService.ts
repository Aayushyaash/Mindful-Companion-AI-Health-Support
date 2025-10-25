import { GoogleGenAI, Chat, Part, HarmCategory, HarmBlockThreshold } from "@google/genai";
import type { ChatMessage } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

function fileToGenerativePart(base64: string, mimeType: string): Part {
    return {
        inlineData: {
            data: base64,
            mimeType
        },
    };
}

export const analyzeImage = async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
    try {
        const imagePart = fileToGenerativePart(base64Image, mimeType);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, { text: prompt }] },
            config: {
                temperature: 0,
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error analyzing image:", error);
        return "Sorry, I couldn't analyze the image. Please try again.";
    }
};

export const extractInfoFromDocument = async (base64Image: string, mimeType: string): Promise<string> => {
    try {
        const imagePart = fileToGenerativePart(base64Image, mimeType);
        const prompt = `You are an expert data extractor. Your task is to analyze the provided document (which could be a prescription, a lab result, a note, etc.) and extract the most important information.

Format the output using simple, clean HTML.
- Use <h3> for section titles.
- Use <ul> and <li> for lists.
- Use <strong> to highlight key terms.
- Do not include <html>, <head>, or <body> tags. Do not use any CSS or <style> tags.

**Extraction Rules:**
1.  **Do not add any introductory text or preamble.** Directly start with the extracted HTML data.
2.  Identify the type of document and extract relevant sections. For example:
    *   For **prescriptions**: Patient Details, Doctor, Diagnosis, Medications, Instructions.
    *   For **lab reports**: Patient Name, Test Name, Results, Reference Ranges, Date.
    *   For general notes: Title, Date, Key Points.
3.  **Be concise and clear.**
4.  If the document is unreadable or not a recognizable document type, respond with only this exact text: 'This document could not be analyzed.'`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, { text: prompt }] },
            config: { temperature: 0 }
        });
        return response.text;
    } catch (error) {
        console.error("Error extracting document info:", error);
        return "Sorry, I couldn't analyze the document. Please try again.";
    }
};


export const analyzeMood = async (base64Image: string): Promise<string> => {
    try {
        const imagePart = fileToGenerativePart(base64Image, 'image/jpeg');
        const prompt = "Analyze the facial expression in this image and describe the person's likely mood (e.g., happy, sad, anxious, neutral). Provide a one-word answer.";
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, { text: prompt }] },
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error analyzing mood:", error);
        return "unknown";
    }
};

export const createChat = (systemInstruction: string, history: ChatMessage[] = []): Chat => {
    const geminiHistory = history
        .filter(m => m.role === 'user' || m.role === 'model') // Exclude system messages from history for the API
        .map(m => ({
            role: m.role,
            parts: [{ text: m.content }] // simplified history for text-based continuity
        }));

    return ai.chats.create({
        model: 'gemini-2.5-flash',
        history: geminiHistory,
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.9,
            safetySettings: [
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                },
            ],
        }
    });
};

export const createQuizChat = (): Chat => {
    const systemInstruction = `You are a compassionate mental health screener. Your goal is to conduct an interactive quiz to understand the user's situation better.
    1. Start by asking a single, clear, multiple-choice or yes/no question based on the user's initial problem description.
    2. After each user answer, ask another follow-up question to narrow down the problem. Keep questions concise.
    3. After about 10-15 questions, or when you have enough information, respond with "ANALYSIS_COMPLETE:" followed by a comprehensive summary.
    4. For the final summary, use Google Search to find relevant, reliable information. Provide supportive guidance and suggest next steps (like talking to a professional).
    5. CRITICAL: Do not provide a medical diagnosis. Start the final summary with a disclaimer that you are an AI and not a substitute for a real doctor.
    `;
    return ai.chats.create({
        model: 'gemini-2.5-pro',
        config: {
            systemInstruction: systemInstruction,
            tools: [{ googleSearch: {} }],
            thinkingConfig: { thinkingBudget: 32768 }
        },
    });
};

export const transcribeAudio = async (audioBase64: string, mimeType: string): Promise<string> => {
     try {
        const audioPart = fileToGenerativePart(audioBase64, mimeType);
        const prompt = "Transcribe the following audio.";
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [audioPart, { text: prompt }] }
        });
        return response.text;
    } catch (error) {
        console.error("Error transcribing audio:", error);
        return "Audio transcription failed.";
    }
};