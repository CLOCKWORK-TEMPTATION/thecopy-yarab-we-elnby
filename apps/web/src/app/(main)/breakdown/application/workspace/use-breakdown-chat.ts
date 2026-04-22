import { useCallback, useState } from "react";
import { chatWithBreakdownAssistant } from "../../infrastructure/platform-client";

export interface Message {
  id: string;
  role: "user" | "model";
  text: string;
}

interface UseBreakdownChatResult {
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  sendMessage: (e: React.FormEvent) => Promise<void>;
}

const INITIAL_MESSAGE: Message = {
  id: "1",
  role: "model",
  text: "مرحباً! أنا مساعد البريك دون داخل المنصة. اسألني عن المشاهد أو العناصر الإنتاجية أو الجدولة.",
};

const ERROR_MESSAGES = {
  generic: (message: string) =>
    `عذراً، تعذر الحصول على رد من الخدمة: ${message}`,
};

function createErrorMessage(text: string): Message {
  return {
    id: Date.now().toString(),
    role: "model",
    text,
  };
}

export function useBreakdownChat(enabled = false): UseBreakdownChatResult {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!enabled || !input.trim() || isLoading) {
        return;
      }

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        text: input,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);

      try {
        const result = await chatWithBreakdownAssistant(userMessage.text);
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-model`,
            role: "model",
            text: result.answer,
          },
        ]);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "خطأ غير معروف";
        setMessages((prev) => [
          ...prev,
          createErrorMessage(ERROR_MESSAGES.generic(errorMessage)),
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [enabled, input, isLoading]
  );

  return {
    messages,
    input,
    setInput,
    isLoading,
    sendMessage,
  };
}
