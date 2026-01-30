# Diagram modułu powtórek - 10xCards

Data utworzenia: 2026-01-29

## Opis

Szczegółowy diagram pokazujący architekturę modułu powtórek z systemem SRS (Spaced Repetition System), kolejką powtórek i sesjami nauki.

## Diagram

```mermaid
flowchart TD
    subgraph "Layout"
        LAYOUT["Layout.astro"]
        NAV["MainNav"]
        LAYOUT --> NAV
        NAV -.link Powtórki.-> RV
    end

    subgraph "Strony powtórek"
        RV["reviews.astro<br/>Kolejka powtórek"]
        RS["reviews/session.astro<br/>Sesja nauki"]

        RV --> LAYOUT
        RS --> LAYOUT
    end

    subgraph "Komponenty React"
        RQ["ReviewQueue<br/>Lista fiszek do powtórki"]
        RSC["ReviewSession<br/>Interfejs nauki"]

        RV --> RQ
        RS --> RSC
    end

    subgraph "ReviewQueue funkcje"
        QUEUE_FUNC["- Pokazuje fiszki z due_at <= teraz<br/>- Domyślny limit: 20 fiszek<br/>- Sortowanie po due_at ASC<br/>- Przycisk 'Rozpocznij powtórki'<br/>- Przycisk 'Odśwież kolejkę'"]

        RQ --> QUEUE_FUNC
    end

    subgraph "ReviewSession funkcje"
        SESSION_FUNC["- Pokazuje fiszkę (przód)<br/>- Użytkownik próbuje odpowiedzieć<br/>- Klik 'Pokaż odpowiedź' (tył)<br/>- Ocena: Again / Hard / Good / Easy<br/>- Algorytm SRS oblicza next review<br/>- Następna fiszka"]

        RSC --> SESSION_FUNC
    end

    subgraph "Hooki"
        UAS["useAuthSession<br/>Sesja użytkownika"]
        URQ["useReviewQueue<br/>Pobieranie kolejki"]

        RQ --> UAS
        RQ --> URQ
        RSC --> UAS
    end

    subgraph "Storage lokalny"
        LOCAL["reviewStorage<br/>LocalStorage dla kolejki"]

        RQ -.zapisuje kolejkę.-> LOCAL
        RSC -.czyta kolejkę.-> LOCAL
        RSC -.aktualizuje postęp.-> LOCAL
    end

    subgraph "API operacje"
        API_REV["/api/reviews/*"]

        RQ -.GET queue.-> API_REV
        RSC -.POST submit.-> API_REV
    end

    subgraph "Backend i SRS"
        SB_DB["Supabase Database<br/>Tabela flashcards"]
        SRS_ALG["Algorytm SRS<br/>Oblicza due_at"]

        API_REV --> SB_DB
        API_REV --> SRS_ALG

        SRS_ALG -.aktualizuje.-> SB_DB
    end

    subgraph "Komponenty UI"
        UI["Button, Card, Alert"]

        RQ --> UI
        RSC --> UI
    end

    subgraph "Przepływ sesji"
        FLOW["1. ReviewQueue pobiera fiszki<br/>2. Klik 'Rozpocznij' → zapisz w localStorage<br/>3. Redirect → /reviews/session<br/>4. ReviewSession czyta z localStorage<br/>5. Pętla: pokaż → oceń → next<br/>6. Po wszystkich: POST wyników → backend<br/>7. Redirect → /reviews"]

        RQ -.rozpoczyna.-> RSC
        RSC -.po zakończeniu.-> RQ
    end

    classDef pageCls fill:#e1f5ff,stroke:#0288d1,stroke-width:2px
    classDef componentCls fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    classDef hookCls fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef apiCls fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef uiCls fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    classDef layoutCls fill:#e0f2f1,stroke:#00695c,stroke-width:2px
    classDef infoCls fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef storageCls fill:#fce4ec,stroke:#880e4f,stroke-width:2px

    class LAYOUT,NAV layoutCls
    class RV,RS pageCls
    class RQ,RSC componentCls
    class UAS,URQ hookCls
    class API_REV,SB_DB,SRS_ALG apiCls
    class UI uiCls
    class QUEUE_FUNC,SESSION_FUNC,FLOW infoCls
    class LOCAL storageCls
```

## Komponenty

### ReviewQueue

**Funkcje:**

