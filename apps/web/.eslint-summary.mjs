import { readFileSync } from "node:fs";
const path = process.argv[2] || ".eslint-full-1.json";
const arr = JSON.parse(readFileSync(path, "utf8"));
console.log("total result objects:", arr.length);
let withMsgs = 0;
let fatal = 0;
const fileViolations = {};
for (const f of arr) {
  if ((f.messages || []).length) withMsgs++;
  for (const m of f.messages || []) {
    if (m.fatal) fatal++;
    if (m.ruleId === "@typescript-eslint/no-unsafe-assignment") {
      const rel =
        f.filePath.replaceAll("\\", "/").split("apps/web/")[1] || f.filePath;
      fileViolations[rel] = (fileViolations[rel] || 0) + 1;
    }
  }
}
const total = Object.values(fileViolations).reduce((a, b) => a + b, 0);
console.log("files with messages:", withMsgs);
console.log("fatal messages:", fatal);
console.log(
  "no-unsafe-assignment total:",
  total,
  "files:",
  Object.keys(fileViolations).length
);
