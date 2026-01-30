import type { APIRoute } from "astro";
import { z } from "zod";

import type {
  GenerationRequestCreateResponseDTO,
  GenerationRequestListQuery,
  GenerationRequestListResponseDTO,
} from "@/types";
import { AuthGuardError, requireUser } from "@/lib/services/auth/require-user";
import { completeGenerationRequest, GenerationServiceError } from "@/lib/services/generation/completeGenerationRequest";

export const prerender = false;

const createSchema = z.object({
  source_text: z
    .string()
    .min(1, "Tekst źródłowy jest wymagany.")
    .max(1000, "Tekst źródłowy może mieć maksymalnie 1000 znaków."),
  requested_count: z.number().int().positive("Liczba fiszek musi być większa od zera."),
  language: z.enum(["PL", "EN"], { errorMap: () => ({ message: "Nieprawidłowy język." }) }),
  model: z.string().min(1).optional(),
});

const listQuerySchema = z.object({
  status: z.enum(["pending", "processing", "succeeded", "failed", "timeout"]).optional(),
  limit: z
    .preprocess(
      (value) => (value === null || value === undefined || value === "" ? undefined : Number(value)),
      z.number().int().min(1).max(100)
    )
    .optional()
    .default(20),
  cursor: z.string().optional(),
  sort: z.enum(["created_at", "-created_at"]).optional().default("-created_at"),
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
 * GET /api/generation-requests
 */
export const GET: APIRoute = async (context) => {
  try {
    const user = await requireUser(context.locals.supabase, context.request.headers.get("authorization"));
    const url = new URL(context.request.url);
    const parsed = listQuerySchema.safeParse({
      status: url.searchParams.get("status") ?? undefined,
      limit: url.searchParams.get("limit"),
      cursor: url.searchParams.get("cursor") ?? undefined,
      sort: url.searchParams.get("sort") ?? undefined,
    });

    if (!parsed.success) {
      return jsonResponse(400, { error: formatValidationError(parsed.error) });
    }

    const query: GenerationRequestListQuery = parsed.data;
    const sortAsc = query.sort === "created_at";
    const limit = query.limit ?? 20;

    let dbQuery = context.locals.supabase
      .from("generation_requests")
      .select("id,status,created_at,requested_count,language,model,completed_at,updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: sortAsc })
      .limit(limit + 1);

    if (query.status) {
      dbQuery = dbQuery.eq("status", query.status);
    }

    if (query.cursor) {
      dbQuery = sortAsc ? dbQuery.gt("created_at", query.cursor) : dbQuery.lt("created_at", query.cursor);
    }

    const { data, error } = await dbQuery;
    if (error) {
      return jsonResponse(500, { error: "Błąd zapytania do bazy danych." });
    }

    const items = (data ?? []).slice(0, limit);
    const hasMore = (data ?? []).length > limit;
    const lastItem = items[items.length - 1];
    const nextCursor = hasMore && lastItem ? lastItem.created_at : null;

    const response: GenerationRequestListResponseDTO = {
      items,
      next_cursor: nextCursor,
    };

    return jsonResponse(200, response);
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return jsonResponse(error.status, { error: error.message });
    }

    return jsonResponse(500, { error: "Nieoczekiwany błąd serwera." });
  }
};

/**
 * POST /api/generation-requests
 */
export const POST: APIRoute = async (context) => {
  let payload: unknown;

  try {
    payload = await context.request.json();
  } catch {
    return jsonResponse(400, { error: "Nieprawidłowe body JSON." });
  }

  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonResponse(400, { error: formatValidationError(parsed.error) });
  }

  try {
    const user = await requireUser(context.locals.supabase, context.request.headers.get("authorization"));
    const { data, error } = await context.locals.supabase
      .from("generation_requests")
      .insert({
        source_text: parsed.data.source_text,
        requested_count: parsed.data.requested_count,
        language: parsed.data.language,
        model: parsed.data.model ?? null,
        status: "pending",
        user_id: user.id,
      })
      .select("id,status,created_at")
      .single();

    if (error) {
      return jsonResponse(500, { error: "Błąd zapisu do bazy danych." });
    }

    if (!data) {
      return jsonResponse(500, { error: "Nie udało się utworzyć żądania." });
    }

    const dto = await completeGenerationRequest(context.locals.supabase, {
      requestId: data.id,
      userId: user.id,
      command: parsed.data,
    });
    return jsonResponse(202, dto satisfies GenerationRequestCreateResponseDTO);
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return jsonResponse(error.status, { error: error.message });
    }

    if (error instanceof GenerationServiceError) {
      return jsonResponse(error.status, { error: error.message });
    }

    return jsonResponse(500, { error: "Nieoczekiwany błąd serwera." });
  }
};
