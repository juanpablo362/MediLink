import { Routes } from '@angular/router';

import { requireAdmin, requireLab, requireMedico } from '@core/auth/guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'acceso' },
  {
    path: 'acceso',
    title: 'Acceso · MediLink',
    loadComponent: () => import('./features/auth/acceso-page'),
  },
  {
    path: 'sesion-cerrada',
    title: 'Sesión cerrada · MediLink',
    loadComponent: () => import('./features/auth/sesion-cerrada-page'),
  },
  {
    path: 'lab',
    canMatch: [requireLab],
    loadComponent: () => import('./layout/lab-shell'),
    children: [
      { path: '', title: 'Panel · MediLink', loadComponent: () => import('./features/lab/panel/panel-page') },
      {
        path: 'ordenes',
        title: 'Órdenes · MediLink',
        loadComponent: () => import('./features/lab/ordenes/ordenes-page'),
      },
      {
        path: 'ordenes/nueva',
        title: 'Nueva orden · MediLink',
        loadComponent: () => import('./features/lab/ordenes/nueva-orden-page'),
      },
      {
        path: 'ordenes/:id',
        title: 'Detalle de orden · MediLink',
        loadComponent: () => import('./features/lab/ordenes/orden-detalle-page'),
      },
      {
        path: 'visor/:ordenId/:estudioId',
        title: 'Visor de imágenes · MediLink',
        loadComponent: () => import('./features/visor/visor-page'),
      },
      {
        path: 'pacientes',
        title: 'Pacientes · MediLink',
        loadComponent: () => import('./features/lab/catalogos/pacientes-page'),
      },
      {
        path: 'medicos',
        title: 'Médicos · MediLink',
        loadComponent: () => import('./features/lab/catalogos/medicos-page'),
      },
      {
        path: 'estudios',
        title: 'Estudios · MediLink',
        loadComponent: () => import('./features/lab/catalogos/estudios-page'),
      },
      {
        path: '',
        canMatch: [requireAdmin],
        children: [
          {
            path: 'usuarios',
            title: 'Usuarios · MediLink',
            loadComponent: () => import('./features/lab/admin/usuarios-page'),
          },
          {
            path: 'sucursales',
            title: 'Sucursales · MediLink',
            loadComponent: () => import('./features/lab/admin/sucursales-page'),
          },
          {
            path: 'configuracion',
            title: 'Configuración · MediLink',
            loadComponent: () => import('./features/lab/admin/configuracion-page'),
          },
        ],
      },
    ],
  },
  {
    path: 'medico',
    canMatch: [requireMedico],
    loadComponent: () => import('./layout/medico-shell'),
    children: [
      {
        path: '',
        title: 'Mis pacientes · MediLink',
        loadComponent: () => import('./features/medico/medico-estudios-page'),
      },
      {
        path: 'visor/:ordenId/:estudioId',
        title: 'Visor de imágenes · MediLink',
        loadComponent: () => import('./features/visor/visor-page'),
      },
    ],
  },
  {
    path: 'r/:token',
    title: 'Mis resultados · MediLink',
    loadComponent: () => import('./features/paciente/paciente-resultados-page'),
  },
  {
    path: 'r/:token/visor/:ordenId/:estudioId',
    title: 'Visor de imágenes · MediLink',
    loadComponent: () => import('./features/visor/visor-page'),
  },
  {
    path: '**',
    title: 'Página no encontrada · MediLink',
    loadComponent: () => import('./features/not-found-page'),
  },
];
