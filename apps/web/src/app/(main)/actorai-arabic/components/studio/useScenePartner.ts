import { useState, useCallback, useRef } from "react";
import type { ChatMessage } from "../../types";

export const useScenePartner = () => {
  const [rehearsing, setRehearsing] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const startRehearsal = useCallback(() => {
    setRehearsing(true);
    setChatMessages([
      {
        role: "ai",
        text: "مرحباً! أنا شريكك في المشهد. سأقوم بدور ليلى. ابدأ بقول سطرك الأول...",
      },
    ]);
  }, []);

  const sendMessage = useCallback(() => {
    if (!userInput.trim()) return;

    const newMessage: ChatMessage = { role: "user", text: userInput };
    setChatMessages((prev) => [...prev, newMessage]);
    setUserInput("");

    // محاكاة رد AI
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        role: "ai",
        text: "ممتاز! لقد عبرت عن مشاعرك بوضوح. حاول إضافة المزيد من العمق العاطفي في الجملة التالية.",
      };
      setChatMessages((prev) => [...prev, aiResponse]);
    }, 1000);
  }, [userInput]);

  const endRehearsal = useCallback(() => {
    setRehearsing(false);
    setChatMessages([]);
  }, []);

  return {
    rehearsing,
    chatMessages,
    userInput,
    setUserInput,
    chatEndRef,
    startRehearsal,
    sendMessage,
    endRehearsal,
  };
};
