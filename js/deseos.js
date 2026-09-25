/**
 * deseos.js
 * ==========
 * v24: el deseo del dia. Cada dia Baozi quiere algo chiquito y distinto;
 * casi todos se cumplen solos (la app se da cuenta cuando ella lo hace) y
 * algunos son de la vida real, con un boton "Done ♥" (a confianza).
 *
 *   estado: "nuevo" (la nubecita sobre su cabeza) -> "escuchado" (ella ya
 *   lo leyo) -> "cumplido" (10 monedas y "My wish came true!").
 *
 * Si un dia no se cumple, no pasa nada. Nunca pide algo imposible: cada
 * deseo tiene su condicion (tener ropa, ser fin de semana...).
 * Sin imports: main.js le pasa el contexto.
 */

const esSrc = (item, ...nombres) => typeof item === "string" && nombres.some((n) => item.endsWith(n));
const DULCES = ["comida_manzana.png", "comida_naranja.png", "comida_osmanto.png", "comida_luna.png"];
const hora = (ev) => (Number.isFinite(ev.hora) ? ev.hora : new Date().getHours());

/**
 * El catalogo. cumple(ev, prog) -> true | numero (progreso nuevo) | false.
 * puede(ctx): si hoy se puede pedir. real: de la vida real (boton Done).
 */
