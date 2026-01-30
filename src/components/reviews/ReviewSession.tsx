import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthSession } from "@/components/hooks/useAuthSession";
import { useReviewQueue } from "@/components/hooks/useReviewQueue";
import { useReviewSubmit } from "@/components/hooks/useReviewSubmit";
import { clearReviewQueue, readReviewQueue } from "@/components/reviews/reviewStorage";
import type { FlashcardDTO, ReviewQueueQuery } from "@/types";

interface ReviewSessionProps {
  initialQueue: FlashcardDTO[];
}

interface ReviewCardProps {
  flashcard: FlashcardDTO;
}

const ReviewCard = ({ flashcard }: ReviewCardProps) => (
  <Card className="border-dashed">
    <CardHeader>
      <CardTitle>Fiszka do powtórki</CardTitle>
      <CardDescription>Przejrzyj przód i tył przed oceną.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="rounded-full bg-muted px-2 py-0.5 uppercase">{flashcard.card_type}</span>
        <span>Termin: {flashcard.due_at ? new Date(flashcard.due_at).toLocaleString("pl-PL") : "brak"}</span>
      </div>
      <div>
        <p className="text-xs uppercase text-muted-foreground">Przód</p>
        <p className="text-base text-foreground">{flashcard.front}</p>
      </div>
      <div>
        <p className="text-xs uppercase text-muted-foreground">Tył</p>
        <p className="text-base text-foreground">{flashcard.back}</p>
      </div>
    </CardContent>
  </Card>
);

interface GradeButtonsProps {
  disabled: boolean;
  onGrade: (grade: number) => void;
}

const GradeButtons = ({ disabled, onGrade }: GradeButtonsProps) => (
  <div className="flex flex-wrap gap-2">
    {[0, 1, 2, 3, 4, 5].map((grade) => (
      <Button
        key={grade}
        type="button"
        variant={grade >= 4 ? "default" : "outline"}
        onClick={() => onGrade(grade)}
        disabled={disabled}
        aria-label={`Oceń na ${grade}`}
      >
        {grade}
      </Button>
    ))}
  </div>
);

interface ProgressBarProps {
  currentIndex: number;
  total: number;
}

