import { PetState } from "./petState.js";

import { RegistroNPCs, RegistroLugares } from "./mundo.js";

import { Diario } from "./diario.js";

const CLAVE_GUARDADO = "mochi_progreso_v1";

const CLAVE_ANTERIOR = "mochi_progreso_previo";

const CLAVE_RESCATE = "mochi_progreso_roto";

const CLAVE_DIA = "mochi_progreso_dia";

const CLAVE_DIA_FECHA = "mochi_progreso_dia_fecha";

export const CLAVE_ULTIMO_BACKUP = "baozi_ultimo_backup";

let principalIlegible = false;

let cargaFallida = false;

const hoyLocal = () => {
    const d = new Date;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const VERSION_ESQUEMA = 2;

export const INTERVALO_GUARDADO_MS = 18e4;

export function guardar(mascota, npcs, lugares, diario = null, cartasEntregadas = [], extras = {}) {
    const datos = {
        extras: extras,
        version: VERSION_ESQUEMA,
        guardadoEn: Date.now(),
        mascota: mascota.aObjeto(),
        npcs: npcs.aObjeto(),
        lugares: lugares.aObjeto(),
        diario: (diario || new Diario).aObjeto(),
        cartasEntregadas: cartasEntregadas
    };
    try {
        try {
            const actual = principalIlegible ? null : localStorage.getItem(CLAVE_GUARDADO);
            if (actual) {
                rotarCopiaDelDia(actual);
                localStorage.setItem(CLAVE_ANTERIOR, actual);
            }
        } catch (e) {
            try {
                localStorage.removeItem(CLAVE_ANTERIOR);
            } catch (e2) {}
        }
        localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(datos));
        principalIlegible = false;
        cargaFallida = false;
        return true;
    } catch (e) {
        console.error("No se pudo guardar el progreso:", e);
        return false;
    }
}

let rotacionIntentada = "";

function rotarCopiaDelDia(actual) {
    const hoy = hoyLocal();
    if (rotacionIntentada === hoy) return;
    try {
        if (localStorage.getItem(CLAVE_DIA_FECHA) === hoy) return;
        rotacionIntentada = hoy;
        const datos = JSON.parse(actual);
        if (!datos || !datos.mascota) return;
        localStorage.setItem(CLAVE_DIA, actual);
        localStorage.setItem(CLAVE_DIA_FECHA, hoy);
    } catch (e) {}
}

function migrar(datos) {
    const version = datos.version || 1;
    if (version >= VERSION_ESQUEMA) return datos;
    if (version < 2) {
        datos.diario = datos.diario || {
            entradas: []
        };
        datos.cartasEntregadas = datos.cartasEntregadas || [];
    }
    datos.version = VERSION_ESQUEMA;
    return datos;
}

function reconstruir(datos) {
    return {
        mascota: PetState.desdeObjeto(datos.mascota),
        npcs: RegistroNPCs.desdeObjeto(datos.npcs),
        lugares: RegistroLugares.desdeObjeto(datos.lugares),
        diario: Diario.desdeObjeto(datos.diario),
        cartasEntregadas: Array.isArray(datos.cartasEntregadas) ? datos.cartasEntregadas : [],
        extras: datos.extras && typeof datos.extras === "object" ? datos.extras : {},
        guardadoEn: Number(datos.guardadoEn) || 0
    };
}

function intentarCargar(crudo) {
    if (!crudo) return null;
    const datos = migrar(JSON.parse(crudo));
    if (!datos.mascota) throw new Error("guardado sin mascota");
    return reconstruir(datos);
}

