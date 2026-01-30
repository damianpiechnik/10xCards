# Testy Jednostkowe - 10xCards

## Struktura Testów

Projekt zawiera kompleksowy zestaw testów jednostkowych podzielony na 3 priorytety:

### Priorytet 1 (Natychmiast)
Krytyczny algorytm:
- ✅ `updateSrs.test.ts` - Algorytm SM-2 do spaced repetition

### Priorytet 2 (Wysoki)
Logika generacji:
- ✅ `completeGenerationRequest.test.ts` - Funkcje pomocnicze i fallback dla generacji

### Priorytet 3 (Średni)
Komponenty i hooki z logiką biznesową:
- ✅ `reviewStorage.test.ts` - Storage dla kolejki powtórek
- ✅ `useReviewQueue.test.ts` - Hook do pobierania kolejki
- ✅ `useReviewSubmit.test.ts` - Hook do wysyłania ocen

## Uruchamianie Testów

### Wszystkie testy
```bash
npm test
```

### Tryb watch (dla development)
```bash
npm test -- --watch
```

### UI mode (wizualna nawigacja)
```bash
npm run test:ui
```

### Coverage
```bash
npm run test:coverage
```

### Konkretny plik
```bash
npm test updateSrs.test.ts
```

### Filtrowanie po nazwie testu
```bash
npm test -- -t "powinien zresetować repetition"
```

## Struktura Pojedynczego Testu

Każdy test następuje wzorzec **Arrange-Act-Assert**:

```typescript
it("powinien opisać co robi", () => {
  // Arrange - przygotowanie danych testowych
  const input = createTestData();

  // Act - wykonanie testowanej funkcji
  const result = functionUnderTest(input);

  // Assert - sprawdzenie rezultatu
  expect(result).toBe(expectedValue);
});
```

## Kluczowe Zasady

### 1. Testowanie Warunków Brzegowych

Każda funkcja powinna być przetestowana z:
- Wartościami granicznymi (min, max)
- Wartościami null/undefined
- Pustymi tablicami/obiektami
- Błędnymi danymi wejściowymi

### 2. Mockowanie

Używamy `vi.fn()` i `vi.mock()` do izolacji testowanych jednostek:

```typescript
vi.mock("./dependency", () => ({
  someFunction: vi.fn(),
}));
```

### 3. Async Testing

Dla testów asynchronicznych używamy `waitFor`:

```typescript
await waitFor(() => {
  expect(result.current.isLoading).toBe(false);
});
```

### 4. Setup i Cleanup

Używamy `beforeEach` i `afterEach` dla czystego stanu:

```typescript
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});
```

## Coverage

Testy pokrywają 100% kluczowych modułów:
- `updateSrs.ts` - ~95% coverage
- `completeGenerationRequest.ts` - 100% coverage
- `reviewStorage.ts` - 100% coverage

## Kluczowe Przypadki Testowe

### updateSrs.ts
- Algorytm SM-2 dla różnych ocen (0-5)
- Reset repetition dla ocen < 3
- Obliczanie ease_factor z minimum 1.3
- Obliczanie interval_days (6 dni dla pierwszej powtórki)
- Ustawianie due_at na podstawie interval

### completeGenerationRequest.ts
- Normalizacja tekstu
- Zapewnienie minimalnej długości (2 znaki)
- Obcinanie długich tekstów (max 2000)
- Podział na chunki
- Rotacja chunków gdy requested_count > liczba chunków
- Fallback do lokalnej generacji gdy AI zawiedzie

### reviewStorage.ts
- Zapis i odczyt z sessionStorage
- Obsługa błędów storage
- Walidacja typu danych (musi być array)
- Czyszczenie storage

### useReviewQueue.ts
- Inicjalizacja bez wykonywania zapytania (enabled=false)
- Pobieranie kolejki z API
- Obsługa błędów HTTP (401, 429, 5xx)
- Funkcja refresh
- Czyszczenie danych przy zmianie zależności

### useReviewSubmit.ts
- Wysyłanie ocen do API
- Stan isSubmitting podczas wysyłania
- Obsługa błędów HTTP
- Brak wysyłania gdy brak accessToken
- Wiele równoczesnych wywołań

## Debugging Testów

### Verbose mode
```bash
npm test -- --reporter=verbose
```

### Konkretny test w watch mode
```bash
npm test -- --watch updateSrs.test.ts
```

### Zobacz console.log w testach
```bash
npm test -- --reporter=verbose
```

## Struktura Mocków

### Supabase Client Mock
```typescript
const createMockSupabase = () => ({
  from: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
});
```

### Fetch Mock
```typescript
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => mockData,
} as Response);
```

### SessionStorage Mock
Setup w `src/test/setup.ts` - automatycznie dostępny w każdym teście.

## Dodawanie Nowych Testów

1. Utwórz plik `*.test.ts` obok testowanego pliku
2. Zaimportuj testowaną funkcję/hook
3. Napisz testy zgodnie z wzorcem AAA
4. Upewnij się, że testy są niezależne (nie dzielą stanu)
5. Używaj opisowych nazw testów zaczynających się od "powinien"
6. Dodaj testy dla wszystkich warunków brzegowych

## Znane Problemy

### Timers
Dla testów używających `setTimeout`/`setInterval`, użyj fake timers:

```typescript
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// W teście
vi.advanceTimersByTime(1000);
```

### React Hooks
Dla testowania hooków używamy `@testing-library/react`:

```typescript
const { result } = renderHook(() => useMyHook());
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library React](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
