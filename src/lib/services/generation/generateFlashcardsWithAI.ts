import { openRouter } from "@/lib/services/openrouter";
import type { ResponseFormat } from "@/lib/services/openrouter";
import {
  OpenRouterError,
  OpenRouterAuthError,
  OpenRouterRateLimitError,
  OpenRouterValidationError,
  OpenRouterParseError,
  OpenRouterTimeoutError,
  OpenRouterServerError,
} from "@/lib/services/openrouter";

/**
 * Struktura odpowiedzi z AI dla fiszek
 */
interface FlashcardAIResponse {
  flashcards: {
    front: string;
    back: string;
  }[];
}

/**
 * Parametry generowania fiszek z AI
 */
export interface GenerateFlashcardsInput {
  sourceText: string;
  requestedCount: number;
  language: "PL" | "EN";
  model?: string;
}

/**
 * Rezultat generowania fiszek
 */
export interface GeneratedFlashcard {
  front: string;
  back: string;
  card_type: "qa";
  is_manual: false;
  edited_by_ai: true;
}

/**
 * Custom błąd dla serwisu generowania
 */
export class FlashcardGenerationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "FlashcardGenerationError";
  }
}

/**
 * Tworzy system prompt na podstawie języka
 */
const createSystemPrompt = (language: "PL" | "EN"): string => {
  if (language === "EN") {
    return `You are an expert at creating educational flashcards. Your task is to generate clear, concise, and effective flashcards based on the provided text.

Guidelines:
- Create flashcards that test understanding, not just memorization
- Keep the front (question) concise and clear
- Keep the back (answer) focused and accurate
- Use simple, understandable language
- Avoid creating duplicate or very similar flashcards
- If the text is too short, create the requested number by focusing on different aspects
- Front side should be a question, term, or prompt
- Back side should be an answer, definition, or explanation`;
  }

  return `Jesteś ekspertem w tworzeniu edukacyjnych fiszek. Twoim zadaniem jest generowanie klarownych, zwięzłych i efektywnych fiszek na podstawie podanego tekstu.

Wytyczne:
- Twórz fiszki, które testują zrozumienie, nie tylko zapamiętywanie
- Przód fiszki (pytanie) powinien być zwięzły i jasny
- Tył fiszki (odpowiedź) powinien być skupiony i dokładny
- Używaj prostego, zrozumiałego języka
- Unikaj tworzenia duplikatów lub bardzo podobnych fiszek
- Jeśli tekst jest za krótki, utwórz żądaną liczbę koncentrując się na różnych aspektach
- Przód fiszki powinien zawierać pytanie, termin lub wskazówkę
- Tył fiszki powinien zawierać odpowiedź, definicję lub wyjaśnienie`;
};

/**
 * Tworzy user prompt z tekstem źródłowym
 */
const createUserPrompt = (sourceText: string, requestedCount: number, language: "PL" | "EN"): string => {
  if (language === "EN") {
    return `Generate exactly ${requestedCount} flashcard${requestedCount !== 1 ? "s" : ""} based on the following text:

${sourceText}

Remember:
- Generate exactly ${requestedCount} flashcard${requestedCount !== 1 ? "s" : ""}
- Make each flashcard unique and valuable
- Focus on the most important information from the text`;
  }

  return `Wygeneruj dokładnie ${requestedCount} ${requestedCount === 1 ? "fiszkę" : requestedCount < 5 ? "fiszki" : "fiszek"} na podstawie następującego tekstu:

${sourceText}

Pamiętaj:
- Wygeneruj dokładnie ${requestedCount} ${requestedCount === 1 ? "fiszkę" : requestedCount < 5 ? "fiszki" : "fiszek"}
- Każda fiszka powinna być unikalna i wartościowa
- Skup się na najważniejszych informacjach z tekstu`;
};

/**
 * Waliduje wygenerowane fiszki
 */
