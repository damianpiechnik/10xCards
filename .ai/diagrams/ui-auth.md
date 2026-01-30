# Diagram modułu autentykacji - 10xCards

Data utworzenia: 2026-01-29

## Opis

Szczegółowy diagram pokazujący architekturę modułu autentykacji, w tym strony, komponenty, przepływ danych i integrację z Supabase Auth.

## Diagram

```mermaid
flowchart TD
    subgraph "Layout"
        LAYOUT["Layout.astro"]
        NAV["MainNav"]
        LAYOUT --> NAV
    end
    
    subgraph "Strony autentykacji"
        SI["auth/sign-in.astro<br/>Strona logowania"]
        SU["auth/sign-up.astro<br/>Strona rejestracji"]
        RP["auth/reset-password.astro<br/>Żądanie resetu"]
        UP["auth/update-password.astro<br/>Ustawienie nowego hasła"]
        
        SI --> LAYOUT
        SU --> LAYOUT
        RP --> LAYOUT
        UP --> LAYOUT
    end
    
    subgraph "Komponenty React"
        SIF["SignInForm<br/>Email + Hasło"]
        SUF["SignUpForm<br/>Email + Hasło + Potwierdzenie"]
        RPF["ResetPasswordForm<br/>Email do resetu"]
        UPF["UpdatePasswordForm<br/>Nowe hasło"]
        SOB["SignOutButton<br/>Wylogowanie"]
        AR["AuthRedirect<br/>Przekierowanie wg stanu sesji"]
        
        SI --> SIF
        SU --> SUF
        RP --> RPF
        UP --> UPF
        NAV --> SOB
    end
    
    subgraph "Strona główna"
        INDEX["index.astro"]
        WELCOME["Welcome"]
        
        INDEX --> LAYOUT
        INDEX --> AR
        INDEX --> WELCOME
        
        AR -.zalogowany → /library.-> LIB_PAGE["library.astro"]
        AR -.niezalogowany → /auth/sign-in.-> SI
    end
    
    subgraph "Warstwa stanu"
        UAS["useAuthSession<br/>Hook zarządzający sesją"]
        
        SIF --> UAS
        SUF --> UAS
        RPF --> UAS
        UPF --> UAS
        SOB --> UAS
        AR --> UAS
        NAV --> UAS
    end
    
    subgraph "API i Backend"
        API_AUTH["/api/auth/*<br/>Endpointy autentykacji"]
        SB_AUTH["Supabase Auth<br/>Uwierzytelnianie"]
        
        SIF -.POST sign-in.-> API_AUTH
        SUF -.POST sign-up.-> API_AUTH
        RPF -.POST reset-password.-> API_AUTH
        UPF -.POST update-password.-> API_AUTH
        SOB -.POST sign-out.-> API_AUTH
        
        API_AUTH --> SB_AUTH
        UAS -.sprawdza sesję.-> SB_AUTH
    end
    
    subgraph "Komponenty UI"
        UI["Button, Input, Alert, Card<br/>Shadcn/ui"]
        
        SIF --> UI
        SUF --> UI
        RPF --> UI
        UPF --> UI
        SOB --> UI
    end
    
    classDef pageCls fill:#e1f5ff,stroke:#0288d1,stroke-width:2px
    classDef componentCls fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    classDef hookCls fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef apiCls fill:#ffebee,stroke:#c62828,stroke-width:2px
    classDef uiCls fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    classDef layoutCls fill:#e0f2f1,stroke:#00695c,stroke-width:2px
    
    class LAYOUT,NAV layoutCls
    class SI,SU,RP,UP,INDEX pageCls
    class SIF,SUF,RPF,UPF,SOB,AR,WELCOME componentCls
    class UAS hookCls
    class API_AUTH,SB_AUTH apiCls
    class UI uiCls
```

## Komponenty

### SignInForm
- Pola: Email, Hasło
- Walidacja: Email poprawny, hasło niepuste
- Akcja: POST /api/auth/sign-in
- Po sukcesie: Przekierowanie do /library

### SignUpForm
- Pola: Email, Hasło, Potwierdzenie hasła
- Walidacja: Email poprawny, hasła zgodne, min. długość
- Akcja: POST /api/auth/sign-up
- Po sukcesie: Automatyczne logowanie i przekierowanie

### ResetPasswordForm
- Pola: Email
- Walidacja: Email poprawny
- Akcja: POST /api/auth/reset-password
- Po sukcesie: Wysłanie emaila z linkiem resetu

### UpdatePasswordForm
- Pola: Nowe hasło, Potwierdzenie
- Walidacja: Hasła zgodne, min. długość
- Akcja: POST /api/auth/update-password
- Po sukcesie: Przekierowanie do logowania

### SignOutButton
- Widoczny: W MainNav dla zalogowanych użytkowników
- Akcja: POST /api/auth/sign-out
- Po sukcesie: Przekierowanie do /auth/sign-in

### AuthRedirect
- Używany na: index.astro
- Logika: 
  - Jeśli zalogowany → przekierowanie do /library
  - Jeśli niezalogowany → przekierowanie do /auth/sign-in

## Przepływ autentykacji

### Rejestracja
```
Użytkownik → /auth/sign-up → SignUpForm → 
Wypełnia formularz → POST /api/auth/sign-up → 
Supabase tworzy konto → Automatyczne logowanie → 
Przekierowanie do /library
```

### Logowanie
```
Użytkownik → /auth/sign-in → SignInForm → 
Wypełnia formularz → POST /api/auth/sign-in → 
Supabase weryfikuje dane → Tworzy sesję → 
Przekierowanie do /library
```

### Reset hasła
```
Użytkownik → /auth/reset-password → ResetPasswordForm → 
Podaje email → POST /api/auth/reset-password → 
Supabase wysyła email z linkiem → 
Użytkownik klika link → /auth/update-password → 
UpdatePasswordForm → Ustawia nowe hasło → 
Przekierowanie do /auth/sign-in
```

### Wylogowanie
```
Użytkownik → Klika "Wyloguj" w MainNav → 
SignOutButton → POST /api/auth/sign-out → 
Supabase kończy sesję → Przekierowanie do /auth/sign-in
```

## Hook useAuthSession

Funkcje:
- Sprawdza czy użytkownik jest zalogowany
- Pobiera token dostępu (access_token)
- Monitoruje zmiany stanu sesji
- Udostępnia loading state

Używany przez:
- Wszystkie formularze autentykacji
- MainNav (do pokazania odpowiednich przycisków)
- AuthRedirect (do logiki przekierowania)
- Wszystkie chronione komponenty w innych modułach

## Bezpieczeństwo

- Wszystkie hasła są hashowane przez Supabase
- Tokeny sesji są przechowywane bezpiecznie
- WSZYSTKIE funkcje aplikacji wymagają uwierzytelnienia
- Niezalogowani użytkownicy są przekierowywani na /auth/sign-in
- Reset hasła wymaga potwierdzenia przez email
