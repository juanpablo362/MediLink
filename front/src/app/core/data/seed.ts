import {
  Actividad,
  EnlaceSeguro,
  Estudio,
  Institucion,
  Medico,
  Orden,
  Paciente,
  Sucursal,
  Usuario,
} from '@core/models';

/* Datos ficticios. Correos en @ejemplo.com y teléfonos inventados. */

export const institucionSeed: Institucion = {
  nombre: 'Laboratorio Clínico Aurora',
  razonSocial: 'Diagnóstico Aurora S.A. de C.V.',
  rfc: 'DAU180512AB1',
  telefono: '+52 55 0000 1200',
  correo: 'contacto@ejemplo.com',
  direccion: 'Av. de los Insurgentes 1200, Ciudad de México',
  vigenciaEnlaceDias: 7,
};

export const usuariosSeed: Usuario[] = [
  { id: 'u1', nombre: 'Mariana Ochoa', correo: 'mariana@ejemplo.com', usuario: 'mochoa', rol: 'admin', activo: true },
  { id: 'u2', nombre: 'Tomás Rivera', correo: 'tomas@ejemplo.com', usuario: 'trivera', rol: 'lab', activo: true },
  { id: 'u3', nombre: 'Lucía Fernández', correo: 'lucia@ejemplo.com', usuario: 'lfernandez', rol: 'lab', activo: true },
  { id: 'u4', nombre: 'Emilio Castañeda', correo: 'emilio@ejemplo.com', usuario: 'ecastaneda', rol: 'lab', activo: false },
];

export const sucursalesSeed: Sucursal[] = [
  {
    id: 's1',
    nombre: 'Centro',
    direccion: 'Av. de los Insurgentes 1200, Col. Del Valle',
    telefono: '+52 55 0000 1200',
    usuarioIds: ['u1', 'u2', 'u3'],
  },
  {
    id: 's2',
    nombre: 'Norte',
    direccion: 'Calz. Vallejo 840, Col. Industrial',
    telefono: '+52 55 0000 3400',
    usuarioIds: ['u1', 'u3', 'u4'],
  },
];

export const pacientesSeed: Paciente[] = [
  { id: 'p1', nombre: 'Andrea', apellidos: 'Salgado Núñez', fechaNacimiento: '1988-03-14', sexo: 'F', telefono: '5500001001', correo: 'andrea.salgado@ejemplo.com' },
  { id: 'p2', nombre: 'Roberto', apellidos: 'Mendoza Ayala', fechaNacimiento: '1975-11-02', sexo: 'M', telefono: '5500001002', correo: 'roberto.mendoza@ejemplo.com' },
  { id: 'p3', nombre: 'Valeria', apellidos: 'Quintero Ruiz', fechaNacimiento: '1996-07-21', sexo: 'F', telefono: '5500001003', correo: 'valeria.quintero@ejemplo.com' },
  { id: 'p4', nombre: 'José Luis', apellidos: 'Barragán Soto', fechaNacimiento: '1962-01-30', sexo: 'M', telefono: '5500001004', correo: 'joseluis.barragan@ejemplo.com' },
  { id: 'p5', nombre: 'Ximena', apellidos: 'Del Río Campos', fechaNacimiento: '2011-09-05', sexo: 'F', telefono: '5500001005', correo: 'ximena.delrio@ejemplo.com' },
  { id: 'p6', nombre: 'Héctor', apellidos: 'Villaseñor Paz', fechaNacimiento: '1983-05-18', sexo: 'M', telefono: '5500001006', correo: 'hector.villasenor@ejemplo.com' },
  { id: 'p7', nombre: 'Paola', apellidos: 'Ibarra Lozano', fechaNacimiento: '1991-12-09', sexo: 'F', telefono: '5500001007', correo: 'paola.ibarra@ejemplo.com' },
  { id: 'p8', nombre: 'Sam', apellidos: 'Ortega Medina', fechaNacimiento: '2000-04-27', sexo: 'X', telefono: '5500001008', correo: 'sam.ortega@ejemplo.com' },
  { id: 'p9', nombre: 'Guadalupe', apellidos: 'Treviño Elizondo', fechaNacimiento: '1957-08-15', sexo: 'F', telefono: '5500001009', correo: 'guadalupe.trevino@ejemplo.com' },
  { id: 'p10', nombre: 'Fernando', apellidos: 'Aguirre Lara', fechaNacimiento: '1979-02-11', sexo: 'M', telefono: '5500001010', correo: 'fernando.aguirre@ejemplo.com' },
  { id: 'p11', nombre: 'Renata', apellidos: 'Cisneros Bautista', fechaNacimiento: '1999-10-03', sexo: 'F', telefono: '5500001011', correo: 'renata.cisneros@ejemplo.com' },
  { id: 'p12', nombre: 'Maximiliano', apellidos: 'De la Garza Montemayor Villarreal', fechaNacimiento: '1968-06-24', sexo: 'M', telefono: '5500001012', correo: 'maximiliano.delagarza@ejemplo.com' },
];

