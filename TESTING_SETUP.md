# Instrukcja Instalacji i Uruchomienia Testów

## Szybki Start

### 1. Instalacja Zależności

```bash
npm install
```

To zainstaluje wszystkie wymagane zależności testowe:
- `vitest` - Framework testowy
- `@vitest/ui` - UI mode dla testów
- `@vitest/coverage-v8` - Coverage reporting
- `@testing-library/react` - Testowanie React hooków
- `@testing-library/user-event` - Symulacja interakcji użytkownika
- `jsdom` - DOM environment dla testów

### 2. Uruchomienie Testów

```bash
# Uruchom wszystkie testy
npm test

# Tryb watch (automatyczne reloadowanie)
npm test -- --watch

# UI mode (wizualna nawigacja)
npm run test:ui

# Coverage report
npm run test:coverage
```

## Dostępne Komendy

### Podstawowe

```bash
# Wszystkie testy (single run)
npm test

# Watch mode - dla development
npm test -- --watch

# UI mode - wizualna nawigacja i debugging
npm run test:ui

# Coverage report z progami
npm run test:coverage
```

### Zaawansowane

```bash
# Konkretny plik
npm test updateSrs.test.ts

# Filtrowanie po nazwie testu
npm test -- -t "powinien zresetować"

# Verbose output
npm test -- --reporter=verbose

# Run tylko failed testy
npm test -- --changed

# Tylko konkretny folder
npm test src/lib/services/srs/
```

## Struktura Projektu Testowego

```
e:/10xCards/
├── vitest.config.ts              # Konfiguracja Vitest
├── src/
│   ├── test/
│   │   ├── setup.ts              # Global setup (mocks, helpers)
│   │   └── README.md             # Dokumentacja testów
│   │
│   ├── lib/services/
│   │   ├── srs/
│   │   │   ├── updateSrs.ts
│   │   │   └── updateSrs.test.ts
│   │   │
│   │   └── generation/
│   │       ├── completeGenerationRequest.ts
│   │       └── completeGenerationRequest.test.ts
│   │
│   └── components/
│       ├── hooks/
│       │   ├── useReviewQueue.ts
│       │   ├── useReviewQueue.test.ts
│       │   ├── useReviewSubmit.ts
│       │   ├── useReviewSubmit.test.ts
│       │   ├── useFlashcardList.ts
│       │   └── useFlashcardList.test.ts
│       │
│       └── reviews/
│           ├── reviewStorage.ts
│           └── reviewStorage.test.ts
│
├── TEST_SUMMARY.md               # Podsumowanie testów
└── TESTING_SETUP.md              # Ten plik
```

## Konfiguracja Vitest

### vitest.config.ts

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
```

### src/test/setup.ts

Global setup wykonywany przed każdym testem:
- Mock sessionStorage
- Mock global fetch
- Auto-cleanup (clearAllMocks, sessionStorage.clear)

## Pierwsze Uruchomienie

### Krok po kroku

1. **Sklonuj/Otwórz projekt**
   ```bash
   cd e:/10xCards
   ```

2. **Zainstaluj zależności**
   ```bash
   npm install
   ```

3. **Uruchom testy w watch mode**
   ```bash
   npm test -- --watch
   ```

4. **Otwórz UI mode w przeglądarce** (opcjonalnie)
   ```bash
   npm run test:ui
   ```
   Vitest UI otworzy się automatycznie w przeglądarce na `http://localhost:51204`

5. **Sprawdź coverage**
   ```bash
   npm run test:coverage
   ```
   Raport otworzy się w `coverage/index.html`

## Typowe Problemy i Rozwiązania

### Problem: Testy nie znajdują modułów

**Rozwiązanie:**
```bash
# Usuń node_modules i reinstaluj
rm -rf node_modules package-lock.json
npm install
```

### Problem: Błąd "Cannot find module '@/types'"

**Rozwiązanie:**
Upewnij się, że masz poprawny alias w `vitest.config.ts`:
```typescript
resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
  },
}
```

### Problem: Timers nie działają w testach

**Rozwiązanie:**
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

