# API Endpoint Implementation Plan: PATCH /api/flashcards/{id}

## 1. Przegląd punktu końcowego

Aktualizuje wybrane pola fiszki użytkownika.

## 2. Szczegóły żądania

- Metoda HTTP: PATCH
- Struktura URL: `/api/flashcards/{id}`
- Parametry:
  - Wymagane: `id` (uuid w ścieżce)
- Request Body (JSON):
  - `front` (string, opcjonalne, 2..2000)
  - `back` (string, opcjonalne, 2..2000)
  - `card_type` (string, opcjonalne: `qa` | `front_back`)
  - `edited_by_ai` (boolean, opcjonalne)

## 3. Wykorzystywane typy

- `FlashcardUpdateCommand`
- `FlashcardUpdateResponseDTO`

## 4. Szczegóły odpowiedzi

- 200 OK
  - Body: `FlashcardUpdateResponseDTO`
- 400 Bad Request
  - Body: `{ "error": "..." }`
- 401 Unauthorized
  - Body: `{ "error": "..." }`
- 404 Not Found
  - Body: `{ "error": "..." }`
- 500 Internal Server Error
  - Body: `{ "error": "..." }`

## 5. Przepływ danych

1. Handler w `src/pages/api/flashcards/[id].ts`.
2. Walidacja `id` i body przez Zod.
3. Update rekordu w `flashcards`.
4. Zwrócenie zaktualizowanego obiektu.

## 6. Względy bezpieczeństwa

- Wymagane uwierzytelnienie JWT.
- RLS ogranicza dostęp do własnych fiszek.

## 7. Obsługa błędów

- 400: walidacja.
- 401: brak tokenu.
- 404: brak rekordu.
- 500: błąd serwera.

## 8. Wydajność

- Update pojedynczego rekordu.

## 9. Kroki implementacji

1. W Server Endpoint `src/pages/api/flashcards/[id].ts` dodać `PATCH` i użyć `context.locals.supabase`.
2. Zwalidować `id` i body.
3. Zwrócić 200 z `FlashcardUpdateResponseDTO`.
