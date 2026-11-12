import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

import { MockApiService } from '@core/api/mock-api.service';
import { OrdenesVistaService } from '@core/api/ordenes-vista.service';
import { descargarResultado } from '@core/util/descarga';
import { edad, folio, nombreCompleto, tamanoLegible } from '@core/util/format';
import { EmptyState } from '@shared/ui/empty-state';
import { FileDropzone } from '@shared/ui/file-dropzone';
import { ShareLinkDialog } from '@shared/ui/share-link-dialog';
import { StatusBadge } from '@shared/ui/status-badge';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePipe, CurrencyPipe, ButtonModule, TooltipModule, StatusBadge, FileDropzone, ShareLinkDialog, EmptyState],
  templateUrl: './orden-detalle-page.html',
  styleUrl: './orden-detalle-page.css',
})
export default class OrdenDetallePage {
  readonly id = input.required<string>();

  private readonly api = inject(MockApiService);
  private readonly vista = inject(OrdenesVistaService);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  protected readonly orden = computed(() => this.vista.porId().get(this.id()));
  protected readonly completa = computed(() => {
    const o = this.orden();
    return !!o && o.resultadosCargados === o.estudiosDetalle.length;
  });
  protected readonly compartir = signal(false);
  protected readonly procesando = signal(false);
  protected readonly subiendo = signal<string | null>(null);

  protected readonly fmtFolio = folio;
  protected readonly nombre = nombreCompleto;
  protected readonly edadDe = edad;
  protected readonly tamano = tamanoLegible;
  protected readonly sexo = { F: 'Mujer', M: 'Hombre', X: 'Otro' } as const;

  protected async adjuntar(estudioId: string, archivos: File[]): Promise<void> {
    this.subiendo.set(estudioId);
    await this.api.adjuntar(this.id(), estudioId, archivos);
    this.subiendo.set(null);
    this.toast.add({ severity: 'success', summary: 'Archivos adjuntados', detail: archivos.map((a) => a.name).join(', '), life: 3000 });
  }

  protected async quitar(estudioId: string, adjuntoId: string): Promise<void> {
    await this.api.quitarAdjunto(this.id(), estudioId, adjuntoId);
  }

  protected async cerrar(): Promise<void> {
    this.procesando.set(true);
    try {
      await this.api.cerrarOrden(this.id());
      this.toast.add({ severity: 'success', summary: 'Orden lista', detail: 'Ya puedes compartir los resultados.' });
      this.compartir.set(true);
    } catch (e) {
      this.toast.add({ severity: 'error', summary: 'No se pudo cerrar', detail: (e as Error).message });
    } finally {
      this.procesando.set(false);
    }
  }

  protected reabrir(): void {
    this.confirm.confirm({
      header: '¿Reabrir la orden?',
      message: 'Los resultados dejarán de poder descargarse hasta que vuelvas a marcarla como lista.',
      icon: 'pi pi-replay',
      acceptLabel: 'Reabrir',
      rejectLabel: 'Cancelar',
      rejectButtonProps: { severity: 'secondary', text: true },
      accept: async () => {
        this.procesando.set(true);
        await this.api.reabrirOrden(this.id());
        this.procesando.set(false);
        this.toast.add({ severity: 'info', summary: 'Orden reabierta' });
      },
    });
  }

  protected eliminar(): void {
    const o = this.orden();
    if (!o) return;
    this.confirm.confirm({
      header: `¿Eliminar ${folio(o.folio)}?`,
      message: 'Se borrará la orden y sus archivos. Esta acción no se puede deshacer.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar orden',
      rejectLabel: 'Cancelar',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', text: true },
      accept: async () => {
        await this.api.eliminarOrden(o.id);
        this.toast.add({ severity: 'success', summary: 'Orden eliminada', detail: folio(o.folio) });
        void this.router.navigateByUrl('/lab/ordenes');
      },
    });
  }

  protected descargar(nombreArchivo: string, estudio: string): void {
    const o = this.orden();
    if (!o || !descargarResultado(o.estado, nombreArchivo, `${estudio} - ${folio(o.folio)}`)) {
      this.toast.add({ severity: 'warn', summary: 'Aún no disponible', detail: 'La orden debe estar lista para descargar.' });
    }
  }
}
