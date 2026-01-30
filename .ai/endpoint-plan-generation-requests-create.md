# API Endpoint Implementation Plan: POST /api/generation-requests

## 1. Przegląd punktu końcowego

Tworzy nowe żądanie generacji AI i zwraca jego identyfikator oraz status.

## 2. Szczegóły żądania

- Metoda HTTP: POST
- Struktura URL: `/api/generation-requests`
- Parametry: brak
- Request Body (JSON):
  - `source_text` (string, wymagane, 1..1000)
  - `requested_count` (integer, wymagane, >0)
  - `language` (string, wymagane: `PL` | `EN`)
  - `model` (string, opcjonalne)

## 3. Wykorzystywane typy

- `GenerationRequestCreateCommand`
- `GenerationRequestCreateResponseDTO`
- `GenerationRequestLanguage`

## 4. Szczegóły odpowiedzi

- 202 Accepted
  - Body: `GenerationRequestCreateResponseDTO`
- 400 Bad Request
  - Body: `{ "error": "..." }`
- 401 Unauthorized
  - Body: `{ "error": "..." }`
- 429 Too Many Requests
  - Body: `{ "error": "..." }`
- 503 Service Unavailable
  - Body: `{ "error": "..." }`
- 500 Internal Server Error
  - Body: `{ "error": "..." }`

## 5. Przepływ danych

1. Handler w `src/pages/api/generation-requests/index.ts` odczytuje `context.locals.supabase`.
2. Walidacja JSON przez Zod (długość `source_text`, zakres `requested_count`, enum języka).
3. Insert do `generation_requests` z `status=pending`.
4. Zwrócenie `id`, `status`, `created_at`.
5. Asynchroniczny proces generacji (poza tym endpointem).

## 6. Względy bezpieczeństwa

- Wymagane uwierzytelnienie JWT.
- Rate limiting per użytkownik.
- Ograniczenie długości wejścia.

## 7. Obsługa błędów

- 400: walidacja.
- 401: brak tokenu.
- 429: przekroczony limit.
- 503: zewnętrzny model niedostępny.
- 500: błąd serwera.

## 8. Wydajność

- Insert pojedynczego rekordu.

## 9. Kroki implementacji

1. Utworzyć Server Endpoint w Astro w `src/pages/api/generation-requests/index.ts` z `export const prerender = false`, `POST` i użyciem `context.locals.supabase`.
2. Zdefiniować Zod schema dla `GenerationRequestCreateCommand`.
3. Wykonać insert do `generation_requests`.
4. Zwrócić 202 z `GenerationRequestCreateResponseDTO`.
