/**
 * musica.js
 * ==========
 * Musica para los momentos especiales. Dos fuentes, en este orden:
 *
 *  1. Un clip real de rom (assets/musica/<escena>.mp3), si la escena
 *     esta anotada en MUSICA_CLIPS (config.js) y el archivo carga.
 *  2. Si no: un tema chiptune ORIGINAL compuesto para Baozi, sonando
 *     por el mismo motor de osciladores que los efectos (sonido.js) —
 *     ondas de pulso como las de una Game Boy, que es exactamente la
 *     voz que corresponde a este aparato.
 *
 * Asi la musica funciona hoy, sin esperar nada, y rom puede reemplazar
 * cualquier escena por una cancion suya soltando un archivo. Nunca
 * queda en silencio por un archivo que falta.
 *
 * Todo pasa por Web Audio (no <audio>): el final arranca cuando la
 * camara detecta la tarjeta, sin un toque de por medio, y un <audio>
 * en iOS no puede empezar solo. El AudioContext ya esta desbloqueado
 * por los toques anteriores (ver despertarConPrimerToque).
 */

import { contexto, sonidoHabilitado } from "./sonido.js";
import { MUSICA_CLIPS, ESTACIONES_PROPIAS } from "./config.js";
import { arte } from "./arte.js";

// ------------------------------------------------------------------
// Notacion: "NOTA/pasos" separados por espacio. Un paso = una corchea.
// "-/4" es silencio. Octava 4 = la del La 440.
// ------------------------------------------------------------------

const SEMITONO = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };

function frecuencia(nombre) {
  const m = /^([A-G])(#|b)?(\d)$/.exec(nombre);
  if (!m) return null;
  let n = SEMITONO[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * Math.pow(2, n / 12);
}

function parsear(texto) {
  return texto
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const [n, p] = tok.split("/");
      return { frec: n === "-" ? null : frecuencia(n), pasos: Number(p || 1) };
    });
}

// Bajo "caminante" de un acorde por compas: raiz-quinta-octava-quinta.
const ACORDES = {
  G: ["G2", "D3", "G3", "D3"], D: ["D2", "A2", "D3", "A2"], Em: ["E2", "B2", "E3", "B2"],
  C: ["C3", "G2", "C3", "G2"], Am: ["A2", "E3", "A3", "E3"], F: ["F2", "C3", "F3", "C3"],
  Dm: ["D2", "A2", "D3", "A2"], Bb: ["Bb2", "F2", "Bb2", "F2"], A: ["A2", "E3", "A3", "E3"],
  Bm: ["B2", "F#3", "B3", "F#3"],
};
const ARPEGIOS = {
  G: ["G4", "B4", "D5", "B4"], D: ["F#4", "A4", "D5", "A4"], Em: ["G4", "B4", "E5", "B4"],
  C: ["G4", "C5", "E5", "C5"], Am: ["A4", "C5", "E5", "C5"], F: ["A4", "C5", "F5", "C5"],
  Dm: ["A4", "D5", "F5", "D5"], Bb: ["Bb4", "D5", "F5", "D5"], A: ["A4", "C#5", "E5", "C#5"],
  Bm: ["F#4", "B4", "D5", "B4"],
};

function bajo(acordes, pasosPorNota = 2) {
  return acordes.map((a) => ACORDES[a].map((n) => `${n}/${pasosPorNota}`).join(" ")).join(" ");
}
function arpegio(acordes) {
  return acordes.map((a) => [...ARPEGIOS[a], ...ARPEGIOS[a]].map((n) => `${n}/1`).join(" ")).join(" ");
}
function largas(acordes) {
  return acordes.map((a) => `${ACORDES[a][0]}/8`).join(" ");
}
// v22: arpegio lento (negras), para las estaciones tranquilas de la radio
function arpegioLento(acordes) {
  return acordes.map((a) => ARPEGIOS[a].map((n) => `${n}/2`).join(" ")).join(" ");
}
// bajo que salta raiz-octava en corcheas (para las estaciones con ritmo)
function bajoSaltarin(acordes) {
  return acordes
    .map((a) => {
      const [r, , o] = ACORDES[a];
      return `${r}/1 ${o}/1 ${r}/1 ${o}/1 ${r}/1 ${o}/1 ${r}/1 ${o}/1`;
    })
    .join(" ");
}

