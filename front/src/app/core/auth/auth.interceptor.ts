import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '@env/environment';
import { SessionService } from '@core/auth/session.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const router = inject(Router);

  const esApi = req.url.startsWith(environment.apiUrl);
  const esPublica = req.url.includes('/auth/login') || req.url.includes('/resultados/');
  const token = session.accessToken();

  const authReq =
    esApi && !esPublica && token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && esApi && !esPublica) {
        session.limpiarSesionLocal();
        void router.navigateByUrl('/acceso');
      }
      return throwError(() => err);
    }),
  );
};