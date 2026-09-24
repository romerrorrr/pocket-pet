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
// Lugares — lat/lon en WGS84 (el sistema del GPS del telefono; los mapas
// chinos usan GCJ-02, corrido ~500 m). v19: 34 lugares de Hangzhou; los
// verificados (Wikipedia) tienen radio 260 m, los estimados 380 m. Por las
// dudas, lugarEnRango() acepta la posicion en cualquiera de los dos sistemas.
// -----------------------------------------------------------------

// sello: el dibujo del sello de tinta (assets/pieza/sello_<sello>.png)
// frase: lo que dice Baozi cuando se da cuenta de donde esta
// color: el del pin en el mapa de corcho
const LUGARES_BASE = [
  {
    id: "westlake",
    nombre: "West Lake",
    categoria: "lake",
    rasgo: "explorador",
    lat: 30.2565,
    lon: 120.1444,
    radioMetros: 260,
    efectos: {felicidad: 15, energia: 10},
    sello: "pabellon",
    color: "rgb(70,100,160)",
    frase: "Water everywhere!! Is this the famous lake?",
    dialogo: "The pavilion sits right over the water. You could watch the lake for hours here.",
  },
  {
    id: "longjing",
    nombre: "Longjing Village",
    categoria: "tea",
    rasgo: "gourmet",
    lat: 30.22218,
    lon: 120.09803,
    radioMetros: 260,
    efectos: {felicidad: 15, hambre: 12},
    sello: "hoja",
    color: "rgb(72,128,82)",
    frase: "Sniff sniff… it smells like tea here!",
    dialogo: "Tea fields as far as you can see. The whole village smells like fresh Longjing tea.",
  },
  {
    id: "lingyin",
    nombre: "Lingyin Temple",
    categoria: "temple",
    rasgo: "sociable",
    lat: 30.24278,
    lon: 120.09667,
    radioMetros: 260,
    efectos: {felicidad: 15, vinculo: 10},
    sello: "templo",
    color: "rgb(196,58,66)",
    frase: "Shhh… this place feels very old. And very calm.",
    dialogo: "A huge laughing Buddha carved right into the cliff, monks still visit the cave.",
  },
  {
    id: "leifeng",
    nombre: "Leifeng Pagoda",
    categoria: "lake",
    rasgo: "explorador",
    lat: 30.23389,
    lon: 120.145,
    radioMetros: 260,
    efectos: {felicidad: 15, energia: 8},
    sello: "pagoda",
    color: "rgb(214,120,60)",
    frase: "Look how tall it is! I can see the whole lake from here.",
    dialogo: "The old pagoda on the south shore. At sunset it glows like a lantern.",
  },
  {
    id: "baidi",
    nombre: "Bai Causeway",
    categoria: "lake",
    rasgo: "explorador",
    lat: 30.2551,
    lon: 120.1403,
    radioMetros: 380,
    efectos: {felicidad: 12, energia: 6},
    sello: "pabellon",
    color: "rgb(96,140,190)",
    frase: "A path right through the water!",
    dialogo: "Willows on one side, lotus on the other. Walk slow here.",
  },
  {
    id: "sudi",
    nombre: "Su Causeway",
    categoria: "lake",
    rasgo: "explorador",
    lat: 30.24,
    lon: 120.127,
    radioMetros: 380,
    efectos: {felicidad: 12, energia: 10},
    sello: "hoja",
    color: "rgb(110,170,120)",
    frase: "So many bridges… let's count them!",
    dialogo: "Six little bridges and a long line of trees. Spring mornings here are famous.",
  },
  {
    id: "santan",
    nombre: "Three Pools Mirroring the Moon",
    categoria: "lake",
    rasgo: "explorador",
    lat: 30.23944,
    lon: 120.13972,
    radioMetros: 260,
    efectos: {felicidad: 14, vinculo: 6},
    sello: "estrella",
    color: "rgb(120,120,200)",
    frase: "Are those little towers standing in the water?",
    dialogo: "On the Mid-Autumn night they light candles inside the stone towers. Five moons at once.",
  },
  {
    id: "huxinting",
    nombre: "Mid-Lake Pavilion",
    categoria: "lake",
    rasgo: "explorador",
    lat: 30.2495,
    lon: 120.143,
    radioMetros: 380,
    efectos: {felicidad: 12},
    sello: "pabellon",
    color: "rgb(90,120,170)",
    frase: "We're in the middle of the lake!!",
    dialogo: "A tiny island with a tiny pavilion. The whole lake around you.",
  },
  {
    id: "gushan",
    nombre: "Solitary Hill",
    categoria: "museum",
    rasgo: "sociable",
    lat: 30.25306,
    lon: 120.13528,
    radioMetros: 260,
    efectos: {felicidad: 12, vinculo: 6},
    sello: "estrella",
    color: "rgb(150,110,170)",
    frase: "A little hill with secret gardens!",
    dialogo: "The seal carvers' society lives up here. Stone stamps, old trees, quiet paths.",
  },
  {
    id: "yuefei",
    nombre: "Yue Fei Temple",
    categoria: "temple",
    rasgo: "sociable",
    lat: 30.2586,
    lon: 120.1296,
    radioMetros: 380,
    efectos: {felicidad: 10, vinculo: 8},
    sello: "templo",
    color: "rgb(170,60,60)",
    frase: "Someone very brave is remembered here.",
    dialogo: "A general everyone in China knows. People bow here, very seriously.",
  },
  {
    id: "baochu",
    nombre: "Baochu Pagoda",
    categoria: "lake",
    rasgo: "explorador",
    lat: 30.2578,
    lon: 120.1441,
    radioMetros: 380,
    efectos: {felicidad: 12, energia: 8},
    sello: "pagoda",
    color: "rgb(200,140,90)",
    frase: "A skinny pagoda on top of the hill!",
    dialogo: "Climb Baoshi Hill for the view. The rocks up here glow red at sunset.",
  },
  {
    id: "jingci",
    nombre: "Jingci Temple",
    categoria: "temple",
    rasgo: "sociable",
    lat: 30.2295,
    lon: 120.149,
    radioMetros: 260,
    efectos: {felicidad: 12, vinculo: 8},
    sello: "templo",
    color: "rgb(200,150,60)",
    frase: "Did you hear that? A big bell!",
    dialogo: "The evening bell of Jingci. You can hear it across the lake.",
  },
  {
    id: "faxi",
    nombre: "Faxi Temple",
    categoria: "temple",
    rasgo: "sociable",
    lat: 30.202,
    lon: 120.085,
    radioMetros: 380,
    efectos: {felicidad: 14, vinculo: 10},
    sello: "templo",
    color: "rgb(210,170,70)",
    frase: "Yellow walls and old trees… so pretty.",
    dialogo: "High in the hills, the temple with the yellow walls. People come to make wishes.",
  },
  {
    id: "meijiawu",
    nombre: "Meijiawu Tea Village",
    categoria: "tea",
    rasgo: "gourmet",
    lat: 30.2103,
    lon: 120.1105,
    radioMetros: 380,
    efectos: {felicidad: 12, hambre: 10},
    sello: "hoja",
    color: "rgb(90,150,90)",
    frase: "More tea!! We should try some.",
    dialogo: "A whole village of tea houses in the hills. Order a pot and stay a while.",
  },
  {
    id: "teamuseum",
    nombre: "China National Tea Museum",
    categoria: "tea",
    rasgo: "gourmet",
    lat: 30.2347,
    lon: 120.1156,
    radioMetros: 260,
    efectos: {felicidad: 10, hambre: 6},
    sello: "hoja",
    color: "rgb(100,140,100)",
    frase: "A museum made of tea? I'm in.",
    dialogo: "Tea fields around a museum about tea. You can taste some at the end.",
  },
  {
    id: "jiuxi",
    nombre: "Nine Creeks in Misty Forest",
    categoria: "nature",
    rasgo: "explorador",
    lat: 30.206,
    lon: 120.102,
    radioMetros: 380,
    efectos: {felicidad: 14, energia: 12},
    sello: "hoja",
    color: "rgb(80,140,130)",
    frase: "So many little streams! My feet are wet.",
    dialogo: "A path that crosses the creek again and again. Fog in the mornings.",
  },
  {
    id: "hupao",
    nombre: "Tiger Spring",
    categoria: "nature",
    rasgo: "explorador",
    lat: 30.2103,
    lon: 120.129,
    radioMetros: 380,
    efectos: {felicidad: 10, energia: 8},
    sello: "estrella",
    color: "rgb(120,150,170)",
    frase: "The water here is supposed to be magic!",
    dialogo: "Legend says two tigers dug this spring. The tea made with it is famous.",
  },
  {
    id: "liuhe",
    nombre: "Six Harmonies Pagoda",
    categoria: "nature",
    rasgo: "explorador",
    lat: 30.19825,
    lon: 120.12658,
    radioMetros: 260,
    efectos: {felicidad: 14, energia: 10},
    sello: "pagoda",
    color: "rgb(190,110,70)",
    frase: "Look, a giant river!",
    dialogo: "The big pagoda above the Qiantang River. The tide here is famous.",
  },
  {
    id: "zoo",
    nombre: "Hangzhou Zoo",
    categoria: "nature",
    rasgo: "sociable",
    lat: 30.2137,
    lon: 120.1337,
    radioMetros: 260,
    efectos: {felicidad: 16},
    sello: "estrella",
    color: "rgb(220,160,80)",
    frase: "ANIMALS!! Can I be friends with them?",
    dialogo: "Pandas, tigers, and a lot of very judgy birds.",
  },
  {
    id: "botanico",
    nombre: "Botanical Garden",
    categoria: "nature",
    rasgo: "explorador",
    lat: 30.25524,
    lon: 120.12313,
    radioMetros: 260,
    efectos: {felicidad: 12, energia: 8},
    sello: "hoja",
    color: "rgb(100,160,90)",
    frase: "Every plant in the world is here!",
    dialogo: "Bamboo, plum trees and a big lawn for lying down.",
  },
  {
    id: "huanglong",
    nombre: "Yellow Dragon Cave",
    categoria: "nature",
    rasgo: "sociable",
    lat: 30.2677,
    lon: 120.1359,
    radioMetros: 380,
    efectos: {felicidad: 12, vinculo: 6},
    sello: "estrella",
    color: "rgb(220,180,70)",
    frase: "A dragon?? Where?!",
    dialogo: "A little garden with a dragon fountain. Sometimes there's live music.",
  },
  {
    id: "huagang",
    nombre: "Flower Harbour",
    categoria: "lake",
    rasgo: "sociable",
    lat: 30.2296,
    lon: 120.1264,
    radioMetros: 380,
    efectos: {felicidad: 14, vinculo: 6},
    sello: "corazon",
    color: "rgb(230,130,150)",
    frase: "FISH. So many fish!",
    dialogo: "Viewing fish at Flower Harbour. The koi come right up to you.",
  },
  {
    id: "liulang",
    nombre: "Orioles in the Willows",
    categoria: "lake",
    rasgo: "explorador",
    lat: 30.2334,
    lon: 120.1518,
    radioMetros: 380,
    efectos: {felicidad: 12},
    sello: "hoja",
    color: "rgb(150,190,110)",
    frase: "Tweet tweet! Listen!",
    dialogo: "Willows on the lakeshore where the birds sing. Good spot for a picnic.",
  },
  {
    id: "hefang",
    nombre: "Hefang Street",
    categoria: "city",
    rasgo: "gourmet",
    lat: 30.2402,
    lon: 120.1656,
    radioMetros: 380,
    efectos: {felicidad: 14, hambre: 14},
    sello: "casa",
    color: "rgb(190,120,80)",
    frase: "SNACKS. Everywhere. Hold my hand.",
    dialogo: "The old street with lanterns, sweets and little shops. Try everything.",
  },
  {
    id: "wushan",
    nombre: "Wushan Square",
    categoria: "city",
    rasgo: "explorador",
    lat: 30.2422,
    lon: 120.1599,
    radioMetros: 380,
    efectos: {felicidad: 10, energia: 6},
    sello: "pagoda",
    color: "rgb(170,110,90)",
    frase: "There's a tower on top of the hill!",
    dialogo: "Climb up to the Town God's Pavilion. The city on one side, the lake on the other.",
  },
  {
    id: "yujie",
    nombre: "Southern Song Imperial Street",
    categoria: "city",
    rasgo: "gourmet",
    lat: 30.2438,
    lon: 120.167,
    radioMetros: 380,
    efectos: {felicidad: 12, hambre: 10},
    sello: "casa",
    color: "rgb(160,110,80)",
    frase: "An emperor walked here once!",
    dialogo: "The old imperial road, with water running beside the stones.",
  },
  {
    id: "hubin",
    nombre: "Hubin",
    categoria: "city",
    rasgo: "sociable",
    lat: 30.2503,
    lon: 120.1596,
    radioMetros: 380,
    efectos: {felicidad: 12, vinculo: 6},
    sello: "cafe",
    color: "rgb(120,100,160)",
    frase: "Shops and lights and the lake!",
    dialogo: "The lakeside by the city. Fountains at night, cafés all day.",
  },
  {
    id: "wulin",
    nombre: "Wulin Square",
    categoria: "city",
    rasgo: "sociable",
    lat: 30.27333,
    lon: 120.15861,
    radioMetros: 260,
    efectos: {felicidad: 10, vinculo: 6},
    sello: "estrella",
    color: "rgb(110,110,160)",
    frase: "So many people! Stay close.",
    dialogo: "The busy center of the city. Big stores, big fountain.",
  },
  {
    id: "gongchen",
    nombre: "Gongchen Bridge",
    categoria: "city",
    rasgo: "explorador",
    lat: 30.320472,
    lon: 120.13472,
    radioMetros: 260,
    efectos: {felicidad: 12, energia: 8},
    sello: "pabellon",
    color: "rgb(130,120,100)",
    frase: "An old stone bridge on a looong canal.",
    dialogo: "The Grand Canal goes all the way to Beijing. This bridge has seen boats for 400 years.",
  },
  {
    id: "xixi",
    nombre: "Xixi Wetland",
    categoria: "nature",
    rasgo: "explorador",
    lat: 30.27056,
    lon: 120.0625,
    radioMetros: 260,
    efectos: {felicidad: 16, energia: 10},
    sello: "hoja",
    color: "rgb(90,140,110)",
    frase: "Boats and reeds and birds everywhere!",
    dialogo: "Wetlands and little canals. Take a boat, it's quiet out there.",
  },
  {
    id: "teatro",
    nombre: "Hangzhou Grand Theater",
    categoria: "city",
    rasgo: "sociable",
    lat: 30.2443,
    lon: 120.2145,
    radioMetros: 380,
    efectos: {felicidad: 12, vinculo: 6},
    sello: "estrella",
    color: "rgb(210,190,110)",
    frase: "The giant golden moon building!",
    dialogo: "The sun and moon by the river. At night the whole skyline lights up.",
  },
  {
    id: "museozj",
    nombre: "Zhejiang Provincial Museum",
    categoria: "museum",
    rasgo: "sociable",
    lat: 30.25333,
    lon: 120.13889,
    radioMetros: 260,
    efectos: {felicidad: 10, vinculo: 6},
    sello: "estrella",
    color: "rgb(140,120,160)",
    frase: "Old old old things. I love it.",
    dialogo: "Jade, pottery and ancient boats at the foot of Solitary Hill.",
  },
  {
    id: "museohz",
    nombre: "Hangzhou Museum",
    categoria: "museum",
    rasgo: "sociable",
    lat: 30.2389,
    lon: 120.1661,
    radioMetros: 260,
    efectos: {felicidad: 10, vinculo: 6},
    sello: "estrella",
    color: "rgb(140,130,110)",
    frase: "Let's learn about Hangzhou!",
    dialogo: "The story of the city, room by room, at the foot of Wu Hill.",
  },
  {
    id: "xianghu",
    nombre: "Xiang Lake",
    categoria: "nature",
    rasgo: "explorador",
    lat: 30.17017,
    lon: 120.23004,
    radioMetros: 380,
    efectos: {felicidad: 14, energia: 10},
    sello: "pabellon",
    color: "rgb(90,130,170)",
    frase: "Another lake! Quieter than the famous one.",
    dialogo: "West Lake's little sister across the river. Fewer people, wide skies.",
  },
];

