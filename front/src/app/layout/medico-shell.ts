import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';

import { MockApiService } from '@core/api/mock-api.service';
import { SessionService } from '@core/auth/session.service';
import { iniciales } from '@core/util/format';
import { Logo } from '@shared/ui/logo';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, AvatarModule, ButtonModule, Logo],
  host: { class: 'block min-h-dvh' },
  template: `
    <header class="sticky top-0 z-20 border-b border-bone-200 bg-bone-0/90 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <a routerLink="/medico" aria-label="MediLink, ir a mis pacientes"><ml-logo /></a>
        <span class="hidden rounded-full bg-ink-50 px-2.5 py-1 text-xs font-semibold text-ink-700 sm:inline">Portal médico</span>
        <div class="ml-auto flex items-center gap-3">
          <p-avatar [label]="ini()" shape="circle" class="!bg-ink-100 !text-ink-800 !text-sm !font-semibold" />
          <span class="hidden leading-tight sm:block">
            <span class="block text-sm font-semibold text-ink-950">{{ session.medico()?.nombre }}</span>
            <span class="block text-xs text-bone-500">{{ especialidad() }}</span>
          </span>
          <p-button
            icon="pi pi-sign-out"
            [text]="true"
            severity="secondary"
            ariaLabel="Cerrar sesión"
            label="Salir"
            styleClass="!px-2 sm:!px-3"
            (onClick)="salir()"
          />
        </div>
      </div>
    </header>
    <main id="contenido" tabindex="-1" class="mx-auto w-full max-w-6xl px-4 py-6 outline-none sm:px-6 sm:py-8">
      <router-outlet />
    </main>
  `,
})
export default class MedicoShell {
  protected readonly session = inject(SessionService);
  private readonly api = inject(MockApiService);
  private readonly router = inject(Router);

  protected readonly ini = computed(() => iniciales(this.session.medico()?.nombre ?? ''));
  protected readonly especialidad = computed(() => {
    const id = this.session.medico()?.medicoId;
    return id ? this.api.medicosPorId().get(id)?.especialidad : '';
  });

  protected salir(): void {
    this.session.cerrarSesion();
    void this.router.navigateByUrl('/sesion-cerrada');
  }
}
