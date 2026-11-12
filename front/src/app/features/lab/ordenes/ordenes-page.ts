import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';

import { EstadoOrden } from '@core/models';
import { coincide, folio, nombreCompleto } from '@core/util/format';
import { EmptyState } from '@shared/ui/empty-state';
import { PageHeader } from '@shared/ui/page-header';
import { SearchField } from '@shared/ui/search-field';
import { StatusBadge } from '@shared/ui/status-badge';
import { injectOrdenesSucursal } from './ordenes-sucursal';

type Filtro = 'todas' | EstadoOrden;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, FormsModule, TableModule, SelectButtonModule, PageHeader, SearchField, StatusBadge, EmptyState],
  templateUrl: './ordenes-page.html',
})
export default class OrdenesPage {
  /** Query param ?estado=abierta|cerrada */
  readonly estado = input<string>();

  private readonly ordenes = injectOrdenesSucursal();

  protected readonly filtro = signal<Filtro>('todas');
  protected readonly consulta = signal('');
  protected readonly limiteMovil = signal(10);
  protected readonly fmtFolio = folio;
  protected readonly nombre = nombreCompleto;

  protected readonly opciones = computed(() => {
    const os = this.ordenes();
    const abiertas = os.filter((o) => o.estado === 'abierta').length;
    return [
      { label: `Todas · ${os.length}`, value: 'todas' },
      { label: `En proceso · ${abiertas}`, value: 'abierta' },
      { label: `Listas · ${os.length - abiertas}`, value: 'cerrada' },
    ];
  });

  protected readonly filtradas = computed(() => {
    const f = this.filtro();
    const q = this.consulta();
    return this.ordenes().filter(
      (o) =>
        (f === 'todas' || o.estado === f) &&
        coincide(
          q,
          folio(o.folio),
          o.folio,
          nombreCompleto(o.paciente),
          o.medicoNombre,
          ...o.estudiosDetalle.map((e) => e.nombre),
        ),
    );
  });

  protected readonly visiblesMovil = computed(() => this.filtradas().slice(0, this.limiteMovil()));

  constructor() {
    effect(() => {
      const e = this.estado();
      if (e === 'abierta' || e === 'cerrada') this.filtro.set(e);
    });
  }

  protected resumenEstudios(o: { estudiosDetalle: { nombre: string }[] }): string {
    return o.estudiosDetalle.map((e) => e.nombre).join(', ');
  }
}
