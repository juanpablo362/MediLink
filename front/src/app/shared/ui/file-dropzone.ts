import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

const EXTENSIONES = /\.(pdf|dcm|dicom)$/i;
const MAX_BYTES = 500 * 1024 * 1024;

@Component({
  selector: 'ml-file-dropzone',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './file-dropzone.html',
})
export class FileDropzone {
  readonly inputId = input('dropzone-' + Math.random().toString(36).slice(2, 8));
  readonly disabled = input(false);
  readonly files = output<File[]>();

  protected readonly arrastrando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected onDragOver(event: DragEvent): void {
    if (this.disabled()) return;
    event.preventDefault();
    this.arrastrando.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.arrastrando.set(false);
    if (this.disabled()) return;
    this.emitir(Array.from(event.dataTransfer?.files ?? []));
  }

  protected onInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    this.emitir(Array.from(el.files ?? []));
    el.value = '';
  }

  private emitir(lista: File[]): void {
    const rechazados = lista.filter((f) => !EXTENSIONES.test(f.name) || f.size > MAX_BYTES);
    const validos = lista.filter((f) => !rechazados.includes(f));
    this.error.set(
      rechazados.length
        ? `No se agregaron ${rechazados.map((f) => f.name).join(', ')}: solo se aceptan PDF o DICOM de hasta 500 MB.`
        : null,
    );
    if (validos.length) this.files.emit(validos);
  }
}
