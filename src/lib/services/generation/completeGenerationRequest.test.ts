import { describe, it, expect, vi, beforeEach } from "vitest";
import { completeGenerationRequest, GenerationServiceError } from "./completeGenerationRequest";
import type { GenerationRequestCreateCommand } from "@/types";

// Mock dla generateFlashcardsWithAI
vi.mock("./generateFlashcardsWithAI", () => ({
  generateFlashcardsWithAI: vi.fn(),
  FlashcardGenerationError: class FlashcardGenerationError extends Error {
    constructor(
      message: string,
      public code: string
    ) {
      super(message);
    }
  },
}));

describe("completeGenerationRequest", () => {
  // Mock Supabase client
  const createMockSupabase = () => ({
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generowanie z AI", () => {
    it("powinien użyć AI do wygenerowania fiszek", async () => {
      // Arrange
      const supabase = createMockSupabase();
      const { generateFlashcardsWithAI } = await import("./generateFlashcardsWithAI");

      const aiFlashcards = [
        { front: "Q1 AI", back: "A1 AI", card_type: "qa" as const, is_manual: false, edited_by_ai: true },
        { front: "Q2 AI", back: "A2 AI", card_type: "qa" as const, is_manual: false, edited_by_ai: true },
      ];

      vi.mocked(generateFlashcardsWithAI).mockResolvedValue(aiFlashcards);

      supabase.insert.mockReturnValue({ error: null });
      supabase.single.mockResolvedValue({
        data: { id: "req-123", status: "succeeded", created_at: new Date().toISOString() },
        error: null,
      });

      const command: GenerationRequestCreateCommand = {
        source_text: "Test with AI",
        requested_count: 2,
        language: "PL",
      };

      // Act
      await completeGenerationRequest(supabase as any, {
        requestId: "req-123",
        userId: "user-456",
        command,
      });

      // Assert
      expect(generateFlashcardsWithAI).toHaveBeenCalledWith({
        sourceText: "Test with AI",
        requestedCount: 2,
        language: "PL",
        model: undefined,
      });

      expect(supabase.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            front: "Q1 AI",
            back: "A1 AI",
            user_id: "user-456",
          }),
          expect.objectContaining({
            front: "Q2 AI",
            back: "A2 AI",
            user_id: "user-456",
          }),
        ])
      );
    });

    it("powinien rzucić błąd gdy AI zawiedzie", async () => {
      // Arrange
      const supabase = createMockSupabase();
      const { generateFlashcardsWithAI, FlashcardGenerationError } = await import("./generateFlashcardsWithAI");

      vi.mocked(generateFlashcardsWithAI).mockRejectedValue(
        new FlashcardGenerationError("AI service unavailable", "SERVICE_ERROR")
      );

      const command: GenerationRequestCreateCommand = {
        source_text: "Test",
        requested_count: 2,
        language: "PL",
      };

      // Act & Assert
      await expect(
        completeGenerationRequest(supabase as any, {
          requestId: "req-123",
          userId: "user-456",
          command,
        })
      ).rejects.toThrow(GenerationServiceError);

      // Sprawdź czy status został ustawiony na failed
      expect(supabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "failed",
          error_message: "AI service unavailable",
        })
      );

      // Sprawdź że fiszki NIE zostały dodane
      expect(supabase.insert).not.toHaveBeenCalled();
    });

    it("powinien przekazać model do generateFlashcardsWithAI", async () => {
      // Arrange
      const supabase = createMockSupabase();
      const { generateFlashcardsWithAI } = await import("./generateFlashcardsWithAI");

      vi.mocked(generateFlashcardsWithAI).mockResolvedValue([
        { front: "Q1", back: "A1", card_type: "qa", is_manual: false, edited_by_ai: true },
      ]);

      supabase.insert.mockReturnValue({ error: null });
      supabase.single.mockResolvedValue({
        data: { id: "req-123", status: "succeeded", created_at: new Date().toISOString() },
        error: null,
      });

      const command: GenerationRequestCreateCommand = {
        source_text: "Test",
        requested_count: 1,
        language: "EN",
        model: "custom-model-123",
      };

      // Act
      await completeGenerationRequest(supabase as any, {
        requestId: "req-123",
        userId: "user-456",
        command,
      });

      // Assert
      expect(generateFlashcardsWithAI).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "custom-model-123",
        })
      );
    });
  });

  describe("obsługa błędów", () => {
    it("powinien rzucić błąd gdy insert fiszek się nie powiedzie", async () => {
      // Arrange
      const supabase = createMockSupabase();
      const { generateFlashcardsWithAI } = await import("./generateFlashcardsWithAI");

      vi.mocked(generateFlashcardsWithAI).mockResolvedValue([
        { front: "Q1", back: "A1", card_type: "qa", is_manual: false, edited_by_ai: true },
      ]);

      supabase.insert.mockReturnValue({ error: { message: "Insert failed" } });

      const command: GenerationRequestCreateCommand = {
        source_text: "Test",
        requested_count: 1,
        language: "PL",
      };

      // Act & Assert
      await expect(
        completeGenerationRequest(supabase as any, {
          requestId: "req-123",
          userId: "user-456",
          command,
        })
      ).rejects.toThrow(GenerationServiceError);

      // Sprawdź czy status został ustawiony na failed
      expect(supabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "failed",
          error_message: "Nie udało się utworzyć fiszek.",
        })
      );
    });

    it("powinien rzucić błąd gdy update statusu się nie powiedzie", async () => {
      // Arrange
      const supabase = createMockSupabase();
      const { generateFlashcardsWithAI } = await import("./generateFlashcardsWithAI");

      vi.mocked(generateFlashcardsWithAI).mockResolvedValue([
        { front: "Q1", back: "A1", card_type: "qa", is_manual: false, edited_by_ai: true },
      ]);

      supabase.insert.mockReturnValue({ error: null });
      supabase.single.mockResolvedValue({
        data: null,
        error: { message: "Update failed" },
      });

      const command: GenerationRequestCreateCommand = {
        source_text: "Test",
        requested_count: 1,
        language: "PL",
      };

      // Act & Assert
      await expect(
        completeGenerationRequest(supabase as any, {
          requestId: "req-123",
          userId: "user-456",
          command,
        })
      ).rejects.toThrow(GenerationServiceError);
    });
  });

  describe("sukces", () => {
    it("powinien zwrócić poprawną odpowiedź po sukcesie", async () => {
      // Arrange
      const supabase = createMockSupabase();
      const { generateFlashcardsWithAI } = await import("./generateFlashcardsWithAI");

      vi.mocked(generateFlashcardsWithAI).mockResolvedValue([
        { front: "Q1", back: "A1", card_type: "qa", is_manual: false, edited_by_ai: true },
      ]);

      supabase.insert.mockReturnValue({ error: null });

      const expectedResponse = {
        id: "req-123",
        status: "succeeded",
        created_at: "2026-01-29T12:00:00Z",
      };

      supabase.single.mockResolvedValue({
        data: expectedResponse,
        error: null,
      });

      const command: GenerationRequestCreateCommand = {
        source_text: "Test",
        requested_count: 1,
        language: "PL",
      };

      // Act
      const result = await completeGenerationRequest(supabase as any, {
        requestId: "req-123",
        userId: "user-456",
        command,
      });

      // Assert
      expect(result).toEqual(expectedResponse);
    });
  });
});
