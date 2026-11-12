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
  template: `
    <header class="border-b border-bone-200 bg-bone-0">
      <div class="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
        <ml-logo />
        <span class="truncate text-sm font-medium text-bone-600">{{ api.institucion().nombre }}</span>
      </div>
    </header>

    <main id="contenido" tabindex="-1" class="mx-auto max-w-3xl px-4 py-8 outline-none sm:px-6 sm:py-10">
      @switch (estado()) {
        @case ('cargando') {
          <div aria-busy="true" aria-live="polite">
            <span class="sr-only">Cargando tus resultados…</span>
            <p-skeleton width="12rem" height="1rem" />
            <p-skeleton width="18rem" height="2rem" class="mt-3" />
            <p-skeleton height="9rem" class="mt-8" borderRadius="1rem" />
            <p-skeleton height="9rem" class="mt-4" borderRadius="1rem" />
          </div>
        }
        @case ('ok') {
          <div class="animate-rise">
            <p class="eyebrow">Resultados de laboratorio</p>
            <h1 class="mt-2 text-2xl font-semibold sm:text-3xl">Hola, {{ paciente()?.nombre }}</h1>
            <p class="mt-2 text-sm text-bone-600 sm:text-base">
              @if (listas() > 0) {
                Tienes {{ listas() }} {{ listas() === 1 ? 'orden lista' : 'órdenes listas' }} para descargar.
              } @else {
                Tus resultados aún se están procesando. Te avisaremos cuando estén listos.
              }
            </p>

            <div class="mt-5 flex items-start gap-3 rounded-xl bg-ink-50 p-4 text-sm text-ink-900">
              <i class="pi pi-shield mt-0.5 text-ink-700" aria-hidden="true"></i>
              <p>
                Este enlace es personal y vence el <strong>{{ enlace()?.expira | date: "dd/MM/yyyy 'a las' HH:mm" }}</strong>.
                No lo compartas con nadie que no deba ver tu información médica.
              </p>
            </div>

            <ul class="mt-8 grid gap-4" role="list">
              @for (o of ordenes(); track o.id) {
                <li>
                  <ml-resultado-card
                    [orden]="o"
                    [titulo]="'Orden del ' + (o.fechaRegistro | date: 'dd/MM/yyyy')"
                    [subtitulo]="'Solicitada por ' + o.medicoNombre"
                    [visorBase]="['/r', token(), 'visor']"
                  />
                </li>
              } @empty {
                <li class="surface-card p-6 text-center text-sm text-bone-600">Todavía no tienes órdenes registradas.</li>
              }
            </ul>
          </div>
        }
        @default {
          <div class="mx-auto max-w-md animate-rise py-10 text-center">
            <span class="mx-auto grid size-14 place-items-center rounded-2xl bg-wait-50 text-xl text-wait-700" aria-hidden="true">
              <i class="pi" [class]="estado() === 'vencido' ? 'pi-hourglass' : 'pi-link'"></i>
            </span>
            <h1 class="mt-5 text-2xl font-semibold">
              {{ estado() === 'vencido' ? 'Este enlace ya venció' : 'No pudimos abrir este enlace' }}
            </h1>
            <p class="mt-2 text-sm text-bone-600">
              @if (estado() === 'vencido') {
                Por tu seguridad, los enlaces de resultados duran {{ api.institucion().vigenciaEnlaceDias }} días.
              } @else {
                Revisa que lo hayas copiado completo.
              }
              Pide uno nuevo a tu laboratorio:
            </p>
            <div class="surface-card mt-6 p-4 text-left text-sm">
              <p class="font-semibold text-ink-950">{{ api.institucion().nombre }}</p>
              <p class="mt-1 text-bone-600"><i class="pi pi-phone mr-2 text-bone-400" aria-hidden="true"></i>{{ api.institucion().telefono }}</p>
              <p class="text-bone-600"><i class="pi pi-envelope mr-2 text-bone-400" aria-hidden="true"></i>{{ api.institucion().correo }}</p>
            </div>
          </div>
        }
      }
    </main>

    <footer class="mx-auto max-w-3xl px-4 pb-10 text-center text-xs text-bone-500 sm:px-6">
      {{ api.institucion().nombre }} · {{ api.institucion().direccion }}
    </footer>
  `,
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
