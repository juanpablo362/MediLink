import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TextareaModule } from 'primeng/textarea';

import { MockApiService } from '@core/api/mock-api.service';
import { SessionService } from '@core/auth/session.service';
import { Estudio, FormaEntrega, Paciente } from '@core/models';
import { coincide, edad, folio, nombreCompleto } from '@core/util/format';
import { PageHeader } from '@shared/ui/page-header';
import { SearchField } from '@shared/ui/search-field';
import { PacienteFormDialog } from '../catalogos/paciente-form-dialog';

type ModoMedico = 'catalogo' | 'externo' | 'ninguno';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    CurrencyPipe,
    DatePipe,
    ButtonModule,
    SelectModule,
    SelectButtonModule,
    CheckboxModule,
    DatePickerModule,
    InputTextModule,
    TextareaModule,
    MessageModule,
    PageHeader,
    SearchField,
    PacienteFormDialog,
  ],
  templateUrl: './nueva-orden-page.html',
})
export default class NuevaOrdenPage {
  protected readonly api = inject(MockApiService);
  protected readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);

  protected readonly hoy = new Date();
  protected readonly nombre = nombreCompleto;
  protected readonly edadDe = (p: Paciente) => edad(p.fechaNacimiento);

  protected readonly pasos = [
    { n: 1, titulo: 'Paciente' },
    { n: 2, titulo: 'Médico' },
    { n: 3, titulo: 'Estudios' },
    { n: 4, titulo: 'Entrega' },
  ];
  protected readonly modosMedico: { label: string; value: ModoMedico }[] = [
    { label: 'Registrado', value: 'catalogo' },
    { label: 'Externo', value: 'externo' },
    { label: 'Sin médico', value: 'ninguno' },
  ];
  protected readonly formas: { key: keyof FormaEntrega; label: string; icono: string }[] = [
    { key: 'correo', label: 'Correo electrónico', icono: 'pi pi-envelope' },
    { key: 'whatsapp', label: 'WhatsApp', icono: 'pi pi-whatsapp' },
    { key: 'impreso', label: 'Impreso en sucursal', icono: 'pi pi-print' },
  ];

  protected readonly paso = signal(1);
  protected readonly maxPaso = signal(1);
  protected readonly dialogoPaciente = signal(false);
  protected readonly creando = signal(false);

  protected readonly pacienteId = signal<string | null>(null);
  protected readonly modoMedico = signal<ModoMedico>('catalogo');
  protected readonly medicoId = signal<string | null>(null);
  protected readonly medicoExterno = signal('');
  protected readonly seleccion = signal<Set<string>>(new Set());
  protected readonly consultaEstudios = signal('');
  protected readonly fechaEntrega = signal<Date>(new Date());
  private fechaTocada = false;
  protected readonly entrega = signal<FormaEntrega>({ impreso: false, correo: true, whatsapp: false });
  protected readonly notas = signal('');

  protected readonly opcionesPacientes = computed(() =>
    this.api
      .pacientes()
      .map((p) => ({
        id: p.id,
        etiqueta: nombreCompleto(p),
        telefono: p.telefono,
        detalle: `${edad(p.fechaNacimiento)} años · ${p.telefono}`,
      }))
      .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es')),
  );
  protected readonly paciente = computed(() => (this.pacienteId() ? this.api.pacientesPorId().get(this.pacienteId()!) : undefined));

  protected readonly estudiosPorArea = computed(() => {
    const q = this.consultaEstudios();
    const grupos = new Map<string, Estudio[]>();
    for (const e of this.api.estudios()) {
      if (!coincide(q, e.nombre, e.clave, e.area)) continue;
      grupos.set(e.area, [...(grupos.get(e.area) ?? []), e]);
    }
    return [...grupos].map(([area, estudios]) => ({ area, estudios }));
  });
  protected readonly estudiosSeleccionados = computed(() =>
    this.api.estudios().filter((e) => this.seleccion().has(e.id)),
  );
  protected readonly total = computed(() => this.estudiosSeleccionados().reduce((a, e) => a + e.precio, 0));
  protected readonly diasMax = computed(() => Math.max(1, ...this.estudiosSeleccionados().map((e) => e.diasEntrega)));
  protected readonly algunaEntrega = computed(() => Object.values(this.entrega()).some(Boolean));

  protected readonly medicoResumen = computed(() => {
    switch (this.modoMedico()) {
      case 'catalogo':
        return this.medicoId() ? this.api.medicosPorId().get(this.medicoId()!)?.nombre ?? '—' : '—';
      case 'externo':
        return this.medicoExterno().trim() || '—';
      default:
        return 'Sin médico';
    }
  });

  protected readonly pasoValido = computed(() => {
    switch (this.paso()) {
      case 1:
        return !!this.paciente();
      case 2:
        return this.modoMedico() === 'ninguno' || (this.modoMedico() === 'catalogo' ? !!this.medicoId() : !!this.medicoExterno().trim());
      case 3:
        return this.seleccion().size > 0;
      default:
        return true;
    }
  });
  protected readonly puedeCrear = computed(() => !!this.paciente() && this.seleccion().size > 0 && this.algunaEntrega());

  constructor() {
    effect(() => {
      const dias = this.diasMax();
      if (this.fechaTocada) return;
      const d = new Date();
      d.setDate(d.getDate() + dias);
      d.setHours(18, 0, 0, 0);
      this.fechaEntrega.set(d);
    });
  }

  protected avanzar(): void {
    if (!this.pasoValido()) return;
    const siguiente = this.paso() + 1;
    this.paso.set(siguiente);
    this.maxPaso.update((m) => Math.max(m, siguiente));
  }

  protected elegirFecha(fecha: Date): void {
    this.fechaTocada = true;
    this.fechaEntrega.set(fecha);
  }

  protected alternarEstudio(id: string): void {
    this.seleccion.update((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  protected alternarEntrega(key: keyof FormaEntrega, valor: boolean): void {
    this.entrega.update((e) => ({ ...e, [key]: valor }));
  }

  protected async crear(): Promise<void> {
    if (!this.puedeCrear()) return;
    this.creando.set(true);
    const modo = this.modoMedico();
    const orden = await this.api.crearOrden(
      {
        pacienteId: this.pacienteId()!,
        medicoId: modo === 'catalogo' ? this.medicoId() : null,
        medicoExterno: modo === 'externo' ? this.medicoExterno().trim() : null,
        estudioIds: [...this.seleccion()],
        fechaEntrega: this.fechaEntrega().toISOString(),
        entrega: this.entrega(),
        notas: this.notas().trim(),
      },
      this.session.lab()!.sucursalId,
    );
    this.creando.set(false);
    this.toast.add({ severity: 'success', summary: 'Orden registrada', detail: `Folio ${folio(orden.folio)}` });
    void this.router.navigate(['/lab/ordenes', orden.id]);
  }
}