export function cargar() {
    let crudo = null;
    try {
        crudo = localStorage.getItem(CLAVE_GUARDADO);
    } catch (e) {
        return null;
    }
    if (!crudo) return null;
    try {
        const r = intentarCargar(crudo);
        principalIlegible = false;
        cargaFallida = false;
        return r;
    } catch (e) {
        console.error("El guardado principal no se pudo leer:", e);
        principalIlegible = true;
        try {
            localStorage.setItem(CLAVE_RESCATE, crudo);
        } catch (e2) {
            console.error("No hubo lugar para guardar el rescate:", e2);
        }
        for (const [clave, nombre] of [ [ CLAVE_ANTERIOR, "anterior" ], [ CLAVE_DIA, "del dia" ] ]) {
            try {
                const copia = localStorage.getItem(clave);
                const recuperado = copia ? intentarCargar(copia) : null;
                if (recuperado) {
                    console.warn(`Se recupero la copia ${nombre}.`);
                    return {
                        ...recuperado,
                        recuperadoDe: clave === CLAVE_ANTERIOR ? "previo" : "dia"
                    };
                }
            } catch (e3) {
                console.error(`La copia ${nombre} tampoco se pudo leer:`, e3);
            }
        }
        cargaFallida = true;
        return null;
    }
}

export function estadoDeCarga() {
    return {
        fallida: cargaFallida,
        principalIlegible: principalIlegible
    };
}

export async function pedirAlmacenamientoPersistente() {
    try {
        if (!navigator.storage || !navigator.storage.persist) return "no-soportado";
        if (await navigator.storage.persisted()) return "ya-concedido";
        return await navigator.storage.persist() ? "concedido" : "denegado";
    } catch (e) {
        return "error";
    }
}

export function hayGuardado() {
    try {
        return localStorage.getItem(CLAVE_GUARDADO) !== null;
    } catch (e) {
        return false;
    }
}

export class GuardadoAutomatico {
    constructor(ahoraMs = null) {
        this.ultimoGuardado = ahoraMs ?? Date.now();
    }
    deberiaGuardar(ahoraMs = null) {
        const ahora = ahoraMs ?? Date.now();
        return ahora - this.ultimoGuardado >= INTERVALO_GUARDADO_MS;
    }
    marcarGuardado(ahoraMs = null) {
        this.ultimoGuardado = ahoraMs ?? Date.now();
    }
}

const MAGIA = "BAOZI-BACKUP-2\n";

const LARGO_PREFIJO = MAGIA.length + 11;

const CLAVES_QUE_NO_VIAJAN = new Set([ CLAVE_GUARDADO, CLAVE_ANTERIOR, CLAVE_RESCATE, CLAVE_DIA, CLAVE_DIA_FECHA, CLAVE_ULTIMO_BACKUP, "baozi_ultima_vista", "baozi_prueba_mic", "baozi_clima", "baozi_ubicacion", "baozi_ritmo_ajuste" ]);

function otrasClaves() {
    const otras = {};
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && /^(baozi|mochi)_/.test(k) && !CLAVES_QUE_NO_VIAJAN.has(k)) otras[k] = localStorage.getItem(k);
        }
    } catch (e) {}
    return otras;
}

export function armarBackup({fotos: fotos = [], videos: videos = []} = {}) {
    let crudo = null;
    try {
        crudo = localStorage.getItem(CLAVE_GUARDADO);
    } catch (e) {
        return null;
    }
    if (!crudo) return null;
    const partes = [];
    let offset = 0;
    const videosCabecera = videos.map((({meta: meta, pedazos: pedazos}) => ({
        meta: meta,
        pedazos: pedazos.map((({n: n, blob: blob}) => {
            const p = {
                n: n,
                offset: offset,
                largo: blob.size,
                tipo: blob.type
            };
            offset += blob.size;
            partes.push(blob);
            return p;
        }))
    })));
    const cabecera = (new TextEncoder).encode(JSON.stringify({
        formato: "baozi-backup",
        v: 2,
        creado: Date.now(),
        progreso: JSON.parse(crudo),
        otras: otrasClaves(),
        fotos: fotos,
        videos: videosCabecera
    }));
    return new Blob([ MAGIA, String(cabecera.length).padStart(10, "0"), "\n", cabecera, ...partes ], {
        type: "application/octet-stream"
    });
}

export function nombreDelBackup() {
    return `baozi-backup-${(new Date).toISOString().slice(0, 10)}.baozi`;
}

