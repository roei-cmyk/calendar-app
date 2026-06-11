-- ============================================================================
-- KNBL Content Planner — Database schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE / idempotent seeds.
-- ============================================================================

-- Extensions -----------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================
do $$ begin
  create type user_role as enum ('admin', 'client');
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_status as enum ('draft', 'pending', 'approved', 'scheduled', 'published');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Clients (brands managed by the agency) -------------------------------------
create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  color       text not null default '#111827',
  created_at  timestamptz not null default now()
);

-- Profiles (1:1 with auth.users) ---------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        user_role not null default 'client',
  -- client users are scoped to exactly one client; admins leave this null
  client_id   uuid references public.clients(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Posts (calendar entries) ---------------------------------------------------
create table if not exists public.posts (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  title           text not null,
  body            text,
  platform        text,                       -- e.g. instagram, facebook, tiktok
  media_url       text,
  status          post_status not null default 'draft',
  scheduled_date  date not null,              -- the calendar day this post lands on
  scheduled_time  time,                       -- optional time-of-day (for Day/Week views)
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists posts_client_date_idx on public.posts (client_id, scheduled_date);
create index if not exists posts_date_idx on public.posts (scheduled_date);

-- Comments (clients give feedback on posts) ----------------------------------
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  author_id   uuid references public.profiles(id) on delete set null,
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists comments_post_idx on public.comments (post_id, created_at);

-- ============================================================================
-- updated_at trigger for posts
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Auto-create a profile when a new auth user signs up
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'client')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Helper functions for RLS (security definer to avoid recursive policy checks)
-- ============================================================================
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.my_client_id()
returns uuid language sql stable security definer set search_path = public as $$
  select client_id from public.profiles where id = auth.uid();
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.clients  enable row level security;
alter table public.profiles enable row level security;
alter table public.posts    enable row level security;
alter table public.comments enable row level security;

-- ---- clients ----
drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients
  for select using (
    public.is_admin() or id = public.my_client_id()
  );

drop policy if exists clients_admin_write on public.clients;
create policy clients_admin_write on public.clients
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- profiles ----
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- posts ----
-- Admin: full access. Client: read-only, scoped to their own client.
drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts
  for select using (
    public.is_admin() or client_id = public.my_client_id()
  );

drop policy if exists posts_admin_write on public.posts;
create policy posts_admin_write on public.posts
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- comments ----
-- Anyone who can see the post can read its comments.
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments
  for select using (
    exists (
      select 1 from public.posts p
      where p.id = comments.post_id
        and (public.is_admin() or p.client_id = public.my_client_id())
    )
  );

-- Admins and the post's client may add comments (must author as themselves).
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.posts p
      where p.id = comments.post_id
        and (public.is_admin() or p.client_id = public.my_client_id())
    )
  );

-- Authors can edit/delete their own comments; admins can manage any.
drop policy if exists comments_modify_own on public.comments;
create policy comments_modify_own on public.comments
  for update using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());

drop policy if exists comments_delete_own on public.comments;
create policy comments_delete_own on public.comments
  for delete using (author_id = auth.uid() or public.is_admin());

-- ============================================================================
-- SEED: agency clients
-- ============================================================================
insert into public.clients (name, slug, color) values
  ('כלכלית לוד',            'kalkalit-lod',   '#027a48'),
  ('ספארי רמת גן',          'safari-rg',      '#3f6212'),
  ('קרטרס',                 'carters',        '#be123c'),
  ('סקיפ הופ',              'skip-hop',       '#92400e'),
  ('רולדין',                'roladin',        '#9a3412'),
  ('קריית המוזיאונים פ"ת',  'museums-pt',     '#4c1d95')
on conflict (slug) do update set name = excluded.name, color = excluded.color;
