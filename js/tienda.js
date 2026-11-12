/**
 * tienda.js
 * ==========
 * v23 (rom: "que las misiones den monedas y así comprar cosas, para que no
 * sea algo de hacer una vez y ya"). Las monedas se ganan con lo de todos
 * los dias (con tope por dia) y se gastan en la tienda del cuaderno.
 *
 *   - 15 cosas en 4 entregas: la semana 0 abre con 6 y despues llegan 3
 *     por semana. Las semanas se cuentan desde que ella abre esta version.
 *     Lo que no compra queda a la venta para siempre.
 *   - La comida se compra muchas veces (va a la heladera con su cantidad);
 *     lo demas, una vez.
 *   - Los regalos de los amigos NO se venden: siguen siendo unicos.
 *
 * Sin imports: lo usan main.js, render.js, personaje.js y pieza.js.
 */

export const SEMANA_MS = 7 * 86400000;

/**
 * El catalogo. semana: en que entrega llega (0 = el primer dia).
 * tipo: "comida" | "sticker" | "accesorio" | "decoracion" | "cuarto" | "mascota".
 *
 * v25: los cuartos (otro estilo para el cuarto entero; el depto japones es
 * el de siempre y es gratis) y las mascotas de compania (una sola afuera a la
 * vez, sin necesidades). Llegan de a poco, semanas 2 a 5.
 */
