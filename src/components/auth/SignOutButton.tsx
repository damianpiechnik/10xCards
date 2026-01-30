import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { SignOutError, useSignOut } from "@/components/hooks/useSignOut";
import { supabaseClient } from "@/db/supabase.client";
import type { AuthSignOutCommand } from "@/types";

const SignOutButton = () => {
  const { isSubmitting, submit } = useSignOut();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignOut = useCallback(async () => {
    setErrorMessage(null);

    try {
      const payload: AuthSignOutCommand = {};
      await submit(payload);

      const { error } = await supabaseClient.auth.signOut();
      if (error) {
        setErrorMessage("Nie udało się wyczyścić lokalnej sesji.");
        return;
      }

      window.location.assign("/auth/sign-in");
    } catch (error) {
      if (error instanceof SignOutError) {
        if (error.status === 401) {
          await supabaseClient.auth.signOut();
          window.location.assign("/auth/sign-in");
          return;
        }

        setErrorMessage(error.message);
        return;
      }

      const message = error instanceof Error ? error.message : "Wystąpił nieoczekiwany błąd.";
      setErrorMessage(message);
    }
  }, [submit]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSignOut}
      disabled={isSubmitting}
      aria-label={isSubmitting ? "Wylogowywanie..." : "Wyloguj się"}
      title={errorMessage || undefined}
    >
      {isSubmitting ? "Wylogowywanie..." : "Wyloguj się"}
    </Button>
  );
};

export default SignOutButton;
