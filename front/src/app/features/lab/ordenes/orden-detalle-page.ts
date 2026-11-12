import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import { MockApiService } from '@core/api/mock-api.service';
import { OrdenesVistaService } from '@core/api/ordenes-vista.service';
import { descargarResultado } from '@core/util/descarga';
import { edad, folio, nombreCompleto, tamanoLegible } from '@core/util/format';
import { EmptyState } from '@shared/ui/empty-state';
import { FileDropzone } from '@shared/ui/file-dropzone';
import { ShareLinkDialog } from '@shared/ui/share-link-dialog';
import { StatusBadge } from '@shared/ui/status-badge';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, CurrencyPipe, ButtonModule, TooltipModule, StatusBadge, FileDropzone, ShareLinkDialog, EmptyState],
  template: `
    <a routerLink="/lab/ordenes" class="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-bone-600 hover:text-ink-900">
      <i class="pi pi-arrow-left text-xs" aria-hidden="true"></i>Órdenes
    </a>

    @if (orden(); as o) {
      <header class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div class="flex flex-wrap items-center gap-3">
            <h1 class="folio !text-2xl font-semibold sm:!text-[1.75rem]">{{ fmtFolio(o.folio) }}</h1>
            <ml-status-badge [estado]="o.estado" [vencida]="o.vencida" />
          </div>
          <p class="mt-1.5 text-sm text-bone-600">
            Registrada el {{ o.fechaRegistro | date: "dd/MM/yyyy 'a las' HH:mm" }} · Sucursal {{ o.sucursal?.nombre }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          @if (o.estado === 'abierta') {
            <p-button
              label="Eliminar"
              icon="pi pi-trash"
              severity="danger"
              [text]="true"
              (onClick)="eliminar()"
            />
            <button
              type="button"
              class="btn-accent"
              [disabled]="!completa() || procesando()"
              (click)="cerrar()"
              [attr.aria-describedby]="!completa() ? 'cerrar-ayuda' : null"
            >
              <i class="pi" [class]="procesando() ? 'pi-spin pi-spinner' : 'pi-check-circle'" aria-hidden="true"></i>
              Marcar como lista
            </button>
          } @else {
            <p-button label="Reabrir" icon="pi pi-replay" severity="secondary" [outlined]="true" [loading]="procesando()" (onClick)="reabrir()" />
            <button type="button" class="btn-accent" (click)="compartir.set(true)">
              <i class="pi pi-share-alt" aria-hidden="true"></i>Compartir resultados
            </button>
          }
        </div>
      </header>

      @if (o.estado === 'abierta') {
        <div class="surface-card mt-6 p-4 sm:p-5">
          <div class="flex items-center justify-between gap-3 text-sm">
            <span class="font-semibold text-ink-950">Resultados cargados</span>
            <span class="tabular-nums text-bone-600">{{ o.resultadosCargados }} de {{ o.estudiosDetalle.length }}</span>
          </div>
          <div
            class="mt-2.5 h-2 overflow-hidden rounded-full bg-bone-100"
            role="progressbar"
            [attr.aria-valuenow]="o.resultadosCargados"
            aria-valuemin="0"
            [attr.aria-valuemax]="o.estudiosDetalle.length"
            aria-label="Resultados cargados"
          >
            <div class="h-full rounded-full bg-ink-600 transition-[width] duration-500" [style.width.%]="(o.resultadosCargados / o.estudiosDetalle.length) * 100"></div>
          </div>
          <p id="cerrar-ayuda" class="mt-2 text-xs text-bone-500">
            @if (completa()) {
              Todo listo. Marca la orden como lista para habilitar la descarga y el envío.
            } @else {
              Adjunta al menos un archivo por estudio para poder marcar la orden como lista.
            }
          </p>
        </div>
      }

      <div class="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
        <section aria-labelledby="estudios-titulo">
          <h2 id="estudios-titulo" class="sr-only">Estudios</h2>
          <ul class="grid gap-4" role="list">
            @for (e of o.estudiosDetalle; track e.id) {
              <li class="surface-card p-4 sm:p-5">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="font-semibold text-ink-950">{{ e.nombre }}</p>
                    <p class="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-bone-500">
                      <span class="folio">{{ e.clave }}</span><span>{{ e.area }}</span>
                      @if (e.dicom) {
                        <span class="rounded bg-ink-50 px-1.5 font-semibold text-ink-700">DICOM</span>
                      }
                    </p>
                  </div>
                  @if (e.adjuntos.length) {
                    <span class="inline-flex items-center gap-1 text-xs font-semibold text-ok-700">
                      <i class="pi pi-check-circle" aria-hidden="true"></i>Con resultado
                    </span>
                  } @else {
                    <span class="inline-flex items-center gap-1 text-xs font-semibold text-wait-700">
                      <i class="pi pi-clock" aria-hidden="true"></i>Pendiente
                    </span>
                  }
                </div>

                @if (e.adjuntos.length) {
                  <ul class="mt-4 grid gap-2" role="list">
                    @for (a of e.adjuntos; track a.id) {
                      <li class="flex items-center gap-3 rounded-lg border border-bone-200 bg-bone-50 px-3 py-2.5">
                        <i
                          class="pi text-lg"
                          [class]="a.tipo === 'dicom' ? 'pi-images text-ink-600' : 'pi-file-pdf text-coral-700'"
                          aria-hidden="true"
                        ></i>
                        <div class="min-w-0 flex-1">
                          <p class="truncate text-sm font-medium text-ink-950">{{ a.nombre }}</p>
                          <p class="text-xs text-bone-500">{{ a.tipo === 'dicom' ? 'DICOM' : 'PDF' }} · {{ tamano(a.tamano) }}</p>
                        </div>
                        @if (a.tipo === 'dicom') {
                          <a
                            [routerLink]="['/lab/visor', o.id, e.id]"
                            class="inline-grid size-9 place-items-center rounded-lg text-ink-700 hover:bg-ink-50"
                            pTooltip="Ver imágenes"
                            [attr.aria-label]="'Ver imágenes de ' + a.nombre"
                          >
                            <i class="pi pi-eye" aria-hidden="true"></i>
                          </a>
                        }
                        @if (o.estado === 'cerrada') {
                          <p-button
                            icon="pi pi-download"
                            [text]="true"
                            [rounded]="true"
                            severity="secondary"
                            pTooltip="Descargar"
                            [ariaLabel]="'Descargar ' + a.nombre"
                            (onClick)="descargar(a.nombre, e.nombre)"
                          />
                        } @else {
                          <p-button
                            icon="pi pi-times"
                            [text]="true"
                            [rounded]="true"
                            severity="secondary"
                            pTooltip="Quitar archivo"
                            [ariaLabel]="'Quitar ' + a.nombre"
                            (onClick)="quitar(e.id, a.id)"
                          />
                        }
                      </li>
                    }
                  </ul>
                }

                @if (o.estado === 'abierta') {
                  <ml-file-dropzone class="mt-4" [inputId]="'archivo-' + e.id" [disabled]="subiendo() === e.id" (files)="adjuntar(e.id, $event)" />
                  @if (subiendo() === e.id) {
                    <p class="mt-2 flex items-center gap-2 text-xs text-bone-600" role="status">
                      <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>Subiendo archivos…
                    </p>
                  }
                }
              </li>
            }
          </ul>
        </section>

        <aside class="grid gap-4">
          <section class="surface-card p-5" aria-labelledby="paciente-titulo">
            <h2 id="paciente-titulo" class="eyebrow">Paciente</h2>
            @if (o.paciente; as p) {
              <p class="mt-3 font-semibold text-ink-950">{{ nombre(p) }}</p>
              <p class="text-sm text-bone-600">{{ edadDe(p.fechaNacimiento) }} años · {{ sexo[p.sexo] }}</p>
              <dl class="mt-3 grid gap-1.5 text-sm">
                <div class="flex items-center gap-2"><dt><i class="pi pi-phone text-bone-400" aria-label="Teléfono"></i></dt><dd>{{ p.telefono }}</dd></div>
                <div class="flex items-center gap-2"><dt><i class="pi pi-envelope text-bone-400" aria-label="Correo"></i></dt><dd class="truncate">{{ p.correo || 'Sin correo' }}</dd></div>
              </dl>
            }
          </section>
          <section class="surface-card p-5" aria-labelledby="detalle-titulo">
            <h2 id="detalle-titulo" class="eyebrow">Detalle</h2>
            <dl class="mt-3 grid gap-3 text-sm">
              <div>
                <dt class="text-bone-500">Médico</dt>
                <dd class="font-medium text-ink-950">{{ o.medicoNombre }}</dd>
                @if (o.medico) {
                  <dd class="text-xs text-bone-500">{{ o.medico.especialidad }}</dd>
                }
              </div>
              <div>
                <dt class="text-bone-500">Fecha de entrega</dt>
                <dd class="font-medium" [class]="o.vencida ? 'text-danger-700' : 'text-ink-950'">{{ o.fechaEntrega | date: 'dd/MM/yyyy' }}</dd>
              </div>
              <div>
                <dt class="text-bone-500">Se entrega por</dt>
                <dd class="mt-1 flex flex-wrap gap-1.5">
                  @if (o.entrega.correo) { <span class="chip"><i class="pi pi-envelope" aria-hidden="true"></i>Correo</span> }
                  @if (o.entrega.whatsapp) { <span class="chip"><i class="pi pi-whatsapp" aria-hidden="true"></i>WhatsApp</span> }
                  @if (o.entrega.impreso) { <span class="chip"><i class="pi pi-print" aria-hidden="true"></i>Impreso</span> }
                </dd>
              </div>
              @if (o.fechaCierre) {
                <div>
                  <dt class="text-bone-500">Lista desde</dt>
                  <dd class="font-medium text-ink-950">{{ o.fechaCierre | date: "dd/MM/yyyy, HH:mm" }}</dd>
                </div>
              }
              @if (o.notas) {
                <div>
                  <dt class="text-bone-500">Notas</dt>
                  <dd class="text-ink-900">{{ o.notas }}</dd>
                </div>
              }
            </dl>
            <div class="mt-4 flex items-baseline justify-between border-t border-bone-200 pt-4">
              <span class="text-sm text-bone-500">Total</span>
              <span class="text-lg font-semibold tabular-nums text-ink-950">{{ o.total | currency: 'MXN' : 'symbol-narrow' : '1.2-2' }}</span>
            </div>
          </section>
        </aside>
      </div>

      <ml-share-link-dialog [(visible)]="compartir" [pacienteId]="o.pacienteId" [ordenId]="o.id" />
    } @else {
      <div class="surface-card mt-6">
        <ml-empty-state icon="pi pi-question-circle" title="No encontramos esta orden" description="Puede que se haya eliminado o que pertenezca a otra sucursal.">
          <a routerLink="/lab/ordenes" class="text-sm font-semibold text-ink-700 underline underline-offset-2">Volver a órdenes</a>
        </ml-empty-state>
      </div>
    }
  `,
  styles: `
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      border-radius: 9999px;
      background: var(--color-bone-100);
      padding: 0.125rem 0.625rem;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-bone-800);
    }
  `,
})
export default class OrdenDetallePage {
  readonly id = input.required<string>();

