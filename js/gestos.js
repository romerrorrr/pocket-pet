/**
 * Gestos propios de algunas recetas (v73).
 * rom: "muchas recetas siguen sintiendose demasiado iguales… quiero que tambien se sientan
 * diferentes/unicas". Cada gesto es un paso nuevo de la cocina (paso.t = la clave de GESTOS).
 *
 * crearPaso (cocina.js) los llama con H: { el, fin, bucle, aSvg, ancho, rapido, mas, D, MASA_R,
 * TINTA, sonar, vibrar, ayuda, boton, notaDe, promedio, azarDe, oscurecer, vivo(), g, ahora(),
 * dibujarCamaron, dibujarPescado }.
 * H.g es un objeto que las pruebas leen (el estado del gesto); no se dibuja.
 * Cada gesto termina con H.fin(nota), con la nota de 1.0 a 3.0.
 */

const VERDE = "rgb(120,190,110)";
const VERDE_O = "rgb(80,150,80)";
const ROJO = "rgb(214,70,64)";
const PAPEL = "rgb(252,246,232)";
const ZONA = "rgb(160,210,140)";
const MADERA = "rgb(196,150,100)";
const MADERA_O = "rgb(150,100,60)";
const METAL = "rgb(176,180,190)";
const OLLA = "rgb(120,124,136)";
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const mezcla = (c1, c2, k) => {
  const a = c1.match(/\d+/g).map(Number);
  const b = c2.match(/\d+/g).map(Number);
  return `rgb(${a.slice(0, 3).map((v, i) => Math.round(lerp(v, b[i], clamp(k)))).join(",")})`;
};

/** Arrastrar con un dedo: abajo(p), mover(p), arriba(p); p = [x, y] en el svg. */
function arrastrar(s, H, { abajo, mover, arriba }) {
  let activo = false;
  s.addEventListener("pointerdown", (e) => {
    if (!H.vivo()) return;
    e.preventDefault();
    try {
      s.setPointerCapture(e.pointerId);
    } catch (err) {
      /* nada */
    }
    activo = true;
    if (abajo) abajo(H.aSvg(e), e);
  });
  s.addEventListener("pointermove", (e) => {
    if (!H.vivo() || !activo) return;
    if (mover) mover(H.aSvg(e), e);
  });
  const soltar = (e) => {
    if (!activo) return;
    activo = false;
    if (H.vivo() && arriba) arriba(H.aSvg(e), e);
  };
  s.addEventListener("pointerup", soltar);
  s.addEventListener("pointercancel", soltar);
}

function letrero(H, s, txt, x = 150, y = 24, ancla = "middle") {
  const t = H.el(s, "text", { x, y, "text-anchor": ancla, class: "cocina-cuenta" });
  t.textContent = txt;
  return t;
}

/** Una barrita con zona verde [a, b] (0..1) y una aguja. */
function medidor(H, s, { x, y, w, h, a = 0, b = 0, vertical = false, rojo = 0 }) {
  const { el, TINTA } = H;
  el(s, "rect", { x, y, width: w, height: h, rx: 3, fill: PAPEL, stroke: TINTA, "stroke-width": 2.5 });
  if (rojo) {
    if (vertical) el(s, "rect", { x: x + 2, y: y + 2, width: w - 4, height: h * rojo, fill: "rgb(240,170,160)" });
    else el(s, "rect", { x: x + w * (1 - rojo), y: y + 2, width: w * rojo - 2, height: h - 4, fill: "rgb(240,170,160)" });
  }
  const zona = el(s, "rect", { fill: ZONA });
  const aguja = el(s, "rect", { fill: TINTA, rx: 1 });
  const ponerZona = (a2, b2) => {
    if (vertical) {
      zona.setAttribute("x", x + 2);
      zona.setAttribute("width", w - 4);
      zona.setAttribute("y", y + h * (1 - b2));
      zona.setAttribute("height", Math.max(0, h * (b2 - a2)));
    } else {
      zona.setAttribute("y", y + 2);
      zona.setAttribute("height", h - 4);
      zona.setAttribute("x", x + w * a2);
      zona.setAttribute("width", Math.max(0, w * (b2 - a2)));
    }
  };
  ponerZona(a, b);
  const poner = (v) => {
    v = clamp(v);
    if (vertical) {
      aguja.setAttribute("x", x - 4);
      aguja.setAttribute("width", w + 8);
      aguja.setAttribute("y", (y + h * (1 - v) - 2).toFixed(1));
      aguja.setAttribute("height", 4);
    } else {
      aguja.setAttribute("y", y - 4);
      aguja.setAttribute("height", h + 8);
      aguja.setAttribute("x", (x + w * v - 2).toFixed(1));
      aguja.setAttribute("width", 4);
    }
  };
  poner(0);
  return { poner, zona: ponerZona };
}

/** Una mano (palma redondeada con dedos), mirando a la derecha si der. */
function mano(H, padre, x, y, k = 1, der = true) {
  const { el, TINTA } = H;
  const g = el(padre, "g", { transform: `translate(${x} ${y}) scale(${der ? k : -k} ${k})` });
  el(g, "rect", { x: -16, y: -14, width: 26, height: 28, rx: 10, fill: "rgb(250,214,184)", stroke: TINTA, "stroke-width": 2.5 });
  for (let i = 0; i < 3; i++) el(g, "rect", { x: 6, y: -12 + i * 8, width: 14, height: 7, rx: 3.5, fill: "rgb(250,214,184)", stroke: TINTA, "stroke-width": 2 });
  return g;
}

// ====================================================================================
// TORCER (xiaolongbao): dar la vuelta con el dedo y cada pedacito de vuelta hace un pliegue.
// Lo dificil: ir a una velocidad pareja (ni rapido ni lento).
function torcer(s, paso, H) {
  const { el, TINTA } = H;
  const N = H.mas(paso.n || 18, 2);
  const CX = 150;
  const CY = 100;
  const R = 56;
  const RG = R + 24;
  const W0 = (2 * Math.PI) / (3600 / H.rapido(0.2)); // rad por ms: una vuelta en ~3.6 s
  const TOL = H.ancho(0.32);
  el(s, "circle", { cx: CX, cy: CY + 5, r: R + 6, fill: "rgba(60,40,30,0.18)" });
  const piel = el(s, "circle", { cx: CX, cy: CY, r: R, fill: H.MASA_R, stroke: TINTA, "stroke-width": 3 });
  const relleno = el(s, "circle", { cx: CX, cy: CY, r: 26, fill: "rgb(214,150,110)", stroke: TINTA, "stroke-width": 2 });
  const pliegues = el(s, "g", {});
  el(s, "circle", { cx: CX, cy: CY, r: RG, fill: "none", stroke: VERDE_O, "stroke-width": 2, "stroke-dasharray": "5 7", opacity: 0.7 });
  const dedo = el(s, "circle", { cx: CX + RG, cy: CY, r: 9, fill: "rgb(250,214,184)", stroke: TINTA, "stroke-width": 2.5 });
  const med = medidor(H, s, { x: 70, y: 186, w: 160, h: 9, a: 0.5 - TOL / 2.6, b: 0.5 + TOL / 2.6 });
  const cuenta = letrero(H, s, `0 / ${N}`);
  H.ayuda("Circle around the bun with your finger · keep a steady speed");
  const paso1 = (2 * Math.PI) / N;
  let previo = null;
  let total = 0;
  let sentido = 0;
  let k = 0;
  let tUlt = 0;
  let w = 0;
  const notas = [];
  Object.assign(H.g, { tipo: "torcer", cx: CX, cy: CY, r: RG, W0, k: 0, N });
  const pliegue = (i) => {
    const a = sentido * i * paso1;
    const x1 = CX + (R - 1) * Math.cos(a);
    const y1 = CY + (R - 1) * Math.sin(a);
    const x2 = CX + 8 * Math.cos(a + sentido * 0.9);
    const y2 = CY + 8 * Math.sin(a + sentido * 0.9);
    const xm = CX + R * 0.55 * Math.cos(a + sentido * 0.35);
    const ym = CY + R * 0.55 * Math.sin(a + sentido * 0.35);
    el(pliegues, "path", { d: `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${xm.toFixed(1)} ${ym.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`, fill: "none", stroke: H.oscurecer(H.MASA_R, 0.78), "stroke-width": 2.5, "stroke-linecap": "round" });
  };
  arrastrar(s, H, {
    abajo: (p) => {
      previo = Math.atan2(p[1] - CY, p[0] - CX);
      tUlt = H.ahora();
    },
    mover: (p) => {
      const a = Math.atan2(p[1] - CY, p[0] - CX);
      let d = a - previo;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      previo = a;
      if (Math.hypot(p[0] - CX, p[1] - CY) < 20) return;
      if (!sentido && Math.abs(d) > 0.02) sentido = Math.sign(d);
      if (!sentido) return;
      const avance = d * sentido;
      if (avance <= 0) return;
      total += avance;
      const ahora = H.ahora();
      dedo.setAttribute("cx", (CX + RG * Math.cos(a)).toFixed(1));
      dedo.setAttribute("cy", (CY + RG * Math.sin(a)).toFixed(1));
      while (total >= (k + 1) * paso1 && k < N) {
        const v = paso1 / Math.max(1, ahora - tUlt) / W0;
        tUlt = ahora;
        w = v;
        if (k > 0) notas.push(H.notaDe(v - 1, TOL, 0.7)); // el primero es el arranque
        pliegue(k);
        k++;
        H.g.k = k;
        H.sonar(Math.abs(v - 1) <= TOL ? "tocar" : "no");
        cuenta.textContent = `${k} / ${N}`;
        const c = 1 - k / N;
        relleno.setAttribute("r", (26 * c + 3).toFixed(1));
        piel.setAttribute("r", (R - 6 * (1 - c)).toFixed(1));
        med.poner(clamp(w / 2.6 + 0.5 - 1 / 2.6));
      }
      if (k >= N) {
        el(s, "circle", { cx: CX, cy: CY, r: 7, fill: H.oscurecer(H.MASA_R, 0.85), stroke: TINTA, "stroke-width": 2.5 });
        H.fin(H.promedio(notas));
      }
    },
  });
}

// ====================================================================================
// CUCHILLA (har gow): aplastar la bolita con el lado del cuchillo y arrastrar de una:
// el largo del arrastre decide el tamano de la masa (no se puede corregir).
function cuchilla(s, paso, H) {
  const { el, TINTA } = H;
  const N = H.mas(paso.n || 3, 1);
  const CX = 130;
  const CY = 112;
  const R0 = 14;
  const OBJ = 46;
  const TOL = H.ancho(5, 0.4);
  const K = 0.42;
  el(s, "rect", { x: 30, y: 52, width: 210, height: 128, rx: 10, fill: "rgb(214,176,124)", stroke: TINTA, "stroke-width": 3 });
  for (let i = 0; i < 5; i++) el(s, "line", { x1: 40, y1: 70 + i * 24, x2: 230, y2: 66 + i * 24, stroke: "rgb(196,156,104)", "stroke-width": 2 });
  el(s, "circle", { cx: CX, cy: CY, r: OBJ + TOL, fill: "none", stroke: VERDE, "stroke-width": TOL * 2, opacity: 0.25 });
  el(s, "circle", { cx: CX, cy: CY, r: OBJ, fill: "none", stroke: VERDE_O, "stroke-width": 2, "stroke-dasharray": "6 6" });
  const pila = el(s, "g", {});
  const masa = el(s, "circle", { cx: CX, cy: CY, r: R0, fill: H.MASA_R, stroke: TINTA, "stroke-width": 3, opacity: 0.95 });
  const cuchillo = el(s, "g", { transform: `translate(${CX - 70} ${CY})` });
  el(cuchillo, "rect", { x: -6, y: -34, width: 66, height: 52, rx: 4, fill: METAL, stroke: TINTA, "stroke-width": 3 });
  el(cuchillo, "rect", { x: -6, y: -34, width: 66, height: 8, fill: "rgb(214,218,226)" });
  el(cuchillo, "circle", { cx: 50, cy: -20, r: 4, fill: "rgb(140,144,156)", stroke: TINTA, "stroke-width": 2 });
  el(cuchillo, "rect", { x: -40, y: -6, width: 36, height: 13, rx: 5, fill: MADERA_O, stroke: TINTA, "stroke-width": 3 });
  const cuenta = letrero(H, s, `0 / ${N}`);
  H.ayuda("Press the cleaver on the dough and smear it in ONE swipe · stop at the green circle");
  Object.assign(H.g, { tipo: "cuchilla", cx: CX, cy: CY, r0: R0, k: K, obj: OBJ, n: 0, N });
  let x0 = null;
  let r = R0;
  let n = 0;
  const notas = [];
  const nueva = () => {
    r = R0;
    masa.setAttribute("r", R0);
    masa.setAttribute("opacity", 0.95);
    cuchillo.setAttribute("transform", `translate(${CX - 70} ${CY})`);
  };
  arrastrar(s, H, {
    abajo: (p) => {
      x0 = p[0];
    },
    mover: (p) => {
      if (x0 === null) return;
      const d = Math.max(0, p[0] - x0);
      r = Math.min(80, Math.max(r, R0 + d * K));
      masa.setAttribute("r", r.toFixed(1));
      masa.setAttribute("opacity", (0.95 - 0.25 * clamp((r - R0) / 40)).toFixed(2));
      cuchillo.setAttribute("transform", `translate(${(CX - 30 + d * 0.9).toFixed(1)} ${CY}) rotate(-8)`);
    },
    arriba: () => {
      if (x0 === null) return;
      x0 = null;
      if (r < R0 + 4) return nueva();
      const nota = H.notaDe(r - OBJ, TOL, 14);
      notas.push(nota);
      H.sonar(nota >= 2.5 ? "tocar" : "no");
      n++;
      H.g.n = n;
      cuenta.textContent = `${n} / ${N}`;
      el(pila, "circle", { cx: 262, cy: 160 - n * 6, r: 18, fill: H.MASA_R, stroke: TINTA, "stroke-width": 2.5, opacity: 0.9 });
      if (n >= N) return H.fin(H.promedio(notas));
      nueva();
    },
  });
}

// ====================================================================================
// AGUA FRIA (jiaozi): hierven; cuando la espuma llega al borde, un chorrito de agua fria.
// Tres veces (como se hace de verdad: 三起三落).
function aguaFria(s, paso, H) {
  const { el, TINTA } = H;
  const N = paso.n || 3;
  const X0 = 70;
  const X1 = 210;
  const BORDE = 78;
  const AGUA = 118;
  const FONDO = 172;
  const A = 0.86;
  const B = 0.98;
  const TOL = H.ancho(0.06, 0.3);
  const MID = (A + B) / 2;
  // fuego
  const fuego = el(s, "g", {});
  for (let i = 0; i < 5; i++) el(fuego, "path", { d: `M${X0 + 20 + i * 25} 192 Q${X0 + 28 + i * 25} 176 ${X0 + 34 + i * 25} 192 Z`, fill: i % 2 ? "rgb(255,170,60)" : "rgb(240,100,50)", stroke: TINTA, "stroke-width": 1.5 });
  el(s, "rect", { x: X0, y: BORDE, width: X1 - X0, height: FONDO - BORDE, rx: 8, fill: OLLA, stroke: TINTA, "stroke-width": 3 });
  el(s, "rect", { x: X0 + 6, y: AGUA, width: X1 - X0 - 12, height: FONDO - AGUA - 6, rx: 4, fill: "rgb(170,204,224)" });
  const bolas = el(s, "g", {});
  const pos = [[95, 0], [125, 1], [155, 2], [185, 3]];
  const jiaos = pos.map(([x]) => {
    const g = el(bolas, "g", {});
    el(g, "path", { d: `M-11 4 Q0 -12 11 4 Z`, fill: H.MASA_R, stroke: TINTA, "stroke-width": 2.5, "stroke-linejoin": "round" });
    return { g, x };
  });
  const espuma = el(s, "g", {});
  const capa = el(espuma, "rect", { x: X0 + 6, y: 0, width: X1 - X0 - 12, height: 30, fill: "rgb(250,250,246)" });
  const burb = el(espuma, "g", {});
  for (let i = 0; i < 9; i++) el(burb, "circle", { cx: X0 + 14 + i * 15, cy: 0, r: 7 + (i % 3), fill: "rgb(250,250,246)", stroke: "rgb(200,206,214)", "stroke-width": 1.5 });
  // asas y borde
  el(s, "rect", { x: X0 - 14, y: BORDE + 10, width: 16, height: 9, rx: 4, fill: OLLA, stroke: TINTA, "stroke-width": 3 });
  el(s, "rect", { x: X1 - 2, y: BORDE + 10, width: 16, height: 9, rx: 4, fill: OLLA, stroke: TINTA, "stroke-width": 3 });
  el(s, "rect", { x: X0 - 4, y: BORDE - 4, width: X1 - X0 + 8, height: 8, rx: 3, fill: "rgb(150,154,166)", stroke: TINTA, "stroke-width": 3 });
  // la marca: hasta donde dejarla subir
  const yDe = (f) => AGUA - (AGUA - BORDE) * f;
  el(s, "rect", { x: X0 - 30, y: yDe(B), width: 12, height: yDe(A) - yDe(B), fill: ZONA, stroke: TINTA, "stroke-width": 2 });
  el(s, "line", { x1: X0 + 6, y1: yDe(MID), x2: X1 - 6, y2: yDe(MID), stroke: VERDE_O, "stroke-width": 2.5, "stroke-dasharray": "6 5" });
  // la taza de agua fria
  const taza = el(s, "g", { transform: "translate(250 70)" });
  el(taza, "rect", { x: -18, y: -16, width: 36, height: 34, rx: 6, fill: "rgb(236,240,246)", stroke: TINTA, "stroke-width": 3 });
  el(taza, "rect", { x: -14, y: -6, width: 28, height: 20, rx: 3, fill: "rgb(150,200,236)" });
  const chorro = el(s, "rect", { x: 222, y: 72, width: 6, height: 0, fill: "rgb(150,200,236)", opacity: 0 });
  const cuenta = letrero(H, s, `0 / ${N}`);
  H.ayuda("When the foam reaches the green mark, tap to splash in cold water");
  let f = 0.15;
  let n = 0;
  let tUlt = 0;
  let enfria = 0;
  const notas = [];
  const vel = (0.00038 + 0.00008 * H.D) * H.rapido(0.15);
  Object.assign(H.g, { tipo: "agua_fria", f, a: A, b: B, n: 0 });
  const echar = (nota) => {
    notas.push(nota);
    n++;
    H.g.n = n;
    cuenta.textContent = `${n} / ${N}`;
    f = 0.12;
    enfria = 500;
    taza.setAttribute("transform", "translate(244 70) rotate(-40)");
    chorro.setAttribute("opacity", 1);
    chorro.setAttribute("height", 52);
    setTimeout(() => {
      taza.setAttribute("transform", "translate(250 70)");
      chorro.setAttribute("opacity", 0);
      chorro.setAttribute("height", 0);
    }, 380);
    if (n >= N) {
      jiaos.forEach((j) => (j.flota = true));
      setTimeout(() => H.fin(H.promedio(notas)), 500);
    }
  };
  H.bucle((t) => {
    const dt = Math.min(50, t - tUlt);
    tUlt = t;
    if (n < N) {
      if (enfria > 0) enfria -= dt;
      else f += dt * vel * (0.6 + f);
      if (f >= 1.12) {
        H.sonar("no");
        echar(1);
      }
    }
    H.g.f = f;
    const top = yDe(Math.min(1.12, f));
    capa.setAttribute("y", top.toFixed(1));
    capa.setAttribute("height", Math.max(0, AGUA - top + 4).toFixed(1));
    burb.setAttribute("transform", `translate(${(Math.sin(t / 180) * 2).toFixed(1)} ${top.toFixed(1)})`);
    jiaos.forEach((j, i) => {
      const y = j.flota ? AGUA - 4 : AGUA + 22 + Math.sin(t / 240 + i * 1.7) * 6 - f * 12;
      j.g.setAttribute("transform", `translate(${j.x} ${y.toFixed(1)})`);
    });
  });
  s.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (!H.vivo() || n >= N || enfria > 0) return;
    const nota = H.notaDe(f - MID, (B - A) / 2 + TOL - 0.06, 0.4);
    H.sonar(nota >= 2.5 ? "tocar" : "no");
    echar(nota);
  });
}

// ====================================================================================
// LEUDAR (bao de cerdo): dos bols con la masa tapada; crece; tocar cada uno cuando duplico.
function leudar(s, paso, H) {
  const { el, TINTA } = H;
  const az = H.azarDe("leudar" + (paso.n || ""));
  const bols = [
    { cx: 92, td: (3400 + az() * 900) / H.rapido(0.2) },
    { cx: 208, td: (2500 + az() * 700) / H.rapido(0.2) },
  ];
  const BASE = 150;
  const RX = 46;
  const RY0 = 15;
  const TOL = H.ancho(0.09);
  const notas = [];
  for (const b of bols) {
    b.g = el(s, "g", {});
    // la linea de "el doble"
    el(s, "line", { x1: b.cx - RX - 6, y1: BASE - RY0 * 2, x2: b.cx + RX + 6, y2: BASE - RY0 * 2, stroke: VERDE_O, "stroke-width": 2.5, "stroke-dasharray": "6 5" });
    el(s, "rect", { x: b.cx - RX - 8, y: BASE - RY0 * 2 - TOL * RY0, width: RX * 2 + 16, height: TOL * RY0 * 2, fill: ZONA, opacity: 0.35 });
    b.masa = el(b.g, "ellipse", { cx: b.cx, cy: BASE, rx: RX - 4, ry: RY0, fill: H.MASA_R, stroke: TINTA, "stroke-width": 3 });
    b.tela = el(b.g, "ellipse", { cx: b.cx, cy: BASE, rx: RX + 2, ry: RY0 + 3, fill: "rgb(236,226,206)", stroke: TINTA, "stroke-width": 3 });
    b.raya = el(b.g, "line", { x1: b.cx - RX + 6, y1: BASE - 6, x2: b.cx + RX - 6, y2: BASE - 6, stroke: "rgb(214,96,86)", "stroke-width": 3 });
    el(s, "path", { d: `M${b.cx - RX - 6} ${BASE} L${b.cx - RX + 6} ${BASE + 32} L${b.cx + RX - 6} ${BASE + 32} L${b.cx + RX + 6} ${BASE} Z`, fill: "rgb(232,214,180)", stroke: TINTA, "stroke-width": 3, "stroke-linejoin": "round" });
    el(s, "rect", { x: b.cx - RX - 8, y: BASE - 3, width: RX * 2 + 16, height: 7, rx: 3, fill: "rgb(214,192,150)", stroke: TINTA, "stroke-width": 2.5 });
    b.k = 1;
    b.listo = false;
  }
  const cuenta = letrero(H, s, "0 / 2");
  H.ayuda("The dough is rising · tap each bowl when it has doubled (green line)");
  Object.assign(H.g, { tipo: "leudar", k: [1, 1], cx: bols.map((b) => b.cx), y: BASE - 10 });
  const destapar = (b, nota) => {
    b.listo = true;
    notas.push(nota);
    b.tela.setAttribute("opacity", 0);
    b.raya.setAttribute("opacity", 0);
    H.sonar(nota >= 2.5 ? "tocar" : "no");
    const n = bols.filter((x) => x.listo).length;
    cuenta.textContent = `${n} / 2`;
    if (n >= 2) setTimeout(() => H.fin(H.promedio(notas)), 350);
  };
  H.bucle((t) => {
    bols.forEach((b, i) => {
      if (b.listo) return;
      b.k = 1 + t / b.td;
      H.g.k[i] = b.k;
      if (b.k >= 2.7) {
        // se paso: se desinfla
        b.masa.setAttribute("ry", RY0 * 1.4);
        return destapar(b, 1);
      }
      const ry = RY0 * b.k;
      b.masa.setAttribute("ry", ry.toFixed(1));
      b.tela.setAttribute("ry", (ry + 3).toFixed(1));
      b.raya.setAttribute("y1", (BASE - ry * 0.55).toFixed(1));
      b.raya.setAttribute("y2", (BASE - ry * 0.55).toFixed(1));
    });
  });
  s.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (!H.vivo()) return;
    const [x] = H.aSvg(e);
    const b = x < 150 ? bols[0] : bols[1];
    if (b.listo) return;
    destapar(b, H.notaDe(b.k - 2, TOL, 0.45));
  });
}

