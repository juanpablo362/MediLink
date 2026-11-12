# MediLink · Frontend

MediLink es una plataforma web para laboratorios clínicos y centros de diagnóstico. Centraliza pacientes, órdenes de estudio y resultados en PDF o DICOM, y permite compartirlos con médicos y pacientes mediante enlaces seguros.

Este directorio contiene solo el frontend. Por ahora no hay backend: los datos son ficticios, viven en memoria y vuelven a su estado inicial cada vez que se recarga la página.

## Portales

| Portal | Ruta | Para quién |
|---|---|---|
| Laboratorio | `/lab` | Personal del laboratorio: registra órdenes, sube resultados y los comparte |
| Médico | `/medico` | Médicos que consultan los estudios de sus pacientes |
| Paciente | `/r/:token` | Pacientes que abren el enlace que les envió el laboratorio, sin crear cuenta |

### Laboratorio

- **Panel:** órdenes en proceso, atrasadas, por entregar hoy y listas en la semana, más la actividad reciente.
- **Órdenes:** lista filtrable por estado, asistente de nueva orden en cuatro pasos (paciente, médico, estudios y entrega) y detalle de cada orden. En el detalle se suben los resultados, se marca la orden como lista, se reabre o se comparte.
- **Catálogos:** pacientes, médicos y estudios.
- **Administración** (solo administradores): usuarios, sucursales y datos de la institución.

### Médico

Lista de las órdenes que solicitó, con búsqueda, filtro por fechas y por estado. Desde ahí descarga los resultados o abre el visor de imágenes.

### Paciente

Página pública con los resultados de una persona. Si el enlace venció o no existe, muestra cómo contactar al laboratorio.

## Reglas de negocio

- Una orden está **En proceso** o **Lista**.
- Para marcarla como lista, cada estudio necesita al menos un archivo. Se puede reabrir.
- Los resultados solo se descargan o se ven en el visor cuando la orden está lista.
- Formas de entrega: impreso, correo y WhatsApp.
- El enlace del paciente vence a los 7 días (se configura en Administración → Configuración).
- Se aceptan archivos PDF y DICOM de hasta 500 MB.
- Un médico solo ve las órdenes donde él es el solicitante.

## Stack

- [Angular 22](https://angular.dev/) sin zone.js, con componentes standalone, señales y rutas perezosas.
- [PrimeNG 22](https://primeng.org/) con un tema propio basado en Aura.
- [Tailwind CSS 4](https://tailwindcss.com/) con tokens de diseño propios.
- [Vitest](https://vitest.dev/) para las pruebas unitarias.
- Fuentes Figtree y JetBrains Mono, instaladas con Fontsource.

## Requisitos

- Node.js 22.22.3 o posterior (también sirven 24.15 o posterior y 26 o posterior).
- npm 11.

## Puesta en marcha

```bash
npm install
npm start
```

Abre `http://localhost:4200/`. La aplicación se recarga sola al guardar cambios.

### Licencia de PrimeNG

PrimeNG 22 requiere una licencia de PrimeUI. Sin ella, la aplicación funciona pero muestra el aviso "Invalid PrimeUI License". Hay una licencia Community gratuita para estudiantes y proyectos sin fines de lucro. Pon la clave en `src/environments/environment.ts`:

```ts
export const environment = {
  primeNgLicense: 'TU-CLAVE',
  mockLatencyMs: 350,
};
```

## Cuentas de prueba

Cualquier contraseña es válida.

| Perfil | Usuario | Notas |
|---|---|---|
| Laboratorio | `mochoa` | Administradora con dos sucursales: elige sucursal al entrar |
| Laboratorio | `trivera` | Personal de una sola sucursal |
| Médico | `emarquez`, `rsaldana` | Elige "Médico" en la pantalla de acceso |

Enlaces de paciente:

- `http://localhost:4200/r/demo-andrea`: resultados disponibles.
- `http://localhost:4200/r/demo-roberto`: otro paciente con resultados.
- `http://localhost:4200/r/demo-vencido`: enlace vencido.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo en el puerto 4200 |
| `npm run build` | Compilación de producción en `dist/medilink-web` |
| `npm run watch` | Compilación de desarrollo que se repite al guardar |
| `npm test` | Pruebas unitarias con Vitest |

## Estructura

```text
src/
├── app/
│   ├── core/          # Modelos, API simulada, sesión, guards, tema, utilidades
│   │   ├── api/       # MockApiService y la vista combinada de órdenes
│   │   ├── auth/      # Sesión por rol y guards de ruta
│   │   ├── data/      # Datos ficticios iniciales
│   │   ├── i18n/      # Traducción de PrimeNG al español
│   │   ├── models/    # Tipos del dominio
│   │   ├── theme/     # Preset de PrimeNG
│   │   └── util/      # Formatos es-MX, búsqueda sin acentos, descargas
│   ├── features/
│   │   ├── auth/      # Acceso y sesión cerrada
│   │   ├── lab/       # Panel, órdenes, catálogos y administración
│   │   ├── medico/    # Portal del médico
│   │   ├── paciente/  # Página pública de resultados
│   │   └── visor/     # Visor DICOM simulado
│   ├── layout/        # Estructura del portal del laboratorio y del médico
│   └── shared/ui/     # Componentes reutilizables
├── environments/      # Configuración (licencia de PrimeNG, latencia simulada)
└── styles/            # Tokens de diseño
```

## Accesibilidad

La interfaz sigue WCAG 2.2 AA:

- Contraste suficiente y foco siempre visible.
- Los estados llevan icono y texto, no solo color.
- Todos los campos tienen etiqueta y los errores se anuncian a lectores de pantalla.
- Hay un botón para saltar al contenido.
- Todo se puede usar con teclado.
- Se respeta la preferencia de reducir movimiento.

Todas las pantallas están pensadas primero para celular.

## Convenciones para colaborar

Antes de dar un cambio por terminado:

1. `npm run build` sin errores.
2. `npm test` en verde.
3. Revisa la pantalla a 360 px y a 1280 px, y navégala con teclado.

## Pendiente

- Backend real y autenticación.
- Módulo PWA para registrar órdenes sin conexión y sincronizarlas después.
- Visor DICOM real (el actual dibuja cortes de ejemplo).
