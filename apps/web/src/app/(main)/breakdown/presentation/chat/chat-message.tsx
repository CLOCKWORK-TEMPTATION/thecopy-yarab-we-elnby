import React from "react";
import { Bot, User } from "lucide-react";
import type { Message } from "../../application/workspace/use-breakdown-chat";

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <Avatar isUser={isUser} />
      <MessageBubble isUser={isUser} text={message.text} />
    </div>
  );
};

interface AvatarProps {
  isUser: boolean;
}

const Avatar: React.FC<AvatarProps> = ({ isUser }) => (
  <div
    className={`
    w-8 h-8 rounded-full flex items-center justify-center shrink-0 border
    ${
      isUser
        ? "bg-indigo-600 border-indigo-500"
        : "bg-white/[0.04] border-white/8"
    }
  `}
  >
    {isUser ? (
      <User className="w-4 h-4 text-white" />
    ) : (
      <Bot className="w-4 h-4 text-blue-400" />
    )}
  </div>
);

interface MessageBubbleProps {
  isUser: boolean;
  text: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ isUser, text }) => (
  <div
    className={`
    p-3 rounded-2xl text-sm leading-relaxed max-w-[80%] whitespace-pre-wrap
    ${
      isUser
        ? "bg-indigo-600/20 text-indigo-100 rounded-tr-none border border-indigo-500/30"
        : "bg-white/[0.04] text-white/85 rounded-tl-none border border-white/8"
    }
  `}
  >
    {text}
  </div>
);

export default ChatMessage;
