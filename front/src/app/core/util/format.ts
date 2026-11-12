import { Paciente } from '@core/models';

export function nombreCompleto(p: Pick<Paciente, 'nombre' | 'apellidos'> | null | undefined): string {
  return p ? `${p.nombre} ${p.apellidos}` : 'Paciente no encontrado';
}

export function iniciales(nombre: string): string {
  return nombre
    .replace(/^(Dra?\.)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function edad(fechaNacimiento: string, hoy = new Date()): number {
  const [a, mes, d] = fechaNacimiento.slice(0, 10).split('-').map(Number);
  const n = new Date(a, mes - 1, d);
  let años = hoy.getFullYear() - n.getFullYear();
  const m = hoy.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < n.getDate())) años--;
  return años;
}

export function tamanoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function folio(n: number): string {
  return `ML-${n.toString().padStart(5, '0')}`;
}

export function mismoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function sinAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/** Búsqueda tolerante a acentos y mayúsculas. */
export function coincide(consulta: string, ...campos: (string | number | null | undefined)[]): boolean {
  const q = sinAcentos(consulta.trim());
  if (!q) return true;
  return campos.some((c) => c != null && sinAcentos(String(c)).includes(q));
}

export function telefonoWhatsApp(telefono: string): string {
  const digitos = telefono.replace(/\D/g, '');
  return digitos.length === 10 ? `52${digitos}` : digitos;
}
