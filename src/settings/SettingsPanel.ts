import * as vscode from "vscode";
import { SecretsManager } from "../config/SecretsManager";
import { PROVIDERS, DEFAULT_MODELS, type Provider } from "../llm/LLMRouter";
import { fetchModels, type ModelInfo } from "../llm/fetchModels";

export class SettingsPanel {
  static currentPanel: SettingsPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  static async show(
    extensionUri: vscode.Uri,
    secrets: SecretsManager
  ): Promise<void> {
    if (SettingsPanel.currentPanel) {
      SettingsPanel.currentPanel.panel.reveal();
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      "fixpromptSettings",
      "FixPrompt Settings",
      vscode.ViewColumn.One,
      { enableScripts: true }
    );
    SettingsPanel.currentPanel = new SettingsPanel(panel, secrets);
    await SettingsPanel.currentPanel.render();
  }

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly secrets: SecretsManager
  ) {
    this.panel = panel;
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      msg => this.handleMessage(msg),
      null,
      this.disposables
    );
  }

  private async handleMessage(msg: {
    type: string;
    provider?: Provider;
    key?: string;
    model?: string;
  }) {
    const config = vscode.workspace.getConfiguration("fixprompt");

    if (msg.type === "save") {
      if (msg.provider) {
        await config.update("provider", msg.provider, vscode.ConfigurationTarget.Global);
      }
      if (msg.model) {
        await config.update("model", msg.model, vscode.ConfigurationTarget.Global);
      }
      if (msg.provider && msg.key && msg.key.trim()) {
        await this.secrets.setKey(msg.provider, msg.key.trim());
      }
      vscode.window.showInformationMessage("FixPrompt: Settings saved.");
      await this.render();
    }

    if (msg.type === "deleteKey" && msg.provider) {
      await this.secrets.deleteKey(msg.provider);
      vscode.window.showInformationMessage(`FixPrompt: API key removed for "${msg.provider}".`);
      await this.render();
    }

    if (msg.type === "fetchModels" && msg.provider) {
      const apiKey = await this.secrets.getKey(msg.provider);
      if (!apiKey) {
        this.panel.webview.postMessage({ type: "modelsError", error: "No API key saved for this provider yet. Save your key first." });
        return;
      }
      try {
        this.panel.webview.postMessage({ type: "modelsLoading" });
        const models = await fetchModels(msg.provider, apiKey);
        this.panel.webview.postMessage({ type: "modelsLoaded", models });
      } catch (err) {
        const msg2 = err instanceof Error ? err.message : String(err);
        this.panel.webview.postMessage({ type: "modelsError", error: msg2 });
      }
    }
  }

  private async render() {
    const config = vscode.workspace.getConfiguration("fixprompt");
    const currentProvider = config.get<Provider>("provider", "groq");
    const currentModel = config.get<string>("model", DEFAULT_MODELS[currentProvider]);

    const keyStatuses: Record<string, boolean> = {};
    for (const p of PROVIDERS) {
      keyStatuses[p] = !!(await this.secrets.getKey(p));
    }

    let initialModels: ModelInfo[] = [];
    if (keyStatuses[currentProvider]) {
      try {
        initialModels = await fetchModels(currentProvider, (await this.secrets.getKey(currentProvider))!);
      } catch {
        // silently fall back — webview will show status message
      }
    }

    this.panel.webview.html = buildHtml(currentProvider, currentModel, keyStatuses, initialModels);
  }

  private dispose() {
    SettingsPanel.currentPanel = undefined;
    this.panel.dispose();
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}

function modelOptionHtml(m: ModelInfo, currentModel: string): string {
  const label = m.free ? `${m.id} (free)` : m.id;
  return `<option value="${m.id}" ${m.id === currentModel ? "selected" : ""}>${label}</option>`;
}

