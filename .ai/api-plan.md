# REST API Plan

## 1. Zasoby

- Users → `auth.users` (managed by Supabase Auth)
- UserProfiles → `user_profiles`
- GenerationRequests → `generation_requests`
- GenerationRequestLogs → `generation_request_logs`
- Flashcards → `flashcards`

## 2. Punkty końcowe

### Auth (Supabase)

- **POST** `/auth/sign-up`
  - Opis: Register user (email/password).
  - Request JSON:
    - `email` (string, required)
    - `password` (string, required)
  - Response JSON:
    - `user` (object)
    - `session` (object)
  - Success: `201 Created`
  - Errors: `400 Bad Request`, `409 Conflict`
- **POST** `/auth/sign-in`
  - Opis: Log in user.
  - Request JSON: `email`, `password`
  - Response JSON: `user`, `session`
  - Success: `200 OK`
  - Errors: `400 Bad Request`, `401 Unauthorized`
- **POST** `/auth/sign-out`
  - Opis: Log out user.
  - Request JSON: none
  - Response JSON: `{ "success": true }`
  - Success: `200 OK`
  - Errors: `401 Unauthorized`
- **POST** `/auth/reset-password`
  - Opis: Start password reset via email.
  - Request JSON: `email`
  - Response JSON: `{ "success": true }`
  - Success: `200 OK`
  - Errors: `400 Bad Request`, `404 Not Found`

### UserProfiles

- **GET** `/api/profile`
  - Opis: Get current user profile.
  - Query: none
  - Response JSON:
    - `user_id` (uuid)
    - `email` (string)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz|null)
  - Success: `200 OK`
  - Errors: `401 Unauthorized`

### GenerationRequests

- **POST** `/api/generation-requests`
  - Opis: Create a new AI generation request.
  - Request JSON:
    - `source_text` (string, required, 1..1000)
    - `requested_count` (integer, required, >0)
    - `language` (string, required, "PL" | "EN")
    - `model` (string, optional)
  - Response JSON:
    - `id` (uuid)
    - `status` (string)
    - `created_at` (timestamptz)
  - Success: `202 Accepted`
  - Errors: `400 Bad Request`, `401 Unauthorized`, `429 Too Many Requests`, `503 Service Unavailable`
- **GET** `/api/generation-requests`
  - Opis: List generation requests for current user.
  - Query:
    - `status` (string, optional)
    - `limit` (int, default 20, max 100)
    - `cursor` (string, optional)
    - `sort` (string, default `-created_at`)
  - Response JSON:
    - `items` (array)
    - `next_cursor` (string|null)
  - Success: `200 OK`
  - Errors: `401 Unauthorized`
- **GET** `/api/generation-requests/{id}`
  - Opis: Get generation request details.
  - Response JSON: request object (includes `status`, `error_message`, timestamps)
  - Success: `200 OK`
  - Errors: `401 Unauthorized`, `404 Not Found`
