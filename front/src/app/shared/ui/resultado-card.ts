import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';

import { OrdenVista } from '@core/api/ordenes-vista.service';
import { descargarResultado } from '@core/util/descarga';
import { folio } from '@core/util/format';
import { StatusBadge } from './status-badge';

/** Orden vista por médico o paciente: estudios, estado y acciones de consulta. */
@Component({
  selector: 'ml-resultado-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, ButtonModule, StatusBadge],
  host: { class: 'block' },
  template: `
    @let o = orden();
    <article class="surface-card overflow-hidden" [attr.aria-labelledby]="'orden-' + o.id">
      <header class="flex flex-wrap items-start justify-between gap-3 border-b border-bone-100 px-4 py-4 sm:px-5">
        <div class="min-w-0">
          <p class="folio text-bone-500">{{ fmtFolio(o.folio) }} · {{ o.fechaRegistro | date: 'dd/MM/yyyy' }}</p>
          <h3 [id]="'orden-' + o.id" class="mt-0.5 truncate text-base font-semibold">
            {{ titulo() }}
          </h3>
          @if (subtitulo()) {
            <p class="text-sm text-bone-500">{{ subtitulo() }}</p>
          }
        </div>
        <ml-status-badge [estado]="o.estado" />
      </header>
      <ul class="divide-y divide-bone-100" role="list">
        @for (e of o.estudiosDetalle; track e.id) {
          <li class="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
            <i class="pi text-lg" [class]="e.dicom ? 'pi-images text-ink-600' : 'pi-file-pdf text-coral-700'" aria-hidden="true"></i>
            <span class="min-w-0 flex-1 text-sm font-medium text-ink-950">{{ e.nombre }}</span>
            @if (o.estado === 'cerrada') {
              <div class="flex gap-1">
                @if (e.dicom) {
                  <a
                    [routerLink]="visorBase().concat([o.id, e.id])"
                    class="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
                    [attr.aria-label]="'Ver imágenes de ' + e.nombre"
                  >
                    <i class="pi pi-eye" aria-hidden="true"></i><span class="hidden sm:inline">Ver imágenes</span>
                  </a>
                }
                <p-button
                  icon="pi pi-download"
                  label="Descargar"
                  severity="secondary"
                  [outlined]="true"
                  size="small"
                  [ariaLabel]="'Descargar resultado de ' + e.nombre"
                  (onClick)="descargar(e.adjuntos[0]?.nombre ?? e.clave + '.pdf', e.nombre)"
                />
              </div>
            } @else {
              <span class="text-xs text-bone-500">Disponible a partir del {{ o.fechaEntrega | date: 'dd/MM/yyyy' }}</span>
            }
          </li>
        }
      </ul>
    </article>
  `,
})
export class ResultadoCard {
  private readonly toast = inject(MessageService);

  readonly orden = input.required<OrdenVista>();
  readonly titulo = input.required<string>();
  readonly subtitulo = input<string>();
  /** Prefijo de ruta del visor, p. ej. ['/medico', 'visor'] */
  readonly visorBase = input.required<string[]>();

  protected readonly fmtFolio = folio;

  protected descargar(archivo: string, estudio: string): void {
    const o = this.orden();
    if (descargarResultado(o.estado, archivo, `${estudio} - ${folio(o.folio)}`)) {
      this.toast.add({ severity: 'success', summary: 'Descarga iniciada', detail: estudio, life: 2500 });
    }
  }
}
