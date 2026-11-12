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
  template: `
    <!-- Barra lateral (escritorio) -->
    <aside
      class="fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-bone-200 bg-bone-0 transition-[width] duration-200 md:flex"
      [class]="colapsada() ? 'w-[4.5rem]' : 'w-64'"
      aria-label="Navegación principal"
    >
      <div class="flex h-16 items-center gap-2 px-4" [class.justify-center]="colapsada()">
        <a routerLink="/lab" aria-label="MediLink, ir al panel"><ml-logo [compact]="colapsada()" /></a>
      </div>

      <div class="px-3 pb-2" [class.px-2]="colapsada()">
        <a
          routerLink="/lab/ordenes/nueva"
          class="btn-accent w-full"
          [pTooltip]="colapsada() ? 'Nueva orden' : ''"
          tooltipPosition="right"
          [attr.aria-label]="colapsada() ? 'Nueva orden' : null"
        >
          <i class="pi pi-plus" aria-hidden="true"></i>
          @if (!colapsada()) {
            <span>Nueva orden</span>
          }
        </a>
      </div>

      <nav class="flex-1 overflow-y-auto px-3 py-2" [class.px-2]="colapsada()">
        <ul class="grid gap-0.5" role="list">
          @for (item of principal; track item.link) {
            <li>
              <ng-container *ngTemplateOutlet="navLink; context: { $implicit: item }" />
            </li>
          }
        </ul>
        @if (session.esAdmin()) {
          <p class="eyebrow mb-2 mt-6 px-3" [class.sr-only]="colapsada()">Administración</p>
          <ul class="grid gap-0.5" role="list">
            @for (item of admin; track item.link) {
              <li>
                <ng-container *ngTemplateOutlet="navLink; context: { $implicit: item }" />
              </li>
            }
          </ul>
        }
      </nav>

      <div class="border-t border-bone-200 p-3">
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-bone-600 transition hover:bg-bone-100 hover:text-ink-900"
          [class.justify-center]="colapsada()"
          (click)="colapsada.set(!colapsada())"
          [attr.aria-expanded]="!colapsada()"
          [attr.aria-label]="colapsada() ? 'Expandir menú' : 'Contraer menú'"
        >
          <i class="pi" [class]="colapsada() ? 'pi-angle-double-right' : 'pi-angle-double-left'" aria-hidden="true"></i>
          @if (!colapsada()) {
            <span>Contraer menú</span>
          }
        </button>
      </div>
    </aside>

    <ng-template #navLink let-item>
      <a
        [routerLink]="item.link"
        routerLinkActive="!bg-ink-900 !text-bone-50 [&_i]:!text-coral-300"
        [routerLinkActiveOptions]="{ exact: !!item.exact }"
        ariaCurrentWhenActive="page"
        class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-bone-700 transition hover:bg-bone-100 hover:text-ink-950"
        [class.justify-center]="colapsada()"
        [pTooltip]="colapsada() ? item.label : ''"
        tooltipPosition="right"
      >
        <i [class]="item.icon" class="text-base text-bone-500" aria-hidden="true"></i>
        <span [class.sr-only]="colapsada()">{{ item.label }}</span>
      </a>
    </ng-template>

    <div class="transition-[padding] duration-200" [class]="colapsada() ? 'md:pl-[4.5rem]' : 'md:pl-64'">
      <!-- Barra superior -->
      <header class="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-bone-200 bg-bone-50/85 px-4 backdrop-blur sm:px-6">
        <a routerLink="/lab" class="md:hidden" aria-label="MediLink, ir al panel"><ml-logo [compact]="true" /></a>

        <div class="flex min-w-0 items-center gap-2">
          <i class="pi pi-building hidden text-bone-500 sm:inline" aria-hidden="true"></i>
          @if (session.sucursalesDelUsuario().length > 1) {
            <label for="sucursal" class="sr-only">Sucursal activa</label>
            <p-select
              inputId="sucursal"
              [options]="session.sucursalesDelUsuario()"
              optionLabel="nombre"
              optionValue="id"
              [ngModel]="session.sucursalActual()?.id"
              (ngModelChange)="cambiarSucursal($event)"
              size="small"
              class="min-w-36"
            >
              <ng-template #selectedItem let-s>Sucursal {{ s.nombre }}</ng-template>
            </p-select>
          } @else {
            <span class="truncate text-sm font-medium text-bone-700">Sucursal {{ session.sucursalActual()?.nombre }}</span>
          }
        </div>

        <div class="ml-auto flex items-center gap-2">
          <button
            type="button"
            class="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition hover:bg-bone-100"
            (click)="menu.toggle($event)"
            aria-haspopup="menu"
            aria-controls="menu-usuario"
          >
            <p-avatar [label]="inicialesUsuario()" shape="circle" class="!bg-ink-100 !text-ink-800 !text-sm !font-semibold" />
            <span class="hidden text-left leading-tight sm:block">
              <span class="block text-sm font-semibold text-ink-950">{{ session.lab()?.nombre }}</span>
              <span class="block text-xs text-bone-500">{{ session.esAdmin() ? 'Administración' : 'Laboratorio' }}</span>
            </span>
            <i class="pi pi-chevron-down text-xs text-bone-500" aria-hidden="true"></i>
          </button>
          <p-menu #menu id="menu-usuario" [model]="menuUsuario" [popup]="true" appendTo="body" />
        </div>
      </header>

      <main id="contenido" tabindex="-1" class="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 outline-none sm:px-6 md:pb-12 lg:px-8">
        <router-outlet />
      </main>
    </div>

    <!-- Barra inferior (celular) -->
    <nav
      class="fixed inset-x-0 bottom-0 z-30 border-t border-bone-200 bg-bone-0/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label="Navegación principal"
    >
      <ul class="grid grid-cols-5" role="list">
        @for (item of movil; track item.link) {
          <li>
            <a
              [routerLink]="item.link"
              routerLinkActive="!text-ink-900 [&_.dot]:opacity-100"
              [routerLinkActiveOptions]="{ exact: !!item.exact }"
              ariaCurrentWhenActive="page"
              class="relative flex min-h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium text-bone-500"
            >
              <span class="dot absolute top-1.5 h-1 w-6 rounded-full bg-coral-500 opacity-0 transition" aria-hidden="true"></span>
              <i [class]="item.icon" class="text-lg" aria-hidden="true"></i>
              {{ item.label }}
            </a>
          </li>
        }
        <li>
          <button
            type="button"
            class="flex min-h-16 w-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium text-bone-500"
            (click)="masAbierto.set(true)"
            aria-haspopup="dialog"
          >
            <i class="pi pi-bars text-lg" aria-hidden="true"></i>
            Más
          </button>
        </li>
      </ul>
    </nav>

    @if (mostrarFab()) {
      <a
        routerLink="/lab/ordenes/nueva"
        class="btn-accent fixed bottom-20 right-4 z-30 size-14 !rounded-2xl !p-0 shadow-raised md:hidden"
        aria-label="Nueva orden"
      >
        <i class="pi pi-plus text-lg" aria-hidden="true"></i>
      </a>
    }

    <p-drawer [(visible)]="masAbierto" position="bottom" header="Más opciones" styleClass="!h-auto rounded-t-2xl">
      <ul class="grid gap-1 pb-4" role="list">
        @for (item of masMovil(); track item.link) {
          <li>
            <a
              [routerLink]="item.link"
              (click)="masAbierto.set(false)"
              class="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-bone-800 hover:bg-bone-100"
            >
              <i [class]="item.icon" class="text-bone-500" aria-hidden="true"></i>{{ item.label }}
            </a>
          </li>
        }
      </ul>
    </p-drawer>
  `,
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
