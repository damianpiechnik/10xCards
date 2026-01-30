# Plan Implementacji Usługi OpenRouter

## 1. Opis Usługi

Usługa OpenRouter jest dedykowanym serwisem do komunikacji z API OpenRouter, zapewniającym abstrakcję dla wykonywania zapytań do modeli LLM. Usługa oferuje:

- Bezpieczne zarządzanie kluczem API
- Konstruowanie i walidację żądań do API OpenRouter
- Obsługę structured output poprzez response_format (JSON Schema)
- Parsowanie i walidację odpowiedzi
- Kompleksową obsługę błędów z retry logic
- Pełne wsparcie TypeScript z dokładnymi typami

### Kluczowe Funkcjonalności

1. **Zarządzanie Konfiguracją**: Bezpieczne przechowywanie i walidacja klucza API oraz endpointów
2. **Budowanie Żądań**: Konstruowanie prawidłowych żądań z messages, parametrami i schematami JSON
3. **Komunikacja HTTP**: Niezawodna komunikacja z API OpenRouter z obsługą timeout'ów i retry
4. **Parsowanie Odpowiedzi**: Automatyczne parsowanie i walidacja odpowiedzi zgodnie ze schematem
5. **Obsługa Błędów**: Szczegółowa klasyfikacja i obsługa różnych scenariuszy błędów

## 2. Opis Konstruktora

Konstruktor inicjalizuje usługę z niezbędną konfiguracją i wykonuje walidację początkową.

### Parametry Konstruktora

```typescript
interface OpenRouterConfig {
  apiKey: string; // Klucz API OpenRouter (wymagany)
  baseUrl?: string; // Opcjonalny custom endpoint (domyślnie: https://openrouter.ai/api/v1)
  defaultModel?: string; // Domyślny model do użycia
  defaultTemperature?: number; // Domyślna temperatura (0.0 - 2.0)
  defaultMaxTokens?: number; // Domyślna maksymalna liczba tokenów
  timeout?: number; // Timeout w ms (domyślnie: 60000)
  maxRetries?: number; // Maksymalna liczba prób retry (domyślnie: 3)
}
```

### Proces Inicjalizacji

1. **Walidacja klucza API**:
   - Sprawdzenie, czy klucz nie jest pusty
   - Opcjonalna walidacja formatu klucza
   - Rzucenie błędu jeśli walidacja się nie powiedzie

2. **Ustawienie wartości domyślnych**:
   - baseUrl: `https://openrouter.ai/api/v1`
   - timeout: `60000` ms (60 sekund)
   - maxRetries: `3`
   - defaultTemperature: `0.7`

3. **Inicjalizacja klienta HTTP**:
   - Konfiguracja nagłówków (Authorization, Content-Type)
   - Ustawienie timeout'ów
   - Konfiguracja interceptorów błędów

## 3. Publiczne Metody i Pola

### 3.1 Metoda `completion()`

Główna metoda do wykonywania zapytań do modeli LLM.

```typescript
async completion<T = any>(params: CompletionParams): Promise<CompletionResponse<T>>
```

#### Parametry

```typescript
interface CompletionParams {
  // Wiadomości
  messages: Message[]; // Array wiadomości (wymagany)

  // Konfiguracja modelu
  model?: string; // Nazwa modelu (opcjonalne, użyje defaultModel)

  // Parametry generacji
  temperature?: number; // Temperatura (0.0 - 2.0)
  maxTokens?: number; // Maksymalna liczba tokenów
  topP?: number; // Top-p sampling (0.0 - 1.0)
  frequencyPenalty?: number; // Frequency penalty (-2.0 - 2.0)
  presencePenalty?: number; // Presence penalty (-2.0 - 2.0)

  // Structured output
  responseFormat?: ResponseFormat; // Schema JSON dla odpowiedzi

  // Inne
  stop?: string[]; // Sekwencje stop
  user?: string; // Identyfikator użytkownika
}

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string; // Nazwa schematu
    strict: boolean; // Strict mode (zalecane: true)
    schema: JSONSchema; // Schemat JSON
  };
}
```

#### Typ Zwracany

```typescript
interface CompletionResponse<T> {
  id: string; // ID odpowiedzi
  model: string; // Użyty model
  content: T; // Sparsowana zawartość (typ generyczny)
  rawContent: string; // Surowa zawartość
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string; // Powód zakończenia
  created: number; // Timestamp
}
```

#### Przykład Użycia