// ====================================================================================
// EXPRIMIR (bao de verduras: la verdura en un trapo; mango biche: el limon).
// Mantener apretado: gotea al bol. Soltar cuando el bol llega a la franja.
function exprimir(s, paso, H) {
  const { el, TINTA } = H;
  const limon = paso.que === "limon";
  const N = paso.n || 2;
  const A = 0.55;
  const B = 0.7;
  const TOL = H.ancho(0.075, 0.35);
  const MID = (A + B) / 2;
  const JUGO = limon ? "rgb(214,236,140)" : "rgb(176,214,150)";
  // el bol (de frente)
  const BX0 = 100;
  const BX1 = 200;
  const BY0 = 132;
  const BY1 = 182;
  const yNivel = (v) => BY1 - 6 - (BY1 - BY0 - 10) * v;
  el(s, "path", { d: `M${BX0} ${BY0} L${BX0 + 12} ${BY1} L${BX1 - 12} ${BY1} L${BX1} ${BY0} Z`, fill: "rgb(236,240,246)", stroke: TINTA, "stroke-width": 3, "stroke-linejoin": "round" });
  const liq = el(s, "rect", { x: BX0 + 10, y: BY1 - 6, width: BX1 - BX0 - 20, height: 0, fill: JUGO });
  el(s, "rect", { x: BX1 + 6, y: yNivel(B), width: 9, height: yNivel(A) - yNivel(B), fill: ZONA, stroke: TINTA, "stroke-width": 2 });
  // lo que se exprime
  const cosa = el(s, "g", { transform: "translate(150 74)" });
  if (limon) {
    el(cosa, "circle", { cx: 0, cy: 0, r: 26, fill: "rgb(110,170,60)", stroke: TINTA, "stroke-width": 3 });
    el(cosa, "circle", { cx: 0, cy: 3, r: 21, fill: "rgb(222,240,160)" });
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      el(cosa, "line", { x1: 0, y1: 3, x2: 19 * Math.cos(a), y2: 3 + 19 * Math.sin(a), stroke: "rgb(250,252,220)", "stroke-width": 2 });
    }
  } else {
    el(cosa, "circle", { cx: 0, cy: 4, r: 30, fill: "rgb(240,234,220)", stroke: TINTA, "stroke-width": 3 });
    for (const [x, y] of [[-12, 0], [8, -4], [-2, 14], [14, 12]]) el(cosa, "circle", { cx: x, cy: y + 4, r: 8, fill: "rgb(110,170,80)", opacity: 0.85 });
    el(cosa, "path", { d: "M-8 -26 Q0 -40 8 -26", fill: "rgb(240,234,220)", stroke: TINTA, "stroke-width": 3 });
    for (let i = 0; i < 3; i++) el(cosa, "line", { x1: -22 + i * 18, y1: -18, x2: -14 + i * 18, y2: 28, stroke: "rgb(214,96,86)", "stroke-width": 2, opacity: 0.6 });
  }
  const mi = mano(H, s, 106, 74, 1.1, true);
  const md = mano(H, s, 194, 74, 1.1, false);
  const gotas = el(s, "g", {});
  const gs = [0, 1, 2].map(() => el(gotas, "ellipse", { cx: 150, cy: 110, rx: 2.5, ry: 4, fill: JUGO, stroke: TINTA, "stroke-width": 1, opacity: 0 }));
  const cuenta = letrero(H, s, `0 / ${N}`);
  H.ayuda(limon ? "Hold to squeeze the lime · let go when the bowl reaches the green band" : "Hold to squeeze the water out · let go at the green band");
  let n = 0;
  let v = 0;
  let aprieta = false;
  let tUlt = 0;
  let tA = 0;
  const notas = [];
  Object.assign(H.g, { tipo: "exprimir", v: 0, a: A, b: B, n: 0 });
  H.bucle((t) => {
    const dt = Math.min(50, t - tUlt);
    tUlt = t;
    if (aprieta) {
      tA += dt;
      const ritmo = 0.00028 * (0.55 + 0.9 * Math.abs(Math.sin(tA / 260))) * H.rapido(0.2);
      v = Math.min(1.15, v + dt * ritmo);
    }
    H.g.v = v;
    liq.setAttribute("y", yNivel(v).toFixed(1));
    liq.setAttribute("height", Math.max(0, BY1 - 6 - yNivel(v)).toFixed(1));
    const ap = aprieta ? 1 : 0;
    cosa.setAttribute("transform", `translate(150 74) scale(${1 - 0.18 * ap} ${1 + 0.06 * ap})`);
    mi.setAttribute("transform", `translate(${106 + 12 * ap} 74) scale(1.1 1.1)`);
    md.setAttribute("transform", `translate(${194 - 12 * ap} 74) scale(-1.1 1.1)`);
    gs.forEach((gt, i) => {
      if (!aprieta) return gt.setAttribute("opacity", 0);
      const y = 104 + (((t / 3 + i * 14) % 40) / 40) * (yNivel(v) - 104);
      gt.setAttribute("opacity", 1);
      gt.setAttribute("cy", y.toFixed(1));
      gt.setAttribute("cx", 146 + i * 4);
    });
  });
  arrastrar(s, H, {
    abajo: () => {
      aprieta = true;
    },
    arriba: () => {
      aprieta = false;
      if (v < 0.12) return;
      const nota = H.notaDe(v - MID, (B - A) / 2 + TOL - 0.075, 0.3);
      notas.push(nota);
      n++;
      H.g.n = n;
      cuenta.textContent = `${n} / ${N}`;
      H.sonar(nota >= 2.5 ? "tocar" : "no");
      if (n >= N) return H.fin(H.promedio(notas));
      setTimeout(() => {
        v = 0;
      }, 300);
    },
  });
}

// ====================================================================================
// MORTERO (bao de frijol, mapo): golpes al ritmo: los puntitos llegan a la marca y se toca.
function mortero(s, paso, H) {
  const { el, TINTA } = H;
  const pimienta = paso.que === "pimienta";
  const N = H.mas(paso.n || 8, 2);
  const az = H.azarDe("mortero" + paso.que);
  const V = 0.12 * H.rapido(0.25); // px por ms
  const XH = 64;
  const TOLMS = H.ancho(75, 0.35);
  const tiempos = [];
  let tt = 1300;
  for (let i = 0; i < N; i++) {
    tiempos.push(tt);
    tt += (az() < 0.25 ? 330 : 520 + az() * 330) / H.rapido(0.15);
  }
  // la pista
  el(s, "rect", { x: 30, y: 12, width: 240, height: 26, rx: 13, fill: PAPEL, stroke: TINTA, "stroke-width": 2.5 });
  el(s, "circle", { cx: XH, cy: 25, r: 13, fill: ZONA, stroke: VERDE_O, "stroke-width": 3 });
  const puntos = tiempos.map(() => el(s, "circle", { cx: 400, cy: 25, r: 7, fill: pimienta ? "rgb(170,60,40)" : "rgb(150,50,50)", stroke: TINTA, "stroke-width": 2 }));
  // el mortero
  const CX = 150;
  el(s, "path", { d: `M${CX - 62} 116 Q${CX - 58} 180 ${CX} 182 Q${CX + 58} 180 ${CX + 62} 116 Z`, fill: "rgb(150,150,156)", stroke: TINTA, "stroke-width": 3, "stroke-linejoin": "round" });
  el(s, "ellipse", { cx: CX, cy: 116, rx: 62, ry: 12, fill: "rgb(120,120,128)", stroke: TINTA, "stroke-width": 3 });
  const dentro = el(s, "g", {});
  const granos = [];
  for (let i = 0; i < 12; i++) granos.push(el(dentro, "ellipse", { cx: CX - 40 + (i % 6) * 16, cy: 113 + Math.floor(i / 6) * 7, rx: pimienta ? 5 : 7, ry: pimienta ? 5 : 5, fill: pimienta ? "rgb(150,60,40)" : "rgb(160,50,56)", stroke: TINTA, "stroke-width": 1.5 }));
  const pasta = el(dentro, "ellipse", { cx: CX, cy: 117, rx: 0, ry: 0, fill: pimienta ? "rgb(110,50,36)" : "rgb(130,46,50)" });
  const mano_ = el(s, "g", {});
  el(mano_, "rect", { x: -13, y: -54, width: 26, height: 60, rx: 12, fill: "rgb(176,176,182)", stroke: TINTA, "stroke-width": 3 });
  el(mano_, "rect", { x: -9, y: -50, width: 6, height: 48, rx: 3, fill: "rgb(206,206,212)" });
  mano_.setAttribute("transform", `translate(${CX + 10} 100)`);
  const cuenta = letrero(H, s, `0 / ${N}`, 284, 70, "end");
  H.ayuda("Tap when each dot reaches the green circle");
  const notas = [];
  const hecho = tiempos.map(() => false);
  let golpes = 0;
  let sueltos = 0;
  Object.assign(H.g, { tipo: "mortero", prox: null });
  const golpe = () => {
    golpes++;
    const k = clamp(golpes / N);
    mano_.setAttribute("transform", `translate(${CX + 4} 112)`);
    setTimeout(() => mano_.setAttribute("transform", `translate(${CX + 10} 100)`), 110);
    granos.forEach((g, i) => g.setAttribute("opacity", i < 12 * (1 - k) ? 1 : 0));
    pasta.setAttribute("rx", (52 * k).toFixed(1));
    pasta.setAttribute("ry", (9 * k).toFixed(1));
  };
  const resueltos = () => hecho.filter(Boolean).length;
  const cerrar = () => {
    cuenta.textContent = `${resueltos()} / ${N}`;
    if (resueltos() >= N) H.fin(H.promedio(notas) - 0.12 * sueltos);
  };
  H.bucle((t) => {
    let prox = null;
    tiempos.forEach((ti, i) => {
      const x = XH + (ti - t) * V;
      puntos[i].setAttribute("cx", hecho[i] ? -40 : clamp(x, -40, 400).toFixed(1));
      if (!hecho[i] && t - ti > 260) {
        hecho[i] = true;
        notas.push(1);
        H.sonar("no");
        cerrar();
      }
      if (!hecho[i] && prox === null) prox = ti;
    });
    H.g.prox = prox === null ? null : H.t0 + prox;
  });
  s.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (!H.vivo()) return;
    const t = H.ahora() - H.t0;
    let mej = -1;
    tiempos.forEach((ti, i) => {
      if (!hecho[i] && (mej < 0 || Math.abs(ti - t) < Math.abs(tiempos[mej] - t))) mej = i;
    });
    golpe();
    if (mej < 0 || Math.abs(tiempos[mej] - t) > 260) {
      sueltos++;
      H.sonar("no");
      return;
    }
    hecho[mej] = true;
    const nota = H.notaDe(t - tiempos[mej], TOLMS, 170);
    notas.push(nota);
    H.sonar(nota >= 2.5 ? "tocar" : "no");
    cerrar();
  });
}

// ====================================================================================
// ABRIR (liusha): abrir el pan despacito: la natilla sale como lava. Si se tira muy rapido, salpica.
function abrir(s, paso, H) {
  const { el, TINTA } = H;
  const CX = 150;
  const CY = 100;
  const R = 44;
  const META = 46;
  const VLIM = 0.075 * H.rapido(0.2); // px por ms
  const TOL = H.ancho(0.3);
  el(s, "ellipse", { cx: CX, cy: CY + 46, rx: 110, ry: 24, fill: "rgb(250,250,246)", stroke: TINTA, "stroke-width": 3 });
  const lava = el(s, "ellipse", { cx: CX, cy: CY + 42, rx: 0, ry: 0, fill: "rgb(255,190,40)", stroke: TINTA, "stroke-width": 2 });
  const chorro = el(s, "rect", { x: CX - 3, y: CY - 30, width: 6, height: 0, fill: "rgb(255,190,40)" });
  const mitad = (lado) => {
    const g = el(s, "g", {});
    const d = lado < 0 ? `M${CX} ${CY - R} A${R} ${R} 0 0 0 ${CX} ${CY + R} Z` : `M${CX} ${CY - R} A${R} ${R} 0 0 1 ${CX} ${CY + R} Z`;
    el(g, "path", { d, fill: H.MASA_R, stroke: TINTA, "stroke-width": 3 });
    for (let i = 0; i < 3; i++) el(g, "path", { d: `M${CX + lado * (4 + i * 9)} ${CY - R + 3 + i * 3} q${lado * 6} 10 ${lado * 2} 18`, fill: "none", stroke: H.oscurecer(H.MASA_R, 0.8), "stroke-width": 2, "stroke-linecap": "round" });
    g.lava = el(g, "path", { d: lado < 0 ? `M${CX} ${CY - 26} A26 26 0 0 0 ${CX} ${CY + 26} Z` : `M${CX} ${CY - 26} A26 26 0 0 1 ${CX} ${CY + 26} Z`, fill: "rgb(255,196,60)", opacity: 0 });
    return g;
  };
  const izq = mitad(-1);
  const der = mitad(1);
  const salpica = el(s, "g", {});
  const med = medidor(H, s, { x: 60, y: 14, w: 180, h: 10, a: 0, b: 1 / 1.6, rojo: 1 - 1 / 1.6 });
  H.ayuda("Drag sideways to pull the bun open · slowly, so the custard flows");
  Object.assign(H.g, { tipo: "abrir", cx: CX, cy: CY, meta: META, vlim: VLIM, gap: 0 });
  let x0 = null;
  let gap = 0;
  let tPrev = 0;
  let xPrev = 0;
  let v = 0;
  let vMax = 0;
  arrastrar(s, H, {
    abajo: (p) => {
      x0 = p[0] - (gap / 2) * Math.sign(p[0] - CX || 1);
      tPrev = H.ahora();
      xPrev = p[0];
    },
    mover: (p) => {
      if (x0 === null) return;
      const ahora = H.ahora();
      const dt = Math.max(1, ahora - tPrev);
      const inst = Math.abs(p[0] - xPrev) / dt;
      v = v * 0.75 + inst * 0.25;
      tPrev = ahora;
      xPrev = p[0];
      const g2 = clamp(Math.abs(p[0] - x0) * 2, gap, 90);
      if (g2 > gap) {
        if (v > VLIM) {
          vMax = Math.max(vMax, v);
          if (salpica.childNodes.length < 14) {
            for (let i = 0; i < 2; i++) el(salpica, "circle", { cx: CX + (Math.random() - 0.5) * 120, cy: CY - 20 + Math.random() * 60, r: 3 + Math.random() * 3, fill: "rgb(255,190,40)", stroke: TINTA, "stroke-width": 1.5 });
            H.sonar("no");
          }
        }
        vMax = Math.max(vMax, Math.min(v, VLIM));
        gap = g2;
      }
      H.g.gap = gap;
      med.poner(v / (VLIM * 1.6));
      izq.setAttribute("transform", `translate(${(-gap / 2).toFixed(1)} 0) rotate(${(-gap / 6).toFixed(1)} ${CX} ${CY + R})`);
      der.setAttribute("transform", `translate(${(gap / 2).toFixed(1)} 0) rotate(${(gap / 6).toFixed(1)} ${CX} ${CY + R})`);
      for (const m of [izq, der]) m.lava.setAttribute("opacity", gap > 6 ? 1 : 0);
      const k = clamp(gap / META);
      chorro.setAttribute("height", (70 * k).toFixed(1));
      lava.setAttribute("rx", (60 * k).toFixed(1));
      lava.setAttribute("ry", (13 * k).toFixed(1));
      if (gap >= META) {
        x0 = null;
        H.fin(H.notaDe(Math.max(0, vMax / VLIM - 1), TOL, 1));
      }
    },
    arriba: () => {
      x0 = null;
      v = 0;
      med.poner(0);
    },
  });
}

// ====================================================================================
// RODAR (tangyuan): inclinar la canasta con harina: las bolitas ruedan y se van cubriendo.
// Listo cuando todas estan blancas y redondas (sin pasarse).
function rodar(s, paso, H) {
  const { el, TINTA } = H;
  const N = paso.n || 3;
  const CX = 150;
  const CY = 104;
  const RC = 78;
  const A = 0.85;
  const B = 1.05;
  const TOL = H.ancho(0.12, 0.35);
  const MID = (A + B) / 2;
  el(s, "circle", { cx: CX, cy: CY + 4, r: RC + 12, fill: "rgba(60,40,30,0.2)" });
  el(s, "circle", { cx: CX, cy: CY, r: RC + 10, fill: "rgb(196,150,90)", stroke: TINTA, "stroke-width": 3 });
  el(s, "circle", { cx: CX, cy: CY, r: RC, fill: "rgb(226,190,130)", stroke: TINTA, "stroke-width": 2.5 });
  for (let i = -3; i <= 3; i++) el(s, "line", { x1: CX + i * 22, y1: CY - Math.sqrt(RC * RC - (i * 22) ** 2), x2: CX + i * 22, y2: CY + Math.sqrt(RC * RC - (i * 22) ** 2), stroke: "rgb(206,168,110)", "stroke-width": 2 });
  for (const [x, y, r] of [[-30, -20, 16], [24, 18, 20], [-10, 34, 12], [36, -30, 12], [-44, 20, 10]]) el(s, "ellipse", { cx: CX + x, cy: CY + y, rx: r, ry: r * 0.7, fill: "rgb(252,250,244)", opacity: 0.8 });
  const az = H.azarDe("rodar");
  const bolas = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    bolas.push({ x: CX + 26 * Math.cos(a), y: CY + 26 * Math.sin(a), vx: 0, vy: 0, c: 0, roce: 0.95 + az() * 0.1, e: el(s, "circle", { r: 9, fill: "rgb(40,36,40)", stroke: TINTA, "stroke-width": 2.5 }) });
  }
  const flecha = el(s, "line", { x1: CX, y1: CY, x2: CX, y2: CY, stroke: VERDE_O, "stroke-width": 4, "stroke-linecap": "round", opacity: 0.7 });
  const med = medidor(H, s, { x: 262, y: 30, w: 12, h: 150, a: A / 1.4, b: B / 1.4, vertical: true });
  H.ayuda("Hold and drag to tilt the basket · tap Done when the balls are white (green)");
  Object.assign(H.g, { tipo: "rodar", c: bolas.map(() => 0), a: A, b: B, cx: CX, cy: CY });
  let tilt = [0, 0];
  let dedo = null;
  let tUlt = 0;
  H.bucle((t) => {
    const dt = Math.min(40, t - tUlt);
    tUlt = t;
    if (dedo) tilt = [clamp((dedo[0] - CX) / 70, -1, 1), clamp((dedo[1] - CY) / 70, -1, 1)];
    else tilt = [tilt[0] * 0.9, tilt[1] * 0.9];
    flecha.setAttribute("x2", (CX + tilt[0] * 40).toFixed(1));
    flecha.setAttribute("y2", (CY + tilt[1] * 40).toFixed(1));
    let cmin = 9;
    bolas.forEach((b, i) => {
      // px por ms: acelera con la inclinacion, el roce la frena
      const fr = Math.exp(-dt / 450);
      b.vx = (b.vx + tilt[0] * 0.0006 * dt) * fr;
      b.vy = (b.vy + tilt[1] * 0.0006 * dt) * fr;
      const nx = b.x + b.vx * dt;
      const ny = b.y + b.vy * dt;
      const r = 9 + 5 * Math.min(1.3, b.c);
      const d = Math.hypot(nx - CX, ny - CY);
      if (d > RC - r) {
        const ux = (nx - CX) / d;
        const uy = (ny - CY) / d;
        const vn = b.vx * ux + b.vy * uy;
        b.vx -= 1.6 * vn * ux;
        b.vy -= 1.6 * vn * uy;
        b.x = CX + ux * (RC - r);
        b.y = CY + uy * (RC - r);
      } else {
        b.x = nx;
        b.y = ny;
      }
      b.c += Math.hypot(b.vx, b.vy) * dt * 0.0021 * b.roce * H.rapido(0.2);
      H.g.c[i] = b.c;
      cmin = Math.min(cmin, b.c);
      b.e.setAttribute("cx", b.x.toFixed(1));
      b.e.setAttribute("cy", b.y.toFixed(1));
      b.e.setAttribute("r", r.toFixed(1));
      b.e.setAttribute("fill", b.c > B + 0.2 ? "rgb(236,226,206)" : mezcla("rgb(40,36,40)", "rgb(253,252,248)", b.c / A));
    });
    med.poner(cmin / 1.4);
  });
  arrastrar(s, H, {
    abajo: (p) => {
      dedo = p;
    },
    mover: (p) => {
      dedo = p;
    },
    arriba: () => {
      dedo = null;
    },
  });
  H.boton("Done ✓", () => {
    H.fin(H.promedio(bolas.map((b) => H.notaDe(b.c - MID, (B - A) / 2 + TOL - 0.12, 0.4))));
  });
}

// ====================================================================================
// MOLER (tinto): darle vueltas a la manivela del molinillo; el cafe molido cae al cajon.
function moler(s, paso, H) {
  const { el, TINTA } = H;
  const A = 0.6;
  const B = 0.72;
  const TOL = H.ancho(0.06, 0.35);
  const MID = (A + B) / 2;
  const CX = 150;
  const PC = [150, 60];
  const L = 40;
  // la caja
  el(s, "rect", { x: 108, y: 82, width: 84, height: 96, rx: 6, fill: MADERA, stroke: TINTA, "stroke-width": 3 });
  el(s, "rect", { x: 118, y: 138, width: 64, height: 32, rx: 3, fill: "rgb(120,80,50)", stroke: TINTA, "stroke-width": 2.5 });
  const molido = el(s, "rect", { x: 120, y: 168, width: 60, height: 0, fill: "rgb(80,52,36)" });
  const yDe = (v) => 168 - 28 * v;
  el(s, "rect", { x: 186, y: yDe(B), width: 9, height: yDe(A) - yDe(B), fill: ZONA, stroke: TINTA, "stroke-width": 2 });
  el(s, "circle", { cx: CX, cy: 158, r: 3, fill: "rgb(230,200,140)", stroke: TINTA, "stroke-width": 1.5 });
  // la tolva con granos
  el(s, "path", { d: `M118 82 L128 62 L172 62 L182 82 Z`, fill: METAL, stroke: TINTA, "stroke-width": 3, "stroke-linejoin": "round" });
  const granos = el(s, "g", {});
  const gr = [];
  for (let i = 0; i < 7; i++) gr.push(el(granos, "ellipse", { cx: 132 + i * 6, cy: 68 + (i % 2) * 4, rx: 4, ry: 3, fill: "rgb(110,66,40)", stroke: TINTA, "stroke-width": 1.2 }));
  // manivela
  const brazo = el(s, "line", { x1: PC[0], y1: PC[1], x2: PC[0] + L, y2: PC[1], stroke: METAL, "stroke-width": 6, "stroke-linecap": "round" });
  el(s, "circle", { cx: PC[0], cy: PC[1], r: 6, fill: METAL, stroke: TINTA, "stroke-width": 2.5 });
  const pomo = el(s, "circle", { cx: PC[0] + L, cy: PC[1], r: 9, fill: MADERA_O, stroke: TINTA, "stroke-width": 2.5 });
  el(s, "circle", { cx: PC[0], cy: PC[1], r: L, fill: "none", stroke: VERDE_O, "stroke-width": 2, "stroke-dasharray": "4 7", opacity: 0.6 });
  H.ayuda("Turn the crank in circles · tap Done when the drawer reaches the green mark");
  Object.assign(H.g, { tipo: "moler", v: 0, a: A, b: B, cx: PC[0], cy: PC[1], r: L });
  let previo = null;
  let v = 0;
  let ang = 0;
  arrastrar(s, H, {
    abajo: (p) => {
      previo = Math.atan2(p[1] - PC[1], p[0] - PC[0]);
    },
    mover: (p) => {
      const a = Math.atan2(p[1] - PC[1], p[0] - PC[0]);
      let d = a - previo;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      previo = a;
      if (Math.hypot(p[0] - PC[0], p[1] - PC[1]) < 12) return;
      ang = a;
      v = Math.min(1.1, v + (Math.abs(d) / (2 * Math.PI)) * 0.13);
      H.g.v = v;
      const x = PC[0] + L * Math.cos(ang);
      const y = PC[1] + L * Math.sin(ang);
      brazo.setAttribute("x2", x.toFixed(1));
      brazo.setAttribute("y2", y.toFixed(1));
      pomo.setAttribute("cx", x.toFixed(1));
      pomo.setAttribute("cy", y.toFixed(1));
      molido.setAttribute("y", yDe(v).toFixed(1));
      molido.setAttribute("height", (168 - yDe(v)).toFixed(1));
      gr.forEach((g, i) => g.setAttribute("opacity", i < 7 * (1 - v) ? 1 : 0));
      if (Math.abs(d) > 0.05 && Math.random() < 0.2) H.sonar("tecla");
    },
  });
  H.boton("Done ✓", () => {
    if (v < 0.1) return;
    H.fin(H.notaDe(v - MID, (B - A) / 2 + TOL - 0.06, 0.3));
  });
}