function buildHtml(
  currentProvider: Provider,
  currentModel: string,
  keyStatuses: Record<string, boolean>,
  initialModels: ModelInfo[]
): string {
  const providerOptions = PROVIDERS.map(p =>
    `<option value="${p}" ${p === currentProvider ? "selected" : ""}>${p.charAt(0).toUpperCase() + p.slice(1)}</option>`
  ).join("");

  const modelOptions = initialModels.length > 0
    ? initialModels.map(m => modelOptionHtml(m, currentModel)).join("")
    : `<option value="${currentModel}" selected>${currentModel}</option>`;

  const hasKey = keyStatuses[currentProvider];

  return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>FixPrompt Settings</title>
<style>
  body {
    padding: 24px 28px;
    max-width: 520px;
    color: var(--vscode-foreground);
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    background: transparent;
  }
  h1 {
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 4px;
  }
  .subtitle {
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    margin-bottom: 24px;
  }
  .section { margin-bottom: 20px; }
  .section-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .07em;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 10px;
  }
  .field { margin-bottom: 12px; }
  label {
    display: block;
    font-size: 13px;
    margin-bottom: 5px;
  }
  select, input[type="password"] {
    width: 100%;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, transparent);
    border-radius: 2px;
    padding: 5px 8px;
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    box-sizing: border-box;
    outline: none;
  }
  select:focus, input:focus {
    border-color: var(--vscode-focusBorder);
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: -1px;
  }
  .description {
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    margin-top: 4px;
  }
  .key-row { display: flex; gap: 6px; }
  .key-row input { flex: 1; }
  .key-status {
    font-size: 12px;
    margin-top: 5px;
  }
  .key-status.set { color: var(--vscode-testing-iconPassed, #4ec9b0); }
  .key-status.missing { color: var(--vscode-testing-iconFailed, #f48771); }
  .model-status {
    font-size: 12px;
    margin-top: 5px;
    color: var(--vscode-descriptionForeground);
  }
  hr {
    border: none;
    border-top: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    margin: 20px 0;
  }
  .actions { display: flex; gap: 8px; margin-top: 4px; }
  button {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    border: none;
    border-radius: 2px;
    padding: 5px 14px;
    cursor: pointer;
  }
  .btn-primary {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
  }
  .btn-primary:hover { background: var(--vscode-button-hoverBackground); }
  .btn-secondary {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
  }
  .btn-secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
</style>
</head>
<body>

<h1>FixPrompt Settings</h1>
<div class="subtitle">Configure your AI provider, model, and API key.</div>

<div class="section">
  <div class="section-title">Provider &amp; Model</div>

  <div class="field">
    <label for="provider">LLM Provider</label>
    <select id="provider">${providerOptions}</select>
  </div>

  <div class="field">
    <label for="model">Model</label>
    <select id="model">${modelOptions}</select>
    <div class="model-status" id="model-status">
      ${initialModels.length > 0 ? `${initialModels.length} models loaded` : "Save your API key to auto-load models."}
    </div>
  </div>
</div>

<hr/>

<div class="section">
  <div class="section-title">API Key</div>
  <div class="field">
    <label for="apikey">Key for <span id="provider-label">${currentProvider}</span></label>
    <div class="key-row">
      <input type="password" id="apikey" placeholder="Paste your API key…" autocomplete="off"/>
      <button class="btn-secondary" id="btn-remove">Remove</button>
    </div>
    <div id="key-status" class="key-status ${hasKey ? "set" : "missing"}">
      ${hasKey ? "✓ Key is set" : "✗ No key saved"}
    </div>
    <div class="description">Stored securely in VS Code SecretStorage, never on disk.</div>
  </div>
</div>

<div class="actions">
  <button class="btn-primary" id="btn-save">Save</button>
</div>

<script>
  const vscode = acquireVsCodeApi();
  const keyStatuses = ${JSON.stringify(keyStatuses)};
  const defaultModels = ${JSON.stringify(DEFAULT_MODELS)};

  const providerEl = document.getElementById('provider');
  const modelEl = document.getElementById('model');
  const modelStatus = document.getElementById('model-status');
  const apikeyEl = document.getElementById('apikey');
  const providerLabel = document.getElementById('provider-label');
  const keyStatusEl = document.getElementById('key-status');

  function loadModels(provider) {
    modelStatus.textContent = 'Loading models…';
    modelEl.innerHTML = '<option value="">Loading…</option>';
    vscode.postMessage({ type: 'fetchModels', provider });
  }

  providerEl.addEventListener('change', () => {
    const p = providerEl.value;
    providerLabel.textContent = p;
    apikeyEl.value = '';
    const hasKey = keyStatuses[p];
    keyStatusEl.textContent = hasKey ? '✓ Key is set' : '✗ No key saved';
    keyStatusEl.className = 'key-status ' + (hasKey ? 'set' : 'missing');
    loadModels(p);
  });

  document.getElementById('btn-save').addEventListener('click', () => {
    vscode.postMessage({
      type: 'save',
      provider: providerEl.value,
      model: modelEl.value,
      key: apikeyEl.value,
    });
  });

  document.getElementById('btn-remove').addEventListener('click', () => {
    vscode.postMessage({ type: 'deleteKey', provider: providerEl.value });
  });

  window.addEventListener('message', e => {
    const msg = e.data;
    if (msg.type === 'modelsLoading') {
      modelStatus.textContent = 'Loading models…';
      modelEl.innerHTML = '<option value="">Loading…</option>';
    }
    if (msg.type === 'modelsLoaded') {
      const models = msg.models;
      const current = defaultModels[providerEl.value] || '';
      modelEl.innerHTML = models.map(m => {
        const label = m.free ? m.id + ' (free)' : m.id;
        return '<option value="' + m.id + '"' + (m.id === current ? ' selected' : '') + '>' + label + '</option>';
      }).join('');
      modelStatus.textContent = models.length + ' models loaded';
    }
    if (msg.type === 'modelsError') {
      modelEl.innerHTML = '<option value="">Failed to load</option>';
      modelStatus.textContent = '⚠ ' + msg.error;
    }
  });
</script>
</body>
</html>`;
}
