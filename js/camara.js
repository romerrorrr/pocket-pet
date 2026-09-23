/**
 * camara.js
 * ==========
 * Las fotos del juego: como se ven y donde se guardan. La camara en
 * vivo (el visor) vive en lente.js; aca esta lo que comparten el visor
 * y el respaldo de "abrir la app de camara":
 *
 *  - EL FILTRO. Baozi ve el mundo como una Game Boy Camera, pero con la
 *    paleta del juego: 6 tonos de tinta a papel, con tramado
 *    ordenado (Bayer 4x4) — el mismo recurso de las fotos de 1998, que
 *    es lo que hace que una foto real parezca dibujada por el aparato.
 *    176x132 px nativos: se guardan ASI (chicas, ~10-20 KB) y se
 *    agrandan con image-rendering:pixelated, asi el pixel queda
 *    perfecto a cualquier tamaño en vez de "pixelado y despues
 *    suavizado".
 *
 *  - EL ALBUM. IndexedDB (las fotos no entran en localStorage). Cada
 *    foto guarda su dia, el lugar donde se saco (si fue en un
 *    descubrimiento) y su tipo ("diario", "hallazgo", "final"). 100%
 *    local, nunca sale del telefono.
 */

export const ANCHO_FOTO = 176;
export const ALTO_FOTO = 132;

// De oscuro a claro: la paleta "tinta y papel". Grises calidos, como
// una Game Boy Camera impresa en papel termico.
export const PALETA_LENTE = [
  [22, 20, 22],
  [62, 56, 58],
  [110, 100, 100],
  [172, 160, 156],
  [226, 214, 204],
  [244, 238, 226],
];

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5 + 1 / 32);

/** Recorte 4:3 centrado de una fuente de w x h. */
export function recorte43(w, h) {
  const objetivo = 4 / 3;
  if (w / h > objetivo) {
    const cw = Math.round(h * objetivo);
    return { sx: Math.round((w - cw) / 2), sy: 0, sw: cw, sh: h };
  }
  const ch = Math.round(w / objetivo);
  return { sx: 0, sy: Math.round((h - ch) / 2), sw: w, sh: ch };
}

/**
 * Niveles automaticos: percentiles 3% y 97% de la luminancia. Sin esto
 * una foto de interior queda toda en los dos tonos mas oscuros.
 */
