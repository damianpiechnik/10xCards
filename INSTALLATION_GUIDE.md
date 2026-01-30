# Przewodnik Instalacji – Testy Jednostkowe 10xCards

## ✅ Co Zostało Przygotowane

Zestaw **43 testów jednostkowych** obejmujących kluczowe obszary aplikacji:

- algorytm SRS (SM-2)
- logikę generacji fiszek
- lokalny storage kolejki powtórek

Testy koncentrują się na **logice biznesowej i warstwach brzegowych** (AI, storage) i nie wykonują realnych zapytań sieciowych.

---

## 📁 Pliki

### Konfiguracja

- `vitest.config.ts` – konfiguracja Vitest
- `src/test/setup.ts` – globalny setup (mock storage, cleanup)

### Testy

- `src/lib/services/srs/updateSrs.test.ts` – 20 testów (algorytm SM-2)
- `src/lib/services/generation/completeGenerationRequest.test.ts` – 14 testów (generacja fiszek)
- `src/components/reviews/reviewStorage.test.ts` – 18 testów (storage)

### Dokumentacja

- `TEST_SUMMARY.md` – opis faktycznego zakresu testów
- `TESTING_SETUP.md` – konfiguracja i uruchamianie
- `INSTALLATION_GUIDE.md` – ten plik

---

## 🚀 Instalacja

### 1. Instalacja zależności

```bash
npm install
```

Instalowane są wyłącznie zależności wymagane do **uruchamiania testów jednostkowych** (Vitest, Testing Library, jsdom).

---

### 2. Weryfikacja instalacji (opcjonalnie)

```bash
npm list vitest --depth=0
```

---

### 3. Uruchomienie testów

```bash
npm test
```

Poprawny wynik:

```
 Test Files  3 passed (3)
      Tests  43 passed (43)
```

---

### 4. UI mode (opcjonalnie)

```bash
npm run test:ui
```

Tryb UI służy do **lokalnego debugowania testów**.

---

### 5. Coverage (opcjonalnie)

```bash
npm run test:coverage
```

Coverage ma charakter **informacyjny** i nie jest traktowany jako jedyny wyznacznik jakości logiki.

---

## 📋 Dostępne Komendy

```bash
npm test
npm test -- --watch
npm run test:ui
npm run test:coverage
```

---

## 🎯 Co jest testowane

### Algorytm SM-2

- pełna logika obliczeń interwałów i ease factor
- wszystkie oceny 0–5
- warunki brzegowe (reset, minimum wartości)

### Generacja fiszek

- normalizacja i podział tekstu
- generowanie dokładnej liczby fiszek
- kontrolowana obsługa błędów AI
- fallback do lokalnej logiki

### Review storage

- zapis i odczyt z `sessionStorage`
- odporność na brak danych i błędny JSON
- brak wyjątków przy awarii storage

---

## 🔧 Typowe Problemy

### Testy nie uruchamiają się

```bash
rm -rf node_modules package-lock.json
npm install
```

### Błędy sessionStorage

Mock `sessionStorage` jest ładowany automatycznie w `src/test/setup.ts`.

---

## ✅ Podsumowanie

Dokument opisuje **rzeczywisty sposób instalacji i uruchamiania testów jednostkowych**.

Testy są:

- szybkie
- deterministyczne
- niezależne od sieci i środowiska

```bash
npm install
npm test
```
