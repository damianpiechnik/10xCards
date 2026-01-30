# Diagram przepływu danych - 10xCards

Data utworzenia: 2026-01-29

## Opis

Diagram pokazujący jak dane przepływają przez aplikację od warstwy UI przez hooki, API, aż do backendu i z powrotem. Uproszczony widok architektury danych.

## Diagram

```mermaid
flowchart TD
    subgraph "Warstwa prezentacji User Interface"
        UI_AUTH["Formularze Auth<br/>SignIn, SignUp, Reset"]
        UI_GEN["Formularze Generowania<br/>GenerationForm"]
        UI_LIB["Biblioteka<br/>FlashcardList, Manual"]
        UI_REV["Powtórki<br/>ReviewQueue, Session"]
    end
    
    subgraph "Warstwa logiki biznesowej Custom Hooks"
        HOOK_AUTH["useAuthSession<br/>Zarządzanie sesją"]
        HOOK_GEN["useCreateGenerationRequest<br/>Tworzenie zleceń"]
        HOOK_LIB["useFlashcardList<br/>CRUD fiszek"]
        HOOK_REV["useReviewQueue<br/>Kolejka powtórek"]
    end
    
    subgraph "Warstwa API REST Endpoints"
        API_AUTH["/api/auth/*<br/>Login, Register, Reset"]
        API_GEN["/api/generation-requests/*<br/>Create, List, Details"]
        API_FLASH["/api/flashcards/*<br/>CRUD operations"]
        API_REV["/api/reviews/*<br/>Queue, Submit"]
    end
    
    subgraph "Warstwa persystencji Backend Services"
        SB_AUTH["Supabase Auth<br/>JWT tokens"]
        SB_DB["Supabase Database<br/>PostgreSQL"]
        AI_SERVICE["OpenRouter<br/>AI generation"]
        SRS_ENGINE["SRS Algorithm<br/>Obliczenia powtórek"]
    end
    
    UI_AUTH --> HOOK_AUTH
    UI_GEN --> HOOK_AUTH
    UI_GEN --> HOOK_GEN
    UI_LIB --> HOOK_AUTH
    UI_LIB --> HOOK_LIB
    UI_REV --> HOOK_AUTH
    UI_REV --> HOOK_REV
    
    HOOK_AUTH --> API_AUTH
    HOOK_GEN --> API_GEN
    HOOK_LIB --> API_FLASH
    HOOK_REV --> API_REV
    
    API_AUTH --> SB_AUTH
    API_GEN --> SB_DB
    API_GEN -.wywołuje.-> AI_SERVICE
    API_FLASH --> SB_DB
    API_REV --> SB_DB
    API_REV -.używa.-> SRS_ENGINE
    
    SB_AUTH -.token.-> HOOK_AUTH
    SB_DB -.dane.-> HOOK_GEN
    SB_DB -.dane.-> HOOK_LIB
    SB_DB -.dane.-> HOOK_REV
    AI_SERVICE -.fiszki.-> API_GEN
    
    classDef uiCls fill:#e1f5ff,stroke:#0288d1,stroke-width:2px
    classDef hookCls fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef apiCls fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef backendCls fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    
    class UI_AUTH,UI_GEN,UI_LIB,UI_REV uiCls
    class HOOK_AUTH,HOOK_GEN,HOOK_LIB,HOOK_REV hookCls
    class API_AUTH,API_GEN,API_FLASH,API_REV apiCls
    class SB_AUTH,SB_DB,AI_SERVICE,SRS_ENGINE backendCls
```

## Szczegółowe przepływy danych

### 1. Autentykacja - Logowanie

```mermaid
sequenceDiagram
    participant User
    participant SignInForm
    participant useAuthSession
    participant API
    participant Supabase
    
    User->>SignInForm: Wpisuje email + hasło
    SignInForm->>SignInForm: Walidacja lokalna
    SignInForm->>API: POST /api/auth/sign-in
    API->>Supabase: signInWithPassword()
    Supabase-->>API: Session + JWT token
    API-->>SignInForm: { access_token, user }
    SignInForm->>useAuthSession: Aktualizuje stan sesji
    useAuthSession-->>SignInForm: { session, isLoading: false }
    SignInForm-->>User: Przekierowanie do /library
```

### 2. Generowanie fiszek

