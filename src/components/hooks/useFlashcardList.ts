import { useCallback, useEffect, useState } from "react";

import type { FlashcardDTO, FlashcardListQuery, FlashcardListResponseDTO } from "@/types";

interface RequestError {
  message: string;
  status?: number;
}

const getErrorMessage = async (response: Response): Promise<RequestError> => {
  if (response.status === 401) {
    return { message: "Zaloguj się, aby zobaczyć bibliotekę fiszek.", status: response.status };
  }

  if (response.status === 429 || response.status === 503) {
    return { message: "Spróbuj ponownie za chwilę.", status: response.status };
  }

  if (response.status >= 500) {
    return { message: "Nieoczekiwany błąd serwera.", status: response.status };
  }

  try {
    const data = (await response.json()) as { error?: string };
    if (data?.error) {
      return { message: data.error, status: response.status };
    }
  } catch {
    // Brak poprawnej odpowiedzi JSON
  }

  return { message: "Nie udało się pobrać listy fiszek.", status: response.status };
};

interface ListState {
  items: FlashcardDTO[];
  nextCursor: string | null;
}

interface FetchOptions {
  cursor?: string | null;
  append?: boolean;
}

const buildQuery = (query: FlashcardListQuery, cursor?: string | null) => {
  const params = new URLSearchParams();

  if (query.limit) {
    params.set("limit", String(query.limit));
  }

  if (query.sort) {
    params.set("sort", query.sort);
  }

  if (query.type) {
    params.set("type", query.type);
  }

  if (typeof query.deleted === "boolean") {
    params.set("deleted", query.deleted ? "true" : "false");
  }

  if (cursor) {
    params.set("cursor", cursor);
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
};

export const useFlashcardList = (accessToken: string | null, query: FlashcardListQuery, enabled: boolean) => {
  const [data, setData] = useState<ListState | null>(null);
  const [error, setError] = useState<RequestError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchList = useCallback(
    async (options?: FetchOptions) => {
      if (!accessToken) {
        setData(null);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const queryString = buildQuery(query, options?.cursor ?? null);
        const response = await fetch(`/api/flashcards${queryString}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw await getErrorMessage(response);
        }

        const payload = (await response.json()) as FlashcardListResponseDTO;
        setData((prev) => {
          const previousItems = options?.append && prev ? prev.items : [];
          return {
            items: [...previousItems, ...payload.items],
            nextCursor: payload.next_cursor,
          };
        });
      } catch (err) {
        if (err && typeof err === "object" && "message" in err) {
          const typedError = err as RequestError;
          setError({ message: typedError.message, status: typedError.status });
          return;
        }

        setError({ message: "Nie udało się połączyć z serwerem." });
      } finally {
        setIsLoading(false);
      }
    },
    [accessToken, query]
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    setData(null);
    setError(null);
    void fetchList();
  }, [enabled, fetchList]);

  return {
    data,
    error,
    isLoading,
    hasMore: Boolean(data?.nextCursor),
    refresh: () => fetchList(),
    loadMore: () => fetchList({ cursor: data?.nextCursor ?? null, append: true }),
    addItem: (item: FlashcardDTO) =>
      setData((prev) => {
        const matchesType = !query.type || item.card_type === query.type;
        const matchesDeleted = query.deleted ? Boolean(item.deleted_at) : !item.deleted_at;

        if (!matchesType || !matchesDeleted) {
          return prev;
        }

        const base = prev ?? { items: [], nextCursor: null };
        const withoutDuplicate = base.items.filter((existing) => existing.id !== item.id);
        const items = query.sort === "updated_at" ? [...withoutDuplicate, item] : [item, ...withoutDuplicate];
        const limit = query.limit;

        if (!limit) {
          return { ...base, items };
        }

        const trimmed = query.sort === "updated_at" ? items.slice(-limit) : items.slice(0, limit);
        return { ...base, items: trimmed };
      }),
    updateItem: (updated: FlashcardDTO) =>
      setData((prev) => {
        if (!prev) {
          return prev;
        }

        return {
          ...prev,
          items: prev.items.map((item) => (item.id === updated.id ? updated : item)),
        };
      }),
    removeItem: (id: string) =>
      setData((prev) => {
        if (!prev) {
          return prev;
        }

        return {
          ...prev,
          items: prev.items.filter((item) => item.id !== id),
        };
      }),
  };
};
