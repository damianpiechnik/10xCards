import type { SuccessResponseDTO } from "@/types";
import type { supabaseClient } from "@/db/supabase.client";

type SupabaseClientLike = typeof supabaseClient;

export class AuthServiceError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const mapSignOutErrorStatus = (message: string, status?: number | null) => {
  if (status === 401 || status === 403) {
    return 401;
  }

  const normalized = message.toLowerCase();
  if (normalized.includes("jwt") || normalized.includes("token")) {
    return 401;
  }

  return 500;
};

/**
 * Wylogowuje użytkownika w Supabase.
 */
export const signOutUser = async (supabase: SupabaseClientLike): Promise<SuccessResponseDTO> => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    const status = mapSignOutErrorStatus(error.message, error.status);
    throw new AuthServiceError(error.message, status);
  }

  return { success: true };
};
