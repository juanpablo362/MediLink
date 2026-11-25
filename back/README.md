# MediLink · API .NET 10

API REST para los modelos y flujos de `front/`: autenticación, pacientes, médicos, estudios, sucursales, usuarios, institución, órdenes, archivos y enlaces de resultados.

## Ejecutar en local

Requiere el SDK de .NET 10. No requiere una cuenta en Neon para desarrollo: utiliza SQLite y archivos privados en `src/MediLink.Api/App_Data/`.

Desde la raíz del repositorio, en PowerShell:

```powershell
cd back
dotnet restore
$env:Bootstrap__Password = Read-Host 'Contraseña inicial del administrador (12–128 caracteres)' -MaskInput
dotnet run --project src/MediLink.Api
```

API: `http://localhost:5080`. OpenAPI: `http://localhost:5080/openapi/v1.json` (solo Development). Comprobaciones: `/health/live` y `/health/ready`.

En el primer arranque se aplican las migraciones, se crea una institución vacía y una sucursal principal con el usuario `admin`. La contraseña se toma de la variable anterior: no hay una contraseña predeterminada. En arranques posteriores no se recrean cuentas ni se sobrescriben datos. Configura la institución desde la API.

En Development se genera una clave JWT temporal si falta `Jwt:SigningKey`; los tokens dejan de ser válidos al reiniciar. Para conservarla entre arranques, define una clave aleatoria privada:

