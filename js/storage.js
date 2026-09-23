/**
 * storage.js
 * ===========
 * Port de almacenamiento.py, adaptado a localStorage. Misma idea del
 * patron atomico (escribir todo entero o no escribir nada) — localStorage
 * ya es de por si una escritura atomica por clave, asi que no hace falta
 * el paso de archivo .tmp + rename del firmware, pero se mantiene la
 * forma del dato igual para que sea facil de razonar.
 *
 * Guardado 100% LOCAL: no hay backend, no se sincroniza con nadie
 * (decision del usuario, 1 sep 2026 — ver claude/PLAN_APP_WEB_MOVIL.md).
 * Por eso el backup exportable no es un extra, es parte del nucleo: el
 * navegador puede perder estos datos (limpiar cache, cambiar de celular)
 * de una forma que la flash del ESP32 no perdia.
 */

import { PetState } from "./petState.js";
import { RegistroNPCs, RegistroLugares } from "./mundo.js";
import { Diario } from "./diario.js";

const CLAVE_GUARDADO = "mochi_progreso_v1"; // la clave NO cambia: cambiaria el guardado de nadie
const CLAVE_ANTERIOR = "mochi_progreso_previo"; // copia del guardado anterior, red de contencion
const CLAVE_RESCATE = "mochi_progreso_roto"; // si algo no se pudo leer, se conserva crudo

// Version del ESQUEMA. Se escribia desde el dia uno pero nunca se leia:
// si el esquema cambiaba, cargar() devolvia null y la app arrancaba de
// cero preguntando el nombre otra vez — el peor fallo posible aca.
// v1: mascota + npcs + lugares.
// v2: + diario, + cartas entregadas.
export const VERSION_ESQUEMA = 2;

export const INTERVALO_GUARDADO_MS = 180000; // 3 minutos, igual que el firmware

export function guardar(mascota, npcs, lugares, diario = null, cartasEntregadas = [], extras = {}) {
  const datos = {
    extras,
    version: VERSION_ESQUEMA,
    guardadoEn: Date.now(),
    mascota: mascota.aObjeto(),
    npcs: npcs.aObjeto(),
    lugares: lugares.aObjeto(),
    diario: (diario || new Diario()).aObjeto(),
    cartasEntregadas,
  };
  try {
    // Antes de pisar, se corre el guardado actual a la copia anterior:
    // si una escritura sale mal o el esquema resulta ilegible, siempre
    // queda una version buena atras.
    try {
      const actual = localStorage.getItem(CLAVE_GUARDADO);
      if (actual) localStorage.setItem(CLAVE_ANTERIOR, actual);
    } catch (e) {
      // sin lugar para la copia: se borra la vieja y se guarda igual lo importante
      try {
        localStorage.removeItem(CLAVE_ANTERIOR);
      } catch (e2) {
        /* nada */
      }
    }
    localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(datos));
    return true;
  } catch (e) {
    console.error("No se pudo guardar el progreso:", e);
    return false;
  }
}

/**
 * Migra un guardado viejo al esquema actual. Cada version suma lo que le
 * falta sin tocar lo que ya estaba: nunca se descarta un guardado por
 * ser viejo.
 */
function migrar(datos) {
  const version = datos.version || 1;
  if (version >= VERSION_ESQUEMA) return datos;

  if (version < 2) {
    datos.diario = datos.diario || { entradas: [] };
    datos.cartasEntregadas = datos.cartasEntregadas || [];
  }
  datos.version = VERSION_ESQUEMA;
  return datos;
}

function reconstruir(datos) {
  return {
    mascota: PetState.desdeObjeto(datos.mascota),
    npcs: RegistroNPCs.desdeObjeto(datos.npcs),
    lugares: RegistroLugares.desdeObjeto(datos.lugares),
    diario: Diario.desdeObjeto(datos.diario),
    cartasEntregadas: Array.isArray(datos.cartasEntregadas) ? datos.cartasEntregadas : [],
    extras: datos.extras && typeof datos.extras === "object" ? datos.extras : {},
    guardadoEn: Number(datos.guardadoEn) || 0,
  };
}

