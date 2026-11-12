import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { MockApiService } from '@core/api/mock-api.service';
import { SessionService } from '@core/auth/session.service';
import { RolUsuario, Usuario } from '@core/models';
import { coincide, iniciales } from '@core/util/format';
import { FieldError } from '@shared/ui/field-error';
import { PageHeader } from '@shared/ui/page-header';
import { SearchField } from '@shared/ui/search-field';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    PasswordModule,
    SelectButtonModule,
    ToggleSwitchModule,
    PageHeader,
    SearchField,
    FieldError,
  ],
  templateUrl: './usuarios-page.html',
})
export default class UsuariosPage {
  private readonly api = inject(MockApiService);
  private readonly toast = inject(MessageService);
  private readonly fb = inject(FormBuilder);
  protected readonly session = inject(SessionService);

  protected readonly consulta = signal('');
  protected readonly dialogo = signal(false);
  protected readonly editando = signal<Usuario | null>(null);
  protected readonly enviado = signal(false);
  protected readonly guardando = signal(false);
  protected readonly ini = iniciales;
  protected readonly roles: { label: string; value: RolUsuario }[] = [
    { label: 'Laboratorio', value: 'lab' },
    { label: 'Administración', value: 'admin' },
  ];

  protected readonly filtrados = computed(() =>
    this.api.usuarios().filter((u) => coincide(this.consulta(), u.nombre, u.usuario, u.correo)),
  );

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    usuario: ['', Validators.required],
    correo: ['', [Validators.required, Validators.email]],
    rol: ['lab' as RolUsuario],
    contrasena: [''],
    activo: [true],
  });

  protected abrir(u: Usuario | null): void {
    this.editando.set(u);
    this.enviado.set(false);
    this.form.reset(u ? { ...u, contrasena: '' } : undefined);
    this.dialogo.set(true);
  }

  protected async guardar(): Promise<void> {
    this.enviado.set(true);
    if (this.form.invalid) return;
    this.guardando.set(true);
    const { contrasena: _, ...datos } = this.form.getRawValue();
    const u = await this.api.guardarUsuario({ ...datos, id: this.editando()?.id });
    this.guardando.set(false);
    this.dialogo.set(false);
    this.toast.add({ severity: 'success', summary: 'Usuario guardado', detail: u.nombre });
  }
}