export const CATALOGO = [
  { id: "osmanto", tipo: "comida", nombre: "Osmanthus cake", precio: 15, semana: 0, arte: "tienda/comida_osmanto.png", accion: "feed", efecto: { felicidad: 15 }, texto: "Sweet osmanthus jelly. Hangzhou's flower!" },
  { id: "longjing", tipo: "comida", nombre: "Longjing tea", precio: 12, semana: 0, arte: "tienda/comida_longjing.png", accion: "water", efecto: { energia: 10, felicidad: 5 }, texto: "Dragon Well green tea. A little boost." },
  { id: "loto", tipo: "sticker", nombre: "Lotus stickers", precio: 30, semana: 0, arte: "tienda/sticker_loto.png", stickers: ["loto", "hoja_loto"], texto: "Lotus flowers from West Lake, for your photos." },
  { id: "mono", tipo: "accesorio", nombre: "Red bow", precio: 80, semana: 0, arte: "tienda/acc_mono.png", texto: "A red bow to wear." },
  { id: "farolitos", tipo: "decoracion", nombre: "Paper lanterns", precio: 140, semana: 0, arte: "tienda/deco_farolitos.png", texto: "Red lanterns for the window. They glow at night." },
  { id: "pecera", tipo: "decoracion", nombre: "Goldfish bowl", precio: 180, semana: 0, arte: "tienda/deco_pecera.png", texto: "Two little goldfish, like the ones at Flower Harbour." },
  { id: "lentes", tipo: "accesorio", nombre: "Round glasses", precio: 90, semana: 1, arte: "tienda/acc_lentes.png", texto: "Round golden glasses. Very smart." },
  { id: "bonsai", tipo: "decoracion", nombre: "Bonsai pine", precio: 120, semana: 1, arte: "tienda/deco_bonsai.png", texto: "A tiny pine tree for the top of the TV." },
  { id: "corazones", tipo: "sticker", nombre: "Heart stickers", precio: 30, semana: 1, arte: "tienda/sticker_corazones.png", stickers: ["corazones", "brillos"], texto: "Hearts and sparkles for your photos." },
  { id: "sombrero", tipo: "accesorio", nombre: "Rice hat", precio: 110, semana: 2, arte: "tienda/acc_sombrero.png", texto: "A straw rice hat (dǒulì)." },
  { id: "poster", tipo: "decoracion", nombre: "Leifeng poster", precio: 150, semana: 2, arte: "tienda/deco_poster.png", texto: "Leifeng Pagoda at sunset, for the wall." },
  { id: "luna", tipo: "comida", nombre: "Mooncake", precio: 20, semana: 2, arte: "tienda/comida_luna.png", accion: "feed", efecto: { hambre: 20, felicidad: 10 }, texto: "A golden mooncake. Very filling." },
  { id: "osmanto_corona", tipo: "accesorio", acc: "osmanto", nombre: "Osmanthus crown", precio: 130, semana: 3, arte: "tienda/acc_osmanto.png", texto: "A crown of tiny osmanthus flowers." },
  { id: "luces", tipo: "decoracion", nombre: "Fairy lights", precio: 160, semana: 3, arte: "tienda/deco_luces.png", texto: "Little lights over the map. They twinkle at night." },
  { id: "peluche", tipo: "decoracion", nombre: "Plushie", precio: 250, semana: 3, arte: "tienda/deco_peluche_baozi.png", texto: "A soft plushie to keep you company." },
  // v25
  { id: "gato", tipo: "mascota", nombre: "Black cat", precio: 300, semana: 2, arte: "mascotas/gato_sentado.png", texto: "A little black cat. Naps a lot." },
  { id: "te", tipo: "cuarto", nombre: "Tea house", precio: 600, semana: 3, arte: "tienda/cuarto_te.png", texto: "A Hangzhou tea house with a moon window over the lake." },
  { id: "perro", tipo: "mascota", nombre: "Shiba", precio: 300, semana: 4, arte: "mascotas/perro_sentado.png", texto: "A happy shiba. Follows you around the room." },
  { id: "bote", tipo: "cuarto", nombre: "Houseboat", precio: 800, semana: 4, arte: "tienda/cuarto_bote.png", texto: "A little houseboat floating on West Lake." },
  { id: "serpiente", tipo: "mascota", nombre: "White snake", precio: 300, semana: 5, arte: "mascotas/serpiente_enroscada.png", texto: "A white snake, like the one in the West Lake legend." },
  { id: "cabana", tipo: "cuarto", nombre: "Winter cabin", precio: 1000, semana: 5, arte: "tienda/cuarto_cabana.png", texto: "A log cabin with a crackling fireplace and snow outside." },
  // v40: un poquito de Colombia (tools/tienda_co.py, tools/cuartos_co.py)
  { id: "arepa", tipo: "comida", nombre: "Arepa", precio: 15, semana: 0, arte: "tienda/comida_arepa.png", accion: "feed", efecto: { hambre: 20, felicidad: 5 }, texto: "A warm arepa with butter and melted cheese." },
  { id: "empanada", tipo: "comida", nombre: "Empanadas", precio: 15, semana: 1, arte: "tienda/comida_empanada.png", accion: "feed", efecto: { hambre: 15, felicidad: 10 }, texto: "Crispy empanadas with a squeeze of lime." },
  { id: "tinto", tipo: "comida", nombre: "Tinto", precio: 10, semana: 0, arte: "tienda/comida_tinto.png", accion: "water", efecto: { energia: 12 }, texto: "A little cup of Colombian coffee. Wakes you right up." },
  { id: "vueltiao", tipo: "accesorio", nombre: "Sombrero vueltiao", precio: 120, semana: 1, arte: "tienda/acc_vueltiao.png", texto: "The famous woven hat from the Caribbean coast." },
  { id: "banderin", tipo: "decoracion", nombre: "Colombian bunting", precio: 120, semana: 0, arte: "tienda/deco_banderin.png", texto: "Yellow, blue and red flags over the door and the window." },
  { id: "chiva", tipo: "decoracion", nombre: "Toy chiva", precio: 150, semana: 1, arte: "tienda/deco_chiva.png", texto: "A tiny chiva bus, painted in every color." },
  { id: "finca", tipo: "cuarto", nombre: "Coffee farm", precio: 900, semana: 1, arte: "tienda/cuarto_finca.png", texto: "A coffee farmhouse looking out at the wax palms of the Cocora Valley." },
  { id: "bunuelos", tipo: "comida", nombre: "Buñuelos", precio: 18, semana: 2, arte: "tienda/comida_bunuelos.png", accion: "feed", efecto: { hambre: 15, felicidad: 12 }, texto: "Golden cheese buñuelos, like at Christmas." },
  { id: "silletera", tipo: "accesorio", nombre: "Flower crown", precio: 130, semana: 2, arte: "tienda/acc_silletera.png", texto: "Flowers from the silleteros of Medellín's flower fair." },
  { id: "ruana", tipo: "accesorio", nombre: "Ruana", precio: 110, semana: 2, arte: "tienda/acc_ruana.png", texto: "A warm wool ruana for chilly mountain nights." },
  { id: "mochila", tipo: "accesorio", nombre: "Wayuu bag", precio: 100, semana: 2, arte: "tienda/acc_mochila.png", texto: "A hand-woven Wayuu mochila, full of colors." },
  { id: "orquidea", tipo: "decoracion", nombre: "Orchid", precio: 130, semana: 2, arte: "tienda/deco_orquidea.png", texto: "A Cattleya orchid, Colombia's national flower." },
  { id: "saco", tipo: "decoracion", nombre: "Coffee sack", precio: 100, semana: 2, arte: "tienda/deco_saco.png", texto: "A sack of coffee beans straight from the farm." },
  { id: "guatape", tipo: "cuarto", nombre: "Guatapé house", precio: 1100, semana: 2, arte: "tienda/cuarto_guatape.png", texto: "A house with colorful zócalos, looking out at the lake and El Peñol." },
  // v45: semillas para el jardin del balcon (jardin.js). Se compran muchas veces, como la comida.
  { id: "semilla_girasol", tipo: "semilla", planta: "girasol", nombre: "Sunflower seeds", precio: 10, semana: 0, arte: "jardin/semilla_girasol.png", texto: "Ready in 3 days. Sell the flower for 25 coins." },
  { id: "semilla_longjing", tipo: "semilla", planta: "longjing", nombre: "Longjing tea seeds", precio: 15, semana: 0, arte: "jardin/semilla_longjing.png", texto: "Ready in 3 days. Two Longjing teas for the fridge." },
  { id: "semilla_cafe", tipo: "semilla", planta: "cafe", nombre: "Coffee seeds", precio: 20, semana: 0, arte: "jardin/semilla_cafe.png", texto: "Ready in 5 days. Three cups of tinto for the fridge." },
  { id: "semilla_loto", tipo: "semilla", planta: "loto", nombre: "Lotus seeds", precio: 25, semana: 0, arte: "jardin/semilla_loto.png", texto: "Ready in 4 days. Sell the flower for 45 coins." },
  { id: "semilla_bambu", tipo: "semilla", planta: "bambu", nombre: "Bamboo shoots", precio: 15, semana: 1, arte: "jardin/semilla_bambu.png", texto: "Ready in 3 days. Sell it for 35 coins." },
  { id: "semilla_maracuya", tipo: "semilla", planta: "maracuya", nombre: "Passion fruit seeds", precio: 20, semana: 1, arte: "jardin/semilla_maracuya.png", texto: "Ready in 5 days. Two passion fruits for the fridge." },
  { id: "semilla_osmanto", tipo: "semilla", planta: "osmanto", nombre: "Osmanthus seeds", precio: 25, semana: 1, arte: "jardin/semilla_osmanto.png", texto: "Ready in 4 days. Two osmanthus cakes for the fridge." },
  { id: "semilla_orquidea", tipo: "semilla", planta: "orquidea", nombre: "Orchid seeds", precio: 30, semana: 1, arte: "jardin/semilla_orquidea.png", texto: "Ready in 5 days. Sell the flower for 60 coins." },
  // v45: la maracuya sale del jardin (no se vende)
  { id: "maracuya", tipo: "comida", nombre: "Passion fruit", precio: 0, semana: 0, noSeVende: true, arte: "tienda/comida_maracuya.png", accion: "feed", efecto: { felicidad: 10, energia: 5 }, texto: "Fresh from the balcony garden." },
];

