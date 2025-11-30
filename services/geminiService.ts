
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { Lesson, ContentType } from "../types";

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
6. Рецензирование и корректура: Проверка материалов урока на ошибки, стиль и логику.

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

export const analyzeLessonContent = async (
  lesson: Lesson, 
  mode: 'grammar' | 'ideas' | 'rewrite',
  customPrompt?: string
): Promise<string> => {
    // Extract text content from blocks
    const contentText = lesson.blocks
        .filter(b => b.type === ContentType.TEXT || b.type === ContentType.QUIZ)
        .map(b => `[${b.type.toUpperCase()}] ${b.content} ${b.metadata ? JSON.stringify(b.metadata) : ''}`)
        .join('\n\n');

    if (!contentText.trim()) {
        return "Lesson has no text content to analyze.";
    }

    let prompt = `CONTEXT: Analysis of Lesson "${lesson.title}".\n\nCONTENT:\n${contentText}\n\n`;

    switch(mode) {
        case 'grammar':
            prompt += `TASK: Check this lesson content for spelling, grammar, and punctuation errors. 
            Also point out any unnatural phrasing for an English learner. 
            List errors with quotes and corrections. If no errors, say "Great job! No errors found."`;
            break;
        case 'ideas':
            prompt += `TASK: Suggest 3 creative activities to improve this lesson.
            1. An Ice-breaker or Warm-up relevant to the content.
            2. A 'Cooler' or wrap-up activity.
            3. A fun way to practice the specific vocabulary/grammar in the content.
            Be brief and practical.`;
            break;
        case 'rewrite':
            if (customPrompt) {
                 prompt += `TASK: ${customPrompt}`;
            } else {
                 prompt += `TASK: Suggest a better, more natural wording for the main text blocks. 
                 Provide a version for a higher level and a version for a lower level.`;
            }
            break;
    }

    return sendMessageToArchitect(prompt);
};
