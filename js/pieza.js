/**
 * pieza.js
 * =========
 * La pantalla principal: el departamento de Baozi (japones, madera
 * oscura), dibujado en un <canvas> a resolucion de juego (360x160) y
 * ampliado sin suavizado. Cada objeto es una parte del juego y se toca
 * (los toques son <button> invisibles encima, uno por objeto: accesibles
 * y faciles de testear).
 *
 * La luz es de verdad: el arte esta pintado "a media luz" y encima se
 * multiplica una mascara de iluminacion tramada (lampara colgante,
 * lampara del aparador, el brillo de la tele, el haz de la ventana), que
 * cambia con la hora real y cuando Baozi se va a dormir.
 *
 * Todo lo que cambia se dibuja en vivo: el cielo segun la hora real, las
 * agujas del reloj, el dia del calendario, los recuerdos del estante y
 * los pines del corcho (uno por lugar sellado), el farol prendido o
 * apagado, los avisos "!" sobre lo que Baozi necesita, la visita que
 * golpea la ventana, el vapor del te, el disco que gira, el polvo en la
 * luz, y Baozi sentado en su zabuton.
 *
 * Anima a 12 cuadros por segundo: pixel art de verdad, y poca bateria.
 */

import { arte } from "./arte.js";
import { PIEZA } from "./pieza_datos.js";
import * as Personaje from "./personaje.js";
import { FIGURAS } from "./personajes_datos.js";

const [MW, MH] = PIEZA.mundo;
const [SX0, SY0, SX1, SY1] = PIEZA.segura;
const FPS = 12;
const TINTA = "rgb(24,18,16)";

const cache = new Map();
function img(rel) {
  if (!cache.has(rel)) {
    const i = new Image();
    i.decoding = "async";
    i.src = arte(rel);
    cache.set(rel, i);
  }
  return cache.get(rel);
}
const listo = (i) => i && i.complete && i.naturalWidth > 0;

// ------------------------------------------------------------------
// Iluminacion
// ------------------------------------------------------------------
const AMBIENTES = {
  //            multiplicador de ambiente, luz de la ventana, fuerza del haz, cuanto pesan las lamparas
  dia: { amb: [214, 206, 198], ventana: [255, 246, 226], haz: 0.55, lamparas: 0.25 },
  amanecer: { amb: [178, 152, 156], ventana: [255, 206, 176], haz: 0.5, lamparas: 0.6 },
  atardecer: { amb: [150, 118, 118], ventana: [255, 176, 120], haz: 0.6, lamparas: 0.75 },
  noche: { amb: [58, 60, 98], ventana: [110, 132, 196], haz: 0.35, lamparas: 1 },
  dormido: { amb: [30, 32, 66], ventana: [96, 118, 196], haz: 0.55, lamparas: 0 },
};
const [VX0, VY0, VX1, VY1] = PIEZA.vidrio;
const PISO = PIEZA.piso || 118;
const LUCES = PIEZA.luces || {};
const PANTALLA_TELE = (() => {
  const [tx0, ty0, tx1] = PIEZA.objetos.tele;
  return [tx0 + 8, ty0 + 11, tx1 - 16, ty0 + 34];
})();

function dentroHaz(x, y) {
  // el haz de la ventana cae en diagonal sobre el aparador y el piso
  if (y <= VY1 + 6) return false;
  const corre = (y - VY1) * 0.55;
  return x >= VX0 + 4 + corre && x <= VX1 - 4 + corre && y < 158;
}

/** Donde se ve el cielo de verdad (vidrio sin marco, cortina ni lampara delante). */
let hueco = null;
function huecoVentana() {
  if (hueco) return hueco;
  const capas = [img("pieza/fondo.png"), img("pieza/cortinas.png")];
  if (!capas.every(listo)) return null;
  const c = document.createElement("canvas");
  c.width = MW;
  c.height = MH;
  const ctx = c.getContext("2d");
  for (const i of capas) ctx.drawImage(i, 0, 0);
  const a = ctx.getImageData(0, 0, MW, MH).data;
  hueco = new Uint8Array(MW * MH);
  for (let y = VY0; y <= VY1; y++) for (let x = VX0; x <= VX1; x++) hueco[y * MW + x] = a[(y * MW + x) * 4 + 3] === 0 ? 1 : 0;
  return hueco;
}

/** Primera fila con algo dibujado (cada amigo es de distinto alto). */
const bordes = new Map();
function bordeDeArriba(im) {
  if (bordes.has(im.src)) return bordes.get(im.src);
  const c = document.createElement("canvas");
  c.width = im.naturalWidth;
  c.height = im.naturalHeight;
  const x = c.getContext("2d");
  x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  let top = 0;
  buscar: for (let y = 0; y < c.height; y++) for (let i = 0; i < c.width; i++) if (d[(y * c.width + i) * 4 + 3]) { top = y; break buscar; }
  bordes.set(im.src, top);
  return top;
}

// Afuera tambien es de noche (o atardecer): el amigo de la ventana va a media luz.
const TINTES = { noche: "rgb(120,124,184)", atardecer: "rgb(230,182,168)", amanecer: "rgb(236,206,210)" };
const tenidos = new Map();
function amigoTenido(im, id, momento) {
  const tinte = TINTES[momento];
  if (!tinte) return im;
  const clave = `${id}|${momento}`;
  if (tenidos.has(clave)) return tenidos.get(clave);
  const c = document.createElement("canvas");
  c.width = im.naturalWidth;
  c.height = im.naturalHeight;
  const x = c.getContext("2d");
  x.drawImage(im, 0, 0);
  x.globalCompositeOperation = "multiply";
  x.fillStyle = tinte;
  x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = "destination-in";
  x.drawImage(im, 0, 0);
  tenidos.set(clave, c);
  return c;
}

const mascaras = new Map();
/** La mascara (se multiplica sobre el cuarto). Se calcula una vez por estado. */
function mascara(clave, amb, lamparas, tele) {
  if (mascaras.has(clave)) return mascaras.get(clave);
  const h = huecoVentana();
  const c = document.createElement("canvas");
  c.width = MW;
  c.height = MH;
  const ctx = c.getContext("2d");
  const im = ctx.createImageData(MW, MH);
  const d = im.data;
  const fuentes = [];
  if (lamparas > 0) {
    for (const id of ["farol", "lampara"]) if (LUCES[id]) fuentes.push({ l: LUCES[id], f: lamparas });
  }
  if (tele && LUCES.tele) fuentes.push({ l: LUCES.tele, f: 0.8 });
  for (let y = 0; y < MH; y++) {
    for (let x = 0; x < MW; x++) {
      const b = (BAYER[y % 4][x % 4] / 16 - 0.47) * 0.45;
      let r = amb.amb[0];
      let g = amb.amb[1];
      let bl = amb.amb[2];
      // rincones un poco mas oscuros
      const vx = (x - MW / 2) / (MW / 2);
      const vy = (y - MH * 0.45) / (MH * 0.6);
      const vin = Math.min(1, Math.max(0, (vx * vx * 0.6 + vy * vy * 0.7 - 0.35)));
      const qv = Math.floor(vin * 3 + b) / 3;
      r *= 1 - 0.35 * qv; g *= 1 - 0.35 * qv; bl *= 1 - 0.3 * qv;
      for (const { l, f } of fuentes) {
        const [lx, ly, rad, col] = l;
        const dist = Math.hypot(x - lx, (y - ly) * 1.15) / rad;
        if (dist >= 1) continue;
        const I = Math.pow(1 - dist, 1.25) * f * 1.6;
        const q = Math.max(0, Math.min(1, Math.floor(I * 4 + b) / 4));
        if (q <= 0) continue;
        r += (col[0] - r) * q; g += (col[1] - g) * q; bl += (col[2] - bl) * q;
      }
      if (dentroHaz(x, y)) {
        const lejos = (y - VY1) / (158 - VY1);
        const q = Math.max(0, Math.floor((amb.haz * (1 - lejos * 0.6)) * 3 + b) / 3);
        const v = amb.ventana;
        r += (v[0] - r) * q; g += (v[1] - g) * q; bl += (v[2] - bl) * q;
      }
      // lo que brilla solo (el cielo, la pantalla de la tele) no se oscurece
      const vidrio = h ? h[y * MW + x] === 1 : x >= VX0 && x <= VX1 && y >= VY0 && y <= VY1;
      const pantalla = tele && x >= PANTALLA_TELE[0] && x <= PANTALLA_TELE[2] && y >= PANTALLA_TELE[1] && y <= PANTALLA_TELE[3];
      if (vidrio || pantalla) { r = 255; g = 255; bl = 255; }
      if (lamparas > 0) {
        for (const id of ["farol", "lampara"]) {
          const l = LUCES[id];
          if (!l) continue;
          const rx = id === "farol" ? 10 : 8;
          const ry = id === "farol" ? 15 : 7;
          if (((x - l[0]) / rx) ** 2 + ((y - (id === "farol" ? l[1] - 1 : l[1] - 2)) / ry) ** 2 <= 1) { r = 255; g = 255; bl = 255; }
        }
      }
      const k = (y * MW + x) * 4;
      d[k] = r; d[k + 1] = g; d[k + 2] = bl; d[k + 3] = 255;
    }
  }
  ctx.putImageData(im, 0, 0);
  if (h) mascaras.set(clave, c); // sin el hueco todavia: se rehace cuando cargue el arte
  return c;
}

