#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const ts = require("typescript");

const ROOT_DIR = process.cwd();
const WEB_SRC_DIR = path.join(ROOT_DIR, "apps", "web", "src");
const FRONTEND_MAIN_DIR = path.join(WEB_SRC_DIR, "app", "(main)");
const BACKEND_SRC_DIR = path.join(ROOT_DIR, "apps", "backend", "src");
const SUPPORTED_CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
]);
const HTTP_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
]);
const DIRECT_HTTP_METHODS = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head",
]);
const MAX_AI_FILE_COUNT = 20;
const MAX_AI_FILE_CHARS = 7000;
const FRONTEND_HELPER_PREFIXES = Object.freeze({
  artDirectorApiPath: "/api/art-director",
  fetchArtDirectorJson: "/api/art-director",
  fetchBreakdown: "/api/breakdown",
  resolveApiUrl: "",
});

const backendModuleCache = new Map();
const frontendModuleCache = new Map();

main().catch((error) => {
  console.error("Hybrid audit failed to execute.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

async function main() {
  const startedAt = new Date().toISOString();
  const scope = resolveAuditScope();

  if (
    scope.frontendFiles.length === 0 &&
    scope.changedBackendFiles.length === 0
  ) {
    const skippedSummary = [
      "# Hybrid Production Audit",
      "",
      "- Status: skipped",
      "- Reason: no pull request changes matched the configured frontend/backend scope.",
    ].join("\n");
    writeStepSummary(skippedSummary);
    console.log(skippedSummary);
    return;
  }

  const backendRoutes = collectBackendRoutes();
  const frontendAnalyses = scope.frontendFiles.map((filePath) =>
    analyzeFrontendFile(filePath),
  );
  const allFrontendCalls = frontendAnalyses.flatMap((entry) => entry.calls);
  const unresolvedCalls = frontendAnalyses.flatMap(
    (entry) => entry.unresolvedCalls,
  );
  const missingEndpoints = findMissingEndpoints(
    allFrontendCalls,
    backendRoutes,
  );

  const staticPayload = {
    startedAt,
    scope: {
      frontendFiles: scope.frontendFiles.map(toRelativePath),
      changedBackendFiles: scope.changedBackendFiles.map(toRelativePath),
    },
    frontendCalls: allFrontendCalls.map((call) => ({
      file: toRelativePath(call.filePath),
      line: call.line,
      method: call.method,
      path: call.path,
      source: call.source,
    })),
    unresolvedCalls: unresolvedCalls.map((call) => ({
      file: toRelativePath(call.filePath),
      line: call.line,
      source: call.source,
      details: call.details,
    })),
    backendRoutes: backendRoutes.map((route) => ({
      method: route.method,
      path: route.path,
      file: toRelativePath(route.filePath),
    })),
    missingEndpoints: missingEndpoints.map((issue) => ({
      file: toRelativePath(issue.call.filePath),
      line: issue.call.line,
      method: issue.call.method,
      path: issue.call.path,
      source: issue.call.source,
    })),
  };

  const aiConfig = resolveAiConfig();
  const aiReview = await runAiReview({
    aiConfig,
    backendRoutes,
    missingEndpoints,
    unresolvedCalls,
    frontendAnalyses,
  });

  const shouldFail = missingEndpoints.length > 0 || aiReview.status === "fail";
  const reportText = formatReport({
    startedAt,
    backendRoutes,
    frontendAnalyses,
    unresolvedCalls,
    missingEndpoints,
    aiReview,
    status: shouldFail ? "fail" : "pass",
  });

  writeStepSummary(reportText.summaryMarkdown);
  console.log(reportText.consoleReport);
  console.log("\nStatic payload:");
  console.log(JSON.stringify(staticPayload, null, 2));
  console.log("\nAI verdict:");
  console.log(JSON.stringify(aiReview, null, 2));

  process.exitCode = shouldFail ? 1 : 0;
}

function resolveAuditScope() {
  const explicitFrontendFiles = parseExplicitFrontendFiles(
    process.env.HYBRID_AUDIT_FRONTEND_FILES,
  );
  const frontendFiles =
    explicitFrontendFiles.length > 0
      ? explicitFrontendFiles
      : getChangedFilesInScope(
          path.join("apps", "web", "src", "app", "(main)"),
        ).filter(isAuditableFrontendFile);

  const changedBackendFiles = getChangedFilesInScope(
    path.join("apps", "backend"),
  ).filter(
    (filePath) => filePath.startsWith(BACKEND_SRC_DIR) && isCodeFile(filePath),
  );

  return {
    frontendFiles: unique(frontendFiles),
    changedBackendFiles: unique(changedBackendFiles),
  };
}

function parseExplicitFrontendFiles(rawValue) {
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(/[\r\n,]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) =>
      path.isAbsolute(value) ? value : path.resolve(ROOT_DIR, value),
    )
    .filter((value) => fs.existsSync(value))
    .filter(isAuditableFrontendFile);
}

function getChangedFilesInScope(scopeRelativePath) {
  const diffSpecs = buildGitDiffSpecs();
  for (const diffSpec of diffSpecs) {
    const output = runGit(
      [
        "diff",
        "--name-only",
        "--diff-filter=ACMR",
        diffSpec,
        "--",
        scopeRelativePath,
      ],
      true,
    );

    if (!output) {
      continue;
    }

    const files = output
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => path.resolve(ROOT_DIR, value))
      .filter((value) => fs.existsSync(value));

    if (files.length > 0) {
      return unique(files);
    }
  }

  return [];
}

function buildGitDiffSpecs() {
  const explicitBase = (process.env.HYBRID_AUDIT_DIFF_BASE || "").trim();
  const explicitHead = (process.env.HYBRID_AUDIT_DIFF_HEAD || "HEAD").trim();
  const baseRef = (process.env.GITHUB_BASE_REF || "").trim();
  const specs = [];

  if (explicitBase) {
    specs.push(`${explicitBase}...${explicitHead}`);
  }

  if (baseRef) {
    specs.push(`origin/${baseRef}...HEAD`);
  }

  specs.push("HEAD~1...HEAD");
  specs.push("HEAD");
  return unique(specs);
}

function analyzeFrontendFile(filePath) {
  const sourceText = readText(filePath);
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    inferScriptKind(filePath),
  );
  const fileInfo = getFrontendModuleInfo(filePath);
  const calls = [];
  const unresolvedCalls = [];
  const scopeStack = [new Map()];

  const evaluateLocalExpression = (
    expression,
    localResolver = findLocalBinding,
    seenKeys = new Set(),
  ) =>
    evaluateFrontendExpression({
      filePath,
      expression,
      localResolver,
      importResolver: (identifier) =>
        resolveImportedFrontendValue(filePath, identifier, seenKeys),
      seenKeys,
    });

  visit(sourceFile);

  return {
    filePath,
    calls: dedupeCalls(calls),
    unresolvedCalls: dedupeUnresolved(unresolvedCalls),
    content: sourceText,
    snippet: truncateMiddle(sourceText, MAX_AI_FILE_CHARS),
  };

  function visit(node) {
    let pushedScope = false;
    if (
      node !== sourceFile &&
      (ts.isBlock(node) ||
        ts.isFunctionLike(node) ||
        ts.isModuleBlock(node) ||
        ts.isCaseBlock(node))
    ) {
      scopeStack.push(new Map());
      pushedScope = true;
    }

    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      scopeStack[scopeStack.length - 1].set(node.name.text, node.initializer);
    }

    if (ts.isCallExpression(node)) {
      inspectCallExpression(node);
    } else if (ts.isObjectLiteralExpression(node)) {
      inspectObjectLiteral(node);
    }

    ts.forEachChild(node, visit);

    if (pushedScope) {
      scopeStack.pop();
    }
  }

  function inspectCallExpression(node) {
    const callSite = getLineAndColumn(sourceFile, node);
    const expression = node.expression;

    if (ts.isIdentifier(expression)) {
      const calleeName = expression.text;

      if (calleeName === "fetch") {
        const rawPath = evaluateLocalExpression(node.arguments[0]);
        const method =
          extractFetchMethod(node.arguments[1], evaluateLocalExpression) ||
          "GET";
        registerCallOrGap({
          rawPath,
          method,
          source: "fetch",
          line: callSite.line,
        });
        return;
      }

      if (calleeName === "useSWR") {
        const rawPath = evaluateLocalExpression(node.arguments[0]);
        registerCallOrGap({
          rawPath,
          method: "GET",
          source: "useSWR",
          line: callSite.line,
        });
        return;
      }

      if (calleeName === "useApiCall") {
        const rawPath = evaluateLocalExpression(node.arguments[0]);
        registerCallOrGap({
          rawPath,
          method: "POST",
          source: "useApiCall",
          line: callSite.line,
        });
        return;
      }

      if (
        Object.prototype.hasOwnProperty.call(
          FRONTEND_HELPER_PREFIXES,
          calleeName,
        )
      ) {
        const argValue = evaluateLocalExpression(node.arguments[0]);
        const rawPath = buildHelperPath(calleeName, argValue);
        registerCallOrGap({
          rawPath,
          method: "ANY",
          source: calleeName,
          line: callSite.line,
        });
        return;
      }
    }

    if (ts.isPropertyAccessExpression(expression)) {
      const propertyName = expression.name.text;
      const receiverText = expression.expression.getText(sourceFile);

      if (receiverText === "axios" && DIRECT_HTTP_METHODS.has(propertyName)) {
        const method = propertyName.toUpperCase();
        const rawPath = evaluateLocalExpression(node.arguments[0]);
        registerCallOrGap({
          rawPath,
          method,
          source: `axios.${propertyName}`,
          line: callSite.line,
        });
        return;
      }

      if (
        DIRECT_HTTP_METHODS.has(propertyName) &&
        ts.isIdentifier(expression.expression)
      ) {
        const baseUrl = resolveAxiosBaseUrl(
          filePath,
          expression.expression.text,
          findLocalBinding,
        );
        const relativePath = evaluateLocalExpression(node.arguments[0]);
        const rawPath =
          baseUrl && relativePath ? joinUrlPaths(baseUrl, relativePath) : null;
        registerCallOrGap({
          rawPath,
          method: propertyName.toUpperCase(),
          source: `${expression.expression.text}.${propertyName}`,
          line: callSite.line,
          details: baseUrl
            ? "Axios base URL resolved."
            : "Axios base URL could not be resolved.",
        });
      }
    }
  }

  function inspectObjectLiteral(node) {
    const endpointProperty = getObjectPropertyByName(node, "endpoint");
    if (!endpointProperty || !ts.isPropertyAssignment(endpointProperty)) {
      return;
    }

    const rawPath = evaluateLocalExpression(endpointProperty.initializer);
    const methodProperty = getObjectPropertyByName(node, "method");
    const method =
      methodProperty && ts.isPropertyAssignment(methodProperty)
        ? evaluateLocalExpression(methodProperty.initializer) || "ANY"
        : "ANY";
    const callSite = getLineAndColumn(sourceFile, node);

    registerCallOrGap({
      rawPath,
      method: String(method).toUpperCase(),
      source: "endpoint-property",
      line: callSite.line,
    });
  }

  function registerCallOrGap({ rawPath, method, source, line, details = "" }) {
    const normalizedPath = normalizeFrontendRoute(rawPath);
    const normalizedMethod = normalizeMethod(method);

    if (normalizedPath) {
      calls.push({
        filePath,
        line,
        method: normalizedMethod,
        path: normalizedPath,
        source,
      });
      return;
    }

    unresolvedCalls.push({
      filePath,
      line,
      source,
      details:
        details ||
        "The API target could not be reduced to a static route pattern.",
    });
  }

  function findLocalBinding(name) {
    for (let index = scopeStack.length - 1; index >= 0; index -= 1) {
      const value = scopeStack[index].get(name);
      if (value) {
        return value;
      }
    }

    return fileInfo.topLevelVariables.get(name) || null;
  }
}