const validateGeneratedFlashcards = (flashcards: FlashcardAIResponse["flashcards"], requestedCount: number): void => {
  if (!Array.isArray(flashcards)) {
    throw new FlashcardGenerationError("AI zwróciło nieprawidłowy format odpowiedzi", "INVALID_RESPONSE_FORMAT");
  }

  if (flashcards.length === 0) {
    throw new FlashcardGenerationError("AI nie wygenerowało żadnych fiszek", "NO_FLASHCARDS_GENERATED");
  }

  // Sprawdź czy każda fiszka ma wymagane pola
  for (let i = 0; i < flashcards.length; i++) {
    const card = flashcards[i];
    if (!card || typeof card !== "object") {
      throw new FlashcardGenerationError(`Fiszka ${i + 1} ma nieprawidłowy format`, "INVALID_FLASHCARD_FORMAT");
    }

    if (!card.front || typeof card.front !== "string" || card.front.trim().length === 0) {
      throw new FlashcardGenerationError(`Fiszka ${i + 1} nie ma przodu`, "MISSING_FRONT");
    }

    if (!card.back || typeof card.back !== "string" || card.back.trim().length === 0) {
      throw new FlashcardGenerationError(`Fiszka ${i + 1} nie ma tyłu`, "MISSING_BACK");
    }

    // Sprawdź długość
    if (card.front.length > 2000) {
      throw new FlashcardGenerationError(`Przód fiszki ${i + 1} jest zbyt długi`, "FRONT_TOO_LONG");
    }

    if (card.back.length > 2000) {
      throw new FlashcardGenerationError(`Tył fiszki ${i + 1} jest zbyt długi`, "BACK_TOO_LONG");
    }
  }

  // Opcjonalne ostrzeżenie jeśli liczba fiszek nie zgadza się z żądaną
  if (flashcards.length !== requestedCount) {
    // eslint-disable-next-line no-console
    console.warn(
      `AI wygenerowało ${flashcards.length} fiszek, a żądano ${requestedCount}. Używam wygenerowanych fiszek.`
    );
  }
};

/**
 * Normalizuje tekst fiszki
 */
const normalizeFlashcardText = (text: string): string => {
  return text.trim().replace(/\s+/g, " ").slice(0, 2000);
};

/**
 * Główna funkcja generująca fiszki z użyciem AI
 */
