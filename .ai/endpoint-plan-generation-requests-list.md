# API Endpoint Implementation Plan: GET /api/generation-requests

## 1. Przegląd punktu końcowego

Zwraca listę żądań generacji dla zalogowanego użytkownika z paginacją i filtrowaniem.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/api/generation-requests`
- Query:
  - `status` (string, opcjonalne)
  - `limit` (int, opcjonalne, domyślnie 20, max 100)
  - `cursor` (string, opcjonalne)
  - `sort` (string, opcjonalne, domyślnie `-created_at`)

## 3. Wykorzystywane typy

- `GenerationRequestListQuery`
- `GenerationRequestListResponseDTO`
- `GenerationRequestStatusFilter`
- `GenerationRequestSort`

## 4. Szczegóły odpowiedzi

- 200 OK
  - Body: `GenerationRequestListResponseDTO`
- 401 Unauthorized
  - Body: `{ "error": "..." }`
- 500 Internal Server Error
  - Body: `{ "error": "..." }`

## 5. Przepływ danych

1. Handler w `src/pages/api/generation-requests/index.ts` odczytuje query.
2. Walidacja query przez Zod (limit, sort, status).
3. Zapytanie do `generation_requests` z filtrem po `user_id`.
4. Zastosowanie paginacji kursorowej.
5. Zwrócenie `items` i `next_cursor`.

## 6. Względy bezpieczeństwa

- Wymagane uwierzytelnienie JWT.
- RLS ogranicza dostęp do własnych danych.

## 7. Obsługa błędów

- 401: brak tokenu.
- 500: błąd zapytania do DB.

## 8. Wydajność

- Indeks `(user_id, created_at DESC)` wspiera listę.

## 9. Kroki implementacji

1. W Server Endpoint `src/pages/api/generation-requests/index.ts` dodać `GET` i użyć `context.locals.supabase`.
2. Walidować query Zod.
3. Zbudować zapytanie z sortowaniem i limitem.
4. Zwrócić 200 z `GenerationRequestListResponseDTO`.
