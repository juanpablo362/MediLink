import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';

import { MockApiService } from '@core/api/mock-api.service';
import { EnlaceSeguro, Id } from '@core/models';
import { nombreCompleto, telefonoWhatsApp } from '@core/util/format';

@Component({
  selector: 'ml-share-link-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogModule, ButtonModule, InputTextModule, TooltipModule, DatePipe],
  template: `
    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [draggable]="false"
      [dismissableMask]="true"
      header="Compartir resultados"
      [style]="{ width: '34rem' }"
      [breakpoints]="{ '640px': '95vw' }"
    >
      @if (paciente(); as p) {
        <p class="text-sm text-bone-600">
          Genera un enlace seguro para que <strong class="text-ink-950">{{ nombre() }}</strong> consulte sus resultados
          sin crear cuenta. El enlace caduca automáticamente.
        </p>

        <div class="mt-5">
          <label class="field-label" for="enlace-url">Enlace seguro</label>
          <div class="flex gap-2">
            <input
              pInputText
              id="enlace-url"
              class="folio w-full"
              [value]="url()"
              readonly
              [attr.aria-busy]="generando()"
              (focus)="$any($event.target).select()"
            />
            <p-button
              [icon]="copiado() ? 'pi pi-check' : 'pi pi-copy'"
              [label]="copiado() ? 'Copiado' : 'Copiar'"
              severity="secondary"
              [disabled]="!enlace()"
              (onClick)="copiar()"
            />
          </div>
          @if (enlace(); as e) {
            <p class="field-hint">
              <i class="pi pi-shield mr-1 text-[0.7rem]" aria-hidden="true"></i>Válido hasta el
              {{ e.expira | date: "dd/MM/yyyy 'a las' HH:mm" }}
            </p>
          }
        </div>

        <div class="mt-6 grid gap-2 sm:grid-cols-2">
          <p-button
            icon="pi pi-envelope"
            label="Enviar por correo"
            [pTooltip]="p.correo || 'El paciente no tiene correo registrado'"
            severity="secondary"
            [outlined]="true"
            styleClass="w-full justify-start"
            [loading]="enviando()"
            [disabled]="!enlace() || !p.correo"
            (onClick)="enviarCorreo(p.correo)"
          />
          <p-button
            icon="pi pi-whatsapp"
            label="Abrir WhatsApp"
            severity="secondary"
            [outlined]="true"
            styleClass="w-full justify-start"
            [disabled]="!enlace() || !p.telefono"
            (onClick)="abrirWhatsApp(p.telefono)"
          />
        </div>
      }
    </p-dialog>
  `,
})
export class ShareLinkDialog {
  private readonly api = inject(MockApiService);
  private readonly toast = inject(MessageService);

  readonly visible = model(false);
  readonly pacienteId = input.required<Id>();
  readonly ordenId = input<Id>();

  protected readonly enlace = signal<EnlaceSeguro | null>(null);
  protected readonly generando = signal(false);
  protected readonly enviando = signal(false);
  protected readonly copiado = signal(false);

  protected readonly paciente = computed(() => this.api.pacientesPorId().get(this.pacienteId()));
  protected readonly nombre = computed(() => nombreCompleto(this.paciente()));
  protected readonly url = computed(() => {
    const e = this.enlace();
    return e ? `${location.origin}/r/${e.token}` : 'Generando enlace…';
  });

  constructor() {
    effect(() => {
      if (this.visible() && !this.enlace() && !this.generando()) void this.generar();
    });
  }

  private async generar(): Promise<void> {
    this.generando.set(true);
    this.enlace.set(await this.api.crearEnlace(this.pacienteId(), this.ordenId()));
    this.generando.set(false);
  }

  protected async copiar(): Promise<void> {
    await navigator.clipboard.writeText(this.url());
    this.copiado.set(true);
    setTimeout(() => this.copiado.set(false), 2000);
  }

  protected async enviarCorreo(correo: string): Promise<void> {
    this.enviando.set(true);
    await this.api.enviarCorreo(correo);
    this.enviando.set(false);
    this.toast.add({ severity: 'success', summary: 'Correo enviado', detail: `Se envió el enlace a ${correo}.` });
  }

  protected abrirWhatsApp(telefono: string): void {
    const texto = `Hola ${this.paciente()?.nombre}, tus resultados de laboratorio están listos. Consúltalos aquí: ${this.url()}`;
    window.open(`https://wa.me/${telefonoWhatsApp(telefono)}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  }
}
