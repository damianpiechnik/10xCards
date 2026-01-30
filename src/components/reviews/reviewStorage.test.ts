import { describe, it, expect, beforeEach } from "vitest";
import { readReviewQueue, writeReviewQueue, clearReviewQueue } from "./reviewStorage";
import type { FlashcardDTO } from "@/types";

describe("reviewStorage", () => {
  // Helper do tworzenia mockowej fiszki
  const createMockFlashcard = (id: string, overrides: Partial<FlashcardDTO> = {}): FlashcardDTO => ({
    id,
    user_id: "user-123",
    front: `Front ${id}`,
    back: `Back ${id}`,
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

  beforeEach(() => {
    sessionStorage.clear();
  });

  describe("writeReviewQueue", () => {
    it("powinien zapisać kolejkę do sessionStorage", () => {
      // Arrange
      const items = [createMockFlashcard("fc-1"), createMockFlashcard("fc-2")];

      // Act
      writeReviewQueue(items);

      // Assert
      const stored = sessionStorage.getItem("reviews:queue");
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored ?? "");
      expect(parsed).toHaveLength(2);
      expect(parsed[0].id).toBe("fc-1");
      expect(parsed[1].id).toBe("fc-2");
    });

    it("powinien nadpisać istniejącą kolejkę", () => {
      // Arrange
      const firstItems = [createMockFlashcard("fc-1")];
      const secondItems = [createMockFlashcard("fc-2"), createMockFlashcard("fc-3")];

      // Act
      writeReviewQueue(firstItems);
      writeReviewQueue(secondItems);

      // Assert
      const stored = sessionStorage.getItem("reviews:queue");
      const parsed = JSON.parse(stored ?? "");
      expect(parsed).toHaveLength(2);
      expect(parsed[0].id).toBe("fc-2");
    });

    it("powinien zapisać pustą tablicę", () => {
      // Arrange
      const items: FlashcardDTO[] = [];

      // Act
      writeReviewQueue(items);

      // Assert
      const stored = sessionStorage.getItem("reviews:queue");
      const parsed = JSON.parse(stored ?? "");
      expect(parsed).toEqual([]);
    });

    it("nie powinien rzucić błędu gdy sessionStorage nie jest dostępne", () => {
      // Arrange
      const items = [createMockFlashcard("fc-1")];
      const originalSetItem = sessionStorage.setItem;
      sessionStorage.setItem = () => {
        throw new Error("Storage full");
      };

      // Act & Assert
      expect(() => writeReviewQueue(items)).not.toThrow();

      // Cleanup
      sessionStorage.setItem = originalSetItem;
    });
  });

  describe("readReviewQueue", () => {
    it("powinien odczytać kolejkę z sessionStorage", () => {
      // Arrange
      const items = [createMockFlashcard("fc-1"), createMockFlashcard("fc-2")];
      writeReviewQueue(items);

      // Act
      const result = readReviewQueue();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("fc-1");
      expect(result[1].id).toBe("fc-2");
    });

    it("powinien zwrócić pustą tablicę gdy kolejka nie istnieje", () => {
      // Arrange - sessionStorage jest puste

      // Act
      const result = readReviewQueue();

      // Assert
      expect(result).toEqual([]);
    });

    it("powinien zwrócić pustą tablicę dla niepoprawnego JSON", () => {
      // Arrange
      sessionStorage.setItem("reviews:queue", "invalid json");

      // Act
      const result = readReviewQueue();

      // Assert
      expect(result).toEqual([]);
    });

    it("powinien zwrócić pustą tablicę gdy wartość nie jest tablicą", () => {
      // Arrange
      sessionStorage.setItem("reviews:queue", JSON.stringify({ not: "array" }));

      // Act
      const result = readReviewQueue();

      // Assert
      expect(result).toEqual([]);
    });

    it("nie powinien rzucić błędu gdy sessionStorage nie jest dostępne", () => {
      // Arrange
      const originalGetItem = sessionStorage.getItem;
      sessionStorage.getItem = () => {
        throw new Error("Storage error");
      };

      // Act
      const result = readReviewQueue();

      // Assert
      expect(result).toEqual([]);

      // Cleanup
      sessionStorage.getItem = originalGetItem;
    });

    it("powinien zachować wszystkie właściwości fiszki", () => {
      // Arrange
      const items = [
        createMockFlashcard("fc-1", {
          front: "Custom front",
          back: "Custom back",
          repetition: 3,
          interval_days: 15,
          ease_factor: 2.8,
        }),
      ];
      writeReviewQueue(items);

      // Act
      const result = readReviewQueue();

      // Assert
      expect(result[0]).toMatchObject({
        id: "fc-1",
        front: "Custom front",
        back: "Custom back",
        repetition: 3,
        interval_days: 15,
        ease_factor: 2.8,
      });
    });
  });

  describe("clearReviewQueue", () => {
    it("powinien usunąć kolejkę z sessionStorage", () => {
      // Arrange
      const items = [createMockFlashcard("fc-1")];
      writeReviewQueue(items);
      expect(sessionStorage.getItem("reviews:queue")).not.toBeNull();

      // Act
      clearReviewQueue();

      // Assert
      expect(sessionStorage.getItem("reviews:queue")).toBeNull();
    });

    it("nie powinien rzucić błędu gdy kolejka nie istnieje", () => {
      // Arrange - sessionStorage jest puste

      // Act & Assert
      expect(() => clearReviewQueue()).not.toThrow();
    });

    it("nie powinien rzucić błędu gdy sessionStorage nie jest dostępne", () => {
      // Arrange
      const originalRemoveItem = sessionStorage.removeItem;
      sessionStorage.removeItem = () => {
        throw new Error("Storage error");
      };

      // Act & Assert
      expect(() => clearReviewQueue()).not.toThrow();

      // Cleanup
      sessionStorage.removeItem = originalRemoveItem;
    });
  });

  describe("integracja write-read-clear", () => {
    it("powinien poprawnie zapisać, odczytać i wyczyścić kolejkę", () => {
      // Arrange
      const items = [createMockFlashcard("fc-1"), createMockFlashcard("fc-2"), createMockFlashcard("fc-3")];

      // Act - zapisz
      writeReviewQueue(items);
      const readAfterWrite = readReviewQueue();

      // Assert - po zapisie
      expect(readAfterWrite).toHaveLength(3);

      // Act - wyczyść
      clearReviewQueue();
      const readAfterClear = readReviewQueue();

      // Assert - po wyczyszczeniu
      expect(readAfterClear).toEqual([]);
    });

    it("powinien obsłużyć wiele cykli zapisu i odczytu", () => {
      // Act & Assert
      for (let i = 0; i < 5; i++) {
        const items = Array.from({ length: i + 1 }, (_, idx) => createMockFlashcard(`fc-${i}-${idx}`));
        writeReviewQueue(items);
        const result = readReviewQueue();
        expect(result).toHaveLength(i + 1);
      }
    });
  });

  describe("warunki brzegowe", () => {
    it("powinien obsłużyć dużą liczbę fiszek", () => {
      // Arrange
      const items = Array.from({ length: 100 }, (_, idx) => createMockFlashcard(`fc-${idx}`));

      // Act
      writeReviewQueue(items);
      const result = readReviewQueue();

      // Assert
      expect(result).toHaveLength(100);
      expect(result[0].id).toBe("fc-0");
      expect(result[99].id).toBe("fc-99");
    });

    it("powinien obsłużyć fiszki ze specjalnymi znakami", () => {
      // Arrange
      const items = [
        createMockFlashcard("fc-1", {
          front: 'Front with "quotes" and \\ backslashes',
          back: "Back with\nnewlines\tand\ttabs",
        }),
      ];

      // Act
      writeReviewQueue(items);
      const result = readReviewQueue();

      // Assert
      expect(result[0].front).toBe('Front with "quotes" and \\ backslashes');
      expect(result[0].back).toBe("Back with\nnewlines\tand\ttabs");
    });

    it("powinien obsłużyć fiszki z datami w różnych formatach", () => {
      // Arrange
      const now = new Date();
      const items = [
        createMockFlashcard("fc-1", {
          due_at: now.toISOString(),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        }),
      ];

      // Act
      writeReviewQueue(items);
      const result = readReviewQueue();

      // Assert
      expect(result[0].due_at).toBe(now.toISOString());
      expect(result[0].created_at).toBe(now.toISOString());
    });
  });
});