const brillos = new Map();
/** El resplandor (se suma con "screen"): halos tramados y el cono de la lampara. */
function brillo(clave, fuerza, noche) {
  if (brillos.has(clave)) return brillos.get(clave);
  const c = document.createElement("canvas");
  c.width = MW;
  c.height = MH;
  const ctx = c.getContext("2d");
  if (fuerza > 0) {
    // halos en anillos solidos (pixel art: bandas, no ruido)
    const anillos = (cx, cy, radio, rgb, alfa, estirar = 1.1) => {
      for (let y = Math.floor(cy - radio); y <= cy + radio; y++) {
        for (let x = Math.floor(cx - radio); x <= cx + radio; x++) {
          const dd = Math.hypot(x - cx, (y - cy) * estirar) / radio;
          if (dd >= 1) continue;
          const j = (BAYER[((y % 4) + 4) % 4][((x % 4) + 4) % 4] / 16 - 0.47) * 0.3;
          const banda = Math.max(0, Math.min(3, Math.floor((1 - dd) * 3 + j + 0.15)));
          if (!banda) continue;
          ctx.fillStyle = `rgba(${rgb},${(alfa * banda * fuerza).toFixed(3)})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    };
    if (LUCES.farol) anillos(LUCES.farol[0], LUCES.farol[1], 36, "255,190,120", 0.09);
    if (LUCES.lampara) anillos(LUCES.lampara[0], LUCES.lampara[1], 24, "255,176,110", 0.09);
    if (noche && LUCES.farol) {
      // el cono de luz de la lampara colgante, bajando hasta el piso (dos bandas)
      const [lx, ly] = LUCES.farol;
      for (let y = ly + 14; y < MH; y++) {
        const t = (y - ly - 14) / (MH - ly - 14);
        const ancho = 9 + t * 46;
        for (let x = Math.floor(lx - ancho); x <= lx + ancho; x++) {
          const borde = Math.abs(x - lx) / ancho;
          const j = (BAYER[y % 4][((x % 4) + 4) % 4] / 16 - 0.47) * 0.12;
          const a = borde + j < 0.55 ? 0.07 : borde + j < 1 ? 0.04 : 0;
          if (!a) continue;
          ctx.fillStyle = `rgba(255,214,160,${(a * (1 - t * 0.4)).toFixed(3)})`;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }
  brillos.set(clave, c);
  return c;
}

const ETIQUETAS = {
  companero: "Your partner",
  heladera: "Fridge: food and water",
  botiquin: "First aid: medicine",
  radio: "Radio: change the station",
  reloj: "Clock",
  calendario: "Calendar",
  camara: "Camera: Baozi's Lens",
  farol: "Lantern: bedtime",
  corcho: "Map of Hangzhou: stamps",
  tele: "TV: play",
  mesita: "Notebook: diary",
  balde: "Bucket: bath",
  ventana: "Window",
  baozi: "Baozi",
};

// Digitos de 3x5 para el calendario
const DIGITOS = {
  0: ["111", "101", "101", "101", "111"], 1: ["010", "110", "010", "010", "111"],
  2: ["111", "001", "111", "100", "111"], 3: ["111", "001", "111", "001", "111"],
  4: ["101", "101", "111", "001", "001"], 5: ["111", "100", "111", "001", "111"],
  6: ["111", "100", "111", "101", "111"], 7: ["111", "001", "010", "010", "010"],
  8: ["111", "101", "111", "101", "111"], 9: ["111", "101", "111", "001", "111"],
};

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

// Donde va cada decoracion que regalan los amigos (esquina de arriba a la izquierda)
const DECORACIONES = {
  maceta: [108, 71], // en el aparador, entre el florero y el tocadiscos
  ovni: [311, 65], // arriba de la tele
  cuadro: [222, 60], // en la pared de listones, al costado de donde se sienta
  te: [83, 107], // en la mesita
  // v23: lo que se compra en la tienda (tienda.js)
  luces: [258, 12], // dos guirnaldas colgando del borde de arriba del mapa de corcho
  farolitos: [86, 10], // colgando de la barra de la cortina, en la ventana
  poster: [212, 21], // entre el calendario y el farol
  pecera: [194, 42], // en el estante de la camara
  bonsai: [270, 68], // arriba de la tele, a la izquierda de las antenas
  peluche: [146, 110], // en el tatami, al lado de la mesita
};
const DECOS_TIENDA = new Set(["luces", "farolitos", "poster", "pecera", "bonsai", "peluche"]);
const MARCO = [158, 64]; // la foto del anillo, en la pared de listones (despues del si)

function srcDeco(id, e) {
  if (id === "cuadro") return `amigos/deco_cuadro_${Personaje.actual()}.png`;
  if (id === "peluche") return `tienda/deco_peluche_${e.peluche === "mantou" ? "mantou" : "baozi"}.png`;
  return DECOS_TIENDA.has(id) ? `tienda/deco_${id}.png` : `amigos/deco_${id}.png`;
}

// la foto del anillo, achicada una vez a 14x11 (se ve como una fotito de verdad)
const fotosChicas = new Map();
function fotoChica(dataUrl) {
  if (!dataUrl) return null;
  if (fotosChicas.has(dataUrl)) return fotosChicas.get(dataUrl);
  const reg = { listo: false, c: null };
  fotosChicas.set(dataUrl, reg);
  const i = new Image();
  i.onload = () => {
    const c = document.createElement("canvas");
    c.width = 14;
    c.height = 11;
    const x = c.getContext("2d");
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = "high";
    const r = 14 / 11;
    let sw = i.naturalWidth;
    let sh = sw / r;
    if (sh > i.naturalHeight) {
      sh = i.naturalHeight;
      sw = sh * r;
    }
    x.drawImage(i, (i.naturalWidth - sw) / 2, (i.naturalHeight - sh) / 2, sw, sh, 0, 0, 14, 11);
    reg.c = c;
    reg.listo = true;
  };
  i.src = dataUrl;
  return reg;
}

// las lamparitas de las lucecitas y los farolitos (para que brillen de noche)
const FOCOS_LUCES = [];
for (let x = 0; x < 70; x++) if (x % 6 === 3) FOCOS_LUCES.push([x, Math.round(1 + 5 * Math.sin((Math.PI * (x % 35)) / 34)) + 1]);
const FOCOS_FAROLITOS = [8, 22, 36, 50].map((lx) => [lx, Math.round(1 + 3 * Math.sin((Math.PI * lx) / 57)) + 7]);

/**
 * crearPieza(contenedor, { estado: () => {...}, alTocar: (id) => {} })
 * estado(): { momento, dormido, farol, sonido, ojos, boca, parpadea,
 *             recuerdos: [id], pines: [{lat, lon, color}], dia, anillo,
 *             avisos: [idObjeto], npc: idNpc|null, npcArte: ruta opcional,
 *             decoraciones: [id] (maceta, ovni, cuadro, te),
 *             globo: "texto" }
 */
export function crearPieza(contenedor, { estado, alTocar, alRayo = () => {} }) {
  contenedor.innerHTML = `
    <div class="pieza" id="pieza">
      <canvas class="pieza-lienzo"></canvas>
      <div class="pieza-toques"></div>
      <div class="globo-baozi oculto" id="linea-mochi" aria-live="polite"></div>
      <div class="globo-baozi oculto" id="linea-companero" aria-live="polite"></div>
    </div>`;
  const raiz = contenedor.querySelector("#pieza");
  const canvas = raiz.querySelector("canvas");
  const g = canvas.getContext("2d");
  const mundo = document.createElement("canvas");
  mundo.width = MW;
  mundo.height = MH;
  const m = mundo.getContext("2d");
  const toques = raiz.querySelector(".pieza-toques");
  const globo = raiz.querySelector("#linea-mochi");
  const globoComp = raiz.querySelector("#linea-companero");

  // botones invisibles, uno por objeto (+ ventana y Baozi)
  const cajas = { ...PIEZA.objetos };
  const [vx0, vy0, vx1, vy1] = PIEZA.vidrio;
  cajas.ventana = [vx0, vy0, vx1, vy1];
  const [bcx, bcy] = PIEZA.baozi;
  cajas.baozi = [bcx - 26, bcy - 38, bcx + 24, bcy + 22];
  const PIE = bcy + 21; // la fila donde apoya (sentado en el zabuton o parado en el piso)
  // v24: despues del si, el personaje de rom vive en el cuarto, en su almohadon (a la derecha)
  const COMP_X = bcx + 58;
  cajas.companero = [COMP_X - 22, bcy - 38, COMP_X + 22, bcy + 22];
  const botones = {};
  for (const [id, caja] of Object.entries(cajas)) {
    const b = document.createElement("button");
    b.className = `toque-objeto${id === "baozi" ? " caja-cara" : ""}`;
    b.id = id === "reloj" ? "reloj" : `obj-${id}`;
    b.setAttribute("aria-label", ETIQUETAS[id] || id);
    b.dataset.objeto = id;
    b.addEventListener("click", () => {
      golpe(id);
      alTocar(id);
    });
    toques.appendChild(b);
    botones[id] = { el: b, caja };
  }
  botones.companero.el.hidden = true; // solo cuando vive aca

  let ultimoDibujo = 0;
  let personajeAlta = null;
  // lienzos chicos para armar al personaje pixel (y teñirlo con la luz)
  const actC = document.createElement("canvas");
  actC.width = actC.height = 96;
  const act = actC.getContext("2d");
  const tinC = document.createElement("canvas");
  tinC.width = tinC.height = 96;
  const tin = tinC.getContext("2d");
  // la luz del cuarto sobre un personaje claro (multiplica): de dia casi nada
  const LUZ_CLARO = { amanecer: [246, 226, 224], atardecer: [244, 214, 196], noche: [178, 178, 218], dormido: [128, 132, 188] };
  let vw = 1;
  let vh = 1;
  let dpr = 1;
  let T = { s: 1, ox: 0, oy: 0 };
  let vivo = true;
  const golpes = {};
  let destello = null;
  let proximoDestello = performance.now() + 2500;
  const parpadeo = { t: 0 };

  function medir() {
    const r = raiz.getBoundingClientRect();
    vw = Math.max(1, r.width);
    vh = Math.max(1, r.height);
    dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    canvas.style.width = `${vw}px`;
    canvas.style.height = `${vh}px`;
    // la zona segura entra entera; el resto del cuarto asoma si hay lugar
    const s = Math.min(vw / (SX1 - SX0), vh / (SY1 - SY0));
    const cx = (SX0 + SX1) / 2;
    const cy = (SY0 + SY1) / 2;
    let ox = vw / 2 - cx * s;
    let oy = vh / 2 - cy * s;
    // sin mostrar mas alla del mundo si se puede evitar
    ox = MW * s >= vw ? Math.min(0, Math.max(vw - MW * s, ox)) : (vw - MW * s) / 2;
    oy = MH * s >= vh ? Math.min(0, Math.max(vh - MH * s, oy)) : (vh - MH * s) / 2;
    T = { s, ox, oy };
    for (const { el, caja } of Object.values(botones)) {
      const [x0, y0, x1, y1] = caja;
      el.style.left = `${ox + x0 * s}px`;
      el.style.top = `${oy + y0 * s}px`;
      el.style.width = `${(x1 - x0 + 1) * s}px`;
      el.style.height = `${(y1 - y0 + 1) * s}px`;
    }
    ubicarGlobo();
    dibujar(performance.now());
  }

  function ubicarGlobo() {
    const f = Personaje.figura(actor.pose);
    const arriba = PIE - (f.pies - Math.max(f.arriba, 8));
    globo.style.left = `${T.ox + actor.x * T.s}px`;
    globo.style.top = `${T.oy + arriba * T.s}px`;
  }

  // ------------------------------------------------------------------
  // El personaje vive: de vez en cuando se para, va a mirar por la
  // ventana o la tele, se estira, y vuelve a su zabuton.
  // ------------------------------------------------------------------
  const actor = { x: bcx, pose: "sentado", dir: 1, paso: null, plan: [], prox: performance.now() + 14000 + Math.random() * 12000, mira: [0, 0], salto: 0, estira: 0, t0: 0 };
  const VELOCIDAD = 24; // px de mundo por segundo
  const PLANES = {
    ventana: () => [{ tipo: "pararse" }, { tipo: "caminar", a: 156 }, { tipo: "mirar", ms: 6500, ojo: [-1, -1] }, { tipo: "caminar", a: bcx }, { tipo: "sentarse" }],
    tele: () => [{ tipo: "pararse" }, { tipo: "caminar", a: 236 }, { tipo: "mirar", ms: 5500, ojo: [1, 0] }, { tipo: "caminar", a: bcx }, { tipo: "sentarse" }],
    estirarse: () => [{ tipo: "pararse" }, { tipo: "estirarse", ms: 1700 }, { tipo: "mirar", ms: 900, ojo: [0, 0] }, { tipo: "sentarse" }],
    // la apertura del final: va a la ventana y se queda ahi, mirando a quien vino
    visita: () => [{ tipo: "pararse" }, { tipo: "caminar", a: 156 }, { tipo: "mirar", ms: 600000, ojo: [-1, -1] }],
    pasear: () => [{ tipo: "pararse" }, { tipo: "caminar", a: bcx + 26 }, { tipo: "mirar", ms: 1500, ojo: [1, 0] }, { tipo: "caminar", a: bcx - 22 }, { tipo: "mirar", ms: 1500, ojo: [-1, 0] }, { tipo: "caminar", a: bcx }, { tipo: "sentarse" }],
  };
  let ultimoNpc = null;

  function empezarPlan(nombre, ahora) {
    actor.plan = PLANES[nombre]();
    actor.paso = null;
    actor.prox = ahora + 26000 + Math.random() * 34000;
  }

  function aCasa() {
    actor.plan = [];
    actor.paso = null;
    actor.x = bcx;
    actor.pose = "sentado";
    actor.mira = [0, 0];
    actor.estira = 0;
  }

  function moverActor(e, ahora, dt) {
    // quieto en casa si duerme, si hay algo del final o una cara especial fuerte
    if (e.dormido || e.quieto) {
      if (actor.pose !== "sentado" || actor.x !== bcx) aCasa();
      actor.prox = Math.max(actor.prox, ahora + 8000);
      return;
    }
    // alguien golpea la ventana: va a ver quien es
    if (e.npc && e.npc !== ultimoNpc && actor.plan.length === 0) empezarPlan("ventana", ahora);
    ultimoNpc = e.npc;
    if (actor.plan.length === 0) {
      actor.mira = [0, 0];
      if (ahora > actor.prox) {
        const r = Math.random();
        empezarPlan(r < 0.4 ? "ventana" : r < 0.62 ? "tele" : r < 0.82 ? "pasear" : "estirarse", ahora);
      }
      return;
    }
    if (!actor.paso) {
      actor.paso = actor.plan[0];
      actor.t0 = ahora;
    }
    const p = actor.paso;
    const t = ahora - actor.t0;
    let listo = false;
    if (p.tipo === "pararse") {
      actor.pose = "parado";
      actor.salto = t < 120 ? -2 : t < 240 ? -1 : 0;
      listo = t > 320;
    } else if (p.tipo === "sentarse") {
      actor.mira = [0, 0];
      actor.salto = t < 120 ? -1 : 0;
      if (t > 120) actor.pose = "sentado";
      listo = t > 300;
    } else if (p.tipo === "caminar") {
      const d = p.a - actor.x;
      actor.dir = d < 0 ? -1 : 1;
      actor.mira = [actor.dir, 0];
      const pasoX = (VELOCIDAD * dt) / 1000;
      if (Math.abs(d) <= pasoX) {
        actor.x = p.a;
        listo = true;
      } else actor.x += Math.sign(d) * pasoX;
      actor.salto = Math.floor(ahora / 180) % 2 ? -1 : 0;
    } else if (p.tipo === "mirar") {
      actor.mira = p.ojo;
      actor.salto = 0;
      listo = t > p.ms;
    } else if (p.tipo === "estirarse") {
      const k = t / p.ms;
      actor.estira = k < 0.5 ? Math.sin(k * Math.PI) : Math.sin(k * Math.PI);
      listo = t > p.ms;
      if (listo) actor.estira = 0;
    }
    if (listo) {
      actor.plan.shift();
      actor.paso = null;
      actor.salto = 0;
    }
  }

  function ubicarCajaActor() {
    const f = Personaje.figura(actor.pose);
    const caja = [actor.x - 24, PIE - (f.pies - Math.max(f.arriba, 6)), actor.x + 24, PIE];
    const b = botones.baozi;
    if (!b) return;
    b.caja = caja;
    const [x0, y0, x1, y1] = caja;
    b.el.style.left = `${T.ox + x0 * T.s}px`;
    b.el.style.top = `${T.oy + y0 * T.s}px`;
    b.el.style.width = `${(x1 - x0 + 1) * T.s}px`;
    b.el.style.height = `${(y1 - y0 + 1) * T.s}px`;
  }

  // Mantou (dibujo liso): se compone cuerpo+cara en un lienzo propio, se
  // tine con la luz del cuarto y se dibuja sobre el lienzo visible en alta.
  const compuestos = new Map();
  function mantouCompuesto(pose, cara, tinte) {
    const clave = `${pose}|${cara}|${tinte.join(",")}`;
    if (compuestos.has(clave)) return compuestos.get(clave);
    const capasM = Personaje.capas("", "", pose === "parado" ? "parado" : "sentado", "mantou");
    const cuerpo = img(capasM[0].src);
    const caraImg = img(cara);
    if (!listo(cuerpo) || !listo(caraImg)) return null;
    const c = document.createElement("canvas");
    c.width = cuerpo.naturalWidth;
    c.height = cuerpo.naturalHeight;
    const x = c.getContext("2d");
    x.drawImage(cuerpo, 0, 0);
    x.drawImage(caraImg, 0, 0, c.width, c.height);
    x.globalCompositeOperation = "multiply";
    x.fillStyle = `rgb(${tinte.join(",")})`;
    x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = "destination-in";
    x.drawImage(cuerpo, 0, 0);
    if (compuestos.size > 10) compuestos.delete(compuestos.keys().next().value);
    compuestos.set(clave, c);
    return c;
  }
  const TINTES = { dia: [255, 250, 244], amanecer: [248, 226, 222], atardecer: [246, 218, 200], noche: [212, 212, 240], dormido: [156, 160, 212] };

  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(medir) : null;
  if (ro) ro.observe(raiz);
  else window.addEventListener("resize", medir);

  function golpe(id) {
    golpes[id] = performance.now();
  }

  function offsetGolpe(id, ahora) {
    const t = golpes[id];
    if (!t) return 0;
    const dt = ahora - t;
    if (dt > 250) return 0;
    return dt < 90 ? -2 : dt < 170 ? 1 : 0;
  }

  function sprite(rel, x, y) {
    const i = img(rel);
    if (listo(i)) m.drawImage(i, Math.round(x), Math.round(y));
  }

  function pixel(x, y, c) {
    m.fillStyle = c;
    m.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  function linea(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      pixel(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  function aviso(id, ahora) {
    const caja = cajas[id];
    if (!caja) return;
    let cx = Math.round((caja[0] + caja[2]) / 2);
    let y = caja[1] - 9 + (Math.floor(ahora / 400) % 2);
    let lado = "abajo"; // hacia donde apunta la colita del globo (el objeto)
    if (y < 2) {
      // lo que cuelga del techo: el aviso va al costado
      cx = caja[2] + 7;
      y = Math.round((caja[1] + caja[3]) / 2) - 4 + (Math.floor(ahora / 400) % 2);
      lado = "izquierda";
    }
    m.fillStyle = TINTA;
    m.fillRect(cx - 4, y - 1, 9, 9);
    m.fillStyle = "rgb(252,248,238)";
    m.fillRect(cx - 3, y, 7, 7);
    m.fillStyle = TINTA;
    // la colita va afuera del globo, apuntando al objeto (antes quedaba
    // adentro, pegada al "!" y se veia como un pedacito roto en la marca)
    if (lado === "abajo") m.fillRect(cx - 1, y + 8, 2, 1);
    else m.fillRect(cx - 5, y + 3, 1, 2);
    m.fillStyle = "rgb(214,70,80)";
    m.fillRect(cx, y + 1, 1, 3);
    m.fillRect(cx, y + 5, 1, 1);
  }

  // ------------------------------------------------------------------
  // v24: el companero. Despues del si, el personaje de rom vive aca: se
  // sienta en su almohadon, parpadea, a veces se para y da unos pasitos,
  // de vez en cuando se miran y sale un corazon, y de noche duermen los dos.
  // ------------------------------------------------------------------
  const compC = document.createElement("canvas");
  compC.width = compC.height = 96;
  const compX = compC.getContext("2d");
  const compTin = document.createElement("canvas");
  compTin.width = compTin.height = 96;
  const compTinX = compTin.getContext("2d");
  const comp = { pose: "sentado", t0: 0, prox: performance.now() + 25000 + Math.random() * 20000, parpadeo: performance.now() + 3000, corazon: 0, proxCorazon: performance.now() + 12000 };

  function dibujarCompanero(e, ahora) {
    const c = e.companero;
    const b = botones.companero;
    if (b) b.el.hidden = !c;
    if (!c) return;
    const dormido = !!e.dormido;
    // se para y da unos pasitos (6 s) y vuelve a sentarse
    if (!dormido && comp.pose === "sentado" && ahora > comp.prox) {
      comp.pose = "parado";
      comp.t0 = ahora;
    }
    let x = COMP_X;
    let volteado = false;
    if (comp.pose === "parado") {
      const t = (ahora - comp.t0) / 6000;
      if (t >= 1 || dormido) {
        comp.pose = "sentado";
        comp.prox = ahora + 30000 + Math.random() * 40000;
      } else {
        x = COMP_X + Math.round(16 * Math.sin(Math.PI * t));
        volteado = t < 0.5; // de ida mira para la tele, de vuelta hacia ella
      }
    }
    const pose = dormido ? "dormido" : comp.pose;
    let ojo = "ojo_base_energia_alta.png";
    let boca = "boca_base_feliz.png";
    if (dormido) {
      ojo = "ojo_dormida.png";
      boca = "boca_dormida.png";
    } else if (ahora > comp.parpadeo) {
      ojo = "ojo_base_energia_baja.png";
      if (ahora > comp.parpadeo + 140) comp.parpadeo = ahora + 2600 + Math.random() * 3600;
    }
    const capas = Personaje.capas(ojo, boca, pose, c.quien);
    compX.clearRect(0, 0, 96, 96);
    for (const capa of capas) {
      if (capa.tipo === "accesorio") continue;
      const i = img(capa.src);
      if (listo(i)) compX.drawImage(i, 0, 0);
    }
    const luz = c.quien === "mantou" ? LUZ_CLARO[dormido ? "dormido" : e.momento] : null;
    if (luz) {
      compTinX.globalCompositeOperation = "source-over";
      compTinX.clearRect(0, 0, 96, 96);
      compTinX.fillStyle = `rgb(${luz.join(",")})`;
      compTinX.fillRect(0, 0, 96, 96);
      compTinX.globalCompositeOperation = "destination-in";
      compTinX.drawImage(compC, 0, 0);
      compX.globalCompositeOperation = "multiply";
      compX.drawImage(compTin, 0, 0);
      compX.globalCompositeOperation = "source-over";
    }
    const fig = Personaje.figura(pose === "parado" ? "parado" : "sentado", c.quien);
    const respira = pose === "sentado" && Math.floor(ahora / 760) % 3 === 1 ? -1 : 0;
    m.save();
    m.translate(x, 0);
    m.scale(volteado ? -1 : 1, 1);
    m.drawImage(compC, -48, PIE - fig.pies + respira);
    m.restore();
    if (b) {
      b.caja = [x - 22, PIE - (fig.pies - Math.max(fig.arriba, 6)), x + 22, PIE];
      const [x0, y0, x1, y1] = b.caja;
      b.el.style.left = `${T.ox + x0 * T.s}px`;
      b.el.style.top = `${T.oy + y0 * T.s}px`;
      b.el.style.width = `${(x1 - x0 + 1) * T.s}px`;
      b.el.style.height = `${(y1 - y0 + 1) * T.s}px`;
    }
    // el globo de el
    const texto = e.globoCompanero || "";
    if (globoComp.textContent !== texto) {
      globoComp.textContent = texto;
      globoComp.classList.toggle("oculto", !texto);
    }
    globoComp.style.left = `${T.ox + x * T.s}px`;
    // si los dos hablan a la vez, el globo de el va un poco mas arriba (no se pisan)
    const encima = e.globo ? 30 : 0;
    globoComp.style.top = `${T.oy + (PIE - (fig.pies - Math.max(fig.arriba, 8))) * T.s - encima}px`;
    // de vez en cuando se miran y sale un corazoncito entre los dos
    if (!dormido && !e.dormido && comp.pose === "sentado" && ahora > comp.proxCorazon) {
      comp.corazon = ahora;
      comp.proxCorazon = ahora + 25000 + Math.random() * 25000;
    }
    if (comp.corazon && ahora - comp.corazon < 2200) {
      const t = (ahora - comp.corazon) / 2200;
      const hx = Math.round((bcx + COMP_X) / 2) - 3;
      const hy = Math.round(PIE - 58 - t * 12);
      CORAZON_NUBE.forEach((fila, j) => {
        for (let i = 0; i < fila.length; i++) {
          if (fila[i] === "0") continue;
          m.fillStyle = fila[i] === "2" ? `rgba(255,214,224,${1 - t})` : `rgba(232,64,96,${1 - t})`;
          m.fillRect(hx + i, hy + j, 1, 1);
        }
      });
    }
  }

  // v24: la nubecita del deseo del dia (se mece un poquito)
  const CORAZON_NUBE = ["0110110", "1211111", "1111111", "0111110", "0011100", "0001000"];
  function nubeDeseo(x, y, ahora) {
    y += Math.floor(ahora / 520) % 2;
    x = Math.max(2, Math.min(MW - 24, x));
    y = Math.max(2, y);
    m.fillStyle = TINTA;
    m.fillRect(x + 1, y, 18, 13);
    m.fillRect(x, y + 1, 20, 11);
    m.fillStyle = "rgb(252,248,238)";
    m.fillRect(x + 1, y + 1, 18, 11);
    // la colita de burbujas hacia la cabeza
    m.fillStyle = TINTA;
    m.fillRect(x - 2, y + 13, 3, 3);
    m.fillRect(x - 5, y + 17, 2, 2);
    m.fillStyle = "rgb(252,248,238)";
    m.fillRect(x - 1, y + 14, 1, 1);
    CORAZON_NUBE.forEach((fila, j) => {
      for (let i = 0; i < fila.length; i++) {
        if (fila[i] === "0") continue;
        m.fillStyle = fila[i] === "2" ? "rgb(255,214,224)" : "rgb(232,64,96)";
        m.fillRect(x + 6 + i, y + 3 + j, 1, 1);
      }
    });
  }

  // el clima en la ventana: gotas, copos y niebla con posiciones fijas que se mueven con el tiempo
  const rayo = { prox: 0, hasta: 0 };
  const gotas = Array.from({ length: 48 }, (_, i) => ({ x: (i * 37) % (vx1 - vx0 + 1), y: (i * 53) % (vy1 - vy0 + 1), v: 0.9 + ((i * 7) % 5) * 0.12 }));
  const vidrio = Array.from({ length: 9 }, (_, i) => ({ x: vx0 + 4 + ((i * 23) % (vx1 - vx0 - 8)), y: vy0 + 20 + ((i * 17) % (vy1 - vy0 - 24)) }));

  function climaVentana(clima, ahora) {
    const w = vx1 - vx0 + 1;
    const h = vy1 - vy0 + 1;
    m.save();
    m.beginPath();
    m.rect(vx0, vy0, w, h);
    m.clip();
    // el cielo tapado
    const velo = { nublado: "rgba(150,156,170,0.38)", niebla: "rgba(200,204,212,0.55)", llovizna: "rgba(110,120,140,0.42)", lluvia: "rgba(80,90,112,0.5)", tormenta: "rgba(50,56,78,0.6)", nieve: "rgba(200,206,220,0.4)" }[clima];
    if (velo) {
      m.fillStyle = velo;
      m.fillRect(vx0, vy0, w, h);
    }
    // nubes que pasan
    if (clima !== "niebla") {
      m.fillStyle = clima === "tormenta" ? "rgba(40,44,60,0.7)" : "rgba(170,176,190,0.6)";
      for (let k = 0; k < 3; k++) {
        const cx = vx0 + ((ahora / 900 + k * 29) % (w + 30)) - 15;
        const cy = vy0 + 4 + k * 7;
        m.fillRect(Math.round(cx), cy, 16, 3);
        m.fillRect(Math.round(cx) + 3, cy - 2, 9, 2);
      }
    }
    if (clima === "niebla") {
      m.fillStyle = "rgba(225,228,234,0.5)";
      for (let y = vy0 + h - 30; y < vy0 + h; y += 2) {
        const off = Math.round(Math.sin(ahora / 1500 + y) * 3);
        m.fillRect(vx0 + off, y, w, 1);
      }
    }
    // lluvia
    const cuantas = { llovizna: 14, lluvia: 30, tormenta: 48 }[clima] || 0;
    if (cuantas) {
      m.fillStyle = "rgba(190,206,236,0.8)";
      for (let i = 0; i < cuantas; i++) {
        const g = gotas[i];
        const y = vy0 + ((g.y + ahora / 1000 * 90 * g.v) % (h + 6)) - 4;
        const x = vx0 + ((g.x - (y - vy0) * 0.25) % w + w) % w;
        m.fillRect(Math.round(x), Math.round(y), 1, clima === "llovizna" ? 2 : 3);
      }
    }
    // nieve
    if (clima === "nieve") {
      m.fillStyle = "rgb(244,246,252)";
      for (let i = 0; i < 26; i++) {
        const g = gotas[i];
        const y = vy0 + ((g.y + ahora / 1000 * 10 * g.v) % h);
        const x = vx0 + ((g.x + Math.sin(ahora / 700 + i) * 2) % w + w) % w;
        m.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }
    // gotas pegadas en el vidrio
    if (cuantas >= 30) {
      m.fillStyle = "rgba(210,224,248,0.85)";
      for (const v of vidrio) {
        m.fillRect(v.x, v.y, 1, 2);
        m.fillRect(v.x, v.y + 3 + (Math.floor(ahora / 700 + v.x) % 3), 1, 1);
      }
    }
    // el rayo en el cielo
    if (clima === "tormenta" && ahora < rayo.hasta) {
      m.fillStyle = "rgba(240,244,255,0.9)";
      m.fillRect(vx0, vy0, w, h);
      m.fillStyle = "rgb(255,255,255)";
      let x = vx0 + 20 + (Math.floor(rayo.prox) % 30);
      for (let y = vy0; y < vy0 + 34; y += 3) {
        x += (y % 2 ? 1 : -1) * 2;
        m.fillRect(x, y, 1, 3);
      }
    }
    m.restore();
  }

  // polvito flotando en la luz de la lampara
  const polvo = Array.from({ length: 7 }, (_, i) => ({ x: Math.random() * 40 - 20, y: Math.random() * 60, v: 0.6 + Math.random() * 0.8, f: i * 1.7 }));

  function dibujar(ahora) {
    const e = estado();
    const clave = e.dormido ? "dormido" : e.momento;
    const clima = e.clima || "despejado";
    const gris = clima !== "despejado";
    const base = AMBIENTES[clave] || AMBIENTES.dia;
    // con el cielo tapado: menos luz, mas fria, y sin el haz de sol de la ventana
    const amb = gris && clave !== "noche" && clave !== "dormido"
      ? { ...base, amb: base.amb.map((v, i) => Math.round(v * [0.78, 0.8, 0.88][i])), haz: clima === "nieve" ? base.haz * 0.4 : 0, ventana: [200, 210, 225] }
      : base;
    const lamparas = e.farol && !e.dormido ? amb.lamparas || 0.25 : 0;
    const teleViva = !e.dormido;
    m.clearRect(0, 0, MW, MH);

    // 1. el cielo y la visita, detras del vidrio
    sprite(`pieza/cielo_${e.momento}.png`, vx0, vy0);
    if (e.npc) {
      const n = img(e.npcArte || `npcs/npc_${e.npc}.png`);
      if (listo(n)) {
        m.save();
        m.beginPath();
        m.rect(vx0, vy0, vx1 - vx0 + 1, vy1 - vy0 + 1);
        m.clip();
        const toc = Math.floor(ahora / 300) % 4 === 0 ? -1 : 0;
        // se asoma: la punta de arriba del dibujo queda un poco bajo el marco
        m.drawImage(amigoTenido(n, e.npc, e.momento), vx0 + 18 + toc, vy0 + 12 - bordeDeArriba(n) + Math.round(Math.sin(ahora / 500)));
        m.restore();
      }
    }
    // 1b. el clima de afuera
    if (gris) climaVentana(clima, ahora);
    // 2. el cuarto
    sprite("pieza/fondo.png", 0, 0);
    sprite("pieza/cortinas.png", 0, 0);

    // 3. los objetos
    for (const [id, caja] of Object.entries(PIEZA.objetos)) {
      let rel = `pieza/${id}.png`;
      if (id === "farol" && !lamparas) rel = "pieza/farol_apagado.png";
      if (id === "radio" && !e.sonido) rel = "pieza/radio_apagada.png";
      let dx = 0;
      if (id === "farol") dx = Math.floor(ahora / 1400) % 4 === 1 ? 1 : Math.floor(ahora / 1400) % 4 === 3 ? -1 : 0;
      sprite(rel, caja[0] + dx, caja[1] + offsetGolpe(id, ahora));
    }
    // los regalos de los amigos (amigos.js), con la misma luz que el resto
    for (const id of e.decoraciones || []) {
      const d = DECORACIONES[id];
      if (d) sprite(srcDeco(id, e), d[0], d[1]);
    }
    // v24: los peces que ella pesco nadan en la pecera (hasta 4, ademas de los 2 dibujados)
    if ((e.decoraciones || []).includes("pecera") && (e.pecera || []).length) {
      const [px, py] = DECORACIONES.pecera;
      const COLOR_PEZ = { dorado: "rgb(244,132,44)", koi: "rgb(246,244,240)", koi_dorado: "rgb(250,206,80)" };
      e.pecera.forEach((id, i) => {
        const t = ahora / (1700 + i * 380) + i * 1.9;
        const dx = Math.sin(t) * 4;
        const dir = Math.cos(t) > 0 ? 1 : -1;
        const x = Math.round(px + 8 + dx);
        const y = py + 6 + (i % 2) * 3 + (i > 1 ? 1 : 0);
        m.fillStyle = COLOR_PEZ[id] || COLOR_PEZ.dorado;
        m.fillRect(x - 1, y, 3, 1);
        m.fillRect(x - 2 * dir, y, 1, 1);
        if (id === "koi") {
          m.fillStyle = "rgb(230,70,60)";
          m.fillRect(x, y, 1, 1);
        }
      });
    }
    // v24: el segundo almohadon (el del personaje de rom)
    if (e.companero) {
      const f = img("pieza/fondo.png");
      if (listo(f)) m.drawImage(f, 168, 120, 56, 19, COMP_X - 28, 120, 56, 19);
    }
    // y su valijita, los primeros dias
    if (e.companero && e.companero.valija) sprite("tienda/valija.png", COMP_X + 28, 114);
    // v23: despues del si, la foto del anillo enmarcada
    if (e.fotoAnillo) {
      const f = fotoChica(e.fotoAnillo);
      sprite("tienda/deco_marco.png", MARCO[0], MARCO[1]);
      if (f && f.listo) m.drawImage(f.c, MARCO[0] + 2, MARCO[1] + 2);
    }
    // agujas del reloj
    const ahoraFecha = new Date();
    const [rx0, ry0, rx1, ry1] = PIEZA.objetos.reloj;
    const rcx = (rx0 + rx1) / 2;
    const rcy = (ry0 + ry1) / 2 + offsetGolpe("reloj", ahora);
    const aH = ((ahoraFecha.getHours() % 12) + ahoraFecha.getMinutes() / 60) / 12 * Math.PI * 2 - Math.PI / 2;
    const aM = ahoraFecha.getMinutes() / 60 * Math.PI * 2 - Math.PI / 2;
    linea(rcx, rcy, rcx + Math.cos(aM) * 6, rcy + Math.sin(aM) * 6, "rgb(70,60,54)");
    linea(rcx, rcy, rcx + Math.cos(aH) * 4, rcy + Math.sin(aH) * 4, TINTA);
    // el dia en el calendario
    const [cx0, cy0, cx1] = PIEZA.objetos.calendario;
    const texto = String(e.dia);
    const ancho = texto.length * 4 - 1;
    let x = Math.round((cx0 + cx1) / 2 - ancho / 2);
    const yDia = cy0 + 11 + offsetGolpe("calendario", ahora);
    for (const ch of texto) {
      const d = DIGITOS[ch];
      if (d) d.forEach((fila, j) => [...fila].forEach((b, i) => b === "1" && pixel(x + i, yDia + j, TINTA)));
      x += 4;
    }
    if (e.anillo) {
      pixel(cx1 - 3, cy0 + 18, "rgb(230,180,70)");
      pixel(cx1 - 4, cy0 + 19, "rgb(230,180,70)");
      pixel(cx1 - 2, cy0 + 19, "rgb(230,180,70)");
      pixel(cx1 - 3, cy0 + 20, "rgb(230,180,70)");
    }
    // el disco gira mientras hay sonido
    if (e.sonido) {
      const [dx0, dy0] = PIEZA.objetos.radio;
      const a = ahora / 160;
      pixel(dx0 + 11 + Math.cos(a) * 7, dy0 + 4 + Math.sin(a) * 2, "rgb(96,96,108)");
    }
    // la tele: un minijuego chiquito corriendo solo (o apagada si duerme)
    const [tx0, ty0] = PIEZA.objetos.tele;
    const tv = offsetGolpe("tele", ahora);
    const [px0, py0, px1, py1] = PANTALLA_TELE;
    if (teleViva) {
      const fase = Math.floor(ahora / 120) % 22;
      m.fillStyle = "rgb(230,110,100)";
      m.fillRect(tx0 + 20, ty0 + 12 + fase + tv, 2, 2);
      m.fillStyle = "rgb(170,230,200)";
      m.fillRect(tx0 + 14 + (Math.floor(ahora / 500) % 3) * 2, ty0 + 32 + tv, 10, 1);
      m.fillStyle = "rgba(255,255,255,0.12)";
      for (let yy = py0; yy <= py1; yy += 2) m.fillRect(px0, yy + tv, px1 - px0 + 1, 1);
      if (Math.floor(ahora / 83) % 9 === 0) {
        m.fillStyle = "rgba(255,255,255,0.3)";
        m.fillRect(px0, py0 + (Math.floor(ahora / 50) % 22) + tv, px1 - px0 + 1, 1);
      }
    } else {
      m.fillStyle = "rgb(22,24,28)";
      m.fillRect(px0, py0 + tv, px1 - px0 + 1, py1 - py0 + 1);
    }
    // recuerdos en el estante
    for (const id of e.recuerdos) {
      const r = PIEZA.ranuras[id];
      const s = img(`pieza/recuerdo_${r ? id : "generico"}.png`);
      if (!r || !listo(s)) continue;
      m.drawImage(s, r[0] - Math.floor(s.naturalWidth / 2), r[1] - s.naturalHeight + 1);
    }
    // pines en el corcho
    const [kx0, ky0, kx1, ky1] = PIEZA.objetos.corcho;
    const mp = PIEZA.mapa;
    const kw = kx1 - kx0 - 17;
    const kh = ky1 - ky0 - 15;
    for (const p of e.pines) {
      const ppx = kx0 + 8 + ((p.lon - mp.lonO) / (mp.lonE - mp.lonO)) * kw;
      const ppy = ky0 + 7 + ((mp.latN - p.lat) / (mp.latN - mp.latS)) * kh + offsetGolpe("corcho", ahora);
      m.fillStyle = "rgba(0,0,0,0.3)";
      m.fillRect(Math.round(ppx) + 1, Math.round(ppy) + 1, 2, 2);
      m.fillStyle = p.color || "rgb(214,70,80)";
      m.fillRect(Math.round(ppx), Math.round(ppy), 2, 2);
    }
    // la sombra del personaje (sobre el zabuton, o en el piso si anda parado)
    {
      const ax = Math.round(actor.x);
      const rx = actor.pose === "sentado" ? 22 : 13;
      for (let yy = 127; yy <= 130; yy++) {
        for (let xx = ax - rx - 2; xx <= ax + rx; xx++) {
          if (((xx - ax + 2) / rx) ** 2 + ((yy - 128.5) / 2) ** 2 <= 1 && BAYER[yy % 4][xx % 4] < 11) pixel(xx, yy, "rgb(22,24,46)");
        }
      }
    }

    // 4. LA LUZ: multiplica la mascara y suma el resplandor
    m.save();
    m.globalCompositeOperation = "multiply";
    m.drawImage(mascara(`${clave}|${lamparas}|${teleViva}|${gris ? clima : ""}`, amb, lamparas, teleViva), 0, 0);
    m.globalCompositeOperation = "screen";
    if (clave !== "dia") m.drawImage(brillo(`${clave}|${lamparas}`, lamparas, clave === "noche" || clave === "atardecer"), 0, 0);
    m.restore();
    // v23: los farolitos y las lucecitas de la tienda se prenden cuando oscurece
    if (clave !== "dia" && clave !== "dormido") {
      const decos = e.decoraciones || [];
      const halo = (x, y, rgb, a) => {
        m.save();
        m.globalCompositeOperation = "screen";
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            const dd = Math.hypot(dx, dy * 1.1);
            if (dd > 3.2) continue;
            m.fillStyle = `rgba(${rgb},${(a * (dd < 1.6 ? 1 : 0.45)).toFixed(3)})`;
            m.fillRect(Math.round(x + dx), Math.round(y + dy), 1, 1);
          }
        }
        m.restore();
      };
      if (decos.includes("farolitos")) {
        const [fx, fy] = DECORACIONES.farolitos;
        sprite("tienda/deco_farolitos.png", fx, fy);
        for (const [lx, ly] of FOCOS_FAROLITOS) halo(fx + lx, fy + ly, "255,130,90", 0.22);
      }
      if (decos.includes("luces")) {
        const [lx0, ly0] = DECORACIONES.luces;
        sprite("tienda/deco_luces.png", lx0, ly0);
        FOCOS_LUCES.forEach(([x, y], i) => {
          if (Math.floor(ahora / 700 + i * 1.7) % 5 !== 0) halo(lx0 + x, ly0 + y + 1, "255,220,150", 0.16);
        });
      }
    }
    // el rayo: un fogonazo en todo el cuarto
    if (clima === "tormenta") {
      if (!rayo.prox) rayo.prox = ahora + 5000 + Math.random() * 12000;
      if (ahora > rayo.prox) {
        rayo.hasta = ahora + 180;
        rayo.prox = ahora + 9000 + Math.random() * 20000;
        setTimeout(alRayo, 0); // fuera del dibujo: alRayo puede redibujar el cuarto
      }
      if (ahora < rayo.hasta) {
        m.save();
        m.globalCompositeOperation = "screen";
        m.fillStyle = Math.floor(ahora / 60) % 2 ? "rgba(210,220,255,0.55)" : "rgba(210,220,255,0.25)";
        m.fillRect(0, 0, MW, MH);
        m.restore();
      }
    }
    // polvito en la luz
    if (lamparas && LUCES.farol) {
      const [lx, ly] = LUCES.farol;
      for (const p of polvo) {
        const yy = ly + 18 + ((p.y + ahora / 1000 * p.v * 3) % 64);
        const xx = lx + p.x + Math.sin(ahora / 900 + p.f) * 3;
        if (BAYER[Math.floor(yy) % 4][Math.floor(xx) % 4] < 12) pixel(xx, yy, "rgba(255,226,180,0.55)");
      }
    }
    // vapor del te
    if (!e.dormido) {
      const [mx0, my0] = PIEZA.objetos.mesita;
      for (let i = 0; i < 3; i++) {
        const t = ((ahora / 1400 + i / 3) % 1);
        const yy = my0 + 2 - t * 10;
        const xx = mx0 + 46 + Math.sin(t * 6 + i) * 1.5;
        pixel(xx, yy, `rgba(236,236,244,${(0.55 * (1 - t)).toFixed(2)})`);
      }
    }

    // 5. el personaje (despues de la luz: siempre se lee). Primero el companero (atras).
    dibujarCompanero(e, ahora);
    const dt = ultimoDibujo ? Math.min(250, ahora - ultimoDibujo) : 0;
    ultimoDibujo = ahora;
    moverActor(e, ahora, dt);
    ubicarCajaActor();
    ubicarGlobo();
    const respira = actor.pose === "sentado" && Math.floor(ahora / 700) % 3 === 0 ? -1 : 0;
    const fig = Personaje.figura(actor.pose);
    const x0 = Math.round(actor.x) - 48;
    const y0 = PIE - fig.pies + (e.dormido ? 0 : respira) + actor.salto + offsetGolpe("baozi", ahora) * 2;
    let alto = 1;
    if (e.parpadea) {
      if (!parpadeo.t) parpadeo.t = ahora + 2500;
      const k = Math.floor((ahora - parpadeo.t) / 60);
      const pasos = [1, 0.45, 0.1, 0.45, 1];
      if (k >= 0 && k < pasos.length) alto = pasos[k];
      else if (k >= pasos.length) parpadeo.t = ahora + 2200 + Math.random() * 3800;
    }
    const pose = e.dormido ? "dormido" : actor.pose;
    const volteado = actor.dir > 0 && actor.pose === "parado";
    // estirarse: se alarga para arriba y se afina un poquito
    const ey = actor.estira ? 1 + 0.12 * actor.estira : 1;
    const ex = actor.estira ? 1 - 0.06 * actor.estira : 1;
    const pixelado = Personaje.estilo() === "pixel";
    if (pixelado) {
      // se arma en un lienzo propio de 96x96 (cuerpo + cara) y despues se
      // pone en el cuarto con el espejo y el estiramiento
      const capasP = Personaje.capas(e.ojos, e.boca, pose);
      const cuerpo = img(capasP[0].src);
      act.clearRect(0, 0, 96, 96);
      if (listo(cuerpo)) act.drawImage(cuerpo, 0, 0);
      // los ojos miran hacia donde va (o hacia la ventana/la tele)
      const mx = (volteado ? -actor.mira[0] : actor.mira[0]);
      const my = actor.mira[1];
      if (capasP[1] && capasP[1].tipo === "ojos") {
        // Baozi: ojos y boca en capas separadas
        const ojos = img(capasP[1].src);
        const boca = img(capasP[2].src);
        if (listo(ojos)) {
          if (alto === 1) act.drawImage(ojos, mx, my);
          else {
            const h = Math.max(1, Math.round(96 * alto));
            act.drawImage(ojos, mx, my + 31 - Math.round(31 * alto), 96, h);
          }
        }
        if (listo(boca)) act.drawImage(boca, 0, 0);
      } else if (capasP[1]) {
        // Mantou: una capa de cara; arriba de la fila 39 van los ojos
        // (parpadean), abajo la boca queda quieta. Sin desplazamiento
        // horizontal/vertical por mirada: algunas bocas ('sonrisa', 'abierta',
        // 'o') tienen puntos que llegan a la fila 38 (dentro de esta franja) y
        // un corrimiento ahi las partia en dos, dejando la boca con un hueco.
        const cara = img(capasP[1].src);
        if (listo(cara)) {
          const CORTE = 39;
          const h = Math.max(1, Math.round(CORTE * alto));
          act.drawImage(cara, 0, 0, 96, CORTE, 0, 34 - Math.round(34 * alto), 96, h);
          act.drawImage(cara, 0, CORTE, 96, 96 - CORTE, 0, CORTE, 96, 96 - CORTE);
        }
      }
      // lo que tenga puesto (un regalo de un amigo), arriba de todo
      for (const c of capasP) {
        if (c.tipo !== "accesorio") continue;
        const a = img(c.src);
        if (listo(a)) act.drawImage(a, 0, 0);
      }
      // un personaje claro toma la luz del cuarto (si no, brilla de noche)
      const luz = Personaje.esMantou() ? LUZ_CLARO[e.dormido ? "dormido" : e.momento] : null;
      if (luz) {
        tin.globalCompositeOperation = "source-over";
        tin.clearRect(0, 0, 96, 96);
        tin.fillStyle = `rgb(${luz.join(",")})`;
        tin.fillRect(0, 0, 96, 96);
        tin.globalCompositeOperation = "destination-in";
        tin.drawImage(actC, 0, 0);
        act.globalCompositeOperation = "multiply";
        act.drawImage(tinC, 0, 0);
        act.globalCompositeOperation = "source-over";
      }
      m.save();
      // espejo alrededor del centro del lienzo, estiramiento desde los pies
      m.translate(x0 + 48, y0 + fig.pies);
      m.scale(volteado ? -ex : ex, ey);
      m.translate(-48, -fig.pies);
      m.drawImage(actC, 0, 0);
      m.restore();
    }
    personajeAlta = !pixelado ? { x0, y0, pose, volteado, ex, ey, fig, alto } : null;

    // 6. avisos de lo que necesita
    for (const id of e.avisos) aviso(id, ahora);
    // v24: el deseo del dia, una nubecita con un corazon arriba de la cabeza
    if (e.deseo === "nuevo" && !e.dormido) nubeDeseo(Math.round(actor.x) + 20, y0 + fig.arriba - 16, ahora);

    // 7. las zetas
    if (e.dormido) {
      const z = Math.floor(ahora / 600) % 3;
      for (let i = 0; i <= z; i++) {
        const zx = bcx + 16 + i * 5;
        const zy = bcy - 36 - i * 5;
        m.fillStyle = "rgb(150,170,240)";
        m.fillRect(zx, zy, 3, 1);
        m.fillRect(zx + 1, zy + 1, 1, 1);
        m.fillRect(zx, zy + 2, 3, 1);
      }
    }

    // 8. un destellito cada tanto sobre algo que se puede tocar
    if (ahora > proximoDestello) {
      const ids = Object.keys(cajas).filter((k) => k !== "baozi");
      const id = ids[Math.floor(Math.random() * ids.length)];
      const c = cajas[id];
      destello = { x: c[2] - 1, y: c[1] + 1, hasta: ahora + 600 };
      proximoDestello = ahora + 2600 + Math.random() * 2400;
    }
    if (destello && ahora < destello.hasta && !e.dormido) {
      const r = ahora < destello.hasta - 300 ? 2 : 1;
      for (let d = -r; d <= r; d++) {
        pixel(destello.x + d, destello.y, "rgb(255,244,214)");
        pixel(destello.x, destello.y + d, "rgb(255,244,214)");
      }
      pixel(destello.x, destello.y, "rgb(255,255,255)");
    }

    // al lienzo visible, sin suavizado
    g.imageSmoothingEnabled = false;
    g.fillStyle = "rgb(14,12,14)";
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.drawImage(mundo, Math.round(T.ox * dpr), Math.round(T.oy * dpr), Math.round(MW * T.s * dpr), Math.round(MH * T.s * dpr));

    // un personaje de estilo "dibujo" (liso, en alta), encima del cuarto pixel
    if (personajeAlta) {
      const p = personajeAlta;
      const tinte = TINTES[e.dormido ? "dormido" : e.momento] || TINTES.dia;
      const cara = Personaje.caraMantou(Personaje.estadoDeArchivos(e.ojos, e.boca));
      const comp = mantouCompuesto(p.pose, cara, tinte);
      if (comp) {
        const k = T.s * dpr; // px de pantalla por px de mundo
        g.save();
        g.imageSmoothingEnabled = true;
        g.imageSmoothingQuality = "high";
        g.translate((T.ox + (p.x0 + 48) * T.s) * dpr, (T.oy + (p.y0 + p.fig.pies) * T.s) * dpr);
        g.scale(p.volteado ? -p.ex : p.ex, p.ey * (p.alto < 1 ? 1 : 1));
        g.drawImage(comp, -48 * k, -p.fig.pies * k, 96 * k, 96 * k);
        g.restore();
      }
    }

    // el globo de Baozi
    const texto2 = e.globo || "";
    if (globo.textContent !== texto2) {
      globo.textContent = texto2;
      globo.classList.toggle("oculto", !texto2);
    }
    globo.classList.toggle("rosa", !!e.globoRosa);
  }

  let ultimo = 0;
  function bucle(ahora) {
    if (!vivo) return;
    if (!raiz.isConnected) {
      destruir();
      return;
    }
    requestAnimationFrame(bucle);
    if (ahora - ultimo < 1000 / FPS) return;
    ultimo = ahora;
    dibujar(ahora);
  }

  function destruir() {
    vivo = false;
    if (ro) ro.disconnect();
    else window.removeEventListener("resize", medir);
  }

  medir();
  requestAnimationFrame(bucle);

  return {
    raiz,
    golpe,
    /** Un plan a pedido (la apertura del final): "visita", "ventana"... */
    plan: (nombre) => empezarPlan(nombre, performance.now()),
    refrescar: () => dibujar(performance.now()),
    vivo: () => vivo && raiz.isConnected,
    destruir,
  };
}

/** Donde cae un lugar en el mapa grande (en fracciones 0..1). */
export function posicionEnMapa(lat, lon) {
  const mp = PIEZA.mapa;
  return {
    x: Math.min(0.97, Math.max(0.03, (lon - mp.lonO) / (mp.lonE - mp.lonO))),
    y: Math.min(0.95, Math.max(0.05, (mp.latN - lat) / (mp.latN - mp.latS))),
  };
}