// v22: la radio del cuarto. Cuatro estaciones ORIGINALES, compuestas para
// escuchar un rato largo: mas lentas y mas suaves que los temas del final.
const TE_ACORDES = ["D", "Bm", "G", "A", "D", "Bm", "G", "D", "G", "A", "D", "Bm", "G", "A", "D", "D"];
const LAGO_ACORDES = ["C", "Am", "F", "G", "C", "Am", "Dm", "G", "F", "G", "Em", "Am", "F", "G", "C", "C"];
const LLUVIA_ACORDES = ["Am", "F", "C", "G", "Am", "F", "Em", "Am", "Am", "F", "C", "G", "Am", "F", "Em", "Am"];
const NOCHE_ACORDES = ["Dm", "Bb", "C", "A", "Dm", "Bb", "C", "Dm", "Bb", "C", "Am", "Dm", "Bb", "C", "A", "A"];

const ESTACIONES_TEMAS = {
  // "Tea House": pentatonica de Re, como una casa de te en Longjing.
  radio_te: {
    bpm: 72,
    loop: true,
    voces: [
      {
        onda: "pulso25", vol: 0.05,
        notas: `A5/2 F#5/1 E5/1 D5/4  F#5/2 A5/2 B5/3 A5/1  B5/2 A5/1 F#5/1 E5/2 D5/2  E5/6 -/2
                A5/2 B5/1 A5/1 F#5/2 A5/2  B5/2 D6/2 B5/2 A5/2  F#5/2 E5/1 D5/1 E5/2 F#5/2  D5/6 -/2
                D6/3 B5/1 A5/2 B5/2  A5/2 F#5/2 E5/4  F#5/2 A5/2 D6/2 B5/2  A5/3 F#5/1 E5/2 D5/2
                E5/2 F#5/1 A5/1 B5/2 A5/2  F#5/2 E5/2 D5/2 E5/2  D5/2 E5/1 F#5/1 A5/4  D5/8`,
      },
      { onda: "triangle", vol: 0.12, notas: bajo(TE_ACORDES) },
      { onda: "pulso12", vol: 0.016, notas: arpegio(TE_ACORDES) },
    ],
  },
  // "West Lake Walk": paseo alegre por el lago, en Do.
  radio_lago: {
    bpm: 100,
    loop: true,
    voces: [
      {
        onda: "pulso25", vol: 0.05,
        notas: `E5/1 G5/1 C6/2 G5/2 E5/2  A5/2 G5/1 E5/1 C5/4  F5/1 A5/1 C6/2 A5/2 F5/2  G5/2 F5/1 E5/1 D5/4
                E5/1 G5/1 C6/2 E6/2 D6/2  C6/2 A5/2 E5/4  F5/2 A5/2 D6/2 C6/2  B5/4 G5/4
                A5/2 C6/2 A5/2 F5/2  B5/2 D6/2 B5/2 G5/2  G5/2 E5/2 B4/2 E5/2  A5/4 C6/4
                D6/2 C6/1 A5/1 F5/4  D6/2 B5/1 D6/1 G5/4  E5/2 G5/2 C6/2 B5/2  C6/6 -/2`,
      },
      { onda: "triangle", vol: 0.12, notas: bajo(LAGO_ACORDES) },
      { onda: "pulso12", vol: 0.015, notas: arpegio(LAGO_ACORDES) },
    ],
  },
  // "Rainy Day": lenta y con aire, para un dia de lluvia en el cuarto.
  radio_lluvia: {
    bpm: 66,
    loop: true,
    voces: [
      {
        onda: "sine", vol: 0.075,
        notas: `-/2 E5/2 C5/2 A4/2  C5/6 -/2  -/2 G5/2 E5/2 C5/2  D5/6 -/2
                -/2 A5/2 G5/2 E5/2  F5/4 E5/2 C5/2  B4/6 -/2  A4/8
                E5/2 A5/2 B5/2 C6/2  A5/6 -/2  G5/2 E5/2 G5/2 C6/2  B5/4 A5/2 G5/2
                A5/3 G5/1 E5/2 C5/2  D5/2 C5/2 A4/4  B4/2 E5/2 G5/2 B4/2  A4/8`,
      },
      { onda: "triangle", vol: 0.13, notas: largas(LLUVIA_ACORDES) },
      { onda: "pulso12", vol: 0.018, notas: arpegioLento(LLUVIA_ACORDES) },
    ],
  },
  // "Night Market": farolitos y puestos de comida, en Re menor.
  radio_noche: {
    bpm: 108,
    loop: true,
    voces: [
      {
        onda: "pulso25", vol: 0.045,
        notas: `D5/1 F5/1 A5/2 G5/1 F5/1 D5/2  F5/2 D5/1 F5/1 Bb5/4  G5/1 A5/1 G5/1 E5/1 C5/4  E5/2 C#5/2 A4/4
                D5/1 F5/1 A5/2 D6/2 C6/2  Bb5/2 A5/1 G5/1 F5/4  E5/2 G5/2 C6/2 E5/2  D5/6 -/2
                D6/2 C6/1 Bb5/1 A5/2 F5/2  G5/2 E5/2 C5/4  A5/1 C6/1 A5/1 E5/1 A5/4  F5/2 E5/2 D5/4
                F5/1 G5/1 A5/1 Bb5/1 D6/4  C6/2 Bb5/1 A5/1 G5/4  A5/2 E5/2 C#5/2 E5/2  A5/6 -/2`,
      },
      { onda: "triangle", vol: 0.11, notas: bajoSaltarin(NOCHE_ACORDES) },
      { onda: "pulso12", vol: 0.014, notas: arpegio(NOCHE_ACORDES) },
    ],
  },
};

