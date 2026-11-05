begin;

alter table public.students enable row level security;
alter table public.attendances enable row level security;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('students', 'attendances')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      existing_policy.policyname,
      existing_policy.schemaname,
      existing_policy.tablename
    );
  end loop;
end;
$$;

revoke all privileges on table public.students, public.attendances
  from public, anon, authenticated;
grant all privileges on table public.students, public.attendances to service_role;
grant usage, select on all sequences in schema public to service_role;

create table if not exists public.staff_access (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  login_username text not null unique,
  auth_email text not null unique,
  display_name text not null,
  active boolean not null default true,
  role jsonb not null default '{}'::jsonb,
  allowed_years integer[] not null default '{}'::integer[],
  allowed_subjects jsonb not null default '[]'::jsonb,
  allowed_subjects_by_year jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.staff_access enable row level security;
revoke all privileges on table public.staff_access from public, anon, authenticated;
grant all privileges on table public.staff_access to service_role;
grant usage, select on all sequences in schema public to service_role;

notify pgrst, 'reload schema';
commit;
