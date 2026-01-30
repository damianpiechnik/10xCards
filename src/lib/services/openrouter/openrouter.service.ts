import type {
  OpenRouterConfig,
  CompletionParams,
  CompletionResponse,
  OpenRouterRequest,
  OpenRouterRawResponse,
  JSONSchema,
} from "./openrouter.types";

import {
  OpenRouterError,
  OpenRouterAuthError,
  OpenRouterRateLimitError,
  OpenRouterValidationError,
  OpenRouterParseError,
  OpenRouterServerError,
  OpenRouterTimeoutError,
  OpenRouterNetworkError,
} from "./openrouter.errors";

import {
  validateTemperature,
  validateTopP,
  validatePenalty,
  validateSchema,
  calculateBackoff,
  sleep,
  parseRetryAfter,
} from "./openrouter.utils";

export class OpenRouterService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel?: string;
  private readonly defaultTemperature: number;
  private readonly defaultMaxTokens?: number;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(config: OpenRouterConfig) {
    // Walidacja klucza API
    if (!config.apiKey || config.apiKey.trim() === "") {
      throw new OpenRouterAuthError("API key is required");
    }

    // Inicjalizacja pól
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://openrouter.ai/api/v1";
    this.defaultModel = config.defaultModel;
    this.defaultTemperature = config.defaultTemperature ?? 0.7;
    this.defaultMaxTokens = config.defaultMaxTokens;
    this.timeout = config.timeout ?? 60000; // 60 sekund
    this.maxRetries = config.maxRetries ?? 3;

    // Walidacja domyślnych parametrów
    if (this.defaultTemperature !== undefined) {
      validateTemperature(this.defaultTemperature);
    }
  }

  /**
   * Dostęp do konfiguracji (bez klucza API)
   */
  get config(): Readonly<Omit<OpenRouterConfig, "apiKey">> {
    return {
      baseUrl: this.baseUrl,
      defaultModel: this.defaultModel,
      defaultTemperature: this.defaultTemperature,
      defaultMaxTokens: this.defaultMaxTokens,
      timeout: this.timeout,
      maxRetries: this.maxRetries,
    };
  }

  /**
   * Główna metoda do wykonywania completion requests
   */
  async completion<T = unknown>(params: CompletionParams): Promise<CompletionResponse<T>> {
    // Walidacja parametrów
    this.validateParams(params);

    // Budowanie żądania
    const request = this.buildRequest(params);

    // Wykonanie żądania z retry logic
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const rawResponse = await this.executeRequest(request);
        const response = this.parseResponse<T>(rawResponse, params.responseFormat?.json_schema.schema);
        return response;
      } catch (error) {
        lastError = error as Error;

        // Sprawdzenie czy należy retry
        const shouldRetry = attempt < this.maxRetries && this.shouldRetry(error);

        if (!shouldRetry) {
          throw this.handleError(error);
        }

        // Obliczenie czasu oczekiwania
        let backoffMs = calculateBackoff(attempt);

        // Respektowanie Retry-After dla 429
        if (error instanceof OpenRouterRateLimitError && error.retryAfter) {
          backoffMs = error.retryAfter * 1000;
        }

        // Logowanie retry attempt
        // eslint-disable-next-line no-console
        console.warn(
          `OpenRouter request failed (attempt ${attempt + 1}/${this.maxRetries + 1}). ` +
            `Retrying in ${backoffMs}ms...`,
          { error: (error as Error).message }
        );

        // Oczekiwanie przed retry
        await sleep(backoffMs);
      }
    }

    // Jeśli wszystkie próby się nie powiodły
    throw this.handleError(lastError);
  }

  /**
   * Walidacja parametrów
   */
  private validateParams(params: CompletionParams): void {
    // Sprawdzenie messages
    if (!params.messages || params.messages.length === 0) {
      throw new OpenRouterValidationError("Messages array cannot be empty");
    }

    // Sprawdzenie modelu
    if (!params.model && !this.defaultModel) {
      throw new OpenRouterValidationError("Model must be specified");
    }

    // Walidacja parametrów numerycznych
    if (params.temperature !== undefined) {
      validateTemperature(params.temperature);
    }

    if (params.topP !== undefined) {
      validateTopP(params.topP);
    }

    if (params.frequencyPenalty !== undefined) {
      validatePenalty(params.frequencyPenalty, "frequencyPenalty");
    }

    if (params.presencePenalty !== undefined) {
      validatePenalty(params.presencePenalty, "presencePenalty");
    }

    // Walidacja response_format
    if (params.responseFormat) {
      const validation = validateSchema(params.responseFormat.json_schema.schema);
      if (!validation.valid) {
        throw new OpenRouterValidationError("Invalid JSON schema", { errors: validation.errors });
      }
    }
  }

  /**
   * Buduje żądanie do API
   */
  private buildRequest(params: CompletionParams): OpenRouterRequest {
    const model = params.model || this.defaultModel;
    if (!model) {
      throw new OpenRouterValidationError("Model must be specified");
    }

    const request: OpenRouterRequest = {
      model,
      messages: params.messages,
      temperature: params.temperature ?? this.defaultTemperature,
      max_tokens: params.maxTokens ?? this.defaultMaxTokens,
      top_p: params.topP,
      frequency_penalty: params.frequencyPenalty,
      presence_penalty: params.presencePenalty,
      response_format: params.responseFormat,
      stop: params.stop,
      user: params.user,
    };

    // Usunięcie undefined values
    const filteredRequest = Object.fromEntries(
      Object.entries(request).filter(([, value]) => value !== undefined)
    ) as OpenRouterRequest;

    return filteredRequest;
  }

  /**
   * Wykonuje żądanie HTTP do API
   */
  private async executeRequest(request: OpenRouterRequest): Promise<OpenRouterRawResponse> {
    const url = `${this.baseUrl}/chat/completions`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://10xcards.app",
          "X-Title": "10xCards",
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Obsługa błędów HTTP
      if (!response.ok) {
        await this.handleHttpError(response);
      }

      // Parsowanie odpowiedzi
      const data = await response.json();
      return data as OpenRouterRawResponse;
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      const err = error as { name?: string; code?: string };

      // Timeout
      if (err.name === "AbortError") {
        throw new OpenRouterTimeoutError(`Request timeout after ${this.timeout}ms`);
      }

      // Network error
      if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
        throw new OpenRouterNetworkError("Failed to connect to OpenRouter API");
      }

      throw error;
    }
  }

  /**
   * Obsługuje błędy HTTP
   */
  private async handleHttpError(response: Response): Promise<never> {
    const status = response.status;
    let errorData: { error?: { message?: string }; message?: string } = {};

    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }

    const message = errorData.error?.message || errorData.message || response.statusText;

    // 401 - Authorization error
    if (status === 401 || status === 403) {
      throw new OpenRouterAuthError(message);
    }

    // 429 - Rate limit
    if (status === 429) {
      const retryAfter = parseRetryAfter(Object.fromEntries(response.headers.entries()));
      throw new OpenRouterRateLimitError(message, retryAfter);
    }

    // 400 - Validation error
    if (status === 400) {
      throw new OpenRouterValidationError(message, errorData);
    }

    // 5xx - Server error
    if (status >= 500) {
      throw new OpenRouterServerError(message, status);
    }

    // Inne błędy
    throw new OpenRouterError(message, "HTTP_ERROR", status, errorData);
  }

  /**
   * Parsuje odpowiedź z API
   */
  private parseResponse<T>(rawResponse: OpenRouterRawResponse, schema?: JSONSchema): CompletionResponse<T> {
    // Sprawdzenie podstawowej struktury
    if (!rawResponse.choices || rawResponse.choices.length === 0) {
      throw new OpenRouterParseError("No choices in response");
    }

    const choice = rawResponse.choices[0];
    const rawContent = choice.message.content;

    // Parsowanie content
    let content: T;

    if (schema) {
      // Jeśli jest schemat, parsujemy JSON
      try {
        content = JSON.parse(rawContent) as T;
      } catch {
        throw new OpenRouterParseError("Failed to parse JSON response", rawContent);
      }

      // Opcjonalna walidacja zgodności ze schematem
      // TODO: Można dodać bardziej zaawansowaną walidację
    } else {
      // Bez schematu, zwracamy surowy string
      content = rawContent as T;
    }

    return {
      id: rawResponse.id,
      model: rawResponse.model,
      content,
      rawContent,
      usage: {
        promptTokens: rawResponse.usage.prompt_tokens,
        completionTokens: rawResponse.usage.completion_tokens,
        totalTokens: rawResponse.usage.total_tokens,
      },
      finishReason: choice.finish_reason,
      created: rawResponse.created,
    };
  }

  /**
   * Sprawdza czy należy ponowić żądanie
   */
  private shouldRetry(error: unknown): boolean {
    if (error instanceof OpenRouterRateLimitError) {
      return true;
    }

    if (error instanceof OpenRouterServerError) {
      return true;
    }

    if (error instanceof OpenRouterNetworkError) {
      return true;
    }

    if (error instanceof OpenRouterTimeoutError) {
      return true;
    }

    // Nie retry dla innych błędów
    return false;
  }

  /**
   * Centralna obsługa błędów
   */
  private handleError(error: unknown): never {
    // Jeśli to już nasz custom error, rzucamy go dalej
    if (error instanceof OpenRouterError) {
      throw error;
    }

    // Jeśli to unknown error, opakowujemy go
    if (error instanceof Error) {
      throw new OpenRouterError(error.message, "UNKNOWN_ERROR", undefined, { originalError: error.name });
    }

    // Fallback dla kompletnie nieznanych błędów
    throw new OpenRouterError("An unknown error occurred", "UNKNOWN_ERROR", undefined, { error });
  }
}