// ====================================================================================
// LICUAR (jugo): mantener apretado para licuar; si se deja mucho seguido, la espuma se rebosa.
// Hay que ir a pulsos.
function licuar(s, paso, H) {
  const { el, TINTA } = H;
  const color = paso.color || "rgb(255,196,60)";
  const LIM = 0.72;
  const TOL = H.ancho(0.12, 0.4);
  el(s, "path", { d: "M112 34 L120 148 L180 148 L188 34 Z", fill: "rgb(236,244,250)", stroke: TINTA, "stroke-width": 3, "stroke-linejoin": "round" });
  const liq = el(s, "path", { d: "M117 80 L121 144 L179 144 L183 80 Z", fill: "rgb(250,240,200)" });
  const espuma = el(s, "rect", { x: 117, y: 80, width: 66, height: 0, fill: "rgb(255,250,236)" });
  const trozos = el(s, "g", {});
  const tz = [];
  for (let i = 0; i < 8; i++) tz.push(el(trozos, "rect", { x: 124 + (i % 4) * 13, y: 96 + Math.floor(i / 4) * 22, width: 10, height: 9, rx: 2, fill: i % 2 ? "rgb(236,170,40)" : "rgb(120,40,70)", stroke: TINTA, "stroke-width": 1.5 }));
  const aspas = el(s, "g", { transform: "translate(150 138)" });
  el(aspas, "rect", { x: -16, y: -2, width: 32, height: 4, rx: 2, fill: METAL, stroke: TINTA, "stroke-width": 1.5 });
  el(s, "rect", { x: 106, y: 30, width: 88, height: 8, rx: 3, fill: "rgb(60,60,70)", stroke: TINTA, "stroke-width": 2.5 });
  el(s, "path", { d: "M104 148 L196 148 L202 186 L98 186 Z", fill: "rgb(214,90,80)", stroke: TINTA, "stroke-width": 3, "stroke-linejoin": "round" });
  const luz = el(s, "circle", { cx: 150, cy: 168, r: 8, fill: "rgb(250,240,220)", stroke: TINTA, "stroke-width": 2.5 });
  const med = medidor(H, s, { x: 222, y: 34, w: 12, h: 140, a: 0, b: LIM, vertical: true, rojo: 1 - LIM });
  el(s, "text", { x: 228, y: 28, "text-anchor": "middle", class: "cocina-cuenta", "font-size": 10 }).textContent = "foam";
  const lisu = medidor(H, s, { x: 66, y: 34, w: 12, h: 140, a: 0.97, b: 1, vertical: true });
  H.ayuda("Hold to blend in pulses · don't let the foam reach the red");
  Object.assign(H.g, { tipo: "licuar", e: 0, l: 0, lim: LIM });
  let on = false;
  let tOn = 0;
  let tUlt = 0;
  let e = 0;
  let eMax = 0;
  let l = 0;
  let rebose = 0;
  H.bucle((t) => {
    const dt = Math.min(40, t - tUlt);
    tUlt = t;
    if (on) {
      tOn += dt;
      l += dt * 0.00033 * H.rapido(0.2);
      e += dt * 0.00026 * (1 + tOn / 650) * H.rapido(0.25);
    } else e = Math.max(0, e - dt * 0.00062);
    eMax = Math.max(eMax, e);
    if (e >= 1) {
      rebose++;
      e = 0.45;
      H.sonar("no");
    }
    H.g.e = e;
    H.g.l = l;
    med.poner(e);
    lisu.poner(l);
    espuma.setAttribute("y", (80 - 34 * e).toFixed(1));
    espuma.setAttribute("height", (34 * e + 4).toFixed(1));
    liq.setAttribute("fill", mezcla("rgb(250,240,200)", color, l));
    tz.forEach((z, i) => {
      z.setAttribute("opacity", i < 8 * (1 - l) ? 1 : 0);
      if (on) z.setAttribute("transform", `rotate(${((t / 3 + i * 45) % 360).toFixed(0)} 150 118)`);
    });
    aspas.setAttribute("transform", `translate(150 138) rotate(${on ? ((t * 1.5) % 180).toFixed(0) : 0})`);
    luz.setAttribute("fill", on ? "rgb(140,220,120)" : "rgb(250,240,220)");
    if (l >= 1) {
      on = false;
      H.fin(H.notaDe(Math.max(0, eMax - LIM * 0.86), TOL, 0.35) - 0.5 * rebose);
    }
  });
  arrastrar(s, H, {
    abajo: () => {
      on = true;
      tOn = 0;
    },
    arriba: () => {
      on = false;
    },
  });
}

// ====================================================================================
// TERMOMETRO (te longjing): el agua hirvio; se enfria; servir justo a 80 °C.
function termometro(s, paso, H) {
  const { el, TINTA } = H;
  const OBJ = 80;
  const TOL = H.ancho(2.2, 0.35);
  const TAU = 5200 / H.rapido(0.25);
  // la tetera
  el(s, "ellipse", { cx: 112, cy: 132, rx: 52, ry: 42, fill: "rgb(214,226,232)", stroke: TINTA, "stroke-width": 3 });
  el(s, "path", { d: "M160 124 Q186 110 192 92 L198 96 Q192 122 162 140 Z", fill: "rgb(214,226,232)", stroke: TINTA, "stroke-width": 3, "stroke-linejoin": "round" });
  el(s, "rect", { x: 94, y: 84, width: 36, height: 10, rx: 4, fill: "rgb(190,204,212)", stroke: TINTA, "stroke-width": 3 });
  el(s, "path", { d: "M70 110 Q40 120 62 150", fill: "none", stroke: TINTA, "stroke-width": 5 });
  const vapor = el(s, "g", {});
  const vs = [0, 1, 2].map((i) => el(vapor, "path", { d: `M${186 + i * 6} 84 q-6 -10 0 -20 q6 -10 0 -20`, fill: "none", stroke: "rgb(230,236,240)", "stroke-width": 4, "stroke-linecap": "round" }));
  // el termometro
  const TX = 244;
  const Y0 = 34;
  const Y1 = 160;
  const yDe = (T) => Y1 - ((T - 60) / 40) * (Y1 - Y0);
  el(s, "rect", { x: TX - 9, y: Y0 - 8, width: 18, height: Y1 - Y0 + 16, rx: 9, fill: PAPEL, stroke: TINTA, "stroke-width": 3 });
  el(s, "rect", { x: TX - 7, y: yDe(OBJ + TOL), width: 14, height: yDe(OBJ - TOL) - yDe(OBJ + TOL), fill: ZONA });
  for (let T = 60; T <= 100; T += 10) {
    el(s, "line", { x1: TX - 16, y1: yDe(T), x2: TX - 10, y2: yDe(T), stroke: TINTA, "stroke-width": 2 });
    el(s, "text", { x: TX - 19, y: yDe(T) + 3, "text-anchor": "end", "font-size": 9, class: "cocina-cuenta" }).textContent = `${T}`;
  }
  const columna = el(s, "rect", { x: TX - 3, y: Y0, width: 6, height: Y1 - Y0, fill: ROJO });
  el(s, "circle", { cx: TX, cy: Y1 + 12, r: 11, fill: ROJO, stroke: TINTA, "stroke-width": 3 });
  const grados = letrero(H, s, "100°C", 150, 26);
  H.ayuda("Let the water cool · tap to pour at 80 °C (green)");
  let T = 100;
  Object.assign(H.g, { tipo: "termometro", T, obj: OBJ });
  H.bucle((t) => {
    T = 60 + 40 * Math.exp(-t / TAU);
    H.g.T = T;
    columna.setAttribute("y", yDe(T).toFixed(1));
    columna.setAttribute("height", (Y1 - yDe(T)).toFixed(1));
    grados.textContent = `${Math.round(T)}°C`;
    vs.forEach((v, i) => {
      v.setAttribute("opacity", clamp((T - 70 - i * 8) / 18).toFixed(2));
      v.setAttribute("transform", `translate(0 ${(-((t / 30 + i * 9) % 12)).toFixed(1)})`);
    });
    if (T < 66) H.fin(1);
  });
  s.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (!H.vivo()) return;
    H.fin(H.notaDe(T - OBJ, TOL, 8));
  });
}

// ====================================================================================
// ACEITE (bunuelos, rollitos): freir manteniendo el aceite en la temperatura justa:
// mantener apretado sube el fuego, soltar lo baja. Mientras mas tiempo en la franja, mejor.
function aceite(s, paso, H) {
  const { el, TINTA } = H;
  const A = 0.48;
  const B = 0.66;
  const DUR = 6500 / H.rapido(0.15);
  const anchoZ = H.ancho(1, 0.3);
  const a = 0.57 - (0.57 - A) * anchoZ;
  const b = 0.57 + (B - 0.57) * anchoZ;
  const rollos = paso.forma === "rollo";
  const fuego = el(s, "g", {});
  const llamas = [0, 1, 2, 3, 4].map((i) => el(fuego, "path", { d: `M${100 + i * 25} 194 Q${108 + i * 25} 180 ${114 + i * 25} 194 Z`, fill: i % 2 ? "rgb(255,170,60)" : "rgb(240,100,50)", stroke: TINTA, "stroke-width": 1.5 }));
  el(s, "path", { d: "M62 92 L76 176 L224 176 L238 92 Z", fill: "rgb(60,60,70)", stroke: TINTA, "stroke-width": 3, "stroke-linejoin": "round" });
  el(s, "rect", { x: 66, y: 104, width: 168, height: 66, fill: "rgb(236,190,80)", opacity: 0.85 });
  const comida = [];
  for (let i = 0; i < (rollos ? 3 : 4); i++) {
    const g = el(s, "g", {});
    if (rollos) el(g, "rect", { x: -20, y: -8, width: 40, height: 16, rx: 7, stroke: TINTA, "stroke-width": 2.5 });
    else el(g, "circle", { r: 13, stroke: TINTA, "stroke-width": 2.5 });
    comida.push({ g, x: rollos ? 100 + i * 50 : 94 + i * 37 });
  }
  const burb = el(s, "g", {});
  const bs = [];
  for (let i = 0; i < 10; i++) bs.push(el(burb, "circle", { cx: 80 + i * 15, cy: 108, r: 2.5, fill: "rgb(255,236,170)", stroke: TINTA, "stroke-width": 1 }));
  const humo = el(s, "path", { d: "M150 86 q-8 -12 0 -24 q8 -12 0 -24", fill: "none", stroke: "rgb(160,160,170)", "stroke-width": 5, "stroke-linecap": "round", opacity: 0 });
  el(s, "rect", { x: 56, y: 88, width: 188, height: 8, rx: 3, fill: "rgb(80,80,90)", stroke: TINTA, "stroke-width": 3 });
  const med = medidor(H, s, { x: 70, y: 22, w: 160, h: 11, a, b, rojo: 0.14 });
  const prog = medidor(H, s, { x: 262, y: 40, w: 10, h: 130, a: 0, b: 0, vertical: true });
  H.ayuda("Hold to turn the heat up, let go to cool · keep the oil in the green");
  let T = 0.42;
  let on = false;
  let tUlt = 0;
  let p = 0;
  let dentro = 0;
  let total = 0;
  const az = H.azarDe("aceite");
  const fase = [az() * 6, az() * 6];
  Object.assign(H.g, { tipo: "aceite", T, a, b, p: 0 });
  H.bucle((t) => {
    const dt = Math.min(40, t - tUlt);
    tUlt = t;
    const deriva = 0.00009 * (Math.sin(t / 700 + fase[0]) + Math.sin(t / 430 + fase[1]));
    T += dt * ((on ? 0.00042 : -0.00034) + deriva) * H.rapido(0.25);
    T = clamp(T, 0.05, 1);
    p += dt / DUR;
    total += dt;
    if (T >= a && T <= b) dentro += dt;
    H.g.T = T;
    H.g.p = p;
    med.poner(T);
    prog.poner(p);
    const dorado = clamp(p) * (T > b ? 1.25 : T < a ? 0.7 : 1);
    comida.forEach((c, i) => {
      const y = 132 + Math.sin(t / 300 + i) * 3;
      c.g.setAttribute("transform", `translate(${c.x} ${y.toFixed(1)})`);
      c.g.firstChild.setAttribute("fill", mezcla("rgb(252,236,190)", T > b + 0.12 ? "rgb(150,90,40)" : "rgb(222,150,50)", dorado));
    });
    bs.forEach((bb, i) => {
      const vivo = i < 10 * T;
      bb.setAttribute("opacity", vivo ? 1 : 0);
      bb.setAttribute("cy", (108 + ((t / (6 - T * 4) + i * 13) % 60)).toFixed(1));
    });
    humo.setAttribute("opacity", T > b + 0.08 ? 0.8 : 0);
    llamas.forEach((l) => l.setAttribute("transform", `translate(0 ${on ? -6 : 0}) scale(1 ${on ? 1.0 : 0.7})`));
    if (p >= 1) H.fin(1 + 2 * Math.pow(clamp(dentro / total / 0.92), 1.5));
  });
  arrastrar(s, H, {
    abajo: () => {
      on = true;
    },
    arriba: () => {
      on = false;
    },
  });
}

// ====================================================================================
// PALMEAR (arepa): pasar la masa de una mano a la otra, a un ritmo parejo.
function palmear(s, paso, H) {
  const { el, TINTA } = H;
  const N = H.mas(paso.n || 8, 2);
  const TOL = H.ancho(0.25, 0.35);
  const CX = 150;
  const CY = 104;
  const zi = el(s, "rect", { x: 8, y: 40, width: 120, height: 150, rx: 14, fill: ZONA, opacity: 0.0 });
  const zd = el(s, "rect", { x: 172, y: 40, width: 120, height: 150, rx: 14, fill: ZONA, opacity: 0.0 });
  const masa = el(s, "ellipse", { cx: CX, cy: CY, rx: 26, ry: 24, fill: H.MASA_R, stroke: TINTA, "stroke-width": 3 });
  const grieta = el(s, "path", { d: `M${CX - 10} ${CY - 6} l6 5 l-4 6`, fill: "none", stroke: TINTA, "stroke-width": 2, opacity: 0 });
  const mi = mano(H, s, 64, CY, 1.4, true);
  const md = mano(H, s, 236, CY, 1.4, false);
  const cuenta = letrero(H, s, `0 / ${N}`);
  H.ayuda("Tap left, right, left… at an even beat to pat the arepa flat");
  Object.assign(H.g, { tipo: "palmear", lado: -1, n: 0 });
  let lado = -1;
  let n = 0;
  let tUlt = null;
  const ints = [];
  const notas = [];
  const marcar = () => {
    zi.setAttribute("opacity", lado < 0 ? 0.35 : 0);
    zd.setAttribute("opacity", lado > 0 ? 0.35 : 0);
  };
  marcar();
  s.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (!H.vivo()) return;
    const [x] = H.aSvg(e);
    const l = x < CX ? -1 : 1;
    const ahora = H.ahora();
    const m = l < 0 ? mi : md;
    m.setAttribute("transform", `translate(${l < 0 ? 104 : 196} ${CY}) scale(${l < 0 ? 1.4 : -1.4} 1.4)`);
    setTimeout(() => m.setAttribute("transform", `translate(${l < 0 ? 64 : 236} ${CY}) scale(${l < 0 ? 1.4 : -1.4} 1.4)`), 120);
    if (l !== lado) {
      notas.push(1.4);
      grieta.setAttribute("opacity", 1);
      H.sonar("no");
    } else {
      if (tUlt !== null) {
        const d = ahora - tUlt;
        ints.push(d);
        const ref = ints.length > 1 ? ints.slice(0, -1).reduce((a2, b2) => a2 + b2, 0) / (ints.length - 1) : d;
        const desv = d / ref - 1;
        notas.push(ints.length > 1 ? H.notaDe(desv, TOL, 0.6) : 3);
        H.sonar(Math.abs(desv) <= TOL ? "tocar" : "no");
      } else H.sonar("tocar");
      tUlt = ahora;
      lado = -lado;
      n++;
      H.g.lado = lado;
      H.g.n = n;
      cuenta.textContent = `${n} / ${N}`;
      const k = n / N;
      masa.setAttribute("rx", (26 + 30 * k).toFixed(1));
      masa.setAttribute("ry", (24 - 9 * k).toFixed(1));
    }
    marcar();
    if (n >= N) H.fin(H.promedio(notas));
  });
}

// ====================================================================================
// ENROSCAR (pan de cebollin): enroscar la tira de masa en espiral, siguiendo la guia.
function enroscar(s, paso, H) {
  const { el, TINTA } = H;
  const CX = 150;
  const CY = 104;
  const VUELTAS = 2.4;
  const R0 = 76;
  const R1 = 8;
  const pts = [];
  for (let i = 0; i <= 160; i++) {
    const k = i / 160;
    const a = -Math.PI / 2 + k * VUELTAS * 2 * Math.PI;
    const r = lerp(R0, R1, k);
    pts.push([CX + r * Math.cos(a), CY + r * Math.sin(a) * 0.86]);
  }
  const TOL = H.ancho(7, 0.35);
  const camino = (hasta) => pts.slice(0, hasta + 1).map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  el(s, "rect", { x: 40, y: 18, width: 220, height: 176, rx: 10, fill: "rgb(214,176,124)", stroke: TINTA, "stroke-width": 3 });
  el(s, "path", { d: camino(160), fill: "none", stroke: VERDE_O, "stroke-width": 3, "stroke-dasharray": "5 6", opacity: 0.75 });
  const borde = el(s, "path", { d: "", fill: "none", stroke: TINTA, "stroke-width": 15, "stroke-linecap": "round", "stroke-linejoin": "round" });
  const tira = el(s, "path", { d: "", fill: "none", stroke: H.MASA_R, "stroke-width": 10, "stroke-linecap": "round", "stroke-linejoin": "round" });
  const puntos = el(s, "g", {});
  el(s, "circle", { cx: pts[0][0], cy: pts[0][1], r: 9, fill: ZONA, stroke: VERDE_O, "stroke-width": 2.5 });
  H.ayuda("Start at the green dot and coil the dough along the spiral");
  Object.assign(H.g, { tipo: "enroscar", pts, i: 0 });
  let i = 0;
  let activo = false;
  const desv = [];
  arrastrar(s, H, {
    abajo: (p) => {
      activo = Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]) < 30;
    },
    mover: (p) => {
      if (!activo) return;
      let mej = i;
      let dm = 1e9;
      for (let j = i; j < Math.min(pts.length, i + 14); j++) {
        const d = Math.hypot(p[0] - pts[j][0], p[1] - pts[j][1]);
        if (d < dm) {
          dm = d;
          mej = j;
        }
      }
      if (dm > 34) return;
      desv.push(dm);
      if (mej > i) {
        for (let j = i + 1; j <= mej; j++) if (j % 9 === 0) el(puntos, "circle", { cx: pts[j][0].toFixed(1), cy: pts[j][1].toFixed(1), r: 2, fill: "rgb(90,160,70)" });
        i = mej;
        H.g.i = i;
        borde.setAttribute("d", camino(i));
        tira.setAttribute("d", camino(i));
      }
      if (i >= pts.length - 3) {
        activo = false;
        const prom = desv.reduce((a, b) => a + b, 0) / desv.length;
        el(s, "circle", { cx: CX, cy: CY, r: 0, fill: H.MASA_R, stroke: TINTA, "stroke-width": 3 }).setAttribute("r", 70);
        H.fin(H.notaDe(prom, TOL, 12));
      }
    },
    arriba: () => {
      activo = false;
    },
  });
}

// ====================================================================================
// DESGRANAR (arroz frito): el arroz de ayer esta en grumos; tocarlos para soltarlos.
// Los grumos se mueven un poco; cada toque fallado cuenta.
function desgranar(s, paso, H) {
  const { el, TINTA } = H;
  const N = H.mas(paso.n || 5, 2);
  const az = H.azarDe("desgranar");
  el(s, "ellipse", { cx: 150, cy: 108, rx: 128, ry: 80, fill: "rgb(60,60,70)", stroke: TINTA, "stroke-width": 3 });
  el(s, "ellipse", { cx: 150, cy: 104, rx: 116, ry: 70, fill: "rgb(90,92,104)" });
  const sueltos = el(s, "g", {});
  const grumos = [];
  for (let i = 0; i < N; i++) {
    const g = { x: 70 + az() * 160, y: 66 + az() * 76, vx: (az() - 0.5) * 0.05, vy: (az() - 0.5) * 0.04, hp: 3, e: el(s, "g", {}) };
    grumos.push(g);
  }
  const dibujar = (g) => {
    g.e.innerHTML = "";
    if (g.hp <= 0) return;
    const r = 7 + g.hp * 5;
    el(g.e, "circle", { cx: 0, cy: 0, r, fill: "rgb(250,248,236)", stroke: TINTA, "stroke-width": 2.5 });
    for (let j = 0; j < g.hp * 2; j++) el(g.e, "ellipse", { cx: Math.cos(j * 2.4) * r * 0.5, cy: Math.sin(j * 2.4) * r * 0.5, rx: 3, ry: 1.6, fill: "rgb(226,220,200)" });
  };
  grumos.forEach(dibujar);
  const cuenta = letrero(H, s, `0 / ${N}`);
  H.ayuda("Tap the rice clumps to break them apart");
  Object.assign(H.g, { tipo: "desgranar", grumos: [] });
  let malos = 0;
  let tUlt = 0;
  const vel = H.rapido(0.5);
  H.bucle((t) => {
    const dt = Math.min(40, t - tUlt);
    tUlt = t;
    H.g.grumos = grumos.filter((g) => g.hp > 0).map((g) => ({ x: g.x, y: g.y, r: 7 + g.hp * 5 }));
    for (const g of grumos) {
      if (g.hp <= 0) continue;
      g.x += g.vx * dt * vel;
      g.y += g.vy * dt * vel;
      if (g.x < 50 || g.x > 250) g.vx = -g.vx;
      if (g.y < 50 || g.y > 160) g.vy = -g.vy;
      g.e.setAttribute("transform", `translate(${g.x.toFixed(1)} ${g.y.toFixed(1)})`);
    }
  });
  s.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (!H.vivo()) return;
    const [x, y] = H.aSvg(e);
    const g = grumos.find((q) => q.hp > 0 && Math.hypot(q.x - x, q.y - y) < 7 + q.hp * 5 + 5);
    if (!g) {
      malos++;
      H.sonar("no");
      return;
    }
    g.hp--;
    H.sonar("tocar");
    for (let j = 0; j < 5; j++) el(sueltos, "ellipse", { cx: (g.x + (Math.random() - 0.5) * 50).toFixed(1), cy: (g.y + (Math.random() - 0.5) * 36).toFixed(1), rx: 3, ry: 1.6, fill: "rgb(250,248,236)" });
    dibujar(g);
    g.vx *= 1.25;
    g.vy *= 1.25;
    const listos = grumos.filter((q) => q.hp <= 0).length;
    cuenta.textContent = `${listos} / ${N}`;
    if (listos >= N) H.fin(Math.max(1, 3 - 0.25 * malos));
  });
}

