import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, WritableSignal, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '@env/environment';
import { SessionService } from '@core/auth/session.service';
import {
  Actividad,
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

interface Page<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  total: number;
}

interface ResultadosApiDto {
  estado: string;
  pacienteNombre: string;
  expira: string;
  ordenes: unknown[];
}

type ConId = { id: Id };

@Injectable({ providedIn: 'root' })
export class MockApiService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly base = environment.apiUrl;

  private readonly _ordenes = signal<Orden[]>([]);
  private readonly _pacientes = signal<Paciente[]>([]);
  private readonly _medicos = signal<Medico[]>([]);
  private readonly _estudios = signal<Estudio[]>([]);
  private readonly _usuarios = signal<Usuario[]>([]);
  private readonly _sucursales = signal<Sucursal[]>([]);
  private readonly _institucion = signal<Institucion>({
    nombre: '',
    razonSocial: '',
    rfc: '',
    telefono: '',
    correo: '',
    direccion: '',
    vigenciaEnlaceDias: 7,
  });
  private readonly _actividad = signal<Actividad[]>([]);
  private readonly _enlacesVigentes = signal<Record<string, EnlaceSeguro>>({});

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

  constructor() {
    effect(() => {
      const s = this.session.sesion();
      if (!s) {
        this._ordenes.set([]);
        this._actividad.set([]);
        return;
      }
      if (s.tipo === 'lab') {
        this._sucursales.set(s.sucursales);
        void this.cargarLaboratorio(s.sucursalId, s.rol === 'admin');
      } else {
        void this.cargarMedico();
      }
    });
  }

  async cargarLaboratorio(sucursalId: Id, esAdmin = false): Promise<void> {
    await Promise.all([
      this.refrescarOrdenes(sucursalId),
      this.refrescarActividad(sucursalId),
      this.refrescarPacientes(),
      this.refrescarMedicos(),
      this.refrescarEstudios(),
      this.refrescarInstitucion(),
      ...(esAdmin ? [this.refrescarUsuarios(), this.refrescarSucursales()] : []),
    ]);
  }

  async cargarMedico(): Promise<void> {
    await this.refrescarOrdenes();
  }

  async refrescarOrdenes(sucursalId?: Id): Promise<void> {
    let params = new HttpParams().set('page', 1).set('pageSize', 100);
    if (sucursalId) params = params.set('sucursalId', sucursalId);
    const page = await firstValueFrom(this.http.get<Page<Orden>>(`${this.base}/ordenes`, { params })).catch(() => null);
    if (page) this._ordenes.set(page.items);
  }

  async refrescarActividad(sucursalId: Id): Promise<void> {
    const params = new HttpParams().set('sucursalId', sucursalId);
    const list = await firstValueFrom(this.http.get<Actividad[]>(`${this.base}/actividad`, { params })).catch(() => null);
    if (list) this._actividad.set(list);
  }

  async refrescarPacientes(q = ''): Promise<void> {
    let params = new HttpParams().set('page', 1).set('pageSize', 100);
    if (q.trim()) params = params.set('q', q.trim());
    const page = await firstValueFrom(this.http.get<Page<Paciente>>(`${this.base}/pacientes`, { params })).catch(() => null);
    if (page) this._pacientes.set(page.items);
  }

  async refrescarMedicos(q = ''): Promise<void> {
    let params = new HttpParams().set('page', 1).set('pageSize', 100);
    if (q.trim()) params = params.set('q', q.trim());
    const page = await firstValueFrom(this.http.get<Page<Medico>>(`${this.base}/medicos`, { params })).catch(() => null);
    if (page) this._medicos.set(page.items);
  }

  async refrescarEstudios(q = ''): Promise<void> {
    let params = new HttpParams().set('page', 1).set('pageSize', 100);
    if (q.trim()) params = params.set('q', q.trim());
    const page = await firstValueFrom(this.http.get<Page<Estudio>>(`${this.base}/estudios`, { params })).catch(() => null);
    if (page) this._estudios.set(page.items);
  }

  async refrescarInstitucion(): Promise<void> {
    const inst = await firstValueFrom(this.http.get<Institucion>(`${this.base}/institucion`)).catch(() => null);
    if (inst) this._institucion.set(inst);
  }

  async refrescarUsuarios(): Promise<void> {
    const params = new HttpParams().set('page', 1).set('pageSize', 100);
    const page = await firstValueFrom(this.http.get<Page<Usuario>>(`${this.base}/usuarios`, { params })).catch(() => null);
    if (page) this._usuarios.set(page.items);
  }

  async refrescarSucursales(): Promise<void> {
    const params = new HttpParams().set('page', 1).set('pageSize', 100);
    const page = await firstValueFrom(this.http.get<Page<Sucursal>>(`${this.base}/sucursales`, { params })).catch(() => null);
    if (page) this._sucursales.set(page.items);
  }

  // ---------- Órdenes ----------

  async crearOrden(datos: NuevaOrden, sucursalId: Id): Promise<Orden> {
    try {
      const orden = await firstValueFrom(
        this.http.post<Orden>(`${this.base}/ordenes`, {
          pacienteId: datos.pacienteId,
          medicoId: datos.medicoId,
          medicoExterno: datos.medicoExterno,
          sucursalId,
          estudioIds: datos.estudioIds,
          fechaEntrega: datos.fechaEntrega,
          entrega: datos.entrega,
          notas: datos.notas ?? '',
        }),
      );
      this._ordenes.update((list) => [orden, ...list]);
      void this.refrescarActividad(sucursalId);
      return orden;
    } catch (err) {
      throw new Error(extraerErrorApi(err, 'No se pudo registrar la orden.'));
    }
  }

  async adjuntar(ordenId: Id, estudioId: Id, archivos: File[]): Promise<void> {
    try {
      for (const archivo of archivos) {
        const formData = new FormData();
        formData.append('archivo', archivo);
        const adjunto = await firstValueFrom(
          this.http.post<Adjunto>(`${this.base}/ordenes/${ordenId}/estudios/${estudioId}/adjuntos`, formData),
        );
        this.actualizarOrden(ordenId, (o) => ({
          ...o,
          estudios: o.estudios.map((e) =>
            e.estudioId === estudioId ? { ...e, adjuntos: [...e.adjuntos, adjunto] } : e,
          ),
        }));
      }
      const sucursalId = this.session.lab()?.sucursalId;
      if (sucursalId) void this.refrescarActividad(sucursalId);
    } catch (err) {
      throw new Error(extraerErrorApi(err, 'No se pudo subir el archivo.'));
    }
  }

  async quitarAdjunto(ordenId: Id, estudioId: Id, adjuntoId: Id): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete<void>(`${this.base}/ordenes/${ordenId}/estudios/${estudioId}/adjuntos/${adjuntoId}`),
      );
      this.actualizarOrden(ordenId, (o) => ({
        ...o,
        estudios: o.estudios.map((e) =>
          e.estudioId === estudioId ? { ...e, adjuntos: e.adjuntos.filter((a) => a.id !== adjuntoId) } : e,
        ),
      }));
    } catch (err) {
      throw new Error(extraerErrorApi(err, 'No se pudo quitar el archivo.'));
    }
  }

  async cerrarOrden(ordenId: Id): Promise<void> {
    try {
      const actualizada = await firstValueFrom(this.http.post<Orden>(`${this.base}/ordenes/${ordenId}/cerrar`, {}));
      this.reemplazarOrden(actualizada);
      const sucursalId = this.session.lab()?.sucursalId;
      if (sucursalId) void this.refrescarActividad(sucursalId);
    } catch (err) {
      throw new Error(extraerErrorApi(err, 'Todos los estudios necesitan al menos un resultado antes de cerrar la orden.'));
    }
  }

  async reabrirOrden(ordenId: Id): Promise<void> {
    try {
      const actualizada = await firstValueFrom(this.http.post<Orden>(`${this.base}/ordenes/${ordenId}/reabrir`, {}));
      this.reemplazarOrden(actualizada);
      const sucursalId = this.session.lab()?.sucursalId;
      if (sucursalId) void this.refrescarActividad(sucursalId);
    } catch (err) {
      throw new Error(extraerErrorApi(err, 'No se pudo reabrir la orden.'));
    }
  }

  async eliminarOrden(ordenId: Id): Promise<void> {
    try {
      await firstValueFrom(this.http.delete<void>(`${this.base}/ordenes/${ordenId}`));
      this._ordenes.update((list) => list.filter((o) => o.id !== ordenId));
      this._actividad.update((list) => list.filter((a) => a.ordenId !== ordenId));
    } catch (err) {
      throw new Error(extraerErrorApi(err, 'No se pudo eliminar la orden.'));
    }
  }

  async descargarAdjuntoReal(ordenId: Id, estudioId: Id, adjuntoId: Id, nombreArchivo: string): Promise<void> {
    try {
      const blob = await firstValueFrom(
        this.http.get(`${this.base}/ordenes/${ordenId}/estudios/${estudioId}/adjuntos/${adjuntoId}/contenido`, {
          responseType: 'blob',
        }),
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nombreArchivo;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      throw new Error(extraerErrorApi(err, 'No se pudo descargar el archivo.'));
    }
  }

  // ---------- Enlaces seguros ----------

  async crearEnlace(pacienteId: Id, ordenId?: Id): Promise<EnlaceSeguro> {
    const sucursalId = this.session.lab()?.sucursalId;
    if (!sucursalId) throw new Error('Selecciona una sucursal activa.');
    try {
      const enlace = await firstValueFrom(
        this.http.post<EnlaceSeguro>(`${this.base}/enlaces`, {
          pacienteId,
          sucursalId,
          ...(ordenId ? { ordenId } : {}),
        }),
      );
      this._enlacesVigentes.update((prev) => ({ ...prev, [enlace.token]: enlace }));
      if (ordenId) void this.refrescarActividad(sucursalId);
      return enlace;
    } catch (err) {
      throw new Error(extraerErrorApi(err, 'No se pudo generar el enlace seguro.'));
    }
  }

  async resolverEnlace(token: string): Promise<{ estado: 'ok' | 'vencido' | 'invalido'; enlace?: EnlaceSeguro }> {
    try {
      const res = await firstValueFrom(this.http.get<ResultadosApiDto>(`${this.base}/resultados/${token}`));
      const enlace: EnlaceSeguro = {
        token,
        pacienteId: '',
        creado: new Date().toISOString(),
        expira: res.expira,
      };
      this._enlacesVigentes.update((prev) => ({ ...prev, [token]: enlace }));
      return { estado: 'ok', enlace };
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 410) {
        return { estado: 'vencido' };
      }
      return { estado: 'invalido' };
    }
  }

  enlaceVigente(token: string): EnlaceSeguro | undefined {
    const enlace = this._enlacesVigentes()[token];
    return enlace && new Date(enlace.expira) >= new Date() ? enlace : undefined;
  }

  async enviarCorreo(_destino: string): Promise<void> {
    // SMTP queda para integración posterior según documentación del backend
  }

  // ---------- Catálogos ----------

  async guardarPaciente(p: Omit<Paciente, 'id'> & Partial<ConId>): Promise<Paciente> {
    const payload = {
      nombre: p.nombre,
      apellidos: p.apellidos,
      fechaNacimiento: p.fechaNacimiento,
      sexo: p.sexo,
      telefono: p.telefono,
      correo: p.correo?.trim() || null,
    };
    try {
      const guardado = p.id
        ? await firstValueFrom(this.http.put<Paciente>(`${this.base}/pacientes/${p.id}`, payload))
        : await firstValueFrom(this.http.post<Paciente>(`${this.base}/pacientes`, payload));
      this.upsert(this._pacientes, guardado);
      return guardado;
    } catch (err) {
      throw new Error(extraerErrorApi(err, 'No se pudo guardar el paciente.'));
    }
  }

  async guardarMedico(m: Omit<Medico, 'id'> & Partial<ConId> & { contrasena?: string; activo?: boolean }): Promise<Medico> {
    const payload = {
      nombre: m.nombre,
      especialidad: m.especialidad,
      cedula: m.cedula,
      telefono: m.telefono,
      correo: m.correo,
      usuario: m.usuario,
      contrasena: m.contrasena?.trim() || null,
      activo: m.activo ?? true,
    };
    try {
      const guardado = m.id
        ? await firstValueFrom(this.http.put<Medico>(`${this.base}/medicos/${m.id}`, payload))
        : await firstValueFrom(this.http.post<Medico>(`${this.base}/medicos`, payload));
      this.upsert(this._medicos, guardado);
      return guardado;
    } catch (err) {
      throw new Error(extraerErrorApi(err, 'No se pudo guardar el médico.'));
    }
  }

  async guardarEstudio(e: Omit<Estudio, 'id'> & Partial<ConId>): Promise<Estudio> {
    const payload = {
      clave: e.clave,
      nombre: e.nombre,
      area: e.area,
      precio: e.precio,
      diasEntrega: e.diasEntrega,
      dicom: e.dicom,
      indicaciones: e.indicaciones?.trim() || null,
    };
    try {
      const guardado = e.id
        ? await firstValueFrom(this.http.put<Estudio>(`${this.base}/estudios/${e.id}`, payload))
        : await firstValueFrom(this.http.post<Estudio>(`${this.base}/estudios`, payload));
      this.upsert(this._estudios, guardado);
      return guardado;
    } catch (err) {
      throw new Error(extraerErrorApi(err, 'No se pudo guardar el estudio.'));
    }
  }

  async guardarUsuario(u: Omit<Usuario, 'id'> & Partial<ConId> & { contrasena?: string }): Promise<Usuario> {
    const payload = {
      nombre: u.nombre,
      correo: u.correo,
      usuario: u.usuario,
      rol: u.rol,
      activo: u.activo,
      contrasena: u.contrasena?.trim() || null,
    };
    try {
      const guardado = u.id
        ? await firstValueFrom(this.http.put<Usuario>(`${this.base}/usuarios/${u.id}`, payload))
        : await firstValueFrom(this.http.post<Usuario>(`${this.base}/usuarios`, payload));
      this.upsert(this._usuarios, guardado);
      return guardado;
    } catch (err) {
      throw new Error(extraerErrorApi(err, 'No se pudo guardar el usuario.'));
    }
  }

  async guardarSucursal(s: Omit<Sucursal, 'id'> & Partial<ConId>): Promise<Sucursal> {
    const payload = {
      nombre: s.nombre,
      direccion: s.direccion,
      telefono: s.telefono,
      usuarioIds: s.usuarioIds,
    };
    try {
      const guardado = s.id
        ? await firstValueFrom(this.http.put<Sucursal>(`${this.base}/sucursales/${s.id}`, payload))
        : await firstValueFrom(this.http.post<Sucursal>(`${this.base}/sucursales`, payload));
      this.upsert(this._sucursales, guardado);
      return guardado;
    } catch (err) {
      throw new Error(extraerErrorApi(err, 'No se pudo guardar la sucursal.'));
    }
  }

  async guardarInstitucion(datos: Institucion): Promise<void> {
    try {
      const actualizada = await firstValueFrom(this.http.put<Institucion>(`${this.base}/institucion`, datos));
      this._institucion.set(actualizada);
    } catch (err) {
      throw new Error(extraerErrorApi(err, 'No se pudo actualizar la institución.'));
    }
  }

  // ---------- Internos ----------

  private upsert<T extends ConId>(store: WritableSignal<T[]>, guardado: T): void {
    store.update((list) =>
      list.some((x) => x.id === guardado.id) ? list.map((x) => (x.id === guardado.id ? guardado : x)) : [...list, guardado],
    );
  }

  private actualizarOrden(ordenId: Id, fn: (o: Orden) => Orden): void {
    this._ordenes.update((list) => list.map((o) => (o.id === ordenId ? fn(o) : o)));
  }

  private reemplazarOrden(actualizada: Orden): void {
    this._ordenes.update((list) => list.map((o) => (o.id === actualizada.id ? actualizada : o)));
  }
}

export function tipoDeArchivo(nombre: string): TipoArchivo {
  return /\.(dcm|dicom)$/i.test(nombre) ? 'dicom' : 'pdf';
}

function extraerErrorApi(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 403) return 'No tienes permisos para realizar esta acción.';
    if (err.status === 409) return err.error?.detail || 'Conflicto con el estado actual o registro duplicado.';
    if (err.status === 413) return 'El archivo supera el límite permitido de 500 MB.';
    if (err.error?.detail) return err.error.detail;
    if (err.error?.errors) {
      const primero = Object.values(err.error.errors).flat()[0];
      if (typeof primero === 'string') return primero;
    }
  }
  return fallback;
}