/** La ultima entrega (para saber si todavia llegan cosas). */
export const ULTIMA_SEMANA = Math.max(...CATALOGO.filter((c) => !c.noSeVende).map((c) => c.semana));

/** Los accesorios de la tienda (id del accesorio -> archivo). */
export const ACCESORIOS_TIENDA = Object.fromEntries(CATALOGO.filter((c) => c.tipo === "accesorio").map((c) => [c.acc || c.id, c.arte]));

export const porId = (id) => CATALOGO.find((c) => c.id === id) || null;

/** Topes por dia de cada forma de ganar monedas (lo que no esta aca no tiene tope). */
// v35: record con tope (15 = 3 records por dia): sin tope, un juego facil se "farmeaba"
export const TOPES = { pasos: 10, diario: 5, cuidar: 5, juego: 10, foto: 6, saludo: 4, propio: 20, record: 15 };

/**
 * v44 (rom: "no tiene sentido jugar si no da monedas"): las monedas de los
 * juegos. Antes los 5 juegos compartian un tope de 10 por dia (despues de la
 * primera partida ya no daban nada). Ahora:
 *   - la PRIMERA partida del dia de CADA juego paga segun el puntaje, hasta 15;
 *   - despues, una partida que pase el puntaje medio da 5, y una buena da 10,
 *     hasta 5 veces por dia (entre todos los juegos);
 *   - el record sigue dando +5 (hasta 3 por dia).
 * "Medio" y "bueno" son los puntajes que en la primera partida valdrian 5 y
 * 10 monedas (valorJuego), asi una sola cuenta decide las dos cosas.
 */
