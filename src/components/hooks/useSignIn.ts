import { useCallback, useState } from "react";

import type { AuthResponseDTO, AuthSignInCommand } from "@/types";

const getErrorMessage = async (response: Response) => {
  if (response.status === 401) {
    return "Niepoprawne dane logowania.";
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

  return "Nieprawidłowe dane logowania.";
};

export const useSignIn = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(async (command: AuthSignInCommand): Promise<AuthResponseDTO> => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      return (await response.json()) as AuthResponseDTO;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Nie udało się połączyć z serwerem.");
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { isSubmitting, submit };
};