### Problem: sessionStorage is not defined

**Rozwiązanie:**
Mock jest już w `src/test/setup.ts`. Upewnij się, że plik jest załadowany w `vitest.config.ts`:
```typescript
setupFiles: ["./src/test/setup.ts"]
```

## Coverage Thresholds

Projekt wymaga minimum 70% pokrycia dla:
- **Lines** - linie kodu
- **Functions** - funkcje
- **Branches** - warunki (if/else, switch, ternary)
- **Statements** - instrukcje

### Sprawdzenie Coverage

```bash
npm run test:coverage
```

Raport będzie dostępny w:
- Terminal: podsumowanie tekstowe
- `coverage/index.html`: szczegółowy raport HTML

### Wyłączenia z Coverage

Pliki wyłączone (patrz `vitest.config.ts`):
- `*.test.ts` i `*.spec.ts`
- `src/test/**`
- `src/db/database.types.ts`
- `src/types.ts`
- `src/**/*.d.ts`
- `src/pages/**`
- `src/middleware/**`

## Debugging Testów

### VS Code

1. Zainstaluj rozszerzenie "Vitest" 
2. Kliknij "Debug" obok konkretnego testu
3. Lub użyj breakpointów w kodzie

### Chrome DevTools

```bash
npm test -- --inspect-brk
```

Następnie otwórz Chrome i przejdź do `chrome://inspect`

### Console Logs

```typescript
it("test with console", () => {
  console.log("Debug info:", someValue);
  expect(someValue).toBe(expected);
});
```

Uruchom z:
```bash
npm test -- --reporter=verbose
```

## Best Practices

### 1. Nazywanie Testów

```typescript
// ✅ Dobrze
it("powinien zwrócić błąd dla niepoprawnego email", () => {});

// ❌ Źle
it("test email validation", () => {});
```

### 2. Arrange-Act-Assert

```typescript
it("powinien dodać użytkownika", () => {
  // Arrange
  const user = { name: "John", age: 30 };
  
  // Act
  const result = addUser(user);
  
  // Assert
  expect(result.success).toBe(true);
});
```

### 3. Izolacja Testów

```typescript
// ✅ Każdy test jest niezależny
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});
```

### 4. Testowanie Async

```typescript
// ✅ Użyj waitFor dla async operations
await waitFor(() => {
  expect(result.current.isLoading).toBe(false);
});
```

### 5. Mockowanie

```typescript
// ✅ Mock zewnętrznych zależności
vi.mock("./dependency", () => ({
  someFunction: vi.fn(),
}));
```

## Integracja z CI/CD

### GitHub Actions (przykład)

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

## Pre-commit Hook

Możesz dodać uruchamianie testów przed commitem:

### .husky/pre-commit

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run tests for staged files
npm test -- --changed --passWithNoTests
```

## Kolejne Kroki

Po uruchomieniu testów rozważ:

1. **Dodanie testów do CI/CD**
   - GitHub Actions
   - GitLab CI
   - Jenkins

2. **Pre-commit hooks**
   - Automatyczne testy przed commitem
   - Lint + test razem

3. **Coverage badge**
   - Codecov
   - Coveralls

4. **Testy E2E**
   - Playwright
   - Cypress

5. **Mutation testing**
   - Stryker

## Pomoc i Wsparcie

- **Dokumentacja Vitest:** https://vitest.dev/
- **Testing Library:** https://testing-library.com/
- **Problemy projektowe:** Sprawdź `src/test/README.md`

## Podsumowanie Komend

| Komenda | Opis |
|---------|------|
| `npm test` | Uruchom wszystkie testy |
| `npm test -- --watch` | Watch mode |
| `npm run test:ui` | UI mode |
| `npm run test:coverage` | Coverage report |
| `npm test <file>` | Konkretny plik |
| `npm test -- -t <name>` | Filtruj po nazwie |
| `npm test -- --changed` | Tylko zmienione pliki |

---

**Gotowe do użycia! 🚀**

Wszystkie testy są skonfigurowane i gotowe do uruchomienia. Wystarczy:
```bash
npm install
npm test
```
