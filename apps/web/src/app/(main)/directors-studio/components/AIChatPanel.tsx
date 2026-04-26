/**
 * @fileoverview مكوّن لوحة المحادثة مع المساعد الذكي
 *
 * السبب في وجود هذا المكوّن: توفير واجهة تفاعلية
 * للتواصل مع الذكاء الاصطناعي للحصول على مساعدة في الإخراج.
 *
 * يدعم:
 * - إرسال واستقبال الرسائل النصية
 * - اقتراحات سريعة للأسئلة الشائعة
 * - عرض حالة التحميل أثناء انتظار الرد
 */
"use client";

import { Sparkles, Send, User, Bot } from "lucide-react";
import { useState, useCallback, useMemo, memo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useChatWithAI } from "@/hooks/useAI";

/**
 * واجهة بيانات الرسالة
 */
interface Message {
  /** معرف الرسالة الفريد */
  id: string;
  /** دور المرسل (مستخدم أو مساعد) */
  role: "user" | "assistant";
  /** محتوى الرسالة */
  content: string;
  /** وقت الإرسال */
  timestamp: string;
}

/**
 * رسائل الخطأ
 */
const ERROR_MESSAGES = {
  chatError: "عذراً، حدث خطأ. الرجاء المحاولة مرة أخرى.",
} as const;

/**
 * اقتراحات الأسئلة الشائعة
 * السبب: مساعدة المستخدم على البدء بأسئلة مفيدة
 */
const DEFAULT_SUGGESTIONS = [
  "اقترح زوايا تصوير للمشهد الأول",
  "كيف أحسن الإضاءة في مشهد ليلي؟",
  "ما هي أفضل طريقة لتصوير مشهد مطاردة؟",
] as const;

/**
 * الرسالة الترحيبية الافتراضية
 */
const WELCOME_MESSAGE: Message = {
  id: "1",
  role: "assistant",
  content:
    "مرحباً! أنا مساعدك الذكي للإخراج السينمائي. كيف يمكنني مساعدتك اليوم؟",
  timestamp: "الآن",
};

/**
 * مكوّن عنصر رسالة فردية
 *
 * السبب في فصله: تحسين قابلية القراءة والأداء
 * من خلال تذكير الرسائل الفردية.
 */
