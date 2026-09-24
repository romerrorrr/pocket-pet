/**
 * grabacion.js
 * =============
 * v21: el video del momento. Cuando empieza la secuencia de la propuesta
 * se graba con la camara FRONTAL y el microfono (video real, sin el
 * filtro pixel), pase lo que pase en la pantalla.
 *
 *   - Los permisos se piden antes (modo director) y se revisan otra vez
 *     justo antes de la secuencia (en el toque de "Take the photo"): si
 *     faltan, se piden ahi mismo.
 *   - Se graba en pedacitos de 2 s que se guardan en IndexedDB al toque:
 *     si el telefono se bloquea o la app se cierra, lo grabado queda.
 *   - Si algo falla (sin permiso, sin MediaRecorder, sin espacio), la
 *     secuencia sigue igual: el video nunca la frena.
 *
 * Despues, el video se arma de nuevo con todos sus pedacitos y se puede
 * guardar en la galeria (galeria.js).
 */

import { capturaDeAudio } from "./sonido.js";

const DB_NOMBRE = "mochi_videos";
const DB_VERSION = 1;
const PEDAZOS = "pedazos"; // { clave: [id, n], id, n, blob }
const VIDEOS = "videos"; // { id, mime, empezo, termino, ensayo, pedazos }
const MS_PEDAZO = 2000;
const TOPE_MS = 20 * 60000; // por si nunca se corta: 20 minutos

// v21.2: "video/mp4" solo (Safari elige H.264 + AAC); pedir codecs a mano
// arriesga que deje el audio afuera.
const TIPOS = ["video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];

let db = null;
let actual = null; // { id, rec, stream, n, empezo, timerTope }

function abrirDB() {
  if (db) return Promise.resolve(db);
  return new Promise((resolve) => {
    try {
      const pedido = indexedDB.open(DB_NOMBRE, DB_VERSION);
      pedido.onupgradeneeded = () => {
        const d = pedido.result;
        if (!d.objectStoreNames.contains(PEDAZOS)) d.createObjectStore(PEDAZOS, { keyPath: "clave" }).createIndex("id", "id");
        if (!d.objectStoreNames.contains(VIDEOS)) d.createObjectStore(VIDEOS, { keyPath: "id" });
      };
      pedido.onsuccess = () => {
        db = pedido.result;
        resolve(db);
      };
      pedido.onerror = () => resolve(null);
      pedido.onblocked = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

function tx(tienda, modo, fn) {
  return abrirDB().then(
    (d) =>
      new Promise((resolve) => {
        if (!d) return resolve(null);
        try {
          const t = d.transaction(tienda, modo);
          const r = fn(t.objectStore(tienda));
          t.oncomplete = () => resolve(r && "result" in r ? r.result : true);
          t.onerror = () => resolve(null);
          t.onabort = () => resolve(null);
        } catch (e) {
          resolve(null);
        }
      }),
  );
}

export function sePuedeGrabar() {
  return !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
}

function tipoSoportado() {
  for (const t of TIPOS) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t;
    } catch (e) {
      /* sigue */
    }
  }
  return "";
}

const RESTRICCIONES = {
  video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
  audio: { echoCancellation: true, noiseSuppression: true },
};

// v21.1 (rom: "el video salio sin audio; solo pidio permiso de camara").
// En iPhone, el microfono se pide APARTE y dentro del toque, y el microfono
// abierto se guarda vivo hasta que empieza la grabacion (asi no hay que
// volver a pedirlo fuera del toque, donde iOS lo niega sin preguntar).
let microVivo = null; // MediaStream solo de audio, abierto desde un toque
let probandoMic = false;

const pistaSana = (t) => t.readyState === "live" && !t.muted;

function microAbierto() {
  return !!microVivo && microVivo.getAudioTracks().some(pistaSana);
}

// v21.2: la sesion de audio de iOS en "play-and-record" mientras haya un
// microfono abierto (en "ambient"/"playback" Safari corta el microfono:
// por eso el video salia mudo). Ver sonido.js.
function actualizarCaptura() {
  const grabandoAudio = !!actual && actual.stream.getAudioTracks().some((t) => t.readyState === "live");
  capturaDeAudio(probandoMic || grabandoAudio || (!!microVivo && microVivo.getAudioTracks().some((t) => t.readyState === "live")));
}

/** Guarda la ultima prueba del microfono (para la lista del modo director). */
const CLAVE_PRUEBA = "baozi_prueba_mic";
function anotarPrueba(r) {
  try {
    localStorage.setItem(CLAVE_PRUEBA, JSON.stringify({ ok: !!r.ok, pico: r.pico, t: Date.now() }));
  } catch (e) {
    /* nada */
  }
}
export function ultimaPruebaMic() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_PRUEBA) || "null");
  } catch (e) {
    return null;
  }
}