function collectBackendRoutes() {
  const backendFiles = walkFiles(BACKEND_SRC_DIR).filter(
    isAuditableBackendCodeFile,
  );
  backendFiles.forEach((filePath) => {
    getBackendModuleInfo(filePath);
  });

  const routes = [];
  for (const filePath of backendFiles) {
    const info = getBackendModuleInfo(filePath);

    for (const route of info.directAppRoutes) {
      routes.push({
        filePath: route.filePath,
        method: normalizeMethod(route.method),
        path: normalizeBackendRoute(route.path),
      });
    }

    for (const prefixUse of info.prefixUses.filter(
      (item) => item.receiver === "app",
    )) {
      const target = resolveBackendImportedTarget(
        filePath,
        prefixUse.identifier,
      );
      if (!target) {
        continue;
      }

      collectPrefixedRouterRoutes(
        target.filePath,
        normalizeBackendRoute(prefixUse.prefix),
        routes,
        new Set(),
      );
    }
  }

  return dedupeRoutes(routes).sort((left, right) => {
    if (left.path === right.path) {
      return left.method.localeCompare(right.method);
    }
    return left.path.localeCompare(right.path);
  });
}

function collectPrefixedRouterRoutes(filePath, basePrefix, destination, seen) {
  const key = `${filePath}::${basePrefix}`;
  if (seen.has(key)) {
    return;
  }
  seen.add(key);

  const info = getBackendModuleInfo(filePath);
  for (const route of info.routerRoutes) {
    destination.push({
      filePath: route.filePath,
      method: normalizeMethod(route.method),
      path: normalizeBackendRoute(joinUrlPaths(basePrefix, route.path)),
    });
  }

  for (const prefixUse of info.prefixUses.filter(
    (item) => item.receiver === "router",
  )) {
    const target = resolveBackendImportedTarget(filePath, prefixUse.identifier);
    if (!target) {
      continue;
    }
    collectPrefixedRouterRoutes(
      target.filePath,
      normalizeBackendRoute(joinUrlPaths(basePrefix, prefixUse.prefix)),
      destination,
      seen,
    );
  }
}