export const generateFlashcardsWithAI = async (input: GenerateFlashcardsInput): Promise<GeneratedFlashcard[]> => {
  // Walidacja wejścia
  if (!input.sourceText || input.sourceText.trim().length === 0) {
    throw new FlashcardGenerationError("Tekst źródłowy jest wymagany", "MISSING_SOURCE_TEXT");
  }

  if (input.requestedCount < 1) {
    throw new FlashcardGenerationError("Liczba fiszek musi być większa od zera", "INVALID_COUNT");
  }

  if (input.requestedCount > 50) {
    throw new FlashcardGenerationError("Można wygenerować maksymalnie 50 fiszek na raz", "COUNT_TOO_HIGH");
  }

  if (input.sourceText.length > 10000) {
    throw new FlashcardGenerationError(
      "Tekst źródłowy jest zbyt długi (maksymalnie 10000 znaków)",
      "SOURCE_TEXT_TOO_LONG"
    );
  }

  // Przygotowanie parametrów zapytania do AI
  const systemPrompt = createSystemPrompt(input.language);
  const userPrompt = createUserPrompt(input.sourceText, input.requestedCount, input.language);

  try {
    // Wywołanie OpenRouter API
    // UWAGA: Niektóre modele nie obsługują response_format przez OpenRouter
    // Dlatego prosty prompt zwracający JSON + ręczne parsowanie
    const response = await openRouter.completion<string>({
      messages: [
        {
          role: "system",
          content: systemPrompt + "\n\nWAŻNE: Odpowiedz TYLKO w formacie JSON zgodnym ze schematem.",
        },
        {
          role: "user",
          content:
            userPrompt + '\n\nOdpowiedź MUSI być w formacie JSON: {"flashcards": [{"front": "...", "back": "..."}]}',
        },
      ],
      model: input.model || "openai/gpt-4-turbo-preview",
      // Usunięte: responseFormat (nie działa przez OpenRouter dla tego modelu)
      temperature: 0.7,
      maxTokens: 1333,
    });

    // Parsowanie JSON z odpowiedzi
    let parsedContent: FlashcardAIResponse;
    try {
      // Usuń markdown code blocks jeśli są
      let jsonText = response.content.trim();
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "");
      }
      parsedContent = JSON.parse(jsonText) as FlashcardAIResponse;
    } catch (parseError) {
      throw new FlashcardGenerationError(
        "Nie udało się sparsować odpowiedzi z AI jako JSON",
        "PARSE_ERROR",
        parseError
      );
    }

    // Walidacja odpowiedzi
    validateGeneratedFlashcards(parsedContent.flashcards, input.requestedCount);

    // Logowanie użycia tokenów
    // eslint-disable-next-line no-console
    console.log(
      `AI wygenerowało ${parsedContent.flashcards.length} fiszek. ` +
        `Użyto ${response.usage.totalTokens} tokenów (prompt: ${response.usage.promptTokens}, ` +
        `completion: ${response.usage.completionTokens}). Model: ${response.model}`
    );

    // Formatowanie wyników
    const generatedFlashcards: GeneratedFlashcard[] = parsedContent.flashcards.map((card) => ({
      front: normalizeFlashcardText(card.front),
      back: normalizeFlashcardText(card.back),
      card_type: "qa" as const,
      is_manual: false as const,
      edited_by_ai: true as const,
    }));

    return generatedFlashcards;
  } catch (error) {
    // Obsługa błędów z OpenRouter
    if (error instanceof OpenRouterAuthError) {
      throw new FlashcardGenerationError(
        "Błąd autoryzacji API. Sprawdź konfigurację klucza OpenRouter.",
        "AUTH_ERROR",
        error
      );
    }

    if (error instanceof OpenRouterRateLimitError) {
      const retryAfter = error.retryAfter || 60;
      throw new FlashcardGenerationError(
        `Przekroczono limit zapytań do AI. Spróbuj ponownie za ${retryAfter} sekund.`,
        "RATE_LIMIT_ERROR",
        error
      );
    }

    if (error instanceof OpenRouterValidationError) {
      throw new FlashcardGenerationError("Nieprawidłowe parametry zapytania do AI.", "VALIDATION_ERROR", error);
    }

    if (error instanceof OpenRouterParseError) {
      throw new FlashcardGenerationError(
        "Nie udało się sparsować odpowiedzi z AI. Model może nie obsługiwać structured output.",
        "PARSE_ERROR",
        error
      );
    }

    if (error instanceof OpenRouterTimeoutError) {
      throw new FlashcardGenerationError(
        "Przekroczono limit czasu oczekiwania na odpowiedź z AI. Spróbuj ponownie.",
        "TIMEOUT_ERROR",
        error
      );
    }

    if (error instanceof OpenRouterServerError) {
      throw new FlashcardGenerationError("Błąd serwera OpenRouter. Spróbuj ponownie za chwilę.", "SERVER_ERROR", error);
    }

    // Ogólny OpenRouterError (np. 402 Payment Required)
    if (error instanceof OpenRouterError) {
      // Sprawdź czy to błąd związany z płatnościami/kredytami
      if (error.statusCode === 402) {
        throw new FlashcardGenerationError(
          "Brak wystarczających kredytów w OpenRouter. Doładuj konto na https://openrouter.ai/settings/keys",
          "PAYMENT_REQUIRED",
          error
        );
      }

      // Inny błąd HTTP
      throw new FlashcardGenerationError(`Błąd OpenRouter: ${error.message}`, "OPENROUTER_ERROR", error);
    }

    if (error instanceof FlashcardGenerationError) {
      throw error;
    }

    // Nieznany błąd
    throw new FlashcardGenerationError("Nieoczekiwany błąd podczas generowania fiszek z AI.", "UNKNOWN_ERROR", error);
  }
};