```powershell
$env:Jwt__SigningKey = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

También puedes usar `dotnet user-secrets` o `src/MediLink.Api/appsettings.Local.json`, excluido de Git. Las variables de entorno tienen prioridad sobre ese archivo. El proyecto incluye [requests.http](requests.http) para probar el flujo.

## Contratos y permisos

Prefijo: `/api/v1`. JSON en `camelCase`, identificadores string generados por el servidor, importes decimales, fechas de nacimiento `YYYY-MM-DD` y marcas de tiempo ISO 8601 UTC. `fechaEntrega` acepta ISO 8601 con zona u offset y se convierte a UTC.

Todas las rutas de negocio requieren `Authorization: Bearer <accessToken>`, excepto login, salud y consulta de resultados mediante token.

| Operación | Ruta | Permisos |
|---|---|---|
| Acceso | `POST /auth/login` | Pública; `{usuario, contrasena, tipo: "lab" o "medico"}` |
| Sesión / salir | `GET /auth/me`, `POST /auth/logout` | Autenticado |
| Pacientes | `GET, POST /pacientes`; `GET, PUT /pacientes/{id}` | Laboratorio / admin |
| Estudios | `GET, POST /estudios`; `GET, PUT /estudios/{id}` | Laboratorio / admin |
| Médicos | `GET /medicos`, `GET /medicos/{id}` | Laboratorio / admin |
| Cuentas médicas | `POST /medicos`, `PUT /medicos/{id}` | Admin |
| Usuarios del laboratorio | `GET, POST /usuarios`; `GET, PUT /usuarios/{id}` | Admin |
| Sucursales | `GET /sucursales`, `GET /sucursales/{id}` | Admin: todas; lab: asignadas |
| Gestionar sucursales | `POST /sucursales`, `PUT /sucursales/{id}` | Admin |
| Institución | `GET /institucion`, `PUT /institucion` | Lectura lab/admin; escritura admin |
| Órdenes | `GET /ordenes`, `GET /ordenes/{id}` | Lab/admin: sucursales asignadas; médico: solicitadas por él |
| Crear orden | `POST /ordenes` | Lab/admin, sucursal asignada |
| Cerrar / reabrir | `POST /ordenes/{id}/cerrar`, `POST /ordenes/{id}/reabrir` | Lab/admin, sucursal asignada |
| Eliminar orden | `DELETE /ordenes/{id}` | Admin, sucursal asignada |
| Subir archivo | `POST /ordenes/{id}/estudios/{estudioId}/adjuntos` | Lab/admin; multipart, campo `archivo` |
| Quitar archivo | `DELETE /ordenes/{id}/estudios/{estudioId}/adjuntos/{adjuntoId}` | Lab/admin; orden abierta |
| Descargar | `GET /ordenes/{id}/estudios/{estudioId}/adjuntos/{adjuntoId}/contenido` | Quien puede consultar la orden; debe estar cerrada |
| Panel y actividad | `GET /panel?sucursalId=...`, `GET /actividad?sucursalId=...` | Lab/admin, sucursal asignada |
| Generar enlace | `POST /enlaces` | Lab/admin; `{pacienteId, sucursalId, ordenId?}` |
| Revocar enlace | `DELETE /enlaces/{id}` | Lab/admin, sucursal asignada |
| Resultados del paciente | `GET /resultados/{token}` | Token vigente |
| Archivo del paciente | `GET /resultados/{token}/archivos/{adjuntoId}` | Token vigente, archivo dentro de su alcance |
| Contacto público | `GET /resultados/contacto` | Pública; nombre, correo y teléfono de la institución |

Catálogos, sucursales, usuarios y órdenes utilizan `?page=1&pageSize=25&q=texto` (máximo 100 elementos por página). Respuesta:

```json
{ "items": [], "pageNumber": 1, "pageSize": 25, "total": 0 }
```

En órdenes de laboratorio se exige `sucursalId`. El médico puede listar sin sucursal. Filtros adicionales: `estado=abierta|cerrada`, `desde` y `hasta` (fecha de registro). `q` busca por folio exacto o nombre de paciente. Cada orden incluye el paciente y el detalle de sus estudios, para que el médico pueda mostrarla sin acceder a catálogos globales. La actividad devuelve las últimas 30 entradas de la sucursal; el panel usa `Institution:TimeZone` (predeterminado `America/Hermosillo`).

Los DTO de entrada están en `src/MediLink.Api/Contracts/Requests.cs`. La creación de usuarios y médicos exige `contrasena` de 12–128 caracteres; en actualizaciones se omite para conservarla. `activo` permite desactivar el acceso médico o del laboratorio. Los usuarios recién creados deben asignarse mediante `usuarioIds` de una sucursal antes de iniciar sesión como laboratorio. Los catálogos de pacientes, médicos y estudios son compartidos por una única institución; las órdenes y enlaces se restringen por sucursal. Esta versión no es multiinstitución.

## Reglas del servidor

- Las órdenes tienen estados `abierta` y `cerrada`. Cada estudio necesita al menos un adjunto para cerrar. Para modificar archivos hay que reabrir.
- El total se calcula con precios del catálogo y se conserva el precio de cada estudio al registrar la orden. El cliente no envía folio, total ni estado. Los folios se asignan dentro de una transacción. Las operaciones concurrentes sobre una orden se protegen mediante una revisión de EF Core.
- Se aceptan PDF y DICOM Part 10 (`.dcm`, `.dicom`) de hasta **500 MiB por archivo**. Se comprueban extensión y firma de cabecera; DICOM requiere un estudio marcado `dicom`. Una petición sube un archivo; para varios se repite la ruta. La comprobación de cabecera no sustituye la validación clínica ni el análisis antimalware.
- Los archivos se guardan con claves aleatorias fuera de `wwwroot`. Las descargas aplican permisos y soportan solicitudes Range. Al quitar un adjunto o una orden se elimina primero el registro y después el archivo; si falla la limpieza física, queda registrada en los logs para mantenimiento.
- Los enlaces usan 32 bytes aleatorios, guardan SHA-256 y vencen según `vigenciaEnlaceDias` (1–30, predeterminado 7). El token se devuelve solo al crear el enlace. Sin `ordenId`, se incluyen los resultados cerrados actuales y futuros del paciente dentro de la sucursal indicada. Con `ordenId`, únicamente los de esa orden. Reabrir oculta inmediatamente esos resultados; cerrar los habilita de nuevo mientras el enlace siga vigente. Revocar lo invalida definitivamente.
- El portal público recibe nombre del paciente y resultados disponibles; las notas internas, fecha de nacimiento y precios quedan fuera de ese contrato.
- Se usan hashes de contraseña de ASP.NET Core Identity. Cinco intentos fallidos bloquean la cuenta durante 15 minutos. Login limita 10 peticiones/minuto por IP y resultados públicos 60/minuto por IP. Los límites viven en cada instancia.
- JWT vence a los 30 minutos; no hay refresh token. Cerrar sesión revoca todos los tokens de esa cuenta. Desactivar o editar una cuenta también invalida sus sesiones. Roles y asignaciones se comprueban en el servidor.
- Errores con `ProblemDetails`: 400 validación, 401 acceso inválido, 403 permisos, 404 recurso fuera del alcance o inexistente, 409 conflicto de estado/concurrencia/unicidad, 410 enlace vencido/revocado, 413 tamaño, 429 límite de peticiones. Ante un 409 de concurrencia, recarga los datos antes de reintentar.

## Conexión posterior a Neon / PostgreSQL

El proveedor Npgsql y las migraciones PostgreSQL ya están incluidos. Esta entrega no crea ni modifica una base de Neon.

Cuando tengamos la base, configura estas variables con sus valores reales en el entorno privado del servidor:

```text
Database__Provider=PostgreSql
ConnectionStrings__MediLink=Host=<host-de-neon>;Database=<base>;Username=<usuario>;Password=<secreto>;SSL Mode=VerifyFull
Jwt__SigningKey=<clave-aleatoria-privada-de-al-menos-32-bytes>
Bootstrap__Enabled=true
Bootstrap__Password=<contraseña-inicial-privada>
```

Utiliza una conexión directa con permisos de esquema para el paso de migración. Para generar un script revisable, desde `back/`:

```powershell
dotnet tool restore
dotnet ef migrations script --idempotent --context PostgresDbContext --project src/MediLink.Api --output postgres.sql
```

Para aplicar migraciones e inicializar los datos una sola vez, con las variables anteriores:

```powershell
dotnet run --project src/MediLink.Api --no-launch-profile -- --migrate
```

Luego desactiva `Bootstrap__Enabled`. En Production las migraciones automáticas están desactivadas; deben ejecutarse en el paso de despliegue. Cambiar de proveedor crea un esquema independiente: no copia los datos SQLite a PostgreSQL. Las migraciones de ambos proveedores están separadas y deben mantenerse en paralelo al cambiar el modelo:

```powershell
dotnet ef migrations add NombreSqlite --context SqliteDbContext --project src/MediLink.Api --output-dir Data/Migrations/Sqlite
dotnet ef migrations add NombrePostgres --context PostgresDbContext --project src/MediLink.Api --output-dir Data/Migrations/Postgres
```

## Pruebas y compilación

```powershell
dotnet test MediLink.slnx
dotnet build MediLink.slnx --configuration Release
```

Las pruebas HTTP arrancan la aplicación real, aplican migraciones SQLite en directorios temporales aislados y verifican autenticación, administración, validación, ciclo de órdenes, PDF/DICOM, sucursales, acceso médico, vencimiento/revocación de enlaces y concurrencia. No requieren credenciales externas. La conexión a una instancia de Neon corresponde al siguiente paso de integración.

GitHub Actions compila, ejecuta la misma suite contra SQLite y un PostgreSQL 17 temporal, y comprueba que ambos modelos no tengan cambios sin migración. Para ejecutar la suite PostgreSQL fuera de CI, establece `MEDILINK_TEST_POSTGRES` con la conexión de una base exclusivamente de pruebas y permisos para crear esquemas: cada prueba crea y elimina su propio esquema aleatorio `medilink_test_*`.

## Integración del frontend y despliegue

El frontend mantiene sus datos simulados. Para conectarlo hay que sustituir `MockApiService`, autenticar con `/auth/login`, agregar el bearer a las peticiones, consumir `items` de cada página y usar los endpoints de descarga. El token del enlace de paciente se abre en el frontend mediante `/r/{token}`; desde ahí se consulta `/api/v1/resultados/{token}`. CORS permite `http://localhost:4200`; configura `Cors__Origins__0` con el origen final.

La API registra las preferencias de entrega. Quedan para integración posterior el envío por SMTP/WhatsApp, el visor DICOM real y la sincronización sin conexión. El backend entrega el archivo DICOM original.

En el servidor, configura `AllowedHosts`, HTTPS, la clave JWT y un volumen persistente privado para `Storage:Path`. Ajusta los límites de proxy/IIS y el espacio temporal para cargas de 500 MiB. La base PostgreSQL guarda metadatos; los binarios requieren su propio almacenamiento. Protege los logs de acceso para no registrar tokens de enlaces. La copia de seguridad debe incluir tanto la base como los archivos. Para varias instancias se necesitará almacenamiento compartido y límites distribuidos.

Referencias: [ASP.NET Core 10](https://learn.microsoft.com/en-us/aspnet/core/overview?view=aspnetcore-10.0), [autenticación JWT](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/configure-jwt-bearer-authentication?view=aspnetcore-10.0), [Npgsql EF Core 10](https://www.npgsql.org/efcore/release-notes/10.0.html).
