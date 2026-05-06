-- =====================================================================
-- HATE Intelligence — Supabase schema
-- Run this entire file in: Supabase Dashboard → SQL Editor → New query
-- =====================================================================

-- Required extension for gen_random_uuid()
create extension if not exists "pgcrypto";

-- =====================================================================
-- 1. PROFILES — one row per auth user, tracks plan + Stripe state
-- =====================================================================
create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               text,
  stripe_customer_id  text unique,
  plan                text not null default 'free'
                      check (plan in ('free', 'starter', 'pro')),
  subscription_status text not null default 'inactive'
                      check (subscription_status in ('active', 'inactive', 'canceled', 'past_due', 'trialing')),
  subscription_id     text,
  created_at          timestamptz not null default now()
);

create index if not exists profiles_stripe_customer_idx
  on public.profiles (stripe_customer_id);

-- =====================================================================
-- 2. USAGE — monthly question count per user
-- =====================================================================
create table if not exists public.usage (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  month           text not null,           -- format: 'YYYY-MM'
  question_count  int  not null default 0,
  created_at      timestamptz not null default now(),
  unique (user_id, month)
);

create index if not exists usage_user_month_idx
  on public.usage (user_id, month);

-- =====================================================================
-- 3. DOCUMENTS — user-owned knowledge base entries
-- =====================================================================
create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null default 'Untitled Document',
  content     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists documents_user_idx
  on public.documents (user_id, created_at desc);

-- Auto-update updated_at on row change
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.touch_updated_at();

-- =====================================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles  enable row level security;
alter table public.usage     enable row level security;
alter table public.documents enable row level security;

-- ----- profiles: user can read/update their own row only -----
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ----- usage: read-only for users (writes happen via service role) -----
drop policy if exists "usage_self_select" on public.usage;
create policy "usage_self_select"
  on public.usage for select
  using (auth.uid() = user_id);

-- ----- documents: full CRUD on own rows -----
drop policy if exists "documents_self_select" on public.documents;
create policy "documents_self_select"
  on public.documents for select
  using (auth.uid() = user_id);

drop policy if exists "documents_self_insert" on public.documents;
create policy "documents_self_insert"
  on public.documents for insert
  with check (auth.uid() = user_id);

drop policy if exists "documents_self_update" on public.documents;
create policy "documents_self_update"
  on public.documents for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "documents_self_delete" on public.documents;
create policy "documents_self_delete"
  on public.documents for delete
  using (auth.uid() = user_id);

-- =====================================================================
-- 5. AUTO-CREATE PROFILE ON SIGNUP
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Done. Verify with:
--   select count(*) from public.profiles;
--   select tablename, policyname from pg_policies where schemaname='public';
-- =====================================================================