export const JUEGO_PRIMERA_MAX = 15;
export const JUEGO_EXTRAS_POR_DIA = 5;
export const JUEGO_EXTRA = { medio: 5, bueno: 10 };
const DIF_JUEGO = { easy: 0.8, normal: 1, hard: 1.25 };

/**
 * Cuantas monedas "vale" una partida (sin tope, puede tener decimales).
 * r: lo que devuelve el juego al terminar ({ puntos, dificultad, ... }).
 */
export function valorJuego(juego, r = {}) {
  const p = Math.max(0, Number(r.puntos) || 0);
  let v;
  if (juego === "snack") v = p / 8; // 40 pts -> 5, 80 -> 10
  else if (juego === "pesca") v = (p * 2) / 3; // 8 pts (unos 5 peces) -> 5
  else if (juego === "torre") v = p / 2; // 10 pts -> 5, 20 -> 10
  else if (juego === "tejo") v = p / 2; // 10 pts -> 5, 20 -> 10
  else if (juego === "faroles") v = p / 2; // v54: 10 pts -> 5, 20 -> 10
  else if (juego === "ritmo") {
    // depende de la cancion: cuenta que parte de las notas acerto (un "bien" vale menos que un "perfecto")
    const total = Number(r.total) || 0;
    const acierto = total ? Math.min(1, ((Number(r.perfectos) || 0) + 0.6 * (Number(r.buenos) || 0)) / total) : 0;
    v = Math.max(0, 18 * acierto - 3); // 45 % -> 5, 72 % -> 10, todo perfecto -> 15
  } else v = 0;
  return v * (DIF_JUEGO[r.dificultad] || 1);
}
// propio: un lugar que ella agrega desde el mapa (20 monedas, uno por dia: si no, se podrian "fabricar" monedas)
export const PREMIOS = { diario: 5, cuidar: 1, foto: 2, saludo: 2, sello: 20, mision: 30, racha: 25, record: 5, propio: 20 };

