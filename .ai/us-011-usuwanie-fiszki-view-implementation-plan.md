# Plan implementacji usuwania fiszki (US-011)

## 1. Przegląd

Uzytkownik moze usunac fiszke z biblioteki, a usunieta fiszka znika z listy i harmonogramu powtorek.

## 2. Routing widoku

`/library` (w ramach listy)

## 3. Struktura komponentów

- `FlashcardRow`
  - `DeleteButton`
  - `ConfirmDialog`

## 4. Szczegóły komponentu

### `DeleteButton`

- Opis komponentu: inicjuje usuniecie fiszki z potwierdzeniem.
- Główne elementy: `button`, modal potwierdzenia.
- Obsługiwane zdarzenia: `onClick`, `onConfirm`, `onCancel`.
- Warunki walidacji: brak.
- Typy: `FlashcardDeleteResponseDTO`.
- Propsy: `flashcardId`, `onDeleted`.

## 5. Typy

- `FlashcardDeleteResponseDTO`: `{ success: true }`

## 6. Zarządzanie stanem

Lokalny stan `isDeleting` i `isConfirmOpen`.

## 7. Integracja API

`DELETE /api/flashcards/{id}`.

## 8. Interakcje użytkownika

Klikniecie „Usuń”, potwierdzenie w dialogu, usuniecie z listy.

## 9. Warunki i walidacja

Brak. Przycisk blokowany podczas requestu.

## 10. Obsługa błędów

`401/500` → komunikat i pozostawienie fiszki na liscie.

## 11. Kroki implementacji

1. Dodaj `DeleteButton` z potwierdzeniem w `FlashcardRow`.
2. Zaimplementuj `DELETE /api/flashcards/{id}`.
3. Po sukcesie usun element z listy.
