# Plan implementacji widoku Rejestracja (US-001)

## 1. Przegląd

Widok rejestracji pozwala utworzyć konto przez email i hasło, a po sukcesie przekierowuje do pustej biblioteki fiszek. Musi wspierać walidację pól oraz czytelne komunikaty błędów.

## 2. Routing widoku

`/auth/sign-up`

## 3. Struktura komponentów

- `SignUpPage` (Astro)
  - `SignUpForm` (React)
    - `EmailField`
    - `PasswordField`
    - `SubmitButton`
    - `FormErrorBanner`
    - `HelperLinks`

## 4. Szczegóły komponentu

### `SignUpForm`

- Opis komponentu: formularz rejestracji z walidacją i wywołaniem API.
- Główne elementy: `form`, pola email/hasło, przycisk submit, banner błędu.
- Obsługiwane zdarzenia: `onChange`, `onBlur`, `onSubmit`.
- Warunki walidacji:
  - email wymagany, poprawny format, trim, lowercase,
  - hasło wymagane, min 8, max 72 znaki,
  - blokada submit przy błędach lub wysyłce.
- Typy: `AuthSignUpCommand`, `AuthResponseDTO`.
- Propsy: brak (samodzielny).

## 5. Typy

- `AuthSignUpCommand`: `{ email: string; password: string }`
- `AuthResponseDTO`: `{ user: AuthUserDTO; session: AuthSessionDTO }`
- ViewModel: `SignUpFormState` z polami `email`, `password`, `fieldErrors`, `formError`, `isSubmitting`, `isValid`.

## 6. Zarządzanie stanem

Lokalny stan w `SignUpForm`. Opcjonalny hook `useSignUp` do obsługi requestu i stanu loading/error.

## 7. Integracja API

`POST /api/auth/sign-up` z `AuthSignUpCommand`, odpowiedź `201` z `AuthResponseDTO`.

## 8. Interakcje użytkownika

Wprowadzanie danych, wysłanie formularza, obsługa błędu, przekierowanie do `/library` po sukcesie.

## 9. Warunki i walidacja

Walidacja jak w API: email format, hasło 8–72 znaki. UI blokuje submit przy błędach.

## 10. Obsługa błędów

`400/409/500` → komunikat z API; błąd sieci → komunikat ogólny. Bez utraty danych.

## 11. Kroki implementacji

1. Utwórz `src/pages/auth/sign-up.astro` i osadź `SignUpForm`.
2. Zaimplementuj `SignUpForm` i walidację.
3. Dodaj integrację `POST /auth/sign-up`.
4. Po sukcesie ustaw sesję i przekieruj do `/library`.
