import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';

import { MockApiService } from '@core/api/mock-api.service';
import { FieldError } from '@shared/ui/field-error';
import { PageHeader } from '@shared/ui/page-header';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, InputNumberModule, PageHeader, FieldError],
  templateUrl: './configuracion-page.html',
})
export default class ConfiguracionPage {
  private readonly api = inject(MockApiService);
  private readonly toast = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  protected readonly enviado = signal(false);
  protected readonly guardando = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    razonSocial: [''],
    rfc: ['', Validators.pattern(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i)],
    telefono: [''],
    correo: ['', Validators.email],
    direccion: [''],
    vigenciaEnlaceDias: [7, [Validators.required, Validators.min(1)]],
  });

  constructor() {
    this.restaurar();
  }

  protected restaurar(): void {
    this.form.reset(this.api.institucion());
  }

  protected async guardar(): Promise<void> {
    this.enviado.set(true);
    if (this.form.invalid) return;
    this.guardando.set(true);
    const v = this.form.getRawValue();
    await this.api.guardarInstitucion({ ...v, rfc: v.rfc.toUpperCase() });
    this.guardando.set(false);
    this.form.markAsPristine();
    this.toast.add({ severity: 'success', summary: 'Configuración guardada' });
  }
}