// ====================================================================================
// ESPESAR (ajiaco): revolver hasta que espese (las papas se deshacen). Si se deja de revolver,
// se pega al fondo. Tocar "Check" cuando este en la franja.
function espesar(s, paso, H) {
  const { el, TINTA } = H;
  const A = 0.72;
  const B = 0.86;
  const TOL = H.ancho(0.07, 0.35);
  const MID = (A + B) / 2;
  const CX = 140;
  const CY = 106;
  el(s, "ellipse", { cx: CX, cy: CY + 4, rx: 104, ry: 82, fill: OLLA, stroke: TINTA, "stroke-width": 3 });
  const sopa = el(s, "ellipse", { cx: CX, cy: CY, rx: 92, ry: 70, fill: "rgb(250,232,150)" });
  const pegado = el(s, "g", { opacity: 0 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    el(pegado, "ellipse", { cx: CX + 82 * Math.cos(a), cy: CY + 62 * Math.sin(a), rx: 9, ry: 6, fill: "rgb(150,90,40)" });
  }
  const papas = [];
  const az = H.azarDe("espesar");
  for (let i = 0; i < 9; i++) papas.push(el(s, "circle", { cx: CX - 60 + az() * 120, cy: CY - 40 + az() * 80, r: 9, fill: "rgb(252,240,200)", stroke: TINTA, "stroke-width": 2 }));
  const cuchara = el(s, "g", {});
  el(cuchara, "ellipse", { cx: 0, cy: 0, rx: 11, ry: 8, fill: MADERA, stroke: TINTA, "stroke-width": 2.5 });
  el(cuchara, "rect", { x: -3, y: -60, width: 6, height: 54, rx: 3, fill: MADERA, stroke: TINTA, "stroke-width": 2.5 });
  cuchara.setAttribute("transform", `translate(${CX + 40} ${CY})`);
  const med = medidor(H, s, { x: 262, y: 30, w: 12, h: 150, a: A / 1.2, b: B / 1.2, vertical: true });
  H.ayuda("Stir in circles until it thickens · tap Check when it's in the green");
  Object.assign(H.g, { tipo: "espesar", v: 0, a: A, b: B, cx: CX, cy: CY });
  let previo = null;
  let v = 0;
  let pega = 0;
  let tMov = 0;
  let tUlt = 0;
  const pintar = () => {
    sopa.setAttribute("fill", mezcla("rgb(250,232,150)", "rgb(232,190,70)", v));
    papas.forEach((p, i) => p.setAttribute("r", Math.max(0, 9 - v * 9 * (0.8 + (i % 3) * 0.2)).toFixed(1)));
    med.poner(v / 1.2);
    pegado.setAttribute("opacity", clamp(pega * 3).toFixed(2));
  };
  H.bucle((t) => {
    const dt = Math.min(40, t - tUlt);
    tUlt = t;
    if (v > 0.15 && H.ahora() - tMov > 500) pega += dt * 0.00012;
    H.g.v = v;
    pintar();
  });
  arrastrar(s, H, {
    abajo: (p) => {
      previo = Math.atan2(p[1] - CY, p[0] - CX);
    },
    mover: (p) => {
      const a = Math.atan2(p[1] - CY, p[0] - CX);
      let d = a - previo;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      previo = a;
      cuchara.setAttribute("transform", `translate(${clamp(p[0], 50, 230).toFixed(1)} ${clamp(p[1], 40, 176).toFixed(1)})`);
      if (Math.hypot(p[0] - CX, p[1] - CY) < 18) return;
      if (Math.abs(d) > 0.01) tMov = H.ahora();
      v = Math.min(1.2, v + Math.abs(d) * 0.016 * H.rapido(0.2));
    },
  });
  H.boton("Check ✓", () => {
    if (v < 0.1) return;
    H.fin(H.notaDe(v - MID, (B - A) / 2 + TOL - 0.07, 0.3) - Math.min(1, pega * 4));
  });
}

// ====================================================================================
// REMOLINO (sopa de ternera del lago): revolver para hacer un remolino y, con el remolino
// a la velocidad justa, echar el huevo: salen cintas finitas.
function remolino(s, paso, H) {
  const { el, TINTA } = H;
  const N = paso.n || 2;
  const A = 0.5;
  const B = 0.72;
  const TOL = H.ancho(0.11, 0.35);
  const MID = (A + B) / 2;
  const CX = 130;
  const CY = 108;
  el(s, "ellipse", { cx: CX, cy: CY + 4, rx: 100, ry: 80, fill: OLLA, stroke: TINTA, "stroke-width": 3 });
  el(s, "ellipse", { cx: CX, cy: CY, rx: 88, ry: 68, fill: "rgb(214,170,110)" });
  const giro = el(s, "g", {});
  for (let i = 0; i < 4; i++) el(giro, "path", { d: `M0 0 Q${30} ${-10} ${60} ${10}`, fill: "none", stroke: "rgb(236,200,150)", "stroke-width": 3, "stroke-linecap": "round", transform: `rotate(${i * 90})` });
  const cintas = el(s, "g", {});
  // el bol con huevo
  const bol = el(s, "g", { transform: "translate(262 70)" });
  el(bol, "path", { d: "M-26 -8 Q-24 22 0 24 Q24 22 26 -8 Z", fill: "rgb(236,240,246)", stroke: TINTA, "stroke-width": 3 });
  el(bol, "ellipse", { cx: 0, cy: -8, rx: 26, ry: 7, fill: "rgb(255,210,70)", stroke: TINTA, "stroke-width": 2.5 });
  const med = medidor(H, s, { x: 50, y: 14, w: 160, h: 10, a: A, b: B });
  el(s, "text", { x: 262, y: 112, "text-anchor": "middle", class: "cocina-cuenta", "font-size": 10 }).textContent = "egg";
  const cuenta = letrero(H, s, `0 / ${N}`, 262, 140);
  H.ayuda("Stir to make a whirlpool · tap the egg bowl when the swirl is in the green");
  Object.assign(H.g, { tipo: "remolino", w: 0, a: A, b: B, cx: CX, cy: CY, bol: [262, 70] });
  let previo = null;
  let w = 0;
  let ang = 0;
  let tUlt = 0;
  let n = 0;
  const notas = [];
  H.bucle((t) => {
    const dt = Math.min(40, t - tUlt);
    tUlt = t;
    w *= Math.exp(-dt / 1300);
    ang += dt * w * 0.5;
    H.g.w = w;
    med.poner(w);
    giro.setAttribute("transform", `translate(${CX} ${CY}) rotate(${ang.toFixed(1)}) scale(1 0.78)`);
    cintas.setAttribute("transform", `rotate(${(ang * 0.6).toFixed(1)} ${CX} ${CY})`);
  });
  arrastrar(s, H, {
    abajo: (p) => {
      previo = Math.atan2(p[1] - CY, p[0] - CX);
      if (p[0] > 228) {
        previo = null;
        if (n >= N) return;
        const nota = H.notaDe(w - MID, (B - A) / 2 + TOL - 0.11, 0.35);
        notas.push(nota);
        n++;
        cuenta.textContent = `${n} / ${N}`;
        H.sonar(nota >= 2.5 ? "tocar" : "no");
        bol.setAttribute("transform", "translate(250 70) rotate(-35)");
        setTimeout(() => bol.setAttribute("transform", "translate(262 70)"), 350);
        // las cintas: finitas si el remolino estaba bien, grumos si no
        const fino = nota >= 2.5;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + n;
          const r = 22 + i * 7;
          el(cintas, "path", { d: `M${(CX + r * Math.cos(a)).toFixed(1)} ${(CY + r * 0.78 * Math.sin(a)).toFixed(1)} A${r} ${r * 0.78} 0 0 1 ${(CX + r * Math.cos(a + 1.1)).toFixed(1)} ${(CY + r * 0.78 * Math.sin(a + 1.1)).toFixed(1)}`, fill: "none", stroke: "rgb(255,220,90)", "stroke-width": fino ? 3 : 8, "stroke-linecap": "round" });
        }
        if (n >= N) setTimeout(() => H.fin(H.promedio(notas)), 400);
      }
    },
    mover: (p) => {
      if (previo === null) return;
      const a = Math.atan2(p[1] - CY, p[0] - CX);
      let d = a - previo;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      previo = a;
      if (Math.hypot(p[0] - CX, p[1] - CY) < 16) return;
      w = Math.min(1, w + Math.abs(d) * 0.028 * H.rapido(0.2));
    },
  });
}

// ====================================================================================
// ESCURRIR (sopa de fideos): sacudir el colador arriba y abajo. Sacudidas largas escurren,
// pero si se pasa de la linea roja, se caen fideos.
function escurrir(s, paso, H) {
  const { el, TINTA } = H;
  const NEC = H.mas(6, 2);
  const YC = 104;
  const LIM = 50;
  const BUENA = 30;
  el(s, "line", { x1: 30, y1: YC - LIM, x2: 270, y2: YC - LIM, stroke: ROJO, "stroke-width": 2, "stroke-dasharray": "6 6" });
  el(s, "line", { x1: 30, y1: YC + LIM, x2: 270, y2: YC + LIM, stroke: ROJO, "stroke-width": 2, "stroke-dasharray": "6 6" });
  el(s, "rect", { x: 30, y: YC - LIM + 4, width: 240, height: LIM - BUENA - 4, fill: ZONA, opacity: 0.3 });
  el(s, "rect", { x: 30, y: YC + BUENA, width: 240, height: LIM - BUENA - 4, fill: ZONA, opacity: 0.3 });
  const caidos = el(s, "g", {});
  const col = el(s, "g", {});
  el(col, "path", { d: "M-56 -14 Q-50 34 0 36 Q50 34 56 -14 Z", fill: METAL, stroke: TINTA, "stroke-width": 3 });
  for (let i = 0; i < 6; i++) el(col, "circle", { cx: -34 + i * 14, cy: 12 + (i % 2) * 8, r: 2, fill: TINTA });
  el(col, "rect", { x: 54, y: -18, width: 50, height: 8, rx: 4, fill: METAL, stroke: TINTA, "stroke-width": 3 });
  for (let i = 0; i < 5; i++) el(col, "path", { d: `M${-40 + i * 18} -14 q6 12 -2 22 q-6 8 4 14`, fill: "none", stroke: "rgb(250,232,170)", "stroke-width": 4, "stroke-linecap": "round" });
  const agua = el(col, "rect", { x: -44, y: -10, width: 88, height: 14, fill: "rgb(170,204,224)", opacity: 0.8 });
  const gotas = el(s, "g", {});
  const cuenta = letrero(H, s, `0 / ${NEC}`);
  H.ayuda("Drag up and down to shake the water out · into the green, not past the red");
  Object.assign(H.g, { tipo: "escurrir", y: YC, yc: YC, lim: LIM, buena: BUENA, n: 0 });
  let y = YC;
  let dir = 0;
  let ext = YC;
  let tramo = YC;
  let fuera = false;
  let n = 0;
  let caen = 0;
  arrastrar(s, H, {
    mover: (p) => {
      const ny = clamp(p[1], YC - 80, YC + 80);
      const d = ny - y;
      y = ny;
      H.g.y = y;
      col.setAttribute("transform", `translate(140 ${y.toFixed(1)})`);
      if (Math.abs(y - YC) > LIM && !fuera) {
        fuera = true;
        caen++;
        H.sonar("no");
        el(caidos, "path", { d: `M${120 + caen * 14} 186 q8 -8 16 0`, fill: "none", stroke: "rgb(250,232,170)", "stroke-width": 4, "stroke-linecap": "round" });
      }
      if (Math.abs(y - YC) < LIM - 6) fuera = false;
      if (Math.abs(d) < 0.5) return;
      const sd = Math.sign(d);
      if (dir === 0) dir = sd;
      if (sd === dir) ext = dir > 0 ? Math.max(ext, y) : Math.min(ext, y);
      else if (Math.abs(y - ext) > 8) {
        // dio la vuelta: ¿fue una sacudida buena?
        if (Math.abs(ext - YC) >= BUENA && Math.abs(tramo - YC) >= BUENA * 0.5 && Math.sign(ext - YC) !== Math.sign(tramo - YC)) {
          n++;
          H.g.n = n;
          cuenta.textContent = `${Math.min(n, NEC)} / ${NEC}`;
          agua.setAttribute("height", Math.max(0, 14 * (1 - n / NEC)).toFixed(1));
          el(gotas, "circle", { cx: 120 + Math.random() * 40, cy: 170 + Math.random() * 16, r: 3, fill: "rgb(170,204,224)" });
          H.sonar("tocar");
          if (n >= NEC) H.fin(Math.max(1, 3 - 0.45 * caen));
        }
        tramo = ext;
        dir = sd;
        ext = y;
      }
    },
  });
  col.setAttribute("transform", `translate(140 ${YC})`);
}

// ====================================================================================
// MARCAR (pescado del lago): cortes en diagonal sobre el lomo, siguiendo las guias.
function marcar(s, paso, H) {
  const { el, TINTA } = H;
  const N = H.mas(paso.n || 4, 1);
  const g = el(s, "g", {});
  H.dibujarPescado(g, 30, 270, 108, 74);
  const guias = [];
  const ANG = (-62 * Math.PI) / 180;
  for (let i = 0; i < N; i++) {
    const cx = 92 + (i * 128) / Math.max(1, N - 1);
    const L = 30;
    const g2 = { cx, cy: 104, x1: cx - L * Math.cos(ANG), y1: 104 - L * Math.sin(ANG), x2: cx + L * Math.cos(ANG), y2: 104 + L * Math.sin(ANG) };
    g2.e = el(s, "line", { x1: g2.x1, y1: g2.y1, x2: g2.x2, y2: g2.y2, stroke: VERDE_O, "stroke-width": 3, "stroke-dasharray": "5 5" });
    guias.push(g2);
  }
  const traz = el(s, "line", { x1: 0, y1: 0, x2: 0, y2: 0, stroke: ROJO, "stroke-width": 2, opacity: 0 });
  const cuenta = letrero(H, s, `0 / ${N}`);
  H.ayuda("Swipe along each dashed line to score the fish");
  const TOLA = H.ancho(9, 0.35);
  const TOLD = H.ancho(6, 0.35);
  Object.assign(H.g, { tipo: "marcar", guias: guias.map(({ x1, y1, x2, y2 }) => ({ x1, y1, x2, y2 })), n: 0 });
  const notas = [];
  const hechas = new Set();
  let ini = null;
  arrastrar(s, H, {
    abajo: (p) => {
      ini = p;
      traz.setAttribute("x1", p[0]);
      traz.setAttribute("y1", p[1]);
    },
    mover: (p) => {
      if (!ini) return;
      traz.setAttribute("x2", p[0].toFixed(1));
      traz.setAttribute("y2", p[1].toFixed(1));
      traz.setAttribute("opacity", 0.8);
    },
    arriba: (p) => {
      traz.setAttribute("opacity", 0);
      if (!ini) return;
      const [x0, y0] = ini;
      ini = null;
      const L = Math.hypot(p[0] - x0, p[1] - y0);
      if (L < 22) return;
      const mx = (p[0] + x0) / 2;
      const my = (p[1] + y0) / 2;
      let mej = -1;
      let dm = 1e9;
      guias.forEach((gg, i) => {
        if (hechas.has(i)) return;
        const d = Math.hypot(mx - gg.cx, my - gg.cy);
        if (d < dm) {
          dm = d;
          mej = i;
        }
      });
      if (mej < 0 || dm > 40) return H.sonar("no");
      hechas.add(mej);
      const gg = guias[mej];
      let ang = (Math.atan2(p[1] - y0, p[0] - x0) - ANG) * (180 / Math.PI);
      ang = ((ang % 180) + 180) % 180;
      if (ang > 90) ang -= 180;
      // distancia del centro del corte a la guia (perpendicular)
      const ux = Math.cos(ANG);
      const uy = Math.sin(ANG);
      const perp = Math.abs((mx - gg.cx) * uy - (my - gg.cy) * ux);
      const nota = (H.notaDe(ang, TOLA, 25) + H.notaDe(perp, TOLD, 16)) / 2 - (L < 40 ? 0.4 : 0);
      notas.push(nota);
      gg.e.setAttribute("opacity", 0);
      el(s, "line", { x1: x0.toFixed(1), y1: y0.toFixed(1), x2: p[0].toFixed(1), y2: p[1].toFixed(1), stroke: "rgb(250,236,226)", "stroke-width": 5, "stroke-linecap": "round" });
      el(s, "line", { x1: x0.toFixed(1), y1: y0.toFixed(1), x2: p[0].toFixed(1), y2: p[1].toFixed(1), stroke: TINTA, "stroke-width": 1.5 });
      H.sonar(nota >= 2.5 ? "tocar" : "no");
      cuenta.textContent = `${hechas.size} / ${N}`;
      H.g.n = hechas.size;
      if (hechas.size >= N) H.fin(H.promedio(notas));
    },
  });
}

// ====================================================================================
// BANAR (cerdo dongpo): llenar el cucharon en la salsa (abajo) y soltarlo encima del cerdo.
function banar(s, paso, H) {
  const { el, TINTA } = H;
  const N = H.mas(paso.n || 4, 1);
  const TOL = H.ancho(10, 0.35);
  const CX = 150;
  const TOPE = 82;
  el(s, "path", { d: "M40 112 Q44 190 150 192 Q256 190 260 112 Z", fill: "rgb(150,80,56)", stroke: TINTA, "stroke-width": 3 });
  const salsa = el(s, "ellipse", { cx: 150, cy: 150, rx: 104, ry: 26, fill: "rgb(110,40,24)" });
  el(s, "ellipse", { cx: 150, cy: 112, rx: 110, ry: 16, fill: "none", stroke: TINTA, "stroke-width": 3 });
  // el cerdo en capas
  const cerdo = el(s, "g", {});
  const capas = [[TOPE, 12, "rgb(176,90,56)"], [TOPE + 12, 10, "rgb(252,236,214)"], [TOPE + 22, 10, "rgb(214,110,96)"], [TOPE + 32, 9, "rgb(252,236,214)"], [TOPE + 41, 12, "rgb(200,96,84)"]];
  const cs = capas.map(([y, h, c]) => el(cerdo, "rect", { x: CX - 34, y, width: 68, height: h, fill: c }));
  el(cerdo, "rect", { x: CX - 34, y: TOPE, width: 68, height: 53, rx: 4, fill: "none", stroke: TINTA, "stroke-width": 3 });
  const brillo = el(cerdo, "rect", { x: CX - 26, y: TOPE + 3, width: 30, height: 4, rx: 2, fill: "rgb(255,220,180)", opacity: 0 });
  el(s, "rect", { x: CX - 22, y: TOPE - 10, width: 44, height: 8, rx: 4, fill: ZONA, stroke: VERDE_O, "stroke-width": 2 });
  const cucharon = el(s, "g", {});
  el(cucharon, "ellipse", { cx: 0, cy: 0, rx: 16, ry: 10, fill: METAL, stroke: TINTA, "stroke-width": 2.5 });
  const lleno = el(cucharon, "ellipse", { cx: 0, cy: -1, rx: 12, ry: 6, fill: "rgb(110,40,24)", opacity: 0 });
  el(cucharon, "rect", { x: 12, y: -42, width: 6, height: 40, rx: 3, fill: METAL, stroke: TINTA, "stroke-width": 2.5, transform: "rotate(25)" });
  cucharon.setAttribute("transform", "translate(232 60)");
  const chorro = el(s, "rect", { x: 0, y: 0, width: 8, height: 0, fill: "rgb(110,40,24)", opacity: 0 });
  const cuenta = letrero(H, s, `0 / ${N}`);
  H.ayuda("Dip the ladle in the sauce, drag it up and let go right over the pork");
  Object.assign(H.g, { tipo: "banar", salsa: [150, 160], meta: [CX, TOPE - 6], n: 0 });
  let carga = false;
  let n = 0;
  const notas = [];
  arrastrar(s, H, {
    abajo: (p) => {
      carga = p[1] > 136;
      lleno.setAttribute("opacity", carga ? 1 : 0);
      cucharon.setAttribute("transform", `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`);
    },
    mover: (p) => {
      cucharon.setAttribute("transform", `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`);
    },
    arriba: (p) => {
      cucharon.setAttribute("transform", "translate(232 60)");
      if (!carga) return;
      carga = false;
      lleno.setAttribute("opacity", 0);
      if (p[1] > 136) return;
      const d = Math.hypot(p[0] - CX, (p[1] - (TOPE - 6)) * 1.4);
      const nota = H.notaDe(d, TOL, 30);
      notas.push(nota);
      n++;
      H.g.n = n;
      cuenta.textContent = `${n} / ${N}`;
      H.sonar(nota >= 2.5 ? "tocar" : "no");
      chorro.setAttribute("x", (p[0] - 4).toFixed(1));
      chorro.setAttribute("y", (p[1] + 6).toFixed(1));
      chorro.setAttribute("height", Math.max(0, 150 - p[1]).toFixed(1));
      chorro.setAttribute("opacity", 1);
      setTimeout(() => chorro.setAttribute("opacity", 0), 300);
      if (nota >= 2) {
        const k = n / N;
        cs.forEach((c, i) => c.setAttribute("fill", mezcla(capas[i][2], "rgb(130,50,30)", k * (i === 0 ? 0.7 : 0.35))));
        brillo.setAttribute("opacity", k);
      } else el(s, "ellipse", { cx: p[0].toFixed(1), cy: 128, rx: 10, ry: 4, fill: "rgb(110,40,24)" });
      if (n >= N) H.fin(H.promedio(notas));
    },
  });
  void salsa;
}

// ====================================================================================
// DESCASCARAR (camarones longjing): quitar la cascara por partes, deslizando hacia afuera
// en la direccion de la flecha.
function descascarar(s, paso, H) {
  const { el, TINTA } = H;
  const CX = 150;
  const CY = 108;
  const K = 3.4;
  const N = 5;
  H.dibujarCamaron(s, CX - 10, CY - 6, K);
  const TOL = H.ancho(22, 0.35);
  const angs = [200, 235, 270, 305, 340];
  const segs = angs.map((a, i) => {
    const r = (a * Math.PI) / 180;
    const x = CX - 10 + 14 * K * Math.cos(r);
    const y = CY - 6 + 14 * K * Math.sin(r);
    const g = el(s, "g", {});
    el(g, "path", { d: `M${(x - 13).toFixed(1)} ${(y + 2).toFixed(1)} q13 -14 26 0 q-13 8 -26 0 Z`, fill: "rgb(232,190,176)", stroke: TINTA, "stroke-width": 2.5, transform: `rotate(${a + 90} ${x.toFixed(1)} ${y.toFixed(1)})` });
    const fl = el(g, "line", { x1: x, y1: y, x2: x + 26 * Math.cos(r), y2: y + 26 * Math.sin(r), stroke: VERDE_O, "stroke-width": 3, "stroke-linecap": "round", "stroke-dasharray": "4 4", opacity: i === 0 ? 1 : 0 });
    return { x, y, r, g, fl, hecho: false };
  });
  const cuenta = letrero(H, s, `0 / ${N}`);
  H.ayuda("Slide each piece of shell off, outward along the arrow");
  Object.assign(H.g, { tipo: "descascarar", segs: segs.map(({ x, y, r }) => ({ x, y, r })), i: 0 });
  let i = 0;
  let ini = null;
  const notas = [];
  arrastrar(s, H, {
    abajo: (p) => {
      ini = Math.hypot(p[0] - segs[i].x, p[1] - segs[i].y) < 30 ? p : null;
    },
    arriba: (p) => {
      if (!ini) return;
      const dx = p[0] - ini[0];
      const dy = p[1] - ini[1];
      ini = null;
      if (Math.hypot(dx, dy) < 18) return;
      const sg = segs[i];
      let err = (Math.atan2(dy, dx) - sg.r) * (180 / Math.PI);
      err = ((((err + 180) % 360) + 360) % 360) - 180;
      const nota = H.notaDe(err, TOL, 45);
      notas.push(nota);
      H.sonar(nota >= 2.5 ? "tocar" : "no");
      sg.g.setAttribute("transform", `translate(${(dx * 2).toFixed(1)} ${(dy * 2).toFixed(1)})`);
      sg.g.setAttribute("opacity", 0);
      i++;
      H.g.i = i;
      cuenta.textContent = `${i} / ${N}`;
      if (i >= N) return H.fin(H.promedio(notas));
      segs[i].fl.setAttribute("opacity", 1);
    },
  });
}

// ====================================================================================
// CONO (zongzi): doblar la hoja de bambu en cono, girando el extremo alrededor de la punta.
// Soltar cuando el cono tiene la apertura justa (las lineas verdes).
function cono(s, paso, H) {
  const { el, TINTA } = H;
  const N = paso.n || 2;
  const PX = 150;
  const PY = 168;
  const OBJ = 34;
  const TOL = H.ancho(4.5, 0.35);
  const ALTO = 120;
  const guia = (ap) => {
    const a = (ap / 2) * (Math.PI / 180);
    return `M${(PX - ALTO * Math.tan(a)).toFixed(1)} ${PY - ALTO} L${PX} ${PY} L${(PX + ALTO * Math.tan(a)).toFixed(1)} ${PY - ALTO}`;
  };
  const hoja = el(s, "path", { d: "", fill: "rgb(110,160,80)", stroke: TINTA, "stroke-width": 3, "stroke-linejoin": "round" });
  const vetas = el(s, "path", { d: "", fill: "none", stroke: "rgb(150,200,110)", "stroke-width": 2 });
  el(s, "path", { d: guia(OBJ + TOL * 2), fill: "none", stroke: "rgb(200,240,170)", "stroke-width": 2.5, "stroke-dasharray": "5 5" });
  el(s, "path", { d: guia(OBJ - TOL * 2), fill: "none", stroke: "rgb(200,240,170)", "stroke-width": 2.5, "stroke-dasharray": "5 5" });
  const listos = el(s, "g", {});
  const cuenta = letrero(H, s, `0 / ${N}`);
  H.ayuda("Drag around the tip to curl the leaf into a cone · let go between the green lines");
  let rot = 0;
  let previo = null;
  let n = 0;
  const notas = [];
  const apertura = () => clamp(84 - rot * 0.3, 6, 84);
  Object.assign(H.g, { tipo: "cono", px: PX, py: PY, obj: OBJ, ap: apertura(), n: 0 });
  const pintar = () => {
    const ap = apertura();
    H.g.ap = ap;
    const a = (ap / 2) * (Math.PI / 180);
    const xl = PX - ALTO * Math.tan(a);
    const xr = PX + ALTO * Math.tan(a);
    hoja.setAttribute("d", `M${xl.toFixed(1)} ${PY - ALTO} Q${PX} ${PY - ALTO - 14} ${xr.toFixed(1)} ${PY - ALTO} L${PX} ${PY} Z`);
    vetas.setAttribute("d", `M${PX} ${PY - 6} L${PX} ${PY - ALTO + 4} M${PX} ${PY - 10} L${((xl + PX) / 2).toFixed(1)} ${PY - ALTO + 6} M${PX} ${PY - 10} L${((xr + PX) / 2).toFixed(1)} ${PY - ALTO + 6}`);
  };
  pintar();
  arrastrar(s, H, {
    abajo: (p) => {
      previo = Math.atan2(p[1] - PY, p[0] - PX);
    },
    mover: (p) => {
      const a = Math.atan2(p[1] - PY, p[0] - PX);
      let d = a - previo;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      previo = a;
      rot = Math.max(0, rot + Math.abs(d) * (180 / Math.PI));
      pintar();
    },
    arriba: () => {
      if (rot < 20) return;
      const ap = apertura();
      const nota = H.notaDe(ap - OBJ, TOL, 14);
      notas.push(nota);
      n++;
      H.g.n = n;
      cuenta.textContent = `${n} / ${N}`;
      H.sonar(nota >= 2.5 ? "tocar" : "no");
      el(listos, "path", { d: `M${40 + n * 40} 192 L${30 + n * 40} 160 L${50 + n * 40} 160 Z`, fill: "rgb(110,160,80)", stroke: TINTA, "stroke-width": 2 });
      if (n >= N) return H.fin(H.promedio(notas));
      rot = 0;
      pintar();
    },
  });
}

