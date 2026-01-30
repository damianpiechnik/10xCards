import { useCallback, useState } from "react";

import type { AuthSignOutCommand, SuccessResponseDTO } from "@/types";
import { supabaseClient } from "@/db/supabase.client";

export class SignOutError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const getErrorMessage = async (response: Response) => {
  if (response.status === 401) {
    return "Twoja sesja wygasła lub jest nieprawidłowa. Zaloguj się ponownie.";
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

  return "Nie udało się wylogować. Spróbuj ponownie.";
};

export const useSignOut = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(async (command: AuthSignOutCommand = {}): Promise<SuccessResponseDTO> => {
    setIsSubmitting(true);

    try {
      const { data } = await supabaseClient.auth.getSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        throw new SignOutError("Brak aktywnej sesji. Zaloguj się ponownie.", 401);
      }

      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        throw new SignOutError(await getErrorMessage(response), response.status);
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
