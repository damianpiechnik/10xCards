import { useCallback, useMemo } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthSession } from "@/components/hooks/useAuthSession";
import { useReviewQueue } from "@/components/hooks/useReviewQueue";
import { writeReviewQueue } from "@/components/reviews/reviewStorage";
import type { FlashcardDTO, ReviewQueueQuery } from "@/types";

interface ReviewQueueProps {
  limit?: number;
}

interface QueueListProps {
  items: FlashcardDTO[];
}

const QueueList = ({ items }: QueueListProps) => (
  <ul className="space-y-3">
    {items.map((item, index) => (
      <li key={item.id} className="rounded-md border bg-muted/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>#{index + 1}</span>
          <span>Termin: {item.due_at ? new Date(item.due_at).toLocaleString("pl-PL") : "brak"}</span>
        </div>
        <div className="mt-3 grid gap-2 text-sm">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Przód</p>
            <p className="text-foreground">{item.front}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Tył</p>
            <p className="text-foreground">{item.back}</p>
          </div>
        </div>
      </li>
    ))}
  </ul>
);

interface StartSessionButtonProps {
  disabled: boolean;
  onStart: () => void;
}

const StartSessionButton = ({ disabled, onStart }: StartSessionButtonProps) => (
  <Button type="button" onClick={onStart} disabled={disabled}>
    Rozpocznij powtórki
  </Button>
);

const EmptyState = () => (
  <div className="rounded-md border border-dashed bg-muted/40 p-6 text-center text-sm text-muted-foreground">
    Brak fiszek do powtórek. Wróć później lub dodaj nowe fiszki.
  </div>
);

interface ErrorBannerProps {
  message: string;
  status?: number;
  onRetry: () => void;
}

const ErrorBanner = ({ message, status, onRetry }: ErrorBannerProps) => (
  <Alert variant="destructive" aria-live="polite" className="space-y-2">
    <div>
      <AlertTitle>Nie udało się pobrać kolejki</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </div>
    {status === 401 ? (
      <Button asChild variant="outline">
        <a href="/auth/sign-in">Przejdź do logowania</a>
      </Button>
    ) : (
      <Button type="button" variant="outline" onClick={onRetry}>
        Spróbuj ponownie
      </Button>
    )}
  </Alert>
);

const ReviewQueue = ({ limit = 20 }: ReviewQueueProps) => {
  const { session, isLoading: isSessionLoading } = useAuthSession();
  const query = useMemo<ReviewQueueQuery>(() => ({ limit }), [limit]);
  const { data, error, isLoading, refresh } = useReviewQueue(session?.access_token ?? null, query, Boolean(session));

  const items = data?.items ?? [];
  const hasItems = items.length > 0;

  const handleStart = useCallback(() => {
    writeReviewQueue(items);
    window.location.assign("/reviews/session");
  }, [items]);

  const handleRetry = useCallback(() => {
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
          <AlertDescription>Zaloguj się, aby rozpocząć powtórki.</AlertDescription>
        </div>
        <Button asChild variant="outline">
          <a href="/auth/sign-in">Przejdź do logowania</a>
        </Button>
      </Alert>
    );
  }

  if (error) {
    return <ErrorBanner message={error.message} status={error.status} onRetry={handleRetry} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kolejka powtórek</CardTitle>
        <CardDescription>Fiszki gotowe do powtórki zgodnie z harmonogramem.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
            Ładujemy kolejkę...
          </p>
        ) : null}
        {!isLoading && hasItems ? <QueueList items={items} /> : null}
        {!isLoading && !hasItems ? <EmptyState /> : null}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-3">
        <StartSessionButton disabled={!hasItems || isLoading} onStart={handleStart} />
        <Button type="button" variant="outline" onClick={handleRetry} disabled={isLoading}>
          {isLoading ? "Odświeżanie..." : "Odśwież kolejkę"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ReviewQueue;
