import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

const EXTENSIONES = /\.(pdf|dcm|dicom)$/i;
const MAX_BYTES = 500 * 1024 * 1024;

@Component({
  selector: 'ml-file-dropzone',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <label
      [for]="inputId()"
      class="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition"
      [class]="
        arrastrando()
          ? 'border-ink-500 bg-ink-50'
          : disabled()
            ? 'cursor-not-allowed border-bone-200 bg-bone-50 opacity-60'
            : 'border-bone-300 bg-bone-0 hover:border-ink-400 hover:bg-ink-50/40'
      "
      (dragover)="onDragOver($event)"
      (dragleave)="arrastrando.set(false)"
      (drop)="onDrop($event)"
    >
      <span class="grid size-10 place-items-center rounded-full bg-ink-50 text-ink-700" aria-hidden="true">
        <i class="pi pi-cloud-upload"></i>
      </span>
      <span class="text-sm font-semibold text-ink-900">
        Arrastra archivos aquí o <span class="text-coral-700 underline underline-offset-2">elige del equipo</span>
      </span>
      <span class="text-xs text-bone-500">PDF o DICOM (.dcm), hasta 500 MB por archivo</span>
      <input
        [id]="inputId()"
        type="file"
        class="sr-only"
        accept=".pdf,.dcm,.dicom,application/pdf,application/dicom"
        multiple
        [disabled]="disabled()"
        (change)="onInput($event)"
      />
    </label>
    @if (error()) {
      <p class="field-error" role="alert"><i class="pi pi-exclamation-circle" aria-hidden="true"></i>{{ error() }}</p>
    }
  `,
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
