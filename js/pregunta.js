/**
 * pregunta.js
 * ===========
 * v26: la pregunta del final ("…will you marry me?") no va en la caja de
 * dialogo: se escribe en el cielo del lago, en pixeles grandes. Tres estilos:
 *
 *   polvora    — fuegos artificiales; el ultimo estalla y sus chispas
 *                forman las letras.
 *   farolitos  — farolitos de papel suben del lago y se acomodan en las letras.
 *   estrellas  — se hace de noche y las letras aparecen como una constelacion,
 *                estrella por estrella; al final pasa una estrella fugaz.
 *
 * Se dibuja en un lienzo propio encima de la escena, a baja resolucion y
 * ampliado sin suavizado (pixel art de verdad, como el resto).
 *
 * lanzarPregunta(contenedor, texto, { estilo, alFormar }) -> { destruir, completar }
 *   alFormar(): cuando las letras ya estan completas.
 */

const PALETAS = {
  polvora: ["#ffd76a", "#ff9fbf", "#ffffff", "#ffb35c", "#bfe3ff"],
  farolitos: ["#ffb347", "#ffc86b", "#ff9a3c"],
  estrellas: ["#ffffff", "#dfe9ff", "#fff3c4"],
};
// el color de las letras ya formadas (de a uno cada tanto, una celda mas clara)
const LETRA = { polvora: ["#ffd76a", "#ffd76a", "#ffe9a8", "#ffd76a", "#ffffff"], farolitos: ["#ffb347", "#ffc86b", "#ffb347"], estrellas: ["#ffffff", "#ffffff", "#dfe9ff"] };

/** Las celdas encendidas del texto, en una grilla de `ancho` x `alto`.
 *  Lo latino va en Press Start 2P (una fuente pixel: en multiplos de 8 queda
 *  nitida, celda por celda); lo chino, en la fuente del telefono, el doble de alto. */
const CJK = /[\u3000-\u9fff\uff00-\uffef]/;
function celdasDelTexto(texto, ancho, alto) {
  const lineas = partir(texto);
  const c = document.createElement("canvas");
  c.width = ancho;
  c.height = alto;
  const x = c.getContext("2d");
  const fuente = (l, px) => (CJK.test(l) ? `700 ${px * 2}px "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif` : `${px}px "Press Start 2P", monospace`);
  const alturaDe = (l, px) => (CJK.test(l) ? px * 2 : px);
  // el tamano (multiplo de 8) mas grande que entra a lo ancho
  let px = 8;
  for (const prueba of [24, 16, 8]) {
    const anchos = lineas.map((l) => {
      x.font = fuente(l, prueba);
      return x.measureText(l).width;
    });
    const altoTotal = lineas.reduce((a, l) => a + alturaDe(l, prueba) + prueba * 0.6, 0);
    if (Math.max(...anchos) <= ancho * 0.92 && altoTotal <= alto * 0.42) {
      px = prueba;
      break;
    }
  }
  x.textAlign = "center";
  x.textBaseline = "top";
  x.fillStyle = "#fff";
  const altoTotal = lineas.reduce((a, l) => a + alturaDe(l, px), 0) + (lineas.length - 1) * Math.round(px * 0.6);
  let y = Math.round(alto * 0.24 - altoTotal / 2);
  for (const l of lineas) {
    x.font = fuente(l, px);
    x.fillText(l, Math.round(ancho / 2), y);
    y += alturaDe(l, px) + Math.round(px * 0.6);
  }
  const d = x.getImageData(0, 0, ancho, alto).data;
  const celdas = [];
  for (let yy = 0; yy < alto; yy++) for (let xx = 0; xx < ancho; xx++) if (d[(yy * ancho + xx) * 4 + 3] > 120) celdas.push({ x: xx, y: yy });
  return celdas;
}

/** "艺婷, will you marry me?" -> ["艺婷,", "will you marry me?"] */
function partir(texto) {
  const t = String(texto || "").trim();
  const m = t.match(/^(.{1,14}?[,，])\s*(.+)$/);
  if (m) return [m[1], m[2]];
  const palabras = t.split(/\s+/);
  if (t.length <= 16 || palabras.length < 3) return [t];
  const mitad = Math.ceil(palabras.length / 2);
  return [palabras.slice(0, mitad).join(" "), palabras.slice(mitad).join(" ")];
}

