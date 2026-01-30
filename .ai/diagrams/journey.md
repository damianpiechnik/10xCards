# Diagram podróży użytkownika - 10xCards

Ten diagram przedstawia podróż użytkownika w aplikacji 10xCards, uwzględniając wszystkie kluczowe ścieżki od rejestracji, przez generowanie fiszek, po powtórki.

<mermaid_diagram>

```mermaid
stateDiagram-v2
    [*] --> StronaGlowna
    
    state "Strona główna" as StronaGlowna
    note right of StronaGlowna
        Punkt wejścia dla niezalogowanych użytkowników.
        Wszystkie funkcje wymagają uwierzytelnienia.
    end note
    
    StronaGlowna --> DecyzjaAutentykacji
    
    state DecyzjaAutentykacji <<choice>>
    DecyzjaAutentykacji --> Logowanie: Mam konto
    DecyzjaAutentykacji --> Rejestracja: Nowe konto
    DecyzjaAutentykacji --> ResetHasla: Zapomniałem hasła
    
    state "Proces rejestracji" as Rejestracja {
        [*] --> FormularzRejestracji
        FormularzRejestracji --> WalidacjaDanychRejestracji
        
        state WalidacjaDanychRejestracji <<choice>>
        WalidacjaDanychRejestracji --> UtworzKonto: Dane poprawne
        WalidacjaDanychRejestracji --> BladRejestracji: Błąd walidacji
        
        BladRejestracji --> FormularzRejestracji: Popraw dane
        UtworzKonto --> AutomatyczneLogowanie
        AutomatyczneLogowanie --> [*]
    }
    
    state "Proces logowania" as Logowanie {
        [*] --> FormularzLogowania
        FormularzLogowania --> WeryfikacjaDanych
        
        state WeryfikacjaDanych <<choice>>
        WeryfikacjaDanych --> ZalogowanyUzytkownik: Dane poprawne
        WeryfikacjaDanych --> BladLogowania: Błędne dane
        
        BladLogowania --> FormularzLogowania: Spróbuj ponownie
        BladLogowania --> ResetHaslaZLogowania: Zapomniałem hasła
        
        ZalogowanyUzytkownik --> [*]
    }
    
    state "Proces resetu hasła" as ResetHasla {
        [*] --> FormularzResetuHasla
        FormularzResetuHasla --> WyslanieEmailaReset
        WyslanieEmailaReset --> KomunikatWyslano
        KomunikatWyslano --> KlikniecieLinkuReset
        KlikniecieLinkuReset --> FormularzNowegoHasla
        FormularzNowegoHasla --> UstawNoweHaslo
        UstawNoweHaslo --> [*]
    }
    
    Rejestracja --> PanelGlowny
    Logowanie --> PanelGlowny
    ResetHasla --> Logowanie
    
    state "Panel główny (zalogowany)" as PanelGlowny {
        [*] --> MenuGlowne
        
        state MenuGlowne <<choice>>
        MenuGlowne --> GenerowanieFiszek: Generuj fiszki AI
        MenuGlowne --> BibliotekaDashboard: Biblioteka fiszek
        MenuGlowne --> PowtorkiDashboard: Powtórki
        MenuGlowne --> ReczneDodanie: Dodaj ręcznie
        
        state "Generowanie fiszek AI" as GenerowanieFiszek {
            [*] --> WidokGenerowania
            WidokGenerowania --> WklejenieTekstu
            WklejenieTekstu --> WalidacjaLimitu
            
            state WalidacjaLimitu <<choice>>
            WalidacjaLimitu --> UstawienieParametrow: Do 1000 znaków
            WalidacjaLimitu --> BladLimitu: Przekroczony limit
            
            BladLimitu --> WklejenieTekstu: Skróć tekst
            
            UstawienieParametrow --> UruchomienieGeneracji
            note right of UstawienieParametrow
                Użytkownik wybiera:
                - Liczbę fiszek
                - Język (PL/EN)
            end note
            
            UruchomienieGeneracji --> StanLadowania
            StanLadowania --> WynikGeneracji
            
            state WynikGeneracji <<choice>>
            WynikGeneracji --> FiszkiWygenerowane: Sukces (do 30s)
            WynikGeneracji --> BladGeneracji: Błąd lub timeout
            
            BladGeneracji --> KomunikatBledu
            KomunikatBledu --> DecyzjaPowtorz
            
            state DecyzjaPowtorz <<choice>>
            DecyzjaPowtorz --> UruchomienieGeneracji: Ponów generację
            DecyzjaPowtorz --> WidokGenerowania: Edytuj parametry
            
            FiszkiWygenerowane --> [*]
        }
        
        state "Biblioteka fiszek" as BibliotekaDashboard {
            [*] --> ListaFiszek
            ListaFiszek --> AkcjaNaFiszce
            
            state AkcjaNaFiszce <<choice>>
            AkcjaNaFiszce --> EdycjaInline: Edytuj
            AkcjaNaFiszce --> UsunFiszke: Usuń
            AkcjaNaFiszke --> PrzegladajDalej: Przeglądaj
            
            EdycjaInline --> ZapiszZmiany
            ZapiszZmiany --> ListaFiszek
            
            UsunFiszke --> PotwierdzUsuniecie
            PotwierdzUsuniecie --> ListaFiszek
            
            PrzegladajDalej --> ListaFiszek
            
            ListaFiszek --> [*]
        }
        
        state "Ręczne dodanie fiszki" as ReczneDodanie {
            [*] --> FormularzReczny
            FormularzReczny --> WprowadzPrzodTyl
            note right of WprowadzPrzodTyl
                Użytkownik wprowadza:
                - Przód fiszki (pytanie)
                - Tył fiszki (odpowiedź)
            end note
            
            WprowadzPrzodTyl --> ZapiszFiszkeReczna
            ZapiszFiszkeReczna --> [*]
        }
        
        state "Powtórki" as PowtorkiDashboard {
            [*] --> HarmonogramPowtórek
            HarmonogramPowtórek --> SprawdzFiszkiDoPowtorki
            
            state SprawdzFiszkiDoPowtorki <<choice>>
            SprawdzFiszkiDoPowtorki --> BrakFiszek: Brak fiszek
            SprawdzFiszkiDoPowtorki --> RozpocznijSesje: Fiszki dostępne
            
            BrakFiszek --> KomunikatBrakFiszek
            KomunikatBrakFiszek --> [*]
            
            RozpocznijSesje --> PokazFiszke
            PokazFiszke --> OcenaZnajomosci
            OcenaZnajomosci --> AktualizujHarmonogram
            AktualizujHarmonogram --> KolejnaFiszka
            
            state KolejnaFiszka <<choice>>
            KolejnaFiszka --> PokazFiszke: Więcej fiszek
            KolejnaFiszka --> ZakonczSesje: Koniec sesji
            
            ZakonczSesje --> PodsumowanieSesji
            PodsumowanieSesji --> [*]
        }
        
        GenerowanieFiszek --> MenuGlowne
        BibliotekaDashboard --> MenuGlowne
        PowtorkiDashboard --> MenuGlowne
        ReczneDodanie --> MenuGlowne
        
        MenuGlowne --> Wylogowanie: Wyloguj
    }
    
    state "Wylogowanie" as Wylogowanie {
        [*] --> ZakonczSesje
        ZakonczSesje --> UsunToken
        UsunToken --> [*]
    }
    
    Wylogowanie --> StronaGlowna
    PanelGlowny --> [*]
```

