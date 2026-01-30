import type { APIRoute } from "astro";
import { z } from "zod";

import type {
  FlashcardGetResponseDTO,
  FlashcardUpdateCommand,
  FlashcardUpdateResponseDTO,
  FlashcardDeleteResponseDTO,
} from "@/types";
import { AuthGuardError, requireUser } from "@/lib/services/auth/require-user";

export const prerender = false;

const idSchema = z.string().uuid("Nieprawidłowy identyfikator fiszki.");

const updateSchema = z
  .object({
    front: z
      .string()
      .min(2, "Pole front musi mieć co najmniej 2 znaki.")
      .max(2000, "Pole front może mieć maksymalnie 2000 znaków.")
      .optional(),
    back: z
      .string()
      .min(2, "Pole back musi mieć co najmniej 2 znaki.")
      .max(2000, "Pole back może mieć maksymalnie 2000 znaków.")
      .optional(),
    card_type: z.enum(["qa", "front_back"], { errorMap: () => ({ message: "Nieprawidłowy typ fiszki." }) }).optional(),
    edited_by_ai: z.boolean().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "Brak pól do aktualizacji.",
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
 * GET /api/flashcards/{id}
 */
export const GET: APIRoute = async (context) => {
  const { id } = context.params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) {
    return jsonResponse(400, { error: formatValidationError(parsedId.error) });
  }

  try {
    const user = await requireUser(context.locals.supabase, context.request.headers.get("authorization"));
    const { data, error } = await context.locals.supabase
      .from("flashcards")
      .select("*")
      .eq("id", parsedId.data)
      .eq("user_id", user.id)
      .single();

    if (error) {
      if (isNotFoundError(error)) {
        return jsonResponse(404, { error: "Nie znaleziono fiszki." });
      }

      return jsonResponse(500, { error: "Błąd zapytania do bazy danych." });
    }

    const dto: FlashcardGetResponseDTO = data;
    return jsonResponse(200, dto);
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return jsonResponse(error.status, { error: error.message });
    }

    return jsonResponse(500, { error: "Nieoczekiwany błąd serwera." });
  }
};

/**
 * PATCH /api/flashcards/{id}
 */
export const PATCH: APIRoute = async (context) => {
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

  const parsedBody = updateSchema.safeParse(payload);
  if (!parsedBody.success) {
    return jsonResponse(400, { error: formatValidationError(parsedBody.error) });
  }

  try {
    const user = await requireUser(context.locals.supabase, context.request.headers.get("authorization"));
    const { data, error } = await context.locals.supabase
      .from("flashcards")
      .update(parsedBody.data satisfies FlashcardUpdateCommand)
      .eq("id", parsedId.data)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) {
      if (isNotFoundError(error)) {
        return jsonResponse(404, { error: "Nie znaleziono fiszki." });
      }

      return jsonResponse(500, { error: "Błąd zapytania do bazy danych." });
    }

    const dto: FlashcardUpdateResponseDTO = data;
    return jsonResponse(200, dto);
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return jsonResponse(error.status, { error: error.message });
    }

    return jsonResponse(500, { error: "Nieoczekiwany błąd serwera." });
  }
};

/**
 * DELETE /api/flashcards/{id}
 */
export const DELETE: APIRoute = async (context) => {
  const { id } = context.params;
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) {
    return jsonResponse(400, { error: formatValidationError(parsedId.error) });
  }

  try {
    const user = await requireUser(context.locals.supabase, context.request.headers.get("authorization"));
    const { error, data } = await context.locals.supabase
      .from("flashcards")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", parsedId.data)
      .eq("user_id", user.id)
      .select("id")
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

    const dto: FlashcardDeleteResponseDTO = { success: true };
    return jsonResponse(200, dto);
  } catch (error) {
    if (error instanceof AuthGuardError) {
      return jsonResponse(error.status, { error: error.message });
    }

    return jsonResponse(500, { error: "Nieoczekiwany błąd serwera." });
  }
};
