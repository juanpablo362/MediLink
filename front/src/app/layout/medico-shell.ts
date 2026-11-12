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
  templateUrl: './medico-shell.html',
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
