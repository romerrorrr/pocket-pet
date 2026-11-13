/**
 * restaurante.js
 * ==============
 * v54/v55: Baozi's Dumpling Shop, un juego propio que se abre desde el
 * cartelito rojo del cuarto. Ella lo pidio ("uno de cocina") y rom pidio
 * que se pueda "preparar cada item, que se sienta como un juego en si".
 *
 *   - El local (antes de abrir): el especial del dia (paga el doble), como
 *     le fue la ultima vez, la fama (1 a 5 estrellas), el libro de recetas
 *     y la decoracion del frente.
 *   - El dia: llegan clientes de a uno con su ticket (plato y extras). Cada
 *     plato se prepara paso a paso (cocina.js): amasar, estirar, rellenar,
 *     plegar, cocinar en el punto, verter, emplatar. Cada paso da 1-3
 *     estrellas y el plato sale con el promedio. Sin reloj: ritmo tranquilo.
 *   - Servir: monedas segun la calidad (+ propina con 3 estrellas), una
 *     resena del cliente, y fama.
 *   - Recetas: 18 (dim sum, platos y postres chinos, comida colombiana). Se
 *     desbloquean con los dias del local, sellando lugares o comprandolas.
 *   - Monedas: el primer dia del local de cada dia real paga todo; los
 *     siguientes, un tercio (que no se "farmee").
 *
 * La logica (Restaurante, recetas, pagos) no toca el DOM: test/unit_v55.mjs.
 */

import { HTML_VOLVER, cablearVolver, crearPausa, blindarToques } from "./juegoComun.js";
import { crearPaso, RELLENOS, LIQUIDOS, COCCIONES, INGREDIENTES } from "./cocina.js";

// ------------------------------------------------------------------
// Los datos
// ------------------------------------------------------------------

/** Lo que se puede poner al emplatar (el ticket pide 0 a 2). */
export const EXTRAS = {
  vinagre: { nombre: "Vinegar", color: "rgb(90,60,50)" },
  chile: { nombre: "Chili oil", color: "rgb(214,60,50)" },
  jengibre: { nombre: "Ginger", color: "rgb(240,210,140)" },
  cebollin: { nombre: "Scallions", color: "rgb(110,180,90)" },
  sesamo: { nombre: "Sesame", color: "rgb(240,226,190)" },
  soya: { nombre: "Soy sauce", color: "rgb(70,40,30)" },
  azucar: { nombre: "Sugar", color: "rgb(255,255,255)" },
  perlas: { nombre: "Pearls", color: "rgb(60,40,40)" },
  hielo: { nombre: "Ice", color: "rgb(200,230,250)" },
  limon: { nombre: "Lime", color: "rgb(150,200,80)" },
  aji: { nombre: "Ají", color: "rgb(120,170,60)" },
  queso: { nombre: "Extra cheese", color: "rgb(250,230,150)" },
  panela: { nombre: "Panela", color: "rgb(190,130,60)" },
  huevo: { nombre: "Egg", color: "rgb(255,214,90)" },
  bokchoy: { nombre: "Bok choy", color: "rgb(90,160,80)" },
  osmanto: { nombre: "Osmanthus", color: "rgb(250,190,70)" },
  fresa: { nombre: "Strawberry", color: "rgb(220,60,70)" },
  espino: { nombre: "Hawthorn", color: "rgb(180,40,40)" },
  uva: { nombre: "Grape", color: "rgb(120,60,140)" },
  mandarina: { nombre: "Mandarin", color: "rgb(250,150,40)" },
  // v58
  cilantro: { nombre: "Cilantro", color: "rgb(90,170,80)" },
  crema: { nombre: "Cream", color: "rgb(255,252,240)" },
  alcaparras: { nombre: "Capers", color: "rgb(110,130,60)" },
  aguacate: { nombre: "Avocado", color: "rgb(160,200,90)" },
  hogao: { nombre: "Hogao", color: "rgb(214,80,50)" },
  guacamole: { nombre: "Guacamole", color: "rgb(130,180,80)" },
  arequipe: { nombre: "Extra arequipe", color: "rgb(170,100,50)" },
  coco: { nombre: "Coconut", color: "rgb(250,250,246)" },
  sal: { nombre: "Salt", color: "rgb(240,240,240)" },
};

const BAO = (relleno) => [{ t: "amasar" }, { t: "estirar" }, { t: "rellenar", relleno }, { t: "plegar", n: 9, relleno }, { t: "cocinar", como: "vapor" }, { t: "emplatar" }];

/**
 * Las recetas. desbloqueo: { fama } (v59: se compran con monedas desde esa estrella), { lugar } (sellarlo)
 * o nada (desde el principio).
 * precio: lo que paga un plato de 3 estrellas. compra: lo que cuesta desbloquearla antes de tiempo.
 */
