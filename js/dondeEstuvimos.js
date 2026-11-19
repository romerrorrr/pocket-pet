import { claveDelDia } from "./diario.js";

import { distanciaMetros } from "./mundo.js";

const CLAVE = "baozi_donde_estuvimos";

const CLAVE_ACTIVO = "baozi_donde_estuvimos_on";

export const MOVIDA_MINIMA_M = 300;

export const MISMO_LUGAR_M = 180;

export const PRECISION_MAXIMA_M = 200;

const MAX_POR_DIA = 40;

const MAX_DIAS = 400;

let datos = null;

function cargar() {
    if (datos) return datos;
    try {
        const crudo = JSON.parse(localStorage.getItem(CLAVE) || "{}");
        datos = crudo && typeof crudo === "object" && !Array.isArray(crudo) ? crudo : {};
    } catch (e) {
        datos = {};
    }
    return datos;
}

function guardar() {
    try {
        localStorage.setItem(CLAVE, JSON.stringify(datos));
    } catch (e) {}
}

export function activo() {
    try {
        return localStorage.getItem(CLAVE_ACTIVO) !== "0";
    } catch (e) {
        return true;
    }
}

export function ponerActivo(si) {
    try {
        localStorage.setItem(CLAVE_ACTIVO, si ? "1" : "0");
    } catch (e) {}
}

const valido = p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]) && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180;

export function anotar(lat, lon, precision = null, cuando = new Date) {
    if (!activo()) return false;
    if (!valido([ lat, lon ])) return false;
    if (Number.isFinite(precision) && precision > PRECISION_MAXIMA_M) return false;
    const d = cargar();
    const clave = claveDelDia(cuando);
    const lista = Array.isArray(d[clave]) ? d[clave].filter(valido) : [];
    const ultimo = lista[lista.length - 1];
    const acc = Number.isFinite(precision) && precision > 0 ? Math.round(precision) : 0;
    if (ultimo) {
        const accPrevia = Number.isFinite(ultimo[3]) ? ultimo[3] : 0;
        if (distanciaMetros(ultimo[0], ultimo[1], lat, lon) < Math.max(MOVIDA_MINIMA_M, accPrevia + acc)) return false;
    }
    if (lista.length >= MAX_POR_DIA) return false;
    lista.push([ Math.round(lat * 1e5) / 1e5, Math.round(lon * 1e5) / 1e5, cuando.getHours() * 60 + cuando.getMinutes(), acc ]);
    d[clave] = lista;
    const dias = Object.keys(d).sort();
    for (const viejo of dias.slice(0, Math.max(0, dias.length - MAX_DIAS))) delete d[viejo];
    guardar();
    return true;
}

export function puntosDe(clave) {
    const lista = cargar()[clave];
    return Array.isArray(lista) ? lista.filter(valido).map((([lat, lon, min]) => ({
        lat: lat,
        lon: lon,
        min: Number.isFinite(min) ? min : null
    }))) : [];
}

export function pinesDe(clave) {
    const pines = [];
    const orden = [];
    for (const p of puntosDe(clave)) {
        let i = pines.findIndex((q => distanciaMetros(q.lat, q.lon, p.lat, p.lon) < MISMO_LUGAR_M));
        if (i < 0) {
            pines.push({
                lat: p.lat,
                lon: p.lon,
                horas: []
            });
            i = pines.length - 1;
        }
        if (p.min != null) pines[i].horas.push(p.min);
        if (orden[orden.length - 1] !== i) orden.push(i);
    }
    return {
        pines: pines,
        orden: orden
    };
}

export function hayMapa(clave) {
    return pinesDe(clave).pines.length >= 2;
}

export function firma(clave) {
    return puntosDe(clave).map((p => `${p.lat},${p.lon},${p.min}`)).join(";");
}

export function diasConMapa() {
    return Object.keys(cargar()).sort().reverse().filter(hayMapa);
}

export function hora(min) {
    if (!Number.isFinite(min)) return "";
    return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
}

export function _reiniciar() {
    datos = null;
}

export { claveDelDia };
