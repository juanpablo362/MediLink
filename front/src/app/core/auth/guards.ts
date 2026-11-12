import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';

import { SessionService } from './session.service';

export const requireLab: CanMatchFn = () => {
  const session = inject(SessionService);
  return session.lab() ? true : inject(Router).createUrlTree(['/acceso']);
};

export const requireAdmin: CanMatchFn = () => {
  const session = inject(SessionService);
  return session.esAdmin() ? true : inject(Router).createUrlTree(['/lab']);
};

export const requireMedico: CanMatchFn = () => {
  const session = inject(SessionService);
  return session.medico() ? true : inject(Router).createUrlTree(['/acceso'], { queryParams: { perfil: 'medico' } });
};
