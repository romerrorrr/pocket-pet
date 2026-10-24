/**
 * v28: el mapa de "donde estuvimos hoy" para el diario.
 *
 * El fondo es el mapa real de OpenStreetMap, redibujado con los colores del
 * juego: se bajan las teselas una vez, cada pixel se clasifica (agua,
 * bosque, parque, tierra, edificio, calle) y se pinta en pixel art, sin
 * textos. Arriba van los pines de cada lugar y puntitos que los unen en el
 * orden del dia (los puntitos dicen "despues fuimos aca", no el camino).
 *
 * Si no hay internet o las teselas no cargan (en China puede pasar), sale un
 * mapa de pergamino con los mismos pines y se reintenta mas tarde.
 *
 * Los mapas hechos se guardan en IndexedDB: un dia que ya paso no se vuelve
 * a bajar.
 */
import * as Donde from "./dondeEstuvimos.js";

export const MINI = { w: 146, h: 110 }; // la polaroid del diario (4:3)
export const GRANDE = { w: 300, h: 176 }; // la vista grande (se ve a 2x)
const MARGEN = 0.17;
const ANCHO_MINIMO_M = 900; // aunque esten cerca, se ve un poco de barrio
const TESELA_POR_PIXEL = 4; // 1 pixel del mapa = 4 pixeles de tesela (los textos se borran solos)
const ZOOM_MAX = 17;
const ZOOM_MIN = 3;
const URL_TESELA = (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
const ESPERA_TESELA_MS = 12000;
const REINTENTO_MS = 30 * 60000;

// ------------------------------------------------------------------
// Proyeccion (Web Mercator normalizada: 0..1)
// ------------------------------------------------------------------

export const mx = (lon) => (lon + 180) / 360;
export const my = (lat) => {
  const r = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
  return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2;
};

/**
 * Encuadre de los pines en un lienzo w x h: centro y escala (pixeles de
 * mapa por unidad normalizada).
 */
export function encuadre(pines, w, h) {
  const xs = pines.map((p) => mx(p.lon));
  const ys = pines.map((p) => my(p.lat));
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const latMedia = pines.reduce((s, p) => s + p.lat, 0) / pines.length;
  const minimo = ANCHO_MINIMO_M / (40075016 * Math.cos((latMedia * Math.PI) / 180));
  const util = 1 - 2 * MARGEN;
  const escala = Math.min((w * util) / Math.max(x1 - x0, minimo), (h * util) / Math.max(y1 - y0, minimo * (h / w)));
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, escala, w, h };
}

/** El zoom de teselas para que 1 pixel del mapa sean ~4 pixeles de tesela. */
export function zoomPara(escala) {
  const z = Math.round(Math.log2((escala * TESELA_POR_PIXEL) / 256));
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
}

export function proyectar(enc, lat, lon) {
  return [Math.round(enc.w / 2 + (mx(lon) - enc.cx) * enc.escala), Math.round(enc.h / 2 + (my(lat) - enc.cy) * enc.escala)];
}

// ------------------------------------------------------------------
// Paleta
// ------------------------------------------------------------------

const ROTULOS = ["agua", "bosque", "parque", "tierra", "edif", "calle"];
const R = Object.fromEntries(ROTULOS.map((k, i) => [k, i]));
// colores del estilo estandar de OpenStreetMap -> que son
const REFERENCIAS = [
  [170, 211, 223, R.agua], [181, 208, 208, R.agua],
  [173, 209, 158, R.bosque], [200, 215, 171, R.bosque], [157, 202, 138, R.bosque],
  [200, 250, 204, R.parque], [205, 235, 176, R.parque], [223, 252, 226, R.parque], [181, 227, 181, R.parque],
  [242, 239, 233, R.tierra], [224, 223, 223, R.tierra], [238, 240, 213, R.tierra], [255, 241, 186, R.tierra], [242, 218, 217, R.tierra], [235, 219, 232, R.tierra],
  [217, 208, 201, R.edif], [196, 182, 171, R.edif],
  [255, 255, 255, R.calle], [247, 250, 191, R.calle], [252, 214, 164, R.calle], [249, 178, 156, R.calle], [232, 146, 162, R.calle],
];
const PALETA = {
  agua: [126, 176, 204], orilla: [98, 148, 180], bosque: [150, 176, 118], bosque2: [128, 156, 100],
  parque: [178, 200, 140], tierra: [240, 230, 206], edif: [214, 196, 168], calle: [255, 251, 240],
};
const TINTA = [30, 28, 30];
const CREMA = [255, 251, 240];
const ROSA = [186, 78, 104];
const PERG = [243, 230, 198], PERG2 = [232, 215, 176], PERG3 = [214, 192, 148], ARBOL = [138, 160, 108], ARBOL2 = [104, 126, 84];

