/**
 * mundo.js
 * =========
 * Port de mundo.py (NPCs y lugares), con dos correcciones sobre el
 * archivo del firmware que hay que tener presentes:
 *
 * 1. NPCs: el set vigente son estos 4 (Usagi, Mimi, Ruchong, Chagee),
 *    confirmado por el usuario el 1 sep 2026 — mundo.py en el proyecto
 *    del firmware todavia tiene los 8 viejos (mora/tino/bibi/sol/pepa/
 *    django/coco/nube), quedo desactualizado. El DIALOGO de estos 4 es
 *    TODO: se reusa temporalmente el texto de 4 de los NPCs viejos como
 *    placeholder (marcado abajo), hasta que haya lineas reales.
 *
 * 2. Encuentros: main.py (el del ESP32) llama hoy a
 *    tal_vez_encontrar_alguien(pasos_nuevos, ahora) — pero el
 *    mundo.py del proyecto todavia tiene la firma vieja sin argumentos,
 *    que tiraba el dado en CADA vuelta del bucle (~10ms) y producia el
 *    bug de "un encuentro cada 1.4s caminando" que describe
 *    REVISION_GENERAL.md (Hallazgo 2). Esta version porta la intencion
 *    ya arreglada: el dado se tira una vez cada PASOS_POR_TIRADA pasos
 *    acumulados, con un enfriamiento minimo entre encuentros.
 *
 * Lugares: GPS real (navigator.geolocation) — ver sensores.js para el
 * lado del navegador. Las coordenadas y radios son las MISMAS que ya
 * estaban cargadas en el mundo.py del firmware (lat/lon reales de
 * Hangzhou), asi que caminar hasta ahi de verdad los descubre. El
 * "Where to?" manual se mantiene como respaldo (GPS no disponible o
 * permiso denegado) — ver lugarEnRango()/pendientes() mas abajo. El
 * sitio de la propuesta ("elsitio") NO esta en esta lista: en
 * mundo.py tiene lat/lon en 0.0 (sin cargar a proposito) y ademas es
 * contenido de la fase 6, secreto — no se agrega aca.
 */

import { LUGARES_PROPIOS } from "./config.js";

export const NPCS = [
  {
    id: "usagi",
    nombre: "Usagi",
    // TODO: dialogo real de Usagi. Placeholder temporal (texto viejo de "Mora").
    linea: "What a nice day to explore. Want to walk together for a bit?",
    lineaReencuentro: "Back here again? This place still has surprises.",
    lineaEnamorado: "With you, even getting lost feels like finding something.",
  },
  {
    id: "mimi",
    nombre: "Mimi",
    // TODO: dialogo real de Mimi. Placeholder temporal (texto viejo de "Tino").
    linea: "I'm looking for the perfect angle. Help me find it?",
    lineaReencuentro: "I was just thinking about you. The light's great today.",
    lineaEnamorado: "I've taken like a hundred photos of you without you noticing.",
  },
  {
    id: "ruchong",
    nombre: "Ruchong",
    // TODO: dialogo real de Ruchong. Placeholder temporal (texto viejo de "Bibi").
    linea: "Look what I'm painting. Do you like it?",
    lineaReencuentro: "You're back. I left you a little spot in the painting, really.",
    lineaEnamorado: "Without noticing, I always end up using your same colors.",
  },
  {
    id: "chagee",
    nombre: "Chagee",
    // TODO: dialogo real de Chagee. Placeholder temporal (texto viejo de "Sol").
    linea: "Heading the same way? Ride with me for a bit.",
    lineaReencuentro: "This route again? Guess you like it as much as I do.",
    lineaEnamorado: "With you, even the long way feels short.",
  },
];

export const VECES_PARA_ENAMORADO = 5; // encuentros con el mismo NPC para desbloquear "In Love"
export const PASOS_POR_TIRADA = 80; // se tira el dado cada 80 pasos acumulados, no por paso
export const PROBABILIDAD_ENCUENTRO = 0.35;
export const COOLDOWN_ENCUENTRO_MINUTOS = 20; // enfriamiento minimo entre encuentros

export class RegistroNPCs {
  constructor() {
    this.vecesEncontrado = Object.fromEntries(NPCS.map((n) => [n.id, 0]));
    this._pasosAcumulados = 0;
    this._ultimoEncuentroMs = 0;
  }

