import * as path from "path";

import { logger } from "../src/rag/config.js";
import {
  createCollection,
  indexCodebase,
  getIndexStats,
} from "../src/rag/indexer.js";

async function main() {
  try {
    logger.info("🚀 Starting RAG indexing process...");

    await createCollection();

    const rootDir = path.resolve(process.cwd(), "src");
    await indexCodebase(rootDir);

    const stats = await getIndexStats();
    logger.info("📊 Indexing Statistics:");
    logger.info(`  - Total points: ${stats.totalPoints}`);
    logger.info(`  - Vectors count: ${stats.vectorsCount}`);

    logger.info("✅ Indexing completed successfully!");
    process.exit(0);
  } catch (error) {
    logger.error({ error }, "❌ Indexing failed");
    process.exit(1);
  }
}

main();
