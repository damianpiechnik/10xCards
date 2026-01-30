import type { APIRoute } from "astro";
import { z } from "zod";

import type { FlashcardCreateResponseDTO, FlashcardListQuery, FlashcardListResponseDTO } from "@/types";
import { createManualFlashcard, FlashcardServiceError } from "@/lib/services/flashcards/createManualFlashcard";
import { AuthGuardError, requireUser } from "@/lib/services/auth/require-user";

export const prerender = false;

const createSchema = z.object({
  front: z
    .string()
    .min(2, "Pole front musi mieć co najmniej 2 znaki.")
    .max(2000, "Pole front może mieć maksymalnie 2000 znaków."),
  back: z
    .string()
    .min(2, "Pole back musi mieć co najmniej 2 znaki.")
    .max(2000, "Pole back może mieć maksymalnie 2000 znaków."),
  card_type: z.enum(["qa", "front_back"], {
    errorMap: () => ({ message: "Nieprawidłowy typ fiszki." }),
  }),
});

const parseBoolean = (value: string | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return false; // domyślna wartość
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  // dla nieprawidłowych wartości też zwracamy false
  return false;
};

const listQuerySchema = z.object({
  limit: z
    .preprocess(
      (value) => (value === null || value === undefined || value === "" ? 20 : Number(value)),
      z.number().int().min(1).max(100)
    ),
  cursor: z
    .string()
    .nullable()
    .optional()
    .transform((val) => val ?? undefined),
  sort: z
    .enum(["created_at", "-created_at", "updated_at", "-updated_at"])
    .nullable()
    .optional()
    .transform((val) => val ?? "-created_at"),
  type: z
    .enum(["qa", "front_back"])
    .nullable()
    .optional()
    .transform((val) => val ?? undefined),
  deleted: z.preprocess(parseBoolean, z.boolean()),
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
 * GET /api/flashcards
 */
export const GET: APIRoute = async (context) => {
  try {
    const user = await requireUser(context.locals.supabase, context.request.headers.get("authorization"));
    const url = new URL(context.request.url);
    const queryParams = {
      limit: url.searchParams.get("limit"),
      cursor: url.searchParams.get("cursor") ?? undefined,
      sort: url.searchParams.get("sort") ?? undefined,
      type: url.searchParams.get("type") ?? undefined,
      deleted: url.searchParams.get("deleted"),
    };

    const parsed = listQuerySchema.safeParse(queryParams);
    if (!parsed.success) {
      return jsonResponse(400, { error: formatValidationError(parsed.error) });
    }

    const query: FlashcardListQuery = parsed.data;
    const sortField = query.sort?.startsWith("-") ? query.sort.slice(1) : query.sort ?? "created_at";
    const sortAsc = !query.sort?.startsWith("-");
    const limit = query.limit ?? 20;

    let dbQuery = context.locals.supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", user.id)
      .order(sortField as "created_at" | "updated_at", { ascending: sortAsc })
      .limit(limit + 1);

    if (query.type) {
      dbQuery = dbQuery.eq("card_type", query.type);
    }

    if (query.deleted) {
      dbQuery = dbQuery.not("deleted_at", "is", null);
    } else {
      dbQuery = dbQuery.is("deleted_at", null);
    }

    if (query.cursor) {
      dbQuery = sortAsc ? dbQuery.gt(sortField, query.cursor) : dbQuery.lt(sortField, query.cursor);
    }

    const { data, error } = await dbQuery;
    if (error) {
      return jsonResponse(500, { error: "Błąd zapytania do bazy danych." });
    }

    const items = (data ?? []).slice(0, limit);
    const hasMore = (data ?? []).length > limit;
    const lastItem = items[items.length - 1];
    const nextCursor =
      hasMore && lastItem
        ? sortField === "created_at"
          ? lastItem.created_at
          : (lastItem.updated_at ?? lastItem.created_at)
        : null;

    const response: FlashcardListResponseDTO = {
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
 * POST /api/flashcards
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
    const response = await createManualFlashcard(context.locals.supabase, user.id, parsed.data);
    const dto: FlashcardCreateResponseDTO = response;
    return jsonResponse(201, dto);
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return jsonResponse(error.status, { error: error.message });
    }

    if (error instanceof FlashcardServiceError) {
      return jsonResponse(error.status, { error: error.message });
    }

    return jsonResponse(500, { error: "Nieoczekiwany błąd serwera." });
  }
};
