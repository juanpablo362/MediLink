import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MockApiService } from '@core/api/mock-api.service';
import { OrdenesVistaService } from '@core/api/ordenes-vista.service';
import { SessionService } from '@core/auth/session.service';
import { ActividadTipo } from '@core/models';
import { folio, mismoDia, nombreCompleto } from '@core/util/format';
import { EmptyState } from '@shared/ui/empty-state';
import { StatCard } from '@shared/ui/stat-card';
import { StatusBadge } from '@shared/ui/status-badge';
import { injectOrdenesSucursal } from '../ordenes/ordenes-sucursal';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, StatCard, StatusBadge, EmptyState],
  templateUrl: './panel-page.html',
})
export default class PanelPage {
  protected readonly session = inject(SessionService);
  protected readonly vista = inject(OrdenesVistaService);
  private readonly api = inject(MockApiService);
  private readonly ordenes = injectOrdenesSucursal();

  protected readonly hoy = new Date();
  protected readonly fmtFolio = folio;
  protected readonly nombre = nombreCompleto;

  protected readonly saludo = computed(() => {
    const h = this.hoy.getHours();
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  });
  protected readonly primerNombre = computed(() => this.session.lab()?.nombre.split(' ')[0] ?? '');

  protected readonly abiertas = computed(() => this.ordenes().filter((o) => o.estado === 'abierta'));
  protected readonly atrasadas = computed(() => this.abiertas().filter((o) => o.vencida));
  protected readonly entreganHoy = computed(() =>
    this.abiertas().filter((o) => !o.vencida && mismoDia(new Date(o.fechaEntrega), this.hoy)),
  );
  protected readonly cerradasSemana = computed(() => {
    const hace7 = Date.now() - 7 * 864e5;
    return this.ordenes().filter((o) => o.fechaCierre && new Date(o.fechaCierre).getTime() >= hace7);
  });
  protected readonly prioridad = computed(() => [...this.atrasadas(), ...this.entreganHoy()].slice(0, 6));

  protected readonly actividad = computed(() => {
    const ids = new Set(this.ordenes().map((o) => o.id));
    return this.api
      .actividad()
      .filter((a) => ids.has(a.ordenId))
      .slice(0, 6);
  });

  protected readonly iconoActividad: Record<ActividadTipo, string> = {
    'orden-creada': 'pi pi-file-plus',
    'orden-cerrada': 'pi pi-check',
    'orden-reabierta': 'pi pi-replay',
    'resultado-adjunto': 'pi pi-paperclip',
    'enlace-compartido': 'pi pi-link',
  };

  protected readonly tonoActividad: Record<ActividadTipo, string> = {
    'orden-creada': 'bg-ink-50 text-ink-700',
    'orden-cerrada': 'bg-ok-50 text-ok-700',
    'orden-reabierta': 'bg-wait-50 text-wait-700',
    'resultado-adjunto': 'bg-bone-100 text-bone-700',
    'enlace-compartido': 'bg-coral-50 text-coral-700',
  };
}
