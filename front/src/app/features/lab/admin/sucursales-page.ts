import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';

import { MockApiService } from '@core/api/mock-api.service';
import { Id, Sucursal } from '@core/models';
import { iniciales } from '@core/util/format';
import { FieldError } from '@shared/ui/field-error';
import { PageHeader } from '@shared/ui/page-header';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonModule, DialogModule, InputTextModule, MultiSelectModule, PageHeader, FieldError],
  template: `
    <ml-page-header eyebrow="Administración" title="Sucursales" subtitle="Ubicaciones del laboratorio y el personal asignado a cada una.">
      <p-button label="Nueva sucursal" icon="pi pi-plus" (onClick)="abrir(null)" />
    </ml-page-header>

    <ul class="mt-6 grid gap-4 md:grid-cols-2" role="list">
      @for (s of sucursales(); track s.id) {
        <li class="surface-card flex flex-col p-5">
          <div class="flex items-start gap-3">
            <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-ink-50 text-ink-700" aria-hidden="true">
              <i class="pi pi-building"></i>
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-lg font-semibold text-ink-950">Sucursal {{ s.nombre }}</p>
              <p class="text-sm text-bone-600">{{ s.direccion }}</p>
              <p class="text-sm text-bone-500">{{ s.telefono }}</p>
            </div>
            <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" severity="secondary" [ariaLabel]="'Editar sucursal ' + s.nombre" (onClick)="abrir(s)" />
          </div>
          <div class="mt-5 border-t border-bone-100 pt-4">
            <p class="text-sm font-medium text-bone-700">Personal asignado ({{ s.personal.length }})</p>
            <ul class="mt-3 flex flex-wrap gap-2" role="list">
              @for (u of s.personal; track u.id) {
                <li class="inline-flex items-center gap-2 rounded-full bg-bone-100 py-1 pl-1 pr-3 text-sm">
                  <span class="grid size-6 place-items-center rounded-full bg-ink-100 text-[0.625rem] font-semibold text-ink-800" aria-hidden="true">{{ ini(u.nombre) }}</span>
                  {{ u.nombre }}
                </li>
              } @empty {
                <li class="text-sm text-bone-500">Sin personal asignado.</li>
              }
            </ul>
          </div>
          <dl class="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-bone-50 p-3 text-center">
            <div>
              <dt class="text-xs text-bone-500">En proceso</dt>
              <dd class="text-xl font-semibold tabular-nums text-ink-950">{{ s.abiertas }}</dd>
            </div>
            <div>
              <dt class="text-xs text-bone-500">Listas</dt>
              <dd class="text-xl font-semibold tabular-nums text-ink-950">{{ s.cerradas }}</dd>
            </div>
          </dl>
        </li>
      }
    </ul>

    <p-dialog
      [(visible)]="dialogo"
      [modal]="true"
      [draggable]="false"
      [header]="editando() ? 'Editar sucursal' : 'Nueva sucursal'"
      [style]="{ width: '34rem' }"
      [breakpoints]="{ '640px': '95vw' }"
    >
      <form id="form-sucursal" class="grid gap-4" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        <div>
          <label class="field-label" for="s-nombre">Nombre</label>
          <input pInputText id="s-nombre" formControlName="nombre" class="w-full" placeholder="Ej. Sur" />
          <ml-field-error [control]="form.controls.nombre" [submitted]="enviado()" />
        </div>
        <div>
          <label class="field-label" for="s-dir">Dirección</label>
          <input pInputText id="s-dir" formControlName="direccion" class="w-full" autocomplete="street-address" />
          <ml-field-error [control]="form.controls.direccion" [submitted]="enviado()" />
        </div>
        <div>
          <label class="field-label" for="s-tel">Teléfono</label>
          <input pInputText id="s-tel" formControlName="telefono" class="w-full" inputmode="tel" />
        </div>
        <div>
          <label class="field-label" for="s-personal">Personal asignado</label>
          <p-multiselect
            inputId="s-personal"
            formControlName="usuarioIds"
            [options]="api.usuarios()"
            optionLabel="nombre"
            optionValue="id"
            placeholder="Selecciona usuarios"
            display="chip"
            [fluid]="true"
            appendTo="body"
          />
        </div>
      </form>
      <ng-template #footer>
        <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="dialogo.set(false)" />
        <p-button type="submit" form="form-sucursal" label="Guardar" [loading]="guardando()" />
      </ng-template>
    </p-dialog>
  `,
})
export default class SucursalesPage {
  protected readonly api = inject(MockApiService);
  private readonly toast = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  protected readonly dialogo = signal(false);
  protected readonly editando = signal<Sucursal | null>(null);
  protected readonly enviado = signal(false);
  protected readonly guardando = signal(false);
  protected readonly ini = iniciales;

  protected readonly sucursales = computed(() => {
    const usuarios = this.api.usuarios();
    const ordenes = this.api.ordenes();
    return this.api.sucursales().map((s) => {
      const propias = ordenes.filter((o) => o.sucursalId === s.id);
      return {
        ...s,
        personal: usuarios.filter((u) => s.usuarioIds.includes(u.id)),
        abiertas: propias.filter((o) => o.estado === 'abierta').length,
        cerradas: propias.filter((o) => o.estado === 'cerrada').length,
      };
    });
  });

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    direccion: ['', Validators.required],
    telefono: [''],
    usuarioIds: [[] as Id[]],
  });

  protected abrir(s: Sucursal | null): void {
    this.editando.set(s);
    this.enviado.set(false);
    this.form.reset(s ? { nombre: s.nombre, direccion: s.direccion, telefono: s.telefono, usuarioIds: [...s.usuarioIds] } : undefined);
    this.dialogo.set(true);
  }

  protected async guardar(): Promise<void> {
    this.enviado.set(true);
    if (this.form.invalid) return;
    this.guardando.set(true);
    const s = await this.api.guardarSucursal({ ...this.form.getRawValue(), id: this.editando()?.id });
    this.guardando.set(false);
    this.dialogo.set(false);
    this.toast.add({ severity: 'success', summary: 'Sucursal guardada', detail: s.nombre });
  }
}
