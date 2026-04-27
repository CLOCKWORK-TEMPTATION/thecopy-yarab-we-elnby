import { logger } from "../src/rag/config.js";
import { askQuestion } from "../src/rag/query.js";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    logger.error(
      'Usage: pnpm --filter @the-copy/web editor:rag:ask "your question here"'
    );
    process.exit(1);
  }

  const question = args.join(" ");

  try {
    logger.info(`❓ Question: ${question}`);

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
      logger.info(`    ${source.snippet}`);
    });

    logger.info("\n" + "=".repeat(80));

    process.exit(0);
  } catch (error) {
    logger.error({ error }, "❌ Query failed");
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  logger.error({ error }, "❌ Unexpected query failure");
  process.exit(1);
});
