# Diagramy architektury - 10xCards

Ten folder zawiera diagramy Mermaid dokumentujące architekturę aplikacji 10xCards.

## Spis diagramów

### Diagramy UI (Interface użytkownika)

1. **[Przegląd architektury UI](./ui-overview.md)**
   - Wysokopoziomowy widok wszystkich modułów aplikacji
   - Relacje między modułami
   - Warstwa danych i komponenty UI
   - **Zalecane jako punkt startowy**

2. **[Moduł autentykacji](./ui-auth.md)**
   - Strony: logowanie, rejestracja, reset hasła, aktualizacja hasła
   - Komponenty: formularze, przyciski, AuthRedirect
   - Przepływ logowania i rejestracji
   - Integracja z Supabase Auth

3. **[Moduł generowania fiszek](./ui-generation.md)**
   - Strony: formularz generowania, historia zleceń, status przetwarzania
   - Parametry generowania (tekst, liczba, język, model)
   - Przepływ od wklejenia tekstu do wygenerowania fiszek
   - Integracja z OpenRouter AI

4. **[Moduł biblioteki fiszek](./ui-library.md)**
   - Strony: lista fiszek, dodawanie ręczne
   - Funkcje: przeglądanie, filtrowanie, sortowanie, edycja inline, usuwanie
   - Operacje CRUD na fiszkach
   - Load more pagination

5. **[Moduł powtórek](./ui-reviews.md)**
   - Strony: kolejka powtórek, sesja nauki
   - System SRS (Spaced Repetition System)
   - Algorytm obliczania interwałów powtórek
   - Przepływ sesji nauki (pokazanie, ocena, następna)

6. **[Przepływ danych](./ui-data-flow.md)**
   - Jak dane przepływają przez warstwę UI → Hooki → API → Backend
   - Sequence diagramy dla kluczowych operacji
   - Struktura danych (DTOs)
   - Zarządzanie stanem i optymalizacje

### Diagramy inne

7. **[Przepływ użytkownika (Journey)](./journey.md)**
   - User journey przez całą aplikację
   - Kluczowe punkty kontaktu
   - Przepływy od rejestracji do nauki

8. **[Autentykacja (szczegółowa)](./auth.md)**
   - Szczegółowa dokumentacja procesu autentykacji
   - Bezpieczeństwo i tokeny
   - Edge cases i obsługa błędów

### Diagram pełny (przestarzały)

9. **[Pełny diagram UI](./ui.md)**
   - Kompleksowy diagram wszystkich modułów w jednym miejscu
   - **Uwaga**: Ze względu na złożoność zalecamy używanie mniejszych diagramów 1-6

## Jak czytać diagramy

### Kolory węzłów

- **Turkusowy** - Layout główny (Layout.astro, MainNav)
- **Niebieski** - Strony Astro (server pages)
- **Żółty** - Komponenty React (client-side)
- **Fioletowy** - Custom Hooks (zarządzanie stanem)
- **Zielony** - Komponenty UI (Shadcn/ui)
- **Czerwony** - Endpointy API
- **Różowy** - Backend i zewnętrzne usługi
- **Pomarańczowy** - Informacje i notatki

### Typy połączeń

- `-->` - Relacja hierarchiczna (zawiera, renderuje)
- `-.->` - Relacja logiczna (wywołuje, przekierowuje)
- `-. tekst .->` - Relacja z opisem

### Struktura diagramów

Każdy diagram zawiera:
1. **Diagram Mermaid** - wizualizacja architektury
2. **Opis komponentów** - szczegółowe informacje o każdym elemencie
3. **Przepływy** - jak użytkownik/dane przechodzą przez system
4. **Szczegóły techniczne** - API, hooki, walidacje, błędy

## Technologie

- **Frontend**: Astro 5 + React 19 + TypeScript 5
- **Styling**: Tailwind 4 + Shadcn/ui
- **Backend**: Supabase (Auth + Database)
- **AI**: OpenRouter
- **Architektura**: Islands Architecture (Astro)

## Aktualizacje

- **2026-01-29**: Utworzenie diagramów modułowych (1-6)
- **2026-01-29**: Podział dużego diagramu na mniejsze części

## Sugerowana kolejność przeglądania

Dla nowych osób w projekcie:

1. Zacznij od **[Przegląd architektury UI](./ui-overview.md)** - zrozumienie całości
2. Przejdź do **[Przepływ danych](./ui-data-flow.md)** - jak dane krążą w aplikacji
3. Według zainteresowania wybierz szczegółowe diagramy modułów (2-5)

Dla programistów pracujących nad konkretną funkcją:

- Autentykacja → [ui-auth.md](./ui-auth.md)
- Generowanie AI → [ui-generation.md](./ui-generation.md)
- Zarządzanie fiszkami → [ui-library.md](./ui-library.md)
- System powtórek → [ui-reviews.md](./ui-reviews.md)

## Narzędzia do wyświetlania

Diagramy Mermaid można wyświetlać:
- GitHub/GitLab - natywne wsparcie
- VS Code - rozszerzenie "Markdown Preview Mermaid Support"
- Online: [mermaid.live](https://mermaid.live/)
- IDE - większość nowoczesnych IDE ma wsparcie dla Mermaid

## Kontakt

W razie pytań lub sugestii dotyczących diagramów, utwórz issue w repozytorium.
