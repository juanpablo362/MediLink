import { Injectable, WritableSignal, computed, signal } from '@angular/core';

import { environment } from '@env/environment';
import {
  buildActividadSeed,
  buildEnlacesSeed,
  buildOrdenesSeed,
  estudiosSeed,
  institucionSeed,
  medicosSeed,
  pacientesSeed,
  sucursalesSeed,
  usuariosSeed,
} from '@core/data/seed';
import {
  Actividad,
  ActividadTipo,
  Adjunto,
  EnlaceSeguro,
  Estudio,
  Id,
  Institucion,
  Medico,
  NuevaOrden,
  Orden,
  Paciente,
  Sucursal,
  TipoArchivo,
  Usuario,
} from '@core/models';

const wait = (ms = environment.mockLatencyMs) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

type ConId = { id: Id };

/**
 * API en memoria que imita al backend REST. Todo se pierde al recargar la página.
 * Las lecturas son signals; las escrituras son async para simular la red.
 */
@Injectable({ providedIn: 'root' })
export class MockApiService {
  private readonly _ordenes = signal<Orden[]>(buildOrdenesSeed());
  private readonly _pacientes = signal<Paciente[]>(structuredClone(pacientesSeed));
  private readonly _medicos = signal<Medico[]>(structuredClone(medicosSeed));
  private readonly _estudios = signal<Estudio[]>(structuredClone(estudiosSeed));
  private readonly _usuarios = signal<Usuario[]>(structuredClone(usuariosSeed));
  private readonly _sucursales = signal<Sucursal[]>(structuredClone(sucursalesSeed));
  private readonly _institucion = signal<Institucion>(structuredClone(institucionSeed));
  private readonly _enlaces = signal<EnlaceSeguro[]>(buildEnlacesSeed());
  private readonly _actividad = signal<Actividad[]>(buildActividadSeed(this._ordenes()));

  readonly ordenes = this._ordenes.asReadonly();
  readonly pacientes = this._pacientes.asReadonly();
  readonly medicos = this._medicos.asReadonly();
  readonly estudios = this._estudios.asReadonly();
  readonly usuarios = this._usuarios.asReadonly();
  readonly sucursales = this._sucursales.asReadonly();
  readonly institucion = this._institucion.asReadonly();
  readonly actividad = this._actividad.asReadonly();

  readonly pacientesPorId = computed(() => new Map(this._pacientes().map((p) => [p.id, p])));
  readonly medicosPorId = computed(() => new Map(this._medicos().map((m) => [m.id, m])));
  readonly estudiosPorId = computed(() => new Map(this._estudios().map((e) => [e.id, e])));
  readonly sucursalesPorId = computed(() => new Map(this._sucursales().map((s) => [s.id, s])));

  // ---------- Órdenes ----------

  async crearOrden(datos: NuevaOrden, sucursalId: Id): Promise<Orden> {
    await wait();
    const porId = this.estudiosPorId();
    const folio = Math.max(0, ...this._ordenes().map((o) => o.folio)) + 1;
    const orden: Orden = {
      id: `o${folio}`,
      folio,
      pacienteId: datos.pacienteId,
      medicoId: datos.medicoId,
      medicoExterno: datos.medicoExterno,
      sucursalId,
      estudios: datos.estudioIds.map((estudioId) => ({ estudioId, adjuntos: [] })),
      estado: 'abierta',
      fechaRegistro: new Date().toISOString(),
      fechaEntrega: datos.fechaEntrega,
      fechaCierre: null,
      entrega: datos.entrega,
      total: datos.estudioIds.reduce((acc, id) => acc + (porId.get(id)?.precio ?? 0), 0),
      notas: datos.notas,
    };
    this._ordenes.update((list) => [...list, orden]);
    this.registrar('orden-creada', orden.id, 'Orden registrada');
    return orden;
  }

  async adjuntar(ordenId: Id, estudioId: Id, archivos: File[]): Promise<void> {
    await wait(600);
    const nuevos: Adjunto[] = archivos.map((f) => ({
      id: uid('a'),
      nombre: f.name,
      tipo: tipoDeArchivo(f.name),
      tamano: f.size,
      fecha: new Date().toISOString(),
    }));
    this.actualizarOrden(ordenId, (o) => ({
      ...o,
      estudios: o.estudios.map((e) => (e.estudioId === estudioId ? { ...e, adjuntos: [...e.adjuntos, ...nuevos] } : e)),
    }));
    this.registrar('resultado-adjunto', ordenId, `${nuevos.length} archivo(s) adjuntado(s)`);
  }

  async quitarAdjunto(ordenId: Id, estudioId: Id, adjuntoId: Id): Promise<void> {
    await wait(200);
    this.actualizarOrden(ordenId, (o) => ({
      ...o,
      estudios: o.estudios.map((e) =>
        e.estudioId === estudioId ? { ...e, adjuntos: e.adjuntos.filter((a) => a.id !== adjuntoId) } : e,
      ),
    }));
  }

