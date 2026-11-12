import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';

import { MockApiService } from '@core/api/mock-api.service';
import { Medico } from '@core/models';
import { coincide, iniciales } from '@core/util/format';
import { EmptyState } from '@shared/ui/empty-state';
import { FieldError } from '@shared/ui/field-error';
import { PageHeader } from '@shared/ui/page-header';
import { SearchField } from '@shared/ui/search-field';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonModule, DialogModule, InputTextModule, PasswordModule, PageHeader, SearchField, EmptyState, FieldError],
  templateUrl: './medicos-page.html',
})
export default class MedicosPage {
  private readonly api = inject(MockApiService);
  private readonly toast = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  protected readonly consulta = signal('');
  protected readonly dialogo = signal(false);
  protected readonly editando = signal<Medico | null>(null);
  protected readonly enviado = signal(false);
  protected readonly guardando = signal(false);
  protected readonly ini = iniciales;

  protected readonly filtrados = computed(() =>
    this.api.medicos().filter((m) => coincide(this.consulta(), m.nombre, m.especialidad, m.cedula)),
  );

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    especialidad: ['', Validators.required],
    cedula: ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]],
    telefono: [''],
    correo: ['', Validators.email],
    usuario: ['', Validators.required],
    contrasena: [''],
  });

  protected abrir(m: Medico | null): void {
    this.editando.set(m);
    this.enviado.set(false);
    this.form.reset({ ...(m ?? {}), contrasena: '' });
    this.form.controls.contrasena.setValidators(m ? [] : [Validators.required, Validators.minLength(8)]);
    this.form.controls.contrasena.updateValueAndValidity();
    this.dialogo.set(true);
  }

  protected async guardar(): Promise<void> {
    this.enviado.set(true);
    if (this.form.invalid) return;
    this.guardando.set(true);
    const { contrasena: _, ...datos } = this.form.getRawValue();
    const m = await this.api.guardarMedico({ ...datos, id: this.editando()?.id });
    this.guardando.set(false);
    this.dialogo.set(false);
    this.toast.add({ severity: 'success', summary: 'Médico guardado', detail: m.nombre });
  }
}
