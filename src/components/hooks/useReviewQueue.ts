import { useCallback, useEffect, useState } from "react";

import type { ReviewQueueQuery, ReviewQueueResponseDTO } from "@/types";

type RequestError = {
  message: string;
  status?: number;
};

const getErrorMessage = async (response: Response): Promise<RequestError> => {
  if (response.status === 401) {
    return { message: "Zaloguj się, aby rozpocząć powtórki.", status: response.status };
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

  return { message: "Nie udało się pobrać kolejki powtórek.", status: response.status };
};

const buildQuery = (query: ReviewQueueQuery) => {
  const params = new URLSearchParams();

  if (query.limit) {
    params.set("limit", String(query.limit));
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
};

export const useReviewQueue = (accessToken: string | null, query: ReviewQueueQuery, enabled = true) => {
  const [data, setData] = useState<ReviewQueueResponseDTO | null>(null);
  const [error, setError] = useState<RequestError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchQueue = useCallback(async () => {
    if (!accessToken) {
      setData(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const queryString = buildQuery(query);
      const response = await fetch(`/api/reviews/queue${queryString}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw await getErrorMessage(response);
      }

      const payload = (await response.json()) as ReviewQueueResponseDTO;
      setData(payload);
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
  }, [accessToken, query]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    setData(null);
    setError(null);
    void fetchQueue();
  }, [enabled, fetchQueue]);

  return {
    data,
    error,
    isLoading,
    refresh: fetchQueue,
  };
};
