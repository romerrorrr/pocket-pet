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

import { dibujarCoccion } from "./coccion.js";

const SVG = "http://www.w3.org/2000/svg";
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const RELLENOS = {
  carne: { nombre: "pork", color: "rgb(200,120,96)", sombra: "rgb(160,84,70)" },
  verdura: { nombre: "veggies", color: "rgb(120,170,90)", sombra: "rgb(84,130,64)" },
  frijol: { nombre: "red bean", color: "rgb(150,50,60)", sombra: "rgb(110,30,44)" },
  caldo: { nombre: "pork & soup", color: "rgb(214,150,100)", sombra: "rgb(176,110,70)" },
  camaron: { nombre: "shrimp", color: "rgb(252,232,220)", sombra: "rgb(232,180,160)" }, // clarito: los camarones encima se ven
  loto: { nombre: "lotus paste", color: "rgb(200,150,90)", sombra: "rgb(160,110,60)" },
  queso: { nombre: "cheese", color: "rgb(250,230,150)", sombra: "rgb(220,190,100)" },
  pollo: { nombre: "chicken & potato", color: "rgb(230,190,120)", sombra: "rgb(196,150,80)" },
  // v61
  arroz: { nombre: "sticky rice", color: "rgb(250,248,240)", sombra: "rgb(220,214,200)" },
  natilla: { nombre: "golden custard", color: "rgb(255,200,80)", sombra: "rgb(226,160,50)" },
  sesamo: { nombre: "black sesame", color: "rgb(60,50,56)", sombra: "rgb(30,26,30)" },
  repollo: { nombre: "cabbage & carrot", color: "rgb(190,220,140)", sombra: "rgb(150,190,100)" },
};
export const LIQUIDOS = {
  agua: { nombre: "hot water", color: "rgb(200,226,240)" },
  te: { nombre: "tea", color: "rgb(170,200,120)" },
  leche: { nombre: "milk", color: "rgb(246,240,226)" },
  cafe: { nombre: "coffee", color: "rgb(90,56,40)" },
  jarabe: { nombre: "osmanthus syrup", color: "rgb(250,210,110)" },
  jugo: { nombre: "passion fruit juice", color: "rgb(255,196,60)" },
  // v61
  chocolate: { nombre: "hot chocolate", color: "rgb(110,62,40)" },
  natilla: { nombre: "custard", color: "rgb(255,214,110)" },
  masa: { nombre: "batter", color: "rgb(250,230,180)" },
  huevo: { nombre: "beaten egg", color: "rgb(255,220,90)" },
  caldo: { nombre: "broth", color: "rgb(214,170,110)" },
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
  // v61
  tofu: { nombre: "tofu", color: "rgb(250,246,232)", vena: "rgb(236,228,206)", alto: 40 },
  res: { nombre: "beef", color: "rgb(190,80,70)", vena: "rgb(240,200,190)", alto: 34 },
  repollo: { nombre: "cabbage", color: "rgb(190,226,160)", vena: "rgb(236,246,220)", alto: 40, redondo: true },
  queso: { nombre: "cheese", color: "rgb(250,226,140)", vena: "rgb(255,240,190)", alto: 40 },
  chocolate: { nombre: "chocolate", color: "rgb(110,62,40)", vena: "rgb(150,90,60)", alto: 40 },
  coco: { nombre: "coconut", color: "rgb(250,250,246)", vena: "rgb(170,120,80)", alto: 40 },
  mango: { nombre: "mango", color: "rgb(150,190,70)", pulpa: "rgb(255,200,70)", alto: 40, redondo: true },
  lulo: { nombre: "lulo", color: "rgb(240,160,40)", vena: "rgb(200,230,120)", pulpa: "rgb(200,230,120)", alto: 40, redondo: true },
  papaya: { nombre: "papaya", color: "rgb(250,140,70)", vena: "rgb(60,40,40)", alto: 40, redondo: true },
  maduro: { nombre: "ripe plantain", color: "rgb(240,200,80)", pulpa: "rgb(250,220,140)", alto: 34, redondo: true },
  loto: { nombre: "lotus root", color: "rgb(214,180,140)", pulpa: "rgb(246,236,220)", alto: 40, redondo: true },
  hoja: { nombre: "leaves", color: "rgb(110,160,80)", vena: "rgb(170,210,130)", alto: 40 },
  pollo: { nombre: "chicken", color: "rgb(240,214,170)", vena: "rgb(250,232,200)", alto: 44, redondo: true },
  arroz: { nombre: "rice", color: "rgb(250,248,240)", alto: 30 },
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


// ---------- v61: los ingredientes dibujados de verdad (no rectangulos) ----------
// rom: "hay varias cosas como los shrimps … que se ven como figuras random"
let idClip = 0;
const CAMARON = "rgb(250,160,130)";
const CAMARON_OSC = "rgb(220,104,90)";
/** Un camaron curvado (forma de C), con segmentos, cola y patitas. (x, y) = centro, k = escala. */
export function dibujarCamaron(padre, x, y, k = 1, girado = false) {
  const g = el(padre, "g", { transform: `translate(${x} ${y}) scale(${girado ? -k : k} ${k})` });
  // patitas
  for (let i = 0; i < 4; i++) el(g, "line", { x1: -2 + i * 4, y1: 8, x2: -4 + i * 4, y2: 15, stroke: CAMARON_OSC, "stroke-width": 1.5 });
  // el cuerpo: un arco grueso (C) con borde de tinta
  el(g, "path", { d: "M14 -6 A14 14 0 1 0 6 13", fill: "none", stroke: TINTA, "stroke-width": 13, "stroke-linecap": "round" });
  el(g, "path", { d: "M14 -6 A14 14 0 1 0 6 13", fill: "none", stroke: CAMARON, "stroke-width": 9, "stroke-linecap": "round" });
  // los segmentos
  for (const a of [200, 235, 270, 305, 340]) {
    const r = (a * Math.PI) / 180;
    el(g, "line", { x1: 9.5 * Math.cos(r), y1: 9.5 * Math.sin(r), x2: 18.5 * Math.cos(r), y2: 18.5 * Math.sin(r), stroke: "rgb(255,214,196)", "stroke-width": 1.6 });
  }
  // la cola en abanico
  el(g, "path", { d: "M6 13 L0 22 L8 20 L14 24 L12 14 Z", fill: CAMARON_OSC, stroke: TINTA, "stroke-width": 2, "stroke-linejoin": "round" });
  // la cabeza y el ojito
  el(g, "circle", { cx: 15, cy: -7, r: 2, fill: TINTA });
  el(g, "path", { d: "M16 -10 Q24 -18 30 -14", fill: "none", stroke: CAMARON_OSC, "stroke-width": 1.5 });
  return g;
}

/** Un pescado entero de perfil (cabeza a la izquierda). */
function dibujarPescado(g, x0, x1, cy, h) {
  const L = x1 - x0;
  el(g, "path", { d: `M${x1 - 18} ${cy} L${x1} ${cy - h * 0.55} L${x1 - 4} ${cy} L${x1} ${cy + h * 0.55} Z`, fill: "rgb(200,170,140)", stroke: TINTA, "stroke-width": 3, "stroke-linejoin": "round" });
  el(g, "ellipse", { cx: x0 + L * 0.45, cy, rx: L * 0.46, ry: h / 2, fill: "rgb(226,214,196)", stroke: TINTA, "stroke-width": 3 });
  el(g, "path", { d: `M${x0 + L * 0.1} ${cy + 3} Q${x0 + L * 0.45} ${cy + h * 0.32} ${x0 + L * 0.85} ${cy + 2}`, fill: "none", stroke: "rgb(250,244,232)", "stroke-width": 4 }); // la panza clara
  for (let i = 0; i < 6; i++) {
    const cx = x0 + L * (0.3 + i * 0.09);
    el(g, "path", { d: `M${cx} ${cy - h * 0.28} q5 6 0 12`, fill: "none", stroke: "rgb(176,160,140)", "stroke-width": 2 }); // escamas
  }
  el(g, "path", { d: `M${x0 + L * 0.2} ${cy - h * 0.38} Q${x0 + L * 0.22} ${cy} ${x0 + L * 0.2} ${cy + h * 0.38}`, fill: "none", stroke: TINTA, "stroke-width": 2 }); // agalla
  el(g, "circle", { cx: x0 + L * 0.1, cy: cy - h * 0.12, r: 4, fill: "#fff", stroke: TINTA, "stroke-width": 2 });
  el(g, "circle", { cx: x0 + L * 0.1, cy: cy - h * 0.12, r: 1.6, fill: TINTA });
  el(g, "path", { d: `M${x0 + L * 0.42} ${cy - h / 2 + 1} L${x0 + L * 0.5} ${cy - h * 0.85} L${x0 + L * 0.62} ${cy - h / 2 + 2} Z`, fill: "rgb(200,170,140)", stroke: TINTA, "stroke-width": 2, "stroke-linejoin": "round" }); // aleta
}

/** El ingrediente entero, de x0 a x1, centrado en cy (para cortar). */
export function dibujarIngrediente(g, que, x0, x1, cy) {
  const I = INGREDIENTES[que] || INGREDIENTES.cebollin;
  const h = I.alto;
  const L = x1 - x0;
  const borde = { stroke: TINTA, "stroke-width": 3 };
  if (que === "pescado") return dibujarPescado(g, x0, x1, cy, h);
  if (que === "cebollin") {
    // un manojito de tres cebollines (parte blanca con raicitas, parte verde)
    for (let j = 0; j < 3; j++) {
      const y = cy - 18 + j * 14;
      const h2 = 12;
      const xb = x0 + 14 + (j % 2) * 4;
      for (let i = 0; i < 4; i++) el(g, "line", { x1: xb, y1: y - 2 + i * 1.5, x2: xb - 10, y2: y - 6 + i * 4, stroke: "rgb(200,190,160)", "stroke-width": 1.5 }); // raicitas
      el(g, "rect", { x: xb, y: y - h2 / 2, width: L * 0.26, height: h2, rx: h2 / 2, fill: "rgb(248,248,238)", ...borde });
      el(g, "rect", { x: xb + L * 0.22, y: y - h2 / 2, width: L * 0.7 - (j % 2) * 8, height: h2, rx: 3, fill: "rgb(110,180,80)", ...borde });
      el(g, "rect", { x: xb + L * 0.22, y: y - h2 / 2 + 2.5, width: L * 0.7 - (j % 2) * 8, height: 2.5, fill: "rgb(170,220,130)" });
    }
    return;
  }
  if (que === "cerdo" || que === "panceta") {
    el(g, "rect", { x: x0, y: cy - h / 2, width: L, height: h, rx: 4, fill: "rgb(230,140,120)", ...borde });
    const capas = [["rgb(170,90,60)", 0, 0.16], ["rgb(252,236,214)", 0.16, 0.34], ["rgb(214,110,96)", 0.34, 0.58], ["rgb(252,236,214)", 0.58, 0.72], ["rgb(214,110,96)", 0.72, 1]];
    for (const [c, a, b] of capas) el(g, "rect", { x: x0 + 1.5, y: cy - h / 2 + 1.5 + (h - 3) * a, width: L - 3, height: (h - 3) * (b - a), fill: c });
    el(g, "rect", { x: x0, y: cy - h / 2, width: L, height: h, rx: 4, fill: "none", ...borde });
    return;
  }
  if (que === "platano") {
    // platano verde: gordito y curvo, con sus puntas oscuras
    el(g, "path", { d: `M${x0 + 4} ${cy - 2} Q${x0 + L / 2} ${cy + 44} ${x1 - 4} ${cy - 4} Q${x1 + 4} ${cy - 22} ${x1 - 16} ${cy - 20} Q${x0 + L / 2} ${cy + 4} ${x0 + 16} ${cy - 22} Q${x0 - 2} ${cy - 20} ${x0 + 4} ${cy - 2} Z`, fill: "rgb(140,186,76)", ...borde });
    el(g, "path", { d: `M${x0 + 18} ${cy - 8} Q${x0 + L / 2} ${cy + 26} ${x1 - 18} ${cy - 10}`, fill: "none", stroke: "rgb(186,220,120)", "stroke-width": 4 });
    el(g, "path", { d: `M${x0 + 10} ${cy - 2} Q${x0 + L / 2} ${cy + 36} ${x1 - 10} ${cy - 4}`, fill: "none", stroke: "rgb(110,150,60)", "stroke-width": 2 });
    el(g, "rect", { x: x1 - 12, y: cy - 22, width: 7, height: 7, fill: "rgb(90,70,40)" });
    el(g, "rect", { x: x0 + 4, y: cy - 8, width: 6, height: 6, fill: "rgb(90,70,40)" });
    return;
  }
  if (que === "papa") {
    for (let i = 0; i < 2; i++) {
      const cx = x0 + L * (0.27 + i * 0.47);
      el(g, "ellipse", { cx, cy, rx: L * 0.24, ry: h / 2, fill: "rgb(222,184,120)", ...borde });
      for (const [dx, dy] of [[-8, -6], [6, 4], [12, -8], [-14, 6]]) el(g, "circle", { cx: cx + dx, cy: cy + dy, r: 1.6, fill: "rgb(150,110,60)" });
    }
    return;
  }
  if (que === "fruta") {
    for (let i = 0; i < 2; i++) {
      const cx = x0 + L * (0.27 + i * 0.47);
      el(g, "ellipse", { cx, cy, rx: L * 0.22, ry: h / 2, fill: "rgb(130,70,120)", ...borde });
      el(g, "ellipse", { cx: cx - 8, cy: cy - 8, rx: 6, ry: 4, fill: "rgb(170,110,160)" });
    }
    return;
  }
  // v61 pasada: los de las recetas nuevas, dibujados (no rectangulos)
  if (que === "tofu") {
    el(g, "rect", { x: x0 + 8, y: cy - 16, width: L - 16, height: 38, rx: 5, fill: "rgb(236,228,206)", ...borde }); // el costado
    el(g, "rect", { x: x0 + 8, y: cy - 24, width: L - 16, height: 22, rx: 5, fill: "rgb(252,250,240)", ...borde }); // la cara de arriba
    el(g, "rect", { x: x0 + 18, y: cy - 20, width: L * 0.4, height: 4, rx: 2, fill: "#fff" });
    return;
  }
  if (que === "res") {
    el(g, "path", { d: `M${x0 + 8} ${cy - 14} Q${x0 + 12} ${cy - 32} ${x0 + L * 0.35} ${cy - 30} Q${x0 + L * 0.7} ${cy - 36} ${x1 - 10} ${cy - 22} Q${x1 + 4} ${cy} ${x1 - 12} ${cy + 24} Q${x0 + L * 0.5} ${cy + 34} ${x0 + 14} ${cy + 22} Q${x0 - 2} ${cy + 6} ${x0 + 8} ${cy - 14} Z`, fill: "rgb(196,70,66)", ...borde });
    el(g, "path", { d: `M${x0 + 12} ${cy - 18} Q${x0 + L * 0.4} ${cy - 32} ${x1 - 12} ${cy - 20}`, fill: "none", stroke: "rgb(252,236,220)", "stroke-width": 5 }); // la grasa del borde
    for (const [fx, fy, fw] of [[0.18, -4, 0.14], [0.42, 6, 0.18], [0.68, -6, 0.14], [0.3, 16, 0.12], [0.58, -14, 0.1], [0.75, 12, 0.1]]) el(g, "path", { d: `M${x0 + L * fx} ${cy + fy} q${(L * fw) / 2} -5 ${L * fw} 2`, fill: "none", stroke: "rgb(244,200,190)", "stroke-width": 2.5 }); // el marmoleo
    return;
  }
  if (que === "mango") {
    // el mango biche ya pelado: verde clarito, largo
    el(g, "ellipse", { cx: x0 + L / 2, cy, rx: L * 0.47, ry: 24, fill: "rgb(218,228,140)", ...borde });
    el(g, "ellipse", { cx: x0 + L / 2, cy: cy + 2, rx: L * 0.32, ry: 10, fill: "rgb(236,240,180)" });
    el(g, "path", { d: `M${x0 + 20} ${cy - 10} Q${x0 + L / 2} ${cy - 22} ${x1 - 20} ${cy - 10}`, fill: "none", stroke: "rgb(246,248,210)", "stroke-width": 3 });
    return;
  }
  if (que === "repollo") {
    // medio repollo: hojas verdes por fuera y las capas claras por dentro
    el(g, "ellipse", { cx: x0 + L / 2, cy, rx: L * 0.42, ry: 34, fill: "rgb(120,180,90)", ...borde });
    el(g, "ellipse", { cx: x0 + L / 2, cy, rx: L * 0.36, ry: 28, fill: "rgb(214,236,180)" });
    for (let i = 1; i <= 4; i++) el(g, "ellipse", { cx: x0 + L / 2 + 2 * i, cy: cy + i, rx: L * 0.36 - i * 11, ry: 28 - i * 6, fill: "none", stroke: "rgb(170,206,130)", "stroke-width": 2 });
    el(g, "path", { d: `M${x0 + L / 2 - 10} ${cy + 24} Q${x0 + L / 2} ${cy + 4} ${x0 + L / 2 + 6} ${cy - 2}`, fill: "none", stroke: "rgb(246,250,226)", "stroke-width": 5 }); // el tronquito
    return;
  }
  if (que === "lulo") {
    // dos lulos: naranjas, con la pulpa verde y semillitas
    for (let i = 0; i < 2; i++) {
      const cx = x0 + L * (0.27 + i * 0.47);
      el(g, "circle", { cx, cy, r: 30, fill: "rgb(240,150,40)", ...borde });
      el(g, "circle", { cx, cy, r: 22, fill: "rgb(200,226,120)" });
      for (let j = 0; j < 10; j++) {
        const a = (j / 10) * Math.PI * 2;
        el(g, "circle", { cx: cx + 12 * Math.cos(a), cy: cy + 12 * Math.sin(a), r: 1.8, fill: "rgb(120,140,60)" });
      }
      el(g, "circle", { cx, cy, r: 5, fill: "rgb(226,240,170)" });
    }
    return;
  }
  if (que === "papaya") {
    // media papaya pelada: pulpa naranja y las semillas negras en el centro
    el(g, "path", { d: `M${x0 + 8} ${cy} Q${x0 + 10} ${cy - 30} ${x0 + L * 0.5} ${cy - 28} Q${x1 - 4} ${cy - 26} ${x1 - 6} ${cy} Q${x1 - 4} ${cy + 26} ${x0 + L * 0.5} ${cy + 28} Q${x0 + 10} ${cy + 30} ${x0 + 8} ${cy} Z`, fill: "rgb(250,150,90)", ...borde });
    el(g, "ellipse", { cx: x0 + L * 0.52, cy, rx: L * 0.3, ry: 11, fill: "rgb(236,120,70)" });
    for (let j = 0; j < 16; j++) el(g, "circle", { cx: x0 + L * 0.27 + j * L * 0.033, cy: cy + (j % 2 ? 4 : -4), r: 2.8, fill: "rgb(50,36,36)" });
    return;
  }
  if (que === "maduro") {
    // el maduro pelado: amarillo dorado, gordito y curvo
    el(g, "path", { d: `M${x0 + 4} ${cy - 2} Q${x0 + L / 2} ${cy + 44} ${x1 - 4} ${cy - 4} Q${x1 + 4} ${cy - 22} ${x1 - 16} ${cy - 20} Q${x0 + L / 2} ${cy + 4} ${x0 + 16} ${cy - 22} Q${x0 - 2} ${cy - 20} ${x0 + 4} ${cy - 2} Z`, fill: "rgb(246,204,96)", ...borde });
    el(g, "path", { d: `M${x0 + 18} ${cy - 8} Q${x0 + L / 2} ${cy + 26} ${x1 - 18} ${cy - 10}`, fill: "none", stroke: "rgb(252,232,160)", "stroke-width": 4 });
    for (const fx of [0.22, 0.38, 0.55, 0.7, 0.82]) el(g, "circle", { cx: x0 + L * fx, cy: cy + 10 - 22 * Math.abs(fx - 0.5), r: 2, fill: "rgb(200,140,60)" });
    return;
  }
  // los demas: una pieza con su veta
  el(g, "rect", { x: x0, y: cy - h / 2, width: L, height: h, rx: I.redondo ? h / 2.4 : 4, fill: I.color, ...borde });
  if (I.vena) el(g, "rect", { x: x0 + 4, y: cy - h / 2 + h * 0.3, width: L - 8, height: Math.max(2, h * 0.16), fill: I.vena });
}

/** Una hoja de bok choy (tallo blanco, hoja verde con nervaduras). */
function dibujarBokchoy(g, cx, cy) {
  el(g, "path", { d: `M${cx - 80} ${cy + 6} Q${cx - 20} ${cy + 18} ${cx + 10} ${cy + 8} L${cx + 10} ${cy - 4} Q${cx - 20} ${cy - 12} ${cx - 80} ${cy - 2} Z`, fill: "rgb(236,244,226)", stroke: TINTA, "stroke-width": 3 });
  el(g, "path", { d: `M${cx + 4} ${cy + 2} Q${cx + 40} ${cy - 40} ${cx + 84} ${cy - 6} Q${cx + 60} ${cy + 36} ${cx + 4} ${cy + 2} Z`, fill: "rgb(80,150,70)", stroke: TINTA, "stroke-width": 3 });
  el(g, "path", { d: `M${cx + 6} ${cy + 2} Q${cx + 44} ${cy - 4} ${cx + 78} ${cy - 6}`, fill: "none", stroke: "rgb(200,230,180)", "stroke-width": 3 });
  for (const t of [0.35, 0.6, 0.82]) el(g, "line", { x1: cx + 6 + 72 * t, y1: cy - 2 - 4 * t, x2: cx + 6 + 72 * t + 6, y2: cy - 18 + 6 * t, stroke: "rgb(200,230,180)", "stroke-width": 2 });
}

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
    if (esVerter && (paso.en === "plancha" || paso.en === "plato")) {
      // v61 pasada: verter sobre la plancha (la masa del jianbing) o sobre el plato (el almibar):
      // visto desde arriba, el charquito crece hasta el anillo verde
      const L = LIQUIDOS[paso.liquido] || LIQUIDOS.agua;
      if (paso.en === "plancha") {
        el(s, "circle", { cx: 130, cy: 108, r: 82, fill: "rgb(70,70,80)", stroke: TINTA, "stroke-width": 3 });
        el(s, "circle", { cx: 130, cy: 108, r: 74, fill: "rgb(96,96,108)" });
        el(s, "rect", { x: 208, y: 102, width: 40, height: 12, rx: 5, fill: "rgb(110,72,50)", stroke: TINTA, "stroke-width": 3 });
      } else {
        el(s, "circle", { cx: 130, cy: 108, r: 80, fill: "rgb(252,252,250)", stroke: TINTA, "stroke-width": 3 });
        el(s, "circle", { cx: 130, cy: 108, r: 62, fill: "none", stroke: "rgb(214,214,222)", "stroke-width": 3 });
        if (ctx.plato) el(s, "image", { href: ctx.plato, x: 96, y: 74, width: 68, height: 68, style: "image-rendering:pixelated", opacity: 0.9 });
      }
      el(s, "circle", { cx: 130, cy: 108, r: 60 * B, fill: "rgba(120,190,110,0.22)", stroke: "rgb(80,150,80)", "stroke-width": 2, "stroke-dasharray": "5 4" });
      el(s, "circle", { cx: 130, cy: 108, r: 60 * A, fill: "none", stroke: "rgb(80,150,80)", "stroke-width": 2, "stroke-dasharray": "5 4" });
      barra = el(s, "circle", { cx: 130, cy: 108, r: 0, fill: L.color, stroke: "rgba(0,0,0,0.25)", "stroke-width": 2, opacity: paso.en === "plato" ? 0.85 : 1 });
      // la jarrita (o el cucharon) arriba a la derecha
      const jarra = el(s, "g", { transform: "translate(232 26)" });
      el(jarra, "rect", { x: 0, y: 0, width: 40, height: 34, rx: 6, fill: "rgb(236,232,224)", stroke: TINTA, "stroke-width": 3 });
      el(jarra, "path", { d: "M0 8 L-14 2 L-12 10 L0 14 Z", fill: "rgb(236,232,224)", stroke: TINTA, "stroke-width": 3 });
      const chorro = el(s, "path", { d: "", fill: "none", stroke: L.color, "stroke-width": 5, "stroke-linecap": "round" });
      ayuda("Hold to pour · let go in the green ring");
      let tPrevV = 0;
      bucle((t) => {
        const dt = Math.min(50, t - tPrevV) / (1000 / 60);
        tPrevV = t;
        if (apretado) f = Math.min(1, f + 0.0085 * dt);
        barra.setAttribute("r", (60 * f).toFixed(1));
        chorro.setAttribute("d", apretado ? "M220 32 Q160 30 132 104" : "");
        if (f >= 1 && apretado) {
          apretado = false;
          fin(1);
        }
      });
    } else if (esVerter && paso.en === "olla") {
      // v61 pasada: verter en la olla (arroz con leche, la sopa, el te sobre los camarones): vista de lado
      const L = LIQUIDOS[paso.liquido] || LIQUIDOS.agua;
      const Y_ARR = 70;
      const Y_ABA = 164;
      el(s, "rect", { x: 60, y: Y_ARR, width: 180, height: Y_ABA - Y_ARR, rx: 10, fill: "rgb(150,154,170)", stroke: TINTA, "stroke-width": 3 });
      el(s, "rect", { x: 40, y: Y_ARR + 8, width: 22, height: 8, fill: "rgb(90,90,100)", stroke: TINTA, "stroke-width": 3 });
      el(s, "rect", { x: 238, y: Y_ARR + 8, width: 22, height: 8, fill: "rgb(90,90,100)", stroke: TINTA, "stroke-width": 3 });
      el(s, "rect", { x: 68, y: Y_ARR + 4, width: 164, height: Y_ABA - Y_ARR - 10, fill: "rgb(70,72,84)" });
      const ALTO = Y_ABA - Y_ARR - 12;
      barra = el(s, "rect", { x: 68, y: Y_ABA - 6, width: 164, height: 0, fill: L.color });
      el(s, "rect", { x: 64, y: Y_ABA - 6 - ALTO * B, width: 172, height: ALTO * (B - A), fill: "rgba(120,190,110,0.28)", stroke: "rgb(80,150,80)", "stroke-width": 2, "stroke-dasharray": "5 4" });
      el(s, "rect", { x: 60, y: Y_ARR, width: 180, height: Y_ABA - Y_ARR, rx: 10, fill: "none", stroke: TINTA, "stroke-width": 3 });
      const jarra = el(s, "g", { transform: "translate(212 14)" });
      el(jarra, "rect", { x: 0, y: 0, width: 46, height: 40, rx: 6, fill: "rgb(236,232,224)", stroke: TINTA, "stroke-width": 3 });
      el(jarra, "path", { d: "M0 8 L-16 2 L-14 10 L0 14 Z", fill: "rgb(236,232,224)", stroke: TINTA, "stroke-width": 3 });
      const chorro = el(s, "rect", { x: 192, y: 24, width: 6, height: 0, fill: L.color, stroke: TINTA, "stroke-width": 1 });
      ayuda("Hold to pour · let go on the green line");
      let tPrevV = 0;
      bucle((t) => {
        const dt = Math.min(50, t - tPrevV) / (1000 / 60);
        tPrevV = t;
        if (apretado) f = Math.min(1, f + 0.0085 * dt);
        barra.setAttribute("y", Y_ABA - 6 - ALTO * f);
        barra.setAttribute("height", ALTO * f);
        chorro.setAttribute("height", apretado ? Math.max(0, Y_ABA - 6 - ALTO * f - 24) : 0);
        if (f >= 1 && apretado) {
          apretado = false;
          fin(1);
        }
      });
    } else if (esVerter) {
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
      let tPrevV = 0;
      bucle((t) => {
        const dt = Math.min(50, t - tPrevV) / (1000 / 60); // en "cuadros de 60fps" (asi da igual 30, 60 o 120 Hz)
        tPrevV = t;
        if (apretado) f = Math.min(1, f + 0.0085 * dt);
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
      // v61 pasada: la base segun la receta (masa, raiz de loto, hoja, maduro)
      if (paso.base === "loto") {
        el(s, "circle", { cx: 130, cy: 108, r: 74, fill: "rgb(236,222,200)", stroke: TINTA, "stroke-width": 3 });
        el(s, "circle", { cx: 130, cy: 108, r: 68, fill: "none", stroke: "rgb(196,160,120)", "stroke-width": 5 });
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          el(s, "circle", { cx: 130 + 52 * Math.cos(a), cy: 108 + 52 * Math.sin(a), r: 9, fill: "rgb(200,180,150)", stroke: "rgb(176,150,116)", "stroke-width": 2 });
        }
      } else if (paso.base === "hoja") {
        for (const rot of [-30, 30]) {
          const gh = el(s, "g", { transform: `rotate(${rot} 130 108)` });
          el(gh, "path", { d: "M50 108 Q130 50 210 108 Q130 166 50 108 Z", fill: "rgb(100,160,80)", stroke: TINTA, "stroke-width": 3 });
          el(gh, "line", { x1: 56, y1: 108, x2: 204, y2: 108, stroke: "rgb(170,210,130)", "stroke-width": 2 });
        }
      } else if (paso.base === "maduro") {
        el(s, "ellipse", { cx: 130, cy: 108, rx: 84, ry: 64, fill: "rgb(246,204,96)", stroke: TINTA, "stroke-width": 3 });
        el(s, "ellipse", { cx: 130, cy: 108, rx: 70, ry: 52, fill: "none", stroke: "rgb(252,228,150)", "stroke-width": 4 });
      } else el(s, "circle", { cx: 130, cy: 108, r: 74, fill: MASA, stroke: TINTA, "stroke-width": 3 });
      el(s, "circle", { cx: 130, cy: 108, r: 50 * B, fill: "rgba(120,190,110,0.25)", stroke: "rgb(80,150,80)", "stroke-width": 2, "stroke-dasharray": "5 4" });
      el(s, "circle", { cx: 130, cy: 108, r: 50 * A, fill: "none", stroke: "rgb(80,150,80)", "stroke-width": 2, "stroke-dasharray": "5 4" });
      barra = el(s, "ellipse", { cx: 130, cy: 108, rx: 0, ry: 0, fill: R.color, stroke: R.sombra, "stroke-width": 3 });
      // los camarones se ven como camarones (rom: "los shrimps … se ven como figuras random")
      let camarones = null;
      if (paso.relleno === "camaron") {
        camarones = el(s, "g", { transform: "translate(130 108) scale(0)" });
        dibujarCamaron(camarones, -16, -4, 0.75);
        dibujarCamaron(camarones, 14, -8, 0.75, true);
        dibujarCamaron(camarones, 0, 14, 0.75);
      }
      // el bol con la cuchara
      el(s, "path", { d: "M222 120 Q252 170 282 120 Z", fill: "rgb(236,232,224)", stroke: TINTA, "stroke-width": 3 });
      el(s, "ellipse", { cx: 252, cy: 120, rx: 30, ry: 8, fill: R.color, stroke: TINTA, "stroke-width": 3 });
      if (paso.relleno === "camaron") {
        dibujarCamaron(s, 240, 112, 0.5);
        dibujarCamaron(s, 262, 110, 0.5, true);
      }
      el(s, "rect", { x: 248, y: 64, width: 6, height: 52, rx: 3, fill: "rgb(196,170,140)", stroke: TINTA, "stroke-width": 2, transform: "rotate(-20 252 116)" });
      ayuda(`Hold to fill · let go in the green ring`);
      let tPrevR = 0;
      bucle((t) => {
        const dt = Math.min(50, t - tPrevR) / (1000 / 60);
        tPrevR = t;
        if (apretado) f = Math.min(1, f + 0.009 * dt);
        barra.setAttribute("rx", 50 * f);
        barra.setAttribute("ry", 44 * f);
        if (camarones) camarones.setAttribute("transform", `translate(130 108) scale(${(f * 1.15).toFixed(3)})`);
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
    if (paso.relleno === "camaron") {
      dibujarCamaron(s, 136, 100, 0.8);
      dibujarCamaron(s, 166, 98, 0.8, true);
      dibujarCamaron(s, 150, 116, 0.7);
    }
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
    // la olla / vaporera / sarten
    const f = paso.como;
    // v63: lo que se cocina, dibujado y crudo (se va cocinando); si la receta no tiene piezas, como antes
    const cc = ctx.receta ? dibujarCoccion(s, f, ctx.receta) : null;
    if (cc) {
      /* el recipiente ya lo dibujo coccion.js */
    } else if (f === "vapor") {
      el(s, "rect", { x: 70, y: 70, width: 160, height: 80, fill: "rgb(214,170,104)", stroke: TINTA, "stroke-width": 3 });
      el(s, "rect", { x: 70, y: 136, width: 160, height: 14, fill: "rgb(170,124,72)" });
      el(s, "rect", { x: 70, y: 70, width: 160, height: 80, fill: "none", stroke: TINTA, "stroke-width": 3 });
    } else if (f === "calentar") {
      // v61 pasada: calentar el agua en la tetera (antes salia la taza adentro de una olla)
      el(s, "rect", { x: 96, y: 150, width: 108, height: 8, fill: "rgb(50,46,54)", stroke: TINTA, "stroke-width": 2 }); // el fogon
      for (let i = 0; i < 6; i++) el(s, "rect", { x: 106 + i * 16, y: 158, width: 8, height: 4, fill: i % 2 ? "rgb(110,150,240)" : "rgb(250,140,50)" });
      el(s, "path", { d: "M104 146 Q100 86 150 82 Q200 86 196 146 Z", fill: "rgb(196,204,214)", stroke: TINTA, "stroke-width": 3 }); // la tetera
      el(s, "path", { d: "M114 138 Q112 100 132 92", fill: "none", stroke: "rgb(236,240,246)", "stroke-width": 5, "stroke-linecap": "round" }); // brillo
      el(s, "path", { d: "M194 118 L232 92 L236 100 L198 130 Z", fill: "rgb(196,204,214)", stroke: TINTA, "stroke-width": 3, "stroke-linejoin": "round" }); // el pico
      el(s, "path", { d: "M118 90 Q150 44 182 90", fill: "none", stroke: TINTA, "stroke-width": 6 }); // el asa
      el(s, "path", { d: "M118 90 Q150 44 182 90", fill: "none", stroke: "rgb(110,72,50)", "stroke-width": 3 });
      el(s, "rect", { x: 140, y: 76, width: 20, height: 8, rx: 3, fill: "rgb(110,72,50)", stroke: TINTA, "stroke-width": 2 }); // la perilla
    } else if (f === "hervir" || f === "caramelo") {
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
    const comida = el(s, "image", { href: f === "calentar" || cc ? "" : ctx.plato || "", x: 110, y: f === "horno" ? 66 : 62, width: 80, height: 80, style: "image-rendering:pixelated" });
    if (!cc && (f === "hervir" || f === "caramelo")) {
      // que se vea adentro del agua (o del caramelo), no flotando delante de la olla
      el(s, "rect", { x: 63, y: 112, width: 174, height: 37, rx: 4, fill: f === "caramelo" ? "rgba(214,120,60,0.55)" : "rgba(170,206,230,0.6)" });
      el(s, "rect", { x: 60, y: 76, width: 180, height: 76, rx: 8, fill: "none", stroke: TINTA, "stroke-width": 3 });
    }
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
      if (cc) cc.actualizar(x, A, B, t);
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
        if (cc) cc.voltear();
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
      // v61: el ingrediente dibujado entero, partido en trozos (cada uno un recorte que se separa un poquito)
      const defs = el(trozos, "defs", {});
      for (let i = 0; i < bordes.length - 1; i++) {
        const id = `corte${++idClip}`;
        const cp = el(defs, "clipPath", { id });
        el(cp, "rect", { x: bordes[i] - (i === 0 ? 40 : 0), y: 0, width: bordes[i + 1] - bordes[i] + (i === 0 ? 40 : 0) + (i === bordes.length - 2 ? 40 : 0), height: 200 });
        const desp = (i - (bordes.length - 2) / 2) * (cortes.length ? 4 : 0);
        const trozo = el(trozos, "g", { "clip-path": `url(#${id})`, transform: `translate(${desp} 0)` });
        dibujarIngrediente(trozo, paso.que, X0 + 6, X1 - 6, 104);
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

  // ---------- REVOLVER (v58; v61 rehecho) ----------
  // rom: "el stir no funciona muy bien, o no se como usarlo". Antes habia que medir una
  // velocidad invisible; ahora una cuchara-guia da vueltas por la olla y ella la sigue con
  // el dedo: mientras el dedo esta cerca de la guia, se revuelve (y se llena la barra).
  else if (paso.t === "revolver") {
    const color = paso.color || "rgb(214,150,90)";
    const CX = 150;
    const CY = 100;
    const R = 46; // el radio de la vuelta
    el(s, "ellipse", { cx: CX, cy: CY + 10, rx: 96, ry: 78, fill: "rgb(120,124,140)", stroke: TINTA, "stroke-width": 3 }); // la olla
    el(s, "ellipse", { cx: CX, cy: CY, rx: 84, ry: 70, fill: color, stroke: TINTA, "stroke-width": 2 });
    el(s, "ellipse", { cx: CX - 30, cy: CY - 30, rx: 18, ry: 8, fill: "rgba(255,255,255,0.25)" }); // brillo
    // la pista: un circulo punteado con flechitas
    el(s, "circle", { cx: CX, cy: CY, r: R, fill: "none", stroke: "rgba(255,255,255,0.75)", "stroke-width": 3, "stroke-dasharray": "4 7" });
    for (let a = 0; a < 4; a++) {
      const r = (a * Math.PI) / 2 + 0.4;
      const x = CX + R * Math.cos(r);
      const y = CY + R * Math.sin(r);
      el(s, "path", { d: "M-4 -5 L4 0 L-4 5", fill: "none", stroke: "rgba(255,255,255,0.9)", "stroke-width": 2.5, transform: `translate(${x} ${y}) rotate(${(r * 180) / Math.PI + 90})` });
    }
    const remolino = el(s, "path", { d: `M${CX - 20} ${CY} A20 20 0 0 1 ${CX + 20} ${CY}`, fill: "none", stroke: "rgba(255,255,255,0.45)", "stroke-width": 4, "stroke-linecap": "round" });
    // la cuchara (la mueve ella); empieza en el centro para no tapar la guia
    const cuchara = el(s, "g", {});
    el(cuchara, "rect", { x: -3, y: -48, width: 6, height: 44, rx: 3, fill: "rgb(196,150,100)", stroke: TINTA, "stroke-width": 2 });
    el(cuchara, "ellipse", { cx: 0, cy: 0, rx: 9, ry: 7, fill: "rgb(214,180,130)", stroke: TINTA, "stroke-width": 3 });
    cuchara.setAttribute("transform", `translate(${CX} ${CY + 6})`);
    // la guia (a donde tiene que ir el dedo), encima de la cuchara
    const guia = el(s, "g", { class: "guia-revolver" });
    const halo = el(guia, "circle", { r: 20, fill: "rgba(120,190,110,0.35)", stroke: "rgb(80,150,80)", "stroke-width": 2 });
    el(guia, "circle", { r: 7, fill: "rgb(110,190,100)", stroke: TINTA, "stroke-width": 2 });
    // la barra de progreso
    el(s, "rect", { x: 30, y: 184, width: 240, height: 10, fill: "rgb(240,230,200)", stroke: TINTA, "stroke-width": 2 });
    const prog = el(s, "rect", { x: 31, y: 185, width: 0, height: 8, fill: "rgb(120,190,110)" });
    ayuda("Put your finger on the green dot and follow it around");
    const VUELTA = 2400 / rapido(0.2); // ms por vuelta de la guia
    const CERCA = ancho(22) + 6 * (MJ.ollas || 0); // que tan cerca hay que ir
    let dedo = null;
    let progreso = 0;
    let tTotal = 0;
    let tBien = 0;
    let tPrev = 0;
    let empezo = false;
    s.addEventListener("pointerdown", (e) => {
      if (!vivo) return;
      e.preventDefault();
      try {
        s.setPointerCapture(e.pointerId);
      } catch (err) {
        /* nada */
      }
      dedo = aSvg(e);
    });
    s.addEventListener("pointermove", (e) => {
      if (!vivo || !dedo) return;
      dedo = aSvg(e);
    });
    const soltar = () => {
      dedo = null;
    };
    s.addEventListener("pointerup", soltar);
    s.addEventListener("pointercancel", soltar);
    let ang = 0;
    bucle((t) => {
      const dt = Math.min(0.05, (t - tPrev) / 1000);
      tPrev = t;
      // la guia solo arranca cuando ella la toca (asi no hay que correr a alcanzarla)
      const gx = CX + R * Math.cos(ang);
      const gy = CY + R * Math.sin(ang);
      const cerca = dedo && Math.hypot(dedo[0] - gx, dedo[1] - gy) <= CERCA;
      if (cerca) empezo = true;
      if (empezo) ang += ((2 * Math.PI) / VUELTA) * dt * 1000;
      guia.setAttribute("transform", `translate(${gx.toFixed(1)} ${gy.toFixed(1)})`);
      // antes de empezar late en verde (invita a tocarla); luego verde = bien, naranja = te alejaste
      if (!empezo) halo.setAttribute("r", (20 + 4 * Math.sin(t / 180)).toFixed(1));
      else halo.setAttribute("r", 20);
      halo.setAttribute("fill", !empezo || cerca ? "rgba(120,190,110,0.55)" : "rgba(240,180,80,0.35)");
      if (dedo) {
        const a = Math.atan2(dedo[1] - CY, dedo[0] - CX);
        const r = Math.max(18, Math.min(70, Math.hypot(dedo[0] - CX, dedo[1] - CY)));
        cuchara.setAttribute("transform", `translate(${(CX + r * Math.cos(a)).toFixed(1)} ${(CY + r * Math.sin(a)).toFixed(1)})`);
      }
      if (empezo) {
        tTotal += dt;
        if (cerca) {
          tBien += dt;
          progreso = Math.min(1, progreso + dt / ((VUELTA / 1000) * 2)); // dos vueltas bien hechas
          remolino.setAttribute("transform", `rotate(${((ang * 180) / Math.PI).toFixed(1)} ${CX} ${CY})`);
        }
      }
      prog.setAttribute("width", 238 * progreso);
      if (progreso >= 1) {
        const r = tBien / Math.max(0.1, tTotal);
        fin(r >= 0.8 ? 3 : r >= 0.55 ? 2 : 1);
      } else if (tTotal > 14) fin(1);
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
      // v61 pasada: hacia donde caiga siempre tiene que poder alcanzarse (antes, cerca del borde
      // podia caer fuera de donde llega el wok)
      const T = conLlama ? 1.6 : 1.2;
      let vx = (Math.random() < 0.5 ? -1 : 1) * (22 + Math.random() * 32);
      if (wokX + vx * T > 215 || wokX + vx * T < 85) vx = -vx;
      vx = Math.max((85 - wokX) / T, Math.min((215 - wokX) / T, vx));
      vuelo = { t0: performance.now() - t0, x0: wokX, vx, conLlama };
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
      for (let i = 0; i < 3; i++) dibujarCamaron(s, 100 + i * 52, 108 + (i % 2) * 6, 1.25, i % 2 === 1);
    } else if (paso.que === "pescado") {
      dibujarPescado(s, 70, 230, 112, 50);
    } else if (paso.que === "bokchoy") {
      dibujarBokchoy(s, 150, 116);
    } else if (paso.que === "arroz") {
      // un monton de granitos
      for (let i = 0; i < 90; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * 52;
        const x = 150 + r * Math.cos(a) * 1.5;
        const y = 112 + r * Math.sin(a) * 0.7;
        el(s, "ellipse", { cx: x, cy: y, rx: 4, ry: 2, fill: "rgb(252,250,242)", stroke: "rgb(190,186,176)", "stroke-width": 1, transform: `rotate(${Math.random() * 180} ${x} ${y})` });
      }
    } else if (paso.que === "hoja") {
      // dos hojas largas de bambu / platano
      for (const [dy, rot] of [[-12, -6], [14, 5]]) {
        const g = el(s, "g", { transform: `rotate(${rot} 150 ${112 + dy})` });
        el(g, "path", { d: `M50 ${112 + dy} Q150 ${84 + dy} 250 ${112 + dy} Q150 ${140 + dy} 50 ${112 + dy} Z`, fill: "rgb(100,160,80)", stroke: TINTA, "stroke-width": 3 });
        el(g, "line", { x1: 56, y1: 112 + dy, x2: 244, y2: 112 + dy, stroke: "rgb(170,210,130)", "stroke-width": 2 });
      }
    } else if (paso.que === "pollo") {
      // un pollo entero (de los de asar)
      el(s, "ellipse", { cx: 150, cy: 114, rx: 62, ry: 36, fill: "rgb(244,220,184)", stroke: TINTA, "stroke-width": 3 });
      for (const sx of [-1, 1]) {
        el(s, "ellipse", { cx: 150 + sx * 58, cy: 96, rx: 16, ry: 11, fill: "rgb(244,220,184)", stroke: TINTA, "stroke-width": 3, transform: `rotate(${sx * 30} ${150 + sx * 58} 96)` });
        el(s, "circle", { cx: 150 + sx * 70, cy: 86, r: 5, fill: "rgb(252,246,236)", stroke: TINTA, "stroke-width": 2 });
      }
      el(s, "path", { d: "M118 104 Q150 92 182 104", fill: "none", stroke: "rgb(250,236,214)", "stroke-width": 4 });
    } else {
      dibujarIngrediente(s, paso.que, 80, 220, 112);
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
    const BAJO = 0.75 - ancho(0.25, 0.3); // cuanto polvo esta bien (de 0 a 1 por zona)
    const ALTO = 0.75 + ancho(0.25, 0.3);
    for (let i = 0; i < ZONAS; i++) {
      const x = ZX0 + i * ZW + 4;
      el(s, "rect", { x, y: 172, width: ZW - 8, height: 12, fill: "rgb(240,230,200)", stroke: TINTA, "stroke-width": 2 });
      // v61 pasada: la franja verde es exactamente la que puntua (antes llegaba al final aunque arriba de 0.925 ya no contaba)
      el(s, "rect", { x: x + 1 + (ZW - 10) * BAJO, y: 172, width: (ZW - 10) * (Math.min(1, ALTO) - BAJO), height: 12, fill: "rgba(120,190,110,0.5)" });
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
    let tPrevE = 0;
    let granos = 0;
    bucle((t) => {
      const dt = Math.min(50, t - tPrevE) / (1000 / 60);
      tPrevE = t;
      salero.setAttribute("transform", `translate(${x} ${apretado ? 54 : 46}) rotate(${apretado ? 180 : 160})`);
      if (!apretado) return;
      granos += 2 * dt; // dos granitos por cuadro de 60fps
      for (; granos >= 1; granos--) {
        const px = x + (Math.random() - 0.5) * 28;
        const py = 70 + Math.random() * 70;
        el(capa, "rect", { x: px, y: py, width: 2, height: 2, fill: polvo, stroke: "rgba(0,0,0,0.25)", "stroke-width": 0.5 });
        const z = Math.floor((px - ZX0) / ZW);
        if (z >= 0 && z < ZONAS) {
          cant[z] = Math.min(1.4, cant[z] + 0.008);
          barras[z].setAttribute("width", Math.min(1, cant[z]) * (ZW - 10));
          barras[z].setAttribute("fill", cant[z] > ALTO ? "rgb(222,110,100)" : polvo === "rgb(255,255,255)" ? "rgb(200,200,210)" : polvo);
        }
      }
    });
    boton("Ready ✓", () => {
      const bien = cant.filter((c) => c >= BAJO && c <= ALTO).length;
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
      grosor = Math.max(0.12, grosor - (0.055 + Math.random() * 0.02)); // v61 pasada: pasos chicos, se puede parar en la franja (antes era suerte)
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

  // ---------- ENROLLAR / ENVOLVER (v61) ----------
  // arrastrar desde abajo hacia arriba, derechito por el carril: la masa (o la hoja) se enrolla
  else if (paso.t === "enrollar") {
    const N = mas(paso.n || 1, 1);
    const hoja = paso.hoja ? { fondo: "rgb(110,160,80)", vena: "rgb(170,210,130)" } : { fondo: paso.color || MASA, vena: null };
    const relleno = RELLENOS[paso.relleno] || null;
    const X0 = 100;
    const X1 = 200;
    const Y0 = 40; // arriba
    const Y1 = 170; // abajo
    const CARRIL = ancho(16) + 4;
    const g = el(s, "g", {});
    const cuenta = el(s, "text", { x: 8, y: 18, "text-anchor": "start", class: "cocina-cuenta" });
    let k = 0;
    let buenos = 0;
    let dedo = null;
    let desvio = 0;
    let y = Y1;
    const pintar = () => {
      g.innerHTML = "";
      // lo que queda sin enrollar
      el(g, "rect", { x: X0, y: Y0, width: X1 - X0, height: Math.max(0, y - Y0), fill: hoja.fondo, stroke: TINTA, "stroke-width": 3 });
      if (hoja.vena) for (let i = 1; i < 4; i++) el(g, "line", { x1: X0 + ((X1 - X0) * i) / 4, y1: Y0 + 4, x2: X0 + ((X1 - X0) * i) / 4, y2: Math.max(Y0 + 4, y - 4), stroke: hoja.vena, "stroke-width": 2 });
      if (paso.cebollin) {
        // la masa con cebollin picado (congyoubing)
        for (let i = 0; i < 26; i++) {
          const cx = X0 + 8 + ((i * 37) % (X1 - X0 - 16));
          const cy = Y0 + 8 + ((i * 53) % (Y1 - Y0 - 16));
          if (cy < y - 8) el(g, "rect", { x: cx, y: cy, width: 5, height: 3, fill: "rgb(110,180,80)" });
        }
      }
      if (relleno && y > Y1 - 30) el(g, "rect", { x: X0 + 10, y: Y1 - 34, width: X1 - X0 - 20, height: 16, rx: 7, fill: relleno.color, stroke: relleno.sombra, "stroke-width": 2 });
      // el carril y la flecha
      el(g, "rect", { x: 150 - CARRIL, y: Y0, width: CARRIL * 2, height: Math.max(0, y - Y0), fill: "rgba(120,190,110,0.18)", stroke: "rgb(80,150,80)", "stroke-width": 2, "stroke-dasharray": "5 4" }); // solo lo que falta enrollar
      el(g, "path", { d: `M150 ${Y0 + 6} l-8 12 h16 Z`, fill: "rgb(80,150,80)" });
      // el rollo
      const grosor = 14 + (Y1 - y) * 0.09;
      el(g, "rect", { x: X0 - 6, y: y - grosor / 2, width: X1 - X0 + 12, height: grosor, rx: grosor / 2, fill: hoja.fondo === MASA ? "rgb(240,220,180)" : hoja.fondo, stroke: TINTA, "stroke-width": 3 });
      el(g, "line", { x1: X0, y1: y - grosor / 4, x2: X1, y2: y - grosor / 4, stroke: "rgba(255,255,255,0.4)", "stroke-width": 2 });
      cuenta.textContent = N > 1 ? `ROLL ${k} / ${N}` : "";
    };
    pintar();
    ayuda("Drag the roll up, straight along the green lane");
    s.addEventListener("pointerdown", (e) => {
      if (!vivo) return;
      e.preventDefault();
      try {
        s.setPointerCapture(e.pointerId);
      } catch (err) {
        /* nada */
      }
      const p = aSvg(e);
      if (p[1] > y - 30) {
        dedo = p;
        desvio = 0;
      }
    });
    s.addEventListener("pointermove", (e) => {
      if (!vivo || !dedo) return;
      const p = aSvg(e);
      y = Math.max(Y0 + 6, Math.min(y, p[1] + 10));
      if (Math.abs(p[0] - 150) > CARRIL) desvio += Math.abs(p[0] - 150) - CARRIL;
      dedo = p;
      pintar();
      if (y <= Y0 + 8) terminarUno();
    });
    const terminarUno = () => {
      dedo = null;
      const ok = desvio < 40;
      if (ok) buenos++;
      sonar(ok ? "tocar" : "no");
      k++;
      if (k >= N) {
        fin(estrellasDeAciertos(buenos, N));
        return;
      }
      y = Y1;
      pintar();
    };
    s.addEventListener("pointerup", () => {
      dedo = null;
    });
  }

  // ---------- RALLAR (v61) ----------
  // pasar el bloque arriba y abajo por el rallador; cuidado con la zona roja de abajo (los dedos!)
  else if (paso.t === "rallar") {
    const I = INGREDIENTES[paso.que] || INGREDIENTES.queso;
    const N = mas(paso.n || 6, 3);
    const GX = 150;
    const GY0 = 40;
    const GY1 = 150;
    const ROJA = GY1 - ancho(22); // de aca para abajo, peligro
    // el rallador
    el(s, "path", { d: `M${GX - 34} ${GY1 + 20} L${GX - 26} ${GY0} L${GX + 26} ${GY0} L${GX + 34} ${GY1 + 20} Z`, fill: "rgb(206,212,220)", stroke: TINTA, "stroke-width": 3 });
    for (let y = GY0 + 10; y < GY1 + 10; y += 9) for (let x = -20; x <= 20; x += 10) el(s, "rect", { x: GX + x - 2, y, width: 5, height: 3, fill: "rgb(120,126,140)" });
    el(s, "rect", { x: GX - 12, y: GY0 - 18, width: 24, height: 18, rx: 6, fill: "none", stroke: TINTA, "stroke-width": 4 });
    el(s, "rect", { x: GX - 40, y: ROJA, width: 80, height: GY1 + 20 - ROJA, fill: "rgba(222,90,80,0.28)" });
    const monton = el(s, "g", {});
    const bloque = el(s, "g", {});
    const cuenta = el(s, "text", { x: 8, y: 18, "text-anchor": "start", class: "cocina-cuenta" });
    let tam = 1;
    let k = 0;
    let buenos = 0;
    let dedo = null;
    let bajaDesde = null;
    let toco = false;
    const pintarBloque = (y) => {
      bloque.innerHTML = "";
      const h = 22 + 18 * tam;
      const y0 = y - h / 2;
      el(bloque, "rect", { x: GX - 22, y: y0, width: 44, height: h, rx: 4, fill: I.color, stroke: TINTA, "stroke-width": 3 });
      if (paso.que === "chocolate") {
        // la pastilla de chocolate, con sus cuadritos
        for (let i = 1; i < 3; i++) el(bloque, "line", { x1: GX - 22 + (44 * i) / 3, y1: y0 + 3, x2: GX - 22 + (44 * i) / 3, y2: y0 + h - 3, stroke: "rgb(80,44,28)", "stroke-width": 2 });
        el(bloque, "line", { x1: GX - 19, y1: y0 + h / 2, x2: GX + 19, y2: y0 + h / 2, stroke: "rgb(80,44,28)", "stroke-width": 2 });
        el(bloque, "rect", { x: GX - 18, y: y0 + 4, width: 10, height: 3, fill: "rgb(150,96,64)" });
      } else if (paso.que === "queso") {
        // queso con huequitos
        for (const [dx, fy, r] of [[-10, 0.3, 4], [8, 0.55, 3], [-4, 0.75, 2.5], [12, 0.22, 2]]) el(bloque, "circle", { cx: GX + dx, cy: y0 + h * fy, r: r * (0.6 + 0.4 * tam), fill: "rgb(226,190,90)" });
        el(bloque, "rect", { x: GX - 19, y: y0 + 3, width: 38, height: 3, fill: "rgb(255,244,200)" });
      } else if (I.vena) el(bloque, "rect", { x: GX - 18, y: y0 + 4, width: 36, height: 4, fill: I.vena });
      cuenta.textContent = `GRATE ${k} / ${N}`;
    };
    pintarBloque(GY0 + 30);
    ayuda("Drag the block down the grater · stop before the red part!");
    s.addEventListener("pointerdown", (e) => {
      if (!vivo) return;
      e.preventDefault();
      try {
        s.setPointerCapture(e.pointerId);
      } catch (err) {
        /* nada */
      }
      dedo = aSvg(e);
      yBloque = Math.max(GY0 + 16, Math.min(GY1 + 20, dedo[1]));
      bajaDesde = yBloque;
      fondo = yBloque;
      toco = yBloque >= ROJA;
      pintarBloque(yBloque);
    });
    // v61 pasada: cada bajada cuenta sola (se puede rallar arriba-abajo sin levantar el dedo)
    const pasada = () => {
      const ok = !toco;
      if (ok) buenos++;
      k++;
      tam = Math.max(0.15, 1 - k / N);
      for (let i = 0; i < 6; i++) {
        const mx = GX - 40 + Math.random() * 80;
        const my = 172 + Math.random() * 12;
        el(monton, "rect", { x: mx, y: my, width: 6, height: 2, fill: I.color, stroke: "rgba(0,0,0,0.3)", "stroke-width": 0.5, transform: `rotate(${Math.random() * 60 - 30} ${mx} ${my})` });
      }
      sonar(ok ? "tocar" : "no");
      toco = false;
      if (k >= N) fin(estrellasDeAciertos(buenos, N));
    };
    let yBloque = GY0 + 30;
    let fondo = yBloque; // lo mas abajo que llego esta bajada
    s.addEventListener("pointermove", (e) => {
      if (!vivo || !dedo) return;
      const p = aSvg(e);
      const y = Math.max(GY0 + 16, Math.min(GY1 + 20, p[1]));
      if (y >= ROJA && !toco) {
        toco = true; // se paso: los dedos!
        sonar("no");
        vibrar(40);
      }
      if (y >= fondo) fondo = y;
      else if (fondo - y > 8) {
        // dio la vuelta para arriba: si la bajada fue larga, cuenta
        if (fondo - bajaDesde >= 40) pasada();
        if (!vivo) return;
        toco = false;
        bajaDesde = y;
        fondo = y;
      }
      if (y < bajaDesde) {
        bajaDesde = y;
        fondo = y;
      }
      yBloque = y;
      pintarBloque(y);
      dedo = p;
    });
    s.addEventListener("pointerup", () => {
      if (!vivo || !dedo) return;
      dedo = null;
      if (fondo - bajaDesde >= 40) pasada();
      if (!vivo) return;
      toco = false;
      yBloque = GY0 + 30;
      pintarBloque(yBloque);
    });
    s.addEventListener("pointercancel", () => {
      dedo = null;
    });
  }

  // ---------- PELAR (v61) ----------
  // dar la vuelta por el borde de la fruta, sin salirse del anillo: la cascara sale de un tiron
  else if (paso.t === "pelar") {
    const I = INGREDIENTES[paso.que] || INGREDIENTES.mango;
    const CX = 150;
    const CY = 104;
    const R = 52;
    const BANDA = ancho(14) + 4;
    el(s, "circle", { cx: CX, cy: CY, r: R + BANDA, fill: "rgba(120,190,110,0.16)", stroke: "rgb(80,150,80)", "stroke-width": 2, "stroke-dasharray": "5 4" });
    el(s, "circle", { cx: CX, cy: CY, r: R - BANDA, fill: "none", stroke: "rgb(80,150,80)", "stroke-width": 2, "stroke-dasharray": "5 4" });
    // lo de adentro (la pulpa), con su detalle segun la fruta
    const PULPA = { mango: "rgb(255,200,70)", papaya: "rgb(250,150,90)", maduro: "rgb(250,214,120)", loto: "rgb(246,236,220)", lulo: "rgb(200,230,120)" };
    el(s, "circle", { cx: CX, cy: CY, r: R - 4, fill: PULPA[paso.que] || I.pulpa || "rgb(250,220,140)", stroke: TINTA, "stroke-width": 3 });
    if (paso.que === "papaya") {
      el(s, "ellipse", { cx: CX, cy: CY, rx: 18, ry: 13, fill: "rgb(236,120,70)" });
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        el(s, "circle", { cx: CX + 11 * Math.cos(a) * (i % 2 ? 0.6 : 1), cy: CY + 8 * Math.sin(a) * (i % 2 ? 0.6 : 1), r: 2.6, fill: "rgb(50,36,36)" });
      }
    } else if (paso.que === "loto") {
      // la raiz de loto cortada: los huecos
      el(s, "circle", { cx: CX, cy: CY, r: 8, fill: "rgb(214,196,170)", stroke: "rgb(190,170,140)", "stroke-width": 2 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        el(s, "circle", { cx: CX + 27 * Math.cos(a), cy: CY + 27 * Math.sin(a), r: 7, fill: "rgb(214,196,170)", stroke: "rgb(190,170,140)", "stroke-width": 2 });
      }
    } else if (paso.que === "mango") {
      el(s, "ellipse", { cx: CX, cy: CY, rx: 14, ry: 30, fill: "rgb(250,226,150)", opacity: 0.8 }); // la pepa se adivina
      for (let i = 0; i < 6; i++) el(s, "path", { d: `M${CX - 34 + i * 12} ${CY - 26} q4 26 0 52`, fill: "none", stroke: "rgb(240,176,50)", "stroke-width": 2, opacity: 0.6 });
    } else if (paso.que === "maduro") {
      el(s, "circle", { cx: CX, cy: CY, r: 10, fill: "rgb(236,190,90)" });
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + 0.5;
        el(s, "line", { x1: CX, y1: CY, x2: CX + 20 * Math.cos(a), y2: CY + 20 * Math.sin(a), stroke: "rgb(230,180,80)", "stroke-width": 3 });
      }
    }
    const COLOR_CASCARA = { mango: "rgb(110,170,60)", papaya: "rgb(150,190,70)", maduro: "rgb(70,52,40)", loto: "rgb(196,150,110)" };
    const cascaraColor = COLOR_CASCARA[paso.que] || I.color;
    // la cascara: borde de tinta + color (el borde ayuda a que se vea "piel")
    const cascaraBorde = el(s, "path", { d: "", fill: "none", stroke: TINTA, "stroke-width": 15, "stroke-linecap": "round" });
    const cascara = el(s, "path", { d: "", fill: "none", stroke: cascaraColor, "stroke-width": 10, "stroke-linecap": "round" });
    const tira = el(s, "g", {});
    const inicio = el(s, "circle", { cx: CX + R, cy: CY, r: 8, fill: "rgb(120,190,110)", stroke: TINTA, "stroke-width": 2 });
    ayuda("Start at the green dot and go around the edge, inside the ring");
    let girado = 0; // radianes pelados
    let prevAng = null;
    let roturas = 0;
    let dentro = true;
    let base = 0; // donde empezo
    let sentido = 0; // +1 horario, -1 antihorario (lo elige ella con el primer movimiento)
    const pintar = () => {
      if (girado >= Math.PI * 2 - 0.01) {
        cascara.setAttribute("d", "");
        cascaraBorde.setAttribute("d", "");
        return;
      }
      // lo que falta pelar, como arco en sentido horario de a0 a a1 (en dos mitades: un arco de 360 no se dibuja)
      const a0 = sentido >= 0 ? base + girado : base;
      const a1 = sentido >= 0 ? base + Math.PI * 2 : base + Math.PI * 2 - girado;
      const pt = (a) => `${(CX + R * Math.cos(a)).toFixed(2)} ${(CY + R * Math.sin(a)).toFixed(2)}`;
      const medio = (a0 + a1) / 2;
      const d = `M${pt(a0)} A${R} ${R} 0 0 1 ${pt(medio)} A${R} ${R} 0 0 1 ${pt(a1 - 0.001)}`;
      cascara.setAttribute("d", d);
      cascaraBorde.setAttribute("d", d);
    };
    pintar();
    s.addEventListener("pointerdown", (e) => {
      if (!vivo) return;
      e.preventDefault();
      try {
        s.setPointerCapture(e.pointerId);
      } catch (err) {
        /* nada */
      }
      const p = aSvg(e);
      const d = Math.hypot(p[0] - CX, p[1] - CY);
      if (Math.abs(d - R) <= BANDA + 6) {
        prevAng = Math.atan2(p[1] - CY, p[0] - CX);
        if (girado === 0) {
          base = prevAng; // empieza donde ella toco
          inicio.setAttribute("cx", CX + R * Math.cos(base));
          inicio.setAttribute("cy", CY + R * Math.sin(base));
        }
        dentro = true;
      }
    });
    s.addEventListener("pointermove", (e) => {
      if (!vivo || prevAng === null) return;
      const p = aSvg(e);
      const d = Math.hypot(p[0] - CX, p[1] - CY);
      const a = Math.atan2(p[1] - CY, p[0] - CX);
      let da = a - prevAng;
      if (da > Math.PI) da -= 2 * Math.PI;
      if (da < -Math.PI) da += 2 * Math.PI;
      prevAng = a;
      if (Math.abs(d - R) > BANDA) {
        if (dentro) {
          dentro = false;
          roturas++;
          sonar("no");
          vibrar(30);
          ayuda("Oops, the peel broke! Keep going around");
        }
        return;
      }
      dentro = true;
      if (!sentido && Math.abs(da) > 0.02) sentido = da > 0 ? 1 : -1;
      const avance = da * sentido;
      if (sentido && avance > 0) {
        girado = Math.min(Math.PI * 2, girado + avance);
        // la tira de cascara que cuelga
        if (Math.random() < 0.3) el(tira, "rect", { x: p[0] + 6, y: p[1], width: 5, height: 3, fill: cascaraColor, transform: `rotate(${(a * 180) / Math.PI} ${p[0]} ${p[1]})` });
        inicio.setAttribute("opacity", 0.25);
        pintar();
        if (girado >= Math.PI * 2 - 0.01) fin(roturas === 0 ? 3 : roturas <= 2 ? 2 : 1);
      }
    });
    s.addEventListener("pointerup", () => {
      prevAng = null;
    });
  }

  // ---------- MANGA (v61) ----------
  // mantener apretado encima de cada circulo: el copito crece; soltar cuando llena el anillo
  else if (paso.t === "manga") {
    const N = mas(paso.n || 4, 2);
    const color = paso.color || "rgb(255,214,110)";
    const fondo = paso.fondo || null;
    if (fondo) el(s, "ellipse", { cx: 150, cy: 108, rx: 120, ry: 70, fill: fondo, stroke: TINTA, "stroke-width": 3 });
    const puntos = Array.from({ length: N }, (_, i) => {
      const fila = i % 2;
      const x = 150 + (i - (N - 1) / 2) * Math.min(52, 200 / N);
      return { x, y: 96 + fila * 26, r: 0, hecho: false };
    });
    const OBJ = 14; // radio justo
    const TOL = ancho(3.5) + 0.5;
    for (const p of puntos) {
      if (!fondo) el(s, "circle", { cx: p.x, cy: p.y, r: 20, fill: "rgb(214,170,104)", stroke: TINTA, "stroke-width": 3 }); // la tarteleta
      el(s, "circle", { cx: p.x, cy: p.y, r: OBJ, fill: "none", stroke: "rgb(80,150,80)", "stroke-width": 2, "stroke-dasharray": "4 3" });
      p.el = el(s, "circle", { cx: p.x, cy: p.y, r: 0, fill: color, stroke: TINTA, "stroke-width": 2 });
    }
    const manga = el(s, "g", { opacity: 0.9 });
    el(manga, "path", { d: "M-12 -46 L12 -46 L3 -8 L-3 -8 Z", fill: "rgb(246,240,226)", stroke: TINTA, "stroke-width": 3 });
    el(manga, "rect", { x: -3, y: -10, width: 6, height: 6, fill: "rgb(190,196,206)", stroke: TINTA, "stroke-width": 2 });
    manga.setAttribute("transform", "translate(150 40)");
    ayuda("Hold on each circle · let go when it fills the green ring");
    let actual = null;
    let buenos = 0;
    let hechos = 0;
    s.addEventListener("pointerdown", (e) => {
      if (!vivo) return;
      e.preventDefault();
      const p = aSvg(e);
      actual = puntos.find((q) => !q.hecho && Math.hypot(q.x - p[0], q.y - p[1]) < 24) || null;
      if (actual) manga.setAttribute("transform", `translate(${actual.x} ${actual.y})`);
    });
    const soltar = () => {
      if (!vivo || !actual) return;
      const q = actual;
      actual = null;
      if (q.r < 3) return;
      q.hecho = true;
      hechos++;
      const ok = Math.abs(q.r - OBJ) <= TOL;
      if (ok) buenos++;
      sonar(ok ? "tocar" : "no");
      if (hechos >= N) fin(estrellasDeAciertos(buenos, N));
    };
    s.addEventListener("pointerup", soltar);
    s.addEventListener("pointercancel", soltar);
    let tPrevM = 0;
    bucle((t) => {
      const dt = Math.min(50, t - tPrevM) / (1000 / 60);
      tPrevM = t;
      if (actual) {
        actual.r = Math.min(26, actual.r + 0.32 * rapido(0.3) * dt);
        actual.el.setAttribute("r", actual.r.toFixed(1));
        if (actual.r >= 26) soltar();
      }
    });
  }

  // ---------- APILAR (v61) ----------
  // la vaporera va y viene: tocar para soltarla justo encima de la de abajo
  else if (paso.t === "apilar") {
    const N = mas(paso.n || 3, 1);
    const W = 90;
    const H = 18;
    const BASE = 176;
    el(s, "rect", { x: 60, y: BASE, width: 180, height: 8, fill: "rgb(150,154,170)", stroke: TINTA, "stroke-width": 2 }); // la olla de abajo
    const pila = el(s, "g", {});
    const mov = el(s, "g", {});
    const cuenta = el(s, "text", { x: 8, y: 18, "text-anchor": "start", class: "cocina-cuenta" });
    const canasta = (g, x, y) => {
      el(g, "rect", { x: x - W / 2, y, width: W, height: H, fill: "rgb(214,170,104)", stroke: TINTA, "stroke-width": 3 });
      el(g, "line", { x1: x - W / 2 + 3, y1: y + H / 2, x2: x + W / 2 - 3, y2: y + H / 2, stroke: "rgb(170,124,72)", "stroke-width": 2 });
      for (let i = 1; i < 6; i++) el(g, "line", { x1: x - W / 2 + (W * i) / 6, y1: y + 2, x2: x - W / 2 + (W * i) / 6, y2: y + H - 2, stroke: "rgba(170,124,72,0.6)", "stroke-width": 1 });
    };
    let k = 0;
    let suma = 0;
    let arriba = 150; // x de la de abajo
    let x = 60;
    let dir = 1;
    let cayendo = null;
    const VEL = 110 * rapido(0.35); // px por segundo
    let tPrev = 0;
    cuenta.textContent = `STACK 0 / ${N}`;
    ayuda("Tap to drop the steamer right on top of the one below");
    s.addEventListener("pointerdown", (e) => {
      if (!vivo || cayendo) return;
      e.preventDefault();
      cayendo = { x, y: 40 };
    });
    bucle((t) => {
      const dt = Math.min(0.05, (t - tPrev) / 1000);
      tPrev = t;
      mov.innerHTML = "";
      if (!cayendo) {
        x += dir * VEL * dt;
        if (x > 240) dir = -1;
        if (x < 60) dir = 1;
        canasta(mov, x, 40);
      } else {
        const destino = BASE - (k + 1) * H;
        cayendo.y = Math.min(destino, cayendo.y + 420 * dt);
        canasta(mov, cayendo.x, cayendo.y);
        if (cayendo.y >= destino) {
          const off = Math.abs(cayendo.x - arriba);
          const e = off <= ancho(8) + 2 ? 3 : off <= ancho(22) + 4 ? 2 : 1;
          suma += e;
          canasta(pila, cayendo.x, destino);
          arriba = cayendo.x;
          k++;
          cuenta.textContent = `STACK ${k} / ${N}`;
          sonar(e === 3 ? "tocar" : e === 2 ? "hito" : "no");
          vibrar(e === 3 ? 12 : 25);
          cayendo = null;
          x = Math.random() < 0.5 ? 60 : 240;
          dir = x < 150 ? 1 : -1;
          if (k >= N) fin(Math.round(suma / N));
        }
      }
    });
  }

  // ---------- BOLITAS (v61) ----------
  // hacer circulitos con el dedo sobre la masa hasta que quede bien redonda (y no pasarse)
  else if (paso.t === "bolitas") {
    const N = mas(paso.n || 3, 1);
    const color = paso.color || MASA;
    const cuenta = el(s, "text", { x: 8, y: 18, "text-anchor": "start", class: "cocina-cuenta" });
    const hechas = el(s, "g", {});
    const masa = el(s, "path", { d: "", fill: color, stroke: TINTA, "stroke-width": 3 });
    // el medidor de redondez
    el(s, "rect", { x: 240, y: 40, width: 18, height: 130, fill: "rgb(240,230,200)", stroke: TINTA, "stroke-width": 2 });
    const A = 0.82 - ancho(0.08);
    const B = Math.min(1.02, 0.82 + ancho(0.08) + 0.06);
    el(s, "rect", { x: 240, y: 40 + 130 * (1 - Math.min(1, B)), width: 18, height: 130 * (Math.min(1, B) - A), fill: "rgba(120,190,110,0.5)" });
    const nivel = el(s, "rect", { x: 243, y: 168, width: 12, height: 0, fill: "rgb(232,168,30)" });
    let k = 0;
    let buenos = 0;
    let redondo = 0;
    let prevAng = null;
    let dedo = false;
    const forma = () => {
      // de un bollo deforme a una bola (mas puntas = menos redonda)
      const pts = [];
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const r = 30 + (1 - redondo) * 10 * Math.sin(a * 3 + k);
        pts.push(`${(130 + r * Math.cos(a)).toFixed(1)},${(104 + r * Math.sin(a) * (0.75 + 0.25 * redondo)).toFixed(1)}`);
      }
      masa.setAttribute("d", `M${pts.join(" L")} Z`);
      nivel.setAttribute("y", 168 - 126 * Math.min(1, redondo));
      nivel.setAttribute("height", 126 * Math.min(1, redondo));
      cuenta.textContent = `BALL ${k + 1} / ${N}`;
    };
    forma();
    ayuda("Rub little circles on the dough · then Ready when it's round");
    s.addEventListener("pointerdown", (e) => {
      if (!vivo) return;
      e.preventDefault();
      try {
        s.setPointerCapture(e.pointerId);
      } catch (err) {
        /* nada */
      }
      dedo = true;
      const p = aSvg(e);
      prevAng = Math.atan2(p[1] - 104, p[0] - 130);
    });
    s.addEventListener("pointermove", (e) => {
      if (!vivo || !dedo) return;
      const p = aSvg(e);
      const a = Math.atan2(p[1] - 104, p[0] - 130);
      let da = a - prevAng;
      if (da > Math.PI) da -= 2 * Math.PI;
      if (da < -Math.PI) da += 2 * Math.PI;
      prevAng = a;
      if (Math.hypot(p[0] - 130, p[1] - 104) < 60) {
        redondo = Math.min(1.25, redondo + Math.abs(da) * 0.035 * rapido(0.3));
        forma();
      }
    });
    s.addEventListener("pointerup", () => {
      dedo = false;
    });
    boton("Ready ✓", () => {
      if (!vivo) return;
      const ok = redondo >= A && redondo <= B;
      if (ok) buenos++;
      sonar(ok ? "tocar" : "no");
      el(hechas, "circle", { cx: 40 + k * 26, cy: 176, r: 10, fill: color, stroke: TINTA, "stroke-width": 2, opacity: ok ? 1 : 0.6 });
      k++;
      if (k >= N) {
        fin(estrellasDeAciertos(buenos, N));
        return;
      }
      redondo = 0;
      forma();
    });
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
      <div class="cocina-elegir-opciones">${opciones.map((o) => `<button type="button" class="cocina-opcion" data-op="${esc(o.id)}" style="--c:${esc(o.color || "#fff")}">${o.icono ? `<img src="${esc(o.icono)}" alt="" draggable="false" />` : "<i></i>"}${esc(o.nombre)}</button>`).join("")}</div>`;
    area.appendChild(caja);
    const puestos = caja.querySelector("[data-puestos]");
    // v63 (rom: "literalmente es un cuadrado de color"): lo que se agrega aparece en el plato,
    // dibujado, alrededor del borde de abajo (como platitos de salsa y cosas encima)
    const pintar = () => {
      const ids = [...elegido];
      const n = ids.length;
      puestos.innerHTML = ids
        .map((id, k) => {
          const o = opciones.find((x) => x.id === id) || {};
          const ang = ((n === 1 ? 60 : 150 - (k * 120) / Math.max(1, n - 1)) * Math.PI) / 180; // de abajo-izq a abajo-der
          const x = 50 + 44 * Math.cos(ang);
          const y = 50 + 40 * Math.sin(ang);
          return o.icono ? `<img src="${esc(o.icono)}" alt="" draggable="false" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%" />` : `<span style="--c:${esc(o.color || "#fff")};left:${x.toFixed(1)}%;top:${y.toFixed(1)}%"></span>`;
        })
        .join("");
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
