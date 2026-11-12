import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { EstadoOrden } from '@core/models';

/** Estado de orden: siempre icono + texto, nunca solo color. */
@Component({
  selector: 'ml-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset"
      [class]="clases()"
    >
      <i [class]="icono()" class="text-[0.7rem]" aria-hidden="true"></i>
      {{ texto() }}
    </span>
  `,
})
export class StatusBadge {
  readonly estado = input.required<EstadoOrden>();
  readonly vencida = input(false);

  protected readonly texto = computed(() =>
    this.estado() === 'cerrada' ? 'Lista' : this.vencida() ? 'En proceso · atrasada' : 'En proceso',
  );
  protected readonly icono = computed(() =>
    this.estado() === 'cerrada' ? 'pi pi-check-circle' : this.vencida() ? 'pi pi-exclamation-triangle' : 'pi pi-clock',
  );
  protected readonly clases = computed(() =>
    this.estado() === 'cerrada'
      ? 'bg-ok-50 text-ok-700 ring-ok-600/25'
      : this.vencida()
        ? 'bg-danger-50 text-danger-700 ring-danger-600/25'
        : 'bg-wait-50 text-wait-700 ring-wait-600/25',
  );
}
