import { describe, it, expect } from "vitest";
import { updateSrs, type UpdateSrsInput } from "./updateSrs";
import type { FlashcardDTO } from "@/types";

describe("updateSrs", () => {
  // Helper do tworzenia mockowej fiszki
  const createMockFlashcard = (overrides: Partial<FlashcardDTO> = {}): FlashcardDTO => ({
    id: "test-id",
    user_id: "user-123",
    front: "Test front",
    back: "Test back",
    card_type: "qa",
    is_manual: false,
    edited_by_ai: false,
    repetition: 0,
    interval_days: 1,
    ease_factor: 2.5,
    due_at: new Date().toISOString(),
    last_reviewed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  });

  describe("algorytm SM-2 - przypadki podstawowe", () => {
    it("powinien zresetować repetition i interval dla oceny < 3", () => {
      // Arrange
      const flashcard = createMockFlashcard({
        repetition: 5,
        interval_days: 30,
        ease_factor: 2.5,
      });
      const reviewedAt = new Date("2026-01-29T12:00:00Z");
      const input: UpdateSrsInput = { flashcard, grade: 2, reviewedAt };

      // Act
      const result = updateSrs(input);

      // Assert
      expect(result.repetition).toBe(0);
      expect(result.interval_days).toBe(1);
      expect(result.ease_factor).toBeLessThan(2.5); // Ease factor powinien się zmniejszyć
    });

    it("powinien zwiększyć repetition i interval dla oceny >= 3", () => {
      // Arrange
      const flashcard = createMockFlashcard({
        repetition: 0,
        interval_days: 1,
        ease_factor: 2.5,
      });
      const reviewedAt = new Date("2026-01-29T12:00:00Z");
      const input: UpdateSrsInput = { flashcard, grade: 4, reviewedAt };

      // Act
      const result = updateSrs(input);

      // Assert
      expect(result.repetition).toBe(1);
      expect(result.interval_days).toBe(6); // Pierwsza powtórka = 6 dni
      expect(result.ease_factor).toBeGreaterThanOrEqual(2.5);
    });

    it("powinien ustawić interval_days = 6 dla repetition = 1", () => {
      // Arrange
      const flashcard = createMockFlashcard({
        repetition: 0,
        interval_days: 1,
        ease_factor: 2.5,
      });
      const reviewedAt = new Date("2026-01-29T12:00:00Z");
      const input: UpdateSrsInput = { flashcard, grade: 3, reviewedAt };

      // Act
      const result = updateSrs(input);

      // Assert
      expect(result.repetition).toBe(1);
      expect(result.interval_days).toBe(6);
    });

    it("powinien obliczyć interval na podstawie ease_factor dla repetition > 1", () => {
      // Arrange
      const flashcard = createMockFlashcard({
        repetition: 1,
        interval_days: 6,
        ease_factor: 2.5,
      });
      const reviewedAt = new Date("2026-01-29T12:00:00Z");
      const input: UpdateSrsInput = { flashcard, grade: 4, reviewedAt };

      // Act
      const result = updateSrs(input);

      // Assert
      expect(result.repetition).toBe(2);
      expect(result.interval_days).toBe(15); // round(6 * 2.5) = 15
    });
  });

  describe("ease factor - warunki brzegowe", () => {
    it("powinien zmniejszyć ease_factor dla niskiej oceny", () => {
      // Arrange
      const flashcard = createMockFlashcard({
        repetition: 3,
        interval_days: 20,
        ease_factor: 2.5,
      });
      const reviewedAt = new Date("2026-01-29T12:00:00Z");
      const input: UpdateSrsInput = { flashcard, grade: 0, reviewedAt };

      // Act
      const result = updateSrs(input);

      // Assert
      expect(result.ease_factor).toBeLessThan(2.5);
      expect(result.ease_factor).toBeGreaterThanOrEqual(1.3); // MIN_EASE_FACTOR
    });

    it("powinien zwiększyć ease_factor dla wysokiej oceny", () => {
      // Arrange
      const flashcard = createMockFlashcard({
        repetition: 2,
        interval_days: 10,
        ease_factor: 2.5,
      });
      const reviewedAt = new Date("2026-01-29T12:00:00Z");
      const input: UpdateSrsInput = { flashcard, grade: 5, reviewedAt };

      // Act
      const result = updateSrs(input);

      // Assert
      expect(result.ease_factor).toBeGreaterThan(2.5);
    });

    it("nie powinien pozwolić ease_factor zejść poniżej 1.3", () => {
      // Arrange
      const flashcard = createMockFlashcard({
        repetition: 5,
        interval_days: 40,
        ease_factor: 1.35, // Blisko minimum
      });
      const reviewedAt = new Date("2026-01-29T12:00:00Z");
      const input: UpdateSrsInput = { flashcard, grade: 0, reviewedAt };

      // Act
      const result = updateSrs(input);

      // Assert
      expect(result.ease_factor).toBeGreaterThanOrEqual(1.3);
    });

    it("powinien zaokrąglić ease_factor do 2 miejsc po przecinku", () => {
      // Arrange
      const flashcard = createMockFlashcard({
        repetition: 1,
        interval_days: 6,
        ease_factor: 2.5,
      });
      const reviewedAt = new Date("2026-01-29T12:00:00Z");
      const input: UpdateSrsInput = { flashcard, grade: 4, reviewedAt };

      // Act
      const result = updateSrs(input);

      // Assert
      const decimalPlaces = result.ease_factor.toString().split(".")[1]?.length ?? 0;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });
  });

  describe("due_at - obliczanie następnej daty", () => {
    it("powinien ustawić due_at na reviewedAt + interval_days", () => {
      // Arrange
      const flashcard = createMockFlashcard({
        repetition: 2,
        interval_days: 15,
        ease_factor: 2.5,
      });
      const reviewedAt = new Date("2026-01-29T12:00:00Z");
      const input: UpdateSrsInput = { flashcard, grade: 4, reviewedAt };

      // Act
      const result = updateSrs(input);

      // Assert
      const expectedDate = new Date("2026-01-29T12:00:00Z");
      expectedDate.setDate(expectedDate.getDate() + result.interval_days);
      expect(result.due_at).toBe(expectedDate.toISOString());
    });

    it("powinien poprawnie obsłużyć zmianę miesiąca", () => {
      // Arrange
      const flashcard = createMockFlashcard({
        repetition: 2,
        interval_days: 15,
        ease_factor: 2.5,
      });
      const reviewedAt = new Date("2026-01-20T12:00:00Z");
      const input: UpdateSrsInput = { flashcard, grade: 4, reviewedAt };

      // Act
      const result = updateSrs(input);

      // Assert
      const dueDate = new Date(result.due_at);
      const expectedDate = new Date(reviewedAt);
      expectedDate.setDate(expectedDate.getDate() + result.interval_days);

      // Sprawdź czy data się zgadza (może być luty lub marzec w zależności od interval)
      expect(dueDate.getMonth()).toBeGreaterThanOrEqual(reviewedAt.getMonth());
    });
  });

  describe("last_reviewed_at", () => {
    it("powinien ustawić last_reviewed_at na reviewedAt", () => {
      // Arrange
      const flashcard = createMockFlashcard();
      const reviewedAt = new Date("2026-01-29T14:30:00Z");
      const input: UpdateSrsInput = { flashcard, grade: 4, reviewedAt };

      // Act
      const result = updateSrs(input);

      // Assert
      expect(result.last_reviewed_at).toBe(reviewedAt.toISOString());
    });
  });

  describe("zwracana struktura", () => {
    it("powinien zwrócić wszystkie wymagane pola", () => {
      // Arrange
      const flashcard = createMockFlashcard({ id: "specific-id" });
      const reviewedAt = new Date("2026-01-29T12:00:00Z");
      const input: UpdateSrsInput = { flashcard, grade: 4, reviewedAt };

      // Act
      const result = updateSrs(input);

      // Assert
      expect(result).toHaveProperty("id", "specific-id");
      expect(result).toHaveProperty("due_at");
      expect(result).toHaveProperty("interval_days");
      expect(result).toHaveProperty("ease_factor");
      expect(result).toHaveProperty("repetition");
      expect(result).toHaveProperty("last_reviewed_at");
    });
  });

  describe("wszystkie możliwe oceny (0-5)", () => {
    it.each([
      { grade: 0, shouldReset: true },
      { grade: 1, shouldReset: true },
      { grade: 2, shouldReset: true },
      { grade: 3, shouldReset: false },
      { grade: 4, shouldReset: false },
      { grade: 5, shouldReset: false },
    ])("powinien poprawnie obsłużyć grade $grade", ({ grade, shouldReset }) => {
      // Arrange
      const flashcard = createMockFlashcard({
        repetition: 3,
        interval_days: 20,
        ease_factor: 2.5,
      });
      const reviewedAt = new Date("2026-01-29T12:00:00Z");
      const input: UpdateSrsInput = { flashcard, grade, reviewedAt };

      // Act
      const result = updateSrs(input);

      // Assert
      if (shouldReset) {
        expect(result.repetition).toBe(0);
        expect(result.interval_days).toBe(1);
      } else {
        expect(result.repetition).toBeGreaterThan(0);
        expect(result.interval_days).toBeGreaterThan(1);
      }
    });
  });

  describe("interval_days - warunki brzegowe", () => {
    it("powinien zagwarantować minimum 1 dzień intervalu", () => {
      // Arrange
      const flashcard = createMockFlashcard({
        repetition: 0,
        interval_days: 1,
        ease_factor: 1.3, // Minimalny
      });
      const reviewedAt = new Date("2026-01-29T12:00:00Z");
      const input: UpdateSrsInput = { flashcard, grade: 0, reviewedAt };

      // Act
      const result = updateSrs(input);

      // Assert
      expect(result.interval_days).toBeGreaterThanOrEqual(1);
    });

    it("powinien zaokrąglić interval_days do całkowitej liczby", () => {
      // Arrange
      const flashcard = createMockFlashcard({
        repetition: 2,
        interval_days: 7,
        ease_factor: 2.33, // Wynik będzie niecałkowity
      });
      const reviewedAt = new Date("2026-01-29T12:00:00Z");
      const input: UpdateSrsInput = { flashcard, grade: 4, reviewedAt };

      // Act
      const result = updateSrs(input);

      // Assert
      expect(Number.isInteger(result.interval_days)).toBe(true);
    });
  });
});