</mermaid_diagram>

## Opis głównych ścieżek

### 1. Autentykacja
- **Rejestracja**: Nowy użytkownik tworzy konto (email + hasło), po walidacji jest automatycznie logowany
- **Logowanie**: Użytkownik z kontem loguje się, po weryfikacji uzyskuje dostęp do aplikacji
- **Reset hasła**: Użytkownik zapomina hasła, otrzymuje email z linkiem, ustawia nowe hasło

### 2. Generowanie fiszek AI
- Użytkownik wkleja tekst (max 1000 znaków)
- Ustawia parametry: liczbę fiszek i język (PL/EN)
- System generuje fiszki w ciągu do 30 sekund
- W przypadku błędu lub timeout'u, użytkownik może ponowić generację

### 3. Zarządzanie fiszkami
- **Przeglądanie**: Lista wszystkich fiszek w bibliotece
- **Edycja inline**: Szybka edycja fiszki bez przechodzenia do osobnego widoku
- **Usuwanie**: Usunięcie fiszki z biblioteki (wpływa na harmonogram)
- **Dodawanie ręczne**: Tworzenie fiszki bez AI (przód/tył)

### 4. Powtórki
- System pokazuje fiszki do powtórki według harmonogramu SRS
- Użytkownik ocenia swoją znajomość fiszki
- Harmonogram aktualizuje się po każdej ocenie
- Sesja kończy się po przeglądnięciu wszystkich zaplanowanych fiszek

### 5. Wylogowanie
- Użytkownik kończy sesję i wraca do strony głównej
- Wszystkie funkcje wymagają ponownego logowania

## Kluczowe punkty decyzyjne

1. **Czy użytkownik ma konto?** → Rejestracja lub logowanie
2. **Czy dane są poprawne?** → Dostęp lub komunikat błędu
3. **Czy tekst w limicie?** → Generowanie lub błąd
4. **Czy generacja udana?** → Fiszki lub retry
5. **Jaką akcję wykonać na fiszce?** → Edycja, usunięcie lub przeglądanie
6. **Czy są fiszki do powtórki?** → Sesja lub komunikat
