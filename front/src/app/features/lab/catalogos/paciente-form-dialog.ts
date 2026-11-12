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
  templateUrl: './paciente-form-dialog.html',
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
