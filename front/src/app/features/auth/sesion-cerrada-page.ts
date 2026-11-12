import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { Logo } from '@shared/ui/logo';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonModule, Logo],
  template: `
    <main id="contenido" tabindex="-1" class="grid min-h-dvh place-items-center px-5 outline-none">
      <div class="w-full max-w-sm animate-rise text-center">
        <ml-logo class="justify-center" />
        <span class="mx-auto mt-10 grid size-14 place-items-center rounded-2xl bg-ok-50 text-xl text-ok-700" aria-hidden="true">
          <i class="pi pi-check"></i>
        </span>
        <h1 class="mt-5 text-2xl font-semibold">Cerraste sesión</h1>
        <p class="mt-2 text-sm text-bone-600">
          Por seguridad, cierra también esta pestaña si usas un equipo compartido.
        </p>
        <a pButton routerLink="/acceso" class="mt-8">
          <i pButtonIcon class="pi pi-sign-in" aria-hidden="true"></i><span pButtonLabel>Volver a entrar</span>
        </a>
      </div>
    </main>
  `,
})
export default class SesionCerradaPage {}
