import { useState, useCallback, useRef } from "react";

import { buildScenePartnerReply } from "../../lib/studio-engines";

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

    setTimeout(() => {
      setChatMessages((prev) => {
        const withoutTyping = prev.filter((message) => !message.typing);
        const aiResponse: ChatMessage = {
          role: "ai",
          text: buildScenePartnerReply(withoutTyping, trimmedInput),
        };
        return [...withoutTyping, aiResponse];
      });
      setPartnerStatus("ready");
    }, 600);
  }, [partnerStatus, userInput]);

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
