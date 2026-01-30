import type { FlashcardDTO, FlashcardSrsUpdateDTO } from "@/types";

export interface UpdateSrsInput {
  flashcard: FlashcardDTO;
  grade: number;
  reviewedAt: Date;
}

const MIN_EASE_FACTOR = 1.3;

const calculateEaseFactor = (current: number, grade: number) => {
  const delta = 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02);
  const next = Math.max(MIN_EASE_FACTOR, current + delta);
  return Number(next.toFixed(2));
};

const calculateInterval = (repetition: number, currentInterval: number, easeFactor: number) => {
  if (repetition <= 0) {
    return 1;
  }

  if (repetition === 1) {
    return 6;
  }

  return Math.max(1, Math.round(currentInterval * easeFactor));
};

/**
 * Aktualizuje pola SRS dla fiszki według algorytmu SM-2.
 */
export const updateSrs = ({ flashcard, grade, reviewedAt }: UpdateSrsInput): FlashcardSrsUpdateDTO => {
  let repetition = flashcard.repetition;
  let intervalDays = flashcard.interval_days;
  let easeFactor = flashcard.ease_factor;

  if (grade < 3) {
    repetition = 0;
    intervalDays = 1;
    easeFactor = calculateEaseFactor(easeFactor, grade);
  } else {
    repetition += 1;
    easeFactor = calculateEaseFactor(easeFactor, grade);
    intervalDays = calculateInterval(repetition, intervalDays, easeFactor);
  }

  const dueAt = new Date(reviewedAt);
  dueAt.setDate(dueAt.getDate() + intervalDays);

  return {
    id: flashcard.id,
    due_at: dueAt.toISOString(),
    interval_days: intervalDays,
    ease_factor: easeFactor,
    repetition,
    last_reviewed_at: reviewedAt.toISOString(),
  };
};