const MessageItem = memo(function MessageItem({
  message,
}: {
  message: Message;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex gap-3 ${isUser ? "justify-start flex-row-reverse" : "justify-end"}`}
      data-testid={`message-${message.id}`}
    >
      <div
        className={`flex items-start gap-3 max-w-[80%] ${isUser ? "flex-row-reverse" : ""}`}
      >
        <div
          className={`p-2 rounded-full ${isUser ? "bg-[var(--app-accent)]" : "bg-[var(--app-surface)]"}`}
        >
          {isUser ? (
            <User className="w-4 h-4 text-white" />
          ) : (
            <Bot className="w-4 h-4 text-[var(--app-text-muted)]" />
          )}
        </div>

        <div
          className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
        >
          <div
            className={`p-4 rounded-md ${
              isUser
                ? "bg-[var(--app-accent)] text-white"
                : "bg-[var(--app-surface)] text-[var(--app-text)]"
            }`}
          >
            <p className="text-sm leading-relaxed">{message.content}</p>
          </div>
          <span className="text-xs text-[var(--app-text-muted)] px-2">
            {message.timestamp}
          </span>
        </div>
      </div>
    </div>
  );
});

/**
 * مكوّن مؤشر الكتابة (typing indicator)
 */
const TypingIndicator = memo(function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-end">
      <div className="flex items-start gap-3 max-w-[80%]">
        <div className="p-2 rounded-full bg-[var(--app-surface)]">
          <Bot className="w-4 h-4 text-[var(--app-text-muted)]" />
        </div>
        <div className="p-4 rounded-md bg-[var(--app-surface)]">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-[var(--app-text-muted)] rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-[var(--app-text-muted)] rounded-full animate-bounce delay-100" />
            <div className="w-2 h-2 bg-[var(--app-text-muted)] rounded-full animate-bounce delay-200" />
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * مكوّن لوحة المحادثة مع المساعد الذكي
 *
 * السبب في التصميم: توفير تجربة محادثة طبيعية
 * مع الذكاء الاصطناعي لمساعدة المخرج في قرارات الإخراج.
 *
 * @returns عنصر React يعرض لوحة المحادثة
 */
export default function AIChatPanel() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const chatMutation = useChatWithAI();
  const { toast } = useToast();

  /**
   * التحقق من إمكانية الإرسال
   */
  const canSend = useMemo(
    () => input.trim().length > 0 && !chatMutation.isPending,
    [input, chatMutation.isPending]
  );

  /**
   * معالج إرسال الرسالة
   *
   * السبب في useCallback: تجنب إنشاء دالة جديدة في كل render
   * لأنها تُمرر لعناصر متعددة.
   */
  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    // إنشاء رسالة المستخدم
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: trimmedInput,
      timestamp: "الآن",
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = trimmedInput;
    setInput("");

    // إنشاء رسالة مؤقتة للرد
    const streamingMessageId = (Date.now() + 1).toString();
    const streamingMessage: Message = {
      id: streamingMessageId,
      role: "assistant",
      content: "",
      timestamp: "الآن",
    };
    setMessages((prev) => [...prev, streamingMessage]);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await chatMutation.mutateAsync({
        message: currentInput,
        history,
      });

      // تحديث الرسالة المؤقتة بالرد الفعلي من الذكاء الاصطناعي
      const aiResponse =
        typeof result === "string"
          ? result
          : (
              result as {
                response?: string;
                content?: string;
                message?: string;
              }
            )?.response ??
            (
              result as {
                response?: string;
                content?: string;
                message?: string;
              }
            )?.content ??
            (
              result as {
                response?: string;
                content?: string;
                message?: string;
              }
            )?.message ??
            "تم استلام الرد بنجاح.";

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamingMessageId ? { ...msg, content: aiResponse } : msg
        )
      );
    } catch (error) {
      // تسجيل الخطأ وعرض رسالة للمستخدم
      const errorMessage =
        error instanceof Error ? error.message : ERROR_MESSAGES.chatError;

      // تحديث الرسالة المؤقتة برسالة الخطأ
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamingMessageId
            ? { ...msg, content: ERROR_MESSAGES.chatError }
            : msg
        )
      );

      toast({
        title: "حدث خطأ",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [input, messages, chatMutation, toast]);

  /**
   * معالج الضغط على اقتراح
   */
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInput(suggestion);
  }, []);

  /**
   * معالج الضغط على Enter للإرسال
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && canSend) {
        handleSend();
      }
    },
    [canSend, handleSend]
  );

  /**
   * هل يجب عرض الاقتراحات؟
   */
  const showSuggestions = messages.length === 1;

  return (
    <Card
      className="h-[600px] flex flex-col border-[var(--app-border)] bg-[var(--app-surface)]"
      data-testid="card-ai-chat"
    >
      <CardHeader className="border-b border-[var(--app-border)]">
        <CardTitle className="flex items-center justify-end gap-2 text-[var(--app-text)]">
          <span>المساعد الذكي</span>
          <Sparkles className="w-5 h-5 text-[var(--app-accent)]" />
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))}

            {chatMutation.isPending && <TypingIndicator />}
          </div>
        </ScrollArea>

        {showSuggestions && (
          <div className="px-6 pb-4">
            <p className="text-sm text-[var(--app-text-muted)] mb-3 text-right">
              اقتراحات:
            </p>
            <div className="flex flex-wrap gap-2 justify-end">
              {DEFAULT_SUGGESTIONS.map((suggestion, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => handleSuggestionClick(suggestion)}
                  data-testid={`suggestion-${idx}`}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="p-6 border-t border-[var(--app-border)]">
          <div className="flex gap-2">
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!canSend}
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب سؤالك هنا..."
              className="text-right"
              data-testid="input-chat-message"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
