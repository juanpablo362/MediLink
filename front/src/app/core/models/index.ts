export type Id = string;

/** Una orden solo tiene dos estados. En pantalla: "En proceso" y "Lista". */
export type EstadoOrden = 'abierta' | 'cerrada';

export type RolUsuario = 'admin' | 'lab';

export type Sexo = 'F' | 'M' | 'X';

export interface Institucion {
  nombre: string;
  razonSocial: string;
  rfc: string;
  telefono: string;
  correo: string;
  direccion: string;
  vigenciaEnlaceDias: number;
}

export interface Sucursal {
  id: Id;
  nombre: string;
  direccion: string;
  telefono: string;
  usuarioIds: Id[];
}

export interface Usuario {
  id: Id;
  nombre: string;
  correo: string;
  usuario: string;
  rol: RolUsuario;
  activo: boolean;
}

export interface Paciente {
  id: Id;
  nombre: string;
  apellidos: string;
  fechaNacimiento: string;
  sexo: Sexo;
  telefono: string;
  correo: string;
}

export interface Medico {
  id: Id;
  nombre: string;
  especialidad: string;
  cedula: string;
  telefono: string;
  correo: string;
  usuario: string;
}

export interface Estudio {
  id: Id;
  clave: string;
  nombre: string;
  area: string;
  precio: number;
  diasEntrega: number;
  dicom: boolean;
  indicaciones?: string;
}

export type TipoArchivo = 'pdf' | 'dicom';

export interface Adjunto {
  id: Id;
  nombre: string;
  tipo: TipoArchivo;
  tamano: number;
  fecha: string;
}

export interface OrdenEstudio {
  estudioId: Id;
  adjuntos: Adjunto[];
}

export interface FormaEntrega {
  impreso: boolean;
  correo: boolean;
  whatsapp: boolean;
}

export interface Orden {
  id: Id;
  folio: number;
  pacienteId: Id;
  medicoId: Id | null;
  medicoExterno: string | null;
  sucursalId: Id;
  estudios: OrdenEstudio[];
  estado: EstadoOrden;
  fechaRegistro: string;
  fechaEntrega: string;
  fechaCierre: string | null;
  entrega: FormaEntrega;
  total: number;
  notas: string;
}

export interface EnlaceSeguro {
  token: string;
  pacienteId: Id;
  creado: string;
  expira: string;
}

export interface NuevaOrden {
  pacienteId: Id;
  medicoId: Id | null;
  medicoExterno: string | null;
  estudioIds: Id[];
  fechaEntrega: string;
  entrega: FormaEntrega;
  notas: string;
}

export type ActividadTipo = 'orden-creada' | 'orden-cerrada' | 'orden-reabierta' | 'resultado-adjunto' | 'enlace-compartido';

export interface Actividad {
  id: Id;
  tipo: ActividadTipo;
  ordenId: Id;
  descripcion: string;
  fecha: string;
}
