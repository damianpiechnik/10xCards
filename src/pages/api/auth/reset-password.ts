import type { APIRoute } from "astro";
import { z } from "zod";

import type { AuthResetPasswordCommand, SuccessResponseDTO } from "@/types";
import { resetPasswordForEmail } from "@/lib/services/auth/reset-password";
import { createSupabaseServerInstance } from "@/db/supabase.client";

export const prerender = false;

const resetPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Nieprawidłowy adres email.")
    .transform((value) => value.toLowerCase()),
});

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

const formatValidationError = (error: z.ZodError<AuthResetPasswordCommand>) =>
  error.issues.map((issue) => issue.message).join(" ");

/**
 * POST /api/auth/reset-password
 */
export const POST: APIRoute = async (context) => {
  let payload: unknown;

  try {
    payload = await context.request.json();
  } catch {
    return jsonResponse(400, { error: "Nieprawidłowe body JSON." });
  }

  const parsed = resetPasswordSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonResponse(400, { error: formatValidationError(parsed.error) });
  }

  // Create server-side Supabase instance
  const supabase = createSupabaseServerInstance({
    cookies: context.cookies,
    headers: context.request.headers,
  });

  const redirectTo = new URL("/auth/update-password", context.request.url).toString();
  await resetPasswordForEmail(supabase, parsed.data, redirectTo);
  const dto: SuccessResponseDTO = { success: true };
  return jsonResponse(200, dto);
};
