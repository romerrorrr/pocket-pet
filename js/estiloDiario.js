export const ANCHO_PAGINA = 160;

export const MAX_STICKERS = 12;

export const TAM_MIN = 16;

export const TAM_MAX = 110;

export const DESBORDE = 12;

export const PAPELES = [ {
    id: "crema",
    nombre: "Cream",
    color: "rgb(250,246,234)"
}, {
    id: "menta",
    nombre: "Mint",
    color: "rgb(226,242,232)"
}, {
    id: "rosa",
    nombre: "Pink",
    color: "rgb(252,230,236)"
}, {
    id: "lila",
    nombre: "Lilac",
    color: "rgb(234,230,250)"
}, {
    id: "kraft",
    nombre: "Kraft",
    color: "rgb(226,204,164)"
}, {
    id: "noche",
    nombre: "Night",
    color: "rgb(46,44,66)"
} ];

export const CINTAS = [ {
    id: "rosa",
    nombre: "Pink"
}, {
    id: "azul",
    nombre: "Blue stripes"
}, {
    id: "amarilla",
    nombre: "Yellow"
}, {
    id: "verde",
    nombre: "Green"
}, {
    id: "lunares",
    nombre: "Dots"
}, {
    id: "ninguna",
    nombre: "None"
} ];

export const TINTAS = [ {
    id: "negra",
    nombre: "Black",
    color: "rgb(22,20,22)"
}, {
    id: "azul",
    nombre: "Blue",
    color: "rgb(48,84,170)"
}, {
    id: "rosa",
    nombre: "Pink",
    color: "rgb(170,50,96)"
}, {
    id: "verde",
    nombre: "Green",
    color: "rgb(46,120,70)"
}, {
    id: "cafe",
    nombre: "Brown",
    color: "rgb(130,74,36)"
}, {
    id: "blanca",
    nombre: "White",
    color: "rgb(244,240,252)"
} ];

export const GIROS = [ -2, 0, 2 ];

export const HOJAS = [ {
    id: "rayas",
    nombre: "Lined"
}, {
    id: "cuadricula",
    nombre: "Grid"
}, {
    id: "puntos",
    nombre: "Dots"
}, {
    id: "lisa",
    nombre: "Plain"
} ];

export const ANILLOS = [ {
    id: "plata",
    nombre: "Silver",
    color: "rgb(170,168,180)"
}, {
    id: "oro",
    nombre: "Gold",
    color: "rgb(222,180,80)"
}, {
    id: "rosa",
    nombre: "Pink",
    color: "rgb(236,150,184)"
}, {
    id: "negro",
    nombre: "Black",
    color: "rgb(54,52,62)"
} ];

export const PAPELES_CUADERNO = [ {
    id: "crema",
    nombre: "Cream"
}, {
    id: "menta",
    nombre: "Mint"
}, {
    id: "rosa",
    nombre: "Pink"
}, {
    id: "mix",
    nombre: "Mix"
} ];

const tiene = (lista, id) => lista.some((x => x.id === id));

const num = (v, min, max, def) => Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : def;

const redondo = v => Math.round(v * 10) / 10;

export function limpiarSticker(st) {
    if (!st || typeof st !== "object" || typeof st.id !== "string" || !/^[a-z0-9_-]{1,60}$/i.test(st.id)) return null;
    const s = Math.round(num(st.s, TAM_MIN, TAM_MAX, 40));
    return {
        id: st.id,
        x: redondo(num(st.x, -DESBORDE, ANCHO_PAGINA + DESBORDE, ANCHO_PAGINA / 2)),
        y: redondo(num(st.y, -DESBORDE, 1e3, 60)),
        s: s,
        r: (Math.round(num(st.r, -720, 720, 0) / 15) * 15 % 360 + 360) % 360
    };
}

export function limpiarEstilo(e) {
    if (!e || typeof e !== "object") return null;
    const out = {
        papel: tiene(PAPELES, e.papel) ? e.papel : null,
        cinta: tiene(CINTAS, e.cinta) ? e.cinta : null,
        tinta: tiene(TINTAS, e.tinta) ? e.tinta : null,
        giro: GIROS.includes(e.giro) ? e.giro : null,
        stickers: (Array.isArray(e.stickers) ? e.stickers : []).map(limpiarSticker).filter(Boolean).slice(0, MAX_STICKERS)
    };
    return estiloVacio(out) ? null : out;
}

export const estiloVacio = e => !e || !e.papel && !e.cinta && !e.tinta && e.giro == null && !(e.stickers && e.stickers.length);

export function limpiarCuaderno(c) {
    const o = c && typeof c === "object" ? c : {};
    return {
        hojas: tiene(HOJAS, o.hojas) ? o.hojas : "rayas",
        anillos: tiene(ANILLOS, o.anillos) ? o.anillos : "plata",
        papel: tiene(PAPELES_CUADERNO, o.papel) ? o.papel : "crema"
    };
}

export function papelDe(estilo, cuaderno, fecha = "") {
    if (estilo && estilo.papel) return estilo.papel;
    const p = cuaderno && cuaderno.papel || "crema";
    if (p !== "mix") return p;
    const d = Number(String(fecha).slice(-2)) || 0;
    return [ "crema", "menta", "rosa" ][d % 3];
}
