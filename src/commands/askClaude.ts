import * as vscode from "vscode";
import { SecretsManager } from "../config/SecretsManager";
import { scanWorkspace, formatContext } from "../context/WorkspaceScanner";
import { extractFileContext, formatFileContext } from "../context/FileContextExtractor";
import { routeLLM } from "../llm/LLMRouter";
import { buildSystemPrompt } from "./fixPrompt";

export async function askClaudeCommand(secrets: SecretsManager): Promise<void> {
  // Check Claude Code extension is installed
  const claudeExt = vscode.extensions.getExtension("anthropic.claude-code");
  if (!claudeExt) {
    vscode.window.showErrorMessage(
      "FixPrompt: Claude Code extension is not installed.",
      "Install"
    ).then(action => {
      if (action === "Install") {
        vscode.commands.executeCommand(
          "workbench.extensions.search",
          "anthropic.claude-code"
        );
      }
    });
    return;
  }

  // Get raw prompt — from selection or ask via input box
  const editor = vscode.window.activeTextEditor;
  const selection = editor?.document.getText(editor.selection).trim();

  const rawPrompt = selection || await vscode.window.showInputBox({
    title: "FixPrompt → Claude",
    prompt: "Enter your raw prompt to enhance and send to Claude",
    placeHolder: "e.g. create a login API with JWT auth",
    ignoreFocusOut: true,
  });

  if (!rawPrompt) { return; }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "FixPrompt: Enhancing prompt for Claude…",
      cancellable: false,
    },
    async () => {
      try {
        const workspaceCtx = await scanWorkspace();
        const workspaceString = workspaceCtx ? formatContext(workspaceCtx) : "";
        const fileString = editor ? formatFileContext(extractFileContext(editor)) : "";
        const systemPrompt = buildSystemPrompt(workspaceString, fileString);

        const enhanced = await routeLLM(secrets, systemPrompt, rawPrompt);

        // Open Claude Code with enhanced prompt pre-filled as initialPrompt
        // claude-vscode.editor.open(sessionId, initialPrompt, viewColumn)
        await vscode.commands.executeCommand(
          "claude-vscode.primaryEditor.open",
          undefined,
          enhanced
        );

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
