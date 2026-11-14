/**
 * coccion.js — v63: lo que se ve adentro de la olla / vaporera / sarten / horno al cocinar.
 *
 * rom: "por ejemplo cuando cocinamos, aparece el plato ya terminado adentro de la olla".
 * Antes se ponia el dibujo del plato servido (con su plato) adentro de la olla. Ahora cada
 * receta tiene sus piezas dibujadas (baos, jiaozi, empanadas, sopa…) que entran crudas,
 * se van cocinando (cambian de color, se inflan, flotan, se doran) y se pasan si te demoras.
 *
 * dibujarCoccion(svg, como, recetaId) -> { actualizar(x, A, B), voltear(), ok }
 *   x: la aguja (0..1). Cocido en el centro del verde, quemado pasando el verde.
 */

const SVG = "http://www.w3.org/2000/svg";
const TINTA = "rgb(22,20,22)";
function el(padre, tag, attrs = {}) {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  padre.appendChild(e);
  return e;
}
const rgb = (s) => s.match(/\d+/g).map(Number);
const mezcla = (a, b, t) => {
  const A = rgb(a);
  const B = rgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * Math.max(0, Math.min(1, t)))).join(",")})`;
};

// ---------------- que se cocina en cada receta ----------------
// tipo de pieza y cuantas; el recipiente sale de paso.como
export const EN_LA_OLLA = {
  bao_cerdo: { pieza: "bao", n: 3 },
  bao_verdura: { pieza: "bao", n: 3, punto: "rgb(110,170,80)" },
  bao_frijol: { pieza: "bao", n: 3 }, // el puntito rojo se pone despues (PIPE)
  liusha: { pieza: "bao", n: 3, punto: "rgb(250,190,60)" },
  xiaolongbao: { pieza: "xlb", n: 4 },
  hargow: { pieza: "hargow", n: 4 },
  siumai: { pieza: "siumai", n: 4 },
  jiaozi: { pieza: "jiaozi", n: 4 },
  guotie: { pieza: "guotie", n: 4 },
  empanada: { pieza: "empanada", n: 3 },
  bunuelos: { pieza: "bola", n: 4, crudo: "rgb(250,236,190)", cocido: "rgb(226,150,60)" },
  pandebono: { pieza: "bola", n: 4, crudo: "rgb(250,236,190)", cocido: "rgb(236,180,90)" },
  tangyuan: { pieza: "bola", n: 4, crudo: "rgb(236,232,222)", cocido: "rgb(253,252,248)", brillo: true },
  patacones: { pieza: "patacon", n: 4 },
  arepa: { pieza: "arepa", n: 1 },
  congyoubing: { pieza: "pancake", n: 1 },
  chunjuan: { pieza: "rollo", n: 3 },
  aborrajados: { pieza: "aborrajado", n: 3 },
  dan_ta: { pieza: "tarta", n: 4 },
  luna: { pieza: "luna", n: 2 },
  pollo_mendigo: { pieza: "barro", n: 1 },
  zongzi: { pieza: "zongzi", n: 2 },
  tamal: { pieza: "tamal", n: 2 },
  ouzi: { pieza: "loto", n: 1 },
  dongpo: { pieza: "dongpo", n: 2 },
  pescado_vinagre: { pieza: "pescado", n: 1 },
  fideos: { pieza: "fideos", n: 1 },
  lamian: { pieza: "fideos", n: 1, grueso: true },
  ajiaco: { pieza: "sopa", n: 1, caldo: "rgb(250,214,110)", trozos: ["rgb(250,226,120)", "rgb(240,200,80)", "rgb(120,160,60)"] },
  sopa_ternera: { pieza: "sopa", n: 1, caldo: "rgb(214,180,120)", trozos: ["rgb(170,70,60)", "rgb(255,226,110)", "rgb(110,170,80)"] },
  tanghulu: { pieza: "pincho", n: 2, cocido: "rgb(214,120,40)" },
  osmanto: { pieza: "gelatina", n: 1 },
};

/**
 * Dibuja el recipiente con las piezas adentro. Devuelve null si la receta no tiene piezas
 * (entonces cocina.js usa el dibujo de antes).
 */
export function dibujarCoccion(s, como, recetaId) {
  const R = EN_LA_OLLA[recetaId];
  if (!R || como === "calentar") return null;
  const pintables = []; // [elemento, atributo, crudo, cocido, quemado]
  const humedo = como === "vapor" || como === "hervir" || como === "enfriar";
  const pc = (e, attr, crudo, cocido, quemado) => {
    // pasado: frito/horno/plancha/caramelo se quema (marron oscuro); al vapor o hervido queda aguado y gris
    const pasado = como === "enfriar" ? mezcla(cocido, "rgb(214,236,250)", 0.6) : humedo ? mezcla(cocido, "rgb(170,164,150)", 0.6) : mezcla(cocido, "rgb(70,46,30)", 0.75);
    pintables.push([e, attr, crudo, cocido, quemado || pasado]);
    return e;
  };
  const animados = []; // (g, t, x) => {}
  // todo un poco mas grande y mas arriba (el medidor esta abajo)
  const raiz = el(s, "g", { transform: "translate(150 90) scale(1.13) translate(-150 -100)" });
  const fondo = el(raiz, "g", {});
  const piezas = el(raiz, "g", {});
  const frente = el(raiz, "g", {});
  const extra = el(raiz, "g", {});

  // ---------- los recipientes (fondo: lo de atras; frente: la pared de adelante) ----------
  let lugares; // [cx, cy (la base de la pieza), escala]
  const n = R.n;
  const fila = (y, x0, x1, k) => Array.from({ length: n }, (_, i) => [n === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * i) / (n - 1), y + (i % 2) * 4, k]);
  if (como === "vapor") {
    // la vaporera de bambu, abierta, vista un poquito desde arriba
    el(fondo, "ellipse", { cx: 150, cy: 92, rx: 86, ry: 20, fill: "rgb(150,104,60)", stroke: TINTA, "stroke-width": 3 });
    el(fondo, "ellipse", { cx: 150, cy: 96, rx: 78, ry: 14, fill: "rgb(240,232,206)" }); // el papelito
    for (let i = 0; i < 9; i++) el(fondo, "circle", { cx: 96 + i * 13.5, cy: 96 + (i % 2) * 3, r: 1.4, fill: "rgb(214,204,176)" });
    el(frente, "path", { d: "M64 92 L64 146 Q150 172 236 146 L236 92 Q150 128 64 92 Z", fill: "rgb(214,170,104)", stroke: TINTA, "stroke-width": 3 });
    el(frente, "path", { d: "M64 118 Q150 148 236 118", fill: "none", stroke: "rgb(170,124,72)", "stroke-width": 3 });
    for (let i = 1; i < 9; i++) el(frente, "line", { x1: 64 + i * 19, y1: 98 + Math.sin((i / 9) * Math.PI) * 14, x2: 64 + i * 19, y2: 148 + Math.sin((i / 9) * Math.PI) * 10, stroke: "rgba(170,124,72,0.55)", "stroke-width": 2 });
    lugares = fila(105, n <= 3 ? 100 : 90, n <= 3 ? 200 : 210, n <= 3 ? 1.3 : 1.1);
  } else if (como === "hervir" || como === "caramelo") {
    const agua = como === "caramelo" ? "rgb(214,130,60)" : R.caldo || "rgb(190,222,240)";
    el(fondo, "ellipse", { cx: 150, cy: 88, rx: 88, ry: 18, fill: "rgb(90,94,108)", stroke: TINTA, "stroke-width": 3 });
    el(fondo, "ellipse", { cx: 150, cy: 94, rx: 82, ry: 13, fill: agua });
    if (R.pieza !== "sopa") el(fondo, "ellipse", { cx: 130, cy: 92, rx: 24, ry: 3, fill: "rgba(255,255,255,0.45)" });
    el(frente, "path", { d: "M62 88 L62 148 Q150 170 238 148 L238 88 Q150 124 62 88 Z", fill: "rgb(150,154,170)", stroke: TINTA, "stroke-width": 3 });
    el(frente, "path", { d: "M74 108 Q150 134 226 108", fill: "none", stroke: "rgba(255,255,255,0.35)", "stroke-width": 4 });
    el(frente, "rect", { x: 38, y: 94, width: 26, height: 9, rx: 3, fill: "rgb(80,80,92)", stroke: TINTA, "stroke-width": 3 });
    el(frente, "rect", { x: 236, y: 94, width: 26, height: 9, rx: 3, fill: "rgb(80,80,92)", stroke: TINTA, "stroke-width": 3 });
    lugares = fila(102, n <= 2 ? 112 : 92, n <= 2 ? 188 : 208, n <= 2 ? 1.25 : 1.05);
    // las burbujas del hervor
    const burb = el(fondo, "g", {});
    const bs = Array.from({ length: 8 }, (_, i) => el(burb, "circle", { cx: 84 + i * 19, cy: 94, r: 0, fill: "none", stroke: "rgba(255,255,255,0.85)", "stroke-width": 1.5 }));
    animados.push((t) => bs.forEach((b, i) => b.setAttribute("r", (Math.max(0, Math.sin(t / 220 + i * 1.7)) * 3.5 * Math.min(1, t / 900)).toFixed(1))));
  } else if (como === "freir") {
    // la olla honda con aceite
    el(fondo, "ellipse", { cx: 150, cy: 90, rx: 90, ry: 20, fill: "rgb(50,50,60)", stroke: TINTA, "stroke-width": 3 });
    el(fondo, "ellipse", { cx: 150, cy: 96, rx: 82, ry: 14, fill: "rgb(250,206,100)" });
    el(frente, "path", { d: "M60 90 L66 140 Q150 166 234 140 L240 90 Q150 128 60 90 Z", fill: "rgb(60,60,72)", stroke: TINTA, "stroke-width": 3 });
    el(frente, "rect", { x: 238, y: 96, width: 54, height: 10, rx: 4, fill: "rgb(110,72,50)", stroke: TINTA, "stroke-width": 3 });
    lugares = fila(104, n <= 3 ? 100 : 92, n <= 3 ? 200 : 208, n <= 3 ? 1.25 : 1.05);
    const burb = el(extra, "g", {});
    const bs = Array.from({ length: 12 }, (_, i) => el(burb, "circle", { cx: 80 + i * 12.5, cy: 100 + (i % 3) * 2, r: 0, fill: "rgba(255,250,220,0.9)", stroke: "rgb(214,160,60)", "stroke-width": 1 }));
    animados.push((t) => bs.forEach((b, i) => b.setAttribute("r", (Math.max(0, Math.sin(t / 90 + i * 2.3)) * 2.6).toFixed(1))));
  } else if (como === "plancha") {
    el(fondo, "ellipse", { cx: 150, cy: 112, rx: 98, ry: 36, fill: "rgb(60,60,70)", stroke: TINTA, "stroke-width": 3 });
    el(fondo, "ellipse", { cx: 150, cy: 106, rx: 86, ry: 28, fill: "rgb(96,96,108)" });
    el(fondo, "rect", { x: 244, y: 104, width: 50, height: 10, rx: 4, fill: "rgb(110,72,50)", stroke: TINTA, "stroke-width": 3 });
    lugares = fila(118, n === 1 ? 150 : 100, n === 1 ? 150 : 200, n === 1 ? 1.4 : 1.2);
  } else if (como === "horno") {
    el(fondo, "rect", { x: 56, y: 40, width: 188, height: 122, rx: 8, fill: "rgb(80,70,80)", stroke: TINTA, "stroke-width": 3 });
    const luz = el(fondo, "rect", { x: 72, y: 54, width: 156, height: 88, fill: "rgb(120,70,50)", stroke: TINTA, "stroke-width": 3 });
    el(fondo, "rect", { x: 80, y: 122, width: 140, height: 6, fill: "rgb(170,170,180)", stroke: TINTA, "stroke-width": 2 }); // la bandeja
    animados.push((t) => luz.setAttribute("fill", mezcla("rgb(120,70,50)", "rgb(250,170,90)", t / 700)));
    el(frente, "rect", { x: 72, y: 54, width: 156, height: 10, fill: "rgba(255,255,255,0.18)" });
    for (let i = 0; i < 3; i++) el(frente, "circle", { cx: 100 + i * 50, cy: 151, r: 4, fill: "rgb(200,200,210)", stroke: TINTA, "stroke-width": 2 });
    lugares = fila(122, n === 1 ? 150 : 104, n === 1 ? 150 : 196, n === 1 ? 1.4 : n <= 2 ? 1.25 : 1.05);
  } else if (como === "enfriar") {
    el(fondo, "rect", { x: 70, y: 40, width: 160, height: 124, rx: 8, fill: "rgb(214,236,248)", stroke: TINTA, "stroke-width": 3 });
    el(fondo, "rect", { x: 78, y: 122, width: 144, height: 5, fill: "rgb(170,200,220)" }); // la rejilla
    for (let i = 0; i < 5; i++) el(frente, "rect", { x: 82 + i * 30, y: 46, width: 3, height: 7, fill: "rgba(255,255,255,0.9)" }); // escarcha
    lugares = fila(122, 150, 150, 1.5);
  } else return null;

  // ---------- las piezas ----------
  const MASA_C = "rgb(236,228,206)";
  const MASA_OK = "rgb(253,251,245)";
  const DORADO = "rgb(232,166,66)";
  const pieza = (cx, cy, k, i) => {
    const g = el(piezas, "g", { transform: `translate(${cx} ${cy}) scale(${k})` });
    const p = R.pieza;
    if (p === "bao") {
      const cuerpo = pc(el(g, "path", { d: "M-22 0 Q-24 -26 0 -28 Q24 -26 22 0 Z", stroke: TINTA, "stroke-width": 3 }), "fill", MASA_C, MASA_OK, "rgb(200,190,170)");
      void cuerpo;
      for (const a of [-14, -7, 0, 7, 14]) el(g, "path", { d: `M0 -26 Q${a * 0.6} -20 ${a} -12`, fill: "none", stroke: "rgba(150,130,110,0.55)", "stroke-width": 1.5 });
      if (R.punto) el(g, "circle", { cx: 0, cy: -24, r: 3, fill: R.punto, stroke: TINTA, "stroke-width": 1 });
      el(g, "ellipse", { cx: -10, cy: -16, rx: 4, ry: 2, fill: "rgba(255,255,255,0.7)" });
      g._inflar = true;
    } else if (p === "xlb") {
      pc(el(g, "path", { d: "M-18 0 Q-20 -18 0 -22 Q20 -18 18 0 Z", stroke: TINTA, "stroke-width": 3 }), "fill", MASA_C, "rgb(250,246,236)");
      for (let a = -15; a <= 15; a += 5) el(g, "path", { d: `M0 -21 L${a} -6`, stroke: "rgba(150,130,110,0.5)", "stroke-width": 1.2 });
      el(g, "circle", { cx: 0, cy: -22, r: 2.5, fill: "rgb(236,228,206)", stroke: TINTA, "stroke-width": 1.5 });
      g._inflar = true;
    } else if (p === "hargow") {
      // la piel se vuelve transparente y se ve el camaron
      const camaron = el(g, "path", { d: "M-8 -6 Q0 -18 9 -8", fill: "none", stroke: "rgb(244,140,110)", "stroke-width": 5, "stroke-linecap": "round", opacity: 0 });
      pc(el(g, "path", { d: "M-20 0 Q-18 -22 0 -22 Q18 -22 20 0 Z", stroke: TINTA, "stroke-width": 3, "fill-opacity": 1 }), "fill", "rgb(246,244,238)", "rgb(236,236,226)");
      el(g, "path", { d: "M-14 -18 Q0 -26 14 -18", fill: "none", stroke: "rgba(160,150,140,0.6)", "stroke-width": 1.5 });
      g._camaron = camaron;
      g.insertBefore(camaron, null);
    } else if (p === "siumai") {
      pc(el(g, "path", { d: "M-14 0 L-15 -20 Q0 -24 15 -20 L14 0 Z", stroke: TINTA, "stroke-width": 3 }), "fill", "rgb(250,232,150)", "rgb(250,214,90)");
      pc(el(g, "ellipse", { cx: 0, cy: -20, rx: 14, ry: 4, stroke: TINTA, "stroke-width": 2 }), "fill", "rgb(236,170,160)", "rgb(200,120,96)");
      el(g, "circle", { cx: 0, cy: -21, r: 2.5, fill: "rgb(250,130,40)" });
    } else if (p === "jiaozi" || p === "guotie" || p === "empanada") {
      const ancho = p === "guotie" ? 26 : 22;
      const crudo = p === "empanada" ? "rgb(250,232,180)" : MASA_C;
      const cocido = p === "empanada" ? DORADO : p === "guotie" ? "rgb(250,244,230)" : "rgb(250,248,238)";
      pc(el(g, "path", { d: `M${-ancho} 0 Q${-ancho} -24 0 -24 Q${ancho} -24 ${ancho} 0 Z`, stroke: TINTA, "stroke-width": 3 }), "fill", crudo, cocido);
      if (p === "guotie") pc(el(g, "rect", { x: -ancho + 2, y: -5, width: ancho * 2 - 4, height: 4, rx: 2 }), "fill", crudo, "rgb(214,140,60)", "rgb(80,50,30)"); // la base dorada
      if (p === "empanada") for (let a = -18; a <= 18; a += 6) el(g, "circle", { cx: a, cy: -2, r: 1.4, fill: "rgba(150,90,40,0.6)" }); // el borde con tenedor
      else for (let a = -14; a <= 14; a += 7) el(g, "path", { d: `M${a} -22 q2 4 0 8`, fill: "none", stroke: "rgba(150,130,110,0.55)", "stroke-width": 1.5 });
    } else if (p === "bola") {
      pc(el(g, "circle", { cx: 0, cy: -13, r: 13, stroke: TINTA, "stroke-width": 3 }), "fill", R.crudo, R.cocido);
      el(g, "ellipse", { cx: -5, cy: -18, rx: 4, ry: 2.5, fill: "rgba(255,255,255,0.6)" });
      if (R.brillo) g._inflar = true;
    } else if (p === "patacon") {
      pc(el(g, "ellipse", { cx: 0, cy: -8, rx: 16, ry: 9, stroke: TINTA, "stroke-width": 3 }), "fill", "rgb(220,226,140)", DORADO);
      pc(el(g, "ellipse", { cx: 0, cy: -9, rx: 10, ry: 5 }), "fill", "rgb(236,240,170)", "rgb(250,206,110)");
    } else if (p === "arepa") {
      pc(el(g, "ellipse", { cx: 0, cy: -10, rx: 40, ry: 14, stroke: TINTA, "stroke-width": 3 }), "fill", "rgb(250,236,180)", "rgb(240,214,140)");
      for (const [x, y] of [[-20, -12], [6, -8], [22, -13], [-6, -15]]) pc(el(g, "ellipse", { cx: x, cy: y, rx: 5, ry: 2.5 }), "fill", "rgb(250,236,180)", "rgb(196,130,60)", "rgb(40,30,24)");
    } else if (p === "pancake") {
      pc(el(g, "ellipse", { cx: 0, cy: -10, rx: 44, ry: 15, stroke: TINTA, "stroke-width": 3 }), "fill", "rgb(250,236,196)", DORADO);
      for (let i = 0; i < 12; i++) el(g, "rect", { x: -34 + ((i * 23) % 64), y: -18 + ((i * 7) % 14), width: 4, height: 2, fill: "rgb(90,160,70)" });
    } else if (p === "rollo") {
      pc(el(g, "rect", { x: -26, y: -14, width: 52, height: 13, rx: 6.5, stroke: TINTA, "stroke-width": 3 }), "fill", "rgb(250,240,214)", DORADO);
      pc(el(g, "rect", { x: -22, y: -12, width: 44, height: 3, rx: 1.5 }), "fill", "rgb(255,250,236)", "rgb(250,210,120)");
    } else if (p === "aborrajado") {
      pc(el(g, "ellipse", { cx: 0, cy: -10, rx: 20, ry: 10, stroke: TINTA, "stroke-width": 3 }), "fill", "rgb(250,236,190)", "rgb(226,150,60)");
      el(g, "path", { d: "M-12 -14 q6 -3 12 0 q6 3 12 0", fill: "none", stroke: "rgba(255,255,255,0.5)", "stroke-width": 2 });
    } else if (p === "tarta") {
      pc(el(g, "path", { d: "M-16 0 L-19 -12 L19 -12 L16 0 Z", stroke: TINTA, "stroke-width": 3 }), "fill", "rgb(240,214,160)", "rgb(220,160,80)");
      pc(el(g, "ellipse", { cx: 0, cy: -12, rx: 17, ry: 4.5, stroke: TINTA, "stroke-width": 2 }), "fill", "rgb(255,236,140)", "rgb(255,200,60)");
      const manchas = [[-6, -13], [5, -11], [9, -13]].map(([x, y]) => el(g, "circle", { cx: x, cy: y, r: 2, fill: "rgb(160,80,30)", opacity: 0 }));
      g._manchas = manchas;
    } else if (p === "luna") {
      pc(el(g, "rect", { x: -20, y: -18, width: 40, height: 18, rx: 4, stroke: TINTA, "stroke-width": 3 }), "fill", "rgb(240,214,160)", "rgb(206,130,56)");
      pc(el(g, "ellipse", { cx: 0, cy: -18, rx: 20, ry: 5, stroke: TINTA, "stroke-width": 2 }), "fill", "rgb(246,224,176)", "rgb(220,150,70)");
      el(g, "circle", { cx: 0, cy: -18, r: 3, fill: "none", stroke: "rgba(120,70,30,0.6)", "stroke-width": 1.5 });
    } else if (p === "barro") {
      // el pollo envuelto en hoja de loto y barro
      pc(el(g, "ellipse", { cx: 0, cy: -18, rx: 40, ry: 19, stroke: TINTA, "stroke-width": 3 }), "fill", "rgb(170,120,80)", "rgb(196,150,100)", "rgb(90,60,40)");
      for (const [x, y] of [[-20, -24], [4, -30], [18, -16], [-8, -12]]) el(g, "path", { d: `M${x} ${y} l6 3 l-4 4`, fill: "none", stroke: "rgba(80,50,30,0.5)", "stroke-width": 2 });
      const grietas = el(g, "path", { d: "M-6 -36 l4 6 l-3 5 l5 6", fill: "none", stroke: TINTA, "stroke-width": 2, opacity: 0 });
      g._grietas = grietas;
    } else if (p === "zongzi") {
      pc(el(g, "path", { d: "M-22 0 L0 -32 L22 0 Z", stroke: TINTA, "stroke-width": 3, "stroke-linejoin": "round" }), "fill", "rgb(120,176,80)", "rgb(96,140,64)");
      el(g, "line", { x1: -14, y1: -11, x2: 14, y2: -11, stroke: "rgb(236,220,170)", "stroke-width": 3 });
      el(g, "line", { x1: -8, y1: -1, x2: 4, y2: -26, stroke: "rgba(170,210,130,0.6)", "stroke-width": 1.5 });
    } else if (p === "tamal") {
      pc(el(g, "rect", { x: -24, y: -22, width: 48, height: 22, rx: 3, stroke: TINTA, "stroke-width": 3 }), "fill", "rgb(120,176,80)", "rgb(96,140,64)");
      el(g, "line", { x1: -6, y1: -22, x2: -6, y2: 0, stroke: "rgb(236,220,170)", "stroke-width": 3 });
      el(g, "line", { x1: 8, y1: -22, x2: 8, y2: 0, stroke: "rgb(236,220,170)", "stroke-width": 3 });
    } else if (p === "loto") {
      pc(el(g, "rect", { x: -40, y: -20, width: 74, height: 20, rx: 10, stroke: TINTA, "stroke-width": 3 }), "fill", "rgb(226,200,160)", "rgb(176,120,90)");
      pc(el(g, "ellipse", { cx: 34, cy: -10, rx: 8, ry: 10, stroke: TINTA, "stroke-width": 2 }), "fill", "rgb(246,236,220)", "rgb(214,170,140)");
      for (const [x, y] of [[32, -14], [36, -8], [31, -6]]) el(g, "circle", { cx: x, cy: y, r: 1.6, fill: "rgb(250,248,240)" }); // el arroz en los huecos
    } else if (p === "dongpo") {
      pc(el(g, "rect", { x: -16, y: -26, width: 32, height: 26, rx: 3, stroke: TINTA, "stroke-width": 3 }), "fill", "rgb(236,150,130)", "rgb(170,80,50)");
      pc(el(g, "rect", { x: -14, y: -16, width: 28, height: 4 }), "fill", "rgb(252,236,214)", "rgb(240,200,160)");
      pc(el(g, "rect", { x: -14, y: -8, width: 28, height: 3 }), "fill", "rgb(252,236,214)", "rgb(240,200,160)");
      el(g, "path", { d: "M-16 -14 L16 -14 M0 -26 L0 0", stroke: "rgb(236,220,170)", "stroke-width": 1.5 }); // el cordel
    } else if (p === "pescado") {
      pc(el(g, "ellipse", { cx: -6, cy: -10, rx: 40, ry: 12, stroke: TINTA, "stroke-width": 3 }), "fill", "rgb(214,214,206)", "rgb(240,226,200)");
      pc(el(g, "path", { d: "M32 -10 L48 -20 L48 0 Z", stroke: TINTA, "stroke-width": 3, "stroke-linejoin": "round" }), "fill", "rgb(200,200,196)", "rgb(226,206,176)");
      el(g, "circle", { cx: -36, cy: -13, r: 2.5, fill: "#fff", stroke: TINTA, "stroke-width": 1.5 });
      const salsa = el(g, "path", { d: "M-30 -18 Q-6 -24 26 -16", fill: "none", stroke: "rgb(130,60,36)", "stroke-width": 4, opacity: 0 });
      g._salsa = salsa;
    } else if (p === "fideos") {
      const w = R.grueso ? 4.5 : 3.2;
      for (let j = 0; j < 6; j++) {
        const d = `M-44 ${-14 + j * 3} q7 -7 14 0 t14 0 t14 0 t14 0 t14 0 t14 0`;
        el(g, "path", { d, fill: "none", stroke: "rgba(22,20,22,0.55)", "stroke-width": w + 2, "stroke-linecap": "round" });
        pc(el(g, "path", { d, fill: "none", "stroke-width": w, "stroke-linecap": "round" }), "stroke", "rgb(232,214,170)", "rgb(252,244,222)");
      }
      g._ondular = true;
    } else if (p === "sopa") {
      for (let j = 0; j < 9; j++) {
        const col = R.trozos[j % R.trozos.length];
        pc(el(g, "rect", { x: -48 + j * 11, y: -6 - (j % 3) * 4, width: 7, height: 6, rx: 1.5, stroke: "rgba(0,0,0,0.35)", "stroke-width": 1 }), "fill", mezcla(col, "rgb(255,255,255)", 0.35), col);
      }
      g._ondular = true;
    } else if (p === "pincho") {
      el(g, "line", { x1: 0, y1: 10, x2: 0, y2: -58, stroke: "rgb(200,160,110)", "stroke-width": 3 });
      for (let j = 0; j < 4; j++) {
        pc(el(g, "circle", { cx: 0, cy: -8 - j * 13, r: 7, stroke: TINTA, "stroke-width": 2 }), "fill", ["rgb(190,40,40)", "rgb(220,60,70)", "rgb(120,60,140)", "rgb(250,150,40)"][j % 4], mezcla(["rgb(190,40,40)", "rgb(220,60,70)", "rgb(120,60,140)", "rgb(250,150,40)"][j % 4], "rgb(255,200,140)", 0.25));
      }
      // el brillo del caramelo sobre cada fruta (aparece al cocinarse)
      g._caramelo = Array.from({ length: 4 }, (_, j) => el(g, "ellipse", { cx: -2, cy: -11 - j * 13, rx: 3, ry: 2, fill: "rgb(255,240,200)", opacity: 0 }));
    } else if (p === "gelatina") {
      el(g, "path", { d: "M-30 0 L-26 -36 L26 -36 L30 0 Z", fill: "rgba(255,255,255,0.5)", stroke: TINTA, "stroke-width": 3 });
      const jalea = pc(el(g, "path", { d: "M-28 -2 L-25 -30 L25 -30 L28 -2 Z" }), "fill", "rgb(250,222,150)", "rgb(250,196,80)");
      void jalea;
      for (const [x, y] of [[-10, -20], [6, -12], [12, -24], [-4, -8]]) el(g, "circle", { cx: x, cy: y, r: 2, fill: "rgb(255,170,40)" });
      g._cuajar = el(g, "rect", { x: -27, y: -30, width: 54, height: 28, fill: "rgba(255,255,255,0.35)" });
    }
    g._cx = cx;
    g._cy = cy;
    g._k = k;
    g._i = i;
    return g;
  };
  const gs = lugares.map(([cx, cy, k], i) => pieza(cx, cy, k, i));
  // las cosas que flotan (hervir) arrancan hundidas y suben al cocinarse
  const flota = como === "hervir" && !["sopa", "fideos", "pescado", "loto", "dongpo"].includes(R.pieza);

  let voltereta = 0;
  const actualizar = (x, A, B, t) => {
    const centro = (A + B) / 2;
    const coc = Math.min(1, x / centro); // 0 crudo .. 1 justo
    const que = Math.max(0, (x - B) / (1 - B)); // 0 .. 1 pasado
    for (const [e, attr, crudo, cocido, quemado] of pintables) e.setAttribute(attr, que > 0 ? mezcla(cocido, quemado, que) : mezcla(crudo, cocido, coc));
    for (const g of gs) {
      let { _cx: cx, _cy: cy, _k: k } = g;
      let sx = k;
      let sy = k;
      if (g._inflar) {
        const inf = 0.9 + 0.12 * coc - 0.08 * que; // se infla al vaporizarse; pasado se desinfla
        sx = k * inf;
        sy = k * inf;
      }
      if (flota) cy += 14 * (1 - coc) + Math.sin(t / 300 + g._i) * 1.5; // hundido -> flotando
      if (g._ondular) cy += Math.sin(t / 260 + g._i) * 1.2;
      if (voltereta > 0) sy *= Math.abs(Math.cos(voltereta * Math.PI)); // la vuelta en la plancha
      g.setAttribute("transform", `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) scale(${sx.toFixed(3)} ${Math.max(0.05, sy).toFixed(3)})`);
      if (g._camaron) g._camaron.setAttribute("opacity", (0.85 * coc).toFixed(2));
      if (g._manchas) g._manchas.forEach((m) => m.setAttribute("opacity", (Math.max(0, coc - 0.6) * 2.2).toFixed(2)));
      if (g._grietas) g._grietas.setAttribute("opacity", que > 0 ? 1 : 0);
      if (g._salsa) g._salsa.setAttribute("opacity", (0.9 * coc).toFixed(2));
      if (g._caramelo) g._caramelo.forEach((b) => b.setAttribute("opacity", (0.9 * coc * (1 - que)).toFixed(2)));
      if (g._cuajar) g._cuajar.setAttribute("opacity", (1 - coc).toFixed(2));
    }
    for (const a of animados) a(t);
  };
  return {
    ok: true,
    actualizar,
    voltear() {
      // la animacion de dar vuelta (plancha): 300 ms
      const t0 = performance.now();
      const paso = (ahora) => {
        voltereta = Math.min(1, (ahora - t0) / 300);
        if (voltereta < 1) requestAnimationFrame(paso);
        else voltereta = 0;
      };
      requestAnimationFrame(paso);
    },
  };
}
