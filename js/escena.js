/**
 * escena.js
 * ==========
 * El lago de la propuesta como un MUNDO con camara, dibujado en un
 * <canvas> pixel por pixel (nearest neighbor: siempre nitido, a
 * cualquier zoom). Nada de retratos recortados: la camara entra a la
 * cara de ella, se pasa a la de el y se queda con el mientras habla,
 * todo en el mismo plano, sin cortes.
 *
 * (Queda preparado un fundido tramado para que, mas adelante, cada
 * mascota se transforme en persona cuando la camara llega a su cara;
 * por ahora el final arranca con los dos como personas.)
 *
 * Los ojos de las personas (cafe oscuro, como los reales) van en vivo
 * encima del bote y parpadean cada tanto, cada uno a su ritmo.
 *
 * Las posiciones salen de escena_datos.js (generado por
 * tools/escena_final.py junto con el arte: nunca se desincronizan).
 */

import { arte } from "./arte.js";
import { ESCENA } from "./escena_datos.js";

const [MW, MH] = ESCENA.mundo;
const [BX, BY] = ESCENA.bote.en;

function cargar(rel) {
  const img = new Image();
  img.decoding = "async";
  img.src = arte(rel);
  return img;
}

const listo = (img) => !!img && (img instanceof HTMLCanvasElement || (img.complete && img.naturalWidth > 0));
const anchoDe = (im) => im.naturalWidth || im.width;
const altoDe = (im) => im.naturalHeight || im.height;

const BAYER8 = (() => {
  const b4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const m = [];
  for (let y = 0; y < 8; y++) {
    m.push([]);
    for (let x = 0; x < 8; x++) m[y].push((4 * b4[y % 4][x % 4] + [0, 2, 3, 1][(y >> 2) * 2 + (x >> 2)]) / 64);
  }
  return m;
})();

/** Que bote va segun quien ya es persona. */
function claveBote(formas) {
  if (formas.ella && formas.el) return "";
  if (formas.ella) return "_ella";
  return "_mascotas";
}

const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const frena = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Planos. Cada uno dice que punto del mundo mirar (x, y), cuanto mundo
 * tiene que entrar (w, h) y en que lugar de la pantalla cae ese punto
 * (ax, ay). Vertical y horizontal tienen su propio encuadre.
 */
function plano(nombre, vw, vh) {
  const vertical = vh > vw;
  const cara = (q) => [BX + ESCENA.cara[q][0], BY + ESCENA.cara[q][1]];
  const [ex, ey] = cara("el");
  const [ax_, ay_] = cara("ella");
  const medio = (ex + ax_) / 2;
  switch (nombre) {
    case "general":
      return vertical ? { x: medio + 20, y: ey - 10, w: 170, h: 380, ax: 0.5, ay: 0.55 } : { x: 256, y: 200, w: 440, h: 232, ax: 0.5, ay: 0.5 };
    case "pareja":
      return vertical ? { x: medio, y: ey, w: 150, h: 300, ax: 0.5, ay: 0.55 } : { x: medio + 30, y: ey + 4, w: 250, h: 128, ax: 0.5, ay: 0.5 };
    case "ella":
      return vertical ? { x: ax_, y: ay_, w: 100, h: 200, ax: 0.5, ay: 0.46 } : { x: ax_, y: ay_ + 1, w: 112, h: 62, ax: 0.5, ay: 0.5 };
    case "el":
      // un poco mas arriba y mas abierto que el de ella: que entren los rulos
      return vertical ? { x: ex, y: ey - 6, w: 104, h: 210, ax: 0.5, ay: 0.46 } : { x: ex, y: ey - 7, w: 120, h: 74, ax: 0.5, ay: 0.5 };
    case "dialogo":
      return vertical ? { x: ex + 6, y: ey + 4, w: 128, h: 260, ax: 0.5, ay: 0.5 } : { x: ex, y: ey + 4, w: 200, h: 104, ax: 0.36, ay: 0.4 };
    case "dialogo-cerca":
      return vertical ? { x: ex + 4, y: ey + 4, w: 112, h: 230, ax: 0.5, ay: 0.5 } : { x: ex, y: ey + 3, w: 176, h: 92, ax: 0.36, ay: 0.4 };
    default:
      return plano("general", vw, vh);
  }
}