export const RECETAS = [
  { id: "bao_cerdo", nombre: "Pork bao", grupo: "dimsum", precio: 8, pasos: BAO("carne"), extras: ["vinagre", "chile", "soya"], amigo: "usagi", nota: "Soft and round, like you know who." },
  { id: "jiaozi", nombre: "Jiaozi", grupo: "dimsum", precio: 8, pasos: [{ t: "amasar" }, { t: "estirar" }, { t: "rellenar", relleno: "carne" }, { t: "plegar", n: 7, forma: "media", relleno: "carne" }, { t: "cocinar", como: "hervir" }, { t: "emplatar" }], extras: ["vinagre", "chile", "jengibre"], amigo: "mimi", nota: "On my planet these are called ‘moon pockets’." },
  { id: "te_leche", nombre: "Milk tea", grupo: "chino", precio: 6, pasos: [{ t: "cocinar", como: "calentar" }, { t: "verter", liquido: "te" }, { t: "agitar", color: "rgb(214,170,120)" }, { t: "dibujar", forma: "corazon", fondo: "rgb(200,150,100)" }, { t: "emplatar" }], extras: ["perlas", "hielo", "azucar"], amigo: "chagee", nota: "Extra pearls, darling. Always." },
  { id: "arepa", nombre: "Arepa with cheese", grupo: "colombia", precio: 8, pasos: [{ t: "amasar" }, { t: "aplastar", que: "masa_arepa", n: 1 }, { t: "cocinar", como: "plancha" }, { t: "rellenar", relleno: "queso" }, { t: "emplatar" }], extras: ["queso", "huevo"], nota: "Breakfast in Bogotá, lunch in Hangzhou." },
  { id: "guotie", nombre: "Guotie", grupo: "dimsum", precio: 9, desbloqueo: { fama: 1 }, compra: 60, pasos: [{ t: "estirar" }, { t: "rellenar", relleno: "carne" }, { t: "plegar", n: 6, forma: "media", relleno: "carne" }, { t: "cocinar", como: "plancha" }, { t: "emplatar" }], extras: ["vinagre", "chile", "sesamo"], nota: "Crispy bottom, soft top." },
  { id: "bao_verdura", nombre: "Veggie bao", grupo: "dimsum", precio: 8, desbloqueo: { fama: 1 }, compra: 50, pasos: BAO("verdura"), extras: ["vinagre", "chile", "soya"], amigo: "usagi", nota: "Usagi's favorite. Lots of greens." },
  { id: "tinto", nombre: "Tinto", grupo: "colombia", precio: 5, desbloqueo: { fama: 1 }, compra: 40, pasos: [{ t: "cocinar", como: "calentar" }, { t: "verter", liquido: "cafe" }, { t: "revolver", color: "rgb(90,56,40)" }, { t: "emplatar" }], extras: ["panela", "azucar"], nota: "A little black coffee. Wakes you right up." },
  { id: "xiaolongbao", nombre: "Xiaolongbao", grupo: "dimsum", precio: 12, desbloqueo: { fama: 2 }, compra: 90, pasos: [{ t: "amasar" }, { t: "estirar" }, { t: "rellenar", relleno: "caldo" }, { t: "plegar", n: 14, relleno: "caldo" }, { t: "cocinar", como: "vapor" }, { t: "emplatar" }], extras: ["vinagre", "jengibre"], amigo: "ruchong", nota: "Careful… the soup inside is hot!" },
  { id: "fideos", nombre: "Noodle soup", grupo: "chino", precio: 10, desbloqueo: { fama: 2 }, compra: 70, pasos: [{ t: "amasar" }, { t: "estirar" }, { t: "cocinar", como: "hervir" }, { t: "cortar", que: "cebollin", n: 4 }, { t: "elegir", topping: true }, { t: "emplatar" }], toppings: ["huevo", "bokchoy", "cebollin"], extras: ["chile", "soya", "sesamo"], nota: "Long noodles, long life." },
  { id: "empanada", nombre: "Empanadas", grupo: "colombia", precio: 9, desbloqueo: { fama: 2 }, compra: 70, pasos: [{ t: "amasar" }, { t: "estirar" }, { t: "rellenar", relleno: "pollo" }, { t: "plegar", n: 8, forma: "media", relleno: "pollo" }, { t: "cocinar", como: "freir" }, { t: "emplatar" }], extras: ["aji", "limon"], nota: "With ají and a squeeze of lime." },
  { id: "bao_frijol", nombre: "Red bean bao", grupo: "dimsum", precio: 9, desbloqueo: { fama: 2 }, compra: 60, pasos: BAO("frijol"), extras: ["sesamo", "azucar"], nota: "Sweet bao with a red dot on top." },
  { id: "jugo", nombre: "Passion fruit juice", grupo: "colombia", precio: 6, desbloqueo: { fama: 1 }, compra: 50, pasos: [{ t: "cortar", que: "fruta", n: 3 }, { t: "verter", liquido: "agua" }, { t: "agitar", color: "rgb(255,196,60)" }, { t: "emplatar" }], extras: ["hielo", "azucar"], nota: "Maracuyá! Sour and sunny." },
  { id: "hargow", nombre: "Har gow", grupo: "dimsum", precio: 12, desbloqueo: { fama: 3 }, compra: 100, pasos: [{ t: "lavar", que: "camaron" }, { t: "estirar" }, { t: "rellenar", relleno: "camaron" }, { t: "plegar", n: 10, relleno: "camaron" }, { t: "cocinar", como: "vapor" }, { t: "emplatar" }], extras: ["soya", "chile"], nota: "See-through skin, a whole shrimp inside." },
  { id: "bunuelos", nombre: "Buñuelos", grupo: "colombia", precio: 9, desbloqueo: { fama: 2 }, compra: 70, pasos: [{ t: "amasar" }, { t: "amasar" }, { t: "cocinar", como: "freir" }, { t: "espolvorear", color: "rgb(255,255,255)" }, { t: "emplatar" }], extras: ["azucar", "panela"], nota: "Golden cheese balls, like at Christmas." },
  // v58: mas recetas, con los pasos nuevos (cortar, revolver, saltear, lamian, lavar, espolvorear, dibujar, aplastar, agitar)
  { id: "arroz_frito", nombre: "Fried rice", grupo: "chino", precio: 12, desbloqueo: { fama: 3 }, compra: 90, pasos: [{ t: "cortar", que: "cebollin", n: 5 }, { t: "saltear", n: 4 }, { t: "emplatar" }], extras: ["huevo", "soya", "chile"], nota: "Day-old rice makes the best fried rice!" },
  { id: "patacones", nombre: "Patacones", grupo: "colombia", precio: 11, desbloqueo: { fama: 2 }, compra: 80, pasos: [{ t: "cortar", que: "platano", n: 3 }, { t: "cocinar", como: "freir" }, { t: "aplastar", que: "platano", n: 2 }, { t: "espolvorear", color: "rgb(240,240,240)" }, { t: "emplatar" }], extras: ["hogao", "guacamole", "sal"], nota: "Smashed green plantain, fried twice. Crunchy!" },
  { id: "camarones_longjing", nombre: "Longjing shrimp", grupo: "chino", precio: 15, desbloqueo: { fama: 4 }, compra: 120, pasos: [{ t: "lavar", que: "camaron" }, { t: "saltear", n: 3 }, { t: "verter", liquido: "te" }, { t: "emplatar" }], extras: ["jengibre"], nota: "龙井虾仁 · Shrimp with Dragon Well tea leaves. Pure Hangzhou." },
  { id: "lamian", nombre: "Hand-pulled noodles", grupo: "chino", precio: 13, desbloqueo: { fama: 3 }, compra: 100, pasos: [{ t: "amasar" }, { t: "lamian", n: 4 }, { t: "cocinar", como: "hervir" }, { t: "cortar", que: "cebollin", n: 4 }, { t: "emplatar" }], extras: ["chile", "vinagre", "sesamo"], nota: "Pull, fold, pull, fold… sixteen strands!" },
  { id: "ajiaco", nombre: "Ajiaco", grupo: "colombia", precio: 13, desbloqueo: { fama: 3 }, compra: 100, pasos: [{ t: "cortar", que: "papa", n: 4 }, { t: "cocinar", como: "hervir" }, { t: "revolver", color: "rgb(250,210,80)" }, { t: "emplatar" }], extras: ["crema", "alcaparras", "aguacate"], nota: "Bogotá's chicken and potato soup. Warms you up." },
  { id: "pescado_vinagre", nombre: "West Lake fish", grupo: "chino", precio: 16, desbloqueo: { fama: 4 }, compra: 130, pasos: [{ t: "lavar", que: "pescado" }, { t: "cortar", que: "pescado", n: 3 }, { t: "cocinar", como: "hervir" }, { t: "revolver", color: "rgb(130,60,36)" }, { t: "emplatar" }], extras: ["jengibre", "cebollin"], nota: "西湖醋鱼 · Fish in sweet vinegar sauce, from the lake itself." },
  { id: "dongpo", nombre: "Dongpo pork", grupo: "chino", precio: 16, desbloqueo: { fama: 5 }, compra: 130, pasos: [{ t: "cortar", que: "cerdo", n: 4 }, { t: "cocinar", como: "hervir" }, { t: "revolver", color: "rgb(150,70,40)" }, { t: "cocinar", como: "vapor" }, { t: "emplatar" }], extras: ["bokchoy", "soya"], nota: "东坡肉 · The poet Su Dongpo's slow pork. Melts in your mouth." },
  { id: "obleas", nombre: "Obleas", grupo: "colombia", precio: 10, desbloqueo: { fama: 3 }, compra: 80, pasos: [{ t: "dibujar", forma: "espiral", fondo: "rgb(246,222,170)", tinta: "rgb(170,96,46)" }, { t: "espolvorear", color: "rgb(250,250,246)" }, { t: "emplatar" }], extras: ["arequipe", "queso", "fresa", "coco"], nota: "Two thin wafers and arequipe. A Colombian street treat." },
  { id: "longjing", nombre: "Longjing tea", grupo: "chino", precio: 7, desbloqueo: { lugar: "longjing" }, pasos: [{ t: "cocinar", como: "calentar" }, { t: "verter", liquido: "te" }, { t: "emplatar" }], extras: [], nota: "Dragon Well green tea. Not too hot!" },
  { id: "tanghulu", nombre: "Tanghulu", grupo: "chino", precio: 8, desbloqueo: { lugar: "hefang" }, pasos: [{ t: "elegir", frutas: true }, { t: "revolver", color: "rgb(214,120,60)" }, { t: "cocinar", como: "caramelo" }, { t: "emplatar" }], frutas: ["espino", "fresa", "uva", "mandarina"], extras: ["sesamo"], nota: "Candied fruit on a stick from Hefang Street." },
  { id: "luna", nombre: "Mooncake", grupo: "chino", precio: 11, desbloqueo: { lugar: "santan" }, pasos: [{ t: "amasar" }, { t: "rellenar", relleno: "loto" }, { t: "dibujar", forma: "flor", fondo: "rgb(214,150,80)", tinta: "rgb(170,100,50)" }, { t: "cocinar", como: "horno" }, { t: "emplatar" }], extras: [], nota: "Round like the moon over Three Pools." },
  { id: "osmanto", nombre: "Osmanthus cake", grupo: "chino", precio: 10, desbloqueo: { lugar: "botanico" }, pasos: [{ t: "verter", liquido: "jarabe" }, { t: "revolver", color: "rgb(250,210,110)" }, { t: "elegir", flores: true }, { t: "cocinar", como: "enfriar" }, { t: "emplatar" }], extras: ["osmanto"], nota: "Hangzhou's sweet flower, in a jelly." },
];
export const recetaPorId = (id) => RECETAS.find((r) => r.id === id) || null;
export const GRUPOS = [
  ["dimsum", "DIM SUM"],
  ["chino", "CHINESE"],
  ["colombia", "COLOMBIA"],
];