export const medicosSeed: Medico[] = [
  { id: 'm1', nombre: 'Dra. Elena Márquez', especialidad: 'Medicina interna', cedula: '7712345', telefono: '5500002001', correo: 'elena.marquez@ejemplo.com', usuario: 'emarquez' },
  { id: 'm2', nombre: 'Dr. Rodrigo Saldaña', especialidad: 'Cardiología', cedula: '6623456', telefono: '5500002002', correo: 'rodrigo.saldana@ejemplo.com', usuario: 'rsaldana' },
  { id: 'm3', nombre: 'Dra. Itzel Morales', especialidad: 'Pediatría', cedula: '8834567', telefono: '5500002003', correo: 'itzel.morales@ejemplo.com', usuario: 'imorales' },
  { id: 'm4', nombre: 'Dr. Arturo Leyva', especialidad: 'Traumatología', cedula: '5545678', telefono: '5500002004', correo: 'arturo.leyva@ejemplo.com', usuario: 'aleyva' },
  { id: 'm5', nombre: 'Dra. Sofía Cárdenas', especialidad: 'Endocrinología', cedula: '9956789', telefono: '5500002005', correo: 'sofia.cardenas@ejemplo.com', usuario: 'scardenas' },
];

export const estudiosSeed: Estudio[] = [
  { id: 'e1', clave: 'BH-01', nombre: 'Biometría hemática completa', area: 'Hematología', precio: 280, diasEntrega: 1, dicom: false, indicaciones: 'Ayuno de 8 horas.' },
  { id: 'e2', clave: 'QS-06', nombre: 'Química sanguínea de 6 elementos', area: 'Bioquímica', precio: 420, diasEntrega: 1, dicom: false, indicaciones: 'Ayuno de 8 a 12 horas.' },
  { id: 'e3', clave: 'PL-01', nombre: 'Perfil de lípidos', area: 'Bioquímica', precio: 390, diasEntrega: 1, dicom: false, indicaciones: 'Ayuno de 12 horas.' },
  { id: 'e4', clave: 'EGO-1', nombre: 'Examen general de orina', area: 'Uroanálisis', precio: 150, diasEntrega: 1, dicom: false, indicaciones: 'Primera orina de la mañana.' },
  { id: 'e5', clave: 'HB-A1', nombre: 'Hemoglobina glucosilada (HbA1c)', area: 'Bioquímica', precio: 360, diasEntrega: 2, dicom: false },
  { id: 'e6', clave: 'TSH-3', nombre: 'Perfil tiroideo', area: 'Inmunología', precio: 690, diasEntrega: 3, dicom: false },
  { id: 'e7', clave: 'RX-TX', nombre: 'Radiografía de tórax PA y lateral', area: 'Imagenología', precio: 650, diasEntrega: 1, dicom: true },
  { id: 'e8', clave: 'TC-CR', nombre: 'Tomografía de cráneo simple', area: 'Imagenología', precio: 2900, diasEntrega: 2, dicom: true },
  { id: 'e9', clave: 'US-AB', nombre: 'Ultrasonido abdominal', area: 'Imagenología', precio: 1150, diasEntrega: 1, dicom: true, indicaciones: 'Ayuno de 6 horas.' },
];

function isoDaysFrom(base: Date, days: number, hour = 9, minute = 0): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

interface OrdenPlan {
  paciente: string;
  medico: string | null;
  externo?: string;
  estudios: string[];
  registro: number;
  entrega: number;
  cerrada: boolean;
  sucursal: string;
  entregaPor: [boolean, boolean, boolean];
}

