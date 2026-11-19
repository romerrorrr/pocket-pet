import { capturaDeAudio } from "./sonido.js";

const DB_NOMBRE = "mochi_videos";

const DB_VERSION = 1;

const PEDAZOS = "pedazos";

const VIDEOS = "videos";

const MS_PEDAZO = 2e3;

const TOPE_MS = 20 * 6e4;

const TIPOS = [ "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm" ];

let db = null;

let actual = null;

function abrirDB() {
    if (db) return Promise.resolve(db);
    return new Promise((resolve => {
        try {
            const pedido = indexedDB.open(DB_NOMBRE, DB_VERSION);
            pedido.onupgradeneeded = () => {
                const d = pedido.result;
                if (!d.objectStoreNames.contains(PEDAZOS)) d.createObjectStore(PEDAZOS, {
                    keyPath: "clave"
                }).createIndex("id", "id");
                if (!d.objectStoreNames.contains(VIDEOS)) d.createObjectStore(VIDEOS, {
                    keyPath: "id"
                });
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
    }));
}

function tx(tienda, modo, fn) {
    return abrirDB().then((d => new Promise((resolve => {
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
    }))));
}

export function sePuedeGrabar() {
    return !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
}

function tipoSoportado() {
    for (const t of TIPOS) {
        try {
            if (MediaRecorder.isTypeSupported(t)) return t;
        } catch (e) {}
    }
    return "";
}

const RESTRICCIONES = {
    video: {
        facingMode: {
            ideal: "user"
        },
        width: {
            ideal: 1280
        },
        height: {
            ideal: 720
        },
        frameRate: {
            ideal: 30
        }
    },
    audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
    }
};

export const TOPE_PERMISOS_MS = 8e3;

const esperar = ms => new Promise((r => setTimeout(r, ms)));

function pedirMedios(restricciones, ms = TOPE_PERMISOS_MS) {
    return new Promise(((resolve, reject) => {
        let listo = false;
        const tm = setTimeout((() => {
            listo = true;
            reject(Object.assign(new Error("timeout"), {
                name: "TimeoutError"
            }));
        }), ms);
        navigator.mediaDevices.getUserMedia(restricciones).then((s => {
            if (restricciones.video) camaraOk = true;
            if (listo) {
                for (const t of s.getTracks()) t.stop();
                return;
            }
            listo = true;
            clearTimeout(tm);
            resolve(s);
        }), (e => {
            if (listo) return;
            listo = true;
            clearTimeout(tm);
            reject(e);
        }));
    }));
}

let camaraOk = false;

export const camaraConcedida = () => camaraOk;

let microVivo = null;

let probandoMic = false;

const pistaSana = t => t.readyState === "live" && !t.muted;

function microAbierto() {
    return !!microVivo && microVivo.getAudioTracks().some(pistaSana);
}

function actualizarCaptura() {
    const grabandoAudio = !!actual && actual.stream.getAudioTracks().some((t => t.readyState === "live"));
    capturaDeAudio(probandoMic || grabandoAudio || !!microVivo && microVivo.getAudioTracks().some((t => t.readyState === "live")));
}

const CLAVE_PRUEBA = "baozi_prueba_mic";

function anotarPrueba(r) {
    try {
        localStorage.setItem(CLAVE_PRUEBA, JSON.stringify({
            ok: !!r.ok,
            pico: r.pico,
            t: Date.now()
        }));
    } catch (e) {}
}

export function ultimaPruebaMic() {
    try {
        return JSON.parse(localStorage.getItem(CLAVE_PRUEBA) || "null");
    } catch (e) {
        return null;
    }
}

export const UMBRAL_SONIDO = .02;

function medidor(stream, ctx) {
    if (!ctx || !stream || !stream.getAudioTracks().length) return null;
    let fuente;
    let an;
    try {
        if (ctx.state !== "running") ctx.resume().catch((() => {}));
        fuente = ctx.createMediaStreamSource(new MediaStream(stream.getAudioTracks()));
        an = ctx.createAnalyser();
        an.fftSize = 1024;
        fuente.connect(an);
    } catch (e) {
        return null;
    }
    const buf = new Uint8Array(an.fftSize);
    const m = {
        nivel: 0,
        pico: 0,
        medido: false
    };
    const iv = setInterval((() => {
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
    }), 80);
    m.parar = () => {
        clearInterval(iv);
        try {
            fuente.disconnect();
        } catch (e) {}
    };
    return m;
}

export function contextoParaMedir() {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try {
        const c = new C;
        c.resume().catch((() => {}));
        return c;
    } catch (e) {
        return null;
    }
}

export async function probarMicrofono({ctx: ctx = null, alNivel: alNivel = null, ms: ms = 4e3} = {}) {
    if (!sePuedeGrabar()) return {
        ok: false,
        pico: null,
        medido: false,
        error: "sin-soporte"
    };
    probandoMic = true;
    actualizarCaptura();
    let s = null;
    try {
        s = await pedirMedios({
            audio: RESTRICCIONES.audio
        });
    } catch (e) {
        probandoMic = false;
        actualizarCaptura();
        const r = {
            ok: false,
            pico: null,
            medido: false,
            error: e && e.name || "error"
        };
        anotarPrueba(r);
        return r;
    }
    const pista = s.getAudioTracks()[0];
    const m = medidor(s, ctx);
    await new Promise((listo => {
        const t0 = Date.now();
        const iv = setInterval((() => {
            if (m && alNivel) alNivel(m.nivel);
            if (Date.now() - t0 >= ms) {
                clearInterval(iv);
                listo();
            }
        }), 80);
    }));
    const viva = !!pista && pista.readyState === "live";
    const muda = !!pista && pista.muted;
    const medido = !!(m && m.medido);
    const pico = m ? m.pico : null;
    let error = null;
    if (!pista) error = "sin-pista"; else if (!viva) error = "cortado"; else if (muda) error = "silenciado"; else if (medido && pico === 0) error = "cero"; else if (medido && pico <= UMBRAL_SONIDO) error = "bajito";
    const r = {
        ok: !error,
        pico: pico,
        medido: medido,
        error: error
    };
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
        return (await navigator.permissions.query({
            name: nombre
        })).state;
    } catch (e) {
        return "desconocido";
    }
}

