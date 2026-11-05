-- Provision profiles for the legacy staff logins after creating each account
-- in Supabase Auth. Teachers still log in with login_username, not auth_email.
-- Replace each placeholder with the matching Auth email. This does not create
-- Auth users or set passwords; assign a new password in Supabase Auth.

begin;

create temporary table staff_seed (
  login_username text primary key,
  auth_email text not null,
  display_name text not null,
  role jsonb not null,
  allowed_years integer[] not null,
  allowed_subjects jsonb not null,
  allowed_subjects_by_year jsonb not null default '{}'::jsonb
) on commit drop;

insert into staff_seed (
  login_username, auth_email, display_name, role,
  allowed_years, allowed_subjects, allowed_subjects_by_year
) values
  (
    'prueba4', 'REEMPLAZAR-prueba4@dominio.com', 'Prof: David',
    '{"puedeVerEstudiantes":true,"puedeCargarNotas":true,"puedeMarcarAsistencia":true,"puedeAgregarEstudiantes":true,"puedeVerDatosPersonales":true,"puedeGestionarBoletas":true,"puedeGestionarActividades":true,"puedeVerReportes":true,"esAdmin":true}'::jsonb,
    array[1,2,3,4,5], '["todas"]'::jsonb
  ),
  (
    'Abraham Ramirez', 'REEMPLAZAR-abraham@dominio.com', 'Prof: Abrahan',
    '{"puedeVerEstudiantes":true,"puedeCargarNotas":true,"puedeMarcarAsistencia":true,"puedeAgregarEstudiantes":true,"puedeVerDatosPersonales":true}'::jsonb,
    array[1,2,3,4,5], '["todas"]'::jsonb
  ),
  (
    'prueba3', 'REEMPLAZAR-prueba3@dominio.com', 'Administrador de Sistema',
    '{"puedeVerDatosPersonales":true,"puedeVerReportes":true,"soloAdmin":true}'::jsonb,
    '{}'::integer[], '[]'::jsonb
  ),
  (
    'David', 'REEMPLAZAR-david@dominio.com', 'Prof: David',
    '{"puedeVerEstudiantes":true,"puedeCargarNotas":true,"puedeMarcarAsistencia":true,"puedeAgregarEstudiantes":true,"puedeVerDatosPersonales":true,"puedeGestionarBoletas":true,"puedeGestionarActividades":true,"puedeVerReportes":true,"esAdmin":true}'::jsonb,
    array[1,2,3,4,5], '["todas"]'::jsonb
  ),
  (
    'prueba2', 'REEMPLAZAR-prueba2@dominio.com', 'Prof: Control de esturdio',
    '{"puedeVerEstudiantes":true,"puedeCargarNotas":true,"puedeMarcarAsistencia":true,"puedeAgregarEstudiantes":true,"puedeGestionarActividades":true,"puedeVerDatosPersonales":true,"puedeVerReportes":true}'::jsonb,
    array[1,2,3,4,5], '["todas"]'::jsonb
  ),
  (
    'profe1', 'REEMPLAZAR-profe1@dominio.com', 'Prof: Miriam',
    '{"puedeVerEstudiantes":true,"puedeCargarNotas":true,"puedeMarcarAsistencia":true}'::jsonb,
    array[1,2,3,4,5], '["orientacion-convivencia"]'::jsonb,
    '{"3":["orientacion-convivencia","crp"]}'::jsonb
  ),
  (
    'Tibisay Plaza', 'REEMPLAZAR-tibisay@dominio.com', 'Prof: Tibisay',
    '{"puedeVerEstudiantes":true,"puedeCargarNotas":true,"puedeMarcarAsistencia":true}'::jsonb,
    array[1,2], '["matematicas"]'::jsonb
  ),
  (
    'Yudisay Hernández', 'REEMPLAZAR-yudisay@dominio.com', 'Prof: Yudisay',
    '{"puedeVerEstudiantes":true,"puedeCargarNotas":true,"puedeMarcarAsistencia":true}'::jsonb,
    array[1,2,3,4,5], '["castellano"]'::jsonb
  ),
  (
    'Lenis Ávila', 'REEMPLAZAR-lenis@dominio.com', 'Prof: Lenis',
    '{"puedeVerEstudiantes":true,"puedeCargarNotas":true,"puedeMarcarAsistencia":true}'::jsonb,
    array[3,4,5], '["ingles"]'::jsonb
  ),
  (
    'Johana Pedron', 'REEMPLAZAR-johana@dominio.com', 'Prof: Johana',
    '{"puedeVerEstudiantes":true,"puedeCargarNotas":true,"puedeMarcarAsistencia":true}'::jsonb,
    array[1,2,3,4,5], '["frances"]'::jsonb
  ),
  (
    'Lidis Hernández', 'REEMPLAZAR-lidis@dominio.com', 'Prof: Lidis',
    '{"puedeVerEstudiantes":true,"puedeCargarNotas":true,"puedeMarcarAsistencia":true}'::jsonb,
    array[1,2], '["ingles"]'::jsonb
  ),
  (
    'Yoxelith Camaripano', 'REEMPLAZAR-yoxelith@dominio.com', 'Prof: Yoxelith',
    '{"puedeVerEstudiantes":true,"puedeCargarNotas":true,"puedeMarcarAsistencia":true}'::jsonb,
    array[1,2,3,4], '["ciencias-naturales","biologia"]'::jsonb
  ),
  (
    'Alexis Serrano', 'REEMPLAZAR-alexis@dominio.com', 'Prof: Alexis',
    '{"puedeVerEstudiantes":true,"puedeCargarNotas":true,"puedeMarcarAsistencia":true}'::jsonb,
    array[1,2,3,4,5], '["ghc"]'::jsonb
  ),
  (
    'Oriana Blanco', 'REEMPLAZAR-oriana@dominio.com', 'Prof: Oriana',
    '{"puedeVerEstudiantes":true,"puedeCargarNotas":true,"puedeMarcarAsistencia":true}'::jsonb,
    array[1,2], '["arte-patrimonio"]'::jsonb
  ),
  (
    'Leidy Gonzalez', 'REEMPLAZAR-leidy@dominio.com', 'Prof: Leidy',
    '{"puedeVerEstudiantes":true,"puedeCargarNotas":true,"puedeMarcarAsistencia":true}'::jsonb,
    array[3,4,5], '["quimica"]'::jsonb
  ),
  (
    'Ricardo Salcedo', 'REEMPLAZAR-ricardo@dominio.com', 'Prof: Ricardo',
    '{"puedeVerEstudiantes":true,"puedeCargarNotas":true,"puedeMarcarAsistencia":true}'::jsonb,
    array[1,2,3,4,5], '["educacion-fisica","formacion-soberania"]'::jsonb
  );

