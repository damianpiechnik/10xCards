import { useCallback, useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSession } from "@/components/hooks/useAuthSession";
import type { FlashcardCreateCommand, FlashcardCreateResponseDTO } from "@/types";

type FieldErrors = Partial<Record<"front" | "back", string>>;

interface ManualFlashcardFormProps {
  onCreated?: (flashcard: FlashcardCreateResponseDTO) => void;
}

const validateFront = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Pole front jest wymagane.";
  }
  if (trimmed.length < 2) {
    return "Pole front musi mieć co najmniej 2 znaki.";
  }
  if (trimmed.length > 2000) {
    return "Pole front może mieć maksymalnie 2000 znaków.";
  }
  return null;
};

const validateBack = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Pole back jest wymagane.";
  }
  if (trimmed.length < 2) {
    return "Pole back musi mieć co najmniej 2 znaki.";
  }
  if (trimmed.length > 2000) {
    return "Pole back może mieć maksymalnie 2000 znaków.";
  }
  return null;
};

const buildFieldErrors = (front: string, back: string): FieldErrors => {
  const frontError = validateFront(front);
  const backError = validateBack(back);

  return {
    ...(frontError ? { front: frontError } : {}),
    ...(backError ? { back: backError } : {}),
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

const FormErrorBanner = ({ message }: { message: string }) => (
  <Alert variant="destructive" aria-live="polite">
    <AlertTitle>Nie udało się dodać fiszki</AlertTitle>
    <AlertDescription>{message}</AlertDescription>
  </Alert>
);

interface FieldProps {
  id: string;
  errorId: string;
  value: string;
  error?: string;
  disabled: boolean;
  label: string;
  placeholder: string;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur: () => void;
}

const FrontField = ({ id, errorId, value, error, disabled, label, placeholder, onChange, onBlur }: FieldProps) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <Textarea
      id={id}
      name="front"
      rows={3}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      disabled={disabled}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? errorId : undefined}
      className="min-h-[96px] resize-none"
      placeholder={placeholder}
    />
    {error ? (
      <p id={errorId} className="text-xs text-destructive" role="status" aria-live="polite">
        {error}
      </p>
    ) : null}
  </div>
);

const BackField = ({ id, errorId, value, error, disabled, label, placeholder, onChange, onBlur }: FieldProps) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <Textarea
      id={id}
      name="back"
      rows={3}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      disabled={disabled}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? errorId : undefined}
      className="min-h-[96px] resize-none"
      placeholder={placeholder}
    />
    {error ? (
      <p id={errorId} className="text-xs text-destructive" role="status" aria-live="polite">
        {error}
      </p>
    ) : null}
  </div>
);

interface CardTypeFieldProps {
  id: string;
  value: FlashcardCreateCommand["card_type"];
  disabled: boolean;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}

const CardTypeField = ({ id, value, disabled, onChange }: CardTypeFieldProps) => (
  <div className="space-y-2">
    <Label htmlFor={id}>Typ fiszki</Label>
    <select
      id={id}
      name="card_type"
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <option value="front_back">Przód / tył</option>
      <option value="qa">Pytanie i odpowiedź</option>
    </select>
  </div>
);

interface SubmitButtonProps {
  disabled: boolean;
  isSubmitting: boolean;
}

const SubmitButton = ({ disabled, isSubmitting }: SubmitButtonProps) => (
  <Button type="submit" disabled={disabled}>
    {isSubmitting ? "Zapisywanie..." : "Dodaj fiszkę"}
  </Button>
);

