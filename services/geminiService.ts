import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

let chatSession: Chat | null = null;

const SYSTEM_INSTRUCTION = `
Вы — опытный методист и старший преподаватель английского языка (уровень квалификации Delta/CELTA).
Ваша задача — помогать учителям английского языка в школе LinguaFlow.

Ваши возможности:
1. Создание планов уроков (Lesson Plans): Warm-up, Lead-in, Presentation, Practice (Controlled/Freer), Production.
2. Генерация упражнений: Fill in the gaps, Multiple choice, Matching, Sentence transformation.
3. Объяснение грамматики: Просто и доступно (или академически для высоких уровней).
4. Concept Checking Questions (CCQs): Помощь в проверке понимания сложных слов или правил.
5. Идеи для игр и активностей (для детей и взрослых).

Правила общения:
- Если пользователь пишет на русском, отвечайте на русском (но сами упражнения на английском).
- Если пользователь пишет на английском, отвечайте на английском.
- Будьте кратки, структурированы и практичны. Используйте Markdown (жирный текст, списки) для читаемости.
- Адаптируйте контент под уровень (A1-C1) и возраст (Kids/Adults), если это указано в запросе.

Пример запроса учителя: "Придумай 3 идеи для warm-up на тему Food для детей A1".
Ваш ответ должен содержать конкретные инструкции к играм.
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
    if (!success) return "Ошибка: API Key не настроен или неверен.";
  }
  
  try {
    const response: GenerateContentResponse = await chatSession!.sendMessage({ message });
    return response.text || "Я не получил ответа. Попробуйте еще раз.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Проблемы с подключением к AI. Проверьте API ключ.";
  }
};