# OpenRouter Service

Serwis do komunikacji z API OpenRouter dla generowania fiszek za pomocą modeli LLM.

## Instalacja i Konfiguracja

### 1. Zmienne środowiskowe

Dodaj klucz API do pliku `.env`:

```env
OPENROUTER_API_KEY=sk-or-v1-xxxxx
```

### 2. Import serwisu

```typescript
import { openRouter } from '@/lib/services/openrouter';
```

Serwis jest dostępny jako singleton - jedna instancja dla całej aplikacji.

## Podstawowe Użycie

### Przykład 1: Proste zapytanie tekstowe

```typescript
const response = await openRouter.completion({
  messages: [
    {
      role: 'system',
      content: 'Jesteś pomocnym asystentem.'
    },
    {
      role: 'user',
      content: 'Czym jest fotosynteza?'
    }
  ]
});

console.log(response.content); // Odpowiedź jako string
console.log(response.usage.totalTokens); // Liczba użytych tokenów
```

### Przykład 2: Generowanie fiszek z Structured Output

```typescript
import type { ResponseFormat } from '@/lib/services/openrouter';

// Definicja schematu odpowiedzi
interface FlashcardResponse {
  flashcards: Array<{
    front: string;
    back: string;
  }>;
}

const responseFormat: ResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'flashcard_generation',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        flashcards: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              front: { type: 'string' },
              back: { type: 'string' }
            },
            required: ['front', 'back'],
            additionalProperties: false
          }
        }
      },
      required: ['flashcards'],
      additionalProperties: false
    }
  }
};

const response = await openRouter.completion<FlashcardResponse>({
  messages: [
    {
      role: 'system',
      content: 'Jesteś ekspertem w tworzeniu edukacyjnych fiszek. Generuj klarowne, zwięzłe fiszki na podstawie podanego tekstu.'
    },
    {
      role: 'user',
      content: `Wygeneruj 5 fiszek na podstawie następującego tekstu:\n\n${sourceText}`
    }
  ],
  model: 'openai/gpt-4-turbo-preview',
  responseFormat,
  temperature: 0.7,
  maxTokens: 2000
});

// Type-safe dostęp do danych
response.content.flashcards.forEach(card => {
  console.log(`Przód: ${card.front}`);
  console.log(`Tył: ${card.back}`);
});
```

### Przykład 3: Różne modele i parametry

```typescript
// Model Claude
const claudeResponse = await openRouter.completion({
  messages: [/* ... */],
  model: 'anthropic/claude-3.5-sonnet',
  temperature: 0.9,
  maxTokens: 1000,
  topP: 0.95,
  frequencyPenalty: 0.5,
  presencePenalty: 0.5
});

// Model GPT-4
const gptResponse = await openRouter.completion({
  messages: [/* ... */],
  model: 'openai/gpt-4-turbo-preview',
  temperature: 0.7
});
```

## Obsługa Błędów

Serwis używa dedykowanych klas błędów dla różnych scenariuszy:

```typescript
import {
  OpenRouterAuthError,
  OpenRouterRateLimitError,
  OpenRouterValidationError,
  OpenRouterParseError,
  OpenRouterTimeoutError,
  OpenRouterServerError,
  OpenRouterNetworkError
} from '@/lib/services/openrouter';

try {
  const response = await openRouter.completion({
    messages: [/* ... */]
  });
  
  console.log(response.content);
  
} catch (error) {
  if (error instanceof OpenRouterAuthError) {
    // Błąd autoryzacji - nieprawidłowy klucz API
    console.error('Błąd autoryzacji:', error.message);
    // Akcja: Sprawdź konfigurację klucza API
    
  } else if (error instanceof OpenRouterRateLimitError) {
    // Przekroczono limit zapytań
    const retryAfter = error.retryAfter || 60;
    console.error(`Rate limit. Spróbuj ponownie za ${retryAfter}s`);
    // Akcja: Poczekaj i spróbuj ponownie
    
  } else if (error instanceof OpenRouterValidationError) {
    // Błąd walidacji parametrów
    console.error('Błąd walidacji:', error.details);
    // Akcja: Popraw parametry zapytania
    
  } else if (error instanceof OpenRouterParseError) {
    // Błąd parsowania JSON (model nie obsługuje structured output)
    console.error('Błąd parsowania. Surowa odpowiedź:', error.rawContent);
    // Akcja: Użyj innego modelu lub usuń response_format
    
  } else if (error instanceof OpenRouterTimeoutError) {
    // Przekroczono timeout
    console.error('Timeout. Spróbuj zmniejszyć max_tokens');
    // Akcja: Zmniejsz maxTokens lub zwiększ timeout
    
  } else if (error instanceof OpenRouterServerError) {
    // Błąd serwera OpenRouter
    console.error('Błąd serwera. Spróbuj ponownie później');
    // Akcja: Poczekaj i spróbuj ponownie (automatyczny retry)
    
  } else if (error instanceof OpenRouterNetworkError) {
    // Błąd sieci
    console.error('Błąd sieci. Sprawdź połączenie internetowe');
    // Akcja: Sprawdź połączenie (automatyczny retry)
    
  } else {
    // Nieznany błąd
    console.error('Nieznany błąd:', error);
  }
}
```

## Zaawansowane Funkcje

