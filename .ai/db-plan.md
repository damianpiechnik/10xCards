1. Lista tabel z ich kolumnami, typami danych i ograniczeniami

**auth.users (Supabase Auth, istniejąca)**

- `id` uuid, PK
- Używana jako źródło tożsamości; brak modyfikacji schematu w MVP

**user_profiles**

- `user_id` uuid, PK, FK → `auth.users.id`
- `email` text, NOT NULL
- `created_at` timestamptz, NOT NULL
- `updated_at` timestamptz, NULL

**card_type (ENUM)**

- Wartości: `qa`, `front_back`

**generation_status (ENUM)**

- Wartości: `pending`, `processing`, `succeeded`, `failed`, `timeout`

**generation_requests**

- `id` uuid, PK, default `gen_random_uuid()`
- `user_id` uuid, NOT NULL, FK → `auth.users.id`
- `source_text` text, NOT NULL, CHECK (char_length(source_text) BETWEEN 1 AND 1000)
- `requested_count` integer, NOT NULL, CHECK (requested_count > 0)
- `language` text, NOT NULL, CHECK (language IN ('PL','EN'))
- `model` text, NULL
- `status` generation_status, NOT NULL, default `pending`
- `error_message` text, NULL
- `created_at` timestamptz, NOT NULL, default `now()`
- `updated_at` timestamptz, NULL
- `completed_at` timestamptz, NULL

**generation_request_logs**

- `id` uuid, PK, default `gen_random_uuid()`
- `generation_request_id` uuid, NOT NULL, FK → `generation_requests.id`
- `user_id` uuid, NOT NULL, FK → `auth.users.id`
- `level` text, NOT NULL, CHECK (level IN ('info','warning','error'))
- `message` text, NOT NULL
- `details` jsonb, NULL
- `created_at` timestamptz, NOT NULL, default `now()`

**flashcards**

- `id` uuid, PK, default `gen_random_uuid()`
- `user_id` uuid, NOT NULL, FK → `auth.users.id`
- `front` text, NOT NULL, CHECK (char_length(front) BETWEEN 2 AND 2000)
- `back` text, NOT NULL, CHECK (char_length(back) BETWEEN 2 AND 2000)
- `card_type` card_type, NOT NULL
- `is_manual` boolean, NOT NULL, default `false`
- `edited_by_ai` boolean, NOT NULL, default `false`
- `created_at` timestamptz, NOT NULL, default `now()`
- `updated_at` timestamptz, NULL
- `deleted_at` timestamptz, NULL
- **SRS (wbudowane w flashcards na MVP):**
  - `due_at` timestamptz, NOT NULL, default `now()`
  - `interval_days` integer, NOT NULL, default `0`, CHECK (interval_days >= 0)
  - `ease_factor` numeric(4,2), NOT NULL, default `2.50`, CHECK (ease_factor >= 1.30)
  - `repetition` integer, NOT NULL, default `0`, CHECK (repetition >= 0)
  - `last_reviewed_at` timestamptz, NULL

2. Relacje między tabelami

- `auth.users (1) → (1) user_profiles` przez `user_profiles.user_id`
- `auth.users (1) → (N) flashcards` przez `flashcards.user_id`
- `auth.users (1) → (N) generation_requests` przez `generation_requests.user_id`
- `generation_requests (1) → (N) generation_request_logs` przez `generation_request_logs.generation_request_id`
- Brak relacji M:N w MVP

3. Indeksy

- `user_profiles`:
  - unikalność `user_id` zapewnia PK (brak dodatkowych indeksów w MVP)
- `flashcards`:
  - indeks złożony dla powtórek: `(user_id, due_at)` WHERE `deleted_at` IS NULL
  - opcjonalny indeks pomocniczy: `(user_id, updated_at)` dla listy biblioteki
- `generation_requests`:
  - indeks: `(user_id, created_at DESC)`
  - opcjonalny indeks: `(user_id, status)` dla filtrów po statusie
- `generation_request_logs`:
  - indeks: `(generation_request_id, created_at DESC)`
  - opcjonalny indeks: `(user_id, created_at DESC)`

4. Zasady PostgreSQL (RLS)

- Włącz RLS na `user_profiles`, `flashcards`, `generation_requests` i `generation_request_logs`
- Polityka właściciela (SELECT/INSERT/UPDATE/DELETE):
  - `auth.uid() = user_id`
- Dodatkowo:
  - Blokada `UPDATE` na usuniętych fiszkach może być realizowana w aplikacji; w MVP bez dodatkowej polityki

5. Dodatkowe uwagi / decyzje projektowe

- SRS przechowywany bezpośrednio w `flashcards` (mniej JOIN-ów, prostszy MVP).
- Uwierzytelnianie jest w Supabase Auth; `user_profiles` przechowuje tylko podstawowe dane aplikacyjne (email, created_at).