```mermaid
sequenceDiagram
    participant User
    participant GenerationForm
    participant useCreateGenerationRequest
    participant API
    participant Database
    participant OpenRouter
    
    User->>GenerationForm: Wkleja tekst + parametry
    GenerationForm->>GenerationForm: Walidacja (max 1000 znaków)
    GenerationForm->>useCreateGenerationRequest: submit(payload, token)
    useCreateGenerationRequest->>API: POST /api/generation-requests/create
    API->>Database: INSERT generation_request (status: pending)
    API-->>GenerationForm: { id: "abc-123", status: "pending" }
    GenerationForm-->>User: Redirect do /processing
    
    Note over API,OpenRouter: Background processing
    API->>OpenRouter: Generate flashcards
    OpenRouter-->>API: [{ front, back }, ...]
    API->>Database: INSERT flashcards (x10)
    API->>Database: UPDATE generation_request (status: completed)
    
    User->>API: GET /api/generation-requests/abc-123 (polling)
    API->>Database: SELECT request + flashcards
    Database-->>API: Data
    API-->>User: { status: "completed", flashcards: [...] }
```

### 3. Przeglądanie i edycja biblioteki

```mermaid
sequenceDiagram
    participant User
    participant FlashcardList
    participant useFlashcardList
    participant API
    participant Database
    
    User->>FlashcardList: Otwiera /library
    FlashcardList->>useFlashcardList: Inicjalizacja
    useFlashcardList->>API: GET /api/flashcards?limit=20
    API->>Database: SELECT * FROM flashcards WHERE user_id = ?
    Database-->>API: [fiszki...]
    API-->>useFlashcardList: { items: [...] }
    useFlashcardList-->>FlashcardList: Aktualizacja stanu
    FlashcardList-->>User: Wyświetla 20 fiszek
    
    User->>FlashcardList: Klika "Edytuj inline"
    FlashcardList->>FlashcardList: Pokazuje formularz
    User->>FlashcardList: Edytuje treść + "Zapisz"
    FlashcardList->>API: PATCH /api/flashcards/{id}
    API->>Database: UPDATE flashcards SET front = ?, back = ?
    Database-->>API: Updated row
    API-->>FlashcardList: { id, front, back, updated_at }
    FlashcardList->>useFlashcardList: updateItem(item)
    useFlashcardList-->>FlashcardList: Optymistyczna aktualizacja
    FlashcardList-->>User: "Zapisano zmiany"
```

### 4. System powtórek (SRS)

```mermaid
sequenceDiagram
    participant User
    participant ReviewQueue
    participant ReviewSession
    participant useReviewQueue
    participant API
    participant Database
    participant SRS
    
    User->>ReviewQueue: Otwiera /reviews
    ReviewQueue->>useReviewQueue: Inicjalizacja
    useReviewQueue->>API: GET /api/reviews/queue?limit=20
    API->>Database: SELECT * WHERE due_at <= NOW()
    Database-->>API: [fiszki do powtórki...]
    API-->>useReviewQueue: { items: [...] }
    useReviewQueue-->>ReviewQueue: Aktualizacja stanu
    ReviewQueue-->>User: Wyświetla 15 fiszek
    
    User->>ReviewQueue: Klika "Rozpocznij powtórki"
    ReviewQueue->>ReviewQueue: Zapisuje do localStorage
    ReviewQueue-->>User: Redirect do /reviews/session
    
    User->>ReviewSession: Rozpoczyna sesję
    ReviewSession->>ReviewSession: Czyta localStorage
    ReviewSession-->>User: Pokazuje fiszkę 1/15 (przód)
    User->>ReviewSession: "Pokaż odpowiedź"
    ReviewSession-->>User: Pokazuje tył
    User->>ReviewSession: Ocena "Good"
    ReviewSession->>ReviewSession: Zapisuje ocenę lokalnie
    ReviewSession-->>User: Następna fiszka...
    
    Note over User,ReviewSession: Po 15 fiszkach
    
    ReviewSession->>API: POST /api/reviews/submit
    API->>SRS: Oblicz nowe due_at dla każdej fiszki
    SRS-->>API: [{ id, due_at, interval_days }...]
    API->>Database: UPDATE flashcards (due_at, interval_days)
    Database-->>API: Success
    API-->>ReviewSession: { success: true }
    ReviewSession->>ReviewSession: Czyści localStorage
    ReviewSession-->>User: "Zakończono sesję!" + redirect
```

## Struktura danych

