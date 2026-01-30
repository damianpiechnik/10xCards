# Specyfikacja techniczna modułu autentykacji - 10xCards

## Streszczenie wykonawcze

Niniejsza specyfikacja opisuje architekturę modułu autentykacji dla aplikacji 10xCards, która umożliwia tworzenie i naukę fiszek z wykorzystaniem AI. Moduł obejmuje rejestrację, logowanie, wylogowanie oraz odzyskiwanie hasła użytkowników w oparciu o stos technologiczny: Astro 5, React 19, TypeScript 5, Supabase Auth oraz Tailwind 4 z biblioteką Shadcn/ui.

Celem modułu jest zapewnienie bezpiecznego dostępu do prywatnych danych użytkowników (fiszek, historii generacji, harmonogramu powtórek) przy jednoczesnym zachowaniu prostoty UX i spójności z istniejącą architekturą aplikacji. Wszystkie funkcje wymagające autoryzacji (biblioteka fiszek, generowanie AI, powtórki) będą chronione przez middleware Astro, które weryfikuje sesję użytkownika z Supabase Auth. Użytkownik niezalogowany, próbujący uzyskać dostęp do chronionych zasobów, zostanie przekierowany na stronę logowania.

### Wyjaśnienie zakresu autentykacji

**WAŻNE**: Zgodnie z wymaganiami funkcjonalnymi PRD oraz modelem danych (wszystkie tabele wymagają `user_id`), **wszystkie funkcje aplikacji wymagają autentykacji**. W aplikacji nie ma funkcjonalności dostępnych dla niezalogowanych użytkowników. 

Użytkownik niezalogowany ma dostęp wyłącznie do widoków autentykacji (`/auth/sign-up`, `/auth/sign-in`, `/auth/reset-password`). Każda próba dostępu do funkcjonalności aplikacji (`/library`, `/generate`, `/reviews`) bez aktywnej sesji skutkuje automatycznym przekierowaniem na stronę logowania z zachowaniem informacji o docelowej lokalizacji.

---

## 1. ARCHITEKTURA INTERFEJSU UŻYTKOWNIKA

### 1.1 Przegląd struktury UI

Aplikacja działa w dwóch trybach widocznych dla użytkownika:

1. **Tryb niezalogowany (public)**: użytkownik ma dostęp wyłącznie do widoków autentykacji (`/auth/*`). Każda próba wejścia na chronione ścieżki (`/library`, `/generate`, `/reviews`) skutkuje przekierowaniem na `/auth/sign-in` z zachowaniem informacji o docelowej lokalizacji w parametrze `redirect`.

2. **Tryb zalogowany (authenticated)**: użytkownik ma dostęp do pełnej funkcjonalności aplikacji — biblioteki fiszek, generatora AI, powtórek SRS oraz swojego profilu. W prawym górnym rogu głównego layoutu wyświetlana jest sekcja „Użytkownik" z adresem email i przyciskiem wylogowania.

### 1.2 Mapa ścieżek i widoków

#### 1.2.1 Widoki publiczne (niezalogowany)

**Rejestracja** (`/auth/sign-up`)
- **Cel**: utworzenie nowego konta użytkownika z użyciem adresu email i hasła.
- **Kluczowe elementy UI**:
  - Formularz rejestracji z polami: email, hasło, potwierdzenie hasła.
  - Przycisk „Załóż konto".
  - Link „Masz już konto? Zaloguj się" prowadzący do `/auth/sign-in`.
- **Kluczowe komponenty**:
  - `SignUpPage.astro` (strona Astro, server-rendered)
  - `SignUpForm` (komponent React, client-side)
  - `EmailField`, `PasswordField`, `PasswordConfirmField` (komponenty Shadcn/ui lub custom)
  - `FormErrorBanner` (wyświetlanie błędów walidacji i API)
- **Walidacja**:
  - Email: wymagany, format email (regex RFC 5322 uproszczony), trim, lowercase.
  - Hasło: wymagane, min 8 znaków, max 72 znaki (zgodnie z bcrypt limit).
  - Potwierdzenie hasła: musi być identyczne z hasłem.
  - Walidacja inline (onChange/onBlur) oraz przed wysłaniem formularza.
- **Komunikaty błędów**:
  - 400 Bad Request → „Nieprawidłowy format danych. Sprawdź email i hasło."
  - 409 Conflict → „Użytkownik o podanym adresie email już istnieje."
  - 500 Internal Server Error → „Wystąpił błąd serwera. Spróbuj ponownie później."
  - Błąd sieci → „Nie można połączyć się z serwerem. Sprawdź połączenie internetowe."
