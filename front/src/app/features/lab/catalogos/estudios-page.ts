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
  templateUrl: './estudios-page.html',
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