function rotular(r, g, b) {
  let mejor = 0, dist = Infinity;
  for (const ref of REFERENCIAS) {
    const d = (r - ref[0]) ** 2 + (g - ref[1]) ** 2 + (b - ref[2]) ** 2;
    if (d < dist) {
      dist = d;
      mejor = ref[3];
    }
  }
  return mejor;
}

// ------------------------------------------------------------------
// Teselas
// ------------------------------------------------------------------

function cargarImagen(url) {
  return new Promise((ok, mal) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const reloj = setTimeout(() => mal(new Error("tarde")), ESPERA_TESELA_MS);
    img.onload = () => {
      clearTimeout(reloj);
      ok(img);
    };
    img.onerror = () => {
      clearTimeout(reloj);
      mal(new Error("tesela"));
    };
    img.src = url;
  });
}

/**
 * Baja las teselas que cubren los encuadres y devuelve los rotulos de cada
 * pixel de tesela: { z, x0, y0, ancho, alto, rot: Uint8Array }.
 * tolerancia: que parte de las teselas puede fallar (queda como agua) antes
 * de darse por vencido. El mapa del dia no tolera ninguna; el del corcho
 * (v31, corchoReal.js), que baja muchas, alguna que otra.
 */
export async function rasterDeRotulos(encuadres, z, { tolerancia = 0 } = {}) {
  const n = 2 ** z * 256;
  let px0 = Infinity, py0 = Infinity, px1 = -Infinity, py1 = -Infinity;
  for (const e of encuadres) {
    px0 = Math.min(px0, (e.cx - e.w / 2 / e.escala) * n);
    px1 = Math.max(px1, (e.cx + e.w / 2 / e.escala) * n);
    py0 = Math.min(py0, (e.cy - e.h / 2 / e.escala) * n);
    py1 = Math.max(py1, (e.cy + e.h / 2 / e.escala) * n);
  }
  px0 = Math.floor(px0); py0 = Math.floor(py0); px1 = Math.ceil(px1); py1 = Math.ceil(py1);
  const ancho = px1 - px0, alto = py1 - py0;
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "rgb(170,211,223)";
  ctx.fillRect(0, 0, ancho, alto);
  const lado = 2 ** z;
  const pedidos = [];
  for (let tx = Math.floor(px0 / 256); tx <= Math.floor((px1 - 1) / 256); tx++) {
    for (let ty = Math.floor(py0 / 256); ty <= Math.floor((py1 - 1) / 256); ty++) {
      if (ty < 0 || ty >= lado) continue;
      const txx = ((tx % lado) + lado) % lado;
      pedidos.push(cargarImagen(URL_TESELA(z, txx, ty)).then((img) => ctx.drawImage(img, tx * 256 - px0, ty * 256 - py0)));
    }
  }
  let fallas = 0;
  await Promise.all(pedidos.map((pd) => pd.catch(() => fallas++)));
  if (fallas > Math.floor(pedidos.length * tolerancia)) throw new Error("teselas");
  const datos = ctx.getImageData(0, 0, ancho, alto).data; // tira si la tesela no permite leerla
  const rot = new Uint8Array(ancho * alto);
  const memo = new Map();
  for (let i = 0, j = 0; i < rot.length; i++, j += 4) {
    const k = (datos[j] << 16) | (datos[j + 1] << 8) | datos[j + 2];
    let v = memo.get(k);
    if (v === undefined) {
      v = rotular(datos[j], datos[j + 1], datos[j + 2]);
      memo.set(k, v);
    }
    rot[i] = v;
  }
  return { z, x0: px0, y0: py0, ancho, alto, rot };
}