```typescript
// Przykład 1: Podstawowe użycie z system i user message
const response = await openRouter.completion({
  messages: [
    {
      role: "system",
      content: "You are a helpful assistant that generates flashcards.",
    },
    {
      role: "user",
      content: "Generate 5 flashcards about photosynthesis.",
    },
  ],
  model: "openai/gpt-4-turbo-preview",
  temperature: 0.7,
  maxTokens: 2000,
});

// Przykład 2: Użycie z response_format (structured output)
interface FlashcardSchema {
  flashcards: Array<{
    front: string;
    back: string;
  }>;
}

const response = await openRouter.completion<FlashcardSchema>({
  messages: [
    {
      role: "system",
      content: "Generate flashcards in the specified JSON format.",
    },
    {
      role: "user",
      content: "Generate 5 flashcards about photosynthesis.",
    },
  ],
  model: "openai/gpt-4-turbo-preview",
  responseFormat: {
    type: "json_schema",
    json_schema: {
      name: "flashcard_generation",
      strict: true,
      schema: {
        type: "object",
        properties: {
          flashcards: {
            type: "array",
            items: {
              type: "object",
              properties: {
                front: { type: "string" },
                back: { type: "string" },
              },
              required: ["front", "back"],
              additionalProperties: false,
            },
          },
        },
        required: ["flashcards"],
        additionalProperties: false,
      },
    },
  },
  temperature: 0.7,
});

// Dostęp do sparsowanych danych
console.log(response.content.flashcards); // Typ-safe array fiszek
```

### 3.2 Metoda `validateSchema()`

Pomocnicza metoda do walidacji schematu JSON przed wysłaniem.

```typescript
validateSchema(schema: JSONSchema): { valid: boolean; errors?: string[] }
```

### 3.3 Metoda `getModels()`

Opcjonalna metoda do pobierania listy dostępnych modeli.

```typescript
async getModels(): Promise<ModelInfo[]>
```

### 3.4 Pola Publiczne

```typescript
readonly config: Readonly<OpenRouterConfig>;  // Dostęp do konfiguracji (bez klucza API)
```

## 4. Prywatne Metody i Pola

### 4.1 Pole `apiKey`

```typescript
private readonly apiKey: string;
```

Przechowuje klucz API. Nigdy nie jest eksponowane publicznie.

### 4.2 Pole `httpClient`

```typescript
private readonly httpClient: HttpClient;
```

Instancja klienta HTTP (np. axios lub fetch wrapper).

### 4.3 Metoda `buildRequest()`

```typescript
private buildRequest(params: CompletionParams): OpenRouterRequest
```

Konstruuje obiekt żądania zgodny z API OpenRouter.

**Proces:**

1. Walidacja wymaganych pól (messages, model)
2. Merge parametrów użytkownika z wartościami domyślnymi
3. Formatowanie response_format jeśli podany
4. Walidacja range'ów parametrów (temperature, topP, etc.)
5. Zwrócenie sformatowanego obiektu żądania

### 4.4 Metoda `executeRequest()`

```typescript
private async executeRequest(request: OpenRouterRequest): Promise<OpenRouterRawResponse>
```

Wykonuje żądanie HTTP do API OpenRouter z retry logic.

**Proces:**

1. Ustawienie nagłówków:
   - `Authorization: Bearer ${apiKey}`
   - `Content-Type: application/json`
   - `HTTP-Referer`: opcjonalny
   - `X-Title`: opcjonalny
2. Wykonanie POST request do `/chat/completions`
3. Obsługa retry dla błędów 429 i 5xx
4. Zwrócenie surowej odpowiedzi

### 4.5 Metoda `parseResponse()`

```typescript
private parseResponse<T>(rawResponse: OpenRouterRawResponse, schema?: JSONSchema): CompletionResponse<T>
```

Parsuje surową odpowiedź z API i waliduje zgodność ze schematem.

**Proces:**

1. Ekstrakcja content z `choices[0].message.content`
2. Parsowanie JSON jeśli response_format był użyty
3. Walidacja zgodności z schematem jeśli podany
4. Ekstrakcja metadanych (usage, finish_reason)
5. Zwrócenie sparsowanej odpowiedzi

### 4.6 Metoda `handleError()`

```typescript
private handleError(error: unknown): never
```

Centralna obsługa błędów - mapuje różne typy błędów na custom error classes.

### 4.7 Metoda `shouldRetry()`

```typescript
private shouldRetry(error: unknown, attempt: number): boolean
```

Decyduje, czy należy ponowić żądanie na podstawie typu błędu i liczby prób.

**Retry dla:**

- 429 (Rate limit exceeded)
- 500, 502, 503, 504 (Server errors)
- Network errors

**Nie retry dla:**

- 401, 403 (Authorization errors)
- 400 (Bad request)
- Inne błędy klienta (4xx)

### 4.8 Metoda `calculateBackoff()`

```typescript
private calculateBackoff(attempt: number): number
```

Oblicza czas oczekiwania dla exponential backoff.

**Formula:** `Math.min(1000 * Math.pow(2, attempt), 32000)`

## 5. Obsługa Błędów

### 5.1 Custom Error Classes