export function marcarBackup(ahoraMs = Date.now()) {
    try {
        localStorage.setItem(CLAVE_ULTIMO_BACKUP, String(ahoraMs));
    } catch (e) {}
}

export function ultimoBackup() {
    try {
        return Number(localStorage.getItem(CLAVE_ULTIMO_BACKUP)) || 0;
    } catch (e) {
        return 0;
    }
}

function leerTexto(blob) {
    return new Promise(((resolve, reject) => {
        const lector = new FileReader;
        lector.onload = () => resolve(lector.result);
        lector.onerror = () => reject(lector.error);
        lector.readAsText(blob);
    }));
}

function validarProgreso(datos) {
    if (!datos || !datos.mascota || !datos.npcs || !datos.lugares) throw new Error("that file isn't a Baozi backup.");
    if ((datos.version || 1) > VERSION_ESQUEMA) throw new Error("that backup is from a newer Baozi.");
    return datos;
}

export async function leerBackup(archivo) {
    const inicio = await leerTexto(archivo.slice(0, LARGO_PREFIJO));
    if (!inicio.startsWith(MAGIA)) {
        let datos;
        try {
            datos = JSON.parse(await leerTexto(archivo));
        } catch (e) {
            throw new Error("that file isn't a Baozi backup.");
        }
        return {
            progreso: validarProgreso(datos),
            otras: {},
            fotos: [],
            videos: []
        };
    }
    const largo = Number(inicio.slice(MAGIA.length, MAGIA.length + 10));
    if (!(largo > 0) || LARGO_PREFIJO + largo > archivo.size) throw new Error("that backup is incomplete.");
    let cab;
    try {
        cab = JSON.parse(await leerTexto(archivo.slice(LARGO_PREFIJO, LARGO_PREFIJO + largo)));
    } catch (e) {
        throw new Error("that backup is damaged.");
    }
    if (!cab || cab.formato !== "baozi-backup") throw new Error("that file isn't a Baozi backup.");
    if (cab.v > 2) throw new Error("that backup is from a newer Baozi.");
    const base = LARGO_PREFIJO + largo;
    const videos = (Array.isArray(cab.videos) ? cab.videos : []).filter((v => v && v.meta && Array.isArray(v.pedazos))).map((v => ({
        meta: v.meta,
        pedazos: v.pedazos.filter((p => p && p.offset >= 0 && p.largo >= 0 && base + p.offset + p.largo <= archivo.size)).map((p => ({
            n: p.n,
            blob: archivo.slice(base + p.offset, base + p.offset + p.largo, p.tipo || "")
        })))
    })));
    const otras = {};
    if (cab.otras && typeof cab.otras === "object") {
        for (const [k, v] of Object.entries(cab.otras)) if (/^(baozi|mochi)_/.test(k) && !CLAVES_QUE_NO_VIAJAN.has(k) && typeof v === "string") otras[k] = v;
    }
    return {
        progreso: validarProgreso(cab.progreso),
        otras: otras,
        fotos: Array.isArray(cab.fotos) ? cab.fotos : [],
        videos: videos
    };
}

export function restaurarBackup({progreso: progreso, otras: otras = {}}) {
    const migrado = migrar(progreso);
    const actual = principalIlegible ? null : localStorage.getItem(CLAVE_GUARDADO);
    if (actual) {
        try {
            localStorage.setItem(CLAVE_ANTERIOR, actual);
        } catch (e) {}
    }
    const texto = JSON.stringify(migrado);
    try {
        localStorage.setItem(CLAVE_GUARDADO, texto);
    } catch (e) {
        try {
            localStorage.removeItem(CLAVE_DIA);
            localStorage.removeItem(CLAVE_DIA_FECHA);
        } catch (e2) {}
        localStorage.setItem(CLAVE_GUARDADO, texto);
    }
    principalIlegible = false;
    cargaFallida = false;
    marcarBackup();
    for (const [k, v] of Object.entries(otras)) {
        try {
            localStorage.setItem(k, v);
        } catch (e) {}
    }
}
