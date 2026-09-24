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

/** "granted" | "denied" | "prompt" | "desconocido" para camara y microfono juntos. */
export async function estadoPermisos() {
  if (!sePuedeGrabar()) return "sin-soporte";
  try {
    if (!navigator.permissions) return "desconocido";
    const [c, m] = await Promise.all([navigator.permissions.query({ name: "camera" }), navigator.permissions.query({ name: "microphone" })]);
    if (c.state === "granted" && m.state === "granted") return "granted";
    if (c.state === "denied" || m.state === "denied") return "denied";
    return "prompt";
  } catch (e) {
    return "desconocido"; // (Safari viejo no deja preguntar: se pide y listo)
  }
}

/**
 * Pide camara frontal + microfono y los suelta enseguida. Llamar dentro
 * de un toque. Devuelve true si quedaron permitidos.
 */
export async function pedirPermisos() {
  if (!sePuedeGrabar()) return false;
  try {
    const s = await navigator.mediaDevices.getUserMedia(RESTRICCIONES);
    for (const p of s.getTracks()) p.stop();
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Revisa y, si hace falta, pide otra vez (rom: "verificamos antes de
 * comenzar la secuencia que tengamos los permisos, si no los pedimos
 * otra vez para asegurar"). Llamar dentro de un toque.
 */
export async function asegurarPermisos() {
  const e = await estadoPermisos();
  if (e === "granted") return true;
  return pedirPermisos();
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
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia(RESTRICCIONES);
  } catch (e) {
    try {
      // sin microfono, por lo menos la imagen
      stream = await navigator.mediaDevices.getUserMedia({ video: RESTRICCIONES.video });
    } catch (e2) {
      return false;
    }
  }
  const mime = tipoSoportado();
  let rec;
  try {
    rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 2500000 });
  } catch (e) {
    for (const p of stream.getTracks()) p.stop();
    return false;
  }
  const id = `video_${Date.now()}`;
  const g = { id, rec, stream, n: 0, empezo: Date.now(), mime: rec.mimeType || mime || "video/mp4", ensayo, timerTope: 0 };
  actual = g;
  if (ensayo) await borrarEnsayos(id);
  await tx(VIDEOS, "readwrite", (s) => s.put({ id, mime: g.mime, empezo: g.empezo, termino: null, ensayo, pedazos: 0 }));
  rec.ondataavailable = (ev) => {
    if (!ev.data || !ev.data.size) return;
    const n = g.n++;
    tx(PEDAZOS, "readwrite", (s) => s.put({ clave: [id, n], id, n, blob: ev.data }));
    tx(VIDEOS, "readwrite", (s) => s.put({ id, mime: g.mime, empezo: g.empezo, termino: Date.now(), ensayo, pedazos: g.n }));
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
  return { blob: new Blob(pedazos.map((p) => p.blob), { type: tipo }), mime: tipo, empezo: v.empezo };
}

export async function hayVideo({ ensayo = false } = {}) {
  return (await listarVideos()).some((v) => !!v.ensayo === !!ensayo && v.pedazos > 0);
}
