import { useCallback, useMemo } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthSession } from "@/components/hooks/useAuthSession";
import { useGenerationRequestList } from "@/components/hooks/useGenerationRequestList";
import { getStatusLabel, isActiveStatus } from "@/components/generate/generationStatus";
import type { GenerationRequestSummaryDTO } from "@/types";

type GenerationStatus = GenerationRequestSummaryDTO["status"];

const buildDetailsHref = (requestId: string, status: GenerationStatus) =>
  isActiveStatus(status) ? `/generation-requests/${requestId}/processing` : `/generation-requests/${requestId}`;

const getDetailsLabel = (status: GenerationStatus) => (isActiveStatus(status) ? "Status" : "Szczegóły");

const GenerationRequestHistory = () => {
  const { session, isLoading: isSessionLoading } = useAuthSession();
  const { data, error, isLoading, refresh, hasMore, loadMore } = useGenerationRequestList(
    session?.access_token ?? null
  );

  const handleRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  const handleLoadMore = useCallback(() => {
    void loadMore();
  }, [loadMore]);

  const items = data?.items ?? [];
  const hasItems = items.length > 0;
  const isLoadingInitial = isLoading && !hasItems;
  const ctaLabel = useMemo(() => (hasItems ? "Utwórz nowe zlecenie" : "Utwórz pierwsze zlecenie"), [hasItems]);

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
          <AlertDescription>Zaloguj się, aby zobaczyć historię generacji.</AlertDescription>
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
          <AlertTitle>Nie udało się pobrać historii</AlertTitle>
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
        <CardTitle>Historia generacji</CardTitle>
        <CardDescription>Przegląd wcześniejszych zleceń i ich statusów.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoadingInitial ? (
          <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
            Ładujemy historię generacji...
          </p>
        ) : null}
        {hasItems ? (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="rounded-md border bg-muted/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Status: <span className="text-foreground">{getStatusLabel(item.status)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Utworzono: {new Date(item.created_at).toLocaleString("pl-PL")}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <a href={buildDetailsHref(item.id, item.status)}>{getDetailsLabel(item.status)}</a>
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>Liczba fiszek: {item.requested_count}</span>
                  <span>Język: {item.language}</span>
                  {item.model ? <span>Model: {item.model}</span> : null}
                  {item.completed_at ? (
                    <span>Zakończono: {new Date(item.completed_at).toLocaleString("pl-PL")}</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Brak zleceń generacji do wyświetlenia.</p>
        )}
        {hasMore ? (
          <Button type="button" variant="outline" onClick={handleLoadMore} disabled={isLoading}>
            {isLoading ? "Ładowanie..." : "Pokaż więcej"}
          </Button>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={handleRefresh} disabled={isLoading}>
          {isLoading ? "Odświeżanie..." : "Odśwież"}
        </Button>
        <Button asChild>
          <a href="/generate">{ctaLabel}</a>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default GenerationRequestHistory;
