import { AIRequest } from "../core/types";

export function buildPrompt(req: AIRequest): string {
  const base = `You are an AI agent specialized in ${req.agent}. Analyze the provided content and respond in Arabic.`;
  const filesHint =
    req.files
      ?.map((f) => `• ${f.fileName} (${f.sizeBytes} bytes)`)
      .join("\n") ?? "";
  return `${base}\n\n[USER PROMPT]\n${req.prompt}\n\n[FILES]\n${filesHint}`;
}