```typescript
// Bazowa klasa błędów
class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: any
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

// Błąd autoryzacji
class OpenRouterAuthError extends OpenRouterError {
  constructor(message: string = "Invalid API key") {
    super(message, "AUTH_ERROR", 401);
    this.name = "OpenRouterAuthError";
  }
}

// Błąd rate limit
class OpenRouterRateLimitError extends OpenRouterError {
  constructor(
    message: string = "Rate limit exceeded",
    public readonly retryAfter?: number
  ) {
    super(message, "RATE_LIMIT_ERROR", 429);
    this.name = "OpenRouterRateLimitError";
  }
}

// Błąd walidacji
class OpenRouterValidationError extends OpenRouterError {
  constructor(message: string, details?: any) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "OpenRouterValidationError";
  }
}

// Błąd parsowania
class OpenRouterParseError extends OpenRouterError {
  constructor(
    message: string,
    public readonly rawContent?: string
  ) {
    super(message, "PARSE_ERROR");
    this.name = "OpenRouterParseError";
  }
}

// Błąd serwera
class OpenRouterServerError extends OpenRouterError {
  constructor(message: string = "Server error", statusCode: number = 500) {
    super(message, "SERVER_ERROR", statusCode);
    this.name = "OpenRouterServerError";
  }
}

// Błąd timeout
class OpenRouterTimeoutError extends OpenRouterError {
  constructor(message: string = "Request timeout") {
    super(message, "TIMEOUT_ERROR");
    this.name = "OpenRouterTimeoutError";
  }
}

// Błąd sieci
class OpenRouterNetworkError extends OpenRouterError {
  constructor(message: string = "Network error") {
    super(message, "NETWORK_ERROR");
    this.name = "OpenRouterNetworkError";
  }
}
```

### 5.2 Scenariusze Błędów i Ich Obsługa

#### Scenariusz 1: Błąd Autoryzacji (401)

**Przyczyna:** Nieprawidłowy lub brakujący klucz API  
**Obsługa:**

- Rzucenie `OpenRouterAuthError`
- Brak retry
- Logowanie błędu
- Komunikat: "Invalid API key. Please check your OpenRouter API key."

#### Scenariusz 2: Rate Limit Exceeded (429)

**Przyczyna:** Przekroczenie limitów API  
**Obsługa:**

- Rzucenie `OpenRouterRateLimitError` z `retryAfter`
- Retry z exponential backoff
- Respektowanie nagłówka `Retry-After`
- Komunikat: "Rate limit exceeded. Please try again later."

#### Scenariusz 3: Błąd Serwera (5xx)

**Przyczyna:** Problemy po stronie OpenRouter  
**Obsługa:**

- Rzucenie `OpenRouterServerError`
- Retry do `maxRetries`
- Exponential backoff
- Komunikat: "OpenRouter service temporarily unavailable. Please try again."

#### Scenariusz 4: Nieprawidłowe Żądanie (400)

**Przyczyna:** Błędne parametry lub schemat  
**Obsługa:**

- Rzucenie `OpenRouterValidationError` z details
- Brak retry
- Walidacja przed wysłaniem
- Komunikat: Szczegóły z API

#### Scenariusz 5: Timeout

**Przyczyna:** Zbyt długa generacja  
**Obsługa:**

- Rzucenie `OpenRouterTimeoutError`
- Opcjonalny retry z większym timeout
- Komunikat: "Request timeout. Try reducing max_tokens or try again."

#### Scenariusz 6: Błąd Parsowania Odpowiedzi

**Przyczyna:** Nieprawidłowy format JSON w odpowiedzi  
**Obsługa:**

- Rzucenie `OpenRouterParseError` z rawContent
- Brak retry
- Logowanie surowej odpowiedzi
- Komunikat: "Failed to parse response. The model may not support structured output."

#### Scenariusz 7: Błąd Walidacji Schematu

**Przyczyna:** Odpowiedź nie zgadza się ze schematem  
**Obsługa:**

- Rzucenie `OpenRouterValidationError`
- Logowanie błędów walidacji
- Opcjonalny retry (1 próba)
- Komunikat: Szczegóły niezgodności

#### Scenariusz 8: Błąd Sieci

**Przyczyna:** Brak połączenia internetowego  
**Obsługa:**

- Rzucenie `OpenRouterNetworkError`
- Retry z exponential backoff
- Komunikat: "Network error. Please check your internet connection."

### 5.3 Przykład Użycia Error Handling

```typescript
try {
  const response = await openRouter.completion({
    messages: [
      /* ... */
    ],
    model: "openai/gpt-4-turbo-preview",
  });
} catch (error) {
  if (error instanceof OpenRouterAuthError) {
    // Przekieruj do strony konfiguracji API key
    console.error("Authentication failed:", error.message);
  } else if (error instanceof OpenRouterRateLimitError) {
    // Poczekaj i spróbuj ponownie
    const retryAfter = error.retryAfter || 60;
    console.error(`Rate limited. Retry after ${retryAfter}s`);
  } else if (error instanceof OpenRouterValidationError) {
    // Pokaż użytkownikowi błędy walidacji
    console.error("Validation error:", error.details);
  } else if (error instanceof OpenRouterParseError) {
    // Model nie obsługuje structured output
    console.error("Parse error. Raw content:", error.rawContent);
  } else if (error instanceof OpenRouterTimeoutError) {
    // Zasugeruj zmniejszenie max_tokens
    console.error("Request timeout");
  } else {
    // Ogólny błąd
    console.error("Unknown error:", error);
  }
}
```