const planes: OrdenPlan[] = [
  { paciente: 'p1', medico: 'm1', estudios: ['e1', 'e2', 'e3'], registro: -9, entrega: -8, cerrada: true, sucursal: 's1', entregaPor: [false, true, true] },
  { paciente: 'p2', medico: 'm2', estudios: ['e3', 'e7'], registro: -8, entrega: -7, cerrada: true, sucursal: 's1', entregaPor: [true, true, false] },
  { paciente: 'p3', medico: null, externo: 'Dr. Iván Robles', estudios: ['e4'], registro: -7, entrega: -6, cerrada: true, sucursal: 's2', entregaPor: [false, false, true] },
  { paciente: 'p4', medico: 'm2', estudios: ['e8'], registro: -6, entrega: -4, cerrada: true, sucursal: 's1', entregaPor: [true, true, false] },
  { paciente: 'p5', medico: 'm3', estudios: ['e1', 'e4'], registro: -5, entrega: -4, cerrada: true, sucursal: 's2', entregaPor: [false, true, false] },
  { paciente: 'p6', medico: 'm4', estudios: ['e7'], registro: -4, entrega: -3, cerrada: true, sucursal: 's1', entregaPor: [false, false, true] },
  { paciente: 'p7', medico: 'm5', estudios: ['e5', 'e6'], registro: -4, entrega: -1, cerrada: true, sucursal: 's1', entregaPor: [false, true, true] },
  { paciente: 'p9', medico: 'm1', estudios: ['e2', 'e5'], registro: -3, entrega: -1, cerrada: true, sucursal: 's2', entregaPor: [true, false, false] },
  { paciente: 'p10', medico: 'm2', estudios: ['e3', 'e9'], registro: -2, entrega: 0, cerrada: false, sucursal: 's1', entregaPor: [false, true, true] },
  { paciente: 'p11', medico: 'm5', estudios: ['e6'], registro: -2, entrega: 1, cerrada: false, sucursal: 's1', entregaPor: [false, true, false] },
  { paciente: 'p12', medico: 'm1', estudios: ['e1', 'e2', 'e3', 'e4', 'e5'], registro: -1, entrega: 0, cerrada: false, sucursal: 's2', entregaPor: [true, true, true] },
  { paciente: 'p8', medico: null, externo: 'Dra. Carmen Pineda', estudios: ['e9'], registro: -1, entrega: 0, cerrada: false, sucursal: 's1', entregaPor: [false, false, true] },
  { paciente: 'p1', medico: 'm5', estudios: ['e5'], registro: -1, entrega: 1, cerrada: false, sucursal: 's1', entregaPor: [false, true, false] },
  { paciente: 'p2', medico: 'm2', estudios: ['e8'], registro: 0, entrega: 2, cerrada: false, sucursal: 's1', entregaPor: [true, true, false] },
  { paciente: 'p6', medico: 'm4', estudios: ['e7', 'e1'], registro: 0, entrega: 1, cerrada: false, sucursal: 's2', entregaPor: [false, false, true] },
  { paciente: 'p4', medico: 'm1', estudios: ['e2'], registro: 0, entrega: 1, cerrada: false, sucursal: 's1', entregaPor: [false, true, false] },
  { paciente: 'p3', medico: 'm3', estudios: ['e1'], registro: -3, entrega: -1, cerrada: false, sucursal: 's2', entregaPor: [false, true, true] },
  { paciente: 'p7', medico: 'm1', estudios: ['e9', 'e2'], registro: 0, entrega: 1, cerrada: false, sucursal: 's1', entregaPor: [false, true, false] },
];

export function buildOrdenesSeed(hoy = new Date()): Orden[] {
  return planes.map((p, i) => {
    const estudios = p.estudios.map((estudioId) => {
      const estudio = estudiosSeed.find((e) => e.id === estudioId)!;
      return {
        estudioId,
        adjuntos: p.cerrada
          ? [
              {
                id: `a${i}-${estudioId}`,
                nombre: `${estudio.clave.toLowerCase()}-${1040 + i}.${estudio.dicom ? 'dcm' : 'pdf'}`,
                tipo: estudio.dicom ? ('dicom' as const) : ('pdf' as const),
                tamano: estudio.dicom ? 18_400_000 : 240_000,
                fecha: isoDaysFrom(hoy, p.entrega, 12, 30),
              },
            ]
          : [],
      };
    });
    const total = p.estudios.reduce((acc, id) => acc + estudiosSeed.find((e) => e.id === id)!.precio, 0);
    return {
      id: `o${1040 + i}`,
      folio: 1040 + i,
      pacienteId: p.paciente,
      medicoId: p.medico,
      medicoExterno: p.externo ?? null,
      sucursalId: p.sucursal,
      estudios,
      estado: p.cerrada ? 'cerrada' : 'abierta',
      fechaRegistro: isoDaysFrom(hoy, p.registro, 8 + (i % 5), (i * 13) % 60),
      fechaEntrega: isoDaysFrom(hoy, p.entrega, 18),
      fechaCierre: p.cerrada ? isoDaysFrom(hoy, p.entrega, 12, 30) : null,
      entrega: { impreso: p.entregaPor[0], correo: p.entregaPor[1], whatsapp: p.entregaPor[2] },
      total,
      notas: '',
    } satisfies Orden;
  });
}

export function buildEnlacesSeed(hoy = new Date()): EnlaceSeguro[] {
  return [
    { token: 'demo-andrea', pacienteId: 'p1', creado: isoDaysFrom(hoy, -2), expira: isoDaysFrom(hoy, 5, 23, 59) },
    { token: 'demo-roberto', pacienteId: 'p2', creado: isoDaysFrom(hoy, -1), expira: isoDaysFrom(hoy, 6, 23, 59) },
    { token: 'demo-vencido', pacienteId: 'p3', creado: isoDaysFrom(hoy, -20), expira: isoDaysFrom(hoy, -13, 23, 59) },
  ];
}

export function buildActividadSeed(ordenes: Orden[]): Actividad[] {
  return ordenes
    .slice(-8)
    .reverse()
    .map((o, i) => ({
      id: `act${i}`,
      tipo: o.estado === 'cerrada' ? 'orden-cerrada' : 'orden-creada',
      ordenId: o.id,
      descripcion: o.estado === 'cerrada' ? 'Resultados listos' : 'Orden registrada',
      fecha: o.fechaCierre ?? o.fechaRegistro,
    }));
}
