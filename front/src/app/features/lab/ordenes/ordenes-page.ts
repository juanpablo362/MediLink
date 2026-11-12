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
  template: `
    <ml-page-header title="Órdenes" subtitle="Registra órdenes, adjunta resultados y compártelos con pacientes y médicos.">
      <a routerLink="/lab/ordenes/nueva" class="btn-accent hidden md:inline-flex">
        <i class="pi pi-plus" aria-hidden="true"></i>Nueva orden
      </a>
    </ml-page-header>

    <div class="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <p-selectbutton
        [options]="opciones()"
        optionLabel="label"
        optionValue="value"
        [allowEmpty]="false"
        [ngModel]="filtro()"
        (ngModelChange)="filtro.set($event)"
        ariaLabelledBy="filtro-estado"
      />
      <span id="filtro-estado" class="sr-only">Filtrar por estado</span>
      <ml-search-field
        class="w-full lg:max-w-sm"
        placeholder="Folio, paciente, médico o estudio"
        label="Buscar órdenes"
        [(value)]="consulta"
      />
    </div>

    <p class="sr-only" aria-live="polite">{{ filtradas().length }} órdenes encontradas</p>

    <!-- Escritorio -->
    <div class="surface-card mt-4 hidden overflow-hidden md:block">
      <p-table
        [value]="filtradas()"
        [paginator]="filtradas().length > 10"
        [rows]="10"
        [rowsPerPageOptions]="[10, 25, 50]"
        sortField="folio"
        [sortOrder]="-1"
        dataKey="id"
        [tableStyle]="{ 'min-width': '52rem' }"
      >
        <ng-template #header>
          <tr>
            <th pSortableColumn="folio" class="w-32">Folio <p-sorticon field="folio" /></th>
            <th>Paciente</th>
            <th>Estudios</th>
            <th pSortableColumn="fechaEntrega">Entrega <p-sorticon field="fechaEntrega" /></th>
            <th>Estado</th>
            <th class="w-16"><span class="sr-only">Acciones</span></th>
          </tr>
        </ng-template>
        <ng-template #body let-o>
          <tr>
            <td><span class="folio text-bone-600">{{ fmtFolio(o.folio) }}</span></td>
            <td>
              <span class="block font-medium text-ink-950">{{ nombre(o.paciente) }}</span>
              <span class="block text-xs text-bone-500">{{ o.medicoNombre }}</span>
            </td>
            <td>
              <span class="block max-w-64 truncate text-sm">{{ resumenEstudios(o) }}</span>
              <span class="mt-0.5 flex items-center gap-2 text-xs text-bone-500">
                {{ o.resultadosCargados }}/{{ o.estudiosDetalle.length }} con resultado
                @if (o.tieneDicom) {
                  <span class="rounded bg-ink-50 px-1.5 py-px font-semibold text-ink-700">DICOM</span>
                }
              </span>
            </td>
            <td class="whitespace-nowrap text-sm">{{ o.fechaEntrega | date: 'dd/MM/yyyy' }}</td>
            <td><ml-status-badge [estado]="o.estado" [vencida]="o.vencida" /></td>
            <td class="text-right">
              <a
                [routerLink]="[o.id]"
                class="inline-grid size-9 place-items-center rounded-lg text-bone-600 transition hover:bg-ink-50 hover:text-ink-900"
                [attr.aria-label]="'Abrir orden ' + fmtFolio(o.folio)"
              >
                <i class="pi pi-angle-right" aria-hidden="true"></i>
              </a>
            </td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr>
            <td colspan="6">
              <ml-empty-state icon="pi pi-search" title="Sin órdenes" description="Prueba con otro filtro o término de búsqueda." />
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>

    <!-- Celular -->
    <ul class="mt-4 grid gap-3 md:hidden" role="list">
      @for (o of visiblesMovil(); track o.id) {
        <li>
          <a [routerLink]="[o.id]" class="surface-card block p-4 active:bg-bone-50">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="folio text-bone-500">{{ fmtFolio(o.folio) }}</p>
                <p class="mt-0.5 truncate font-semibold text-ink-950">{{ nombre(o.paciente) }}</p>
              </div>
              <ml-status-badge [estado]="o.estado" [vencida]="o.vencida" />
            </div>
            <p class="mt-2 line-clamp-2 text-sm text-bone-700">{{ resumenEstudios(o) }}</p>
            <div class="mt-3 flex items-center justify-between text-xs text-bone-500">
              <span><i class="pi pi-calendar mr-1" aria-hidden="true"></i>Entrega {{ o.fechaEntrega | date: 'dd/MM/yyyy' }}</span>
              <span>{{ o.resultadosCargados }}/{{ o.estudiosDetalle.length }} resultados</span>
            </div>
          </a>
        </li>
      } @empty {
        <li class="surface-card">
          <ml-empty-state icon="pi pi-search" title="Sin órdenes" description="Prueba con otro filtro o término de búsqueda." />
        </li>
      }
    </ul>
    @if (filtradas().length > visiblesMovil().length) {
      <button
        type="button"
        class="mt-4 w-full rounded-field border border-bone-300 bg-bone-0 py-3 text-sm font-semibold text-ink-800 md:hidden"
        (click)="limiteMovil.set(limiteMovil() + 10)"
      >
        Mostrar más ({{ filtradas().length - visiblesMovil().length }} restantes)
      </button>
    }
  `,
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
