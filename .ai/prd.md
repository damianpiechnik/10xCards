# Dokument wymagań produktu (PRD) - 10xCards

## 1. Przegląd produktu

10xCards to aplikacja webowa do szybkiego tworzenia i nauki fiszek dla studentów medycyny. Produkt umożliwia generowanie fiszek przez AI na podstawie wklejonego tekstu (głównie definicje i listy pojęć), ręczne tworzenie fiszek oraz przeglądanie, edycję i usuwanie fiszek. Każda fiszka ma przypisany harmonogram powtórek oparty o gotowy algorytm SRS, a format fiszek to pytanie i odpowiedź lub przód i tył. Użytkownik zarządza fiszkami w ramach konta (email + hasło). Priorytetem MVP jest szybkie generowanie fiszek z powtórkami oraz poprawność merytoryczna treści.

## 2. Problem użytkownika

Studenci medycyny potrzebują bardzo szybkiego sposobu na zamianę dużych porcji materiału w skuteczne fiszki, bez ręcznego przepisywania. Obecny proces jest czasochłonny, a tworzenie fiszek w dużej liczbie obniża motywację. Dodatkowo, jakość fiszek generowanych automatycznie bywa nierówna, więc potrzebna jest szybka edycja. Użytkownicy chcą też mieć pewność, że fiszki są powtarzane w odpowiednich odstępach czasu bez ręcznego planowania. Celem produktu jest szybkie generowanie fiszek wraz z powtórkami w formacie pytanie i odpowiedź lub przód i tył.

## 3. Wymagania funkcjonalne

**UWAGA**: Wszystkie poniższe funkcje wymagają uwierzytelnienia użytkownika. Aplikacja nie oferuje żadnych funkcjonalności dla niezalogowanych użytkowników.

1. Generowanie fiszek przez AI z wklejonego tekstu (wymaga logowania):
   - Limit wejścia: 1000 znaków.
   - Czas generacji: do 30 sekund.
   - Użytkownik ustawia liczbę fiszek i język (PL/EN).
   - Fiszki mają format pytanie i odpowiedź lub przód i tył.
2. Podstawowa edycja i zarządzanie (wymaga logowania):
   - Edycja fiszek inline.
   - Usuwanie fiszek.
   - Przeglądanie listy fiszek.
3. Ręczne tworzenie fiszek (wymaga logowania):
   - Tworzenie fiszek bez AI.
4. Konta użytkowników:
   - Rejestracja na email i hasło.
   - Logowanie i wylogowanie.
   - Reset hasła przez email.
5. Integracja z algorytmem powtórek (wymaga logowania):
   - Harmonogram powtórek przypisany do każdej fiszki.
   - System pokazuje fiszki do powtórki zgodnie z harmonogramem.

## 4. Granice produktu

1. Zakres MVP obejmuje 2–3 sprinty z priorytetem:
   - Generowanie AI.
   - Podstawowa edycja i zarządzanie fiszkami.
   - Integracja z gotowym algorytmem powtórek.
2. Poza zakresem MVP:
   - Podział na talie i zaawansowana struktura kolekcji fiszek.
   - Kategorie i filtrowanie.
   - Zbiorcza akceptacja i odrzucanie fiszek.
   - Podgląd źródła, zgłaszanie błędów i oznaczenia do poprawy.
   - Regeneracja pojedynczej fiszki oraz poziomy szczegółowości.
   - Panel metryk i telemetria jakości.
   - Szacunek liczby fiszek i przykładowe fiszki w UI.
   - Współdzielenie fiszek, marketplace, importy z zewnętrznych źródeł.
   - Aplikacje mobilne natywne.
   - Płatności i subskrypcje.
   - Zaawansowane systemy ról i autoryzacji wieloosobowej.
3. Ograniczenia operacyjne:
   - Limit wejścia 1000 znaków i maksymalny czas generacji 30 sekund.
   - Języki wejścia i wyjścia: PL i EN.
4. Ryzyka i mitigacje:
   - Techniczne: opóźnienia generacji AI powyżej 30 sekund. Właściciel: Tech Lead. Mitigacja: timeout, retry, komunikat błędu i ponowienie.
   - Jakościowe: błędy merytoryczne w fiszkach. Właściciel: PM. Mitigacja: szybka edycja inline, usuwanie fiszek, testy jakości.
   - UX: zbyt długi proces generacji. Właściciel: UX. Mitigacja: jasny stan ładowania i komunikat o czasie.

## 5. Historyjki użytkowników

- ID: US-001
  Tytuł: Rejestracja konta
  Opis: Jako użytkownik chcę założyć konto przez email i hasło, abym mógł zapisywać swoje fiszki.
  Kryteria akceptacji:
  - Użytkownik może podać email i hasło i utworzyć konto.
  - Po rejestracji użytkownik jest zalogowany i widzi pustą bibliotekę fiszek.
  - Błędny email lub zbyt słabe hasło blokuje rejestrację z komunikatem.

- ID: US-002
  Tytuł: Logowanie do aplikacji
  Opis: Jako użytkownik chcę się zalogować, aby mieć dostęp do moich fiszek.
  Kryteria akceptacji:
  - Użytkownik może zalogować się poprawnym emailem i hasłem.
  - Niepoprawne dane logowania wyświetlają komunikat błędu.
  - Po zalogowaniu użytkownik widzi swoje fiszki.

- ID: US-003
  Tytuł: Reset hasła
  Opis: Jako użytkownik chcę zresetować hasło przez email, aby odzyskać dostęp do konta.
  Kryteria akceptacji:
  - Użytkownik może zainicjować reset hasła podając email.
  - Użytkownik otrzymuje wiadomość email z linkiem resetu.
  - Link resetu pozwala ustawić nowe hasło i zalogować się.