// Con que nivel (0..1, pico de la onda) se considera que "se escucha algo".
// Un microfono cortado da 0 exacto; una voz normal pasa de 0.1.
export const UMBRAL_SONIDO = 0.02;

/**
 * Un medidor de volumen sobre un microfono. Solo para las pruebas del modo
 * director (en el final de verdad no se mide nada: no se toca el audio que
 * esta sonando). `ctx` es un AudioContext creado dentro del toque.
 */
function medidor(stream, ctx) {
  if (!ctx || !stream || !stream.getAudioTracks().length) return null;
  let fuente;
  let an;
  try {
    if (ctx.state !== "running") ctx.resume().catch(() => {});
    fuente = ctx.createMediaStreamSource(new MediaStream(stream.getAudioTracks()));
    an = ctx.createAnalyser();
    an.fftSize = 1024;
    fuente.connect(an);
  } catch (e) {
    return null;
  }
  const buf = new Uint8Array(an.fftSize);
  const m = { nivel: 0, pico: 0, medido: false };
  const iv = setInterval(() => {
    if (ctx.state !== "running") return;
    an.getByteTimeDomainData(buf);
    let max = 0;
    for (let i = 0; i < buf.length; i++) {
      const d = Math.abs(buf[i] - 128);
      if (d > max) max = d;
    }
    m.nivel = max / 128;
    m.medido = true;
    if (m.nivel > m.pico) m.pico = m.nivel;
  }, 80);
  m.parar = () => {
    clearInterval(iv);
    try {
      fuente.disconnect();
    } catch (e) {
      /* nada */
    }
  };
  return m;
}

/** Un AudioContext para medir: crearlo DENTRO del toque (si no, iOS lo deja dormido). */
export function contextoParaMedir() {
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;
  try {
    const c = new C();
    c.resume().catch(() => {});
    return c;
  } catch (e) {
    return null;
  }
}

/**
 * v21.2 (rom: "un boton para permitir el mic, asegurando que grabe con
 * sonido"). Abre el microfono, escucha `ms` milisegundos mostrando el
 * nivel con `alNivel(0..1)`, y dice si de verdad entra sonido.
 * Devuelve { ok, pico, medido, error }. Llamar dentro del toque.
 */
export async function probarMicrofono({ ctx = null, alNivel = null, ms = 4000 } = {}) {
  if (!sePuedeGrabar()) return { ok: false, pico: null, medido: false, error: "sin-soporte" };
  probandoMic = true;
  actualizarCaptura(); // antes de pedir el microfono
  let s = null;
  try {
    s = await navigator.mediaDevices.getUserMedia({ audio: RESTRICCIONES.audio });
  } catch (e) {
    probandoMic = false;
    actualizarCaptura();
    const r = { ok: false, pico: null, medido: false, error: (e && e.name) || "error" };
    anotarPrueba(r);
    return r;
  }
  const pista = s.getAudioTracks()[0];
  const m = medidor(s, ctx);
  await new Promise((listo) => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      if (m && alNivel) alNivel(m.nivel);
      if (Date.now() - t0 >= ms) {
        clearInterval(iv);
        listo();
      }
    }, 80);
  });
  const viva = !!pista && pista.readyState === "live";
  const muda = !!pista && pista.muted;
  const medido = !!(m && m.medido);
  const pico = m ? m.pico : null;
  let error = null;
  if (!pista) error = "sin-pista";
  else if (!viva) error = "cortado";
  else if (muda) error = "silenciado";
  else if (medido && pico === 0) error = "cero";
  else if (medido && pico <= UMBRAL_SONIDO) error = "bajito";
  const r = { ok: !error, pico, medido, error };
  if (m) m.parar();
  for (const p of s.getTracks()) p.stop();
  probandoMic = false;
  actualizarCaptura();
  anotarPrueba(r);
  return r;
}

async function consultar(nombre) {
  try {
    if (!navigator.permissions) return "desconocido";
    return (await navigator.permissions.query({ name: nombre })).state;
  } catch (e) {
    return "desconocido"; // (Safari viejo no deja preguntar: se pide y listo)
  }
}

