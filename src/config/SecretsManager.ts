import * as vscode from "vscode";

const KEY_PREFIX = "fixprompt.apiKey";

export class SecretsManager {
  constructor(private readonly secrets: vscode.SecretStorage) {}

  async getKey(provider: string): Promise<string | undefined> {
    return this.secrets.get(`${KEY_PREFIX}.${provider}`);
  }

  async setKey(provider: string, key: string): Promise<void> {
    await this.secrets.store(`${KEY_PREFIX}.${provider}`, key);
  }

  async deleteKey(provider: string): Promise<void> {
    await this.secrets.delete(`${KEY_PREFIX}.${provider}`);
  }
}
