/**
 * clima.js
 * =========
 * El clima de verdad, afuera de la ventana de Baozi.
 *
 * Se consulta Open-Meteo (gratis, sin cuenta, sin clave) con la ultima
 * ubicacion conocida (redondeada a ~1 km) o, si no hay, Hangzhou. Es lo
 * unico de la app que usa internet, y es opcional: sin señal no pasa
 * nada, el cielo queda como siempre.
 *
 * Tambien vive aca el sonido de lluvia (ruido filtrado con Web Audio,
 * sin archivos) y el trueno.
 */

import { contexto, sonidoHabilitado } from "./sonido.js";

const CLAVE = "baozi_clima";
const HANGZHOU = { lat: 30.25, lon: 120.15 };
const VIGENCIA_MS = 3 * 3600000; // un dato viejo de mas de 3 h no se muestra

let dato = null; // { tipo, codigo, t }
try {
  dato = JSON.parse(localStorage.getItem(CLAVE) || "null");
} catch (e) {
  dato = null;
}

/** Codigo WMO -> tipo del juego. */
export function tipoDeCodigo(c) {
  if (c == null) return null;
  if (c <= 1) return "despejado";
  if (c <= 3) return "nublado";
  if (c === 45 || c === 48) return "niebla";
  if (c >= 51 && c <= 57) return "llovizna";
  if ((c >= 61 && c <= 67) || (c >= 80 && c <= 82)) return "lluvia";
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return "nieve";
  if (c >= 95) return "tormenta";
  return "nublado";
}

const MALOS = new Set(["llovizna", "lluvia", "tormenta", "nieve", "niebla"]);
export const esMalo = (tipo) => MALOS.has(tipo);
export const llueve = (tipo) => tipo === "llovizna" || tipo === "lluvia" || tipo === "tormenta";

/** El tipo de clima vigente (o null si no hay dato reciente). */
export function tipo() {
  if (!dato || Date.now() - dato.t > VIGENCIA_MS) return null;
  return dato.tipo;
}

/** Lo que dice Baozi cuando afuera se pone feo. */
export const FRASES = {
  llovizna: "Oh! It's drizzling outside…",
  lluvia: "It's raining!! Good day to stay in.",
  tormenta: "A storm?! Did you hear that?!",
  nieve: "It's SNOWING!!",
  niebla: "Whoa… I can't see the lake. So foggy.",
};

/**
 * Consulta el clima. Devuelve { antes, ahora } con los tipos (null si
 * no se pudo). Nunca tira error.
 */
export async function actualizar(pos = null) {
  const antes = tipo();
  if (typeof fetch === "undefined" || (typeof navigator !== "undefined" && navigator.onLine === false)) return { antes, ahora: antes };
  const lat = (pos && pos.lat) || HANGZHOU.lat;
  const lon = (pos && pos.lon) || HANGZHOU.lon;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}&current=weather_code&timezone=auto`;
  try {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const reloj = ctrl ? setTimeout(() => ctrl.abort(), 8000) : null;
    const r = await fetch(url, { cache: "no-store", signal: ctrl ? ctrl.signal : undefined });
    if (reloj) clearTimeout(reloj);
    if (!r.ok) return { antes, ahora: antes };
    const j = await r.json();
    const codigo = j && j.current ? j.current.weather_code : null;
    const t = tipoDeCodigo(codigo);
    if (!t) return { antes, ahora: antes };
    dato = { tipo: t, codigo, t: Date.now() };
    try {
      localStorage.setItem(CLAVE, JSON.stringify(dato));
    } catch (e) {
      /* sin almacenamiento: queda en memoria */
    }
    return { antes, ahora: t };
  } catch (e) {
    return { antes, ahora: antes };
  }
}

/** Para probar (director / tests): fija un clima a mano. */
export function forzar(t) {
  dato = t ? { tipo: t, codigo: null, t: Date.now() } : null;
}

// ------------------------------------------------------------------
// Sonido de lluvia y trueno (Web Audio, sin archivos)
// ------------------------------------------------------------------

let lluvia = null; // { fuente, ganancia, nivel }

function ruido(c, segundos) {
  const b = c.createBuffer(1, Math.floor(c.sampleRate * segundos), c.sampleRate);
  const d = b.getChannelData(0);
  let ultimo = 0;
  for (let i = 0; i < d.length; i++) {
    // un poco "marron": menos chillon que el ruido blanco
    ultimo = (ultimo + 0.08 * (Math.random() * 2 - 1)) / 1.08;
    d[i] = ultimo * 3 + (Math.random() * 2 - 1) * 0.25;
  }
  return b;
}

/** Prende/apaga la lluvia de fondo. nivel: 0 (nada) .. 1 (tormenta). */
export function sonidoLluvia(nivel) {
  const c = contexto();
  const quiere = nivel > 0 && sonidoHabilitado() && c;
  if (!quiere) {
    if (lluvia) {
      const l = lluvia;
      lluvia = null;
      try {
        l.ganancia.gain.setTargetAtTime(0.0001, l.ctx.currentTime, 0.4);
        setTimeout(() => {
          try {
            l.fuente.stop();
          } catch (e) {
            /* ya parado */
          }
        }, 1600);
      } catch (e) {
        /* nada */
      }
    }
    return;
  }
  if (c.state === "suspended") c.resume().catch(() => {});
  const vol = 0.02 + 0.035 * nivel;
  if (lluvia) {
    if (lluvia.nivel !== nivel) {
      lluvia.ganancia.gain.setTargetAtTime(vol, c.currentTime, 0.6);
      lluvia.nivel = nivel;
    }
    return;
  }
  try {
    const fuente = c.createBufferSource();
    fuente.buffer = ruido(c, 2.5);
    fuente.loop = true;
    const pasaAltos = c.createBiquadFilter();
    pasaAltos.type = "highpass";
    pasaAltos.frequency.value = 500;
    const banda = c.createBiquadFilter();
    banda.type = "lowpass";
    banda.frequency.value = 3200;
    const ganancia = c.createGain();
    ganancia.gain.setValueAtTime(0.0001, c.currentTime);
    ganancia.gain.setTargetAtTime(vol, c.currentTime, 0.8);
    fuente.connect(pasaAltos);
    pasaAltos.connect(banda);
    banda.connect(ganancia);
    ganancia.connect(c.destination);
    fuente.start();
    lluvia = { fuente, ganancia, nivel, ctx: c };
  } catch (e) {
    lluvia = null;
  }
}

/** Un trueno lejano. */
export function trueno() {
  const c = contexto();
  if (!c || !sonidoHabilitado()) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  try {
    const t0 = c.currentTime + 0.25 + Math.random() * 0.6; // el sonido llega despues del rayo
    const fuente = c.createBufferSource();
    fuente.buffer = ruido(c, 3);
    const grave = c.createBiquadFilter();
    grave.type = "lowpass";
    grave.frequency.value = 180;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.08);
    g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.6);
    fuente.connect(grave);
    grave.connect(g);
    g.connect(c.destination);
    fuente.start(t0);
    fuente.stop(t0 + 2.8);
  } catch (e) {
    /* nada */
  }
}
