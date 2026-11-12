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
  template: `
    <ml-page-header
      eyebrow="Portal médico"
      title="Estudios de mis pacientes"
      subtitle="Consulta y descarga los resultados de las órdenes que solicitaste."
    />

    <section class="surface-card mt-6 grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_auto_auto] lg:items-end" aria-label="Filtros">
      <div>
        <span class="field-label" id="buscar-label">Buscar</span>
        <ml-search-field placeholder="Paciente, folio o estudio" label="Buscar por paciente, folio o estudio" [(value)]="consulta" />
      </div>
      <div>
        <label class="field-label" for="rango">Fecha de registro</label>
        <p-datepicker
          inputId="rango"
          selectionMode="range"
          [ngModel]="rango()"
          (ngModelChange)="rango.set($event)"
          dateFormat="dd/mm/yy"
          placeholder="Desde – hasta"
          [showIcon]="true"
          iconDisplay="input"
          [showButtonBar]="true"
          [readonlyInput]="true"
          [maxDate]="hoy"
          class="w-full lg:w-64"
          inputStyleClass="w-full"
          appendTo="body"
        />
      </div>
      <div>
        <span class="field-label" id="estado-label">Estado</span>
        <p-selectbutton
          [options]="estados"
          optionLabel="label"
          optionValue="value"
          [allowEmpty]="false"
          [ngModel]="estado()"
          (ngModelChange)="estado.set($event)"
          ariaLabelledBy="estado-label"
        />
      </div>
    </section>

    <div class="mt-6 flex items-center justify-between">
      <p class="text-sm text-bone-600" aria-live="polite">
        {{ filtradas().length }} {{ filtradas().length === 1 ? 'orden' : 'órdenes' }}
      </p>
      @if (hayFiltros()) {
        <p-button label="Limpiar filtros" icon="pi pi-filter-slash" [text]="true" size="small" severity="secondary" (onClick)="limpiar()" />
      }
    </div>

    <ul class="mt-3 grid gap-4 lg:grid-cols-2" role="list">
      @for (o of filtradas(); track o.id) {
        <li>
          <ml-resultado-card
            [orden]="o"
            [titulo]="nombre(o.paciente)"
            [subtitulo]="o.paciente ? edadDe(o.paciente.fechaNacimiento) + ' años' : ''"
            [visorBase]="['/medico', 'visor']"
          />
        </li>
      } @empty {
        <li class="surface-card lg:col-span-2">
          <ml-empty-state icon="pi pi-search" title="Sin resultados" description="No hay órdenes con estos filtros." />
        </li>
      }
    </ul>
  `,
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
