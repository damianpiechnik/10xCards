import { useCallback, useId, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import FormErrorBanner from "@/components/auth/FormErrorBanner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabaseClient } from "@/db/supabase.client";
import type { AuthSignUpCommand } from "@/types";

type FieldErrors = Partial<Record<"email" | "password" | "passwordConfirm", string>>;

interface SignUpFormState {
  email: string;
  password: string;
  passwordConfirm: string;
  fieldErrors: FieldErrors;
  formError: string | null;
  successMessage: string | null;
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

const validatePasswordConfirm = (password: string, passwordConfirm: string) => {
  if (!passwordConfirm) {
    return "Potwierdzenie hasła jest wymagane.";
  }
  if (password !== passwordConfirm) {
    return "Hasła muszą być identyczne.";
  }
  return null;
};

const buildFieldErrors = (email: string, password: string, passwordConfirm: string): FieldErrors => {
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);
  const passwordConfirmError = validatePasswordConfirm(password, passwordConfirm);

  return {
    ...(emailError ? { email: emailError } : {}),
    ...(passwordError ? { password: passwordError } : {}),
    ...(passwordConfirmError ? { passwordConfirm: passwordConfirmError } : {}),
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
      autoComplete="new-password"
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      disabled={disabled}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? errorId : undefined}
      placeholder="Minimum 8 znaków"
    />
    {error ? (
      <p id={errorId} className="text-xs text-destructive" role="status" aria-live="polite">
        {error}
      </p>
    ) : null}
  </div>
);

const PasswordConfirmField = ({ id, errorId, value, error, disabled, onChange, onBlur }: FieldProps) => (
  <div className="space-y-2">
    <Label htmlFor={id}>Potwierdzenie hasła</Label>
    <Input
      id={id}
      name="passwordConfirm"
      type="password"
      autoComplete="new-password"
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      disabled={disabled}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? errorId : undefined}
      placeholder="Wpisz hasło ponownie"
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
    {isSubmitting ? "Tworzenie konta..." : "Utwórz konto"}
  </Button>
);

const HelperLinks = () => (
  <div className="flex flex-col gap-2 text-sm text-muted-foreground">
    <a className="transition hover:text-foreground" href="/auth/sign-in">
      Masz już konto? Zaloguj się
    </a>
    <Separator className="my-1" />
    <a className="transition hover:text-foreground" href="/auth/reset-password">
      Nie pamiętasz hasła?
    </a>
  </div>
);

interface FormSuccessBannerProps {
  message: string;
}

const FormSuccessBanner = ({ message }: FormSuccessBannerProps) => (
  <Alert variant="default" role="status" aria-live="polite" className="border-green-500 bg-green-50 dark:bg-green-950">
    <AlertTitle className="text-green-800 dark:text-green-200">Sukces</AlertTitle>
    <AlertDescription className="text-green-700 dark:text-green-300">{message}</AlertDescription>
  </Alert>
);

