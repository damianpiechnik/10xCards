# API Endpoint Implementation Plan: POST /api/generation-requests/{id}/retry

## 1. Przegląd punktu końcowego

Ponawia nieudane lub przekroczone czasowo żądanie generacji.

## 2. Szczegóły żądania

- Metoda HTTP: POST
- Struktura URL: `/api/generation-requests/{id}/retry`
- Parametry:
  - Wymagane: `id` (uuid w ścieżce)
- Request Body: brak

## 3. Wykorzystywane typy

- `GenerationRequestRetryResponseDTO`

## 4. Szczegóły odpowiedzi

- 202 Accepted
  - Body: `GenerationRequestRetryResponseDTO`
- 400 Bad Request
  - Body: `{ "error": "..." }`
- 401 Unauthorized
  - Body: `{ "error": "..." }`
- 404 Not Found
  - Body: `{ "error": "..." }`
- 409 Conflict
  - Body: `{ "error": "..." }`
- 500 Internal Server Error
  - Body: `{ "error": "..." }`

## 5. Przepływ danych

1. Handler w `src/pages/api/generation-requests/[id]/retry.ts`.
2. Walidacja `id`.
3. Sprawdzenie statusu rekordu (musi być `failed` lub `timeout`).
4. Aktualizacja statusu na `processing` i wyczyszczenie `error_message`.
5. Zwrócenie obiektu żądania.

## 6. Względy bezpieczeństwa

- Wymagane uwierzytelnienie JWT.
- RLS ogranicza dostęp do własnych danych.

## 7. Obsługa błędów

- 400: niewłaściwy status.
- 401: brak tokenu.
- 404: brak rekordu.
- 409: konflikt stanu (np. już `processing`).
- 500: błąd serwera.

## 8. Wydajność

- Update pojedynczego rekordu.

## 9. Kroki implementacji

1. Utworzyć Server Endpoint w Astro w `src/pages/api/generation-requests/[id]/retry.ts` z `export const prerender = false` i użyciem `context.locals.supabase`.
2. Zwalidować `id` i status.
3. Zaktualizować rekord i zwrócić 202 z `GenerationRequestRetryResponseDTO`.
