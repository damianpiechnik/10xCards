import { OpenRouterService } from "./openrouter.service";

// Pobranie klucza API ze zmiennych środowiskowych
const apiKey = import.meta.env.OPENROUTER_API_KEY;

if (!apiKey) {
  throw new Error("OPENROUTER_API_KEY environment variable is required");
}

// Utworzenie instancji
export const openRouter = new OpenRouterService({
  apiKey,
  defaultModel: "openai/gpt-4-turbo-preview",
  defaultTemperature: 0.7,
  defaultMaxTokens: 1333,
  timeout: 60000,
  maxRetries: 3,
});