// Las colecciones de sellos (el mapa muestra cuantos van de cada una).
export const CATEGORIAS = {
  lake: "Around the lake",
  temple: "Temples",
  tea: "Tea trail",
  nature: "Hills & water",
  city: "City",
  museum: "Museums",
  propio: "Ours",
};


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
      categoria: "propio",
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

// WGS84 -> GCJ-02 (el "corrimiento chino"). Si algun telefono entrega la
// posicion ya corrida, igual cae dentro del lugar.
function fueraDeChina(lat, lon) {
  return lon < 72.004 || lon > 137.8347 || lat < 0.8293 || lat > 55.8271;
}
function transformarLat(x, y) {
  let r = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  r += ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3;
  r += ((20 * Math.sin(y * Math.PI) + 40 * Math.sin((y / 3) * Math.PI)) * 2) / 3;
  r += ((160 * Math.sin((y / 12) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30)) * 2) / 3;
  return r;
}
function transformarLon(x, y) {
  let r = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  r += ((20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2) / 3;
  r += ((20 * Math.sin(x * Math.PI) + 40 * Math.sin((x / 3) * Math.PI)) * 2) / 3;
  r += ((150 * Math.sin((x / 12) * Math.PI) + 300 * Math.sin((x / 30) * Math.PI)) * 2) / 3;
  return r;
}
export function wgsAGcj(lat, lon) {
  if (fueraDeChina(lat, lon)) return [lat, lon];
  const a = 6378245.0;
  const ee = 0.00669342162296594323;
  let dLat = transformarLat(lon - 105.0, lat - 35.0);
  let dLon = transformarLon(lon - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI);
  dLon = (dLon * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI);
  return [lat + dLat, lon + dLon];
}

/** Distancia de una posicion a un lugar, en WGS84 o en GCJ-02 (la menor). */
export function distanciaLugar(lat, lon, lugar) {
  const d1 = distanciaMetros(lat, lon, lugar.lat, lugar.lon);
  if (lugar.propio) return d1; // los de ustedes se cargan tal cual
  const [glat, glon] = wgsAGcj(lugar.lat, lugar.lon);
  return Math.min(d1, distanciaMetros(lat, lon, glat, glon));
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
    let mejor = null;
    let mejorD = Infinity;
    for (const lugar of this.pendientes()) {
      const msDesdeOferta = ahora - (this.ultimaOfertaMs[lugar.id] || 0);
      if (msDesdeOferta < COOLDOWN_OFERTA_MS) continue;
      const d = distanciaLugar(lat, lon, lugar);
      // el mas cercano gana (hay varios lugares pegados alrededor del lago)
      if (d <= lugar.radioMetros && d < mejorD) {
        mejor = lugar;
        mejorD = d;
      }
    }
    return mejor;
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