/** { camara, microfono }: "granted" | "denied" | "prompt" | "desconocido". */
export async function detallePermisos() {
  if (!sePuedeGrabar()) return { camara: "sin-soporte", microfono: "sin-soporte" };
  const [camara, microfono] = await Promise.all([consultar("camera"), consultar("microphone")]);
  return { camara, microfono: microAbierto() ? "granted" : microfono };
}

/** "granted" | "denied" | "prompt" | "desconocido" | "sin-soporte" para los dos juntos. */
export async function estadoPermisos() {
  const { camara, microfono } = await detallePermisos();
  if (camara === "sin-soporte") return "sin-soporte";
  if (camara === "granted" && microfono === "granted") return "granted";
  if (camara === "denied" || microfono === "denied") return "denied";
  if (camara === "desconocido" || microfono === "desconocido") return "desconocido";
  return "prompt";
}

/** Abre el microfono (dentro de un toque) y lo deja abierto para la grabacion. */
export async function abrirMicrofono() {
  if (microAbierto()) return true;
  if (microVivo) cerrarMicrofono(); // uno cortado o silenciado no sirve: se abre otro
  capturaDeAudio(true); // la sesion de iOS lista para grabar ANTES de pedirlo
  try {
    microVivo = await navigator.mediaDevices.getUserMedia({ audio: RESTRICCIONES.audio });
  } catch (e) {
    microVivo = null;
  }
  actualizarCaptura();
  return microAbierto();
}

export function soltarMicrofono() {
  if (!actual) cerrarMicrofono();
}

function cerrarMicrofono() {
  if (microVivo) for (const t of microVivo.getTracks()) t.stop();
  microVivo = null;
  actualizarCaptura();
}

/**
 * Pide el microfono y la camara frontal, cada uno por su lado (asi iOS
 * muestra los dos carteles). Llamar dentro de un toque.
 * Devuelve { camara: bool, microfono: bool }.
 */
export async function pedirPermisos({ dejarMicAbierto = false } = {}) {
  if (!sePuedeGrabar()) return { camara: false, microfono: false };
  const microfono = await abrirMicrofono();
  let camara = false;
  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: RESTRICCIONES.video });
    for (const p of s.getTracks()) p.stop();
    camara = true;
  } catch (e) {
    camara = false;
  }
  if (!dejarMicAbierto) cerrarMicrofono();
  return { camara, microfono };
}

/**
 * Justo antes de la secuencia, en el toque de "Take the photo" (rom:
 * "verificamos que tengamos los permisos, si no los pedimos otra vez").
 * Abre el microfono ahi mismo y lo deja listo para el video.
 */
export async function asegurarPermisos() {
  const r = await pedirPermisos({ dejarMicAbierto: true });
  return r.camara && r.microfono;
}

export const grabando = () => !!actual;

let arrancando = null;

/** Empieza a grabar. Nunca tira error: si no se puede, devuelve false. */
export function empezar(opts = {}) {
  if (arrancando) return arrancando;
  arrancando = empezarDeVerdad(opts).finally(() => {
    arrancando = null;
  });
  return arrancando;
}

function puntoRec(si) {
  let p = document.getElementById("rec-punto");
  if (si && !p) {
    p = document.createElement("div");
    p.id = "rec-punto";
    p.className = "rec-punto";
    p.setAttribute("aria-hidden", "true");
    document.body.appendChild(p);
  } else if (!si && p) p.remove();
}

