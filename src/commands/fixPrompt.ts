import * as vscode from "vscode";
import { SecretsManager } from "../config/SecretsManager";
import { scanWorkspace, formatContext } from "../context/WorkspaceScanner";
import { extractFileContext, formatFileContext } from "../context/FileContextExtractor";
import { routeLLM } from "../llm/LLMRouter";

export function buildSystemPrompt(workspaceContext: string, fileContext: string): string {
  return `
You are an expert prompt engineer for software developers.

You have two layers of context about the developer's environment:

--- WORKSPACE CONTEXT (project-level) ---
${workspaceContext || "Not detected."}

--- FILE CONTEXT (most important — what the developer is working on RIGHT NOW) ---
${fileContext || "Not detected."}

YOUR JOB:
Transform the developer's raw, vague prompt into a complete, production-ready AI coding prompt.

CRITICAL RULES:
- The FILE CONTEXT is your primary signal. Base the improved prompt on what is actually in the active file — its imports, the code around the cursor, the language being used.
- NEVER mention technologies not present in the file or workspace context. If the file uses Kafka, do not mention MongoDB. If it uses Prisma, do not mention mongoose.
- Infer the exact task from the surrounding code — if the cursor is inside a Kafka consumer, the prompt should be about Kafka.
- The improved prompt MUST include:
  1. Clear role and goal specific to the file's tech stack
  2. Exact technical constraints derived from the imports and surrounding code
  3. Error handling and edge cases relevant to those specific technologies
  4. Expected output format (function / class / module / etc.)
- The improved prompt MUST also instruct the AI to:
  - Follow any project guidelines found in AGENT.md, CLAUDE.md, CONTRIBUTING.md, or README.md if they exist in the project
  - Match existing code patterns in the project — same folder structure, naming conventions, error handling style, and response format as the rest of the codebase
  - Never invent new patterns when existing ones can be followed
- Never assume anything that is not visible in the file context or workspace context. If something is unclear, the improved prompt must explicitly ask the AI to clarify before implementing.
- Output ONLY the improved prompt. No explanation, no preamble, no "Here is the improved prompt:".
`.trim();
}

export async function fixPromptCommand(secrets: SecretsManager): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage("FixPrompt: Open a file and select your prompt first.");
    return;
  }

  const selection = editor.selection;
  const rawPrompt = editor.document.getText(selection).trim();

  if (!rawPrompt) {
    vscode.window.showWarningMessage("FixPrompt: Select the prompt text you want to enhance.");
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "FixPrompt: Enhancing your prompt…",
      cancellable: false,
    },
    async () => {
      try {
        const [workspaceCtx, fileCtx] = await Promise.all([
          scanWorkspace(),
          Promise.resolve(extractFileContext(editor)),
        ]);

        const workspaceString = workspaceCtx ? formatContext(workspaceCtx) : "";
        const fileString = formatFileContext(fileCtx);
        const systemPrompt = buildSystemPrompt(workspaceString, fileString);

        const enhanced = await routeLLM(secrets, systemPrompt, rawPrompt);

        await editor.edit(editBuilder => {
          editBuilder.replace(selection, enhanced);
        });

        vscode.window.showInformationMessage("FixPrompt: Prompt enhanced!");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const action = await vscode.window.showErrorMessage(
          `FixPrompt: ${msg}`,
          "Open Settings"
        );
        if (action === "Open Settings") {
          vscode.commands.executeCommand("fixprompt.openSettings");
        }
      }
    }
  );
}
