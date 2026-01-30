import type { GenerationRequestDetailsResponseDTO, GenerationRequestSummaryDTO } from "@/types";

type GenerationStatus = GenerationRequestDetailsResponseDTO["status"] | GenerationRequestSummaryDTO["status"];

const STATUS_LABELS: Record<GenerationStatus, string> = {
  pending: "W kolejce",
  processing: "Przetwarzanie",
  succeeded: "Zakończone",
  failed: "Niepowodzenie",
  timeout: "Przekroczony limit czasu",
};

const STATUS_DESCRIPTIONS: Record<GenerationStatus, string> = {
  pending: "Zlecenie oczekuje na rozpoczęcie generacji.",
  processing: "Generujemy fiszki na podstawie przesłanego tekstu.",
  succeeded: "Zlecenie zakończone. Fiszki są dostępne w bibliotece.",
  failed: "Generowanie nie powiodło się.",
  timeout: "Generowanie trwało zbyt długo i zostało przerwane.",
};

export const getStatusLabel = (status: GenerationStatus) => STATUS_LABELS[status];

export const getStatusDescription = (status: GenerationStatus) => STATUS_DESCRIPTIONS[status];

export const isActiveStatus = (status: GenerationStatus) => status === "pending" || status === "processing";

export const isRetryableStatus = (status: GenerationStatus) => status === "failed" || status === "timeout";