## 6. Kwestie Bezpieczeństwa

### 6.1 Zarządzanie Kluczem API

1. **Przechowywanie:**
   - Klucz API musi być przechowywany w zmiennych środowiskowych
   - Nigdy nie commitować klucza do repozytorium
   - Użycie `.env` i `.env.example`

2. **Dostęp:**
   - Klucz API przechowywany jako `private readonly`
   - Brak metod publicznych zwracających klucz
   - Brak logowania klucza w błędach

3. **Walidacja:**
   - Walidacja formatu przy inicjalizacji
   - Sprawdzenie czy klucz nie jest pusty
   - Opcjonalna walidacja prefiksu (jeśli OpenRouter używa)

### 6.2 Sanityzacja Danych Wejściowych

1. **Messages:**
   - Walidacja długości content
   - Escapowanie specjalnych znaków jeśli potrzebne
   - Sprawdzenie typu role

2. **Parametry:**
   - Walidacja range'ów (temperature: 0-2, topP: 0-1, etc.)
   - Walidacja typów (number, string, boolean)
   - Sprawdzenie maksymalnych wartości (maxTokens)

3. **Schema:**
   - Walidacja poprawności JSON Schema
   - Sprawdzenie wymaganych pól
   - Ograniczenie zagnieżdżenia schematu

### 6.3 Bezpieczeństwo Komunikacji

1. **HTTPS:**
   - Wyłącznie HTTPS dla komunikacji z API
   - Walidacja certyfikatu SSL

2. **Nagłówki:**
   - Ustawienie odpowiednich nagłówków bezpieczeństwa
   - Opcjonalne: User-Agent, Referer dla trackingu

3. **Timeout:**
   - Zawsze ustawiony timeout dla żądań
   - Ochrona przed zawieszeniem

### 6.4 Logging i Monitoring

1. **Co logować:**
   - Request ID
   - Model użyty
   - Liczba tokenów
   - Czas odpowiedzi
   - Błędy (bez klucza API)

2. **Czego NIE logować:**
   - Klucz API
   - Pełna zawartość messages (może zawierać dane użytkownika)
   - Surowa odpowiedź z danymi użytkownika

3. **Poziomy logów:**
   - INFO: Udane żądania, podstawowe metryki
   - WARN: Retry attempts, rate limits
   - ERROR: Wszystkie błędy z kontekstem

## 7. Plan Wdrożenia Krok Po Kroku

### Krok 1: Przygotowanie Środowiska

**Zadania:**

1. Utworzenie pliku `.env` z kluczem API:

   ```env
   OPENROUTER_API_KEY=sk-or-v1-xxxxx
   ```

2. Aktualizacja `.env.example`:

   ```env
   OPENROUTER_API_KEY=your_api_key_here
   ```

3. Instalacja zależności (jeśli potrzebne):
   ```bash
   npm install axios
   # lub
   npm install node-fetch
   ```

**Struktura katalogów:**

```
src/
  lib/
    services/
      openrouter/
        openrouter.service.ts       # Główna klasa usługi
        openrouter.types.ts         # Typy TypeScript
        openrouter.errors.ts        # Custom error classes
        openrouter.utils.ts         # Pomocnicze funkcje
        index.ts                    # Re-export
```

### Krok 2: Implementacja Typów

**Plik: `src/lib/services/openrouter/openrouter.types.ts`**

```typescript
// Konfiguracja
export interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  timeout?: number;
  maxRetries?: number;
}

// Messages
export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

// JSON Schema
export interface JSONSchema {
  type: "object" | "array" | "string" | "number" | "boolean" | "null";
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  additionalProperties?: boolean;
  description?: string;
  enum?: any[];
  [key: string]: any;
}

// Response Format
export interface ResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: JSONSchema;
  };
}

// Parametry completion
export interface CompletionParams {
  messages: Message[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  responseFormat?: ResponseFormat;
  stop?: string[];
  user?: string;
}

// Odpowiedź
export interface CompletionResponse<T = any> {
  id: string;
  model: string;
  content: T;
  rawContent: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
  created: number;
}

// Surowa odpowiedź z API
export interface OpenRouterRawResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
    index: number;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  created: number;
}

// Żądanie do API
export interface OpenRouterRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  response_format?: ResponseFormat;
  stop?: string[];
  user?: string;
}
```

### Krok 3: Implementacja Error Classes

