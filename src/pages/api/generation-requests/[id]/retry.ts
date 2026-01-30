import type { APIRoute } from "astro";
import { z } from "zod";

import type { GenerationRequestRetryResponseDTO } from "@/types";
import { AuthGuardError, requireUser } from "@/lib/services/auth/require-user";

export const prerender = false;

const idSchema = z.string().uuid("Nieprawidłowy identyfikator żądania.");

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

const formatValidationError = (error: z.ZodError) => error.issues.map((issue) => issue.message).join(" ");

const isNotFoundError = (error: { code?: string | null; status?: number | null }) =>
  error.code === "PGRST116" || error.status === 406 || error.status === 404;

/**
 * POST /api/generation-requests/{id}/retry
 */
export const POST: APIRoute = async (context) => {
  const { id } = context.params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) {
    return jsonResponse(400, { error: formatValidationError(parsedId.error) });
  }

  try {
    const user = await requireUser(context.locals.supabase, context.request.headers.get("authorization"));
    const { data, error } = await context.locals.supabase
      .from("generation_requests")
      .select("id,status,created_at,requested_count,language,model,completed_at,updated_at,error_message,source_text")
      .eq("id", parsedId.data)
      .eq("user_id", user.id)
      .single();

    if (error) {
      if (isNotFoundError(error)) {
        return jsonResponse(404, { error: "Nie znaleziono żądania." });
      }

      return jsonResponse(500, { error: "Błąd zapytania do bazy danych." });
    }

    if (!data) {
      return jsonResponse(404, { error: "Nie znaleziono żądania." });
    }

    if (data.status === "processing" || data.status === "pending") {
      return jsonResponse(409, { error: "Żądanie jest już przetwarzane." });
    }

    if (data.status !== "failed" && data.status !== "timeout") {
      return jsonResponse(400, { error: "Nie można ponowić tego żądania." });
    }

    const { data: updated, error: updateError } = await context.locals.supabase
      .from("generation_requests")
      .update({
        status: "processing",
        error_message: null,
      })
      .eq("id", parsedId.data)
      .eq("user_id", user.id)
      .select("id,status,created_at,requested_count,language,model,completed_at,updated_at,error_message,source_text")
      .single();

    if (updateError) {
      return jsonResponse(500, { error: "Nie udało się zaktualizować żądania." });
    }

    return jsonResponse(202, updated satisfies GenerationRequestRetryResponseDTO);
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return jsonResponse(error.status, { error: error.message });
    }

    return jsonResponse(500, { error: "Nieoczekiwany błąd serwera." });
  }
};
