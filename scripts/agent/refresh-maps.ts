import { buildMapFiles } from "./lib/maps";
import { collectRepoFacts } from "./lib/repo-state";
import { writeTextIfChanged, fromRepoRoot, toRepoRelative } from "./lib/utils";

async function main(): Promise<void> {
  const facts = await collectRepoFacts();
  const updatedPaths: string[] = [];

  for (const mapFile of buildMapFiles(facts)) {
    const absolutePath = fromRepoRoot(mapFile.path);
    const changed = await writeTextIfChanged(absolutePath, mapFile.content);
    if (changed) {
      updatedPaths.push(toRepoRelative(absolutePath));
    }
  }

  if (updatedPaths.length === 0) {
    console.log("لم يلزم تحديث الخرائط.");
    return;
  }

  console.log("تم تحديث الخرائط التالية:");
  for (const updatedPath of updatedPaths) {
    console.log(`- ${updatedPath}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`فشل تحديث الخرائط: ${message}`);
  process.exit(1);
});