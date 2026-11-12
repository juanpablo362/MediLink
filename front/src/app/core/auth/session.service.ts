import { Injectable, computed, inject, signal } from '@angular/core';

import { MockApiService } from '@core/api/mock-api.service';
import { Id, RolUsuario, Sucursal } from '@core/models';

export type Sesion =
  | { tipo: 'lab'; usuarioId: Id; nombre: string; rol: RolUsuario; sucursalId: Id }
  | { tipo: 'medico'; medicoId: Id; nombre: string };

export type ResultadoAcceso =
  | { ok: true; sucursales: Sucursal[] }
  | { ok: false; mensaje: string };

const STORAGE_KEY = 'medilink.sesion';

/** Sesión simulada: no valida contraseñas, solo que el usuario exista y esté activo. */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly api = inject(MockApiService);
  private readonly _sesion = signal<Sesion | null>(leer());
  private pendiente: { usuarioId: Id } | null = null;

  readonly sesion = this._sesion.asReadonly();
  readonly lab = computed(() => {
    const s = this._sesion();
    return s?.tipo === 'lab' ? s : null;
  });
  readonly medico = computed(() => {
    const s = this._sesion();
    return s?.tipo === 'medico' ? s : null;
  });
  readonly esAdmin = computed(() => this.lab()?.rol === 'admin');
  readonly sucursalActual = computed(() => {
    const id = this.lab()?.sucursalId;
    return id ? this.api.sucursalesPorId().get(id) ?? null : null;
  });
  readonly sucursalesDelUsuario = computed(() => {
    const id = this.lab()?.usuarioId;
    return id ? this.api.sucursales().filter((s) => s.usuarioIds.includes(id)) : [];
  });

  async accederLaboratorio(usuario: string, contrasena: string): Promise<ResultadoAcceso> {
    await new Promise((r) => setTimeout(r, 450));
    const u = this.api.usuarios().find((x) => x.usuario.toLowerCase() === usuario.trim().toLowerCase());
    if (!u || !contrasena) return { ok: false, mensaje: 'Usuario o contraseña incorrectos.' };
    if (!u.activo) return { ok: false, mensaje: 'Tu cuenta está desactivada. Pide a un administrador que la reactive.' };
    const sucursales = this.api.sucursales().filter((s) => s.usuarioIds.includes(u.id));
    if (sucursales.length === 0) return { ok: false, mensaje: 'Tu cuenta no tiene sucursales asignadas.' };
    this.pendiente = { usuarioId: u.id };
    if (sucursales.length === 1) this.elegirSucursal(sucursales[0].id);
    return { ok: true, sucursales };
  }

  elegirSucursal(sucursalId: Id): void {
    const usuarioId = this.pendiente?.usuarioId ?? this.lab()?.usuarioId;
    const u = this.api.usuarios().find((x) => x.id === usuarioId);
    if (!u) return;
    this.guardar({ tipo: 'lab', usuarioId: u.id, nombre: u.nombre, rol: u.rol, sucursalId });
    this.pendiente = null;
  }

  async accederMedico(usuario: string, contrasena: string): Promise<ResultadoAcceso> {
    await new Promise((r) => setTimeout(r, 450));
    const m = this.api.medicos().find((x) => x.usuario.toLowerCase() === usuario.trim().toLowerCase());
    if (!m || !contrasena) return { ok: false, mensaje: 'Usuario o contraseña incorrectos.' };
    this.guardar({ tipo: 'medico', medicoId: m.id, nombre: m.nombre });
    return { ok: true, sucursales: [] };
  }

  cerrarSesion(): void {
    this.pendiente = null;
    this._sesion.set(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  private guardar(s: Sesion): void {
    this._sesion.set(s);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }
}

function leer(): Sesion | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Sesion) : null;
  } catch {
    return null;
  }
}
