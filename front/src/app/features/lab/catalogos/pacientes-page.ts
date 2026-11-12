import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';

import { MockApiService } from '@core/api/mock-api.service';
import { Paciente } from '@core/models';
import { coincide, edad, nombreCompleto } from '@core/util/format';
import { EmptyState } from '@shared/ui/empty-state';
import { PageHeader } from '@shared/ui/page-header';
import { SearchField } from '@shared/ui/search-field';
import { ShareLinkDialog } from '@shared/ui/share-link-dialog';
import { PacienteFormDialog } from './paciente-form-dialog';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, TableModule, ButtonModule, PageHeader, SearchField, EmptyState, PacienteFormDialog, ShareLinkDialog],
  template: `
    <ml-page-header title="Pacientes" subtitle="Expedientes de las personas atendidas en el laboratorio.">
      <p-button label="Nuevo paciente" icon="pi pi-user-plus" (onClick)="abrir(null)" />
    </ml-page-header>

    <ml-search-field class="mt-6 max-w-md" placeholder="Nombre, teléfono o correo" label="Buscar pacientes" [(value)]="consulta" />
    <p class="sr-only" aria-live="polite">{{ filtrados().length }} pacientes encontrados</p>

    <div class="surface-card mt-4 hidden overflow-hidden md:block">
      <p-table [value]="filtrados()" [paginator]="filtrados().length > 10" [rows]="10" sortField="apellidos" [sortOrder]="1" dataKey="id">
        <ng-template #header>
          <tr>
            <th pSortableColumn="apellidos">Paciente <p-sorticon field="apellidos" /></th>
            <th>Edad</th>
            <th>Contacto</th>
            <th pSortableColumn="ordenes">Órdenes <p-sorticon field="ordenes" /></th>
            <th class="w-28"><span class="sr-only">Acciones</span></th>
          </tr>
        </ng-template>
        <ng-template #body let-p>
          <tr>
            <td>
              <span class="block font-medium text-ink-950">{{ p.nombre }} {{ p.apellidos }}</span>
              <span class="block text-xs text-bone-500">Nació el {{ p.fechaNacimiento + 'T12:00:00' | date: 'dd/MM/yyyy' }}</span>
            </td>
            <td class="tabular-nums">{{ p.edad }} años</td>
            <td>
              <span class="block text-sm">{{ p.telefono }}</span>
              <span class="block text-xs text-bone-500">{{ p.correo || 'Sin correo' }}</span>
            </td>
            <td class="tabular-nums">{{ p.ordenes }}</td>
            <td class="text-right">
              <p-button icon="pi pi-link" [text]="true" [rounded]="true" severity="secondary" [ariaLabel]="'Compartir enlace con ' + p.nombre" (onClick)="compartir(p)" />
              <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" severity="secondary" [ariaLabel]="'Editar ' + p.nombre" (onClick)="abrir(p)" />
            </td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr><td colspan="5"><ml-empty-state icon="pi pi-users" title="Sin pacientes" description="Ningún paciente coincide con la búsqueda." /></td></tr>
        </ng-template>
      </p-table>
    </div>

    <ul class="mt-4 grid gap-3 md:hidden" role="list">
      @for (p of filtrados(); track p.id) {
        <li class="surface-card flex items-center gap-3 p-4">
          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold text-ink-950">{{ p.nombre }} {{ p.apellidos }}</p>
            <p class="text-sm text-bone-500">{{ p.edad }} años · {{ p.telefono }}</p>
            <p class="text-xs text-bone-500">{{ p.ordenes }} {{ p.ordenes === 1 ? 'orden' : 'órdenes' }}</p>
          </div>
          <p-button icon="pi pi-link" [text]="true" [rounded]="true" severity="secondary" [ariaLabel]="'Compartir enlace con ' + p.nombre" (onClick)="compartir(p)" />
          <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" severity="secondary" [ariaLabel]="'Editar ' + p.nombre" (onClick)="abrir(p)" />
        </li>
      } @empty {
        <li class="surface-card"><ml-empty-state icon="pi pi-users" title="Sin pacientes" description="Ningún paciente coincide con la búsqueda." /></li>
      }
    </ul>

    <ml-paciente-form-dialog [(visible)]="dialogo" [paciente]="seleccionado()" />
    @if (compartirCon(); as pid) {
      <ml-share-link-dialog [(visible)]="dialogoCompartir" [pacienteId]="pid" />
    }
  `,
})
export default class PacientesPage {
  private readonly api = inject(MockApiService);

  protected readonly consulta = signal('');
  protected readonly dialogo = signal(false);
  protected readonly dialogoCompartir = signal(false);
  protected readonly seleccionado = signal<Paciente | null>(null);
  protected readonly compartirCon = signal<string | null>(null);

  private readonly conteo = computed(() => {
    const m = new Map<string, number>();
    for (const o of this.api.ordenes()) m.set(o.pacienteId, (m.get(o.pacienteId) ?? 0) + 1);
    return m;
  });

  protected readonly filtrados = computed(() =>
    this.api
      .pacientes()
      .filter((p) => coincide(this.consulta(), nombreCompleto(p), p.telefono, p.correo))
      .map((p) => ({ ...p, edad: edad(p.fechaNacimiento), ordenes: this.conteo().get(p.id) ?? 0 })),
  );

  protected abrir(p: Paciente | null): void {
    this.seleccionado.set(p);
    this.dialogo.set(true);
  }

  protected compartir(p: Paciente): void {
    this.compartirCon.set(null);
    queueMicrotask(() => {
      this.compartirCon.set(p.id);
      this.dialogoCompartir.set(true);
    });
  }
}
