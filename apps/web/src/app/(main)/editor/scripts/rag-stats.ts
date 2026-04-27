import { logger } from "@/lib/logger";
import { logger } from "../src/rag/config.js";
import { getIndexStats } from "../src/rag/indexer.js";

async function main() {
  try {
    const stats = await getIndexStats();

    logger.info("\n" + "=".repeat(80));
    logger.info("📊 RAG Index Statistics");
    logger.info("=".repeat(80));
    logger.info(`Total Points: ${stats.totalPoints}`);
    logger.info(`Vectors Count: ${stats.vectorsCount}`);
    logger.info("=".repeat(80) + "\n");

    process.exit(0);
  } catch (error) {
    logger.error({ error }, "❌ Failed to get stats");
    process.exit(1);
  }
}

main();
