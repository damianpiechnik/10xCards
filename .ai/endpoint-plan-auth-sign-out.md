# API Endpoint Implementation Plan: POST /auth/sign-out

## 1. Przegląd punktu końcowego

Wylogowuje użytkownika z Supabase Auth.

## 2. Szczegóły żądania

- Metoda HTTP: POST
- Struktura URL: `/auth/sign-out`
- Parametry:
  - Wymagane: brak
  - Opcjonalne: brak
- Request Body: brak

## 3. Wykorzystywane typy

- `AuthSignOutCommand`
- `SuccessResponseDTO`

## 4. Szczegóły odpowiedzi

- 200 OK
  - Body: `{ "success": true }`
- 401 Unauthorized
  - Body: `{ "error": "..." }`
- 500 Internal Server Error
  - Body: `{ "error": "..." }`

## 5. Przepływ danych

1. Handler w `src/pages/api/auth/sign-out.ts` odczytuje `context.locals.supabase`.
2. Wywołanie `supabase.auth.signOut`.
3. Zwrócenie `{ "success": true }`.

## 6. Względy bezpieczeństwa

- Wymagany ważny token sesji.

## 7. Obsługa błędów

- 401: brak lub nieważny token.
- 500: błąd serwera.

## 8. Wydajność

- Jedno wywołanie do Supabase Auth.

## 9. Kroki implementacji

1. Utworzyć Server Endpoint w Astro w `src/pages/api/auth/sign-out.ts` z `export const prerender = false` i użyciem `context.locals.supabase`.
2. Wywołać `supabase.auth.signOut`.
3. Zwrócić 200 z `{ "success": true }`.
