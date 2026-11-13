-- Run this ONCE in the Supabase SQL editor (after schema.sql), BEFORE deploying the new app version.

create table if not exists user_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  block_minutes int not null default 30 check (block_minutes in (15, 20, 30, 45, 60)),
  day_start int not null default 420 check (day_start between 0 and 1439),   -- minutes after midnight (7:00)
  day_end int not null default 1320 check (day_end between 1 and 1440),      -- 22:00
  daily_goal_blocks int not null default 4 check (daily_goal_blocks between 1 and 48),
  reward_sound boolean not null default true
);

create table if not exists time_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null,
  start_min int not null check (start_min between 0 and 1439),
  minutes int not null check (minutes between 5 and 240),
  subject_id uuid references subjects(id) on delete set null,
  topic_id uuid references topics(id) on delete set null,
  status text not null default 'planned' check (status in ('planned', 'done', 'skipped')),
  completed_at timestamptz,
  xp int not null default 0,
  unique (user_id, day, start_min)
);
create index if not exists time_blocks_user_day on time_blocks (user_id, day);

create table if not exists badges (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  badge_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

alter table study_sessions add column if not exists xp int not null default 0;
alter table study_sessions add column if not exists block_id uuid references time_blocks(id) on delete cascade;

alter table user_settings enable row level security;
alter table time_blocks enable row level security;
alter table badges enable row level security;

do $$
declare t text;
begin
  foreach t in array array['user_settings', 'time_blocks', 'badges'] loop
    if not exists (select 1 from pg_policies where tablename = t and policyname = 'own rows') then
      execute format('create policy "own rows" on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    end if;
  end loop;
end $$;
