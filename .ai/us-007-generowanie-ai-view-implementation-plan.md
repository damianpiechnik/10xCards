# Plan implementacji widoku Generuj: uruchomienie generacji (US-007)

## 1. Przegląd

Uzytkownik uruchamia generacje AI, widzi stan ladowania i przechodzi do widoku statusu lub szczegolow.

## 2. Routing widoku

`/generate` -> po sukcesie ` /generation-requests/{id}/processing`

## 3. Struktura komponentów

- `GeneratePage` (Astro)
  - `GenerationForm` (React)
    - `SubmitButton`
    - `LoadingState`

## 4. Szczegóły komponentu

### `GenerationForm`

- Opis komponentu: wysyla dane do API i zarzadza stanem ladowania.
- Główne elementy: `form`, `button`, `spinner`.
- Obsługiwane zdarzenia: `onSubmit`.
- Warunki walidacji: kompletne i poprawne dane formularza.
- Typy: `GenerationRequestCreateCommand`, `GenerationRequestCreateResponseDTO`.
- Propsy: brak.

## 5. Typy

- `GenerationRequestCreateCommand`: `{ source_text, requested_count, language, model }`
- `GenerationRequestCreateResponseDTO`: `{ id, status, created_at }`
- ViewModel: `GenerateFormState` z `isSubmitting`.

## 6. Zarządzanie stanem

`isSubmitting` i `formError`. Po sukcesie zapisz `requestId` i przekieruj.

## 7. Integracja API

`POST /generation-requests` z `GenerationRequestCreateCommand`, odpowiedz `201` z `GenerationRequestCreateResponseDTO`.

## 8. Interakcje użytkownika

Klikniecie „Generuj” uruchamia request i pokazuje loader.

## 9. Warunki i walidacja

Blokada submit, gdy walidacja formularza nie przechodzi.

## 10. Obsługa błędów

`400/429/503/500` → komunikat i pozostanie na formularzu.

## 11. Kroki implementacji

1. Dodaj obsluge submit w `GenerationForm`.
2. Zaimplementuj request do `POST /generation-requests`.
3. Pokaz stan ladowania i przekieruj na `/generation-requests/{id}/processing`.
