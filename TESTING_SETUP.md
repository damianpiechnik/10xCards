# Instrukcja Instalacji i Uruchomienia Testów

## Szybki Start

### 1. Instalacja Zależności

```bash
npm install
```

To zainstaluje wszystkie **wymagane zależności testowe używane w projekcie**:

- `vitest` – framework testowy
- `@vitest/ui` – UI mode dla testów
- `@vitest/coverage-v8` – raportowanie coverage
- `@testing-library/react` – testowanie hooków i komponentów React
- `@testing-library/user-event` – symulacja interakcji użytkownika
- `jsdom` – środowisko DOM dla testów

> Uwaga: testy nie wykonują żadnych realnych zapytań sieciowych – zależności służą wyłącznie do testów jednostkowych.

---

### 2. Uruchomienie Testów

```bash
# Uruchom wszystkie testy
npm test

# Tryb watch (automatyczne odświeżanie)
npm test -- --watch

# UI mode (wizualna nawigacja)
npm run test:ui

# Coverage report
npm run test:coverage
```

---

## Dostępne Komendy

### Podstawowe

```bash
npm test
npm test -- --watch
npm run test:ui
npm run test:coverage
```

### Zaawansowane

```bash
# Konkretny plik testowy
npm test updateSrs.test.ts

# Filtrowanie po nazwie testu
npm test -- -t "powinien zresetować"

# Verbose output
npm test -- --reporter=verbose

# Uruchom tylko testy zmienionych plików
npm test -- --changed
```

---

## Struktura Projektu Testowego

```
├── vitest.config.ts              # Konfiguracja Vitest
├── src/
│   ├── test/
│   │   ├── setup.ts              # Global setup (mocks, cleanup)
│   │   └── README.md             # Dokumentacja testów
│   ├── lib/services/
│   │   ├── srs/
│   │   │   └── updateSrs.test.ts
│   │   └── generation/
│   │       └── completeGenerationRequest.test.ts
│   └── components/reviews/
│       └── reviewStorage.test.ts
├── TEST_SUMMARY.md               # Podsumowanie testów
└── TESTING_SETUP.md              # Ten plik
```

---

## Konfiguracja Vitest

### vitest.config.ts

- Environment: `jsdom`
- Globalne API Vitest (`globals: true`)
- Setup file: `src/test/setup.ts`
- Coverage provider: `v8`

Konfiguracja jest zoptymalizowana pod **testy jednostkowe logiki biznesowej**.

---

### src/test/setup.ts

Plik wykonywany przed każdym testem:

- mock `sessionStorage`
- czyszczenie mocków (`vi.clearAllMocks`)
- reset storage przed każdym testem

> Setup nie mockuje logiki domenowej – jedynie granice systemu (np. storage).

---

## Typowe Problemy i Rozwiązania

### Problem: Testy nie znajdują modułów

```bash
rm -rf node_modules package-lock.json
npm install
```

---

### Problem: "Cannot find module '@/types'"

Upewnij się, że alias jest poprawnie ustawiony w `vitest.config.ts`:

```ts
resolve: {
  alias: {
    "@": path.resolve(__dirname, "./src"),
  },
}
```

---

### Problem: Timers nie działają w testach

```ts
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});
```

---

### Problem: sessionStorage is not defined

Mock `sessionStorage` jest ładowany automatycznie z `src/test/setup.ts`. Sprawdź, czy plik jest uwzględniony w `vitest.config.ts`.

---

## Coverage

Coverage służy do **orientacyjnej kontroli jakości**, a nie jako twardy wskaźnik poprawności logiki.

Raport generowany jest poleceniem:

```bash
npm run test:coverage
```

Dostępne są:

- podsumowanie w terminalu
- raport HTML w katalogu `coverage/`

---

## Best Practices

- Każdy test jest niezależny
- Testy jednostkowe nie wykonują zapytań sieciowych
- Zewnętrzne usługi (AI, storage) są traktowane jako granice systemu
- Testy weryfikują **zachowanie**, nie implementację

---

## Podsumowanie

Ten setup umożliwia szybkie i powtarzalne uruchamianie testów jednostkowych,
bez zależności od sieci, środowiska ani stanu aplikacji.

```bash
npm install
npm test
```
