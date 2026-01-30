# API Endpoint Implementation Plan: DELETE /api/flashcards/{id}

## 1. Przegląd punktu końcowego

Wykonuje soft delete fiszki przez ustawienie `deleted_at`.

## 2. Szczegóły żądania

- Metoda HTTP: DELETE
- Struktura URL: `/api/flashcards/{id}`
- Parametry:
  - Wymagane: `id` (uuid w ścieżce)
- Request Body: brak

## 3. Wykorzystywane typy

- `FlashcardDeleteResponseDTO`

## 4. Szczegóły odpowiedzi

- 200 OK
  - Body: `{ "success": true }`
- 401 Unauthorized
  - Body: `{ "error": "..." }`
- 404 Not Found
  - Body: `{ "error": "..." }`
- 500 Internal Server Error
  - Body: `{ "error": "..." }`

## 5. Przepływ danych

1. Handler w `src/pages/api/flashcards/[id].ts`.
2. Walidacja `id`.
3. Update `deleted_at` na `now()`.
4. Zwrócenie `{ "success": true }`.

## 6. Względy bezpieczeństwa

- Wymagane uwierzytelnienie JWT.
- RLS ogranicza dostęp do własnych fiszek.

## 7. Obsługa błędów

- 401: brak tokenu.
- 404: brak rekordu.
- 500: błąd serwera.

## 8. Wydajność

- Update pojedynczego rekordu.

## 9. Kroki implementacji

1. W Server Endpoint `src/pages/api/flashcards/[id].ts` dodać `DELETE` i użyć `context.locals.supabase`.
2. Zaktualizować `deleted_at`.
3. Zwrócić 200 z `FlashcardDeleteResponseDTO`.
