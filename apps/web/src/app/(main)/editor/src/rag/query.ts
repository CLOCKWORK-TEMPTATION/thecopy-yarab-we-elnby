import { GoogleGenAI } from "@google/genai";

import { stringifyUnknown } from "@/lib/utils/unknown-values";

import {
  qdrantClient,
  RAG_COLLECTION_NAME,
  GEMINI_API_KEY,
  logger,
} from "./config";
import { generateEmbedding } from "./embeddings";
import { SearchResult, RagResponse } from "./types";

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export async function searchCode(
  query: string,
  limit = 5
): Promise<SearchResult[]> {
  try {
    logger.info({ query, limit }, "Searching code...");

    const queryEmbedding = await generateEmbedding(query);

    const searchResult = await qdrantClient.search(RAG_COLLECTION_NAME, {
      vector: queryEmbedding,
      limit,
      with_payload: true,
    });

    const results: SearchResult[] = searchResult.map(
      (result: {
        id: string | number;
        score: number;
        payload?: Record<string, unknown> | null;
      }) => {
        const p = result.payload ?? {};
        const metadata: SearchResult["chunk"]["metadata"] = {
          filePath: stringifyUnknown(p.filePath),
          fileName: stringifyUnknown(p.fileName),
          fileType: stringifyUnknown(p.fileType),
          chunkIndex: Number(p.chunkIndex ?? 0),
          totalChunks: Number(p.totalChunks ?? 0),
          language: stringifyUnknown(p.language),
          ...(typeof p.functionName === "string" && {
            functionName: p.functionName,
          }),
          ...(typeof p.className === "string" && { className: p.className }),
          ...(typeof p.section === "string" && { section: p.section }),
          ...(typeof p.startLine === "number" && { startLine: p.startLine }),
          ...(typeof p.endLine === "number" && { endLine: p.endLine }),
        };

        return {
          chunk: {
            content: stringifyUnknown(p.content),
            metadata,
          },
          score: result.score || 0,
          id: result.id,
        };
      }
    );

    logger.info(`Found ${results.length} results`);
    return results;
  } catch (error) {
    logger.error({ error }, "Failed to search code");
    throw error;
  }
}

export async function askQuestion(question: string): Promise<RagResponse> {
  try {
    logger.info({ question }, "Processing RAG question...");

    const searchResults = await searchCode(question, 5);

    if (searchResults.length === 0) {
      return {
        answer: "لم أجد معلومات كافية في الكود للإجابة على هذا السؤال.",
        sources: [],
      };
    }

    const context = searchResults
      .map((result, idx) => {
        const { filePath, startLine, endLine } = result.chunk.metadata;
        const location =
          startLine && endLine
            ? `${filePath}:${startLine}-${endLine}`
            : filePath;
        return `[${idx + 1}] من ${location}:\n${result.chunk.content}`;
      })
      .join("\n\n---\n\n");

    const prompt = `أنت مساعد برمجي متخصص في تحليل كود TypeScript/JavaScript.
لديك وصول لأجزاء من كود المشروع.
أجب على السؤال بناءً على الكود المتاح فقط.
اذكر أسماء الملفات والـ functions ذات الصلة.
إذا لم تجد معلومات كافية، قل ذلك بوضوح.
استخدم اللغة العربية في الإجابة.

السؤال: ${question}

الكود المتاح:
${context}

أجب على السؤال بناءً على الكود أعلاه.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
      });

      const answer = response.text ?? "فشل في توليد الإجابة";

      return {
        answer,
        sources: searchResults.map((result) => ({
          filePath: result.chunk.metadata.filePath,
          snippet: result.chunk.content.slice(0, 200) + "...",
          score: result.score,
        })),
      };
    } catch (geminiError) {
      logger.warn({ geminiError }, "Gemini failed, trying alternative...");
      return {
        answer:
          "فشل في الاتصال بـ Gemini. النتائج المتاحة:\n\n" +
          searchResults
            .map(
              (r, i) =>
                `${i + 1}. ${r.chunk.metadata.filePath}\n${r.chunk.content.slice(0, 300)}...`
            )
            .join("\n\n"),
        sources: searchResults.map((result) => ({
          filePath: result.chunk.metadata.filePath,
          snippet: result.chunk.content.slice(0, 200) + "...",
          score: result.score,
        })),
      };
    }
  } catch (error) {
    logger.error({ error }, "Failed to generate RAG response");
    throw error;
  }
}
