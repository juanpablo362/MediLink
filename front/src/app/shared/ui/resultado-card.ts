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
  host: { class: 'block min-w-0' },
  templateUrl: './resultado-card.html',
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
