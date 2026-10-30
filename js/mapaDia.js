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
import { wgsAGcj } from "./mundo.js";
import * as Donde from "./dondeEstuvimos.js";

export const MINI = { w: 146, h: 110 }; // la polaroid del diario (4:3)
export const GRANDE = { w: 300, h: 176 }; // la vista grande (se ve a 2x)
const MARGEN = 0.17;
const ANCHO_MINIMO_M = 900; // aunque esten cerca, se ve un poco de barrio
const TESELA_POR_PIXEL = 4; // 1 pixel del mapa = 4 pixeles de tesela (los textos se borran solos)
const ZOOM_MAX = 17;
const ZOOM_MIN = 3;
const URL_TESELA = (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
// v41: en China OpenStreetMap a veces no carga (y el mapa se quedaba en el
// dibujo de respaldo). Si falla, se prueba con las teselas de Amap (Gaode),
// que si cargan alla y dejan leer los pixeles. Amap usa GCJ-02 (el
// "corrimiento chino", ~500 m): se corre el pedido para que todo calce.
// Se recuerda cual anduvo, para empezar por ese la proxima vez.
const URL_AMAP = (z, x, y) => `https://wprd0${1 + ((x + y) % 4)}.is.autonavi.com/appmaptile?x=${x}&y=${y}&z=${z}&lang=zh_cn&size=1&scl=1&style=7&ltype=3`;
const CLAVE_PROVEEDOR = "baozi_mapa_proveedor";
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

// los colores de Amap (estilo 7, areas y calles, sin rotulos)
const REFERENCIAS_AMAP = [
  [164, 205, 255, R.agua], [180, 215, 212, R.agua], [172, 210, 232, R.agua], [175, 212, 225, R.agua],
  [201, 229, 158, R.parque], [191, 223, 182, R.parque], [198, 227, 165, R.parque], [212, 223, 182, R.parque], [186, 219, 196, R.parque],
  [252, 249, 242, R.tierra], [239, 236, 231, R.tierra], [244, 242, 237, R.tierra], [216, 231, 238, R.tierra],
  [234, 225, 238, R.edif], [227, 221, 212, R.edif], [222, 218, 205, R.edif],
  [255, 255, 255, R.calle], [254, 254, 254, R.calle], [255, 235, 161, R.calle], [255, 213, 128, R.calle], [250, 200, 110, R.calle],
];

function rotular(r, g, b, refs = REFERENCIAS) {
  let mejor = 0, dist = Infinity;
  for (const ref of refs) {
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
const PROVEEDORES = {
  osm: { url: URL_TESELA, refs: REFERENCIAS, gcj: false },
  amap: { url: URL_AMAP, refs: REFERENCIAS_AMAP, gcj: true },
};
function ordenProveedores() {
  let primero = "osm";
  try {
    if (localStorage.getItem(CLAVE_PROVEEDOR) === "amap") primero = "amap";
  } catch (e) {
    /* nada */
  }
  return primero === "amap" ? ["amap", "osm"] : ["osm", "amap"];
}

export async function rasterDeRotulos(encuadres, z, opciones = {}) {
  let ultimo = null;
  for (const id of ordenProveedores()) {
    try {
      const r = await rasterDe(encuadres, z, opciones, PROVEEDORES[id]);
      try {
        localStorage.setItem(CLAVE_PROVEEDOR, id);
      } catch (e) {
        /* nada */
      }
      return r;
    } catch (e) {
      ultimo = e;
    }
  }
  throw ultimo || new Error("teselas");
}

async function rasterDe(encuadres, z, { tolerancia = 0 } = {}, prov = PROVEEDORES.osm) {
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
  // GCJ-02: lo que en WGS84 esta en p, en las teselas de Amap esta en p + (dx, dy)
  let dx = 0, dy = 0;
  if (prov.gcj) {
    const cxN = (px0 + px1) / 2 / n, cyN = (py0 + py1) / 2 / n;
    const lon = cxN * 360 - 180;
    const lat = (Math.atan(Math.sinh(Math.PI * (1 - 2 * cyN))) * 180) / Math.PI;
    const [glat, glon] = wgsAGcj(lat, lon);
    dx = Math.round((mx(glon) - cxN) * n);
    dy = Math.round((my(glat) - cyN) * n);
  }
  const qx0 = px0 + dx, qy0 = py0 + dy, qx1 = px1 + dx, qy1 = py1 + dy;
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = prov.gcj ? "rgb(164,205,255)" : "rgb(170,211,223)";
  ctx.fillRect(0, 0, ancho, alto);
  const lado = 2 ** z;
  const pedidos = [];
  for (let tx = Math.floor(qx0 / 256); tx <= Math.floor((qx1 - 1) / 256); tx++) {
    for (let ty = Math.floor(qy0 / 256); ty <= Math.floor((qy1 - 1) / 256); ty++) {
      if (ty < 0 || ty >= lado) continue;
      const txx = ((tx % lado) + lado) % lado;
      pedidos.push(cargarImagen(prov.url(z, txx, ty)).then((img) => ctx.drawImage(img, tx * 256 - qx0, ty * 256 - qy0)));
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
      v = rotular(datos[j], datos[j + 1], datos[j + 2], prov.refs);
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
    if (raster) atribucion(ctx, enc.w, enc.h);
    salida[nombre] = lienzo.toDataURL("image/png");
    if (nombre === "grande") posGrande = pos;
  }
  return { dia, firma: Donde.firma(dia), real: !!raster, osm: !!raster, mini: salida.mini, grande: salida.grande, pos: posGrande, t: Date.now() };
}

/**
 * v35: el mapa real lleva "© OpenStreetMap" adentro (lo pide la licencia de
 * los datos), chiquito en la esquina: asi va tambien en la polaroid, en la
 * vista grande y en la imagen que se guarda.
 */
export function atribucion(ctx, w, h) {
  const texto = "© OpenStreetMap";
  ctx.save();
  ctx.font = `${w >= 200 ? 7 : 6}px sans-serif`;
  ctx.textBaseline = "bottom";
  const ancho = Math.ceil(ctx.measureText(texto).width) + 4;
  const alto = w >= 200 ? 9 : 8;
  ctx.fillStyle = "rgba(255,251,240,0.8)";
  ctx.fillRect(w - ancho, h - alto, ancho, alto);
  ctx.fillStyle = "rgb(70,60,62)";
  ctx.fillText(texto, w - ancho + 2, h);
  ctx.restore();
}

/** v35: a un mapa real guardado antes de la atribucion se la agrega encima (sin bajar nada). */
async function conAtribucion(m) {
  const sellar = (dataUrl, w, h) =>
    new Promise((ok) => {
      const img = new Image();
      img.onload = () => {
        try {
          const lienzo = document.createElement("canvas");
          lienzo.width = w;
          lienzo.height = h;
          const ctx = lienzo.getContext("2d");
          ctx.drawImage(img, 0, 0);
          atribucion(ctx, w, h);
          ok(lienzo.toDataURL("image/png"));
        } catch (e) {
          ok(dataUrl);
        }
      };
      img.onerror = () => ok(dataUrl);
      img.src = dataUrl;
    });
  const mini = await sellar(m.mini, MINI.w, MINI.h);
  const grande = m.grande ? await sellar(m.grande, GRANDE.w, GRANDE.h) : m.grande;
  return { ...m, mini, grande, osm: true };
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

// v35: los mapas viejos se borran (antes se juntaban para siempre y se
// cargaban TODOS a memoria al abrir). Un mapa se rehace solo con los puntos
// del dia (dondeEstuvimos.js los guarda mas tiempo), si alguna vez hace falta.
export const DIAS_DE_MAPAS = 120;

/** "AAAA-MM-DD" de hace `dias` dias (el limite de lo que se conserva). */
export function diaLimite(dias = DIAS_DE_MAPAS, ahora = new Date()) {
  return Donde.claveDelDia(new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - dias));
}

export async function precargarMapas() {
  const db = await abrirDB();
  if (!db) return;
  const limite = diaLimite();
  try {
    // los de antes del limite se borran (las claves "AAAA-MM-DD" se ordenan como fechas)
    db.transaction(TIENDA, "readwrite").objectStore(TIENDA).delete(IDBKeyRange.upperBound(limite, true));
  } catch (e) {
    /* nada: es limpieza */
  }
  await new Promise((resolve) => {
    try {
      // y a memoria solo los de los ultimos DIAS_DE_MAPAS dias
      const p = db.transaction(TIENDA, "readonly").objectStore(TIENDA).getAll(IDBKeyRange.lowerBound(limite));
      p.onsuccess = () => {
        for (const m of p.result || []) if (m && m.dia && m.mini) porDia.set(m.dia, m);
        resolve();
        // (despues, de a uno: los reales de antes de v35 no tenian la atribucion)
        (async () => {
          for (const m of [...porDia.values()]) {
            if (!m.real || m.osm) continue;
            const nuevo = await conAtribucion(m);
            if (porDia.get(m.dia) === m) await guardarMapa(nuevo);
          }
        })().catch(() => {});
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
