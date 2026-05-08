# Contributing to FixPrompt By AI

Thank you for your interest in contributing! This is an open source project and all contributions are welcome.

## Ways to Contribute

- Report bugs
- Suggest new LLM providers
- Improve prompt enhancement quality
- Fix issues
- Improve documentation

## Getting Started

### 1. Fork and clone

```bash
git clone https://github.com/hasanalihaolader/FixPrompt.git
cd FixPrompt
pnpm install
```

### 2. Run in development

```bash
# Compile and watch
pnpm run watch
```

Press `F5` in VS Code to launch the Extension Development Host.

### 3. Project structure

```
src/
  extension.ts              ← entry point, registers all commands
  commands/
    fixPrompt.ts            ← core Fix Prompt command + system prompt
    askClaude.ts            ← Enhance and Send to Claude command
  context/
    WorkspaceScanner.ts     ← detects framework/stack from package.json
    FileContextExtractor.ts ← reads active file imports + cursor context
  llm/
    LLMRouter.ts            ← routes to correct provider adapter
    fetchModels.ts          ← fetches live models from each provider API
    adapters/
      openai.ts             ← OpenAI adapter
      gemini.ts             ← Gemini adapter (raw fetch, no SDK)
      groq.ts               ← Groq adapter (OpenAI-compatible)
  config/
    SecretsManager.ts       ← wraps vscode.SecretStorage for API keys
  settings/
    SettingsPanel.ts        ← VS Code native-style settings webview
  chat/
    ChatParticipant.ts      ← @fixprompt Copilot Chat participant
```

## Adding a New LLM Provider

1. Create `src/llm/adapters/yourprovider.ts` with a `callYourProvider()` function
2. Add the provider to `PROVIDERS` and `DEFAULT_MODELS` in `src/llm/LLMRouter.ts`
3. Add a `fetchYourProviderModels()` function in `src/llm/fetchModels.ts`
4. Add the provider to the `enum` in `package.json` under `fixprompt.provider`

## Code Style

- TypeScript strict mode
- No unnecessary comments
- No extra abstractions — keep it simple
- Run `pnpm run check-types` before submitting

## Submitting a Pull Request

1. Create a branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run `pnpm run check-types` — must pass with zero errors
4. Push and open a PR against `main`
5. Describe what you changed and why

## Reporting Issues

Open an issue at [github.com/hasanalihaolader/FixPrompt/issues](https://github.com/hasanalihaolader/FixPrompt/issues)

Please include:
- VS Code version
- FixPrompt version
- Provider and model you're using
- Steps to reproduce
- Expected vs actual behavior

---

**Questions?** Email: rahibhasan689009@gmail.com
