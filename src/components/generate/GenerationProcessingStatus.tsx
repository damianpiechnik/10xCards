import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuthSession } from "@/components/hooks/useAuthSession";
import { useGenerationRequestDetails } from "@/components/hooks/useGenerationRequestDetails";
import { useRetryGenerationRequest } from "@/components/hooks/useRetryGenerationRequest";
import {
  getStatusDescription,
  getStatusLabel,
  isActiveStatus,
  isRetryableStatus,
} from "@/components/generate/generationStatus";

const buildDetailsHref = (requestId: string) => `/generation-requests/${requestId}`;

interface StatusBannerProps {
  statusLabel: string;
  statusDescription: string;
}

const StatusBanner = ({ statusLabel, statusDescription }: StatusBannerProps) => (
  <div className="space-y-1">
    <p className="text-sm font-medium">Status: {statusLabel}</p>
    <p className="text-sm text-muted-foreground">{statusDescription}</p>
  </div>
);

interface RetryButtonProps {
  isRetrying: boolean;
  onRetry: () => void;
}

const RetryButton = ({ isRetrying, onRetry }: RetryButtonProps) => (
  <Button type="button" variant="outline" onClick={onRetry} disabled={isRetrying}>
    {isRetrying ? "Ponawianie..." : "Ponów generowanie"}
  </Button>
);

const GENERATION_TIMEOUT_MS = 30000;

interface GenerationProcessingStatusProps {
  requestId: string;
}

const GenerationProcessingStatus = ({ requestId }: GenerationProcessingStatusProps) => {
  const { session, isLoading: isSessionLoading } = useAuthSession();
  const { data, error, isLoading, refresh } = useGenerationRequestDetails(requestId, session?.access_token ?? null);
  const { isRetrying, retry } = useRetryGenerationRequest();
  const [retryError, setRetryError] = useState<string | null>(null);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  const status = data?.status ?? "pending";
  const isActive = isActiveStatus(status);
  const isRetryable = data ? isRetryableStatus(data.status) : false;

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const interval = window.setInterval(() => {
      void refresh();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isActive, refresh]);

  useEffect(() => {
    if (!isActive) {
      setHasTimedOut(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setHasTimedOut(true);
    }, GENERATION_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isActive]);

  const handleRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  const statusLabel = useMemo(() => getStatusLabel(status), [status]);
  const statusDescription = useMemo(() => {
    if (status === "succeeded") {
      return "Zlecenie zakończone. Możesz przejść do szczegółów.";
    }

    if (status === "failed") {
      return "Generowanie nie powiodło się. Sprawdź komunikat błędu lub spróbuj ponownie.";
    }

    return getStatusDescription(status);
  }, [status]);
  const detailsHref = useMemo(() => buildDetailsHref(requestId), [requestId]);

  const handleRetry = useCallback(async () => {
    if (!session?.access_token) {
      setRetryError("Zaloguj się, aby ponowić zlecenie.");
      return;
    }

    try {
      setRetryError(null);
      await retry(requestId, session.access_token);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nie udało się ponowić zlecenia.";
      setRetryError(message);
    }
  }, [refresh, requestId, retry, session]);

  useEffect(() => {
    if (isActive || !data) {
      return;
    }

    const timeout = window.setTimeout(() => {
      window.location.assign(detailsHref);
    }, 2000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [data, detailsHref, isActive]);

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
          <AlertDescription>Zaloguj się, aby śledzić status generacji.</AlertDescription>
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
          <AlertTitle>Nie udało się pobrać statusu</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </div>
        {error.status === 401 ? (
          <Button asChild variant="outline">
            <a href="/auth/sign-in">Przejdź do logowania</a>
          </Button>
        ) : null}
        {error.status !== 401 ? (
          <Button type="button" variant="outline" onClick={handleRefresh}>
            Spróbuj ponownie
          </Button>
        ) : null}
      </Alert>
    );
  }

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        Ładujemy status zlecenia...
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <StatusBanner statusLabel={statusLabel} statusDescription={statusDescription} />
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>Utworzono: {new Date(data.created_at).toLocaleString("pl-PL")}</span>
        {data.updated_at ? <span>Aktualizacja: {new Date(data.updated_at).toLocaleString("pl-PL")}</span> : null}
      </div>
      {data.error_message ? (
        <Alert variant="destructive" aria-live="polite">
          <AlertTitle>Powód błędu</AlertTitle>
          <AlertDescription>{data.error_message}</AlertDescription>
        </Alert>
      ) : null}
      {hasTimedOut ? (
        <Alert variant="destructive" aria-live="polite">
          <AlertTitle>Przekroczony czas generacji</AlertTitle>
          <AlertDescription>
            Generowanie trwa dłużej niż 30 sekund. Odśwież status lub spróbuj ponownie później.
          </AlertDescription>
        </Alert>
      ) : null}
      {retryError ? (
        <Alert variant="destructive" aria-live="polite">
          <AlertTitle>Nie udało się ponowić</AlertTitle>
          <AlertDescription>{retryError}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={handleRefresh} disabled={isLoading}>
          {isLoading ? "Odświeżanie..." : "Odśwież status"}
        </Button>
        {isRetryable ? <RetryButton isRetrying={isRetrying} onRetry={handleRetry} /> : null}
        {!isActive ? (
          <>
            <Button asChild variant="outline">
              <a href="/library">Przejdź do biblioteki</a>
            </Button>
            <Button asChild>
              <a href={detailsHref}>Przejdź do szczegółów</a>
            </Button>
          </>
        ) : null}
      </div>
      {isRetryable ? (
        <p className="text-xs text-muted-foreground">
          Ponowienie nie usuwa wprowadzonego tekstu ani ustawień generacji.
        </p>
      ) : null}
      {!isActive ? (
        <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
          Za chwilę przekierujemy Cię do szczegółów zlecenia.
        </p>
      ) : null}
    </div>
  );
};

export default GenerationProcessingStatus;
