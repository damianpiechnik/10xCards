# API Endpoint Implementation Plan: GET /api/flashcards/{id}

## 1. Przegląd punktu końcowego

Zwraca pojedynczą fiszkę po identyfikatorze.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/api/flashcards/{id}`
- Parametry:
  - Wymagane: `id` (uuid w ścieżce)

## 3. Wykorzystywane typy

- `FlashcardGetResponseDTO`

## 4. Szczegóły odpowiedzi

- 200 OK
  - Body: `FlashcardGetResponseDTO`
- 401 Unauthorized
  - Body: `{ "error": "..." }`
- 404 Not Found
  - Body: `{ "error": "..." }`
- 500 Internal Server Error
  - Body: `{ "error": "..." }`

## 5. Przepływ danych

1. Handler w `src/pages/api/flashcards/[id].ts`.
2. Walidacja `id`.
3. Pobranie rekordu z `flashcards`.
4. Zwrócenie obiektu.

## 6. Względy bezpieczeństwa

- Wymagane uwierzytelnienie JWT.
- RLS ogranicza dostęp do własnych fiszek.

## 7. Obsługa błędów

- 401: brak tokenu.
- 404: brak rekordu.
- 500: błąd zapytania do DB.

## 8. Wydajność

- Zapytanie po PK.

## 9. Kroki implementacji

1. Utworzyć Server Endpoint w Astro w `src/pages/api/flashcards/[id].ts` z `export const prerender = false` i użyciem `context.locals.supabase`.
2. Zwalidować `id` (Zod).
3. Zwrócić 200 z `FlashcardGetResponseDTO`.