// ====================================================================================
// SOASAR (tamal): pasar la hoja de platano por el fuego para ablandarla. Cada parte debe
// quedar verde brillante; si se queda mucho, se quema.
function soasar(s, paso, H) {
  const { el, TINTA } = H;
  const NS = 4;
  const A = 0.75;
  const B = 1.0;
  const TOL = H.ancho(0.13, 0.35);
  const MID = (A + B) / 2;
  const FX = 150;
  const FW = 50;
  const W = 220;
  const fuego = el(s, "g", { "data-sin-px": "" });
  const llamas = [0, 1, 2].map((i) => el(fuego, "path", { d: `M${FX - 22 + i * 15} 178 Q${FX - 14 + i * 15} 140 ${FX - 6 + i * 15} 178 Z`, fill: i === 1 ? "rgb(255,200,70)" : "rgb(240,110,50)", stroke: TINTA, "stroke-width": 1.5 }));
  el(s, "rect", { x: FX - 40, y: 176, width: 80, height: 14, rx: 4, fill: OLLA, stroke: TINTA, "stroke-width": 3 });
  const hoja = el(s, "g", {});
  const partes = [];
  for (let i = 0; i < NS; i++) partes.push({ h: 0, e: el(hoja, "rect", { x: -W / 2 + (i * W) / NS, y: -20, width: W / NS, height: 40, fill: "rgb(96,140,70)" }) });
  el(hoja, "rect", { x: -W / 2, y: -20, width: W, height: 40, rx: 6, fill: "none", stroke: TINTA, "stroke-width": 3 });
  el(hoja, "line", { x1: -W / 2, y1: 0, x2: W / 2, y2: 0, stroke: "rgb(190,220,150)", "stroke-width": 2 });
  const marcas = partes.map((p, i) => el(s, "rect", { x: 0, y: 36, width: W / NS - 8, height: 7, rx: 3, fill: PAPEL, stroke: TINTA, "stroke-width": 1.5 }));
  const barras = partes.map(() => el(s, "rect", { x: 0, y: 37, width: 0, height: 5, fill: "rgb(120,190,110)" }));
  H.ayuda("Drag the leaf over the flame · every part bright green, none burnt · then Done");
  let x = FX;
  let tUlt = 0;
  Object.assign(H.g, { tipo: "soasar", h: partes.map(() => 0), a: A, b: B, fx: FX, w: W, ns: NS, x });
  H.bucle((t) => {
    const dt = Math.min(40, t - tUlt);
    tUlt = t;
    partes.forEach((p, i) => {
      const x0 = x - W / 2 + (i * W) / NS;
      const x1 = x0 + W / NS;
      const solape = Math.max(0, Math.min(x1, FX + FW / 2) - Math.max(x0, FX - FW / 2)) / FW;
      p.h += dt * solape * 0.00052 * H.rapido(0.2);
      H.g.h[i] = p.h;
      p.e.setAttribute("fill", p.h > B + 0.25 ? "rgb(110,80,40)" : mezcla("rgb(96,140,70)", "rgb(80,190,80)", p.h / A));
      const bx = x - W / 2 + (i * W) / NS + 4;
      marcas[i].setAttribute("x", bx);
      barras[i].setAttribute("x", bx + 1);
      barras[i].setAttribute("width", (clamp(p.h / 1.4) * (W / NS - 10)).toFixed(1));
      barras[i].setAttribute("fill", p.h > B + 0.25 ? "rgb(150,100,60)" : p.h >= A ? "rgb(120,190,110)" : "rgb(230,200,120)");
    });
    llamas.forEach((l, i) => l.setAttribute("transform", `translate(0 ${(Math.sin(t / 90 + i) * 3).toFixed(1)})`));
  });
  hoja.setAttribute("transform", `translate(${x} 110)`);
  arrastrar(s, H, {
    mover: (p) => {
      x = clamp(p[0], FX - W / 2 + 10, FX + W / 2 - 10);
      H.g.x = x;
      hoja.setAttribute("transform", `translate(${x.toFixed(1)} 110)`);
    },
  });
  H.boton("Done ✓", () => {
    H.fin(H.promedio(partes.map((p) => H.notaDe(p.h - MID, (B - A) / 2 + TOL - 0.13, 0.4))));
  });
}

// ====================================================================================
// HUECOS (raiz de loto): rellenar cada hueco con arroz: mantener apretado el hueco hasta que
// se llene (sin pasarse).
function huecos(s, paso, H) {
  const { el, TINTA } = H;
  const CX = 150;
  const CY = 104;
  const RH = 13;
  const A = 0.85;
  const B = 1.0;
  const TOL = H.ancho(0.075, 0.35);
  const MID = (A + B) / 2;
  el(s, "circle", { cx: CX, cy: CY, r: 82, fill: "rgb(240,214,200)", stroke: TINTA, "stroke-width": 3 });
  el(s, "circle", { cx: CX, cy: CY, r: 74, fill: "rgb(250,234,222)" });
  const hs = [[0, 0]];
  for (let i = 0; i < 6; i++) hs.push([44 * Math.cos((i * Math.PI) / 3), 44 * Math.sin((i * Math.PI) / 3)]);
  const hoyos = hs.map(([dx, dy]) => {
    const x = CX + dx;
    const y = CY + dy;
    el(s, "circle", { cx: x, cy: y, r: RH, fill: "rgb(150,110,100)", stroke: TINTA, "stroke-width": 2.5 });
    const arroz = el(s, "circle", { cx: x, cy: y, r: 0, fill: "rgb(252,250,244)", stroke: "rgb(214,206,190)", "stroke-width": 1.5 });
    const aro = el(s, "circle", { cx: x, cy: y, r: RH * MID, fill: "none", stroke: VERDE_O, "stroke-width": 1.5, "stroke-dasharray": "3 3" });
    return { x, y, f: 0, listo: false, arroz, aro };
  });
  const palillo = el(s, "rect", { x: 0, y: -60, width: 6, height: 60, rx: 3, fill: MADERA, stroke: TINTA, "stroke-width": 2, opacity: 0 });
  const cuenta = letrero(H, s, `0 / ${hoyos.length}`, 14, 24, "start");
  H.ayuda("Hold on a hole to pack it with rice · let go when the rice reaches the edge");
  Object.assign(H.g, { tipo: "huecos", hoyos: hoyos.map(({ x, y }) => ({ x, y })), f: 0, a: A, b: B });
  let act = null;
  let tUlt = 0;
  let tA = 0;
  const notas = [];
  H.bucle((t) => {
    const dt = Math.min(40, t - tUlt);
    tUlt = t;
    if (act) {
      tA += dt;
      act.f = Math.min(1.3, act.f + dt * 0.00062 * H.rapido(0.3) * (0.7 + 0.6 * Math.abs(Math.sin(tA / 140))));
      H.g.f = act.f;
      act.arroz.setAttribute("r", (RH * Math.min(1.15, act.f)).toFixed(1));
      act.arroz.setAttribute("fill", act.f > 1.1 ? "rgb(240,226,200)" : "rgb(252,250,244)");
      palillo.setAttribute("transform", `translate(${act.x - 3} ${(act.y + Math.sin(tA / 70) * 4).toFixed(1)})`);
    }
  });
  arrastrar(s, H, {
    abajo: (p) => {
      act = hoyos.find((h) => !h.listo && Math.hypot(p[0] - h.x, p[1] - h.y) < RH + 8) || null;
      tA = 0;
      if (act) {
        palillo.setAttribute("opacity", 1);
        H.g.f = act.f;
      }
    },
    arriba: () => {
      palillo.setAttribute("opacity", 0);
      if (!act) return;
      const h = act;
      act = null;
      if (h.f < 0.2) return;
      h.listo = true;
      h.aro.setAttribute("opacity", 0);
      const nota = H.notaDe(h.f - MID, (B - A) / 2 + TOL - 0.075, 0.35);
      notas.push(nota);
      H.sonar(nota >= 2.5 ? "tocar" : "no");
      const n = hoyos.filter((x) => x.listo).length;
      cuenta.textContent = `${n} / ${hoyos.length}`;
      if (n >= hoyos.length) H.fin(H.promedio(notas));
    },
  });
}

// ====================================================================================
// BALANZA (pandebono, arroz con leche): echar polvo en la balanza hasta el peso justo.
// Lo que va en el aire sigue cayendo despues de soltar.
function balanza(s, paso, H) {
  const { el, TINTA } = H;
  const OBJ = paso.g || 250;
  const MAX = OBJ * 1.6;
  const TOL = H.ancho(OBJ * 0.035, 0.35);
  const POLVO = paso.color || "rgb(252,252,248)";
  const nombre = paso.nombre || "starch";
  // la balanza
  el(s, "rect", { x: 92, y: 140, width: 116, height: 44, rx: 8, fill: "rgb(236,240,246)", stroke: TINTA, "stroke-width": 3 });
  el(s, "path", { d: "M96 140 L204 140 L196 128 L104 128 Z", fill: METAL, stroke: TINTA, "stroke-width": 3, "stroke-linejoin": "round" });
  const pantalla = el(s, "rect", { x: 118, y: 150, width: 64, height: 24, rx: 3, fill: "rgb(190,220,170)", stroke: TINTA, "stroke-width": 2 });
  const num = el(s, "text", { x: 150, y: 167, "text-anchor": "middle", class: "cocina-cuenta", "font-size": 14 });
  num.textContent = "0 g";
  // el bol encima
  el(s, "path", { d: "M108 96 Q112 128 150 128 Q188 128 192 96 Z", fill: "rgb(236,226,206)", stroke: TINTA, "stroke-width": 3 });
  const monte = el(s, "ellipse", { cx: 150, cy: 100, rx: 0, ry: 0, fill: POLVO, stroke: "rgb(200,196,186)", "stroke-width": 1.5 });
  // el cucharon / paquete
  const saco = el(s, "g", { transform: "translate(200 58)" });
  el(saco, "rect", { x: -20, y: -18, width: 40, height: 40, rx: 6, fill: "rgb(232,214,180)", stroke: TINTA, "stroke-width": 3 });
  el(saco, "rect", { x: -12, y: -6, width: 24, height: 12, rx: 2, fill: POLVO, stroke: TINTA, "stroke-width": 1.5 });
  const chorro = el(s, "rect", { x: 172, y: 74, width: 7, height: 0, fill: POLVO, stroke: "rgb(200,196,186)", "stroke-width": 1 });
  // el reloj
  const med = medidor(H, s, { x: 30, y: 30, w: 14, h: 150, a: (OBJ - TOL) / MAX, b: (OBJ + TOL) / MAX, vertical: true });
  const cuenta = letrero(H, s, `Add ${OBJ} g of ${nombre}`, 150, 24);
  H.ayuda(`Hold to pour · let go a little early: what's in the air still falls`);
  let on = false;
  let flujo = 0;
  let aire = [];
  let m = 0;
  let tUlt = 0;
  let tOn = 0;
  let cerrado = false;
  Object.assign(H.g, { tipo: "balanza", m: 0, obj: OBJ, aire: 0 });
  H.bucle((t) => {
    const dt = Math.min(40, t - tUlt);
    tUlt = t;
    if (on) {
      tOn += dt;
      flujo = (OBJ / 2200) * H.rapido(0.25) * Math.min(1, tOn / 450);
      aire.push({ t, g: flujo * dt });
    } else flujo = 0;
    // lo que sale tarda 280 ms en caer
    const caen = aire.filter((a) => t - a.t >= 280);
    aire = aire.filter((a) => t - a.t < 280);
    for (const a of caen) m += a.g;
    H.g.m = m;
    H.g.aire = aire.reduce((x, a) => x + a.g, 0);
    H.g.flujo = flujo;
    num.textContent = `${Math.round(m)} g`;
    med.poner(m / MAX);
    const k = clamp(m / OBJ, 0, 1.6);
    monte.setAttribute("rx", (8 + 30 * Math.min(1, k)).toFixed(1));
    monte.setAttribute("ry", (3 + 10 * Math.min(1.3, k)).toFixed(1));
    monte.setAttribute("cy", (104 - 6 * k).toFixed(1));
    chorro.setAttribute("height", aire.length ? Math.max(0, 100 - 6 * k - 74).toFixed(1) : 0);
    saco.setAttribute("transform", on ? "translate(192 62) rotate(-35)" : "translate(200 58)");
    pantalla.setAttribute("fill", Math.abs(m - OBJ) <= TOL ? "rgb(170,230,150)" : m > OBJ + TOL ? "rgb(240,180,170)" : "rgb(190,220,170)");
    if (!on && !aire.length && m > OBJ * 0.2 && !cerrado && H.g.listo) {
      cerrado = true;
      setTimeout(() => H.fin(H.notaDe(m - OBJ, TOL, OBJ * 0.2)), 350);
    }
  });
  arrastrar(s, H, {
    abajo: () => {
      on = true;
      tOn = 0;
      H.g.listo = false;
    },
    arriba: () => {
      on = false;
      if (m + H.g.aire > OBJ * 0.5) H.g.listo = true;
    },
  });
  void cuenta;
}

// ====================================================================================
// HUEVO (tartas de huevo, jianbing): golpear el huevo contra el borde con la fuerza justa.
function huevo(s, paso, H) {
  const { el, TINTA } = H;
  const N = paso.n || 1;
  const A = 0.55;
  const B = 0.75;
  const TOL = H.ancho(0.12, 0.3);
  const MID = (A + B) / 2;
  const P = 1900 / H.rapido(0.2);
  const crepe = paso.sobre === "crepe";
  if (crepe) {
    el(s, "circle", { cx: 130, cy: 120, r: 76, fill: "rgb(60,60,70)", stroke: TINTA, "stroke-width": 3 });
    el(s, "circle", { cx: 130, cy: 120, r: 64, fill: "rgb(250,222,150)", stroke: "rgb(214,180,110)", "stroke-width": 2 });
  } else {
    el(s, "path", { d: "M70 116 Q76 186 130 188 Q184 186 190 116 Z", fill: "rgb(236,240,246)", stroke: TINTA, "stroke-width": 3 });
    el(s, "ellipse", { cx: 130, cy: 116, rx: 60, ry: 12, fill: "rgb(214,220,228)", stroke: TINTA, "stroke-width": 3 });
  }
  const dentro = el(s, "g", {});
  const cascaras = el(s, "g", {});
  const egg = el(s, "g", {});
  el(egg, "ellipse", { cx: 0, cy: 0, rx: 15, ry: 19, fill: "rgb(250,240,226)", stroke: TINTA, "stroke-width": 3 });
  el(egg, "ellipse", { cx: -5, cy: -7, rx: 4, ry: 6, fill: "rgb(255,252,246)" });
  const pos0 = crepe ? "translate(130 40)" : "translate(130 62)";
  egg.setAttribute("transform", pos0);
  const med = medidor(H, s, { x: 236, y: 30, w: 14, h: 150, a: A, b: B, vertical: true, rojo: 0.12 });
  el(s, "text", { x: 243, y: 22, "text-anchor": "middle", "font-size": 9, class: "cocina-cuenta" }).textContent = "force";
  const cuenta = letrero(H, s, `0 / ${N}`, 14, 24, "start");
  H.ayuda("Tap to crack the egg when the force is in the green");
  let n = 0;
  let ocupado = false;
  let tBase = 0;
  const notas = [];
  const fuerza = (t) => 0.5 - 0.5 * Math.cos((2 * Math.PI * (t - tBase)) / P);
  Object.assign(H.g, { tipo: "huevo", P, tBase: H.t0, a: A, b: B, mid: MID, n: 0 });
  let f = 0;
  H.bucle((t) => {
    if (ocupado) return;
    f = fuerza(t);
    med.poner(f);
  });
  s.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (!H.vivo() || ocupado) return;
    ocupado = true;
    let nota = H.notaDe(f - MID, (B - A) / 2 + TOL - 0.1, 0.35);
    if (f < 0.3) nota = Math.min(nota, 1.5);
    notas.push(nota);
    H.sonar(f < 0.3 ? "no" : "grieta");
    egg.setAttribute("transform", crepe ? "translate(130 80) rotate(20)" : "translate(130 96) rotate(20)");
    setTimeout(() => {
      egg.setAttribute("opacity", 0);
      const x = 112 + n * 18;
      const y = crepe ? 118 : 140;
      el(dentro, "ellipse", { cx: x, cy: y, rx: 18, ry: 12, fill: "rgb(255,252,244)", stroke: TINTA, "stroke-width": 2 });
      el(dentro, "circle", { cx: x, cy: y - 1, r: 7, fill: f > B + 0.1 ? "rgb(240,170,60)" : "rgb(255,196,40)", stroke: TINTA, "stroke-width": 2 });
      if (f > B + 0.08) for (let j = 0; j < 3; j++) el(cascaras, "path", { d: `M${x - 10 + j * 9} ${y + 4} l4 -5 l4 5 Z`, fill: "rgb(250,240,226)", stroke: TINTA, "stroke-width": 1.2 });
      n++;
      H.g.n = n;
      cuenta.textContent = `${n} / ${N}`;
      if (n >= N) return H.fin(H.promedio(notas));
      setTimeout(() => {
        egg.setAttribute("transform", pos0);
        egg.setAttribute("opacity", 1);
        tBase = H.ahora() - H.t0;
        H.g.tBase = H.t0 + tBase;
        ocupado = false;
      }, 250);
    }, 260);
  });
}

// ====================================================================================
// PRENSAR (pastel de luna): mantener apretado el molde; la presion sube cada vez mas rapido.
// Soltar en la franja: si se pasa, la masa se sale por los lados.
function prensar(s, paso, H) {
  const { el, TINTA } = H;
  const N = paso.n || 2;
  const A = 0.68;
  const B = 0.84;
  const TOL = H.ancho(0.08, 0.35);
  const MID = (A + B) / 2;
  const T = 1700 / H.rapido(0.25);
  const CX = 130;
  el(s, "rect", { x: 70, y: 150, width: 120, height: 30, rx: 6, fill: MADERA, stroke: TINTA, "stroke-width": 3 });
  const masa = el(s, "ellipse", { cx: CX, cy: 146, rx: 30, ry: 16, fill: H.MASA_R, stroke: TINTA, "stroke-width": 3 });
  const sale = el(s, "g", { opacity: 0 });
  el(sale, "ellipse", { cx: CX - 46, cy: 148, rx: 10, ry: 5, fill: H.MASA_R, stroke: TINTA, "stroke-width": 2 });
  el(sale, "ellipse", { cx: CX + 46, cy: 148, rx: 10, ry: 5, fill: H.MASA_R, stroke: TINTA, "stroke-width": 2 });
  const molde = el(s, "g", {});
  el(molde, "rect", { x: -40, y: -20, width: 80, height: 34, rx: 6, fill: MADERA_O, stroke: TINTA, "stroke-width": 3 });
  el(molde, "rect", { x: -8, y: -92, width: 16, height: 74, rx: 5, fill: MADERA, stroke: TINTA, "stroke-width": 3 });
  el(molde, "rect", { x: -24, y: -100, width: 48, height: 14, rx: 6, fill: MADERA_O, stroke: TINTA, "stroke-width": 3 });
  const listos = el(s, "g", {});
  const med = medidor(H, s, { x: 236, y: 30, w: 14, h: 150, a: A, b: B, vertical: true, rojo: 0.1 });
  const cuenta = letrero(H, s, `0 / ${N}`, 14, 24, "start");
  H.ayuda("Hold to press the mold · it gets harder fast · let go in the green");
  let on = false;
  let tOn = 0;
  let p = 0;
  let tUlt = 0;
  let n = 0;
  const notas = [];
  Object.assign(H.g, { tipo: "prensar", p: 0, a: A, b: B, n: 0 });
  const pintar = () => {
    H.g.p = p;
    med.poner(p);
    molde.setAttribute("transform", `translate(${CX} ${(118 + 16 * Math.min(1, p)).toFixed(1)})`);
    masa.setAttribute("ry", (16 - 6 * Math.min(1, p)).toFixed(1));
    masa.setAttribute("rx", (30 + 10 * Math.min(1, p)).toFixed(1));
    sale.setAttribute("opacity", p > 0.95 ? 1 : 0);
  };
  pintar();
  H.bucle((t) => {
    const dt = Math.min(40, t - tUlt);
    tUlt = t;
    if (on) {
      tOn += dt;
      p = Math.min(1.1, Math.pow(tOn / T, 1.7));
      H.g.p = p;
      pintar();
    }
  });
  arrastrar(s, H, {
    abajo: () => {
      on = true;
      tOn = 0;
    },
    arriba: () => {
      on = false;
      if (p < 0.15) {
        p = 0;
        return pintar();
      }
      const nota = H.notaDe(p - MID, (B - A) / 2 + TOL - 0.08, 0.3);
      notas.push(nota);
      n++;
      H.g.n = n;
      cuenta.textContent = `${n} / ${N}`;
      H.sonar(nota >= 2.5 ? "tocar" : "no");
      const x = 40 + n * 36;
      el(listos, "circle", { cx: x, cy: 40, r: 15, fill: "rgb(214,150,80)", stroke: TINTA, "stroke-width": 2.5 });
      el(listos, "circle", { cx: x, cy: 40, r: 8, fill: "none", stroke: "rgb(170,110,50)", "stroke-width": nota >= 2.5 ? 2 : 1, opacity: clamp((nota - 1) / 2) });
      if (n >= N) return H.fin(H.promedio(notas));
      p = 0;
      pintar();
    },
  });
}

// ====================================================================================
// v74 (rom: "que cada receta se sienta unica"): tanda 1, los platos de Hangzhou.

// PICAR (sopa de ternera del lago): dos cuchillos, izquierda-derecha, a buen ritmo, unos segundos.
function picar(s, paso, H) {
  const { el, TINTA } = H;
  const DUR = 5000;
  const A = 2.5;
  const B = 4.3;
  el(s, "rect", { x: 40, y: 92, width: 220, height: 94, rx: 8, fill: "rgb(214,176,124)", stroke: TINTA, "stroke-width": 3 });
  const trozos = [];
  for (let i = 0; i < 10; i++) trozos.push(el(s, "rect", { x: 112 + (i % 5) * 16, y: 124 + Math.floor(i / 5) * 18, width: 14, height: 14, rx: 3, fill: "rgb(196,80,70)", stroke: TINTA, "stroke-width": 2 }));
  const zi = el(s, "rect", { x: 8, y: 40, width: 128, height: 150, rx: 14, fill: ZONA, opacity: 0.3 });
  const zd = el(s, "rect", { x: 164, y: 40, width: 128, height: 150, rx: 14, fill: ZONA, opacity: 0 });
  const cuchi = [118, 182].map((x) => {
    const g = el(s, "g", { transform: `translate(${x} 96)` });
    el(g, "rect", { x: -18, y: -40, width: 36, height: 36, rx: 3, fill: METAL, stroke: TINTA, "stroke-width": 2.5 });
    el(g, "rect", { x: -5, y: -64, width: 10, height: 26, rx: 4, fill: MADERA_O, stroke: TINTA, "stroke-width": 2.5 });
    return { g, x };
  });
  const med = medidor(H, s, { x: 70, y: 16, w: 160, h: 10, a: A / 6, b: B / 6 });
  const prog = medidor(H, s, { x: 278, y: 40, w: 10, h: 140, vertical: true });
  H.ayuda("Chop left, right, left… keep the speed in the green until the bar fills");
  Object.assign(H.g, { tipo: "picar", lado: -1, a: A, b: B });
  let lado = -1;
  let tUlt = null;
  let ritmo = 0;
  let empezo = false;
  let total = 0;
  let dentro = 0;
  let malos = 0;
  let tB = 0;
  H.bucle((t) => {
    const dt = Math.min(40, t - tB);
    tB = t;
    if (!empezo) return;
    const quieto = H.ahora() - tUlt > 700;
    const r = quieto ? 0 : ritmo;
    total += dt;
    if (r >= A && r <= B) dentro += dt;
    med.poner(r / 6);
    const p = clamp(total / DUR);
    prog.poner(p);
    trozos.forEach((q, i) => {
      const w = 14 * (1 - 0.6 * p);
      q.setAttribute("width", w.toFixed(1));
      q.setAttribute("height", w.toFixed(1));
      q.setAttribute("x", (112 + (i % 5) * 16 * (1 - 0.3 * p)).toFixed(1));
    });
    if (p >= 1) H.fin(1 + 2 * Math.pow(clamp(dentro / total / 0.88), 1.4) - 0.15 * malos);
  });
  s.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (!H.vivo()) return;
    const [x] = H.aSvg(e);
    const l = x < 150 ? -1 : 1;
    const c = cuchi[l < 0 ? 0 : 1];
    c.g.setAttribute("transform", `translate(${c.x} 118)`);
    setTimeout(() => c.g.setAttribute("transform", `translate(${c.x} 96)`), 90);
    if (l !== lado) {
      malos++;
      H.sonar("no");
      return;
    }
    const ahora = H.ahora();
    if (tUlt !== null) {
      const inst = 1000 / Math.max(1, ahora - tUlt);
      ritmo = ritmo ? 0.6 * ritmo + 0.4 * inst : inst;
    }
    tUlt = ahora;
    empezo = true;
    H.sonar("tecla");
    lado = -lado;
    H.g.lado = lado;
    zi.setAttribute("opacity", lado < 0 ? 0.3 : 0);
    zd.setAttribute("opacity", lado > 0 ? 0.3 : 0);
  });
}

