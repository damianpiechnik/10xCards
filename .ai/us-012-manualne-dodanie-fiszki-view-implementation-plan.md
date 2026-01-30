# Plan implementacji manualnego dodania fiszki (US-012)

## 1. Przegląd

Uzytkownik moze dodac fiszke manualnie, podajac przod i tyl. Po zapisie fiszka pojawia sie w bibliotece jako manualna.

## 2. Routing widoku

`/flashcards/new`

## 3. Struktura komponentów

- `ManualFlashcardPage` (Astro)
  - `ManualFlashcardForm` (React)
    - `FrontField`
    - `BackField`
    - `SubmitButton`
    - `FormErrorBanner`

## 4. Szczegóły komponentu

### `ManualFlashcardForm`

- Opis komponentu: formularz tworzenia fiszki manualnej.
- Główne elementy: `form`, pola `front` i `back`, submit.
- Obsługiwane zdarzenia: `onChange`, `onBlur`, `onSubmit`.
- Warunki walidacji:
  - `front` i `back` wymagane,
  - limity dlugosci zgodne z API.
- Typy: `FlashcardCreateCommand`, `FlashcardCreateResponseDTO`.
- Propsy: `onCreated`.

## 5. Typy

- `FlashcardCreateCommand`: `{ front; back; card_type }` gdzie `card_type` to `qa` lub `front_back` (manualność oznaczana jest po stronie backendu przez `is_manual`).
- `FlashcardCreateResponseDTO`: `FlashcardDTO`

## 6. Zarządzanie stanem

Lokalny stan formularza oraz `isSubmitting`, `errors`.

## 7. Integracja API

`POST /api/flashcards` z `FlashcardCreateCommand` (card_type ustawiony na `qa` lub `front_back`).

## 8. Interakcje użytkownika

Wprowadzenie danych, zapis, komunikat sukcesu i przejście do biblioteki.

## 9. Warunki i walidacja

Wymagane `front` i `back`, blokada submit przy bledach.

## 10. Obsługa błędów

`400/401/500` → komunikat i zachowanie danych formularza.

## 11. Kroki implementacji

1. Dodaj stronę `src/pages/flashcards/new.astro` z `ManualFlashcardForm`.
2. Zaimplementuj walidacje i `POST /api/flashcards`.
3. Po sukcesie pokaż komunikat i umożliw przejście do biblioteki.