- **Scenariusze UX**:
  - Po pomyślnej rejestracji użytkownik jest automatycznie logowany i przekierowany na `/library` (pusta biblioteka z CTA „Wygeneruj fiszki").
  - Przy błędzie użytkownik pozostaje na stronie, wartości pól są zachowane, a komunikat błędu wyświetla się w `FormErrorBanner` nad przyciskiem submit.

**Logowanie** (`/auth/sign-in`)
- **Cel**: uwierzytelnienie istniejącego użytkownika i uzyskanie dostępu do prywatnych funkcji aplikacji.
- **Kluczowe elementy UI**:
  - Formularz logowania z polami: email, hasło.
  - Przycisk „Zaloguj się".
  - Link „Nie pamiętasz hasła?" prowadzący do `/auth/reset-password`.
  - Link „Nie masz konta? Zarejestruj się" prowadzący do `/auth/sign-up`.
- **Kluczowe komponenty**:
  - `SignInPage.astro`
  - `SignInForm` (React)
  - `EmailField`, `PasswordField`
  - `FormErrorBanner`
- **Walidacja**:
  - Email: wymagany, format email, trim, lowercase.
  - Hasło: wymagane, min 8 znaków, max 72 znaki.
- **Komunikaty błędów**:
  - 401 Unauthorized → „Niepoprawny email lub hasło."
  - 400 Bad Request → „Nieprawidłowy format danych."
  - 500 Internal Server Error → „Wystąpił błąd serwera. Spróbuj ponownie później."
  - Błąd sieci → „Nie można połączyć się z serwerem."
- **Scenariusze UX**:
  - Po pomyślnym logowaniu użytkownik jest przekierowany na stronę, z której był przekierowany (parametr `redirect`), lub domyślnie na `/library`.
  - Przy błędzie komunikat wyświetla się w `FormErrorBanner`, dane w polach są zachowane, focus ustawiany jest na pierwszym błędnym polu.

**Reset hasła - inicjacja** (`/auth/reset-password`)
- **Cel**: zainicjowanie procesu odzyskiwania hasła przez wysłanie linku resetującego na adres email użytkownika.
- **Kluczowe elementy UI**:
  - Formularz z polem email.
  - Przycisk „Wyślij link resetujący".
  - Po wysłaniu: banner informacyjny „Jeśli konto o podanym adresie istnieje, otrzymasz email z linkiem do resetu hasła."
  - Link „Wróć do logowania" prowadzący do `/auth/sign-in`.
- **Kluczowe komponenty**:
  - `ResetPasswordPage.astro`
  - `ResetPasswordForm` (React)
  - `EmailField`
  - `FormInfoBanner` (informacja o wysłaniu)
  - `FormErrorBanner` (błędy walidacji)
- **Walidacja**:
  - Email: wymagany, format email, trim, lowercase.
- **Komunikaty**:
  - Sukces (200 OK) → „Jeśli konto o podanym adresie istnieje, otrzymasz email z linkiem do resetu hasła." (neutralny komunikat bez ujawniania istnienia konta).
  - 400 Bad Request → „Nieprawidłowy format adresu email."
  - 500 Internal Server Error → „Wystąpił błąd serwera. Spróbuj ponownie później."
- **Scenariusze UX**:
  - Po wysłaniu formularza przycisk submit jest zablokowany, a w jego miejscu pojawia się komunikat potwierdzający.
  - Użytkownik może kliknąć „Wróć do logowania" i wrócić na `/auth/sign-in`.

**Reset hasła - potwierdzenie** (`/auth/reset-password/confirm`)
- **Cel**: ustawienie nowego hasła po kliknięciu w link z emaila.
- **Kluczowe elementy UI**:
  - Formularz z polami: nowe hasło, potwierdzenie nowego hasła.
  - Przycisk „Ustaw nowe hasło".
  - Komunikat błędu, jeśli token jest nieprawidłowy lub wygasł.
- **Kluczowe komponenty**:
  - `ResetPasswordConfirmPage.astro`
  - `ResetPasswordConfirmForm` (React)
  - `PasswordField`, `PasswordConfirmField`
  - `FormErrorBanner`
- **Walidacja**:
  - Nowe hasło: min 8 znaków, max 72 znaki.
  - Potwierdzenie: musi być identyczne z nowym hasłem.
- **Komunikaty błędów**:
  - Token nieprawidłowy/wygasły → „Link resetujący jest nieprawidłowy lub wygasł. Zainicjuj reset hasła ponownie."
  - 400 Bad Request → „Nieprawidłowy format hasła."
  - 500 Internal Server Error → „Wystąpił błąd serwera."
- **Scenariusze UX**:
  - Po pomyślnym resecie użytkownik widzi komunikat „Hasło zostało zmienione pomyślnie. Możesz się teraz zalogować." i przycisk „Zaloguj się" prowadzący do `/auth/sign-in`.
  - Przy błędzie komunikat wyświetla się w `FormErrorBanner`, użytkownik może ponowić próbę lub wrócić do `/auth/reset-password`.

#### 1.2.2 Widoki prywatne (zalogowany)

Wszystkie widoki prywatne (`/library`, `/generate`, `/reviews`, `/profile`) są chronione przez middleware Astro, które weryfikuje sesję użytkownika. W przypadku braku sesji użytkownik jest przekierowany na `/auth/sign-in` z parametrem `redirect` wskazującym na docelową lokalizację.

**Główny layout z nawigacją** (`Layout.astro`)
- **Cel**: zapewnienie spójnej struktury dla widoków zalogowanego użytkownika.
- **Kluczowe elementy UI**:
  - Główna nawigacja (tabs): `Biblioteka`, `Generuj`, `Powtórki`.
  - Sekcja „Użytkownik" w prawym górnym rogu z avatarem/ikoną, adresem email oraz przyciskiem „Wyloguj się".
- **Kluczowe komponenty**:
  - `Layout.astro` (layout Astro z server-side rendering)
  - `MainNav` (React, client-side)
  - `UserMenu` (React, dropdown z opcjami: profil, wyloguj)
  - `SignOutButton` (React)
- **Scenariusze UX**:
  - Kliknięcie „Wyloguj się" wywołuje `POST /api/auth/sign-out`, po sukcesie użytkownik jest przekierowany na `/auth/sign-in` i sesja jest zakończona.
  - W razie błędu wylogowania (401/500) wyświetlany jest toast z komunikatem „Nie udało się wylogować. Spróbuj ponownie."

**Biblioteka** (`/library`)
- **Rozszerzenia dotyczące autentykacji**:
  - Widok wymaga uwierzytelnienia (middleware Astro sprawdza sesję).
  - Zapytania do API (`GET /api/flashcards`) wysyłane są z Bearer tokenem z sesji Supabase.
  - Przy błędzie 401 Unauthorized użytkownik widzi banner „Twoja sesja wygasła. Zaloguj się ponownie." i przycisk „Zaloguj się" przekierowujący na `/auth/sign-in` z parametrem `redirect=/library`.

**Generuj** (`/generate`)
- **Rozszerzenia dotyczące autentykacji**:
  - Widok wymaga uwierzytelnienia.
  - Zapytania do API (`POST /api/generation-requests`) wysyłane są z Bearer tokenem.
  - Przy 401 Unauthorized analogiczny banner jak w bibliotece.

**Powtórki** (`/reviews`)
- **Rozszerzenia dotyczące autentykacji**:
  - Widok wymaga uwierzytelnienia.
  - Zapytania do API (`GET /api/reviews/queue`, `POST /api/reviews/{id}`) wysyłane są z Bearer tokenem.
  - Przy 401 Unauthorized analogiczny banner jak w bibliotece.

**Profil** (`/profile`) — **[OPCJONALNY, POZA ZAKRESEM MVP]**
- **Cel**: wyświetlenie podstawowych danych użytkownika (email, data rejestracji).
- **Uwaga**: Ten widok nie jest wymagany przez żadne User Story w PRD i może zostać zaimplementowany w przyszłych iteracjach produktu. W MVP dane użytkownika są widoczne w `UserMenu` w prawym górnym rogu layoutu.
- **Kluczowe elementy UI** (jeśli zostanie zaimplementowany):
  - Sekcja z informacjami o koncie: email, data rejestracji.
  - (Opcjonalnie w przyszłości: zmiana hasła, usunięcie konta).
- **Kluczowe komponenty**:
  - `ProfilePage.astro`
  - `ProfileView` (React)
- **Zapytania API**:
  - `GET /api/profile` (endpoint zwraca `UserProfileDTO`).

### 1.3 Komponenty UI i ich odpowiedzialności

#### 1.3.1 Strony Astro (server-rendered)

**`SignUpPage.astro`**
- Ścieżka: `/auth/sign-up`
- Odpowiedzialność: server-side rendering strony rejestracji, osadzenie komponentu `SignUpForm`.
- Logika server-side:
  - Sprawdzenie, czy użytkownik jest już zalogowany (`context.locals.supabase.auth.getSession()`).
  - Jeśli zalogowany, przekierowanie na `/library`.
  - W przeciwnym razie renderowanie strony z formularzem.

**`SignInPage.astro`**
- Ścieżka: `/auth/sign-in`
- Odpowiedzialność: server-side rendering strony logowania, osadzenie komponentu `SignInForm`.
- Logika server-side:
  - Sprawdzenie, czy użytkownik jest już zalogowany.
  - Jeśli zalogowany, przekierowanie na `/library` lub na adres z parametru `redirect`.
  - W przeciwnym razie renderowanie strony.

**`ResetPasswordPage.astro`**
- Ścieżka: `/auth/reset-password`
- Odpowiedzialność: server-side rendering strony inicjacji resetu hasła, osadzenie komponentu `ResetPasswordForm`.

**`ResetPasswordConfirmPage.astro`**
- Ścieżka: `/auth/reset-password/confirm`
- Odpowiedzialność: server-side rendering strony potwierdzenia resetu hasła, osadzenie komponentu `ResetPasswordConfirmForm`.
- Logika server-side:
  - Wyciągnięcie tokenu resetu z query parameters (token przekazywany przez Supabase w linku z emaila).
  - Sprawdzenie ważności tokenu (opcjonalnie server-side pre-validation).
  - Renderowanie strony z formularzem.

**`Layout.astro`**
- Odpowiedzialność: główny layout dla widoków zalogowanego użytkownika.
- Logika server-side:
  - Sprawdzenie sesji użytkownika (`context.locals.supabase.auth.getSession()`).
  - Jeśli brak sesji, przekierowanie na `/auth/sign-in` z parametrem `redirect`.
  - Jeśli sesja istnieje, renderowanie layoutu z nawigacją i sekcją użytkownika.
  - Przekazanie danych użytkownika (email, user_id) do komponentów client-side przez props lub globalny Context.

#### 1.3.2 Komponenty React (client-side)

**`SignUpForm`**
- Odpowiedzialność: zarządzanie stanem formularza rejestracji, walidacja danych, wywołanie endpointu `/api/auth/sign-up`, obsługa błędów i przekierowanie po sukcesie.
- Stan lokalny:
  - `email` (string)
  - `password` (string)
  - `passwordConfirm` (string)
  - `fieldErrors` (object: `{ email?: string, password?: string, passwordConfirm?: string }`)
  - `formError` (string | null)
  - `isSubmitting` (boolean)
- Walidacja:
  - Email: sprawdzenie formatu przez regex, trim, lowercase.
  - Hasło: sprawdzenie długości (8–72), wymóg znaków specjalnych (opcjonalnie).
  - Potwierdzenie hasła: porównanie z polem hasło.
- Wywołanie API:
  - `POST /api/auth/sign-up` z body `{ email, password }` typu `AuthSignUpCommand`.
  - Odpowiedź 201 Created → `AuthResponseDTO` (user + session).
  - Sesja zapisywana w lokalnym storage lub Context (Supabase SDK zarządza sesją automatycznie).
  - Przekierowanie na `/library`.
- Obsługa błędów:
  - 400/409/500 → wyświetlenie komunikatu w `FormErrorBanner`.
  - Błąd sieci → wyświetlenie ogólnego komunikatu.

**`SignInForm`**
- Odpowiedzialność: zarządzanie stanem formularza logowania, walidacja danych, wywołanie endpointu `/api/auth/sign-in`, obsługa błędów i przekierowanie po sukcesie.
- Stan lokalny:
  - `email`, `password`, `fieldErrors`, `formError`, `isSubmitting`.
- Walidacja: analogiczna jak w `SignUpForm`.
- Wywołanie API:
  - `POST /api/auth/sign-in` z body `{ email, password }` typu `AuthSignInCommand`.
  - Odpowiedź 200 OK → `AuthResponseDTO`.
  - Przekierowanie na adres z parametru `redirect` lub domyślnie na `/library`.
- Obsługa błędów:
  - 401 → „Niepoprawny email lub hasło."
  - 400/500 → ogólne komunikaty.

**`ResetPasswordForm`**
- Odpowiedzialność: zarządzanie stanem formularza inicjacji resetu, walidacja emaila, wywołanie endpointu `/api/auth/reset-password`, wyświetlenie komunikatu potwierdzającego.
- Stan lokalny:
  - `email`, `fieldErrors`, `formError`, `isSubmitting`, `isSubmitted` (boolean).
- Walidacja: email wymagany, format email.
- Wywołanie API:
  - `POST /api/auth/reset-password` z body `{ email }` typu `AuthResetPasswordCommand`.
  - Odpowiedź 200 OK → `{ success: true }`.
  - Ustawienie `isSubmitted = true` i wyświetlenie komunikatu w `FormInfoBanner`.
- Obsługa błędów:
  - 400 → komunikat walidacyjny.
  - 404 → neutralny komunikat (bez ujawniania istnienia konta).
  - 500 → ogólny komunikat.

**`ResetPasswordConfirmForm`**
- Odpowiedzialność: zarządzanie stanem formularza potwierdzenia resetu, walidacja nowego hasła, wywołanie endpointu Supabase do resetu hasła z tokenem.
- Stan lokalny:
  - `password`, `passwordConfirm`, `fieldErrors`, `formError`, `isSubmitting`, `isSuccess` (boolean).
- Walidacja:
  - Nowe hasło: min 8, max 72 znaki.
  - Potwierdzenie: musi być identyczne.
- Wywołanie API:
  - Wywołanie Supabase SDK: `supabase.auth.updateUser({ password: newPassword })` (Supabase automatycznie weryfikuje token z URL).
  - Sukces → ustawienie `isSuccess = true` i wyświetlenie komunikatu z przyciskiem „Zaloguj się".
- Obsługa błędów:
  - Token nieprawidłowy/wygasł → komunikat z sugestią ponowienia procesu.
  - 400/500 → ogólne komunikaty.

**`MainNav`**
- Odpowiedzialność: renderowanie głównych zakładek nawigacji (`Biblioteka`, `Generuj`, `Powtórki`), obsługa stanu aktywnej zakładki, dostępność klawiatury.
- Props:
  - `activeTab` (string: 'library' | 'generate' | 'reviews')
- Logika:
  - Podświetlenie aktywnej zakładki.
  - Nawigacja przez kliknięcie lub klawiaturę (Enter/Space).

**`UserMenu`**
- Odpowiedzialność: renderowanie sekcji użytkownika w prawym górnym rogu layoutu z adresem email i przyciskiem wylogowania.
- Props:
  - `userEmail` (string)
- Komponenty potomne:
  - `SignOutButton`

**`SignOutButton`**
- Odpowiedzialność: obsługa wylogowania użytkownika, wywołanie endpointu `/api/auth/sign-out`, wyczyszczenie sesji, przekierowanie na `/auth/sign-in`.
- Stan lokalny:
  - `isSubmitting` (boolean)
- Wywołanie API:
  - `POST /api/auth/sign-out` z pustym body.
  - Odpowiedź 200 OK → `{ success: true }`.
  - Wyczyszczenie sesji w Supabase SDK: `supabase.auth.signOut()`.
  - Przekierowanie na `/auth/sign-in`.
- Obsługa błędów:
  - 401/500 → wyświetlenie toasta „Nie udało się wylogować. Spróbuj ponownie."

**`FormErrorBanner`**
- Odpowiedzialność: spójne wyświetlanie komunikatów błędów formularza.
- Props:
  - `error` (string | null)
- Logika:
  - Jeśli `error` nie jest null, renderowanie bannera z ikoną błędu i komunikatem.
  - Dostępność: role="alert", aria-live="assertive".

**`FormInfoBanner`**
- Odpowiedzialność: spójne wyświetlanie komunikatów informacyjnych (np. po wysłaniu linku resetu).
- Props:
  - `message` (string | null)
- Logika:
  - Renderowanie bannera z ikoną informacji i komunikatem.

### 1.4 Scenariusze walidacji i komunikatów błędów

#### 1.4.1 Walidacja inline (onChange/onBlur)

Wszystkie formularze autentykacji implementują walidację inline w celu poprawy UX i redukcji liczby błędów wysyłanych do serwera.

**Email:**
- Sprawdzenie formatu przez regex (uproszczone RFC 5322): `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.
- Trim i lowercase automatycznie stosowane przy onChange.
- Komunikat błędu: „Podaj prawidłowy adres email."

**Hasło:**
- Sprawdzenie długości: min 8, max 72 znaki.
- (Opcjonalnie) wymóg co najmniej jednej małej litery, jednej dużej, jednej cyfry i jednego znaku specjalnego.
- Komunikat błędu: „Hasło musi mieć od 8 do 72 znaków."

**Potwierdzenie hasła:**
- Porównanie z polem hasło.
- Komunikat błędu: „Hasła muszą być identyczne."

#### 1.4.2 Walidacja server-side i odpowiedzi API

Walidacja server-side jest realizowana przez Supabase Auth oraz custom middleware Astro (dla endpointów `/api/*`).

**Kody HTTP i komunikaty:**
- **200 OK**: operacja zakończona sukcesem (logowanie, reset hasła, wylogowanie).
- **201 Created**: rejestracja zakończona sukcesem.
- **400 Bad Request**: nieprawidłowy format danych (błąd walidacji). Odpowiedź zawiera szczegóły błędów w formacie JSON: `{ error: string, details?: object }`.
- **401 Unauthorized**: nieprawidłowe dane logowania lub brak/nieprawidłowa sesja.
- **409 Conflict**: użytkownik o podanym emailu już istnieje (rejestracja).
- **404 Not Found**: zasób nie istnieje (np. token resetu wygasł).
- **500 Internal Server Error**: błąd serwera (np. problem z bazą danych, Supabase niedostępny).

Komunikaty błędów są mapowane w komponentach React na czytelne komunikaty w języku polskim.

### 1.5 Obsługa najważniejszych scenariuszy

#### Scenariusz 1: Nowy użytkownik rejestruje się i tworzy pierwsze fiszki

1. Użytkownik wchodzi na stronę główną `/` lub dowolną chronioną ścieżkę (niezalogowany).
2. Middleware Astro wykrywa brak sesji i przekierowuje na `/auth/sign-in` z parametrem `redirect`.
3. Użytkownik widzi stronę logowania z linkiem „Nie masz konta? Zarejestruj się".
4. Użytkownik klika link → przekierowanie na `/auth/sign-up`.
5. Użytkownik wypełnia formularz (email, hasło, potwierdzenie hasła) i klika „Załóż konto".
6. `SignUpForm` waliduje dane lokalnie, wysyła `POST /api/auth/sign-up`.
7. API zwraca 201 Created z `AuthResponseDTO` (user + session).
8. Supabase SDK zapisuje sesję (access_token, refresh_token) w localStorage.
9. `SignUpForm` przekierowuje na `/library`.
10. Middleware Astro w `/library` sprawdza sesję, zatwierdza, renderuje stronę.
11. Użytkownik widzi pustą bibliotekę z CTA „Wygeneruj fiszki" i przechodzi do `/generate`.

#### Scenariusz 2: Istniejący użytkownik loguje się

1. Użytkownik wchodzi na `/auth/sign-in`.
2. Wypełnia formularz (email, hasło) i klika „Zaloguj się".
3. `SignInForm` waliduje dane, wysyła `POST /api/auth/sign-in`.
4. API zwraca 200 OK z `AuthResponseDTO`.
5. Sesja zapisywana przez Supabase SDK.
6. `SignInForm` przekierowuje na `/library` (lub na adres z parametru `redirect`).
7. Użytkownik widzi swoje fiszki.

#### Scenariusz 3: Użytkownik zapomniał hasła

1. Użytkownik na stronie `/auth/sign-in` klika „Nie pamiętasz hasła?" → przekierowanie na `/auth/reset-password`.
2. Użytkownik podaje email i klika „Wyślij link resetujący".
3. `ResetPasswordForm` wysyła `POST /api/auth/reset-password`.
4. API zwraca 200 OK.
5. Wyświetlany jest komunikat „Jeśli konto o podanym adresie istnieje, otrzymasz email z linkiem do resetu hasła."
6. Użytkownik otrzymuje email z linkiem zawierającym token (np. `/auth/reset-password/confirm?token=xyz`).
7. Użytkownik klika w link, przechodzi na `/auth/reset-password/confirm`.
8. `ResetPasswordConfirmForm` wyciąga token z URL, użytkownik wpisuje nowe hasło i potwierdzenie.
9. `ResetPasswordConfirmForm` wywołuje `supabase.auth.updateUser({ password })`.
10. Supabase weryfikuje token i aktualizuje hasło.
11. Wyświetlany jest komunikat „Hasło zostało zmienione pomyślnie. Możesz się teraz zalogować."
12. Użytkownik klika „Zaloguj się" → przekierowanie na `/auth/sign-in`.

#### Scenariusz 4: Użytkownik wylogowuje się

1. Użytkownik jest na dowolnym widoku zalogowanym (np. `/library`).
2. W prawym górnym rogu layoutu klika „Wyloguj się".
3. `SignOutButton` wywołuje `POST /api/auth/sign-out`.
4. API zwraca 200 OK.
5. `SignOutButton` wywołuje `supabase.auth.signOut()` (wyczyszczenie sesji lokalnie).
6. Użytkownik jest przekierowany na `/auth/sign-in`.

#### Scenariusz 5: Sesja użytkownika wygasa podczas pracy

1. Użytkownik jest zalogowany i pracuje w aplikacji (np. przegląda bibliotekę).
2. Sesja wygasa (np. po 1 godzinie bezczynności).
3. Użytkownik wykonuje akcję wymagającą autoryzacji (np. edycja fiszki).
4. Request do API (`PATCH /api/flashcards/{id}`) zwraca 401 Unauthorized.
5. Komponent obsługujący request wyświetla banner „Twoja sesja wygasła. Zaloguj się ponownie." z przyciskiem „Zaloguj się".
6. Kliknięcie przycisku przekierowuje na `/auth/sign-in?redirect=/library`.
7. Po ponownym logowaniu użytkownik wraca na `/library` i może kontynuować pracę.

---

## 2. LOGIKA BACKENDOWA

### 2.1 Struktura endpointów API

Wszystkie endpointy autentykacji są umieszczone w katalogu `src/pages/api/auth/` i wykorzystują Supabase Auth do zarządzania użytkownikami i sesjami.

#### 2.1.1 `POST /api/auth/sign-up`

**Opis:** Rejestracja nowego użytkownika.

**Request:**
- Method: `POST`
- Content-Type: `application/json`
- Body: `AuthSignUpCommand`
  ```typescript
  {
    email: string;      // wymagany, format email, trim, lowercase
    password: string;   // wymagany, 8–72 znaki
  }
  ```

**Response:**
- Success: `201 Created`
  ```typescript
  {
    user: {
      user_id: string;  // UUID
      email: string;
    },
    session: {
      user_id: string;
      access_token: string;
      refresh_token: string;
      expires_at: string; // ISO 8601
    }
  }
  ```
- Errors:
  - `400 Bad Request`: nieprawidłowy format danych (email lub hasło).
    ```json
    { "error": "Nieprawidłowy format danych." }
    ```
  - `409 Conflict`: użytkownik o podanym emailu już istnieje.
    ```json
    { "error": "Użytkownik o podanym adresie email już istnieje." }
    ```
  - `500 Internal Server Error`: błąd serwera.
    ```json
    { "error": "Wystąpił błąd serwera." }
    ```

**Logika backendu:**
1. Walidacja danych wejściowych (email format, hasło 8–72 znaków) przez schemat Zod.
2. Wywołanie `context.locals.supabase.auth.signUp({ email, password })`.
3. Supabase tworzy użytkownika w tabeli `auth.users` i zwraca obiekt `user` oraz `session`.
4. Utworzenie rekordu w tabeli `user_profiles` (trigger Supabase lub custom logic):
   ```sql
   INSERT INTO user_profiles (user_id, email, created_at)
   VALUES (auth.uid(), email, now());
   ```
5. Zwrócenie `AuthResponseDTO` z kodem 201.

**Kontrakt danych:**
- Input: `AuthSignUpCommand` (zgodnie z `src/types.ts`).
- Output: `AuthResponseDTO`.

#### 2.1.2 `POST /api/auth/sign-in`

**Opis:** Logowanie istniejącego użytkownika.

**Request:**
- Method: `POST`
- Content-Type: `application/json`
- Body: `AuthSignInCommand`
  ```typescript
  {
    email: string;
    password: string;
  }
  ```

**Response:**
- Success: `200 OK`
  ```typescript
  AuthResponseDTO // { user, session }
  ```
- Errors:
  - `401 Unauthorized`: nieprawidłowy email lub hasło.
    ```json
    { "error": "Niepoprawny email lub hasło." }
    ```
  - `400 Bad Request`: nieprawidłowy format danych.
  - `500 Internal Server Error`: błąd serwera.

**Logika backendu:**
1. Walidacja danych wejściowych (schemat Zod).
2. Wywołanie `context.locals.supabase.auth.signInWithPassword({ email, password })`.
3. Supabase weryfikuje dane logowania i zwraca `user` oraz `session`.
4. Zwrócenie `AuthResponseDTO` z kodem 200.

**Kontrakt danych:**
- Input: `AuthSignInCommand`.
- Output: `AuthResponseDTO`.

#### 2.1.3 `POST /api/auth/sign-out`

**Opis:** Wylogowanie użytkownika (zakończenie sesji).

**Request:**
- Method: `POST`
- Content-Type: `application/json`
- Body: `AuthSignOutCommand` (pusty obiekt `{}`)
- Headers: `Authorization: Bearer <access_token>`

**Response:**
- Success: `200 OK`
  ```json
  { "success": true }
  ```
- Errors:
  - `401 Unauthorized`: brak lub nieprawidłowy token.
  - `500 Internal Server Error`: błąd serwera.

**Logika backendu:**
1. Weryfikacja tokenu (middleware Astro sprawdza `context.locals.supabase.auth.getSession()`).
2. Wywołanie `context.locals.supabase.auth.signOut()`.
3. Supabase anuluje sesję (access_token i refresh_token stają się nieważne).
4. Zwrócenie `{ success: true }` z kodem 200.

**Kontrakt danych:**
- Input: `AuthSignOutCommand` (pusty).
- Output: `SuccessResponseDTO`.

#### 2.1.4 `POST /api/auth/reset-password`

**Opis:** Inicjacja resetu hasła (wysłanie linku resetu na email).

**Request:**
- Method: `POST`
- Content-Type: `application/json`
- Body: `AuthResetPasswordCommand`
  ```typescript
  {
    email: string;
  }
  ```

**Response:**
- Success: `200 OK`
  ```json
  { "success": true }
  ```
- Errors:
  - `400 Bad Request`: nieprawidłowy format emaila.
  - `404 Not Found`: konto nie istnieje (w praktyce Supabase zwraca 200 dla bezpieczeństwa, aby nie ujawniać istnienia konta).
  - `500 Internal Server Error`: błąd serwera.

**Logika backendu:**
1. Walidacja emaila (schemat Zod).
2. Wywołanie `context.locals.supabase.auth.resetPasswordForEmail(email, { redirectTo: `${import.meta.env.PUBLIC_APP_URL}/auth/reset-password/confirm` })`.
   - `PUBLIC_APP_URL` powinien być skonfigurowany w zmiennych środowiskowych (np. `https://10xcards.com` dla produkcji, `http://localhost:3000` dla developmentu).
3. Supabase wysyła email z linkiem zawierającym token resetu.
4. Zwrócenie `{ success: true }` z kodem 200 (niezależnie od tego, czy konto istnieje).

**Kontrakt danych:**
- Input: `AuthResetPasswordCommand`.
- Output: `SuccessResponseDTO`.

**Uwaga:** Endpoint nie potwierdza istnienia konta w odpowiedzi, aby nie ujawniać informacji o użytkownikach.

#### 2.1.5 Aktualizacja hasła (Supabase SDK, bez dedykowanego endpointu)

Reset hasła (potwierdzenie) jest obsługiwany bezpośrednio przez Supabase SDK w komponencie `ResetPasswordConfirmForm` poprzez wywołanie `supabase.auth.updateUser({ password: newPassword })`. Token resetu jest automatycznie wyciągany z URL przez Supabase SDK.

**Logika:**
1. Użytkownik klika w link z emaila (np. `/auth/reset-password/confirm?token=xyz`).
2. Supabase SDK automatycznie rozpoznaje token w URL i ustawia sesję tymczasową.
3. Komponent `ResetPasswordConfirmForm` wywołuje `supabase.auth.updateUser({ password })`.
4. Supabase weryfikuje token i aktualizuje hasło w `auth.users`.
5. Zwrócenie sukcesu lub błędu (token wygasł/nieprawidłowy).

### 2.2 Mechanizm walidacji danych wejściowych

Wszystkie endpointy API wykorzystują **Zod** do walidacji danych wejściowych. Zod zapewnia type-safe walidację i automatyczne mapowanie błędów.

#### 2.2.1 Schematy Zod dla komend autentykacji

**`AuthSignUpCommandSchema`**
```typescript
import { z } from 'zod';

export const AuthSignUpCommandSchema = z.object({
  email: z.string()
    .min(1, 'Email jest wymagany.')
    .email('Podaj prawidłowy adres email.')
    .trim()
    .toLowerCase(),
  password: z.string()
    .min(8, 'Hasło musi mieć co najmniej 8 znaków.')
    .max(72, 'Hasło może mieć maksymalnie 72 znaki.'),
});
```

**`AuthSignInCommandSchema`**
```typescript
export const AuthSignInCommandSchema = z.object({
  email: z.string()
    .min(1, 'Email jest wymagany.')
    .email('Podaj prawidłowy adres email.')
    .trim()
    .toLowerCase(),
  password: z.string()
    .min(8, 'Hasło musi mieć co najmniej 8 znaków.')
    .max(72, 'Hasło może mieć maksymalnie 72 znaki.'),
});
```

**`AuthResetPasswordCommandSchema`**
```typescript
export const AuthResetPasswordCommandSchema = z.object({
  email: z.string()
    .min(1, 'Email jest wymagany.')
    .email('Podaj prawidłowy adres email.')
    .trim()
    .toLowerCase(),
});
```

#### 2.2.2 Walidacja w endpointach

Każdy endpoint parsuje dane wejściowe przez odpowiedni schemat Zod przed wywołaniem logiki biznesowej.

**Przykład walidacji w `sign-up.ts`:**
```typescript
import type { APIRoute } from 'astro';
import { AuthSignUpCommandSchema } from '@/lib/validation/auth.schemas';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parsowanie body
    const body = await request.json();
    
    // Walidacja przez Zod
    const validatedData = AuthSignUpCommandSchema.parse(body);
    
    // Wywołanie Supabase Auth
    const { data, error } = await locals.supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
    });
    
    if (error) {
      // Mapowanie błędów Supabase na kody HTTP
      if (error.message.includes('already registered')) {
        return new Response(JSON.stringify({ error: 'Użytkownik o podanym adresie email już istnieje.' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Wystąpił błąd serwera.' }), { status: 500 });
    }
    
    // Zwrócenie odpowiedzi
    return new Response(JSON.stringify({
      user: { user_id: data.user!.id, email: data.user!.email },
      session: {
        user_id: data.session!.user.id,
        access_token: data.session!.access_token,
        refresh_token: data.session!.refresh_token,
        expires_at: new Date(data.session!.expires_at! * 1000).toISOString(),
      },
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Obsługa błędów walidacji Zod
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({
        error: 'Nieprawidłowy format danych.',
        details: error.errors,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Obsługa innych błędów
    return new Response(JSON.stringify({ error: 'Wystąpił błąd serwera.' }), { status: 500 });
  }
};
```

### 2.3 Obsługa wyjątków

#### 2.3.1 Kategorie błędów

1. **Błędy walidacji** (400 Bad Request):
   - Nieprawidłowy format emaila.
   - Hasło zbyt krótkie lub zbyt długie.
   - Brakujące pola wymagane.

2. **Błędy autoryzacji** (401 Unauthorized):
   - Nieprawidłowe dane logowania.
   - Brak tokenu w nagłówku `Authorization`.
   - Token wygasł lub jest nieprawidłowy.

3. **Błędy konfliktu** (409 Conflict):
   - Użytkownik o podanym emailu już istnieje (rejestracja).

4. **Błędy zasobu nie znalezionego** (404 Not Found):
   - Token resetu hasła wygasł lub jest nieprawidłowy (w praktyce Supabase zwraca 400).

5. **Błędy serwera** (500 Internal Server Error):
   - Problem z połączeniem do Supabase.
   - Błąd bazy danych.
   - Nieobsłużony wyjątek.

#### 2.3.2 Mapowanie błędów Supabase na odpowiedzi HTTP

Supabase Auth zwraca błędy w formacie `{ error: { message: string, status: number } }`. Endpointy API mapują te błędy na odpowiednie kody HTTP i komunikaty w języku polskim.

**Przykładowe mapowanie:**
- `"User already registered"` → 409 Conflict, komunikat: „Użytkownik o podanym adresie email już istnieje."
- `"Invalid login credentials"` → 401 Unauthorized, komunikat: „Niepoprawny email lub hasło."
- `"Email not confirmed"` → 401 Unauthorized (jeśli wymagane potwierdzenie emaila).
- Inne błędy → 500 Internal Server Error, komunikat: „Wystąpił błąd serwera."

#### 2.3.3 Logging błędów

Wszystkie błędy serwera (500) są logowane w konsoli serwera (Astro) z pełnym stack trace'em dla celów debugowania. Użytkownikowi zwracany jest ogólny komunikat bez szczegółów technicznych.

**Przykład logowania:**
```typescript
console.error('[AUTH ERROR] sign-up:', error);
```

### 2.4 Aktualizacja renderowania stron server-side

#### 2.4.1 Middleware Astro dla ochrony chronionych ścieżek

Middleware Astro (`src/middleware/index.ts`) jest rozszerzone o logikę weryfikacji sesji użytkownika dla chronionych ścieżek.

**Aktualizacja `src/middleware/index.ts`:**
```typescript
import { defineMiddleware } from "astro:middleware";
import { supabaseClient } from "../db/supabase.client.ts";

const protectedPaths = ['/library', '/generate', '/reviews'];
// Nota: '/profile' jest opcjonalny i może zostać dodany w przyszłości
const authPaths = ['/auth/sign-in', '/auth/sign-up', '/auth/reset-password'];

export const onRequest = defineMiddleware(async (context, next) => {
  // Udostępnienie klienta Supabase w context.locals
  context.locals.supabase = supabaseClient;
  
  const { pathname } = context.url;
  
  // Sprawdzenie sesji użytkownika
  const { data: { session }, error } = await context.locals.supabase.auth.getSession();
  
  // Jeśli użytkownik wchodzi na stronę główną bez sesji, przekieruj na logowanie
  if (pathname === '/' && !session) {
    return context.redirect('/auth/sign-in');
  }
  
  // Jeśli użytkownik wchodzi na stronę główną z sesją, przekieruj na bibliotekę
  if (pathname === '/' && session) {
    return context.redirect('/library');
  }
  
  // Jeśli użytkownik próbuje wejść na chronioną ścieżkę bez sesji
  if (protectedPaths.some(path => pathname.startsWith(path))) {
    if (!session) {
      // Przekierowanie na logowanie z parametrem redirect
      return context.redirect(`/auth/sign-in?redirect=${encodeURIComponent(pathname)}`);
    }
  }
  
  // Jeśli użytkownik jest zalogowany i próbuje wejść na stronę auth
  if (authPaths.some(path => pathname.startsWith(path))) {
    if (session) {
      // Przekierowanie na bibliotekę
      return context.redirect('/library');
    }
  }
  
  // Udostępnienie sesji i użytkownika w context.locals
  context.locals.session = session;
  context.locals.user = session?.user || null;
  
  return next();
});
```

**Rozszerzenie typu `Astro.Locals`:**

Aby TypeScript rozpoznawał nowe właściwości w `context.locals`, należy rozszerzyć typ `Astro.Locals` w pliku `src/env.d.ts`:

```typescript
/// <reference types="astro/client" />

import type { SupabaseClient, Session, User } from '@supabase/supabase-js';
import type { Database } from './db/database.types';

declare namespace App {
  interface Locals {
    supabase: SupabaseClient<Database>;
    session: Session | null;
    user: User | null;
  }
}
```

#### 2.4.2 Server-side rendering w stronach Astro

Strony Astro mogą teraz korzystać z `Astro.locals.session` i `Astro.locals.user` do warunkowego renderowania treści.

**Przykład w `Layout.astro`:**
```astro
---
import { ViewTransitions } from 'astro:transitions';

const { session, user } = Astro.locals;

// Jeśli brak sesji, middleware już przekierował, więc tutaj sesja zawsze istnieje dla chronionych ścieżek
---

<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>10xCards</title>
  <ViewTransitions />
</head>
<body>
  <header>
    <nav>
      <MainNav client:load />
      <UserMenu userEmail={user?.email} client:load />
    </nav>
  </header>
  <main>
    <slot />
  </main>
</body>
</html>
```

**Przykład w `SignInPage.astro`:**
```astro
---
import SignInForm from '@/components/auth/SignInForm';

const { session } = Astro.locals;

// Jeśli użytkownik jest już zalogowany, przekieruj
if (session) {
  const redirect = Astro.url.searchParams.get('redirect') || '/library';
  return Astro.redirect(redirect);
}
---

<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <title>Logowanie - 10xCards</title>
</head>
<body>
  <div class="auth-container">
    <h1>Zaloguj się</h1>
    <SignInForm client:load />
  </div>
</body>
</html>
```

#### 2.4.3 Aktualizacja konfiguracji Astro

Konfiguracja Astro (`astro.config.mjs`) już wspiera `output: "server"` i adapter `@astrojs/node` w trybie `standalone`, co pozwala na server-side rendering wszystkich stron. Brak dodatkowych zmian w konfiguracji.

---

## 3. SYSTEM AUTENTYKACJI

### 3.1 Wykorzystanie Supabase Auth w połączeniu z Astro

Supabase Auth zapewnia kompletne rozwiązanie do zarządzania użytkownikami, sesjami i bezpiecznym przechowywaniem haseł. Integracja z Astro odbywa się poprzez Supabase JavaScript SDK (`@supabase/supabase-js`).

#### 3.1.1 Konfiguracja Supabase Client

**Plik `src/db/supabase.client.ts`:**
```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.ts";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Automatyczne rozpoznawanie tokenów w URL (np. reset hasła)
  },
});

export type SupabaseClient = typeof supabaseClient;
```

**Zmienne środowiskowe (`.env`):**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
PUBLIC_APP_URL=http://localhost:3000
```

**Nota**: `PUBLIC_APP_URL` jest używany w procesie resetu hasła do generowania linków zwrotnych. W środowisku produkcyjnym powinien wskazywać na domenę produkcyjną (np. `https://10xcards.com`).

#### 3.1.2 Architektura sesji

**Server-side (Astro middleware):**
- Middleware sprawdza sesję przy każdym żądaniu do chronionej ścieżki poprzez `supabase.auth.getSession()`.
- Sesja jest przechowywana w `context.locals.session` i dostępna w stronach Astro.
- Brak sesji → przekierowanie na `/auth/sign-in`.

**Client-side (React components):**
- Komponenty React korzystają z Supabase SDK do zarządzania sesjami (logowanie, rejestracja, wylogowanie).
- Sesja jest automatycznie zapisywana w `localStorage` przez Supabase SDK (opcja `persistSession: true`).
- Access token jest automatycznie odświeżany przez Supabase SDK (opcja `autoRefreshToken: true`).

**Flow sesji:**
1. Użytkownik loguje się przez `POST /api/auth/sign-in`.
2. Supabase zwraca `access_token` i `refresh_token` w odpowiedzi.
3. Supabase SDK automatycznie zapisuje tokeny w `localStorage`.
4. Każde zapytanie do API (`/api/flashcards`, `/api/generation-requests`, itp.) zawiera `Authorization: Bearer <access_token>` w nagłówku (automatycznie dodawane przez Supabase SDK lub custom interceptor w Axios/Fetch).
5. Middleware Astro na serwerze weryfikuje token i ustawia `context.locals.session`.
6. Po wygaśnięciu `access_token` (domyślnie 1 godzina), Supabase SDK automatycznie odświeża token przy użyciu `refresh_token`.
7. Po wylogowaniu (`POST /api/auth/sign-out`) Supabase SDK usuwa tokeny z `localStorage`.

#### 3.1.3 Row Level Security (RLS)

Supabase wspiera Row Level Security (RLS) w PostgreSQL, co oznacza, że polityki dostępu do danych są wymuszone na poziomie bazy danych.

**Polityki RLS dla tabel związanych z użytkownikiem:**

Wszystkie tabele aplikacyjne (`user_profiles`, `flashcards`, `generation_requests`, `generation_request_logs`) mają włączone RLS i polityki właścicielskie:

```sql
-- Przykład polityki dla tabeli flashcards
CREATE POLICY flashcards_select_authenticated
  ON public.flashcards
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY flashcards_insert_authenticated
  ON public.flashcards
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY flashcards_update_authenticated
  ON public.flashcards
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY flashcards_delete_authenticated
  ON public.flashcards
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

**Polityki dla roli `anon` (niezalogowany użytkownik):**

Wszystkie tabele aplikacyjne mają polityki blokujące dostęp dla roli `anon`:

```sql
CREATE POLICY flashcards_select_anon
  ON public.flashcards
  FOR SELECT
  TO anon
  USING (false);

-- Analogicznie dla INSERT, UPDATE, DELETE
```

Dzięki RLS nawet jeśli użytkownik w jakiś sposób uzyska dostęp do API bez sesji, zapytania do bazy danych zostaną zablokowane na poziomie PostgreSQL.

#### 3.1.4 Automatyczne tworzenie profilu użytkownika

Po rejestracji nowego użytkownika w `auth.users`, należy utworzyć odpowiadający rekord w tabeli `user_profiles`. Można to zrealizować na dwa sposoby:

**Sposób 1: Trigger PostgreSQL (zalecany)**

Utworzenie triggera, który automatycznie tworzy rekord w `user_profiles` po dodaniu użytkownika do `auth.users`:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, created_at)
  VALUES (NEW.id, NEW.email, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**Sposób 2: Logika w endpoincie `sign-up.ts`**

Alternatywnie, można ręcznie utworzyć rekord w `user_profiles` w endpoincie po pomyślnej rejestracji:

```typescript
// Po pomyślnym wywołaniu supabase.auth.signUp
const { data: profileData, error: profileError } = await locals.supabase
  .from('user_profiles')
  .insert({
    user_id: data.user!.id,
    email: data.user!.email!,
    created_at: new Date().toISOString(),
  });

if (profileError) {
  console.error('[AUTH ERROR] Failed to create user profile:', profileError);
  // Opcjonalnie: rollback użytkownika z auth.users lub zignorowanie błędu
}
```

Zaleca się **Sposób 1** (trigger), aby zapewnić spójność danych niezależnie od źródła rejestracji (API, Supabase Dashboard, itp.).

### 3.2 Bezpieczeństwo

#### 3.2.1 Przechowywanie haseł

Hasła użytkowników są automatycznie hashowane przez Supabase Auth przy użyciu algorytmu **bcrypt** przed zapisaniem w bazie danych. Aplikacja nigdy nie ma dostępu do plaintext haseł.

#### 3.2.2 Tokeny sesji

- **Access token**: JWT podpisany przez Supabase, zawiera `user_id`, `email`, `role` oraz `exp` (czas wygaśnięcia). Domyślny czas życia: 1 godzina.
- **Refresh token**: długotrwały token przechowywany w `localStorage`, używany do odświeżania `access_token` po wygaśnięciu. Domyślny czas życia: 30 dni (konfigurowalny w Supabase Dashboard).

Tokeny są przesyłane przez HTTPS, co zapobiega przechwyceniu przez ataki man-in-the-middle.

#### 3.2.3 CSRF Protection

Supabase SDK automatycznie zabezpiecza przed atakami CSRF poprzez weryfikację origin nagłówków w requestach. Dodatkowo, tokeny JWT są podpisane i nie mogą być podrobione bez znajomości klucza prywatnego Supabase.

#### 3.2.4 Rate Limiting

Supabase Auth domyślnie implementuje rate limiting na endpointach autentykacji (logowanie, rejestracja, reset hasła), aby zapobiec atakom brute-force. Limity są konfigurowalne w Supabase Dashboard.

Dodatkowo, aplikacja może zaimplementować własne rate limiting na poziomie Astro middleware dla dodatkowej ochrony (np. maksymalnie 5 prób logowania na minutę na IP).

#### 3.2.5 Email Verification (opcjonalne)

Supabase Auth wspiera weryfikację emaila po rejestracji. Użytkownik otrzymuje email z linkiem aktywacyjnym, a dopóki nie kliknie w link, jego konto ma flagę `email_confirmed = false`. Aplikacja może wymuszać weryfikację emaila przed dostępem do chronionych funkcji.

W MVP weryfikacja emaila jest **opcjonalna** i może zostać włączona w przyszłości poprzez konfigurację w Supabase Dashboard.

### 3.3 Obsługa błędów autentykacji

#### 3.3.1 Wygaśnięcie sesji

Gdy `access_token` wygasa, Supabase SDK automatycznie próbuje odświeżyć token przy użyciu `refresh_token`. Jeśli odświeżenie się nie powiedzie (np. `refresh_token` również wygasł), użytkownik jest wylogowywany lokalnie i musi ponownie się zalogować.

**Implementacja w komponencie React:**
```typescript
import { useEffect } from 'react';
import { supabaseClient } from '@/db/supabase.client';

function useAuthSession() {
  useEffect(() => {
    const { data: authListener } = supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        // Obsługa wylogowania lub odświeżenia tokenu
        if (!session) {
          // Przekierowanie na logowanie
          window.location.href = '/auth/sign-in';
        }
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);
}
```

#### 3.3.2 Błędy API (401 Unauthorized)

Gdy endpoint API zwraca 401 Unauthorized (np. token nieprawidłowy lub wygasły), komponent obsługujący request powinien wyświetlić komunikat i przycisk przekierowujący na `/auth/sign-in`.

**Przykład w custom hook `useFetch`:**
```typescript
async function apiRequest(endpoint: string, options: RequestInit) {
  const { data: { session } } = await supabaseClient.auth.getSession();
  
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${session?.access_token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (response.status === 401) {
    // Sesja wygasła lub token nieprawidłowy
    // Wylogowanie i przekierowanie
    await supabaseClient.auth.signOut();
    window.location.href = '/auth/sign-in?redirect=' + encodeURIComponent(window.location.pathname);
  }
  
  return response;
}
```

### 3.4 Przepływ danych użytkownika

#### Diagram przepływu danych przy rejestracji:

```
[Użytkownik]
    |
    | (1) Wypełnia formularz rejestracji
    v
[SignUpForm (React)]
    |
    | (2) Walidacja lokalna (Zod)
    | (3) POST /api/auth/sign-up (AuthSignUpCommand)
    v
[Astro API Endpoint: sign-up.ts]
    |
    | (4) Walidacja server-side (Zod)
    | (5) supabase.auth.signUp({ email, password })
    v
[Supabase Auth]
    |
    | (6) Hash hasła (bcrypt)
    | (7) Zapis w auth.users
    | (8) Trigger → zapis w user_profiles
    | (9) Generowanie access_token + refresh_token
    | (10) Zwrot { user, session }
    v
[Astro API Endpoint: sign-up.ts]
    |
    | (11) Mapowanie na AuthResponseDTO
    | (12) Response 201 Created
    v
[SignUpForm (React)]
    |
    | (13) Supabase SDK zapisuje sesję w localStorage
    | (14) Przekierowanie na /library
    v
[LibraryPage.astro]
    |
    | (15) Middleware sprawdza sesję (context.locals.session)
    | (16) Renderowanie strony z danymi użytkownika
    v
[Użytkownik widzi pustą bibliotekę]
```

#### Diagram przepływu danych przy logowaniu:

```
[Użytkownik]
    |
    | (1) Wypełnia formularz logowania
    v
[SignInForm (React)]
    |
    | (2) Walidacja lokalna
    | (3) POST /api/auth/sign-in (AuthSignInCommand)
    v
[Astro API Endpoint: sign-in.ts]
    |
    | (4) Walidacja server-side
    | (5) supabase.auth.signInWithPassword({ email, password })
    v
[Supabase Auth]
    |
    | (6) Weryfikacja hasła (bcrypt)
    | (7) Generowanie access_token + refresh_token
    | (8) Zwrot { user, session }
    v
[Astro API Endpoint: sign-in.ts]
    |
    | (9) Mapowanie na AuthResponseDTO
    | (10) Response 200 OK
    v
[SignInForm (React)]
    |
    | (11) Supabase SDK zapisuje sesję w localStorage
    | (12) Przekierowanie na /library (lub redirect z parametru)
    v
[LibraryPage.astro]
    |
    | (13) Middleware sprawdza sesję
    | (14) Renderowanie strony z fiszkami użytkownika
    v
[Użytkownik widzi swoje fiszki]
```

#### Diagram przepływu danych przy wylogowaniu:

```
[Użytkownik]
    |
    | (1) Klika "Wyloguj się"
    v
[SignOutButton (React)]
    |
    | (2) POST /api/auth/sign-out
    v
[Astro API Endpoint: sign-out.ts]
    |
    | (3) supabase.auth.signOut()
    v
[Supabase Auth]
    |
    | (4) Anulowanie sesji (access_token i refresh_token stają się nieważne)
    | (5) Zwrot { success: true }
    v
[Astro API Endpoint: sign-out.ts]
    |
    | (6) Response 200 OK
    v
[SignOutButton (React)]
    |
    | (7) Supabase SDK usuwa sesję z localStorage
    | (8) Przekierowanie na /auth/sign-in
    v
[SignInPage.astro]
    |
    | (9) Renderowanie strony logowania
    v
[Użytkownik widzi formularz logowania]
```

---

## 4. INTEGRACJA Z ISTNIEJĄCĄ ARCHITEKTURĄ

### 4.1 Aktualizacja endpointów API fiszek i generacji

Wszystkie istniejące endpointy API (`/api/flashcards`, `/api/generation-requests`, `/api/reviews`) wymagają autoryzacji. Middleware Astro oraz Supabase RLS zapewniają, że tylko zalogowani użytkownicy mają dostęp do swoich danych.

**Aktualizacja endpointu `GET /api/flashcards`:**
```typescript
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals, url }) => {
  const { session, supabase } = locals;
  
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const cursor = url.searchParams.get('cursor') || null;
  
  // Zapytanie do Supabase z RLS (automatycznie filtruje po user_id)
  const { data, error } = await supabase
    .from('flashcards')
    .select('*')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch flashcards' }), { status: 500 });
  }
  
  return new Response(JSON.stringify({ items: data, next_cursor: null }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
```

Dzięki RLS zapytanie automatycznie filtruje fiszki tylko dla zalogowanego użytkownika (`auth.uid() = user_id`), więc brak potrzeby ręcznego dodawania warunku `WHERE user_id = ?`.

### 4.2 Aktualizacja komponentów React

Komponenty React odpowiedzialne za zarządzanie fiszkami, generację AI i powtórki muszą być zaktualizowane, aby obsługiwać błędy 401 Unauthorized i przekierowywać na logowanie w razie wygaśnięcia sesji.

**Przykład hooka `useFetch` z obsługą 401:**
```typescript
import { supabaseClient } from '@/db/supabase.client';

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (!session) {
    window.location.href = '/auth/sign-in?redirect=' + encodeURIComponent(window.location.pathname);
    throw new Error('Unauthorized');
  }
  
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      ...options?.headers,
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (response.status === 401) {
    await supabaseClient.auth.signOut();
    window.location.href = '/auth/sign-in?redirect=' + encodeURIComponent(window.location.pathname);
    throw new Error('Unauthorized');
  }
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
}
```

Wszystkie komponenty korzystające z API powinny używać `apiFetch` zamiast standardowego `fetch`, aby zapewnić spójną obsługę autoryzacji i błędów.

### 4.3 Aktualizacja struktury katalogów

Nowe pliki związane z autentykacją:

```
src/
├── pages/
│   ├── index.astro (przekierowanie: niezalogowany → /auth/sign-in, zalogowany → /library)
│   ├── auth/
│   │   ├── sign-up.astro
│   │   ├── sign-in.astro
│   │   ├── reset-password.astro
│   │   └── reset-password/
│   │       └── confirm.astro
│   ├── api/
│   │   ├── auth/
│   │   │   ├── sign-up.ts
│   │   │   ├── sign-in.ts
│   │   │   ├── sign-out.ts
│   │   │   └── reset-password.ts
│   │   ├── flashcards/
│   │   ├── generation-requests/
│   │   └── reviews/
│   ├── library.astro (wymaga autentykacji)
│   ├── generate.astro (wymaga autentykacji)
│   ├── reviews.astro (wymaga autentykacji)
│   └── profile.astro (opcjonalny, poza MVP)
├── components/
│   ├── auth/
│   │   ├── SignUpForm.tsx
│   │   ├── SignInForm.tsx
│   │   ├── ResetPasswordForm.tsx
│   │   ├── ResetPasswordConfirmForm.tsx
│   │   ├── FormErrorBanner.tsx
│   │   └── FormInfoBanner.tsx
│   ├── layout/
│   │   ├── MainNav.tsx
│   │   ├── UserMenu.tsx
│   │   └── SignOutButton.tsx
│   └── ui/ (Shadcn/ui components)
├── lib/
│   ├── validation/
│   │   └── auth.schemas.ts (Zod schemas)
│   ├── api/
│   │   └── apiFetch.ts (helper do API calls z autoryzacją)
│   └── services/
│       └── (istniejące serwisy)
├── middleware/
│   └── index.ts (aktualizowany)
├── db/
│   ├── supabase.client.ts (aktualizowany)
│   └── database.types.ts
├── types.ts (aktualizowany o typy auth)
└── env.d.ts (aktualizowany o Astro.Locals)
```

---

## 5. KLUCZOWE DECYZJE ARCHITEKTONICZNE

### 5.1 Dlaczego Supabase Auth?

- **Kompleksowe rozwiązanie**: Supabase Auth zapewnia out-of-the-box obsługę rejestracji, logowania, resetowania hasła, weryfikacji emaila, MFA (w przyszłości) oraz zarządzania sesjami.
- **Row Level Security**: Natywna integracja z PostgreSQL RLS zapewnia bezpieczeństwo danych na poziomie bazy danych.
- **Skalowalnośc**: Supabase jest rozwiązaniem skalowalnym, które wspiera miliony użytkowników bez dodatkowej konfiguracji.
- **Open-source**: Możliwość self-hostingu w przyszłości, jeśli pojawi się taka potrzeba.

### 5.2 Dlaczego server-side rendering (SSR) w Astro?

- **Bezpieczeństwo**: Weryfikacja sesji odbywa się server-side, co uniemożliwia manipulację po stronie klienta.
- **SEO**: SSR zapewnia lepsze wsparcie dla SEO (choć w aplikacji autentykacyjnej ma to mniejsze znaczenie).
- **Spójność**: Wszystkie chronione strony są renderowane server-side z weryfikacją sesji, co zapewnia spójny mechanizm ochrony.

### 5.3 Dlaczego Zod do walidacji?

- **Type-safety**: Zod zapewnia automatyczne typowanie w TypeScript na podstawie schematów walidacji.
- **Spójność**: Walidacja client-side i server-side może korzystać z tych samych schematów.
- **Developer experience**: Czytelne komunikaty błędów i łatwa konfiguracja.

### 5.4 Dlaczego Bearer tokens w nagłówkach?

- **Standard**: Bearer tokens w nagłówku `Authorization` są standardem w REST API.
- **Bezpieczeństwo**: Tokeny nie są przesyłane w URL (co mogłoby prowadzić do wycieków w logach serwera).
- **Automatyzacja**: Supabase SDK automatycznie dodaje tokeny do requestów.

### 5.5 Dlaczego brak zewnętrznych providerów OAuth (Google, GitHub)?

Zgodnie z wymaganiami PRD (US-014), aplikacja nie korzysta z zewnętrznych serwisów logowania. Autentykacja opiera się wyłącznie na email i hasło, co upraszcza architekturę i zapewnia pełną kontrolę nad danymi użytkowników.

W przyszłości, jeśli pojawi się potrzeba, Supabase Auth wspiera OAuth providerów, które można łatwo zintegrować bez zmian w architekturze.

---

## 6. METRYKI SUKCESU I MONITORING

### 6.1 Metryki autentykacji

- **Liczba rejestracji**: ile nowych użytkowników zakłada konta dziennie/tygodniowo.
- **Liczba logowań**: ile razy użytkownicy logują się dziennie.
- **Wskaźnik sukcesu logowania**: stosunek udanych logowań do prób logowania (cel: >95%).
- **Czas od rejestracji do pierwszej generacji fiszek**: ile czasu zajmuje użytkownikowi przejście przez onboarding (cel: <5 minut).
- **Liczba resetów hasła**: ile użytkowników korzysta z funkcji odzyskiwania hasła.

### 6.2 Monitoring błędów

- **Błędy 401 Unauthorized**: liczba i źródło błędów 401 (np. wygasłe sesje, nieprawidłowe dane logowania).
- **Błędy 500 Internal Server Error**: liczba i przyczyny błędów serwera w endpointach autentykacji.
- **Czas odpowiedzi endpointów**: średni czas odpowiedzi `sign-up`, `sign-in`, `sign-out` (cel: <500ms).

### 6.3 Narzędzia monitoringu

- **Supabase Dashboard**: wbudowane narzędzie do monitorowania użytkowników, sesji, błędów autentykacji.
- **Sentry** (opcjonalnie): narzędzie do monitorowania błędów w aplikacji (zarówno server-side jak i client-side).
- **Google Analytics / Mixpanel** (opcjonalnie): tracking ścieżek użytkownika, konwersji rejestracji, retention.

---

## 7. PLAN IMPLEMENTACJI

### 7.1 Faza 1: Infrastruktura autentykacji (Sprint 1, Tydzień 1)

1. **Konfiguracja Supabase Auth**:
   - Utworzenie projektu Supabase (jeśli nie istnieje).
   - Konfiguracja email templates dla rejestracji i resetu hasła.
   - Włączenie polityk RLS na tabelach `user_profiles`, `flashcards`, `generation_requests`, `generation_request_logs`.
   - Utworzenie triggera dla automatycznego tworzenia profilu użytkownika.

2. **Aktualizacja Supabase Client**:
   - Dodanie konfiguracji `autoRefreshToken`, `persistSession`, `detectSessionInUrl`.
   - Rozszerzenie typu `Astro.Locals` o `session`, `user`.

3. **Aktualizacja middleware Astro**:
   - Implementacja weryfikacji sesji dla chronionych ścieżek.
   - Przekierowania na `/auth/sign-in` dla niezalogowanych użytkowników.
   - Przekierowania na `/library` dla zalogowanych użytkowników próbujących wejść na `/auth/*`.

4. **Utworzenie schematów Zod**:
   - `AuthSignUpCommandSchema`, `AuthSignInCommandSchema`, `AuthResetPasswordCommandSchema`.

### 7.2 Faza 2: Endpointy API autentykacji (Sprint 1, Tydzień 1-2)

1. **Implementacja `POST /api/auth/sign-up`**:
   - Walidacja danych przez Zod.
   - Wywołanie `supabase.auth.signUp()`.
   - Mapowanie błędów na kody HTTP.
   - Testowanie rejestracji (unit tests, integration tests).

2. **Implementacja `POST /api/auth/sign-in`**:
   - Walidacja danych.
   - Wywołanie `supabase.auth.signInWithPassword()`.
   - Testowanie logowania.

3. **Implementacja `POST /api/auth/sign-out`**:
   - Weryfikacja sesji.
   - Wywołanie `supabase.auth.signOut()`.
   - Testowanie wylogowania.

4. **Implementacja `POST /api/auth/reset-password`**:
   - Walidacja emaila.
   - Wywołanie `supabase.auth.resetPasswordForEmail()`.
   - Testowanie procesu resetu hasła.

### 7.3 Faza 3: Widoki i komponenty autentykacji (Sprint 1, Tydzień 2)

1. **Implementacja stron Astro**:
   - `SignUpPage.astro`, `SignInPage.astro`, `ResetPasswordPage.astro`, `ResetPasswordConfirmPage.astro`.
   - Osadzenie komponentów React.

2. **Implementacja komponentów React**:
   - `SignUpForm`, `SignInForm`, `ResetPasswordForm`, `ResetPasswordConfirmForm`.
   - Walidacja inline (onChange/onBlur).
   - Obsługa błędów API i wyświetlanie komunikatów.

3. **Implementacja komponentów layoutu**:
   - `MainNav`, `UserMenu`, `SignOutButton`.
   - Aktualizacja `Layout.astro` o sekcję użytkownika.

4. **Implementacja komponentów pomocniczych**:
   - `FormErrorBanner`, `FormInfoBanner`.

### 7.4 Faza 4: Integracja z istniejącymi widokami (Sprint 1, Tydzień 2)

1. **Aktualizacja widoków chronionych**:
   - Dodanie sprawdzenia sesji w middleware.
   - Obsługa błędów 401 Unauthorized w komponentach React.

2. **Utworzenie hooka `apiFetch`**:
   - Automatyczne dodawanie Bearer token.
   - Obsługa błędów 401 i przekierowanie na logowanie.

3. **Aktualizacja istniejących komponentów**:
   - Zamiana `fetch` na `apiFetch` w komponentach zarządzania fiszkami, generacji AI, powtórek.

### 7.5 Faza 5: Testowanie i debugging (Sprint 2, Tydzień 1)

1. **Testy jednostkowe**:
   - Testy schematów Zod.
   - Testy logiki walidacji w komponentach.

2. **Testy integracyjne**:
   - Testy endpointów API autentykacji (rejestracja, logowanie, wylogowanie, reset hasła).
   - Testy middleware (przekierowania, weryfikacja sesji).

3. **Testy E2E**:
   - Scenariusze: rejestracja → generacja fiszek → wylogowanie → logowanie → powtórki.
   - Scenariusz resetu hasła.
   - Scenariusz wygaśnięcia sesji.

4. **Debugging i optymalizacja**:
   - Sprawdzenie wydajności endpointów autentykacji.
   - Optymalizacja zapytań do bazy danych (indeksy, RLS).

### 7.6 Faza 6: Dokumentacja i deployment (Sprint 2, Tydzień 2)

1. **Dokumentacja techniczna**:
   - Aktualizacja README z instrukcjami konfiguracji Supabase.
   - Dokumentacja endpointów API (OpenAPI/Swagger).

2. **Dokumentacja użytkownika**:
   - Sekcja FAQ dotycząca rejestracji, logowania, resetu hasła.

3. **Deployment**:
   - Migracja bazy danych (trigger, polityki RLS).
   - Wdrożenie zmian na środowisko produkcyjne (DigitalOcean).
   - Monitoring błędów i wydajności.

---

## 8. RYZYKA I MITIGACJE

### 8.1 Ryzyka techniczne

**Ryzyko 1: Problemy z integracją Supabase Auth i Astro SSR**
- **Prawdopodobieństwo**: Niskie
- **Wpływ**: Wysoki
- **Mitigacja**: Wykonanie proof-of-concept w fazie początkowej projektu, testowanie integracji na środowisku deweloperskim przed deployment.

**Ryzyko 2: Nieprawidłowa konfiguracja RLS prowadząca do wycieków danych**
- **Prawdopodobieństwo**: Średnie
- **Wpływ**: Krytyczny
- **Mitigacja**: Code review polityk RLS, testy integracyjne weryfikujące izolację danych użytkowników, audyt bezpieczeństwa przed deployment.

**Ryzyko 3: Wydajnościowe problemy z middleware sprawdzającym sesję przy każdym żądaniu**
- **Prawdopodobieństwo**: Niskie
- **Wpływ**: Średni
- **Mitigacja**: Caching sesji w pamięci (Redis) na środowisku produkcyjnym, monitoring czasu odpowiedzi middleware.

### 8.2 Ryzyka UX

**Ryzyko 4: Zbyt długi czas weryfikacji sesji prowadzący do wolnego ładowania stron**
- **Prawdopodobieństwo**: Niskie
- **Wpływ**: Średni
- **Mitigacja**: Optymalizacja zapytań do Supabase, użycie Supabase Edge Functions dla szybszej weryfikacji.

**Ryzyko 5: Użytkownicy zapominają haseł i frustrują się procesem resetu**
- **Prawdopodobieństwo**: Średnie
- **Wpływ**: Niski
- **Mitigacja**: Jasny i prosty proces resetu hasła, wsparcie techniczne dla użytkowników, opcjonalne włączenie MFA w przyszłości.

### 8.3 Ryzyka bezpieczeństwa

**Ryzyko 6: Ataki brute-force na endpointy logowania**
- **Prawdopodobieństwo**: Średnie
- **Wpływ**: Średni
- **Mitigacja**: Rate limiting (Supabase Auth + custom middleware), monitoring prób logowania, blokowanie IP po wielokrotnych nieudanych próbach.

**Ryzyko 7: Ataki XSS lub CSRF**
- **Prawdopodobieństwo**: Niskie
- **Wpływ**: Wysoki
- **Mitigacja**: Sanityzacja danych wejściowych, używanie HTTPS, automatyczna ochrona CSRF w Supabase SDK, Content Security Policy (CSP) w nagłówkach HTTP.

---

## 9. PODSUMOWANIE

Niniejsza specyfikacja techniczna opisuje kompleksową architekturę modułu autentykacji dla aplikacji 10xCards. Moduł zapewnia:

1. **Bezpieczną autentykację** opartą na Supabase Auth z hashowaniem haseł, JWT tokenami i RLS.
2. **Spójny UX** z jasnymi formularzami, walidacją inline i czytelnymi komunikatami błędów.
3. **Server-side rendering** w Astro dla chronionych stron z weryfikacją sesji w middleware.
4. **Skalowalność** dzięki wykorzystaniu Supabase jako Backend-as-a-Service.
5. **Integrację z istniejącą architekturą** bez naruszeń działających funkcjonalności.

Moduł jest zgodny z wymaganiami PRD (US-001, US-002, US-003, US-004, US-014) i zapewnia solidne fundamenty dla dalszego rozwoju aplikacji, w tym przyszłych funkcji takich jak MFA, OAuth providerów czy zaawansowanego zarządzania kontami.

Plan implementacji zakłada wdrożenie modułu w ciągu 2 sprintów (4 tygodni) z priorytetem na bezpieczeństwo, spójność i jakość kodu. Po wdrożeniu moduł będzie monitorowany pod kątem wydajności, błędów i metryk użytkowników, aby zapewnić ciągłe doskonalenie.

---

## 10. ZGODNOŚĆ Z PRD

### 10.1 Pokrycie User Stories

Niniejsza specyfikacja pokrywa w pełni następujące User Stories z PRD:

| User Story | Status | Uwagi |
|------------|--------|-------|
| US-001: Rejestracja konta | ✅ Pełne pokrycie | Implementacja formularza rejestracji z polami: email, hasło, potwierdzenie hasła. Po sukcesie przekierowanie na `/library`. |
| US-002: Logowanie do aplikacji | ✅ Pełne pokrycie | Implementacja formularza logowania. Obsługa błędów 401 i przekierowania z parametrem `redirect`. |
| US-003: Reset hasła | ✅ Pełne pokrycie | Dwuetapowy proces: inicjacja przez email + potwierdzenie przez link z emaila. |
| US-004: Wylogowanie | ✅ Pełne pokrycie | Wylogowanie dostępne z każdego widoku przez `SignOutButton` w `UserMenu`. |
| US-014: Bezpieczny dostęp | ✅ Pełne pokrycie | Wszystkie funkcje aplikacji wymagają logowania. Przekierowania dla niezalogowanych użytkowników. |

### 10.2 Wymagania autentykacji zgodne z PRD

**Wszystkie funkcje aplikacji wymagają uwierzytelnienia:**

Zgodnie z PRD (sekcja 3 - Wymagania funkcjonalne) oraz US-014, wszystkie funkcje aplikacji są dostępne wyłącznie dla zalogowanych użytkowników:

1. ✅ **Generowanie fiszek przez AI** - wymaga logowania
2. ✅ **Podstawowa edycja i zarządzanie fiszkami** - wymaga logowania
3. ✅ **Ręczne tworzenie fiszek** - wymaga logowania
4. ✅ **Integracja z algorytmem powtórek** - wymaga logowania

**Ochrona implementowana na trzech poziomach:**

1. **Middleware Astro**: Sprawdzenie sesji server-side przy każdym żądaniu do chronionych ścieżek (`/library`, `/generate`, `/reviews`). Brak sesji → przekierowanie na `/auth/sign-in`.

2. **Row Level Security (RLS)**: Polityki PostgreSQL zapewniające, że zapytania do bazy danych są automatycznie filtrowane po `user_id` i blokowane dla roli `anon` (niezalogowany użytkownik).

3. **API Endpoints**: Weryfikacja tokenu Bearer w nagłówku `Authorization` dla wszystkich endpointów `/api/*`. Brak lub nieprawidłowy token → 401 Unauthorized.

**Kryteria US-014 są w pełni spełnione:**
- ✅ Logowanie i rejestracja na dedykowanych stronach (`/auth/sign-in`, `/auth/sign-up`)
- ✅ Logowanie wymaga email + hasło
- ✅ Rejestracja wymaga email + hasło + potwierdzenie hasła
- ✅ Wszystkie funkcje aplikacji wymagają logowania
- ✅ Niezalogowani użytkownicy są przekierowywani na stronę logowania
- ✅ Przycisk logowania/wylogowania w prawym górnym rogu (widoczność zależna od stanu uwierzytelnienia)
- ✅ Brak zewnętrznych serwisów logowania (Google, GitHub)
- ✅ Odzyskiwanie hasła przez email jest możliwe

### 10.3 Elementy opcjonalne (poza zakresem MVP)

Następujące elementy zostały opisane w specyfikacji, ale nie są wymagane przez PRD i mogą zostać zaimplementowane w przyszłych iteracjach:

1. **Widok `/profile`**: Nie jest wymagany przez żadne User Story. W MVP dane użytkownika są dostępne w `UserMenu`.
2. **Email verification**: Opisane jako opcjonalne w sekcji 3.2.5. Może zostać włączone w przyszłości poprzez konfigurację Supabase.
3. **Multi-Factor Authentication (MFA)**: Wspomniane jako przyszła funkcjonalność w sekcjach 3.2.5 i 5.1.

### 10.4 Założenia techniczne rozszerzające PRD

Specyfikacja wprowadza następujące założenia techniczne niewyspecyfikowane wprost w PRD, ale wynikające z najlepszych praktyk:

1. **Potwierdzenie hasła przy rejestracji**: PRD (US-014) wymaga "potwierdzenia hasła", specyfikacja implementuje to jako osobne pole walidowane względem pola hasło.
2. **Parametr `redirect`**: Mechanizm przekierowania użytkownika na docelową stronę po logowaniu nie jest wprost wymagany w PRD, ale znacząco poprawia UX.
3. **Neutralne komunikaty przy resecie hasła**: Komunikat "Jeśli konto o podanym adresie istnieje..." nie jest wymagany w PRD, ale jest best practice bezpieczeństwa (nie ujawnianie istnienia kont).
4. **Inline validation**: Walidacja onChange/onBlur nie jest wymagana w PRD, ale znacząco poprawia UX.
5. **Bearer tokens w nagłówkach**: PRD nie specyfikuje mechanizmu autoryzacji API. Specyfikacja wybiera standard Bearer tokens zgodnie z REST API best practices.

### 10.5 Potwierdzenie pełnej realizowalności

Wszystkie User Stories związane z autentykacją **mogą zostać w pełni zrealizowane** zgodnie z niniejszą specyfikacją:

- ✅ **US-001 (Rejestracja)**: Formularz → endpoint `/api/auth/sign-up` → trigger PostgreSQL → użytkownik zalogowany → przekierowanie na `/library`
- ✅ **US-002 (Logowanie)**: Formularz → endpoint `/api/auth/sign-in` → Supabase Auth → sesja zapisana → przekierowanie na `/library` lub docelowy URL
- ✅ **US-003 (Reset hasła)**: Inicjacja → email z linkiem → potwierdzenie → Supabase Auth → nowe hasło ustawione → możliwość logowania
- ✅ **US-004 (Wylogowanie)**: Przycisk w layoutu → endpoint `/api/auth/sign-out` → sesja zakończona → przekierowanie na `/auth/sign-in`
- ✅ **US-014 (Bezpieczny dostęp)**: Middleware Astro + RLS + Bearer tokens → pełna ochrona wszystkich funkcji aplikacji

**Wszystkie pozostałe User Stories (US-005 do US-013)** dotyczące generowania fiszek, zarządzania biblioteką i powtórek są chronione przez moduł autentykacji na trzech poziomach: middleware, RLS i API endpoints. Zapewnia to bezpieczeństwo danych użytkowników i zgodność z modelem danych wymagającym `user_id` dla wszystkich operacji.

---

**Koniec specyfikacji technicznej modułu autentykacji - 10xCards**
