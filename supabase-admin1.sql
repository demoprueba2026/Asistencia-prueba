-- Create the Auth user in Supabase first, then replace this email with the
-- same email and run the script in the Supabase SQL Editor.
do $$
declare
  admin_auth_id uuid;
begin
  select id
    into admin_auth_id
  from auth.users
  where lower(email) = lower('REEMPLAZAR-admin1@dominio.com');

  if admin_auth_id is null then
    raise exception 'No existe la cuenta Auth de admin1. Créala primero y reemplaza el email en este script.';
  end if;

  insert into public.staff_access (
    auth_user_id, login_username, auth_email, display_name, active, role,
    allowed_years, allowed_subjects, allowed_subjects_by_year
  ) values (
    admin_auth_id,
    'admin1',
    (select email from auth.users where id = admin_auth_id),
    'Administrador',
    true,
    '{"esAdmin":true}'::jsonb,
    array[1, 2, 3, 4, 5],
    '["todas"]'::jsonb,
    '{}'::jsonb
  )
  on conflict (auth_user_id) do update set
    login_username = excluded.login_username,
    auth_email = excluded.auth_email,
    display_name = excluded.display_name,
    active = excluded.active,
    role = excluded.role,
    allowed_years = excluded.allowed_years,
    allowed_subjects = excluded.allowed_subjects,
    allowed_subjects_by_year = excluded.allowed_subjects_by_year;
end;
$$;
