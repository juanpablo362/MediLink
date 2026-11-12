import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { AbstractControl } from '@angular/forms';

/** Mensaje de error accesible para un control de formulario reactivo. */
@Component({
  selector: 'ml-field-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (mensaje(); as m) {
      <p class="field-error" role="alert"><i class="pi pi-exclamation-circle" aria-hidden="true"></i>{{ m }}</p>
    }
  `,
})
export class FieldError {
  readonly control = input.required<AbstractControl>();
  readonly submitted = input(false);
  readonly required = input('Este campo es obligatorio.');
  readonly pattern = input('El formato no es válido.');
  readonly email = input('Escribe un correo válido, por ejemplo nombre@dominio.com.');
  readonly min = input('El valor es demasiado bajo.');

  /** Los controles reactivos no son signals; este contador fuerza el recálculo en cada evento. */
  private readonly version = signal(0);

  protected readonly mensaje = computed(() => {
    this.version();
    const c = this.control();
    if (!c.errors || !(c.touched || this.submitted())) return null;
    if (c.errors['required']) return this.required();
    if (c.errors['email']) return this.email();
    if (c.errors['pattern']) return this.pattern();
    if (c.errors['min']) return this.min();
    return 'Revisa este campo.';
  });

  constructor() {
    effect((onCleanup) => {
      const sub = this.control().events.subscribe(() => this.version.update((v) => v + 1));
      onCleanup(() => sub.unsubscribe());
    });
  }
}
