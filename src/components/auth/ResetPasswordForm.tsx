import { useCallback, useId, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import FormErrorBanner from "@/components/auth/FormErrorBanner";
import FormInfoBanner from "@/components/auth/FormInfoBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResetPassword } from "@/components/hooks/useResetPassword";
import type { AuthResetPasswordCommand } from "@/types";

type FieldErrors = Partial<Record<"email", string>>;

interface ResetPasswordFormState {
  email: string;
  fieldErrors: FieldErrors;
  formError: string | null;
  isSubmitted: boolean;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const validateEmail = (value: string) => {
  const normalized = normalizeEmail(value);
  if (!normalized) {
    return "Email jest wymagany.";
  }
  if (!emailPattern.test(normalized)) {
    return "Nieprawidłowy adres email.";
  }
  return null;
};

const buildFieldErrors = (email: string): FieldErrors => {
  const emailError = validateEmail(email);
  return {
    ...(emailError ? { email: emailError } : {}),
  };
};

const removeFieldError = (errors: FieldErrors, field: keyof FieldErrors) => {
  if (!errors[field]) {
    return errors;
  }

  const { [field]: removed, ...rest } = errors;
  void removed;
  return rest;
};

interface FieldProps {
  id: string;
  errorId: string;
  value: string;
  error: string | undefined;
  disabled: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}

const EmailField = ({ id, errorId, value, error, disabled, onChange, onBlur }: FieldProps) => (
  <div className="space-y-2">
    <Label htmlFor={id}>Email</Label>
    <Input
      id={id}
      name="email"
      type="email"
      autoComplete="email"
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      disabled={disabled}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? errorId : undefined}
      placeholder="twoj@email.com"
    />
    {error ? (
      <p id={errorId} className="text-xs text-destructive" role="status" aria-live="polite">
        {error}
      </p>
    ) : null}
  </div>
);

interface SubmitButtonProps {
  disabled: boolean;
  isSubmitting: boolean;
}

const SubmitButton = ({ disabled, isSubmitting }: SubmitButtonProps) => (
  <Button className="w-full" type="submit" disabled={disabled}>
    {isSubmitting ? "Wysyłanie..." : "Wyślij link resetujący"}
  </Button>
);

const ResetPasswordForm = () => {
  const emailId = useId();
  const emailErrorId = useId();

  const { isSubmitting, submit } = useResetPassword();

  const [formState, setFormState] = useState<ResetPasswordFormState>({
    email: "",
    fieldErrors: {},
    formError: null,
    isSubmitted: false,
  });

  const isValid = useMemo(() => !validateEmail(formState.email), [formState.email]);

  const updateFieldError = useCallback((field: "email", error: string | null) => {
    setFormState((prev) => {
      const nextErrors = error ? { ...prev.fieldErrors, [field]: error } : removeFieldError(prev.fieldErrors, field);
      return { ...prev, fieldErrors: nextErrors };
    });
  }, []);

  const handleEmailChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;

    setFormState((prev) => {
      const emailError = prev.fieldErrors.email ? validateEmail(nextValue) : null;
      const nextErrors = emailError
        ? { ...prev.fieldErrors, email: emailError }
        : removeFieldError(prev.fieldErrors, "email");
      return {
        ...prev,
        email: nextValue,
        fieldErrors: nextErrors,
        formError: null,
        isSubmitted: false,
      };
    });
  }, []);

  const handleEmailBlur = useCallback(() => {
    updateFieldError("email", validateEmail(formState.email));
  }, [formState.email, updateFieldError]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const normalizedEmail = normalizeEmail(formState.email);
      const validationErrors = buildFieldErrors(normalizedEmail);
      if (validationErrors.email) {
        setFormState((prev) => ({
          ...prev,
          fieldErrors: validationErrors,
        }));
        return;
      }

      setFormState((prev) => ({ ...prev, formError: null }));

      try {
        const payload: AuthResetPasswordCommand = {
          email: normalizedEmail,
        };
        await submit(payload);
        setFormState((prev) => ({
          ...prev,
          email: "",
          fieldErrors: {},
          formError: null,
          isSubmitted: true,
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Wystąpił nieoczekiwany błąd.";
        setFormState((prev) => ({ ...prev, formError: message, isSubmitted: false }));
      }
    },
    [formState.email, submit]
  );

  const emailError = formState.fieldErrors.email;
  const isSubmitDisabled = !isValid || isSubmitting;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset hasła</CardTitle>
        <CardDescription>Podaj email, aby otrzymać link do ustawienia nowego hasła.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" noValidate onSubmit={handleSubmit} aria-busy={isSubmitting}>
          <EmailField
            id={emailId}
            errorId={emailErrorId}
            value={formState.email}
            error={emailError}
            disabled={isSubmitting}
            onChange={handleEmailChange}
            onBlur={handleEmailBlur}
          />

          {formState.formError ? (
            <FormErrorBanner title="Nie udało się wysłać linku" message={formState.formError} />
          ) : null}
          {formState.isSubmitted ? (
            <FormInfoBanner
              title="Sprawdź skrzynkę"
              message="Jeśli konto z tym adresem istnieje, wysłaliśmy link do zresetowania hasła."
            />
          ) : null}

          <SubmitButton disabled={isSubmitDisabled} isSubmitting={isSubmitting} />
          <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
            {isSubmitting ? "Wysyłamy link resetujący, to może potrwać kilka sekund." : ""}
          </p>
        </form>
      </CardContent>
      <CardFooter>
        <a className="text-sm text-muted-foreground transition hover:text-foreground" href="/auth/sign-in">
          Wróć do logowania
        </a>
      </CardFooter>
    </Card>
  );
};

export default ResetPasswordForm;
