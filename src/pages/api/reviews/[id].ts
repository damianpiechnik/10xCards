import type { APIRoute } from "astro";
import { z } from "zod";

import type { ReviewSubmitResponseDTO } from "@/types";
import { AuthGuardError, requireUser } from "@/lib/services/auth/require-user";
import { updateSrs } from "@/lib/services/srs/updateSrs";

export const prerender = false;

const idSchema = z.string().uuid("Nieprawidłowy identyfikator fiszki.");
const bodySchema = z.object({
  grade: z.number().int().min(0, "Ocena musi być w zakresie 0-5.").max(5, "Ocena musi być w zakresie 0-5."),
  reviewed_at: z.string().datetime().optional(),
});

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
 * POST /api/reviews/{id}
 */
export const POST: APIRoute = async (context) => {
  const { id } = context.params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) {
    return jsonResponse(400, { error: formatValidationError(parsedId.error) });
  }

  let payload: unknown;

  try {
    payload = await context.request.json();
  } catch {
    return jsonResponse(400, { error: "Nieprawidłowe body JSON." });
  }

  const parsedBody = bodySchema.safeParse(payload);
  if (!parsedBody.success) {
    return jsonResponse(400, { error: formatValidationError(parsedBody.error) });
  }

  try {
    const user = await requireUser(context.locals.supabase, context.request.headers.get("authorization"));
    const { data, error } = await context.locals.supabase
      .from("flashcards")
      .select("*")
      .eq("id", parsedId.data)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (error) {
      if (isNotFoundError(error)) {
        return jsonResponse(404, { error: "Nie znaleziono fiszki." });
      }

      return jsonResponse(500, { error: "Błąd zapytania do bazy danych." });
    }

    if (!data) {
      return jsonResponse(404, { error: "Nie znaleziono fiszki." });
    }

    const reviewedAt = parsedBody.data.reviewed_at ? new Date(parsedBody.data.reviewed_at) : new Date();
    const srsUpdate = updateSrs({
      flashcard: data,
      grade: parsedBody.data.grade,
      reviewedAt,
    });

    const { error: updateError, data: updated } = await context.locals.supabase
      .from("flashcards")
      .update({
        due_at: srsUpdate.due_at,
        interval_days: srsUpdate.interval_days,
        ease_factor: srsUpdate.ease_factor,
        repetition: srsUpdate.repetition,
        last_reviewed_at: srsUpdate.last_reviewed_at,
      })
      .eq("id", parsedId.data)
      .eq("user_id", user.id)
      .select("id,due_at,interval_days,ease_factor,repetition,last_reviewed_at")
      .single();

    if (updateError) {
      return jsonResponse(500, { error: "Nie udało się zaktualizować fiszki." });
    }

    const response: ReviewSubmitResponseDTO = {
      flashcard: updated,
    };

    return jsonResponse(200, response);
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return jsonResponse(error.status, { error: error.message });
    }

    return jsonResponse(500, { error: "Nieoczekiwany błąd serwera." });
  }
};
