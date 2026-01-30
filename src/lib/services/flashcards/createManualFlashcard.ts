import type { FlashcardCreateCommand, FlashcardCreateResponseDTO } from "@/types";
import type { supabaseClient } from "@/db/supabase.client";

type SupabaseClientLike = typeof supabaseClient;

export class FlashcardServiceError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Tworzy ręczną fiszkę z domyślnymi polami SRS.
 */
export const createManualFlashcard = async (
  supabase: SupabaseClientLike,
  userId: string,
  command: FlashcardCreateCommand
): Promise<FlashcardCreateResponseDTO> => {
  const { data, error } = await supabase
    .from("flashcards")
    .insert({
      front: command.front,
      back: command.back,
      card_type: command.card_type,
      user_id: userId,
      is_manual: true,
      edited_by_ai: false,
    })
    .select("*")
    .single();

  if (error) {
    throw new FlashcardServiceError(error.message, 500);
  }

  if (!data) {
    throw new FlashcardServiceError("Nie udało się utworzyć fiszki.", 500);
  }

  return data;
};
