# Plan implementacji akcji Wylogowanie (US-004)

## 1. Przegląd
Wylogowanie powinno byc dostepne z kazdego widoku i konczyc sesje, po czym uzytkownik jest przekierowany do logowania.

## 2. Routing widoku
Brak osobnego widoku. Akcja globalna w nawigacji.

## 3. Struktura komponentów
- `MainNav` (React)
  - `SignOutButton`

## 4. Szczegóły komponentu
### `SignOutButton`
- Opis komponentu: przycisk wylogowania.
- Główne elementy: `button`.
- Obsługiwane zdarzenia: `onClick`.
- Warunki walidacji: brak.
- Typy: `AuthSignOutCommand`, `SuccessResponseDTO`.
- Propsy: brak.

## 5. Typy
- `AuthSignOutCommand`: `{}`.
- `SuccessResponseDTO`: `{ success: true }`.

## 6. Zarządzanie stanem
Po sukcesie wyczysc stan sesji w kontekście globalnym.

## 7. Integracja API
`POST /auth/sign-out`, odpowiedz `200` z `{ success: true }`.

## 8. Interakcje użytkownika
Klikniecie „Wyloguj” → request, po sukcesie przekierowanie do `/auth/sign-in`.

## 9. Warunki i walidacja
Brak. Przycisk moze byc disabled podczas requestu.

## 10. Obsługa błędów
`401` lub `500` → komunikat i mozliwosc ponowienia.

## 11. Kroki implementacji
1. Dodaj `SignOutButton` w globalnej nawigacji.
2. Zaimplementuj wywolanie `POST /auth/sign-out`.
3. Wyczysc sesje i przekieruj do `/auth/sign-in`.