// ------------------------------------------------------------------
// Los temas. Todos originales, compuestos para Baozi.
// ------------------------------------------------------------------

const PROPUESTA_ACORDES = ["G", "D", "Em", "C", "G", "D", "C", "D", "Em", "C", "G", "D", "Em", "C", "D", "G"];

const TEMAS = {
  // La cancion del final. Tierna, lenta, en Sol. Loop de 16 compases.
  propuesta: {
    bpm: 76,
    loop: true,
    voces: [
      {
        onda: "pulso25", vol: 0.075,
        notas: `D5/2 B4/1 D5/1 G5/3 A5/1  F#5/2 E5/1 D5/1 A4/4  G5/2 F#5/1 E5/1 B4/3 D5/1  E5/2 D5/1 C5/1 G4/4
                D5/2 B4/1 D5/1 G5/3 B5/1  A5/2 G5/1 F#5/1 E5/2 D5/2  E5/2 G5/2 C6/2 B5/1 A5/1  A5/4 F#5/2 D5/2
                B5/3 A5/1 G5/2 E5/2  G5/3 F#5/1 E5/2 C5/2  D5/2 G5/2 B5/2 A5/1 G5/1  F#5/4 A5/4
                G5/2 E5/2 B4/2 E5/2  C6/3 B5/1 A5/2 G5/2  A5/2 D5/2 F#5/2 E5/2  G5/8`,
      },
      { onda: "triangle", vol: 0.16, notas: bajo(PROPUESTA_ACORDES) },
      { onda: "pulso12", vol: 0.022, notas: arpegio(PROPUESTA_ACORDES) },
    ],
  },

  // "Si!" — fanfarria y despues una vuelta alegre que queda sonando.
  si: {
    bpm: 132,
    loop: true,
    loopDesde: 8, // la fanfarria del primer compas suena una sola vez
    voces: [
      {
        onda: "pulso25", vol: 0.08,
        notas: `G4/1 B4/1 D5/1 G5/5
                G5/1 G5/1 A5/1 B5/1 D6/4  E6/2 D6/1 C6/1 B5/2 A5/2  A5/2 B5/1 A5/1 F#5/2 D5/2  G5/2 B5/2 D6/2 B5/2
                E6/3 D6/1 B5/2 G5/2  C6/2 A5/2 D6/2 F#5/2  G5/2 D5/2 G5/4  -/8`,
      },
      {
        onda: "triangle", vol: 0.16,
        notas: `G2/2 G3/2 G2/2 G3/2 ` + ["G", "C", "D", "G", "Em", "C", "D", "G"].map((a) => {
          const [r, , o] = ACORDES[a];
          return `${r}/1 ${o}/1 ${r}/1 ${o}/1 ${r}/1 ${o}/1 ${r}/1 ${o}/1`;
        }).join(" "),
      },
      { onda: "pulso12", vol: 0.02, notas: `-/8 ` + arpegio(["G", "C", "D", "G", "Em", "C", "D", "G"]) },
    ],
  },

  // Mientras busca con el lente: misterioso, suave, en La menor.
  busqueda: {
    bpm: 88,
    loop: true,
    voces: [
      { onda: "pulso12", vol: 0.03, notas: arpegio(["Am", "F", "C", "G", "Am", "F", "C", "G"]) },
      { onda: "triangle", vol: 0.14, notas: largas(["Am", "F", "C", "G", "Am", "F", "C", "G"]) },
      {
        onda: "sine", vol: 0.07,
        notas: `-/4 E5/2 D5/2  C5/6 -/2  -/4 G5/2 E5/2  D5/8
                -/4 E5/2 G5/2  A5/6 -/2  G5/2 E5/2 C5/2 E5/2  D5/8`,
      },
    ],
  },

  // Cartas: cuatro compases tiernos, en Fa.
  carta: {
    bpm: 84,
    voces: [
      { onda: "pulso25", vol: 0.07, notas: `A4/2 C5/2 F5/4  E5/2 D5/2 C5/4  D5/2 F5/2 A5/3 G5/1  F5/8` },
      { onda: "triangle", vol: 0.15, notas: bajo(["F", "C", "Dm", "Bb"]) },
    ],
  },

  // Lugar nuevo: brillante, en Do.
  descubrimiento: {
    bpm: 120,
    voces: [
      { onda: "pulso25", vol: 0.08, notas: `C5/1 E5/1 G5/1 C6/5  A5/2 C6/2 F5/4  G5/2 B5/2 D6/2 B5/2  C6/8` },
      { onda: "triangle", vol: 0.15, notas: bajo(["C", "F", "G", "C"]) },
      { onda: "pulso12", vol: 0.02, notas: arpegio(["C", "F", "G", "C"]) },
    ],
  },

  // "In Love" con un NPC: dulce, en Re.
  enamorado: {
    bpm: 96,
    voces: [
      { onda: "pulso25", vol: 0.075, notas: `F#5/2 A5/2 D6/4  C#6/2 B5/2 A5/4  B5/2 G5/2 E5/2 C#5/2  D5/8` },
      { onda: "triangle", vol: 0.15, notas: bajo(["D", "A", "Em", "D"]) },
    ],
  },
};

