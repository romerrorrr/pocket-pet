/**
 * corchoReal.js
 * ==============
 * v31: el mapa del corcho, de verdad. El dibujo de siempre (pieza/mapa.png)
 * es solo el centro, unos 13 x 6 km alrededor del lago: un lugar de ustedes
 * fuera de ahi quedaba aplastado contra el borde. Este es el mapa real de
 * Hangzhou (OpenStreetMap, redibujado en pixel art con los colores del juego,
 * igual que el mapa del dia del diario: mapaDia.js), con cada lugar en su
 * punto exacto.
 *
 * Se arma una vez con internet (hasta 64 teselas) y queda guardado en el
 * telefono (IndexedDB): despues anda sin señal. Si no hay red o las teselas
 * no cargan (en China puede pasar), el corcho muestra el dibujo de siempre y
 * se vuelve a intentar mas tarde. Si ella agrega un lugar que queda fuera,
 * el mapa se rehace mas grande la proxima vez que abre el corcho.
 */
import { mx, my, proyectar, zoomPara, rasterDeRotulos, rotulosDelEncuadre, pintarRotulos } from "./mapaDia.js";
import { distanciaMetros } from "./mundo.js";

const ANCHO = 640; // pixeles de mapa a lo ancho (cada uno, ~4 de tesela)
const CENTRO = { lat: 30.2455, lon: 120.1418 }; // West Lake
const LEJOS_M = 45000; // un lugar mas lejos que esto del lago no agranda el mapa (queda en el borde)
const MARGEN = 0.06;
const LADO_MINIMO = 0.00012; // ~4 km: aunque haya pocos lugares, se ve un poco de ciudad
const REINTENTO_MS = 10 * 60000;
const MAX_TESELAS = 64; // se baja una vez, pero sin abusar de OpenStreetMap
const VERSION = 1;

const DB_NOMBRE = "mochi_corcho";
const TIENDA = "mapa";
const CLAVE = "corcho";

let mapa = null; // { clave, v, lim, enc, png, t }
let precargado = null;
let trabajando = null;
let ultimoFallo = 0;

function abrirDB() {
  return new Promise((resolve) => {
    try {
      if (!("indexedDB" in window)) return resolve(null);
      const p = indexedDB.open(DB_NOMBRE, 1);
      p.onupgradeneeded = () => {
        if (!p.result.objectStoreNames.contains(TIENDA)) p.result.createObjectStore(TIENDA, { keyPath: "clave" });
      };
      p.onsuccess = () => resolve(p.result);
      p.onerror = () => resolve(null);
      p.onblocked = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

/** Lee el mapa guardado (una vez). Resuelve siempre. */
export function precargar() {
  if (precargado) return precargado;
  precargado = abrirDB().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) return resolve();
        try {
          const p = db.transaction(TIENDA, "readonly").objectStore(TIENDA).get(CLAVE);
          p.onsuccess = () => {
            const m = p.result;
            if (m && m.v === VERSION && m.png && m.enc && m.lim) mapa = m;
            resolve();
          };
          p.onerror = () => resolve();
        } catch (e) {
          resolve();
        }
      }),
  );
  return precargado;
}

async function guardar(m) {
  mapa = m;
  const db = await abrirDB();
  if (!db) return;
  try {
    db.transaction(TIENDA, "readwrite").objectStore(TIENDA).put(m);
  } catch (e) {
    /* queda en memoria */
  }
}

const cerca = (l) => Number.isFinite(l.lat) && Number.isFinite(l.lon) && distanciaMetros(CENTRO.lat, CENTRO.lon, l.lat, l.lon) <= LEJOS_M;

/** Los limites (Web Mercator 0..1) que cubren esos lugares, con margen. */
function limitesDe(lugares) {
  const lista = lugares.filter(cerca);
  if (!lista.length) lista.push(CENTRO);
  const xs = lista.map((l) => mx(l.lon));
  const ys = lista.map((l) => my(l.lat));
  let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const ax = Math.max(x1 - x0, LADO_MINIMO), ay = Math.max(y1 - y0, LADO_MINIMO);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  x0 = cx - (ax / 2) * (1 + 2 * MARGEN);
  x1 = cx + (ax / 2) * (1 + 2 * MARGEN);
  y0 = cy - (ay / 2) * (1 + 2 * MARGEN);
  y1 = cy + (ay / 2) * (1 + 2 * MARGEN);
  return { x0, x1, y0, y1 };
}

