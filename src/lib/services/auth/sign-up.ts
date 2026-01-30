import type { AuthSignUpCommand } from "@/types";
import type { supabaseClient } from "@/db/supabase.client";

type SupabaseClientLike = typeof supabaseClient;

export class AuthServiceError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const toIsoString = (value: number | null | undefined) => {
  if (typeof value === "number") {
    return new Date(value * 1000).toISOString();
  }

  return new Date().toISOString();
};

const mapAuthErrorStatus = (message: string, status?: number | null) => {
  if (status === 409) {
    return 409;
  }

  const normalized = message.toLowerCase();
  if (normalized.includes("already") || normalized.includes("registered") || normalized.includes("exists")) {
    return 409;
  }

  return 400;
};

export interface SignUpResult {
  requiresEmailConfirmation: boolean;
  user: {
    user_id: string;
    email: string;
  };
  session?: {
    user_id: string;
    access_token: string;
    refresh_token: string;
    expires_at: string;
  };
}

/**
 * Rejestruje użytkownika w Supabase i mapuje odpowiedź do AuthResponseDTO.
 * Jeśli Supabase wymaga potwierdzenia email, zwraca dane użytkownika bez sesji.
 */
export const signUpWithEmail = async (
  supabase: SupabaseClientLike,
  command: AuthSignUpCommand
): Promise<SignUpResult> => {
  const { data, error } = await supabase.auth.signUp({
    email: command.email,
    password: command.password,
  });

  if (error) {
    const status = mapAuthErrorStatus(error.message, error.status);
    throw new AuthServiceError(error.message, status);
  }

  if (!data.user) {
    throw new AuthServiceError("Brak danych użytkownika.", 500);
  }

  // Jeśli brak sesji, oznacza to że wymagane jest potwierdzenie email
  if (!data.session) {
    return {
      requiresEmailConfirmation: true,
      user: {
        user_id: data.user.id,
        email: data.user.email ?? command.email,
      },
    };
  }

  return {
    requiresEmailConfirmation: false,
    user: {
      user_id: data.user.id,
      email: data.user.email ?? command.email,
    },
    session: {
      user_id: data.user.id,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: toIsoString(data.session.expires_at),
    },
  };
};