/** Lo que se puede poner en el frente del local (arte de la tienda). */
export const DECOR = [
  { id: "farolitos", nombre: "Red lanterns", precio: 80, arte: "tienda/deco_farolitos.png" },
  { id: "bonsai", nombre: "Bonsai", precio: 60, arte: "tienda/deco_bonsai.png" },
  { id: "orquidea", nombre: "Orchid", precio: 70, arte: "tienda/deco_orquidea.png" },
  { id: "banderin", nombre: "Bunting", precio: 90, arte: "tienda/deco_banderin.png" },
  { id: "luces", nombre: "Fairy lights", precio: 100, arte: "tienda/deco_luces.png" },
  { id: "saco", nombre: "Coffee sack", precio: 60, arte: "tienda/deco_saco.png" },
];

/**
 * Los clientes que no son amigos (assets/restaurante/cliente_<id>.png y _saludo.png).
 * Vacio por ahora: rom los va a dibujar. Mientras, comen los amigos de Baozi.
 * Formato: { id, nombre, gracias: ["...", "..."] }
 */
export const CLIENTES = [];
export const GRACIAS_AMIGOS = {
  usagi: "Quiet, warm, perfect. Thank you.",
  mimi: "Earth food is the best food. Photo for my album!",
  ruchong: "It's… it's so good. Can I paint it?",
  chagee: "Bravo, chef! Bravo!",
};
const PIDE = ["Something warm, please.", "I'm sooo hungry!", "The usual, chef!", "Surprise me… no wait, this one!", "Can I have…", "Your best one, please."];
const RESENAS = {
  3: ["Best on Hefang!", "Perfect. Coming back tomorrow!", "Chef's kiss!", "I'd marry this dish."],
  2: ["Really good!", "Yummy, thank you!", "Nice and warm."],
  1: ["Hmm… it's okay.", "A little odd, but thanks!", "Interesting…"],
};

/**
 * Fama (v59, rom: "que se sienta mucho mas progresivo"): puntos acumulados; cada
 * estrella pide mas que la anterior. Solo suma el primer dia del local de cada dia
 * real (los otros son de practica), asi ★5 llega en ~1 mes jugando seguido.
 */
export const UMBRALES_FAMA = [0, 20, 60, 140, 280]; // puntos para ★1..★5
export const famaDe = (puntos) => Math.max(1, UMBRALES_FAMA.filter((u) => Math.max(0, puntos) >= u).length);
/** Cuanto lleva y cuanto falta para la proxima estrella (null en ★5). */
export function progresoFama(puntos) {
  const e = famaDe(puntos);
  if (e >= 5) return null;
  const desde = UMBRALES_FAMA[e - 1];
  const hasta = UMBRALES_FAMA[e];
  return { estrella: e, puntos, desde, hasta, f: (puntos - desde) / (hasta - desde) };
}
/** Puntos de fama de un plato. */
export const famaPorPlato = (estrellas) => (estrellas === 3 ? 2 : estrellas === 2 ? 1 : -1);
export const clientesPorDia = (fama, asientos = 0) => 2 + fama + asientos; // 3 a 7 (+3 con asientos)

/**
 * Las mejoras de la cocina (v59: se compran, rom: "los upgrades deberian poder comprarse").
 * costos[i] y estrella[i]: lo que cuesta y la estrella que pide el nivel i+1.
 */
export const MEJORAS_COCINA = [
  { id: "cuchillo", nombre: "Sharp knife", texto: "Chopping is more forgiving", costos: [60, 150], estrella: [1, 2] },
  { id: "ollas", nombre: "Good pots & steamers", texto: "Wider green zone when cooking", costos: [80, 180, 320], estrella: [1, 2, 3] },
  { id: "wok", nombre: "Cast-iron wok", texto: "Longer flames, easier catches", costos: [120, 260], estrella: [2, 3] },
  { id: "asientos", nombre: "More seats", texto: "+1 customer every day", costos: [100, 220, 400], estrella: [1, 2, 4] },
  { id: "propinas", nombre: "Tip jar", texto: "Bigger tips for perfect dishes", costos: [70, 180], estrella: [1, 3] },
  { id: "letrero", nombre: "Glowing sign", texto: "+3 fame every day that counts", costos: [300], estrella: [4] },
];
export const mejoraPorId = (id) => MEJORAS_COCINA.find((m) => m.id === id) || null;

/** Lo que paga un plato: el precio segun la calidad, propina con 3 estrellas, el especial el doble. */
export function pagoDe(receta, estrellas, especial = false, propina = 3) {
  const base = Math.round(receta.precio * [0, 0.5, 0.8, 1][Math.max(1, Math.min(3, estrellas))]);
  const extra = estrellas === 3 ? propina : 0;
  return (base + extra) * (especial ? 2 : 1);
}
/** Las estrellas del plato: el promedio de los pasos, redondeado. */
export const estrellasDelPlato = (pasos) => (pasos.length ? Math.max(1, Math.min(3, Math.round(pasos.reduce((s, x) => s + x, 0) / pasos.length))) : 3);

