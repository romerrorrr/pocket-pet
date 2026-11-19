import { FIGURAS } from "./personajes_datos.js";

import { ACCESORIOS_TIENDA } from "./tienda.js";

const CLAVE = "baozi_personaje";

export const IDS = [ "baozi", "mantou" ];

export const NOMBRES = {
    baozi: "Baozi",
    mantou: "Mantou"
};

export const CARAS_MANTOU = new Set([ "neutral", "feliz", "euforico", "cansada", "dormida", "triste", "enferma", "comiendo", "aburrido", "asqueado", "asustado", "curioso", "enamorado", "hambriento", "sorprendido" ]);

const PARECIDAS = {
    cansada: "dormida",
    aburrido: "cansada",
    decepcionado: "triste",
    enamorado: "feliz",
    euforico: "feliz",
    comiendo: "sorprendido",
    asustado: "sorprendido",
    curioso: "sorprendido",
    hambriento: "neutral",
    asqueado: "neutral"
};

let id = "baozi";

let accesorio = null;

try {
    const guardado = localStorage.getItem(CLAVE);
    if (IDS.includes(guardado)) id = guardado;
} catch (e) {}

export const actual = () => id;

export const esMantou = () => id === "mantou";

export const nombre = (quien = id) => NOMBRES[quien] || "Baozi";

export const figura = (pose = "parado", quien = id) => FIGURAS.personajes[quien][pose === "parado" ? "parado" : "sentado"];

export const estilo = (quien = id) => FIGURAS.personajes[quien].estilo;

export function elegir(nuevo) {
    if (!IDS.includes(nuevo)) return;
    id = nuevo;
    try {
        localStorage.setItem(CLAVE, nuevo);
    } catch (e) {}
    nombrarAvisoRotar();
}

function nombrarAvisoRotar() {
    if (typeof document === "undefined") return;
    const el = document.querySelector("#aviso-rotar .texto-rotar");
    if (!el) return;
    if (!el.dataset.original) el.dataset.original = el.textContent;
    el.textContent = conNombre(el.dataset.original);
}

export function ponerAccesorio(a) {
    accesorio = typeof a === "string" && /^[a-z]+$/.test(a) ? a : null;
}

export const accesorioPuesto = () => accesorio;

export function restaurar(desdeGuardado) {
    if (IDS.includes(desdeGuardado)) elegir(desdeGuardado);
}

export function conNombre(texto) {
    return id === "baozi" ? texto : String(texto).replace(/\bBaozi\b/g, nombre());
}

nombrarAvisoRotar();

export function estadoDeArchivos(archivoOjo = "", archivoBoca = "") {
    const ojo = archivoOjo.replace(/\.png$/, "");
    const boca = archivoBoca.replace(/\.png$/, "");
    if (ojo === "ojo_dormida") return "dormida";
    if (ojo === "ojo_enferma") return "enferma";
    const esp = ojo.match(/^ojo_especial_(\w+)$/);
    if (esp) return esp[1] === "decepcionado" ? "triste" : esp[1];
    if (boca === "boca_especial_sorprendido") return "comiendo";
    if (ojo === "ojo_base_energia_baja") return "cansada";
    if (boca === "boca_base_feliz") return "feliz";
    if (boca === "boca_base_triste") return "triste";
    return "neutral";
}

export function caraMantou(estado) {
    let e = estado;
    for (let i = 0; i < 3 && !CARAS_MANTOU.has(e); i++) e = PARECIDAS[e] || "neutral";
    return `mantou/cara_${CARAS_MANTOU.has(e) ? e : "neutral"}.png`;
}

export function capas(archivoOjo, archivoBoca, pose = "parado", quien = id) {
    const lista = capasBase(archivoOjo, archivoBoca, pose, quien);
    if (accesorio && quien === id) lista.push({
        src: ACCESORIOS_TIENDA[accesorio] || `amigos/acc_${accesorio}.png`,
        tipo: "accesorio"
    });
    return lista;
}

function capasBase(archivoOjo, archivoBoca, pose, quien) {
    if (quien === "mantou") {
        const cuerpo = pose === "parado" ? "mantou/cuerpo.png" : "mantou/cuerpo_sentado.png";
        return [ {
            src: cuerpo,
            tipo: "cuerpo"
        }, {
            src: caraMantou(estadoDeArchivos(archivoOjo, archivoBoca)),
            tipo: "cara"
        } ];
    }
    const cuerpo = pose === "dormido" ? "caras/cuerpo_dormido.png" : pose === "sentado" ? "caras/cuerpo_sentado.png" : "caras/cuerpo.png";
    return [ {
        src: cuerpo,
        tipo: "cuerpo"
    }, {
        src: `caras/${archivoOjo}`,
        tipo: "ojos"
    }, {
        src: `caras/${archivoBoca}`,
        tipo: "boca"
    } ];
}
