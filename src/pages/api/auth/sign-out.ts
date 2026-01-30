import type { APIRoute } from "astro";

import type { SuccessResponseDTO } from "@/types";
import { AuthServiceError, signOutUser } from "@/lib/services/auth/sign-out";
import { createSupabaseServerInstance } from "@/db/supabase.client";

export const prerender = false;

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

/**
 * POST /api/auth/sign-out
 */
export const POST: APIRoute = async (context) => {
  // Create server-side Supabase instance
  const supabase = createSupabaseServerInstance({
    cookies: context.cookies,
    headers: context.request.headers,
  });

  try {
    const response = await signOutUser(supabase);
    const dto: SuccessResponseDTO = response;
    return jsonResponse(200, dto);
  } catch (error) {
    if (error instanceof AuthServiceError) {
      return jsonResponse(error.status, { error: error.message });
    }

    return jsonResponse(500, { error: "Nieoczekiwany błąd serwera." });
  }
};