const SignUpForm = () => {
  const emailId = useId();
  const passwordId = useId();
  const passwordConfirmId = useId();
  const emailErrorId = useId();
  const passwordErrorId = useId();
  const passwordConfirmErrorId = useId();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formState, setFormState] = useState<SignUpFormState>({
    email: "",
    password: "",
    passwordConfirm: "",
    fieldErrors: {},
    formError: null,
    successMessage: null,
  });

  const isValid = useMemo(() => {
    return (
      !validateEmail(formState.email) &&
      !validatePassword(formState.password) &&
      !validatePasswordConfirm(formState.password, formState.passwordConfirm)
    );
  }, [formState.email, formState.password, formState.passwordConfirm]);

  const updateFieldError = useCallback((field: "email" | "password" | "passwordConfirm", error: string | null) => {
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
        successMessage: null,
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
        successMessage: null,
      };
    });
  }, []);

  const handleEmailBlur = useCallback(() => {
    updateFieldError("email", validateEmail(formState.email));
  }, [formState.email, updateFieldError]);

  const handlePasswordBlur = useCallback(() => {
    updateFieldError("password", validatePassword(formState.password));
  }, [formState.password, updateFieldError]);

  const handlePasswordConfirmChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;

    setFormState((prev) => {
      const passwordConfirmError = prev.fieldErrors.passwordConfirm
        ? validatePasswordConfirm(prev.password, nextValue)
        : null;
      const nextErrors = passwordConfirmError
        ? { ...prev.fieldErrors, passwordConfirm: passwordConfirmError }
        : removeFieldError(prev.fieldErrors, "passwordConfirm");
      return {
        ...prev,
        passwordConfirm: nextValue,
        fieldErrors: nextErrors,
        formError: null,
        successMessage: null,
      };
    });
  }, []);

  const handlePasswordConfirmBlur = useCallback(() => {
    updateFieldError("passwordConfirm", validatePasswordConfirm(formState.password, formState.passwordConfirm));
  }, [formState.password, formState.passwordConfirm, updateFieldError]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const normalizedEmail = normalizeEmail(formState.email);
      const validationErrors = buildFieldErrors(normalizedEmail, formState.password, formState.passwordConfirm);
      if (validationErrors.email || validationErrors.password || validationErrors.passwordConfirm) {
        setFormState((prev) => ({
          ...prev,
          fieldErrors: validationErrors,
        }));
        return;
      }

      setFormState((prev) => ({ ...prev, formError: null, successMessage: null }));
      setIsSubmitting(true);

      try {
        const payload: AuthSignUpCommand = {
          email: normalizedEmail,
          password: formState.password,
        };

        // Próba rejestracji
        const response = await fetch("/api/auth/sign-up", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        // Status 202: Wymagane potwierdzenie email
        if (response.status === 202) {
          const data = (await response.json()) as { message: string };
          setFormState((prev) => ({
            ...prev,
            successMessage: data.message,
            email: "",
            password: "",
            passwordConfirm: "",
          }));
          return;
        }

        // Status 201: Konto utworzone i użytkownik zalogowany
        if (response.status === 201) {
          const authResponse = (await response.json()) as AuthSignUpCommand & {
            session: { access_token: string; refresh_token: string };
          };
          const { error } = await supabaseClient.auth.setSession({
            access_token: authResponse.session.access_token,
            refresh_token: authResponse.session.refresh_token,
          });

          if (error) {
            setFormState((prev) => ({ ...prev, formError: "Nie udało się zapisać sesji." }));
            return;
          }

          window.location.assign("/library");
          return;
        }

        // Inne statusy - błędy
        const errorData = (await response.json()) as { error?: string };
        const errorMessage = errorData.error || "Wystąpił nieoczekiwany błąd.";
        setFormState((prev) => ({ ...prev, formError: errorMessage }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Wystąpił nieoczekiwany błąd.";
        setFormState((prev) => ({ ...prev, formError: message }));
      } finally {
        setIsSubmitting(false);
      }
    },
    [formState.email, formState.password, formState.passwordConfirm]
  );

  const emailError = formState.fieldErrors.email;
  const passwordError = formState.fieldErrors.password;
  const passwordConfirmError = formState.fieldErrors.passwordConfirm;
  const isSubmitDisabled = !isValid || isSubmitting;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Utwórz konto</CardTitle>
        <CardDescription>Załóż konto, aby rozpocząć naukę z fiszkami.</CardDescription>
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

          <PasswordConfirmField
            id={passwordConfirmId}
            errorId={passwordConfirmErrorId}
            value={formState.passwordConfirm}
            error={passwordConfirmError}
            disabled={isSubmitting}
            onChange={handlePasswordConfirmChange}
            onBlur={handlePasswordConfirmBlur}
          />

          {formState.successMessage ? <FormSuccessBanner message={formState.successMessage} /> : null}
          {formState.formError ? <FormErrorBanner title="Błąd rejestracji" message={formState.formError} /> : null}

          <SubmitButton disabled={isSubmitDisabled} isSubmitting={isSubmitting} />
          <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
            {isSubmitting ? "Zapisujemy Twoje konto, to może potrwać kilka sekund." : ""}
          </p>
        </form>
      </CardContent>
      <CardFooter>
        <HelperLinks />
      </CardFooter>
    </Card>
  );
};

export default SignUpForm;
