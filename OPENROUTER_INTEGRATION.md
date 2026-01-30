# Integracja OpenRouter - Generowanie Fiszek z AI

Kompletna dokumentacja integracji serwisu OpenRouter do generowania fiszek za pomocą modeli LLM.

## 📋 Spis treści

- [Przegląd](#przegląd)
- [Architektura](#architektura)
- [Konfiguracja](#konfiguracja)
- [Użycie](#użycie)
- [API Endpoints](#api-endpoints)
- [Obsługa błędów](#obsługa-błędów)
- [Testing](#testing)

## 🎯 Przegląd

Serwis OpenRouter został zintegrowany z aplikacją 10xCards w celu automatycznego generowania wysokiej jakości fiszek edukacyjnych za pomocą modeli AI (GPT-4, Claude, itp.).

### Główne funkcjonalności

✅ **Generowanie fiszek z AI** - automatyczne tworzenie pytań i odpowiedzi  
✅ **Structured Output** - typowane odpowiedzi z JSON Schema  
✅ **Wielojęzyczność** - wsparcie dla PL i EN  
✅ **Retry Logic** - automatyczne ponowne próby przy błędach  
✅ **Fallback** - powrót do prostego generowania przy problemach z AI  
✅ **Walidacja** - sprawdzanie poprawności wygenerowanych fiszek  
✅ **Bezpieczeństwo** - limity długości i liczby fiszek  

## 🏗️ Architektura

### Struktura plików

```
src/lib/services/openrouter/
├── openrouter.service.ts          # Główna klasa serwisu OpenRouter
├── openrouter.types.ts             # Interfejsy i typy TypeScript
├── openrouter.errors.ts            # Dedykowane klasy błędów
├── openrouter.utils.ts             # Funkcje pomocnicze
├── openrouter.instance.ts          # Singleton instance
├── index.ts                        # Eksporty publiczne
└── README.md                       # Dokumentacja serwisu

src/lib/services/generation/
├── completeGenerationRequest.ts    # Integracja z API endpoint
└── generateFlashcardsWithAI.ts     # Serwis generowania z AI
```

### Przepływ danych

```
┌─────────────────┐
│   API Request   │
│ POST /api/      │
│ generation-     │
│ requests        │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────┐
│ completeGenerationRequest()     │
│ - Tworzy rekord w DB            │
│ - Wywołuje AI generation        │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│ generateFlashcardsWithAI()      │
│ - Waliduje input                │
│ - Tworzy prompty (PL/EN)        │
│ - Wywołuje OpenRouter API       │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│ OpenRouterService.completion()  │
│ - Builduje request              │
│ - Wykonuje HTTP call            │
│ - Parsuje JSON response         │
│ - Retry logic                   │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│ OpenRouter API                  │
│ - GPT-4 / Claude / Gemini       │
│ - Structured output             │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│ Response Processing             │
│ - Walidacja fiszek              │
│ - Normalizacja tekstów          │
│ - Zapis do DB                   │
└─────────────────────────────────┘
```

## ⚙️ Konfiguracja

### 1. Zmienne środowiskowe

Dodaj do pliku `.env`:

```env
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Klucz API można uzyskać na: https://openrouter.ai/keys

### 2. Domyślna konfiguracja serwisu

```typescript
// src/lib/services/openrouter/openrouter.instance.ts
export const openRouter = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  defaultModel: 'openai/gpt-4-turbo-preview',
  defaultTemperature: 0.7,
  defaultMaxTokens: 2000,
  timeout: 60000,      // 60 sekund
  maxRetries: 3        // 3 próby retry
});
```

### 3. Limity bezpieczeństwa

```typescript
// generateFlashcardsWithAI.ts
MAX_FLASHCARDS_PER_REQUEST = 50
MAX_SOURCE_TEXT_LENGTH = 10000
MAX_FLASHCARD_FIELD_LENGTH = 2000
```

## 💻 Użycie

### Podstawowe użycie w kodzie

```typescript
import { generateFlashcardsWithAI } from '@/lib/services/generation/generateFlashcardsWithAI';

try {
  const flashcards = await generateFlashcardsWithAI({
    sourceText: 'Fotosynteza to proces...',
    requestedCount: 5,
    language: 'PL',
    model: 'openai/gpt-4-turbo-preview' // opcjonalne
  });

  // flashcards: GeneratedFlashcard[]
  flashcards.forEach(card => {
    console.log(`Q: ${card.front}`);
    console.log(`A: ${card.back}`);
  });

} catch (error) {
  if (error instanceof FlashcardGenerationError) {
    console.error(`Błąd: ${error.message} (${error.code})`);
  }
}
```

### Integracja w endpoint

```typescript
// src/pages/api/generation-requests/index.ts
import { completeGenerationRequest } from '@/lib/services/generation/completeGenerationRequest';

export const POST: APIRoute = async (context) => {
  // ... walidacja i auth ...

  const dto = await completeGenerationRequest(context.locals.supabase, {
    requestId: data.id,
    userId: user.id,
    command: {
      source_text: 'Tekst źródłowy...',
      requested_count: 5,
      language: 'PL',
      model: null
    }
  });

  return jsonResponse(202, dto);
};
```

Serwis automatycznie:
1. ✅ Próbuje wygenerować fiszki z AI
2. ✅ W przypadku błędu używa fallback (proste generowanie)
3. ✅ Loguje sukces/błąd do konsoli
4. ✅ Zapisuje fiszki do bazy danych

## 🌐 API Endpoints

### POST /api/generation-requests

Tworzy nowe żądanie generacji fiszek.

**Request:**
```json
{
  "source_text": "Fotosynteza to proces biochemiczny...",
  "requested_count": 5,
  "language": "PL",
  "model": "openai/gpt-4-turbo-preview"
}
```

**Response (202 Accepted):**
```json
{
  "id": "uuid",
  "status": "succeeded",
  "created_at": "2024-01-29T10:00:00Z"
}
```

**Walidacja:**
- `source_text`: 1-1000 znaków (wymagane)
- `requested_count`: liczba całkowita > 0 (wymagane)
- `language`: "PL" lub "EN" (wymagane)
- `model`: string (opcjonalne)

### GET /api/generation-requests

Lista żądań generacji.

**Query params:**
- `status` - filtr statusu: pending, processing, succeeded, failed, timeout
- `limit` - liczba wyników (1-100, domyślnie 20)
- `cursor` - token paginacji
- `sort` - sortowanie: created_at, -created_at

## 🚨 Obsługa błędów

### Hierarchia błędów

```typescript
OpenRouterError (bazowy)
├── OpenRouterAuthError (401)
├── OpenRouterRateLimitError (429)
├── OpenRouterValidationError (400)
├── OpenRouterParseError
├── OpenRouterTimeoutError
├── OpenRouterServerError (5xx)
└── OpenRouterNetworkError

FlashcardGenerationError (wysokopoziomowy)
├── MISSING_SOURCE_TEXT
├── INVALID_COUNT
├── COUNT_TOO_HIGH
├── SOURCE_TEXT_TOO_LONG
├── INVALID_RESPONSE_FORMAT
├── NO_FLASHCARDS_GENERATED
├── MISSING_FRONT / MISSING_BACK
├── FRONT_TOO_LONG / BACK_TOO_LONG
└── AUTH_ERROR / RATE_LIMIT_ERROR / etc.
```

### Przykład obsługi błędów

```typescript
try {
  const flashcards = await generateFlashcardsWithAI(input);
  // Sukces
} catch (error) {
  if (error instanceof FlashcardGenerationError) {
    switch (error.code) {
      case 'AUTH_ERROR':
        // Problem z kluczem API
        return { error: 'Błąd konfiguracji serwisu' };
      
      case 'RATE_LIMIT_ERROR':
        // Zbyt wiele zapytań
        return { error: 'Zbyt wiele żądań. Spróbuj za chwilę.' };
      
      case 'SOURCE_TEXT_TOO_LONG':
        // Tekst za długi
        return { error: 'Tekst jest zbyt długi' };
      
      default:
        // Inne błędy
        return { error: 'Nie udało się wygenerować fiszek' };
    }
  }
}
```

### Strategia Fallback

Gdy generowanie z AI zawiedzie, system automatycznie używa prostego algorytmu:

```typescript
// Fallback: proste dzielenie tekstu na fiszki
const buildFlashcardsPayload = (command) => {
  // Dzieli tekst na chunki
  // Tworzy proste pytania w formacie "Pytanie X: [chunk]"
  // Zwraca podstawowe fiszki
};
```

## 🧪 Testing

### Testowanie ręczne

1. **Uruchom lokalny serwer:**
   ```bash
   npm run dev
   ```

2. **Wyślij request do API:**
   ```bash
   curl -X POST http://localhost:4321/api/generation-requests \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "source_text": "Fotosynteza to proces...",
       "requested_count": 3,
       "language": "PL"
     }'
   ```

3. **Sprawdź logi w konsoli:**
   - Sukces: `Pomyślnie wygenerowano X fiszek z AI`
   - Fallback: `Błąd generowania fiszek z AI... Używam fallback`
   - Tokeny: `Użyto X tokenów (prompt: Y, completion: Z)`

### Testowanie błędów

**Rate limiting:**
```typescript
// Symulacja wielu szybkich requestów
for (let i = 0; i < 10; i++) {
  await generateFlashcardsWithAI({ /* ... */ });
}
// Powinno pokazać retry logic w logach
```

**Nieprawidłowy klucz API:**
```typescript
// Ustaw zły klucz w .env
OPENROUTER_API_KEY=invalid-key
// Powinno użyć fallback
```

**Timeout:**
```typescript
// Zmniejsz timeout
const service = new OpenRouterService({
  /* ... */
  timeout: 100 // 100ms - zbyt krótki
});
// Powinno pokazać retry i eventual fallback
```

## 📊 Monitoring i Logi

### Co jest logowane

✅ **Sukces generowania:**
```
Pomyślnie wygenerowano 5 fiszek z AI dla requestId: abc-123
Użyto 842 tokenów (prompt: 156, completion: 686). Model: openai/gpt-4-turbo-preview
```

✅ **Fallback:**
```
Błąd generowania fiszek z AI dla requestId: abc-123. Używam fallback. (RATE_LIMIT_ERROR)
```

✅ **Retry attempts:**
```
OpenRouter request failed (attempt 1/4). Retrying in 1000ms... { error: 'Rate limit exceeded' }
```

⚠️ **Ostrzeżenia:**
```
AI wygenerowało 4 fiszek, a żądano 5. Używam wygenerowanych fiszek.
```

### Metryki do monitorowania

1. **Sukces rate** - % requestów zakończonych sukcesem z AI
2. **Fallback rate** - % requestów używających fallback
3. **Średnia liczba tokenów** - koszt operacji
4. **Średni czas odpowiedzi** - performance
5. **Błędy rate limiting** - czy potrzeba więcej limitów

## 🔒 Bezpieczeństwo

### Best Practices

✅ **Klucz API:**
- Przechowywany w `.env` (nigdy w kodzie)
- Nie logowany w błędach
- Nie eksponowany przez API

✅ **Walidacja input:**
- Maksymalna długość tekstu: 10000 znaków
- Maksymalna liczba fiszek: 50
- Walidacja języka: tylko PL/EN

✅ **Rate limiting:**
- Automatyczny retry z exponential backoff
- Respektowanie nagłówka Retry-After
- Maksymalnie 3 próby

✅ **Timeout:**
- 60 sekund na request
- Abort controller dla anulowania
- Graceful degradation do fallback

## 📚 Dodatkowe zasoby

- [OpenRouter Service README](src/lib/services/openrouter/README.md) - szczegółowa dokumentacja serwisu
- [OpenRouter API Docs](https://openrouter.ai/docs) - dokumentacja API
- [Supported Models](https://openrouter.ai/models) - lista dostępnych modeli
- [Pricing Calculator](https://openrouter.ai/models) - kalkulator kosztów

## 🎯 Następne kroki

Możliwe ulepszenia w przyszłości:

1. **Caching** - cache dla identycznych zapytań
2. **Streaming** - streamowanie długich odpowiedzi
3. **Model selection** - automatyczny wybór modelu na podstawie języka/długości
4. **Quality scoring** - ocena jakości wygenerowanych fiszek
5. **A/B testing** - porównywanie różnych modeli
6. **User feedback** - zbieranie feedbacku o jakości fiszek
7. **Batch processing** - generowanie wielu setów fiszek naraz
8. **Custom prompts** - możliwość dostosowania promptów przez użytkownika

## 🐛 Troubleshooting

### Problem: "API key is required"

**Przyczyna:** Brak lub pusty klucz API w `.env`

**Rozwiązanie:**
1. Sprawdź czy plik `.env` zawiera `OPENROUTER_API_KEY`
2. Sprawdź czy klucz zaczyna się od `sk-or-v1-`
3. Zrestartuj serwer dev po zmianie `.env`

### Problem: "Rate limit exceeded"

**Przyczyna:** Przekroczono limity OpenRouter

**Rozwiązanie:**
1. Poczekaj czas wskazany w komunikacie
2. Rozważ zwiększenie limitów w OpenRouter
3. Zaimplementuj client-side rate limiting
4. Użyj cache'owania

### Problem: Fiszki niskiej jakości

**Przyczyna:** Zbyt krótki lub nieklarowny tekst źródłowy

**Rozwiązanie:**
1. Waliduj długość tekstu (min. 50 znaków)
2. Dodaj instrukcje dla użytkownika
3. Rozważ użycie innego modelu (Claude vs GPT-4)
4. Dostosuj temperature (wyższe = bardziej kreatywne)

### Problem: Timeout errors

**Przyczyna:** Zbyt długie generowanie

**Rozwiązanie:**
1. Zmniejsz `maxTokens`
2. Zwiększ `timeout` w konfiguracji
3. Użyj szybszego modelu (GPT-3.5 zamiast GPT-4)
4. Podziel długie teksty na mniejsze części

---

**Status:** ✅ Implementacja zakończona i gotowa do użycia  
**Data:** 2024-01-29  
**Autor:** AI Implementation Team
