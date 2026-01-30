import type { supabaseClient } from "@/db/supabase.client";
import type { GenerationRequestCreateCommand, GenerationRequestCreateResponseDTO } from "@/types";
import { generateFlashcardsWithAI, FlashcardGenerationError } from "./generateFlashcardsWithAI";

type SupabaseClientLike = typeof supabaseClient;

export class GenerationServiceError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Fallback został usunięty - jeśli AI nie działa, użytkownik dostaje błąd

interface CompleteGenerationRequestInput {
  requestId: string;
  userId: string;
  command: GenerationRequestCreateCommand;
}

export const completeGenerationRequest = async (
  supabase: SupabaseClientLike,
  input: CompleteGenerationRequestInput
): Promise<GenerationRequestCreateResponseDTO> => {
  const nowIso = new Date().toISOString();

  const markFailed = async (message: string) => {
    await supabase
      .from("generation_requests")
      .update({
        status: "failed",
        error_message: message,
        updated_at: nowIso,
      })
      .eq("id", input.requestId)
      .eq("user_id", input.userId);
  };

  // Próba generowania fiszek z AI
  let aiFlashcards;
  try {
    aiFlashcards = await generateFlashcardsWithAI({
      sourceText: input.command.source_text,
      requestedCount: input.command.requested_count,
      language: input.command.language,
      model: input.command.model ?? undefined,
    });

    // eslint-disable-next-line no-console
    console.log(`Pomyślnie wygenerowano ${aiFlashcards.length} fiszek z AI dla requestId: ${input.requestId}`);
  } catch (error) {
    // Logowanie błędu
    // eslint-disable-next-line no-console
    console.error(
      `❌ Błąd generowania fiszek z AI dla requestId: ${input.requestId}`,
      error instanceof FlashcardGenerationError ? error.code : "UNKNOWN",
      error instanceof Error ? error.message : error
    );

    // Oznacz jako failed i zwróć błąd do użytkownika
    const errorMessage =
      error instanceof FlashcardGenerationError
        ? error.message
        : "Nieoczekiwany błąd podczas generowania fiszek z AI.";

    await markFailed(errorMessage);
    throw new GenerationServiceError(errorMessage, 500);
  }

  const payload = aiFlashcards;

  const { error: insertError } = await supabase.from("flashcards").insert(
    payload.map((card) => ({
      ...card,
      user_id: input.userId,
    }))
  );

  if (insertError) {
    await markFailed("Nie udało się utworzyć fiszek.");
    throw new GenerationServiceError("Nie udało się utworzyć fiszek.", 500);
  }

  const { data: updated, error: updateError } = await supabase
    .from("generation_requests")
    .update({
      status: "succeeded",
      completed_at: nowIso,
      updated_at: nowIso,
      error_message: null,
    })
    .eq("id", input.requestId)
    .eq("user_id", input.userId)
    .select("id,status,created_at")
    .single();

  if (updateError || !updated) {
    await markFailed("Nie udało się zaktualizować statusu generacji.");
    throw new GenerationServiceError("Nie udało się zaktualizować statusu generacji.", 500);
  }

  return updated;
};
