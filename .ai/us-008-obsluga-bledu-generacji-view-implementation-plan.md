# Plan implementacji widoku Obsługa błędów generacji (US-008)

## 1. Przegląd

Widoki „Generacja w toku” i „Szczegóły generacji” musza obslugiwac bledy, timeouty i retry bez utraty danych.

## 2. Routing widoku

`/generation-requests/{id}/processing` oraz `/generation-requests/{id}`

## 3. Struktura komponentów

- `GenerationProcessingPage` (Astro)
  - `GenerationStatus` (React)
    - `StatusBanner`
    - `RetryButton`
    - `BackToLibraryLink`
- `GenerationDetailsPage` (Astro)
  - `GenerationDetails` (React)
    - `StatusPanel`
    - `RetryButton`
    - `LogsToggle`

## 4. Szczegóły komponentu

### `GenerationStatus`

- Opis komponentu: polling statusu generacji i prezentacja stanu.
- Główne elementy: banner statusu, CTA retry.
- Obsługiwane zdarzenia: `onRetry`.
- Warunki walidacji: retry tylko przy statusie `failed`/`timeout`.
- Typy: `GenerationRequestDetailsResponseDTO`, `GenerationRequestRetryResponseDTO`.
- Propsy: `requestId`.

### `GenerationDetails`

- Opis komponentu: prezentuje status, bledy i logi.
- Główne elementy: panel statusu, przycisk retry, sekcja logow.
- Obsługiwane zdarzenia: `onRetry`, `onToggleLogs`.
- Warunki walidacji: retry tylko przy statusie bledu.
- Typy: `GenerationRequestDetailsResponseDTO`, `GenerationRequestLogDTO`.
- Propsy: `requestId`.

## 5. Typy

- `GenerationRequestDetailsResponseDTO`
- `GenerationRequestRetryResponseDTO`
- `GenerationRequestLogsListResponseDTO`

## 6. Zarządzanie stanem

Stan lokalny:

- `status`, `errorMessage`, `isPolling`, `isRetrying`, `logsOpen`.
  Polling co kilka sekund do czasu `completed/failed/timeout`.

## 7. Integracja API

- `GET /generation-requests/{id}` — pobranie statusu.
- `POST /generation-requests/{id}/retry` — ponowienie.
- `GET /generation-requests/{id}/logs` — logi (opcjonalnie).

## 8. Interakcje użytkownika

Odczyt statusu, retry po bledzie/timeout, podglad logow.

## 9. Warunki i walidacja

Retry tylko dla `failed`/`timeout`. Brak utraty danych po retry.

## 10. Obsługa błędów

`404` → komunikat i link do historii generacji. `401` → CTA do logowania. `429/503` → „Sproboj pozniej”.

## 11. Kroki implementacji

1. Zaimplementuj polling statusu w `GenerationStatus`.
2. Dodaj obsluge retry z `POST /generation-requests/{id}/retry`.
3. W `GenerationDetails` dodaj logi i komunikaty bledow.
