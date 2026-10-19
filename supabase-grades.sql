-- Este archivo fue unificado en supabase-setup.sql.
-- Ejecuta supabase-setup.sql en el Editor SQL de Supabase para configurar la base de datos completa.
alter table public.students
add column if not exists grades jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
