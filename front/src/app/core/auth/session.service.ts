import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '@env/environment';
import { Id, RolUsuario, Sucursal } from '@core/models';

export type Sesion =
  | {
      tipo: 'lab';
      usuarioId: Id;
      nombre: string;
      rol: RolUsuario;
      sucursalId: Id;
      sucursales: Sucursal[];
      accessToken: string;
      expira: string;
    }
  | {
      tipo: 'medico';
      medicoId: Id;
      nombre: string;
      accessToken: string;
      expira: string;
    };

export type ResultadoAcceso =
  | { ok: true; sucursales: Sucursal[] }
  | { ok: false; mensaje: string };

interface TokenDto {
  accessToken: string;
  tokenType: string;
  expira: string;
  sesion: {
    id: string;
    nombre: string;
    tipo: 'lab' | 'medico';
    rol: RolUsuario;
    sucursales: Sucursal[];
  };
}

const STORAGE_KEY = 'medilink.sesion';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly http = inject(HttpClient);
  private readonly _sesion = signal<Sesion | null>(leer());
  private pendiente: TokenDto | null = null;

  readonly sesion = this._sesion.asReadonly();
  readonly accessToken = computed(() => this._sesion()?.accessToken ?? null);

  readonly lab = computed(() => {
    const s = this._sesion();
    return s?.tipo === 'lab' ? s : null;
  });

  readonly medico = computed(() => {
    const s = this._sesion();
    return s?.tipo === 'medico' ? s : null;
  });

  readonly esAdmin = computed(() => this.lab()?.rol === 'admin');

  readonly sucursalesDelUsuario = computed(() => this.lab()?.sucursales ?? []);

  readonly sucursalActual = computed(() => {
    const lab = this.lab();
    if (!lab) return null;
    return lab.sucursales.find((s) => s.id === lab.sucursalId) ?? null;
  });

  async accederLaboratorio(usuario: string, contrasena: string): Promise<ResultadoAcceso> {
    try {
      const res = await firstValueFrom(
        this.http.post<TokenDto>(`${environment.apiUrl}/auth/login`, {
          usuario: usuario.trim(),
          contrasena,
          tipo: 'lab',
        }),
      );

      const sucursales = res.sesion.sucursales ?? [];
      if (sucursales.length === 0) {
        return { ok: false, mensaje: 'Tu cuenta no tiene sucursales asignadas.' };
      }

      this.pendiente = res;
      if (sucursales.length === 1) {
        this.elegirSucursal(sucursales[0]!.id);
      }
      return { ok: true, sucursales };
    } catch (err) {
      return { ok: false, mensaje: extraerMensajeError(err) };
    }
  }

  elegirSucursal(sucursalId: Id): void {
    if (this.pendiente) {
      const { accessToken, expira, sesion } = this.pendiente;
      this.guardar({
        tipo: 'lab',
        usuarioId: sesion.id,
        nombre: sesion.nombre,
        rol: sesion.rol,
        sucursalId,
        sucursales: sesion.sucursales,
        accessToken,
        expira,
      });
      this.pendiente = null;
      return;
    }

    const actual = this.lab();
    if (!actual || !actual.sucursales.some((s) => s.id === sucursalId)) return;
    this.guardar({ ...actual, sucursalId });
  }

  async accederMedico(usuario: string, contrasena: string): Promise<ResultadoAcceso> {
    try {
      const res = await firstValueFrom(
        this.http.post<TokenDto>(`${environment.apiUrl}/auth/login`, {
          usuario: usuario.trim(),
          contrasena,
          tipo: 'medico',
        }),
      );

      this.guardar({
        tipo: 'medico',
        medicoId: res.sesion.id,
        nombre: res.sesion.nombre,
        accessToken: res.accessToken,
        expira: res.expira,
      });
      return { ok: true, sucursales: [] };
    } catch (err) {
      return { ok: false, mensaje: extraerMensajeError(err) };
    }
  }

  cerrarSesion(): void {
    const token = this.accessToken();
    if (token) {
      void firstValueFrom(this.http.post(`${environment.apiUrl}/auth/logout`, {})).catch(() => {});
    }
    this.limpiarSesionLocal();
  }

  limpiarSesionLocal(): void {
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
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Sesion;
    if (!parsed?.accessToken) return null;
    if (parsed.expira && new Date(parsed.expira) <= new Date()) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function extraerMensajeError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'No se pudo conectar con el servidor de MediLink.';
    if (err.status === 429) return 'Demasiados intentos. Espera un minuto e intenta de nuevo.';
    const detail = err.error?.detail || err.error?.title;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (err.status === 401) return 'Usuario o contraseña incorrectos.';
  }
  return 'No se pudo iniciar sesión. Intenta de nuevo.';
}