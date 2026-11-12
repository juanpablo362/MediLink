import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { MockApiService } from '@core/api/mock-api.service';
import { Estudio } from '@core/models';
import { coincide } from '@core/util/format';
import { EmptyState } from '@shared/ui/empty-state';
import { FieldError } from '@shared/ui/field-error';
import { PageHeader } from '@shared/ui/page-header';
import { SearchField } from '@shared/ui/search-field';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    TextareaModule,
    ToggleSwitchModule,
    PageHeader,
    SearchField,
    EmptyState,
    FieldError,
  ],
  template: `
    <ml-page-header title="Estudios" subtitle="Catálogo con precio, tiempo de entrega y tipo de resultado.">
      <p-button label="Nuevo estudio" icon="pi pi-plus" (onClick)="abrir(null)" />
    </ml-page-header>

    <ml-search-field class="mt-6 max-w-md" placeholder="Nombre, clave o área" label="Buscar estudios" [(value)]="consulta" />
    <p class="sr-only" aria-live="polite">{{ filtrados().length }} estudios encontrados</p>

    <div class="surface-card mt-4 hidden overflow-hidden md:block">
      <p-table [value]="filtrados()" sortField="area" [sortOrder]="1" dataKey="id">
        <ng-template #header>
          <tr>
            <th pSortableColumn="clave" class="w-28">Clave <p-sorticon field="clave" /></th>
            <th pSortableColumn="nombre">Estudio <p-sorticon field="nombre" /></th>
            <th pSortableColumn="area">Área <p-sorticon field="area" /></th>
            <th pSortableColumn="diasEntrega">Entrega <p-sorticon field="diasEntrega" /></th>
            <th pSortableColumn="precio" class="text-right">Precio <p-sorticon field="precio" /></th>
            <th class="w-16"><span class="sr-only">Acciones</span></th>
          </tr>
        </ng-template>
        <ng-template #body let-e>
          <tr>
            <td><span class="folio text-bone-600">{{ e.clave }}</span></td>
            <td>
              <span class="flex items-center gap-2 font-medium text-ink-950">
                {{ e.nombre }}
                @if (e.dicom) {
                  <span class="rounded bg-ink-50 px-1.5 py-px text-[0.6875rem] font-semibold text-ink-700">DICOM</span>
                }
              </span>
              @if (e.indicaciones) {
                <span class="block text-xs text-bone-500">{{ e.indicaciones }}</span>
              }
            </td>
            <td class="text-sm">{{ e.area }}</td>
            <td class="text-sm">{{ e.diasEntrega }} {{ e.diasEntrega === 1 ? 'día' : 'días' }}</td>
            <td class="text-right font-medium tabular-nums">{{ e.precio | currency: 'MXN' : 'symbol-narrow' : '1.2-2' }}</td>
            <td class="text-right">
              <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" severity="secondary" [ariaLabel]="'Editar ' + e.nombre" (onClick)="abrir(e)" />
            </td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr><td colspan="6"><ml-empty-state icon="pi pi-list-check" title="Sin estudios" description="Ningún estudio coincide con la búsqueda." /></td></tr>
        </ng-template>
      </p-table>
    </div>

    <ul class="mt-4 grid gap-3 md:hidden" role="list">
      @for (e of filtrados(); track e.id) {
        <li class="surface-card flex items-start gap-3 p-4">
          <div class="min-w-0 flex-1">
            <p class="font-semibold text-ink-950">{{ e.nombre }}</p>
            <p class="mt-0.5 text-sm text-bone-500">
              <span class="folio">{{ e.clave }}</span> · {{ e.area }} · {{ e.diasEntrega }} {{ e.diasEntrega === 1 ? 'día' : 'días' }}
            </p>
            <p class="mt-1 font-semibold tabular-nums text-ink-900">{{ e.precio | currency: 'MXN' : 'symbol-narrow' : '1.2-2' }}</p>
          </div>
          <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" severity="secondary" [ariaLabel]="'Editar ' + e.nombre" (onClick)="abrir(e)" />
        </li>
      }
    </ul>

    <p-dialog
      [(visible)]="dialogo"
      [modal]="true"
      [draggable]="false"
      [header]="editando() ? 'Editar estudio' : 'Nuevo estudio'"
      [style]="{ width: '36rem' }"
      [breakpoints]="{ '640px': '95vw' }"
    >
      <form id="form-estudio" class="grid gap-4 sm:grid-cols-2" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        <div class="sm:col-span-2">
          <label class="field-label" for="e-nombre">Nombre</label>
          <input pInputText id="e-nombre" formControlName="nombre" class="w-full" />
          <ml-field-error [control]="form.controls.nombre" [submitted]="enviado()" />
        </div>
        <div>
          <label class="field-label" for="e-clave">Clave</label>
          <input pInputText id="e-clave" formControlName="clave" class="folio w-full uppercase" />
          <ml-field-error [control]="form.controls.clave" [submitted]="enviado()" />
        </div>
        <div>
          <label class="field-label" for="e-area">Área</label>
          <input pInputText id="e-area" formControlName="area" class="w-full" placeholder="Ej. Bioquímica" />
          <ml-field-error [control]="form.controls.area" [submitted]="enviado()" />
        </div>
        <div>
          <label class="field-label" for="e-precio">Precio</label>
          <p-inputnumber inputId="e-precio" formControlName="precio" mode="currency" currency="MXN" locale="es-MX" [min]="0" class="w-full" inputStyleClass="w-full" />
          <ml-field-error [control]="form.controls.precio" [submitted]="enviado()" />
        </div>
        <div>
          <label class="field-label" for="e-dias">Días de entrega</label>
          <p-inputnumber inputId="e-dias" formControlName="diasEntrega" [min]="0" [max]="60" [showButtons]="true" class="w-full" inputStyleClass="w-full" />
        </div>
        <div class="flex items-center gap-3 sm:col-span-2">
          <p-toggleswitch inputId="e-dicom" formControlName="dicom" />
          <label for="e-dicom" class="text-sm text-bone-800">
            Genera imágenes DICOM <span class="block text-xs text-bone-500">Permite adjuntar archivos .dcm y abrir el visor.</span>
          </label>
        </div>
        <div class="sm:col-span-2">
          <label class="field-label" for="e-ind">Indicaciones para el paciente</label>
          <textarea pTextarea id="e-ind" formControlName="indicaciones" rows="2" class="w-full" [autoResize]="true"></textarea>
        </div>
      </form>
      <ng-template #footer>
        <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="dialogo.set(false)" />
        <p-button type="submit" form="form-estudio" label="Guardar" [loading]="guardando()" />
      </ng-template>
    </p-dialog>
  `,
})
export default class EstudiosPage {
  private readonly api = inject(MockApiService);
  private readonly toast = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  protected readonly consulta = signal('');
  protected readonly dialogo = signal(false);
  protected readonly editando = signal<Estudio | null>(null);
  protected readonly enviado = signal(false);
  protected readonly guardando = signal(false);

  protected readonly filtrados = computed(() =>
    this.api.estudios().filter((e) => coincide(this.consulta(), e.nombre, e.clave, e.area)),
  );

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    clave: ['', Validators.required],
    area: ['', Validators.required],
    precio: [0, [Validators.required, Validators.min(1)]],
    diasEntrega: [1],
    dicom: [false],
    indicaciones: [''],
  });

  protected abrir(e: Estudio | null): void {
    this.editando.set(e);
    this.enviado.set(false);
    this.form.reset(e ? { ...e, indicaciones: e.indicaciones ?? '' } : undefined);
    this.dialogo.set(true);
  }

  protected async guardar(): Promise<void> {
    this.enviado.set(true);
    if (this.form.invalid) return;
    this.guardando.set(true);
    const v = this.form.getRawValue();
    const e = await this.api.guardarEstudio({ ...v, clave: v.clave.toUpperCase(), id: this.editando()?.id });
    this.guardando.set(false);
    this.dialogo.set(false);
    this.toast.add({ severity: 'success', summary: 'Estudio guardado', detail: e.nombre });
  }
}
