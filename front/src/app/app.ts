import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, ToastModule, ConfirmDialogModule],
  template: `
    <!-- Con <base href="/"> un href="#contenido" navegaría a la raíz; por eso se enfoca manualmente. -->
    <button type="button" class="skip-link" (click)="saltarAlContenido()">Saltar al contenido</button>
    <router-outlet />
    <p-toast position="top-right" [breakpoints]="{ '640px': { width: '100%', right: '0', left: '0' } }" />
    <p-confirmdialog [style]="{ width: '28rem' }" [breakpoints]="{ '640px': '92vw' }" />
  `,
})
export class App {
  protected saltarAlContenido(): void {
    const main = document.getElementById('contenido');
    main?.focus();
    main?.scrollIntoView();
  }
}
