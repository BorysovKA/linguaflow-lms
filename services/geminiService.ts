import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

let chatSession: Chat | null = null;

const SYSTEM_INSTRUCTION = `
You are an expert EdTech Product Manager and LMS Architect. 
You are consulting a school owner who wants to build an LMS for their English school (kids & adults).
The user has basic requirements: 4 roles (Admin, Methodist, Teacher, Student), material hosting, and lesson planning.

Your goal is to interview the user to uncover hidden requirements to make the system "maximally convenient" as they requested.

Do not ask all questions at once. Ask one or two probing questions at a time based on their replies.

Topics to cover eventually:
1. Student progress tracking & Grading (points, badges for kids vs grades for adults?).
2. Homework submission types (audio recording for pronunciation, text, photos?).
3. Scheduling complexities (recurring lessons, cancellations, substitutes).
4. Video conferencing integration (Zoom/Google Meet or built-in?).
5. Mobile usage (do students need a dedicated mobile app view?).
6. Monetization/Payments (do we need to block access if unpaid?).

Keep your tone professional, encouraging, and structured.
`;

export const initChat = () => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key missing");
    
    const ai = new GoogleGenAI({ apiKey });
    chatSession = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });
    return true;
  } catch (e) {
    console.error("Failed to init chat", e);
    return false;
  }
};

export const sendMessageToArchitect = async (message: string): Promise<string> => {
  if (!chatSession) {
    const success = initChat();
    if (!success) return "Error: API Key not configured or invalid.";
  }
  
  try {
    const response: GenerateContentResponse = await chatSession!.sendMessage({ message });
    return response.text || "I didn't get a response. Please try again.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having trouble connecting to the brain. Please check your API Key.";
  }
};