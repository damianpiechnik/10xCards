# Diagram modułu generowania fiszek - 10xCards

Data utworzenia: 2026-01-29

## Opis

Szczegółowy diagram pokazujący architekturę modułu generowania fiszek AI, w tym proces od wklejenia tekstu do wygenerowania fiszek.

## Diagram

```mermaid
flowchart TD
    subgraph "Layout"
        LAYOUT["Layout.astro"]
        NAV["MainNav"]
        LAYOUT --> NAV
        NAV -.link.-> GP
    end

    subgraph "Strony generowania"
        GP["generate.astro<br/>Formularz generowania"]
        GRI["generation-requests/index.astro<br/>Historia zleceń"]
        GRID["generation-requests/[id].astro<br/>Szczegóły zlecenia"]
        GRIP["generation-requests/[id]/processing.astro<br/>Status przetwarzania"]

        GP --> LAYOUT
        GRI --> LAYOUT
        GRID --> LAYOUT
        GRIP --> LAYOUT
    end

    subgraph "Komponenty React"
        GF["GenerationForm<br/>Formularz z parametrami"]
        GRH["GenerationRequestHistory<br/>Lista zleceń"]
        GRD["GenerationRequestDetails<br/>Szczegóły + fiszki"]
        GPS["GenerationProcessingStatus<br/>Status real-time"]

        GP --> GF
        GRI --> GRH
        GRID --> GRD
        GRIP --> GPS
    end

    subgraph "Parametry GenerationForm"
        PARAMS["Tekst źródłowy: max 1000 znaków<br/>Liczba fiszek: 1-50<br/>Język: PL/EN<br/>Model: opcjonalnie"]
        GF --> PARAMS
    end

    subgraph "Hooki"
        UAS["useAuthSession<br/>Sesja użytkownika"]
        UCGR["useCreateGenerationRequest<br/>Tworzenie zlecenia"]

        GF --> UAS
        GF --> UCGR
        GRH --> UAS
        GRD --> UAS
        GPS --> UAS
    end

    subgraph "API i Backend"
        API_GEN["/api/generation-requests/*"]
        SB_DB["Supabase Database<br/>Przechowywanie zleceń"]
        AI_SERVICE["OpenRouter AI<br/>Generowanie fiszek"]

        GF -.POST create.-> API_GEN
        GRH -.GET list.-> API_GEN
        GRD -.GET details.-> API_GEN
        GPS -.GET status (polling).-> API_GEN

        API_GEN --> SB_DB
        API_GEN -.wywołuje AI.-> AI_SERVICE
    end

    subgraph "Przepływ po wysłaniu"
        FLOW["1. Użytkownik wypełnia formularz<br/>2. Submit → POST create<br/>3. Redirect → processing<br/>4. Polling statusu co kilka sekund<br/>5. Sukces → link do szczegółów"]

        GF -.po submit.-> GPS
        GPS -.po zakończeniu.-> GRD
        GRD -.link do historii.-> GRH
    end

    subgraph "Komponenty UI"
        UI["Button, Card, Input,<br/>Textarea, Label, Alert"]

        GF --> UI
        GRH --> UI
        GRD --> UI
        GPS --> UI
    end

    classDef pageCls fill:#e1f5ff,stroke:#0288d1,stroke-width:2px
    classDef componentCls fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    classDef hookCls fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef apiCls fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef uiCls fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    classDef layoutCls fill:#e0f2f1,stroke:#00695c,stroke-width:2px
    classDef infoCls fill:#fff3e0,stroke:#ef6c00,stroke-width:2px

    class LAYOUT,NAV layoutCls
    class GP,GRI,GRID,GRIP pageCls
    class GF,GRH,GRD,GPS componentCls
    class UAS,UCGR hookCls
    class API_GEN,SB_DB,AI_SERVICE apiCls
    class UI uiCls
    class PARAMS,FLOW infoCls
```

## Komponenty

### GenerationForm

**Pola:**

- Tekst źródłowy (textarea, max 1000 znaków)
- Liczba fiszek (number, 1-50)
- Język (select, PL/EN)
- Model (input text, opcjonalnie)

**Walidacja:**

- Tekst niepusty i ≤1000 znaków
- Liczba fiszek w zakresie 1-50
- Język wybrany