// ESPUMAR (sopa de ternera): aparece espuma gris en el caldo; sacarla con el cucharon antes de que se hunda.
function espumar(s, paso, H) {
  const { el, TINTA } = H;
  const N = H.mas(paso.n || 7, 2);
  const VIDA = 2700 / H.rapido(0.25);
  const CADA = 950 / H.rapido(0.2);
  const CX = 150;
  const CY = 108;
  el(s, "ellipse", { cx: CX, cy: CY + 4, rx: 120, ry: 82, fill: OLLA, stroke: TINTA, "stroke-width": 3 });
  el(s, "ellipse", { cx: CX, cy: CY, rx: 108, ry: 70, fill: "rgb(196,150,96)" });
  const az = H.azarDe("espumar");
  const esp = [];
  for (let i = 0; i < N; i++) {
    const a = az() * Math.PI * 2;
    const r = Math.sqrt(az()) * 0.75;
    esp.push({ x: CX + 100 * r * Math.cos(a), y: CY + 62 * r * Math.sin(a), t0: 600 + i * CADA, e: null, hecho: false });
  }
  const cuchara = el(s, "g", { opacity: 0 });
  el(cuchara, "ellipse", { cx: 0, cy: 0, rx: 15, ry: 10, fill: METAL, stroke: TINTA, "stroke-width": 2.5 });
  el(cuchara, "rect", { x: 10, y: -44, width: 6, height: 40, rx: 3, fill: METAL, stroke: TINTA, "stroke-width": 2.5, transform: "rotate(25)" });
  const cuenta = letrero(H, s, `0 / ${N}`);
  H.ayuda("Tap the grey foam to skim it off before it sinks");
  Object.assign(H.g, { tipo: "espumar", espumas: [] });
  let buenos = 0;
  let sueltos = 0;
  const cerrar = () => {
    const n = esp.filter((q) => q.hecho).length;
    cuenta.textContent = `${buenos} / ${N}`;
    if (n >= N) H.fin(1 + 2 * Math.pow(buenos / N, 1.6) - 0.1 * sueltos);
  };
  H.bucle((t) => {
    const vivas = [];
    for (const q of esp) {
      if (q.hecho) continue;
      const edad = t - q.t0;
      if (edad < 0) continue;
      if (!q.e) {
        q.e = el(s, "g", { transform: `translate(${q.x.toFixed(1)} ${q.y.toFixed(1)})` });
        for (const [dx, dy, r] of [[0, 0, 9], [-8, 3, 6], [8, 2, 6], [2, -6, 5]]) el(q.e, "circle", { cx: dx, cy: dy, r, fill: "rgb(176,170,160)", stroke: "rgb(120,114,106)", "stroke-width": 1.5 });
      }
      if (edad > VIDA) {
        q.hecho = true;
        q.e.remove();
        H.sonar("no");
        cerrar();
        continue;
      }
      q.e.setAttribute("opacity", (1 - 0.6 * (edad / VIDA)).toFixed(2));
      vivas.push({ x: q.x, y: q.y });
    }
    H.g.espumas = vivas;
  });
  s.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (!H.vivo()) return;
    const [x, y] = H.aSvg(e);
    cuchara.setAttribute("opacity", 1);
    cuchara.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    setTimeout(() => cuchara.setAttribute("opacity", 0), 220);
    const q = esp.find((z) => z.e && !z.hecho && Math.hypot(z.x - x, z.y - y) < 20);
    if (!q) {
      sueltos++;
      return H.sonar("no");
    }
    q.hecho = true;
    q.e.remove();
    buenos++;
    H.sonar("tocar");
    cerrar();
  });
}

// SACUDIR (pastel de osmanto): mover el arbol de lado a lado; las flores caen a la tela.
// Muy fuerte: caen hojas y ramitas (despues hay que limpiarlas).
function sacudir(s, paso, H) {
  const { el, TINTA } = H;
  const META = 24;
  const CX = 150;
  const MIN = 34;
  const MAX = 88;
  el(s, "ellipse", { cx: CX, cy: 176, rx: 120, ry: 16, fill: "rgb(236,226,206)", stroke: TINTA, "stroke-width": 2.5 });
  const caidas = el(s, "g", {});
  el(s, "rect", { x: CX - 9, y: 92, width: 18, height: 76, rx: 4, fill: "rgb(120,80,50)", stroke: TINTA, "stroke-width": 3 });
  const copa = el(s, "g", {});
  for (const [dx, dy, r] of [[0, -20, 46], [-40, 6, 32], [40, 6, 32], [-20, 20, 30], [22, 22, 30]]) el(copa, "circle", { cx: dx, cy: dy, r, fill: "rgb(80,130,70)", stroke: TINTA, "stroke-width": 2.5 });
  const az = H.azarDe("sacudir");
  for (let i = 0; i < 22; i++) el(copa, "circle", { cx: (az() - 0.5) * 120, cy: (az() - 0.5) * 70, r: 3, fill: "rgb(250,180,60)" });
  copa.setAttribute("transform", `translate(${CX} 70)`);
  // marcas de cuanto mover
  for (const s2 of [-1, 1]) {
    el(s, "rect", { x: CX + s2 * MIN / 2 - (s2 < 0 ? (MAX - MIN) / 2 : 0), y: 6, width: (MAX - MIN) / 2, height: 8, fill: ZONA });
    el(s, "line", { x1: CX + (s2 * MAX) / 2, y1: 2, x2: CX + (s2 * MAX) / 2, y2: 18, stroke: ROJO, "stroke-width": 3 });
  }
  const cuenta = letrero(H, s, `0 / ${META}`, 14, 30, "start");
  H.ayuda("Drag the tree left and right to shake the flowers down · not past the red");
  Object.assign(H.g, { tipo: "sacudir", cx: CX, min: MIN, max: MAX });
  let x0 = null;
  let off = 0;
  let dir = 0;
  let ext = 0;
  let tramo = 0;
  let flores = 0;
  let fuertes = 0;
  const caer = (n, hoja) => {
    for (let i = 0; i < n; i++) {
      const x = CX + (Math.random() - 0.5) * 210;
      const y = 168 + Math.random() * 16;
      if (hoja) el(caidas, "ellipse", { cx: x.toFixed(1), cy: y.toFixed(1), rx: 6, ry: 3, fill: "rgb(70,110,60)" });
      else el(caidas, "circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: 2.5, fill: "rgb(250,180,60)" });
    }
  };
  arrastrar(s, H, {
    abajo: (p) => {
      x0 = p[0] - off;
    },
    mover: (p) => {
      if (x0 === null) return;
      const n = clamp(p[0] - x0, -60, 60);
      const d = n - off;
      off = n;
      copa.setAttribute("transform", `translate(${(CX + off).toFixed(1)} 70) rotate(${(off / 6).toFixed(1)})`);
      if (Math.abs(d) < 0.5) return;
      const sd = Math.sign(d);
      if (!dir) dir = sd;
      if (sd === dir) ext = dir > 0 ? Math.max(ext, off) : Math.min(ext, off);
      else if (Math.abs(off - ext) > 6) {
        const amp = Math.abs(ext - tramo);
        if (amp > MAX) {
          fuertes++;
          caer(2, true);
          caer(1, false);
          flores += 1;
          H.sonar("no");
        } else if (amp >= MIN) {
          caer(3, false);
          flores += 3;
          H.sonar("tocar");
        }
        cuenta.textContent = `${Math.min(flores, META)} / ${META}`;
        tramo = ext;
        dir = sd;
        ext = off;
        if (flores >= META) {
          x0 = null;
          H.fin(Math.max(1, 3 - 0.3 * fuertes));
        }
      }
    },
    arriba: () => {
      x0 = null;
    },
  });
}

// LIMPIAR (pastel de osmanto): en la tela hay flores y algunas ramitas/hojas: tocar solo las ramitas.
function limpiar(s, paso, H) {
  const { el, TINTA } = H;
  el(s, "rect", { x: 30, y: 30, width: 240, height: 156, rx: 10, fill: "rgb(240,232,214)", stroke: TINTA, "stroke-width": 3 });
  const az = H.azarDe("limpiar");
  for (let i = 0; i < 38; i++) {
    const x = 46 + az() * 208;
    const y = 46 + az() * 124;
    const g = el(s, "g", { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` });
    for (let k = 0; k < 4; k++) el(g, "circle", { cx: 3 * Math.cos((k * Math.PI) / 2), cy: 3 * Math.sin((k * Math.PI) / 2), r: 2.6, fill: "rgb(250,176,56)" });
  }
  const N = H.mas(paso.n || 6, 2);
  const bits = [];
  for (let i = 0; i < N; i++) {
    const x = 56 + az() * 188;
    const y = 56 + az() * 112;
    const g = el(s, "g", { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${Math.round(az() * 180)})` });
    if (i % 2) el(g, "ellipse", { cx: 0, cy: 0, rx: 8, ry: 4, fill: "rgb(70,110,60)", stroke: TINTA, "stroke-width": 1.5 });
    else el(g, "rect", { x: -9, y: -1.5, width: 18, height: 3, rx: 1.5, fill: "rgb(120,80,50)", stroke: TINTA, "stroke-width": 1 });
    bits.push({ x, y, g, hecho: false });
  }
  const cuenta = letrero(H, s, `0 / ${N}`, 150, 22);
  H.ayuda("Pick out the little leaves and twigs · don't touch the flowers");
  Object.assign(H.g, { tipo: "limpiar", bits: bits.map(({ x, y }) => ({ x, y })) });
  let malos = 0;
  s.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (!H.vivo()) return;
    const [x, y] = H.aSvg(e);
    const b = bits.find((q) => !q.hecho && Math.hypot(q.x - x, q.y - y) < 13);
    if (!b) {
      malos++;
      return H.sonar("no");
    }
    b.hecho = true;
    b.g.remove();
    H.sonar("tocar");
    const n = bits.filter((q) => q.hecho).length;
    cuenta.textContent = `${n} / ${N}`;
    H.g.bits = bits.filter((q) => !q.hecho).map(({ x: bx, y: by }) => ({ x: bx, y: by }));
    if (n >= N) H.fin(Math.max(1, 3 - 0.3 * malos));
  });
}

// BROTES (te longjing): recoger solo "un brote y una hoja", deslizando hacia arriba. Las hojas grandes no.
function brotes(s, paso, H) {
  const { el, TINTA } = H;
  el(s, "ellipse", { cx: 150, cy: 150, rx: 140, ry: 56, fill: "rgb(70,120,60)", stroke: TINTA, "stroke-width": 3 });
  el(s, "ellipse", { cx: 150, cy: 140, rx: 120, ry: 40, fill: "rgb(90,146,72)" });
  const cesta = el(s, "g", { transform: "translate(262 40)" });
  el(cesta, "path", { d: "M-24 -10 L24 -10 L18 18 L-18 18 Z", fill: MADERA, stroke: TINTA, "stroke-width": 2.5 });
  const az = H.azarDe("brotes");
  const pos = [[52, 118], [82, 104], [112, 96], [142, 92], [172, 96], [202, 102], [232, 114], [96, 132], [190, 132], [140, 124]];
  const buenos = [0, 2, 3, 5, 7, 9];
  const brs = pos.map(([x, y], i) => {
    const bueno = buenos.includes(i);
    const g = el(s, "g", {});
    el(g, "line", { x1: 0, y1: 0, x2: 0, y2: -22, stroke: "rgb(80,110,50)", "stroke-width": 2.5 });
    if (bueno) {
      el(g, "ellipse", { cx: 0, cy: -26, rx: 3, ry: 7, fill: "rgb(196,230,140)", stroke: TINTA, "stroke-width": 1.5 });
      el(g, "ellipse", { cx: 7, cy: -16, rx: 7, ry: 3.5, fill: "rgb(150,206,110)", stroke: TINTA, "stroke-width": 1.5, transform: "rotate(-30 7 -16)" });
    } else {
      el(g, "ellipse", { cx: -8, cy: -20, rx: 12, ry: 6, fill: "rgb(50,96,46)", stroke: TINTA, "stroke-width": 1.5, transform: "rotate(30 -8 -20)" });
      el(g, "ellipse", { cx: 8, cy: -24, rx: 12, ry: 6, fill: "rgb(50,96,46)", stroke: TINTA, "stroke-width": 1.5, transform: "rotate(-30 8 -24)" });
    }
    return { x, y, bueno, g, fase: az() * 6, hecho: false };
  });
  const N = buenos.length;
  const cuenta = letrero(H, s, `0 / ${N}`, 14, 24, "start");
  H.ayuda("Pick only the tender tips (one bud + one leaf): swipe up on them");
  Object.assign(H.g, { tipo: "brotes", brotes: brs.map(({ x, y, bueno }) => ({ x, y: y - 18, bueno })) });
  H.bucle((t) => {
    for (const b of brs) if (!b.hecho) b.g.setAttribute("transform", `translate(${b.x} ${b.y}) rotate(${(Math.sin(t / 500 + b.fase) * 6).toFixed(1)})`);
  });
  let ini = null;
  let n = 0;
  let malos = 0;
  arrastrar(s, H, {
    abajo: (p) => {
      ini = p;
    },
    arriba: (p) => {
      if (!ini) return;
      const [x0, y0] = ini;
      ini = null;
      if (y0 - p[1] < 16) return;
      const b = brs.find((q) => !q.hecho && Math.abs(q.x - x0) < 16 && y0 > q.y - 40 && y0 < q.y + 8);
      if (!b) return;
      b.hecho = true;
      b.g.setAttribute("transform", `translate(${b.x} ${b.y - 60})`);
      b.g.setAttribute("opacity", 0);
      if (b.bueno) {
        n++;
        H.sonar("tocar");
      } else {
        malos++;
        H.sonar("no");
      }
      cuenta.textContent = `${n} / ${N}`;
      if (n >= N) H.fin(Math.max(1, 3 - 0.35 * malos));
    },
  });
}

// RED (pescado del lago): el pez nada en la tina; mantener apretado para bajar la red y soltar encima del pez.
function red(s, paso, H) {
  const { el, TINTA } = H;
  const CX = 140;
  const CY = 108;
  const RN = 26;
  const TOL = H.ancho(9, 0.35);
  el(s, "ellipse", { cx: CX, cy: CY + 4, rx: 124, ry: 80, fill: "rgb(120,124,136)", stroke: TINTA, "stroke-width": 3 });
  el(s, "ellipse", { cx: CX, cy: CY, rx: 112, ry: 68, fill: "rgb(150,196,214)" });
  const pez = el(s, "g", {});
  el(pez, "ellipse", { cx: 0, cy: 0, rx: 22, ry: 9, fill: "rgb(150,150,140)", stroke: TINTA, "stroke-width": 2.5 });
  el(pez, "path", { d: "M-20 0 L-32 -8 L-32 8 Z", fill: "rgb(130,130,120)", stroke: TINTA, "stroke-width": 2 });
  el(pez, "circle", { cx: 13, cy: -2, r: 2, fill: TINTA });
  const malla = el(s, "g", { opacity: 0 });
  el(malla, "circle", { cx: 0, cy: 0, r: RN, fill: "rgba(250,250,250,0.25)", stroke: "rgb(60,60,70)", "stroke-width": 3, "stroke-dasharray": "4 3" });
  el(malla, "rect", { x: RN - 2, y: -3, width: 50, height: 6, rx: 3, fill: MADERA, stroke: TINTA, "stroke-width": 2 });
  const cuenta = letrero(H, s, "Catch the fish!", 150, 22);
  H.ayuda("Hold to lower the net where the fish will be · let go right on top of it");
  const az = H.azarDe("red");
  const f1 = 0.0011 * H.rapido(0.3);
  const f2 = 0.0017 * H.rapido(0.3);
  const ph = az() * 6;
  let fx = CX;
  let fy = CY;
  let fallos = 0;
  Object.assign(H.g, { tipo: "red", fx, fy, vx: 0, vy: 0, rn: RN });
  H.bucle((t) => {
    const nx = CX + 82 * Math.sin(t * f1 + ph);
    const ny = CY + 44 * Math.sin(t * f2);
    const ang = Math.atan2(ny - fy, nx - fx);
    fx = nx;
    fy = ny;
    H.g.fx = fx;
    H.g.fy = fy;
    H.g.vx = 82 * f1 * Math.cos(t * f1 + ph);
    H.g.vy = 44 * f2 * Math.cos(t * f2);
    pez.setAttribute("transform", `translate(${fx.toFixed(1)} ${fy.toFixed(1)}) rotate(${((ang * 180) / Math.PI).toFixed(0)})`);
  });
  arrastrar(s, H, {
    abajo: (p) => {
      malla.setAttribute("opacity", 1);
      malla.setAttribute("transform", `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`);
    },
    mover: (p) => malla.setAttribute("transform", `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`),
    arriba: (p) => {
      const d = Math.hypot(p[0] - fx, p[1] - fy);
      if (d <= RN) {
        malla.setAttribute("opacity", 0);
        H.sonar("atrapar");
        return H.fin(H.notaDe(d, TOL, 20) - 0.35 * fallos);
      }
      fallos++;
      H.sonar("no");
      cuenta.textContent = fallos >= 3 ? "Got it… at last" : "Missed! Try again";
      setTimeout(() => malla.setAttribute("opacity", 0), 250);
      if (fallos >= 4) H.fin(1.2);
    },
  });
}

// PALILLO (pescado del lago): el pescado se cocina en agua que apenas tiembla; pincharlo con el palillo.
// Si todavia esta crudo, el palillo no entra. Servir cuando entra suave (sin que se desarme).
function palillo(s, paso, H) {
  const { el, TINTA } = H;
  const T = 6500 / H.rapido(0.2);
  const A = 0.85;
  const B = 1.08;
  const TOL = H.ancho(0.11, 0.35);
  el(s, "ellipse", { cx: 150, cy: 120, rx: 132, ry: 66, fill: "rgb(60,60,70)", stroke: TINTA, "stroke-width": 3 });
  el(s, "ellipse", { cx: 150, cy: 116, rx: 120, ry: 56, fill: "rgb(196,216,222)" });
  const g = el(s, "g", {});
  H.dibujarPescado(g, 50, 250, 116, 56);
  const carne = el(s, "ellipse", { cx: 140, cy: 116, rx: 70, ry: 14, fill: "rgb(214,190,186)", opacity: 0.85 });
  const ojo = el(s, "circle", { cx: 70, cy: 108, r: 5, fill: TINTA });
  const burb = el(s, "g", {});
  const bs = [0, 1, 2, 3].map((i) => el(burb, "circle", { cx: 50 + i * 60, cy: 150, r: 2.5, fill: "rgb(240,250,252)", stroke: "rgb(150,180,190)", "stroke-width": 1 }));
  const palo = el(s, "g", { opacity: 0 });
  el(palo, "rect", { x: -3, y: -90, width: 6, height: 90, rx: 2, fill: MADERA, stroke: TINTA, "stroke-width": 2 });
  const aviso = letrero(H, s, "", 150, 24);
  H.ayuda("Poke the thickest part with the chopstick · serve when it slides in softly");
  let c = 0;
  let pinchazos = 0;
  Object.assign(H.g, { tipo: "palillo", c: 0, a: A, b: B });
  H.bucle((t) => {
    c = t / T;
    H.g.c = c;
    carne.setAttribute("fill", mezcla("rgb(214,190,186)", "rgb(252,250,246)", c / A));
    ojo.setAttribute("fill", c > 0.7 ? "rgb(240,240,236)" : TINTA);
    bs.forEach((b, i) => b.setAttribute("cy", (150 - ((t / 40 + i * 13) % 30)).toFixed(1)));
    if (c > 1.45) H.fin(1.2);
  });
  s.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (!H.vivo()) return;
    const prof = clamp(c / A);
    palo.setAttribute("opacity", 1);
    palo.setAttribute("transform", `translate(140 ${(100 + 30 * prof).toFixed(1)})`);
    setTimeout(() => palo.setAttribute("opacity", 0), 450);
    if (c < A - 0.04) {
      pinchazos++;
      aviso.textContent = c < A * 0.6 ? "Still raw…" : "Almost…";
      H.sonar("no");
      return;
    }
    H.sonar("tocar");
    H.fin(H.notaDe(c - (A + B) / 2, (B - A) / 2 + TOL - 0.11, 0.3) - 0.12 * Math.max(0, pinchazos - 2));
  });
}

// ACEITE TIBIO (camarones longjing): en aceite tibio cada camaron pasa de gris a blanco; sacarlo justo al ponerse blanco.
function aceiteTibio(s, paso, H) {
  const { el, TINTA } = H;
  const N = H.mas(paso.n || 5, 1);
  const TOL = H.ancho(260, 0.35);
  el(s, "ellipse", { cx: 150, cy: 112, rx: 130, ry: 76, fill: "rgb(60,60,70)", stroke: TINTA, "stroke-width": 3 });
  el(s, "ellipse", { cx: 150, cy: 108, rx: 116, ry: 64, fill: "rgb(236,200,110)" });
  const az = H.azarDe("aceite_tibio");
  const cams = [];
  for (let i = 0; i < N; i++) {
    const x = 70 + (i * 160) / Math.max(1, N - 1);
    const y = 96 + (i % 2) * 26;
    const g = el(s, "g", { transform: `translate(${x} ${y})` });
    const cuerpo = el(g, "path", { d: "M10 -5 A10 10 0 1 0 4 9", fill: "none", stroke: "rgb(150,150,156)", "stroke-width": 8, "stroke-linecap": "round" });
    cams.push({ x, y, g, cuerpo, listo: (1600 + az() * 2600 + i * 500) / H.rapido(0.2), hecho: false });
  }
  const cuenta = letrero(H, s, `0 / ${N}`);
  H.ayuda("Each shrimp turns white when it's ready · tap it right then to take it out");
  Object.assign(H.g, { tipo: "aceite_tibio", cams: [] });
  const notas = [];
  let tA = 0;
  H.bucle((t) => {
    tA = t;
    const vivos = [];
    for (const c of cams) {
      if (c.hecho) continue;
      const k = t / c.listo;
      c.cuerpo.setAttribute("stroke", k < 1 ? mezcla("rgb(150,150,156)", "rgb(236,236,230)", k * k) : mezcla("rgb(250,246,240)", "rgb(240,140,100)", (k - 1) * 2.5));
      vivos.push({ x: c.x, y: c.y, listo: c.listo });
      if (k > 1.9) {
        c.hecho = true;
        notas.push(1);
        c.g.setAttribute("opacity", 0.4);
        H.sonar("no");
      }
    }
    H.g.cams = vivos;
    H.g.t = t;
    if (notas.length >= N) H.fin(H.promedio(notas));
  });
  s.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (!H.vivo()) return;
    const [x, y] = H.aSvg(e);
    const c = cams.find((q) => !q.hecho && Math.hypot(q.x - x, q.y - y) < 22);
    if (!c) return;
    c.hecho = true;
    const nota = H.notaDe(tA - c.listo - 150, TOL, 900);
    notas.push(nota);
    c.g.setAttribute("transform", `translate(${c.x} 30)`);
    H.sonar(nota >= 2.5 ? "tocar" : "no");
    cuenta.textContent = `${notas.length} / ${N}`;
  });
}

// RASPAR (cerdo dongpo): pasar el cuchillo por la piel para quitar los pelitos, en pocas pasadas largas.
function raspar(s, paso, H) {
  const { el, TINTA } = H;
  el(s, "rect", { x: 40, y: 50, width: 220, height: 120, rx: 8, fill: "rgb(214,110,96)", stroke: TINTA, "stroke-width": 3 });
  el(s, "rect", { x: 40, y: 50, width: 220, height: 34, rx: 8, fill: "rgb(240,200,170)", stroke: TINTA, "stroke-width": 3 });
  for (let i = 0; i < 3; i++) el(s, "rect", { x: 44, y: 96 + i * 24, width: 212, height: 8, fill: "rgb(252,236,214)" });
  const az = H.azarDe("raspar");
  const pelos = [];
  for (let i = 0; i < 26; i++) {
    const x = 52 + az() * 196;
    const y = 56 + az() * 22;
    pelos.push({ x, y, e: el(s, "line", { x1: x, y1: y, x2: x + 2, y2: y - 7, stroke: "rgb(60,40,30)", "stroke-width": 1.5 }), hecho: false });
  }
  const hoja = el(s, "rect", { x: -20, y: -6, width: 40, height: 12, rx: 2, fill: METAL, stroke: TINTA, "stroke-width": 2, opacity: 0 });
  const cuenta = letrero(H, s, "", 150, 24);
  H.ayuda("Scrape the skin clean: long swipes along the top");
  Object.assign(H.g, { tipo: "raspar", y: 67 });
  let pasadas = 0;
  let toco = 0;
  arrastrar(s, H, {
    abajo: (p) => {
      toco = 0;
      hoja.setAttribute("opacity", 1);
      hoja.setAttribute("transform", `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`);
    },
    mover: (p) => {
      hoja.setAttribute("transform", `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`);
      for (const q of pelos)
        if (!q.hecho && Math.abs(q.x - p[0]) < 12 && Math.abs(q.y - p[1]) < 14) {
          q.hecho = true;
          q.e.remove();
          toco++;
        }
    },
    arriba: () => {
      hoja.setAttribute("opacity", 0);
      pasadas++;
      if (toco) H.sonar("limpiar");
      const quedan = pelos.filter((q) => !q.hecho).length;
      cuenta.textContent = quedan ? `${quedan} left` : "";
      if (!quedan) H.fin(Math.max(1, 3 - 0.25 * Math.max(0, pasadas - 2)));
    },
  });
}

// TAPITA (raiz de loto): volver a poner la tapa con palillos. La tapa se mueve un poco: clavar cuando esta alineada.
function tapita(s, paso, H) {
  const { el, TINTA } = H;
  const N = paso.n || 3;
  const TOL = H.ancho(4, 0.35);
  const P = 1500 / H.rapido(0.25);
  el(s, "rect", { x: 90, y: 70, width: 120, height: 112, rx: 10, fill: "rgb(240,214,200)", stroke: TINTA, "stroke-width": 3 });
  el(s, "rect", { x: 90, y: 64, width: 120, height: 12, fill: "rgb(250,234,222)", stroke: TINTA, "stroke-width": 2 });
  const tapa = el(s, "g", {});
  el(tapa, "rect", { x: -60, y: -30, width: 120, height: 34, rx: 10, fill: "rgb(240,214,200)", stroke: TINTA, "stroke-width": 3 });
  el(s, "line", { x1: 150, y1: 22, x2: 150, y2: 62, stroke: VERDE_O, "stroke-width": 2, "stroke-dasharray": "4 4" });
  const marca = el(tapa, "line", { x1: 0, y1: -30, x2: 0, y2: 4, stroke: ROJO, "stroke-width": 2 });
  const listos = el(s, "g", {});
  const cuenta = letrero(H, s, `0 / ${N}`, 14, 24, "start");
  H.ayuda("Tap to pin the lid when its red line meets the green one");
  Object.assign(H.g, { tipo: "tapita", P, t0: H.t0 });
  let off = 0;
  let n = 0;
  const notas = [];
  H.bucle((t) => {
    off = 18 * Math.sin((2 * Math.PI * t) / P) * (1 - n * 0.25);
    tapa.setAttribute("transform", `translate(${(150 + off).toFixed(1)} 62)`);
    H.g.off = off;
  });
  s.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (!H.vivo() || n >= N) return;
    const nota = H.notaDe(off, TOL, 14);
    notas.push(nota);
    n++;
    H.sonar(nota >= 2.5 ? "tocar" : "no");
    el(listos, "line", { x1: 110 + n * 20 + off, y1: 30, x2: 110 + n * 20 + off, y2: 90, stroke: MADERA, "stroke-width": 3 });
    cuenta.textContent = `${n} / ${N}`;
    if (n >= N) H.fin(H.promedio(notas));
  });
}

