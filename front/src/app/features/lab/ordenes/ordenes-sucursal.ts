import { computed, inject } from '@angular/core';

import { OrdenesVistaService } from '@core/api/ordenes-vista.service';
import { SessionService } from '@core/auth/session.service';

/** Órdenes de la sucursal activa. Llamar en contexto de inyección. */
export function injectOrdenesSucursal() {
  const vista = inject(OrdenesVistaService);
  const session = inject(SessionService);
  return computed(() => {
    const id = session.lab()?.sucursalId;
    return vista.todas().filter((o) => o.sucursalId === id);
  });
}
