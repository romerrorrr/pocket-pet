/**
 * v28: "donde estuvimos hoy". Cada vez que la app lee la ubicacion (al
 * abrirla y cada ~2 min con la app abierta en el cuarto) se anota un punto
 * del dia, solo si se movieron bastante desde el ultimo. Al final, el diario
 * dibuja el mapa del dia con esos puntos (mapaDia.js).
 *
 * Todo queda en este telefono (localStorage). Nada se manda a ningun lado.
 *
 * Guardado: { "AAAA-MM-DD": [[lat, lon, minutoDelDia], ...] } en orden.
 */
import { claveDelDia } from "./diario.js";
import { distanciaMetros } from "./mundo.js";

const CLAVE = "baozi_donde_estuvimos";
const CLAVE_ACTIVO = "baozi_donde_estuvimos_on";

export const MOVIDA_MINIMA_M = 300; // "un cambio de lugar relativamente significativo"
export const MISMO_LUGAR_M = 180; // al volver a un lugar del dia, es el mismo pin
export const PRECISION_MAXIMA_M = 200; // lecturas peores (adentro de un edificio) no cuentan
const MAX_POR_DIA = 40;
const MAX_DIAS = 400;

let datos = null;

function cargar() {
  if (datos) return datos;
  try {
    const crudo = JSON.parse(localStorage.getItem(CLAVE) || "{}");
    datos = crudo && typeof crudo === "object" && !Array.isArray(crudo) ? crudo : {};
  } catch (e) {
    datos = {};
  }
  return datos;
}

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(datos));
  } catch (e) {
    /* sin espacio: no pasa nada, es un extra */
  }
}

export function activo() {
  try {
    return localStorage.getItem(CLAVE_ACTIVO) !== "0";
  } catch (e) {
    return true;
  }
}

export function ponerActivo(si) {
  try {
    localStorage.setItem(CLAVE_ACTIVO, si ? "1" : "0");
  } catch (e) {
    /* nada */
  }
}

const valido = (p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180;

/**
 * Anota una lectura. Devuelve true si quedo un punto nuevo.
 * precision en metros (pos.coords.accuracy); si no se sabe, se acepta.
 */
export function anotar(lat, lon, precision = null, cuando = new Date()) {
  if (!activo()) return false;
  if (!valido([lat, lon])) return false;
  if (Number.isFinite(precision) && precision > PRECISION_MAXIMA_M) return false;
  const d = cargar();
  const clave = claveDelDia(cuando);
  const lista = Array.isArray(d[clave]) ? d[clave].filter(valido) : [];
  const ultimo = lista[lista.length - 1];
  if (ultimo && distanciaMetros(ultimo[0], ultimo[1], lat, lon) < MOVIDA_MINIMA_M) return false;
  if (lista.length >= MAX_POR_DIA) return false;
  lista.push([Math.round(lat * 1e5) / 1e5, Math.round(lon * 1e5) / 1e5, cuando.getHours() * 60 + cuando.getMinutes()]);
  d[clave] = lista;
  const dias = Object.keys(d).sort();
  for (const viejo of dias.slice(0, Math.max(0, dias.length - MAX_DIAS))) delete d[viejo];
  guardar();
  return true;
}

/** Los puntos del dia, en orden: [{ lat, lon, min }]. */
export function puntosDe(clave) {
  const lista = cargar()[clave];
  return Array.isArray(lista) ? lista.filter(valido).map(([lat, lon, min]) => ({ lat, lon, min: Number.isFinite(min) ? min : null })) : [];
}

/**
 * Los pines del dia: si volvieron a un lugar (casa a la manana y a la
 * noche) es el mismo pin con dos horas. orden = el indice de pin de cada
 * punto, en el orden del dia (para unir los pines con puntitos).
 */
export function pinesDe(clave) {
  const pines = [];
  const orden = [];
  for (const p of puntosDe(clave)) {
    let i = pines.findIndex((q) => distanciaMetros(q.lat, q.lon, p.lat, p.lon) < MISMO_LUGAR_M);
    if (i < 0) {
      pines.push({ lat: p.lat, lon: p.lon, horas: [] });
      i = pines.length - 1;
    }
    if (p.min != null) pines[i].horas.push(p.min);
    if (orden[orden.length - 1] !== i) orden.push(i);
  }
  return { pines, orden };
}

/** Hay mapa ese dia si estuvieron en 2 lugares o mas. */
export function hayMapa(clave) {
  return pinesDe(clave).pines.length >= 2;
}

/** Cambia cuando cambian los puntos del dia (para saber si rehacer el mapa). */
export function firma(clave) {
  return puntosDe(clave).map((p) => `${p.lat},${p.lon},${p.min}`).join(";");
}

/** Los dias con mapa, mas reciente primero. */
export function diasConMapa() {
  return Object.keys(cargar()).sort().reverse().filter(hayMapa);
}

export function hora(min) {
  if (!Number.isFinite(min)) return "";
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
}

/** Para pruebas. */
export function _reiniciar() {
  datos = null;
}

export { claveDelDia };