Object.assign(TEMAS, ESTACIONES_TEMAS);

// ------------------------------------------------------------------
// Motor: planificador con "lookahead" — se agendan las notas un poco
// antes de que suenen, con el reloj del AudioContext (preciso), en vez
// de setTimeout (que tiembla). Permite loop y corte limpio.
// ------------------------------------------------------------------

const ondasPulso = {};
function ondaPulso(c, ciclo) {
  const clave = String(ciclo);
  if (ondasPulso[clave]) return ondasPulso[clave];
  const n = 32;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) imag[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * ciclo);
  ondasPulso[clave] = c.createPeriodicWave(real, imag);
  return ondasPulso[clave];
}

let actual = null; // { escena, maestro, detener() }

function tocarNota(c, destino, voz, frec, inicio, dur) {
  const osc = c.createOscillator();
  const g = c.createGain();
  if (voz.onda === "pulso25") osc.setPeriodicWave(ondaPulso(c, 0.25));
  else if (voz.onda === "pulso12") osc.setPeriodicWave(ondaPulso(c, 0.125));
  else osc.type = voz.onda;
  osc.frequency.setValueAtTime(frec, inicio);
  const sosten = Math.max(0.03, dur * 0.88);
  g.gain.setValueAtTime(0.0001, inicio);
  g.gain.exponentialRampToValueAtTime(voz.vol, inicio + 0.012);
  g.gain.setValueAtTime(voz.vol, inicio + sosten * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, inicio + sosten);
  osc.connect(g);
  g.connect(destino);
  osc.start(inicio);
  osc.stop(inicio + sosten + 0.02);
}

