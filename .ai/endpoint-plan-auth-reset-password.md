# API Endpoint Implementation Plan: POST /auth/reset-password

## 1. Przegląd punktu końcowego

Inicjuje reset hasła przez email w Supabase Auth.

## 2. Szczegóły żądania

- Metoda HTTP: POST
- Struktura URL: `/auth/reset-password`
- Parametry:
  - Wymagane: brak
  - Opcjonalne: brak
- Request Body (JSON):
  - `email` (string, wymagane)

## 3. Wykorzystywane typy

- `AuthResetPasswordCommand`
- `SuccessResponseDTO`

## 4. Szczegóły odpowiedzi

- 200 OK
  - Body: `{ "success": true }`
- 400 Bad Request
  - Body: `{ "error": "..." }`
- 404 Not Found
  - Body: `{ "error": "..." }`
- 500 Internal Server Error
  - Body: `{ "error": "..." }`

## 5. Przepływ danych

1. Handler w `src/pages/api/auth/reset-password.ts` odczytuje `context.locals.supabase`.
2. Walidacja JSON przez Zod (format email).
3. Wywołanie `supabase.auth.resetPasswordForEmail`.
4. Zwrócenie `{ "success": true }`.

## 6. Względy bezpieczeństwa

- Nie ujawniać, czy email istnieje (rozważyć ujednolicony komunikat).

## 7. Obsługa błędów

- 400: niepoprawny email.
- 404: brak użytkownika (jeśli tak zwraca Supabase).
- 500: błąd serwera.

## 8. Wydajność

- Jedno wywołanie do Supabase Auth.

## 9. Kroki implementacji

1. Utworzyć Server Endpoint w Astro w `src/pages/api/auth/reset-password.ts` z `export const prerender = false` i użyciem `context.locals.supabase`.
2. Zdefiniować Zod schema dla `AuthResetPasswordCommand`.
3. Wywołać `supabase.auth.resetPasswordForEmail`.
4. Zwrócić 200 z `{ "success": true }`.