  private readonly api = inject(MockApiService);
  private readonly vista = inject(OrdenesVistaService);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  protected readonly orden = computed(() => this.vista.porId().get(this.id()));
  protected readonly completa = computed(() => {
    const o = this.orden();
    return !!o && o.resultadosCargados === o.estudiosDetalle.length;
  });
  protected readonly compartir = signal(false);
  protected readonly procesando = signal(false);
  protected readonly subiendo = signal<string | null>(null);

  protected readonly fmtFolio = folio;
  protected readonly nombre = nombreCompleto;
  protected readonly edadDe = edad;
  protected readonly tamano = tamanoLegible;
  protected readonly sexo = { F: 'Mujer', M: 'Hombre', X: 'Otro' } as const;

  protected async adjuntar(estudioId: string, archivos: File[]): Promise<void> {
    this.subiendo.set(estudioId);
    await this.api.adjuntar(this.id(), estudioId, archivos);
    this.subiendo.set(null);
    this.toast.add({ severity: 'success', summary: 'Archivos adjuntados', detail: archivos.map((a) => a.name).join(', '), life: 3000 });
  }

  protected async quitar(estudioId: string, adjuntoId: string): Promise<void> {
    await this.api.quitarAdjunto(this.id(), estudioId, adjuntoId);
  }

