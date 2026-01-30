import type { JSONSchema } from "./openrouter.types";
import { OpenRouterValidationError } from "./openrouter.errors";

/**
 * Waliduje parametr temperature
 */
export function validateTemperature(temperature: number): void {
  if (temperature < 0 || temperature > 2) {
    throw new OpenRouterValidationError("Temperature must be between 0 and 2", { temperature });
  }
}

/**
 * Waliduje parametr topP
 */
export function validateTopP(topP: number): void {
  if (topP < 0 || topP > 1) {
    throw new OpenRouterValidationError("Top-p must be between 0 and 1", { topP });
  }
}

/**
 * Waliduje parametry penalty
 */
export function validatePenalty(penalty: number, name: string): void {
  if (penalty < -2 || penalty > 2) {
    throw new OpenRouterValidationError(`${name} must be between -2 and 2`, { [name]: penalty });
  }
}

/**
 * Waliduje schemat JSON
 */
export function validateSchema(schema: JSONSchema): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Sprawdzenie typu
  if (!schema.type) {
    errors.push("Schema must have a type property");
  }

  // Sprawdzenie properties dla object
  if (schema.type === "object") {
    if (!schema.properties) {
      errors.push("Object schema must have properties");
    }
    if (schema.additionalProperties !== undefined && schema.additionalProperties !== false) {
      errors.push("For strict mode, additionalProperties should be false");
    }
  }

  // Sprawdzenie items dla array
  if (schema.type === "array" && !schema.items) {
    errors.push("Array schema must have items");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Oblicza czas oczekiwania dla exponential backoff
 */
export function calculateBackoff(attempt: number): number {
  const baseDelay = 1000; // 1 sekunda
  const maxDelay = 32000; // 32 sekundy
  return Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
}

/**
 * Sleep helper dla retry logic
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sprawdza czy błąd jest retryable
 */
export function isRetryableError(error: unknown): boolean {
  const err = error as { code?: string; response?: { status?: number }; statusCode?: number };

  // Network errors
  if (err.code === "ECONNRESET" || err.code === "ETIMEDOUT" || err.code === "ENOTFOUND") {
    return true;
  }

  // HTTP status codes
  const status = err.response?.status || err.statusCode;
  if (status !== undefined && (status === 429 || status >= 500)) {
    return true;
  }

  return false;
}

/**
 * Parsuje nagłówek Retry-After
 */
export function parseRetryAfter(headers: Record<string, string>): number | undefined {
  const retryAfter = headers["retry-after"] || headers["Retry-After"];
  if (!retryAfter) return undefined;

  // Jeśli to liczba sekund
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds;
  }

  // Jeśli to data
  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    return Math.max(0, Math.floor((date.getTime() - Date.now()) / 1000));
  }

  return undefined;
}