// ====================================================================================
// v76: tanda 2 (las masas).
// VOLAR (sopa de fideos): cortar tiras del bloque de masa directo a la olla (刀削面), cada pasada a la misma velocidad.
function volar(s, paso, H) {
  const { el, TINTA } = H;
  const N = H.mas(paso.n || 6, 2);
  const V0 = 0.32 * H.rapido(0.15);
  const TOL = H.ancho(0.3, 0.35);
  el(s, "rect", { x: 120, y: 120, width: 150, height: 66, rx: 8, fill: OLLA, stroke: TINTA, "stroke-width": 3 });
  el(s, "rect", { x: 126, y: 132, width: 138, height: 48, rx: 4, fill: "rgb(170,204,224)" });
  const tiras = el(s, "g", {});
  const bloque = el(s, "rect", { x: 40, y: 50, width: 80, height: 40, rx: 10, fill: H.MASA_R, stroke: TINTA, "stroke-width": 3 });
  el(s, "line", { x1: 50, y1: 70, x2: 200, y2: 120, stroke: VERDE_O, "stroke-width": 2, "stroke-dasharray": "5 6" });
  const med = medidor(H, s, { x: 70, y: 14, w: 160, h: 10, a: (1 - TOL) / 2, b: (1 + TOL) / 2 });
  const cuenta = letrero(H, s, `0 / ${N}`, 284, 40, "end");
  H.ayuda("Swipe over the dough toward the pot · same speed every time (green)");
  Object.assign(H.g, { tipo: "volar", v0: V0, n: 0 });
  let ini = null;
  let n = 0;
  const notas = [];
  arrastrar(s, H, {
    abajo: (p) => {
      ini = { p, t: H.ahora() };
    },
    arriba: (p) => {
      if (!ini) return;
      const d = Math.hypot(p[0] - ini.p[0], p[1] - ini.p[1]);
      const v = d / Math.max(1, H.ahora() - ini.t);
      ini = null;
      if (d < 40 || p[0] < 60) return;
      med.poner(v / V0 / 2);
      const nota = H.notaDe(v / V0 - 1, TOL, 0.8);
      notas.push(nota);
      n++;
      H.g.n = n;
      const grosor = clamp(6 / (v / V0), 2, 12);
      el(tiras, "path", { d: `M${140 + (n % 6) * 20} ${150 + (n % 3) * 8} q12 -8 24 0`, fill: "none", stroke: H.MASA_R, "stroke-width": grosor.toFixed(1), "stroke-linecap": "round" });
      bloque.setAttribute("width", Math.max(30, 80 - n * 5));
      H.sonar(nota >= 2.5 ? "tocar" : "no");
      cuenta.textContent = `${n} / ${N}`;
      if (n >= N) H.fin(H.promedio(notas));
    },
  });
}

// FLOTAR (tangyuan): hierven en el fondo y van subiendo; tocar cuando ya flotan todos (sin esperar de mas).
function flotar(s, paso, H) {
  const { el, TINTA } = H;
  const N = 5;
  const az = H.azarDe("flotar");
  el(s, "rect", { x: 60, y: 60, width: 180, height: 120, rx: 10, fill: OLLA, stroke: TINTA, "stroke-width": 3 });
  el(s, "rect", { x: 68, y: 74, width: 164, height: 100, rx: 4, fill: "rgb(190,214,226)" });
  const sube = [];
  for (let i = 0; i < N; i++) sube.push((1500 + az() * 2600) / H.rapido(0.2));
  const tUlt = Math.max(...sube);
  const bolas = sube.map((ts, i) => ({ ts, e: el(s, "circle", { cx: 90 + i * 30, cy: 160, r: 11, fill: "rgb(253,252,248)", stroke: TINTA, "stroke-width": 2.5 }) }));
  const cuenta = letrero(H, s, `0 / ${N} floating`);
  H.ayuda("Wait until ALL of them float, then tap to scoop them out");
  Object.assign(H.g, { tipo: "flotar", tUlt, t: 0 });
  let tA = 0;
  H.bucle((t) => {
    tA = t;
    H.g.t = t;
    let arriba = 0;
    bolas.forEach((b, i) => {
      const k = clamp((t - b.ts) / 500 + 1, 0, 1);
      if (t >= b.ts) arriba++;
      b.e.setAttribute("cy", (160 - 78 * k + Math.sin(t / 200 + i) * 2).toFixed(1));
    });
    cuenta.textContent = `${arriba} / ${N} floating`;
    if (t > tUlt + 4000) H.fin(1.3);
  });
  s.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (!H.vivo()) return;
    if (tA < tUlt) {
      H.sonar("no");
      return H.fin(1.4);
    }
    H.fin(H.notaDe(tA - tUlt - 300, H.ancho(450, 0.3), 2500));
  });
}

// v77: tanda 2 (las masas y los "puntos" de coccion que se miran, no la aguja).
/** Un "punto" que se mira: k sube de 0 a 1 en T ms; tocar con k en [a, b]. pintar(k) dibuja. */
function vigilar(s, H, { T, a, b, pintar, alTocar, tol = 0.07, tope = 1.6, g = {} }) {
  let k = 0;
  Object.assign(H.g, g, { k: 0, a, b, T });
  H.bucle((t) => {
    k = t / T;
    H.g.k = k;
    pintar(k, t);
    if (k > tope) alTocar(1.2, k);
  });
  s.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (!H.vivo()) return;
    const nota = k < a - 0.25 ? 1.3 : H.notaDe(k - (a + b) / 2, (b - a) / 2 + H.ancho(tol, 0.35) - tol, 0.4);
    alTocar(nota, k);
  });
}

// ESCALDAR (har gow): mantener apretado echa agua hirviendo; hay que ir revolviendo en circulos mientras cae
// (si se echa sin revolver, salen grumos).
function escaldar(s, paso, H) {
  const { el, TINTA } = H;
  const CX = 140;
  const CY = 118;
  el(s, "path", { d: `M${CX - 76} ${CY - 26} Q${CX - 70} ${CY + 66} ${CX} ${CY + 68} Q${CX + 70} ${CY + 66} ${CX + 76} ${CY - 26} Z`, fill: "rgb(236,240,246)", stroke: TINTA, "stroke-width": 3 });
  const masa = el(s, "ellipse", { cx: CX, cy: CY - 18, rx: 66, ry: 16, fill: "rgb(252,252,250)", stroke: "rgb(214,214,210)", "stroke-width": 2 });
  const grumos = el(s, "g", {});
  const tetera = el(s, "g", { transform: "translate(250 46)" });
  el(tetera, "ellipse", { cx: 0, cy: 0, rx: 26, ry: 20, fill: "rgb(214,226,232)", stroke: TINTA, "stroke-width": 3 });
  el(tetera, "path", { d: "M-24 -4 L-46 -16 L-44 -8 L-24 6 Z", fill: "rgb(214,226,232)", stroke: TINTA, "stroke-width": 2.5 });
  const chorro = el(s, "rect", { x: 202, y: 34, width: 4, height: 0, fill: "rgb(190,220,240)" });
  const cuchara = el(s, "g", {});
  el(cuchara, "rect", { x: -3, y: -50, width: 6, height: 50, rx: 3, fill: MADERA, stroke: TINTA, "stroke-width": 2 });
  cuchara.setAttribute("transform", `translate(${CX + 30} ${CY - 18})`);
  const med = medidor(H, s, { x: 20, y: 40, w: 12, h: 140, vertical: true });
  H.ayuda("Hold to pour the boiling water · keep stirring in circles while it pours");
  Object.assign(H.g, { tipo: "escaldar", cx: CX, cy: CY - 18, agua: 0 });
  let on = false;
  let agua = 0;
  let grumo = 0;
  let giro = 0;
  let previo = null;
  let tU = 0;
  H.bucle((t) => {
    const dt = Math.min(40, t - tU);
    tU = t;
    giro *= Math.exp(-dt / 250);
    if (on) {
      agua += dt * 0.00028 * H.rapido(0.2);
      if (giro < 0.004) grumo += dt * 0.00028;
    }
    H.g.agua = agua;
    med.poner(agua);
    chorro.setAttribute("height", on ? 66 : 0);
    tetera.setAttribute("transform", on ? "translate(244 48) rotate(-25)" : "translate(250 46)");
    masa.setAttribute("fill", mezcla("rgb(252,252,250)", "rgb(236,240,236)", agua));
    if (agua >= 1) H.fin(H.notaDe(grumo, H.ancho(0.1, 0.35), 0.4));
  });
  arrastrar(s, H, {
    abajo: (p) => {
      on = true;
      previo = Math.atan2(p[1] - (CY - 18), p[0] - CX);
    },
    mover: (p) => {
      const a = Math.atan2(p[1] - (CY - 18), p[0] - CX);
      let d = a - previo;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      previo = a;
      giro = Math.max(giro, Math.abs(d) / 16);
      cuchara.setAttribute("transform", `translate(${clamp(p[0], CX - 60, CX + 60).toFixed(1)} ${clamp(p[1], CY - 40, CY + 10).toFixed(1)})`);
      if (on && giro < 0.004 && Math.random() < 0.05) el(grumos, "circle", { cx: CX - 50 + Math.random() * 100, cy: CY - 24 + Math.random() * 14, r: 4, fill: "rgb(240,240,236)", stroke: "rgb(190,190,186)", "stroke-width": 1 });
    },
    arriba: () => {
      on = false;
    },
  });
}

// TRANSPARENTE (har gow): al vapor la masa se vuelve transparente; tocar cuando se ve el camaron rosado.
function transparente(s, paso, H) {
  const { el, TINTA } = H;
  el(s, "ellipse", { cx: 150, cy: 118, rx: 120, ry: 66, fill: "rgb(214,176,124)", stroke: TINTA, "stroke-width": 3 });
  const ds = [];
  for (let i = 0; i < 3; i++) {
    const x = 92 + i * 58;
    el(s, "ellipse", { cx: x, cy: 116, rx: 16, ry: 9, fill: "rgb(250,160,130)" });
    ds.push(el(s, "path", { d: `M${x - 26} 128 Q${x} 82 ${x + 26} 128 Z`, fill: "rgb(250,250,246)", stroke: TINTA, "stroke-width": 2.5 }));
  }
  const vapor = [0, 1, 2].map((i) => el(s, "path", { d: `M${100 + i * 50} 70 q-6 -10 0 -20 q6 -10 0 -20`, fill: "none", stroke: "rgb(250,250,250)", "stroke-width": 4, "stroke-linecap": "round", opacity: 0.7 }));
  H.ayuda("Watch the skin turn see-through · tap when you can see the pink shrimp");
  vigilar(s, H, {
    T: 4200 / H.rapido(0.2), a: 0.9, b: 1.05, g: { tipo: "transparente" },
    pintar: (k, t) => {
      ds.forEach((d) => {
        d.setAttribute("opacity", clamp(1 - 0.55 * k, 0.4, 1).toFixed(2));
        d.setAttribute("fill", k > 1.35 ? "rgb(230,226,214)" : "rgb(250,250,246)");
      });
      vapor.forEach((v, i) => v.setAttribute("transform", `translate(0 ${(-((t / 30 + i * 9) % 12)).toFixed(1)})`));
    },
    alTocar: (nota) => H.fin(nota),
  });
}

// LAMINAR (tartas de huevo): doblar la masa en tres y estirarla, tres veces: arriba, abajo, de lado.
function laminar(s, paso, H) {
  const { el, TINTA } = H;
  const SEQ = ["up", "down", "side", "up", "down", "side", "up", "down", "side"];
  const masa = el(s, "rect", { x: 90, y: 50, width: 120, height: 120, rx: 8, fill: H.MASA_R, stroke: TINTA, "stroke-width": 3 });
  const capas = el(s, "g", {});
  const flecha = el(s, "path", { d: "", fill: "none", stroke: VERDE_O, "stroke-width": 5, "stroke-linecap": "round", "stroke-linejoin": "round" });
  const cuenta = letrero(H, s, "Layers: 1", 14, 24, "start");
  H.ayuda("Follow the arrow: fold up, fold down, roll sideways · three times");
  let i = 0;
  let malos = 0;
  Object.assign(H.g, { tipo: "laminar", sig: SEQ[0] });
  const dibujar = () => {
    const q = SEQ[i];
    H.g.sig = q;
    flecha.setAttribute("d", q === "up" ? "M150 160 L150 70 M136 86 L150 70 L164 86" : q === "down" ? "M150 60 L150 150 M136 134 L150 150 L164 134" : "M100 110 L200 110 M184 96 L200 110 L184 124");
    const h = q === "side" ? 40 : 120;
    masa.setAttribute("height", i % 3 === 2 ? 40 : i % 3 === 1 ? 80 : 120);
    void h;
  };
  dibujar();
  let ini = null;
  arrastrar(s, H, {
    abajo: (p) => {
      ini = p;
    },
    arriba: (p) => {
      if (!ini) return;
      const dx = p[0] - ini[0];
      const dy = p[1] - ini[1];
      ini = null;
      if (Math.hypot(dx, dy) < 30) return;
      const hizo = Math.abs(dx) > Math.abs(dy) ? "side" : dy < 0 ? "up" : "down";
      if (hizo !== SEQ[i]) {
        malos++;
        H.sonar("no");
        return;
      }
      H.sonar("tocar");
      i++;
      if (i % 3 === 0) {
        el(capas, "line", { x1: 96, y1: 54 + (i / 3) * 10, x2: 204, y2: 54 + (i / 3) * 10, stroke: H.oscurecer(H.MASA_R, 0.85), "stroke-width": 2 });
        cuenta.textContent = `Layers: ${Math.pow(3, i / 3)}`;
      }
      if (i >= SEQ.length) return H.fin(Math.max(1, 3 - 0.3 * malos));
      dibujar();
    },
  });
}

// VENTANITA (tartas de huevo): mirar por la ventana del horno; sacarlas cuando tengan unas manchitas tostadas.
function ventanita(s, paso, H) {
  const { el, TINTA } = H;
  el(s, "rect", { x: 40, y: 30, width: 220, height: 156, rx: 10, fill: "rgb(80,80,90)", stroke: TINTA, "stroke-width": 3 });
  el(s, "rect", { x: 62, y: 52, width: 176, height: 108, rx: 6, fill: "rgb(60,40,30)", stroke: TINTA, "stroke-width": 3 });
  const az = H.azarDe("ventanita");
  const tartas = [];
  for (let i = 0; i < 3; i++) {
    const x = 96 + i * 54;
    el(s, "ellipse", { cx: x, cy: 112, rx: 22, ry: 10, fill: "rgb(232,190,110)", stroke: TINTA, "stroke-width": 2 });
    const crema = el(s, "ellipse", { cx: x, cy: 109, rx: 17, ry: 6, fill: "rgb(255,214,90)" });
    const manchas = [0, 1, 2, 3, 4, 5].map(() => el(s, "circle", { cx: x - 12 + az() * 24, cy: 106 + az() * 6, r: 2.5, fill: "rgb(110,60,30)", opacity: 0 }));
    tartas.push({ crema, manchas });
  }
  el(s, "rect", { x: 62, y: 52, width: 176, height: 108, rx: 6, fill: "rgba(255,170,60,0.12)" });
  const cuenta = letrero(H, s, "", 150, 24);
  H.ayuda("Look through the window · take them out when they have a few dark spots (3–4)");
  vigilar(s, H, {
    T: 5200 / H.rapido(0.2), a: 0.5, b: 0.67, tol: 0.08, g: { tipo: "ventanita" },
    pintar: (k) => {
      const n = Math.floor(k * 6);
      tartas.forEach((q) => q.manchas.forEach((m, j) => m.setAttribute("opacity", j < n ? 1 : 0)));
      tartas.forEach((q) => q.crema.setAttribute("fill", k > 1 ? "rgb(170,110,50)" : "rgb(255,214,90)"));
      cuenta.textContent = `${Math.min(6, n)} spots`;
    },
    alTocar: (nota) => H.fin(nota),
  });
}

// HOJAS (rollitos): untar la bola de masa en la plancha caliente y levantar la hoja cuando los bordes se curvan.
function hojasPlancha(s, paso, H) {
  const { el, TINTA } = H;
  const N = paso.n || 3;
  const T = 1700 / H.rapido(0.2);
  el(s, "circle", { cx: 140, cy: 112, r: 80, fill: "rgb(60,60,70)", stroke: TINTA, "stroke-width": 3 });
  const hoja = el(s, "circle", { cx: 140, cy: 112, r: 0, fill: "rgb(250,250,246)", stroke: "rgb(214,210,200)", "stroke-width": 3 });
  const borde = el(s, "circle", { cx: 140, cy: 112, r: 58, fill: "none", stroke: "rgb(250,240,214)", "stroke-width": 0 });
  const bola = el(s, "circle", { cx: 140, cy: 30, r: 16, fill: H.MASA_R, stroke: TINTA, "stroke-width": 2.5 });
  const pila = el(s, "g", {});
  const cuenta = letrero(H, s, `0 / ${N}`, 290, 30, "end");
  H.ayuda("Tap to dab the dough on the griddle · tap again when the edges curl up");
  let n = 0;
  let t0 = null;
  let tA = 0;
  const notas = [];
  Object.assign(H.g, { tipo: "hojas", T, t0: null, t: 0 });
  H.bucle((t) => {
    tA = t;
    H.g.t = t;
    if (t0 === null) return;
    const k = (t - t0) / T;
    hoja.setAttribute("fill", mezcla("rgb(236,236,230)", "rgb(252,250,240)", k));
    borde.setAttribute("stroke-width", (k > 0.8 ? Math.min(6, (k - 0.8) * 25) : 0).toFixed(1));
    if (k > 1.8) {
      hoja.setAttribute("fill", "rgb(214,170,110)");
      levantar(1.2);
    }
  });
  const levantar = (nota) => {
    notas.push(nota);
    n++;
    t0 = null;
    H.g.t0 = null;
    hoja.setAttribute("r", 0);
    borde.setAttribute("stroke-width", 0);
    el(pila, "ellipse", { cx: 270, cy: 170 - n * 5, rx: 22, ry: 6, fill: "rgb(250,248,236)", stroke: TINTA, "stroke-width": 1.5 });
    cuenta.textContent = `${n} / ${N}`;
    H.sonar(nota >= 2.5 ? "tocar" : "no");
    if (n >= N) H.fin(H.promedio(notas));
  };
  s.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (!H.vivo()) return;
    if (t0 === null) {
      t0 = tA;
      H.g.t0 = tA;
      hoja.setAttribute("r", 58);
      bola.setAttribute("transform", "translate(0 70)");
      setTimeout(() => bola.setAttribute("transform", ""), 200);
      return H.sonar("tocar");
    }
    const k = (tA - t0) / T;
    levantar(k < 0.6 ? 1.4 : H.notaDe(k - 1, H.ancho(0.15, 0.35), 0.5));
  });
}

// BUDARE (arepa): voltearla cuando abajo esta dorada, y sacarla cuando se infla.
function budare(s, paso, H) {
  const { el, TINTA } = H;
  const T = 2600 / H.rapido(0.2);
  el(s, "ellipse", { cx: 150, cy: 130, rx: 120, ry: 40, fill: "rgb(60,60,70)", stroke: TINTA, "stroke-width": 3 });
  const arepa = el(s, "ellipse", { cx: 150, cy: 118, rx: 56, ry: 16, fill: H.MASA_R, stroke: TINTA, "stroke-width": 3 });
  const manchas = el(s, "g", { opacity: 0 });
  for (const [x, y] of [[-20, -4], [10, 2], [28, -6], [-36, 4]]) el(manchas, "ellipse", { cx: 150 + x, cy: 118 + y, rx: 6, ry: 2.5, fill: "rgb(170,110,50)" });
  const fase = letrero(H, s, "Side 1", 150, 24);
  H.ayuda("Tap to flip when the bottom is golden · then tap to take it out when it puffs up");
  let lado = 0;
  let t0 = 0;
  let tA = 0;
  const notas = [];
  Object.assign(H.g, { tipo: "budare", T, t: 0, t0: 0, lado: 0 });
  H.bucle((t) => {
    tA = t;
    H.g.t = t;
    const k = (t - t0) / T;
    if (lado === 0) {
      arepa.setAttribute("stroke", k > 0.85 ? "rgb(200,140,60)" : TINTA);
      arepa.setAttribute("stroke-width", k > 0.85 ? 5 : 3);
    } else {
      arepa.setAttribute("ry", (16 + 10 * clamp(k)).toFixed(1));
      arepa.setAttribute("cy", (118 - 6 * clamp(k)).toFixed(1));
    }
    if (k > 1.9) {
      notas.push(1.2);
      paso2();
    }
  });
  const paso2 = () => {
    if (lado === 0) {
      lado = 1;
      t0 = tA;
      H.g.lado = 1;
      H.g.t0 = tA;
      manchas.setAttribute("opacity", 1);
      fase.textContent = "Side 2";
      arepa.setAttribute("stroke", TINTA);
      arepa.setAttribute("stroke-width", 3);
    } else H.fin(H.promedio(notas));
  };
  s.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (!H.vivo()) return;
    const k = (tA - t0) / T;
    const nota = k < 0.5 ? 1.4 : H.notaDe(k - 1, H.ancho(0.13, 0.35), 0.5);
    notas.push(nota);
    H.sonar(nota >= 2.5 ? "tocar" : "no");
    paso2();
  });
}

// BOLSA (empanadas): doblar la masa con la bolsa plastica: arrastrar la mitad y soltar cuando los bordes coinciden.
function bolsa(s, paso, H) {
  const { el, TINTA } = H;
  const N = paso.n || 3;
  const CX = 150;
  const CY = 112;
  const R = 54;
  const TOL = H.ancho(6, 0.35);
  el(s, "rect", { x: 40, y: 40, width: 220, height: 150, rx: 6, fill: "rgba(230,240,250,0.6)", stroke: "rgb(170,190,210)", "stroke-width": 2 });
  el(s, "path", { d: `M${CX - R} ${CY} A${R} ${R} 0 0 0 ${CX + R} ${CY} Z`, fill: H.MASA_R, stroke: TINTA, "stroke-width": 3 });
  el(s, "ellipse", { cx: CX, cy: CY + 18, rx: 30, ry: 12, fill: "rgb(200,120,70)" });
  const tapa = el(s, "path", { d: "", fill: H.MASA_R, stroke: TINTA, "stroke-width": 3, opacity: 0.95 });
  el(s, "line", { x1: CX - R - 10, y1: CY, x2: CX + R + 10, y2: CY, stroke: VERDE_O, "stroke-width": 2, "stroke-dasharray": "5 5" });
  const listas = el(s, "g", {});
  const cuenta = letrero(H, s, `0 / ${N}`, 14, 24, "start");
  H.ayuda("Drag the top half down over the filling · let go when the edges meet");
  let ang = 0;
  let y0 = null;
  let n = 0;
  const notas = [];
  Object.assign(H.g, { tipo: "bolsa", cy: CY, r: R, cx: CX });
  const pintar = () => {
    const yb = CY - R * Math.cos(ang);
    tapa.setAttribute("d", `M${CX - R} ${CY} A${R} ${Math.abs(CY - yb) + 0.1} 0 0 ${yb < CY ? 1 : 0} ${CX + R} ${CY} Z`);
    H.g.borde = yb;
  };
  pintar();
  arrastrar(s, H, {
    abajo: (p) => {
      y0 = p[1];
    },
    mover: (p) => {
      if (y0 === null) return;
      ang = clamp(Math.acos(clamp((CY - (CY - R + (p[1] - y0))) / R, -1, 1)), 0, Math.PI);
      pintar();
    },
    arriba: () => {
      if (y0 === null) return;
      y0 = null;
      if (ang < 0.4) return;
      const yb = CY - R * Math.cos(ang);
      const nota = H.notaDe(yb - (CY + R), TOL, 25);
      notas.push(nota);
      n++;
      H.sonar(nota >= 2.5 ? "tocar" : "no");
      el(listas, "path", { d: `M${20 + n * 40} 186 a16 16 0 0 1 32 0 Z`, fill: H.MASA_R, stroke: TINTA, "stroke-width": 2 });
      cuenta.textContent = `${n} / ${N}`;
      if (n >= N) return H.fin(H.promedio(notas));
      ang = 0;
      pintar();
    },
  });
}

