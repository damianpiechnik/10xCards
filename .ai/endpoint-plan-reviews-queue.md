# API Endpoint Implementation Plan: GET /api/reviews/queue

## 1. Przegląd punktu końcowego

Zwraca kolejkę fiszek do powtórki (SRS) dla użytkownika.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/api/reviews/queue`
- Query:
  - `limit` (int, opcjonalne, domyślnie 20, max 100)

## 3. Wykorzystywane typy

- `ReviewQueueQuery`
- `ReviewQueueResponseDTO`

## 4. Szczegóły odpowiedzi

- 200 OK
  - Body: `ReviewQueueResponseDTO`
- 401 Unauthorized
  - Body: `{ "error": "..." }`
- 500 Internal Server Error
  - Body: `{ "error": "..." }`

## 5. Przepływ danych

1. Handler w `src/pages/api/reviews/queue.ts`.
2. Walidacja query przez Zod.
3. Zapytanie do `flashcards` z warunkiem `due_at <= now()` i `deleted_at IS NULL`.
4. Zwrócenie listy fiszek.

## 6. Względy bezpieczeństwa

- Wymagane uwierzytelnienie JWT.
- RLS ogranicza dostęp do własnych fiszek.

## 7. Obsługa błędów

- 401: brak tokenu.
- 500: błąd zapytania do DB.

## 8. Wydajność

- Indeks `(user_id, due_at)` wspiera kolejkę powtórek.

## 9. Kroki implementacji

1. Utworzyć Server Endpoint w Astro w `src/pages/api/reviews/queue.ts` z `export const prerender = false` i użyciem `context.locals.supabase`.
2. Zwalidować query (Zod).
3. Zwrócić 200 z `ReviewQueueResponseDTO`.