function getBackendModuleInfo(filePath) {
  const normalizedPath = path.resolve(filePath);
  if (backendModuleCache.has(normalizedPath)) {
    return backendModuleCache.get(normalizedPath);
  }

  const sourceText = readText(normalizedPath);
  const sourceFile = ts.createSourceFile(
    normalizedPath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    inferScriptKind(normalizedPath),
  );

  const info = {
    filePath: normalizedPath,
    imports: new Map(),
    reExports: new Map(),
    directAppRoutes: [],
    routerRoutes: [],
    prefixUses: [],
  };

  sourceFile.forEachChild((node) => {
    if (ts.isImportDeclaration(node)) {
      registerImport(node, info.imports, normalizedPath, "backend");
      return;
    }

    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      node.exportClause &&
      ts.isNamedExports(node.exportClause)
    ) {
      const targetFile = resolveModulePath(
        normalizedPath,
        node.moduleSpecifier.text,
        BACKEND_SRC_DIR,
      );
      if (!targetFile) {
        return;
      }

      for (const element of node.exportClause.elements) {
        const exportedName = element.name.text;
        const importedName = (element.propertyName || element.name).text;
        info.reExports.set(exportedName, {
          filePath: targetFile,
          exportName: importedName === "default" ? "*default" : importedName,
        });
      }
      return;
    }

    walkBackendNode(node, info, sourceFile);
  });

  backendModuleCache.set(normalizedPath, info);
  return info;
}

function walkBackendNode(node, info, sourceFile) {
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression)
  ) {
    const receiver = node.expression.expression.getText(sourceFile);
    const methodName = node.expression.name.text;

    if (
      (receiver === "app" || receiver === "router") &&
      DIRECT_HTTP_METHODS.has(methodName)
    ) {
      const routePath = evaluateStaticString(node.arguments[0]);
      if (routePath) {
        const routeRecord = {
          filePath: info.filePath,
          method: methodName.toUpperCase(),
          path: routePath,
        };
        if (receiver === "app") {
          info.directAppRoutes.push(routeRecord);
        } else {
          info.routerRoutes.push(routeRecord);
        }
      }
    }

    if ((receiver === "app" || receiver === "router") && methodName === "use") {
      const prefix = evaluateStaticString(node.arguments[0]);
      if (prefix) {
        const targetIdentifier = node.arguments
          .slice(1)
          .find((argument) => ts.isIdentifier(argument));
        if (targetIdentifier && ts.isIdentifier(targetIdentifier)) {
          info.prefixUses.push({
            receiver,
            prefix,
            identifier: targetIdentifier.text,
          });
        }
      }
    }
  }

  ts.forEachChild(node, (child) => walkBackendNode(child, info, sourceFile));
}

