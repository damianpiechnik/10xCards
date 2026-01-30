-- migration: create core tables, enums, rls policies
-- purpose: initialize user profiles, flashcards, generation requests, and logs
-- tables: user_profiles, flashcards, generation_requests, generation_request_logs
-- enums: card_type, generation_status
-- notes: all tables have rls enabled; policies are per action and role

-- ensure required extension for uuid generation
create extension if not exists "pgcrypto";

-- enums
-- supabase local uses a postgres version without "create type if not exists"
do $$
begin
  if not exists (select 1 from pg_type where typname = 'card_type') then
    create type card_type as enum ('qa', 'front_back');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'generation_status') then
    create type generation_status as enum ('pending', 'processing', 'succeeded', 'failed', 'timeout');
  end if;
end
$$;

-- user profiles: minimal app-level profile data
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz null
);

-- generation requests: captures ai request lifecycle
create table if not exists public.generation_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_text text not null check (char_length(source_text) between 1 and 1000),
  requested_count integer not null check (requested_count > 0),
  language text not null check (language in ('PL', 'EN')),
  model text null,
  status generation_status not null default 'pending',
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz null,
  completed_at timestamptz null
);

-- generation request logs: immutable event history
create table if not exists public.generation_request_logs (
  id uuid primary key default gen_random_uuid(),
  generation_request_id uuid not null references public.generation_requests (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  level text not null check (level in ('info', 'warning', 'error')),
  message text not null,
  details jsonb null,
  created_at timestamptz not null default now()
);

-- flashcards: core learning content with embedded srs data
create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  front text not null check (char_length(front) between 2 and 2000),
  back text not null check (char_length(back) between 2 and 2000),
  card_type card_type not null,
  is_manual boolean not null default false,
  edited_by_ai boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz null,
  deleted_at timestamptz null,
  due_at timestamptz not null default now(),
  interval_days integer not null default 0 check (interval_days >= 0),
  ease_factor numeric(4,2) not null default 2.50 check (ease_factor >= 1.30),
  repetition integer not null default 0 check (repetition >= 0),
  last_reviewed_at timestamptz null
);

-- indexes for query efficiency
create index if not exists flashcards_user_due_at_idx
  on public.flashcards (user_id, due_at)
  where deleted_at is null;

create index if not exists flashcards_user_updated_at_idx
  on public.flashcards (user_id, updated_at);

create index if not exists generation_requests_user_created_at_idx
  on public.generation_requests (user_id, created_at desc);

create index if not exists generation_requests_user_status_idx
  on public.generation_requests (user_id, status);

create index if not exists generation_request_logs_request_created_at_idx
  on public.generation_request_logs (generation_request_id, created_at desc);

create index if not exists generation_request_logs_user_created_at_idx
  on public.generation_request_logs (user_id, created_at desc);

-- enable rls
alter table public.user_profiles enable row level security;
alter table public.flashcards enable row level security;
alter table public.generation_requests enable row level security;
alter table public.generation_request_logs enable row level security;

-- rls policies: user_profiles
-- anon role: deny all access to protect personal data
create policy user_profiles_select_anon
  on public.user_profiles
  for select
  to anon
  using (false);

create policy user_profiles_insert_anon
  on public.user_profiles
  for insert
  to anon
  with check (false);

create policy user_profiles_update_anon
  on public.user_profiles
  for update
  to anon
  using (false);

create policy user_profiles_delete_anon
  on public.user_profiles
  for delete
  to anon
  using (false);

-- authenticated role: owner-only access
create policy user_profiles_select_authenticated
  on public.user_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy user_profiles_insert_authenticated
  on public.user_profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy user_profiles_update_authenticated
  on public.user_profiles
  for update
  to authenticated
  using (auth.uid() = user_id);

create policy user_profiles_delete_authenticated
  on public.user_profiles
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- rls policies: generation_requests
-- anon role: deny all access to prevent unauthenticated usage
create policy generation_requests_select_anon
  on public.generation_requests
  for select
  to anon
  using (false);

create policy generation_requests_insert_anon
  on public.generation_requests
  for insert
  to anon
  with check (false);

create policy generation_requests_update_anon
  on public.generation_requests
  for update
  to anon
  using (false);

create policy generation_requests_delete_anon
  on public.generation_requests
  for delete
  to anon
  using (false);

-- authenticated role: owner-only access
create policy generation_requests_select_authenticated
  on public.generation_requests
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy generation_requests_insert_authenticated
  on public.generation_requests
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy generation_requests_update_authenticated
  on public.generation_requests
  for update
  to authenticated
  using (auth.uid() = user_id);

create policy generation_requests_delete_authenticated
  on public.generation_requests
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- rls policies: generation_request_logs
-- anon role: deny all access; logs may contain sensitive error data
create policy generation_request_logs_select_anon
  on public.generation_request_logs
  for select
  to anon
  using (false);

create policy generation_request_logs_insert_anon
  on public.generation_request_logs
  for insert
  to anon
  with check (false);

create policy generation_request_logs_update_anon
  on public.generation_request_logs
  for update
  to anon
  using (false);

create policy generation_request_logs_delete_anon
  on public.generation_request_logs
  for delete
  to anon
  using (false);

-- authenticated role: owner-only access
create policy generation_request_logs_select_authenticated
  on public.generation_request_logs
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy generation_request_logs_insert_authenticated
  on public.generation_request_logs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy generation_request_logs_update_authenticated
  on public.generation_request_logs
  for update
  to authenticated
  using (auth.uid() = user_id);

create policy generation_request_logs_delete_authenticated
  on public.generation_request_logs
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- rls policies: flashcards
-- anon role: deny all access; flashcards are private by default
create policy flashcards_select_anon
  on public.flashcards
  for select
  to anon
  using (false);

create policy flashcards_insert_anon
  on public.flashcards
  for insert
  to anon
  with check (false);

create policy flashcards_update_anon
  on public.flashcards
  for update
  to anon
  using (false);

create policy flashcards_delete_anon
  on public.flashcards
  for delete
  to anon
  using (false);

-- authenticated role: owner-only access
create policy flashcards_select_authenticated
  on public.flashcards
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy flashcards_insert_authenticated
  on public.flashcards
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy flashcards_update_authenticated
  on public.flashcards
  for update
  to authenticated
  using (auth.uid() = user_id);

create policy flashcards_delete_authenticated
  on public.flashcards
  for delete
  to authenticated
  using (auth.uid() = user_id);
