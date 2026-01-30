import type { APIRoute } from "astro";
import { z } from "zod";

import type { AuthResponseDTO, AuthSignUpCommand } from "@/types";
import { AuthServiceError, signUpWithEmail } from "@/lib/services/auth/sign-up";
import { createSupabaseServerInstance } from "@/db/supabase.client";

export const prerender = false;

const signUpSchema = z.object({
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

/**
 * Zwraca zwięzły komunikat walidacyjny dla body rejestracji.
 */
const formatValidationError = (error: z.ZodError<AuthSignUpCommand>) =>
  error.issues.map((issue) => issue.message).join(" ");

/**
 * POST /api/auth/sign-up
 *
 * Możliwe odpowiedzi:
 * - 201: Konto utworzone, użytkownik zalogowany (gdy confirmations wyłączone)
 * - 202: Konto utworzone, wymagane potwierdzenie email (gdy confirmations włączone)
 * - 400: Błąd walidacji lub inne błędy klienta
 * - 409: Użytkownik już istnieje
 * - 500: Błąd serwera
 */
export const POST: APIRoute = async (context) => {
  let payload: unknown;

  try {
    payload = await context.request.json();
  } catch {
    return jsonResponse(400, { error: "Nieprawidłowe body JSON." });
  }

  const parsed = signUpSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonResponse(400, { error: formatValidationError(parsed.error) });
  }

  // Create server-side Supabase instance
  const supabase = createSupabaseServerInstance({
    cookies: context.cookies,
    headers: context.request.headers,
  });

  try {
    const result = await signUpWithEmail(supabase, parsed.data);

    // Jeśli wymagane jest potwierdzenie email, zwróć 202 Accepted
    if (result.requiresEmailConfirmation) {
      return jsonResponse(202, {
        message: "Konto utworzone. Sprawdź swoją skrzynkę email i kliknij w link potwierdzający.",
        user: result.user,
      });
    }

    // W przeciwnym razie zwróć standardową odpowiedź z sesją (201 Created)
    if (!result.session) {
      return jsonResponse(500, { error: "Brak sesji pomimo braku wymaganego potwierdzenia." });
    }

    const dto: AuthResponseDTO = {
      user: result.user,
      session: result.session,
    };
    return jsonResponse(201, dto);
  } catch (error) {
    if (error instanceof AuthServiceError) {
      return jsonResponse(error.status, { error: error.message });
    }

    return jsonResponse(500, { error: "Nieoczekiwany błąd serwera." });
  }
};
