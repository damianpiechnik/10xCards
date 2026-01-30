# Architektura UI dla 10xCards

## 1. Przegląd struktury UI

Interfejs opiera się na trzech głównych zakładkach nawigacji: **Biblioteka**, **Generuj**, **Powtórki**. Aplikacja jest desktop-first, z responsywnym skalowaniem na tablet i telefon. Po rejestracji użytkownik trafia do pustej biblioteki z wyraźnym CTA do generacji. W całym UI obowiązuje spójny wzorzec listy z paginacją „Załaduj więcej”, stanem pustym oraz zapisem sortu/filtrów w URL. Statusy generacji są obsługiwane pollingiem, a błędy mają zestaw akcji „Ponów / Zaloguj się ponownie / Spróbuj później” bez utraty danych wejściowych.

Biblioteki i zarządzanie stanem:

- Komponenty UI: `shadcn/ui` (na bazie Radix UI) + Tailwind 4; ikony: `lucide-react`.
- Zarządzanie stanem: React hooks + Context dla stanu globalnego (sesja, preferencje UI), stan list/filtrów w URL; stan serwera obsługiwany przez warstwę usług API i lokalny cache w pamięci (bez dodatkowej biblioteki stanu).

Mapowanie wymagań na UI:

- Generowanie AI (limit 1000 znaków, do 30 s) → widok `Generuj`, ekran „Generacja w toku”, szczegóły generacji z retry.
- Zarządzanie fiszkami (lista, inline edit, usuwanie, manual create) → widok `Biblioteka`.
- Powtórki SRS → widok `Powtórki` z kolejką i sesją.
- Auth (rejestracja, logowanie, reset, wylogowanie) → widoki auth i akcja w nawigacji globalnej.

Zgodność z planem API:

- Widoki i akcje mapują się bezpośrednio na `/auth/*`, `/api/flashcards*`, `/api/generation-requests*`, `/api/reviews*`, `/api/profile`.
- Wszystkie listy wspierają `limit`, `cursor`, `sort` oraz odpowiednie filtry.
- Obsługa błędów 401/404/409/429/503 oraz timeoutów zgodnie z API.

## 2. Lista widoków

1. **Rejestracja**

- Ścieżka widoku: `/auth/sign-up`
- Główny cel: utworzenie konta i natychmiastowy dostęp do biblioteki.
- Kluczowe informacje do wyświetlenia: formularz email/hasło, walidacja, komunikaty błędów.
- Kluczowe komponenty widoku: formularz auth, komunikaty inline, przycisk „Załóż konto”.
- UX, dostępność i względy bezpieczeństwa: walidacja natychmiastowa, blokada akcji przy błędach, czytelne błędy; po sukcesie redirect do `Biblioteka`.

2. **Logowanie**

- Ścieżka widoku: `/auth/sign-in`
- Główny cel: dostęp do konta i biblioteki.
- Kluczowe informacje do wyświetlenia: email/hasło, link „Nie pamiętasz hasła?”.
- Kluczowe komponenty widoku: formularz auth, alert błędu, CTA „Zaloguj”.
- UX, dostępność i względy bezpieczeństwa: jasne błędy 401, bez ujawniania szczegółów; zachowanie focusu na błędnym polu.

3. **Reset hasła (inicjacja)**

- Ścieżka widoku: `/auth/reset-password`
- Główny cel: wysłanie linku resetu na email.
- Kluczowe informacje do wyświetlenia: pole email, status wysyłki.
- Kluczowe komponenty widoku: formularz email, potwierdzenie wysyłki.
- UX, dostępność i względy bezpieczeństwa: neutralny komunikat przy błędnym emailu (bez potwierdzania istnienia konta).

4. **Ustaw nowe hasło**

- Ścieżka widoku: `/auth/reset-password/confirm`
- Główny cel: ustawienie nowego hasła po kliknięciu w link.
- Kluczowe informacje do wyświetlenia: nowe hasło, potwierdzenie, status operacji.
- Kluczowe komponenty widoku: formularz hasła, komunikaty.
- UX, dostępność i względy bezpieczeństwa: obsługa nieprawidłowego tokenu, wymuszenie ponownego logowania.

5. **Biblioteka**

- Ścieżka widoku: `/library`
- Główny cel: zarządzanie fiszkami (lista, inline edit, usuwanie, dodanie manualne).
- Kluczowe informacje do wyświetlenia: lista fiszek, typ, data aktualizacji, stan pusty.
- Kluczowe komponenty widoku: lista fiszek z inline edit (tylko jedna edycja naraz), formularz dodania manualnego, CTA „Wygeneruj fiszki”, „Załaduj więcej”.
- UX, dostępność i względy bezpieczeństwa: blokada równoczesnej edycji, walidacja długości pól, potwierdzenie usuwania, obsługa 401 z CTA „Zaloguj się ponownie”.

6. **Generuj (proces 1–2–3)**

- Ścieżka widoku: `/generate`
- Główny cel: uruchomienie generacji AI z pełną kontrolą parametrów.
- Kluczowe informacje do wyświetlenia: pole tekstu (limit 1000), liczba fiszek, język, opis procesu.
- Kluczowe komponenty widoku: kroki 1–2–3, licznik znaków, walidacja inline, CTA „Generuj”.
- UX, dostępność i względy bezpieczeństwa: blokada akcji przy błędach, zachowanie danych przy błędach 429/503/timeout, wskaźniki ładowania.