### Session (useAuthSession)

```typescript
{
  access_token: string,
  user: {
    id: string,
    email: string
  },
  expires_at: number
}
```

### FlashcardDTO

```typescript
{
  id: string,
  user_id: string,
  front: string,
  back: string,
  card_type: 'qa' | 'front_back',
  generation_request_id?: string,
  is_manual: boolean,
  due_at: string,
  interval_days: number,
  ease_factor: number,
  repetitions: number,
  last_reviewed_at?: string,
  deleted_at?: string,
  created_at: string,
  updated_at: string
}
```

### GenerationRequestDTO

```typescript
{
  id: string,
  user_id: string,
  source_text: string,
  requested_count: number,
  language: 'PL' | 'EN',
  model?: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  error_message?: string,
  created_at: string,
  completed_at?: string,
  flashcards?: FlashcardDTO[]
}
```

### ReviewSubmission

```typescript
{
  reviews: Array<{
    flashcard_id: string,
    rating: 'again' | 'hard' | 'good' | 'easy'
  }>
}
```

## Zarządzanie stanem

### Custom Hooks - wzorzec użycia

Wszystkie hooki używają podobnego wzorca:

```typescript
const useDataHook = (accessToken, query, enabled) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const fetch = async () => {
    if (!enabled || !accessToken) return;
    
    setIsLoading(true);
    try {
      const response = await api.get(endpoint, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setData(response.data);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetch();
  }, [accessToken, query, enabled]);
  
  return { data, error, isLoading, refresh: fetch };
};
```

### Optymistyczne aktualizacje

Dla lepszego UX, niektóre operacje aktualizują UI natychmiast:

```typescript
// useFlashcardList
const updateItem = (updatedItem: FlashcardDTO) => {
  // Natychmiastowa aktualizacja UI
  setData(prev => ({
    ...prev,
    items: prev.items.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    )
  }));
  
  // Jeśli API zwróci błąd, można zrobić rollback
};
```

## Bezpieczeństwo danych

### Token przechowywany w Supabase

- JWT token zwracany przez Supabase Auth
- Automatyczne odświeżanie tokenu
- Przechowywany w httpOnly cookies (przez Supabase SDK)

### Autoryzacja requestów

Każdy request do API wymaga tokenu:

```typescript
headers: {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
}
```

### Walidacja na backendzie

1. Sprawdzenie tokenu JWT
2. Weryfikacja user_id
3. Sprawdzenie uprawnień (czy fiszka należy do użytkownika)
4. Walidacja danych wejściowych

## Obsługa błędów

### Standardowe kody błędów

- **401 Unauthorized**: Token nieważny → redirect do /auth/sign-in
- **400 Bad Request**: Nieprawidłowe dane → komunikat inline
- **404 Not Found**: Zasób nie istnieje → refresh listy
- **429 Too Many Requests**: Rate limit → komunikat "Spróbuj później"
- **500 Internal Server Error**: Błąd serwera → komunikat + retry

### Retry strategia

```typescript
const fetchWithRetry = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await sleep(1000 * Math.pow(2, i)); // exponential backoff
    }
  }
};
```

## Optymalizacje wydajności

### Caching

- **Sesja**: Cache w memory (useAuthSession)
- **Kolejka powtórek**: localStorage podczas sesji
- **Lista fiszek**: Cache w hooku, invalidacja po CRUD

### Paginacja

- Load more: 20 fiszek na raz
- Cursor-based pagination dla dużych list
- Lazy loading kolejnych stron

### Debouncing

- Filtry: debounce 300ms przed API call
- Search: debounce 500ms

### Polling optymalizacja

- Generowanie: polling co 2s przez max 30s
- Potem timeout lub success

## Przepływ danych - podsumowanie

1. **UI → Hook**: Interakcja użytkownika wywołuje funkcję hooka
2. **Hook → API**: Hook wysyła HTTP request z tokenem
3. **API → Backend**: API przekazuje do Supabase/OpenRouter
4. **Backend → API**: Backend zwraca dane/status
5. **API → Hook**: Hook aktualizuje stan
6. **Hook → UI**: UI re-renderuje się z nowymi danymi

**Kluczowe zasady:**
- Separation of concerns (UI, logika, API oddzielone)
- Single source of truth (stan w hookach)
- Immutable updates (React state)
- Error handling na każdym poziomie
- Optymistyczne aktualizacje dla lepszego UX
