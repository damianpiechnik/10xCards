import { useCallback, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthSession } from "@/components/hooks/useAuthSession";
import { useGenerationRequestDetails } from "@/components/hooks/useGenerationRequestDetails";
import { useRetryGenerationRequest } from "@/components/hooks/useRetryGenerationRequest";
import { getStatusDescription, getStatusLabel, isRetryableStatus } from "@/components/generate/generationStatus";
import type { GenerationRequestDetailsResponseDTO } from "@/types";

type GenerationStatus = GenerationRequestDetailsResponseDTO["status"];

interface GenerationRequestDetailsProps {
  requestId: string;
}

interface StatusPanelProps {
  statusLabel: string;
  statusDescription: string;
}

const StatusPanel = ({ statusLabel, statusDescription }: StatusPanelProps) => (
  <div className="space-y-2">
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

const GenerationRequestDetails = ({ requestId }: GenerationRequestDetailsProps) => {
  const { session, isLoading: isSessionLoading } = useAuthSession();
  const { data, error, isLoading, refresh } = useGenerationRequestDetails(requestId, session?.access_token ?? null);
  const { isRetrying, retry } = useRetryGenerationRequest();
  const [retryError, setRetryError] = useState<string | null>(null);

  const statusLabel = useMemo(() => (data ? getStatusLabel(data.status) : "W trakcie"), [data]);
  const statusDescription = useMemo(
    () => (data ? getStatusDescription(data.status) : "Ładujemy dane zlecenia."),
    [data]
  );
  const isRetryable = useMemo(() => (data ? isRetryableStatus(data.status) : false), [data]);
  const detailsHref = useMemo(() => `/generation-requests/${requestId}/processing`, [requestId]);

  const handleRetry = useCallback(async () => {
    if (!session?.access_token) {
      setRetryError("Zaloguj się, aby ponowić zlecenie.");
      return;
    }

    try {
      setRetryError(null);
      await retry(requestId, session.access_token);
      window.location.assign(detailsHref);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nie udało się ponowić zlecenia.";
      setRetryError(message);
    }
  }, [detailsHref, requestId, retry, session]);

  const handleRefresh = useCallback(() => {
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
          <AlertDescription>Zaloguj się, aby zobaczyć szczegóły zlecenia.</AlertDescription>
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
          <AlertTitle>Nie udało się pobrać szczegółów</AlertTitle>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Szczegóły zlecenia</CardTitle>
        <CardDescription>Informacje o stanie i parametrach generacji.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <StatusPanel statusLabel={statusLabel} statusDescription={statusDescription} />
        {data ? (
          <div className="space-y-4 text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center gap-3">
              <span>
                ID: <span className="font-mono text-foreground">{data.id}</span>
              </span>
              <span>Utworzono: {new Date(data.created_at).toLocaleString("pl-PL")}</span>
              {data.updated_at ? <span>Aktualizacja: {new Date(data.updated_at).toLocaleString("pl-PL")}</span> : null}
              {data.completed_at ? (
                <span>Zakończono: {new Date(data.completed_at).toLocaleString("pl-PL")}</span>
              ) : null}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs uppercase text-muted-foreground">Liczba fiszek</p>
                <p className="text-base font-medium text-foreground">{data.requested_count}</p>
              </div>
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs uppercase text-muted-foreground">Język</p>
                <p className="text-base font-medium text-foreground">{data.language}</p>
              </div>
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs uppercase text-muted-foreground">Model</p>
                <p className="text-base font-medium text-foreground">{data.model ?? "domyślny"}</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase text-muted-foreground">Tekst źródłowy</p>
              <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm text-foreground">
                {data.source_text}
              </p>
            </div>
            {data.error_message ? (
              <Alert variant="destructive" aria-live="polite">
                <AlertTitle>Powód błędu</AlertTitle>
                <AlertDescription>{data.error_message}</AlertDescription>
              </Alert>
            ) : null}
            {retryError ? (
              <Alert variant="destructive" aria-live="polite">
                <AlertTitle>Nie udało się ponowić</AlertTitle>
                <AlertDescription>{retryError}</AlertDescription>
              </Alert>
            ) : null}
            {isRetryable ? (
              <p className="text-xs text-muted-foreground">
                Ponowienie nie usuwa wprowadzonego tekstu ani ustawień generacji.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
            {isLoading ? "Ładujemy dane zlecenia..." : "Brak danych zlecenia."}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={handleRefresh} disabled={isLoading}>
          {isLoading ? "Odświeżanie..." : "Odśwież"}
        </Button>
        {isRetryable ? <RetryButton isRetrying={isRetrying} onRetry={handleRetry} /> : null}
        <Button asChild variant="outline">
          <a href="/library">Przejdź do biblioteki</a>
        </Button>
        <Button asChild>
          <a href="/generate">Utwórz nowe zlecenie</a>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default GenerationRequestDetails;