function getFrontendModuleInfo(filePath) {
  const normalizedPath = path.resolve(filePath);
  if (frontendModuleCache.has(normalizedPath)) {
    return frontendModuleCache.get(normalizedPath);
  }

  const sourceText = readText(normalizedPath);
  const sourceFile = ts.createSourceFile(
    normalizedPath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    inferScriptKind(normalizedPath),
  );

  const info = {
    filePath: normalizedPath,
    imports: new Map(),
    topLevelVariables: new Map(),
    exports: new Map(),
    reExports: new Map(),
  };

  sourceFile.forEachChild((node) => {
    if (ts.isImportDeclaration(node)) {
      registerImport(node, info.imports, normalizedPath, "frontend");
      return;
    }

    if (ts.isVariableStatement(node)) {
      const isExported = hasModifier(
        node.modifiers,
        ts.SyntaxKind.ExportKeyword,
      );
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.initializer) {
          info.topLevelVariables.set(
            declaration.name.text,
            declaration.initializer,
          );
          if (isExported) {
            info.exports.set(declaration.name.text, declaration.name.text);
          }
        }
      }
      return;
    }

    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      hasModifier(node.modifiers, ts.SyntaxKind.ExportKeyword)
    ) {
      info.exports.set(node.name.text, node.name.text);
      return;
    }

    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      node.exportClause &&
      ts.isNamedExports(node.exportClause)
    ) {
      const targetFile = resolveModulePath(
        normalizedPath,
        node.moduleSpecifier.text,
        WEB_SRC_DIR,
      );
      if (!targetFile) {
        return;
      }

      for (const element of node.exportClause.elements) {
        const exportedName = element.name.text;
        const importedName = (element.propertyName || element.name).text;
        info.reExports.set(exportedName, {
          filePath: targetFile,
          exportName: importedName === "default" ? "*default" : importedName,
        });
      }
    }
  });

  frontendModuleCache.set(normalizedPath, info);
  return info;
}

function registerImport(node, destination, importerFile, mode) {
  const source =
    node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)
      ? node.moduleSpecifier.text
      : "";
  if (!source) {
    return;
  }

  const baseDir = mode === "backend" ? BACKEND_SRC_DIR : WEB_SRC_DIR;
  const targetFile = resolveModulePath(importerFile, source, baseDir);
  if (!targetFile || !node.importClause) {
    return;
  }

  if (node.importClause.name) {
    destination.set(node.importClause.name.text, {
      filePath: targetFile,
      importName: "*default",
    });
  }

  if (
    node.importClause.namedBindings &&
    ts.isNamedImports(node.importClause.namedBindings)
  ) {
    for (const element of node.importClause.namedBindings.elements) {
      destination.set(element.name.text, {
        filePath: targetFile,
        importName: (element.propertyName || element.name).text,
      });
    }
  }
}

function resolveBackendImportedTarget(importerFile, identifier) {
  const importerInfo = getBackendModuleInfo(importerFile);
  const binding = importerInfo.imports.get(identifier);
  if (!binding) {
    return null;
  }
  return resolveBackendExport(binding.filePath, binding.importName);
}

function resolveBackendExport(filePath, exportName, seen = new Set()) {
  const key = `${filePath}:${exportName}`;
  if (seen.has(key)) {
    return { filePath, exportName };
  }
  seen.add(key);

  const info = getBackendModuleInfo(filePath);
  const reExport = info.reExports.get(exportName);
  if (reExport) {
    return resolveBackendExport(reExport.filePath, reExport.exportName, seen);
  }

  return { filePath, exportName };
}

function resolveImportedFrontendValue(
  importerFile,
  identifier,
  seenKeys = new Set(),
) {
  const importerInfo = getFrontendModuleInfo(importerFile);
  const binding = importerInfo.imports.get(identifier);
  if (!binding) {
    return null;
  }

  const target = resolveFrontendExport(binding.filePath, binding.importName);
  if (!target) {
    return null;
  }

  const targetInfo = getFrontendModuleInfo(target.filePath);
  const localExpression = targetInfo.topLevelVariables.get(target.localName);
  if (!localExpression) {
    return null;
  }

  return evaluateFrontendExpression({
    filePath: target.filePath,
    expression: localExpression,
    localResolver: (name) => targetInfo.topLevelVariables.get(name) || null,
    importResolver: (name) =>
      resolveImportedFrontendValue(target.filePath, name, seenKeys),
    seenKeys,
  });
}

function resolveFrontendExport(filePath, exportName, seen = new Set()) {
  const key = `${filePath}:${exportName}`;
  if (seen.has(key)) {
    return null;
  }
  seen.add(key);

  const info = getFrontendModuleInfo(filePath);
  const reExport = info.reExports.get(exportName);
  if (reExport) {
    return resolveFrontendExport(reExport.filePath, reExport.exportName, seen);
  }

  const localName = info.exports.get(exportName);
  if (localName) {
    return { filePath, localName };
  }

  if (info.topLevelVariables.has(exportName)) {
    return { filePath, localName: exportName };
  }

  return null;
}

function resolveAxiosBaseUrl(
  filePath,
  identifier,
  localResolver,
  seen = new Set(),
) {
  const binding = resolveFrontendBinding(
    filePath,
    identifier,
    localResolver,
    seen,
  );
  if (!binding || !ts.isCallExpression(binding.expression)) {
    return null;
  }

  const callee = binding.expression.expression;
  if (!ts.isPropertyAccessExpression(callee)) {
    return null;
  }

  if (
    callee.expression.getText() !== "axios" ||
    callee.name.text !== "create"
  ) {
    return null;
  }

  const config = binding.expression.arguments[0];
  if (!config || !ts.isObjectLiteralExpression(config)) {
    return null;
  }

  const baseUrlProperty = getObjectPropertyByName(config, "baseURL");
  if (!baseUrlProperty || !ts.isPropertyAssignment(baseUrlProperty)) {
    return null;
  }

  return evaluateFrontendExpression({
    filePath: binding.filePath,
    expression: baseUrlProperty.initializer,
    localResolver: binding.localResolver,
    importResolver: (name) =>
      resolveImportedFrontendValue(binding.filePath, name, seen),
    seenKeys: seen,
  });
}

