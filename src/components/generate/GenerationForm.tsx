import { useCallback, useEffect, useId, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSession } from "@/components/hooks/useAuthSession";
import { useCreateGenerationRequest } from "@/components/hooks/useCreateGenerationRequest";
import type { GenerationRequestCreateCommand, GenerationRequestLanguage } from "@/types";

const MAX_SOURCE_TEXT_LENGTH = 1000;
const DEFAULT_REQUESTED_COUNT = "10";
const MIN_REQUESTED_COUNT = 1;
const MAX_REQUESTED_COUNT = 50;
const DEFAULT_LANGUAGE: GenerationRequestLanguage = "PL";

type SourceText = GenerationRequestCreateCommand["source_text"];
type RequestedCount = GenerationRequestCreateCommand["requested_count"];
type GenerationModel = GenerationRequestCreateCommand["model"];

type FieldErrors = Partial<Record<"sourceText" | "requestedCount" | "language", string>>;

interface GenerateFormState {
  sourceText: SourceText;
  requestedCount: string;
  language: GenerationRequestLanguage;
  model: GenerationModel;
  fieldErrors: FieldErrors;
  formError: string | null;
  formSuccess: string | null;
  requestId: string | null;
}

const validateSourceText = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return "Tekst jest wymagany.";
  }

  if (value.length > MAX_SOURCE_TEXT_LENGTH) {
    return `Tekst nie może przekraczać ${MAX_SOURCE_TEXT_LENGTH} znaków.`;
  }

  return null;
};

const validateRequestedCount = (value: string) => {
  if (!value) {
    return "Liczba fiszek jest wymagana.";
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return "Liczba fiszek musi być dodatnią liczbą całkowitą.";
  }

  if (parsed < MIN_REQUESTED_COUNT || parsed > MAX_REQUESTED_COUNT) {
    return `Liczba fiszek musi mieścić się w zakresie ${MIN_REQUESTED_COUNT}-${MAX_REQUESTED_COUNT}.`;
  }

  return null;
};

const validateLanguage = (value: string) => {
  if (value === "PL" || value === "EN") {
    return null;
  }

  return "Wybierz poprawny język.";
};

interface InlineFieldErrorProps {
  id: string;
  message: string | null;
}

const InlineFieldError = ({ id, message }: InlineFieldErrorProps) =>
  message ? (
    <p id={id} className="text-xs text-destructive" role="status" aria-live="polite">
      {message}
    </p>
  ) : null;

interface CharCounterProps {
  count: number;
  max: number;
  isOverLimit: boolean;
}

const CharCounter = ({ count, max, isOverLimit }: CharCounterProps) => (
  <p className={`text-xs ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`} aria-live="polite">
    {count}/{max}
  </p>
);

interface SourceTextFieldProps {
  id: string;
  errorId: string;
  value: SourceText;
  error: string | null;
  maxLength: number;
  disabled: boolean;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur: () => void;
}

const SourceTextField = ({
  id,
  errorId,
  value,
  error,
  maxLength,
  disabled,
  onChange,
  onBlur,
}: SourceTextFieldProps) => (
  <div className="space-y-2">
    <div className="flex items-start justify-between gap-4">
      <Label htmlFor={id}>Tekst źródłowy</Label>
      <CharCounter count={value.length} max={maxLength} isOverLimit={value.length > maxLength} />
    </div>
    <Textarea
      id={id}
      name="sourceText"
      required
      aria-required="true"
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      rows={8}
      disabled={disabled}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? errorId : undefined}
      placeholder="Wklej tekst, z którego mamy przygotować fiszki."
    />
    <InlineFieldError id={errorId} message={error} />
  </div>
);

interface RequestedCountFieldProps {
  id: string;
  errorId: string;
  helpId: string;
  value: string;
  error: string | null;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}