  async cerrarOrden(ordenId: Id): Promise<void> {
    await wait();
    const orden = this._ordenes().find((o) => o.id === ordenId);
    if (!orden || orden.estudios.some((e) => e.adjuntos.length === 0)) {
      throw new Error('Todos los estudios necesitan al menos un resultado antes de cerrar la orden.');
    }
    this.actualizarOrden(ordenId, (o) => ({ ...o, estado: 'cerrada', fechaCierre: new Date().toISOString() }));
    this.registrar('orden-cerrada', ordenId, 'Resultados listos');
  }

  async reabrirOrden(ordenId: Id): Promise<void> {
    await wait();
    this.actualizarOrden(ordenId, (o) => ({ ...o, estado: 'abierta', fechaCierre: null }));
    this.registrar('orden-reabierta', ordenId, 'Orden reabierta');
  }

  async eliminarOrden(ordenId: Id): Promise<void> {
    await wait();
    this._ordenes.update((list) => list.filter((o) => o.id !== ordenId));
    this._actividad.update((list) => list.filter((a) => a.ordenId !== ordenId));
  }

  // ---------- Enlaces seguros ----------

  async crearEnlace(pacienteId: Id, ordenId?: Id): Promise<EnlaceSeguro> {
    await wait(250);
    const dias = this._institucion().vigenciaEnlaceDias;
    const expira = new Date();
    expira.setDate(expira.getDate() + dias);
    const enlace: EnlaceSeguro = {
      token: crypto.randomUUID().replaceAll('-', '').slice(0, 20),
      pacienteId,
      creado: new Date().toISOString(),
      expira: expira.toISOString(),
    };
    this._enlaces.update((list) => [...list, enlace]);
    if (ordenId) this.registrar('enlace-compartido', ordenId, 'Enlace seguro compartido');
    return enlace;
  }

  async resolverEnlace(token: string): Promise<{ estado: 'ok' | 'vencido' | 'invalido'; enlace?: EnlaceSeguro }> {
    await wait();
    const enlace = this._enlaces().find((e) => e.token === token);
    if (!enlace) return { estado: 'invalido' };
    if (new Date(enlace.expira) < new Date()) return { estado: 'vencido', enlace };
    return { estado: 'ok', enlace };
  }

  enlaceVigente(token: string): EnlaceSeguro | undefined {
    const enlace = this._enlaces().find((e) => e.token === token);
    return enlace && new Date(enlace.expira) >= new Date() ? enlace : undefined;
  }

  async enviarCorreo(_destino: string): Promise<void> {
    await wait(500);
  }

  // ---------- Catálogos ----------

  async guardarPaciente(p: Omit<Paciente, 'id'> & Partial<ConId>): Promise<Paciente> {
    return this.guardar(this._pacientes, p, 'p');
  }

  async guardarMedico(m: Omit<Medico, 'id'> & Partial<ConId>): Promise<Medico> {
    return this.guardar(this._medicos, m, 'm');
  }

  async guardarEstudio(e: Omit<Estudio, 'id'> & Partial<ConId>): Promise<Estudio> {
    return this.guardar(this._estudios, e, 'e');
  }

  async guardarUsuario(u: Omit<Usuario, 'id'> & Partial<ConId>): Promise<Usuario> {
    return this.guardar(this._usuarios, u, 'u');
  }

  async guardarSucursal(s: Omit<Sucursal, 'id'> & Partial<ConId>): Promise<Sucursal> {
    return this.guardar(this._sucursales, s, 's');
  }

  async guardarInstitucion(datos: Institucion): Promise<void> {
    await wait();
    this._institucion.set({ ...datos });
  }

  // ---------- Internos ----------

  private async guardar<T extends ConId>(
    store: WritableSignal<T[]>,
    item: Omit<T, 'id'> & Partial<ConId>,
    prefix: string,
  ): Promise<T> {
    await wait();
    const guardado = { ...item, id: item.id ?? uid(prefix) } as T;
    store.update((list) =>
      list.some((x) => x.id === guardado.id) ? list.map((x) => (x.id === guardado.id ? guardado : x)) : [...list, guardado],
    );
    return guardado;
  }

  private actualizarOrden(ordenId: Id, fn: (o: Orden) => Orden): void {
    this._ordenes.update((list) => list.map((o) => (o.id === ordenId ? fn(o) : o)));
  }

  private registrar(tipo: ActividadTipo, ordenId: Id, descripcion: string): void {
    this._actividad.update((list) =>
      [{ id: uid('act'), tipo, ordenId, descripcion, fecha: new Date().toISOString() }, ...list].slice(0, 30),
    );
  }
}

export function tipoDeArchivo(nombre: string): TipoArchivo {
  return /\.(dcm|dicom)$/i.test(nombre) ? 'dicom' : 'pdf';
}