function resolveFrontendBinding(
  filePath,
  identifier,
  localResolver,
  seen = new Set(),
) {
  const key = `${filePath}:${identifier}`;
  if (seen.has(key)) {
    return null;
  }
  seen.add(key);

  const localExpression = localResolver(identifier);
  if (localExpression) {
    return {
      filePath,
      expression: localExpression,
      localResolver,
    };
  }

  const importerInfo = getFrontendModuleInfo(filePath);
  const binding = importerInfo.imports.get(identifier);
  if (!binding) {
    return null;
  }

  const target = resolveFrontendExport(binding.filePath, binding.importName);
  if (!target) {
    return null;
  }

  const targetInfo = getFrontendModuleInfo(target.filePath);
  const targetExpression = targetInfo.topLevelVariables.get(target.localName);
  if (!targetExpression) {
    return null;
  }

  return {
    filePath: target.filePath,
    expression: targetExpression,
    localResolver: (name) => targetInfo.topLevelVariables.get(name) || null,
  };
}

function evaluateFrontendExpression({
  filePath,
  expression,
  localResolver,
  importResolver,
  seenKeys,
}) {
  if (!expression) {
    return null;
  }

  if (
    ts.isStringLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression)
  ) {
    return expression.text.trim();
  }

  if (ts.isTemplateExpression(expression)) {
    let built = expression.head.text;
    for (const span of expression.templateSpans) {
      const evaluated = evaluateFrontendExpression({
        filePath,
        expression: span.expression,
        localResolver,
        importResolver,
        seenKeys,
      });
      built += evaluated || ":param";
      built += span.literal.text;
    }
    return built.trim();
  }

  if (ts.isIdentifier(expression)) {
    const key = `${filePath}:${expression.text}`;
    if (seenKeys.has(key)) {
      return null;
    }
    seenKeys.add(key);

    const localValue = localResolver(expression.text);
    if (localValue) {
      return evaluateFrontendExpression({
        filePath,
        expression: localValue,
        localResolver,
        importResolver,
        seenKeys,
      });
    }

    return importResolver(expression.text);
  }

  if (ts.isParenthesizedExpression(expression)) {
    return evaluateFrontendExpression({
      filePath,
      expression: expression.expression,
      localResolver,
      importResolver,
      seenKeys,
    });
  }

  if (ts.isBinaryExpression(expression)) {
    if (expression.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const left = evaluateFrontendExpression({
        filePath,
        expression: expression.left,
        localResolver,
        importResolver,
        seenKeys,
      });
      const right = evaluateFrontendExpression({
        filePath,
        expression: expression.right,
        localResolver,
        importResolver,
        seenKeys,
      });
      if (left !== null && right !== null) {
        return `${left}${right}`;
      }
      return null;
    }

    if (
      expression.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
      expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
    ) {
      const left = evaluateFrontendExpression({
        filePath,
        expression: expression.left,
        localResolver,
        importResolver,
        seenKeys,
      });
      if (left) {
        return left;
      }

      return evaluateFrontendExpression({
        filePath,
        expression: expression.right,
        localResolver,
        importResolver,
        seenKeys,
      });
    }
  }

  if (ts.isConditionalExpression(expression)) {
    return (
      evaluateFrontendExpression({
        filePath,
        expression: expression.whenTrue,
        localResolver,
        importResolver,
        seenKeys,
      }) ||
      evaluateFrontendExpression({
        filePath,
        expression: expression.whenFalse,
        localResolver,
        importResolver,
        seenKeys,
      })
    );
  }

  if (
    ts.isCallExpression(expression) &&
    ts.isIdentifier(expression.expression)
  ) {
    const helperName = expression.expression.text;
    if (
      Object.prototype.hasOwnProperty.call(FRONTEND_HELPER_PREFIXES, helperName)
    ) {
      const evaluatedArgument = evaluateFrontendExpression({
        filePath,
        expression: expression.arguments[0],
        localResolver,
        importResolver,
        seenKeys,
      });
      return buildHelperPath(helperName, evaluatedArgument);
    }
  }

  return null;
}

function buildHelperPath(helperName, argumentValue) {
  if (!argumentValue) {
    return null;
  }

  const prefix = FRONTEND_HELPER_PREFIXES[helperName];
  if (prefix === "") {
    return argumentValue;
  }

  return joinUrlPaths(prefix, argumentValue);
}

function findMissingEndpoints(frontendCalls, backendRoutes) {
  return frontendCalls
    .map((call) => ({
      call,
      match: backendRoutes.find((route) => routesMatch(call, route)),
    }))
    .filter((entry) => !entry.match);
}

function routesMatch(frontendCall, backendRoute) {
  const methodMatches =
    frontendCall.method === "ANY" ||
    backendRoute.method === frontendCall.method ||
    (frontendCall.method === "GET" && backendRoute.method === "HEAD");

  if (!methodMatches) {
    return false;
  }

  return routePatternsMatch(frontendCall.path, backendRoute.path);
}