/** Los rotulos de un encuadre (w x h) a partir del raster: moda de cada celda. */
export function rotulosDelEncuadre(raster, e) {
  const n = 2 ** raster.z * 256;
  const { w, h } = e;
  const izq = (e.cx - w / 2 / e.escala) * n - raster.x0;
  const arr = (e.cy - h / 2 / e.escala) * n - raster.y0;
  const paso = n / e.escala; // pixeles de tesela por pixel de mapa
  const out = new Uint8Array(w * h);
  const cuenta = new Uint16Array(ROTULOS.length);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      cuenta.fill(0);
      const a0 = Math.floor(izq + i * paso), a1 = Math.max(a0 + 1, Math.floor(izq + (i + 1) * paso));
      const b0 = Math.floor(arr + j * paso), b1 = Math.max(b0 + 1, Math.floor(arr + (j + 1) * paso));
      let total = 0;
      for (let y = Math.max(0, b0); y < Math.min(raster.alto, b1); y++) {
        for (let x = Math.max(0, a0); x < Math.min(raster.ancho, a1); x++) {
          cuenta[raster.rot[y * raster.ancho + x]]++;
          total++;
        }
      }
      let mejor = R.agua;
      if (total) {
        // las calles son finas: si hay bastante calle, gana la calle
        if (cuenta[R.calle] >= 0.3 * total) mejor = R.calle;
        else {
          let m = -1;
          for (let k = 0; k < cuenta.length; k++) if (cuenta[k] > m) { m = cuenta[k]; mejor = k; }
        }
      }
      out[j * w + i] = mejor;
    }
  }
  // limpiar pixeles sueltos (menos las calles)
  const limpio = out.slice();
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const propio = out[j * w + i];
      if (propio === R.calle) continue;
      cuenta.fill(0);
      for (let y = Math.max(0, j - 1); y < Math.min(h, j + 2); y++) for (let x = Math.max(0, i - 1); x < Math.min(w, i + 2); x++) cuenta[out[y * w + x]]++;
      if (cuenta[propio] <= 2) {
        let m = -1, k2 = propio;
        for (let k = 0; k < cuenta.length; k++) if (cuenta[k] > m) { m = cuenta[k]; k2 = k; }
        limpio[j * w + i] = k2;
      }
    }
  }
  return limpio;
}

export function pintarRotulos(ctx, rot, w, h) {
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = rot[j * w + i];
      let c = PALETA[ROTULOS[k]];
      if (k === R.agua) {
        const borde = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
          const x = i + dx, y = j + dy;
          return x >= 0 && y >= 0 && x < w && y < h && rot[y * w + x] !== R.agua;
        });
        if (borde) c = PALETA.orilla;
      } else if (k === R.bosque && (i * 5 + j * 3) % 11 === 0) c = PALETA.bosque2;
      const o = (j * w + i) * 4;
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// ------------------------------------------------------------------
// Dibujo (pergamino de respaldo, puntitos, pines)
// ------------------------------------------------------------------

function azar(semilla) {
  let s = semilla >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function px(ctx, x, y, c) {
  ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
  ctx.fillRect(x, y, 1, 1);
}

function pergamino(ctx, w, h, pos, semilla) {
  ctx.fillStyle = `rgb(${PERG.join(",")})`;
  ctx.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 16) for (let y = 0; y < h; y += 2) px(ctx, x, y, PERG2);
  for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 2) px(ctx, x, y, PERG2);
  const r = azar(semilla);
  for (let k = 0; k < (w * h) / 60; k++) px(ctx, Math.floor(r() * w), Math.floor(r() * h), PERG2);
  for (let k = 0; k < (w * h) / 480; k++) {
    const x = 6 + Math.floor(r() * (w - 12)), y = 8 + Math.floor(r() * (h - 14));
    if (pos.some(([a, b]) => (a - x) ** 2 + (b - y) ** 2 < 100)) continue;
    for (const [dx, dy, c] of [[0, -2, ARBOL], [-1, -1, ARBOL], [0, -1, ARBOL], [1, -1, ARBOL], [-1, 0, ARBOL2], [0, 0, ARBOL], [1, 0, ARBOL2], [0, 1, PERG3]]) px(ctx, x + dx, y + dy, c);
  }
  for (let x = 0; x < w; x++) { px(ctx, x, 0, PERG3); px(ctx, x, h - 1, PERG3); }
  for (let y = 0; y < h; y++) { px(ctx, 0, y, PERG3); px(ctx, w - 1, y, PERG3); }
}

function puntitos(ctx, a, b, paso) {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(1, Math.floor(d / paso));
  for (let k = 1; k < n; k++) {
    const x = Math.round(a[0] + ((b[0] - a[0]) * k) / n), y = Math.round(a[1] + ((b[1] - a[1]) * k) / n);
    ctx.fillStyle = "rgb(70,60,62)";
    ctx.fillRect(x - 1, y - 1, 3, 3);
    px(ctx, x, y, CREMA);
  }
}

const PIN = [
  ".kkkkk.",
  "kRRRRRk",
  "kRwwRRk",
  "kRwRRRk",
  "kRRRRRk",
  ".kRRRk.",
  "..kRk..",
  "...k...",
];

function pin(ctx, x, y) {
  const col = { k: TINTA, R: ROSA, w: CREMA };
  PIN.forEach((fila, j) => [...fila].forEach((ch, i) => col[ch] && px(ctx, x - 3 + i, y - 7 + j, col[ch])));
}

function dibujarEncima(ctx, pos, orden, chico) {
  for (let k = 1; k < orden.length; k++) puntitos(ctx, pos[orden[k - 1]], pos[orden[k]], chico ? 5 : 7);
  for (const [x, y] of pos) pin(ctx, x, y);
}