  protected async cerrar(): Promise<void> {
    this.procesando.set(true);
    try {
      await this.api.cerrarOrden(this.id());
      this.toast.add({ severity: 'success', summary: 'Orden lista', detail: 'Ya puedes compartir los resultados.' });
      this.compartir.set(true);
    } catch (e) {
      this.toast.add({ severity: 'error', summary: 'No se pudo cerrar', detail: (e as Error).message });
    } finally {
      this.procesando.set(false);
    }
  }

  protected reabrir(): void {
    this.confirm.confirm({
      header: '¿Reabrir la orden?',
      message: 'Los resultados dejarán de poder descargarse hasta que vuelvas a marcarla como lista.',
      icon: 'pi pi-replay',
      acceptLabel: 'Reabrir',
      rejectLabel: 'Cancelar',
      rejectButtonProps: { severity: 'secondary', text: true },
      accept: async () => {
        this.procesando.set(true);
        await this.api.reabrirOrden(this.id());
        this.procesando.set(false);
        this.toast.add({ severity: 'info', summary: 'Orden reabierta' });
      },
    });
  }

  protected eliminar(): void {
    const o = this.orden();
    if (!o) return;
    this.confirm.confirm({
      header: `¿Eliminar ${folio(o.folio)}?`,
      message: 'Se borrará la orden y sus archivos. Esta acción no se puede deshacer.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar orden',
      rejectLabel: 'Cancelar',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', text: true },
      accept: async () => {
        await this.api.eliminarOrden(o.id);
        this.toast.add({ severity: 'success', summary: 'Orden eliminada', detail: folio(o.folio) });
        void this.router.navigateByUrl('/lab/ordenes');
      },
    });
  }

  protected descargar(nombreArchivo: string, estudio: string): void {
    const o = this.orden();
    if (!o || !descargarResultado(o.estado, nombreArchivo, `${estudio} - ${folio(o.folio)}`)) {
      this.toast.add({ severity: 'warn', summary: 'Aún no disponible', detail: 'La orden debe estar lista para descargar.' });
    }
  }
}
