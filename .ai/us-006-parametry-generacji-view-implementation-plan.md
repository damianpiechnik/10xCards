# Plan implementacji widoku Generuj: parametry (US-006)

## 1. Przegląd

Sekcja widoku `Generuj` pozwala ustawic liczbe fiszek i jezyk (PL/EN) przed uruchomieniem generacji.

## 2. Routing widoku

`/generate`

## 3. Struktura komponentów

- `GeneratePage` (Astro)
  - `GenerationForm` (React)
    - `RequestedCountField`
    - `LanguageSelect`
    - `InlineFieldError`

## 4. Szczegóły komponentu

### `RequestedCountField`

- Opis komponentu: wybor liczby fiszek (input/stepper/select).
- Główne elementy: `input type="number"` lub `Select`.
- Obsługiwane zdarzenia: `onChange`, `onBlur`.
- Warunki walidacji: wymagane, dodatnia liczba calkowita (zakres ustalony w UI).
- Typy: `GenerationRequestCreateCommand["requested_count"]`.
- Propsy: `value`, `onChange`, `error`, `min`, `max`.

### `LanguageSelect`

- Opis komponentu: wybor jezyka generacji.
- Główne elementy: `Select` z opcjami `PL`, `EN`.
- Obsługiwane zdarzenia: `onChange`.
- Warunki walidacji: wymagane, tylko `PL` lub `EN`.
- Typy: `GenerationRequestLanguage`.
- Propsy: `value`, `onChange`.

## 5. Typy

- `GenerationRequestLanguage`: `"PL" | "EN"`
- `GenerationRequestCreateCommand`: `{ source_text, requested_count, language, model }`
- ViewModel: `GenerateFormState.requestedCount`, `GenerateFormState.language`.

## 6. Zarządzanie stanem

Lokalny stan dla `requestedCount` i `language`, powiazany z walidacja formularza.

## 7. Integracja API

Parametry trafiaja do `POST /generation-requests`.

## 8. Interakcje użytkownika

Wybor liczby fiszek i jezyka.

## 9. Warunki i walidacja

Wymagana dodatnia liczba oraz jezyk `PL`/`EN`.

## 10. Obsługa błędów

Blad walidacji lokalnej, brak requestu.

## 11. Kroki implementacji

1. Dodaj pola parametrow do `GenerationForm`.
2. Zaimplementuj walidacje i domyslne wartosci.
3. Zablokuj generacje przy blednych danych.
