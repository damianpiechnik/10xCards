# API Endpoint Implementation Plan: POST /auth/sign-up

## 1. Przegląd punktu końcowego

Rejestruje użytkownika w Supabase Auth i zwraca obiekt użytkownika oraz sesję.

## 2. Szczegóły żądania

- Metoda HTTP: POST
- Struktura URL: `/auth/sign-up`
- Parametry:
  - Wymagane: brak (wszystko w body)
  - Opcjonalne: brak
- Request Body (JSON):
  - `email` (string, wymagane)
  - `password` (string, wymagane)

## 3. Wykorzystywane typy

- `AuthSignUpCommand`
- `AuthResponseDTO`

## 4. Szczegóły odpowiedzi

- 201 Created
  - Body: `AuthResponseDTO`
- 400 Bad Request
  - Body: `{ "error": "..." }`
- 409 Conflict
  - Body: `{ "error": "..." }`
- 500 Internal Server Error
  - Body: `{ "error": "..." }`

## 5. Przepływ danych

1. Handler w `src/pages/api/auth/sign-up.ts` odczytuje `context.locals.supabase`.
2. Walidacja JSON przez Zod (format email, minimalne wymagania hasła).
3. Wywołanie `supabase.auth.signUp`.
4. Zbudowanie `AuthResponseDTO` na bazie zwróconych danych.

## 6. Względy bezpieczeństwa

- Walidacja i normalizacja email.
- Nie logować hasła ani pełnego tokenu.
- Rate limiting po stronie Supabase.

## 7. Obsługa błędów

- 400: walidacja wejścia lub błąd Supabase.
- 409: email już istnieje.
- 500: nieoczekiwany błąd serwera.

## 8. Wydajność

- Jedno wywołanie do Supabase Auth.

## 9. Kroki implementacji

1. Utworzyć Server Endpoint w Astro w `src/pages/api/auth/sign-up.ts` z `export const prerender = false` i użyciem `context.locals.supabase`.
2. Zdefiniować Zod schema dla `AuthSignUpCommand`.
3. Wywołać `supabase.auth.signUp`.
4. Zwrócić 201 z `AuthResponseDTO`.
