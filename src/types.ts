import type { Enums, Tables, TablesInsert, TablesUpdate } from "./db/database.types";

type UserProfileRow = Tables<"user_profiles">;
type GenerationRequestRow = Tables<"generation_requests">;
type GenerationRequestLogRow = Tables<"generation_request_logs">;
type FlashcardRow = Tables<"flashcards">;

interface CursorPaginationQuery {
  limit?: number;
  cursor?: string;
}

// Aliasy filtrow i sortowania dla zapytan listujących
export type GenerationRequestStatusFilter = Enums<"generation_status">;
export type GenerationRequestSort = "created_at" | "-created_at";
export type FlashcardTypeFilter = Enums<"card_type">;
export type FlashcardSort = "created_at" | "-created_at" | "updated_at" | "-updated_at";
export type FlashcardDeletedFilter = boolean;

interface PaginatedResponse<TItem> {
  items: TItem[];
  next_cursor: string | null;
}

export interface SuccessResponseDTO {
  success: true;
}

// Auth DTOs/Commands (user derives from user_profiles, session links by user_id)
export type AuthUserDTO = Pick<UserProfileRow, "user_id" | "email">;
export interface AuthSessionDTO {
  user_id: UserProfileRow["user_id"];
  access_token: string;
  refresh_token: string;
  expires_at: string;
}
export interface AuthResponseDTO {
  user: AuthUserDTO;
  session: AuthSessionDTO;
}
export interface AuthSignUpCommand {
  email: UserProfileRow["email"];
  password: string;
}
export type AuthSignInCommand = AuthSignUpCommand;
export type AuthSignOutCommand = Record<string, never>;
export interface AuthResetPasswordCommand {
  email: UserProfileRow["email"];
}

// UserProfiles
export type UserProfileDTO = UserProfileRow;

// GenerationRequests
export type GenerationRequestLanguage = "PL" | "EN";
export type GenerationRequestDTO = Omit<GenerationRequestRow, "user_id">;
export type GenerationRequestSummaryDTO = Pick<
  GenerationRequestDTO,
  "id" | "status" | "created_at" | "requested_count" | "language" | "model" | "completed_at" | "updated_at"
>;
export type GenerationRequestCreateCommand = Pick<
  TablesInsert<"generation_requests">,
  "source_text" | "requested_count" | "language" | "model"
> & {
  // API narzuca zawężenie wartości języka
  language: GenerationRequestLanguage;
};
export type GenerationRequestCreateResponseDTO = Pick<GenerationRequestDTO, "id" | "status" | "created_at">;
export interface GenerationRequestListQuery extends CursorPaginationQuery {
  status?: GenerationRequestStatusFilter;
  sort?: GenerationRequestSort;
}
export type GenerationRequestListResponseDTO = PaginatedResponse<GenerationRequestSummaryDTO>;
export type GenerationRequestDetailsResponseDTO = GenerationRequestDTO;
export type GenerationRequestRetryResponseDTO = GenerationRequestDTO;

// GenerationRequestLogs
export type GenerationRequestLogDTO = Omit<GenerationRequestLogRow, "user_id">;
export type GenerationRequestLogsListQuery = CursorPaginationQuery;
export type GenerationRequestLogsListResponseDTO = PaginatedResponse<GenerationRequestLogDTO>;

// Flashcards
export type FlashcardDTO = Omit<FlashcardRow, "user_id">;
export type FlashcardSrsUpdateDTO = Pick<
  FlashcardDTO,
  "id" | "due_at" | "interval_days" | "ease_factor" | "repetition" | "last_reviewed_at"
>;
export interface FlashcardListQuery extends CursorPaginationQuery {
  sort?: FlashcardSort;
  type?: FlashcardTypeFilter;
  deleted?: FlashcardDeletedFilter;
}
export type FlashcardListResponseDTO = PaginatedResponse<FlashcardDTO>;
export type FlashcardGetResponseDTO = FlashcardDTO;
export type FlashcardCreateCommand = Pick<TablesInsert<"flashcards">, "front" | "back" | "card_type">;
export type FlashcardCreateResponseDTO = FlashcardDTO;
export type FlashcardUpdateCommand = Pick<TablesUpdate<"flashcards">, "front" | "back" | "card_type" | "edited_by_ai">;
export type FlashcardUpdateResponseDTO = FlashcardDTO;
export type FlashcardDeleteResponseDTO = SuccessResponseDTO;

// Reviews (SRS)
export interface ReviewQueueQuery {
  limit?: number;
}
export interface ReviewQueueResponseDTO {
  items: FlashcardDTO[];
}
export interface ReviewSubmitCommand {
  grade: number;
  reviewed_at?: FlashcardRow["last_reviewed_at"];
}
export interface ReviewSubmitResponseDTO {
  flashcard: FlashcardSrsUpdateDTO;
}