- **POST** `/api/generation-requests/{id}/retry`
  - Opis: Retry a failed or timed-out generation.
  - Request JSON: none
  - Response JSON: request object with `status=processing`
  - Success: `202 Accepted`
  - Errors: `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `409 Conflict`

### GenerationRequestLogs

- **GET** `/api/generation-requests/{id}/logs`
  - Opis: List logs for a generation request.
  - Query:
    - `limit` (int, default 50, max 200)
    - `cursor` (string, optional)
  - Response JSON:
    - `items` (array of logs)
    - `next_cursor` (string|null)
  - Success: `200 OK`
  - Errors: `401 Unauthorized`, `404 Not Found`

### Flashcards

- **GET** `/api/flashcards`
  - Opis: List user flashcards.
  - Query:
    - `limit` (int, default 20, max 100)
    - `cursor` (string, optional)
    - `sort` (string, default `-updated_at`)
    - `type` (string, optional: `qa` | `front_back`)
    - `deleted` (boolean, optional; default false)
  - Response JSON:
    - `items` (array)
    - `next_cursor` (string|null)
  - Success: `200 OK`
  - Errors: `401 Unauthorized`
- **GET** `/api/flashcards/{id}`
  - Opis: Get a flashcard by id.
  - Response JSON: flashcard object
  - Success: `200 OK`
  - Errors: `401 Unauthorized`, `404 Not Found`
- **POST** `/api/flashcards`
  - Opis: Create a manual flashcard.
  - Request JSON:
    - `front` (string, required, 2..2000)
    - `back` (string, required, 2..2000)
    - `card_type` (string, required: `qa` | `front_back`)
  - Response JSON: flashcard object
  - Success: `201 Created`
  - Errors: `400 Bad Request`, `401 Unauthorized`
- **PATCH** `/api/flashcards/{id}`
  - Opis: Inline update of a flashcard.
  - Request JSON:
    - `front` (string, optional)
    - `back` (string, optional)
    - `card_type` (string, optional)
    - `edited_by_ai` (boolean, optional)
  - Response JSON: flashcard object
  - Success: `200 OK`
  - Errors: `400 Bad Request`, `401 Unauthorized`, `404 Not Found`
- **DELETE** `/api/flashcards/{id}`
  - Opis: Soft delete a flashcard.
  - Request JSON: none
  - Response JSON: `{ "success": true }`
  - Success: `200 OK`
  - Errors: `401 Unauthorized`, `404 Not Found`

### Reviews (SRS)

- **GET** `/api/reviews/queue`
  - Opis: Get flashcards due for review.
  - Query:
    - `limit` (int, default 20, max 100)
  - Response JSON:
    - `items` (array of flashcards)
  - Success: `200 OK`
  - Errors: `401 Unauthorized`
- **POST** `/api/reviews/{id}`
  - Opis: Submit a review result and update SRS.
  - Request JSON:
    - `grade` (integer, required, 0..5)
    - `reviewed_at` (timestamptz, optional)
  - Response JSON:
    - `flashcard` (object with updated SRS fields)
  - Success: `200 OK`
  - Errors: `400 Bad Request`, `401 Unauthorized`, `404 Not Found`

## 3. Uwierzytelnianie i autoryzacja

- Supabase Auth for email/password auth.
- Bearer JWT in `Authorization` header for all `/api/*` endpoints.
- RLS enforced on `user_profiles`, `flashcards`, `generation_requests`, `generation_request_logs` with `auth.uid() = user_id`.
- Only the owner can read/write their rows; server-side calls use user token.

## 4. Walidacja i logika biznesowa

### Walidacja (DB + API)

- `generation_requests.source_text`: 1..1000 chars.
- `generation_requests.requested_count`: > 0.
- `generation_requests.language`: "PL" | "EN".
- `generation_request_logs.level`: "info" | "warning" | "error".
- `flashcards.front` and `flashcards.back`: 2..2000 chars.
- `flashcards.card_type`: "qa" | "front_back".
- SRS fields:
  - `interval_days` >= 0
  - `ease_factor` >= 1.30
  - `repetition` >= 0

### Logika biznesowa

- AI generation:
  - Create `generation_requests` with status `pending`, then process asynchronously.
  - Update status to `processing` and eventually to `succeeded` or `failed`/`timeout`.
  - On success: create `flashcards` with `is_manual=false`, `edited_by_ai=false`, initialize SRS fields.
  - On failure: set `error_message`, allow retry endpoint.
- Manual flashcards:
  - `is_manual=true`, initialize SRS fields on create.
- Deletion:
  - Soft delete via `deleted_at`; excluded from review queue and default list.
- Reviews:
  - Review submission updates SRS fields (`due_at`, `interval_days`, `ease_factor`, `repetition`, `last_reviewed_at`) based on SRS algorithm implementation.
  - Review queue uses `(user_id, due_at)` index and filters `deleted_at IS NULL`.

### Paginacja, filtrowanie, sortowanie

- Cursor-based pagination (`cursor`, `limit`) for list endpoints.
- Sort by `created_at` or `updated_at` with `sort` parameter (`-` prefix for desc).
- Filters:
  - `generation_requests`: `status`
  - `flashcards`: `type`, `deleted`

### Bezpieczeństwo i wydajność

- Rate limiting on AI generation endpoints (e.g., per-user per minute).
- Timeout handling for AI generation (30s); mark `timeout` and allow retry.
- Input length checks on API layer to reduce DB rejects.
- Optional audit logs via `generation_request_logs`.
