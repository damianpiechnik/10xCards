# API Endpoint Implementation Plan: POST /api/flashcards

## 1. Przegląd punktu końcowego

Tworzy ręcznie dodaną fiszkę dla zalogowanego użytkownika.

## 2. Szczegóły żądania

- Metoda HTTP: POST
- Struktura URL: `/api/flashcards`
- Parametry: brak
- Request Body (JSON):
  - `front` (string, wymagane, długość 2..2000)
  - `back` (string, wymagane, długość 2..2000)
  - `card_type` (string, wymagane: `qa` | `front_back`)

## 3. Wykorzystywane typy

- `FlashcardCreateCommand`
- `FlashcardCreateResponseDTO`

## 4. Szczegóły odpowiedzi

- 201 Created
  - Body: `FlashcardCreateResponseDTO`
- 400 Bad Request
  - Body: `{ "error": "..." }`
- 401 Unauthorized
  - Body: `{ "error": "..." }`
- 500 Internal Server Error
  - Body: `{ "error": "..." }`

## 5. Przepływ danych

1. Handler w `src/pages/api/flashcards/index.ts` odczytuje `context.locals.supabase`.
2. Walidacja JSON przez Zod.
3. Insert do `flashcards` z `is_manual=true`, `edited_by_ai=false`.
4. Zwrócenie pełnego obiektu fiszki.

## 6. Względy bezpieczeństwa

- Wymagane uwierzytelnienie JWT.
- RLS ogranicza dostęp do własnych fiszek.
- Nie przyjmować pól systemowych z body.

## 7. Obsługa błędów

- 400: walidacja.
- 401: brak tokenu.
- 500: błąd serwera.

## 8. Wydajność

- Insert pojedynczego rekordu.

## 9. Kroki implementacji

1. W Server Endpoint `src/pages/api/flashcards/index.ts` dodać `POST` i użyć `context.locals.supabase`.
2. Zwalidować body (Zod).
3. Wykonać insert i zwrócić 201 z `FlashcardCreateResponseDTO`.
