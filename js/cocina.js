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
/** v58: lo que se corta, se lava o se aplasta */
export const INGREDIENTES = {
  cebollin: { nombre: "scallions", color: "rgb(130,190,100)", vena: "rgb(220,240,200)", alto: 14 },
  fruta: { nombre: "passion fruit", color: "rgb(150,90,140)", vena: "rgb(255,200,70)", alto: 40, redondo: true },
  pescado: { nombre: "fish", color: "rgb(236,210,170)", vena: "rgb(200,170,140)", alto: 46 },
  cerdo: { nombre: "pork belly", color: "rgb(220,120,100)", vena: "rgb(252,232,210)", alto: 42 },
  platano: { nombre: "plantain", color: "rgb(240,200,90)", vena: "rgb(250,230,160)", alto: 34, redondo: true },
  papa: { nombre: "potatoes", color: "rgb(236,206,140)", vena: "rgb(250,232,190)", alto: 36, redondo: true },
  bokchoy: { nombre: "bok choy", color: "rgb(110,170,90)", vena: "rgb(230,246,220)", alto: 30 },
  camaron: { nombre: "shrimp", color: "rgb(250,170,140)", alto: 30 },
  masa_arepa: { nombre: "arepa dough", color: "rgb(250,232,170)", alto: 40, redondo: true },
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
  // v59: la dificultad (ctx.dif: -0.5 relajado .. 0 en ★1 .. 1 en ★5) y las mejoras compradas
  const D = Math.max(-0.5, Math.min(1, ctx.dif || 0));
  const MJ = ctx.mejoras || {};
  const ancho = (w, k = 0.35) => w * (1 - k * D); // las zonas buenas se achican con la fama
  const rapido = (k = 0.25) => 1 + k * D; // y las cosas van un poco mas rapido
  const mas = (n, k) => n + Math.round(Math.max(0, D) * k); // y hay mas pliegues / cortes / lanzamientos
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
    const P = 1300 / rapido();
    const TOL = ancho(0.13);
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
      const ok = Math.abs(k - 1.09) < TOL;
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
    const MIN = 71 - ancho(5, 0.4);
    const MAX = 71 + ancho(5, 0.4);
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
    const MEDIO_RV = ancho(0.09) + 0.015 * (MJ.ollas || 0);
    const A = 0.71 - MEDIO_RV;
    const B = 0.71 + MEDIO_RV;
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
    const N = mas(paso.n || 8, 3);
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
    const VEL = 0.11 * rapido(0.35); // grados por ms
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
    const MEDIO_C = ancho(0.085, 0.4) + 0.0125 * (MJ.ollas || 0);
    const A = 0.635 - MEDIO_C;
    const B = 0.635 + MEDIO_C;
    const MS = C.ms / rapido(0.2);
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
      x = Math.min(1.02, (t - desde) / MS);
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

  // ---------- CORTAR (v58) ----------
  // deslizar el dedo de arriba a abajo sobre cada linea punteada
  else if (paso.t === "cortar") {
    const I = INGREDIENTES[paso.que] || INGREDIENTES.cebollin;
    const N = mas(paso.n || 4, 2);
    const TOL_C = ancho(9) + 3 * (MJ.cuchillo || 0);
    const TORCIDO = ancho(26, 0.3) + 4 * (MJ.cuchillo || 0);
    const X0 = 60;
    const X1 = 240;
    const lineas = Array.from({ length: N }, (_, i) => X0 + ((X1 - X0) * (i + 1)) / (N + 1));
    const trozos = el(s, "g", {});
    const pintar = (cortes) => {
      trozos.innerHTML = "";
      const bordes = [X0, ...cortes.slice().sort((a, b) => a - b), X1];
      for (let i = 0; i < bordes.length - 1; i++) {
        const sep = i * 3; // cada trozo cortado se corre un poquito
        const x = bordes[i] + sep - (cortes.length * 3) / 2 + 1;
        const w = bordes[i + 1] - bordes[i] - 2;
        el(trozos, "rect", { x, y: 104 - I.alto / 2, width: Math.max(3, w), height: I.alto, rx: I.redondo ? I.alto / 2.4 : 4, fill: I.color, stroke: TINTA, "stroke-width": 3 });
        if (I.vena) el(trozos, "rect", { x: x + 2, y: 104 - I.alto / 2 + I.alto * 0.35, width: Math.max(1, w - 4), height: Math.max(2, I.alto * 0.18), fill: I.vena });
      }
    };
    const hechos = [];
    const cortesX = [];
    pintar([]);
    const guias = lineas.map((x) => el(s, "line", { x1: x, y1: 52, x2: x, y2: 156, stroke: "rgb(80,150,80)", "stroke-width": 3, "stroke-dasharray": "6 5" }));
    const cuchillo = el(s, "g", { opacity: 0 });
    el(cuchillo, "path", { d: "M-4 -46 L8 -46 L8 10 L-4 18 Z", fill: "rgb(226,232,238)", stroke: TINTA, "stroke-width": 3 });
    el(cuchillo, "rect", { x: -3, y: -72, width: 10, height: 26, rx: 3, fill: "rgb(110,72,50)", stroke: TINTA, "stroke-width": 3 });
    const cuenta = el(s, "text", { x: 8, y: 18, "text-anchor": "start", class: "cocina-cuenta" });
    cuenta.textContent = `CUT 0 / ${N}`;
    ayuda(`Swipe down along each dotted line`);
    let ini = null;
    let buenos = 0;
    s.addEventListener("pointerdown", (e) => {
      if (!vivo) return;
      e.preventDefault();
      try {
        s.setPointerCapture(e.pointerId);
      } catch (err) {
        /* nada */
      }
      ini = aSvg(e);
      cuchillo.setAttribute("opacity", 1);
      cuchillo.setAttribute("transform", `translate(${ini[0]} ${ini[1]})`);
    });
    s.addEventListener("pointermove", (e) => {
      if (!vivo || !ini) return;
      const p = aSvg(e);
      cuchillo.setAttribute("transform", `translate(${p[0]} ${p[1]})`);
    });
    const soltar = (e) => {
      if (!vivo || !ini) return;
      const p = aSvg(e);
      const a = ini;
      ini = null;
      cuchillo.setAttribute("opacity", 0);
      if (p[1] - a[1] < 30) return; // no fue un corte (muy corto o para arriba)
      const xm = (a[0] + p[0]) / 2;
      // la linea que falta cortar mas cerca
      let mejor = -1;
      let dmin = 1e9;
      lineas.forEach((x, i) => {
        if (!hechos.includes(i) && Math.abs(x - xm) < dmin) {
          dmin = Math.abs(x - xm);
          mejor = i;
        }
      });
      if (mejor < 0) return;
      const torcido = Math.abs(p[0] - a[0]) > TORCIDO;
      const ok = dmin <= TOL_C && !torcido;
      if (ok) buenos++;
      hechos.push(mejor);
      guias[mejor].setAttribute("stroke", ok ? "rgb(120,190,110)" : "rgb(222,110,100)");
      guias[mejor].setAttribute("stroke-dasharray", "");
      guias[mejor].setAttribute("opacity", 0.5);
      cortesX.push(ok ? lineas[mejor] : Math.max(X0 + 4, Math.min(X1 - 4, xm)));
      pintar(cortesX);
      sonar(ok ? "tocar" : "no");
      vibrar(ok ? 12 : 25);
      cuenta.textContent = `CUT ${hechos.length} / ${N}`;
      if (hechos.length >= N) fin(estrellasDeAciertos(buenos, N));
    };
    s.addEventListener("pointerup", soltar);
    s.addEventListener("pointercancel", () => {
      ini = null;
      cuchillo.setAttribute("opacity", 0);
    });
  }

  // ---------- REVOLVER (v58) ----------
  // circulos con el dedo en la olla, a un ritmo parejo (la aguja en el verde)
  else if (paso.t === "revolver") {
    const color = paso.color || "rgb(214,150,90)";
    const CX = 120;
    const CY = 104;
    el(s, "circle", { cx: CX, cy: CY, r: 82, fill: "rgb(150,154,170)", stroke: TINTA, "stroke-width": 3 });
    el(s, "circle", { cx: CX, cy: CY, r: 70, fill: color, stroke: TINTA, "stroke-width": 2 });
    const remolino = el(s, "path", { d: "M80 104 A40 40 0 0 1 160 104", fill: "none", stroke: "rgba(255,255,255,0.45)", "stroke-width": 5, "stroke-linecap": "round" });
    const cuchara = el(s, "g", {});
    el(cuchara, "ellipse", { cx: 0, cy: 0, rx: 9, ry: 7, fill: "rgb(214,180,130)", stroke: TINTA, "stroke-width": 3 });
    el(cuchara, "rect", { x: -3, y: -50, width: 6, height: 46, rx: 3, fill: "rgb(196,150,100)", stroke: TINTA, "stroke-width": 2 });
    cuchara.setAttribute("transform", `translate(${CX + 40} ${CY})`);
    // el medidor de velocidad (vertical, a la derecha) y el progreso
    const VMIN = 6.6 - ancho(2.4); // radianes por segundo
    const VMAX = 6.6 + ancho(2.4);
    const MX = 228;
    const MY = 30;
    const MH = 140;
    const yDe = (v) => MY + MH - (Math.min(14, v) / 14) * MH;
    el(s, "rect", { x: MX, y: MY, width: 18, height: MH, fill: "rgb(240,230,200)" });
    el(s, "rect", { x: MX, y: yDe(VMAX), width: 18, height: yDe(VMIN) - yDe(VMAX), fill: "rgb(150,200,130)" });
    el(s, "rect", { x: MX, y: MY, width: 18, height: yDe(VMAX) - MY, fill: "rgb(222,140,110)" });
    el(s, "rect", { x: MX, y: MY, width: 18, height: MH, fill: "none", stroke: TINTA, "stroke-width": 3 });
    const aguja = el(s, "rect", { x: MX - 6, y: MY + MH - 2, width: 30, height: 5, fill: TINTA });
    el(s, "rect", { x: 262, y: MY, width: 14, height: MH, fill: "rgba(255,255,255,0.5)", stroke: TINTA, "stroke-width": 3 });
    const prog = el(s, "rect", { x: 265, y: MY + MH - 3, width: 8, height: 0, fill: "rgb(120,190,110)" });
    for (const [tx, txt] of [[237, "SPEED"], [269, "DONE"]]) {
      const l = el(s, "text", { x: tx, y: MY + MH + 16, "text-anchor": "middle", class: "cocina-cuenta", style: "font-size:7px" });
      l.textContent = txt;
    }
    const gotas = el(s, "g", {});
    ayuda("Stir in circles · keep the needle in the green");
    let ultimoAng = null;
    let ultimoT = 0;
    let v = 0; // velocidad suavizada (rad/s)
    let progreso = 0;
    let tiempoTotal = 0;
    let tiempoBien = 0;
    let girando = false;
    let rot = 0;
    s.addEventListener("pointerdown", (e) => {
      if (!vivo) return;
      e.preventDefault();
      try {
        s.setPointerCapture(e.pointerId);
      } catch (err) {
        /* nada */
      }
      girando = true;
      const p = aSvg(e);
      ultimoAng = Math.atan2(p[1] - CY, p[0] - CX);
      ultimoT = performance.now();
    });
    s.addEventListener("pointermove", (e) => {
      if (!vivo || !girando) return;
      const p = aSvg(e);
      const ang = Math.atan2(p[1] - CY, p[0] - CX);
      const ahora = performance.now();
      let d = ang - ultimoAng;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      const dt = Math.max(1, ahora - ultimoT) / 1000;
      const inst = Math.abs(d) / dt;
      if (Math.hypot(p[0] - CX, p[1] - CY) > 14) v = v * 0.8 + inst * 0.2;
      ultimoAng = ang;
      ultimoT = ahora;
      const r = Math.max(20, Math.min(62, Math.hypot(p[0] - CX, p[1] - CY)));
      cuchara.setAttribute("transform", `translate(${CX + r * Math.cos(ang)} ${CY + r * Math.sin(ang)})`);
    });
    const soltar = () => {
      girando = false;
    };
    s.addEventListener("pointerup", soltar);
    s.addEventListener("pointercancel", soltar);
    let tPrev = 0;
    bucle((t) => {
      const dt = Math.min(0.05, (t - tPrev) / 1000);
      tPrev = t;
      if (!girando || performance.now() - ultimoT > 120) v *= 0.9; // si no mueve, se frena
      aguja.setAttribute("y", yDe(v) - 2);
      rot += v * dt * 57;
      remolino.setAttribute("transform", `rotate(${rot} ${CX} ${CY})`);
      if (girando) {
        tiempoTotal += dt;
        const bien = v >= VMIN && v <= VMAX;
        if (bien) {
          tiempoBien += dt;
          progreso = Math.min(1, progreso + dt / 3.2);
        }
        if (v > VMAX && Math.random() < 0.25) {
          // salpica
          const a = Math.random() * 6.28;
          const g = el(gotas, "circle", { cx: CX + 80 * Math.cos(a), cy: CY + 80 * Math.sin(a), r: 4, fill: color, stroke: TINTA, "stroke-width": 1.5 });
          setTimeout(() => g.remove(), 500);
        }
      }
      prog.setAttribute("y", MY + MH - 3 - (MH - 6) * progreso);
      prog.setAttribute("height", (MH - 6) * progreso);
      if (progreso >= 1) {
        const r = tiempoBien / Math.max(0.1, tiempoTotal);
        fin(r >= 0.7 ? 3 : r >= 0.45 ? 2 : 1);
      } else if (tiempoTotal > 14) fin(1);
    });
  }

  // ---------- SALTEAR EN EL WOK (v58) ----------
  // deslizar para arriba cuando sube la llama, y mover el wok para atraparlo
  else if (paso.t === "saltear") {
    const N = mas(paso.n || 4, 2);
    const ATRAPA = ancho(40, 0.3) + 8 * (MJ.wok || 0);
    const LLAMA = Math.min(0.6, ancho(0.33) + 0.06 * (MJ.wok || 0)); // cuanto dura la llamarada (fraccion del ciclo)
    const WOK_Y = 150;
    let wokX = 150;
    // v60 (rom: "el fuego se ve demasiado falso"): fuego pixelado en capas (rojo, naranja, amarillo,
    // y un corazon claro en la llamarada), con el brillo del fogon y chispitas que suben
    const brilloFuego = el(s, "ellipse", { cx: 150, cy: WOK_Y + 18, rx: 80, ry: 26, fill: "rgb(255,150,60)", opacity: 0.15 });
    const fogon = el(s, "g", {});
    el(fogon, "rect", { x: -60, y: 26, width: 120, height: 8, fill: "rgb(50,46,54)", stroke: TINTA, "stroke-width": 2 });
    const llama = el(s, "g", {});
    const PX = 4; // el "pixel" del fuego
    const COLS = 35; // mas ancho que el wok: en la llamarada lo abraza por los costados
    const capasFuego = Array.from({ length: COLS }, () => [
      el(llama, "rect", { width: PX, fill: "rgb(214,64,40)" }),
      el(llama, "rect", { width: PX, fill: "rgb(250,140,50)" }),
      el(llama, "rect", { width: PX, fill: "rgb(255,214,90)" }),
      el(llama, "rect", { width: PX, fill: "rgb(255,248,210)" }),
      el(llama, "rect", { width: PX / 2, height: PX, fill: "rgb(214,64,40)" }), // la puntita (se afina)
    ]);
    const azul = Array.from({ length: COLS }, () => el(llama, "rect", { width: PX, height: PX, fill: "rgb(110,150,240)" }));
    const chispas = el(s, "g", {});
    const ruidoFuego = Array.from({ length: COLS }, () => Math.random());
    const wok = el(s, "g", {});
    el(wok, "path", { d: "M-62 -10 Q0 40 62 -10 Z", fill: "rgb(60,60,70)", stroke: TINTA, "stroke-width": 3 });
    el(wok, "rect", { x: 60, y: -14, width: 46, height: 8, rx: 4, fill: "rgb(110,72,50)", stroke: TINTA, "stroke-width": 3 });
    const comida = el(s, "image", { href: ctx.plato || "", x: -26, y: -40, width: 52, height: 52, style: "image-rendering:pixelated" });
    const cuenta = el(s, "text", { x: 8, y: 18, "text-anchor": "start", class: "cocina-cuenta" });
    const brillo = el(s, "text", { x: 150, y: 40, "text-anchor": "middle", class: "cocina-cuenta", opacity: 0 });
    let k = 0;
    let buenos = 0;
    let vuelo = null; // { t0, x0, vx, conLlama }
    let ini = null;
    const P = 1500;
    const flama = (t) => {
      const f = (t % P) / P;
      return f > 0.95 - LLAMA && f < 0.95; // la llamarada
    };
    cuenta.textContent = `TOSS 0 / ${N}`;
    ayuda("Swipe up on the big flame · slide to catch it");
    s.addEventListener("pointerdown", (e) => {
      if (!vivo) return;
      e.preventDefault();
      try {
        s.setPointerCapture(e.pointerId);
      } catch (err) {
        /* nada */
      }
      ini = aSvg(e);
    });
    const lanzar = () => {
      const conLlama = flama(performance.now() - t0);
      vuelo = { t0: performance.now() - t0, x0: wokX, vx: (Math.random() < 0.5 ? -1 : 1) * (22 + Math.random() * 32), conLlama };
      sonar(conLlama ? "hito" : "tocar");
    };
    s.addEventListener("pointermove", (e) => {
      if (!vivo || !ini) return;
      const p = aSvg(e);
      if (!vuelo && !ini.lanzo && ini[1] - p[1] > 24) {
        ini.lanzo = true; // deslizo para arriba: sale volando (y con el mismo dedo se mueve el wok)
        lanzar();
      }
      if (vuelo) wokX = Math.max(70, Math.min(230, p[0])); // mientras vuela, el wok sigue al dedo
    });
    s.addEventListener("pointerup", () => {
      ini = null;
    });
    bucle((t) => {
      const alto = flama(t);
      s.dataset.llama = alto ? "1" : "0";
      // el ruido de cada columna cambia de a poco (parpadeo, no temblor)
      if (Math.floor(t / 70) !== s._paso) {
        s._paso = Math.floor(t / 70);
        for (let i = 0; i < COLS; i++) ruidoFuego[i] = ruidoFuego[i] * 0.5 + Math.random() * 0.5;
      }
      const base = WOK_Y + 24; // donde nace el fuego (abajo del wok)
      for (let i = 0; i < COLS; i++) {
        const x = wokX - (COLS * PX) / 2 + i * PX;
        const centro = 1 - Math.abs(i - (COLS - 1) / 2) / ((COLS - 1) / 2); // mas alto en el medio
        const lado = 1 - centro; // 0 en el medio, 1 en las puntas
        const enRango = Math.abs(i - (COLS - 1) / 2) <= 13; // el fuego chico solo debajo del wok
        const hBase = alto ? (lado > 0.93 ? 0 : 22 + 54 * Math.sin(Math.min(1, lado * 1.15) * Math.PI * 0.85)) : enRango ? 4 + 10 * centro : 0;
        const h = Math.round((hBase * (0.35 + 0.95 * ruidoFuego[i] * ruidoFuego[(i + 1) % COLS] + 0.2 * ruidoFuego[i])) / PX) * PX;
        const [rojo, naranja, amarillo, blanco, punta] = capasFuego[i];
        const capa = (r, f) => {
          const hh = Math.max(0, Math.round((h * f) / PX) * PX);
          r.setAttribute("x", x);
          r.setAttribute("y", base - hh);
          r.setAttribute("height", hh);
        };
        capa(rojo, 1);
        capa(naranja, 0.72);
        capa(amarillo, alto ? 0.45 : 0.3);
        capa(blanco, alto && Math.abs(i - (COLS - 1) / 2) <= 6 ? 0.25 : 0);
        punta.setAttribute("x", x + (i % 2 ? 0 : PX / 2));
        punta.setAttribute("y", base - h - PX);
        punta.setAttribute("opacity", h >= PX * 3 ? 1 : 0);
        azul[i].setAttribute("x", x);
        azul[i].setAttribute("y", base);
        azul[i].setAttribute("opacity", Math.abs(i - (COLS - 1) / 2) <= 14 ? (i % 2 ? 0.9 : 0.6) : 0);
      }
      fogon.setAttribute("transform", `translate(${wokX} ${WOK_Y})`);
      brilloFuego.setAttribute("cx", wokX);
      brilloFuego.setAttribute("opacity", alto ? 0.32 : 0.12);
      if (alto && Math.random() < 0.35) {
        const c = el(chispas, "rect", { x: wokX - 40 + Math.random() * 80, y: base - 30, width: 3, height: 3, fill: "rgb(255,220,120)" });
        c._vy = 30 + Math.random() * 40;
        c._t = t;
      }
      for (const c of [...chispas.children]) {
        const dt = (t - c._t) / 1000;
        c.setAttribute("y", base - 30 - c._vy * dt);
        c.setAttribute("opacity", Math.max(0, 1 - dt * 1.6));
        if (dt > 0.7) c.remove();
      }
      wok.setAttribute("transform", `translate(${wokX} ${WOK_Y})`);
      if (vuelo) {
        const tv = (t - vuelo.t0) / 1000;
        const T = vuelo.conLlama ? 1.6 : 1.2;
        const h = vuelo.conLlama ? 120 : 70;
        const x = vuelo.x0 + vuelo.vx * tv;
        const y = WOK_Y - 4 * h * (tv / T) * (1 - tv / T);
        comida.setAttribute("transform", `translate(${x} ${y}) rotate(${tv * 360})`);
        if (tv >= T) {
          const atrapo = Math.abs(x - wokX) < ATRAPA;
          const ok = atrapo && vuelo.conLlama;
          if (ok) buenos++;
          brillo.textContent = !atrapo ? "Oops! It fell" : vuelo.conLlama ? "Wok hei! ✨" : "Wait for the flame";
          brillo.setAttribute("opacity", 1);
          setTimeout(() => brillo.setAttribute("opacity", 0), 700);
          sonar(ok ? "hallazgo" : "no");
          vibrar(ok ? 15 : 30);
          vuelo = null;
          k++;
          cuenta.textContent = `TOSS ${k} / ${N}`;
          if (k >= N) fin(estrellasDeAciertos(buenos, N));
        }
      } else comida.setAttribute("transform", `translate(${wokX} ${WOK_Y - 6})`);
    });
  }

  // ---------- ESTIRAR FIDEOS A MANO (v58, lamian) ----------
  // arrastrar para estirar la masa y soltar en el verde: los hilos se doblan
  else if (paso.t === "lamian") {
    const N = paso.n || 4; // 2, 4, 8, 16 hilos
    const A = 170 - ancho(20); // largo justo (px)
    const B = 170 + ancho(20);
    let largo = 70;
    let hilos = 1;
    let k = 0;
    let buenos = 0;
    let ini = null;
    el(s, "rect", { x: 150 - B / 2, y: 70, width: B, height: 70, fill: "rgba(120,190,110,0.12)" });
    el(s, "line", { x1: 150 - A / 2, y1: 64, x2: 150 - A / 2, y2: 146, stroke: "rgb(80,150,80)", "stroke-width": 3, "stroke-dasharray": "5 4" });
    el(s, "line", { x1: 150 + A / 2, y1: 64, x2: 150 + A / 2, y2: 146, stroke: "rgb(80,150,80)", "stroke-width": 3, "stroke-dasharray": "5 4" });
    el(s, "line", { x1: 150 - B / 2, y1: 64, x2: 150 - B / 2, y2: 146, stroke: "rgb(222,110,100)", "stroke-width": 3, "stroke-dasharray": "5 4" });
    el(s, "line", { x1: 150 + B / 2, y1: 64, x2: 150 + B / 2, y2: 146, stroke: "rgb(222,110,100)", "stroke-width": 3, "stroke-dasharray": "5 4" });
    const masa = el(s, "g", {});
    const manos = [el(s, "circle", { r: 13, fill: "rgb(250,214,190)", stroke: TINTA, "stroke-width": 3 }), el(s, "circle", { r: 13, fill: "rgb(250,214,190)", stroke: TINTA, "stroke-width": 3 })];
    const cuenta = el(s, "text", { x: 8, y: 18, "text-anchor": "start", class: "cocina-cuenta" });
    const pintar = (roto = false) => {
      masa.innerHTML = "";
      const n = Math.min(hilos, 16);
      const grosor = Math.max(2, 22 / Math.sqrt(n));
      for (let i = 0; i < n; i++) {
        const y = 105 + (i - (n - 1) / 2) * Math.min(5, 34 / n);
        if (roto) {
          el(masa, "line", { x1: 150 - largo / 2, y1: y, x2: 150 - 14, y2: y + 6, stroke: MASA, "stroke-width": grosor, "stroke-linecap": "round" });
          el(masa, "line", { x1: 150 + 14, y1: y + 6, x2: 150 + largo / 2, y2: y, stroke: MASA, "stroke-width": grosor, "stroke-linecap": "round" });
        } else el(masa, "path", { d: `M${150 - largo / 2} ${y} Q150 ${y + 8 + largo / 30} ${150 + largo / 2} ${y}`, fill: "none", stroke: MASA, "stroke-width": grosor, "stroke-linecap": "round" });
      }
      // contorno
      masa.insertBefore(el(masa, "path", { d: `M${150 - largo / 2} 105 Q150 ${113 + largo / 30} ${150 + largo / 2} 105`, fill: "none", stroke: TINTA, "stroke-width": grosor + 4, "stroke-linecap": "round", opacity: 0.25 }), masa.firstChild);
      manos[0].setAttribute("cx", 150 - largo / 2 - 8);
      manos[1].setAttribute("cx", 150 + largo / 2 + 8);
      manos.forEach((m) => m.setAttribute("cy", 105));
      cuenta.textContent = `${hilos} STRAND${hilos === 1 ? "" : "S"} · PULL ${k} / ${N}`;
    };
    pintar();
    ayuda("Drag sideways to pull · let go between the green lines");
    s.addEventListener("pointerdown", (e) => {
      if (!vivo) return;
      e.preventDefault();
      try {
        s.setPointerCapture(e.pointerId);
      } catch (err) {
        /* nada */
      }
      ini = aSvg(e);
    });
    s.addEventListener("pointermove", (e) => {
      if (!vivo || !ini) return;
      const p = aSvg(e);
      largo = Math.max(70, Math.min(260, 70 + Math.abs(p[0] - ini[0]) * 1.4));
      pintar();
    });
    const soltar = () => {
      if (!vivo || !ini) return;
      ini = null;
      if (largo < 90) {
        largo = 70;
        pintar();
        return;
      }
      const ok = largo >= A && largo <= B;
      const roto = largo > B + 12;
      if (ok) buenos++;
      sonar(ok ? "tocar" : "no");
      vibrar(ok ? 12 : 30);
      if (roto) pintar(true);
      k++;
      setTimeout(
        () => {
          if (!vivo && k < N) return;
          hilos = ok || !roto ? hilos * 2 : hilos; // si se rompio, no se dobla
          largo = 70;
          pintar();
          if (k >= N) fin(estrellasDeAciertos(buenos, N));
        },
        roto ? 400 : 120,
      );
    };
    s.addEventListener("pointerup", soltar);
    s.addEventListener("pointercancel", soltar);
  }

  // ---------- LAVAR / FROTAR (v58) ----------
  else if (paso.t === "lavar") {
    const I = INGREDIENTES[paso.que] || INGREDIENTES.bokchoy;
    el(s, "ellipse", { cx: 150, cy: 112, rx: 120, ry: 70, fill: "rgb(200,226,240)", stroke: TINTA, "stroke-width": 3 });
    el(s, "ellipse", { cx: 150, cy: 112, rx: 104, ry: 56, fill: "rgb(220,238,248)" });
    // la cosa a lavar
    if (paso.que === "camaron") {
      for (let i = 0; i < 3; i++) {
        const x = 100 + i * 50;
        el(s, "path", { d: `M${x - 18} 100 Q${x} 70 ${x + 18} 100 Q${x + 10} 128 ${x - 6} 118 Z`, fill: I.color, stroke: TINTA, "stroke-width": 3 });
      }
    } else {
      el(s, "ellipse", { cx: 150, cy: 112, rx: 70, ry: 30, fill: I.color, stroke: TINTA, "stroke-width": 3 });
      el(s, "path", { d: "M90 112 L210 112", stroke: I.vena || "rgb(220,240,200)", "stroke-width": 6 });
    }
    const manchas = [];
    const rnd = (a, b) => a + Math.random() * (b - a);
    for (let i = 0; i < 12; i++) {
      const m = { x: rnd(86, 214), y: rnd(92, 130), sucio: 1 };
      m.el = el(s, "circle", { cx: m.x, cy: m.y, r: 8, fill: "rgb(110,84,58)", stroke: "rgb(80,60,40)", "stroke-width": 2, opacity: 0.9 });
      manchas.push(m);
    }
    const burbujas = el(s, "g", {});
    // el tiempo (el agua se enfria)
    el(s, "rect", { x: 30, y: 180, width: 240, height: 10, fill: "rgb(240,230,200)", stroke: TINTA, "stroke-width": 2 });
    const tiempo = el(s, "rect", { x: 31, y: 181, width: 238, height: 8, fill: "rgb(120,170,220)" });
    ayuda("Rub back and forth to wash it clean");
    const T = 7000 * (1 - 0.25 * D);
    let frotando = false;
    let prev = null;
    s.addEventListener("pointerdown", (e) => {
      if (!vivo) return;
      e.preventDefault();
      try {
        s.setPointerCapture(e.pointerId);
      } catch (err) {
        /* nada */
      }
      frotando = true;
      prev = aSvg(e);
    });
    s.addEventListener("pointermove", (e) => {
      if (!vivo || !frotando) return;
      const p = aSvg(e);
      const d = Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      for (const m of manchas) {
        if (m.sucio > 0 && Math.hypot(m.x - p[0], m.y - p[1]) < 20) {
          m.sucio = Math.max(0, m.sucio - d * 0.02);
          m.el.setAttribute("opacity", 0.9 * m.sucio);
        }
      }
      if (Math.random() < 0.3) {
        const b = el(burbujas, "circle", { cx: p[0] + rnd(-10, 10), cy: p[1] + rnd(-10, 10), r: rnd(3, 6), fill: "rgba(255,255,255,0.8)", stroke: "rgba(120,170,220,0.9)", "stroke-width": 1 });
        setTimeout(() => b.remove(), 600);
      }
      prev = p;
      if (manchas.every((m) => m.sucio <= 0.05)) {
        const r = (performance.now() - t0) / T;
        fin(r <= 0.65 ? 3 : 2);
      }
    });
    const soltar = () => {
      frotando = false;
    };
    s.addEventListener("pointerup", soltar);
    s.addEventListener("pointercancel", soltar);
    bucle((t) => {
      const f = Math.max(0, 1 - t / T);
      tiempo.setAttribute("width", 238 * f);
      if (t >= T) {
        const limpias = manchas.filter((m) => m.sucio <= 0.05).length / manchas.length;
        fin(limpias >= 0.8 ? 2 : 1);
      }
    });
  }

  // ---------- ESPOLVOREAR (v58) ----------
  // mantener apretado y mover el salero: cubrir parejo (ni de menos, ni de mas)
  else if (paso.t === "espolvorear") {
    const polvo = paso.color || "rgb(255,255,255)";
    const ZONAS = 5;
    const ZX0 = 50;
    const ZW = 40;
    el(s, "ellipse", { cx: 150, cy: 134, rx: 120, ry: 30, fill: "rgb(252,252,250)", stroke: TINTA, "stroke-width": 3 });
    el(s, "image", { href: ctx.plato || "", x: 90, y: 42, width: 120, height: 110, style: "image-rendering:pixelated" });
    const capa = el(s, "g", {});
    const barras = [];
    const cant = Array(ZONAS).fill(0);
    for (let i = 0; i < ZONAS; i++) {
      const x = ZX0 + i * ZW + 4;
      el(s, "rect", { x, y: 172, width: ZW - 8, height: 12, fill: "rgb(240,230,200)", stroke: TINTA, "stroke-width": 2 });
      el(s, "rect", { x: x + (ZW - 8) * (0.75 - ancho(0.25, 0.3)), y: 172, width: (ZW - 8) * Math.min(0.25 + ancho(0.25, 0.3), 1 - (0.75 - ancho(0.25, 0.3))), height: 12, fill: "rgba(120,190,110,0.5)" });
      barras.push(el(s, "rect", { x: x + 1, y: 174, width: 0, height: 8, fill: polvo === "rgb(255,255,255)" ? "rgb(200,200,210)" : polvo }));
    }
    const salero = el(s, "g", { opacity: 0.9 });
    el(salero, "rect", { x: -12, y: -40, width: 24, height: 30, rx: 5, fill: "rgb(236,232,224)", stroke: TINTA, "stroke-width": 3 });
    el(salero, "rect", { x: -12, y: -14, width: 24, height: 6, fill: "rgb(170,170,180)", stroke: TINTA, "stroke-width": 2 });
    salero.setAttribute("transform", "translate(150 50)");
    ayuda("Hold and move to sprinkle evenly · then Ready");
    let apretado = false;
    let x = 150;
    s.addEventListener("pointerdown", (e) => {
      if (!vivo) return;
      e.preventDefault();
      try {
        s.setPointerCapture(e.pointerId);
      } catch (err) {
        /* nada */
      }
      apretado = true;
      x = aSvg(e)[0];
    });
    s.addEventListener("pointermove", (e) => {
      if (!vivo) return;
      x = Math.max(40, Math.min(260, aSvg(e)[0]));
    });
    const soltar = () => {
      apretado = false;
    };
    s.addEventListener("pointerup", soltar);
    s.addEventListener("pointercancel", soltar);
    bucle(() => {
      salero.setAttribute("transform", `translate(${x} ${apretado ? 54 : 46}) rotate(${apretado ? 180 : 160})`);
      if (!apretado) return;
      for (let j = 0; j < 2; j++) {
        const px = x + (Math.random() - 0.5) * 28;
        const py = 70 + Math.random() * 70;
        el(capa, "rect", { x: px, y: py, width: 2, height: 2, fill: polvo, stroke: "rgba(0,0,0,0.25)", "stroke-width": 0.5 });
        const z = Math.floor((px - ZX0) / ZW);
        if (z >= 0 && z < ZONAS) {
          cant[z] = Math.min(1.4, cant[z] + 0.008);
          barras[z].setAttribute("width", Math.min(1, cant[z]) * (ZW - 10));
          barras[z].setAttribute("fill", cant[z] > 1 ? "rgb(222,110,100)" : polvo === "rgb(255,255,255)" ? "rgb(200,200,210)" : polvo);
        }
      }
    });
    boton("Ready ✓", () => {
      const bien = cant.filter((c) => c >= 0.75 - ancho(0.25, 0.3) && c <= 0.75 + ancho(0.25, 0.3)).length;
      fin(bien >= ZONAS ? 3 : bien >= ZONAS - 2 ? 2 : 1);
    });
  }

  // ---------- DIBUJAR / ESTAMPAR (v58) ----------
  // seguir el dibujo punteado con el dedo, de una sola vez
  else if (paso.t === "dibujar") {
    const forma = paso.forma || "corazon";
    const fondoColor = paso.fondo || "rgb(214,170,104)";
    const tinta = paso.tinta || "rgb(252,248,236)";
    el(s, "circle", { cx: 150, cy: 104, r: 84, fill: fondoColor, stroke: TINTA, "stroke-width": 3 });
    // los puntos del camino
    const pts = [];
    const N = 40;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * Math.PI * 2;
      let x;
      let y;
      if (forma === "corazon") {
        x = 16 * Math.sin(t) ** 3;
        y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        x = 150 + x * 3.6;
        y = 100 + y * 3.6;
      } else if (forma === "flor") {
        const r = 40 + 16 * Math.cos(5 * t);
        x = 150 + r * Math.cos(t);
        y = 104 + r * Math.sin(t);
      } else {
        // espiral (arequipe en la oblea)
        const r = 8 + (i / N) * 62;
        x = 150 + r * Math.cos(t * 2);
        y = 104 + r * Math.sin(t * 2);
      }
      pts.push([x, y]);
    }
    el(s, "polyline", { points: pts.map((p) => p.join(",")).join(" "), fill: "none", stroke: "rgba(22,20,22,0.35)", "stroke-width": 4, "stroke-dasharray": "3 6", "stroke-linecap": "round" });
    const inicio = el(s, "circle", { cx: pts[0][0], cy: pts[0][1], r: 8, fill: "rgb(120,190,110)", stroke: TINTA, "stroke-width": 2 });
    const trazo = el(s, "polyline", { points: "", fill: "none", stroke: tinta, "stroke-width": 7, "stroke-linecap": "round", "stroke-linejoin": "round" });
    const tocados = new Set();
    let dibujados = [];
    let fuera = 0;
    let dentro = 0;
    let dibujando = false;
    ayuda("Start at the green dot and trace the shape in one go");
    s.addEventListener("pointerdown", (e) => {
      if (!vivo) return;
      e.preventDefault();
      try {
        s.setPointerCapture(e.pointerId);
      } catch (err) {
        /* nada */
      }
      dibujando = true;
      dibujados = [aSvg(e)];
    });
    s.addEventListener("pointermove", (e) => {
      if (!vivo || !dibujando) return;
      const p = aSvg(e);
      dibujados.push(p);
      trazo.setAttribute("points", dibujados.map((q) => q.map((v) => v.toFixed(1)).join(",")).join(" "));
      let dmin = 1e9;
      pts.forEach((q, i) => {
        const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (d < 12) tocados.add(i);
        dmin = Math.min(dmin, d);
      });
      if (dmin < 14) dentro++;
      else fuera++;
      inicio.setAttribute("opacity", 0.3);
    });
    const soltar = () => {
      if (!vivo || !dibujando) return;
      dibujando = false;
      const cubierto = tocados.size / pts.length;
      if (cubierto < 0.35) {
        // casi nada: que lo intente de nuevo
        dibujados = [];
        tocados.clear();
        fuera = 0;
        dentro = 0;
        trazo.setAttribute("points", "");
        inicio.setAttribute("opacity", 1);
        return;
      }
      const prolijo = dentro / Math.max(1, dentro + fuera);
      const exige = Math.max(0.6, Math.min(0.88, 0.75 + 0.12 * D));
      fin(cubierto >= 0.85 && prolijo >= exige ? 3 : cubierto >= 0.6 && prolijo >= 0.5 ? 2 : 1);
    };
    s.addEventListener("pointerup", soltar);
    s.addEventListener("pointercancel", soltar);
  }

  // ---------- APLASTAR (v58, patacones y arepas) ----------
  // tocar para aplastar; parar (Ready) cuando quede del grosor de la franja
  else if (paso.t === "aplastar") {
    const I = INGREDIENTES[paso.que] || INGREDIENTES.platano;
    const PIEZAS = paso.n || 2;
    const A = 0.35 - ancho(0.07);
    const B = 0.35 + ancho(0.07);
    let grosor = 1;
    let pieza = 0;
    const notas = [];
    const g = el(s, "g", {});
    const prensa = el(s, "g", {});
    el(prensa, "rect", { x: -60, y: -14, width: 120, height: 14, rx: 4, fill: "rgb(170,124,72)", stroke: TINTA, "stroke-width": 3 });
    el(prensa, "rect", { x: -8, y: -50, width: 16, height: 38, rx: 4, fill: "rgb(196,150,100)", stroke: TINTA, "stroke-width": 3 });
    // la guia del grosor
    const BASE = 150;
    const ALTO = 60;
    el(s, "rect", { x: 60, y: BASE - ALTO * B, width: 180, height: ALTO * (B - A), fill: "rgba(120,190,110,0.3)", stroke: "rgb(80,150,80)", "stroke-width": 2, "stroke-dasharray": "5 4" });
    el(s, "rect", { x: 40, y: BASE, width: 220, height: 10, fill: "rgb(190,150,104)", stroke: TINTA, "stroke-width": 3 });
    const cuenta = el(s, "text", { x: 8, y: 18, "text-anchor": "start", class: "cocina-cuenta" });
    const pintar = () => {
      g.innerHTML = "";
      const h = ALTO * grosor;
      const w = 60 + (1 - grosor) * 70;
      el(g, "ellipse", { cx: 150, cy: BASE - h / 2, rx: w / 2, ry: h / 2, fill: I.color, stroke: TINTA, "stroke-width": 3 });
      if (grosor < 0.22) for (let i = 0; i < 3; i++) el(g, "path", { d: `M${140 + i * 10} ${BASE - h} l4 ${h * 0.8}`, stroke: TINTA, "stroke-width": 2 }); // se rajo
      prensa.setAttribute("transform", `translate(150 ${BASE - h - 2})`);
      cuenta.textContent = `PIECE ${pieza + 1} / ${PIEZAS}`;
    };
    pintar();
    ayuda("Tap to smash · stop in the green band, then Ready");
    s.addEventListener("pointerdown", (e) => {
      if (!vivo) return;
      e.preventDefault();
      grosor = Math.max(0.12, grosor - (0.08 + Math.random() * 0.08));
      sonar("tocar");
      vibrar(15);
      pintar();
    });
    boton("Ready ✓", () => {
      if (!vivo) return;
      const e = grosor >= A && grosor <= B ? 3 : Math.abs(grosor - (A + B) / 2) <= 0.18 ? 2 : 1;
      notas.push(e);
      pieza++;
      if (pieza >= PIEZAS) fin(Math.round(notas.reduce((x, y) => x + y, 0) / notas.length));
      else {
        sonar(e === 3 ? "hito" : "mimo");
        grosor = 1;
        pintar();
      }
    });
  }

  // ---------- AGITAR (v58) ----------
  // mover la coctelera de un lado al otro (o sacudir el telefono) hasta mezclar
  else if (paso.t === "agitar") {
    const color = paso.color || "rgb(214,170,120)";
    const vaso = el(s, "g", {});
    el(vaso, "path", { d: "M-30 -60 L30 -60 L24 50 L-24 50 Z", fill: "rgba(255,255,255,0.6)", stroke: TINTA, "stroke-width": 3 });
    const liq = el(vaso, "path", { d: "M-27 -10 L27 -10 L24 47 L-24 47 Z", fill: color });
    el(vaso, "rect", { x: -32, y: -76, width: 64, height: 18, rx: 6, fill: "rgb(190,196,206)", stroke: TINTA, "stroke-width": 3 });
    const capas = [el(vaso, "rect", { x: -26, y: -10, width: 52, height: 18, fill: "rgb(246,240,226)", opacity: 0.9 })];
    el(s, "rect", { x: 30, y: 180, width: 240, height: 10, fill: "rgb(240,230,200)", stroke: TINTA, "stroke-width": 2 });
    const barra = el(s, "rect", { x: 31, y: 181, width: 0, height: 8, fill: "rgb(120,190,110)" });
    ayuda("Shake it! Drag fast side to side (or shake your phone)");
    let x = 150;
    let mezcla = 0;
    let ultX = null;
    let dirPrev = 0;
    let arrastrando = false;
    const sumar = (n) => {
      mezcla = Math.min(1, mezcla + n);
      sonar("tocar");
    };
    s.addEventListener("pointerdown", (e) => {
      if (!vivo) return;
      e.preventDefault();
      try {
        s.setPointerCapture(e.pointerId);
      } catch (err) {
        /* nada */
      }
      arrastrando = true;
      ultX = aSvg(e)[0];
    });
    s.addEventListener("pointermove", (e) => {
      if (!vivo || !arrastrando) return;
      const px = aSvg(e)[0];
      const d = px - ultX;
      if (Math.abs(d) > 4) {
        const dir = Math.sign(d);
        if (dirPrev && dir !== dirPrev) sumar(0.07); // cada cambio de direccion = una sacudida
        dirPrev = dir;
        ultX = px;
      }
      x = Math.max(80, Math.min(220, 150 + (px - 150) * 0.8));
    });
    const soltar = () => {
      arrastrando = false;
    };
    s.addEventListener("pointerup", soltar);
    s.addEventListener("pointercancel", soltar);
    // el telefono de verdad (solo si ya tiene permiso: no pedimos nada)
    const movio = (ev) => {
      const a = ev.accelerationIncludingGravity || ev.acceleration;
      if (!vivo || !a) return;
      const m = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
      if (m > 22) sumar(0.05);
    };
    window.addEventListener("devicemotion", movio);
    const quitarMov = () => window.removeEventListener("devicemotion", movio);
    bucle((t) => {
      const temblor = arrastrando ? Math.sin(t / 30) * 2 : 0;
      vaso.setAttribute("transform", `translate(${x + temblor} 110) rotate(${(x - 150) * 0.15})`);
      barra.setAttribute("width", 238 * mezcla);
      capas[0].setAttribute("opacity", 0.9 * (1 - mezcla));
      liq.setAttribute("fill", color);
      if (mezcla >= 1) {
        quitarMov();
        const seg = t / 1000;
        const k = 1 - 0.25 * D;
        fin(seg <= 4 * k ? 3 : seg <= 7 * k ? 2 : 1);
      }
    });
    const destruirViejo = () => quitarMov();
    ctx._alDestruir = destruirViejo;
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
      if (ctx._alDestruir) ctx._alDestruir();
    },
    resolver(e = 3) {
      if (!terminado) fin(e);
    },
  };
}
