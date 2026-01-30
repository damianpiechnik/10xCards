# Plan implementacji widoku Biblioteka fiszek (US-009)

## 1. Przegląd
Widok biblioteki pokazuje liste fiszek z podstawowymi informacjami, z paginacja „Załaduj więcej” i stanem pustym.

## 2. Routing widoku
`/library`

## 3. Struktura komponentów
- `LibraryPage` (Astro)
  - `FlashcardList` (React)
    - `FlashcardRow`
    - `LoadMoreButton`
    - `EmptyState`
    - `ErrorBanner`

## 4. Szczegóły komponentu
### `FlashcardList`
- Opis komponentu: pobiera i renderuje liste fiszek z paginacja.
- Główne elementy: lista, przycisk „Załaduj więcej”.
- Obsługiwane zdarzenia: `onLoadMore`, `onRetry`.
- Warunki walidacji: brak.
- Typy: `FlashcardListQuery`, `FlashcardListResponseDTO`, `FlashcardDTO`.
- Propsy: opcjonalne filtry (sort/type/deleted).

## 5. Typy
- `FlashcardListQuery`: `{ limit?, cursor?, sort?, type?, deleted? }`
- `FlashcardListResponseDTO`: `{ items: FlashcardDTO[]; next_cursor }`
- `FlashcardDTO`

## 6. Zarządzanie stanem
Stan lokalny listy: `items`, `nextCursor`, `isLoading`, `error`. Cursor trzymany w stanie i aktualizowany po „Załaduj więcej”.

## 7. Integracja API
`GET /api/flashcards` z query `limit/cursor/sort/type/deleted`.

## 8. Interakcje użytkownika
Przeglad listy, „Załaduj więcej”, przejscie do edycji inline.

## 9. Warunki i walidacja
Brak walidacji formularza; walidacja query po stronie API.

## 10. Obsługa błędów
`401` → CTA do logowania, `500` → komunikat i opcja ponowienia.

## 11. Kroki implementacji
1. Utworz `src/pages/library.astro` i osadz `FlashcardList`.
2. Zaimplementuj pobieranie listy i paginacje.
3. Dodaj stan pusty i obsługe bledow.
