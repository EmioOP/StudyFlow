-- StudyFlow schema. Run in Supabase SQL editor.
create extension if not exists "pgcrypto";

create table subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  code text,
  color text not null default '#6366f1',
  created_at timestamptz not null default now()
);

-- one end-semester exam per subject
create table exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid not null unique references subjects(id) on delete cascade,
  exam_date date not null,
  start_time time,
  venue text
);

create table modules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  title text not null,
  position int not null default 0
);

create table topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  module_id uuid references modules(id) on delete cascade,
  title text not null,
  position int not null default 0,
  done boolean not null default false,
  priority int not null default 2 check (priority between 1 and 3),
  difficulty int not null default 2 check (difficulty between 1 and 3),
  revision_count int not null default 0,
  next_revision_at date
);

create table study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid references subjects(id) on delete set null,
  minutes int not null check (minutes > 0),
  started_at timestamptz not null default now()
);

-- notes (text) and materials (files: notes pdf, previous question papers)
create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  topic_id uuid references topics(id) on delete set null,
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now()
);

create table materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  kind text not null check (kind in ('pyq','note')),
  title text not null,
  path text not null,
  created_at timestamptz not null default now()
);

-- shared library visible to all signed-in users
create table library_subjects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  owner_name text,
  name text not null,
  code text,
  branch text,
  semester text,
  syllabus jsonb not null, -- [{ "title": "...", "topics": ["...", "..."] }]
  imports int not null default 0,
  created_at timestamptz not null default now()
);

alter table subjects enable row level security;
alter table exams enable row level security;
alter table modules enable row level security;
alter table topics enable row level security;
alter table study_sessions enable row level security;
alter table notes enable row level security;
alter table materials enable row level security;
alter table library_subjects enable row level security;

do $$
declare t text;
begin
  foreach t in array array['subjects','exams','modules','topics','study_sessions','notes','materials'] loop
    execute format('create policy "own rows" on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

create policy "library read" on library_subjects for select to authenticated using (true);
create policy "library insert" on library_subjects for insert to authenticated with check (owner_id = auth.uid());
create policy "library update own" on library_subjects for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "library delete own" on library_subjects for delete to authenticated using (owner_id = auth.uid());

-- anyone signed in can bump the import counter
create or replace function bump_library_import(lib_id uuid) returns void
language sql security definer set search_path = public as
$$ update library_subjects set imports = imports + 1 where id = lib_id $$;
grant execute on function bump_library_import(uuid) to authenticated;

create index on topics (subject_id);
create index on modules (subject_id);
create index on study_sessions (user_id, started_at);

-- private storage bucket for PDFs/images; files live under <user_id>/...
insert into storage.buckets (id, name, public) values ('materials', 'materials', false) on conflict do nothing;
create policy "materials own read" on storage.objects for select to authenticated
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "materials own write" on storage.objects for insert to authenticated
  with check (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "materials own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);