do $$
declare
  missing_accounts text;
begin
  select string_agg(seed.login_username, ', ' order by seed.login_username)
    into missing_accounts
  from staff_seed as seed
  left join auth.users as auth_user
    on lower(auth_user.email) = lower(seed.auth_email)
  where seed.auth_email like 'REEMPLAZAR-%'
     or auth_user.id is null;

  if missing_accounts is not null then
    raise exception 'Crea los usuarios de Supabase Auth y reemplaza sus emails antes de continuar. Pendientes: %', missing_accounts;
  end if;
end;
$$;

insert into public.staff_access (
  auth_user_id, login_username, auth_email, display_name, active, role,
  allowed_years, allowed_subjects, allowed_subjects_by_year
)
select
  auth_user.id,
  seed.login_username,
  auth_user.email,
  seed.display_name,
  true,
  seed.role,
  seed.allowed_years,
  seed.allowed_subjects,
  seed.allowed_subjects_by_year
from staff_seed as seed
join auth.users as auth_user
  on lower(auth_user.email) = lower(seed.auth_email)
on conflict (auth_user_id) do update set
  login_username = excluded.login_username,
  auth_email = excluded.auth_email,
  display_name = excluded.display_name,
  active = excluded.active,
  role = excluded.role,
  allowed_years = excluded.allowed_years,
  allowed_subjects = excluded.allowed_subjects,
  allowed_subjects_by_year = excluded.allowed_subjects_by_year;

commit;
