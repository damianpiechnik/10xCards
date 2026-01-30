import { useCallback, useId, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import FormErrorBanner from "@/components/auth/FormErrorBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useSignIn } from "@/components/hooks/useSignIn";
import { supabaseClient } from "@/db/supabase.client";
import type { AuthSignInCommand } from "@/types";

type FieldErrors = Partial<Record<"email" | "password", string>>;

interface SignInFormState {
  email: string;
  password: string;
  fieldErrors: FieldErrors;
  formError: string | null;
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

const buildFieldErrors = (email: string, password: string): FieldErrors => {
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);

  return {
    ...(emailError ? { email: emailError } : {}),
    ...(passwordError ? { password: passwordError } : {}),
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

const PasswordField = ({ id, errorId, value, error, disabled, onChange, onBlur }: FieldProps) => (
  <div className="space-y-2">
    <Label htmlFor={id}>Hasło</Label>
    <Input
      id={id}
      name="password"
      type="password"
      autoComplete="current-password"
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      disabled={disabled}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? errorId : undefined}
      placeholder="Twoje hasło"
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
    {isSubmitting ? "Logowanie..." : "Zaloguj się"}
  </Button>
);

const ResetPasswordLink = () => (
  <a className="text-sm text-muted-foreground transition hover:text-foreground" href="/auth/reset-password">
    Nie pamiętasz hasła?
  </a>
);

const HelperLinks = () => (
  <div className="flex flex-col gap-2 text-sm text-muted-foreground">
    <a className="transition hover:text-foreground" href="/auth/sign-up">
      Nie masz konta? Zarejestruj się
    </a>
    <Separator className="my-1" />
    <ResetPasswordLink />
  </div>
);

const SignInForm = () => {
  const emailId = useId();
  const passwordId = useId();
  const emailErrorId = useId();
  const passwordErrorId = useId();

  const { isSubmitting, submit } = useSignIn();

  const [formState, setFormState] = useState<SignInFormState>({
    email: "",
    password: "",
    fieldErrors: {},
    formError: null,
  });

  const isValid = useMemo(() => {
    return !validateEmail(formState.email) && !validatePassword(formState.password);
  }, [formState.email, formState.password]);

  const updateFieldError = useCallback((field: "email" | "password", error: string | null) => {
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
      };
    });
  }, []);

  const handlePasswordChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;

    setFormState((prev) => {
      const passwordError = prev.fieldErrors.password ? validatePassword(nextValue) : null;
      const nextErrors = passwordError
        ? { ...prev.fieldErrors, password: passwordError }
        : removeFieldError(prev.fieldErrors, "password");
      return {
        ...prev,
        password: nextValue,
        fieldErrors: nextErrors,
        formError: null,
      };
    });
  }, []);

  const handleEmailBlur = useCallback(() => {
    updateFieldError("email", validateEmail(formState.email));
  }, [formState.email, updateFieldError]);

  const handlePasswordBlur = useCallback(() => {
    updateFieldError("password", validatePassword(formState.password));
  }, [formState.password, updateFieldError]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const normalizedEmail = normalizeEmail(formState.email);
      const validationErrors = buildFieldErrors(normalizedEmail, formState.password);
      if (validationErrors.email || validationErrors.password) {
        setFormState((prev) => ({
          ...prev,
          fieldErrors: validationErrors,
        }));
        return;
      }

      setFormState((prev) => ({ ...prev, formError: null }));

      try {
        const payload: AuthSignInCommand = {
          email: normalizedEmail,
          password: formState.password,
        };
        const response = await submit(payload);
        const { error } = await supabaseClient.auth.setSession({
          access_token: response.session.access_token,
          refresh_token: response.session.refresh_token,
        });

        if (error) {
          setFormState((prev) => ({ ...prev, formError: "Nie udało się zapisać sesji." }));
          return;
        }

        // Check for redirect parameter
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get("redirect") || "/library";
        window.location.assign(redirect);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Wystąpił nieoczekiwany błąd.";
        setFormState((prev) => ({ ...prev, formError: message }));
      }
    },
    [formState.email, formState.password, submit]
  );

  const emailError = formState.fieldErrors.email;
  const passwordError = formState.fieldErrors.password;
  const isSubmitDisabled = !isValid || isSubmitting;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zaloguj się</CardTitle>
        <CardDescription>Wprowadź dane, aby kontynuować pracę z fiszkami.</CardDescription>
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

          <PasswordField
            id={passwordId}
            errorId={passwordErrorId}
            value={formState.password}
            error={passwordError}
            disabled={isSubmitting}
            onChange={handlePasswordChange}
            onBlur={handlePasswordBlur}
          />

          {formState.formError ? <FormErrorBanner title="Błąd logowania" message={formState.formError} /> : null}

          <SubmitButton disabled={isSubmitDisabled} isSubmitting={isSubmitting} />
          <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
            {isSubmitting ? "Logujemy Cię, to może potrwać kilka sekund." : ""}
          </p>
        </form>
      </CardContent>
      <CardFooter>
        <HelperLinks />
      </CardFooter>
    </Card>
  );
};

export default SignInForm;