const ManualFlashcardForm = ({ onCreated }: ManualFlashcardFormProps) => {
  const { session, isLoading } = useAuthSession();
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [cardType, setCardType] = useState<FlashcardCreateCommand["card_type"]>("front_back");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const successTimeoutRef = useRef<number | null>(null);
  const frontId = useId();
  const backId = useId();
  const cardTypeId = useId();
  const frontErrorId = `${frontId}-error`;
  const backErrorId = `${backId}-error`;

  const isFrontValid = useMemo(() => validateFront(front) === null, [front]);
  const isBackValid = useMemo(() => validateBack(back) === null, [back]);
  const isFormDisabled = isSubmitting || isLoading || !session;
  const canSubmit = isFrontValid && isBackValid && !isFormDisabled;

  const fieldLabels = useMemo(() => {
    if (cardType === "qa") {
      return {
        front: { label: "Pytanie", placeholder: "Wpisz treść pytania" },
        back: { label: "Odpowiedź", placeholder: "Wpisz treść odpowiedzi" },
      };
    }
    return {
      front: { label: "Przód", placeholder: "Wpisz treść przodu fiszki" },
      back: { label: "Tył", placeholder: "Wpisz treść tyłu fiszki" },
    };
  }, [cardType]);

  const handleFrontChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setFront(event.target.value);
    setFieldErrors((prev) => removeFieldError(prev, "front"));
    setFormError(null);
    setSuccessMessage(null);
  }, []);

  const handleBackChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setBack(event.target.value);
    setFieldErrors((prev) => removeFieldError(prev, "back"));
    setFormError(null);
    setSuccessMessage(null);
  }, []);

  const handleCardTypeChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setCardType(event.target.value as FlashcardCreateCommand["card_type"]);
    setFormError(null);
    setSuccessMessage(null);
  }, []);

  const handleFrontBlur = useCallback(() => {
    const error = validateFront(front);
    if (!error) {
      return;
    }
    setFieldErrors((prev) => ({ ...prev, front: error }));
  }, [front]);

  const handleBackBlur = useCallback(() => {
    const error = validateBack(back);
    if (!error) {
      return;
    }
    setFieldErrors((prev) => ({ ...prev, back: error }));
  }, [back]);

  const parseCreateError = useCallback(async (response: Response) => {
    if (response.status === 401) {
      return "Zaloguj się, aby dodać fiszkę.";
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

    return "Nie udało się dodać fiszki.";
  }, []);

  const resetForm = useCallback(() => {
    setFront("");
    setBack("");
    setCardType("front_back");
    setFieldErrors({});
    setFormError(null);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!session?.access_token) {
        setFormError("Zaloguj się, aby dodać fiszkę.");
        return;
      }

      const errors = buildFieldErrors(front, back);
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }

      setIsSubmitting(true);
      setFormError(null);
      setSuccessMessage(null);

      const payload: FlashcardCreateCommand = {
        front: front.trim(),
        back: back.trim(),
        card_type: cardType,
      };

      try {
        const response = await fetch("/api/flashcards", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const message = await parseCreateError(response);
          setFormError(message);
          setIsSubmitting(false);
          return;
        }

        const created = (await response.json()) as FlashcardCreateResponseDTO;
        onCreated?.(created);
        resetForm();
        setSuccessMessage("Fiszka została dodana. Za chwilę wrócisz do biblioteki.");
        if (successTimeoutRef.current) {
          window.clearTimeout(successTimeoutRef.current);
        }
        successTimeoutRef.current = window.setTimeout(() => {
          setSuccessMessage(null);
          window.location.assign("/library");
        }, 1500);
      } catch {
        setFormError("Nie udało się połączyć z serwerem.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [back, cardType, front, onCreated, parseCreateError, resetForm, session?.access_token]
  );

  useEffect(
    () => () => {
      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current);
      }
    },
    []
  );

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">Dodaj fiszkę manualnie</h2>
        <p className="text-sm text-muted-foreground">
          Wybierz typ fiszki i uzupełnij obie strony, aby zapisać nową fiszkę.
        </p>
      </header>
      {!session && !isLoading ? (
        <Alert variant="destructive" aria-live="polite" className="space-y-2">
          <div>
            <AlertTitle>Brak aktywnej sesji</AlertTitle>
            <AlertDescription>Zaloguj się, aby dodać fiszkę manualnie.</AlertDescription>
          </div>
          <Button asChild variant="outline">
            <a href="/auth/sign-in">Przejdź do logowania</a>
          </Button>
        </Alert>
      ) : null}
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <FrontField
          id={frontId}
          errorId={frontErrorId}
          value={front}
          error={fieldErrors.front}
          disabled={isFormDisabled}
          label={fieldLabels.front.label}
          placeholder={fieldLabels.front.placeholder}
          onChange={handleFrontChange}
          onBlur={handleFrontBlur}
        />
        <BackField
          id={backId}
          errorId={backErrorId}
          value={back}
          error={fieldErrors.back}
          disabled={isFormDisabled}
          label={fieldLabels.back.label}
          placeholder={fieldLabels.back.placeholder}
          onChange={handleBackChange}
          onBlur={handleBackBlur}
        />
        <CardTypeField id={cardTypeId} value={cardType} disabled={isFormDisabled} onChange={handleCardTypeChange} />
        {successMessage ? (
          <Alert aria-live="polite" className="space-y-2">
            <AlertTitle>Dodano fiszkę</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
            <Button asChild variant="outline">
              <a href="/library">Przejdź do biblioteki</a>
            </Button>
          </Alert>
        ) : null}
        {formError ? <FormErrorBanner message={formError} /> : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SubmitButton disabled={!canSubmit} isSubmitting={isSubmitting} />
          <p className="text-xs text-muted-foreground">Zakres: 2-2000 znaków na pole.</p>
        </div>
      </form>
    </section>
  );
};

export default ManualFlashcardForm;