7. **Generacja w toku**

- Ścieżka widoku: `/generation-requests/{id}/processing`
- Główny cel: informowanie o postępie i czasie oczekiwania.
- Kluczowe informacje do wyświetlenia: status, przewidywany czas, możliwość powrotu do biblioteki.
- Kluczowe komponenty widoku: status banner, przycisk „Wróć do biblioteki”, sekcja „Historia generacji”.
- UX, dostępność i względy bezpieczeństwa: polling stanu, komunikat o timeoutach, brak utraty danych.

8. **Szczegóły generacji**

- Ścieżka widoku: `/generation-requests/{id}`
- Główny cel: podgląd statusu, błędu i akcje „Ponów”.
- Kluczowe informacje do wyświetlenia: status, error_message, timestampy, liczba wyników.
- Kluczowe komponenty widoku: panel statusu, CTA „Ponów”, przełącznik „Zaawansowane” z logami.
- UX, dostępność i względy bezpieczeństwa: logi ukryte domyślnie, retry tylko przy statusie failed/timeout, obsługa 404.

9. **Historia generacji (lista)**

- Ścieżka widoku: `/generation-requests`
- Główny cel: przegląd wcześniejszych generacji i wejście w szczegóły.
- Kluczowe informacje do wyświetlenia: status, data, skrót wejścia, liczba fiszek.
- Kluczowe komponenty widoku: lista z filtrem statusu, „Załaduj więcej”.
- UX, dostępność i względy bezpieczeństwa: pamiętanie filtra w URL, stany pusty i błędu.

10. **Powtórki**

- Ścieżka widoku: `/reviews`
- Główny cel: uruchomienie sesji SRS i przegląd kolejki.
- Kluczowe informacje do wyświetlenia: liczba fiszek do powtórki, stan pusty.
- Kluczowe komponenty widoku: CTA „Rozpocznij powtórki”, lista kolejki.
- UX, dostępność i względy bezpieczeństwa: jasny komunikat gdy brak fiszek, obsługa 401.

11. **Sesja powtórek**

- Ścieżka widoku: `/reviews/session`
- Główny cel: prezentacja fiszek i zapis oceny (0–5).
- Kluczowe informacje do wyświetlenia: treść fiszki, postęp sesji.
- Kluczowe komponenty widoku: karta fiszki, przyciski ocen, skróty klawiaturowe.
- UX, dostępność i względy bezpieczeństwa: focus management, możliwość przerwania sesji bez utraty postępu.

Mapowanie historyjek użytkownika (PRD → widoki):

- US-001, US-002, US-003, US-004 → widoki auth + globalna akcja wylogowania.
- US-005, US-006, US-007, US-008 → `Generuj`, `Generacja w toku`, `Szczegóły generacji`.
- US-009, US-010, US-011, US-012 → `Biblioteka`.
- US-013 → `Powtórki`, `Sesja powtórek`.

## 3. Mapa podróży użytkownika

Główny przypadek użycia (generowanie i nauka):

1. Użytkownik rejestruje się lub loguje.
2. Trafia do `Biblioteka` (pusta biblioteka z CTA „Wygeneruj fiszki”).
3. Przechodzi do `Generuj`, wkleja tekst, ustawia parametry i uruchamia generację.
4. Widzi `Generacja w toku` z pollingiem statusu.
5. Po sukcesie przechodzi do `Szczegóły generacji` lub `Biblioteka` z nowymi fiszkami.
6. Edytuje inline wybrane fiszki i usuwa niechciane.
7. Przechodzi do `Powtórki` i uruchamia `Sesję powtórek`.
8. Po zakończeniu sesji wraca do `Powtórki` z aktualnym stanem.

Ścieżki alternatywne:

- Błąd/timeout generacji → komunikat + „Ponów” bez utraty danych.
- 401 na dowolnym widoku → wymuszone logowanie i powrót do ostatniego kontekstu.
- Brak fiszek do powtórki → stan pusty z CTA do generacji.

## 4. Układ i struktura nawigacji

- Główna nawigacja: trzy zakładki `Biblioteka`, `Generuj`, `Powtórki`, widoczne po zalogowaniu.
- Podnawigacja: w `Generuj` dostęp do `Historia generacji`.
- Globalne akcje: wylogowanie dostępne z każdego widoku.
- Routing:
  - Zalogowany użytkownik: `/` przekierowuje do `/library`.
  - Niezalogowany użytkownik: próba wejścia na `/library`, `/generate`, `/reviews` przekierowuje do `/auth/sign-in`.

## 5. Kluczowe komponenty

- `MainTabs` – trzy główne zakładki nawigacji, stan aktywny, dostępność klawiatury.
- `FlashcardList` – lista fiszek z paginacją „Załaduj więcej”, stan pusty i błędy.
- `InlineEditRow` – edycja jednej fiszki naraz, walidacja i blokada akcji.
- `GenerationForm` – pole tekstu z licznikiem znaków, parametry i walidacja.
- `GenerationStatus` – status, komunikaty timeout/błąd, akcja „Ponów”.
- `GenerationHistoryList` – lista żądań z filtrem statusu i paginacją.
- `ReviewCard` – karta fiszki z oceną 0–5 i skrótami klawiaturowymi.
- `ErrorBanner`/`Toast` – spójne komunikaty błędów z akcjami.
- `EmptyState` – stany pustej biblioteki i pustej kolejki powtórek z CTA.
