"use strict";
/**
 * Page Routes TypeScript Language Service Plugin
 *
 * Validates that Page.create path arguments match the file location where
 * the page is defined. Shows squigglies directly on the path property.
 *
 * Handles:
 * - Direct Page.create calls: Page.create({ path: "/blog", ... })
 * - Named re-exports: export { BlogPage as default } from "./features/blog"
 * - Import + default export: import { BlogPage } from "./_page"; export default BlogPage;
 * - Inline variable export: const X = Page.create(...); export default X;
 *
 * NOTE: After modifying this file, run `pnpm build:ts-plugin` to recompile.
 * The compiled index.js must be committed for the plugin to work.
 */
Object.defineProperty(exports, "__esModule", { value: true });
/** Regex to match page file extensions */
const PAGE_FILE_REGEX = /\/page\.tsx?$/;
/** Regex to extract route portion from page file path */
const ROUTE_PORTION_REGEX = /^(.*)\/page\.tsx?$/;
/** Regex to extract PageFn path from type string */
const PAGE_FN_PATH_REGEX = /PageFn<"([^"]+)"/;
/** Custom error codes for page route diagnostics */
const ERROR_CODE_DIRECT = 100001;
const ERROR_CODE_REEXPORT = 100002;
/** Error messages */
const ERROR_MESSAGE_DIRECT = (actualPath, expectedPath) => `Page.create path "${actualPath}" doesn't match expected "${expectedPath}" for this file location.`;
const ERROR_MESSAGE_REEXPORT = (actualPath, expectedPath) => `Exported page has path "${actualPath}" but this file location expects "${expectedPath}".`;
/**
 * Converts a file path to the expected route path.
 * e.g., "/path/to/project/src/app/blog/page.tsx" -> "/blog"
 *       "/path/to/project/src/app/[subdomain]/page.tsx" -> "/[subdomain]"
 */
function getExpectedPathFromFile(filePath, appDir) {
    const normalizedPath = filePath.replace(/\\/g, "/");
    const appDirIndex = normalizedPath.indexOf(appDir);
    if (appDirIndex === -1) {
        return null;
    }
    const routePortion = normalizedPath.slice(appDirIndex + appDir.length);
    const pageMatch = ROUTE_PORTION_REGEX.exec(routePortion);
    if (!pageMatch?.[1]) {
        return null;
    }
    const routePath = pageMatch[1];
    return routePath === "" ? "/" : routePath;
}
/**
 * Checks if a file is a page file in the app directory.
 */
function isPageFile(filePath, appDir) {
    const normalizedPath = filePath.replace(/\\/g, "/");
    return normalizedPath.includes(appDir) && PAGE_FILE_REGEX.test(normalizedPath);
}
/**
 * Checks if a call expression is Page.create or createSafePage.
 */
function isPageCreateCall(expr, typescript) {
    if (typescript.isPropertyAccessExpression(expr)) {
        return typescript.isIdentifier(expr.expression) && expr.expression.text === "Page" && expr.name.text === "create";
    }
    return typescript.isIdentifier(expr) && expr.text === "createSafePage";
}
/**
 * Extracts the path property from Page.create options object.
 */
function extractPathFromOptions(arg, typescript) {
    for (const prop of arg.properties) {
        if (!typescript.isPropertyAssignment(prop)) {
            continue;
        }
        if (!typescript.isIdentifier(prop.name)) {
            continue;
        }
        if (prop.name.text !== "path") {
            continue;
        }
        if (!typescript.isStringLiteral(prop.initializer)) {
            continue;
        }
        return {
            path: prop.initializer.text,
            node: prop.initializer,
        };
    }
    return null;
}
/**
 * Finds Page.create calls and extracts the path argument with its location.
 */
function findPageCreatePath(sourceFile, typescript) {
    let result = null;
    function visit(node) {
        if (result) {
            return;
        }
        if (typescript.isCallExpression(node) && node.arguments.length > 0 && isPageCreateCall(node.expression, typescript)) {
            const arg = node.arguments[0];
            if (arg && typescript.isObjectLiteralExpression(arg)) {
                result = extractPathFromOptions(arg, typescript);
            }
        }
        typescript.forEachChild(node, visit);
    }
    visit(sourceFile);
    return result;
}
/**
 * Extracts page path from a PageFn type using the type checker.
 * Works with any node location for type resolution.
 */
function extractPathFromPageFnType(type, typeChecker, location) {
    // Try to find PageFnBrand property
    const brandSymbol = type.getProperty("__brand_PageFn") || type.getProperties().find((p) => p.name.includes("PageFnBrand"));
    if (brandSymbol) {
        const brandType = typeChecker.getTypeOfSymbolAtLocation(brandSymbol, location);
        const pathSymbol = brandType.getProperty("path");
        if (pathSymbol) {
            const pathType = typeChecker.getTypeOfSymbolAtLocation(pathSymbol, location);
            if (pathType.isStringLiteral()) {
                return pathType.value;
            }
        }
    }
    // Fallback: extract from type string representation
    const typeString = typeChecker.typeToString(type);
    const pathMatch = PAGE_FN_PATH_REGEX.exec(typeString);
    return pathMatch?.[1] ?? null;
}
/**
 * Finds default export of an identifier and extracts path from its type.
 * Handles: import { X } from "..."; export default X;
 * Handles: import X from "..."; export default X;
 * Handles: const X = Page.create(...); export default X;
 */
