# Plan implementacji widoku Generuj: pole tekstowe (US-005)

## 1. Przegląd

Sekcja widoku `Generuj` umożliwia wklejenie tekstu z limitem 1000 znakow, z natychmiastowa walidacja i licznikiem.

## 2. Routing widoku

`/generate`

## 3. Struktura komponentów

- `GeneratePage` (Astro)
  - `GenerationForm` (React)
    - `SourceTextField`
    - `CharCounter`
    - `InlineFieldError`

## 4. Szczegóły komponentu

### `SourceTextField`

- Opis komponentu: textarea do wklejenia tekstu.
- Główne elementy: `textarea`, `label`, licznik znakow.
- Obsługiwane zdarzenia: `onChange`, `onBlur`.
- Warunki walidacji:
  - wymagany tekst,
  - limit 1000 znakow (blokada generacji przy przekroczeniu).
- Typy: `GenerationRequestCreateCommand["source_text"]`.
- Propsy: `value`, `onChange`, `error`, `maxLength`.

## 5. Typy

- `GenerationRequestCreateCommand`: `source_text`, `requested_count`, `language`, `model`.
- ViewModel: `GenerateFormState.sourceText`.

## 6. Zarządzanie stanem

Lokalny stan `sourceText` i `sourceTextError`. Licznik znakow oparty o `sourceText.length`.

## 7. Integracja API

Brak bezposredniego wywolania na tym etapie, przygotowanie danych do `POST /generation-requests`.

## 8. Interakcje użytkownika

Wklejenie tekstu, podglad licznika, blad przy przekroczeniu limitu.

## 9. Warunki i walidacja

Limit 1000 znakow; UI blokuje przejscie do generacji przy przekroczeniu.

## 10. Obsługa błędów

Blad walidacji lokalnej, brak requestu.

## 11. Kroki implementacji

1. Dodaj `SourceTextField` i licznik w `GenerationForm`.
2. Zaimplementuj walidacje limitu 1000 znakow.
3. Zablokuj akcje generacji przy bledzie.
