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
 * tipo: "comida" | "sticker" | "accesorio" | "decoracion".
 */
export const CATALOGO = [
  { id: "osmanto", tipo: "comida", nombre: "Osmanthus cake", precio: 15, semana: 0, arte: "tienda/comida_osmanto.png", accion: "feed", efecto: { felicidad: 15 }, texto: "Sweet osmanthus jelly. Hangzhou's flower!" },
  { id: "longjing", tipo: "comida", nombre: "Longjing tea", precio: 12, semana: 0, arte: "tienda/comida_longjing.png", accion: "water", efecto: { energia: 10, felicidad: 5 }, texto: "Dragon Well green tea. A little boost." },
  { id: "loto", tipo: "sticker", nombre: "Lotus stickers", precio: 30, semana: 0, arte: "tienda/sticker_loto.png", stickers: ["loto", "hoja_loto"], texto: "Lotus flowers from West Lake, for your photos." },
  { id: "mono", tipo: "accesorio", nombre: "Red bow", precio: 80, semana: 0, arte: "tienda/acc_mono.png", texto: "A red bow to wear." },
  { id: "farolitos", tipo: "decoracion", nombre: "Paper lanterns", precio: 140, semana: 0, arte: "tienda/deco_farolitos.png", texto: "Red lanterns for the window. They glow at night." },
  { id: "pecera", tipo: "decoracion", nombre: "Goldfish bowl", precio: 180, semana: 0, arte: "tienda/deco_pecera.png", texto: "Two little goldfish, like the ones at Flower Harbor." },
  { id: "lentes", tipo: "accesorio", nombre: "Round glasses", precio: 90, semana: 1, arte: "tienda/acc_lentes.png", texto: "Round golden glasses. Very smart." },
  { id: "bonsai", tipo: "decoracion", nombre: "Bonsai pine", precio: 120, semana: 1, arte: "tienda/deco_bonsai.png", texto: "A tiny pine tree for the top of the TV." },
  { id: "corazones", tipo: "sticker", nombre: "Heart stickers", precio: 30, semana: 1, arte: "tienda/sticker_corazones.png", stickers: ["corazones", "brillos"], texto: "Hearts and sparkles for your photos." },
  { id: "sombrero", tipo: "accesorio", nombre: "Rice hat", precio: 110, semana: 2, arte: "tienda/acc_sombrero.png", texto: "A straw rice hat (dǒulì)." },
  { id: "poster", tipo: "decoracion", nombre: "Leifeng poster", precio: 150, semana: 2, arte: "tienda/deco_poster.png", texto: "Leifeng Pagoda at sunset, for the wall." },
  { id: "luna", tipo: "comida", nombre: "Mooncake", precio: 20, semana: 2, arte: "tienda/comida_luna.png", accion: "feed", efecto: { hambre: 20, felicidad: 10 }, texto: "A golden mooncake. Very filling." },
  { id: "osmanto_corona", tipo: "accesorio", acc: "osmanto", nombre: "Osmanthus crown", precio: 130, semana: 3, arte: "tienda/acc_osmanto.png", texto: "A crown of tiny osmanthus flowers." },
  { id: "luces", tipo: "decoracion", nombre: "Fairy lights", precio: 160, semana: 3, arte: "tienda/deco_luces.png", texto: "Little lights over the map. They twinkle at night." },
  { id: "peluche", tipo: "decoracion", nombre: "Plushie", precio: 250, semana: 3, arte: "tienda/deco_peluche_baozi.png", texto: "A soft plushie to keep you company." },
];

/** Los accesorios de la tienda (id del accesorio -> archivo). */
export const ACCESORIOS_TIENDA = Object.fromEntries(CATALOGO.filter((c) => c.tipo === "accesorio").map((c) => [c.acc || c.id, c.arte]));

export const porId = (id) => CATALOGO.find((c) => c.id === id) || null;

/** Topes por dia de cada forma de ganar monedas (lo que no esta aca no tiene tope). */
export const TOPES = { pasos: 10, diario: 5, cuidar: 5, juego: 10, foto: 6, saludo: 4 };
export const PREMIOS = { diario: 5, cuidar: 1, foto: 2, saludo: 2, sello: 20, mision: 30, racha: 25, record: 5 };

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
  }

  semanaActual(ahora = Date.now()) {
    if (this.todoDesbloqueado) return 99;
    return Math.max(0, Math.floor((ahora - this.inicio) / SEMANA_MS));
  }

  disponibles(ahora = Date.now()) {
    const s = this.semanaActual(ahora);
    return CATALOGO.filter((c) => c.semana <= s);
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
    if (c.tipo !== "comida" && this.tiene(id)) return "ya-lo-tiene";
    if (this.monedas < c.precio) return "no-alcanza";
    this.monedas -= c.precio;
    if (c.tipo === "comida") this.comida[id] = this.cantidadComida(id) + 1;
    else this.compradas.add(id);
    this.vistas.add(id);
    return "ok";
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
    if (datos.hoy && typeof datos.hoy.dia === "string" && datos.hoy.por && typeof datos.hoy.por === "object") {
      t.hoy = { dia: datos.hoy.dia, por: {} };
      for (const [k, v] of Object.entries(datos.hoy.por)) t.hoy.por[k] = entero(v);
    }
    for (const [d, v] of Object.entries(datos.pasosPagados || {})) if (/^\d{4}-\d\d-\d\d$/.test(d)) t.pasosPagados[d] = entero(v);
    t.rachaPremiada = entero(datos.rachaPremiada);
    t.avisoSemana = Number.isInteger(datos.avisoSemana) ? datos.avisoSemana : -1;
    t.todoDesbloqueado = datos.todoDesbloqueado === true;
    return t;
  }
}
