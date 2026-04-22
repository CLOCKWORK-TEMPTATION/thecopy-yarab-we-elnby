import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Bot } from "lucide-react";
import { useBreakdownChat } from "../../application/workspace/use-breakdown-chat";
import ChatMessage from "./chat-message";

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, input, setInput, isLoading, sendMessage } =
    useBreakdownChat(isOpen);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const lastMessage = messages.at(-1);
  const isWaitingForResponse = isLoading && lastMessage?.role === "user";

  return (
    <>
      <ToggleButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)} />

      {isOpen && (
        <div className="fixed bottom-24 left-6 z-50 w-[85vw] md:w-96 bg-black/28 backdrop-blur-2xl border border-white/8 rounded-[22px] shadow-2xl flex flex-col overflow-hidden max-h-[600px] h-[70vh] animate-fadeIn">
          <ChatHeader />

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isWaitingForResponse && <LoadingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          <ChatInput
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            onSubmit={sendMessage}
          />
        </div>
      )}
    </>
  );
};

interface ToggleButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

const ToggleButton: React.FC<ToggleButtonProps> = ({ isOpen, onClick }) => (
  <button
    onClick={onClick}
    className="fixed bottom-6 left-6 z-50 p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-xl transition-all hover:scale-110 flex items-center justify-center border border-blue-400/30"
    title="المساعد الذكي"
  >
    {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
  </button>
);

const ChatHeader: React.FC = () => (
  <div className="p-4 bg-black/14 border-b border-white/8 flex items-center gap-3">
    <div className="p-2 bg-blue-600/20 rounded-lg border border-blue-600/30">
      <Bot className="w-5 h-5 text-blue-400" />
    </div>
    <div>
      <h3 className="font-bold text-white text-sm">المساعد الذكي</h3>
      <p className="text-xs text-white/55">مدعوم بخدمة البريك دون على الخادم</p>
    </div>
  </div>
);

const LoadingIndicator: React.FC = () => (
  <div className="flex gap-3 flex-row">
    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border bg-white/6 border-white/8">
      <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
    </div>
  </div>
);

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  isLoading,
  onSubmit,
}) => (
  <form
    onSubmit={onSubmit}
    className="p-3 bg-black/14 border-t border-white/8 flex gap-2"
  >
    <input
      type="text"
      value={input}
      onChange={(e) => setInput(e.target.value)}
      placeholder="اطرح سؤالك هنا..."
      className="flex-1 bg-white/6 border-white/8 text-white/85 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder:text-white/45"
      disabled={isLoading}
    />
    <button
      type="submit"
      disabled={isLoading || !input.trim()}
      className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <Send className="w-5 h-5 rtl:rotate-180" />
    </button>
  </form>
);

export default ChatBot;
