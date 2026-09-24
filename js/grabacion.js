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

const DB_NOMBRE = "mochi_videos";
const DB_VERSION = 1;
const PEDAZOS = "pedazos"; // { clave: [id, n], id, n, blob }
const VIDEOS = "videos"; // { id, mime, empezo, termino, ensayo, pedazos }
const MS_PEDAZO = 2000;
const TOPE_MS = 20 * 60000; // por si nunca se corta: 20 minutos

const TIPOS = ["video/mp4;codecs=avc1,mp4a", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];

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

function microAbierto() {
  return !!microVivo && microVivo.getAudioTracks().some((t) => t.readyState === "live");
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
  try {
    microVivo = await navigator.mediaDevices.getUserMedia({ audio: RESTRICCIONES.audio });
    return true;
  } catch (e) {
    microVivo = null;
    return false;
  }
}

export function soltarMicrofono() {
  if (!actual) cerrarMicrofono();
}

function cerrarMicrofono() {
  if (microVivo) for (const t of microVivo.getTracks()) t.stop();
  microVivo = null;
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

async function empezarDeVerdad({ ensayo = false } = {}) {
  if (actual || !sePuedeGrabar()) return !!actual;
  // la imagen, y el sonido: el microfono que quedo abierto desde el toque
  // (o, si no hay, se intenta abrir ahora); sin microfono, igual se graba
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: RESTRICCIONES.video });
  } catch (e) {
    return false;
  }
  if (!microAbierto()) await abrirMicrofono();
  if (microAbierto()) for (const t of microVivo.getAudioTracks()) stream.addTrack(t);
  const conAudio = stream.getAudioTracks().length > 0;
  const mime = tipoSoportado();
  let rec;
  try {
    rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 2500000 });
  } catch (e) {
    for (const p of stream.getTracks()) p.stop();
    return false;
  }
  const id = `video_${Date.now()}`;
  const g = { id, rec, stream, n: 0, empezo: Date.now(), mime: rec.mimeType || mime || "video/mp4", ensayo, timerTope: 0, conAudio };
  actual = g;
  if (ensayo) await borrarEnsayos(id);
  await tx(VIDEOS, "readwrite", (s) => s.put({ id, mime: g.mime, empezo: g.empezo, termino: null, ensayo, pedazos: 0, conAudio }));
  rec.ondataavailable = (ev) => {
    if (!ev.data || !ev.data.size) return;
    const n = g.n++;
    tx(PEDAZOS, "readwrite", (s) => s.put({ clave: [id, n], id, n, blob: ev.data }));
    tx(VIDEOS, "readwrite", (s) => s.put({ id, mime: g.mime, empezo: g.empezo, termino: Date.now(), ensayo, pedazos: g.n, conAudio }));
  };
  rec.onerror = () => detener();
  // si le cortan la camara (una llamada), se cierra lo que haya
  for (const p of stream.getTracks()) p.addEventListener("ended", () => detener());
  try {
    rec.start(MS_PEDAZO);
  } catch (e) {
    actual = null;
    for (const p of stream.getTracks()) p.stop();
    return false;
  }
  g.timerTope = setTimeout(() => detener(), TOPE_MS);
  window.addEventListener("pagehide", detener, { once: true });
  puntoRec(true);
  return true;
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
  return { blob: new Blob(pedazos.map((p) => p.blob), { type: tipo }), mime: tipo, empezo: v.empezo, conAudio: v.conAudio !== false };
}

export async function hayVideo({ ensayo = false } = {}) {
  return (await listarVideos()).some((v) => !!v.ensayo === !!ensayo && v.pedazos > 0);
}