async function runAiReview({
  aiConfig,
  backendRoutes,
  missingEndpoints,
  unresolvedCalls,
  frontendAnalyses,
}) {
  if (frontendAnalyses.length === 0) {
    return {
      status: missingEndpoints.length > 0 ? "fail" : "pass",
      issues:
        missingEndpoints.length > 0
          ? formatStaticIssuesForAi(missingEndpoints)
          : [],
      provider: aiConfig.provider,
      model: aiConfig.model,
      skipped: true,
    };
  }

  if (!aiConfig.apiKey) {
    throw new Error(
      `AI review is required but no API key was found for provider "${aiConfig.provider}".`,
    );
  }

  const promptPayload = {
    task: "Hybrid production audit for frontend/backend connectivity.",
    contract: {
      returnJsonOnly: true,
      allowedSchema: {
        status: "pass | fail",
        issues: [
          {
            type: "missing-endpoint | mock-data | fake-binding | unresolved-route | other",
            file: "repo-relative path",
            title: "short title",
            evidence: "brief evidence from the code",
            recommendation: "direct remediation",
          },
        ],
      },
    },
    auditFocus: [
      "Fail if the frontend still relies on mock data, hardcoded arrays, placeholder datasets, demo state, or fake API payloads.",
      "Fail if the UI wiring is only cosmetic and is not clearly connected to live backend responses.",
      "Fail if static analysis already found missing endpoints or unresolved routing that makes backend connectivity doubtful.",
      "Pass only when the modified frontend files appear genuinely wired to the backend paths below.",
      "Ignore styling-only concerns.",
      "Do not return markdown. Return strict JSON only.",
    ],
    backendRoutes: backendRoutes.map(
      (route) => `${route.method} ${route.path}`,
    ),
    staticFindings: {
      missingEndpoints: missingEndpoints.map((issue) => ({
        file: toRelativePath(issue.call.filePath),
        line: issue.call.line,
        method: issue.call.method,
        path: issue.call.path,
        source: issue.call.source,
      })),
      unresolvedCalls: unresolvedCalls.map((issue) => ({
        file: toRelativePath(issue.filePath),
        line: issue.line,
        source: issue.source,
        details: issue.details,
      })),
    },
    modifiedFrontendFiles: frontendAnalyses
      .slice(0, MAX_AI_FILE_COUNT)
      .map((entry) => ({
        file: toRelativePath(entry.filePath),
        apiCalls: entry.calls.map((call) => `${call.method} ${call.path}`),
        content: truncateMiddle(entry.content, MAX_AI_FILE_CHARS),
      })),
    notes:
      frontendAnalyses.length > MAX_AI_FILE_COUNT
        ? [
            `Only the first ${MAX_AI_FILE_COUNT} modified frontend files were sent to the model due to prompt-size limits.`,
          ]
        : [],
  };

  const promptText = [
    "You are a release-gating audit model.",
    "Return strict JSON only with this exact top-level shape:",
    '{"status":"pass"|"fail","issues":[]}',
    "Each issue must be a JSON object with keys: type, file, title, evidence, recommendation.",
    "If any missing endpoint, mock data, hardcoded arrays as primary data, fake binding, or non-real integration is present, return status fail.",
    "Audit input:",
    JSON.stringify(promptPayload, null, 2),
  ].join("\n\n");

  const rawResponse =
    aiConfig.provider === "anthropic"
      ? await callAnthropic(promptText, aiConfig)
      : await callGemini(promptText, aiConfig);

  const parsed = parseAiJson(rawResponse);
  if (
    !parsed ||
    !Array.isArray(parsed.issues) ||
    !["pass", "fail"].includes(parsed.status)
  ) {
    throw new Error(
      `AI review returned an invalid JSON payload: ${rawResponse}`,
    );
  }

  return {
    status: parsed.status,
    issues: parsed.issues,
    provider: aiConfig.provider,
    model: aiConfig.model,
    skipped: false,
  };
}

function resolveAiConfig() {
  const provider = (process.env.AI_PROVIDER || "gemini").trim().toLowerCase();
  const model =
    (process.env.AI_MODEL || "").trim() ||
    (provider === "anthropic"
      ? "claude-4-6-sonnet-latest"
      : "gemini-3.1-pro-preview");

  const providerSpecificKey =
    provider === "anthropic"
      ? process.env.ANTHROPIC_API_KEY
      : process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

  // Prefer the provider-specific key over the generic AI_API_KEY. AI_API_KEY
  // can carry a key for a different vendor (e.g. an Anthropic key in an env
  // where the gemini provider is selected), which would yield 400 Bad Request
  // from the wrong vendor's endpoint. AI_API_KEY remains a last-resort fallback
  // for environments that only set the generic name.
  return {
    provider,
    model,
    apiKey: (providerSpecificKey || process.env.AI_API_KEY || "").trim(),
  };
}

async function callGemini(promptText, aiConfig) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    aiConfig.model,
  )}:generateContent?key=${encodeURIComponent(aiConfig.apiKey)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: promptText }],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
      },
    }),
    signal: AbortSignal.timeout(90000),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    const trimmedBody = errorBody.length > 1500
      ? `${errorBody.slice(0, 1500)}... [truncated]`
      : errorBody;
    throw new Error(
      `Gemini review request failed with ${response.status} ${response.statusText}.${trimmedBody ? `\nResponse body: ${trimmedBody}` : ""}`,
    );
  }

  const payload = await response.json();
  const candidate = payload?.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const text =
    candidate?.content?.parts?.map((part) => part.text || "").join("") || "";
  if (!text) {
    const promptFeedback = payload?.promptFeedback
      ? ` promptFeedback=${JSON.stringify(payload.promptFeedback)}`
      : "";
    throw new Error(
      `Gemini review response did not contain text (finishReason=${finishReason || "unknown"}).${promptFeedback}`,
    );
  }
  return text;
}

async function callAnthropic(promptText, aiConfig) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": aiConfig.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: aiConfig.model,
      max_tokens: 1200,
      temperature: 0,
      system:
        'You are a release-gating audit model. Return strict JSON only with the exact top-level shape {"status":"pass"|"fail","issues":[]}.',
      messages: [{ role: "user", content: promptText }],
    }),
    signal: AbortSignal.timeout(90000),
  });

  if (!response.ok) {
    throw new Error(
      `Anthropic review request failed with ${response.status} ${response.statusText}.`,
    );
  }

  const payload = await response.json();
  const text = Array.isArray(payload?.content)
    ? payload.content.map((entry) => entry.text || "").join("")
    : "";
  if (!text) {
    throw new Error("Anthropic review response did not contain text.");
  }
  return text;
}

