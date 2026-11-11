Asistencias de estudiantes

## Estructura del frontend

- `css/styles.css`: estilos compartidos por asistencia y registro.
- `js/config/`: endpoints, materias, configuración de notas y cliente de sesión. La aplicación consume la API REST del servidor; no inicializa Supabase directamente en el navegador.
- `js/modelos/`: `EstudiantesModelos.js`, `EstudiantesColeccionModelo.js`, `EstudiantesConsultasModelo.js`, `AsistenciasModelos.js` y `PagosModel.js`.
- `js/vistas/`: vistas de asistencia, administración, recibos, estadísticas y reportes, además de `NotasVista.js` y `PortalEstudiantesVista.js`.
- `js/controladores/`: controladores de autenticación, asistencia, administración y carga de notas (`NotasControl.js`).
- `app.js`: punto de entrada. Las páginas `index.html` y `registro.html` cargan los módulos clásicos en orden antes de inicializar la aplicación.
- `api/` y los scripts de servidor en la raíz: endpoints y tareas del backend; permanecen separados del código del navegador.
- Las páginas principales incluyen un interruptor de tema claro/oscuro compartido; la preferencia se conserva al navegar entre módulos.

## Autenticación y acceso a Supabase

El personal inicia sesión con su **usuario y contraseña**, no con Gmail. El servidor busca el nombre de usuario en `public.staff_access` y usa el email asociado internamente para validar la contraseña con Supabase Auth; el email no se muestra ni se pide en el formulario. En el servidor configura `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`; la clave `service_role` nunca debe publicarse en el frontend. La sesión se verifica en cada API y los permisos/años/materias se leen desde `public.staff_access`.

Para pruebas sin crear usuarios en Supabase Auth se puede habilitar el acceso local mediante `TEST_STAFF_USERS` (JSON privado) y `TEST_STAFF_TOKEN_SECRET` (secreto de al menos 32 caracteres). El `.env` local está excluido de Git. En Vercel, estas variables se deben configurar manualmente en Project Settings → Environment Variables; no se incluyen en el repositorio. Estos usuarios de prueba siguen usando el mismo formulario de usuario y contraseña.

En un proyecto Supabase existente, ejecuta `supabase-security-migration.sql` una sola vez en **SQL Editor**. La migración elimina las políticas de acceso abierto y quita el acceso directo a `students` y `attendances` para `anon` y `authenticated`. Los usuarios y contraseñas que antes estaban en el JavaScript se retiraron deliberadamente; no vuelvas a poner contraseñas en el código. Para conservar los nombres de usuario, crea primero una cuenta individual en **Authentication → Users** por cada persona y asigna una contraseña nueva. Después reemplaza los emails de `supabase-staff-users.sql` por los emails asociados a esas cuentas y ejecuta el script en **SQL Editor**. Ese email solo sirve de vínculo interno: el profesor seguirá entrando con su nombre de usuario original y su contraseña nueva. El script valida que las cuentas Auth existan antes de guardar sus perfiles. Sin un perfil activo en `public.staff_access`, el inicio de sesión se rechazará.

Para habilitar Recuperación y Materia Pendiente en bases de datos existentes, ejecuta `supabase-student-pending-subjects.sql` en **SQL Editor**. Las nuevas instalaciones las crean al ejecutar `supabase-setup.sql`.

Para habilitar el administrador `admin1`, crea su cuenta en **Supabase → Authentication → Users** con la contraseña `admin123` y un email que controles. Reemplaza `REEMPLAZAR-admin1@dominio.com` en `supabase-admin1.sql` por ese mismo email y ejecuta el script en **SQL Editor**. Luego podrá iniciar sesión con `admin1` y esa contraseña; tendrá permisos administrativos completos en todos los años y materias, incluido el módulo administrativo. La contraseña no se guarda en el repositorio. `admin123` es débil: cámbiala por una contraseña robusta después de la configuración.

Ejemplo de asignación (reemplaza el correo, usuario, nombre, ID de Auth, permisos y materias por los de cada persona):

```sql
insert into public.staff_access (
  auth_user_id, login_username, auth_email, display_name, role,
  allowed_years, allowed_subjects, allowed_subjects_by_year
)
select
  id, 'usuario-docente', email, 'Prof: Nombre',
  '{"puedeVerEstudiantes":true,"puedeMarcarAsistencia":true}'::jsonb,
  array[1, 2], '["matematicas"]'::jsonb, '{}'::jsonb
from auth.users
where email = 'correo-de-auth@dominio.com';
```

Los indicadores del objeto `role` incluyen `puedeVerEstudiantes`, `puedeVerDatosPersonales`, `puedeAgregarEstudiantes`, `puedeCargarNotas`, `puedeGestionarActividades`, `puedeGestionarBoletas`, `puedeMarcarAsistencia`, `puedeVerReportes`, `esAdmin`, `soloAdmin` y `soloReportes`. `esAdmin` concede todos los permisos, por lo que debe asignarse únicamente a personal autorizado.

Las APIs también limitan los campos devueltos: para consultar notas asigna `puedeCargarNotas` o `puedeGestionarActividades`; para consultar registros de asistencia, asigna `puedeMarcarAsistencia` o `puedeVerReportes`. Para que el buscador de reportes pueda buscar por cédula, asigna también `puedeVerDatosPersonales`. Los permisos de datos personales y pagos siguen siendo independientes.

El portal de estudiantes conserva el acceso por cédula solicitado: su endpoint público solo devuelve los campos de una boleta individual y no permite listar toda la tabla. La cédula no es una credencial fuerte; para proteger plenamente las notas y pagos se necesitaría una autenticación individual de estudiantes.

El portal también consume una hoja de Google publicada como CSV para localizar estudiantes y mostrar notas. Mientras esa hoja siga publicada, cualquier persona que conozca su enlace puede descargar su contenido directamente; RLS y las restricciones de la API no protegen la hoja. Para cerrar esa exposición sin interrumpir las boletas, primero hay que migrar esas notas a Supabase o sustituir el CSV por una integración privada de Google.

Despliega frontend, API y migración de forma coordinada. Si se aplica la migración antes de que estén configuradas las cuentas/perfiles y desplegado este backend, el personal no podrá iniciar sesión. El cron de Vercel usa UTC: `15 18 * * *` corresponde a las 2:15 p. m. en Venezuela; configura `CRON_SECRET` para la invocación programada. También configura `GMAIL_USER` y `GMAIL_PASS`; el botón **Enviar Correos** requiere una sesión del personal autorizada.