function findDefaultExportIdentifierPath(sourceFile, typeChecker, typescript) {
    for (const statement of sourceFile.statements) {
        // Look for: export default <identifier>
        if (!typescript.isExportAssignment(statement)) {
            continue;
        }
        if (statement.isExportEquals) {
            continue;
        }
        if (!typescript.isIdentifier(statement.expression)) {
            continue;
        }
        const identifier = statement.expression;
        const symbol = typeChecker.getSymbolAtLocation(identifier);
        if (!symbol) {
            continue;
        }
        const type = typeChecker.getTypeOfSymbolAtLocation(symbol, identifier);
        const path = extractPathFromPageFnType(type, typeChecker, identifier);
        if (path) {
            return { path, node: identifier };
        }
    }
    return null;
}
/**
 * For re-exports like `export { X as default } from "..."`, finds the path
 * from the PageFn's branded type.
 */
function findReexportedPagePath(sourceFile, typeChecker, typescript) {
    for (const statement of sourceFile.statements) {
        if (!(typescript.isExportDeclaration(statement) && statement.exportClause && typescript.isNamedExports(statement.exportClause))) {
            continue;
        }
        for (const element of statement.exportClause.elements) {
            if (element.name.text !== "default") {
                continue;
            }
            const symbol = typeChecker.getSymbolAtLocation(element.propertyName || element.name);
            if (!symbol) {
                continue;
            }
            const type = typeChecker.getTypeOfSymbolAtLocation(symbol, element);
            const path = extractPathFromPageFnType(type, typeChecker, element);
            if (path) {
                return { path, node: element };
            }
        }
    }
    return null;
}
/**
 * Creates a diagnostic for a path mismatch.
 */
function createMismatchDiagnostic(options) {
    const { sourceFile, node, actualPath, expectedPath, isReexport, typescript } = options;
    const message = isReexport ? ERROR_MESSAGE_REEXPORT(actualPath, expectedPath) : ERROR_MESSAGE_DIRECT(actualPath, expectedPath);
    return {
        file: sourceFile,
        start: node.getStart(),
        length: node.getWidth(),
        messageText: message,
        category: typescript.DiagnosticCategory.Error,
        code: isReexport ? ERROR_CODE_REEXPORT : ERROR_CODE_DIRECT,
        source: "page-routes",
    };
}
/**
 * Gets additional diagnostics for page path validation.
 */
function getPageRouteDiagnostics(fileName, languageService, appDir, typescript) {
    if (!isPageFile(fileName, appDir)) {
        return [];
    }
    const program = languageService.getProgram();
    if (!program) {
        return [];
    }
    const sourceFile = program.getSourceFile(fileName);
    if (!sourceFile) {
        return [];
    }
    const expectedPath = getExpectedPathFromFile(fileName, appDir);
    if (!expectedPath) {
        return [];
    }
    // Try direct Page.create call first
    const directResult = findPageCreatePath(sourceFile, typescript);
    if (directResult && directResult.path !== expectedPath) {
        return [createMismatchDiagnostic({ sourceFile, node: directResult.node, actualPath: directResult.path, expectedPath, isReexport: false, typescript })];
    }
    // Try indirect patterns if no direct call found
    if (!directResult) {
        const typeChecker = program.getTypeChecker();
        // Try: import { X } from "..."; export default X;
        // Try: const X = Page.create(...); export default X;
        const defaultExportResult = findDefaultExportIdentifierPath(sourceFile, typeChecker, typescript);
        if (defaultExportResult && defaultExportResult.path !== expectedPath) {
            return [createMismatchDiagnostic({ sourceFile, node: defaultExportResult.node, actualPath: defaultExportResult.path, expectedPath, isReexport: true, typescript })];
        }
        // Try: export { X as default } from "...";
        const reexportResult = findReexportedPagePath(sourceFile, typeChecker, typescript);
        if (reexportResult && reexportResult.path !== expectedPath) {
            return [createMismatchDiagnostic({ sourceFile, node: reexportResult.node, actualPath: reexportResult.path, expectedPath, isReexport: true, typescript })];
        }
    }
    return [];
}
function init(modules) {
    const typescript = modules.typescript;
    function create(info) {
        const config = info.config || {};
        const appDir = config.appDir || "/src/app";
        // Log plugin initialization for debugging
        info.project.projectService.logger.info(`[page-routes] Plugin initialized with appDir: ${appDir}`);
        const proxy = { ...info.languageService };
        proxy.getSemanticDiagnostics = (fileName) => {
            const original = info.languageService.getSemanticDiagnostics(fileName);
            const additional = getPageRouteDiagnostics(fileName, info.languageService, appDir, typescript);
            if (additional.length > 0) {
                info.project.projectService.logger.info(`[page-routes] Found ${additional.length} diagnostic(s) in ${fileName}`);
            }
            return [...original, ...additional];
        };
        return proxy;
    }
    return { create };
}
exports.default = init;
