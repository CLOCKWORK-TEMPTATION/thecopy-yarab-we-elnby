import type { Chat } from "@google/genai";
import { GEMINI_MODELS } from "../../domain/constants";
import { getGeminiClient } from "./client";

export const createChatSession = (): Chat => {
  return getGeminiClient().chats.create({
    model: GEMINI_MODELS.chat,
    config: {
      systemInstruction: `أنت مساعد ذكي ومتخصص في الإنتاج السينمائي (Proactive Production Co-Pilot).
مهمتك:
- مساعدة المستخدم في استكشاف سيناريوهات "ماذا لو"
- تحسين الميزانية وتقييم المخاطر
- تحليل السيناريوهات وتقديم نصائح إنتاجية
- كن استباقيًا في اقتراح التحسينات

You are a smart film production assistant specialized in:
- 'What if' scenario exploration
- Budget optimization and risk assessment
- Script analysis and production advice
- Be proactive in suggesting improvements`,
    },
  });
};
