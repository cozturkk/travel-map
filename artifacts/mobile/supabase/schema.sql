-- Travel Map — cloud backup table for the Profile tab.
-- Stores one row per user with their home country, bucket list and the
-- countries they've manually marked as visited on the map.
-- Run this once in the Supabase SQL editor.

create table if not exists public.user_stats (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_stats enable row level security;

-- Each user can only read and write their own row.
drop policy if exists "user_stats_own_rows" on public.user_stats;
create policy "user_stats_own_rows"
  on public.user_stats
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
