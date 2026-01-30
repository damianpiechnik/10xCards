import type { APIRoute } from "astro";
import { z } from "zod";

import type { AuthResponseDTO, AuthSignInCommand } from "@/types";
import { createSupabaseServerInstance } from "@/db/supabase.client";

export const prerender = false;

const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Nieprawidłowy adres email.")
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków.").max(72, "Hasło może mieć maksymalnie 72 znaki."),
});

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

const formatValidationError = (error: z.ZodError<AuthSignInCommand>) =>
  error.issues.map((issue) => issue.message).join(" ");

const toIsoString = (value: number | null | undefined) => {
  if (typeof value === "number") {
    return new Date(value * 1000).toISOString();
  }
  return new Date().toISOString();
};

/**
 * POST /api/auth/sign-in
 */
export const POST: APIRoute = async (context) => {
  let payload: unknown;

  try {
    payload = await context.request.json();
  } catch {
    return jsonResponse(400, { error: "Nieprawidłowe body JSON." });
  }

  const parsed = signInSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonResponse(400, { error: formatValidationError(parsed.error) });
  }

  // Create server-side Supabase instance
  const supabase = createSupabaseServerInstance({
    cookies: context.cookies,
    headers: context.request.headers,
  });

  // Sign in with Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    const status = error.status === 400 ? 401 : (error.status ?? 500);
    return jsonResponse(status, { error: error.message });
  }

  if (!data.user || !data.session) {
    return jsonResponse(500, { error: "Brak danych użytkownika lub sesji." });
  }

  const response: AuthResponseDTO = {
    user: {
      user_id: data.user.id,
      email: data.user.email ?? parsed.data.email,
    },
    session: {
      user_id: data.user.id,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: toIsoString(data.session.expires_at),
    },
  };

  return jsonResponse(200, response);
};