- Pobiera kolejkę fiszek gotowych do powtórki
- Wyświetla listę z informacjami (termin, przód, tył)
- Przycisk "Rozpocznij powtórki" (aktywny gdy są fiszki)
- Przycisk "Odśwież kolejkę" (refresh danych)
- Licznik fiszek do powtórki

**Kryteria kolejki:**

- `due_at <= NOW()` - fiszki z terminem w przeszłości lub teraz
- `deleted_at IS NULL` - tylko aktywne fiszki
- Sortowanie: `due_at ASC` - najstarsze terminy pierwsze
- Limit: 20 fiszek (domyślnie)

**Stan:**

- isLoading: podczas pobierania
- items: lista fiszek
- error: błąd podczas pobierania

**Akcje:**

1. **Rozpocznij powtórki:**
   - Zapisuje kolejkę do localStorage
   - Przekierowuje do /reviews/session
2. **Odśwież kolejkę:**
   - Ponownie pobiera dane z API
   - Aktualizuje listę

### ReviewSession

**Interfejs nauki:**

1. **Widok karty (przód):**
   - Pokazuje przód fiszki
   - Licznik: "Fiszka 1/20"
   - Przycisk: "Pokaż odpowiedź"

2. **Widok odpowiedzi (tył):**
   - Pokazuje przód + tył
   - 4 przyciski oceny:
     - **Again** - nie pamiętam (interval: 1 min)
     - **Hard** - trudno (interval: krótszy)
     - **Good** - dobrze (interval: standardowy)
     - **Easy** - łatwo (interval: dłuższy)

3. **Postęp sesji:**
   - Progress bar: "5/20 fiszek"
   - Liczniki: Again: 2, Hard: 1, Good: 2, Easy: 0

4. **Zakończenie sesji:**
   - Podsumowanie wyników
   - POST /api/reviews/submit (wszystkie oceny)
   - Komunikat: "Świetna robota! Powtórzyłeś 20 fiszek"
   - Przycisk: "Wróć do kolejki"

**Stan lokalny:**

- currentIndex: aktualna fiszka (0-19)
- showAnswer: czy pokazać tył
- reviews: tablica ocen dla każdej fiszki
- isCompleted: czy sesja zakończona
- isSubmitting: czy wysyłanie wyników

**localStorage:**

- Klucz: "review-queue"
- Wartość: JSON z listą fiszek
- Czyszczony po zakończeniu sesji

## Hook useReviewQueue

**Funkcje:**

- Pobiera kolejkę fiszek do powtórki
- Zarządza stanem (loading, error, data)
- Obsługuje refresh

**API:**

```typescript
const {
  data, // { items: FlashcardDTO[] }
  error, // { message: string, status: number }
  isLoading, // boolean
  refresh, // () => void
} = useReviewQueue(accessToken, query, enabled);
```

**Query params:**

```typescript
{
  limit?: number  // domyślnie 20
}
```

## Algorytm SRS

### Interwały powtórek (uproszczone)

**Pierwsza powtórka:**

- Again: 1 minuta
- Hard: 10 minut
- Good: 1 dzień
- Easy: 4 dni

**Kolejne powtórki** (mnożniki):

- Again: interval × 0.5 (reset)
- Hard: interval × 1.2
- Good: interval × 2.5
- Easy: interval × 3.0

**Przykład:**

```
Fiszka nowa → Good → due_at = now + 1 dzień
Po 1 dniu → Good → due_at = now + 2.5 dnia
Po 2.5 dnia → Easy → due_at = now + 7.5 dnia
Po 7.5 dnia → Again → due_at = now + 3.75 dnia (reset)
```

### Pola w bazie danych

```sql
flashcards:
  - due_at: timestamp (kiedy następna powtórka)
  - interval_days: float (aktualny interwał w dniach)
  - ease_factor: float (mnożnik trudności)
  - repetitions: integer (liczba udanych powtórek)
  - last_reviewed_at: timestamp
```

## Przepływy użytkownika

### 1. Sprawdzenie kolejki

```
Użytkownik → /reviews → ReviewQueue →
GET /api/reviews/queue →
Backend sprawdza: due_at <= NOW() →
Zwraca 15 fiszek →
Lista pokazuje fiszki z terminami
```

### 2. Rozpoczęcie sesji

