-- Add optional profile-related columns used by UI enrichment and chat avatars.
-- Safe to run multiple times.

alter table if exists public.tickets
  add column if not exists reporter_emp_id text,
  add column if not exists reporter_dept text,
  add column if not exists reporter_avatar_url text,
  add column if not exists assigned_employee_id text,
  add column if not exists assigned_avatar_url text;

