/**
 * despierto.js
 * =============
 * Dos seguros para el final, los dos del mismo tipo: cosas que el
 * telefono hace "por las suyas" y que no pueden pasar mientras rom esta
 * arrodillado.
 *
 * 1. PANTALLA ENCENDIDA. Despues de "Now… look up" nadie toca el
 *    telefono mientras el pregunta — y el bloqueo automatico de iOS
 *    (30 s) la apagaria en su mano. Se usa Wake Lock; donde no existe
 *    (iOS instalado antes de 18.4) el truco clasico: un video mudo de
 *    16x16 px en loop mantiene la pantalla viva.
 *
 * 2. MUSICA CON EL SWITCH DE SILENCIO. En iOS 15-16 el audio web se calla
 *    si el telefono esta en silencio. Un <audio> (silencio real, 1 s en
 *    loop) iniciado DENTRO de un toque pone la sesion de audio en modo
 *    "reproduccion" y la musica del final suena igual. Solo se usa
 *    durante el final: si no, cortaria la musica que ella este
 *    escuchando cada vez que abre la app.
 *
 * Todo falla en silencio: si algo no se puede, el juego sigue igual.
 */

import { arte } from "./arte.js";
import { modoDeAudio } from "./sonido.js";

// Safari no reproduce bien un <video>/<audio> que le entrega el service
// worker sin soporte de rangos: se bajan una vez como Blob y se usan con
// un URL local (no pasa por el service worker y anda sin señal).
const locales = {};
function precargar(ruta) {
  try {
    fetch(arte(ruta))
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (b) locales[ruta] = URL.createObjectURL(b);
      })
      .catch(() => {});
  } catch (e) {
    /* nada */
  }
}
const local = (ruta) => locales[ruta] || arte(ruta);
setTimeout(() => {
  precargar("final/despierto.mp4");
  precargar("final/silencio.mp3");
}, 3000);

let bloqueo = null;
let video = null;
let audio = null;
let activo = false;

async function pedirWakeLock() {
  try {
    if (!("wakeLock" in navigator)) return false;
    if (bloqueo) return true;
    bloqueo = await navigator.wakeLock.request("screen");
    bloqueo.addEventListener("release", () => {
      bloqueo = null;
    });
    return true;
  } catch (e) {
    bloqueo = null;
    return false;
  }
}

function videoDeRespaldo() {
  if (video) {
    video.play().catch(() => {});
    return;
  }
  video = document.createElement("video");
  video.setAttribute("playsinline", "");
  video.setAttribute("muted", "");
  video.muted = true;
  video.loop = true;
  video.src = local("final/despierto.mp4");
  video.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;pointer-events:none;";
  document.body.appendChild(video);
  video.play().catch(() => {});
}

/** Llamar idealmente dentro de un toque (en iOS el <audio> lo necesita). */
export async function mantener() {
  activo = true;
  modoDeAudio("playback");
  // el <audio> primero, todavia dentro del toque (despues de un await iOS ya no lo deja)
  try {
    if (!audio) {
      audio = new Audio(local("final/silencio.mp3"));
      audio.loop = true;
      audio.volume = 0.01;
      audio.setAttribute("playsinline", "");
    }
    audio.play().catch(() => {});
  } catch (e) {
    /* nada */
  }
  const ok = await pedirWakeLock();
  if (!ok) videoDeRespaldo();
}

export function soltar() {
  activo = false;
  if (bloqueo) {
    bloqueo.release().catch(() => {});
    bloqueo = null;
  }
  if (video) video.pause();
  if (audio) audio.pause();
  modoDeAudio("ambient");
}

// Al volver a primer plano el Wake Lock se pierde solo: se vuelve a pedir.
document.addEventListener("visibilitychange", () => {
  if (activo && document.visibilityState === "visible") {
    pedirWakeLock().then((ok) => {
      if (!ok) videoDeRespaldo();
    });
    if (audio) audio.play().catch(() => {});
  }
});