export async function detallePermisos() {
    if (!sePuedeGrabar()) return {
        camara: "sin-soporte",
        microfono: "sin-soporte"
    };
    const [camara, microfono] = await Promise.all([ consultar("camera"), consultar("microphone") ]);
    return {
        camara: camara,
        microfono: microAbierto() ? "granted" : microfono
    };
}

export async function estadoPermisos() {
    const {camara: camara, microfono: microfono} = await detallePermisos();
    if (camara === "sin-soporte") return "sin-soporte";
    if (camara === "granted" && microfono === "granted") return "granted";
    if (camara === "denied" || microfono === "denied") return "denied";
    if (camara === "desconocido" || microfono === "desconocido") return "desconocido";
    return "prompt";
}

let abriendoMic = null;

let generacionMic = 0;

export function abrirMicrofono() {
    if (microAbierto()) return Promise.resolve(true);
    if (abriendoMic) return abriendoMic;
    if (microVivo) cerrarMicrofono();
    if (!sePuedeGrabar()) return Promise.resolve(false);
    capturaDeAudio(true);
    const gen = generacionMic;
    let intento;
    try {
        intento = navigator.mediaDevices.getUserMedia({
            audio: RESTRICCIONES.audio
        }).then((s => {
            if (gen !== generacionMic || microAbierto()) for (const t of s.getTracks()) t.stop(); else microVivo = s;
        }), (() => {}));
    } catch (e) {
        intento = Promise.resolve();
    }
    const fin = intento.then((() => {
        actualizarCaptura();
        return microAbierto();
    }));
    abriendoMic = Promise.race([ fin, esperar(TOPE_PERMISOS_MS).then((() => microAbierto())) ]).finally((() => {
        abriendoMic = null;
    }));
    return abriendoMic;
}

export function soltarMicrofono() {
    if (!actual && !arrancando) cerrarMicrofono();
}

function cerrarMicrofono() {
    generacionMic += 1;
    if (microVivo) for (const t of microVivo.getTracks()) t.stop();
    microVivo = null;
    actualizarCaptura();
}

export async function pedirPermisos({dejarMicAbierto: dejarMicAbierto = false} = {}) {
    if (!sePuedeGrabar()) return {
        camara: false,
        microfono: false
    };
    const microfono = await abrirMicrofono();
    let camara = false;
    if (actual) camara = true; else {
        try {
            const s = await pedirMedios({
                video: RESTRICCIONES.video
            });
            for (const p of s.getTracks()) p.stop();
            camara = true;
        } catch (e) {
            camara = false;
        }
    }
    if (!dejarMicAbierto) cerrarMicrofono();
    return {
        camara: camara,
        microfono: microfono
    };
}

