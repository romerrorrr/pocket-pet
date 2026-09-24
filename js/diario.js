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
    // v19: lo que ella escribe al final del dia
    animo: null, // "genial" | "bien" | "normal" | "cansada" | "triste"
    texto: "",
    pregunta: "",
    escritoEn: 0,
  };
}

// Los animos del dia, con la cara que pone el personaje para cada uno.
export const ANIMOS = [
  { id: "genial", nombre: "Amazing", ojo: "ojo_especial_euforico.png", boca: "boca_especial_euforico.png" },
  { id: "bien", nombre: "Good", ojo: "ojo_base_energia_alta.png", boca: "boca_base_feliz.png" },
  { id: "normal", nombre: "Okay", ojo: "ojo_base_energia_neutral.png", boca: "boca_base_neutral.png" },
  { id: "cansada", nombre: "Tired", ojo: "ojo_base_energia_baja.png", boca: "boca_base_neutral.png" },
  { id: "triste", nombre: "Sad", ojo: "ojo_especial_decepcionado.png", boca: "boca_especial_decepcionado.png" },
];

// Una pregunta por dia (la misma todo el dia, cambia a la medianoche).
export const PREGUNTAS = [
  "What made you smile today?",
  "What did you eat that was really good?",
  "Who did you talk to today?",
  "What's one small thing you're proud of?",
  "What was the best moment of the day?",
  "What would you do again tomorrow?",
  "Anything funny happen?",
  "What did you learn today?",
  "Where would you go right now if you could?",
  "What song was stuck in your head?",
  "What are you looking forward to?",
  "What was hard today?",
  "What do you want to remember from today?",
  "Did you see anything beautiful?",
  "What made you laugh?",
  "What's something kind someone did?",
  "What would make tomorrow great?",
  "How did you take care of yourself today?",
  "What's on your mind right now?",
  "If today had a color, what would it be?",
  "What did you do that felt like 'you'?",
  "Any little adventure today?",
  "What surprised you today?",
  "What are you grateful for tonight?",
  "What did the sky look like today?",
  "Best thing you drank today?",
  "What's one thing you'd tell tomorrow-you?",
  "Who do you miss today?",
];

export function preguntaDelDia(clave = claveDelDia()) {
  let h = 0;
  for (const c of clave) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PREGUNTAS[h % PREGUNTAS.length];
}

function sumarDias(clave, n) {
  const [y, m, d] = clave.split("-").map(Number);
  return claveDelDia(new Date(y, m - 1, d + n));
}

const escrita = (e) => !!e && (!!e.animo || !!(e.texto && e.texto.trim()));

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

  /** Ella escribe (o reescribe) la pagina de hoy. */
  escribirHoy({ animo = null, texto = "", pregunta = "" } = {}, fecha = new Date()) {
    const e = this.hoy(fecha);
    e.animo = animo;
    e.texto = String(texto || "").slice(0, 400);
    e.pregunta = pregunta;
    e.escritoEn = fecha.getTime();
    return e;
  }

  entrada(clave) {
    return this.entradas.find((e) => e.fecha === clave) || null;
  }

  hoyEscrito(fecha = new Date()) {
    return escrita(this.entrada(claveDelDia(fecha)));
  }

  /** Dias seguidos escribiendo (cuenta hasta hoy, o hasta ayer si hoy todavia no). */
  racha(fecha = new Date()) {
    let clave = claveDelDia(fecha);
    if (!escrita(this.entrada(clave))) clave = sumarDias(clave, -1);
    let n = 0;
    while (escrita(this.entrada(clave))) {
      n += 1;
      clave = sumarDias(clave, -1);
    }
    return n;
  }

  /** Los ultimos 7 dias (mas viejo primero), con su animo si lo hay. */
  semana(fecha = new Date()) {
    const hoy = claveDelDia(fecha);
    return Array.from({ length: 7 }, (_, i) => {
      const clave = sumarDias(hoy, i - 6);
      const e = this.entrada(clave);
      return { clave, animo: e ? e.animo : null, escrita: escrita(e) };
    });
  }

  /** Una pagina escrita de hace un mes o hace un año (la de hace un año gana). */
  recuerdo(fecha = new Date()) {
    const anio = new Date(fecha.getFullYear() - 1, fecha.getMonth(), fecha.getDate());
    const mes = new Date(fecha.getFullYear(), fecha.getMonth() - 1, fecha.getDate());
    for (const [cuando, f] of [["One year ago today", anio], ["One month ago today", mes]]) {
      const e = this.entrada(claveDelDia(f));
      if (escrita(e)) return { cuando, entrada: e };
    }
    return null;
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