function intentarCargar(crudo) {
  if (!crudo) return null;
  const datos = migrar(JSON.parse(crudo));
  if (!datos.mascota) throw new Error("guardado sin mascota");
  return reconstruir(datos);
}

export function cargar() {
  let crudo = null;
  try {
    crudo = localStorage.getItem(CLAVE_GUARDADO);
  } catch (e) {
    return null; // modo privado o storage bloqueado
  }
  if (!crudo) return null;

  try {
    return intentarCargar(crudo);
  } catch (e) {
    console.error("El guardado principal no se pudo leer:", e);
    // No se pierde: se conserva crudo para poder recuperarlo a mano, y
    // se intenta con la copia anterior antes de darse por vencido.
    try {
      localStorage.setItem(CLAVE_RESCATE, crudo);
      const previo = localStorage.getItem(CLAVE_ANTERIOR);
      if (previo) {
        const recuperado = intentarCargar(previo);
        if (recuperado) {
          console.warn("Se recupero el guardado anterior.");
          return recuperado;
        }
      }
    } catch (e2) {
      /* no hay nada mas que hacer */
    }
    return null;
  }
}

/**
 * Le pide al navegador que NO borre este almacenamiento solo. Sin esto,
 * un sitio poco visitado puede perder sus datos (en iOS, a los ~7 dias
 * sin uso si no esta instalado). No siempre se concede — instalar la app
 * en la pantalla de inicio es lo que mas ayuda.
 */
export async function pedirAlmacenamientoPersistente() {
  try {
    if (!navigator.storage || !navigator.storage.persist) return "no-soportado";
    if (await navigator.storage.persisted()) return "ya-concedido";
    return (await navigator.storage.persist()) ? "concedido" : "denegado";
  } catch (e) {
    return "error";
  }
}

export function hayGuardado() {
  try {
    return localStorage.getItem(CLAVE_GUARDADO) !== null;
  } catch (e) {
    return false;
  }
}

/** Decide cuando toca guardar, para no escribir en cada tick. */
export class GuardadoAutomatico {
  constructor(ahoraMs = null) {
    this.ultimoGuardado = ahoraMs ?? Date.now();
  }

  deberiaGuardar(ahoraMs = null) {
    const ahora = ahoraMs ?? Date.now();
    return ahora - this.ultimoGuardado >= INTERVALO_GUARDADO_MS;
  }

  marcarGuardado(ahoraMs = null) {
    this.ultimoGuardado = ahoraMs ?? Date.now();
  }
}

// -----------------------------------------------------------------
// Backup exportable - no existe equivalente en el firmware porque la
// flash del ESP32 no se borra sola. Aca si puede pasar, asi que esto
// es parte del nucleo, no un extra.
// -----------------------------------------------------------------

export function exportarBackup() {
  let crudo = null;
  try {
    crudo = localStorage.getItem(CLAVE_GUARDADO);
  } catch (e) {
    return null;
  }
  if (!crudo) return null;

  const blob = new Blob([crudo], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const fecha = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `baozi-backup-${fecha}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Safari necesita el URL vivo un rato despues del click
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return true;
}

export function importarBackup(archivo) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => {
      try {
        const datos = JSON.parse(lector.result);
        if (!datos.mascota || !datos.npcs || !datos.lugares) {
          reject(new Error("that file isn't a Baozi backup."));
          return;
        }
        if ((datos.version || 1) > VERSION_ESQUEMA) {
          reject(new Error("that backup is from a newer Baozi."));
          return;
        }
        // Se migra al esquema actual antes de escribirlo, y el guardado
        // que habia se conserva como copia anterior por las dudas.
        const migrado = migrar(datos);
        const actual = localStorage.getItem(CLAVE_GUARDADO);
        if (actual) localStorage.setItem(CLAVE_ANTERIOR, actual);
        localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(migrado));
        resolve(true);
      } catch (e) {
        reject(e);
      }
    };
    lector.onerror = () => reject(lector.error);
    lector.readAsText(archivo);
  });
}
