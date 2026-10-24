/**
 * mapaLocal.js
 * =============
 * v35: el mapa de Hangzhou que viaja con la app (tools/mapa_offline.py, con
 * los datos de OpenStreetMap). Son teselas de "rotulos" (agua, bosque,
 * parque, tierra, edificio, calle) en paquetes, una por zoom:
 *
 *   assets/mapa/mapa.json  que zooms hay y que teselas cubre cada uno
 *   assets/mapa/hz{z}.bin  "BZMAPA1\n" + largo (uint32) + cabecera JSON + PNGs;
 *                          en la cabecera, cada tesela es un numero (toda de
 *                          un rotulo) o [offset, largo] de su PNG.
 *
 * mapaDia.js las usa en vez de bajar teselas de internet cuando cubren lo
 * que hace falta: el mapa sale sin señal y sin depender de que OpenStreetMap
 * cargue en China. El service worker guarda los paquetes al instalar.
 */

const BASE = "./assets/mapa/";
const MAGIA = "BZMAPA1\n";

let indicePromesa = null;
const paquetes = new Map(); // z -> promesa de { cab, datos }

/** El indice (o null si no hay mapa local). */
export function indice() {
  if (!indicePromesa) {
    indicePromesa = fetch(BASE + "mapa.json")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((j) => {
        if (!j) indicePromesa = null; // se reintenta la proxima
        return j;
      });
  }
  return indicePromesa;
}

function paquete(z, info) {
  if (!paquetes.has(z)) {
    const p = fetch(BASE + info.archivo)
      .then((r) => {
        if (!r.ok) throw new Error("paquete");
        return r.arrayBuffer();
      })
      .then((buf) => {
        const u8 = new Uint8Array(buf);
        const txt = new TextDecoder();
        if (txt.decode(u8.subarray(0, 8)) !== MAGIA) throw new Error("paquete");
        const largo = new DataView(buf).getUint32(8, true);
        const cab = JSON.parse(txt.decode(u8.subarray(12, 12 + largo)));
        return { cab, datos: u8.subarray(12 + largo) };
      });
    p.catch(() => paquetes.delete(z));
    paquetes.set(z, p);
  }
  return paquetes.get(z);
}

/** Las teselas (tx0..tx1, ty0..ty1, inclusive) que tocan una caja normalizada a ese zoom. */
export function teselasDe(caja, z) {
  const n = 2 ** z * 256;
  const px0 = Math.floor(caja.x0 * n), px1 = Math.ceil(caja.x1 * n);
  const py0 = Math.floor(caja.y0 * n), py1 = Math.ceil(caja.y1 * n);
  return { tx0: Math.floor(px0 / 256), tx1: Math.floor((px1 - 1) / 256), ty0: Math.floor(py0 / 256), ty1: Math.floor((py1 - 1) / 256) };
}

/**
 * El zoom local mas fino (como mucho z) que tiene toda la caja
 * ({ x0, x1, y0, y1 } en Web Mercator 0..1), o null.
 */
export async function zoomLocal(z, caja) {
  const ind = await indice();
  if (!ind || !ind.zooms) return null;
  const zs = Object.keys(ind.zooms)
    .map(Number)
    .filter((k) => k <= z)
    .sort((a, b) => b - a);
  for (const k of zs) {
    const i = ind.zooms[k];
    const t = teselasDe(caja, k);
    if (t.tx0 >= i.tx0 && t.tx1 < i.tx0 + i.nx && t.ty0 >= i.ty0 && t.ty1 < i.ty0 + i.ny) return k;
  }
  return null;
}

/** El mas fino de los zooms locales (para saber que tan cerca se puede llegar). */
export async function zoomMaximo() {
  const ind = await indice();
  return ind && ind.zooms ? Math.max(...Object.keys(ind.zooms).map(Number)) : null;
}

function decodificar(bytes) {
  const blob = new Blob([bytes], { type: "image/png" });
  if (typeof createImageBitmap === "function") return createImageBitmap(blob);
  return new Promise((ok, mal) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      ok(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      mal(new Error("tesela"));
    };
    img.src = url;
  });
}

/**
 * Pinta en ctx las teselas locales de ese zoom que cubren [px0, px1) x [py0, py1)
 * (pixeles de tesela). `colores[rotulo]` = el color con que se pinta una tesela lisa.
 */
export async function pintar(ctx, z, px0, py0, px1, py1, colores) {
  const ind = await indice();
  const info = ind && ind.zooms && ind.zooms[z];
  if (!info) throw new Error("sin mapa local");
  const { cab, datos } = await paquete(z, info);
  const trabajos = [];
  for (let tx = Math.floor(px0 / 256); tx <= Math.floor((px1 - 1) / 256); tx++) {
    for (let ty = Math.floor(py0 / 256); ty <= Math.floor((py1 - 1) / 256); ty++) {
      const i = tx - cab.tx0, j = ty - cab.ty0;
      if (i < 0 || j < 0 || i >= cab.nx || j >= cab.ny) throw new Error("fuera del mapa local");
      const e = cab.t[j * cab.nx + i];
      const x = tx * 256 - px0, y = ty * 256 - py0;
      if (typeof e === "number") {
        const c = colores[e];
        ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        ctx.fillRect(x, y, 256, 256);
      } else {
        trabajos.push(decodificar(datos.subarray(e[0], e[0] + e[1])).then((img) => ctx.drawImage(img, x, y)));
      }
    }
  }
  await Promise.all(trabajos);
}

/** Para pruebas: olvidar lo cargado. */
export function _reiniciar() {
  indicePromesa = null;
  paquetes.clear();
}