const ProgressBar = ({ currentIndex, total }: ProgressBarProps) => {
  const progress = total > 0 ? Math.min(100, Math.round((currentIndex / total) * 100)) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Postęp</span>
        <span>
          {currentIndex}/{total}
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

interface ErrorBannerProps {
  message: string;
  status?: number;
  onRetry?: () => void;
}

const ErrorBanner = ({ message, status, onRetry }: ErrorBannerProps) => (
  <Alert variant="destructive" aria-live="polite" className="space-y-2">
    <div>
      <AlertTitle>Nie udało się zapisać oceny</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </div>
    {status === 401 ? (
      <Button asChild variant="outline">
        <a href="/auth/sign-in">Przejdź do logowania</a>
      </Button>
    ) : onRetry ? (
      <Button type="button" variant="outline" onClick={onRetry}>
        Spróbuj ponownie
      </Button>
    ) : null}
  </Alert>
);

const ReviewSession = ({ initialQueue }: ReviewSessionProps) => {
  const { session, isLoading: isSessionLoading } = useAuthSession();
  const query = useMemo<ReviewQueueQuery>(() => ({ limit: 50 }), []);
  const { data, error, isLoading, refresh } = useReviewQueue(session?.access_token ?? null, query, !initialQueue.length);
  const { isSubmitting, submit } = useReviewSubmit();

  const [queue, setQueue] = useState<FlashcardDTO[]>(initialQueue);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitError, setSubmitError] = useState<{ message: string; status?: number } | null>(null);
  const [lastGrade, setLastGrade] = useState<number | null>(null);
  const [storageChecked, setStorageChecked] = useState(false);

  useEffect(() => {
    if (queue.length > 0) {
      return;
    }

    if (data?.items?.length) {
      setQueue(data.items);
    }
  }, [data, queue.length]);

  useEffect(() => {
    if (queue.length > 0 || initialQueue.length > 0) {
      return;
    }

    const storedQueue = readReviewQueue();
    if (storedQueue.length > 0) {
      setQueue(storedQueue);
    }
    setStorageChecked(true);
  }, [initialQueue.length, queue.length]);

  const total = queue.length;
  const currentCard = queue[currentIndex] ?? null;
  const isFinished = total > 0 && currentIndex >= total;

  const handleGrade = useCallback(
    async (grade: number) => {
      if (!currentCard || !session?.access_token || isSubmitting) {
        return;
      }

      if (grade < 0 || grade > 5) {
        setSubmitError({ message: "Ocena musi być w zakresie 0-5." });
        return;
      }

      setLastGrade(grade);
      setSubmitError(null);

      try {
        await submit(
          currentCard.id,
          {
            grade,
            reviewed_at: new Date().toISOString(),
          },
          session.access_token
        );
        setCurrentIndex((prev) => prev + 1);
      } catch (err) {
        if (err && typeof err === "object" && "message" in err) {
          const typedError = err as { message: string; status?: number };
          setSubmitError({ message: typedError.message, status: typedError.status });
          return;
        }

        setSubmitError({ message: "Nie udało się połączyć z serwerem." });
      }
    },
    [currentCard, isSubmitting, session?.access_token, submit]
  );

  const handleRetrySubmit = useCallback(() => {
    if (lastGrade === null) {
      return;
    }

    void handleGrade(lastGrade);
  }, [handleGrade, lastGrade]);

  const handleRefreshQueue = useCallback(() => {
    void refresh();
  }, [refresh]);

  if (isSessionLoading) {
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
          <AlertDescription>Zaloguj się, aby rozpocząć sesję powtórek.</AlertDescription>
        </div>
        <Button asChild variant="outline">
          <a href="/auth/sign-in">Przejdź do logowania</a>
        </Button>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" aria-live="polite" className="space-y-2">
        <div>
          <AlertTitle>Nie udało się pobrać kolejki</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </div>
        {error.status === 401 ? (
          <Button asChild variant="outline">
            <a href="/auth/sign-in">Przejdź do logowania</a>
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={handleRefreshQueue}>
            Spróbuj ponownie
          </Button>
        )}
      </Alert>
    );
  }

  if (isLoading && queue.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        Ładujemy kolejkę do sesji...
      </p>
    );
  }

  if (queue.length === 0) {
    const storageEmptyMessage =
      storageChecked && !isLoading && (data?.items?.length ?? 0) === 0
        ? "Kolejka z ostatniej sesji jest pusta, a w harmonogramie nie ma nowych fiszek."
        : null;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Brak fiszek do powtórek</CardTitle>
          <CardDescription>
            Twoja kolejka jest pusta. Wróć później lub dodaj nowe fiszki do nauki.
          </CardDescription>
        </CardHeader>
        {storageEmptyMessage ? (
          <CardContent>
            <p className="text-sm text-muted-foreground">{storageEmptyMessage}</p>
          </CardContent>
        ) : null}
        <CardFooter>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <a href="/reviews">Wróć do kolejki</a>
            </Button>
            <Button asChild>
              <a href="/library">Przejdź do biblioteki</a>
            </Button>
          </div>
        </CardFooter>
      </Card>
    );
  }

  if (isFinished) {
    clearReviewQueue();
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sesja zakończona</CardTitle>
          <CardDescription>Wszystkie fiszki zostały ocenione.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild>
            <a href="/reviews">Zobacz kolejną kolejkę</a>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <ProgressBar currentIndex={currentIndex} total={total} />
      {currentCard ? <ReviewCard flashcard={currentCard} /> : null}
      <div className="space-y-3">
        <p className="text-sm font-medium">Jak dobrze pamiętasz tę fiszkę?</p>
        <GradeButtons disabled={!currentCard || isSubmitting} onGrade={handleGrade} />
      </div>
      {submitError ? (
        <ErrorBanner message={submitError.message} status={submitError.status} onRetry={handleRetrySubmit} />
      ) : null}
    </div>
  );
};

export default ReviewSession;