async function empezarDeVerdad({ ensayo = false, ctxMedidor = null } = {}) {
  if (actual || !sePuedeGrabar()) return !!actual;
  capturaDeAudio(true); // v21.2: sin esto iOS corta el microfono (ver sonido.js)
  // la imagen, y el sonido: el microfono que quedo abierto desde el toque
  // (o, si no hay, se intenta abrir ahora); sin microfono, igual se graba
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: RESTRICCIONES.video });
  } catch (e) {
    actualizarCaptura();
    return false;
  }
  if (!microAbierto()) await abrirMicrofono();
  if (microAbierto()) for (const t of microVivo.getAudioTracks()) if (pistaSana(t)) stream.addTrack(t);
  const conAudio = stream.getAudioTracks().length > 0;
  const mime = tipoSoportado();
  let rec;
  try {
    rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 2500000 });
  } catch (e) {
    for (const p of stream.getTracks()) p.stop();
    cerrarMicrofono();
    return false;
  }
  const id = `video_${Date.now()}`;
  const g = { id, rec, stream, n: 0, empezo: Date.now(), mime: rec.mimeType || mime || "video/mp4", ensayo, timerTope: 0, conAudio, medidor: ctxMedidor ? medidor(stream, ctxMedidor) : null };
  actual = g;
  if (ensayo) await borrarEnsayos(id);
  await tx(VIDEOS, "readwrite", (s) => s.put({ id, mime: g.mime, empezo: g.empezo, termino: null, ensayo, pedazos: 0, conAudio }));
  rec.ondataavailable = (ev) => {
    if (!ev.data || !ev.data.size) return;
    const n = g.n++;
    tx(PEDAZOS, "readwrite", (s) => s.put({ clave: [id, n], id, n, blob: ev.data }));
    tx(VIDEOS, "readwrite", (s) => s.put(metaDe(g, Date.now())));
  };
  rec.onerror = () => detener();
  // si le cortan la camara (una llamada), se cierra lo que haya; si se
  // corta solo el microfono, el video sigue (mejor mudo que nada)
  for (const p of stream.getVideoTracks()) p.addEventListener("ended", () => detener());
  try {
    rec.start(MS_PEDAZO);
  } catch (e) {
    actual = null;
    if (g.medidor) g.medidor.parar();
    for (const p of stream.getTracks()) p.stop();
    cerrarMicrofono();
    return false;
  }
  g.timerTope = setTimeout(() => detener(), TOPE_MS);
  window.addEventListener("pagehide", detener, { once: true });
  puntoRec(true);
  return true;
}

function metaDe(g, termino) {
  const m = g.medidor;
  return { id: g.id, mime: g.mime, empezo: g.empezo, termino, ensayo: g.ensayo, pedazos: g.n, conAudio: g.conAudio, picoAudio: m && m.medido ? m.pico : null };
}

/** El nivel del microfono ahora (0..1) si la grabacion se esta midiendo; si no, null. */
export function nivelActual() {
  return actual && actual.medidor && actual.medidor.medido ? actual.medidor.nivel : null;
}

/** Corta la grabacion (el ultimo pedacito se guarda solo). */
export function detener() {
  const g = actual;
  if (!g) return Promise.resolve(null);
  actual = null;
  clearTimeout(g.timerTope);
  puntoRec(false);
  return new Promise((resolve) => {
    const fin = () => {
      for (const p of g.stream.getTracks()) p.stop();
      cerrarMicrofono();
      if (g.medidor) {
        g.medidor.parar();
        tx(VIDEOS, "readwrite", (s) => s.put(metaDe(g, Date.now())));
      }
      // un respiro para que se escriba el ultimo pedazo
      setTimeout(() => resolve(g.id), 400);
    };
    try {
      if (g.rec.state !== "inactive") {
        g.rec.addEventListener("stop", fin, { once: true });
        g.rec.stop();
      } else fin();
    } catch (e) {
      fin();
    }
  });
}

async function listarVideos() {
  const todos = await tx(VIDEOS, "readonly", (s) => s.getAll());
  return (todos || []).sort((a, b) => a.empezo - b.empezo);
}

async function borrarEnsayos(salvo) {
  const vs = await listarVideos();
  for (const v of vs) {
    if (!v.ensayo || v.id === salvo) continue;
    await tx(PEDAZOS, "readwrite", (s) => {
      for (let n = 0; n <= v.pedazos; n++) s.delete([v.id, n]);
    });
    await tx(VIDEOS, "readwrite", (s) => s.delete(v.id));
  }
}

/** El ultimo video (el de la propuesta; con ensayo=true, el del ensayo), como { blob, mime, empezo } o null. */
export async function ultimoVideo({ ensayo = false } = {}) {
  const vs = (await listarVideos()).filter((v) => !!v.ensayo === !!ensayo && v.pedazos > 0);
  const v = vs[vs.length - 1];
  if (!v) return null;
  const pedazos = await tx(PEDAZOS, "readonly", (s) => s.index("id").getAll(v.id));
  if (!pedazos || !pedazos.length) return null;
  pedazos.sort((a, b) => a.n - b.n);
  const tipo = (v.mime || "video/mp4").split(";")[0];
  return { blob: new Blob(pedazos.map((p) => p.blob), { type: tipo }), mime: tipo, empezo: v.empezo, conAudio: v.conAudio !== false, picoAudio: typeof v.picoAudio === "number" ? v.picoAudio : null };
}

export async function hayVideo({ ensayo = false } = {}) {
  return (await listarVideos()).some((v) => !!v.ensayo === !!ensayo && v.pedazos > 0);
}
