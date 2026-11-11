-- Adds recovery and pending-subject records for existing Supabase projects.
alter table public.students
  add column if not exists pending_subjects jsonb not null default '[]'::jsonb,
  add column if not exists matter_pending_subjects jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