**Plik: `src/lib/services/openrouter/openrouter.errors.ts`**

```typescript
export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: any
  ) {
    super(message);
    this.name = "OpenRouterError";
    Object.setPrototypeOf(this, OpenRouterError.prototype);
  }
}

export class OpenRouterAuthError extends OpenRouterError {
  constructor(message: string = "Invalid API key") {
    super(message, "AUTH_ERROR", 401);
    this.name = "OpenRouterAuthError";
    Object.setPrototypeOf(this, OpenRouterAuthError.prototype);
  }
}

export class OpenRouterRateLimitError extends OpenRouterError {
  constructor(
    message: string = "Rate limit exceeded",
    public readonly retryAfter?: number
  ) {
    super(message, "RATE_LIMIT_ERROR", 429);
    this.name = "OpenRouterRateLimitError";
    Object.setPrototypeOf(this, OpenRouterRateLimitError.prototype);
  }
}

export class OpenRouterValidationError extends OpenRouterError {
  constructor(message: string, details?: any) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "OpenRouterValidationError";
    Object.setPrototypeOf(this, OpenRouterValidationError.prototype);
  }
}

export class OpenRouterParseError extends OpenRouterError {
  constructor(
    message: string,
    public readonly rawContent?: string
  ) {
    super(message, "PARSE_ERROR");
    this.name = "OpenRouterParseError";
    Object.setPrototypeOf(this, OpenRouterParseError.prototype);
  }
}

export class OpenRouterServerError extends OpenRouterError {
  constructor(message: string = "Server error", statusCode: number = 500) {
    super(message, "SERVER_ERROR", statusCode);
    this.name = "OpenRouterServerError";
    Object.setPrototypeOf(this, OpenRouterServerError.prototype);
  }
}

export class OpenRouterTimeoutError extends OpenRouterError {
  constructor(message: string = "Request timeout") {
    super(message, "TIMEOUT_ERROR");
    this.name = "OpenRouterTimeoutError";
    Object.setPrototypeOf(this, OpenRouterTimeoutError.prototype);
  }
}

export class OpenRouterNetworkError extends OpenRouterError {
  constructor(message: string = "Network error") {
    super(message, "NETWORK_ERROR");
    this.name = "OpenRouterNetworkError";
    Object.setPrototypeOf(this, OpenRouterNetworkError.prototype);
  }
}
```

### Krok 4: Implementacja Funkcji Pomocniczych

**Plik: `src/lib/services/openrouter/openrouter.utils.ts`**

```typescript
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
    if (!schema.additionalProperties !== undefined && schema.additionalProperties !== false) {
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
export function isRetryableError(error: any): boolean {
  // Network errors
  if (error.code === "ECONNRESET" || error.code === "ETIMEDOUT" || error.code === "ENOTFOUND") {
    return true;
  }

  // HTTP status codes
  const status = error.response?.status || error.statusCode;
  if (status === 429 || status >= 500) {
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
```

### Krok 5: Implementacja Głównej Klasy Usługi - Część 1 (Konstruktor i Pola)

**Plik: `src/lib/services/openrouter/openrouter.service.ts`**

```typescript
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
  isRetryableError,
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

  // Metody będą zaimplementowane w kolejnych krokach...
}
```

### Krok 6: Implementacja Głównej Klasy Usługi - Część 2 (Metoda completion)

Dodaj do klasy `OpenRouterService`:

```typescript
/**
 * Główna metoda do wykonywania completion requests
 */
async completion<T = any>(params: CompletionParams): Promise<CompletionResponse<T>> {
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
    throw new OpenRouterValidationError('Messages array cannot be empty');
  }

  // Sprawdzenie modelu
  if (!params.model && !this.defaultModel) {
    throw new OpenRouterValidationError('Model must be specified');
  }

  // Walidacja parametrów numerycznych
  if (params.temperature !== undefined) {
    validateTemperature(params.temperature);
  }

  if (params.topP !== undefined) {
    validateTopP(params.topP);
  }

  if (params.frequencyPenalty !== undefined) {
    validatePenalty(params.frequencyPenalty, 'frequencyPenalty');
  }

  if (params.presencePenalty !== undefined) {
    validatePenalty(params.presencePenalty, 'presencePenalty');
  }

  // Walidacja response_format
  if (params.responseFormat) {
    const validation = validateSchema(params.responseFormat.json_schema.schema);
    if (!validation.valid) {
      throw new OpenRouterValidationError(
        'Invalid JSON schema',
        { errors: validation.errors }
      );
    }
  }
}
```

### Krok 7: Implementacja Głównej Klasy Usługi - Część 3 (Metody Prywatne)

Dodaj do klasy `OpenRouterService`:

