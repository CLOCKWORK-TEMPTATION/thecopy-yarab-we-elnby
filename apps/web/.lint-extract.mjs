import { readFileSync } from "node:fs";
const rule = process.argv[2] || "@typescript-eslint/no-unsafe-assignment";
const arr = JSON.parse(readFileSync(".eslint-out.json", "utf8"));
for (const f of arr) {
  const ms = (f.messages || []).filter((m) => m.ruleId === rule);
  if (!ms.length) continue;
  const path = f.filePath.replaceAll("\\", "/").replace(/.*?apps\/web\//, "");
  console.log(`-- ${path}`);
  for (const m of ms) {
    console.log(
      `  ${m.line}:${m.column}  ${m.message.replace(/\n/g, " ").slice(0, 140)}`
    );
  }
}