const claveDia = (t) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
function semilla(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export class Restaurante {
  constructor() {
    this.turnos = 0; // cuantos dias abrio el local en total
    this.mejoras = new Set(); // (v54; ya no se usan: ver desdeObjeto)
    this.reembolso = 0; // monedas a devolver por las mejoras de v54 (no se guarda)
    this.mejorTurno = 0;
    this.hoy = { dia: null, turnos: 0, felices: 0, ganado: 0 };
    this.fama = 0; // puntos de fama
    this.compradas = new Set(); // recetas desbloqueadas comprandolas
    this.libro = {}; // id -> { mejor, vendidos }
    this.decor = new Set(); // lo que compro para el frente
    this.ultimo = null; // { felices, ganado, resenas: [{ quien, texto, estrellas }] }
    this.niveles = {}; // v59: mejora -> nivel comprado
    this.relajado = false; // v59: modo relajado (facil, sin fama)
    this.carta = 0; // v59: la carta del critico pendiente (la estrella nueva), 0 = ninguna
  }

  nivel(id) {
    return this.niveles[id] || 0;
  }

  /** v59: compra el proximo nivel de una mejora. Devuelve "ok" | "max" | "estrella" | "monedas". */
  comprarMejora(id, tienda) {
    const m = mejoraPorId(id);
    if (!m) return "max";
    const n = this.nivel(id);
    if (n >= m.costos.length) return "max";
    if (this.estrellasFama() < m.estrella[n]) return "estrella";
    if (!tienda || tienda.monedas < m.costos[n]) return "monedas";
    tienda.monedas -= m.costos[n];
    this.niveles[id] = n + 1;
    return "ok";
  }

  /** v59: ¿hoy todavia cuenta para la fama? (el primer dia del local de cada dia real, sin modo relajado) */
  cuentaHoy(ahora = Date.now()) {
    this._alDia(ahora);
    return !this.relajado && !this.hoy.contado;
  }

  /** ¿Esta receta ya se puede cocinar? sellados: Set de lugares. */
  desbloqueada(id, sellados = new Set()) {
    const r = recetaPorId(id);
    if (!r) return false;
    if (!r.desbloqueo || this.compradas.has(id)) return true;
    if (r.desbloqueo.lugar) return sellados.has(r.desbloqueo.lugar);
    return false; // las de { fama } se compran
  }

  /** v59: ¿ya se puede comprar? (tiene la estrella que pide) */
  sePuedeComprar(id) {
    const r = recetaPorId(id);
    return !!(r && r.compra && r.desbloqueo && r.desbloqueo.fama && !this.compradas.has(id) && this.estrellasFama() >= r.desbloqueo.fama);
  }

  menu(sellados = new Set()) {
    return RECETAS.filter((r) => this.desbloqueada(r.id, sellados)).map((r) => r.id);
  }

  comprarReceta(id, tienda) {
    const r = recetaPorId(id);
    if (!this.sePuedeComprar(id) || !tienda || tienda.monedas < r.compra) return false;
    tienda.monedas -= r.compra;
    this.compradas.add(id);
    return true;
  }

  comprarDecor(id, tienda) {
    const d = DECOR.find((x) => x.id === id);
    if (!d || this.decor.has(id) || !tienda || tienda.monedas < d.precio) return false;
    tienda.monedas -= d.precio;
    this.decor.add(id);
    return true;
  }

  estrellasFama() {
    return famaDe(this.fama);
  }

  /** El especial del dia: una receta del menu, la misma todo el dia. */
  especial(sellados = new Set(), ahora = Date.now()) {
    const m = this.menu(sellados);
    return m.length ? m[semilla(claveDia(ahora)) % m.length] : null;
  }

  /** Anota un plato servido: libro y, si el dia cuenta, fama (nunca baja de la estrella que ya tiene). */
  anotarPlato(id, estrellas, cuenta = true) {
    if (cuenta) this.sumarFama(famaPorPlato(estrellas));
    const l = this.libro[id] || { mejor: 0, vendidos: 0 };
    l.mejor = Math.max(l.mejor, estrellas);
    l.vendidos += 1;
    this.libro[id] = l;
  }

  /** Suma (o resta) fama; si sube de estrella, deja la carta del critico pendiente. */
  sumarFama(n) {
    const antes = this.estrellasFama();
    const piso = UMBRALES_FAMA[antes - 1];
    this.fama = Math.max(piso, this.fama + n);
    const despues = this.estrellasFama();
    if (despues > antes) this.carta = despues;
    return despues > antes;
  }

  _alDia(ahora) {
    const d = claveDia(ahora);
    if (this.hoy.dia !== d) this.hoy = { dia: d, turnos: 0, felices: 0, ganado: 0, contado: false };
  }

  primeroDeHoy(ahora = Date.now()) {
    this._alDia(ahora);
    return this.hoy.turnos === 0;
  }

  /** Cierra un dia del local: el primero de cada dia real paga todo; los siguientes, un tercio. */
  cerrarTurno({ ganado = 0, felices = 0, resenas = [], cuenta = false } = {}, ahora = Date.now()) {
    this._alDia(ahora);
    // v59: el dia que cuenta suma un dia al local (y el letrero, su fama extra)
    let famaExtra = 0;
    if (cuenta && !this.hoy.contado) {
      this.hoy.contado = true;
      this.turnos += 1;
      if (this.nivel("letrero")) {
        famaExtra = 3;
        this.sumarFama(famaExtra);
      }
    }
    const g = Math.max(0, Math.floor(ganado));
    const paga = this.hoy.turnos === 0 ? g : Math.floor(g / 3);
    this.hoy.turnos += 1;
    this.hoy.felices += Math.max(0, felices);
    this.hoy.ganado += paga;
    const record = g > this.mejorTurno;
    if (record) this.mejorTurno = g;
    this.ultimo = { felices, ganado: paga, resenas: resenas.slice(0, 3) };
    return { paga, record, famaExtra };
  }

  aObjeto() {
    return { version: 2, turnos: this.turnos, mejoras: [...this.mejoras], mejorTurno: this.mejorTurno, hoy: { ...this.hoy }, fama: this.fama, compradas: [...this.compradas], libro: this.libro, decor: [...this.decor], ultimo: this.ultimo, niveles: this.niveles, relajado: this.relajado, carta: this.carta };
  }

  static desdeObjeto(d) {
    const r = new Restaurante();
    if (!d || typeof d !== "object") return r;
    const ent = (x) => (Number.isFinite(x) && x > 0 ? Math.floor(x) : 0);
    r.turnos = ent(d.turnos);
    // v54 -> v55: las mejoras viejas ya no existen. Los farolitos pasan al frente
    // y lo demas se devuelve en monedas (main.js lo suma a la tienda una vez).
    const viejas = (Array.isArray(d.mejoras) ? d.mejoras : []).filter((x) => typeof x === "string");
    r.reembolso = viejas.reduce((s, m) => s + ({ vapor2: 120, fuego: 150, lugar4: 200 }[m] || 0), 0);
    r.mejorTurno = ent(d.mejorTurno);
    const h = d.hoy || {};
    if (typeof h.dia === "string") r.hoy = { dia: h.dia, turnos: ent(h.turnos), felices: ent(h.felices), ganado: ent(h.ganado), contado: h.contado === true };
    r.fama = ent(d.fama);
    r.compradas = new Set((Array.isArray(d.compradas) ? d.compradas : []).filter((id) => recetaPorId(id)));
    if (d.libro && typeof d.libro === "object") {
      for (const [id, l] of Object.entries(d.libro)) if (recetaPorId(id) && l) r.libro[id] = { mejor: Math.max(0, Math.min(3, ent(l.mejor))), vendidos: ent(l.vendidos) };
    }
    r.decor = new Set((Array.isArray(d.decor) ? d.decor : []).filter((id) => DECOR.some((x) => x.id === id)));
    if (viejas.includes("faroles")) r.decor.add("farolitos");
    // v59
    for (const m of MEJORAS_COCINA) if (d.niveles && Number.isFinite(d.niveles[m.id])) r.niveles[m.id] = Math.max(0, Math.min(m.costos.length, Math.floor(d.niveles[m.id])));
    r.relajado = d.relajado === true;
    r.carta = Number.isInteger(d.carta) && d.carta >= 2 && d.carta <= 5 ? d.carta : 0;
    if (d.version !== 2) {
      // v58 -> v59 (rom: "empezar la fama de cero"): fama y dias de cero; las recetas que ya
      // tenia abiertas por dias quedan compradas (no pierde nada de lo que cocinaba)
      const diaViejo = { guotie: 2, bao_verdura: 2, tinto: 2, xiaolongbao: 3, fideos: 3, empanada: 3, bao_frijol: 4, jugo: 4, hargow: 5, bunuelos: 5, arroz_frito: 6, patacones: 6, camarones_longjing: 7, lamian: 7, ajiaco: 8, pescado_vinagre: 8, dongpo: 9, obleas: 9 };
      for (const [id, dia] of Object.entries(diaViejo)) if (r.turnos + 1 >= dia) r.compradas.add(id);
      r.fama = 0;
      r.turnos = 0;
      r.carta = 0;
      if (r.hoy) r.hoy.contado = false;
    }
    if (d.ultimo && typeof d.ultimo === "object") r.ultimo = { felices: ent(d.ultimo.felices), ganado: ent(d.ultimo.ganado), resenas: (Array.isArray(d.ultimo.resenas) ? d.ultimo.resenas : []).filter((x) => x && typeof x.texto === "string").slice(0, 3) };
    return r;
  }
}

/** Arma los pedidos del dia. azar: para las pruebas. */
export function armarDia(menu, { fama = 1, especial = null, amigos = [], azar = Math.random, asientos = 0 } = {}) {
  const n = clientesPorDia(fama, asientos);
  const pool = [...amigos.map((a) => ({ ...a, amigo: true })), ...CLIENTES.map((c) => ({ ...c, amigo: false }))];
  const out = [];
  for (let i = 0; i < n; i++) {
    const quien = pool.length ? pool[Math.floor(azar() * pool.length)] : { id: "usagi", nombre: "Usagi", amigo: true };
    const id = especial && menu.includes(especial) && azar() < 0.3 ? especial : menu[Math.floor(azar() * menu.length)];
    const r = recetaPorId(id);
    const nExtras = r.extras.length ? Math.min(r.extras.length, Math.floor(azar() * Math.min(3, fama + 1))) : 0;
    const extras = [...r.extras].sort(() => azar() - 0.5).slice(0, nExtras);
    const extra2 = {};
    if (r.toppings) extra2.toppings = [...r.toppings].sort(() => azar() - 0.5).slice(0, 1 + Math.floor(azar() * 2));
    if (r.frutas) extra2.frutas = [...r.frutas].sort(() => azar() - 0.5).slice(0, 2);
    if (r.id === "osmanto") extra2.flores = ["osmanto"];
    // v58: con fama 3+, a veces el ticket se esconde despues del primer paso (hay que acordarse)
    const algo = extras.length + (extra2.toppings || []).length + (extra2.frutas || []).length;
    const recordar = fama >= 3 && algo > 0 && azar() < 0.35;
    out.push({ quien, receta: id, extras, ...extra2, frase: PIDE[Math.floor(azar() * PIDE.length)], recordar });
  }
  return out;
}

// ------------------------------------------------------------------
// La pantalla
// ------------------------------------------------------------------

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const estrellas = (n, de = 3) => "★".repeat(n) + "☆".repeat(Math.max(0, de - n));
const NOMBRE_PASO = { amasar: "KNEAD", estirar: "ROLL", rellenar: "FILL", plegar: "FOLD", verter: "POUR", elegir: "PICK", emplatar: "PLATE", cortar: "CHOP", revolver: "STIR", saltear: "WOK", lamian: "PULL", lavar: "WASH", espolvorear: "SPRINKLE", dibujar: "DRAW", aplastar: "SMASH", agitar: "SHAKE" };
const nombrePaso = (p) => (p.t === "cocinar" ? (COCCIONES[p.como] || COCCIONES.vapor).verbo : NOMBRE_PASO[p.t] || p.t.toUpperCase());

function textoPaso(p) {
  if (p.t === "amasar") return "Knead the dough";
  if (p.t === "estirar") return "Roll it out";
  if (p.t === "rellenar") return `Fill: ${(RELLENOS[p.relleno] || RELLENOS.carne).nombre}`;
  if (p.t === "plegar") return p.forma === "media" ? `Fold in a half moon (${p.n} pleats)` : `Pleat it closed (${p.n} pleats)`;
  if (p.t === "verter") return `Pour the ${(LIQUIDOS[p.liquido] || LIQUIDOS.agua).nombre}`;
  if (p.t === "cocinar") return { vapor: "Steam until fluffy", hervir: "Boil until they float", plancha: "Grill both sides", freir: "Fry until golden", horno: "Bake in the oven", caramelo: "Dip in hot sugar", calentar: "Heat the water", enfriar: "Chill until set" }[p.como] || "Cook it";
  if (p.t === "elegir") return p.topping ? "Add the toppings" : p.frutas ? "Skewer the fruit" : p.flores ? "Sprinkle the flowers" : "Pick";
  if (p.t === "emplatar") return "Plate it";
  const ing = (q) => (INGREDIENTES[q] || {}).nombre || q;
  if (p.t === "cortar") return `Chop the ${ing(p.que)}`;
  if (p.t === "revolver") return "Stir it, nice and steady";
  if (p.t === "saltear") return "Toss it in the wok";
  if (p.t === "lamian") return "Pull the noodles by hand";
  if (p.t === "lavar") return `Wash the ${ing(p.que)}`;
  if (p.t === "espolvorear") return "Sprinkle it evenly";
  if (p.t === "dibujar") return p.forma === "corazon" ? "Draw a foam heart" : p.forma === "flor" ? "Stamp the flower" : "Spread the arequipe";
  if (p.t === "aplastar") return `Smash the ${ing(p.que)}`;
  if (p.t === "agitar") return "Shake it up";
  return p.t;
}

/**
 * opts:
 *   arte(ruta), sprite(ojo, boca), cambiarCara(el, ojo, boca), sonar(n), vibrar(ms)
 *   reg: Restaurante, tienda: Tienda, sellados: Set, nombreLugar(id),
 *   amigos: [{ id, nombre, conocido }], nombre: el de la mascota
 *   guardar(), alSalir(), alCerrarTurno({ paga, felices, record, sobras, ganado })
 */
export function abrirRestaurante(contenedor, opts) {
  const { arte, sprite, cambiarCara, sonar = () => {}, vibrar = () => {}, reg, tienda, sellados = new Set(), amigos = [], nombre = "Baozi", guardar = () => {}, alSalir = () => {}, alCerrarTurno = () => {} } = opts;
  const nombreLugar = opts.nombreLugar || ((id) => id);
  let vivo = true;
  let dia = null; // el dia en curso: { pedidos, i, ganado, felices, resenas, especial }
  let paso = null; // el paso en curso (cocina.js)
  let pausa = null;
  const imgPlato = (id, cl = "") => `<img class="rest-comida ${cl}" src="${arte(`restaurante/plato_${id}.png`)}" alt="${esc((recetaPorId(id) || {}).nombre || id)}" draggable="false" />`;
  const moneda = () => `<img class="rest-moneda" src="${arte("tienda/moneda.png")}" alt="" draggable="false" />`;
  const hud = (titulo) => `
    <div class="rest-hud">
      <span class="juego-chip rest-hud-titulo">${esc(titulo)}</span>
      <span class="rest-esp"></span>
      <span class="juego-chip">${moneda()}<b id="rest-monedas">${tienda.monedas}</b></span>
      <span class="juego-chip rest-fama" title="Fame">${estrellas(reg.estrellasFama(), 5)}</span>
    </div>`;
  const quitarPausa = () => {
    if (pausa) pausa.destruir();
    pausa = null;
  };

  /**
   * El frente del local: la planta baja de nuestra casa (restaurante/fachada.png,
   * 240x112). El cliente se asoma por la ventana del mostrador; el letrero y los
   * adornos van encima, en % de la imagen (ver tools/v56_arte.py: VENTANA, LETRERO).
   */
  function frente(cliente = "") {
    const d = (id) => (reg.decor.has(id) ? `<img class="rest-deco rest-deco-${id}" src="${arte(DECOR.find((x) => x.id === id).arte)}" alt="" draggable="false" />` : "");
    return `
      <div class="rest-frente">
        <div class="rest-escena">
          <img class="rest-fachada-img" src="${arte("restaurante/fachada.png")}" alt="" draggable="false" />
          <div class="rest-ventana">${cliente}</div>
          ${d("banderin")}${d("farolitos")}${d("luces")}${d("bonsai")}${d("orquidea")}${d("saco")}
          <div class="rest-letrero"><span lang="zh-CN">包子</span> ${esc(nombre).toUpperCase()}'S</div>
        </div>
      </div>`;
  }

  // ---------------- el local ----------------
  function local(mensaje = "") {
    quitarPausa();
    if (paso) paso.destruir();
    paso = null;
    dia = null;
    const menu = reg.menu(sellados);
    const esp = reg.especial(sellados);
    const u = reg.ultimo;
    const prog = progresoFama(reg.fama);
    const cuenta = reg.cuentaHoy();
    contenedor.innerHTML = `
      <div class="pantalla-rest local">
        ${frente(`<div class="rest-baozi-ventana">${sprite("ojo_base_energia_alta.png", "boca_base_feliz.png")}</div>`)}
        ${HTML_VOLVER}
        ${hud(`${nombre.toUpperCase()}'S DUMPLING SHOP · DAY ${reg.turnos + 1}`)}
        <div class="rest-col izq">
          ${esp ? `<div class="papel rest-card"><div class="rest-sub">TODAY'S SPECIAL</div><div class="rest-especial">${imgPlato(esp)}<span>${esc(recetaPorId(esp).nombre)}<b>pays ×2</b></span></div></div>` : ""}
          <div class="papel rest-card"><div class="rest-sub">${u ? "LAST TIME" : "WELCOME"}</div>${
            u
              ? `<div>${u.felices} happy customer${u.felices === 1 ? "" : "s"} · +${u.ganado}</div>${u.resenas.length ? `<small>“${esc(u.resenas[0].texto)}” — ${esc(u.resenas[0].quien)}</small>` : ""}`
              : `<small>Friends come with a ticket. Cook each dish step by step, at your own pace. Better dishes, happier customers.</small>`
          }</div>
        </div>
        <div class="rest-col der">
          <div class="papel rest-card" id="rest-fama-card"><div class="rest-sub">FAME <span class="rest-sub-estr">${estrellas(reg.estrellasFama(), 5)}</span></div>${
            prog
              ? `<div class="rest-barra-fama"><i style="width:${Math.round(prog.f * 100)}%"></i></div><small>${prog.puntos} / ${prog.hasta} to ${"★".repeat(prog.estrella + 1)}</small>`
              : `<small>The most famous stall on Hefang!</small>`
          }${reg.relajado ? `<span class="rest-practica">RELAXED · no fame today</span>` : cuenta ? `<small class="rest-cuenta">Today counts! ♥</small>` : `<span class="rest-practica">PRACTICE DAY · fame again tomorrow</span>`}</div>
          ${mensaje ? `<div class="rest-aviso">${esc(mensaje)}</div>` : ""}
          <button class="boton rest-abrir" id="btn-rest-abrir" type="button">Open the shop ♥</button>
          <div class="rest-fila-botones">
            <button class="boton boton-fantasma" id="btn-rest-libro" type="button">Recipes <small class="rest-cuantas">${menu.length}/${RECETAS.length}</small></button>
            <button class="boton boton-fantasma" id="btn-rest-mejoras" type="button">Upgrades</button>
            <button class="boton boton-fantasma" id="btn-rest-decor" type="button">Decorate</button>
            <button class="rest-relajado ${reg.relajado ? "si" : ""}" id="btn-rest-relajado" type="button" aria-pressed="${reg.relajado}"><span class="rest-sw"><i></i></span>Relaxed</button>
          </div>
        </div>
      </div>`;
    blindarToques(contenedor.querySelector(".pantalla-rest"));
    cablearVolver(contenedor, () => vivo && alSalir());
    contenedor.querySelector("#btn-rest-abrir").addEventListener("click", () => {
      sonar("tocar");
      abrirDia();
    });
    contenedor.querySelector("#btn-rest-libro").addEventListener("click", () => {
      sonar("tocar");
      libro();
    });
    contenedor.querySelector("#btn-rest-decor").addEventListener("click", () => {
      sonar("tocar");
      decorar();
    });
    contenedor.querySelector("#btn-rest-mejoras").addEventListener("click", () => {
      sonar("tocar");
      mejoras();
    });
    contenedor.querySelector("#btn-rest-relajado").addEventListener("click", () => {
      sonar("tocar");
      reg.relajado = !reg.relajado;
      guardar();
      local(reg.relajado ? "Relaxed mode: easy cooking, no fame" : "");
    });
  }

  // ---------------- v59: las mejoras de la cocina ----------------
  const ICONOS_MEJORA = {
    cuchillo: '<path d="M3 13 L15 3 L17 5 L6 15 Z" fill="#dfe6ee" stroke="#161416"/><rect x="3" y="13" width="5" height="4" fill="#6e4832" stroke="#161416" transform="rotate(-40 5 15)"/>',
    ollas: '<rect x="3" y="7" width="14" height="9" rx="2" fill="#969aaa" stroke="#161416"/><rect x="1" y="8" width="3" height="2" fill="#5a5a64"/><rect x="16" y="8" width="3" height="2" fill="#5a5a64"/><rect x="4" y="3" width="2" height="3" fill="#fff"/><rect x="9" y="2" width="2" height="4" fill="#fff"/><rect x="14" y="3" width="2" height="3" fill="#fff"/>',
    wok: '<path d="M2 9 Q10 18 18 9 Z" fill="#3c3c46" stroke="#161416"/><path d="M5 17 Q7 12 9 17 Z M9 17 Q11 11 13 17 Z" fill="#f07832"/>',
    asientos: '<rect x="5" y="3" width="10" height="7" fill="#a0683c" stroke="#161416"/><rect x="4" y="10" width="12" height="3" fill="#c8884e" stroke="#161416"/><rect x="5" y="13" width="2" height="5" fill="#6e4832"/><rect x="13" y="13" width="2" height="5" fill="#6e4832"/>',
    propinas: '<rect x="5" y="5" width="10" height="12" rx="2" fill="#e6f0f4" stroke="#161416"/><rect x="5" y="3" width="10" height="3" fill="#a0683c" stroke="#161416"/><circle cx="9" cy="13" r="2" fill="#f0be50" stroke="#161416"/><circle cx="12" cy="11" r="2" fill="#f0be50" stroke="#161416"/>',
    letrero: '<rect x="3" y="5" width="14" height="9" fill="#281c1e" stroke="#a02828"/><rect x="5" y="8" width="10" height="2" fill="#fad682"/><rect x="2" y="2" width="2" height="2" fill="#fff6c8"/><rect x="16" y="2" width="2" height="2" fill="#fff6c8"/>',
  };
  function mejoras(mensaje = "") {
    const item = (m) => {
      const n = reg.nivel(m.id);
      const max = n >= m.costos.length;
      const pips = "●".repeat(n) + "○".repeat(m.costos.length - n);
      let accion;
      if (max) accion = `<span class="rest-tuya">✓ MAX</span>`;
      else if (reg.estrellasFama() < m.estrella[n]) accion = `<span class="rest-necesita">NEEDS<br><span class="rest-sub-estr">${"★".repeat(m.estrella[n])}</span></span>`;
      else accion = `<button class="boton boton-fantasma" type="button" data-mejora="${m.id}" ${tienda.monedas < m.costos[n] ? "disabled" : ""}>${moneda()}${m.costos[n]}</button>`;
      return `<div class="rest-mejora-item"><span class="rest-mejora-ico"><svg viewBox="0 0 20 20" width="30" height="30">${ICONOS_MEJORA[m.id]}</svg></span><div><b>${esc(m.nombre)}</b><small>${esc(m.texto)}</small><span class="rest-pips">${pips}</span></div>${accion}</div>`;
    };
    contenedor.innerHTML = `
      <div class="pantalla-rest libro">
        ${HTML_VOLVER}
        ${hud("KITCHEN UPGRADES")}
        ${mensaje ? `<div class="rest-aviso rest-aviso-mejoras">${esc(mensaje)}</div>` : ""}
        <div class="rest-mejoras">${MEJORAS_COCINA.map(item).join("")}</div>
      </div>`;
    blindarToques(contenedor.querySelector(".pantalla-rest"));
    cablearVolver(contenedor, () => local());
    for (const b of contenedor.querySelectorAll("[data-mejora]"))
      b.addEventListener("click", () => {
        const r = reg.comprarMejora(b.dataset.mejora, tienda);
        if (r === "ok") {
          sonar("hallazgo");
          vibrar(25);
          guardar();
          mejoras(`${mejoraPorId(b.dataset.mejora).nombre}: level ${reg.nivel(b.dataset.mejora)}! ♥`);
        } else sonar("no");
      });
  }

  // ---------------- el libro de recetas ----------------
  function libro(sel = null, mensaje = "") {
    const menu = reg.menu(sellados);
    sel = sel || menu[0] || RECETAS[0].id;
    const r = recetaPorId(sel);
    const tengo = menu.includes(sel);
    const l = reg.libro[sel] || { mejor: 0, vendidos: 0 };
    const amigo = r.amigo && amigos.find((a) => a.id === r.amigo);
    const bloqueo = !tengo
      ? r.desbloqueo.fama
        ? reg.sePuedeComprar(sel)
          ? "Ready to learn!"
          : `Needs a ${"★".repeat(r.desbloqueo.fama)} shop to learn it`
        : `Stamp ${esc(nombreLugar(r.desbloqueo.lugar))} to learn it`
      : "";
    contenedor.innerHTML = `
      <div class="pantalla-rest libro">
        ${HTML_VOLVER}
        ${hud(`RECIPE BOOK · ${menu.length} OF ${RECETAS.length}`)}
        <div class="rest-libro">
          <div class="rest-hoja">
            ${GRUPOS.map(
              ([g, t]) => `<div class="rest-sub">${t}</div><div class="rest-grilla">${RECETAS.filter((x) => x.grupo === g)
                .map((x) => {
                  const ok = menu.includes(x.id);
                  const m = (reg.libro[x.id] || {}).mejor || 0;
                  return `<button type="button" class="rest-rec ${ok ? "" : "no"} ${x.id === sel ? "sel" : ""}" data-receta="${x.id}">${imgPlato(x.id)}<span>${esc(x.nombre)}</span><small>${ok ? estrellas(m) : x.desbloqueo && x.desbloqueo.fama ? (reg.sePuedeComprar(x.id) ? "learn!" : "★".repeat(x.desbloqueo.fama)) : "?"}</small></button>`;
                })
                .join("")}</div>`,
            ).join("")}
          </div>
          <div class="rest-hoja detalle">
            <div class="rest-receta-cabeza">${imgPlato(sel, tengo ? "" : "no")}<div><b>${esc(r.nombre)}</b><span class="rest-estr">${tengo ? estrellas(l.mejor) : ""}</span><small>${tengo ? (l.vendidos ? `Best: ${l.mejor} star${l.mejor === 1 ? "" : "s"} · served ${l.vendidos}` : "Not cooked yet") : bloqueo}</small></div></div>
            <ol class="rest-pasos-lista">${r.pasos.map((p) => `<li>${esc(textoPaso(p))}</li>`).join("")}</ol>
            <div class="rest-nota">${amigo ? `<i>${esc(amigo.nombre)}: “${esc(r.nota)}”</i>` : esc(r.nota)}</div>
            ${mensaje ? `<div class="rest-aviso">${esc(mensaje)}</div>` : ""}
            ${!tengo && r.compra && reg.sePuedeComprar(sel) ? `<button class="boton rest-comprar-receta" type="button" data-comprar-receta="${r.id}" ${tienda.monedas < r.compra ? "disabled" : ""}>${moneda()} ${r.compra} · Learn it</button>` : ""}
          </div>
        </div>
      </div>`;
    blindarToques(contenedor.querySelector(".pantalla-rest"));
    cablearVolver(contenedor, () => local());
    for (const b of contenedor.querySelectorAll("[data-receta]"))
      b.addEventListener("click", () => {
        sonar("tocar");
        libro(b.dataset.receta);
      });
    const c = contenedor.querySelector("[data-comprar-receta]");
    if (c)
      c.addEventListener("click", () => {
        if (reg.comprarReceta(c.dataset.comprarReceta, tienda)) {
          sonar("hallazgo");
          guardar();
          libro(sel, "New recipe! ♥");
        } else sonar("no");
      });
  }

  // ---------------- decorar ----------------
  function decorar(mensaje = "") {
    contenedor.innerHTML = `
      <div class="pantalla-rest local decor">
        ${frente()}
        ${HTML_VOLVER}
        ${hud("DECORATE THE SHOP")}
        <div class="rest-col der">
          <div class="papel rest-card rest-decor-lista">
            ${DECOR.map(
              (d) => `<div class="rest-mejora"><img src="${arte(d.arte)}" alt="" draggable="false" /><b>${esc(d.nombre)}</b>${
                reg.decor.has(d.id) ? `<span class="rest-tuya">✓ YOURS</span>` : `<button class="boton boton-fantasma" type="button" data-decor="${d.id}" ${tienda.monedas < d.precio ? "disabled" : ""}>${moneda()}${d.precio}</button>`
              }</div>`,
            ).join("")}
          </div>
          ${mensaje ? `<div class="rest-aviso">${esc(mensaje)}</div>` : ""}
        </div>
      </div>`;
    blindarToques(contenedor.querySelector(".pantalla-rest"));
    cablearVolver(contenedor, () => local());
    for (const b of contenedor.querySelectorAll("[data-decor]"))
      b.addEventListener("click", () => {
        if (reg.comprarDecor(b.dataset.decor, tienda)) {
          sonar("hallazgo");
          vibrar(25);
          guardar();
          decorar(`${DECOR.find((x) => x.id === b.dataset.decor).nombre}: up!`);
        } else sonar("no");
      });
  }

  // ---------------- el dia ----------------
  function abrirDia() {
    const menu = reg.menu(sellados);
    const esp = reg.especial(sellados);
    const cuenta = reg.cuentaHoy();
    // v59: la dificultad sube con la fama (0 en ★1 .. 1 en ★5); en modo relajado, mas facil que nunca
    const dif = reg.relajado ? -0.5 : (reg.estrellasFama() - 1) / 4;
    dia = { pedidos: armarDia(menu, { fama: reg.estrellasFama(), especial: esp, amigos, asientos: reg.nivel("asientos") }), i: 0, ganado: 0, felices: 0, resenas: [], especial: esp, combo: 0, cuenta, dif, famaAntes: reg.fama };
    cliente();
  }

  /** Llega el cliente: su ticket, y a cocinar. */
  function cliente() {
    const p = dia.pedidos[dia.i];
    const r = recetaPorId(p.receta);
    p.notas = [];
    p.k = 0;
    contenedor.innerHTML = `
      <div class="pantalla-rest cocina">
        ${HTML_VOLVER}
        ${hud(`DAY ${reg.turnos + 1} · CUSTOMER ${dia.i + 1} OF ${dia.pedidos.length}`)}
        <div class="rest-pasos" id="rest-pasos">${r.pasos.map((x, k) => `<span class="rest-paso" data-k="${k}">${nombrePaso(x)}</span>`).join("")}</div>
        <div class="rest-ticket">
          <div class="rest-ticket-quien"><img src="${arte(p.quien.amigo ? `npcs/npc_${p.quien.id}.png` : `restaurante/cliente_${p.quien.id}.png`)}" alt="" draggable="false" /><span>${esc(p.quien.nombre)}<small>“${esc(p.frase)}”</small></span></div>
          <div class="rest-ticket-plato">${imgPlato(r.id)}<b>${esc(r.nombre)}</b>${p.receta === dia.especial ? `<span class="rest-tag">SPECIAL ×2</span>` : ""}</div>
          <div class="rest-ticket-extras" id="rest-ticket-extras">${[...(p.toppings || []), ...(p.frutas || []), ...p.extras].map((x) => `<span>+ ${esc(EXTRAS[x].nombre)}</span>`).join("") || `<span class="sin">plain, please</span>`}</div>
          ${p.recordar ? `<div class="rest-recordar" id="rest-recordar">Remember this order! ♥</div>` : ""}
        </div>
        ${dia.combo ? `<div class="rest-combo">PERFECT ×${dia.combo}</div>` : ""}
        <div class="rest-tabla" id="rest-tabla"></div>
        <div class="rest-lado">
          <div class="papel rest-card"><div class="rest-sub">THIS DISH</div><span class="rest-estr" id="rest-estr-plato">☆☆☆</span><small id="rest-notas-pasos"></small></div>
          <button class="boton rest-accion oculto" id="rest-accion" type="button"></button>
          <div class="rest-baozi" id="rest-baozi">${sprite("ojo_base_energia_alta.png", "boca_base_feliz.png")}</div>
        </div>
        <div class="rest-ayuda" id="rest-ayuda"></div>
      </div>`;
    const area = contenedor.querySelector(".pantalla-rest");
    blindarToques(area);
    quitarPausa();
    pausa = crearPausa(area, { activa: () => false }); // la pantalla prendida mientras cocina
    cablearVolver(contenedor, () => terminarDia());
    sonar("tocar");
    siguientePaso();
  }

  function cara(ojo, boca, ms = 900) {
    const el = contenedor.querySelector("#rest-baozi .sprite-cara");
    if (!el) return;
    cambiarCara(el, ojo, boca);
    clearTimeout(cara.t);
    cara.t = setTimeout(() => el.isConnected && cambiarCara(el, "ojo_base_energia_alta.png", "boca_base_feliz.png"), ms);
  }

  function siguientePaso() {
    const p = dia.pedidos[dia.i];
    const r = recetaPorId(p.receta);
    const $ = (id) => contenedor.querySelector(`#${id}`);
    for (const s of contenedor.querySelectorAll(".rest-paso")) {
      const k = Number(s.dataset.k);
      s.className = `rest-paso ${k < p.k ? "hecho" : k === p.k ? "ahora" : ""}`;
      if (k < p.k) s.textContent = `✓ ${nombrePaso(r.pasos[k])}`;
    }
    if (p.k >= r.pasos.length) {
      servir();
      return;
    }
    let def = r.pasos[p.k];
    if (def.t === "emplatar") def = { t: "elegir", opciones: r.extras.map((x) => ({ id: x, ...EXTRAS[x] })), pedido: p.extras };
    else if (def.t === "elegir") {
      const lista = def.topping ? r.toppings : def.frutas ? r.frutas : def.flores ? ["osmanto"] : [];
      const pedido = def.topping ? p.toppings : def.frutas ? p.frutas : def.flores ? p.flores : [];
      def = { t: "elegir", opciones: lista.map((x) => ({ id: x, ...EXTRAS[x] })), pedido, ayuda: def.frutas ? "Skewer the fruit on the ticket, then tap Ready" : def.flores ? "Sprinkle the osmanthus flowers, then tap Ready" : "Add the toppings on the ticket, then tap Ready" };
    }
    const accion = $("rest-accion");
    paso = crearPaso(
      $("rest-tabla"),
      def,
      {
        sonar,
        vibrar,
        plato: arte(`restaurante/plato_${r.id}.png`),
        dif: dia.dif,
        mejoras: { cuchillo: reg.nivel("cuchillo"), ollas: reg.nivel("ollas"), wok: reg.nivel("wok") },
        ayuda: (t) => {
          const a = $("rest-ayuda");
          if (a) a.textContent = t;
        },
        boton: (texto, fn) => {
          if (!accion) return;
          if (!texto) {
            accion.classList.add("oculto");
            accion.onclick = null;
            return;
          }
          accion.textContent = texto;
          accion.classList.remove("oculto");
          accion.onclick = (e) => {
            e.stopPropagation();
            fn();
          };
        },
      },
      (e) => {
        if (!vivo || !dia) return;
        p.notas.push(e);
        p.k += 1;
        if (p.recordar && p.k === 1) {
          const ex = $("rest-ticket-extras");
          if (ex) ex.innerHTML = [...(p.toppings || []), ...(p.frutas || []), ...p.extras].map(() => `<span class="oculta">?</span>`).join("");
          const rc = $("rest-recordar");
          if (rc) rc.textContent = "Do you remember? ♥";
        }
        const prom = estrellasDelPlato(p.notas);
        const pe = $("rest-estr-plato");
        if (pe) pe.textContent = estrellas(prom);
        const pn = $("rest-notas-pasos");
        if (pn) pn.textContent = p.notas.map((x, k) => `${nombrePaso(r.pasos[k])[0]}${nombrePaso(r.pasos[k]).slice(1).toLowerCase()} ${estrellas(x)}`).join(" · ");
        if (e === 3) cara("ojo_especial_euforico.png", "boca_especial_euforico.png");
        else if (e === 1) cara("ojo_especial_decepcionado.png", "boca_especial_decepcionado.png");
        siguientePaso();
      },
    );
  }

  /** Lleva el plato al cliente: estrellas, monedas, resena. */
  function servir() {
    const p = dia.pedidos[dia.i];
    const r = recetaPorId(p.receta);
    const e = estrellasDelPlato(p.notas);
    const esp = p.receta === dia.especial;
    dia.combo = e === 3 ? dia.combo + 1 : 0;
    const combo = dia.combo > 0 && dia.combo % 3 === 0;
    const memoria = p.recordar && e === 3;
    const pago = pagoDe(r, e, esp, 3 + 2 * reg.nivel("propinas")) + (combo ? 5 : 0) + (memoria ? 2 : 0);
    const opciones = RESENAS[e];
    const texto = e === 3 && p.quien.amigo && GRACIAS_AMIGOS[p.quien.id] && Math.random() < 0.5 ? GRACIAS_AMIGOS[p.quien.id] : opciones[Math.floor(Math.random() * opciones.length)];
    dia.ganado += pago;
    if (e >= 2) dia.felices += 1;
    dia.resenas.push({ quien: p.quien.nombre, texto, estrellas: e });
    if (e === 3) dia.resenas.sort((a, b) => b.estrellas - a.estrellas);
    reg.anotarPlato(r.id, e, dia.cuenta);
    guardar();
    paso = null;
    const src = arte(p.quien.amigo ? `npcs/npc_${p.quien.id}_saludo.png` : `restaurante/cliente_${p.quien.id}_saludo.png`);
    contenedor.innerHTML = `
      <div class="pantalla-rest local servir">
        ${frente(`<img class="rest-cliente-servido" src="${src}" alt="" draggable="false" />${imgPlato(r.id, "rest-plato-servido")}`)}
        ${HTML_VOLVER}
        ${hud(`DAY ${reg.turnos + 1} · CUSTOMER ${dia.i + 1} OF ${dia.pedidos.length}`)}
        <div class="papel rest-resena">
          <div class="rest-estr grande">${estrellas(e)}</div>
          <div class="rest-resena-texto">“${esc(texto)}”<small>— ${esc(p.quien.nombre)}</small></div>
          <div class="rest-fin-monedas">${moneda()}+${pago}</div>
          ${esp || e === 3 ? `<small class="rest-extra-pago">${[esp ? "special ×2" : "", e === 3 ? `+${3 + 2 * reg.nivel("propinas")} tip` : "", memoria ? "good memory +2" : ""].filter(Boolean).join(" · ")}</small>` : ""}
          ${combo ? `<div class="rest-combo-fin"><span class="rest-baila">${sprite("ojo_especial_euforico.png", "boca_especial_euforico.png")}</span><b>PERFECT ×${dia.combo}!</b><small>Baozi is dancing · +5</small></div>` : ""}
          <button class="boton" id="btn-rest-siguiente" type="button">${dia.i + 1 < dia.pedidos.length ? "Next customer" : "Close the shop"}</button>
        </div>
      </div>`;
    blindarToques(contenedor.querySelector(".pantalla-rest"));
    cablearVolver(contenedor, () => terminarDia(true));
    sonar(e === 3 ? "hallazgo" : e === 2 ? "hito" : "mimo");
    vibrar(e === 3 ? [20, 40, 20] : 20);
    contenedor.querySelector("#btn-rest-siguiente").addEventListener("click", () => {
      sonar("tocar");
      dia.i += 1;
      if (dia.i < dia.pedidos.length) cliente();
      else terminarDia(true);
    });
  }

  /** Cierra el dia (al terminar los clientes o con la flechita): cobra lo hecho. */
  function terminarDia(completo = false) {
    if (!dia) return local();
    if (paso) paso.destruir();
    paso = null;
    quitarPausa();
    const { ganado, felices, resenas, cuenta, famaAntes } = dia;
    const servidos = dia.resenas.length;
    dia = null;
    if (!servidos) return local();
    const { paga, record } = reg.cerrarTurno({ ganado, felices, resenas, cuenta });
    const famaGanada = reg.fama - famaAntes;
    alCerrarTurno({ paga, felices, record, sobras: [], ganado });
    guardar();
    contenedor.innerHTML = `
      <div class="pantalla-rest local">
        ${frente()}
        ${hud("SHOP CLOSED")}
        <div class="rest-fin">
          <div class="papel rest-fin-carta">
            <div class="rest-sub">${record ? "BEST DAY EVER!" : completo ? "WHAT A DAY!" : "CLOSED EARLY"}</div>
            <div class="rest-fin-titulo">${felices} happy customer${felices === 1 ? "" : "s"}</div>
            ${resenas[0] ? `<div class="rest-fin-texto">“${esc(resenas[0].texto)}” — ${esc(resenas[0].quien)}</div>` : ""}
            <div class="rest-fin-texto">Fame ${estrellas(reg.estrellasFama(), 5)} · ${cuenta ? `${famaGanada >= 0 ? "+" : ""}${famaGanada} fame` : reg.relajado ? "relaxed day, no fame" : "practice day, no fame"}</div>
            ${progresoFama(reg.fama) ? `<div class="rest-barra-fama"><i style="width:${Math.round(progresoFama(reg.fama).f * 100)}%"></i></div>` : ""}
            ${paga !== ganado ? `<div class="rest-fin-texto"><small>The shop made ${ganado}, you keep ${paga} (one full day per day)</small></div>` : ""}
            <div class="rest-fin-monedas">${moneda()}+${paga}</div>
            <button class="boton" id="btn-rest-volver" type="button">Back to the shop</button>
          </div>
        </div>
      </div>`;
    sonar(felices ? "hallazgo" : "mimo");
    contenedor.querySelector("#btn-rest-volver").addEventListener("click", () => {
      sonar("tocar");
      if (reg.carta) cartaCritico();
      else local();
    });
  }

  // ---------------- v59: la carta del critico al subir de estrella ----------------
  const CARTAS = {
    2: "A little bird told me about the bao on Hefang Street. I came, I ate, I came back. Two stars, and climbing.",
    3: "I came for one bao and stayed for three. Baozi's little shop is now a three-star stop on Hefang Street.",
    4: "The line reaches the corner now. Four stars: the steam, the smiles, the care in every fold.",
    5: "Five stars. The best little kitchen in Hangzhou, and the warmest. I'll be back tomorrow. And the day after.",
  };
  function cartaCritico() {
    const e = reg.carta;
    reg.carta = 0;
    guardar();
    const recetas = RECETAS.filter((r) => r.desbloqueo && r.desbloqueo.fama === e).map((r) => r.nombre);
    const mej = MEJORAS_COCINA.filter((m) => m.estrella.includes(e)).map((m) => m.nombre);
    const nuevo = ["+1 customer a day", recetas.length ? `new recipes to learn: ${recetas.join(", ")}` : "", mej.length ? `new upgrades: ${mej.join(", ")}` : ""].filter(Boolean).join(" · ");
    contenedor.insertAdjacentHTML(
      "beforeend",
      `<div class="rest-carta"><div class="papel rest-carta-hoja">
        <div class="rest-sub">A LETTER FROM THE HEFANG FOOD CRITIC</div>
        <div class="rest-carta-sello">${"★".repeat(e)}</div>
        <p>“${esc(CARTAS[e] || CARTAS[5])}”</p>
        <small>New: ${esc(nuevo)}</small>
        <button class="boton" id="btn-rest-carta" type="button">Thank you! ♥</button>
      </div></div>`,
    );
    sonar("hallazgo");
    vibrar([30, 60, 30, 60, 30]);
    contenedor.querySelector("#btn-rest-carta").addEventListener("click", () => {
      sonar("tocar");
      local();
    });
  }

  local();
  return {
    destruir() {
      vivo = false;
      if (paso) paso.destruir();
      quitarPausa();
    },
    // para las pruebas
    _dia: () => dia,
    _resolverPaso: (e = 3) => paso && paso.resolver(e),
    _reabrirCliente: () => {
      if (paso) paso.destruir();
      paso = null;
      if (dia) cliente();
    },
  };
}
