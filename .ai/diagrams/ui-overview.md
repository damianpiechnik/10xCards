# Diagram przeglądu architektury UI - 10xCards

Data utworzenia: 2026-01-29

## Opis

Wysokopoziomowy diagram pokazujący główne moduły aplikacji, ich relacje i przepływ nawigacji między stronami.

## Diagram

```mermaid
flowchart TD
    subgraph "Layout główny"
        LAYOUT["Layout.astro<br/>Główny szablon"]
        NAV["MainNav<br/>Nawigacja globalna"]
        LAYOUT --> NAV
    end
    
    subgraph "Moduły aplikacji"
        AUTH["Moduł Autentykacji<br/>Logowanie, Rejestracja, Reset hasła"]
        GEN["Moduł Generowania<br/>AI generuje fiszki z tekstu"]
        LIB["Moduł Biblioteki<br/>Przeglądanie, edycja, usuwanie"]
        REV["Moduł Powtórek<br/>System SRS, sesje nauki"]
    end
    
    subgraph "Warstwa danych"
        HOOKS["Custom Hooks<br/>Zarządzanie stanem"]
        API["API Endpoints<br/>REST API"]
        BACKEND["Backend<br/>Supabase + OpenRouter"]
    end
    
    subgraph "Komponenty UI"
        SHADCN["Shadcn/ui<br/>Biblioteka komponentów"]
    end
    
    LAYOUT --> AUTH
    LAYOUT --> GEN
    LAYOUT --> LIB
    LAYOUT --> REV
    
    AUTH --> HOOKS
    GEN --> HOOKS
    LIB --> HOOKS
    REV --> HOOKS
    
    HOOKS --> API
    API --> BACKEND
    
    AUTH --> SHADCN
    GEN --> SHADCN
    LIB --> SHADCN
    REV --> SHADCN
    
    NAV -.nawigacja.-> AUTH
    NAV -.nawigacja.-> GEN
    NAV -.nawigacja.-> LIB
    NAV -.nawigacja.-> REV
    
    classDef layoutCls fill:#e0f2f1,stroke:#00695c,stroke-width:3px
    classDef moduleCls fill:#e1f5ff,stroke:#0288d1,stroke-width:2px
    classDef dataCls fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef uiCls fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    
    class LAYOUT,NAV layoutCls
    class AUTH,GEN,LIB,REV moduleCls
    class HOOKS,API,BACKEND dataCls
    class SHADCN uiCls
```

## Struktura modułów

### Moduł Autentykacji
- Strony: sign-in, sign-up, reset-password, update-password
- Komponenty: SignInForm, SignUpForm, ResetPasswordForm, UpdatePasswordForm, SignOutButton
- Funkcje: Logowanie, rejestracja, reset hasła, wylogowanie

### Moduł Generowania Fiszek
- Strony: generate, generation-requests/*, processing
- Komponenty: GenerationForm, GenerationRequestHistory, GenerationRequestDetails, GenerationProcessingStatus
- Funkcje: Generowanie fiszek AI z tekstu źródłowego, historia zleceń

### Moduł Biblioteki
- Strony: library, flashcards/new
- Komponenty: FlashcardList, ManualFlashcardForm
- Funkcje: Przeglądanie, filtrowanie, sortowanie, edycja inline, usuwanie, dodawanie ręczne

### Moduł Powtórek
- Strony: reviews, reviews/session
- Komponenty: ReviewQueue, ReviewSession
- Funkcje: Kolejka powtórek według harmonogramu SRS, sesje nauki

## Przepływ użytkownika

1. **Niezalogowany użytkownik** → Logowanie/Rejestracja
2. **Zalogowany użytkownik** → Strona główna przekierowuje do Biblioteki
3. **Generowanie** → Użytkownik wkleja tekst → AI generuje fiszki → Fiszki trafiają do biblioteki
4. **Biblioteka** → Użytkownik przegląda, edytuje, usuwa fiszki
5. **Powtórki** → System pokazuje fiszki gotowe do powtórki → Użytkownik ocenia → Harmonogram aktualizuje się

## Technologie

- **Frontend**: Astro 5 + React 19 + TypeScript 5
- **Styling**: Tailwind 4 + Shadcn/ui
- **Backend**: Supabase (Auth + Database)
- **AI**: OpenRouter
- **Architektura**: Islands Architecture (Astro)
