# MediLink

Plataforma para laboratorios clínicos: pacientes, órdenes, resultados PDF/DICOM y consulta por médicos o enlaces de paciente.

| Componente | Directorio | Tecnología |
|---|---|---|
| Frontend | [front](front/README.md) | Angular |
| API | [back](back/README.md) | ASP.NET Core 10, Entity Framework Core 10 |

La API incluye persistencia local SQLite y un proveedor PostgreSQL con migraciones para la futura conexión a Neon. El frontend todavía utiliza `MockApiService`; la guía de la API documenta los contratos para integrarlo.
