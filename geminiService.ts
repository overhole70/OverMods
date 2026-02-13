import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateModDescription = async (title: string, type: string, category: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `قم بكتابة وصف جذاب ومشوق لمود ماين كرافت بعنوان "${title}" من نوع "${type}" وفئة "${category}". اجعل الوصف باللغة العربية بأسلوب احترافي للاعبين.`,
      config: {
        // Fix: Added thinkingBudget as per guidelines when maxOutputTokens is set to ensure model tokens are balanced.
        maxOutputTokens: 300,
        thinkingConfig: { thinkingBudget: 100 },
        temperature: 0.7,
      }
    });
    return response.text || "فشل في إنشاء الوصف.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "لا يمكن إنشاء وصف حالياً.";
  }
};