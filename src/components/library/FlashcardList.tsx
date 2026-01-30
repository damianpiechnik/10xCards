import { memo, useCallback, useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSession } from "@/components/hooks/useAuthSession";
import { useFlashcardList } from "@/components/hooks/useFlashcardList";
import type {
  FlashcardDTO,
  FlashcardDeletedFilter,
  FlashcardListQuery,
  FlashcardSort,
  FlashcardTypeFilter,
} from "@/types";

interface FlashcardRowProps {
  flashcard: FlashcardDTO;
  accessToken: string;
  isEditing: boolean;
  isLocked: boolean;
  isSaving: boolean;
  successMessage: string | null;
  onEdit: (id: string) => void;
  onCancel: () => void;
  editState: InlineEditState | null;
  onChangeFront: (value: string) => void;
  onChangeBack: (value: string) => void;
  onSave: () => void;
  onDeleted: (id: string) => void;
}

interface InlineEditState {
  front: string;
  back: string;
  isSaving: boolean;
  errors: {
    front?: string;
    back?: string;
    general?: string;
  };
}

interface InlineEditRowProps {
  flashcard: FlashcardDTO;
  state: InlineEditState;
  onChangeFront: (value: string) => void;
  onChangeBack: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

interface InlineFieldErrorProps {
  id?: string;
  message?: string;
}

const InlineFieldError = ({ id, message }: InlineFieldErrorProps) =>
  message ? (
    <p id={id} className="text-xs text-destructive">
      {message}
    </p>
  ) : null;

interface FrontFieldProps {
  id: string;
  value: string;
  isSaving: boolean;
  error?: string;
  onChange: (value: string) => void;
}

const FrontField = ({ id, value, isSaving, error, onChange }: FrontFieldProps) => (
  <div className="space-y-2">
    <label className="text-xs font-medium text-muted-foreground" htmlFor={id}>
      Przód
    </label>
    <Textarea
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={isSaving}
      rows={2}
      className="min-h-[72px] resize-none"
      aria-describedby={error ? `${id}-error` : undefined}
      aria-invalid={Boolean(error)}
    />
    <InlineFieldError id={`${id}-error`} message={error} />
  </div>
);

interface BackFieldProps {
  id: string;
  value: string;
  isSaving: boolean;
  error?: string;
  onChange: (value: string) => void;
}

const BackField = ({ id, value, isSaving, error, onChange }: BackFieldProps) => (
  <div className="space-y-2">
    <label className="text-xs font-medium text-muted-foreground" htmlFor={id}>
      Tył
    </label>
    <Textarea
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={isSaving}
      rows={2}
      className="min-h-[72px] resize-none"
      aria-describedby={error ? `${id}-error` : undefined}
      aria-invalid={Boolean(error)}
    />
    <InlineFieldError id={`${id}-error`} message={error} />
  </div>
);

interface SaveButtonProps {
  isSaving: boolean;
  onSave: () => void;
}

const SaveButton = ({ isSaving, onSave }: SaveButtonProps) => (
  <Button type="button" size="sm" onClick={onSave} disabled={isSaving}>
    {isSaving ? "Zapisywanie..." : "Zapisz"}
  </Button>
);

interface CancelButtonProps {
  isSaving: boolean;
  onCancel: () => void;
}

const CancelButton = ({ isSaving, onCancel }: CancelButtonProps) => (
  <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
    Anuluj
  </Button>
);

interface ConfirmDialogProps {
  isOpen: boolean;
  isLoading: boolean;
  title: string;
  description: string;
  errorMessage: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog = ({
  isOpen,
  isLoading,
  title,
  description,
  errorMessage,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const titleId = useId();
  const descriptionId = useId();
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    confirmButtonRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-lg border bg-background p-4 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div className="space-y-2">
          <h3 id={titleId} className="text-base font-semibold text-foreground">
            {title}
          </h3>
          <p id={descriptionId} className="text-sm text-muted-foreground">
            {description}
          </p>
          {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Anuluj
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={isLoading} ref={confirmButtonRef}>
            {isLoading ? "Usuwanie..." : "Usuń"}
          </Button>
        </div>
      </div>
    </div>
  );
};

interface DeleteButtonProps {
  flashcardId: string;
  accessToken: string;
  onDeleted: (id: string) => void;
  isDisabled: boolean;
  isDeleted: boolean;
}

const DeleteButton = ({ flashcardId, accessToken, onDeleted, isDisabled, isDeleted }: DeleteButtonProps) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const parseDeleteError = useCallback(async (response: Response) => {
    if (response.status === 401) {
      return "Zaloguj się, aby usunąć fiszkę.";
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

    return "Nie udało się usunąć fiszki.";
  }, []);

  const handleOpen = useCallback(() => {
    if (isDeleted) {
      return;
    }

    setErrorMessage(null);
    setIsConfirmOpen(true);
  }, [isDeleted]);

  const handleCancel = useCallback(() => {
    if (isDeleting) {
      return;
    }

    setIsConfirmOpen(false);
    setErrorMessage(null);
  }, [isDeleting]);

  const handleConfirm = useCallback(async () => {
    if (!accessToken) {
      setErrorMessage("Brak aktywnej sesji.");
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/flashcards/${flashcardId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const message = await parseDeleteError(response);
        setErrorMessage(message);
        return;
      }

      onDeleted(flashcardId);
      setIsConfirmOpen(false);
    } catch {
      setErrorMessage("Nie udało się połączyć z serwerem.");
    } finally {
      setIsDeleting(false);
    }
  }, [accessToken, flashcardId, onDeleted, parseDeleteError]);

  return (
    <>
      <Button
        type="button"
        variant={isDeleted ? "outline" : "destructive"}
        size="sm"
        onClick={handleOpen}
        disabled={isDisabled || isDeleting || isDeleted}
      >
        {isDeleted ? "Usunięta" : "Usuń"}
      </Button>
      <ConfirmDialog
        isOpen={isConfirmOpen}
        isLoading={isDeleting}
        title="Usuń fiszkę"
        description="Tej operacji nie można cofnąć. Czy na pewno chcesz usunąć tę fiszkę?"
        errorMessage={errorMessage}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
};

const InlineEditRow = ({ flashcard, state, onChangeFront, onChangeBack, onSave, onCancel }: InlineEditRowProps) => {
  useEffect(() => {
    const element = document.getElementById(`front-${flashcard.id}`);
    if (element instanceof HTMLTextAreaElement) {
      element.focus();
    }
  }, [flashcard.id]);

  return (
    <div className="mt-4 space-y-3 rounded-md border border-dashed bg-muted/20 p-3 text-sm">
      <FrontField
        id={`front-${flashcard.id}`}
        value={state.front}
        isSaving={state.isSaving}
        error={state.errors.front}
        onChange={onChangeFront}
      />
      <BackField
        id={`back-${flashcard.id}`}
        value={state.back}
        isSaving={state.isSaving}
        error={state.errors.back}
        onChange={onChangeBack}
      />
      <InlineFieldError message={state.errors.general} />
      <div className="flex flex-wrap items-center gap-2">
        <SaveButton isSaving={state.isSaving} onSave={onSave} />
        <CancelButton isSaving={state.isSaving} onCancel={onCancel} />
      </div>
    </div>
  );
};

const CARD_TYPE_LABELS: Record<FlashcardDTO["card_type"], string> = {
  qa: "Pytanie i odpowiedź",
  front_back: "Przód / tył",
};

const FlashcardRow = memo(
  ({
    flashcard,
    accessToken,
    isEditing,
    isLocked,
    isSaving,
    successMessage,
    onEdit,
    onCancel,
    editState,
    onChangeFront,
    onChangeBack,
    onSave,
    onDeleted,
  }: FlashcardRowProps) => {
    const updatedAt = flashcard.updated_at ?? flashcard.created_at;
    const updatedLabel = updatedAt ? new Date(updatedAt).toLocaleString("pl-PL") : "Brak danych";
    const cardTypeLabel = CARD_TYPE_LABELS[flashcard.card_type] ?? "Fiszka";
    const isDeleted = Boolean(flashcard.deleted_at);
    const handleEdit = useCallback(() => {
      onEdit(flashcard.id);
    }, [flashcard.id, onEdit]);

    // Check if flashcard was created within the last minute
    const isNewlyCreated = useMemo(() => {
      const createdAt = new Date(flashcard.created_at);
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
      return createdAt >= oneMinuteAgo;
    }, [flashcard.created_at]);

    const cardClassName = `rounded-lg border p-4 shadow-xs ${
      isEditing
        ? "border-primary/60 bg-card"
        : isNewlyCreated
          ? "border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20"
          : "bg-card"
    }`;

    return (
      <li className={cardClassName}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">{cardTypeLabel}</p>
              {isNewlyCreated && !isDeleted ? (
                <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  Nowa
                </span>
              ) : null}
            </div>
            {isDeleted ? <p className="text-xs font-semibold text-destructive">Fiszka usunięta</p> : null}
            <p className="break-words text-base font-semibold text-foreground">{flashcard.front}</p>
            <p className="break-words text-sm text-muted-foreground">{flashcard.back}</p>
            <p className="text-xs text-muted-foreground">Zaktualizowano: {updatedLabel}</p>
            {isEditing ? <p className="text-xs font-medium text-primary">Wybrano do edycji inline.</p> : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={isEditing ? "default" : "outline"}
              size="sm"
              onClick={handleEdit}
              disabled={isLocked || isSaving || isDeleted}
            >
              {isSaving
                ? "Zapisywanie..."
                : isDeleted
                  ? "Edycja niedostępna"
                  : isLocked
                    ? "Edycja zajęta"
                    : isEditing
                      ? "Edytujesz"
                      : "Edytuj inline"}
            </Button>
            <DeleteButton
              flashcardId={flashcard.id}
              accessToken={accessToken}
              onDeleted={onDeleted}
              isDisabled={isLocked || isSaving}
              isDeleted={isDeleted}
            />
          </div>
        </div>
        {isEditing && editState ? (
          <InlineEditRow
            flashcard={flashcard}
            state={editState}
            onChangeFront={onChangeFront}
            onChangeBack={onChangeBack}
            onSave={onSave}
            onCancel={onCancel}
          />
        ) : null}
        {successMessage ? <p className="mt-3 text-xs text-emerald-600">{successMessage}</p> : null}
      </li>
    );
  }
);

FlashcardRow.displayName = "FlashcardRow";

interface LoadMoreButtonProps {
  isLoading: boolean;
  onLoadMore: () => void;
}

const LoadMoreButton = ({ isLoading, onLoadMore }: LoadMoreButtonProps) => (
  <div className="flex justify-center">
    <Button type="button" variant="outline" onClick={onLoadMore} disabled={isLoading}>
      {isLoading ? "Ładowanie..." : "Załaduj więcej"}
    </Button>
  </div>
);

const EmptyState = () => (
  <div className="rounded-lg border border-dashed bg-muted/30 px-6 py-10 text-center">
    <h3 className="text-base font-semibold text-foreground">Brak fiszek</h3>
    <p className="mt-2 text-sm text-muted-foreground">
      Twoja biblioteka jest pusta. Wygeneruj nowe fiszki lub dodaj je ręcznie.
    </p>
    <div className="mt-4 flex justify-center">
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild variant="outline">
          <a href="/generate">Przejdź do generowania</a>
        </Button>
        <Button asChild variant="outline">
          <a href="/flashcards/new">Dodaj fiszkę manualnie</a>
        </Button>
      </div>
    </div>
  </div>
);

interface NoResultsStateProps {
  onReset: () => void;
}

const NoResultsState = ({ onReset }: NoResultsStateProps) => (
  <div className="rounded-lg border border-dashed bg-muted/30 px-6 py-10 text-center">
    <h3 className="text-base font-semibold text-foreground">Brak wyników</h3>
    <p className="mt-2 text-sm text-muted-foreground">Zmień filtry lub przywróć ustawienia domyślne.</p>
    <div className="mt-4 flex justify-center">
      <Button type="button" variant="outline" onClick={onReset}>
        Wyczyść filtry
      </Button>
    </div>
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
      <AlertTitle>Nie udało się pobrać fiszek</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      {status === 401 ? (
        <Button asChild variant="outline">
          <a href="/auth/sign-in">Przejdź do logowania</a>
        </Button>
      ) : (
        <Button type="button" variant="outline" onClick={onRetry}>
          Spróbuj ponownie
        </Button>
      )}
      <Button asChild variant="outline">
        <a href="/flashcards/new">Dodaj fiszkę manualnie</a>
      </Button>
    </div>
  </Alert>
);

export interface FlashcardListProps {
  limit?: number;
  sort?: FlashcardSort;
  type?: FlashcardTypeFilter;
  deleted?: FlashcardDeletedFilter;
  createdFlashcard?: FlashcardDTO | null;
}

const FlashcardList = ({ limit, sort, type, deleted, createdFlashcard }: FlashcardListProps) => {
  const { session, isLoading: isSessionLoading } = useAuthSession();
  const [sortValue, setSortValue] = useState<FlashcardSort>(sort ?? "-created_at");
  const [typeValue, setTypeValue] = useState<FlashcardTypeFilter | "all">(type ?? "all");
  const [deletedValue, setDeletedValue] = useState<FlashcardDeletedFilter>(deleted ?? false);
  const [editId, setEditId] = useState<string | null>(null);
  const sortId = useId();
  const typeId = useId();
  const deletedId = useId();

  const query = useMemo<FlashcardListQuery>(
    () => ({
      limit,
      sort: sortValue,
      type: typeValue === "all" ? undefined : typeValue,
      deleted: deletedValue,
    }),
    [deletedValue, limit, sortValue, typeValue]
  );

  const { data, error, isLoading, hasMore, refresh, loadMore, addItem, updateItem, removeItem } = useFlashcardList(
    session?.access_token ?? null,
    query,
    Boolean(session)
  );
  const [editState, setEditState] = useState<InlineEditState | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [editWarning, setEditWarning] = useState<string | null>(null);
  const [createdInfo, setCreatedInfo] = useState<string | null>(null);
  const [editOriginal, setEditOriginal] = useState<{ front: string; back: string } | null>(null);
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const createdInfoTimeoutRef = useRef<number | null>(null);
  const items = useMemo(() => data?.items ?? [], [data]);
  const isInitialLoading = isLoading && items.length === 0;
  const isEditing = Boolean(editId);
  const hasActiveFilters = typeValue !== "all" || deletedValue || sortValue !== "-created_at";
  const isSaving = Boolean(editState?.isSaving);
  const hasUnsavedChanges =
    Boolean(editState && editOriginal) &&
    (editState?.front.trim() !== editOriginal?.front.trim() || editState?.back.trim() !== editOriginal?.back.trim());

  const handleRetry = useCallback(() => {
    void refresh();
  }, [refresh]);

  const handleLoadMore = useCallback(() => {
    void loadMore();
  }, [loadMore]);

  const handleSortChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setSortValue(event.target.value as FlashcardSort);
  }, []);

  const handleTypeChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setTypeValue(event.target.value as FlashcardTypeFilter | "all");
  }, []);