const claveDia = (t) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export class Tienda {
  constructor(ahora = Date.now()) {
    this.monedas = 0;
    this.ganadas = 0; // en total (para curiosidad)
    this.inicio = ahora; // desde cuando se cuentan las semanas
    this.compradas = new Set(); // lo que se compra una vez
    this.comida = {}; // id -> cantidad en la heladera
    this.vistas = new Set(); // lo que ella ya vio en la tienda (para "NEW")
    this.hoy = { dia: claveDia(ahora), por: {} }; // lo ganado hoy por fuente
    this.pasosPagados = {}; // dia -> monedas ya pagadas por los pasos de ese dia
    this.rachaPremiada = 0; // la ultima racha de 7 que ya se premio
    this.avisoSemana = -1; // la ultima entrega que Baozi ya anuncio
    this.todoDesbloqueado = false; // modo director: ver todas las semanas
    this.cuarto = "depto"; // v25: el cuarto puesto ("depto" = el de siempre)
    this.mascota = null; // v25: la mascota que esta afuera (o ninguna)
    this.semillas = {}; // v45: planta -> cuantas semillas tiene
    this.guardadas = new Set(); // v47: decoraciones (compradas o regaladas) que ella saco del cuarto
  }

  /** v25: los cuartos que tiene (sin contar el depto, que es de todos). */
  cuartos() {
    return CATALOGO.filter((c) => c.tipo === "cuarto" && this.tiene(c.id)).map((c) => c.id);
  }

  /** v25: las mascotas que tiene. */
  mascotas() {
    return CATALOGO.filter((c) => c.tipo === "mascota" && this.tiene(c.id)).map((c) => c.id);
  }

  /** v25: pone un cuarto que tiene (o el depto). true si cambio. */
  ponerCuarto(id) {
    if (id !== "depto" && !(porId(id) && porId(id).tipo === "cuarto" && this.tiene(id))) return false;
    if (this.cuarto === id) return false;
    this.cuarto = id;
    return true;
  }

  /** v25: saca una mascota que tiene, o la guarda (null). true si cambio. */
  ponerMascota(id) {
    if (id !== null && !(porId(id) && porId(id).tipo === "mascota" && this.tiene(id))) return false;
    if (this.mascota === id) return false;
    this.mascota = id;
    return true;
  }

  semanaActual(ahora = Date.now()) {
    if (this.todoDesbloqueado) return 99;
    return Math.max(0, Math.floor((ahora - this.inicio) / SEMANA_MS));
  }

  disponibles(ahora = Date.now()) {
    const s = this.semanaActual(ahora);
    return CATALOGO.filter((c) => c.semana <= s && !c.noSeVende);
  }

  /** Lo que llego en la ultima entrega (la de esta semana), o [] si ya estan todas desde antes. */
  deEstaSemana(ahora = Date.now()) {
    const s = Math.min(this.semanaActual(ahora), Math.max(...CATALOGO.map((c) => c.semana)));
    return CATALOGO.filter((c) => c.semana === s);
  }

  /** Lo disponible que ella todavia no vio. */
  nuevas(ahora = Date.now()) {
    return this.disponibles(ahora).filter((c) => !this.vistas.has(c.id));
  }

  marcarVistas(ahora = Date.now()) {
    for (const c of this.disponibles(ahora)) this.vistas.add(c.id);
  }

  /** true si ya lo tiene (lo que se compra una vez). La comida nunca "se tiene". */
  tiene(id) {
    return this.compradas.has(id);
  }

  cantidadComida(id) {
    return this.comida[id] || 0;
  }

  /** Compra. Devuelve "ok" | "no-alcanza" | "ya-lo-tiene" | "no-esta". */
  comprar(id, ahora = Date.now()) {
    const c = porId(id);
    if (!c || !this.disponibles(ahora).includes(c)) return "no-esta";
    if (c.tipo !== "comida" && c.tipo !== "semilla" && this.tiene(id)) return "ya-lo-tiene";
    if (this.monedas < c.precio) return "no-alcanza";
    this.monedas -= c.precio;
    if (c.tipo === "comida") this.comida[id] = this.cantidadComida(id) + 1;
    else if (c.tipo === "semilla") this.semillas[c.planta] = this.cantidadSemillas(c.planta) + 1;
    else this.compradas.add(id);
    this.vistas.add(id);
    return "ok";
  }

  /** v45: las semillas del jardin (por planta). */
  cantidadSemillas(planta) {
    return this.semillas[planta] || 0;
  }

  /** v45: suma semillas (las de regalo). */
  darSemillas(planta, n = 1) {
    this.semillas[planta] = this.cantidadSemillas(planta) + Math.max(0, Math.floor(n));
  }

  /** v45: usa una semilla. true si habia. */
  usarSemilla(planta) {
    if (!this.cantidadSemillas(planta)) return false;
    this.semillas[planta] -= 1;
    if (!this.semillas[planta]) delete this.semillas[planta];
    return true;
  }

  /** v45: suma comida a la heladera (la cosecha del jardin). */
  darComida(id, n = 1) {
    const c = porId(id);
    if (!c || c.tipo !== "comida") return false;
    this.comida[id] = this.cantidadComida(id) + Math.max(0, Math.floor(n));
    return true;
  }

  /** Usa una comida de la heladera. true si habia. */
  usarComida(id) {
    if (!this.cantidadComida(id)) return false;
    this.comida[id] -= 1;
    if (!this.comida[id]) delete this.comida[id];
    return true;
  }

  _hoy(ahora) {
    const d = claveDia(ahora);
    if (this.hoy.dia !== d) this.hoy = { dia: d, por: {} };
    return this.hoy.por;
  }

  /**
   * Suma monedas de una fuente, respetando su tope del dia.
   * Devuelve cuantas se sumaron de verdad (0 si ya llego al tope).
   */
  ganar(fuente, cantidad = PREMIOS[fuente] || 0, ahora = Date.now()) {
    const n = Math.max(0, Math.floor(cantidad));
    if (!n) return 0;
    const por = this._hoy(ahora);
    const tope = TOPES[fuente];
    const dar = tope == null ? n : Math.max(0, Math.min(n, tope - (por[fuente] || 0)));
    if (!dar) return 0;
    por[fuente] = (por[fuente] || 0) + dar;
    this.monedas += dar;
    this.ganadas += dar;
    return dar;
  }

  /**
   * v44: las monedas de una partida. Devuelve { monedas, como } con como =
   * "primera" (la primera del dia de ese juego), "medio" | "bueno" (una
   * partida mas que paso el puntaje) o null (no pago: no llego, o ya se
   * usaron las 5 del dia). Una partida que no vale ni 1 moneda no gasta la
   * primera del dia.
   */
  ganarPorJuego(juego, r = {}, ahora = Date.now()) {
    const v = valorJuego(juego, r);
    const por = this._hoy(ahora);
    const clavePrimera = `jugo_${juego}`;
    let monedas = 0;
    let como = null;
    if (!por[clavePrimera]) {
      // (una partida que no llega ni a 1 moneda, como salirse enseguida, no gasta la primera)
      monedas = Math.min(JUEGO_PRIMERA_MAX, Math.floor(v));
      if (monedas < 1) return { monedas: 0, como: null };
      por[clavePrimera] = 1;
      como = "primera";
    } else if ((por.juego_extras || 0) < JUEGO_EXTRAS_POR_DIA && v >= 5) {
      monedas = v >= 10 ? JUEGO_EXTRA.bueno : JUEGO_EXTRA.medio;
      como = v >= 10 ? "bueno" : "medio";
      por.juego_extras = (por.juego_extras || 0) + 1;
    }
    if (monedas > 0) {
      this.monedas += monedas;
      this.ganadas += monedas;
    }
    return { monedas, como };
  }

  /** v44: ¿la primera partida de hoy de este juego todavia paga segun el puntaje? */
  primeraDelDia(juego, ahora = Date.now()) {
    return !this._hoy(ahora)[`jugo_${juego}`];
  }

  /** Los pasos anotados de un dia: 1 moneda cada 1.000 pasos, hasta 10 por dia. */
  ganarPorPasos(dia, pasosDelDia) {
    const corresponde = Math.min(TOPES.pasos, Math.floor(Math.max(0, pasosDelDia) / 1000));
    const dar = Math.max(0, corresponde - (this.pasosPagados[dia] || 0));
    if (!dar) return 0;
    this.pasosPagados[dia] = corresponde;
    // se guardan solo los ultimos dias
    const dias = Object.keys(this.pasosPagados).sort();
    for (const d of dias.slice(0, Math.max(0, dias.length - 7))) delete this.pasosPagados[d];
    this.monedas += dar;
    this.ganadas += dar;
    return dar;
  }

  /** 7 dias seguidos escribiendo el diario (cada 7: 7, 14, 21...). */
  ganarPorRacha(racha) {
    if (racha < 7 || racha % 7 !== 0 || racha <= this.rachaPremiada) return 0;
    this.rachaPremiada = racha;
    this.monedas += PREMIOS.racha;
    this.ganadas += PREMIOS.racha;
    return PREMIOS.racha;
  }

  /** Las cosas del cuarto que tiene (ids de decoracion). */
  decoraciones() {
    return CATALOGO.filter((c) => c.tipo === "decoracion" && this.tiene(c.id)).map((c) => c.id);
  }

  /** v47: ¿esta decoracion esta puesta en el cuarto? (todas empiezan puestas) */
  estaPuesta(id) {
    return !this.guardadas.has(id);
  }

  /** v47: la saca del cuarto o la vuelve a poner. Devuelve si quedo puesta. */
  alternarDeco(id) {
    if (typeof id !== "string" || !id) return false;
    if (this.guardadas.has(id)) this.guardadas.delete(id);
    else this.guardadas.add(id);
    return !this.guardadas.has(id);
  }

  /** Los accesorios que tiene (ids de accesorio, como los de los amigos). */
  accesorios() {
    return CATALOGO.filter((c) => c.tipo === "accesorio" && this.tiene(c.id)).map((c) => c.acc || c.id);
  }

  /** Los stickers que tiene (ids de sticker). */
  stickers() {
    return CATALOGO.filter((c) => c.tipo === "sticker" && this.tiene(c.id)).flatMap((c) => c.stickers);
  }

  aObjeto() {
    return {
      monedas: this.monedas,
      ganadas: this.ganadas,
      inicio: this.inicio,
      compradas: [...this.compradas],
      comida: this.comida,
      vistas: [...this.vistas],
      hoy: this.hoy,
      pasosPagados: this.pasosPagados,
      rachaPremiada: this.rachaPremiada,
      avisoSemana: this.avisoSemana,
      todoDesbloqueado: this.todoDesbloqueado,
      cuarto: this.cuarto,
      mascota: this.mascota,
      semillas: this.semillas,
      guardadas: [...this.guardadas],
    };
  }

  static desdeObjeto(datos, ahora = Date.now()) {
    const t = new Tienda(ahora);
    if (!datos || typeof datos !== "object") return t;
    const entero = (v, def = 0) => (Number.isFinite(v) ? Math.max(0, Math.floor(v)) : def);
    t.monedas = entero(datos.monedas);
    t.ganadas = entero(datos.ganadas);
    t.inicio = Number.isFinite(datos.inicio) && datos.inicio <= ahora ? datos.inicio : ahora;
    t.compradas = new Set((datos.compradas || []).filter((id) => porId(id) && porId(id).tipo !== "comida"));
    for (const [id, n] of Object.entries(datos.comida || {})) {
      if (porId(id) && porId(id).tipo === "comida" && entero(n) > 0) t.comida[id] = entero(n);
    }
    t.vistas = new Set((datos.vistas || []).filter((id) => porId(id)));
    t.guardadas = new Set((Array.isArray(datos.guardadas) ? datos.guardadas : []).filter((id) => typeof id === "string" && /^[a-z_]{1,24}$/.test(id)));
    for (const [planta, n] of Object.entries(datos.semillas || {})) {
      if (CATALOGO.some((c) => c.tipo === "semilla" && c.planta === planta) && entero(n) > 0) t.semillas[planta] = entero(n);
    }
    if (datos.hoy && typeof datos.hoy.dia === "string" && datos.hoy.por && typeof datos.hoy.por === "object") {
      t.hoy = { dia: datos.hoy.dia, por: {} };
      for (const [k, v] of Object.entries(datos.hoy.por)) t.hoy.por[k] = entero(v);
    }
    for (const [d, v] of Object.entries(datos.pasosPagados || {})) if (/^\d{4}-\d\d-\d\d$/.test(d)) t.pasosPagados[d] = entero(v);
    t.rachaPremiada = entero(datos.rachaPremiada);
    t.avisoSemana = Number.isInteger(datos.avisoSemana) ? datos.avisoSemana : -1;
    t.todoDesbloqueado = datos.todoDesbloqueado === true;
    // v25: solo lo que de verdad tiene (si no, el depto y sin mascota)
    if (typeof datos.cuarto === "string") t.ponerCuarto(datos.cuarto);
    if (typeof datos.mascota === "string") t.ponerMascota(datos.mascota);
    return t;
  }
}
