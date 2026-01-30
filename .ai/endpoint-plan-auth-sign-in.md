# API Endpoint Implementation Plan: POST /auth/sign-in

## 1. Przegląd punktu końcowego

Loguje użytkownika do Supabase Auth i zwraca obiekt użytkownika oraz sesję.

## 2. Szczegóły żądania

- Metoda HTTP: POST
- Struktura URL: `/auth/sign-in`
- Parametry:
  - Wymagane: brak (wszystko w body)
  - Opcjonalne: brak
- Request Body (JSON):
  - `email` (string, wymagane)
  - `password` (string, wymagane)

## 3. Wykorzystywane typy

- `AuthSignInCommand`
- `AuthResponseDTO`

## 4. Szczegóły odpowiedzi

- 200 OK
  - Body: `AuthResponseDTO`
- 400 Bad Request
  - Body: `{ "error": "..." }`
- 401 Unauthorized
  - Body: `{ "error": "..." }`
- 500 Internal Server Error
  - Body: `{ "error": "..." }`

## 5. Przepływ danych

1. Handler w `src/pages/api/auth/sign-in.ts` odczytuje `context.locals.supabase`.
2. Walidacja JSON przez Zod.
3. Wywołanie `supabase.auth.signInWithPassword`.
4. Zwrócenie `AuthResponseDTO`.

## 6. Względy bezpieczeństwa

- Nie logować hasła ani tokenów.
- Rate limiting po stronie Supabase.

## 7. Obsługa błędów

- 400: nieprawidłowe dane.
- 401: błędne dane logowania.
- 500: błąd serwera.

## 8. Wydajność

- Jedno wywołanie do Supabase Auth.

## 9. Kroki implementacji

1. Utworzyć Server Endpoint w Astro w `src/pages/api/auth/sign-in.ts` z `export const prerender = false` i użyciem `context.locals.supabase`.
2. Zdefiniować Zod schema dla `AuthSignInCommand`.
3. Wywołać `supabase.auth.signInWithPassword`.
4. Zwrócić 200 z `AuthResponseDTO`.
