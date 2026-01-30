import { useCallback, useState } from "react";

import type { GenerationRequestCreateCommand, GenerationRequestCreateResponseDTO } from "@/types";

const getErrorMessage = async (response: Response) => {
  if (response.status === 401) {
    return "Zaloguj się, aby utworzyć zlecenie.";
  }

  if (response.status === 429) {
    return "Za dużo żądań. Spróbuj ponownie za chwilę.";
  }

  if (response.status === 503) {
    return "Usługa generowania jest chwilowo niedostępna.";
  }

  if (response.status >= 500) {
    return "Nieoczekiwany błąd serwera.";
  }

  if (response.status === 400) {
    return "Nieprawidłowe dane zlecenia.";
  }

  try {
    const data = (await response.json()) as { error?: string };
    if (data?.error) {
      return data.error;
    }
  } catch {
    // Brak poprawnej odpowiedzi JSON
  }

  return "Nieprawidłowe dane zlecenia.";
};

export const useCreateGenerationRequest = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(
    async (command: GenerationRequestCreateCommand, accessToken: string): Promise<GenerationRequestCreateResponseDTO> => {
      setIsSubmitting(true);

      try {
        const response = await fetch("/api/generation-requests", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(command),
        });

        if (!response.ok) {
          throw new Error(await getErrorMessage(response));
        }

        return (await response.json()) as GenerationRequestCreateResponseDTO;
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }

        throw new Error("Nie udało się połączyć z serwerem.");
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  return { isSubmitting, submit };
};