function parseAiJson(rawValue) {
  if (!rawValue || typeof rawValue !== "string") {
    return null;
  }

  const trimmed = rawValue.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function formatReport({
  startedAt,
  backendRoutes,
  frontendAnalyses,
  unresolvedCalls,
  missingEndpoints,
  aiReview,
  status,
}) {
  const summaryLines = [
    "# Hybrid Production Audit",
    "",
    `- Status: ${status}`,
    `- Started at: ${startedAt}`,
    `- Frontend files audited: ${frontendAnalyses.length}`,
    `- Backend routes discovered: ${backendRoutes.length}`,
    `- Static missing endpoints: ${missingEndpoints.length}`,
    `- Unresolved frontend routes: ${unresolvedCalls.length}`,
    `- AI provider/model: ${aiReview.provider}/${aiReview.model}`,
    `- AI verdict: ${aiReview.status}`,
    "",
    "## Frontend Files",
    ...frontendAnalyses.map(
      (entry) =>
        `- ${toRelativePath(entry.filePath)} (${entry.calls.length} API calls)`,
    ),
    "",
    "## Static Missing Endpoints",
    ...(missingEndpoints.length > 0
      ? missingEndpoints.map(
          (issue) =>
            `- ${issue.call.method} ${issue.call.path} at ${toRelativePath(issue.call.filePath)}:${issue.call.line} via ${issue.call.source}`,
        )
      : ["- None"]),
    "",
    "## Unresolved Frontend Calls",
    ...(unresolvedCalls.length > 0
      ? unresolvedCalls.map(
          (issue) =>
            `- ${toRelativePath(issue.filePath)}:${issue.line} via ${issue.source} (${issue.details})`,
        )
      : ["- None"]),
    "",
    "## AI Issues",
    ...(Array.isArray(aiReview.issues) && aiReview.issues.length > 0
      ? aiReview.issues.map((issue) => {
          const location = issue.file ? `${issue.file}` : "unknown-file";
          const title = issue.title || issue.type || "issue";
          const evidence = issue.evidence || "No evidence provided.";
          const recommendation =
            issue.recommendation || "No recommendation provided.";
          return `- ${title} | ${location} | ${evidence} | ${recommendation}`;
        })
      : ["- None"]),
  ];

  const consoleLines = [
    "Hybrid Production Audit",
    `Status: ${status}`,
    `Started at: ${startedAt}`,
    `Frontend files audited: ${frontendAnalyses.length}`,
    `Backend routes discovered: ${backendRoutes.length}`,
    `Static missing endpoints: ${missingEndpoints.length}`,
    `Unresolved frontend routes: ${unresolvedCalls.length}`,
    `AI verdict: ${aiReview.status} (${aiReview.provider}/${aiReview.model})`,
  ];

  if (missingEndpoints.length > 0) {
    consoleLines.push("", "Static missing endpoints:");
    for (const issue of missingEndpoints) {
      consoleLines.push(
        `- ${issue.call.method} ${issue.call.path} at ${toRelativePath(issue.call.filePath)}:${issue.call.line}`,
      );
    }
  }

  if (Array.isArray(aiReview.issues) && aiReview.issues.length > 0) {
    consoleLines.push("", "AI issues:");
    for (const issue of aiReview.issues) {
      consoleLines.push(
        `- ${issue.title || issue.type || "issue"} (${issue.file || "unknown-file"}): ${issue.evidence || "No evidence"}`,
      );
    }
  }

  return {
    summaryMarkdown: summaryLines.join("\n"),
    consoleReport: consoleLines.join("\n"),
  };
}

function formatStaticIssuesForAi(missingEndpoints) {
  return missingEndpoints.map((issue) => ({
    type: "missing-endpoint",
    file: toRelativePath(issue.call.filePath),
    title: `Missing backend route for ${issue.call.method} ${issue.call.path}`,
    evidence: `${issue.call.source} at line ${issue.call.line} points to a route not discovered in apps/backend.`,
    recommendation:
      "Add or restore the backend endpoint, or update the frontend to the real production route.",
  }));
}

function extractFetchMethod(argumentNode, evaluateExpression) {
  if (!argumentNode || !ts.isObjectLiteralExpression(argumentNode)) {
    return "GET";
  }

  const methodProperty = getObjectPropertyByName(argumentNode, "method");
  if (!methodProperty || !ts.isPropertyAssignment(methodProperty)) {
    return "GET";
  }

  return evaluateExpression(methodProperty.initializer) || "GET";
}

function getObjectPropertyByName(node, propertyName) {
  return node.properties.find((property) => {
    if (!("name" in property) || !property.name) {
      return false;
    }
    return getPropertyNameText(property.name) === propertyName;
  });
}

function getPropertyNameText(nameNode) {
  if (
    ts.isIdentifier(nameNode) ||
    ts.isStringLiteral(nameNode) ||
    ts.isNumericLiteral(nameNode)
  ) {
    return nameNode.text;
  }
  if (
    ts.isComputedPropertyName(nameNode) &&
    ts.isStringLiteral(nameNode.expression)
  ) {
    return nameNode.expression.text;
  }
  return null;
}

function evaluateStaticString(expression) {
  if (!expression) {
    return null;
  }

  if (
    ts.isStringLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression)
  ) {
    return expression.text.trim();
  }

  return null;
}

function normalizeFrontendRoute(rawPath) {
  if (!rawPath || typeof rawPath !== "string") {
    return null;
  }

  let candidate = rawPath.trim();
  if (!candidate) {
    return null;
  }

  if (/^https?:\/\//i.test(candidate)) {
    try {
      candidate = new URL(candidate).pathname;
    } catch {
      return null;
    }
  }

  candidate = candidate.split("#")[0].split("?")[0];

  if (!candidate.startsWith("/")) {
    if (candidate.startsWith("api/")) {
      candidate = `/${candidate}`;
    } else {
      return null;
    }
  }

  candidate = candidate.replace(/\/{2,}/g, "/");
  const segments = candidate
    .split("/")
    .filter(Boolean)
    .map(normalizeRouteSegment);
  const normalized = `/${segments.join("/")}`;

  if (!isComparableApiPath(normalized)) {
    return null;
  }

  return normalized === "/" ? "/" : normalized.replace(/\/$/, "");
}