const azar = (a, b) => a + Math.random() * (b - a);
const suave = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));

export function lanzarPregunta(contenedor, texto, { estilo = "polvora", alFormar = () => {} } = {}) {
  const lienzo = document.createElement("canvas");
  lienzo.className = "lienzo-pregunta";
  lienzo.setAttribute("aria-label", texto);
  lienzo.setAttribute("role", "img");
  contenedor.appendChild(lienzo);
  const g = lienzo.getContext("2d");

  const pal = PALETAS[estilo] || PALETAS.polvora;
  const tonos = LETRA[estilo] || LETRA.polvora;
  const t0 = performance.now();
  let formado = false;
  let vivo = true;
  let adelanto = 0; // completar() adelanta el reloj
  const chispas = []; // particulas libres (estallidos, estelas, chispitas)
  const FORMA = estilo === "polvora" ? 6200 + 3300 : estilo === "farolitos" ? 600 + 3600 + 1600 + 6300 : 1800 + 6200 + 900;

  // v35: la grilla se mide de nuevo si el lienzo cambia de tamaño (el
  // telefono rotado, o medido antes de tener tamaño): antes se media una
  // sola vez y la pregunta quedaba estirada o cortada.
  let W = 1;
  let H = 1;
  let LAGO = 1; // donde empieza el agua (de ahi salen cohetes y farolitos)
  let letras = [];
  let cohetes = [];
  let medido = { w: 0, h: 0 };
  let respaldo = null; // la pregunta en texto comun, si el pixelado no salio

  function armar() {
    // la grilla: ~170 celdas de ancho (o menos en vertical), cada celda = un pixel grande
    const r = contenedor.getBoundingClientRect();
    const vw = Math.max(1, r.width);
    const vh = Math.max(1, r.height);
    medido = { w: Math.round(r.width), h: Math.round(r.height) };
    const celda = Math.max(2, Math.round(Math.min(vw / 210, vh / 96)));
    W = Math.ceil(vw / celda);
    H = Math.ceil(vh / celda);
    lienzo.width = W;
    lienzo.height = H;
    LAGO = Math.round(H * 0.7);
    const objetivos = celdasDelTexto(texto, W, H);
    // cada celda de la letra es una particula con su camino
    letras = objetivos.map((o, i) => ({ ...o, i, color: tonos[Math.floor(Math.random() * tonos.length)], vuelo: pal[i % pal.length], fase: Math.random() * 6.28 }));
    cohetes = [];
    prepararEstilo();
    // los cohetes que ya pasaron no vuelven a estallar
    const t = performance.now() - t0 + adelanto;
    for (const c of cohetes) if (t > c.t + c.dur) c.hecho = true;
    // v35: si casi no salieron celdas (sin fuente, sin tamaño), la pregunta
    // igual se lee: en texto comun encima del cielo
    const pocas = letras.length < Math.max(40, texto.replace(/\s/g, "").length * 6);
    ponerRespaldo(pocas);
  }

  function ponerRespaldo(si) {
    if (si && !respaldo) {
      respaldo = document.createElement("div");
      respaldo.className = "pregunta-respaldo";
      respaldo.textContent = texto;
      respaldo.style.cssText =
        "position:absolute;left:4%;right:4%;top:14%;text-align:center;color:#ffd76a;font-size:clamp(22px,6vw,44px);font-weight:700;line-height:1.25;text-shadow:2px 2px 0 rgba(8,6,20,.7);pointer-events:none;z-index:2";
      contenedor.appendChild(respaldo);
    } else if (!si && respaldo) {
      respaldo.remove();
      respaldo = null;
    }
  }

  function prepararEstilo() {
  if (estilo === "polvora") {
    const cx = W / 2;
    const cy = Math.round(H * 0.3);
    // tres cohetes de calentamiento y el grande
    for (const [t, fx, col] of [[900, 0.24, 0], [1900, 0.76, 1], [2900, 0.4, 3], [3700, 0.62, 4]]) {
      cohetes.push({ t, x: W * fx, y0: LAGO, y1: H * azar(0.12, 0.3), dur: 1100, col: pal[col], grande: false, hecho: false });
    }
    cohetes.push({ t: 4800, x: cx, y0: LAGO, y1: cy, dur: 1400, col: "#ffffff", grande: true, hecho: false });
    for (const l of letras) {
      const ang = Math.random() * Math.PI * 2;
      const vel = azar(10, Math.max(W, H) * 0.42);
      l.sx = cx;
      l.sy = cy;
      l.mx = cx + Math.cos(ang) * vel; // a donde vuela con el estallido
      l.my = cy + Math.sin(ang) * vel * 0.8;
      l.t0 = 6200; // estalla
      l.dur = azar(2200, 3200);
    }
  } else if (estilo === "farolitos") {
    for (const l of letras) {
      l.sx = azar(W * 0.05, W * 0.95);
      l.sy = LAGO + azar(2, H - LAGO - 2);
      l.t0 = 600 + Math.random() * 3600 + (l.x / W) * 1600;
      l.dur = azar(4200, 6200);
      l.vaiven = azar(1.5, 4);
    }
  } else {
    // estrellas: aparecen en el orden en que se escribe (de izquierda a derecha, linea por linea)
    const orden = [...letras].sort((a, b) => (Math.round(a.y / 14) - Math.round(b.y / 14)) * 10000 + (a.x - b.x));
    orden.forEach((l, k) => {
      l.t0 = 1800 + (k / orden.length) * 6200 + Math.random() * 300;
      l.dur = 500;
    });
  }
  }

  armar();
  let observador = null;
  try {
    if (window.ResizeObserver) {
      observador = new ResizeObserver(() => {
        if (!vivo) return;
        const r = contenedor.getBoundingClientRect();
        if (Math.abs(Math.round(r.width) - medido.w) > 2 || Math.abs(Math.round(r.height) - medido.h) > 2) armar();
      });
      observador.observe(contenedor);
    }
  } catch (e) {
    observador = null;
  }

  function estallido(x, y, col, n = 46) {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + Math.random() * 0.2;
      const v = azar(6, 16);
      chispas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.85, vida: azar(900, 1500), t: 0, col: k % 4 === 0 ? "#ffffff" : col });
    }
  }

  let ultimo = performance.now();
  let ultimoAdorno = 0;
  function cuadro(ahora) {
    if (!vivo) return;
    const dt = Math.min(60, ahora - ultimo);
    ultimo = ahora;
    const t = ahora - t0 + adelanto;
    g.clearRect(0, 0, W, H);

    // cohetes
    for (const c of cohetes) {
      const k = (t - c.t) / c.dur;
      if (k < 0) continue;
      if (k < 1 && !c.hecho) {
        const y = c.y0 + (c.y1 - c.y0) * (1 - (1 - k) * (1 - k));
        const x = c.x + Math.sin(k * 9) * 0.6;
        g.fillStyle = c.col;
        g.fillRect(Math.round(x), Math.round(y), 1, 2);
        if (Math.random() < 0.8) chispas.push({ x, y: y + 2, vx: azar(-1, 1), vy: azar(2, 5), vida: 420, t: 0, col: "#ffb35c" });
      } else if (!c.hecho) {
        c.hecho = true;
        if (!c.grande) estallido(c.x, c.y1, c.col);
        else estallido(c.x, c.y1, "#fff1b8", 24);
      }
    }

    // chispas libres (con gravedad)
    for (let k = chispas.length - 1; k >= 0; k--) {
      const p = chispas[k];
      p.t += dt;
      if (p.t > p.vida) {
        chispas.splice(k, 1);
        continue;
      }
      p.x += (p.vx * dt) / 1000;
      p.y += (p.vy * dt) / 1000;
      p.vy += (9 * dt) / 1000;
      const vida = 1 - p.t / p.vida;
      if (vida < 0.35 && Math.random() > vida * 2.5) continue; // titilan al apagarse
      g.fillStyle = p.col;
      g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }

    // las letras
    let listas = 0;
    for (const l of letras) {
      const k = (t - l.t0) / l.dur;
      if (k < 0) continue;
      let x;
      let y;
      let a = 1;
      if (estilo === "polvora") {
        if (k < 0.28) {
          // vuela hacia afuera con el estallido
          const kk = 1 - Math.pow(1 - k / 0.28, 3);
          x = l.sx + (l.mx - l.sx) * kk;
          y = l.sy + (l.my - l.sy) * kk;
        } else {
          const kk = suave((k - 0.28) / 0.72);
          x = l.mx + (l.x - l.mx) * kk;
          y = l.my + (l.y - l.my) * kk;
        }
      } else if (estilo === "farolitos") {
        const kk = suave(Math.min(1, k));
        x = l.sx + (l.x - l.sx) * kk + Math.sin(t / 700 + l.fase) * l.vaiven * (1 - kk);
        y = l.sy + (l.y - l.sy) * kk;
      } else {
        x = l.x;
        y = l.y;
        a = Math.min(1, k);
      }
      if (k >= 1) listas++;
      // titileo de las letras ya formadas
      const brillo = k >= 1 ? (Math.sin(t / 320 + l.fase) > 0.93 ? 0.55 : 1) : 1;
      g.globalAlpha = a * brillo;
      if (k >= 1) {
        // ya en su lugar: una sombrita abajo a la derecha (se lee contra el cielo y el lago)
        g.fillStyle = "rgba(8,6,20,0.55)";
        g.fillRect(Math.round(x) + 1, Math.round(y) + 1, 1, 1);
      }
      if (estilo === "farolitos" && k < 1) {
        // un farolito volando: un halo calido alrededor
        g.fillStyle = "rgba(255,170,80,0.3)";
        g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
        g.fillStyle = l.color;
      } else if (estilo === "estrellas" && k >= 1 && Math.sin(t / 400 + l.fase * 3) > 0.985) {
        // destello en cruz, cada tanto
        g.fillStyle = "rgba(255,255,255,0.7)";
        g.fillRect(Math.round(x) - 1, Math.round(y), 3, 1);
        g.fillRect(Math.round(x), Math.round(y) - 1, 1, 3);
        g.fillStyle = l.color;
      } else {
        g.fillStyle = estilo === "polvora" && k < 0.75 ? l.vuelo : l.color;
      }
      g.fillRect(Math.round(x), Math.round(y), 1, 1);
      g.globalAlpha = 1;
    }

    // estrella fugaz (constelacion) / adornos (polvora) cuando ya esta escrito
    if (estilo === "estrellas" && t > FORMA - 200 && t < FORMA + 1500) {
      const k = (t - FORMA + 200) / 1700;
      const x = W * (0.95 - k * 0.8);
      const y = H * (0.06 + k * 0.18);
      for (let s = 0; s < 10; s++) {
        g.globalAlpha = 1 - s / 10;
        g.fillStyle = "#ffffff";
        g.fillRect(Math.round(x + s * 1.6), Math.round(y - s * 0.36), 1, 1);
      }
      g.globalAlpha = 1;
    }
    if (estilo === "polvora" && t > FORMA && ahora - ultimoAdorno > 1700) {
      ultimoAdorno = ahora;
      const lado = Math.random() < 0.5 ? azar(0.06, 0.2) : azar(0.8, 0.94);
      estallido(W * lado, H * azar(0.1, 0.32), pal[Math.floor(Math.random() * pal.length)], 30);
    }

    // (con el texto de respaldo, se espera lo mismo que tardaria en formarse)
    if (!formado && t > 1000 && (respaldo ? t >= FORMA : listas === letras.length)) {
      formado = true;
      alFormar();
    }
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);

  return {
    /** Salta al final (un toque impaciente): las letras quedan formadas. */
    completar() {
      const t = performance.now() - t0 + adelanto;
      if (t < FORMA) adelanto += FORMA - t;
    },
    destruir() {
      vivo = false;
      if (observador) observador.disconnect();
      lienzo.remove();
      ponerRespaldo(false);
    },
    duracion: FORMA,
  };
}
