import { useState, useCallback, useRef } from "react";

import type { ChatMessage } from "../../types";

export const useScenePartner = () => {
  const [rehearsing, setRehearsing] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [partnerStatus, setPartnerStatus] = useState<"ready" | "thinking">(
    "ready"
  );
  const chatEndRef = useRef<HTMLDivElement>(null);

  const startRehearsal = useCallback(() => {
    setRehearsing(true);
    setPartnerStatus("ready");
    setChatMessages([
      {
        role: "ai",
        text: "مرحباً! أنا شريكك في المشهد. سأقوم بدور ليلى. ابدأ بقول سطرك الأول...",
      },
    ]);
  }, []);

  const sendMessage = useCallback(() => {
    const trimmedInput = userInput.trim();
    if (!trimmedInput || partnerStatus === "thinking") return;

    const newMessage: ChatMessage = { role: "user", text: trimmedInput };
    const typingMessage: ChatMessage = {
      role: "ai",
      text: "ليلى تفكر في الرد...",
      typing: true,
    };
    setPartnerStatus("thinking");
    setChatMessages((prev) => [...prev, newMessage, typingMessage]);
    setUserInput("");

    const currentMessages = [...chatMessages, newMessage];

    fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: trimmedInput,
        context: { previousMessages: currentMessages, character: "ليلى" },
      }),
    })
      .then((res) => res.json())
      .then((payload: { data?: { response?: string } }) => {
        const replyText =
          payload?.data?.response ?? "تعذر الاتصال بمساعد المشهد.";
        setChatMessages((prev) => {
          const withoutTyping = prev.filter((message) => !message.typing);
          return [...withoutTyping, { role: "ai", text: replyText }];
        });
      })
      .catch(() => {
        setChatMessages((prev) => {
          const withoutTyping = prev.filter((message) => !message.typing);
          return [
            ...withoutTyping,
            { role: "ai", text: "تعذر الاتصال بمساعد المشهد." },
          ];
        });
      })
      .finally(() => {
        setPartnerStatus("ready");
      });
  }, [chatMessages, partnerStatus, userInput]);

  const endRehearsal = useCallback(() => {
    setRehearsing(false);
    setPartnerStatus("ready");
    setChatMessages([]);
  }, []);

  return {
    rehearsing,
    chatMessages,
    userInput,
    partnerStatus,
    setUserInput,
    chatEndRef,
    startRehearsal,
    sendMessage,
    endRehearsal,
  };
};