function normalizeBackendRoute(rawPath) {
  return normalizeFrontendRoute(rawPath);
}

function normalizeRouteSegment(segment) {
  if (!segment) {
    return segment;
  }

  if (
    segment === "*" ||
    segment.startsWith(":") ||
    (segment.startsWith("[") && segment.endsWith("]")) ||
    segment.includes("${") ||
    segment.includes(":param")
  ) {
    return ":param";
  }

  return segment;
}

function normalizeMethod(method) {
  const value = String(method || "ANY")
    .trim()
    .toUpperCase();
  return HTTP_METHODS.has(value)
    ? value
    : value === "HEAD"
      ? "HEAD"
      : value || "ANY";
}

function routePatternsMatch(leftRoute, rightRoute) {
  const leftSegments = leftRoute.split("/").filter(Boolean);
  const rightSegments = rightRoute.split("/").filter(Boolean);

  if (leftSegments.length !== rightSegments.length) {
    return false;
  }

  return leftSegments.every((segment, index) => {
    const counterpart = rightSegments[index];
    return (
      segment === counterpart ||
      segment === ":param" ||
      counterpart === ":param"
    );
  });
}

function isComparableApiPath(routePath) {
  return (
    routePath === "/health" ||
    routePath.startsWith("/health/") ||
    routePath === "/metrics" ||
    routePath.startsWith("/api/")
  );
}

function joinUrlPaths(basePath, relativePath) {
  const left = String(basePath || "").trim();
  const right = String(relativePath || "").trim();

  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }

  return `${left.replace(/\/+$/, "")}/${right.replace(/^\/+/, "")}`;
}

function resolveModulePath(importerFile, specifier, aliasRoot) {
  if (!specifier.startsWith(".") && !specifier.startsWith("@/")) {
    return null;
  }

  const basePath = specifier.startsWith("@/")
    ? path.join(aliasRoot, specifier.slice(2))
    : path.resolve(path.dirname(importerFile), specifier);

  return resolveExistingModule(basePath);
}

function resolveExistingModule(basePath) {
  const candidates = [
    basePath,
    ...Array.from(
      SUPPORTED_CODE_EXTENSIONS,
      (extension) => `${basePath}${extension}`,
    ),
    ...Array.from(SUPPORTED_CODE_EXTENSIONS, (extension) =>
      path.join(basePath, `index${extension}`),
    ),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return path.resolve(candidate);
    }
  }

  return null;
}

function getLineAndColumn(sourceFile, node) {
  const location = sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile),
  );
  return {
    line: location.line + 1,
    column: location.character + 1,
  };
}

function hasModifier(modifiers, kind) {
  return (
    Array.isArray(modifiers) &&
    modifiers.some((modifier) => modifier.kind === kind)
  );
}

function walkFiles(directoryPath) {
  const output = [];
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      output.push(...walkFiles(absolutePath));
      continue;
    }
    output.push(absolutePath);
  }

  return output;
}

function isCodeFile(filePath) {
  return SUPPORTED_CODE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function isAuditableFrontendFile(filePath) {
  const normalized = toPosixPath(path.resolve(filePath));
  return (
    normalized.startsWith(toPosixPath(FRONTEND_MAIN_DIR)) &&
    isCodeFile(filePath) &&
    !normalized.includes("/__tests__/") &&
    !/\.(test|spec)\.[^.]+$/i.test(normalized)
  );
}

function isAuditableBackendCodeFile(filePath) {
  const normalized = toPosixPath(path.resolve(filePath));
  return (
    normalized.startsWith(toPosixPath(BACKEND_SRC_DIR)) &&
    isCodeFile(filePath) &&
    !normalized.includes("/__tests__/") &&
    !normalized.includes("/test/") &&
    !/\.(test|spec)\.[^.]+$/i.test(normalized)
  );
}

function truncateMiddle(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }
  const keep = Math.floor((maxLength - 32) / 2);
  return `${value.slice(0, keep)}\n\n/* ... truncated ... */\n\n${value.slice(-keep)}`;
}

function unique(values) {
  return Array.from(new Set(values));
}

function dedupeCalls(calls) {
  const seen = new Set();
  return calls.filter((call) => {
    const key = `${call.filePath}:${call.line}:${call.method}:${call.path}:${call.source}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function dedupeUnresolved(values) {
  const seen = new Set();
  return values.filter((entry) => {
    const key = `${entry.filePath}:${entry.line}:${entry.source}:${entry.details}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function dedupeRoutes(routes) {
  const seen = new Set();
  return routes.filter((route) => {
    if (!route.path) {
      return false;
    }

    const key = `${route.method}:${route.path}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function runGit(args, allowFailure = false) {
  try {
    return execFileSync("git", args, {
      cwd: ROOT_DIR,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    if (allowFailure) {
      return "";
    }
    const stderr =
      error && typeof error === "object" && "stderr" in error
        ? String(error.stderr)
        : "";
    throw new Error(`Git command failed: git ${args.join(" ")}\n${stderr}`);
  }
}

function writeStepSummary(markdown) {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryFile) {
    return;
  }

  fs.appendFileSync(summaryFile, `${markdown}\n`, "utf8");
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function inferScriptKind(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".tsx") {
    return ts.ScriptKind.TSX;
  }
  if (extension === ".jsx") {
    return ts.ScriptKind.JSX;
  }
  if (extension === ".js" || extension === ".mjs" || extension === ".cjs") {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
}

function toRelativePath(filePath) {
  return toPosixPath(path.relative(ROOT_DIR, filePath));
}

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}
