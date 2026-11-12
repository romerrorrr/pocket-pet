/**
 * cocina.js
 * =========
 * v55: los pasos de cocinar del restaurante (restaurante.js). Cada paso es un
 * gesto distinto sobre la tabla de la cocina, dibujado en SVG (formas planas
 * con contorno de tinta, como el resto de la app):
 *
 *   amasar    tocar cuando el anillo llega al borde de la masa (6 veces)
 *   estirar   arrastrar el palote de un lado al otro hasta el circulo marcado
 *   rellenar  mantener apretado: el relleno crece; soltar en la franja verde
 *   verter    igual, llenando la taza hasta la raya
 *   plegar    la marca da vueltas: tocar cuando pasa por la zona verde (N pliegues)
 *   cocinar   la aguja avanza crudo -> perfecto -> pasado: sacarlo en el punto
 *             (la plancha tiene dos: dar vuelta y sacar)
 *   elegir    tocar lo que pide el ticket (extras, toppings, frutas) y "Ready"
 *
 * Cada paso termina con 1 a 3 estrellas: alTerminar(estrellas).
 * La puntuacion de cada gesto (estrellasDe*) no toca el DOM: test/unit_v55.mjs.
 */

const SVG = "http://www.w3.org/2000/svg";
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const RELLENOS = {
  carne: { nombre: "pork", color: "rgb(200,120,96)", sombra: "rgb(160,84,70)" },
  verdura: { nombre: "veggies", color: "rgb(120,170,90)", sombra: "rgb(84,130,64)" },
  frijol: { nombre: "red bean", color: "rgb(150,50,60)", sombra: "rgb(110,30,44)" },
  caldo: { nombre: "pork & soup", color: "rgb(214,150,100)", sombra: "rgb(176,110,70)" },
  camaron: { nombre: "shrimp", color: "rgb(244,150,130)", sombra: "rgb(214,104,96)" },
  loto: { nombre: "lotus paste", color: "rgb(200,150,90)", sombra: "rgb(160,110,60)" },
  queso: { nombre: "cheese", color: "rgb(250,230,150)", sombra: "rgb(220,190,100)" },
  pollo: { nombre: "chicken & potato", color: "rgb(230,190,120)", sombra: "rgb(196,150,80)" },
};
export const LIQUIDOS = {
  agua: { nombre: "hot water", color: "rgb(200,226,240)" },
  te: { nombre: "tea", color: "rgb(170,200,120)" },
  leche: { nombre: "milk", color: "rgb(246,240,226)" },
  cafe: { nombre: "coffee", color: "rgb(90,56,40)" },
  jarabe: { nombre: "osmanthus syrup", color: "rgb(250,210,110)" },
  jugo: { nombre: "passion fruit juice", color: "rgb(255,196,60)" },
};
export const COCCIONES = {
  vapor: { verbo: "STEAM", boton: "Take it out!", ms: 3600 },
  hervir: { verbo: "BOIL", boton: "Scoop them out!", ms: 3400 },
  plancha: { verbo: "GRILL", boton: "Flip!", ms: 2800, vuelta: true },
  freir: { verbo: "FRY", boton: "Take it out!", ms: 3000 },
  horno: { verbo: "BAKE", boton: "Take it out!", ms: 3800 },
  caramelo: { verbo: "DIP", boton: "Lift it!", ms: 2600 },
  calentar: { verbo: "HEAT", boton: "Pour it!", ms: 3000 },
  enfriar: { verbo: "CHILL", boton: "Unmold!", ms: 3200 },
};