```typescript
/**
 * Buduje żądanie do API
 */
private buildRequest(params: CompletionParams): OpenRouterRequest {
  const request: OpenRouterRequest = {
    model: params.model || this.defaultModel!,
    messages: params.messages,
    temperature: params.temperature ?? this.defaultTemperature,
    max_tokens: params.maxTokens ?? this.defaultMaxTokens,
    top_p: params.topP,
    frequency_penalty: params.frequencyPenalty,
    presence_penalty: params.presencePenalty,
    response_format: params.responseFormat,
    stop: params.stop,
    user: params.user
  };

  // Usunięcie undefined values
  Object.keys(request).forEach(key => {
    if (request[key as keyof OpenRouterRequest] === undefined) {
      delete request[key as keyof OpenRouterRequest];
    }
  });

  return request;
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
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://10xcards.app', // Opcjonalne
        'X-Title': '10xCards' // Opcjonalne
      },
      body: JSON.stringify(request),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Obsługa błędów HTTP
    if (!response.ok) {
      await this.handleHttpError(response);
    }

    // Parsowanie odpowiedzi
    const data = await response.json();
    return data as OpenRouterRawResponse;

  } catch (error: any) {
    clearTimeout(timeoutId);

    // Timeout
    if (error.name === 'AbortError') {
      throw new OpenRouterTimeoutError(`Request timeout after ${this.timeout}ms`);
    }

    // Network error
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new OpenRouterNetworkError('Failed to connect to OpenRouter API');
    }

    throw error;
  }
}

/**
 * Obsługuje błędy HTTP
 */
private async handleHttpError(response: Response): Promise<never> {
  const status = response.status;
  let errorData: any;

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
  throw new OpenRouterError(message, 'HTTP_ERROR', status, errorData);
}

/**
 * Parsuje odpowiedź z API
 */
private parseResponse<T>(
  rawResponse: OpenRouterRawResponse,
  schema?: JSONSchema
): CompletionResponse<T> {
  // Sprawdzenie podstawowej struktury
  if (!rawResponse.choices || rawResponse.choices.length === 0) {
    throw new OpenRouterParseError('No choices in response');
  }

  const choice = rawResponse.choices[0];
  const rawContent = choice.message.content;

  // Parsowanie content
  let content: T;

  if (schema) {
    // Jeśli jest schemat, parsujemy JSON
    try {
      content = JSON.parse(rawContent) as T;
    } catch (error) {
      throw new OpenRouterParseError(
        'Failed to parse JSON response',
        rawContent
      );
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
      totalTokens: rawResponse.usage.total_tokens
    },
    finishReason: choice.finish_reason,
    created: rawResponse.created
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
    throw new OpenRouterError(
      error.message,
      'UNKNOWN_ERROR',
      undefined,
      { originalError: error.name }
    );
  }

  // Fallback dla kompletnie nieznanych błędów
  throw new OpenRouterError(
    'An unknown error occurred',
    'UNKNOWN_ERROR',
    undefined,
    { error }
  );
}
```

### Krok 8: Export i Index

**Plik: `src/lib/services/openrouter/index.ts`**

```typescript
// Service
export { OpenRouterService } from "./openrouter.service";

// Types
export type {
  OpenRouterConfig,
  Message,
  JSONSchema,
  ResponseFormat,
  CompletionParams,
  CompletionResponse,
  OpenRouterRawResponse,
  OpenRouterRequest,
} from "./openrouter.types";

// Errors
export {
  OpenRouterError,
  OpenRouterAuthError,
  OpenRouterRateLimitError,
  OpenRouterValidationError,
  OpenRouterParseError,
  OpenRouterServerError,
  OpenRouterTimeoutError,
  OpenRouterNetworkError,
} from "./openrouter.errors";

// Utils (jeśli potrzebne publicznie)
export { validateSchema, calculateBackoff } from "./openrouter.utils";
```

### Krok 9: Utworzenie Instancji Usługi (Singleton Pattern)

**Plik: `src/lib/services/openrouter/openrouter.instance.ts`**

```typescript
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
  defaultMaxTokens: 2000,
  timeout: 60000,
  maxRetries: 3,
});
```

**Aktualizacja pliku index.ts:**

```typescript
// ... poprzednie exporty ...

// Singleton instance
export { openRouter } from "./openrouter.instance";
```

### Krok 10: Przykłady Użycia

**Plik: `src/lib/services/openrouter/examples.ts`** (opcjonalny, do dokumentacji)

