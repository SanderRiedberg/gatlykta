-- Gatlykta — Supabase schema.
-- Run this in the Supabase SQL editor for the project you want to use.
-- The app inserts one row per finished round and selects ordered rows
-- for leaderboards. There is no auth; every client gets an anonymous
-- client_id stored in localStorage.

create table if not exists public.gatlykta_scores (
  id            uuid          primary key default gen_random_uuid(),
  client_id     text          not null,
  player_name   text,
  city_id       text          not null default 'stockholm',
  district_id   text          not null,
  mode          text          not null check (mode in ('fill','quiz','time','learn')),
  points        integer,
  correct       integer       not null,
  total         integer       not null,
  time_seconds  integer,
  stars         integer,
  created_at    timestamptz   not null default now()
);

-- Leaderboard index: most points first, ties broken by most-correct then recency.
create index if not exists idx_gatlykta_scores_lb
  on public.gatlykta_scores (city_id, district_id, mode, points desc nulls last, correct desc, created_at desc);

-- One row per finished round; no extra uniqueness needed.

alter table public.gatlykta_scores enable row level security;

-- Anyone can read scores (this is a public leaderboard).
drop policy if exists "gatlykta scores public read" on public.gatlykta_scores;
create policy "gatlykta scores public read"
  on public.gatlykta_scores
  for select
  using (true);

-- Anyone can insert their own scores. No auth, so we trust the client_id.
-- If you want to harden this later, add a rate-limit edge function.
drop policy if exists "gatlykta scores anyone insert" on public.gatlykta_scores;
create policy "gatlykta scores anyone insert"
  on public.gatlykta_scores
  for insert
  with check (true);

-- Optional: a daily-top-10 view that the front-end can query directly.
create or replace view public.gatlykta_top10 as
  select id, player_name, city_id, district_id, mode, points, correct, total, time_seconds, stars, created_at
  from (
    select *,
      row_number() over (
        partition by city_id, district_id, mode
        order by coalesce(points, 0) desc, correct desc, created_at desc
      ) as rn
    from public.gatlykta_scores
  ) ranked
  where rn <= 10;