// --------- la puntuacion (sin DOM) ---------
export const estrellasDeAciertos = (buenos, total) => (total <= 0 ? 3 : buenos / total >= 0.85 ? 3 : buenos / total >= 0.55 ? 2 : 1);
/** estirar: el radio final contra la franja [min, max]. Mas grande que max = se rompio. */
export function estrellasDeEstirar(r, min, max) {
  if (r >= min && r <= max) return 3;
  if (r > max) return r <= max + 8 ? 2 : 1;
  return r >= min - 8 ? 2 : 1;
}
/** rellenar / verter: cuanto (0..1) contra la franja [a, b]. */
export function estrellasDeCantidad(f, a, b) {
  if (f >= a && f <= b) return 3;
  const d = f < a ? a - f : f - b;
  return d <= 0.1 ? 2 : 1;
}
/** cocinar: donde estaba la aguja (0..1) contra la zona perfecta [a, b]. */
export function estrellasDeCoccion(x, a, b) {
  if (x >= a && x <= b) return 3;
  const d = x < a ? a - x : x - b;
  return d <= 0.07 ? 2 : 1;
}
/** elegir: lo elegido contra lo pedido (listas de ids). */
export function estrellasDeEleccion(elegido, pedido) {
  const e = new Set(elegido);
  const p = new Set(pedido);
  let mal = 0;
  for (const x of e) if (!p.has(x)) mal++;
  for (const x of p) if (!e.has(x)) mal++;
  return mal === 0 ? 3 : mal === 1 ? 2 : 1;
}

// --------- los pasos ---------

function svg(area) {
  const s = document.createElementNS(SVG, "svg");
  s.setAttribute("viewBox", "0 0 300 200");
  s.setAttribute("class", "cocina-svg");
  area.appendChild(s);
  return s;
}
function el(padre, tag, attrs = {}) {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  padre.appendChild(e);
  return e;
}
const TINTA = "rgb(22,20,22)";
const MASA = "rgb(250,244,228)";
const MASA_SOMBRA = "rgb(226,214,190)";

/**
 * Arma un paso dentro de area (un div vacio). paso: { t, ...datos }.
 * ctx: { ayuda(texto), boton(texto, fn) | null, sonar, vibrar, plato (src del plato), pedido (extras pedidos) }
 * Devuelve { destruir(), resolver(estrellas) } — resolver es para las pruebas.
 */
