import type { Provider } from "./LLMRouter";

export interface ModelInfo {
  id: string;
  free: boolean;
}

// Gemini free tier model prefixes — based on live API response
const GEMINI_FREE_PREFIXES = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash-image",
  "gemini-2.5-flash-preview",
];

function isGeminiFree(id: string): boolean {
  return GEMINI_FREE_PREFIXES.some(prefix => id === prefix || id.startsWith(prefix + "-"));
}

export async function fetchModels(provider: Provider, apiKey: string): Promise<ModelInfo[]> {
  switch (provider) {
    case "gemini": return fetchGeminiModels(apiKey);
    case "groq":   return fetchGroqModels(apiKey);
    case "openai": return fetchOpenAIModels(apiKey);
    default:       return [];
  }
}

async function fetchGeminiModels(apiKey: string): Promise<ModelInfo[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );
  if (!res.ok) throw new Error(`Gemini: ${res.statusText}`);

  const data = await res.json() as {
    models?: { name: string; supportedGenerationMethods?: string[] }[];
  };

  return (data.models ?? [])
    .filter(m => m.supportedGenerationMethods?.includes("generateContent"))
    .map(m => {
      const id = m.name.replace("models/", "");
      return { id, free: isGeminiFree(id) };
    })
    .sort((a, b) => Number(b.free) - Number(a.free) || a.id.localeCompare(b.id));
}

async function fetchGroqModels(apiKey: string): Promise<ModelInfo[]> {
  const res = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`Groq: ${res.statusText}`);

  const data = await res.json() as { data?: { id: string }[] };

  // All Groq models are free tier (rate limited)
  return (data.data ?? [])
    .map(m => ({ id: m.id, free: true }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

async function fetchOpenAIModels(apiKey: string): Promise<ModelInfo[]> {
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`OpenAI: ${res.statusText}`);

  const data = await res.json() as { data?: { id: string }[] };

  const allowed = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"];
  return (data.data ?? [])
    .map(m => m.id)
    .filter(id => allowed.some(a => id.startsWith(a)))
    .map(id => ({ id, free: false }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
