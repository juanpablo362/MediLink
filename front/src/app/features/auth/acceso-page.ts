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
  templateUrl: './acceso-page.html',
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