export function crearPaso(area, paso, ctx, alTerminar) {
  area.innerHTML = "";
  const { sonar = () => {}, vibrar = () => {}, ayuda = () => {}, boton = () => {} } = ctx;
  let vivo = true;
  let raf = 0;
  let terminado = false;
  const fin = (e) => {
    if (terminado) return;
    terminado = true;
    vivo = false;
    cancelAnimationFrame(raf);
    boton(null);
    sonar(e === 3 ? "hallazgo" : e === 2 ? "hito" : "mimo");
    vibrar(e === 3 ? [15, 30, 15] : 20);
    setTimeout(() => alTerminar(e), 450);
  };
  const s = svg(area);
  const t0 = performance.now();
  const bucle = (fn) => {
    const f = (ahora) => {
      if (!vivo) return;
      fn(ahora - t0);
      raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
  };
  const aSvg = (e) => {
    const r = s.getBoundingClientRect();
    const k = Math.min(r.width / 300, r.height / 200);
    const ox = (r.width - 300 * k) / 2;
    const oy = (r.height - 200 * k) / 2;
    return [(e.clientX - r.left - ox) / k, (e.clientY - r.top - oy) / k];
  };

  // ---------- AMASAR ----------
  if (paso.t === "amasar") {
    const TOTAL = 6;
    let n = 0;
    let buenos = 0;
    const masa = el(s, "ellipse", { cx: 150, cy: 104, rx: 46, ry: 38, fill: MASA, stroke: TINTA, "stroke-width": 3 });
    el(s, "ellipse", { cx: 150, cy: 128, rx: 36, ry: 6, fill: MASA_SOMBRA, opacity: 0.8 });
    const anillo = el(s, "ellipse", { cx: 150, cy: 104, rx: 90, ry: 74, fill: "none", stroke: "rgb(214,70,64)", "stroke-width": 4, "stroke-dasharray": "8 6" });
    const zona = el(s, "ellipse", { cx: 150, cy: 104, rx: 50, ry: 42, fill: "none", stroke: "rgb(120,190,110)", "stroke-width": 9, opacity: 0.45 });
    const cuenta = el(s, "text", { x: 150, y: 24, "text-anchor": "middle", class: "cocina-cuenta" });
    cuenta.textContent = `0 / ${TOTAL}`;
    ayuda("Tap when the red ring meets the green line");
    const P = 1300;
    let k = 1;
    bucle((t) => {
      k = 1 + 0.95 * (1 - ((t % P) / P)); // 1.95 -> 1.0
      anillo.setAttribute("rx", 46 * k);
      anillo.setAttribute("ry", 38 * k);
    });
    const tocar = (e) => {
      e.preventDefault();
      if (!vivo) return;
      n++;
      const ok = Math.abs(k - 1.09) < 0.13;
      if (ok) buenos++;
      sonar(ok ? "tocar" : "no");
      masa.setAttribute("rx", ok ? 52 : 44);
      masa.setAttribute("ry", ok ? 32 : 40);
      setTimeout(() => {
        masa.setAttribute("rx", 46);
        masa.setAttribute("ry", 38);
      }, 140);
      zona.setAttribute("stroke", ok ? "rgb(120,190,110)" : "rgb(222,110,100)");
      cuenta.textContent = `${n} / ${TOTAL}`;
      if (n >= TOTAL) fin(estrellasDeAciertos(buenos, TOTAL));
    };
    s.addEventListener("pointerdown", tocar);
  }

  // ---------- ESTIRAR ----------
  else if (paso.t === "estirar") {
    const MIN = 66;
    const MAX = 76;
    let r = 32;
    el(s, "circle", { cx: 150, cy: 104, r: MAX, fill: "none", stroke: "rgb(120,190,110)", "stroke-width": MAX - MIN, opacity: 0.25 });
    el(s, "circle", { cx: 150, cy: 104, r: (MIN + MAX) / 2, fill: "none", stroke: "rgb(80,150,80)", "stroke-width": 2, "stroke-dasharray": "6 6" });
    const masa = el(s, "circle", { cx: 150, cy: 104, r, fill: MASA, stroke: TINTA, "stroke-width": 3 });
    const palote = el(s, "g", {});
    el(palote, "rect", { x: -70, y: -8, width: 140, height: 16, rx: 7, fill: "rgb(214,170,104)", stroke: TINTA, "stroke-width": 3 });
    el(palote, "rect", { x: -92, y: -5, width: 24, height: 10, rx: 4, fill: "rgb(150,100,60)", stroke: TINTA, "stroke-width": 3 });
    el(palote, "rect", { x: 68, y: -5, width: 24, height: 10, rx: 4, fill: "rgb(150,100,60)", stroke: TINTA, "stroke-width": 3 });
    palote.setAttribute("transform", "translate(150 104)");
    ayuda("Drag the pin · stop inside the green circle");
    let prev = null;
    s.addEventListener("pointerdown", (e) => {
      if (!vivo) return;
      e.preventDefault();
      try {
        s.setPointerCapture(e.pointerId);
      } catch (err) {
        /* nada */
      }
      prev = aSvg(e);
    });
    s.addEventListener("pointermove", (e) => {
      if (!vivo || !prev) return;
      const p = aSvg(e);
      const d = Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      r = Math.min(110, r + d * 0.07);
      masa.setAttribute("r", r.toFixed(1));
      masa.setAttribute("fill", r > MAX ? "rgb(250,232,220)" : MASA);
      palote.setAttribute("transform", `translate(${Math.max(60, Math.min(240, p[0]))} ${Math.max(40, Math.min(170, p[1]))}) rotate(${(p[1] - 104) * 0.2})`);
      prev = p;
    });
    const soltar = () => {
      if (!vivo || !prev) return;
      prev = null;
      if (r >= MIN) fin(estrellasDeEstirar(r, MIN, MAX));
    };
    s.addEventListener("pointerup", soltar);
    s.addEventListener("pointercancel", soltar);
  }

  // ---------- RELLENAR / VERTER ----------
  else if (paso.t === "rellenar" || paso.t === "verter") {
    const A = 0.62;
    const B = 0.8;
    const esVerter = paso.t === "verter";
    let f = 0;
    let apretado = false;
    let barra;
    if (esVerter) {
      const L = LIQUIDOS[paso.liquido] || LIQUIDOS.agua;
      // la taza (vidrio): se llena de abajo para arriba
      el(s, "rect", { x: 110, y: 40, width: 80, height: 130, fill: "rgba(255,255,255,0.55)", stroke: TINTA, "stroke-width": 3 });
      barra = el(s, "rect", { x: 113, y: 167, width: 74, height: 0, fill: L.color });
      el(s, "rect", { x: 110, y: 40 + 130 * (1 - B), width: 80, height: 130 * (B - A), fill: "rgba(120,190,110,0.28)", stroke: "rgb(80,150,80)", "stroke-width": 2, "stroke-dasharray": "5 4" });
      el(s, "rect", { x: 110, y: 40, width: 80, height: 130, fill: "none", stroke: TINTA, "stroke-width": 3 });
      const jarra = el(s, "g", { transform: "translate(212 20)" });
      el(jarra, "rect", { x: 0, y: 0, width: 46, height: 40, rx: 6, fill: "rgb(236,232,224)", stroke: TINTA, "stroke-width": 3 });
      el(jarra, "path", { d: "M0 8 L-16 2 L-14 10 L0 14 Z", fill: "rgb(236,232,224)", stroke: TINTA, "stroke-width": 3 });
      const chorro = el(s, "rect", { x: 186, y: 30, width: 6, height: 0, fill: L.color, stroke: TINTA, "stroke-width": 1 });
      ayuda(`Hold to pour · let go on the green line`);
      bucle(() => {
        if (apretado) f = Math.min(1, f + 0.0085);
        barra.setAttribute("y", 167 - 127 * f);
        barra.setAttribute("height", 127 * f);
        chorro.setAttribute("height", apretado ? 137 - 127 * f : 0);
        if (f >= 1 && apretado) {
          apretado = false;
          fin(1);
        }
      });
    } else {
      const R = RELLENOS[paso.relleno] || RELLENOS.carne;
      el(s, "circle", { cx: 130, cy: 108, r: 74, fill: MASA, stroke: TINTA, "stroke-width": 3 });
      el(s, "circle", { cx: 130, cy: 108, r: 50 * B, fill: "rgba(120,190,110,0.25)", stroke: "rgb(80,150,80)", "stroke-width": 2, "stroke-dasharray": "5 4" });
      el(s, "circle", { cx: 130, cy: 108, r: 50 * A, fill: "none", stroke: "rgb(80,150,80)", "stroke-width": 2, "stroke-dasharray": "5 4" });
      barra = el(s, "ellipse", { cx: 130, cy: 108, rx: 0, ry: 0, fill: R.color, stroke: R.sombra, "stroke-width": 3 });
      // el bol con la cuchara
      el(s, "path", { d: "M222 120 Q252 170 282 120 Z", fill: "rgb(236,232,224)", stroke: TINTA, "stroke-width": 3 });
      el(s, "ellipse", { cx: 252, cy: 120, rx: 30, ry: 8, fill: R.color, stroke: TINTA, "stroke-width": 3 });
      el(s, "rect", { x: 248, y: 64, width: 6, height: 52, rx: 3, fill: "rgb(196,170,140)", stroke: TINTA, "stroke-width": 2, transform: "rotate(-20 252 116)" });
      ayuda(`Hold to fill · let go in the green ring`);
      bucle(() => {
        if (apretado) f = Math.min(1, f + 0.009);
        barra.setAttribute("rx", 50 * f);
        barra.setAttribute("ry", 44 * f);
        if (f >= 1 && apretado) {
          apretado = false;
          fin(1);
        }
      });
    }
    s.addEventListener("pointerdown", (e) => {
      if (!vivo) return;
      e.preventDefault();
      apretado = true;
      sonar("tocar");
    });
    const soltar = () => {
      if (!vivo || !apretado) return;
      apretado = false;
      if (f > 0.05) fin(estrellasDeCantidad(f, A, B));
    };
    s.addEventListener("pointerup", soltar);
    s.addEventListener("pointercancel", soltar);
    s.addEventListener("pointerleave", soltar);
  }

  // ---------- PLEGAR ----------
  else if (paso.t === "plegar") {
    const N = paso.n || 8;
    const R = paso.relleno ? RELLENOS[paso.relleno] : RELLENOS.carne;
    const media = paso.forma === "media"; // jiaozi, guotie, empanada: se pliega el borde de abajo
    const a0 = media ? 200 : -90; // grados donde empieza
    const barrido = media ? 140 : 360;
    el(s, "circle", { cx: 150, cy: 104, r: 74, fill: MASA, stroke: TINTA, "stroke-width": 3 });
    el(s, "ellipse", { cx: 150, cy: 104, rx: 34, ry: 30, fill: R.color, stroke: R.sombra, "stroke-width": 3 });
    const pliegues = el(s, "g", {});
    const zona = el(s, "path", { fill: "rgba(120,190,110,0.55)", stroke: "rgb(80,150,80)", "stroke-width": 2 });
    const marca = el(s, "rect", { x: -6, y: -90, width: 12, height: 18, fill: "rgb(186,78,104)", stroke: TINTA, "stroke-width": 2 });
    const cuenta = el(s, "text", { x: 8, y: 18, "text-anchor": "start", class: "cocina-cuenta" });
    let k = 0;
    let buenos = 0;
    const objetivo = () => a0 + (barrido * (k + 0.5)) / N;
    const ANCHO = Math.max(16, Math.min(30, barrido / N));
    const arco = (a, ancho) => {
      const r1 = 84;
      const r2 = 100;
      const p = (ang, r) => [150 + r * Math.cos((ang * Math.PI) / 180), 104 + r * Math.sin((ang * Math.PI) / 180)];
      const [x1, y1] = p(a - ancho / 2, r1);
      const [x2, y2] = p(a + ancho / 2, r1);
      const [x3, y3] = p(a + ancho / 2, r2);
      const [x4, y4] = p(a - ancho / 2, r2);
      return `M${x1} ${y1} A${r1} ${r1} 0 0 1 ${x2} ${y2} L${x3} ${y3} A${r2} ${r2} 0 0 0 ${x4} ${y4} Z`;
    };
    const dibujarZona = () => {
      zona.setAttribute("d", arco(objetivo(), ANCHO));
      cuenta.textContent = `PLEAT ${k} / ${N}`;
    };
    dibujarZona();
    ayuda(`Tap when the pink mark is in the green`);
    let ang = objetivo() - 70;
    const VEL = 0.11; // grados por ms
    let tPrev = 0;
    bucle((t) => {
      const dt = t - tPrev;
      tPrev = t;
      ang += VEL * dt;
      if (ang > objetivo() + 60) ang = objetivo() - 70; // si se paso, vuelve a dar la vuelta hacia la zona
      marca.setAttribute("transform", `translate(150 104) rotate(${ang + 90})`);
    });
    s.addEventListener("pointerdown", (e) => {
      if (!vivo) return;
      e.preventDefault();
      const ok = Math.abs(ang - objetivo()) <= ANCHO / 2 + 3;
      if (ok) buenos++;
      sonar(ok ? "tocar" : "no");
      const a = objetivo();
      const x = 150 + 70 * Math.cos((a * Math.PI) / 180);
      const y = 104 + 70 * Math.sin((a * Math.PI) / 180);
      el(pliegues, "rect", { x: x - 4, y: y - 12, width: 8, height: 24, rx: 3, fill: ok ? "rgb(240,232,210)" : "rgb(226,200,190)", stroke: "rgba(0,0,0,0.4)", "stroke-width": 2, transform: `rotate(${a + 90} ${x} ${y})` });
      k++;
      if (k >= N) {
        zona.setAttribute("d", "");
        cuenta.textContent = `PLEAT ${N} / ${N}`;
        fin(estrellasDeAciertos(buenos, N));
        return;
      }
      ang = objetivo() - 70;
      dibujarZona();
    });
  }

  // ---------- COCINAR ----------
  else if (paso.t === "cocinar") {
    const C = COCCIONES[paso.como] || COCCIONES.vapor;
    const A = 0.55;
    const B = 0.72;
    // la olla / vaporera / sarten, con el plato adentro
    const f = paso.como;
    if (f === "vapor") {
      el(s, "rect", { x: 70, y: 70, width: 160, height: 80, fill: "rgb(214,170,104)", stroke: TINTA, "stroke-width": 3 });
      el(s, "rect", { x: 70, y: 136, width: 160, height: 14, fill: "rgb(170,124,72)" });
      el(s, "rect", { x: 70, y: 70, width: 160, height: 80, fill: "none", stroke: TINTA, "stroke-width": 3 });
    } else if (f === "hervir" || f === "calentar" || f === "caramelo") {
      el(s, "rect", { x: 60, y: 76, width: 180, height: 76, rx: 8, fill: "rgb(150,154,170)", stroke: TINTA, "stroke-width": 3 });
      el(s, "rect", { x: 66, y: 80, width: 168, height: 14, fill: f === "caramelo" ? "rgb(214,120,60)" : "rgb(200,226,240)" });
      el(s, "rect", { x: 40, y: 82, width: 22, height: 8, fill: "rgb(90,90,100)", stroke: TINTA, "stroke-width": 3 });
      el(s, "rect", { x: 238, y: 82, width: 22, height: 8, fill: "rgb(90,90,100)", stroke: TINTA, "stroke-width": 3 });
    } else if (f === "horno") {
      el(s, "rect", { x: 60, y: 46, width: 180, height: 116, rx: 6, fill: "rgb(80,70,80)", stroke: TINTA, "stroke-width": 3 });
      el(s, "rect", { x: 76, y: 60, width: 148, height: 84, fill: "rgb(250,170,90)", stroke: TINTA, "stroke-width": 3 });
    } else if (f === "enfriar") {
      el(s, "rect", { x: 80, y: 50, width: 140, height: 110, rx: 6, fill: "rgb(200,226,240)", stroke: TINTA, "stroke-width": 3 });
    } else {
      // plancha / freir: la sarten
      el(s, "ellipse", { cx: 150, cy: 118, rx: 96, ry: 34, fill: "rgb(60,60,70)", stroke: TINTA, "stroke-width": 3 });
      el(s, "ellipse", { cx: 150, cy: 112, rx: 84, ry: 26, fill: f === "freir" ? "rgb(250,200,90)" : "rgb(90,90,100)" });
      el(s, "rect", { x: 240, y: 108, width: 54, height: 10, rx: 4, fill: "rgb(110,72,50)", stroke: TINTA, "stroke-width": 3 });
    }
    const comida = el(s, "image", { href: ctx.plato || "", x: 110, y: f === "horno" ? 66 : 62, width: 80, height: 80, style: "image-rendering:pixelated" });
    const humo = el(s, "g", { opacity: 0 });
    for (let i = 0; i < 4; i++) el(humo, "rect", { x: 104 + i * 26, y: 30 + (i % 2) * 8, width: 7, height: 14, fill: "rgba(255,255,255,0.85)" });
    // el medidor
    const M = { x: 30, y: 168, w: 240, h: 20 };
    el(s, "rect", { x: M.x, y: M.y, width: M.w * A, height: M.h, fill: "rgb(240,230,200)" });
    el(s, "rect", { x: M.x + M.w * A, y: M.y, width: M.w * (B - A), height: M.h, fill: "rgb(150,200,130)" });
    el(s, "rect", { x: M.x + M.w * B, y: M.y, width: M.w * (1 - B), height: M.h, fill: "rgb(222,140,110)" });
    el(s, "rect", { x: M.x, y: M.y, width: M.w, height: M.h, fill: "none", stroke: TINTA, "stroke-width": 3 });
    const aguja = el(s, "rect", { x: M.x - 2, y: M.y - 7, width: 5, height: M.h + 14, fill: TINTA });
    let fase = 0; // plancha: 0 = primer lado, 1 = segundo
    let x = 0;
    let desde = 0;
    let suma = 0;
    ayuda(`Tap the button when the needle is in the green`);
    bucle((t) => {
      x = Math.min(1.02, (t - desde) / C.ms);
      aguja.setAttribute("x", M.x - 2 + M.w * Math.min(1, x));
      humo.setAttribute("opacity", Math.min(1, x * 1.4));
      comida.setAttribute("opacity", x > B + 0.12 ? 0.75 : 1);
      if (x >= 1.02) {
        boton(null);
        fin(1); // se quemo
      }
    });
    const sacar = () => {
      if (!vivo) return;
      const e = estrellasDeCoccion(x, A, B);
      if (C.vuelta && fase === 0) {
        fase = 1;
        suma = e;
        desde = performance.now() - t0;
        comida.setAttribute("opacity", 0.3);
        setTimeout(() => comida.setAttribute("opacity", 1), 160);
        sonar("tocar");
        boton("Take it out!", sacar);
        return;
      }
      fin(C.vuelta ? Math.round((suma + e) / 2) : e);
    };
    boton(C.boton, sacar);
  }

  // ---------- ELEGIR ----------
  else if (paso.t === "elegir") {
    const opciones = paso.opciones || [];
    const pedido = paso.pedido || [];
    const elegido = new Set();
    s.remove();
    const caja = document.createElement("div");
    caja.className = "cocina-elegir";
    caja.innerHTML = `
      <div class="cocina-elegir-plato"><img src="${esc(ctx.plato || "")}" alt="" draggable="false" /><div class="cocina-elegir-puestos" data-puestos></div></div>
      <div class="cocina-elegir-opciones">${opciones.map((o) => `<button type="button" class="cocina-opcion" data-op="${esc(o.id)}" style="--c:${esc(o.color || "#fff")}"><i></i>${esc(o.nombre)}</button>`).join("")}</div>`;
    area.appendChild(caja);
    const puestos = caja.querySelector("[data-puestos]");
    const pintar = () => {
      puestos.innerHTML = [...elegido].map((id) => `<span style="--c:${esc((opciones.find((o) => o.id === id) || {}).color || "#fff")}"></span>`).join("");
    };
    for (const b of caja.querySelectorAll("[data-op]")) {
      b.addEventListener("click", () => {
        if (!vivo) return;
        const id = b.dataset.op;
        if (elegido.has(id)) elegido.delete(id);
        else elegido.add(id);
        b.classList.toggle("elegida", elegido.has(id));
        sonar("tocar");
        pintar();
      });
    }
    ayuda(paso.ayuda || (pedido.length ? "Add what the ticket says, then Ready" : "Plain order: nothing extra. Tap Ready"));
    boton("Ready ✓", () => fin(estrellasDeEleccion([...elegido], pedido)));
  }

  return {
    destruir() {
      vivo = false;
      cancelAnimationFrame(raf);
    },
    resolver(e = 3) {
      if (!terminado) fin(e);
    },
  };
}
