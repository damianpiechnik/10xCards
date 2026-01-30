import type { APIRoute } from "astro";

import type { UserProfileDTO } from "@/types";
import { AuthGuardError, requireUser } from "@/lib/services/auth/require-user";

export const prerender = false;

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

/**
 * GET /api/profile
 */
export const GET: APIRoute = async (context) => {
  try {
    const user = await requireUser(context.locals.supabase, context.request.headers.get("authorization"));
    const { data, error } = await context.locals.supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      return jsonResponse(500, { error: "Nie udało się pobrać profilu." });
    }

    const dto: UserProfileDTO = data;
    return jsonResponse(200, dto);
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return jsonResponse(error.status, { error: error.message });
    }

    return jsonResponse(500, { error: "Nieoczekiwany błąd serwera." });
  }
};
