import { getAIConfig } from "@/lib/store";

export function aiHeaders(): Record<string, string> {
  const config = getAIConfig();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.apiKey) headers["x-api-key"] = config.apiKey;
  headers["x-provider"] = config.provider;
  if (config.model) headers["x-model"] = config.model;
  return headers;
}