function tocarTema(c, tema, maestro, alTerminar) {
  const paso = 60 / tema.bpm / 2; // corchea
  // Todas las voces aplanadas en una sola lista de eventos ordenada por
  // paso de inicio. Un loop es "volver a recorrerla desde loopDesde".
  const eventos = [];
  let largo = 0;
  for (const voz of tema.voces) {
    let pos = 0;
    for (const n of parsear(voz.notas)) {
      if (n.frec) eventos.push({ inicio: pos, pasos: n.pasos, frec: n.frec, voz });
      pos += n.pasos;
    }
    largo = Math.max(largo, pos);
  }
  eventos.sort((x, y) => x.inicio - y.inicio);
  const loopDesde = tema.loopDesde || 0;
  const primerEventoLoop = Math.max(0, eventos.findIndex((e) => e.inicio >= loopDesde));
  const t0 = c.currentTime + 0.08;
  let base = 0; // pasos absolutos agregados por cada vuelta del loop
  let k = 0;
  let vivo = true;

  const tick = () => {
    if (!vivo) return;
    const horizonte = c.currentTime + 0.25;
    while (vivo) {
      if (k >= eventos.length) {
        if (!tema.loop) {
          vivo = false;
          clearInterval(intervalo);
          const fin = t0 + (base + largo) * paso;
          setTimeout(() => alTerminar && alTerminar(), Math.max(0, (fin - c.currentTime) * 1000) + 300);
          return;
        }
        base += largo - loopDesde;
        k = primerEventoLoop;
      }
      const e = eventos[k];
      const cuando = t0 + (base + e.inicio) * paso;
      if (cuando > horizonte) break;
      tocarNota(c, maestro, e.voz, e.frec, cuando, e.pasos * paso);
      k++;
    }
  };
  const intervalo = setInterval(tick, 40);
  tick();
  return () => {
    vivo = false;
    clearInterval(intervalo);
  };
}

// --- clips reales --------------------------------------------------

const buffers = {};

const esPropia = (escena) => ESTACIONES_PROPIAS.some((e) => e && e.archivo === escena);

async function cargarClip(c, escena) {
  if (!MUSICA_CLIPS.includes(escena) && !esPropia(escena)) return null;
  if (buffers[escena] !== undefined) return buffers[escena];
  try {
    const r = await fetch(arte(`musica/${escena}.mp3`));
    if (!r.ok) throw new Error(String(r.status));
    const datos = await r.arrayBuffer();
    buffers[escena] = await new Promise((ok, mal) => c.decodeAudioData(datos, ok, mal));
  } catch (e) {
    buffers[escena] = null; // no esta o no se pudo leer: chiptune
  }
  return buffers[escena];
}

/** Se puede llamar temprano (ej. al abrir el lente) para que el clip ya este listo. */
export function precargar(escena) {
  const c = contexto();
  if (c) cargarClip(c, escena);
}

const LOOPEA = new Set(["propuesta", "si", "busqueda", ...Object.keys(ESTACIONES_TEMAS)]);
// la radio va mas bajita que la musica de los momentos especiales
const VOLUMEN = { radio_te: 0.55, radio_lago: 0.5, radio_lluvia: 0.6, radio_noche: 0.5 };
const VOLUMEN_PROPIA = 0.45;

// ------------------------------------------------------------------
// v22: la radio del cuarto (estaciones)
// ------------------------------------------------------------------

const CLAVE_ESTACION = "baozi_estacion";
const NOMBRES_ESTACIONES = [
  { id: "radio_te", nombre: "Tea House" },
  { id: "radio_lago", nombre: "West Lake Walk" },
  { id: "radio_lluvia", nombre: "Rainy Day" },
  { id: "radio_noche", nombre: "Night Market" },
];

/** Todas las estaciones, en el orden de la perilla (sin "Off"). */
export function estaciones() {
  const propias = ESTACIONES_PROPIAS.filter((e) => e && e.archivo).map((e) => ({ id: e.archivo, nombre: e.nombre || "Our song", propia: true }));
  return [...NOMBRES_ESTACIONES, ...propias];
}

export const esEstacion = (escena) => !!escena && estaciones().some((e) => e.id === escena);

/** La estacion elegida, o null si la radio esta en "Off". */
export function estacionActual() {
  let id = null;
  try {
    id = localStorage.getItem(CLAVE_ESTACION);
  } catch (e) {
    id = null;
  }
  if (id === "off") return null;
  const lista = estaciones();
  return lista.find((e) => e.id === id) || lista[0];
}