**Akcja:**

- POST /api/generation-requests/create
- Po sukcesie: przekierowanie do /generation-requests/{id}/processing

**Stan:**

- isSubmitting: pokazuje loader podczas wysyłania
- isRedirecting: komunikat o przekierowaniu

### GenerationRequestHistory

**Funkcje:**

- Wyświetla listę wszystkich zleceń użytkownika
- Sortowanie: najnowsze na górze
- Pokazuje status: pending, processing, completed, failed
- Link do szczegółów każdego zlecenia

**Dane:**

- GET /api/generation-requests/list

### GenerationRequestDetails

**Funkcje:**

- Pokazuje szczegóły zlecenia (tekst źródłowy, parametry)
- Wyświetla wygenerowane fiszki
- Pokazuje logi przetwarzania
- Przycisk "Spróbuj ponownie" dla nieudanych

**Dane:**

- GET /api/generation-requests/{id}

### GenerationProcessingStatus

**Funkcje:**

- Polling statusu co 3-5 sekund
- Pokazuje progress bar lub spinner
- Komunikat o postępie
- Po zakończeniu: przekierowanie do szczegółów lub błąd

**Stany:**

- pending → processing → completed/failed
- Timeout: maksymalnie 30 sekund na generację

## Przepływ generowania

### 1. Wypełnienie formularza

```
Użytkownik → /generate → GenerationForm →
Wkleja tekst (np. definicje medyczne) →
Ustawia liczbę fiszek: 10 →
Wybiera język: PL →
Opcjonalnie: model: gpt-4o-mini
```

### 2. Wysłanie zlecenia

```
Klik "Generuj" → Walidacja pól →
POST /api/generation-requests/create →
Request ID: abc-123 →
Przekierowanie: /generation-requests/abc-123/processing
```

### 3. Przetwarzanie

```
GenerationProcessingStatus →
Polling: GET /api/generation-requests/abc-123/status →
Backend:
  1. Zapisuje zlecenie w DB (status: pending)
  2. Wywołuje OpenRouter AI
  3. AI generuje fiszki (5-30s)
  4. Zapisuje fiszki w DB
  5. Aktualizuje status: completed
```

### 4. Zakończenie

```
Status: completed →
Komunikat: "Wygenerowano 10 fiszek" →
Link: "Zobacz szczegóły" →
Przekierowanie: /generation-requests/abc-123 →
GenerationRequestDetails pokazuje fiszki
```

### 5. Obsługa błędów

```
Status: failed →
Komunikat: "Nie udało się wygenerować" + przyczyna →
Przycisk: "Spróbuj ponownie" →
Retry: POST /api/generation-requests/abc-123/retry
```

## Hook useCreateGenerationRequest

**Funkcje:**

- Wysyła POST request do API
- Zarządza stanem isSubmitting
- Zwraca request ID po sukcesie
- Rzuca błąd w przypadku niepowodzenia

**Użycie:**

```typescript
const { isSubmitting, submit } = useCreateGenerationRequest();

const response = await submit(payload, accessToken);
// response.id = "abc-123"
```

## Integracja z OpenRouter

**Proces:**

1. Backend otrzymuje zlecenie
2. Przygotowuje prompt dla AI:
   - "Wygeneruj 10 fiszek w języku PL z tekstu: {source_text}"
   - Format: JSON z polami front, back, card_type
3. Wywołuje OpenRouter API z modelem (domyślnie: gpt-4o-mini)
4. Parsuje odpowiedź AI
5. Zapisuje fiszki w tabeli flashcards
6. Aktualizuje status zlecenia

**Limity:**

- Max czas: 30 sekund
- Max fiszek: 50
- Max tekst: 1000 znaków

## Walidacja i błędy

**Walidacje formularza:**

- Tekst źródłowy: 1-1000 znaków
- Liczba fiszek: 1-50 (integer)
- Język: tylko PL lub EN

**Możliwe błędy:**

- 401: Nie zalogowany
- 400: Nieprawidłowe dane
- 429: Za dużo requestów
- 500: Błąd serwera
- Timeout: Przekroczono 30s

**Obsługa:**

- Pokazanie komunikatu błędu
- Przycisk "Spróbuj ponownie"
- Zachowanie danych formularza
- Logi błędów w szczegółach zlecenia