// GELATINA (xiaolongbao): el caldo cuajado tiembla; cortarlo cuando se queda quieto. Cada corte lo hace temblar otra vez.
function gelatina(s, paso, H) {
  const { el, TINTA } = H;
  const N = paso.n || 4;
  el(s, "rect", { x: 50, y: 60, width: 200, height: 120, rx: 10, fill: "rgb(214,176,124)", stroke: TINTA, "stroke-width": 3 });
  const gel = el(s, "rect", { x: 90, y: 86, width: 120, height: 70, rx: 8, fill: "rgb(236,190,120)", stroke: TINTA, "stroke-width": 3, opacity: 0.9 });
  const cortes = el(s, "g", {});
  const med = medidor(H, s, { x: 70, y: 22, w: 160, h: 10, a: 0, b: 0.15 });
  const cuenta = letrero(H, s, `0 / ${N}`, 290, 50, "end");
  H.ayuda("The jelly wobbles · cut it (tap) only when it's still");
  let amp = 1;
  let n = 0;
  let tU = 0;
  const notas = [];
  Object.assign(H.g, { tipo: "gelatina", amp: 1 });
  H.bucle((t) => {
    const dt = Math.min(40, t - tU);
    tU = t;
    amp *= Math.exp(-dt / (650 / H.rapido(0.2)));
    H.g.amp = amp;
    med.poner(amp);
    const w = Math.sin(t / 45) * amp;
    gel.setAttribute("transform", `translate(${(w * 6).toFixed(1)} 0) skewX(${(w * 8).toFixed(1)})`);
  });
  s.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (!H.vivo()) return;
    const nota = H.notaDe(Math.max(0, amp - 0.06), H.ancho(0.09, 0.35), 0.5);
    notas.push(nota);
    n++;
    el(cortes, "line", { x1: 90 + (n * 120) / (N + 1), y1: 86, x2: 90 + (n * 120) / (N + 1) + amp * 14, y2: 156, stroke: TINTA, "stroke-width": 2 });
    H.sonar(nota >= 2.5 ? "tocar" : "no");
    cuenta.textContent = `${n} / ${N}`;
    amp = 1;
    if (n >= N) H.fin(H.promedio(notas));
  });
}

// v78: tanda 3 (Colombia).
// DESMECHAR (ajiaco): deshilachar el pollo con dos tenedores: pasadas largas de un lado al otro.
function desmechar(s, paso, H) {
  const { el, TINTA } = H;
  const N = H.mas(paso.n || 6, 2);
  el(s, "ellipse", { cx: 150, cy: 112, rx: 120, ry: 70, fill: "rgb(250,250,246)", stroke: TINTA, "stroke-width": 3 });
  const pechuga = el(s, "ellipse", { cx: 150, cy: 112, rx: 60, ry: 34, fill: "rgb(236,200,150)", stroke: TINTA, "stroke-width": 3 });
  const hebras = el(s, "g", {});
  el(s, "line", { x1: 80, y1: 112, x2: 220, y2: 112, stroke: VERDE_O, "stroke-width": 2, "stroke-dasharray": "5 6" });
  const cuenta = letrero(H, s, `0 / ${N}`);
  H.ayuda("Pull the chicken apart: long swipes across, end to end");
  Object.assign(H.g, { tipo: "desmechar" });
  let n = 0;
  let cortas = 0;
  let ini = null;
  arrastrar(s, H, {
    abajo: (p) => {
      ini = p;
    },
    arriba: (p) => {
      if (!ini) return;
      const L = Math.abs(p[0] - ini[0]);
      ini = null;
      if (L < 25) return;
      if (L < 110) {
        cortas++;
        H.sonar("no");
      } else H.sonar("tocar");
      n++;
      for (let j = 0; j < 4; j++) el(hebras, "path", { d: `M${100 + Math.random() * 100} ${86 + Math.random() * 52} q8 -4 18 2`, fill: "none", stroke: "rgb(236,200,150)", "stroke-width": 3, "stroke-linecap": "round" });
      pechuga.setAttribute("rx", Math.max(10, 60 - n * 7));
      pechuga.setAttribute("ry", Math.max(6, 34 - n * 4));
      cuenta.textContent = `${n} / ${N}`;
      if (n >= N) H.fin(Math.max(1, 3 - 0.3 * cortas));
    },
  });
}

// REMOJAR (patacones): meter el patacon aplastado en agua con ajo y sal un momento, y sacarlo.
function remojar(s, paso, H) {
  const { el, TINTA } = H;
  const N = paso.n || 3;
  const A = 0.8;
  const B = 1.2;
  const T = 1000 / H.rapido(0.2);
  el(s, "path", { d: "M70 110 Q74 186 150 188 Q226 186 230 110 Z", fill: "rgb(236,240,246)", stroke: TINTA, "stroke-width": 3 });
  el(s, "ellipse", { cx: 150, cy: 112, rx: 80, ry: 14, fill: "rgb(200,220,226)", stroke: TINTA, "stroke-width": 2 });
  for (const [x, y] of [[120, 112], [176, 110]]) el(s, "ellipse", { cx: x, cy: y, rx: 6, ry: 4, fill: "rgb(250,246,230)", stroke: TINTA, "stroke-width": 1 });
  const pat = el(s, "ellipse", { cx: 0, cy: 0, rx: 24, ry: 9, fill: "rgb(232,190,90)", stroke: TINTA, "stroke-width": 2.5 });
  const med = medidor(H, s, { x: 252, y: 40, w: 12, h: 140, a: A / 1.6, b: B / 1.6, vertical: true });
  const cuenta = letrero(H, s, `0 / ${N}`, 14, 24, "start");
  H.ayuda("Drag the patacón into the garlic water, hold it there a moment, then lift it out");
  let dentro = false;
  let tD = 0;
  let tA = 0;
  let n = 0;
  const notas = [];
  pat.setAttribute("transform", "translate(150 50)");
  Object.assign(H.g, { tipo: "remojar", k: 0, a: A, b: B });
  H.bucle((t) => {
    tA = t;
    const k = dentro ? (t - tD) / T : 0;
    H.g.k = k;
    med.poner(k / 1.6);
  });
  arrastrar(s, H, {
    mover: (p) => {
      pat.setAttribute("transform", `translate(${clamp(p[0], 80, 220).toFixed(1)} ${clamp(p[1], 30, 150).toFixed(1)})`);
      const en = p[1] > 108;
      if (en && !dentro) {
        dentro = true;
        tD = tA;
        H.sonar("tocar");
      } else if (!en && dentro) {
        dentro = false;
        const k = (tA - tD) / T;
        const nota = H.notaDe(k - (A + B) / 2, (B - A) / 2 + H.ancho(0.15, 0.35) - 0.15, 0.6);
        notas.push(nota);
        n++;
        cuenta.textContent = `${n} / ${N}`;
        H.sonar(nota >= 2.5 ? "tocar" : "no");
        if (n >= N) H.fin(H.promedio(notas));
      }
    },
  });
}

// SIN ABRIR (pandebono): el horno no se abre hasta que se inflen. Si tocas antes, se desinflan.
function sinAbrir(s, paso, H) {
  const { el, TINTA } = H;
  el(s, "rect", { x: 40, y: 30, width: 220, height: 156, rx: 10, fill: "rgb(80,80,90)", stroke: TINTA, "stroke-width": 3 });
  el(s, "rect", { x: 62, y: 52, width: 176, height: 108, rx: 6, fill: "rgb(60,40,30)", stroke: TINTA, "stroke-width": 3 });
  const panes = [0, 1, 2].map((i) => el(s, "ellipse", { cx: 100 + i * 50, cy: 128, rx: 18, ry: 8, fill: H.MASA_R, stroke: TINTA, "stroke-width": 2.5 }));
  el(s, "rect", { x: 62, y: 52, width: 176, height: 108, rx: 6, fill: "rgba(255,170,60,0.12)" });
  H.ayuda("Don't open the oven too soon! Tap when they've puffed up and turned golden");
  vigilar(s, H, {
    T: 4800 / H.rapido(0.2), a: 0.92, b: 1.08, g: { tipo: "sin_abrir" },
    pintar: (k) => panes.forEach((p, i) => {
      p.setAttribute("ry", (8 + 12 * clamp(k)).toFixed(1));
      p.setAttribute("cy", (128 - 10 * clamp(k)).toFixed(1));
      p.setAttribute("fill", k > 1.3 ? "rgb(170,110,50)" : mezcla(H.MASA_R, "rgb(222,160,70)", clamp(k - 0.5) * 2));
      void i;
    }),
    alTocar: (nota, k) => {
      if (k < 0.75) panes.forEach((p) => p.setAttribute("ry", 6));
      H.fin(nota);
    },
  });
}

// ARMAR (tamal tolimense): poner los ingredientes sobre la hoja en el orden de la receta.
function armar(s, paso, H) {
  const { el, TINTA } = H;
  const ORDEN = [["Corn dough", "rgb(250,226,140)"], ["Rice", "rgb(252,252,246)"], ["Chicken", "rgb(236,200,150)"], ["Pork", "rgb(214,110,96)"], ["Egg", "rgb(255,214,90)"], ["Carrot", "rgb(240,140,60)"], ["Peas", "rgb(110,170,70)"]];
  el(s, "ellipse", { cx: 110, cy: 120, rx: 86, ry: 56, fill: "rgb(96,150,70)", stroke: TINTA, "stroke-width": 3 });
  const capa = el(s, "g", {});
  const az = H.azarDe("armar");
  const pos = ORDEN.map((_, i) => i).sort(() => az() - 0.5);
  const botones = ORDEN.map(([nombre, color], i) => {
    const k = pos[i];
    const x = 226 + (k % 2) * 40;
    const y = 26 + Math.floor(k / 2) * 44;
    el(s, "circle", { cx: x, cy: y, r: 13, fill: color, stroke: TINTA, "stroke-width": 2.5 });
    el(s, "text", { x, y: y + 22, "text-anchor": "middle", "font-size": 7, class: "cocina-cuenta" }).textContent = nombre.split(" ")[0];
    return { x, y, i, nombre };
  });
  const cartel = letrero(H, s, `Next: ${ORDEN[0][0]}`, 14, 24, "start");
  H.ayuda("Add the fillings in the tamal's order: tap the one shown at the top");
  let i = 0;
  let malos = 0;
  Object.assign(H.g, { tipo: "armar", sig: { x: botones[0].x, y: botones[0].y } });
  s.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (!H.vivo()) return;
    const [x, y] = H.aSvg(e);
    const b = botones.find((q) => Math.hypot(q.x - x, q.y - y) < 16);
    if (!b) return;
    if (b.i !== i) {
      malos++;
      return H.sonar("no");
    }
    H.sonar("tocar");
    el(capa, "ellipse", { cx: 110, cy: 122 - i * 4, rx: 60 - i * 6, ry: 30 - i * 3, fill: ORDEN[i][1], stroke: TINTA, "stroke-width": 1.5 });
    i++;
    if (i >= ORDEN.length) return H.fin(Math.max(1, 3 - 0.3 * malos));
    cartel.textContent = `Next: ${ORDEN[i][0]}`;
    H.g.sig = { x: botones[i].x, y: botones[i].y };
  });
}

// QUESO (chocolate santafereno): el queso se derrite en la taza; sacarlo con la cuchara despacito para que se estire.
function quesoEstira(s, paso, H) {
  const { el, TINTA } = H;
  const META = 80;
  const VLIM = 0.09 * H.rapido(0.2);
  el(s, "path", { d: "M90 110 L100 186 L200 186 L210 110 Z", fill: "rgb(250,250,246)", stroke: TINTA, "stroke-width": 3 });
  el(s, "ellipse", { cx: 150, cy: 112, rx: 60, ry: 12, fill: "rgb(110,60,40)", stroke: TINTA, "stroke-width": 2 });
  const hilo = el(s, "rect", { x: 146, y: 112, width: 8, height: 0, fill: "rgb(252,246,220)", stroke: "rgb(220,210,180)", "stroke-width": 1 });
  const cuchara = el(s, "g", {});
  el(cuchara, "ellipse", { cx: 0, cy: 0, rx: 14, ry: 8, fill: METAL, stroke: TINTA, "stroke-width": 2.5 });
  el(cuchara, "ellipse", { cx: 0, cy: -2, rx: 9, ry: 5, fill: "rgb(252,246,220)" });
  cuchara.setAttribute("transform", "translate(150 112)");
  el(s, "line", { x1: 120, y1: 112 - META, x2: 180, y2: 112 - META, stroke: VERDE_O, "stroke-width": 2, "stroke-dasharray": "5 5" });
  const med = medidor(H, s, { x: 252, y: 40, w: 12, h: 140, a: 0, b: 1 / 1.5, vertical: true, rojo: 1 - 1 / 1.5 });
  H.ayuda("Pull the melted cheese up slowly so it stretches to the line");
  Object.assign(H.g, { tipo: "queso", meta: META, vlim: VLIM });
  let y0 = null;
  let tP = 0;
  let yP = 0;
  let v = 0;
  let largo = 0;
  arrastrar(s, H, {
    abajo: (p) => {
      y0 = p[1];
      tP = H.ahora();
      yP = p[1];
    },
    mover: (p) => {
      if (y0 === null) return;
      const ahora = H.ahora();
      v = 0.7 * v + 0.3 * (Math.max(0, yP - p[1]) / Math.max(1, ahora - tP));
      tP = ahora;
      yP = p[1];
      med.poner(v / VLIM / 1.5);
      largo = Math.max(largo, y0 - p[1]);
      cuchara.setAttribute("transform", `translate(150 ${(112 - largo).toFixed(1)})`);
      hilo.setAttribute("y", (112 - largo).toFixed(1));
      hilo.setAttribute("height", largo.toFixed(1));
      if (v > VLIM * 1.5) {
        y0 = null;
        H.sonar("no");
        hilo.setAttribute("height", 0);
        return H.fin(Math.max(1, 1 + 2 * clamp(largo / META) - 0.6));
      }
      if (largo >= META) {
        y0 = null;
        H.fin(H.notaDe(Math.max(0, v / VLIM - 1), H.ancho(0.25, 0.35), 0.6));
      }
    },
    arriba: () => {
      y0 = null;
    },
  });
}

// TOSTAR (tinto): sacudir la sarten para que los granos se tuesten parejo; "Done" cuando esten cafe oscuro.
function tostar(s, paso, H) {
  const { el, TINTA } = H;
  const A = 0.72;
  const B = 0.86;
  el(s, "rect", { x: 200, y: 100, width: 80, height: 12, rx: 5, fill: "rgb(60,60,70)", stroke: TINTA, "stroke-width": 2.5 });
  const sarten = el(s, "g", {});
  el(sarten, "ellipse", { cx: 0, cy: 0, rx: 70, ry: 28, fill: "rgb(60,60,70)", stroke: TINTA, "stroke-width": 3 });
  const az = H.azarDe("tostar");
  const granos = [];
  for (let i = 0; i < 14; i++) granos.push({ e: el(sarten, "ellipse", { cx: (az() - 0.5) * 100, cy: (az() - 0.5) * 30, rx: 6, ry: 4, fill: "rgb(150,170,90)", stroke: TINTA, "stroke-width": 1.2 }), r: 0, sesgo: 0.7 + az() * 0.6 });
  sarten.setAttribute("transform", "translate(140 110)");
  const med = medidor(H, s, { x: 70, y: 20, w: 160, h: 10, a: A, b: B });
  H.ayuda("Shake the pan side to side so they roast evenly · tap Done when they're dark brown");
  Object.assign(H.g, { tipo: "tostar", r: 0, a: A, b: B, cx: 140 });
  let x0 = null;
  let off = 0;
  let mov = 0;
  let tU = 0;
  H.bucle((t) => {
    const dt = Math.min(40, t - tU);
    tU = t;
    mov *= Math.exp(-dt / 300);
    const parejo = clamp(mov / 0.15);
    let suma = 0;
    granos.forEach((g) => {
      const f = parejo + (1 - parejo) * g.sesgo * 1.5;
      g.r += dt * 0.00011 * f * H.rapido(0.2);
      suma += g.r;
      g.e.setAttribute("fill", g.r < 0.5 ? mezcla("rgb(150,170,90)", "rgb(200,150,80)", g.r * 2) : mezcla("rgb(200,150,80)", "rgb(50,30,20)", (g.r - 0.5) * 2));
    });
    const r = suma / granos.length;
    H.g.r = r;
    med.poner(r);
  });
  arrastrar(s, H, {
    abajo: (p) => {
      x0 = p[0] - off;
    },
    mover: (p) => {
      if (x0 === null) return;
      const n = clamp(p[0] - x0, -40, 40);
      mov = Math.min(1, mov + Math.abs(n - off) * 0.004);
      off = n;
      sarten.setAttribute("transform", `translate(${(140 + off).toFixed(1)} 110)`);
    },
    arriba: () => {
      x0 = null;
    },
  });
  H.boton("Done ✓", () => {
    const rs = granos.map((g) => g.r);
    const m = rs.reduce((a, b) => a + b, 0) / rs.length;
    const desv = Math.sqrt(rs.reduce((a, b) => a + (b - m) ** 2, 0) / rs.length);
    H.fin(H.notaDe(m - (A + B) / 2, (B - A) / 2, 0.3) - Math.max(0, desv - 0.05) * 6);
  });
}

// PELUSA (lulada): el lulo tiene pelusita: frotarlo con el trapo hasta dejarlo brillante.
function pelusa(s, paso, H) {
  const { el, TINTA } = H;
  el(s, "circle", { cx: 150, cy: 110, r: 56, fill: "rgb(240,170,40)", stroke: TINTA, "stroke-width": 3 });
  el(s, "ellipse", { cx: 130, cy: 88, rx: 14, ry: 8, fill: "rgb(255,214,120)" });
  const az = H.azarDe("pelusa");
  const pelos = [];
  for (let i = 0; i < 40; i++) {
    const a = az() * Math.PI * 2;
    const r = Math.sqrt(az()) * 50;
    const x = 150 + r * Math.cos(a);
    const y = 110 + r * Math.sin(a);
    pelos.push({ x, y, e: el(s, "circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: 2.2, fill: "rgb(250,240,214)" }), v: 2 });
  }
  const trapo = el(s, "rect", { x: -18, y: -12, width: 36, height: 24, rx: 5, fill: "rgb(200,220,240)", stroke: TINTA, "stroke-width": 2, opacity: 0 });
  const cuenta = letrero(H, s, "", 150, 24);
  H.ayuda("Rub the fuzz off the lulo with the cloth");
  Object.assign(H.g, { tipo: "pelusa", cx: 150, cy: 110 });
  let t0 = null;
  arrastrar(s, H, {
    abajo: (p) => {
      if (t0 === null) t0 = H.ahora();
      trapo.setAttribute("opacity", 1);
      trapo.setAttribute("transform", `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`);
    },
    mover: (p) => {
      trapo.setAttribute("transform", `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`);
      for (const q of pelos)
        if (q.v > 0 && Math.abs(q.x - p[0]) < 18 && Math.abs(q.y - p[1]) < 13) {
          q.v--;
          q.e.setAttribute("opacity", q.v ? 0.5 : 0);
        }
      const quedan = pelos.filter((q) => q.v > 0).length;
      cuenta.textContent = quedan ? `${quedan} left` : "";
      if (!quedan) H.fin(H.notaDe(Math.max(0, (H.ahora() - t0) / 1000 - 4), H.ancho(3, 0.35), 8));
    },
    arriba: () => trapo.setAttribute("opacity", 0),
  });
}

export const GESTOS = {
  torcer: { nombre: "TWIST", texto: (p) => `Twist the top closed (${p.n || 18} pleats)`, crear: torcer },
  cuchilla: { nombre: "SMEAR", texto: () => "Smear the wrappers with the cleaver", crear: cuchilla },
  agua_fria: { nombre: "SPLASH", texto: () => "Boil, and splash in cold water 3 times", crear: aguaFria },
  leudar: { nombre: "PROOF", texto: () => "Let the dough rise until it doubles", crear: leudar },
  exprimir: { nombre: "SQUEEZE", texto: (p) => (p.que === "limon" ? "Squeeze the lime" : "Squeeze the water out of the greens"), crear: exprimir },
  mortero: { nombre: "POUND", texto: (p) => (p.que === "pimienta" ? "Grind the Sichuan pepper (it numbs!)" : "Mash the red beans"), crear: mortero },
  abrir: { nombre: "OPEN", texto: () => "Break it open, slowly…", crear: abrir },
  rodar: { nombre: "COAT", texto: () => "Roll them in the rice flour", crear: rodar },
  moler: { nombre: "GRIND", texto: () => "Grind the coffee", crear: moler },
  licuar: { nombre: "BLEND", texto: () => "Blend it in pulses", crear: licuar },
  termometro: { nombre: "COOL", texto: () => "Let the boiled water cool to 80 °C", crear: termometro },
  aceite: { nombre: "OIL", texto: () => "Fry, keeping the oil just right", crear: aceite },
  palmear: { nombre: "PAT", texto: () => "Pat the arepa between your hands", crear: palmear },
  enroscar: { nombre: "COIL", texto: () => "Coil it into a snail", crear: enroscar },
  desgranar: { nombre: "BREAK UP", texto: () => "Break up the cold rice", crear: desgranar },
  espesar: { nombre: "THICKEN", texto: () => "Stir until the potatoes melt in", crear: espesar },
  remolino: { nombre: "SWIRL", texto: () => "Swirl the soup and drizzle in the egg", crear: remolino },
  escurrir: { nombre: "DRAIN", texto: () => "Drain the noodles", crear: escurrir },
  marcar: { nombre: "SCORE", texto: () => "Score the fish diagonally", crear: marcar },
  banar: { nombre: "BASTE", texto: () => "Baste the pork with the sauce", crear: banar },
  descascarar: { nombre: "SHELL", texto: () => "Shell the shrimp", crear: descascarar },
  cono: { nombre: "CONE", texto: () => "Fold the leaves into cones", crear: cono },
  soasar: { nombre: "WILT", texto: () => "Wilt the banana leaf over the fire", crear: soasar },
  huecos: { nombre: "STUFF", texto: () => "Stuff the holes with sticky rice", crear: huecos },
  balanza: { nombre: "WEIGH", texto: (p) => `Weigh ${p.g || 250} g of ${p.nombre || "starch"}`, crear: balanza },
  huevo: { nombre: "EGG", texto: (p) => ((p.n || 1) > 1 ? `Crack ${p.n} eggs` : "Crack an egg"), crear: huevo },
  prensar: { nombre: "MOLD", texto: () => "Press them in the mooncake mold", crear: prensar },
  picar: { nombre: "MINCE", texto: () => "Mince the beef with two cleavers", crear: picar },
  espumar: { nombre: "SKIM", texto: () => "Skim the foam off the broth", crear: espumar },
  sacudir: { nombre: "SHAKE TREE", texto: () => "Shake the osmanthus tree", crear: sacudir },
  limpiar: { nombre: "CLEAN", texto: () => "Clean the flowers", crear: limpiar },
  brotes: { nombre: "TEA TIPS", texto: () => "Pick the tea: one bud, one leaf", crear: brotes },
  red: { nombre: "NET", texto: () => "Net a fish from the tank", crear: red },
  aceite_tibio: { nombre: "WARM OIL", texto: () => "Take each shrimp out the moment it turns white", crear: aceiteTibio },
  raspar: { nombre: "SCRAPE", texto: () => "Scrape the pork skin clean", crear: raspar },
  tapita: { nombre: "PIN LID", texto: () => "Pin the lid back on with toothpicks", crear: tapita },
  volar: { nombre: "SHAVE", texto: () => "Shave the noodles straight into the pot", crear: volar },
  flotar: { nombre: "FLOAT", texto: () => "Boil until they all float", crear: flotar },
  escaldar: { nombre: "SCALD", texto: () => "Scald the starch with boiling water, stirring", crear: escaldar },
  transparente: { nombre: "SEE-THROUGH", texto: () => "Steam until you can see the shrimp", crear: transparente },
  laminar: { nombre: "LAYER", texto: () => "Fold and roll the pastry into layers", crear: laminar },
  ventanita: { nombre: "OVEN WINDOW", texto: () => "Bake until a few dark spots appear", crear: ventanita },
  hojas: { nombre: "WRAPPERS", texto: () => "Make the wrappers on the hot griddle", crear: hojasPlancha },
  budare: { nombre: "BUDARE", texto: () => "Grill it: flip when golden, out when it puffs", crear: budare },
  bolsa: { nombre: "SEAL", texto: () => "Fold and seal with the plastic bag", crear: bolsa },
  gelatina: { nombre: "JELLY", texto: () => "Cut the soup jelly", crear: gelatina },
  desmechar: { nombre: "SHRED", texto: () => "Shred the chicken with two forks", crear: desmechar },
  remojar: { nombre: "GARLIC DIP", texto: () => "Dip them in garlic salt water", crear: remojar },
  sin_abrir: { nombre: "DON'T PEEK", texto: () => "Bake without opening the oven", crear: sinAbrir },
  armar: { nombre: "LAYER UP", texto: () => "Build the tamal in order", crear: armar },
  queso: { nombre: "CHEESE", texto: () => "Drop in the cheese and pull it out stretchy", crear: quesoEstira },
  tostar: { nombre: "ROAST", texto: () => "Roast the coffee beans", crear: tostar },
  pelusa: { nombre: "RUB", texto: () => "Rub the fuzz off the lulo", crear: pelusa },
  palillo: { nombre: "POACH", texto: () => "Poach it gently and test with a chopstick", crear: palillo },
};
