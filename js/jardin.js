/**
 * jardin.js — v45: el jardin del balcon (se sale tocando la ventana).
 *
 *   - 4 macetas. En una vacia se siembra una semilla (las semillas se
 *     compran en la tienda; las dos primeras son de regalo).
 *   - Se riega una vez por dia ("Water" riega todas). Cada dia regado es un
 *     dia de crecer: brote -> creciendo -> lista. Cada planta tarda sus dias.
 *   - Si pasan 2 dias sin agua se pone mustia y no crece; al regarla se
 *     recupera. Nunca se muere. La que ya esta lista espera tranquila.
 *   - Si llueve de verdad donde estan, se riega sola (main.js).
 *   - Lo que se cosecha: comida para la heladera (te, tinto, torta de
 *     osmanto, maracuya) o flores que se venden por monedas.
 *
 * Sin DOM. Las fechas son claves de dia local ("2026-11-08", diario.js).
 */

export const MACETAS = 4;
export const DIAS_PARA_MUSTIA = 2;

/**
 * Las plantas. dias: dias regados hasta que esta lista.
 * cosecha: { comida, n } -> a la heladera (ids de la tienda), o { monedas }.
 */
export const PLANTAS = {
  girasol: { nombre: "Sunflower", dias: 3, cosecha: { monedas: 25 } },
  longjing: { nombre: "Longjing tea", dias: 3, cosecha: { comida: "longjing", n: 2 } },
  bambu: { nombre: "Bamboo", dias: 3, cosecha: { monedas: 35 } },
  loto: { nombre: "Lotus", dias: 4, cosecha: { monedas: 45 } },
  osmanto: { nombre: "Osmanthus", dias: 4, cosecha: { comida: "osmanto", n: 2 } },
  cafe: { nombre: "Coffee", dias: 5, cosecha: { comida: "tinto", n: 3 } },
  maracuya: { nombre: "Passion fruit", dias: 5, cosecha: { comida: "maracuya", n: 2 } },
  orquidea: { nombre: "Orchid", dias: 5, cosecha: { monedas: 60 } },
};
export const SEMILLAS_DE_REGALO = ["girasol", "longjing"];

/** Dias entre dos claves "AAAA-MM-DD" (b - a). */
export function diasEntre(a, b) {
  const f = (k) => {
    const [y, m, d] = k.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((f(b) - f(a)) / 86400000);
}

const claveValida = (k) => typeof k === "string" && /^\d{4}-\d{2}-\d{2}$/.test(k);

export class Jardin {
  constructor() {
    this.macetas = Array(MACETAS).fill(null); // { planta, sembrada, riegos, ultimoRiego }
    this.regalo = false; // ya le dio las semillas de regalo
    this.cosechas = 0;
    this.lluviaAvisada = null; // el dia que Baozi conto que la lluvia rego (una vez por dia)
  }

  /** Lo que se ve de una maceta un dia: null (vacia) o { planta, etapa 0..3, mustia, regadaHoy, lista, dia, dias }. */
  estado(i, hoy) {
    const m = this.macetas[i];
    if (!m) return null;
    const p = PLANTAS[m.planta];
    const lista = m.riegos >= p.dias;
    const etapa = lista ? 3 : m.riegos === 0 ? 0 : m.riegos >= Math.ceil(p.dias / 2) ? 2 : 1;
    const desde = m.ultimoRiego || m.sembrada;
    const mustia = !lista && diasEntre(desde, hoy) >= DIAS_PARA_MUSTIA;
    return { planta: m.planta, nombre: p.nombre, etapa, mustia, regadaHoy: m.ultimoRiego === hoy, lista, dia: m.riegos, dias: p.dias };
  }

  estados(hoy) {
    return this.macetas.map((_, i) => this.estado(i, hoy));
  }

  hayPlantas() {
    return this.macetas.some(Boolean);
  }

  /** ¿Hay alguna que hoy todavia quiere agua? (las listas no) */
  quiereAgua(hoy) {
    return this.estados(hoy).some((e) => e && !e.lista && !e.regadaHoy);
  }

  hayCosecha(hoy) {
    return this.estados(hoy).some((e) => e && e.lista);
  }

  /** Siembra en una maceta vacia. true si se pudo. */
  sembrar(i, planta, hoy) {
    if (!PLANTAS[planta] || i < 0 || i >= MACETAS || this.macetas[i]) return false;
    this.macetas[i] = { planta, sembrada: hoy, riegos: 0, ultimoRiego: null };
    return true;
  }

  /** Riega todas las que hoy no se regaron y no estan listas. Devuelve cuantas. */
  regar(hoy) {
    let n = 0;
    for (const m of this.macetas) {
      if (!m || m.ultimoRiego === hoy || m.riegos >= PLANTAS[m.planta].dias) continue;
      m.ultimoRiego = hoy;
      m.riegos += 1;
      n += 1;
    }
    return n;
  }

  /** Cosecha una lista: devuelve { planta, nombre, cosecha } y deja la maceta vacia (o null). */
  cosechar(i, hoy) {
    const e = this.estado(i, hoy);
    if (!e || !e.lista) return null;
    this.macetas[i] = null;
    this.cosechas += 1;
    return { planta: e.planta, nombre: e.nombre, cosecha: PLANTAS[e.planta].cosecha, primera: this.cosechas === 1 };
  }

  aObjeto() {
    return { macetas: this.macetas.map((m) => (m ? { ...m } : null)), regalo: this.regalo, cosechas: this.cosechas, lluviaAvisada: this.lluviaAvisada };
  }

  static desdeObjeto(datos) {
    const j = new Jardin();
    if (!datos || typeof datos !== "object") return j;
    const lista = Array.isArray(datos.macetas) ? datos.macetas : [];
    for (let i = 0; i < MACETAS; i++) {
      const m = lista[i];
      if (!m || !PLANTAS[m.planta] || !claveValida(m.sembrada)) continue;
      const riegos = Number.isFinite(m.riegos) ? Math.max(0, Math.min(PLANTAS[m.planta].dias, Math.floor(m.riegos))) : 0;
      j.macetas[i] = { planta: m.planta, sembrada: m.sembrada, riegos, ultimoRiego: claveValida(m.ultimoRiego) ? m.ultimoRiego : null };
    }
    j.regalo = datos.regalo === true;
    j.cosechas = Number.isFinite(datos.cosechas) ? Math.max(0, Math.floor(datos.cosechas)) : 0;
    j.lluviaAvisada = claveValida(datos.lluviaAvisada) ? datos.lluviaAvisada : null;
    return j;
  }
}
