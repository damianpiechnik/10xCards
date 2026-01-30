import { useCallback, useState } from "react";

import type { GenerationRequestRetryResponseDTO } from "@/types";

const getErrorMessage = async (response: Response) => {
  if (response.status === 401) {
    return "Zaloguj się, aby ponowić zlecenie.";
  }

  if (response.status === 409) {
    return "Zlecenie jest już przetwarzane.";
  }

  if (response.status === 404) {
    return "Nie znaleziono zlecenia.";
  }

  if (response.status === 429 || response.status === 503) {
    return "Spróbuj ponownie za chwilę.";
  }

  if (response.status >= 500) {
    return "Nieoczekiwany błąd serwera.";
  }

  try {
    const data = (await response.json()) as { error?: string };
    if (data?.error) {
      return data.error;
    }
  } catch {
    // Brak poprawnej odpowiedzi JSON
  }

  return "Nie udało się ponowić zlecenia.";
};

export const useRetryGenerationRequest = () => {
  const [isRetrying, setIsRetrying] = useState(false);

  const retry = useCallback(
    async (requestId: string, accessToken: string): Promise<GenerationRequestRetryResponseDTO> => {
      setIsRetrying(true);

      try {
        const response = await fetch(`/api/generation-requests/${requestId}/retry`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(await getErrorMessage(response));
        }

        return (await response.json()) as GenerationRequestRetryResponseDTO;
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }

        throw new Error("Nie udało się połączyć z serwerem.");
      } finally {
        setIsRetrying(false);
      }
    },
    []
  );

  return { isRetrying, retry };
};
