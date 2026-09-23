/**
 * diario.js
 * ==========
 * El diario automatico: una entrada por dia, escrita sola con datos que
 * la app ya venia guardando (pasos, lugares, encuentros, cuidados). No
 * inventa nada ni pide arte nuevo — reordena lo que ya pasaba.
 *
 * Cada dia queda como una "foto" con su epigrafe: si ese dia se
 * descubrio un lugar, la foto es ese lugar; si se cruzo a alguien, es
 * ese personaje; si no, es la carita de la mascota. Asi el Journal deja
 * de ser una tabla de stats y pasa a ser un album.
 *
 * Esto es tambien la carga emocional del dia de la propuesta: al final
 * no importa la animacion de la boca, importa que ella abra esto y
 * encuentre semanas de cosas que hicieron juntos, anotadas mientras
 * pasaban.
 */

import { LUGARES, NPCS } from "./mundo.js";

const MAX_ENTRADAS = 400; // ~13 meses; corta el crecimiento sin fin en localStorage

/** "2026-09-02" en hora LOCAL (no UTC: el dia es el de ella, no el del meridiano). */
export function claveDelDia(fecha = new Date()) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const DIAS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MESES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function fechaLegible(clave) {
  const [y, m, d] = clave.split("-").map(Number);
  const fecha = new Date(y, m - 1, d);
  return `${DIAS[fecha.getDay()]}, ${MESES[m - 1]} ${d}`;
}

function entradaVacia(clave) {
  return {
    fecha: clave,
    pasos: 0,
    lugares: [],
    npcs: [],
    cuidados: 0,
    juegos: 0,
    atrapadas: 0,
    hitos: [],
    cartas: [],
    fotos: 0,
  };
}

export class Diario {
  constructor(entradas = []) {
    this.entradas = entradas;
  }

  /** La entrada de hoy, creandola si es el primer evento del dia. */
  hoy(fecha = new Date()) {
    const clave = claveDelDia(fecha);
    let entrada = this.entradas.find((e) => e.fecha === clave);
    if (!entrada) {
      entrada = entradaVacia(clave);
      this.entradas.push(entrada);
      if (this.entradas.length > MAX_ENTRADAS) {
        this.entradas = this.entradas.slice(-MAX_ENTRADAS);
      }
    }
    return entrada;
  }

  sumarPasos(cantidad, fecha = new Date()) {
    this.hoy(fecha).pasos += cantidad;
  }

  anotarLugar(idLugar, fecha = new Date()) {
    const e = this.hoy(fecha);
    if (!e.lugares.includes(idLugar)) e.lugares.push(idLugar);
  }

  anotarNpc(idNpc, fecha = new Date()) {
    const e = this.hoy(fecha);
    if (!e.npcs.includes(idNpc)) e.npcs.push(idNpc);
  }

  anotarCuidado(fecha = new Date()) {
    this.hoy(fecha).cuidados += 1;
  }

  anotarJuego(atrapadas, fecha = new Date()) {
    const e = this.hoy(fecha);
    e.juegos += 1;
    e.atrapadas += atrapadas;
  }

  anotarFoto(fecha = new Date()) {
    this.hoy(fecha).fotos += 1;
  }

  anotarHito(texto, fecha = new Date()) {
    const e = this.hoy(fecha);
    if (!e.hitos.includes(texto)) e.hitos.push(texto);
  }

  anotarCarta(idCarta, fecha = new Date()) {
    const e = this.hoy(fecha);
    if (!e.cartas.includes(idCarta)) e.cartas.push(idCarta);
  }

  /** Mas reciente primero — asi se lee el album. */
  entradasRecientes(limite = 60) {
    return [...this.entradas].sort((a, b) => (a.fecha < b.fecha ? 1 : -1)).slice(0, limite);
  }

  aObjeto() {
    return { entradas: this.entradas };
  }

  static desdeObjeto(datos) {
    if (!datos || !Array.isArray(datos.entradas)) return new Diario();
    // Se normaliza cada entrada: un guardado viejo (o a medio migrar)
    // puede no tener todos los campos, y el render no deberia tener que
    // defenderse de eso en cada linea.
    const entradas = datos.entradas.map((e) => ({ ...entradaVacia(e.fecha), ...e }));
    return new Diario(entradas);
  }
}

// ------------------------------------------------------------------
// Redaccion: de datos a una frase que se pueda leer
// ------------------------------------------------------------------

function nombreLugar(id) {
  return LUGARES.find((l) => l.id === id)?.nombre || id;
}

function nombreNpc(id) {
  return NPCS.find((n) => n.id === id)?.nombre || id;
}

function unirEnIngles(lista) {
  if (lista.length === 0) return "";
  if (lista.length === 1) return lista[0];
  return lista.slice(0, -1).join(", ") + " and " + lista[lista.length - 1];
}

/**
 * El epigrafe de la foto del dia. Se arma por partes y se ordena por
 * cuanto importa: primero lo irrepetible (un lugar nuevo), despues a
 * quien vimos, despues lo cotidiano (pasos, juegos, cuidados).
 */
export function resumenDelDia(entrada) {
  const partes = [];

  if (entrada.lugares.length > 0) {
    partes.push(`we found ${unirEnIngles(entrada.lugares.map(nombreLugar))}`);
  }
  if (entrada.npcs.length > 0) {
    partes.push(`we ran into ${unirEnIngles(entrada.npcs.map(nombreNpc))}`);
  }
  if (entrada.pasos > 0) {
    partes.push(`we walked ${entrada.pasos.toLocaleString("en-US")} steps`);
  }
  if (entrada.juegos > 0) {
    partes.push(entrada.juegos === 1 ? "we played a round" : `we played ${entrada.juegos} rounds`);
  }
  if (entrada.fotos > 0) {
    partes.push(entrada.fotos === 1 ? "we took a photo" : `we took ${entrada.fotos} photos`);
  }
  if (partes.length === 0 && entrada.cuidados > 0) {
    partes.push("a quiet day at home");
  }
  if (partes.length === 0) return "Nothing much happened today.";

  const frase = unirEnIngles(partes);
  return frase.charAt(0).toUpperCase() + frase.slice(1) + ".";
}

/**
 * Que imagen representa el dia. Devuelve { tipo, id } y el render decide
 * la ruta — el diario no sabe de rutas de assets.
 *   lugar > npc > la propia carita
 */
export function fotoDelDia(entrada) {
  if (entrada.lugares.length > 0) return { tipo: "lugar", id: entrada.lugares[0] };
  if (entrada.npcs.length > 0) return { tipo: "npc", id: entrada.npcs[0] };
  return { tipo: "cara", id: entrada.pasos > 0 ? "feliz" : "neutral" };
}
