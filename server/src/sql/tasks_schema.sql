-- Run this SQL in Supabase (SQL Editor) before using the task APIs.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'critical')),
  department text,
  source_rule_key text,
  source_circular_ref text,
  source_circular_title text,
  source_hash text,
  ai_generated boolean not null default false,
  meta jsonb not null default '{}'::jsonb,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tasks_unique_ai_idx
  on public.tasks(user_id, source_rule_key, source_hash, title);

create index if not exists tasks_user_idx
  on public.tasks(user_id);

create index if not exists tasks_user_status_idx
  on public.tasks(user_id, status);

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create table if not exists public.rbi_rule_snapshots (
  rule_key text primary key,
  rule_title text,
  source_ref text,
  rule_hash text not null,
  last_effective_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists rbi_rule_snapshots_set_updated_at on public.rbi_rule_snapshots;
create trigger rbi_rule_snapshots_set_updated_at
before update on public.rbi_rule_snapshots
for each row execute function public.set_updated_at();
