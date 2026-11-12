import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SliderModule } from 'primeng/slider';
import { TooltipModule } from 'primeng/tooltip';

import { MockApiService } from '@core/api/mock-api.service';
import { OrdenesVistaService } from '@core/api/ordenes-vista.service';
import { SessionService } from '@core/auth/session.service';
import { folio, nombreCompleto } from '@core/util/format';

const CORTES = 24;

/**
 * Visor DICOM simulado: dibuja cortes procedurales en canvas.
 * Se reemplazará por un visor real (p. ej. Cornerstone3D) cuando exista backend.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FormsModule, DatePipe, SliderModule, TooltipModule],
  host: { class: 'block', '(document:keydown)': 'tecla($event)' },
  templateUrl: './visor-page.html',
})
export default class VisorPage {
  readonly ordenId = input.required<string>();
  readonly estudioId = input.required<string>();
  readonly token = input<string>();

  private readonly api = inject(MockApiService);
  private readonly vista = inject(OrdenesVistaService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly lienzo = viewChild<ElementRef<HTMLCanvasElement>>('lienzo');

  protected readonly total = CORTES;
  protected readonly fmtFolio = folio;
  protected readonly nombre = nombreCompleto;

  protected readonly corte = signal(Math.floor(CORTES / 2));
  protected readonly zoom = signal(1);
  protected readonly rotacion = signal(0);
  protected readonly brillo = signal(100);
  protected readonly contraste = signal(100);
  protected readonly invertido = signal(false);

  protected readonly esMedico = computed(() => this.router.url.startsWith('/medico'));
  protected readonly enShell = computed(() => !this.token());

  protected readonly herramientas = [
    { id: 'acercar', label: 'Acercar', icon: 'pi pi-search-plus' },
    { id: 'alejar', label: 'Alejar', icon: 'pi pi-search-minus' },
    { id: 'rotar', label: 'Rotar 90°', icon: 'pi pi-refresh' },
    { id: 'invertir', label: 'Invertir colores', icon: 'pi pi-sun' },
    { id: 'reiniciar', label: 'Restablecer vista', icon: 'pi pi-replay' },
  ] as const;

  /** Aplica las mismas reglas de acceso que el resto de la app. */
  protected readonly orden = computed(() => {
    const o = this.vista.porId().get(this.ordenId());
    if (!o || !o.estudiosDetalle.some((e) => e.id === this.estudioId() && e.dicom)) return undefined;
    const token = this.token();
    if (token) {
      const valido = this.api.enlaceVigente(token);
      return valido?.pacienteId === o.pacienteId && o.estado === 'cerrada' ? o : undefined;
    }
    if (this.esMedico()) {
      return o.medicoId === this.session.medico()?.medicoId && o.estado === 'cerrada' ? o : undefined;
    }
    return o;
  });

  protected readonly estudio = computed(() => this.orden()?.estudiosDetalle.find((e) => e.id === this.estudioId()));

  protected readonly volver = computed(() => {
    const token = this.token();
    if (token) return ['/r', token];
    if (this.esMedico()) return ['/medico'];
    return ['/lab/ordenes', this.ordenId()];
  });

  protected readonly filtro = computed(
    () => `brightness(${this.brillo()}%) contrast(${this.contraste()}%) ${this.invertido() ? 'invert(1)' : ''}`,
  );

  constructor() {
    effect(() => {
      const canvas = this.lienzo()?.nativeElement;
      const clave = this.estudio()?.clave ?? '';
      if (canvas) dibujarCorte(canvas, this.corte(), clave);
    });
  }

  protected accion(id: (typeof this.herramientas)[number]['id']): void {
    switch (id) {
      case 'acercar':
        this.zoom.update((z) => Math.min(4, +(z + 0.25).toFixed(2)));
        break;
      case 'alejar':
        this.zoom.update((z) => Math.max(0.5, +(z - 0.25).toFixed(2)));
        break;
      case 'rotar':
        this.rotacion.update((r) => (r + 90) % 360);
        break;
      case 'invertir':
        this.invertido.update((v) => !v);
        break;
      case 'reiniciar':
        this.zoom.set(1);
        this.rotacion.set(0);
        this.brillo.set(100);
        this.contraste.set(100);
        this.invertido.set(false);
        break;
    }
  }

  protected rueda(e: WheelEvent): void {
    e.preventDefault();
    this.moverCorte(e.deltaY > 0 ? 1 : -1);
  }

  protected tecla(e: KeyboardEvent): void {
    const objetivo = e.target as HTMLElement;
    if (!this.orden() || objetivo.closest('input, textarea, [role="slider"]')) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      this.moverCorte(e.key === 'ArrowDown' ? 1 : -1);
    }
  }

  protected moverCorte(delta: number): void {
    this.corte.update((c) => Math.min(CORTES - 1, Math.max(0, c + delta)));
  }
}

/** Genera un corte pseudoanatómico determinista para la demo. */
function dibujarCorte(canvas: HTMLCanvasElement, corte: number, clave: string): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const c = w / 2;
  const t = corte / (CORTES - 1);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, w);

  let semilla = corte * 9301 + clave.length * 49297;
  const azar = () => ((semilla = (semilla * 9301 + 49297) % 233280) / 233280);

  const radio = (0.32 + Math.sin(t * Math.PI) * 0.08) * w;
  const cuerpo = ctx.createRadialGradient(c, c, radio * 0.1, c, c, radio);
  cuerpo.addColorStop(0, '#7a7a7a');
  cuerpo.addColorStop(0.85, '#5a5a5a');
  cuerpo.addColorStop(1, '#2a2a2a');
  ctx.fillStyle = cuerpo;
  ctx.beginPath();
  ctx.ellipse(c, c, radio, radio * (clave.startsWith('TC') ? 1.12 : 0.82), 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = w * 0.03;
  ctx.strokeStyle = '#e8e8e8';
  ctx.beginPath();
  ctx.ellipse(c, c, radio * 0.94, radio * (clave.startsWith('TC') ? 1.05 : 0.76), 0, 0, Math.PI * 2);
  ctx.stroke();

  if (clave.startsWith('RX') || clave.startsWith('US')) {
    for (const lado of [-1, 1]) {
      ctx.fillStyle = '#1b1b1b';
      ctx.beginPath();
      ctx.ellipse(c + lado * radio * 0.42, c, radio * 0.3, radio * 0.5 * (0.7 + t * 0.4), lado * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#d0d0d0';
    ctx.beginPath();
    ctx.ellipse(c, c + radio * 0.45, radio * 0.11, radio * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#8c8c8c';
    ctx.beginPath();
    ctx.ellipse(c, c, radio * 0.7, radio * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a3a3a';
    for (const lado of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(c + lado * radio * 0.12, c - radio * 0.05, radio * 0.06, radio * (0.18 + t * 0.12), lado * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const img = ctx.getImageData(0, 0, w, w);
  for (let i = 0; i < img.data.length; i += 4) {
    const ruido = (azar() - 0.5) * 18;
    img.data[i] = img.data[i]! + ruido;
    img.data[i + 1] = img.data[i + 1]! + ruido;
    img.data[i + 2] = img.data[i + 2]! + ruido;
  }
  ctx.putImageData(img, 0, 0);
}
