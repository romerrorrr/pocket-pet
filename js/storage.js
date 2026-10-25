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
// v35: la copia "de ayer". La anterior va segundos atras del principal (se
// copia en cada guardado): si algo sale mal, puede estar igual de mal. Esta
// se rota una vez por dia de calendario: guarda como estaba todo al primer
// guardado de hoy (o sea, el final de la ultima vez que jugo).
const CLAVE_DIA = "mochi_progreso_dia";
const CLAVE_DIA_FECHA = "mochi_progreso_dia_fecha";
// v35: la ultima vez que guardo un backup (para el aviso semanal de Baozi)
export const CLAVE_ULTIMO_BACKUP = "baozi_ultimo_backup";

// v35: si esta sesion NO pudo leer el guardado principal, el primer
// guardado no lo corre a la copia anterior (pisaria una copia buena, o la
// ultima esperanza, con uno roto). Y si no se pudo leer nada, la app no
// arranca de cero en silencio: main.js ofrece restaurar (ver estadoDeCarga).
let principalIlegible = false;
let cargaFallida = false;

const hoyLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

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
      const actual = principalIlegible ? null : localStorage.getItem(CLAVE_GUARDADO);
      if (actual) {
        rotarCopiaDelDia(actual);
        localStorage.setItem(CLAVE_ANTERIOR, actual);
      }
    } catch (e) {
      // sin lugar para la copia: se borra la vieja y se guarda igual lo importante
      try {
        localStorage.removeItem(CLAVE_ANTERIOR);
      } catch (e2) {
        /* nada */
      }
    }
    localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(datos));
    principalIlegible = false; // desde aca el principal vuelve a ser bueno
    // (si no se pudo leer nada y ella eligio empezar de nuevo, lo crudo sigue en CLAVE_RESCATE)
    cargaFallida = false;
    return true;
  } catch (e) {
    console.error("No se pudo guardar el progreso:", e);
    return false;
  }
}

/**
 * v35: una vez por dia de calendario, el guardado que habia (el del final
 * de la ultima vez) pasa a ser la copia del dia. Solo si se puede leer: una
 * copia rota no sirve de red. Sin lugar, queda la copia vieja (una mas
 * vieja es mejor que ninguna) y no se reintenta hasta mañana.
 */
let rotacionIntentada = "";
function rotarCopiaDelDia(actual) {
  const hoy = hoyLocal();
  if (rotacionIntentada === hoy) return;
  try {
    if (localStorage.getItem(CLAVE_DIA_FECHA) === hoy) return;
    rotacionIntentada = hoy;
    const datos = JSON.parse(actual);
    if (!datos || !datos.mascota) return;
    localStorage.setItem(CLAVE_DIA, actual);
    localStorage.setItem(CLAVE_DIA_FECHA, hoy);
  } catch (e) {
    /* sin lugar o ilegible: lo importante es el principal */
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
    const r = intentarCargar(crudo);
    principalIlegible = false;
    cargaFallida = false;
    return r;
  } catch (e) {
    console.error("El guardado principal no se pudo leer:", e);
    principalIlegible = true;
    // No se pierde: se conserva crudo para poder recuperarlo a mano (en su
    // propio try: si no hay lugar para el rescate, igual se prueban las
    // copias), y se intenta con la copia anterior y la del dia antes de
    // darse por vencido.
    try {
      localStorage.setItem(CLAVE_RESCATE, crudo);
    } catch (e2) {
      console.error("No hubo lugar para guardar el rescate:", e2);
    }
    for (const [clave, nombre] of [[CLAVE_ANTERIOR, "anterior"], [CLAVE_DIA, "del dia"]]) {
      try {
        const copia = localStorage.getItem(clave);
        const recuperado = copia ? intentarCargar(copia) : null;
        if (recuperado) {
          console.warn(`Se recupero la copia ${nombre}.`);
          return { ...recuperado, recuperadoDe: clave === CLAVE_ANTERIOR ? "previo" : "dia" };
        }
      } catch (e3) {
        console.error(`La copia ${nombre} tampoco se pudo leer:`, e3);
      }
    }
    cargaFallida = true;
    return null;
  }
}

/**
 * v35: como salio la carga de esta sesion. { fallida: true } = habia un
 * guardado y no se pudo leer NI el principal NI las copias: main.js no
 * arranca de cero en silencio, ofrece restaurar un backup.
 */
export function estadoDeCarga() {
  return { fallida: cargaFallida, principalIlegible };
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
// (v35: las copias de este telefono tampoco: duplicarian el backup)
const CLAVES_QUE_NO_VIAJAN = new Set([CLAVE_GUARDADO, CLAVE_ANTERIOR, CLAVE_RESCATE, CLAVE_DIA, CLAVE_DIA_FECHA, CLAVE_ULTIMO_BACKUP, "baozi_ultima_vista", "baozi_prueba_mic", "baozi_clima", "baozi_ubicacion", "baozi_ritmo_ajuste"]);

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

/** v35: anota que hoy hay un backup (lo guardo, o lo acaba de restaurar). */
export function marcarBackup(ahoraMs = Date.now()) {
  try {
    localStorage.setItem(CLAVE_ULTIMO_BACKUP, String(ahoraMs));
  } catch (e) {
    /* nada */
  }
}

/** v35: cuando fue el ultimo backup (ms), o 0 si nunca. */
export function ultimoBackup() {
  try {
    return Number(localStorage.getItem(CLAVE_ULTIMO_BACKUP)) || 0;
  } catch (e) {
    return 0;
  }
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
  // (v35: un principal que no se pudo leer no pisa la copia anterior: ya esta en el rescate)
  const actual = principalIlegible ? null : localStorage.getItem(CLAVE_GUARDADO);
  if (actual) {
    try {
      localStorage.setItem(CLAVE_ANTERIOR, actual);
    } catch (e) {
      /* sin lugar para la copia: lo que importa es restaurar */
    }
  }
  const texto = JSON.stringify(migrado);
  try {
    localStorage.setItem(CLAVE_GUARDADO, texto);
  } catch (e) {
    // sin lugar: la copia del dia es lo unico prescindible (el principal sigue intacto)
    try {
      localStorage.removeItem(CLAVE_DIA);
      localStorage.removeItem(CLAVE_DIA_FECHA);
    } catch (e2) {
      /* nada */
    }
    localStorage.setItem(CLAVE_GUARDADO, texto);
  }
  principalIlegible = false;
  cargaFallida = false;
  marcarBackup();
  for (const [k, v] of Object.entries(otras)) {
    try {
      localStorage.setItem(k, v);
    } catch (e) {
      /* sin lugar: lo importante (el progreso) ya esta */
    }
  }
}
