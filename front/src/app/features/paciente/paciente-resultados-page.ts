import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';

import { MockApiService } from '@core/api/mock-api.service';
import { OrdenesVistaService } from '@core/api/ordenes-vista.service';
import { EnlaceSeguro } from '@core/models';
import { Logo } from '@shared/ui/logo';
import { ResultadoCard } from '@shared/ui/resultado-card';

type Estado = 'cargando' | 'ok' | 'vencido' | 'invalido';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, SkeletonModule, Logo, ResultadoCard],
  host: { class: 'block min-h-dvh' },
  templateUrl: './paciente-resultados-page.html',
})
export default class PacienteResultadosPage {
  readonly token = input.required<string>();

  protected readonly api = inject(MockApiService);
  private readonly vista = inject(OrdenesVistaService);

  protected readonly estado = signal<Estado>('cargando');
  protected readonly enlace = signal<EnlaceSeguro | null>(null);

  protected readonly paciente = computed(() => {
    const e = this.enlace();
    return e ? this.api.pacientesPorId().get(e.pacienteId) : undefined;
  });
  protected readonly ordenes = computed(() => {
    const id = this.enlace()?.pacienteId;
    return this.vista.todas().filter((o) => o.pacienteId === id);
  });
  protected readonly listas = computed(() => this.ordenes().filter((o) => o.estado === 'cerrada').length);

  constructor() {
    effect(() => {
      const token = this.token();
      this.estado.set('cargando');
      void this.api.resolverEnlace(token).then((r) => {
        this.enlace.set(r.enlace ?? null);
        this.estado.set(r.estado);
      });
    });
  }
}