function semillaDe(dia) {
  let s = 7;
  for (const c of dia) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  return s;
}

/**
 * Hace el mapa de un dia. Devuelve { dia, firma, real, mini, grande, pos }
 * (pos = donde quedo cada pin en el mapa grande, en pixeles de mapa).
 */
export async function hacerMapa(dia, { pines, orden } = Donde.pinesDe(dia), { sinRed = false } = {}) {
  const encMini = encuadre(pines, MINI.w, MINI.h);
  const encGrande = encuadre(pines, GRANDE.w, GRANDE.h);
  let raster = null;
  if (!sinRed && (typeof navigator === "undefined" || navigator.onLine !== false)) {
    try {
      raster = await rasterDeRotulos([encMini, encGrande], zoomPara(encGrande.escala));
    } catch (e) {
      raster = null;
    }
  }
  const salida = {};
  let posGrande = [];
  for (const [nombre, enc] of [["mini", encMini], ["grande", encGrande]]) {
    const lienzo = document.createElement("canvas");
    lienzo.width = enc.w;
    lienzo.height = enc.h;
    const ctx = lienzo.getContext("2d");
    const pos = pines.map((p) => proyectar(enc, p.lat, p.lon));
    if (raster) pintarRotulos(ctx, rotulosDelEncuadre(raster, enc), enc.w, enc.h);
    else pergamino(ctx, enc.w, enc.h, pos, semillaDe(dia));
    dibujarEncima(ctx, pos, orden, nombre === "mini");
    salida[nombre] = lienzo.toDataURL("image/png");
    if (nombre === "grande") posGrande = pos;
  }
  return { dia, firma: Donde.firma(dia), real: !!raster, mini: salida.mini, grande: salida.grande, pos: posGrande, t: Date.now() };
}

// ------------------------------------------------------------------
// Guardado (IndexedDB) y cola
// ------------------------------------------------------------------

const DB_NOMBRE = "mochi_mapas";
const TIENDA = "mapas";
let dbPromesa = null;
const porDia = new Map();

function abrirDB() {
  if (dbPromesa) return dbPromesa;
  dbPromesa = new Promise((resolve) => {
    try {
      if (!("indexedDB" in window)) return resolve(null);
      const p = indexedDB.open(DB_NOMBRE, 1);
      p.onupgradeneeded = () => {
        if (!p.result.objectStoreNames.contains(TIENDA)) p.result.createObjectStore(TIENDA, { keyPath: "dia" });
      };
      p.onsuccess = () => resolve(p.result);
      p.onerror = () => resolve(null);
      p.onblocked = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
  return dbPromesa;
}

export async function precargarMapas() {
  const db = await abrirDB();
  if (!db) return;
  await new Promise((resolve) => {
    try {
      const p = db.transaction(TIENDA, "readonly").objectStore(TIENDA).getAll();
      p.onsuccess = () => {
        for (const m of p.result || []) if (m && m.dia && m.mini) porDia.set(m.dia, m);
        resolve();
      };
      p.onerror = () => resolve();
    } catch (e) {
      resolve();
    }
  });
}

async function guardarMapa(m) {
  porDia.set(m.dia, m);
  const db = await abrirDB();
  if (!db) return;
  try {
    db.transaction(TIENDA, "readwrite").objectStore(TIENDA).put(m);
  } catch (e) {
    /* nada */
  }
}

/** El mapa guardado de un dia (aunque este por rehacerse), o null. */
export function mapaDe(dia) {
  return Donde.hayMapa(dia) ? porDia.get(dia) || null : null;
}

export function necesitaHacerse(dia, ahora = Date.now()) {
  if (!Donde.hayMapa(dia)) return false;
  const m = porDia.get(dia);
  if (!m) return true;
  if (m.firma !== Donde.firma(dia)) return true;
  return !m.real && ahora - (m.t || 0) > REINTENTO_MS;
}

let trabajando = false;

/**
 * Hace (de a uno) los mapas que faltan de esos dias. alListo(dia) se llama
 * cada vez que uno queda hecho. Como mucho `tope` por vez.
 */
export async function hacerPendientes(dias, alListo = () => {}, tope = 3) {
  if (trabajando) return;
  trabajando = true;
  try {
    let hechos = 0;
    for (const dia of dias) {
      if (hechos >= tope) break;
      if (!necesitaHacerse(dia)) continue;
      try {
        const m = await hacerMapa(dia);
        await guardarMapa(m);
        hechos++;
        alListo(dia);
      } catch (e) {
        /* sigue con el proximo */
      }
    }
  } finally {
    trabajando = false;
  }
}
