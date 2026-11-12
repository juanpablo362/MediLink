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
  template: `
    <ml-page-header eyebrow="Administración" title="Configuración" subtitle="Datos de la institución que aparecen en resultados y mensajes." />

    <form class="mt-6 grid max-w-3xl gap-6" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
      <section class="surface-card p-5 sm:p-6" aria-labelledby="inst-titulo">
        <h2 id="inst-titulo" class="text-base font-semibold">Institución</h2>
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label class="field-label" for="c-nombre">Nombre comercial</label>
            <input pInputText id="c-nombre" formControlName="nombre" class="w-full" />
            <p class="field-hint">Así verán tu laboratorio los pacientes y médicos.</p>
            <ml-field-error [control]="form.controls.nombre" [submitted]="enviado()" />
          </div>
          <div>
            <label class="field-label" for="c-razon">Razón social</label>
            <input pInputText id="c-razon" formControlName="razonSocial" class="w-full" />
          </div>
          <div>
            <label class="field-label" for="c-rfc">RFC</label>
            <input pInputText id="c-rfc" formControlName="rfc" class="folio w-full uppercase" maxlength="13" />
            <ml-field-error [control]="form.controls.rfc" [submitted]="enviado()" pattern="El RFC de persona moral tiene 12 caracteres." />
          </div>
          <div>
            <label class="field-label" for="c-tel">Teléfono</label>
            <input pInputText id="c-tel" formControlName="telefono" class="w-full" inputmode="tel" />
          </div>
          <div>
            <label class="field-label" for="c-correo">Correo de contacto</label>
            <input pInputText id="c-correo" formControlName="correo" type="email" class="w-full" />
            <ml-field-error [control]="form.controls.correo" [submitted]="enviado()" />
          </div>
          <div class="sm:col-span-2">
            <label class="field-label" for="c-dir">Dirección fiscal</label>
            <input pInputText id="c-dir" formControlName="direccion" class="w-full" />
          </div>
        </div>
      </section>

      <section class="surface-card p-5 sm:p-6" aria-labelledby="seg-titulo">
        <h2 id="seg-titulo" class="text-base font-semibold">Enlaces seguros</h2>
        <p class="mt-1 text-sm text-bone-600">Los enlaces para pacientes dejan de funcionar al terminar este plazo.</p>
        <div class="mt-5 max-w-56">
          <label class="field-label" for="c-vigencia">Vigencia (días)</label>
          <p-inputnumber inputId="c-vigencia" formControlName="vigenciaEnlaceDias" [min]="1" [max]="90" [showButtons]="true" class="w-full" inputStyleClass="w-full" />
        </div>
      </section>

      <div class="flex justify-end gap-2">
        <p-button label="Descartar cambios" severity="secondary" [text]="true" [disabled]="form.pristine" (onClick)="restaurar()" />
        <p-button type="submit" label="Guardar configuración" icon="pi pi-check" [loading]="guardando()" />
      </div>
    </form>
  `,
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
