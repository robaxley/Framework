-- Framework: projects table + RLS + daily extraction usage cap.
-- RLS is defense-in-depth here, not the app's primary enforcement path:
-- the backend uses the secret key (bypasses RLS) and filters explicitly
-- by user_id in every query. RLS still protects against any future
-- direct-from-client Supabase access using the publishable key.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled Project',
  category text not null default 'Other',
  source_url text,
  difficulty text not null default 'beginner',
  est_time text not null default '',
  est_cost text not null default '',
  tools text[] not null default '{}',
  tags text[] not null default '{}',
  materials jsonb not null default '[]',
  steps jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists projects_tags_idx on public.projects using gin (tags);

alter table public.projects enable row level security;

create policy "Users can view their own projects"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Users can insert their own projects"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own projects"
  on public.projects for update
  using (auth.uid() = user_id);

create policy "Users can delete their own projects"
  on public.projects for delete
  using (auth.uid() = user_id);

-- Per-user, per-day extraction counter backing the DAILY_EXTRACTION_LIMIT cap.
-- Only ever touched by the backend's secret-key client, so no RLS policies
-- are needed (RLS is still enabled so a leaked publishable key can't read it).
create table if not exists public.extraction_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  count int not null default 0,
  primary key (user_id, usage_date)
);

alter table public.extraction_usage enable row level security;

-- Atomically increments today's count and reports whether the caller is
-- still within p_limit. Runs as a single statement so concurrent requests
-- from the same user serialize on the upserted row instead of racing.
create or replace function public.increment_extraction_usage(p_user_id uuid, p_limit int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count int;
begin
  insert into public.extraction_usage (user_id, usage_date, count)
  values (p_user_id, current_date, 1)
  on conflict (user_id, usage_date)
  do update set count = extraction_usage.count + 1
  returning count into current_count;

  if current_count > p_limit then
    update public.extraction_usage
      set count = count - 1
      where user_id = p_user_id and usage_date = current_date;
    return false;
  end if;

  return true;
end;
$$;