### Retry Logic

Serwis automatycznie ponawia nieudane żądania dla:
- Rate limiting (429) - respektuje nagłówek `Retry-After`
- Błędy serwera (5xx) - exponential backoff
- Błędy sieci - exponential backoff
- Timeout - z większym timeoutem

Domyślnie: **3 próby** z exponential backoff (1s, 2s, 4s, ..., max 32s).

### Konfiguracja Serwisu

Możesz utworzyć własną instancję z custom konfiguracją:

```typescript
import { OpenRouterService } from '@/lib/services/openrouter';

const customService = new OpenRouterService({
  apiKey: process.env.OPENROUTER_API_KEY!,
  defaultModel: 'anthropic/claude-3.5-sonnet',
  defaultTemperature: 0.8,
  defaultMaxTokens: 3000,
  timeout: 90000,  // 90 sekund
  maxRetries: 5    // 5 prób
});
```

## Dostępne Modele

Popularne modele obsługujące structured output (JSON Schema):

### OpenAI
- `openai/gpt-4-turbo-preview` - Najlepszy dla structured output
- `openai/gpt-4` - Stabilny, sprawdzony
- `openai/gpt-3.5-turbo` - Szybki, tańszy

### Anthropic
- `anthropic/claude-3.5-sonnet` - Bardzo dobry, długi kontekst
- `anthropic/claude-3-opus` - Najlepszy Claude
- `anthropic/claude-3-haiku` - Szybki, tani

### Google
- `google/gemini-pro-1.5` - Długi kontekst (2M tokenów)

## Parametry Generacji

| Parametr | Typ | Zakres | Domyślna | Opis |
|----------|-----|--------|----------|------|
| `temperature` | number | 0.0 - 2.0 | 0.7 | Kreatywność (wyższe = bardziej losowe) |
| `maxTokens` | number | 1 - ∞ | 2000 | Maksymalna długość odpowiedzi |
| `topP` | number | 0.0 - 1.0 | - | Nucleus sampling |
| `frequencyPenalty` | number | -2.0 - 2.0 | - | Kara za powtarzanie tokenów |
| `presencePenalty` | number | -2.0 - 2.0 | - | Kara za pojawianie się tokenów |
| `stop` | string[] | - | - | Sekwencje stop |

## Metryki i Koszty

Po każdym zapytaniu dostępne są metryki użycia:

```typescript
const response = await openRouter.completion({/* ... */});

console.log('Tokeny w prompcie:', response.usage.promptTokens);
console.log('Tokeny w odpowiedzi:', response.usage.completionTokens);
console.log('Suma tokenów:', response.usage.totalTokens);
console.log('Model:', response.model);
console.log('Czas:', new Date(response.created * 1000));
```

## Best Practices

### 1. System Prompt
Zawsze używaj system message dla kontekstu:

```typescript
messages: [
  {
    role: 'system',
    content: 'Jesteś ekspertem w tworzeniu fiszek. Generuj krótkie, precyzyjne pytania i odpowiedzi.'
  },
  {
    role: 'user',
    content: userInput
  }
]
```

### 2. Structured Output
Dla przewidywalnych formatów używaj `response_format`:

```typescript
// ✅ Dobrze - structured output
responseFormat: {
  type: 'json_schema',
  json_schema: {
    name: 'flashcards',
    strict: true,
    schema: { /* ... */ }
  }
}

// ❌ Źle - parsowanie tekstu
"Zwróć listę fiszek w formacie JSON"
```

### 3. Walidacja Input
Zawsze waliduj dane użytkownika przed wysłaniem:

```typescript
if (!sourceText || sourceText.trim().length === 0) {
  throw new Error('Tekst źródłowy jest wymagany');
}

if (sourceText.length > 10000) {
  throw new Error('Tekst jest zbyt długi');
}
```

### 4. Obsługa Błędów
Zawsze obsługuj wszystkie typy błędów:

```typescript
try {
  return await openRouter.completion({/* ... */});
} catch (error) {
  // Loguj błąd
  console.error('OpenRouter error:', error);
  
  // Zwróć user-friendly message
  if (error instanceof OpenRouterRateLimitError) {
    return { error: 'Zbyt wiele zapytań. Spróbuj za chwilę.' };
  }
  
  return { error: 'Nie udało się wygenerować fiszek.' };
}
```

## Troubleshooting

### "API key is required"
- Sprawdź czy `.env` zawiera `OPENROUTER_API_KEY`
- Sprawdź czy klucz jest poprawny (zaczyna się od `sk-or-v1-`)

### "Rate limit exceeded"
- Poczekaj czas wskazany w `retryAfter`
- Rozważ użycie cache'owania dla identycznych zapytań

### "Failed to parse JSON response"
- Model może nie obsługiwać structured output - użyj GPT-4 lub Claude
- Sprawdź czy schemat JSON jest poprawny

### "Request timeout"
- Zmniejsz `maxTokens`
- Zwiększ `timeout` w konfiguracji
- Użyj szybszego modelu (np. GPT-3.5 zamiast GPT-4)

## Więcej Informacji

- [OpenRouter Documentation](https://openrouter.ai/docs)
- [Supported Models](https://openrouter.ai/models)
- [Pricing](https://openrouter.ai/models)
