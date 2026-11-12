import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { SelectButtonModule } from 'primeng/selectbutton';

import { SessionService } from '@core/auth/session.service';
import { Sucursal } from '@core/models';
import { Logo } from '@shared/ui/logo';

type Perfil = 'lab' | 'medico';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ReactiveFormsModule, ButtonModule, InputTextModule, PasswordModule, SelectButtonModule, MessageModule, Logo],
  host: { class: 'grid min-h-dvh lg:grid-cols-[1.05fr_1fr]' },
  template: `
    <!-- Panel de marca -->
    <aside class="relative hidden overflow-hidden bg-ink-950 p-12 text-bone-100 lg:flex lg:flex-col">
      <div class="pointer-events-none absolute inset-0 opacity-[0.14]" aria-hidden="true">
        <svg class="h-full w-full" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0H0V40" fill="none" stroke="#aed7da" stroke-width="0.6" />
            </pattern>
          </defs>
          <rect width="600" height="800" fill="url(#grid)" />
          <path
            d="M0 470 L150 470 L180 420 L215 540 L250 330 L285 500 L310 470 L600 470"
            fill="none"
            stroke="#f27a52"
            stroke-width="3"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <ml-logo [inverse]="true" class="relative" />
      <div class="relative mt-auto max-w-md">
        <p class="eyebrow !text-ink-300">Laboratorios y centros de diagnóstico</p>
        <h1 class="mt-3 text-4xl font-semibold leading-[1.1] !text-bone-50">
          Del registro de la orden al resultado en manos del paciente.
        </h1>
        <p class="mt-4 text-base leading-relaxed text-ink-200">
          Órdenes, archivos PDF y DICOM, y enlaces seguros para médicos y pacientes en una sola plataforma.
        </p>
        <ul class="mt-8 grid gap-3 text-sm text-ink-100">
          @for (b of beneficios; track b.texto) {
            <li class="flex items-center gap-3">
              <span class="grid size-8 place-items-center rounded-lg bg-ink-800 text-coral-300" aria-hidden="true">
                <i [class]="b.icono"></i>
              </span>
              {{ b.texto }}
            </li>
          }
        </ul>
      </div>
    </aside>

    <!-- Formulario -->
    <main id="contenido" tabindex="-1" class="flex flex-col px-5 py-8 outline-none sm:px-10 lg:px-16">
      <ml-logo class="lg:hidden" />
      <div class="mx-auto my-auto w-full max-w-sm animate-rise py-10">
        @if (sucursales().length > 1) {
          <h2 class="text-2xl font-semibold">Elige tu sucursal</h2>
          <p class="mt-1.5 text-sm text-bone-600">Tu cuenta tiene acceso a varias sucursales. Puedes cambiarla después.</p>
          <ul class="mt-6 grid gap-3" role="list">
            @for (s of sucursales(); track s.id) {
              <li>
                <button
                  type="button"
                  class="surface-card group flex w-full items-center gap-4 p-4 text-left transition hover:border-ink-400"
                  (click)="elegir(s)"
                >
                  <span class="grid size-11 place-items-center rounded-xl bg-ink-50 text-ink-700" aria-hidden="true">
                    <i class="pi pi-building"></i>
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block font-semibold text-ink-950">Sucursal {{ s.nombre }}</span>
                    <span class="block truncate text-sm text-bone-500">{{ s.direccion }}</span>
                  </span>
                  <i class="pi pi-arrow-right text-bone-400 transition group-hover:translate-x-0.5 group-hover:text-ink-700" aria-hidden="true"></i>
                </button>
              </li>
            }
          </ul>
          <p-button label="Usar otra cuenta" [text]="true" icon="pi pi-arrow-left" styleClass="mt-4" (onClick)="reiniciar()" />
        } @else {
          <h2 class="text-2xl font-semibold">Inicia sesión</h2>
          <p class="mt-1.5 text-sm text-bone-600">Elige cómo entras a MediLink.</p>

          <p-selectbutton
            class="mt-6"
            [options]="perfiles"
            optionLabel="label"
            optionValue="value"
            [allowEmpty]="false"
            [fluid]="true"
            ariaLabelledBy="perfil-label"
            [ngModel]="perfil()"
            (ngModelChange)="cambiarPerfil($event)"
          />
          <span id="perfil-label" class="sr-only">Tipo de cuenta</span>

          <form class="mt-6 grid gap-5" [formGroup]="form" (ngSubmit)="entrar()" novalidate>
            <div>
              <label for="usuario" class="field-label">Usuario</label>
              <input
                pInputText
                id="usuario"
                formControlName="usuario"
                autocomplete="username"
                class="w-full"
                [attr.aria-invalid]="invalido('usuario')"
                [attr.aria-describedby]="invalido('usuario') ? 'usuario-error' : null"
              />
              @if (invalido('usuario')) {
                <p id="usuario-error" class="field-error"><i class="pi pi-exclamation-circle" aria-hidden="true"></i>Escribe tu usuario.</p>
              }
            </div>
            <div>
              <label for="contrasena" class="field-label">Contraseña</label>
              <p-password
                class="ml-fluid"
                inputId="contrasena"
                formControlName="contrasena"
                [feedback]="false"
                [toggleMask]="true"
                autocomplete="current-password"
                inputStyleClass="w-full"
              />
              @if (invalido('contrasena')) {
                <p class="field-error"><i class="pi pi-exclamation-circle" aria-hidden="true"></i>Escribe tu contraseña.</p>
              }
            </div>

            @if (error()) {
              <p-message severity="error" icon="pi pi-times-circle">{{ error() }}</p-message>
            }

            <p-button type="submit" label="Entrar" icon="pi pi-arrow-right" iconPos="right" [loading]="cargando()" [fluid]="true" />
          </form>

          <div class="mt-8 rounded-xl border border-dashed border-bone-300 bg-bone-100/60 p-4 text-sm">
            <p class="font-semibold text-ink-900">Cuentas de demostración</p>
            <p class="mt-0.5 text-bone-600">Cualquier contraseña funciona.</p>
            <div class="mt-3 flex flex-wrap gap-2">
              @for (d of demos[perfil()]; track d.usuario) {
                <button
                  type="button"
                  class="rounded-full border border-bone-300 bg-bone-0 px-3 py-1 text-xs font-medium text-ink-800 transition hover:border-ink-400"
                  (click)="usarDemo(d.usuario)"
                >
                  {{ d.etiqueta }}
                </button>
              }
            </div>
          </div>
        }
      </div>
      <p class="text-center text-xs text-bone-500">
        ¿Eres paciente? Abre el enlace que te envió tu laboratorio; no necesitas cuenta.
      </p>
    </main>
  `,
})
export default class AccesoPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  /** Query param ?perfil=medico */
  readonly perfilParam = input<string | undefined>(undefined, { alias: 'perfil' });

  protected readonly perfil = signal<Perfil>('lab');
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly sucursales = signal<Sucursal[]>([]);
  private enviado = signal(false);

  protected readonly perfiles = [
    { label: 'Laboratorio', value: 'lab' },
    { label: 'Médico', value: 'medico' },
  ];

  protected readonly beneficios = [
    { icono: 'pi pi-file-check', texto: 'Resultados PDF y DICOM en un mismo expediente' },
    { icono: 'pi pi-link', texto: 'Enlaces seguros con vigencia para pacientes' },
    { icono: 'pi pi-user-plus', texto: 'Acceso para médicos a los estudios de sus pacientes' },
  ];

  protected readonly demos: Record<Perfil, { usuario: string; etiqueta: string }[]> = {
    lab: [
      { usuario: 'mochoa', etiqueta: 'Administradora · 2 sucursales' },
      { usuario: 'trivera', etiqueta: 'Laboratorista' },
    ],
    medico: [
      { usuario: 'emarquez', etiqueta: 'Dra. Elena Márquez' },
      { usuario: 'rsaldana', etiqueta: 'Dr. Rodrigo Saldaña' },
    ],
  };

  protected readonly form = this.fb.nonNullable.group({
    usuario: ['', Validators.required],
    contrasena: ['', Validators.required],
  });

  protected cambiarPerfil(v: Perfil): void {
    this.perfil.set(v);
    this.error.set(null);
  }

  ngOnInit(): void {
    if (this.perfilParam() === 'medico') this.perfil.set('medico');
    const s = this.session.sesion();
    if (s) void this.router.navigateByUrl(s.tipo === 'lab' ? '/lab' : '/medico');
  }

  protected invalido(campo: 'usuario' | 'contrasena'): boolean {
    const c = this.form.controls[campo];
    return c.invalid && (c.touched || this.enviado());
  }

  protected usarDemo(usuario: string): void {
    this.form.setValue({ usuario, contrasena: 'demo' });
  }

  protected async entrar(): Promise<void> {
    this.enviado.set(true);
    if (this.form.invalid) return;
    this.cargando.set(true);
    this.error.set(null);
    const { usuario, contrasena } = this.form.getRawValue();
    const r =
      this.perfil() === 'lab'
        ? await this.session.accederLaboratorio(usuario, contrasena)
        : await this.session.accederMedico(usuario, contrasena);
    this.cargando.set(false);
    if (!r.ok) {
      this.error.set(r.mensaje);
      return;
    }
    if (this.perfil() === 'medico') {
      void this.router.navigateByUrl('/medico');
    } else if (r.sucursales.length > 1) {
      this.sucursales.set(r.sucursales);
    } else {
      void this.router.navigateByUrl('/lab');
    }
  }

  protected elegir(s: Sucursal): void {
    this.session.elegirSucursal(s.id);
    void this.router.navigateByUrl('/lab');
  }

  protected reiniciar(): void {
    this.sucursales.set([]);
    this.form.reset();
    this.enviado.set(false);
  }
}