- ID: US-004
  Tytuł: Wylogowanie
  Opis: Jako użytkownik chcę się wylogować, aby zabezpieczyć konto na współdzielonym urządzeniu.
  Kryteria akceptacji:
  - Użytkownik może się wylogować z każdego widoku aplikacji.
  - Po wylogowaniu sesja jest zakończona i wymaga ponownego logowania.

- ID: US-005
  Tytuł: Wklejenie tekstu do generacji
  Opis: Jako użytkownik chcę wkleić tekst źródłowy, aby wygenerować fiszki AI.
  Kryteria akceptacji:
  - Pole wejściowe akceptuje tekst do 1000 znaków.
  - Przekroczenie limitu uniemożliwia generację i pokazuje komunikat.

- ID: US-006
  Tytuł: Ustawienie parametrów generacji
  Opis: Jako użytkownik chcę ustawić liczbę fiszek i język, aby dostosować wynik do potrzeb.
  Kryteria akceptacji:
  - Użytkownik może wybrać liczbę fiszek.
  - Użytkownik może wybrać język PL lub EN.

- ID: US-007
  Tytuł: Generowanie fiszek AI
  Opis: Jako użytkownik chcę wygenerować fiszki AI, aby szybko rozpocząć naukę.
  Kryteria akceptacji:
  - Generacja rozpoczyna się po kliknięciu Generuj.
  - Użytkownik widzi stan ładowania.
  - Wynik pojawia się do 30 sekund lub pokazuje błąd.

- ID: US-008
  Tytuł: Obsługa błędu i czasu generacji
  Opis: Jako użytkownik chcę otrzymać komunikat i możliwość ponowienia, gdy generacja się nie powiedzie lub przekroczy czas.
  Kryteria akceptacji:
  - W przypadku błędu lub przekroczenia czasu użytkownik widzi komunikat.
  - Użytkownik może ponowić generację bez utraty wprowadzonych danych.

- ID: US-009
  Tytuł: Przeglądanie biblioteki fiszek
  Opis: Jako użytkownik chcę przeglądać swoje fiszki, aby zarządzać nauką.
  Kryteria akceptacji:
  - Biblioteka pokazuje listę fiszek z podstawowymi informacjami.
  - Użytkownik może przejść do edycji fiszki.

- ID: US-010
  Tytuł: Edycja fiszki inline
  Opis: Jako użytkownik chcę edytować fiszkę bez przechodzenia do osobnego ekranu.
  Kryteria akceptacji:
  - Użytkownik może edytować treść fiszki inline.
  - Zmiany są zapisywane i widoczne w bibliotece.

- ID: US-011
  Tytuł: Usuwanie fiszki
  Opis: Jako użytkownik chcę usuwać fiszki, które są nieaktualne.
  Kryteria akceptacji:
  - Użytkownik może usunąć fiszkę z biblioteki.
  - Usunięta fiszka nie pojawia się w harmonogramie powtórek.

- ID: US-012
  Tytuł: Ręczne dodanie fiszki
  Opis: Jako użytkownik chcę ręcznie utworzyć fiszkę, gdy nie korzystam z AI.
  Kryteria akceptacji:
  - Użytkownik może wprowadzić przód i tył fiszki.
  - Fiszki są zapisywane jako manualne (pole `is_manual` po stronie backendu), a `card_type` pozostaje `qa` lub `front_back`.

- ID: US-013
  Tytuł: Rozpoczęcie powtórek
  Opis: Jako użytkownik chcę rozpocząć powtórki zgodnie z harmonogramem, aby uczyć się efektywnie.
  Kryteria akceptacji:
  - System pokazuje fiszki do powtórki na podstawie harmonogramu.
  - Po zakończeniu sesji harmonogram aktualizuje się.

- ID: US-014
  Tytuł: Bezpieczny dostęp
  Opis: Jako użytkownik chcę mieć możliwość rejestracji i logowania się do systemu w sposób zapewniający bezpieczeństwo moich danych.
  Kryteria akceptacji:
  - Logowanie i rejestracja odbywają się na dedykowanych stronach.
  - Logowanie wymaga podania adresu email i hasła.
  - Rejestracja wymaga podania adresu email, hasła i potwierdzenia hasła.
  - WSZYSTKIE funkcje aplikacji (generowanie fiszek, biblioteka, powtórki) wymagają logowania - brak funkcjonalności dla niezalogowanych użytkowników.
  - Niezalogowany użytkownik próbujący wejść na chronione strony (/library, /generate, /reviews) jest przekierowywany na stronę logowania.
  - Użytkownik może logować się do systemu poprzez przycisk w prawym górnym rogu (widoczny dla niezalogowanych).
  - Użytkownik może się wylogować z systemu poprzez przycisk "Wyloguj się" w prawym górnym rogu w głównym Layout.astro (widoczny dla zalogowanych).
  - Nie korzystamy z zewnętrznych serwisów logowania (np. Google, GitHub).
  - Odzyskiwanie hasła przez email jest możliwe.

## 6. Metryki sukcesu

1. Zadowolenie użytkownika:
   - Co najmniej 80 procent wygenerowanych fiszek jest akceptowanych przez użytkownika.
2. Aktywność użytkowników:
   - Co najmniej 50 procent nowych użytkowników uruchamia powtórki w ciągu 7 dni.
3. Efektywność nauki:
   - Średnia liczba powtórek na użytkownika w pierwszych 7 dniach wynosi co najmniej 20.
