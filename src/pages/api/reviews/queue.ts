import type { APIRoute } from "astro";
import { z } from "zod";

import type { ReviewQueueQuery, ReviewQueueResponseDTO } from "@/types";
import { AuthGuardError, requireUser } from "@/lib/services/auth/require-user";

export const prerender = false;

const querySchema = z.object({
  limit: z
    .preprocess(
      (value) => (value === null || value === undefined || value === "" ? undefined : Number(value)),
      z.number().int().min(1).max(100)
    )
    .optional()
    .default(20),
});

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

const formatValidationError = (error: z.ZodError) => error.issues.map((issue) => issue.message).join(" ");

/**
 * GET /api/reviews/queue
 */
export const GET: APIRoute = async (context) => {
  try {
    const user = await requireUser(context.locals.supabase, context.request.headers.get("authorization"));
    const url = new URL(context.request.url);
    const parsed = querySchema.safeParse({ limit: url.searchParams.get("limit") });

    if (!parsed.success) {
      return jsonResponse(400, { error: formatValidationError(parsed.error) });
    }

    const query: ReviewQueueQuery = parsed.data;
    const limit = query.limit ?? 20;
    const nowIso = new Date().toISOString();

    const { data, error } = await context.locals.supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .lte("due_at", nowIso)
      .order("due_at", { ascending: true })
      .limit(limit);

    if (error) {
      return jsonResponse(500, { error: "Błąd zapytania do bazy danych." });
    }

    const response: ReviewQueueResponseDTO = {
      items: data ?? [],
    };

    return jsonResponse(200, response);
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return jsonResponse(error.status, { error: error.message });
    }

    return jsonResponse(500, { error: "Nieoczekiwany błąd serwera." });
  }
};
