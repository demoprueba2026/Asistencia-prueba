alter table public.students
add column if not exists grades jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