```typescript
import { openRouter, type ResponseFormat } from "./index";

// Przykład 1: Podstawowe użycie
async function example1() {
  const response = await openRouter.completion({
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant.",
      },
      {
        role: "user",
        content: "What is the capital of France?",
      },
    ],
  });

  console.log(response.content); // Paris
}

// Przykład 2: Structured output dla fiszek
interface FlashcardSchema {
  flashcards: Array<{
    front: string;
    back: string;
    difficulty?: "easy" | "medium" | "hard";
  }>;
}

async function example2() {
  const responseFormat: ResponseFormat = {
    type: "json_schema",
    json_schema: {
      name: "flashcard_generation",
      strict: true,
      schema: {
        type: "object",
        properties: {
          flashcards: {
            type: "array",
            items: {
              type: "object",
              properties: {
                front: { type: "string" },
                back: { type: "string" },
                difficulty: {
                  type: "string",
                  enum: ["easy", "medium", "hard"],
                },
              },
              required: ["front", "back"],
              additionalProperties: false,
            },
          },
        },
        required: ["flashcards"],
        additionalProperties: false,
      },
    },
  };

  const response = await openRouter.completion<FlashcardSchema>({
    messages: [
      {
        role: "system",
        content: "Generate flashcards in the specified JSON format. Assign difficulty based on complexity.",
      },
      {
        role: "user",
        content: "Generate 5 flashcards about photosynthesis.",
      },
    ],
    responseFormat,
    temperature: 0.7,
    maxTokens: 2000,
  });

  // Type-safe access
  response.content.flashcards.forEach((card) => {
    console.log(`Q: ${card.front}`);
    console.log(`A: ${card.back}`);
    console.log(`Difficulty: ${card.difficulty || "not set"}`);
  });
}

// Przykład 3: Obsługa błędów
async function example3() {
  try {
    const response = await openRouter.completion({
      messages: [
        {
          role: "user",
          content: "Hello!",
        },
      ],
      model: "openai/gpt-4-turbo-preview",
    });

    console.log(response.content);
    console.log(`Used ${response.usage.totalTokens} tokens`);
  } catch (error) {
    if (error instanceof OpenRouterAuthError) {
      console.error("Authentication failed. Check your API key.");
    } else if (error instanceof OpenRouterRateLimitError) {
      console.error(`Rate limited. Retry after ${error.retryAfter}s`);
    } else if (error instanceof OpenRouterValidationError) {
      console.error("Validation error:", error.details);
    } else {
      console.error("Unexpected error:", error);
    }
  }
}

// Przykład 4: Custom model i parametry
async function example4() {
  const response = await openRouter.completion({
    messages: [
      {
        role: "system",
        content: "You are a creative writer.",
      },
      {
        role: "user",
        content: "Write a short story about a robot.",
      },
    ],
    model: "anthropic/claude-3.5-sonnet",
    temperature: 0.9,
    maxTokens: 1000,
    topP: 0.95,
    frequencyPenalty: 0.5,
    presencePenalty: 0.5,
  });

  console.log(response.content);
}
```

### Krok 11: Testy (Opcjonalne, ale zalecane)

**Plik: `src/lib/services/openrouter/openrouter.service.test.ts`**

Struktura testów (szkielet):

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { OpenRouterService } from "./openrouter.service";
import { OpenRouterAuthError, OpenRouterValidationError } from "./openrouter.errors";

describe("OpenRouterService", () => {
  describe("constructor", () => {
    it("should throw error if API key is missing", () => {
      expect(() => {
        new OpenRouterService({ apiKey: "" });
      }).toThrow(OpenRouterAuthError);
    });

    it("should initialize with valid config", () => {
      const service = new OpenRouterService({
        apiKey: "test-key",
        defaultModel: "test-model",
      });

      expect(service.config.defaultModel).toBe("test-model");
    });
  });

  describe("validateParams", () => {
    it("should throw error if messages are empty", async () => {
      const service = new OpenRouterService({ apiKey: "test-key" });

      await expect(service.completion({ messages: [] })).rejects.toThrow(OpenRouterValidationError);
    });

    it("should throw error if temperature is out of range", async () => {
      const service = new OpenRouterService({ apiKey: "test-key" });

      await expect(
        service.completion({
          messages: [{ role: "user", content: "test" }],
          temperature: 3,
        })
      ).rejects.toThrow(OpenRouterValidationError);
    });
  });

  // Dodać więcej testów...
});
```

### Krok 12: Dokumentacja

**Plik: `src/lib/services/openrouter/README.md`**

```markdown
# OpenRouter Service

Usługa do komunikacji z API OpenRouter.

## Instalacja

Klucz API należy dodać do zmiennych środowiskowych:

\`\`\`env
OPENROUTER_API_KEY=sk-or-v1-xxxxx
\`\`\`

## Podstawowe Użycie

\`\`\`typescript
import { openRouter } from '@/lib/services/openrouter';

const response = await openRouter.completion({
messages: [
{ role: 'system', content: 'You are a helpful assistant.' },
{ role: 'user', content: 'What is TypeScript?' }
]
});

console.log(response.content);
\`\`\`

## Structured Output

\`\`\`typescript
interface MySchema {
items: string[];
}

const response = await openRouter.completion<MySchema>({
messages: [/* ... */],
responseFormat: {
type: 'json_schema',
json_schema: {
name: 'my_schema',
strict: true,
schema: {
type: 'object',
properties: {
items: {
type: 'array',
items: { type: 'string' }
}
},
required: ['items'],
additionalProperties: false
}
}
}
});

console.log(response.content.items); // Type-safe!
\`\`\`

## Obsługa Błędów

Zobacz pełną dokumentację w `examples.ts`.
```

