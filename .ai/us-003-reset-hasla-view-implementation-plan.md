# Plan implementacji widoku Reset hasla (US-003)

## 1. Przegląd

Widok inicjacji resetu hasla pozwala wyslac link resetu na email. Komunikaty nie powinny potwierdzac istnienia konta.

## 2. Routing widoku

`/auth/reset-password`

## 3. Struktura komponentów

- `ResetPasswordPage` (Astro)
  - `ResetPasswordForm` (React)
    - `EmailField`
    - `SubmitButton`
    - `FormInfoBanner`
    - `FormErrorBanner`

## 4. Szczegóły komponentu

### `ResetPasswordForm`

- Opis komponentu: formularz podania emaila do resetu.
- Główne elementy: `form`, pole email, przycisk submit, banner info.
- Obsługiwane zdarzenia: `onChange`, `onBlur`, `onSubmit`.
- Warunki walidacji:
  - email wymagany, format email, trim, lowercase,
  - blokada submit przy błędach lub wysyłce.
- Typy: `AuthResetPasswordCommand`.
- Propsy: brak.

## 5. Typy

- `AuthResetPasswordCommand`: `{ email: string }`
- ViewModel: `ResetPasswordFormState` z `email`, `fieldErrors`, `formError`, `isSubmitting`, `isSubmitted`.

## 6. Zarządzanie stanem

Lokalny stan w `ResetPasswordForm`. Po sukcesie ustaw `isSubmitted` i pokaz neutralny komunikat.

## 7. Integracja API

`POST /auth/reset-password` z `AuthResetPasswordCommand`, odpowiedz `200` z `{ success: true }`.

## 8. Interakcje użytkownika

Podanie emaila, wyslanie formularza, wyswietlenie potwierdzenia.

## 9. Warunki i walidacja

Email wymagany i poprawny format. UI blokuje submit przy bledach.

## 10. Obsługa błędów

`400` → komunikat walidacyjny. `404` → neutralny komunikat (bez ujawniania). `500` → ogolny blad.

## 11. Kroki implementacji

1. Utworz `src/pages/auth/reset-password.astro` i osadz `ResetPasswordForm`.
2. Zaimplementuj walidacje emaila.
3. Dodaj integracje `POST /auth/reset-password`.
4. Po sukcesie pokaz neutralny komunikat o wyslaniu linku.
