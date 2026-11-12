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
  template: `
    <ml-page-header title="Médicos" subtitle="Médicos que solicitan estudios. Con usuario pueden consultar los resultados de sus pacientes.">
      <p-button label="Nuevo médico" icon="pi pi-plus" (onClick)="abrir(null)" />
    </ml-page-header>

    <ml-search-field class="mt-6 max-w-md" placeholder="Nombre, especialidad o cédula" label="Buscar médicos" [(value)]="consulta" />
    <p class="sr-only" aria-live="polite">{{ filtrados().length }} médicos encontrados</p>

    <ul class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="list">
      @for (m of filtrados(); track m.id) {
        <li class="surface-card flex flex-col p-5">
          <div class="flex items-start gap-3">
            <span class="grid size-11 shrink-0 place-items-center rounded-full bg-ink-100 text-sm font-semibold text-ink-800" aria-hidden="true">
              {{ ini(m.nombre) }}
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold text-ink-950">{{ m.nombre }}</p>
              <p class="text-sm text-bone-600">{{ m.especialidad }}</p>
            </div>
            <p-button icon="pi pi-pencil" [text]="true" [rounded]="true" severity="secondary" [ariaLabel]="'Editar ' + m.nombre" (onClick)="abrir(m)" />
          </div>
          <dl class="mt-4 grid gap-1.5 text-sm text-bone-700">
            <div class="flex gap-2"><dt class="w-20 text-bone-500">Cédula</dt><dd class="folio">{{ m.cedula }}</dd></div>
            <div class="flex gap-2"><dt class="w-20 text-bone-500">Teléfono</dt><dd>{{ m.telefono }}</dd></div>
            <div class="flex gap-2"><dt class="w-20 text-bone-500">Correo</dt><dd class="truncate">{{ m.correo }}</dd></div>
          </dl>
          <p class="mt-4 flex items-center gap-2 border-t border-bone-100 pt-3 text-xs text-bone-500">
            <i class="pi pi-key" aria-hidden="true"></i>Usuario del portal: <span class="folio text-ink-800">{{ m.usuario }}</span>
          </p>
        </li>
      } @empty {
        <li class="surface-card sm:col-span-2 xl:col-span-3">
          <ml-empty-state icon="pi pi-id-card" title="Sin médicos" description="Ningún médico coincide con la búsqueda." />
        </li>
      }
    </ul>

    <p-dialog
      [(visible)]="dialogo"
      [modal]="true"
      [draggable]="false"
      [header]="editando() ? 'Editar médico' : 'Nuevo médico'"
      [style]="{ width: '36rem' }"
      [breakpoints]="{ '640px': '95vw' }"
    >
      <form id="form-medico" class="grid gap-4 sm:grid-cols-2" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        <div class="sm:col-span-2">
          <label class="field-label" for="m-nombre">Nombre completo</label>
          <input pInputText id="m-nombre" formControlName="nombre" class="w-full" placeholder="Ej. Dra. Ana López" />
          <ml-field-error [control]="form.controls.nombre" [submitted]="enviado()" />
        </div>
        <div>
          <label class="field-label" for="m-esp">Especialidad</label>
          <input pInputText id="m-esp" formControlName="especialidad" class="w-full" />
          <ml-field-error [control]="form.controls.especialidad" [submitted]="enviado()" />
        </div>
        <div>
          <label class="field-label" for="m-cedula">Cédula profesional</label>
          <input pInputText id="m-cedula" formControlName="cedula" class="w-full" inputmode="numeric" />
          <ml-field-error [control]="form.controls.cedula" [submitted]="enviado()" pattern="La cédula tiene de 7 a 8 dígitos." />
        </div>
        <div>
          <label class="field-label" for="m-tel">Teléfono</label>
          <input pInputText id="m-tel" formControlName="telefono" class="w-full" inputmode="tel" />
        </div>
        <div>
          <label class="field-label" for="m-correo">Correo</label>
          <input pInputText id="m-correo" formControlName="correo" type="email" class="w-full" />
          <ml-field-error [control]="form.controls.correo" [submitted]="enviado()" />
        </div>
        <fieldset class="rounded-xl border border-bone-200 p-4 sm:col-span-2">
          <legend class="px-1 text-sm font-semibold text-ink-950">Acceso al portal médico</legend>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="field-label" for="m-usuario">Usuario</label>
              <input pInputText id="m-usuario" formControlName="usuario" class="w-full" autocomplete="off" />
              <ml-field-error [control]="form.controls.usuario" [submitted]="enviado()" />
            </div>
            <div>
              <label class="field-label" for="m-pass">{{ editando() ? 'Nueva contraseña' : 'Contraseña' }}</label>
              <p-password class="ml-fluid" inputId="m-pass" formControlName="contrasena" [toggleMask]="true" inputStyleClass="w-full" autocomplete="new-password" appendTo="body" />
              <p class="field-hint">{{ editando() ? 'Déjala vacía para conservar la actual.' : 'Mínimo 8 caracteres.' }}</p>
            </div>
          </div>
        </fieldset>
      </form>
      <ng-template #footer>
        <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="dialogo.set(false)" />
        <p-button type="submit" form="form-medico" label="Guardar" [loading]="guardando()" />
      </ng-template>
    </p-dialog>
  `,
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
