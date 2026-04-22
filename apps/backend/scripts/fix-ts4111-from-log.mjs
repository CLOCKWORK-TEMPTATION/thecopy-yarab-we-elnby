import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const repoRoot = path.resolve(process.cwd());
const logPath = path.resolve(repoRoot, process.argv[2] ?? "output/tsc-backend.log");

const diagnosticPattern =
  /^((?:apps\/backend\/)?src\/.+?)\((\d+),(\d+)\): error TS4111: Property '([^']+)' comes from an index signature/;

function findNodeAtPosition(node, position, sourceFile) {
  if (position < node.getStart(sourceFile) || position >= node.getEnd()) {
    return undefined;
  }

  for (const child of node.getChildren(sourceFile)) {
    const match = findNodeAtPosition(child, position, sourceFile);
    if (match) {
      return match;
    }
  }

  return node;
}

if (!fs.existsSync(logPath)) {
  throw new Error(`Missing log file: ${logPath}`);
}

const rawLog = fs.readFileSync(logPath, "utf8");
const fileDiagnostics = new Map();

for (const line of rawLog.split(/\r?\n/)) {
  const match = line.match(diagnosticPattern);
  if (!match) {
    continue;
  }

  const [, file, lineNumber, columnNumber, propertyName] = match;
  const diagnostics = fileDiagnostics.get(file) ?? [];
  diagnostics.push({
    line: Number(lineNumber),
    column: Number(columnNumber),
    propertyName,
  });
  fileDiagnostics.set(file, diagnostics);
}

for (const [relativeFilePath, diagnostics] of fileDiagnostics.entries()) {
  const normalizedRelativeFilePath = relativeFilePath.startsWith("src/")
    ? path.posix.join("apps/backend", relativeFilePath)
    : relativeFilePath;
  const absoluteFilePath = path.resolve(repoRoot, normalizedRelativeFilePath);
  const originalText = fs.readFileSync(absoluteFilePath, "utf8");
  const scriptKind = absoluteFilePath.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : absoluteFilePath.endsWith(".mts")
      ? ts.ScriptKind.MTS
      : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    absoluteFilePath,
    originalText,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );
  const lineStarts = sourceFile.getLineStarts();
  const edits = [];

  for (const diagnostic of diagnostics) {
    const lineStart = lineStarts[diagnostic.line - 1];
    if (lineStart === undefined) {
      continue;
    }

    const position = lineStart + diagnostic.column - 1;
    let node = findNodeAtPosition(sourceFile, position, sourceFile);
    while (node && !ts.isPropertyAccessExpression(node)) {
      node = node.parent;
    }

    if (!node || node.name.text !== diagnostic.propertyName) {
      continue;
    }

    const isOptionalChain = "questionDotToken" in node && node.questionDotToken != null;
    edits.push({
      start: node.expression.getStart(sourceFile),
      end: node.getEnd(),
      replacement: `${node.expression.getText(sourceFile)}${isOptionalChain ? "?." : ""}["${diagnostic.propertyName}"]`,
    });
  }

  const uniqueEdits = [...new Map(edits.map((edit) => [`${edit.start}:${edit.end}`, edit])).values()]
    .sort((left, right) => right.start - left.start);

  if (uniqueEdits.length === 0) {
    continue;
  }

  let updatedText = originalText;
  for (const edit of uniqueEdits) {
    updatedText =
      updatedText.slice(0, edit.start) +
      edit.replacement +
      updatedText.slice(edit.end);
  }

  fs.writeFileSync(absoluteFilePath, updatedText);
  console.log(`patched ${normalizedRelativeFilePath}: ${uniqueEdits.length}`);
}
