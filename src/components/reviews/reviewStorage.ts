import type { FlashcardDTO } from "@/types";

const STORAGE_KEY = "reviews:queue";

export const readReviewQueue = () => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as FlashcardDTO[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const writeReviewQueue = (items: FlashcardDTO[]) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Brak dostępu do storage lub przekroczony limit
  }
};

export const clearReviewQueue = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignoruj błędy storage
  }
};
