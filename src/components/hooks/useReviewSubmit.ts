import { useCallback, useState } from "react";

import type { ReviewSubmitCommand, ReviewSubmitResponseDTO } from "@/types";

interface RequestError {
  message: string;
  status?: number;
}

const getErrorMessage = async (response: Response): Promise<RequestError> => {
  if (response.status === 401) {
    return { message: "Zaloguj się, aby zapisać ocenę.", status: response.status };
  }

  if (response.status === 404) {
    return { message: "Nie znaleziono fiszki do powtórki.", status: response.status };
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

  return { message: "Nie udało się zapisać oceny.", status: response.status };
};

export const useReviewSubmit = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(async (flashcardId: string, command: ReviewSubmitCommand, accessToken: string | null) => {
    if (!accessToken) {
      throw { message: "Zaloguj się, aby zapisać ocenę.", status: 401 } satisfies RequestError;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/reviews/${flashcardId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        throw await getErrorMessage(response);
      }

      return (await response.json()) as ReviewSubmitResponseDTO;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { isSubmitting, submit };
};