const RequestedCountField = ({
  id,
  errorId,
  helpId,
  value,
  error,
  min,
  max,
  disabled,
  onChange,
  onBlur,
}: RequestedCountFieldProps) => (
  <div className="space-y-2">
    <Label htmlFor={id}>Liczba fiszek</Label>
    <Input
      id={id}
      name="requestedCount"
      type="number"
      required
      aria-required="true"
      min={min}
      max={max}
      step={1}
      inputMode="numeric"
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      disabled={disabled}
      aria-invalid={Boolean(error)}
      aria-describedby={[error ? errorId : null, helpId].filter(Boolean).join(" ")}
      placeholder="np. 10"
    />
    <p id={helpId} className="text-xs text-muted-foreground">
      Zakres: {min}-{max}.
    </p>
    <InlineFieldError id={errorId} message={error} />
  </div>
);

interface LanguageSelectProps {
  id: string;
  errorId: string;
  helpId: string;
  value: GenerationRequestLanguage;
  error: string | null;
  disabled: boolean;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onBlur: () => void;
}

const LanguageSelect = ({ id, errorId, helpId, value, error, disabled, onChange, onBlur }: LanguageSelectProps) => (
  <div className="space-y-2">
    <Label htmlFor={id}>Język</Label>
    <select
      id={id}
      name="language"
      required
      aria-required="true"
      className="dark:bg-input/30 border-input bg-transparent text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow]"
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      disabled={disabled}
      aria-invalid={Boolean(error)}
      aria-describedby={[error ? errorId : null, helpId].filter(Boolean).join(" ")}
    >
      <option value="PL">Polski</option>
      <option value="EN">Angielski</option>
    </select>
    <p id={helpId} className="text-xs text-muted-foreground">
      Dostępne: PL lub EN.
    </p>
    <InlineFieldError id={errorId} message={error} />
  </div>
);

interface ModelFieldProps {
  id: string;
  value: string;
  disabled: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

const ModelField = ({ id, value, disabled, onChange }: ModelFieldProps) => (
  <div className="space-y-2">
    <Label htmlFor={id}>Model (opcjonalnie)</Label>
    <Input
      id={id}
      name="model"
      type="text"
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder="np. gpt-4o-mini"
    />
  </div>
);

const FormErrorBanner = ({ message }: { message: string }) => (
  <Alert variant="destructive" aria-live="polite">
    <AlertTitle>Nie udało się utworzyć zlecenia</AlertTitle>
    <AlertDescription>{message}</AlertDescription>
  </Alert>
);

const FormSuccessBanner = ({ message }: { message: string }) => (
  <Alert aria-live="polite">
    <AlertTitle>Zlecenie przyjęte</AlertTitle>
    <AlertDescription>{message}</AlertDescription>
  </Alert>
);

const LoadingState = ({ isSubmitting, isRedirecting }: { isSubmitting: boolean; isRedirecting: boolean }) => {
  if (!isSubmitting && !isRedirecting) {
    return null;
  }

  const message = isRedirecting
    ? "Przekierowujemy do podglądu generacji."
    : "Tworzymy zlecenie generacji, to może potrwać kilka sekund.";

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status" aria-live="polite">
      <span
        className="inline-flex h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-muted-foreground"
        aria-hidden="true"
      />
      <span>{message}</span>
    </div>
  );
};

const SubmitButton = ({
  disabled,
  isSubmitting,
  isRedirecting,
}: {
  disabled: boolean;
  isSubmitting: boolean;
  isRedirecting: boolean;
}) => {
  const label = isRedirecting ? "Przekierowanie..." : isSubmitting ? "Tworzenie zlecenia..." : "Generuj fiszki";

  return (
    <Button className="w-full" type="submit" disabled={disabled}>
      {label}
    </Button>
  );
};

