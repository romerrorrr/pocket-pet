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

// v33 (rom: "si a todo"): el backup lleva tambien las fotos del album, el
// video del si (despues del si) y lo demas del juego (records, el final,
// el personaje...). Un solo archivo: una cabecera de texto con todo lo
// chico (JSON, las fotos van adentro como dataUrl: son de 10-20 KB) y
// atras, crudos, los pedacitos del video. Sin base64 para el video: un
// video de minutos en base64 dentro de un JSON no entra en la memoria de
// un iPhone; armado con Blobs, el navegador lo va leyendo del disco.
//
//   "BAOZI-BACKUP-2\n" + largo de la cabecera (10 digitos) + "\n"
//   + cabecera (JSON, UTF-8) + los pedacitos, uno atras del otro
//
// Los backups viejos (el JSON del guardado, solo) se siguen leyendo.

const MAGIA = "BAOZI-BACKUP-2\n";
const LARGO_PREFIJO = MAGIA.length + 11;

// Lo que es de ESTE telefono (un permiso, un cache, el ajuste de los
// auriculares) no viaja: en el otro telefono no vale.
const CLAVES_QUE_NO_VIAJAN = new Set([CLAVE_GUARDADO, CLAVE_ANTERIOR, CLAVE_RESCATE, "baozi_ultima_vista", "baozi_prueba_mic", "baozi_clima", "baozi_ubicacion", "baozi_ritmo_ajuste"]);

function otrasClaves() {
  const otras = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && /^(baozi|mochi)_/.test(k) && !CLAVES_QUE_NO_VIAJAN.has(k)) otras[k] = localStorage.getItem(k);
    }
  } catch (e) {
    /* sin storage: van solo el progreso y las fotos */
  }
  return otras;
}

/**
 * Arma el archivo del backup (Blob) o null si no hay nada guardado.
 * fotos: las filas del album (camara.js); videos: [{ meta, pedazos: [{ n, blob }] }] (grabacion.js).
 */
export function armarBackup({ fotos = [], videos = [] } = {}) {
  let crudo = null;
  try {
    crudo = localStorage.getItem(CLAVE_GUARDADO);
  } catch (e) {
    return null;
  }
  if (!crudo) return null;
  const partes = [];
  let offset = 0;
  const videosCabecera = videos.map(({ meta, pedazos }) => ({
    meta,
    pedazos: pedazos.map(({ n, blob }) => {
      const p = { n, offset, largo: blob.size, tipo: blob.type };
      offset += blob.size;
      partes.push(blob);
      return p;
    }),
  }));
  const cabecera = new TextEncoder().encode(
    JSON.stringify({ formato: "baozi-backup", v: 2, creado: Date.now(), progreso: JSON.parse(crudo), otras: otrasClaves(), fotos, videos: videosCabecera }),
  );
  return new Blob([MAGIA, String(cabecera.length).padStart(10, "0"), "\n", cabecera, ...partes], { type: "application/octet-stream" });
}

export function nombreDelBackup() {
  return `baozi-backup-${new Date().toISOString().slice(0, 10)}.baozi`;
}

function leerTexto(blob) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result);
    lector.onerror = () => reject(lector.error);
    lector.readAsText(blob);
  });
}

function validarProgreso(datos) {
  if (!datos || !datos.mascota || !datos.npcs || !datos.lugares) throw new Error("that file isn't a Baozi backup.");
  if ((datos.version || 1) > VERSION_ESQUEMA) throw new Error("that backup is from a newer Baozi.");
  return datos;
}

/**
 * Lee un backup (el nuevo o uno viejo) sin escribir nada todavia:
 * { progreso, otras, fotos, videos: [{ meta, pedazos: [{ n, blob }] }] }.
 */
export async function leerBackup(archivo) {
  const inicio = await leerTexto(archivo.slice(0, LARGO_PREFIJO));
  if (!inicio.startsWith(MAGIA)) {
    // un backup de antes de v33: el guardado solo, en JSON
    let datos;
    try {
      datos = JSON.parse(await leerTexto(archivo));
    } catch (e) {
      throw new Error("that file isn't a Baozi backup.");
    }
    return { progreso: validarProgreso(datos), otras: {}, fotos: [], videos: [] };
  }
  const largo = Number(inicio.slice(MAGIA.length, MAGIA.length + 10));
  if (!(largo > 0) || LARGO_PREFIJO + largo > archivo.size) throw new Error("that backup is incomplete.");
  let cab;
  try {
    cab = JSON.parse(await leerTexto(archivo.slice(LARGO_PREFIJO, LARGO_PREFIJO + largo)));
  } catch (e) {
    throw new Error("that backup is damaged.");
  }
  if (!cab || cab.formato !== "baozi-backup") throw new Error("that file isn't a Baozi backup.");
  if (cab.v > 2) throw new Error("that backup is from a newer Baozi.");
  const base = LARGO_PREFIJO + largo;
  const videos = (Array.isArray(cab.videos) ? cab.videos : [])
    .filter((v) => v && v.meta && Array.isArray(v.pedazos))
    .map((v) => ({
      meta: v.meta,
      pedazos: v.pedazos
        .filter((p) => p && p.offset >= 0 && p.largo >= 0 && base + p.offset + p.largo <= archivo.size)
        .map((p) => ({ n: p.n, blob: archivo.slice(base + p.offset, base + p.offset + p.largo, p.tipo || "") })),
    }));
  const otras = {};
  if (cab.otras && typeof cab.otras === "object") {
    for (const [k, v] of Object.entries(cab.otras)) if (/^(baozi|mochi)_/.test(k) && !CLAVES_QUE_NO_VIAJAN.has(k) && typeof v === "string") otras[k] = v;
  }
  return { progreso: validarProgreso(cab.progreso), otras, fotos: Array.isArray(cab.fotos) ? cab.fotos : [], videos };
}

/**
 * Escribe el progreso (migrado) y lo demas del juego. El guardado que
 * habia se conserva como copia anterior, por las dudas.
 */
export function restaurarBackup({ progreso, otras = {} }) {
  const migrado = migrar(progreso);
  const actual = localStorage.getItem(CLAVE_GUARDADO);
  if (actual) localStorage.setItem(CLAVE_ANTERIOR, actual);
  localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(migrado));
  for (const [k, v] of Object.entries(otras)) {
    try {
      localStorage.setItem(k, v);
    } catch (e) {
      /* sin lugar: lo importante (el progreso) ya esta */
    }
  }
}
