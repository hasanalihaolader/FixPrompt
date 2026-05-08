import * as vscode from "vscode";

export interface FileContext {
  fileName: string;
  language: string;
  imports: string[];
  surroundingCode: string;
  cursorLine: number;
  totalLines: number;
}

export function extractFileContext(editor: vscode.TextEditor): FileContext {
  const doc = editor.document;
  const cursor = editor.selection.active;

  return {
    fileName: vscode.workspace.asRelativePath(doc.uri),
    language: doc.languageId,
    imports: extractImports(doc),
    surroundingCode: extractSurroundingCode(doc, cursor.line),
    cursorLine: cursor.line + 1,
    totalLines: doc.lineCount,
  };
}

function extractImports(doc: vscode.TextDocument): string[] {
  const imports: string[] = [];
  const importPatterns = [
    /^import\s+.*?from\s+['"](.+?)['"]/,       // ES6: import x from 'y'
    /^import\s+['"](.+?)['"]/,                   // ES6 side-effect: import 'y'
    /require\s*\(\s*['"](.+?)['"]\s*\)/,         // CommonJS: require('y')
    /^from\s+(\S+)\s+import/,                    // Python
    /^use\s+(\S+);/,                             // Rust
    /^import\s+"(.+?)"/,                         // Go
    /^#include\s+[<"](.+?)[>"]/,                 // C/C++
  ];

  for (let i = 0; i < Math.min(doc.lineCount, 60); i++) {
    const line = doc.lineAt(i).text.trim();
    for (const pattern of importPatterns) {
      const match = line.match(pattern);
      if (match) {
        imports.push(match[1]);
        break;
      }
    }
  }

  // Deduplicate and filter out relative paths — only keep package names
  return [...new Set(imports)].filter(imp => !imp.startsWith("."));
}

function extractSurroundingCode(doc: vscode.TextDocument, cursorLine: number): string {
  // Grab 30 lines above and 15 lines below cursor for context
  const start = Math.max(0, cursorLine - 30);
  const end = Math.min(doc.lineCount - 1, cursorLine + 15);

  const lines: string[] = [];
  for (let i = start; i <= end; i++) {
    lines.push(doc.lineAt(i).text);
  }

  return lines.join("\n");
}

export function formatFileContext(ctx: FileContext): string {
  const lines: string[] = [];

  lines.push(`Active file: ${ctx.fileName} (${ctx.language})`);
  lines.push(`Cursor at line ${ctx.cursorLine} of ${ctx.totalLines}`);

  if (ctx.imports.length > 0) {
    lines.push(`Imports in this file: ${ctx.imports.join(", ")}`);
  }

  if (ctx.surroundingCode.trim()) {
    lines.push(`\nCode context around cursor:\n\`\`\`${ctx.language}\n${ctx.surroundingCode}\n\`\`\``);
  }

  return lines.join("\n");
}
