const toMessageContent = (content) => {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((block) => {
      if (typeof block === "string") return block;
      if (!block || typeof block !== "object") return "";
      if (typeof block.text === "string") return block.text;
      return "";
    })
    .join("");
};

const toChatMessageRole = (message) => {
  const type =
    typeof message?._getType === "function"
      ? message._getType()
      : typeof message?.getType === "function"
        ? message.getType()
        : message?.role;
  if (type === "system") return "system";
  if (type === "ai" || type === "assistant") return "assistant";
  return "user";
};

const toOpenAiCompatibleMessages = (messages) =>
  messages.map((message) => ({
    role: toChatMessageRole(message),
    content: toMessageContent(message?.content),
  }));

const resolveOpenAiCompatibleMaxTokens = (target, maxTokens) => {
  if (!maxTokens) return undefined;
  if (target.provider === "deepseek") {
    return Math.min(maxTokens, 8192);
  }
  return maxTokens;
};

const createOpenAiCompatibleChatModel = (
  target,
  { temperature = 0, maxTokens = undefined, timeoutMs = undefined } = {},
) => ({
  async invoke(messages) {
    const response = await fetch(`${target.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${target.credential.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: target.model,
        messages: toOpenAiCompatibleMessages(messages),
        temperature,
        ...(maxTokens
          ? { max_tokens: resolveOpenAiCompatibleMaxTokens(target, maxTokens) }
          : {}),
      }),
      signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        payload?.error?.message ||
        payload?.message ||
        `OpenAI-compatible provider failed with status ${response.status}.`;
      const error = new Error(message);
      error.status = response.status;
      error.response = { status: response.status, data: payload };
      throw error;
    }

    const choice = payload?.choices?.[0] ?? {};
    return {
      content: choice.message?.content ?? "",
      response_metadata: {
        model: payload?.model ?? target.model,
        finish_reason: choice.finish_reason ?? null,
      },
      usage_metadata: {
        input_tokens: payload?.usage?.prompt_tokens ?? null,
        output_tokens: payload?.usage?.completion_tokens ?? null,
      },
    };
  },
});

/**
 * @param {{ provider: string, model: string, valid: boolean, error?: string, credential: { valid: boolean, apiKey: string, message?: string }, baseUrl?: string }} target
 * @param {{ temperature?: number, maxTokens?: number, timeoutMs?: number }} [options]
 * @returns {Promise<import("@langchain/core/language_models/chat_models").BaseChatModel>}
 */
export const createReviewModel = async (
  target,
  { temperature = 0, maxTokens = undefined, timeoutMs = undefined } = {},
) => {
  if (!target?.valid) {
    throw new Error(target?.error || "Review target is not valid.");
  }

  if (!target?.credential?.valid) {
    throw new Error(
      target?.credential?.message || "Provider credential is not valid.",
    );
  }

  if (target.provider === "anthropic") {
    const { ChatAnthropic } = await import("@langchain/anthropic");
    // Opus 4.7 يرفض temperature/top_p/top_k ويستخدم adaptive thinking فقط
    const isOpus47 = target.model === "claude-opus-4-7";
    /** @type {Record<string, unknown>} */
    const anthropicConfig = {
      model: target.model,
      apiKey: target.credential.apiKey,
      anthropicApiUrl: target.baseUrl,
      maxTokens,
      maxRetries: 0,
      timeout: timeoutMs,
    };
    if (!isOpus47) {
      anthropicConfig.temperature = temperature;
    } else {
      anthropicConfig.thinking = { type: "adaptive" };
    }
    return new ChatAnthropic(anthropicConfig);
  }

  if (target.provider === "openai") {
    return createOpenAiCompatibleChatModel(target, {
      temperature,
      maxTokens,
      timeoutMs,
    });
  }

  if (target.provider === "deepseek") {
    return createOpenAiCompatibleChatModel(target, {
      temperature,
      maxTokens,
      timeoutMs,
    });
  }

  if (target.provider === "google-genai") {
    const { ChatGoogleGenerativeAI } = await import("@langchain/google-genai");
    return new ChatGoogleGenerativeAI({
      model: target.model,
      apiKey: target.credential.apiKey,
      temperature,
      maxOutputTokens: maxTokens,
      timeout: timeoutMs,
    });
  }

  throw new Error(`Unsupported review provider: ${target.provider}`);
};