  /** Llamar cada vez que la mascota registra pasos nuevos. Devuelve un NPC o null. */
  talVezEncontrarAlguien(pasosNuevos, ahoraMs = null) {
    const ahora = ahoraMs ?? Date.now();
    if (pasosNuevos <= 0) return null;

    this._pasosAcumulados += pasosNuevos;
    if (this._pasosAcumulados < PASOS_POR_TIRADA) return null;
    this._pasosAcumulados -= PASOS_POR_TIRADA;

    const minutosDesdeUltimo = (ahora - this._ultimoEncuentroMs) / 60000.0;
    if (minutosDesdeUltimo < COOLDOWN_ENCUENTRO_MINUTOS) return null;

    if (Math.random() > PROBABILIDAD_ENCUENTRO) return null;

    this._ultimoEncuentroMs = ahora;
    return NPCS[Math.floor(Math.random() * NPCS.length)];
  }

  /**
   * Visitas: un amigo golpea la ventana del cuarto. Se consulta cada vez
   * que ella vuelve al cuarto (con un minimo de minutos entre consultas,
   * que controla main.js). Devuelve un NPC o null.
   */
  talVezVisitar(ahoraMs = null, probabilidad = PROBABILIDAD_ENCUENTRO) {
    const ahora = ahoraMs ?? Date.now();
    const minutosDesdeUltimo = (ahora - this._ultimoEncuentroMs) / 60000.0;
    if (minutosDesdeUltimo < COOLDOWN_ENCUENTRO_MINUTOS) return null;
    if (Math.random() > probabilidad) return null;
    this._ultimoEncuentroMs = ahora;
    return NPCS[Math.floor(Math.random() * NPCS.length)];
  }

  /**
   * eleccion: "saludar" o "seguir". Devuelve true si este encuentro
   * desbloqueo la especial "In Love".
   */
  procesarEncuentro(petState, npc, eleccion, ahoraMs = null) {
    if (eleccion !== "saludar") return false;

    this.vecesEncontrado[npc.id] += 1;
    petState.stats.felicidad = Math.min(100, petState.stats.felicidad + 12);
    petState.stats.vinculo = Math.min(100, petState.stats.vinculo + 3);
    petState.registrarEventoRasgo("sociable", 1.0, ahoraMs);

    return this.vecesEncontrado[npc.id] === VECES_PARA_ENAMORADO;
  }

  /** Cual de las tres lineas de dialogo corresponde, segun cuantas veces ya se saludo. */
  lineaPara(npc) {
    const veces = this.vecesEncontrado[npc.id] ?? 0;
    if (veces >= VECES_PARA_ENAMORADO) return npc.lineaEnamorado || npc.linea;
    if (veces >= 2) return npc.lineaReencuentro || npc.linea;
    return npc.linea;
  }

  aObjeto() {
    return {
      vecesEncontrado: this.vecesEncontrado,
      pasosAcumulados: this._pasosAcumulados,
      ultimoEncuentroMs: this._ultimoEncuentroMs,
    };
  }

  static desdeObjeto(datos) {
    const obj = new RegistroNPCs();
    obj.vecesEncontrado = { ...obj.vecesEncontrado, ...(datos.vecesEncontrado || {}) };
    obj._pasosAcumulados = datos.pasosAcumulados || 0;
    obj._ultimoEncuentroMs = datos.ultimoEncuentroMs || 0;
    return obj;
  }
}

// -----------------------------------------------------------------
// Lugares — lat/lon/radioMetros reales (mismos valores que mundo.py).
// El sitio de la propuesta se agrega aparte en la fase 6.
// -----------------------------------------------------------------

// sello: el dibujo del sello de tinta (assets/pieza/sello_<sello>.png)
// frase: lo que dice Baozi cuando se da cuenta de donde esta
// color: el del pin en el mapa de corcho
const LUGARES_BASE = [
  {
    id: "westlake",
    nombre: "West Lake",
    rasgo: "explorador",
    lat: 30.259,
    lon: 120.149,
    radioMetros: 150,
    efectos: { felicidad: 15, energia: 10 },
    sello: "pabellon",
    color: "rgb(70,100,160)",
    frase: "Water everywhere!! Is this the famous lake?",
    dialogo:
      "The pavilion sits right over the water. You could watch the lake for hours here.",
  },
  {
    id: "longjing",
    nombre: "Longjing Village",
    rasgo: "gourmet",
    lat: 30.228,
    lon: 120.13,
    radioMetros: 150,
    efectos: { felicidad: 15, hambre: 12 },
    sello: "hoja",
    color: "rgb(72,128,82)",
    frase: "Sniff sniff… it smells like tea here!",
    dialogo: "Tea fields as far as you can see. The whole village smells like fresh Longjing tea.",
  },
  {
    id: "lingyin",
    nombre: "Lingyin Temple",
    rasgo: "sociable",
    lat: 30.2405,
    lon: 120.1,
    radioMetros: 150,
    efectos: { felicidad: 15, vinculo: 10 },
    sello: "templo",
    color: "rgb(196,58,66)",
    frase: "Shhh… this place feels very old. And very calm.",
    dialogo: "A huge laughing Buddha carved right into the cliff, monks still visit the cave.",
  },
  {
    id: "leifeng",
    nombre: "Leifeng Pagoda",
    rasgo: "explorador",
    lat: 30.231,
    lon: 120.1487,
    radioMetros: 150,
    efectos: { felicidad: 15, energia: 8 },
    sello: "pagoda",
    color: "rgb(214,120,60)",
    frase: "Look how tall it is! I can see the whole lake from here.",
    dialogo: "The old pagoda on the south shore. At sunset it glows like a lantern.",
  },
];

