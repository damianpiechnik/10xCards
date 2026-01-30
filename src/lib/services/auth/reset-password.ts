import type { AuthResetPasswordCommand, SuccessResponseDTO } from "@/types";
import type { supabaseClient } from "@/db/supabase.client";

type SupabaseClientLike = typeof supabaseClient;

/**
 * Inicjuje reset hasła. Zawsze zwraca success, aby nie ujawniać istnienia emaila.
 */
export const resetPasswordForEmail = async (
  supabase: SupabaseClientLike,
  command: AuthResetPasswordCommand,
  redirectTo: string
): Promise<SuccessResponseDTO> => {
  await supabase.auth.resetPasswordForEmail(command.email, { redirectTo });

  return { success: true };
};
