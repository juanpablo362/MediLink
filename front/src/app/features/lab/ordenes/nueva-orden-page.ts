import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TextareaModule } from 'primeng/textarea';

import { MockApiService } from '@core/api/mock-api.service';
import { SessionService } from '@core/auth/session.service';
import { Estudio, FormaEntrega, Paciente } from '@core/models';
import { coincide, edad, folio, nombreCompleto } from '@core/util/format';
import { PageHeader } from '@shared/ui/page-header';
import { SearchField } from '@shared/ui/search-field';
import { PacienteFormDialog } from '../catalogos/paciente-form-dialog';

type ModoMedico = 'catalogo' | 'externo' | 'ninguno';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    CurrencyPipe,
    DatePipe,
    ButtonModule,
    SelectModule,
    SelectButtonModule,
    CheckboxModule,
    DatePickerModule,
    InputTextModule,
    TextareaModule,
    MessageModule,
    PageHeader,
    SearchField,
    PacienteFormDialog,
  ],
  template: `
    <a routerLink="/lab/ordenes" class="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-bone-600 hover:text-ink-900">
      <i class="pi pi-arrow-left text-xs" aria-hidden="true"></i>Órdenes
    </a>
    <ml-page-header title="Nueva orden" [subtitle]="'Sucursal ' + (session.sucursalActual()?.nombre ?? '')" />

    <!-- Indicador de pasos -->
    <nav class="mt-6" aria-label="Pasos de la orden">
      <ol class="grid grid-cols-4 gap-2" role="list">
        @for (p of pasos; track p.n) {
          <li>
            <button
              type="button"
              class="group flex w-full flex-col gap-2 text-left disabled:cursor-not-allowed"
              [disabled]="p.n > maxPaso()"
              [attr.aria-current]="paso() === p.n ? 'step' : null"
              (click)="paso.set(p.n)"
            >
              <span
                class="h-1.5 rounded-full transition-colors"
                [class]="p.n < paso() ? 'bg-ink-600' : p.n === paso() ? 'bg-coral-600' : 'bg-bone-200'"
              ></span>
              <span class="flex items-center gap-2 text-xs font-semibold sm:text-sm" [class]="p.n === paso() ? 'text-ink-950' : 'text-bone-500'">
                <span class="folio hidden sm:inline">{{ p.n }}.</span>
                <span class="truncate">{{ p.titulo }}</span>
                @if (p.n < paso()) {
                  <i class="pi pi-check text-[0.65rem] text-ink-600" aria-label="completado"></i>
                }
              </span>
            </button>
          </li>
        }
      </ol>
    </nav>

    <div class="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
      <section class="surface-card p-5 sm:p-6" [attr.aria-labelledby]="'paso-' + paso()">
        @switch (paso()) {
          @case (1) {
            <h2 id="paso-1" class="text-lg font-semibold">¿Para quién es la orden?</h2>
            <p class="mt-1 text-sm text-bone-600">Busca por nombre o teléfono. Si es su primera visita, regístralo.</p>
            <div class="mt-5 flex flex-col gap-3 sm:flex-row">
              <p-select
                class="flex-1"
                [options]="opcionesPacientes()"
                optionLabel="etiqueta"
                optionValue="id"
                [filter]="true"
                filterBy="etiqueta,telefono"
                placeholder="Selecciona un paciente"
                ariaLabel="Paciente"
                [ngModel]="pacienteId()"
                (ngModelChange)="pacienteId.set($event)"
                [fluid]="true"
                appendTo="body"
              >
                <ng-template #item let-p>
                  <div class="flex flex-col">
                    <span class="font-medium">{{ p.etiqueta }}</span>
                    <span class="text-xs text-bone-500">{{ p.detalle }}</span>
                  </div>
                </ng-template>
              </p-select>
              <p-button label="Registrar paciente" icon="pi pi-user-plus" severity="secondary" [outlined]="true" (onClick)="dialogoPaciente.set(true)" />
            </div>
            @if (paciente(); as p) {
              <div class="mt-5 flex items-center gap-4 rounded-xl bg-ink-50 p-4">
                <span class="grid size-11 place-items-center rounded-full bg-ink-700 font-semibold text-bone-50" aria-hidden="true">
                  {{ p.nombre[0] }}{{ p.apellidos[0] }}
                </span>
                <div class="min-w-0 text-sm">
                  <p class="font-semibold text-ink-950">{{ nombre(p) }}</p>
                  <p class="text-bone-600">{{ edadDe(p) }} años · {{ p.telefono }} · {{ p.correo || 'sin correo' }}</p>
                </div>
              </div>
            }
          }
          @case (2) {
            <h2 id="paso-2" class="text-lg font-semibold">Médico que solicita</h2>
            <p class="mt-1 text-sm text-bone-600">
              Si el médico está registrado, podrá ver los resultados desde su portal.
            </p>
            <p-selectbutton
              class="mt-5"
              [options]="modosMedico"
              optionLabel="label"
              optionValue="value"
              [allowEmpty]="false"
              [ngModel]="modoMedico()"
              (ngModelChange)="modoMedico.set($event)"
              ariaLabelledBy="paso-2"
            />
            <div class="mt-5 max-w-md">
              @switch (modoMedico()) {
                @case ('catalogo') {
                  <label class="field-label" for="medico">Médico registrado</label>
                  <p-select
                    inputId="medico"
                    [options]="api.medicos()"
                    optionLabel="nombre"
                    optionValue="id"
                    [filter]="true"
                    placeholder="Selecciona un médico"
                    [ngModel]="medicoId()"
                    (ngModelChange)="medicoId.set($event)"
                    [fluid]="true"
                    appendTo="body"
                  >
                    <ng-template #item let-m>
                      <div class="flex flex-col">
                        <span class="font-medium">{{ m.nombre }}</span>
                        <span class="text-xs text-bone-500">{{ m.especialidad }} · Céd. {{ m.cedula }}</span>
                      </div>
                    </ng-template>
                  </p-select>
                }
                @case ('externo') {
                  <label class="field-label" for="medico-externo">Nombre del médico</label>
                  <input
                    pInputText
                    id="medico-externo"
                    class="w-full"
                    placeholder="Ej. Dra. Ana López"
                    [ngModel]="medicoExterno()"
                    (ngModelChange)="medicoExterno.set($event)"
                  />
                  <p class="field-hint">No tendrá acceso al portal; los resultados se comparten con el paciente.</p>
                }
                @case ('ninguno') {
                  <p-message severity="secondary" icon="pi pi-info-circle">El paciente acude sin solicitud médica.</p-message>
                }
              }
            </div>
          }
          @case (3) {
            <h2 id="paso-3" class="text-lg font-semibold">Estudios</h2>
            <p class="mt-1 text-sm text-bone-600">Selecciona uno o varios. El total se calcula al momento.</p>
            <ml-search-field class="mt-5" placeholder="Buscar por nombre, clave o área" label="Buscar estudios" [(value)]="consultaEstudios" />
            <div class="mt-4 grid gap-5">
              @for (grupo of estudiosPorArea(); track grupo.area) {
                <fieldset>
                  <legend class="eyebrow mb-2">{{ grupo.area }}</legend>
                  <ul class="grid gap-2 sm:grid-cols-2" role="list">
                    @for (e of grupo.estudios; track e.id) {
                      <li>
                        <label
                          [for]="'est-' + e.id"
                          class="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition"
                          [class]="seleccion().has(e.id) ? 'border-ink-500 bg-ink-50/60' : 'border-bone-200 hover:border-bone-400'"
                        >
                          <p-checkbox
                            [inputId]="'est-' + e.id"
                            [binary]="true"
                            [ngModel]="seleccion().has(e.id)"
                            (ngModelChange)="alternarEstudio(e.id)"
                          />
                          <span class="min-w-0 flex-1">
                            <span class="block text-sm font-medium leading-snug text-ink-950">{{ e.nombre }}</span>
                            <span class="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-bone-500">
                              <span class="folio">{{ e.clave }}</span>
                              <span>{{ e.diasEntrega }} {{ e.diasEntrega === 1 ? 'día' : 'días' }}</span>
                              @if (e.dicom) {
                                <span class="rounded bg-ink-100 px-1.5 font-semibold text-ink-700">DICOM</span>
                              }
                            </span>
                          </span>
                          <span class="text-sm font-semibold tabular-nums text-ink-900">{{ e.precio | currency: 'MXN' : 'symbol-narrow' : '1.0-0' }}</span>
                        </label>
                      </li>
                    }
                  </ul>
                </fieldset>
              } @empty {
                <p class="text-sm text-bone-500">Ningún estudio coincide con la búsqueda.</p>
              }
            </div>
          }
          @case (4) {
            <h2 id="paso-4" class="text-lg font-semibold">Entrega de resultados</h2>
            <p class="mt-1 text-sm text-bone-600">
              Sugerimos la fecha según el estudio que más tarda ({{ diasMax() }} {{ diasMax() === 1 ? 'día' : 'días' }}).
            </p>
            <div class="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label class="field-label" for="fecha-entrega">Fecha de entrega</label>
                <p-datepicker
                  inputId="fecha-entrega"
                  [ngModel]="fechaEntrega()"
                  (ngModelChange)="elegirFecha($event)"
                  [minDate]="hoy"
                  dateFormat="dd/mm/yy"
                  [showIcon]="true"
                  iconDisplay="input"
                  class="w-full"
                  inputStyleClass="w-full"
                  appendTo="body"
                />
              </div>
              <fieldset>
                <legend class="field-label">¿Cómo se entregan?</legend>
                <div class="grid gap-2.5">
                  @for (f of formas; track f.key) {
                    <label [for]="'entrega-' + f.key" class="flex items-center gap-2.5 text-sm text-bone-800">
                      <p-checkbox
                        [inputId]="'entrega-' + f.key"
                        [binary]="true"
                        [ngModel]="entrega()[f.key]"
                        (ngModelChange)="alternarEntrega(f.key, $event)"
                      />
                      <i [class]="f.icono" class="text-bone-500" aria-hidden="true"></i>{{ f.label }}
                    </label>
                  }
                </div>
              </fieldset>
              <div class="sm:col-span-2">
                <label class="field-label" for="notas">Notas internas <span class="font-normal text-bone-500">(opcional)</span></label>
                <textarea
                  pTextarea
                  id="notas"
                  rows="3"
                  class="w-full"
                  [autoResize]="true"
                  placeholder="Indicaciones para el personal del laboratorio"
                  [ngModel]="notas()"
                  (ngModelChange)="notas.set($event)"
                ></textarea>
              </div>
            </div>
            @if (!algunaEntrega()) {
              <p-message severity="warn" icon="pi pi-exclamation-triangle" class="mt-4">Elige al menos una forma de entrega.</p-message>
            }
          }
        }

        <div class="mt-8 flex items-center justify-between gap-3 border-t border-bone-200 pt-5">
          <p-button
            label="Atrás"
            icon="pi pi-arrow-left"
            severity="secondary"
            [text]="true"
            [disabled]="paso() === 1"
            (onClick)="paso.set(paso() - 1)"
          />
          @if (paso() < 4) {
            <p-button label="Continuar" icon="pi pi-arrow-right" iconPos="right" [disabled]="!pasoValido()" (onClick)="avanzar()" />
          } @else {
            <button type="button" class="btn-accent" [disabled]="!puedeCrear() || creando()" (click)="crear()">
              <i class="pi" [class]="creando() ? 'pi-spin pi-spinner' : 'pi-check'" aria-hidden="true"></i>
              Registrar orden
            </button>
          }
        </div>
      </section>

      <!-- Resumen -->
      <aside class="surface-card sticky top-24 p-5" aria-label="Resumen de la orden">
        <p class="eyebrow">Resumen</p>
        <dl class="mt-4 grid gap-3 text-sm">
          <div>
            <dt class="text-bone-500">Paciente</dt>
            <dd class="font-medium text-ink-950">{{ paciente() ? nombre(paciente()) : '—' }}</dd>
          </div>
          <div>
            <dt class="text-bone-500">Médico</dt>
            <dd class="font-medium text-ink-950">{{ medicoResumen() }}</dd>
          </div>
          <div>
            <dt class="text-bone-500">Entrega</dt>
            <dd class="font-medium text-ink-950">{{ fechaEntrega() | date: 'dd/MM/yyyy' }}</dd>
          </div>
        </dl>
        <div class="mt-4 border-t border-bone-200 pt-4">
          <p class="text-sm text-bone-500">Estudios ({{ estudiosSeleccionados().length }})</p>
          <ul class="mt-2 grid gap-1.5 text-sm" role="list">
            @for (e of estudiosSeleccionados(); track e.id) {
              <li class="flex justify-between gap-3">
                <span class="truncate">{{ e.nombre }}</span>
                <span class="tabular-nums">{{ e.precio | currency: 'MXN' : 'symbol-narrow' : '1.0-0' }}</span>
              </li>
            } @empty {
              <li class="text-bone-400">Sin estudios</li>
            }
          </ul>
        </div>
        <div class="mt-4 flex items-baseline justify-between border-t border-bone-200 pt-4">
          <span class="text-sm font-semibold">Total</span>
          <span class="text-2xl font-semibold tabular-nums text-ink-950">{{ total() | currency: 'MXN' : 'symbol-narrow' : '1.2-2' }}</span>
        </div>
      </aside>
    </div>

    <ml-paciente-form-dialog [(visible)]="dialogoPaciente" (guardado)="pacienteId.set($event.id)" />
  `,
})
export default class NuevaOrdenPage {
  protected readonly api = inject(MockApiService);
  protected readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);

  protected readonly hoy = new Date();
  protected readonly nombre = nombreCompleto;
  protected readonly edadDe = (p: Paciente) => edad(p.fechaNacimiento);

  protected readonly pasos = [
    { n: 1, titulo: 'Paciente' },
    { n: 2, titulo: 'Médico' },
    { n: 3, titulo: 'Estudios' },
    { n: 4, titulo: 'Entrega' },
  ];
  protected readonly modosMedico: { label: string; value: ModoMedico }[] = [
    { label: 'Registrado', value: 'catalogo' },
    { label: 'Externo', value: 'externo' },
    { label: 'Sin médico', value: 'ninguno' },
  ];
  protected readonly formas: { key: keyof FormaEntrega; label: string; icono: string }[] = [
    { key: 'correo', label: 'Correo electrónico', icono: 'pi pi-envelope' },
    { key: 'whatsapp', label: 'WhatsApp', icono: 'pi pi-whatsapp' },
    { key: 'impreso', label: 'Impreso en sucursal', icono: 'pi pi-print' },
  ];

  protected readonly paso = signal(1);
  protected readonly maxPaso = signal(1);
  protected readonly dialogoPaciente = signal(false);
  protected readonly creando = signal(false);

  protected readonly pacienteId = signal<string | null>(null);
  protected readonly modoMedico = signal<ModoMedico>('catalogo');
  protected readonly medicoId = signal<string | null>(null);
  protected readonly medicoExterno = signal('');
  protected readonly seleccion = signal<Set<string>>(new Set());
  protected readonly consultaEstudios = signal('');
  protected readonly fechaEntrega = signal<Date>(new Date());
  private fechaTocada = false;
  protected readonly entrega = signal<FormaEntrega>({ impreso: false, correo: true, whatsapp: false });
  protected readonly notas = signal('');

  protected readonly opcionesPacientes = computed(() =>
    this.api
      .pacientes()
      .map((p) => ({
        id: p.id,
        etiqueta: nombreCompleto(p),
        telefono: p.telefono,
        detalle: `${edad(p.fechaNacimiento)} años · ${p.telefono}`,
      }))
      .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es')),
  );
  protected readonly paciente = computed(() => (this.pacienteId() ? this.api.pacientesPorId().get(this.pacienteId()!) : undefined));

  protected readonly estudiosPorArea = computed(() => {
    const q = this.consultaEstudios();
    const grupos = new Map<string, Estudio[]>();
    for (const e of this.api.estudios()) {
      if (!coincide(q, e.nombre, e.clave, e.area)) continue;
      grupos.set(e.area, [...(grupos.get(e.area) ?? []), e]);
    }
    return [...grupos].map(([area, estudios]) => ({ area, estudios }));
  });
  protected readonly estudiosSeleccionados = computed(() =>
    this.api.estudios().filter((e) => this.seleccion().has(e.id)),
  );
  protected readonly total = computed(() => this.estudiosSeleccionados().reduce((a, e) => a + e.precio, 0));
  protected readonly diasMax = computed(() => Math.max(1, ...this.estudiosSeleccionados().map((e) => e.diasEntrega)));
  protected readonly algunaEntrega = computed(() => Object.values(this.entrega()).some(Boolean));

  protected readonly medicoResumen = computed(() => {
    switch (this.modoMedico()) {
      case 'catalogo':
        return this.medicoId() ? this.api.medicosPorId().get(this.medicoId()!)?.nombre ?? '—' : '—';
      case 'externo':
        return this.medicoExterno().trim() || '—';
      default:
        return 'Sin médico';
    }
  });

  protected readonly pasoValido = computed(() => {
    switch (this.paso()) {
      case 1:
        return !!this.paciente();
      case 2:
        return this.modoMedico() === 'ninguno' || (this.modoMedico() === 'catalogo' ? !!this.medicoId() : !!this.medicoExterno().trim());
      case 3:
        return this.seleccion().size > 0;
      default:
        return true;
    }
  });
  protected readonly puedeCrear = computed(() => !!this.paciente() && this.seleccion().size > 0 && this.algunaEntrega());

  constructor() {
    effect(() => {
      const dias = this.diasMax();
      if (this.fechaTocada) return;
      const d = new Date();
      d.setDate(d.getDate() + dias);
      d.setHours(18, 0, 0, 0);
      this.fechaEntrega.set(d);
    });
  }

  protected avanzar(): void {
    if (!this.pasoValido()) return;
    const siguiente = this.paso() + 1;
    this.paso.set(siguiente);
    this.maxPaso.update((m) => Math.max(m, siguiente));
  }

  protected elegirFecha(fecha: Date): void {
    this.fechaTocada = true;
    this.fechaEntrega.set(fecha);
  }

  protected alternarEstudio(id: string): void {
    this.seleccion.update((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  protected alternarEntrega(key: keyof FormaEntrega, valor: boolean): void {
    this.entrega.update((e) => ({ ...e, [key]: valor }));
  }

  protected async crear(): Promise<void> {
    if (!this.puedeCrear()) return;
    this.creando.set(true);
    const modo = this.modoMedico();
    const orden = await this.api.crearOrden(
      {
        pacienteId: this.pacienteId()!,
        medicoId: modo === 'catalogo' ? this.medicoId() : null,
        medicoExterno: modo === 'externo' ? this.medicoExterno().trim() : null,
        estudioIds: [...this.seleccion()],
        fechaEntrega: this.fechaEntrega().toISOString(),
        entrega: this.entrega(),
        notas: this.notas().trim(),
      },
      this.session.lab()!.sucursalId,
    );
    this.creando.set(false);
    this.toast.add({ severity: 'success', summary: 'Orden registrada', detail: `Folio ${folio(orden.folio)}` });
    void this.router.navigate(['/lab/ordenes', orden.id]);
  }
}
