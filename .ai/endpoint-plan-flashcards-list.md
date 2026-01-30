# API Endpoint Implementation Plan: GET /api/flashcards

## 1. Przegląd punktu końcowego

Zwraca listę fiszek użytkownika z paginacją, sortowaniem i filtrowaniem.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/api/flashcards`
- Query:
  - `limit` (int, opcjonalne, domyślnie 20, max 100)
  - `cursor` (string, opcjonalne)
  - `sort` (string, opcjonalne, domyślnie `-updated_at`)
  - `type` (string, opcjonalne: `qa` | `front_back`)
  - `deleted` (boolean, opcjonalne; domyślnie false)

## 3. Wykorzystywane typy

- `FlashcardListQuery`
- `FlashcardListResponseDTO`
- `FlashcardSort`
- `FlashcardTypeFilter`
- `FlashcardDeletedFilter`

## 4. Szczegóły odpowiedzi

- 200 OK
  - Body: `FlashcardListResponseDTO`
- 401 Unauthorized
  - Body: `{ "error": "..." }`
- 500 Internal Server Error
  - Body: `{ "error": "..." }`

## 5. Przepływ danych

1. Handler w `src/pages/api/flashcards/index.ts` odczytuje query.
2. Walidacja query przez Zod.
3. Zapytanie do `flashcards` z filtrem po `user_id`.
4. Paginacja kursorowa i sortowanie po `updated_at`.
5. Zwrócenie `items` i `next_cursor`.

## 6. Względy bezpieczeństwa

- Wymagane uwierzytelnienie JWT.
- RLS ogranicza dostęp do własnych fiszek.

## 7. Obsługa błędów

- 401: brak tokenu.
- 500: błąd zapytania do DB.

## 8. Wydajność

- Indeks `(user_id, updated_at)` wspiera listę.

## 9. Kroki implementacji

1. W Server Endpoint `src/pages/api/flashcards/index.ts` dodać `GET` i użyć `context.locals.supabase`.
2. Zwalidować query (Zod).
3. Zwrócić 200 z `FlashcardListResponseDTO`.