  const handleDeletedChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setDeletedValue(event.target.value === "deleted");
  }, []);

  const openEdit = useCallback((id: string, selected: FlashcardDTO) => {
    setEditId(id);
    setEditState({
      front: selected.front,
      back: selected.back,
      isSaving: false,
      errors: {},
    });
    setEditOriginal({ front: selected.front, back: selected.back });
    setPendingEditId(null);
    setShowUnsavedWarning(false);
    setSaveSuccess(null);
    const url = new URL(window.location.href);
    url.searchParams.set("edit", id);
    window.history.replaceState({}, "", url.toString());
  }, []);

  const handleEditSelect = useCallback(
    (id: string) => {
      const selected = items.find((flashcard) => flashcard.id === id);
      if (!selected) {
        return;
      }
      if (selected.deleted_at) {
        setEditWarning("Nie możesz edytować usuniętej fiszki.");
        window.setTimeout(() => {
          setEditWarning(null);
        }, 3000);
        return;
      }

      if (editId && id !== editId && hasUnsavedChanges) {
        setPendingEditId(id);
        setShowUnsavedWarning(true);
        return;
      }

      openEdit(id, selected);
    },
    [editId, hasUnsavedChanges, items, openEdit]
  );

  const handleEditClear = useCallback(() => {
    setEditId(null);
    setEditState(null);
    setEditOriginal(null);
    setPendingEditId(null);
    setShowUnsavedWarning(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("edit");
    window.history.replaceState({}, "", url.toString());
  }, []);

  const handleDiscardAndSwitch = useCallback(() => {
    if (!pendingEditId) {
      setShowUnsavedWarning(false);
      return;
    }

    const selected = items.find((flashcard) => flashcard.id === pendingEditId);
    if (!selected) {
      setShowUnsavedWarning(false);
      return;
    }

    openEdit(pendingEditId, selected);
  }, [items, openEdit, pendingEditId]);

  const handleResetFilters = useCallback(() => {
    setSortValue("-created_at");
    setTypeValue("all");
    setDeletedValue(false);
  }, []);

  const matchesActiveFilters = useCallback(
    (flashcard: FlashcardDTO) => {
      const matchesType = typeValue === "all" || flashcard.card_type === typeValue;
      const matchesDeleted = deletedValue ? Boolean(flashcard.deleted_at) : !flashcard.deleted_at;
      return matchesType && matchesDeleted;
    },
    [deletedValue, typeValue]
  );

  const handleDeleteSuccess = useCallback(
    (id: string) => {
      const message =
        editId === id ? "Usunięto fiszkę, którą edytowałeś. Zmiany nie zostały zapisane." : "Fiszka została usunięta.";

      setDeleteSuccess(message);
      window.setTimeout(() => {
        setDeleteSuccess(null);
      }, 3000);

      if (editId === id) {
        handleEditClear();
      }

      removeItem(id);
    },
    [editId, handleEditClear, removeItem]
  );

  const handleChangeFront = useCallback((value: string) => {
    setEditState((prev) =>
      prev
        ? {
            ...prev,
            front: value,
            errors: { ...prev.errors, front: undefined, general: undefined },
          }
        : prev
    );
  }, []);

  const handleChangeBack = useCallback((value: string) => {
    setEditState((prev) =>
      prev
        ? {
            ...prev,
            back: value,
            errors: { ...prev.errors, back: undefined, general: undefined },
          }
        : prev
    );
  }, []);

  const validateEditState = useCallback((state: InlineEditState) => {
    const errors: InlineEditState["errors"] = {};
    const frontValue = state.front.trim();
    const backValue = state.back.trim();

    if (frontValue.length < 2) {
      errors.front = "Pole front musi mieć co najmniej 2 znaki.";
    } else if (frontValue.length > 2000) {
      errors.front = "Pole front może mieć maksymalnie 2000 znaków.";
    }

    if (backValue.length < 2) {
      errors.back = "Pole back musi mieć co najmniej 2 znaki.";
    } else if (backValue.length > 2000) {
      errors.back = "Pole back może mieć maksymalnie 2000 znaków.";
    }

    return errors;
  }, []);

  const parseUpdateError = useCallback(async (response: Response) => {
    if (response.status === 401) {
      return "Zaloguj się, aby zapisać zmiany.";
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

    return "Nie udało się zapisać zmian.";
  }, []);

  const handleSave = useCallback(async () => {
    if (!session?.access_token || !editId || !editState) {
      setEditState((prev) =>
        prev ? { ...prev, errors: { ...prev.errors, general: "Brak danych do zapisu." } } : prev
      );
      return;
    }

    setSaveSuccess(null);
    const errors = validateEditState(editState);
    if (Object.keys(errors).length > 0) {
      setEditState((prev) => (prev ? { ...prev, errors } : prev));
      return;
    }

    setEditState((prev) => (prev ? { ...prev, isSaving: true, errors: {} } : prev));

    try {
      const response = await fetch(`/api/flashcards/${editId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          front: editState.front.trim(),
          back: editState.back.trim(),
          edited_by_ai: false,
        }),
      });

      if (!response.ok) {
        const message = await parseUpdateError(response);
        setEditState((prev) =>
          prev ? { ...prev, isSaving: false, errors: { ...prev.errors, general: message } } : prev
        );
        return;
      }

      const updated = (await response.json()) as FlashcardDTO;
      updateItem(updated);
      setSaveSuccess("Zapisano zmiany.");
      setLastSavedId(updated.id);
      window.setTimeout(() => {
        setSaveSuccess(null);
      }, 3000);
      handleEditClear();
    } catch {
      setEditState((prev) =>
        prev
          ? {
              ...prev,
              isSaving: false,
              errors: { ...prev.errors, general: "Nie udało się połączyć z serwerem." },
            }
          : prev
      );
    }
  }, [editId, editState, handleEditClear, parseUpdateError, session, updateItem, validateEditState]);

  useEffect(() => {
    setSortValue(sort ?? "-created_at");
  }, [sort]);

  useEffect(() => {
    setTypeValue(type ?? "all");
  }, [type]);

  useEffect(() => {
    setDeletedValue(deleted ?? false);
  }, [deleted]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEditId(params.get("edit"));
  }, []);

  useEffect(() => {
    if (!editId || editState || items.length === 0) {
      return;
    }

    const selected = items.find((flashcard) => flashcard.id === editId);
    if (!selected) {
      return;
    }

    setEditState({
      front: selected.front,
      back: selected.back,
      isSaving: false,
      errors: {},
    });
    setEditOriginal({ front: selected.front, back: selected.back });
  }, [editId, editState, items]);

  useEffect(() => {
    if (!createdFlashcard) {
      return;
    }

    addItem(createdFlashcard);
  }, [addItem, createdFlashcard]);

  useEffect(() => {
    if (!createdFlashcard) {
      return;
    }

    if (matchesActiveFilters(createdFlashcard)) {
      setCreatedInfo(null);
      return;
    }

    setCreatedInfo("Fiszka została dodana, ale nie spełnia aktywnych filtrów.");
    if (createdInfoTimeoutRef.current) {
      window.clearTimeout(createdInfoTimeoutRef.current);
    }
    createdInfoTimeoutRef.current = window.setTimeout(() => {
      setCreatedInfo(null);
    }, 3000);
  }, [createdFlashcard, matchesActiveFilters]);

  useEffect(
    () => () => {
      if (createdInfoTimeoutRef.current) {
        window.clearTimeout(createdInfoTimeoutRef.current);
      }
    },
    []
  );
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
          <AlertDescription>Zaloguj się, aby zobaczyć bibliotekę fiszek.</AlertDescription>
        </div>
        <Button asChild variant="outline">
          <a href="/auth/sign-in">Przejdź do logowania</a>
        </Button>
      </Alert>
    );
  }

  if (isInitialLoading) {
    return (
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        Ładujemy bibliotekę fiszek...
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/30 px-4 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Twoje fiszki</p>
            <p className="text-xs text-muted-foreground">
              {isLoading ? "Aktualizujemy listę..." : `Załadowano ${items.length} fiszek.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground" htmlFor={sortId}>
                Sortowanie
              </label>
              <select
                id={sortId}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                value={sortValue}
                onChange={handleSortChange}
                disabled={isSaving}
              >
                <option value="-created_at">Najnowsze (utworzenie)</option>
                <option value="created_at">Najstarsze (utworzenie)</option>
                <option value="-updated_at">Najnowsze (aktualizacja)</option>
                <option value="updated_at">Najstarsze (aktualizacja)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground" htmlFor={typeId}>
                Typ
              </label>
              <select
                id={typeId}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                value={typeValue}
                onChange={handleTypeChange}
                disabled={isSaving}
              >
                <option value="all">Wszystkie</option>
                <option value="qa">Pytanie i odpowiedź</option>
                <option value="front_back">Przód / tył</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground" htmlFor={deletedId}>
                Status
              </label>
              <select
                id={deletedId}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                value={deletedValue ? "deleted" : "active"}
                onChange={handleDeletedChange}
                disabled={isSaving}
              >
                <option value="active">Aktywne</option>
                <option value="deleted">Usunięte</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-foreground">Dodawanie</span>
              <Button asChild variant="outline" size="sm" disabled={isSaving}>
                <a href="/flashcards/new">Dodaj fiszkę</a>
              </Button>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Filtry wpływają na widoczną listę. Sortowanie bazuje na dacie utworzenia lub aktualizacji.
        </p>
      </div>
      {saveSuccess ? (
        <Alert aria-live="polite" className="space-y-1">
          <AlertTitle>Zapisano zmiany</AlertTitle>
          <AlertDescription>{saveSuccess}</AlertDescription>
        </Alert>
      ) : null}
      {createdInfo ? (
        <Alert aria-live="polite" className="space-y-2">
          <div>
            <AlertTitle>Dodano fiszkę</AlertTitle>
            <AlertDescription>{createdInfo}</AlertDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleResetFilters}>
            Wyczyść filtry
          </Button>
        </Alert>
      ) : null}
      {deleteSuccess ? (
        <Alert aria-live="polite" className="space-y-1">
          <AlertTitle>Usunięto fiszkę</AlertTitle>
          <AlertDescription>{deleteSuccess}</AlertDescription>
        </Alert>
      ) : null}
      {editWarning ? (
        <Alert aria-live="polite" className="space-y-1">
          <AlertTitle>Edycja niedostępna</AlertTitle>
          <AlertDescription>{editWarning}</AlertDescription>
        </Alert>
      ) : null}
      {showUnsavedWarning ? (
        <Alert variant="destructive" aria-live="polite" className="space-y-2">
          <div>
            <AlertTitle>Niezapisane zmiany</AlertTitle>
            <AlertDescription>
              Masz niezapisane zmiany. Zapisz je lub porzuć, aby przejść do innej fiszki.
            </AlertDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={handleDiscardAndSwitch}>
              Porzuć i przejdź
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowUnsavedWarning(false)}>
              Zostań przy edycji
            </Button>
          </div>
        </Alert>
      ) : null}
      {error ? <ErrorBanner message={error.message} status={error.status} onRetry={handleRetry} /> : null}
      {isEditing ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
          <span>Tryb edycji inline: wybrano fiszkę do edycji.</span>
          <Button type="button" variant="outline" size="sm" onClick={handleEditClear}>
            Zakończ wybór
          </Button>
        </div>
      ) : null}
      {items.length === 0 && !error && !isLoading && hasActiveFilters ? (
        <NoResultsState onReset={handleResetFilters} />
      ) : null}
      {items.length === 0 && !error && !isLoading && !hasActiveFilters ? <EmptyState /> : null}
      {items.length > 0 ? (
        <ul className="space-y-4">
          {items.map((flashcard) => (
            <FlashcardRow
              key={flashcard.id}
              flashcard={flashcard}
              accessToken={session.access_token}
              isEditing={editId === flashcard.id}
              isLocked={Boolean(editId) && editId !== flashcard.id}
              isSaving={editId === flashcard.id ? Boolean(editState?.isSaving) : false}
              successMessage={lastSavedId === flashcard.id ? saveSuccess : null}
              onEdit={handleEditSelect}
              onCancel={handleEditClear}
              editState={editId === flashcard.id ? editState : null}
              onChangeFront={handleChangeFront}
              onChangeBack={handleChangeBack}
              onSave={handleSave}
              onDeleted={handleDeleteSuccess}
            />
          ))}
        </ul>
      ) : null}
      {items.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Wyświetlono {items.length} fiszek.</span>
          <div className="flex flex-wrap items-center gap-2">
            <span>{hasMore ? "Możesz załadować więcej wyników." : "To wszystkie dostępne fiszki."}</span>
            <Button asChild variant="ghost" size="sm">
              <a href="/flashcards/new">Dodaj fiszkę</a>
            </Button>
          </div>
        </div>
      ) : null}
      {hasMore && !error ? <LoadMoreButton isLoading={isLoading || isSaving} onLoadMore={handleLoadMore} /> : null}
    </div>
  );
};

export default FlashcardList;
