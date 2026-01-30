import { useCallback, useEffect, useState } from "react";

import type { GenerationRequestDetailsResponseDTO } from "@/types";

interface RequestError {
  message: string;
  status?: number;
}

const getErrorMessage = async (response: Response): Promise<RequestError> => {
  if (response.status === 401) {
    return { message: "Zaloguj się, aby zobaczyć szczegóły zlecenia.", status: response.status };
  }

  if (response.status === 404) {
    return { message: "Nie znaleziono zlecenia generacji.", status: response.status };
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

  return { message: "Nie udało się pobrać szczegółów zlecenia.", status: response.status };
};

export const useGenerationRequestDetails = (requestId: string | null, accessToken: string | null) => {
  const [data, setData] = useState<GenerationRequestDetailsResponseDTO | null>(null);
  const [error, setError] = useState<RequestError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!requestId || !accessToken) {
      setData(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/generation-requests/${requestId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw await getErrorMessage(response);
      }

      const payload = (await response.json()) as GenerationRequestDetailsResponseDTO;
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
  }, [accessToken, requestId]);

  useEffect(() => {
    if (!requestId || !accessToken) {
      return;
    }

    void fetchDetails();
  }, [accessToken, fetchDetails, requestId]);

  return { data, error, isLoading, refresh: fetchDetails };
};