const GenerationForm = () => {
  const sourceTextId = useId();
  const sourceTextErrorId = useId();
  const requestedCountId = useId();
  const requestedCountErrorId = useId();
  const requestedCountHelpId = useId();
  const languageId = useId();
  const languageErrorId = useId();
  const languageHelpId = useId();
  const modelId = useId();

  const { session, isLoading } = useAuthSession();
  const { isSubmitting, submit } = useCreateGenerationRequest();

  const [formState, setFormState] = useState<GenerateFormState>({
    sourceText: "",
    requestedCount: DEFAULT_REQUESTED_COUNT,
    language: DEFAULT_LANGUAGE,
    model: "",
    fieldErrors: {},
    formError: null,
    formSuccess: null,
    requestId: null,
  });

  const isOverLimit = useMemo(() => formState.sourceText.length > MAX_SOURCE_TEXT_LENGTH, [formState.sourceText]);
  const isEmpty = useMemo(() => formState.sourceText.trim().length === 0, [formState.sourceText]);
  const requestedCountValidation = validateRequestedCount(formState.requestedCount);
  const languageValidation = validateLanguage(formState.language);
  const isRedirecting = Boolean(formState.requestId);
  const isSubmitDisabled =
    isOverLimit ||
    isEmpty ||
    isSubmitting ||
    isLoading ||
    isRedirecting ||
    !session ||
    Boolean(requestedCountValidation) ||
    Boolean(languageValidation);
  const isFieldDisabled = isSubmitting || isLoading || isRedirecting;

  const handleSourceTextChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value;

    setFormState((prev) => {
      const nextError = prev.fieldErrors.sourceText ? validateSourceText(nextValue) : null;
      const nextErrors = nextError
        ? { ...prev.fieldErrors, sourceText: nextError }
        : { ...prev.fieldErrors, sourceText: undefined };
      return {
        ...prev,
        sourceText: nextValue,
        fieldErrors: nextErrors,
        formError: null,
        formSuccess: null,
      };
    });
  }, []);

  const handleSourceTextBlur = useCallback(() => {
    setFormState((prev) => ({
      ...prev,
      fieldErrors: { ...prev.fieldErrors, sourceText: validateSourceText(prev.sourceText) ?? undefined },
    }));
  }, []);

  const handleRequestedCountChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;

    setFormState((prev) => {
      const nextError = prev.fieldErrors.requestedCount ? validateRequestedCount(nextValue) : null;
      const nextErrors = nextError
        ? { ...prev.fieldErrors, requestedCount: nextError }
        : { ...prev.fieldErrors, requestedCount: undefined };
      return {
        ...prev,
        requestedCount: nextValue,
        fieldErrors: nextErrors,
        formError: null,
        formSuccess: null,
      };
    });
  }, []);

  const handleRequestedCountBlur = useCallback(() => {
    setFormState((prev) => ({
      ...prev,
      fieldErrors: { ...prev.fieldErrors, requestedCount: validateRequestedCount(prev.requestedCount) ?? undefined },
    }));
  }, []);

  const handleLanguageChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const nextValue = event.target.value as GenerationRequestLanguage;

    setFormState((prev) => {
      const nextError = prev.fieldErrors.language ? validateLanguage(nextValue) : null;
      const nextErrors = nextError
        ? { ...prev.fieldErrors, language: nextError }
        : { ...prev.fieldErrors, language: undefined };
      return {
        ...prev,
        language: nextValue,
        fieldErrors: nextErrors,
        formError: null,
        formSuccess: null,
      };
    });
  }, []);

  const handleLanguageBlur = useCallback(() => {
    setFormState((prev) => ({
      ...prev,
      fieldErrors: { ...prev.fieldErrors, language: validateLanguage(prev.language) ?? undefined },
    }));
  }, []);

  const handleModelChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;

    setFormState((prev) => ({
      ...prev,
      model: nextValue,
      formError: null,
      formSuccess: null,
    }));
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!session?.access_token) {
        setFormState((prev) => ({ ...prev, formError: "Zaloguj się, aby utworzyć zlecenie." }));
        return;
      }

      const validationErrors: FieldErrors = {
        sourceText: validateSourceText(formState.sourceText) ?? undefined,
        requestedCount: validateRequestedCount(formState.requestedCount) ?? undefined,
        language: validateLanguage(formState.language) ?? undefined,
      };

      const hasErrors = Object.values(validationErrors).some(Boolean);
      if (hasErrors) {
        setFormState((prev) => ({ ...prev, fieldErrors: validationErrors }));
        return;
      }

      const requestedCount = Number(formState.requestedCount) as RequestedCount;
      const payload: GenerationRequestCreateCommand = {
        source_text: formState.sourceText.trim(),
        requested_count: requestedCount,
        language: formState.language,
        model: formState.model?.trim() ? formState.model.trim() : undefined,
      };

      try {
        const response = await submit(payload, session.access_token);
        setFormState({
          sourceText: "",
          requestedCount: DEFAULT_REQUESTED_COUNT,
          language: DEFAULT_LANGUAGE,
          model: "",
          fieldErrors: {},
          formError: null,
          formSuccess: null,
          requestId: response.id,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Nie udało się połączyć z serwerem.";
        setFormState((prev) => ({ ...prev, formError: message }));
      }
    },
    [formState, session, submit]
  );

  const sourceTextError = formState.fieldErrors.sourceText ?? null;
  const requestedCountError = formState.fieldErrors.requestedCount ?? null;
  const languageError = formState.fieldErrors.language ?? null;

  useEffect(() => {
    if (!formState.requestId) {
      return;
    }

    window.location.assign(`/generation-requests/${formState.requestId}/processing`);
  }, [formState.requestId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wklej tekst do wygenerowania fiszek</CardTitle>
        <CardDescription>Dodaj tekst, z którego przygotujemy zestaw kart do nauki.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" noValidate onSubmit={handleSubmit} aria-busy={isSubmitting || isRedirecting}>
          <SourceTextField
            id={sourceTextId}
            errorId={sourceTextErrorId}
            value={formState.sourceText}
            error={sourceTextError}
            maxLength={MAX_SOURCE_TEXT_LENGTH}
            disabled={isFieldDisabled}
            onChange={handleSourceTextChange}
            onBlur={handleSourceTextBlur}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <RequestedCountField
              id={requestedCountId}
              errorId={requestedCountErrorId}
              helpId={requestedCountHelpId}
              value={formState.requestedCount}
              error={requestedCountError}
              min={MIN_REQUESTED_COUNT}
              max={MAX_REQUESTED_COUNT}
              disabled={isFieldDisabled}
              onChange={handleRequestedCountChange}
              onBlur={handleRequestedCountBlur}
            />
            <LanguageSelect
              id={languageId}
              errorId={languageErrorId}
              helpId={languageHelpId}
              value={formState.language}
              error={languageError}
              disabled={isFieldDisabled}
              onChange={handleLanguageChange}
              onBlur={handleLanguageBlur}
            />
          </div>
          <ModelField
            id={modelId}
            value={formState.model ?? ""}
            disabled={isFieldDisabled}
            onChange={handleModelChange}
          />
          {formState.formError ? <FormErrorBanner message={formState.formError} /> : null}
          {formState.formSuccess ? <FormSuccessBanner message={formState.formSuccess} /> : null}
          <SubmitButton disabled={isSubmitDisabled} isSubmitting={isSubmitting} isRedirecting={isRedirecting} />
        </form>
      </CardContent>
      <CardFooter>
        <div className="space-y-2">
          <LoadingState isSubmitting={isSubmitting} isRedirecting={isRedirecting} />
          <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
            {isOverLimit ? "Skróć tekst, aby kontynuować generowanie." : ""}
            {!isLoading && !session ? " Zaloguj się, aby generować fiszki." : ""}
          </p>
        </div>
      </CardFooter>
    </Card>
  );
};

export default GenerationForm;
