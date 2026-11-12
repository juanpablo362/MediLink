import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { MenuItem, MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { DrawerModule } from 'primeng/drawer';
import { MenuModule } from 'primeng/menu';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';

import { SessionService } from '@core/auth/session.service';
import { iniciales } from '@core/util/format';
import { Logo } from '@shared/ui/logo';

interface NavItem {
  label: string;
  icon: string;
  link: string;
  exact?: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NgTemplateOutlet,
    FormsModule,
    SelectModule,
    MenuModule,
    AvatarModule,
    DrawerModule,
    TooltipModule,
    Logo,
  ],
  host: { class: 'block min-h-dvh' },
  templateUrl: './lab-shell.html',
})
export default class LabShell {
  protected readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);

  protected readonly colapsada = signal(localStorage.getItem('medilink.nav') === 'compacta');
  protected readonly masAbierto = signal(false);

  protected readonly principal: NavItem[] = [
    { label: 'Panel', icon: 'pi pi-objects-column', link: '/lab', exact: true },
    { label: 'Órdenes', icon: 'pi pi-clipboard', link: '/lab/ordenes' },
    { label: 'Pacientes', icon: 'pi pi-users', link: '/lab/pacientes' },
    { label: 'Médicos', icon: 'pi pi-id-card', link: '/lab/medicos' },
    { label: 'Estudios', icon: 'pi pi-list-check', link: '/lab/estudios' },
  ];

  protected readonly admin: NavItem[] = [
    { label: 'Usuarios', icon: 'pi pi-user-edit', link: '/lab/usuarios' },
    { label: 'Sucursales', icon: 'pi pi-building', link: '/lab/sucursales' },
    { label: 'Configuración', icon: 'pi pi-cog', link: '/lab/configuracion' },
  ];

  protected readonly movil = this.principal.slice(0, 4);
  protected readonly masMovil = computed(() => [
    this.principal[4]!,
    ...(this.session.esAdmin() ? this.admin : []),
  ]);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  protected readonly mostrarFab = computed(() => !this.url().startsWith('/lab/ordenes/nueva'));

  protected readonly inicialesUsuario = computed(() => iniciales(this.session.lab()?.nombre ?? ''));

  protected readonly menuUsuario: MenuItem[] = [
    {
      label: 'Cerrar sesión',
      icon: 'pi pi-sign-out',
      command: () => {
        this.session.cerrarSesion();
        void this.router.navigateByUrl('/sesion-cerrada');
      },
    },
  ];

  constructor() {
    effect(() => localStorage.setItem('medilink.nav', this.colapsada() ? 'compacta' : 'amplia'));
  }

  protected cambiarSucursal(id: string): void {
    this.session.elegirSucursal(id);
    this.toast.add({
      severity: 'info',
      summary: 'Sucursal cambiada',
      detail: `Ahora trabajas en la sucursal ${this.session.sucursalActual()?.nombre}.`,
      life: 2500,
    });
  }
}
