# Plan implementacji widoku Powtórki (US-013)

## 1. Przegląd
Widok powtórek pokazuje kolejke fiszek do nauki zgodnie z harmonogramem i pozwala rozpocząć sesję.

## 2. Routing widoku
`/reviews` oraz ` /reviews/session`

## 3. Struktura komponentów
- `ReviewsPage` (Astro)
  - `ReviewQueue` (React)
    - `QueueList`
    - `StartSessionButton`
    - `EmptyState`
    - `ErrorBanner`
- `ReviewSessionPage` (Astro)
  - `ReviewSession` (React)
    - `ReviewCard`
    - `GradeButtons`
    - `ProgressBar`

## 4. Szczegóły komponentu
### `ReviewQueue`
- Opis komponentu: pobiera kolejke fiszek i wyswietla stan.
- Główne elementy: lista, CTA „Rozpocznij powtórki”.
- Obsługiwane zdarzenia: `onStart`.
- Warunki walidacji: brak.
- Typy: `ReviewQueueQuery`, `ReviewQueueResponseDTO`.
- Propsy: `limit?`.

### `ReviewSession`
- Opis komponentu: prowadzi sesje i zapisuje oceny.
- Główne elementy: karta fiszki, przyciski ocen 0–5, progress.
- Obsługiwane zdarzenia: `onGrade`.
- Warunki walidacji: grade 0–5, wymagane `reviewed_at`.
- Typy: `ReviewSubmitCommand`, `ReviewSubmitResponseDTO`, `FlashcardDTO`.
- Propsy: `initialQueue`.

## 5. Typy
- `ReviewQueueQuery`: `{ limit? }`
- `ReviewQueueResponseDTO`: `{ items: FlashcardDTO[] }`
- `ReviewSubmitCommand`: `{ grade: number; reviewed_at? }`
- `ReviewSubmitResponseDTO`: `{ flashcard: FlashcardSrsUpdateDTO }`

## 6. Zarządzanie stanem
`ReviewQueue`: `items`, `isLoading`, `error`.  
`ReviewSession`: `currentIndex`, `currentCard`, `isSubmitting`, `progress`.

## 7. Integracja API
- `GET /api/reviews/queue` — pobranie kolejki.
- `POST /api/reviews/{id}` — zapis oceny i aktualizacja SRS.

## 8. Interakcje użytkownika
Start sesji, ocenianie fiszek 0–5, przechodzenie przez kolejke.

## 9. Warunki i walidacja
`grade` w zakresie 0–5. Blokada przycisków w trakcie zapisu.

## 10. Obsługa błędów
`401` → CTA do logowania. `500` → komunikat i opcja ponowienia.

## 11. Kroki implementacji
1. Utwórz `src/pages/reviews.astro` i `src/pages/reviews/session.astro`.
2. Zaimplementuj pobieranie kolejki i stan pusty.
3. Zaimplementuj sesje i zapis ocen przez `POST /api/reviews/{id}`.
