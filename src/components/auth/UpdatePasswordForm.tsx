import { useCallback, useId, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import FormErrorBanner from "@/components/auth/FormErrorBanner";
import FormInfoBanner from "@/components/auth/FormInfoBanner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthSession } from "@/components/hooks/useAuthSession";
import { supabaseClient } from "@/db/supabase.client";

const validatePassword = (value: string) => {
  if (!value) {
    return "Hasło jest wymagane.";
  }

  if (value.length < 8) {
    return "Hasło musi mieć co najmniej 8 znaków.";
  }

  if (value.length > 72) {
    return "Hasło może mieć maksymalnie 72 znaki.";
  }

  return null;
};

interface FieldProps {
  id: string;
  errorId: string;
  value: string;
  error: string | null;
  disabled: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}

const PasswordField = ({ id, errorId, value, error, disabled, onChange, onBlur }: FieldProps) => (
  <div className="space-y-2">
    <Label htmlFor={id}>Nowe hasło</Label>
    <Input
      id={id}
      name="password"
      type="password"
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      disabled={disabled}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? errorId : undefined}
      autoComplete="new-password"
      placeholder="Wpisz nowe hasło"
    />
    {error ? (
      <p id={errorId} className="text-xs text-destructive" role="status" aria-live="polite">
        {error}
      </p>
    ) : null}
  </div>
);

const UpdatePasswordForm = () => {
  const { session, isLoading } = useAuthSession();
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const passwordId = useId();
  const passwordErrorId = useId();

  const isValid = useMemo(() => validatePassword(password) === null, [password]);
  const isSubmitDisabled = !isValid || isSubmitting || isLoading;

  const handlePasswordChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
    setFieldError(null);
    setFormError(null);
  }, []);

  const handlePasswordBlur = useCallback(() => {
    setFieldError(validatePassword(password));
  }, [password]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const validationError = validatePassword(password);
      if (validationError) {
        setFieldError(validationError);
        return;
      }

      setIsSubmitting(true);
      setFormError(null);

      try {
        if (!session) {
          setFormError("Sesja resetu hasła wygasła. Wyślij link ponownie.");
          return;
        }

        const { error } = await supabaseClient.auth.updateUser({ password });
        if (error) {
          setFormError(error.message ?? "Nie udało się ustawić nowego hasła.");
          return;
        }

        setIsSuccess(true);
        window.setTimeout(() => {
          window.location.assign("/library");
        }, 1200);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Wystąpił nieoczekiwany błąd.";
        setFormError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [password, session]
  );

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        Sprawdzamy Twoją sesję...
      </p>
    );
  }

  if (!session) {
    return (
      <Alert variant="destructive" aria-live="polite" className="space-y-2">
        <div>
          <AlertTitle>Brak aktywnej sesji</AlertTitle>
          <AlertDescription>Link resetu wygasł lub został już użyty.</AlertDescription>
        </div>
        <Button asChild variant="outline">
          <a href="/auth/reset-password">Wyślij link resetu ponownie</a>
        </Button>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ustaw nowe hasło</CardTitle>
        <CardDescription>Wybierz nowe hasło do swojego konta.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" noValidate onSubmit={handleSubmit} aria-busy={isSubmitting}>
          <PasswordField
            id={passwordId}
            errorId={passwordErrorId}
            value={password}
            error={fieldError}
            disabled={isSubmitting}
            onChange={handlePasswordChange}
            onBlur={handlePasswordBlur}
          />

          {formError ? <FormErrorBanner title="Nie udało się ustawić hasła" message={formError} /> : null}
          {isSuccess ? (
            <FormInfoBanner title="Hasło zostało zaktualizowane" message="Za chwilę przeniesiemy Cię do biblioteki." />
          ) : null}

          <Button type="submit" disabled={isSubmitDisabled} className="w-full">
            {isSubmitting ? "Zapisujemy hasło..." : "Ustaw nowe hasło"}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <a className="text-xs text-muted-foreground transition hover:text-foreground" href="/auth/sign-in">
          Wróć do logowania
        </a>
      </CardFooter>
    </Card>
  );
};

export default UpdatePasswordForm;
