import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';

import { MockApiService } from '@core/api/mock-api.service';
import { Paciente } from '@core/models';
import { coincide, edad, nombreCompleto } from '@core/util/format';
import { EmptyState } from '@shared/ui/empty-state';
import { PageHeader } from '@shared/ui/page-header';
import { SearchField } from '@shared/ui/search-field';
import { ShareLinkDialog } from '@shared/ui/share-link-dialog';
import { PacienteFormDialog } from './paciente-form-dialog';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, TableModule, ButtonModule, PageHeader, SearchField, EmptyState, PacienteFormDialog, ShareLinkDialog],
  templateUrl: './pacientes-page.html',
})
export default class PacientesPage {
  private readonly api = inject(MockApiService);

  protected readonly consulta = signal('');
  protected readonly dialogo = signal(false);
  protected readonly dialogoCompartir = signal(false);
  protected readonly seleccionado = signal<Paciente | null>(null);
  protected readonly compartirCon = signal<string | null>(null);

  private readonly conteo = computed(() => {
    const m = new Map<string, number>();
    for (const o of this.api.ordenes()) m.set(o.pacienteId, (m.get(o.pacienteId) ?? 0) + 1);
    return m;
  });

  protected readonly filtrados = computed(() =>
    this.api
      .pacientes()
      .filter((p) => coincide(this.consulta(), nombreCompleto(p), p.telefono, p.correo))
      .map((p) => ({ ...p, edad: edad(p.fechaNacimiento), ordenes: this.conteo().get(p.id) ?? 0 })),
  );

  protected abrir(p: Paciente | null): void {
    this.seleccionado.set(p);
    this.dialogo.set(true);
  }

  protected compartir(p: Paciente): void {
    this.compartirCon.set(null);
    queueMicrotask(() => {
      this.compartirCon.set(p.id);
      this.dialogoCompartir.set(true);
    });
  }
}
