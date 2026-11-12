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
  template: `
    <ml-page-header eyebrow="Administración" title="Usuarios" subtitle="Personal del laboratorio con acceso al sistema.">
      <p-button label="Nuevo usuario" icon="pi pi-user-plus" (onClick)="abrir(null)" />
    </ml-page-header>

    <ml-search-field class="mt-6 max-w-md" placeholder="Nombre, usuario o correo" label="Buscar usuarios" [(value)]="consulta" />

    <ul class="surface-card mt-4 divide-y divide-bone-100" role="list">
      @for (u of filtrados(); track u.id) {
        <li class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:px-5">
          <span
            class="grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold"
            [class]="u.activo ? 'bg-ink-100 text-ink-800' : 'bg-bone-100 text-bone-500'"
            aria-hidden="true"
          >{{ ini(u.nombre) }}</span>
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium" [class]="u.activo ? 'text-ink-950' : 'text-bone-500'">
              {{ u.nombre }}
              @if (u.id === session.lab()?.usuarioId) {
                <span class="ml-1 text-xs font-normal text-bone-500">(tú)</span>
              }
            </p>
            <p class="truncate text-sm text-bone-500"><span class="folio">{{ u.usuario }}</span> · {{ u.correo }}</p>
          </div>
          <span
            class="rounded-full px-2.5 py-1 text-xs font-semibold"
            [class]="u.rol === 'admin' ? 'bg-coral-50 text-coral-800' : 'bg-bone-100 text-bone-700'"
          >{{ u.rol === 'admin' ? 'Administración' : 'Laboratorio' }}</span>
          <span class="inline-flex w-24 items-center gap-1.5 text-xs font-medium" [class]="u.activo ? 'text-ok-700' : 'text-bone-500'">
            <i class="pi" [class]="u.activo ? 'pi-circle-fill text-[0.5rem]' : 'pi-ban'" aria-hidden="true"></i>
            {{ u.activo ? 'Activo' : 'Desactivado' }}
          </span>
          <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" severity="secondary" [ariaLabel]="'Editar ' + u.nombre" (onClick)="abrir(u)" />
        </li>
      }
    </ul>

    <p-dialog
      [(visible)]="dialogo"
      [modal]="true"
      [draggable]="false"
      [header]="editando() ? 'Editar usuario' : 'Nuevo usuario'"
      [style]="{ width: '34rem' }"
      [breakpoints]="{ '640px': '95vw' }"
    >
      <form id="form-usuario" class="grid gap-4 sm:grid-cols-2" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        <div class="sm:col-span-2">
          <label class="field-label" for="u-nombre">Nombre completo</label>
          <input pInputText id="u-nombre" formControlName="nombre" class="w-full" />
          <ml-field-error [control]="form.controls.nombre" [submitted]="enviado()" />
        </div>
        <div>
          <label class="field-label" for="u-usuario">Usuario</label>
          <input pInputText id="u-usuario" formControlName="usuario" class="w-full" autocomplete="off" />
          <ml-field-error [control]="form.controls.usuario" [submitted]="enviado()" />
        </div>
        <div>
          <label class="field-label" for="u-correo">Correo</label>
          <input pInputText id="u-correo" type="email" formControlName="correo" class="w-full" />
          <ml-field-error [control]="form.controls.correo" [submitted]="enviado()" />
        </div>
        <div class="sm:col-span-2">
          <span class="field-label" id="u-rol">Rol</span>
          <p-selectbutton formControlName="rol" [options]="roles" optionLabel="label" optionValue="value" [allowEmpty]="false" ariaLabelledBy="u-rol" />
          <p class="field-hint">Administración puede gestionar usuarios, sucursales y la configuración.</p>
        </div>
        <div>
          <label class="field-label" for="u-pass">{{ editando() ? 'Nueva contraseña' : 'Contraseña temporal' }}</label>
          <p-password class="ml-fluid" inputId="u-pass" formControlName="contrasena" [toggleMask]="true" inputStyleClass="w-full" autocomplete="new-password" appendTo="body" />
        </div>
        <div class="flex items-center gap-3 self-end pb-2">
          <p-toggleswitch inputId="u-activo" formControlName="activo" />
          <label for="u-activo" class="text-sm text-bone-800">Cuenta activa</label>
        </div>
      </form>
      <ng-template #footer>
        <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="dialogo.set(false)" />
        <p-button type="submit" form="form-usuario" label="Guardar" [loading]="guardando()" />
      </ng-template>
    </p-dialog>
  `,
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