### Krok 13: Integracja z Istniejącym Kodem

**Przykład użycia w API endpoint:**

**Plik: `src/pages/api/generation-requests/index.ts`**

```typescript
import { openRouter } from "@/lib/services/openrouter";
import type { ResponseFormat } from "@/lib/services/openrouter";

export async function POST({ request }: { request: Request }) {
  try {
    const { text, count } = await request.json();

    // Definiowanie schematu dla fiszek
    const responseFormat: ResponseFormat = {
      type: "json_schema",
      json_schema: {
        name: "flashcard_generation",
        strict: true,
        schema: {
          type: "object",
          properties: {
            flashcards: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  front: { type: "string" },
                  back: { type: "string" },
                },
                required: ["front", "back"],
                additionalProperties: false,
              },
            },
          },
          required: ["flashcards"],
          additionalProperties: false,
        },
      },
    };

    // Wywołanie OpenRouter
    const response = await openRouter.completion({
      messages: [
        {
          role: "system",
          content:
            "You are an expert at creating educational flashcards. Generate clear, concise flashcards based on the provided text.",
        },
        {
          role: "user",
          content: `Generate ${count} flashcards based on the following text:\n\n${text}`,
        },
      ],
      model: "openai/gpt-4-turbo-preview",
      responseFormat,
      temperature: 0.7,
      maxTokens: 2000,
    });

    return new Response(
      JSON.stringify({
        flashcards: response.content.flashcards,
        usage: response.usage,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // Obsługa błędów z OpenRouter
    if (error instanceof OpenRouterError) {
      return new Response(
        JSON.stringify({
          error: error.message,
          code: error.code,
        }),
        {
          status: error.statusCode || 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    throw error;
  }
}
```

### Krok 14: Checklist Wdrożenia

- [ ] Utworzono strukturę katalogów (`src/lib/services/openrouter/`)
- [ ] Zaimplementowano typy TypeScript (`openrouter.types.ts`)
- [ ] Zaimplementowano klasy błędów (`openrouter.errors.ts`)
- [ ] Zaimplementowano funkcje pomocnicze (`openrouter.utils.ts`)
- [ ] Zaimplementowano główną klasę usługi (`openrouter.service.ts`)
- [ ] Utworzono export index (`index.ts`)
- [ ] Utworzono instancję singleton (`openrouter.instance.ts`)
- [ ] Dodano klucz API do `.env`
- [ ] Zaktualizowano `.env.example`
- [ ] Przetestowano podstawowe użycie
- [ ] Przetestowano structured output
- [ ] Przetestowano obsługę błędów
- [ ] Dodano dokumentację
- [ ] Zintegrowano z istniejącymi endpointami
- [ ] (Opcjonalne) Dodano testy jednostkowe
- [ ] (Opcjonalne) Dodano monitoring i logging

### Krok 15: Następne Kroki i Ulepszenia

Po podstawowej implementacji, można rozważyć następujące ulepszenia:

1. **Streaming Support**: Dodanie obsługi streaming odpowiedzi dla długich generacji
2. **Caching**: Implementacja cache'owania dla identycznych zapytań
3. **Rate Limiting Client-Side**: Własne rate limiting aby nie przekraczać limitów
4. **Metrics**: Zbieranie metryk (czas odpowiedzi, koszty, błędy)
5. **Model Fallback**: Automatyczne przełączanie na inny model przy błędzie
6. **Prompt Templates**: System szablonów dla typowych promptów
7. **Token Counting**: Kalkulacja tokenów przed wysłaniem
8. **Response Validation**: Zaawansowana walidacja zgodności ze schematem
9. **Multi-turn Conversations**: Zarządzanie kontekstem konwersacji
10. **Cost Tracking**: Śledzenie kosztów API calls

---

## Podsumowanie

Ten plan implementacji dostarcza kompleksowy przewodnik do stworzenia profesjonalnej usługi OpenRouter w aplikacji 10xCards. Usługa oferuje:

- **Type Safety**: Pełne wsparcie TypeScript z generycznymi typami
- **Error Handling**: Szczegółowa klasyfikacja i obsługa błędów
- **Retry Logic**: Inteligentny retry z exponential backoff
- **Structured Output**: Pełna obsługa JSON Schema dla structured responses
- **Flexibility**: Konfigurowalne parametry modelu i generacji
- **Security**: Bezpieczne zarządzanie kluczem API
- **Maintainability**: Czytelny, modularny kod zgodny z best practices

Implementacja tej usługi pozwoli na efektywną komunikację z modelami LLM przez API OpenRouter, zapewniając niezawodność, bezpieczeństwo i łatwość utrzymania.
