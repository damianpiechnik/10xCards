# API Endpoint Implementation Plan: GET /api/profile

## 1. Przegląd punktu końcowego

Zwraca profil aktualnie zalogowanego użytkownika z tabeli `user_profiles`.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/api/profile`
- Parametry: brak
- Request Body: brak

## 3. Wykorzystywane typy

- `UserProfileDTO`

## 4. Szczegóły odpowiedzi

- 200 OK
  - Body: `UserProfileDTO`
- 401 Unauthorized
  - Body: `{ "error": "..." }`
- 500 Internal Server Error
  - Body: `{ "error": "..." }`

## 5. Przepływ danych

1. Handler w `src/pages/api/profile.ts` odczytuje `context.locals.supabase`.
2. Pobranie profilu po `auth.uid()` (RLS).
3. Zwrócenie profilu.

## 6. Względy bezpieczeństwa

- Wymagane uwierzytelnienie Bearer JWT.
- RLS ogranicza dostęp do własnych danych.

## 7. Obsługa błędów

- 401: brak tokenu.
- 500: błąd zapytania do DB.

## 8. Wydajność

- Proste zapytanie po PK.

## 9. Kroki implementacji

1. Utworzyć Server Endpoint w Astro w `src/pages/api/profile.ts` z `export const prerender = false` i użyciem `context.locals.supabase`.
2. Wykonać select z `user_profiles`.
3. Zwrócić 200 z `UserProfileDTO`.
