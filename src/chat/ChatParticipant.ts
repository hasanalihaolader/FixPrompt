import * as vscode from "vscode";
import { SecretsManager } from "../config/SecretsManager";
import { scanWorkspace, formatContext } from "../context/WorkspaceScanner";
import { extractFileContext, formatFileContext } from "../context/FileContextExtractor";
import { buildSystemPrompt } from "../commands/fixPrompt";

export function registerChatParticipant(
  context: vscode.ExtensionContext,
  _secrets: SecretsManager
): void {
  if (!vscode.chat?.createChatParticipant) {
    return;
  }

  const participant = vscode.chat.createChatParticipant(
    "fixprompt.chat",
    async (
      request: vscode.ChatRequest,
      _chatContext: vscode.ChatContext,
      stream: vscode.ChatResponseStream,
      token: vscode.CancellationToken
    ): Promise<vscode.ChatResult> => {
      const rawPrompt = request.prompt.trim();

      if (!rawPrompt) {
        stream.markdown("Please provide a prompt.\n\n**Example:** `@fixprompt create a /users API`");
        return {};
      }

      // Pick Copilot's model — this is what chat participants must use
      const [model] = await vscode.lm.selectChatModels({
        vendor: "copilot",
        family: "gpt-4o",
      });

      if (!model) {
        stream.markdown("**Error:** No language model available. Make sure GitHub Copilot is installed and signed in.");
        return {};
      }

      try {
        const editor = vscode.window.activeTextEditor;
        const workspaceCtx = await scanWorkspace();
        const workspaceString = workspaceCtx ? formatContext(workspaceCtx) : "";
        const fileString = editor ? formatFileContext(extractFileContext(editor)) : "";
        const systemPrompt = buildSystemPrompt(workspaceString, fileString);

        const messages = [
          vscode.LanguageModelChatMessage.User(`${systemPrompt}\n\nRaw prompt to enhance:\n${rawPrompt}`),
        ];

        const response = await model.sendRequest(messages, {}, token);

        stream.markdown("### Enhanced Prompt\n\n");

        for await (const chunk of response.text) {
          if (token.isCancellationRequested) { break; }
          stream.markdown(chunk);
        }

        stream.markdown("\n\n---\n*Paste this into Copilot, Claude, or ChatGPT.*");

      } catch (err: unknown) {
        if (err instanceof vscode.LanguageModelError) {
          stream.markdown(`**Model error:** ${err.message}`);
        } else {
          const msg = err instanceof Error ? err.message : String(err);
          stream.markdown(`**Error:** ${msg}`);
        }
      }

      return {};
    }
  );

  participant.iconPath = new vscode.ThemeIcon("sparkle");
  context.subscriptions.push(participant);
}
