import * as vscode from "vscode";
import { SecretsManager } from "../config/SecretsManager";
import { callOpenAI } from "./adapters/openai";
import { callGemini } from "./adapters/gemini";
import { callGroq } from "./adapters/groq";

export const PROVIDERS = ["gemini", "groq", "openai"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const PROVIDER_MODELS: Record<Provider, string[]> = {
  gemini: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"],
  groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"],
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"],
};

export const DEFAULT_MODELS: Record<Provider, string> = {
  gemini: "gemini-1.5-flash",
  groq: "llama-3.3-70b-versatile",
  openai: "gpt-4o-mini",
};

export async function routeLLM(
  secrets: SecretsManager,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const config = vscode.workspace.getConfiguration("fixprompt");
  const provider = config.get<Provider>("provider", "gemini");
  const model = config.get<string>("model", DEFAULT_MODELS[provider]);

  const apiKey = await secrets.getKey(provider);
  if (!apiKey) {
    throw new Error(`No API key set for "${provider}". Open FixPrompt Settings to add it.`);
  }

  switch (provider) {
    case "openai":
      return callOpenAI(apiKey, model, systemPrompt, userPrompt);
    case "gemini":
      return callGemini(apiKey, model, systemPrompt, userPrompt);
    case "groq":
      return callGroq(apiKey, model, systemPrompt, userPrompt);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
