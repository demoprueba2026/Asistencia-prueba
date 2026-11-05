Asistencias de estudiantes

## Estructura del frontend

- `css/styles.css`: estilos compartidos por asistencia y registro.
- `js/config/`: endpoints, materias y cliente de sesión. La aplicación consume la API REST del servidor; no inicializa Supabase directamente en el navegador.
- `js/modelos/`: `EstudiantesModelos.js`, `EstudiantesColeccionModelo.js`, `EstudiantesConsultasModelo.js`, `AsistenciasModelos.js` y `PagosModel.js`.
- `js/vistas/`: vistas de asistencia, administración, recibos, estadísticas y reportes, además de `NotasVista.js` y `PortalEstudiantesVista.js`.
- `js/controladores/`: `AuthControl.js`, `AsistenciaControl.js`, `AdminControl.js`, `AdminPagosControl.js` y `AppControl.js`.
- `app.js`: punto de entrada. Las páginas `index.html` y `registro.html` cargan los módulos clásicos en orden antes de inicializar la aplicación.
- `api/` y los scripts de servidor en la raíz: endpoints y tareas del backend; permanecen separados del código del navegador.

## Autenticación y acceso a Supabase

La autenticación del personal se realiza con Supabase Auth. En el entorno del servidor configura `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`; la clave `service_role` nunca debe publicarse en archivos del frontend. La sesión se verifica en cada API y los permisos/años/materias se leen desde `public.staff_access`.

En un proyecto Supabase existente, ejecuta `supabase-security-migration.sql` una sola vez en **SQL Editor**. La migración elimina las políticas de acceso abierto y quita el acceso directo a `students` y `attendances` para `anon` y `authenticated`. Después crea las cuentas del personal en **Authentication → Users** e inserta una fila correspondiente en `public.staff_access` para cada cuenta, usando su ID de Auth, email, nombre, usuario, permisos, años y materias. Sin esas filas el inicio de sesión se rechazará. No reutilices las contraseñas que antes estaban en el frontend; cámbialas y rota las que se hayan expuesto.

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