/** Convierte un plano en camara concreta {x, y, s, ax, ay} para este tamaño. */
function resolver(p, vw, vh) {
  const cubrir = Math.max(vw / MW, vh / MH);
  const s = Math.max(cubrir, Math.min(vw / p.w, vh / p.h));
  return { x: p.x, y: p.y, s, ax: p.ax, ay: p.ay };
}

function aPantalla(cam, vw, vh) {
  let tx = cam.ax * vw - cam.x * cam.s;
  let ty = cam.ay * vh - cam.y * cam.s;
  tx = Math.min(0, Math.max(vw - MW * cam.s, tx));
  ty = Math.min(0, Math.max(vh - MH * cam.s, ty));
  return { tx, ty, s: cam.s };
}

/**
 * crearEscena(contenedor, { ojosElla, boteAfuera, plano })
 *   -> { mover(plano, ms, fn), entrarBote(ms), hablar(q, si), parpadear(q), destruir() }
 */
export function crearEscena(contenedor, opciones = {}) {
  const canvas = document.createElement("canvas");
  canvas.className = "lienzo-escena";
  contenedor.appendChild(canvas);
  const g = canvas.getContext("2d");

  const img = {
    lago: cargar("final/lago.png"),
    bote: cargar("final/bote.png"),
    reflejo: cargar("final/bote_reflejo.png"),
    ojosEl: cargar("final/ojos_el.png"),
    ojosElla: cargar(`final/ojos_ella_${opciones.ojosElla === "cafe" ? "cafe" : "rosa"}.png`),
    boca: cargar("final/boca_hablando.png"),
  };

  let vw = 1;
  let vh = 1;
  let dpr = 1;
  let vivo = true;
  let nombrePlano = opciones.plano || "general";
  let cam = null;
  let viaje = null; // { desde, hasta, t0, ms, fn }

  const bote = { x: opciones.boteAfuera ? MW + 20 : BX, desde: BX, t0: 0, ms: 0 };
  const hablando = { el: false, ella: false };
  // true = persona; false = su version mascota (el es Baozi)
  const formas = { ella: true, el: true, ...(opciones.formas || {}) };
  let transformacion = null; // { q, desde, hasta, t0, ms }
  const [BW, BH] = ESCENA.bote.tam;
  const fundido = document.createElement("canvas");
  fundido.width = BW;
  fundido.height = BH;
  const fg = fundido.getContext("2d");
  const mascara = document.createElement("canvas");
  mascara.width = BW;
  mascara.height = BH;
  const mg = mascara.getContext("2d");
  const mImg = mg.createImageData(BW, BH);
  const parpadeo = { el: { t: 0, prox: 1800 }, ella: { t: 0, prox: 2600 } };

  // Destellos del sol sobre el agua: puntos fijos que se prenden de a uno.
  const [sx] = ESCENA.sol;
  const destellos = [];
  for (let k = 0; k < 70; k++) {
    const prof = Math.random();
    const y = ESCENA.horizonte + 3 + Math.round(prof * (MH - ESCENA.horizonte - 8));
    const ancho = 12 + prof * 50;
    destellos.push({ x: Math.round(sx + (Math.random() * 2 - 1) * ancho), y, largo: 1 + Math.floor(Math.random() * 4), fase: Math.random() * 6.28, vel: 1.5 + Math.random() * 2.5 });
  }

  function medir() {
    const r = contenedor.getBoundingClientRect();
    vw = Math.max(1, r.width);
    vh = Math.max(1, r.height);
    dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    canvas.style.width = `${vw}px`;
    canvas.style.height = `${vh}px`;
    const destino = resolver(plano(nombrePlano, vw, vh), vw, vh);
    if (viaje) viaje.hasta = destino;
    else cam = destino;
  }

  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(medir) : null;
  if (ro) ro.observe(contenedor);
  else window.addEventListener("resize", medir);
  medir();

  function camaraAhora(ahora) {
    if (!viaje) return cam;
    const t = Math.max(0, Math.min(1, (ahora - viaje.t0) / viaje.ms));
    const e = viaje.curva(t);
    const a = viaje.desde;
    const b = viaje.hasta;
    // la escala se interpola en log: el zoom se siente parejo
    const s = Math.exp(Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * e);
    cam = { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, s, ax: a.ax + (b.ax - a.ax) * e, ay: a.ay + (b.ay - a.ay) * e };
    if (t >= 1) {
      const fn = viaje.fn;
      cam = viaje.hasta;
      viaje = null;
      if (fn) fn();
    }
    return cam;
  }

  function dibujarSprite(im, wx, wy, T, recorteAlto = 1) {
    if (!listo(im)) return;
    const x = Math.round((T.tx + wx * T.s) * dpr);
    const w = Math.round((T.tx + (wx + anchoDe(im)) * T.s) * dpr) - x;
    const hTotal = altoDe(im) * T.s * dpr;
    const h = Math.max(1, Math.round(hTotal * recorteAlto));
    const yCentro = (T.ty + (wy + altoDe(im) / 2) * T.s) * dpr;
    g.drawImage(im, x, Math.round(yCentro - h / 2), w, h);
  }

  // Parpadeo de Baozi: scaleY 1 -> 0.1 -> 1 en pasos.
  const PASOS_PARPADEO = [1, 0.45, 0.1, 0.45, 1];
  const MS_PASO = 55;

  function altoDeOjos(q, ahora) {
    const p = parpadeo[q];
    if (!p.t) p.t = ahora + p.prox;
    const k = Math.floor((ahora - p.t) / MS_PASO);
    if (k < 0) return 1;
    if (k < PASOS_PARPADEO.length) return PASOS_PARPADEO[k];
    // proximo: 2,4 a 5,5 s; a veces doble
    p.t = ahora + (Math.random() < 0.18 ? 180 : 2400 + Math.random() * 3100);
    return 1;
  }

  function cuadro(ahora) {
    if (!vivo) return;
    if (!canvas.isConnected) {
      destruir();
      return;
    }
    requestAnimationFrame(cuadro);
    g.imageSmoothingEnabled = false;

    const c = camaraAhora(ahora);
    const T = aPantalla(c, vw, vh);

    // posicion del bote (entrando o quieto) y su balanceo, en pixeles enteros del mundo
    if (bote.ms) {
      const t = Math.max(0, Math.min(1, (ahora - bote.t0) / bote.ms));
      bote.x = Math.round(bote.desde + (BX - bote.desde) * frena(t));
      if (t >= 1) bote.ms = 0;
    }
    const balanceo = Math.round(Math.sin(ahora / 900) * 1.2);
    const bx = bote.x;
    const by = BY + balanceo;

    g.fillStyle = "#161416";
    g.fillRect(0, 0, canvas.width, canvas.height);
    if (listo(img.lago)) {
      const x0 = Math.round(T.tx * dpr);
      const y0 = Math.round(T.ty * dpr);
      g.drawImage(img.lago, x0, y0, Math.round((T.tx + MW * T.s) * dpr) - x0, Math.round((T.ty + MH * T.s) * dpr) - y0);
    }

    // destellos en el camino del sol
    g.fillStyle = "rgb(255, 238, 214)";
    const px = T.s * dpr;
    for (const d of destellos) {
      if (Math.sin(ahora / 1000 * d.vel + d.fase) > 0.55) {
        g.fillRect(Math.round((T.tx + d.x * T.s) * dpr), Math.round((T.ty + d.y * T.s) * dpr), Math.ceil(px * d.largo), Math.ceil(px));
      }
    }

    // reflejo, bote, ojos, bocas
    const ondita = Math.round(Math.sin(ahora / 400));
    const clave = claveBote(formas);
    let p = 1;
    if (transformacion) {
      p = Math.min(1, (ahora - transformacion.t0) / transformacion.ms);
      if (p >= 1) {
        formas[transformacion.q] = true;
        transformacion = null;
      }
    }
    const tr = transformacion;
    const claveReflejo = tr && p < 0.5 ? tr.desde : claveBote(formas);
    dibujarSprite(img["reflejo" + claveReflejo] || img.reflejo, bx + ondita, BY + ESCENA.bote.lineaDeAgua, T);
    if (tr) {
      dibujarSprite(img["bote" + tr.desde], bx, by, T);
      const nuevo = img["bote" + tr.hasta];
      if (listo(nuevo)) {
        // se abre desde la cara, en un tramado de 8x8
        const [cx, cy] = ESCENA.cara[tr.q];
        const R = 46;
        const d = mImg.data;
        for (let y = 0; y < BH; y++) {
          for (let x = 0; x < BW; x++) {
            const dist = Math.hypot(x - cx, (y - cy) * 0.9) / R;
            const v = p * 1.9 - dist;
            d[(y * BW + x) * 4 + 3] = v > BAYER8[y & 7][x & 7] ? 255 : 0;
          }
        }
        mg.putImageData(mImg, 0, 0);
        fg.globalCompositeOperation = "source-over";
        fg.clearRect(0, 0, BW, BH);
        fg.drawImage(nuevo, 0, 0);
        fg.globalCompositeOperation = "destination-in";
        fg.drawImage(mascara, 0, 0);
        dibujarSprite(fundido, bx, by, T);
      }
      // destellos alrededor de la cara
      const [cx, cy] = ESCENA.cara[tr.q];
      g.fillStyle = "rgb(255, 250, 230)";
      const u = Math.max(1, Math.round(T.s * dpr));
      for (let k = 0; k < 7; k++) {
        const a = k * 0.9 + p * 5;
        const rad = 16 + 18 * p + (k % 3) * 5;
        const tam = Math.sin((p * 7 + k) * 1.3) > 0 ? 2 : 1;
        const sx = Math.round((T.tx + (bx + cx + Math.cos(a) * rad) * T.s) * dpr);
        const sy = Math.round((T.ty + (by + cy + Math.sin(a) * rad * 0.8) * T.s) * dpr);
        g.fillRect(sx - tam * u, sy, (2 * tam + 1) * u, u);
        g.fillRect(sx, sy - tam * u, u, (2 * tam + 1) * u);
      }
    } else {
      dibujarSprite(img["bote" + clave] || img.bote, bx, by, T);
    }
    for (const q of ["el", "ella"]) {
      const persona = formas[q] || (tr && tr.q === q && p > 0.85);
      if (!persona) continue;
      const [ox, oy] = ESCENA.ojos[q];
      dibujarSprite(q === "el" ? img.ojosEl : img.ojosElla, bx + ox, by + oy, T, altoDeOjos(q, ahora));
      if (hablando[q] && Math.floor(ahora / 150) % 3 !== 2) {
        const [mx, my] = ESCENA.boca[q];
        dibujarSprite(img.boca, bx + mx, by + my, T);
      }
    }
  }
  requestAnimationFrame(cuadro);

  function mover(nombre, ms = 0, fn = null, curva = suave) {
    nombrePlano = nombre;
    const hasta = resolver(plano(nombre, vw, vh), vw, vh);
    if (!ms) {
      viaje = null;
      cam = hasta;
      if (fn) fn();
      return;
    }
    viaje = { desde: { ...cam }, hasta, t0: performance.now(), ms, fn, curva };
  }

  function entrarBote(ms) {
    bote.desde = bote.x;
    bote.t0 = performance.now();
    bote.ms = ms;
  }

  function destruir() {
    vivo = false;
    if (ro) ro.disconnect();
    else window.removeEventListener("resize", medir);
  }

  return {
    mover,
    entrarBote,
    hablar: (q, si) => (hablando[q] = !!si),
    parpadear: (q, enMs = 0) => (parpadeo[q].t = performance.now() + enMs),
    plano: () => nombrePlano,
    /** La mascota de q se vuelve persona (para mas adelante). */
    transformar: (q, ms = 1100) => {
      if (formas[q] || transformacion) return;
      const desde = claveBote(formas);
      const hasta = claveBote({ ...formas, [q]: true });
      transformacion = { q, desde, hasta, t0: performance.now(), ms };
    },
    formas: () => ({ ...formas }),
    /** Deja a q como persona ya (si se salteo el paso con un toque). */
    forzar: (q) => {
      if (transformacion && transformacion.q === q) transformacion = null;
      formas[q] = true;
    },
    vivo: () => vivo,
    destruir,
  };
}
