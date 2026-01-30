# Plan implementacji widoku Logowanie (US-002)

## 1. Przegląd
Widok logowania umożliwia dostęp do konta przez email i hasło oraz przekierowanie do biblioteki po sukcesie. Wymaga obsługi błędnych danych logowania.

## 2. Routing widoku
`/auth/sign-in`

## 3. Struktura komponentów
- `SignInPage` (Astro)
  - `SignInForm` (React)
    - `EmailField`
    - `PasswordField`
    - `SubmitButton`
    - `FormErrorBanner`
    - `ResetPasswordLink`

## 4. Szczegóły komponentu
### `SignInForm`
- Opis komponentu: formularz logowania z walidacją i obsługą błędów 401.
- Główne elementy: `form`, pola, przycisk submit, banner błędu.
- Obsługiwane zdarzenia: `onChange`, `onBlur`, `onSubmit`.
- Warunki walidacji:
  - email wymagany, format email, trim, lowercase,
  - hasło wymagane, min 8, max 72 znaki,
  - blokada submit przy błędach lub wysyłce.
- Typy: `AuthSignInCommand`, `AuthResponseDTO`.
- Propsy: brak.

## 5. Typy
- `AuthSignInCommand`: `{ email: string; password: string }`
- `AuthResponseDTO`: `{ user, session }`
- ViewModel: `SignInFormState` analogiczny do rejestracji.

## 6. Zarządzanie stanem
Lokalny stan w `SignInForm`. Opcjonalny hook `useSignIn`.

## 7. Integracja API
`POST /auth/sign-in` z `AuthSignInCommand`, odpowiedź `200` z `AuthResponseDTO`.

## 8. Interakcje użytkownika
Wprowadzanie danych, logowanie, link do resetu hasła.

## 9. Warunki i walidacja
Walidacja jak po stronie API; blokada submit przy błędach.

## 10. Obsługa błędów
`401` → komunikat „Niepoprawne dane logowania”. `400/500` → komunikaty ogólne.

## 11. Kroki implementacji
1. Utwórz `src/pages/auth/sign-in.astro` i osadź `SignInForm`.
2. Zaimplementuj `SignInForm` i walidację.
3. Dodaj integrację `POST /auth/sign-in`.
4. Po sukcesie przekieruj do `/library`.