/** Gira la perilla: la estacion siguiente (despues de la ultima, "Off"; despues de "Off", la primera). */
export function siguienteEstacion() {
  const lista = estaciones();
  const act = estacionActual();
  const i = act ? lista.findIndex((e) => e.id === act.id) : -1;
  const nueva = act && i === lista.length - 1 ? null : lista[i + 1] || lista[0];
  try {
    localStorage.setItem(CLAVE_ESTACION, nueva ? nueva.id : "off");
  } catch (e) {
    /* nada */
  }
  return nueva;
}

/** "(2/4)": en que estacion va. */
export function numeroDeEstacion(est) {
  const lista = estaciones();
  const i = est ? lista.findIndex((e) => e.id === est.id) : -1;
  return i < 0 ? "" : `${i + 1}/${lista.length}`;
}

/**
 * Arranca la musica de una escena (cortando la anterior con fundido).
 * opts.forzar: suena aunque el sonido este apagado (solo el final).
 */
export async function tocar(escena, opts = {}) {
  if (actual && actual.escena === escena) return;
  detener(0.5);
  if (!sonidoHabilitado() && !opts.forzar) return;
  const c = contexto();
  if (!c) return;
  if (c.state !== "running") c.resume().catch(() => {});

  const maestro = c.createGain();
  maestro.gain.value = esPropia(escena) ? VOLUMEN_PROPIA : (TEMAS[escena] && !MUSICA_CLIPS.includes(escena) ? 1.8 : 1) * (VOLUMEN[escena] || 1);
  maestro.connect(c.destination);
  const registro = { escena, maestro, cortar: null };
  actual = registro;

  const buffer = await cargarClip(c, escena);
  if (actual !== registro) return; // mientras cargaba, se pidio otra cosa

  const alTerminar = () => {
    if (actual === registro) actual = null;
  };

  if (buffer) {
    const fuente = c.createBufferSource();
    fuente.buffer = buffer;
    fuente.loop = LOOPEA.has(escena) || esPropia(escena);
    fuente.connect(maestro);
    fuente.onended = alTerminar;
    fuente.start();
    registro.cortar = () => {
      try {
        fuente.stop();
      } catch (e) {
        /* ya paro */
      }
    };
  } else if (TEMAS[escena]) {
    registro.cortar = tocarTema(c, TEMAS[escena], maestro, alTerminar);
  }
}

/** Corta la musica con un fundido corto. */
export function detener(fundido = 0.6) {
  if (!actual) return;
  const { maestro, cortar } = actual;
  actual = null;
  const c = contexto();
  try {
    const t = c.currentTime;
    maestro.gain.cancelScheduledValues(t);
    maestro.gain.setValueAtTime(maestro.gain.value, t);
    maestro.gain.linearRampToValueAtTime(0.0001, t + fundido);
  } catch (e) {
    /* nada */
  }
  setTimeout(() => {
    if (cortar) cortar();
    try {
      maestro.disconnect();
    } catch (e) {
      /* nada */
    }
  }, fundido * 1000 + 60);
}

export function escenaSonando() {
  return actual ? actual.escena : null;
}

export const ESCENAS_MUSICA = Object.keys(TEMAS);

/** Solo para tests: pasos totales de cada voz de cada tema (tienen que coincidir). */
export function _duracionesDeVoces() {
  const r = {};
  for (const [k, t] of Object.entries(TEMAS)) {
    r[k] = t.voces.map((v) => parsear(v.notas).reduce((a, n) => a + n.pasos, 0));
    r[k].notasInvalidas = t.voces.flatMap((v) => v.notas.trim().split(/\s+/).filter((tok) => !tok.startsWith("-") && !frecuencia(tok.split("/")[0])));
  }
  return r;
}

/**
 * Para tests / exportar una muestra: agenda un tema entero (sin loop,
 * `vueltas` veces) en cualquier contexto, incluido un OfflineAudioContext.
 * Devuelve la duracion en segundos.
 */
export function agendarCompleto(c, escena, destino, vueltas = 1) {
  const tema = TEMAS[escena];
  if (!tema) return 0;
  const paso = 60 / tema.bpm / 2;
  let t = 0.05;
  let largo = 0;
  for (let v = 0; v < vueltas; v++) {
    for (const voz of tema.voces) {
      let pos = 0;
      for (const n of parsear(voz.notas)) {
        if (n.frec) tocarNota(c, destino, voz, n.frec, t + pos * paso, n.pasos * paso);
        pos += n.pasos;
      }
      largo = Math.max(largo, pos);
    }
    t += largo * paso;
  }
  return t;
}
