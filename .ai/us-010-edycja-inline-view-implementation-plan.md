# Plan implementacji edycji inline fiszki (US-010)

## 1. Przegląd

Umozliwia edycje tresci fiszki bez przechodzenia na osobny ekran. Tylko jedna fiszka moze byc edytowana naraz.

## 2. Routing widoku

`/library` (w ramach listy)

## 3. Struktura komponentów

- `FlashcardRow`
  - `InlineEditRow`
    - `FrontField`
    - `BackField`
    - `SaveButton`
    - `CancelButton`
    - `InlineFieldError`

## 4. Szczegóły komponentu

### `InlineEditRow`

- Opis komponentu: edytuje przod/tyl fiszki i zapisuje zmiany.
- Główne elementy: inputy, przyciski zapisu/anulowania.
- Obsługiwane zdarzenia: `onEdit`, `onSave`, `onCancel`.
- Warunki walidacji:
  - wymagany `front` i `back`,
  - limit dlugosci zgodny z API (jesli zdefiniowany).
- Typy: `FlashcardUpdateCommand`, `FlashcardUpdateResponseDTO`.
- Propsy: `flashcard`, `onUpdated`, `onCancel`.

## 5. Typy

- `FlashcardUpdateCommand`: `{ front?, back?, card_type?, edited_by_ai? }`
- `FlashcardUpdateResponseDTO`: `FlashcardDTO`
- ViewModel: `InlineEditState` z `front`, `back`, `isSaving`, `errors`.

## 6. Zarządzanie stanem

Stan edycji per wiersz i globalna blokada tylko jednej edycji naraz w `FlashcardList`.

## 7. Integracja API

`PATCH /api/flashcards/{id}` z `FlashcardUpdateCommand`.

## 8. Interakcje użytkownika

Wejscie w tryb edycji, zapis, anulowanie.

## 9. Warunki i walidacja

Wymagane pola `front` i `back`. Blokada zapisu przy bledach.

## 10. Obsługa błędów

`400/401/500` → komunikat inline i pozostanie w edycji.

## 11. Zgodnosc z PRD

- Widok biblioteki wspiera edycje inline (US-010) oraz moze wspolistniec z usuwaniem fiszek (US-011) i komunikatami o dodaniu fiszki (US-012) w ramach tego samego ekranu `/library`.
- Funkcje spoza US-010 nie zmieniaja logiki edycji inline i nie naruszaja kryteriow akceptacji US-010.

## 12. Kroki implementacji

1. Dodaj tryb edycji w `FlashcardRow`.
2. Zaimplementuj walidacje i zapis przez `PATCH`.
3. Zablokuj równoczesna edycje wielu wierszy.
