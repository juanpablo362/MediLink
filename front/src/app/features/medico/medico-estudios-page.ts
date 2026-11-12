import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectButtonModule } from 'primeng/selectbutton';

import { OrdenesVistaService } from '@core/api/ordenes-vista.service';
import { SessionService } from '@core/auth/session.service';
import { EstadoOrden } from '@core/models';
import { coincide, edad, folio, nombreCompleto } from '@core/util/format';
import { EmptyState } from '@shared/ui/empty-state';
import { PageHeader } from '@shared/ui/page-header';
import { ResultadoCard } from '@shared/ui/resultado-card';
import { SearchField } from '@shared/ui/search-field';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonModule, DatePickerModule, SelectButtonModule, PageHeader, SearchField, ResultadoCard, EmptyState],
  templateUrl: './medico-estudios-page.html',
})
export default class MedicoEstudiosPage {
  private readonly vista = inject(OrdenesVistaService);
  private readonly session = inject(SessionService);

  protected readonly hoy = new Date();
  protected readonly nombre = nombreCompleto;
  protected readonly edadDe = edad;
  protected readonly estados: { label: string; value: 'todas' | EstadoOrden }[] = [
    { label: 'Todas', value: 'todas' },
    { label: 'Listas', value: 'cerrada' },
    { label: 'En proceso', value: 'abierta' },
  ];

  protected readonly consulta = signal('');
  protected readonly rango = signal<(Date | null)[] | null>(null);
  protected readonly estado = signal<'todas' | EstadoOrden>('todas');
  protected readonly filtrosAbiertos = signal(false);

  private readonly propias = computed(() => {
    const id = this.session.medico()?.medicoId;
    return this.vista.todas().filter((o) => o.medicoId === id);
  });

  protected readonly filtradas = computed(() => {
    const [desde, hasta] = this.rango() ?? [];
    const fin = hasta ?? desde;
    return this.propias().filter((o) => {
      const f = new Date(o.fechaRegistro);
      if (desde && f < inicioDia(desde)) return false;
      if (fin && f > finDia(fin)) return false;
      if (this.estado() !== 'todas' && o.estado !== this.estado()) return false;
      return coincide(this.consulta(), nombreCompleto(o.paciente), folio(o.folio), ...o.estudiosDetalle.map((e) => e.nombre));
    });
  });

  protected readonly hayFiltros = computed(() => !!this.consulta() || !!this.rango()?.[0] || this.estado() !== 'todas');
  protected readonly filtrosExtra = computed(() => {
    let n = 0;
    if (this.rango()?.[0]) n++;
    if (this.estado() !== 'todas') n++;
    return n;
  });

  protected limpiar(): void {
    this.consulta.set('');
    this.rango.set(null);
    this.estado.set('todas');
  }
}

function inicioDia(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function finDia(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
