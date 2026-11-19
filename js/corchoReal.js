import { mx, my, proyectar, zoomPara, rasterDeRotulos, rotulosDelEncuadre, pintarRotulos } from "./mapaDia.js";

import { distanciaMetros } from "./mundo.js";

const ANCHO = 640;

const CENTRO = {
    lat: 30.2455,
    lon: 120.1418
};

const LEJOS_M = 45e3;

const MARGEN = .06;

const LADO_MINIMO = 12e-5;

const REINTENTO_MS = 10 * 6e4;

const MAX_TESELAS = 64;

const VERSION = 1;

const DB_NOMBRE = "mochi_corcho";

const TIENDA = "mapa";

const CLAVE = "corcho";

let mapa = null;

let precargado = null;

let trabajando = null;

let ultimoFallo = 0;

function abrirDB() {
    return new Promise((resolve => {
        try {
            if (!("indexedDB" in window)) return resolve(null);
            const p = indexedDB.open(DB_NOMBRE, 1);
            p.onupgradeneeded = () => {
                if (!p.result.objectStoreNames.contains(TIENDA)) p.result.createObjectStore(TIENDA, {
                    keyPath: "clave"
                });
            };
            p.onsuccess = () => resolve(p.result);
            p.onerror = () => resolve(null);
            p.onblocked = () => resolve(null);
        } catch (e) {
            resolve(null);
        }
    }));
}

export function precargar() {
    if (precargado) return precargado;
    precargado = abrirDB().then((db => new Promise((resolve => {
        if (!db) return resolve();
        try {
            const p = db.transaction(TIENDA, "readonly").objectStore(TIENDA).get(CLAVE);
            p.onsuccess = () => {
                const m = p.result;
                if (m && m.v === VERSION && m.png && m.enc && m.lim) mapa = m;
                resolve();
            };
            p.onerror = () => resolve();
        } catch (e) {
            resolve();
        }
    }))));
    return precargado;
}

async function guardar(m) {
    mapa = m;
    const db = await abrirDB();
    if (!db) return;
    try {
        db.transaction(TIENDA, "readwrite").objectStore(TIENDA).put(m);
    } catch (e) {}
}

const cerca = l => Number.isFinite(l.lat) && Number.isFinite(l.lon) && distanciaMetros(CENTRO.lat, CENTRO.lon, l.lat, l.lon) <= LEJOS_M;

function limitesDe(lugares) {
    const lista = lugares.filter(cerca);
    if (!lista.length) lista.push(CENTRO);
    const xs = lista.map((l => mx(l.lon)));
    const ys = lista.map((l => my(l.lat)));
    let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const ax = Math.max(x1 - x0, LADO_MINIMO), ay = Math.max(y1 - y0, LADO_MINIMO);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    x0 = cx - ax / 2 * (1 + 2 * MARGEN);
    x1 = cx + ax / 2 * (1 + 2 * MARGEN);
    y0 = cy - ay / 2 * (1 + 2 * MARGEN);
    y1 = cy + ay / 2 * (1 + 2 * MARGEN);
    return {
        x0: x0,
        x1: x1,
        y0: y0,
        y1: y1
    };
}

function cubre(m, lugares) {
    return lugares.filter(cerca).every((l => {
        const x = mx(l.lon), y = my(l.lat);
        return x > m.lim.x0 && x < m.lim.x1 && y > m.lim.y0 && y < m.lim.y1;
    }));
}

export function listo() {
    return mapa;
}

export function armando() {
    return !!trabajando;
}

export async function asegurar(lugares) {
    await precargar();
    if (mapa && cubre(mapa, lugares)) return false;
    if (trabajando) return trabajando;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
    if (Date.now() - ultimoFallo < REINTENTO_MS) return false;
    trabajando = armar(lugares).then((async m => {
        await guardar(m);
        return true;
    })).catch((() => {
        ultimoFallo = Date.now();
        return false;
    })).finally((() => {
        trabajando = null;
    }));
    return trabajando;
}

async function armar(lugares) {
    const lim = limitesDe(lugares);
    const escala = ANCHO / (lim.x1 - lim.x0);
    const enc = {
        cx: (lim.x0 + lim.x1) / 2,
        cy: (lim.y0 + lim.y1) / 2,
        escala: escala,
        w: ANCHO,
        h: Math.max(1, Math.round((lim.y1 - lim.y0) * escala))
    };
    const teselas = z => {
        const n = 2 ** z;
        return (Math.floor(lim.x1 * n) - Math.floor(lim.x0 * n) + 1) * (Math.floor(lim.y1 * n) - Math.floor(lim.y0 * n) + 1);
    };
    let z = zoomPara(escala);
    while (z > 10 && teselas(z) > MAX_TESELAS) z--;
    const raster = await rasterDeRotulos([ enc ], z, {
        tolerancia: .08
    });
    const lienzo = document.createElement("canvas");
    lienzo.width = enc.w;
    lienzo.height = enc.h;
    pintarRotulos(lienzo.getContext("2d"), rotulosDelEncuadre(raster, enc), enc.w, enc.h);
    return {
        clave: CLAVE,
        v: VERSION,
        lim: lim,
        enc: enc,
        png: lienzo.toDataURL("image/png"),
        t: Date.now()
    };
}

export function posicion(lat, lon) {
    if (!mapa) return null;
    const [x, y] = proyectar(mapa.enc, lat, lon);
    const cx = Math.max(6, Math.min(mapa.enc.w - 6, x));
    const cy = Math.max(6, Math.min(mapa.enc.h - 6, y));
    return {
        x: cx,
        y: cy,
        afuera: cx !== x || cy !== y
    };
}

export function pxPorKm(km = 1) {
    if (!mapa) return 1;
    const lat = CENTRO.lat;
    const metrosPorUnidad = 40075016 * Math.cos(lat * Math.PI / 180);
    return km * 1e3 * mapa.enc.escala / metrosPorUnidad;
}

export function _reiniciar() {
    mapa = null;
    precargado = null;
    ultimoFallo = 0;
}
