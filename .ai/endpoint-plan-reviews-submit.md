# API Endpoint Implementation Plan: POST /api/reviews/{id}

## 1. Przegląd punktu końcowego

Przyjmuje wynik powtórki i aktualizuje pola SRS fiszki.

## 2. Szczegóły żądania

- Metoda HTTP: POST
- Struktura URL: `/api/reviews/{id}`
- Parametry:
  - Wymagane: `id` (uuid w ścieżce)
- Request Body (JSON):
  - `grade` (integer, wymagane, 0..5)
  - `reviewed_at` (timestamptz, opcjonalne)

## 3. Wykorzystywane typy

- `ReviewSubmitCommand`
- `ReviewSubmitResponseDTO`

## 4. Szczegóły odpowiedzi

- 200 OK
  - Body: `ReviewSubmitResponseDTO`
- 400 Bad Request
  - Body: `{ "error": "..." }`
- 401 Unauthorized
  - Body: `{ "error": "..." }`
- 404 Not Found
  - Body: `{ "error": "..." }`
- 500 Internal Server Error
  - Body: `{ "error": "..." }`

## 5. Przepływ danych

1. Handler w `src/pages/api/reviews/[id].ts`.
2. Walidacja `id` i body przez Zod.
3. Wywołanie serwisu SRS (np. `src/lib/services/srs/updateSrs.ts`).
4. Update pól SRS w `flashcards`.
5. Zwrócenie zaktualizowanych pól SRS.

## 6. Względy bezpieczeństwa

- Wymagane uwierzytelnienie JWT.
- RLS ogranicza dostęp do własnych fiszek.

## 7. Obsługa błędów

- 400: walidacja `grade`.
- 401: brak tokenu.
- 404: brak fiszki.
- 500: błąd serwera.

## 8. Wydajność

- Update pojedynczego rekordu.

## 9. Kroki implementacji

1. Utworzyć Server Endpoint w Astro w `src/pages/api/reviews/[id].ts` z `export const prerender = false` i użyciem `context.locals.supabase`.
2. Zwalidować `id` i body (Zod).
3. Zaktualizować SRS i zwrócić 200 z `ReviewSubmitResponseDTO`.