/** ¿El mapa guardado alcanza para todos estos lugares? */
function cubre(m, lugares) {
  return lugares.filter(cerca).every((l) => {
    const x = mx(l.lon), y = my(l.lat);
    return x > m.lim.x0 && x < m.lim.x1 && y > m.lim.y0 && y < m.lim.y1;
  });
}

/** El mapa real listo para mostrar (o null: entonces va el dibujo). */
export function listo() {
  return mapa;
}

/** ¿Se esta armando ahora? */
export function armando() {
  return !!trabajando;
}

/**
 * Se asegura de que haya un mapa real que cubra estos lugares: si falta (o
 * quedo chico), lo arma en segundo plano. Resuelve true si al terminar hay
 * un mapa NUEVO (para volver a dibujar el corcho).
 */
export async function asegurar(lugares) {
  await precargar();
  if (mapa && cubre(mapa, lugares)) return false;
  if (trabajando) return trabajando;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  if (Date.now() - ultimoFallo < REINTENTO_MS) return false;
  trabajando = armar(lugares)
    .then(async (m) => {
      await guardar(m);
      return true;
    })
    .catch(() => {
      ultimoFallo = Date.now();
      return false;
    })
    .finally(() => {
      trabajando = null;
    });
  return trabajando;
}

async function armar(lugares) {
  const lim = limitesDe(lugares);
  const escala = ANCHO / (lim.x1 - lim.x0);
  const enc = { cx: (lim.x0 + lim.x1) / 2, cy: (lim.y0 + lim.y1) / 2, escala, w: ANCHO, h: Math.max(1, Math.round((lim.y1 - lim.y0) * escala)) };
  // el zoom de teselas mas fino que no pase de MAX_TESELAS (el mapa es de 640 pixeles: alcanza)
  const teselas = (z) => {
    const n = 2 ** z;
    return (Math.floor(lim.x1 * n) - Math.floor(lim.x0 * n) + 1) * (Math.floor(lim.y1 * n) - Math.floor(lim.y0 * n) + 1);
  };
  let z = zoomPara(escala);
  while (z > 10 && teselas(z) > MAX_TESELAS) z--;
  const raster = await rasterDeRotulos([enc], z, { tolerancia: 0.08 });
  const lienzo = document.createElement("canvas");
  lienzo.width = enc.w;
  lienzo.height = enc.h;
  pintarRotulos(lienzo.getContext("2d"), rotulosDelEncuadre(raster, enc), enc.w, enc.h);
  return { clave: CLAVE, v: VERSION, lim, enc, png: lienzo.toDataURL("image/png"), t: Date.now() };
}

/**
 * Donde cae un punto en el mapa real, en pixeles de mapa. Lo que queda
 * fuera (un viaje lejos) se pega al borde: afuera = true.
 */
export function posicion(lat, lon) {
  if (!mapa) return null;
  const [x, y] = proyectar(mapa.enc, lat, lon);
  const cx = Math.max(6, Math.min(mapa.enc.w - 6, x));
  const cy = Math.max(6, Math.min(mapa.enc.h - 6, y));
  return { x: cx, y: cy, afuera: cx !== x || cy !== y };
}

/** Cuantos pixeles de mapa son `km` kilometros (para el zoom inicial). */
export function pxPorKm(km = 1) {
  if (!mapa) return 1;
  const lat = CENTRO.lat;
  const metrosPorUnidad = 40075016 * Math.cos((lat * Math.PI) / 180);
  return (km * 1000 * mapa.enc.escala) / metrosPorUnidad;
}

/** Para pruebas: olvidar el mapa en memoria (y los reintentos). */
export function _reiniciar() {
  mapa = null;
  precargado = null;
  ultimoFallo = 0;
}
