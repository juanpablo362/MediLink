import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { Logo } from '@shared/ui/logo';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonModule, Logo],
  template: `
    <main id="contenido" tabindex="-1" class="grid min-h-dvh place-items-center px-5 outline-none">
      <div class="w-full max-w-md animate-rise text-center">
        <ml-logo class="justify-center" />
        <p class="folio mt-10 text-coral-700">Error 404</p>
        <h1 class="mt-2 text-3xl font-semibold">No encontramos esta página</h1>
        <p class="mt-2 text-sm text-bone-600">
          Revisa la dirección. Si llegaste desde un enlace de resultados, pide al laboratorio que te envíe uno nuevo.
        </p>
        <a pButton routerLink="/acceso" class="mt-8" [outlined]="true">
          <i pButtonIcon class="pi pi-home" aria-hidden="true"></i><span pButtonLabel>Ir al inicio</span>
        </a>
      </div>
    </main>
  `,
})
export default class NotFoundPage {}
