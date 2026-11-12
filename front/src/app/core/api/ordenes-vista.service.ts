import { Injectable, computed, inject } from '@angular/core';

import { Estudio, Medico, Orden, Paciente, Sucursal } from '@core/models';
import { MockApiService } from './mock-api.service';

export interface OrdenVista extends Orden {
  paciente: Paciente | undefined;
  medico: Medico | undefined;
  medicoNombre: string;
  sucursal: Sucursal | undefined;
  estudiosDetalle: (Estudio & { adjuntos: Orden['estudios'][number]['adjuntos'] })[];
  tieneDicom: boolean;
  resultadosCargados: number;
  vencida: boolean;
}

/** Une órdenes con pacientes, médicos y estudios para que las pantallas no repitan esa lógica. */
@Injectable({ providedIn: 'root' })
export class OrdenesVistaService {
  private readonly api = inject(MockApiService);

  readonly todas = computed<OrdenVista[]>(() => {
    const pacientes = this.api.pacientesPorId();
    const medicos = this.api.medicosPorId();
    const estudios = this.api.estudiosPorId();
    const sucursales = this.api.sucursalesPorId();
    const ahora = Date.now();
    return this.api
      .ordenes()
      .map((o) => {
        const medico = o.medicoId ? medicos.get(o.medicoId) : undefined;
        const detalle = o.estudios
          .map((e) => {
            const est = estudios.get(e.estudioId);
            return est ? { ...est, adjuntos: e.adjuntos } : null;
          })
          .filter((x): x is NonNullable<typeof x> => x !== null);
        return {
          ...o,
          paciente: pacientes.get(o.pacienteId),
          medico,
          medicoNombre: medico?.nombre ?? o.medicoExterno ?? 'Sin médico',
          sucursal: sucursales.get(o.sucursalId),
          estudiosDetalle: detalle,
          tieneDicom: detalle.some((d) => d.dicom),
          resultadosCargados: detalle.filter((d) => d.adjuntos.length > 0).length,
          vencida: o.estado === 'abierta' && new Date(o.fechaEntrega).getTime() < ahora,
        };
      })
      .sort((a, b) => b.folio - a.folio);
  });

  readonly porId = computed(() => new Map(this.todas().map((o) => [o.id, o])));
}
