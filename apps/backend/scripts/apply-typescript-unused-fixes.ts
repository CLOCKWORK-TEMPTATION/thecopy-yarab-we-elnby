import path from "node:path";
import ts from "typescript";

const TARGET_CODES = new Set([6133, 6192, 6196]);
const MAX_PASSES = 5;

interface FileEdit {
  fileName: string;
  spanStart: number;
  spanLength: number;
  newText: string;
}

function loadTsConfig(configPath: string) {
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(
      ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n"),
    );
  }

  return ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath),
  );
}

function createLanguageService(
  parsed: ts.ParsedCommandLine,
  currentDirectory: string,
) {
  const serviceHost: ts.LanguageServiceHost = {
    getScriptFileNames: () => parsed.fileNames,
    getScriptVersion: () => "0",
    getScriptSnapshot: (fileName) => {
      const content = ts.sys.readFile(fileName);
      return content === undefined
        ? undefined
        : ts.ScriptSnapshot.fromString(content);
    },
    getCurrentDirectory: () => currentDirectory,
    getCompilationSettings: () => parsed.options,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  };

  return ts.createLanguageService(serviceHost, ts.createDocumentRegistry());
}

function collectUnusedIdentifierEdits(
  service: ts.LanguageService,
  diagnostics: readonly ts.Diagnostic[],
): FileEdit[] {
  const formatSettings: ts.FormatCodeSettings = {
    indentSize: 2,
    tabSize: 2,
    convertTabsToSpaces: true,
    semicolons: ts.SemicolonPreference.Insert,
    newLineCharacter: "\n",
  };

  const userPreferences: ts.UserPreferences = {};
  const edits: FileEdit[] = [];

  for (const diagnostic of diagnostics) {
    if (
      !diagnostic.file
      || diagnostic.start === undefined
      || diagnostic.length === undefined
    ) {
      continue;
    }

    const fixes = service.getCodeFixesAtPosition(
      diagnostic.file.fileName,
      diagnostic.start,
      diagnostic.start + diagnostic.length,
      [diagnostic.code],
      formatSettings,
      userPreferences,
    );

    for (const fix of fixes) {
      if (fix.fixName !== "unusedIdentifier") {
        continue;
      }

      for (const change of fix.changes) {
        for (const textChange of change.textChanges) {
          edits.push({
            fileName: change.fileName,
            spanStart: textChange.span.start,
            spanLength: textChange.span.length,
            newText: textChange.newText,
          });
        }
      }
    }
  }

  return edits;
}

function applyEdits(edits: FileEdit[]): number {
  const editsByFile = new Map<string, FileEdit[]>();
  for (const edit of edits) {
    const fileEdits = editsByFile.get(edit.fileName) ?? [];
    fileEdits.push(edit);
    editsByFile.set(edit.fileName, fileEdits);
  }

  let filesChanged = 0;

  for (const [fileName, fileEdits] of editsByFile.entries()) {
    const originalText = ts.sys.readFile(fileName);
    if (originalText === undefined) {
      continue;
    }

    const uniqueEdits = [
      ...new Map(
        fileEdits.map((edit) => [
          `${edit.spanStart}:${edit.spanLength}:${edit.newText}`,
          edit,
        ]),
      ).values(),
    ].sort((left, right) => right.spanStart - left.spanStart);

    let nextBlockedStart = Number.POSITIVE_INFINITY;
    let updatedText = originalText;
    let appliedChanges = 0;

    for (const edit of uniqueEdits) {
      const editEnd = edit.spanStart + edit.spanLength;
      if (editEnd > nextBlockedStart) {
        continue;
      }

      updatedText =
        updatedText.slice(0, edit.spanStart)
        + edit.newText
        + updatedText.slice(editEnd);

      nextBlockedStart = edit.spanStart;
      appliedChanges += 1;
    }

    if (appliedChanges === 0 || updatedText === originalText) {
      continue;
    }

    ts.sys.writeFile(fileName, updatedText);
    filesChanged += 1;
  }

  return filesChanged;
}

async function main(): Promise<void> {
  const configArg = process.argv[2] ?? "tsconfig.json";
  const configPath = path.resolve(process.cwd(), configArg);
  const parsed = loadTsConfig(configPath);
  const currentDirectory = path.dirname(configPath);

  let totalChangedFiles = 0;

  for (let pass = 1; pass <= MAX_PASSES; pass += 1) {
    const service = createLanguageService(parsed, currentDirectory);
    const program = service.getProgram();
    if (!program) {
      throw new Error("Failed to create TypeScript program.");
    }

    const diagnostics = ts
      .getPreEmitDiagnostics(program)
      .filter(
        (diagnostic) =>
          TARGET_CODES.has(diagnostic.code)
          && Boolean(diagnostic.file)
          && !diagnostic.file?.isDeclarationFile,
      );

    if (diagnostics.length === 0) {
      console.log(`No unused diagnostics left after pass ${pass - 1}.`);
      break;
    }

    const edits = collectUnusedIdentifierEdits(service, diagnostics);
    if (edits.length === 0) {
      console.log(`No code fixes available on pass ${pass}.`);
      break;
    }

    const changedFiles = applyEdits(edits);
    totalChangedFiles += changedFiles;
    console.log(
      `Pass ${pass}: applied unused-identifier fixes in ${changedFiles} files.`,
    );

    if (changedFiles === 0) {
      break;
    }
  }

  console.log(`Finished. Files changed: ${totalChangedFiles}.`);
}

main().catch((error) => {
  console.error("Failed to apply TypeScript unused fixes.", error);
  process.exit(1);
});
