import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, ToastModule, ConfirmDialogModule],
  templateUrl: './app.html',
})
export class App {
  protected saltarAlContenido(): void {
    const main = document.getElementById('contenido');
    main?.focus();
    main?.scrollIntoView();
  }
}
