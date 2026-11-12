import { ChangeDetectionStrategy, Component, effect, inject, input, model, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';

import { MockApiService } from '@core/api/mock-api.service';
import { Paciente, Sexo } from '@core/models';
import { FieldError } from '@shared/ui/field-error';

@Component({
  selector: 'ml-paciente-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, InputTextModule, DatePickerModule, SelectButtonModule, FieldError],
  template: `
    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [draggable]="false"
      [header]="paciente() ? 'Editar paciente' : 'Nuevo paciente'"
      [style]="{ width: '36rem' }"
      [breakpoints]="{ '640px': '95vw' }"
    >
      <form id="form-paciente" class="grid gap-4 sm:grid-cols-2" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        <div>
          <label class="field-label" for="p-nombre">Nombre(s)</label>
          <input pInputText id="p-nombre" formControlName="nombre" class="w-full" autocomplete="given-name" />
          <ml-field-error [control]="form.controls.nombre" [submitted]="enviado()" />
        </div>
        <div>
          <label class="field-label" for="p-apellidos">Apellidos</label>
          <input pInputText id="p-apellidos" formControlName="apellidos" class="w-full" autocomplete="family-name" />
          <ml-field-error [control]="form.controls.apellidos" [submitted]="enviado()" />
        </div>
        <div>
          <label class="field-label" for="p-nacimiento">Fecha de nacimiento</label>
          <p-datepicker
            inputId="p-nacimiento"
            formControlName="fechaNacimiento"
            dateFormat="dd/mm/yy"
            [maxDate]="hoy"
            [showIcon]="true"
            iconDisplay="input"
            placeholder="dd/mm/aaaa"
            class="w-full"
            inputStyleClass="w-full"
            appendTo="body"
          />
          <ml-field-error [control]="form.controls.fechaNacimiento" [submitted]="enviado()" />
        </div>
        <div>
          <span class="field-label" id="p-sexo-label">Sexo</span>
          <p-selectbutton
            formControlName="sexo"
            [options]="sexos"
            optionLabel="label"
            optionValue="value"
            [allowEmpty]="false"
            [fluid]="true"
            ariaLabelledBy="p-sexo-label"
          />
        </div>
        <div>
          <label class="field-label" for="p-tel">Teléfono celular</label>
          <input pInputText id="p-tel" formControlName="telefono" class="w-full" inputmode="tel" autocomplete="tel-national" placeholder="10 dígitos" />
          <ml-field-error [control]="form.controls.telefono" [submitted]="enviado()" pattern="Escribe 10 dígitos." />
        </div>
        <div>
          <label class="field-label" for="p-correo">Correo electrónico</label>
          <input pInputText id="p-correo" formControlName="correo" class="w-full" type="email" autocomplete="email" />
          <ml-field-error [control]="form.controls.correo" [submitted]="enviado()" />
        </div>
      </form>
      <ng-template #footer>
        <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="visible.set(false)" />
        <p-button type="submit" form="form-paciente" [label]="paciente() ? 'Guardar cambios' : 'Registrar paciente'" [loading]="guardando()" />
      </ng-template>
    </p-dialog>
  `,
})
export class PacienteFormDialog {
  private readonly api = inject(MockApiService);
  private readonly toast = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  readonly visible = model(false);
  readonly paciente = input<Paciente | null>(null);
  readonly guardado = output<Paciente>();

  protected readonly hoy = new Date();
  protected readonly enviado = signal(false);
  protected readonly guardando = signal(false);
  protected readonly sexos: { label: string; value: Sexo }[] = [
    { label: 'Mujer', value: 'F' },
    { label: 'Hombre', value: 'M' },
    { label: 'Otro', value: 'X' },
  ];

  protected readonly form = this.fb.group({
    nombre: this.fb.nonNullable.control('', Validators.required),
    apellidos: this.fb.nonNullable.control('', Validators.required),
    fechaNacimiento: this.fb.control<Date | null>(null, Validators.required),
    sexo: this.fb.nonNullable.control<Sexo>('F'),
    telefono: this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/^\d{10}$/)]),
    correo: this.fb.nonNullable.control('', Validators.email),
  });

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      const p = this.paciente();
      this.enviado.set(false);
      this.form.reset({
        nombre: p?.nombre ?? '',
        apellidos: p?.apellidos ?? '',
        fechaNacimiento: p ? new Date(p.fechaNacimiento + 'T12:00:00') : null,
        sexo: p?.sexo ?? 'F',
        telefono: p?.telefono ?? '',
        correo: p?.correo ?? '',
      });
    });
  }

  protected async guardar(): Promise<void> {
    this.enviado.set(true);
    if (this.form.invalid) return;
    this.guardando.set(true);
    const v = this.form.getRawValue();
    const guardado = await this.api.guardarPaciente({
      id: this.paciente()?.id,
      nombre: v.nombre.trim(),
      apellidos: v.apellidos.trim(),
      fechaNacimiento: v.fechaNacimiento!.toISOString().slice(0, 10),
      sexo: v.sexo,
      telefono: v.telefono,
      correo: v.correo.trim(),
    });
    this.guardando.set(false);
    this.toast.add({ severity: 'success', summary: 'Paciente guardado', detail: `${guardado.nombre} ${guardado.apellidos}` });
    this.guardado.emit(guardado);
    this.visible.set(false);
  }
}
