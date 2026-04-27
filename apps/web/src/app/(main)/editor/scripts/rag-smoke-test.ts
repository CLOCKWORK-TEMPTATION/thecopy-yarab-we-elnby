import { logger } from "@/lib/logger";
import * as path from "path";

import { chunkFile } from "../src/rag/chunker.js";
import {
  qdrantClient,
  RAG_COLLECTION_NAME,
  logger,
} from "../src/rag/config.js";
import { generateEmbeddingsBatch } from "../src/rag/embeddings.js";
import { createCollection, getIndexStats } from "../src/rag/indexer.js";
import { askQuestion } from "../src/rag/query.js";

async function smokeTest() {
  try {
    logger.info("🧪 Starting RAG Smoke Test...");

    logger.info("Step 1: Creating collection...");
    await createCollection();

    logger.info("Step 2: Indexing single file (src/editor.ts)...");
    const testFile = path.resolve(process.cwd(), "src/editor.ts");
    const chunks = chunkFile(testFile);
    logger.info(`  - Generated ${chunks.length} chunks`);

    const texts = chunks.map((chunk) => chunk.content);
    const embeddings = await generateEmbeddingsBatch(texts);
    logger.info(`  - Generated ${embeddings.length} embeddings`);

    const points = chunks.map((chunk, idx) => {
      const vector = embeddings[idx];
      if (!vector) {
        throw new Error(`Missing embedding for chunk index ${idx}`);
      }

      return {
        id: idx,
        vector,
        payload: {
          content: chunk.content,
          ...chunk.metadata,
        },
      };
    });

    await qdrantClient.upsert(RAG_COLLECTION_NAME, {
      wait: true,
      points,
    });
    logger.info("  - Uploaded to Qdrant Cloud");

    logger.info("Step 3: Getting stats...");
    const stats = await getIndexStats();
    logger.info(`  - Total points: ${stats.totalPoints}`);
    logger.info(`  - Vectors count: ${stats.vectorsCount}`);

    logger.info("Step 4: Testing RAG query...");
    const question = "ما هي الـ extensions المستخدمة في المحرر؟";
    logger.info(`  - Question: ${question}`);

    const response = await askQuestion(question);

    logger.info("\n" + "=".repeat(80));
    logger.info("📝 Answer:");
    logger.info("=".repeat(80));
    logger.info(response.answer);
    logger.info("\n" + "=".repeat(80));
    logger.info("📚 Sources:");
    logger.info("=".repeat(80));

    response.sources.forEach((source, idx) => {
      logger.info(
        `\n[${idx + 1}] ${source.filePath} (score: ${source.score.toFixed(3)})`
      );
    });

    logger.info("\n" + "=".repeat(80));

    logger.info("✅ Smoke test completed successfully!");
    process.exit(0);
  } catch (error) {
    logger.error({ error }, "❌ Smoke test failed");
    process.exit(1);
  }
}

smokeTest();
