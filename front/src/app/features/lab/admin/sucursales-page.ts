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
  templateUrl: './sucursales-page.html',
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