```
Użytkownik → Klik "Rozpocznij powtórki" →
ReviewQueue zapisuje listę do localStorage →
Redirect → /reviews/session →
ReviewSession czyta localStorage →
Pokazuje pierwszą fiszkę (przód)
```

### 3. Proces nauki

```
Użytkownik widzi przód: "Czym jest mitochondrium?" →
Myśli o odpowiedzi →
Klik "Pokaż odpowiedź" →
Widzi tył: "Organellum komórkowe produkujące ATP..." →
Ocenia: "Good" →

Backend (po sesji):
  - interval_days = 1 dzień × 2.5 = 2.5 dnia
  - due_at = now + 2.5 dnia
  - repetitions += 1
  - last_reviewed_at = now

Następna fiszka...
```

### 4. Zakończenie sesji

```
Ostatnia fiszka oceniona →
Podsumowanie:
  - Again: 3
  - Hard: 2
  - Good: 10
  - Easy: 5
Klik "Wyślij wyniki" →
POST /api/reviews/submit z tablicą ocen →
Backend aktualizuje wszystkie fiszki (due_at) →
Komunikat sukcesu →
Klik "Wróć do kolejki" →
Redirect → /reviews
```

### 5. Pusta kolejka

```
Użytkownik → /reviews → ReviewQueue →
GET /api/reviews/queue →
Brak fiszek do powtórki →
Komunikat: "Brak fiszek do powtórek. Wróć później lub dodaj nowe."
```

## Zarządzanie stanem sesji

### localStorage (reviewStorage)

**Zapisywane dane:**

```typescript
{
  queue: FlashcardDTO[],    // lista fiszek do powtórki
  startedAt: string,         // timestamp rozpoczęcia
  reviews: {                 // oceny dla każdej fiszki
    [flashcardId: string]: 'again' | 'hard' | 'good' | 'easy'
  }
}
```

**Funkcje pomocnicze:**

```typescript
writeReviewQueue(items: FlashcardDTO[])  // zapisz kolejkę
readReviewQueue()                         // odczytaj kolejkę
clearReviewQueue()                        // wyczyść po zakończeniu
```

**Bezpieczeństwo:**

- Dane w localStorage są tymczasowe
- Czyszczone po zakończeniu sesji
- Nie zawierają wrażliwych danych (tylko ID i treść fiszek)

## API Endpoints

### GET /api/reviews/queue

**Request:**

```
Headers: Authorization: Bearer {token}
Query: ?limit=20
```

**Response:**

```json
{
  "items": [
    {
      "id": "uuid",
      "front": "Czym jest mitochondrium?",
      "back": "Organellum...",
      "card_type": "qa",
      "due_at": "2026-01-29T10:00:00Z",
      "interval_days": 1.0,
      ...
    }
  ]
}
```

### POST /api/reviews/submit

**Request:**

```json
{
  "reviews": [
    {
      "flashcard_id": "uuid-1",
      "rating": "good"
    },
    {
      "flashcard_id": "uuid-2",
      "rating": "easy"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "updated_count": 20
}
```

## Walidacja i błędy

**Walidacje:**

- Użytkownik zalogowany
- Kolejka niepusta (dla rozpoczęcia sesji)
- Rating w zakresie: again, hard, good, easy
- flashcard_id istnieje i należy do użytkownika

**Możliwe błędy:**

- 401: Nie zalogowany → redirect /auth/sign-in
- 400: Nieprawidłowe dane → komunikat
- 404: Fiszka nie znaleziona → pomiń
- 500: Błąd serwera → komunikat + retry

**Komunikaty:**

- "Brak fiszek do powtórek" - pusta kolejka
- "Sesja zakończona! Powtórzyłeś X fiszek" - sukces
- "Nie udało się wysłać wyników" - błąd submit

## Optymalizacje i UX

**Keyboard shortcuts (opcjonalnie):**

- Space: Pokaż odpowiedź
- 1: Again
- 2: Hard
- 3: Good
- 4: Easy

**Progres tracking:**

- Visual progress bar
- Liczniki ocen na żywo
- Pozostało fiszek: "5/20"

**Offline capability:**

- Kolejka zapisana w localStorage
- Sesja działa offline
- Wyniki wysyłane po powrocie online

**Motywacja:**

- Streak tracking (dni z rzędu)
- Statystyki: fiszki dziennie, tygodniowo
- Gratulacje po zakończeniu sesji