export function asegurarPermisos({tope: tope = TOPE_PERMISOS_MS} = {}) {
    const pedido = pedirPermisos({
        dejarMicAbierto: true
    }).then((r => r.camara && r.microfono)).catch((() => false));
    return Promise.race([ pedido, esperar(tope).then((() => false)) ]);
}

export const grabando = () => !!actual;

let arrancando = null;

export function empezar(opts = {}) {
    if (arrancando) return arrancando;
    arrancando = empezarDeVerdad(opts).finally((() => {
        arrancando = null;
    }));
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

let generacion = 0;

async function empezarDeVerdad({ensayo: ensayo = false, ctxMedidor: ctxMedidor = null, alEmpezar: alEmpezar = null} = {}) {
    if (actual || !sePuedeGrabar()) return !!actual;
    const gen = generacion;
    const cancelado = () => gen !== generacion;
    capturaDeAudio(true);
    let stream;
    try {
        stream = await pedirMedios({
            video: RESTRICCIONES.video
        });
    } catch (e) {
        actualizarCaptura();
        return false;
    }
    const soltarImagen = () => {
        for (const p of stream.getVideoTracks()) p.stop();
        actualizarCaptura();
    };
    if (cancelado()) {
        soltarImagen();
        return false;
    }
    if (!microAbierto()) await abrirMicrofono();
    if (cancelado()) {
        soltarImagen();
        return false;
    }
    if (microAbierto()) for (const t of microVivo.getAudioTracks()) if (pistaSana(t)) stream.addTrack(t);
    const conAudio = stream.getAudioTracks().length > 0;
    const mime = tipoSoportado();
    let rec;
    try {
        rec = new MediaRecorder(stream, {
            ...mime ? {
                mimeType: mime
            } : {},
            videoBitsPerSecond: 25e5
        });
    } catch (e) {
        for (const p of stream.getTracks()) p.stop();
        cerrarMicrofono();
        return false;
    }
    const id = `video_${Date.now()}`;
    const g = {
        id: id,
        rec: rec,
        stream: stream,
        n: 0,
        empezo: Date.now(),
        mime: rec.mimeType || mime || "video/mp4",
        ensayo: ensayo,
        timerTope: 0,
        conAudio: conAudio,
        medidor: null
    };
    if (ensayo) await borrarEnsayos(id);
    await tx(VIDEOS, "readwrite", (s => s.put({
        id: id,
        mime: g.mime,
        empezo: g.empezo,
        termino: null,
        ensayo: ensayo,
        pedazos: 0,
        conAudio: conAudio
    })));
    if (cancelado()) {
        for (const p of stream.getTracks()) p.stop();
        cerrarMicrofono();
        return false;
    }
    g.medidor = ctxMedidor ? medidor(stream, ctxMedidor) : null;
    actual = g;
    rec.ondataavailable = ev => {
        if (!ev.data || !ev.data.size) return;
        const n = g.n++;
        tx(PEDAZOS, "readwrite", (s => s.put({
            clave: [ id, n ],
            id: id,
            n: n,
            blob: ev.data
        })));
        tx(VIDEOS, "readwrite", (s => s.put(metaDe(g, Date.now()))));
    };
    const detenerEsta = () => {
        if (actual === g) detener();
    };
    rec.onerror = detenerEsta;
    for (const p of stream.getVideoTracks()) p.addEventListener("ended", detenerEsta);
    try {
        rec.start(MS_PEDAZO);
    } catch (e) {
        actual = null;
        if (g.medidor) g.medidor.parar();
        for (const p of stream.getTracks()) p.stop();
        cerrarMicrofono();
        return false;
    }
    g.timerTope = setTimeout(detenerEsta, TOPE_MS);
    window.addEventListener("pagehide", detenerEsta, {
        once: true
    });
    puntoRec(true);
    if (alEmpezar) {
        try {
            alEmpezar(id);
        } catch (e) {}
    }
    return true;
}

function metaDe(g, termino) {
    const m = g.medidor;
    return {
        id: g.id,
        mime: g.mime,
        empezo: g.empezo,
        termino: termino,
        ensayo: g.ensayo,
        pedazos: g.n,
        conAudio: g.conAudio,
        picoAudio: m && m.medido ? m.pico : null
    };
}

export function nivelActual() {
    return actual && actual.medidor && actual.medidor.medido ? actual.medidor.nivel : null;
}

export function detener() {
    generacion += 1;
    const g = actual;
    if (!g) return Promise.resolve(null);
    actual = null;
    clearTimeout(g.timerTope);
    puntoRec(false);
    return new Promise((resolve => {
        const fin = () => {
            for (const p of g.stream.getTracks()) p.stop();
            cerrarMicrofono();
            if (g.medidor) {
                g.medidor.parar();
                tx(VIDEOS, "readwrite", (s => s.put(metaDe(g, Date.now()))));
            }
            setTimeout((() => resolve(g.id)), 400);
        };
        try {
            if (g.rec.state !== "inactive") {
                g.rec.addEventListener("stop", fin, {
                    once: true
                });
                g.rec.stop();
            } else fin();
        } catch (e) {
            fin();
        }
    }));
}

async function listarVideos() {
    const todos = await tx(VIDEOS, "readonly", (s => s.getAll()));
    return (todos || []).sort(((a, b) => a.empezo - b.empezo));
}

async function borrarEnsayos(salvo) {
    const vs = await listarVideos();
    for (const v of vs) {
        if (!v.ensayo || v.id === salvo) continue;
        await tx(PEDAZOS, "readwrite", (s => {
            for (let n = 0; n <= v.pedazos; n++) s.delete([ v.id, n ]);
        }));
        await tx(VIDEOS, "readwrite", (s => s.delete(v.id)));
    }
}

async function armarVideo(v) {
    if (!v) return null;
    const pedazos = await tx(PEDAZOS, "readonly", (s => s.index("id").getAll(v.id)));
    if (!pedazos || !pedazos.length) return null;
    pedazos.sort(((a, b) => a.n - b.n));
    const tipo = (v.mime || "video/mp4").split(";")[0];
    return {
        id: v.id,
        blob: new Blob(pedazos.map((p => p.blob)), {
            type: tipo
        }),
        mime: tipo,
        empezo: v.empezo,
        termino: v.termino || null,
        conAudio: v.conAudio !== false,
        picoAudio: typeof v.picoAudio === "number" ? v.picoAudio : null
    };
}

export async function ultimoVideo({ensayo: ensayo = false} = {}) {
    const vs = (await listarVideos()).filter((v => !!v.ensayo === !!ensayo && v.pedazos > 0));
    return armarVideo(vs[vs.length - 1]);
}

export const idActual = () => actual ? actual.id : null;

export async function videosPorId(ids) {
    const quiero = (Array.isArray(ids) ? ids : []).filter(Boolean);
    if (!quiero.length) return [];
    const todos = await listarVideos();
    const lista = [];
    for (const id of quiero) {
        const v = await armarVideo(todos.find((x => x.id === id && x.pedazos > 0)));
        if (v) lista.push(v);
    }
    return lista;
}

export async function videosDesde(desde) {
    const vs = (await listarVideos()).filter((v => !v.ensayo && v.pedazos > 0 && v.empezo >= desde));
    const lista = [];
    for (const v of vs) {
        const armado = await armarVideo(v);
        if (armado) lista.push(armado);
    }
    return lista;
}

export async function videosParaBackup() {
    const lista = [];
    for (const v of (await listarVideos()).filter((x => !x.ensayo && x.pedazos > 0))) {
        const pedazos = await tx(PEDAZOS, "readonly", (s => s.index("id").getAll(v.id)));
        if (pedazos && pedazos.length) lista.push({
            meta: v,
            pedazos: pedazos.sort(((a, b) => a.n - b.n)).map((p => ({
                n: p.n,
                blob: p.blob
            })))
        });
    }
    return lista;
}

export async function importarVideos(lista) {
    const yaEstan = new Set((await listarVideos()).map((v => v.id)));
    let n = 0;
    for (const {meta: meta, pedazos: pedazos} of Array.isArray(lista) ? lista : []) {
        if (!meta || meta.id == null || yaEstan.has(meta.id) || !pedazos.length) continue;
        const ok = await tx(PEDAZOS, "readwrite", (s => {
            for (const p of pedazos) s.put({
                clave: [ meta.id, p.n ],
                id: meta.id,
                n: p.n,
                blob: p.blob
            });
        }));
        if (!ok) continue;
        await tx(VIDEOS, "readwrite", (s => s.put({
            ...meta,
            ensayo: false
        })));
        n++;
    }
    return n;
}

export async function hayVideo({ensayo: ensayo = false} = {}) {
    return (await listarVideos()).some((v => !!v.ensayo === !!ensayo && v.pedazos > 0));
}