export function medirNiveles(datos) {
  const hist = new Uint32Array(256);
  const d = datos.data;
  for (let i = 0; i < d.length; i += 4) hist[(d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8]++;
  const total = d.length / 4;
  let acum = 0;
  let lo = 0;
  let hi = 255;
  for (let v = 0; v < 256; v++) {
    acum += hist[v];
    if (acum >= total * 0.03) {
      lo = v;
      break;
    }
  }
  acum = 0;
  for (let v = 255; v >= 0; v--) {
    acum += hist[v];
    if (acum >= total * 0.03) {
      hi = v;
      break;
    }
  }
  if (hi - lo < 24) hi = Math.min(255, lo + 24);
  return { lo, hi };
}

/** Tramado a la paleta, en el lugar (pisa `datos`). */
export function tramar(datos, niveles, paleta = PALETA_LENTE) {
  const { width: w, data: d } = datos;
  const n = paleta.length - 1;
  const rango = Math.max(1, niveles.hi - niveles.lo);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const x = p % w;
    const y = (p / w) | 0;
    let l = ((d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8) - niveles.lo;
    l = l / rango;
    if (l < 0) l = 0;
    else if (l > 1) l = 1;
    let k = Math.floor(l * n + 0.5 + BAYER4[(y & 3) * 4 + (x & 3)]);
    if (k < 0) k = 0;
    else if (k > n) k = n;
    const c = paleta[k];
    d[i] = c[0];
    d[i + 1] = c[1];
    d[i + 2] = c[2];
    d[i + 3] = 255;
  }
  return datos;
}

/**
 * Cualquier imagen/video -> lienzo de 176x132 ya tramado. Se usa para
 * las fotos que vienen del selector de archivos (respaldo) — el visor
 * en vivo hace lo mismo cuadro a cuadro en lente.js.
 */
export function fotoTramada(fuente, fw, fh, { espejo = false } = {}) {
  const lienzo = document.createElement("canvas");
  lienzo.width = ANCHO_FOTO;
  lienzo.height = ALTO_FOTO;
  const ctx = lienzo.getContext("2d", { willReadFrequently: true });
  const r = recorte43(fw, fh);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (espejo) {
    ctx.translate(ANCHO_FOTO, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(fuente, r.sx, r.sy, r.sw, r.sh, 0, 0, ANCHO_FOTO, ALTO_FOTO);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const datos = ctx.getImageData(0, 0, ANCHO_FOTO, ALTO_FOTO);
  tramar(datos, medirNiveles(datos));
  ctx.putImageData(datos, 0, 0);
  return lienzo;
}

// ------------------------------------------------------------------
// El album (IndexedDB)
// ------------------------------------------------------------------

const DB_NOMBRE = "mochi_fotos";
const DB_VERSION = 1;
const TIENDA = "fotos";

let dbPromesa = null;
let fotos = []; // en memoria, orden cronologico: { clave, dia, lugar, tipo, dataUrl, t }
let precargadas = false;

function abrirDB() {
  if (dbPromesa) return dbPromesa;
  if (!("indexedDB" in window)) {
    dbPromesa = Promise.resolve(null);
    return dbPromesa;
  }
  dbPromesa = new Promise((resolve) => {
    try {
      const peticion = indexedDB.open(DB_NOMBRE, DB_VERSION);
      peticion.onupgradeneeded = () => {
        if (!peticion.result.objectStoreNames.contains(TIENDA)) {
          peticion.result.createObjectStore(TIENDA, { keyPath: "clave" });
        }
      };
      peticion.onsuccess = () => resolve(peticion.result);
      peticion.onerror = () => resolve(null);
      peticion.onblocked = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
  return dbPromesa;
}

const ES_DIA = /^\d{4}-\d{2}-\d{2}$/;

/** Normaliza filas viejas (1 foto por dia, clave = fecha) al formato nuevo. */
function normalizar(fila) {
  return {
    clave: fila.clave,
    dia: fila.dia || (ES_DIA.test(fila.clave) ? fila.clave : ""),
    lugar: fila.lugar || null,
    tipo: fila.tipo || "diario",
    dataUrl: fila.dataUrl,
    t: fila.t || fila.guardadoEn || 0,
  };
}

/** Llamar una vez al arrancar. Resuelve siempre (nunca rechaza). */
export async function precargarFotos() {
  const db = await abrirDB();
  if (!db) {
    precargadas = true;
    return;
  }
  await new Promise((resolve) => {
    try {
      const tx = db.transaction(TIENDA, "readonly");
      const peticion = tx.objectStore(TIENDA).getAll();
      peticion.onsuccess = () => {
        const leidas = (peticion.result || []).filter((f) => f && f.dataUrl).map(normalizar);
        // Las que se sacaron mientras cargaba (raro) no se pierden.
        const yaEstan = new Set(leidas.map((f) => f.clave));
        fotos = [...leidas, ...fotos.filter((f) => !yaEstan.has(f.clave))].sort((a, b) => a.t - b.t);
        resolve();
      };
      peticion.onerror = () => resolve();
    } catch (e) {
      resolve();
    }
  });
  precargadas = true;
}

export function fotosCargadas() {
  return precargadas;
}

export function todasLasFotos() {
  return fotos.slice();
}

/** Mas reciente primero. */
export function fotosDelDia(dia) {
  return fotos.filter((f) => f.dia === dia).reverse();
}

export function fotoRealDelDia(dia) {
  const lista = fotosDelDia(dia);
  return lista.length ? lista[0].dataUrl : null;
}

export function fotoDeLugar(idLugar) {
  for (let i = fotos.length - 1; i >= 0; i--) if (fotos[i].lugar === idLugar) return fotos[i].dataUrl;
  return null;
}

export function cantidadDeFotos() {
  return fotos.length;
}

/**
 * Guarda una foto. Queda en memoria al instante (el diario la ve ya) y
 * se escribe en IndexedDB en segundo plano. Devuelve la foto guardada.
 */
export async function guardarFoto({ dataUrl, dia, lugar = null, tipo = "diario" }) {
  const t = Date.now();
  const foto = { clave: `foto_${t}_${Math.random().toString(36).slice(2, 7)}`, dia, lugar, tipo, dataUrl, t };
  fotos.push(foto);
  const db = await Promise.race([abrirDB(), new Promise((r) => setTimeout(() => r(null), 1500))]);
  if (db) {
    // Nunca se espera mas de 1.5 s: la foto ya esta en memoria, y en
    // algunos iOS IndexedDB se cuelga sin error ni respuesta.
    await new Promise((resolve) => {
      setTimeout(resolve, 1500);
      try {
        const tx = db.transaction(TIENDA, "readwrite");
        tx.objectStore(TIENDA).put(foto);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  }
  return foto;
}

// ------------------------------------------------------------------
// Respaldo: la app de camara del sistema via <input type=file>. Se usa
// cuando el visor en vivo no puede abrir la camara (permiso negado, el
// navegador no lo soporta, preview embebido...). Devuelve File o null.
// ------------------------------------------------------------------

export function abrirCaptura({ frontal = false } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.setAttribute("capture", frontal ? "user" : "environment");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    input.style.top = "-9999px";

    let resuelto = false;
    const terminar = (archivo) => {
      if (resuelto) return;
      resuelto = true;
      resolve(archivo);
      input.remove();
    };

    input.addEventListener("change", () => {
      terminar(input.files && input.files[0] ? input.files[0] : null);
    });
    // No hay evento de "cancelo" confiable entre navegadores: si vuelve
    // el foco y no llego archivo al rato, se da por cancelado.
    window.addEventListener(
      "focus",
      () => setTimeout(() => terminar(input.files && input.files[0] ? input.files[0] : null), 4000),
      { once: true },
    );

    document.body.appendChild(input);
    input.click();
  });
}

export function cargarImagen(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}