// Los lugares de ustedes dos (config.js -> LUGARES_PROPIOS) se suman aca.
export const LUGARES = [
  ...LUGARES_BASE,
  ...(LUGARES_PROPIOS || [])
    .filter((l) => l && l.id && Number.isFinite(l.lat) && Number.isFinite(l.lon))
    .map((l) => ({
      rasgo: "sociable",
      radioMetros: 120,
      efectos: { felicidad: 20, vinculo: 10 },
      sello: "corazon",
      color: "rgb(206,86,128)",
      frase: "Wait… I know this place. It feels special.",
      dialogo: "",
      propio: true,
      ...l,
    })),
];

// Si el GPS marca "cerca" y el usuario dice "Not now", no se vuelve a
// ofrecer el mismo lugar antes de este tiempo — evita el nag de
// preguntar de nuevo en cada lectura de posicion mientras sigue
// parado ahi. Mismo valor que COOLDOWN_OFERTA_MINUTOS en mundo.py.
export const COOLDOWN_OFERTA_MS = 45 * 60 * 1000;

/** Formula de Haversine: distancia entre dos puntos GPS, en metros. Igual que mundo.py. */
export function distanciaMetros(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const f1 = (lat1 * Math.PI) / 180;
  const f2 = (lat2 * Math.PI) / 180;
  const df = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export class RegistroLugares {
  constructor() {
    this.desbloqueados = new Set();
    this.ultimaOfertaMs = {}; // idLugar -> timestamp del ultimo "Not now"
    this.fechas = {}; // idLugar -> cuando se sello
  }

  pendientes() {
    return LUGARES.filter((l) => !this.desbloqueados.has(l.id));
  }

  /**
   * Llamar con cada lectura nueva de GPS. Devuelve el primer lugar
   * pendiente dentro de su radio (o null) — ignora los que se
   * rechazaron hace poco (ver marcarOfrecido()).
   */
  lugarEnRango(lat, lon, ahoraMs = null) {
    const ahora = ahoraMs ?? Date.now();
    for (const lugar of this.pendientes()) {
      const msDesdeOferta = ahora - (this.ultimaOfertaMs[lugar.id] || 0);
      if (msDesdeOferta < COOLDOWN_OFERTA_MS) continue;
      const d = distanciaMetros(lat, lon, lugar.lat, lugar.lon);
      if (d <= lugar.radioMetros) return lugar;
    }
    return null;
  }

  /** El usuario dijo "Not now" a un lugar que el GPS detecto cerca. */
  marcarOfrecido(idLugar, ahoraMs = null) {
    this.ultimaOfertaMs[idLugar] = ahoraMs ?? Date.now();
  }

  /** El usuario eligio explorar este lugar (desde el GPS o desde "Where to?" manual). */
  descubrir(petState, idLugar, ahoraMs = null) {
    const lugar = LUGARES.find((l) => l.id === idLugar);
    if (!lugar) return null;
    this.desbloqueados.add(lugar.id);
    this.fechas[lugar.id] = ahoraMs ?? Date.now();
    petState.visitarLugar(lugar.rasgo, lugar.efectos, ahoraMs);
    return lugar;
  }

  aObjeto() {
    return {
      desbloqueados: Array.from(this.desbloqueados),
      ultimaOfertaMs: this.ultimaOfertaMs,
      fechas: this.fechas,
    };
  }

  static desdeObjeto(datos) {
    const obj = new RegistroLugares();
    obj.desbloqueados = new Set(datos.desbloqueados || []);
    obj.ultimaOfertaMs = datos.ultimaOfertaMs || {};
    obj.fechas = datos.fechas || {};
    return obj;
  }
}