export const DESEOS = [
  // comida y cuidado
  { id: "te", texto: "I really want milk tea today!", cumple: (ev) => ev.tipo === "comer" && esSrc(ev.item, "bebida_te.png") },
  { id: "dulce", texto: "Something sweet, please? Fruit or a treat!", cumple: (ev) => ev.tipo === "comer" && esSrc(ev.item, ...DULCES) },
  { id: "dumplings", texto: "Dumplings for dinner? (after 6 pm)", cumple: (ev) => ev.tipo === "comer" && esSrc(ev.item, "comida_dumpling.png") && hora(ev) >= 18 },
  { id: "bano", texto: "Bubble bath time!", cumple: (ev) => ev.tipo === "cuidar" && ev.accion === "clean" },
  { id: "mimos", texto: "Pet me five times ♥", meta: 5, cumple: (ev, p) => (ev.tipo === "mimo" ? p + 1 : false) },
  // juegos
  { id: "snack15", texto: "Let's play Snack Rain! Catch 15 snacks in one game.", cumple: (ev) => ev.tipo === "juego" && (ev.atrapadas || 0) >= 15 },
  { id: "snack40", texto: "Can you get 40 points in Snack Rain?", cumple: (ev) => ev.tipo === "juego" && (ev.puntos || 0) >= 40 },
  { id: "pesca3", texto: "Let's go fishing! Catch 3 fish today.", meta: 3, cumple: (ev, p) => (ev.tipo === "pesca" ? p + (ev.peces || []).filter((x) => x !== "sandalia" && x !== "hoja").length : false) },
  { id: "koi", texto: "I want to see a koi! Can you catch one?", cumple: (ev) => ev.tipo === "pesca" && (ev.peces || []).some((x) => x === "koi" || x === "koi_dorado") },
  // fotos
  { id: "foto_manana", texto: "A photo of us before 11 am!", cumple: (ev) => ev.tipo === "foto" && hora(ev) >= 5 && hora(ev) < 11, puede: (c) => c.hora < 11 },
  { id: "foto_color", texto: "A photo with the COLOR filter, please.", cumple: (ev) => ev.tipo === "foto" && ev.filtro === "color" },
  { id: "foto_stickers", texto: "A photo with two stickers on it!", cumple: (ev) => ev.tipo === "foto" && (ev.stickers || []).length >= 2 },
  { id: "foto_corazon", texto: "A photo with a heart sticker ♥", cumple: (ev) => ev.tipo === "foto" && (ev.stickers || []).some((s) => /corazon/.test(s)) },
  { id: "foto_noche", texto: "A photo at night, after 8 pm.", cumple: (ev) => ev.tipo === "foto" && (hora(ev) >= 20 || hora(ev) < 4) },
  // el cuarto
  { id: "radio", texto: "Can we listen to Rainy Day on the radio?", cumple: (ev) => ev.tipo === "radio" && ev.estacion === "radio_lluvia" },
  { id: "ropa", texto: "Wear something cute today!", cumple: (ev) => ev.tipo === "estado" && !!ev.puesto, puede: (c) => c.tieneRopa },
  { id: "diario", texto: "Write in our diary before 10 pm.", cumple: (ev) => ev.tipo === "diario" && hora(ev) >= 4 && hora(ev) < 22, puede: (c) => c.hora < 21 },
  // afuera
  { id: "pasos", texto: "Let's walk 5,000 steps today! Tell me tonight.", cumple: (ev) => ev.tipo === "pasos" && ev.hoy && (ev.pasos || 0) >= 5000 },
  { id: "lugar", texto: "Can we go somewhere new this weekend?", cumple: (ev) => ev.tipo === "sello", puede: (c) => c.finDeSemana && c.quedanLugares },
  // la vida real (boton "Done ♥")
  { id: "agua", texto: "Drink a big glass of water, right now!", real: true },
  { id: "cielo", texto: "Look at the sky for one whole minute.", real: true },
  { id: "amor", texto: "Tell someone you love them today.", real: true },
  { id: "selfie", texto: "Send someone you love a selfie.", real: true },
];

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class Deseos {
  constructor() {
    this.dia = null; // "AAAA-MM-DD" del deseo de hoy
    this.id = null;
    this.estado = null; // "nuevo" | "escuchado" | "cumplido"
    this.progreso = 0;
    this.historial = []; // los ids de los ultimos dias (para no repetir)
    this.cumplidos = 0;
    this.propios = []; // los deseos de rom (config DESEOS_PROPIOS), como textos
    this.celebrar = false; // se cumplio y falta festejarlo en el cuarto
  }

  /** Los deseos posibles (los de la app + los de rom, de la vida real). */
  catalogo() {
    const deRom = (this.propios || [])
      .filter((t) => typeof t === "string" && t.trim())
      .map((t, i) => ({ id: `rom_${i}`, texto: t.trim(), real: true, deRom: true }));
    return [...DESEOS, ...deRom];
  }

  actual() {
    return this.catalogo().find((d) => d.id === this.id) || null;
  }

  /**
   * Elige el deseo del dia si todavia no hay (o si cambio el dia).
   * ctx: { hora, finDeSemana, tieneRopa, quedanLugares }. Devuelve true si eligio uno nuevo.
   */
  elegir(clave, ctx = {}) {
    if (this.dia === clave && this.actual()) return false;
    const recientes = new Set(this.historial.slice(-6));
    const posibles = this.catalogo().filter((d) => !recientes.has(d.id) && (!d.puede || d.puede(ctx)));
    if (!posibles.length) return false;
    // los de rom pesan mas; los de la vida real de la app, un poco menos
    const peso = (d) => (d.deRom ? 3 : d.real ? 0.6 : 1);
    const total = posibles.reduce((s, d) => s + peso(d), 0);
    let r = (hash(clave) % 10000) / 10000 * total;
    let elegido = posibles[posibles.length - 1];
    for (const d of posibles) {
      r -= peso(d);
      if (r < 0) {
        elegido = d;
        break;
      }
    }
    this.dia = clave;
    this.id = elegido.id;
    this.estado = "nuevo";
    this.progreso = 0;
    this.celebrar = false;
    this.historial = [...this.historial.filter((x) => x !== elegido.id), elegido.id].slice(-10);
    return true;
  }

  pendiente() {
    return !!this.actual() && this.estado !== "cumplido";
  }

  escuchar() {
    if (this.estado === "nuevo") this.estado = "escuchado";
  }

  /** Un evento del juego. Devuelve true si con esto se cumplio el deseo. */
  evento(ev) {
    const d = this.actual();
    if (!d || d.real || this.estado === "cumplido" || !d.cumple) return false;
    const r = d.cumple(ev, this.progreso);
    if (r === true) return this._cumplir();
    if (typeof r === "number" && r !== this.progreso) {
      this.progreso = r;
      if (d.meta && r >= d.meta) return this._cumplir();
    }
    return false;
  }

  /** El boton "Done ♥" de los deseos de la vida real. */
  hecho() {
    const d = this.actual();
    if (!d || !d.real || this.estado === "cumplido") return false;
    return this._cumplir();
  }

  _cumplir() {
    this.estado = "cumplido";
    this.cumplidos += 1;
    this.celebrar = true;
    return true;
  }

  aObjeto() {
    return { dia: this.dia, id: this.id, estado: this.estado, progreso: this.progreso, historial: this.historial, cumplidos: this.cumplidos, celebrar: this.celebrar };
  }

  static desdeObjeto(datos, propios = []) {
    const d = new Deseos();
    d.propios = propios;
    if (!datos || typeof datos !== "object") return d;
    if (typeof datos.dia === "string" && /^\d{4}-\d\d-\d\d$/.test(datos.dia)) d.dia = datos.dia;
    d.id = typeof datos.id === "string" ? datos.id : null;
    d.estado = ["nuevo", "escuchado", "cumplido"].includes(datos.estado) ? datos.estado : null;
    d.progreso = Number.isFinite(datos.progreso) ? Math.max(0, Math.floor(datos.progreso)) : 0;
    d.historial = Array.isArray(datos.historial) ? datos.historial.filter((x) => typeof x === "string").slice(-10) : [];
    d.cumplidos = Number.isFinite(datos.cumplidos) ? Math.max(0, Math.floor(datos.cumplidos)) : 0;
    d.celebrar = datos.celebrar === true;
    if (!d.actual()) {
      d.id = null;
      d.estado = null;
    }
    return d;
  }
}

