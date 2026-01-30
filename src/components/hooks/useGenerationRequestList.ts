import { useCallback, useEffect, useMemo, useState } from "react";

import type { GenerationRequestListResponseDTO, GenerationRequestSummaryDTO } from "@/types";

type RequestError = {
  message: string;
  status?: number;
};

type ListState = {
  items: GenerationRequestSummaryDTO[];
  nextCursor: string | null;
};

type FetchOptions = {
  cursor?: string | null;
  append?: boolean;
};

const DEFAULT_LIMIT = 20;

const getErrorMessage = async (response: Response): Promise<RequestError> => {
  if (response.status === 401) {
    return { message: "Zaloguj się, aby zobaczyć historię generacji.", status: response.status };
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

  return { message: "Nie udało się pobrać historii generacji.", status: response.status };
};

export const useGenerationRequestList = (accessToken: string | null) => {
  const [data, setData] = useState<ListState | null>(null);
  const [error, setError] = useState<RequestError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const queryParams = useMemo(() => ({ limit: DEFAULT_LIMIT, sort: "-created_at" }), []);

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
        const params = new URLSearchParams();
        params.set("limit", String(queryParams.limit));
        params.set("sort", queryParams.sort);
        if (options?.cursor) {
          params.set("cursor", options.cursor);
        }

        const response = await fetch(`/api/generation-requests?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw await getErrorMessage(response);
        }

        const payload = (await response.json()) as GenerationRequestListResponseDTO;
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
    [accessToken, queryParams.limit, queryParams.sort]
  );

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void fetchList();
  }, [accessToken, fetchList]);

  useEffect(() => {
    setData(null);
    setError(null);
  }, [accessToken]);

  return {
    data,
    error,
    isLoading,
    hasMore: Boolean(data?.nextCursor),
    refresh: () => fetchList(),
    loadMore: () => fetchList({ cursor: data?.nextCursor ?? null, append: true }),
  };
};
