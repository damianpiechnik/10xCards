import type { User } from "@supabase/supabase-js";
import type { supabaseClient } from "@/db/supabase.client";

type SupabaseClientLike = typeof supabaseClient;

export class AuthGuardError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const extractBearerToken = (authHeader: string | null) => {
  if (!authHeader) {
    return null;
  }

  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.replace("Bearer ", "").trim();
};

export const requireUser = async (supabase: SupabaseClientLike, authHeader: string | null): Promise<User> => {
  const token = extractBearerToken(authHeader);
  if (!token) {
    throw new AuthGuardError("Brak tokenu autoryzacji.", 401);
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new AuthGuardError("Nieprawidłowy token.", 401);
  }

  return data.user;
};
