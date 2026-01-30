# API Endpoint Implementation Plan: GET /api/generation-requests/{id}

## 1. Przegląd punktu końcowego

Zwraca szczegóły pojedynczego żądania generacji.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/api/generation-requests/{id}`
- Parametry:
  - Wymagane: `id` (uuid w ścieżce)

## 3. Wykorzystywane typy

- `GenerationRequestDetailsResponseDTO`

## 4. Szczegóły odpowiedzi

- 200 OK
  - Body: `GenerationRequestDetailsResponseDTO`
- 401 Unauthorized
  - Body: `{ "error": "..." }`
- 404 Not Found
  - Body: `{ "error": "..." }`
- 500 Internal Server Error
  - Body: `{ "error": "..." }`

## 5. Przepływ danych

1. Handler w `src/pages/api/generation-requests/[id].ts`.
2. Walidacja `id` jako UUID.
3. Pobranie rekordu z `generation_requests`.
4. Zwrócenie obiektu.

## 6. Względy bezpieczeństwa

- Wymagane uwierzytelnienie JWT.
- RLS ogranicza dostęp do własnych danych.

## 7. Obsługa błędów

- 401: brak tokenu.
- 404: brak rekordu.
- 500: błąd zapytania do DB.

## 8. Wydajność

- Zapytanie po PK.

## 9. Kroki implementacji

1. Utworzyć Server Endpoint w Astro w `src/pages/api/generation-requests/[id].ts` z `export const prerender = false` i użyciem `context.locals.supabase`.
2. Zwalidować `id` (Zod).
3. Wykonać select i zwrócić 200 z `GenerationRequestDetailsResponseDTO`.
