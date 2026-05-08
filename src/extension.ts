import * as vscode from "vscode";
import { SecretsManager } from "./config/SecretsManager";
import { fixPromptCommand } from "./commands/fixPrompt";
import { askClaudeCommand } from "./commands/askClaude";
import { SettingsPanel } from "./settings/SettingsPanel";
import { registerChatParticipant } from "./chat/ChatParticipant";

export function activate(context: vscode.ExtensionContext) {
  const secrets = new SecretsManager(context.secrets);

  registerChatParticipant(context, secrets);

  context.subscriptions.push(
    vscode.commands.registerCommand("fixprompt.fixPrompt", () =>
      fixPromptCommand(secrets)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("fixprompt.askClaude", () =>
      askClaudeCommand(secrets)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("fixprompt.openSettings", () =>
      SettingsPanel.show(context.extensionUri, secrets)
    )
  );
}

export function deactivate() {}
