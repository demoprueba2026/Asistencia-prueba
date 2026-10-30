Asistencias de estudiantes

## Estructura del frontend

- `css/styles.css`: estilos compartidos por asistencia y registro.
- `js/config/`: `api.js` y `app-config.js` para endpoints, materias, usuarios y permisos. La aplicación consume la API REST del servidor; no inicializa Supabase directamente en el navegador.
- `js/modelos/`: `EstudiantesModelos.js`, `EstudiantesColeccionModelo.js`, `EstudiantesConsultasModelo.js`, `AsistenciasModelos.js` y `PagosModel.js`.
- `js/vistas/`: vistas de asistencia, administración, recibos, estadísticas y reportes, además de `NotasVista.js` y `PortalEstudiantesVista.js`.
- `js/controladores/`: `AuthControl.js`, `AsistenciaControl.js`, `AdminControl.js`, `AdminPagosControl.js` y `AppControl.js`.
- `app.js`: punto de entrada. Las páginas `index.html` y `registro.html` cargan los módulos clásicos en orden antes de inicializar la aplicación.
- `api/` y los scripts de servidor en la raíz: endpoints y tareas del backend; permanecen separados del código del navegador.

## Envío de correos

En Vercel configura `GMAIL_USER`, `GMAIL_PASS`, `SUPABASE_URL` y `SUPABASE_KEY` para el entorno de producción y vuelve a desplegar después de modificarlas. El cron de Vercel usa UTC: `15 18 * * *` corresponde a las 2:15 p. m. en Venezuela. El botón **Enviar Correos** ejecuta el mismo envío de inmediato; los registros se marcan como enviados para que el cron no los repita.
