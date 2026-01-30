import { useCallback, useState } from "react";

import type { AuthResetPasswordCommand, SuccessResponseDTO } from "@/types";

const getErrorMessage = async (response: Response) => {
  if (response.status === 400) {
    try {
      const data = (await response.json()) as { error?: string };
      if (data?.error) {
        return data.error;
      }
    } catch {
      // Brak poprawnej odpowiedzi JSON
    }
    return "Nieprawidłowy adres email.";
  }

  if (response.status >= 500) {
    return "Nieoczekiwany błąd serwera.";
  }

  return "Nie udało się wysłać linku resetującego hasło.";
};

export const useResetPassword = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(async (command: AuthResetPasswordCommand): Promise<SuccessResponseDTO> => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      if (response.status === 404) {
        return { success: true };
      }

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      return (await response.json()) as SuccessResponseDTO;
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
