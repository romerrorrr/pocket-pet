import { arte } from "./arte.js";

import { PIEZA } from "./pieza_datos.js";

import * as Personaje from "./personaje.js";

import * as Tele from "./tele.js";

const [MW, MH] = PIEZA.mundo;

const [SX0, SY0, SX1, SY1] = PIEZA.segura;

const FPS = 12;

const TINTA = "rgb(24,18,16)";

const cache = new Map;

function img(rel) {
    if (!cache.has(rel)) {
        const i = new Image;
        i.decoding = "async";
        i.src = arte(rel);
        cache.set(rel, i);
    }
    return cache.get(rel);
}

const listo = i => i && i.complete && i.naturalWidth > 0;

const ultimaLista = new Map;

function imgOAnterior(lugar, rel) {
    const i = img(rel);
    if (listo(i)) {
        ultimaLista.set(lugar, i);
        return i;
    }
    return ultimaLista.get(lugar) || null;
}

function precargarCaras() {
    const especiales = [ "aburrido", "asqueado", "asustado", "curioso", "decepcionado", "enamorado", "euforico", "hambriento", "sorprendido" ];
    const lista = [ "caras/ojo_base_energia_alta.png", "caras/ojo_base_energia_baja.png", "caras/ojo_base_energia_neutral.png", "caras/boca_base_feliz.png", "caras/boca_base_neutral.png", "caras/boca_base_triste.png", "caras/cuerpo.png", "caras/cuerpo_sentado.png", "caras/cuerpo_dormido.png", "mantou/cuerpo.png", "mantou/cuerpo_sentado.png", "caras/ojo_dormida.png", "caras/boca_dormida.png", "caras/ojo_enferma.png", "caras/boca_enferma.png", ...especiales.flatMap((n => [ `caras/ojo_especial_${n}.png`, `caras/boca_especial_${n}.png` ])), ...[ ...Personaje.CARAS_MANTOU ].map((n => `mantou/cara_${n}.png`)) ];
    for (const rel of lista) img(rel);
}

const AMBIENTES = {
    dia: {
        amb: [ 214, 206, 198 ],
        ventana: [ 255, 246, 226 ],
        haz: .55,
        lamparas: .25
    },
    amanecer: {
        amb: [ 178, 152, 156 ],
        ventana: [ 255, 206, 176 ],
        haz: .5,
        lamparas: .6
    },
    atardecer: {
        amb: [ 150, 118, 118 ],
        ventana: [ 255, 176, 120 ],
        haz: .6,
        lamparas: .75
    },
    noche: {
        amb: [ 58, 60, 98 ],
        ventana: [ 110, 132, 196 ],
        haz: .35,
        lamparas: 1
    },
    dormido: {
        amb: [ 30, 32, 66 ],
        ventana: [ 96, 118, 196 ],
        haz: .55,
        lamparas: 0
    }
};

const luzDe = e => e.dormido ? e.momento === "noche" ? "dormido" : "siesta" : e.momento;

function ambienteSiesta(momento) {
    const b = AMBIENTES[momento] || AMBIENTES.dia;
    return {
        ...b,
        amb: b.amb.map((v => Math.round(v * .6))),
        haz: b.haz * .45,
        lamparas: 0
    };
}

const [VX0, VY0, VX1, VY1] = PIEZA.vidrio;

export const CUARTOS = {
    depto: {},
    te: {
        luces: {
            farol: [ 246, 26, 92, [ 255, 178, 130 ] ]
        }
    },
    bote: {
        luces: {
            farol: [ 246, 26, 92, [ 255, 210, 140 ] ]
        }
    },
    cabana: {
        luces: {
            chimenea: [ 196, 102, 78, [ 255, 158, 88 ] ]
        },
        fuego: [ 172, 220 ]
    },
    finca: {
        luces: {
            farol: [ 246, 26, 92, [ 255, 206, 130 ] ]
        }
    },
    guatape: {
        luces: {
            farol: [ 246, 26, 92, [ 255, 220, 170 ] ]
        }
    }
};

let cuarto = "depto";

export function ponerCuarto(id) {
    cuarto = cuartoValido(id);
    return cuarto;
}

export const cuartoValido = id => Object.prototype.hasOwnProperty.call(CUARTOS, id) ? id : "depto";

export const rutaCuarto = (n, id = cuarto) => cuartoValido(id) === "depto" ? `pieza/${n}` : `pieza/${cuartoValido(id)}/${n}`;

const lucesDelCuarto = () => ({
    ...PIEZA.luces || {},
    ...CUARTOS[cuarto].luces || {}
});

const LUCES = PIEZA.luces || {};

const PANTALLA_TELE = (() => {
    const [tx0, ty0, tx1] = PIEZA.objetos.tele;
    return [ tx0 + 8, ty0 + 11, tx1 - 15, ty0 + 34 ];
})();

function dentroHaz(x, y) {
    if (y <= VY1 + 6) return false;
    const corre = (y - VY1) * .55;
    return x >= VX0 + 4 + corre && x <= VX1 - 4 + corre && y < 158;
}

const huecos = new Map;

function huecoVentana() {
    if (huecos.has(cuarto)) return huecos.get(cuarto);
    const capas = [ img(rutaCuarto("fondo.png")), img(rutaCuarto("cortinas.png")) ];
    if (!capas.every(listo)) return null;
    const c = document.createElement("canvas");
    c.width = MW;
    c.height = MH;
    const ctx = c.getContext("2d");
    for (const i of capas) ctx.drawImage(i, 0, 0);
    const a = ctx.getImageData(0, 0, MW, MH).data;
    const hueco = new Uint8Array(MW * MH);
    for (let y = VY0; y <= VY1; y++) for (let x = VX0; x <= VX1; x++) hueco[y * MW + x] = a[(y * MW + x) * 4 + 3] === 0 ? 1 : 0;
    huecos.set(cuarto, hueco);
    return hueco;
}

const bordes = new Map;

function bordeDeArriba(im) {
    if (bordes.has(im.src)) return bordes.get(im.src);
    const c = document.createElement("canvas");
    c.width = im.naturalWidth;
    c.height = im.naturalHeight;
    const x = c.getContext("2d");
    x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let top = 0;
    buscar: for (let y = 0; y < c.height; y++) for (let i = 0; i < c.width; i++) if (d[(y * c.width + i) * 4 + 3]) {
        top = y;
        break buscar;
    }
    bordes.set(im.src, top);
    return top;
}

const TINTES = {
    noche: "rgb(120,124,184)",
    atardecer: "rgb(230,182,168)",
    amanecer: "rgb(236,206,210)"
};

const tenidos = new Map;

function amigoTenido(im, id, momento) {
    const tinte = TINTES[momento];
    if (!tinte) return im;
    const clave = `${id}|${momento}`;
    if (tenidos.has(clave)) return tenidos.get(clave);
    const c = document.createElement("canvas");
    c.width = im.naturalWidth;
    c.height = im.naturalHeight;
    const x = c.getContext("2d");
    x.drawImage(im, 0, 0);
    x.globalCompositeOperation = "multiply";
    x.fillStyle = tinte;
    x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = "destination-in";
    x.drawImage(im, 0, 0);
    tenidos.set(clave, c);
    return c;
}

const mascaras = new Map;

function mascara(clave, amb, lamparas, tele, fuego = 0) {
    clave = `${cuarto}|${clave}|${fuego}`;
    if (mascaras.has(clave)) return mascaras.get(clave);
    const LUCES = lucesDelCuarto();
    const h = huecoVentana();
    const claveSin = `${clave}|sinHueco`;
    if (!h && mascaras.has(claveSin)) return mascaras.get(claveSin);
    const c = document.createElement("canvas");
    c.width = MW;
    c.height = MH;
    const ctx = c.getContext("2d");
    const im = ctx.createImageData(MW, MH);
    const d = im.data;
    const fuentes = [];
    if (lamparas > 0) {
        for (const id of [ "farol", "lampara" ]) if (LUCES[id]) fuentes.push({
            l: LUCES[id],
            f: lamparas
        });
    }
    if (tele && LUCES.tele) fuentes.push({
        l: LUCES.tele,
        f: .8
    });
    if (fuego && LUCES.chimenea) fuentes.push({
        l: LUCES.chimenea,
        f: fuego
    });
    for (let y = 0; y < MH; y++) {
        for (let x = 0; x < MW; x++) {
            const b = (BAYER[y % 4][x % 4] / 16 - .47) * .45;
            let r = amb.amb[0];
            let g = amb.amb[1];
            let bl = amb.amb[2];
            const vx = (x - MW / 2) / (MW / 2);
            const vy = (y - MH * .45) / (MH * .6);
            const vin = Math.min(1, Math.max(0, vx * vx * .6 + vy * vy * .7 - .35));
            const qv = Math.floor(vin * 3 + b) / 3;
            r *= 1 - .35 * qv;
            g *= 1 - .35 * qv;
            bl *= 1 - .3 * qv;
            for (const {l: l, f: f} of fuentes) {
                const [lx, ly, rad, col] = l;
                const dist = Math.hypot(x - lx, (y - ly) * 1.15) / rad;
                if (dist >= 1) continue;
                const I = Math.pow(1 - dist, 1.25) * f * 1.6;
                const q = Math.max(0, Math.min(1, Math.floor(I * 4 + b) / 4));
                if (q <= 0) continue;
                r += (col[0] - r) * q;
                g += (col[1] - g) * q;
                bl += (col[2] - bl) * q;
            }
            if (dentroHaz(x, y)) {
                const lejos = (y - VY1) / (158 - VY1);
                const q = Math.max(0, Math.floor(amb.haz * (1 - lejos * .6) * 3 + b) / 3);
                const v = amb.ventana;
                r += (v[0] - r) * q;
                g += (v[1] - g) * q;
                bl += (v[2] - bl) * q;
            }
            const vidrio = h ? h[y * MW + x] === 1 : x >= VX0 && x <= VX1 && y >= VY0 && y <= VY1;
            const pantalla = tele && x >= PANTALLA_TELE[0] && x <= PANTALLA_TELE[2] && y >= PANTALLA_TELE[1] && y <= PANTALLA_TELE[3];
            if (vidrio || pantalla) {
                r = 255;
                g = 255;
                bl = 255;
            }
            if (lamparas > 0) {
                for (const id of [ "farol", "lampara" ]) {
                    const l = LUCES[id];
                    if (!l) continue;
                    const rx = id === "farol" ? 10 : 8;
                    const ry = id === "farol" ? 15 : 7;
                    if (((x - l[0]) / rx) ** 2 + ((y - (id === "farol" ? l[1] - 1 : l[1] - 2)) / ry) ** 2 <= 1) {
                        r = 255;
                        g = 255;
                        bl = 255;
                    }
                }
            }
            const k = (y * MW + x) * 4;
            d[k] = r;
            d[k + 1] = g;
            d[k + 2] = bl;
            d[k + 3] = 255;
        }
    }
    ctx.putImageData(im, 0, 0);
    mascaras.set(h ? clave : claveSin, c);
    if (h) for (const k of mascaras.keys()) if (k.startsWith(`${clave}|`)) mascaras.delete(k);
    return c;
}

const brillos = new Map;

function brillo(clave, fuerza, noche, fuego = 0) {
    clave = `${cuarto}|${clave}|${fuego}`;
    if (brillos.has(clave)) return brillos.get(clave);
    const LUCES = lucesDelCuarto();
    const c = document.createElement("canvas");
    c.width = MW;
    c.height = MH;
    const ctx = c.getContext("2d");
    if (fuego && LUCES.chimenea) {
        const [fx, fy] = LUCES.chimenea;
        for (let y = fy - 40; y <= fy + 30; y++) {
            for (let x = fx - 56; x <= fx + 56; x++) {
                const dd = Math.hypot(x - fx, (y - fy) * 1.3) / 56;
                if (dd >= 1) continue;
                const j = (BAYER[(y % 4 + 4) % 4][(x % 4 + 4) % 4] / 16 - .47) * .3;
                const banda = Math.max(0, Math.min(3, Math.floor((1 - dd) * 3 + j + .15)));
                if (!banda) continue;
                ctx.fillStyle = `rgba(255,150,80,${(.07 * banda * fuego).toFixed(3)})`;
                ctx.fillRect(x, y, 1, 1);
            }
        }
    }
    if (fuerza > 0) {
        const anillos = (cx, cy, radio, rgb, alfa, estirar = 1.1) => {
            for (let y = Math.floor(cy - radio); y <= cy + radio; y++) {
                for (let x = Math.floor(cx - radio); x <= cx + radio; x++) {
                    const dd = Math.hypot(x - cx, (y - cy) * estirar) / radio;
                    if (dd >= 1) continue;
                    const j = (BAYER[(y % 4 + 4) % 4][(x % 4 + 4) % 4] / 16 - .47) * .3;
                    const banda = Math.max(0, Math.min(3, Math.floor((1 - dd) * 3 + j + .15)));
                    if (!banda) continue;
                    ctx.fillStyle = `rgba(${rgb},${(alfa * banda * fuerza).toFixed(3)})`;
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        };
        if (LUCES.farol) anillos(LUCES.farol[0], LUCES.farol[1], 36, "255,190,120", .09);
        if (LUCES.lampara) anillos(LUCES.lampara[0], LUCES.lampara[1], 24, "255,176,110", .09);
        if (noche && LUCES.farol) {
            const [lx, ly] = LUCES.farol;
            for (let y = ly + 14; y < MH; y++) {
                const t = (y - ly - 14) / (MH - ly - 14);
                const ancho = 9 + t * 46;
                for (let x = Math.floor(lx - ancho); x <= lx + ancho; x++) {
                    const borde = Math.abs(x - lx) / ancho;
                    const j = (BAYER[y % 4][(x % 4 + 4) % 4] / 16 - .47) * .12;
                    const a = borde + j < .55 ? .07 : borde + j < 1 ? .04 : 0;
                    if (!a) continue;
                    ctx.fillStyle = `rgba(255,214,160,${(a * (1 - t * .4)).toFixed(3)})`;
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        }
    }
    brillos.set(clave, c);
    return c;
}

const ETIQUETAS = {
    companero: "Your partner",
    mascota: "Your pet",
    heladera: "Fridge: food and water",
    botiquin: "First aid: medicine",
    radio: "Radio: change the station",
    reloj: "Clock",
    calendario: "Calendar",
    cartel: "Shop sign: Baozi's Dumpling Shop",
    camara: "Camera: Baozi's Lens",
    farol: "Lantern: bedtime",
    corcho: "Map of Hangzhou: stamps",
    tele: "TV: play",
    mesita: "Notebook: diary",
    balde: "Bucket: bath",
    ventana: "Window",
    baozi: "Baozi"
};

const DIGITOS = {
    0: [ "111", "101", "101", "101", "111" ],
    1: [ "010", "110", "010", "010", "111" ],
    2: [ "111", "001", "111", "100", "111" ],
    3: [ "111", "001", "111", "001", "111" ],
    4: [ "101", "101", "111", "001", "001" ],
    5: [ "111", "100", "111", "001", "111" ],
    6: [ "111", "100", "111", "101", "111" ],
    7: [ "111", "001", "010", "010", "010" ],
    8: [ "111", "101", "111", "101", "111" ],
    9: [ "111", "101", "111", "001", "111" ]
};

const BAYER = [ [ 0, 8, 2, 10 ], [ 12, 4, 14, 6 ], [ 3, 11, 1, 9 ], [ 15, 7, 13, 5 ] ];

const DECORACIONES = {
    maceta: [ 108, 71 ],
    ovni: [ 311, 65 ],
    cuadro: [ 222, 60 ],
    te: [ 83, 107 ],
    luces: [ 258, 12 ],
    farolitos: [ 86, 10 ],
    poster: [ 212, 21 ],
    pecera: [ 194, 42 ],
    bonsai: [ 270, 68 ],
    peluche: [ 146, 110 ],
    banderin: [ 28, 10 ],
    orquidea: [ 61, 9 ],
    chiva: [ 274, 117 ],
    saco: [ 242, 101 ]
};

const DECOS_TIENDA = new Set([ "luces", "farolitos", "poster", "pecera", "bonsai", "peluche", "banderin", "orquidea", "chiva", "saco" ]);

const MARCO = [ 158, 64 ];

function srcDeco(id, e) {
    if (id === "cuadro") return `amigos/deco_cuadro_${Personaje.actual()}.png`;
    if (id === "peluche") return `tienda/deco_peluche_${e.peluche === "mantou" ? "mantou" : "baozi"}.png`;
    return DECOS_TIENDA.has(id) ? `tienda/deco_${id}.png` : `amigos/deco_${id}.png`;
}

const ANIM_DECO = {
    farolitos: {
        n: 4,
        cuadro: t => Math.floor(t / 450) % 4
    },
    banderin: {
        n: 4,
        cuadro: t => Math.floor(t / 380) % 4
    },
    orquidea: {
        n: 4,
        cuadro: t => Math.floor(t / 650) % 4
    },
    bonsai: {
        n: 2,
        cuadro: t => t % 6100 < 700 ? 1 : 0
    },
    maceta: {
        n: 3,
        cuadro: t => {
            const r = t % 5300;
            return r < 640 ? [ 1, 0, 2, 0 ][Math.floor(r / 160)] : 0;
        }
    },
    ovni: {
        n: 3,
        cuadro: t => Math.floor(t / 500) % 3,
        dy: t => Math.floor(t / 1100) % 2 ? -1 : 0
    },
    poster: {
        n: 3,
        cuadro: t => Math.floor(t / 800) % 3
    },
    chiva: {
        n: 2,
        cuadro: t => {
            const r = t % 9e3;
            return r < 1500 ? Math.floor(r / 110) % 2 : 0;
        }
    },
    peluche: {
        n: 3,
        cuadro: (t, e) => {
            if (t % 9100 < 300) return 2;
            if (e.peluche !== "mantou" && t % 4300 < 170) return 1;
            return 0;
        }
    },
    pecera: {
        n: 1,
        cuadro: () => 0
    }
};

const srcAnim = (id, e) => srcDeco(id, e).replace("/deco_", "/anim_");

const fotosChicas = new Map;

function fotoChica(dataUrl) {
    if (!dataUrl) return null;
    if (fotosChicas.has(dataUrl)) return fotosChicas.get(dataUrl);
    const reg = {
        listo: false,
        c: null
    };
    fotosChicas.set(dataUrl, reg);
    const i = new Image;
    i.onload = () => {
        const c = document.createElement("canvas");
        c.width = 14;
        c.height = 11;
        const x = c.getContext("2d");
        x.imageSmoothingEnabled = true;
        x.imageSmoothingQuality = "high";
        const r = 14 / 11;
        let sw = i.naturalWidth;
        let sh = sw / r;
        if (sh > i.naturalHeight) {
            sh = i.naturalHeight;
            sw = sh * r;
        }
        x.drawImage(i, (i.naturalWidth - sw) / 2, (i.naturalHeight - sh) / 2, sw, sh, 0, 0, 14, 11);
        reg.c = c;
        reg.listo = true;
    };
    i.src = dataUrl;
    return reg;
}

const FOCOS_LUCES = [];

for (let x = 0; x < 70; x++) if (x % 6 === 3) FOCOS_LUCES.push([ x, Math.round(1 + 5 * Math.sin(Math.PI * (x % 35) / 34)) + 1 ]);

const FOCOS_FAROLITOS = [ 8, 22, 36, 50 ].map((lx => [ lx, Math.round(1 + 3 * Math.sin(Math.PI * lx / 57)) + 7 ]));

export function crearPieza(contenedor, {estado: estado, alTocar: alTocar, alRayo: alRayo = () => {}}) {
    precargarCaras();
    contenedor.innerHTML = `\n    <div class="pieza" id="pieza">\n      <canvas class="pieza-lienzo"></canvas>\n      <div class="pieza-toques"></div>\n      <div class="globo-baozi oculto" id="linea-mochi" aria-live="polite"></div>\n      <div class="globo-baozi oculto" id="linea-companero" aria-live="polite"></div>\n      <div class="pieza-sonda" aria-hidden="true"></div>\n    </div>`;
    const raiz = contenedor.querySelector("#pieza");
    const sonda = raiz.querySelector(".pieza-sonda");
    const canvas = raiz.querySelector("canvas");
    const g = canvas.getContext("2d");
    const mundo = document.createElement("canvas");
    mundo.width = MW;
    mundo.height = MH;
    const m = mundo.getContext("2d");
    const toques = raiz.querySelector(".pieza-toques");
    const globo = raiz.querySelector("#linea-mochi");
    const globoComp = raiz.querySelector("#linea-companero");
    const cajas = {
        ...PIEZA.objetos
    };
    const [vx0, vy0, vx1, vy1] = PIEZA.vidrio;
    cajas.ventana = [ vx0, vy0, vx1, vy1 ];
    const [bcx, bcy] = PIEZA.baozi;
    cajas.baozi = [ bcx - 26, bcy - 38, bcx + 24, bcy + 22 ];
    const PIE = bcy + 21;
    const COMP_X = bcx + 58;
    cajas.companero = [ COMP_X - 22, bcy - 38, COMP_X + 22, bcy + 22 ];
    cajas.mascota = [ 40, 126, 60, 147 ];
    const botones = {};
    for (const [id, caja] of Object.entries(cajas)) {
        const b = document.createElement("button");
        b.className = `toque-objeto${id === "baozi" ? " caja-cara" : ""}`;
        b.id = id === "reloj" ? "reloj" : `obj-${id}`;
        b.setAttribute("aria-label", Personaje.conNombre(ETIQUETAS[id] || id));
        b.dataset.objeto = id;
        b.addEventListener("click", (() => {
            golpe(id);
            alTocar(id);
        }));
        toques.appendChild(b);
        botones[id] = {
            el: b,
            caja: caja
        };
    }
    botones.companero.el.hidden = true;
    botones.mascota.el.hidden = true;
    let ultimoDibujo = 0;
    let personajeAlta = null;
    const actC = document.createElement("canvas");
    actC.width = actC.height = 96;
    const act = actC.getContext("2d");
    const tinC = document.createElement("canvas");
    tinC.width = tinC.height = 96;
    const tin = tinC.getContext("2d");
    const LUZ_CLARO = {
        amanecer: [ 246, 226, 224 ],
        atardecer: [ 244, 214, 196 ],
        noche: [ 178, 178, 218 ],
        dormido: [ 128, 132, 188 ],
        siesta: [ 176, 172, 184 ]
    };
    let vw = 1;
    let vh = 1;
    let dpr = 1;
    let T = {
        s: 1,
        ox: 0,
        oy: 0
    };
    let vivo = true;
    const golpes = {};
    let destello = null;
    let proximoDestello = performance.now() + 2500;
    const parpadeo = {
        t: 0
    };
    let M = {
        l: 0,
        t: 0,
        r: 0,
        b: 0
    };
    function margenes(r) {
        const cs = getComputedStyle(sonda);
        const px = v => parseFloat(v) || 0;
        return {
            l: Math.max(0, px(cs.paddingLeft) - r.left),
            t: Math.max(0, px(cs.paddingTop) - r.top),
            r: Math.max(0, px(cs.paddingRight) - (window.innerWidth - r.right)),
            b: Math.max(0, px(cs.paddingBottom) - (window.innerHeight - r.bottom))
        };
    }
    const MIN_TOQUE = 44;
    const FIJOS = Object.keys(PIEZA.objetos).concat("ventana");
    function cajasDeToque() {
        const {s: s, ox: ox, oy: oy} = T;
        const orig = {};
        for (const id of FIJOS) {
            const [x0, y0, x1, y1] = botones[id].caja;
            orig[id] = [ ox + x0 * s, oy + y0 * s, ox + (x1 + 1) * s, oy + (y1 + 1) * s ];
        }
        const res = {};
        for (const id of FIJOS) {
            const o = orig[id];
            let [l, t, r, b] = o;
            const fw = MIN_TOQUE - (r - l);
            const fh = MIN_TOQUE - (b - t);
            if (fw > 0) {
                l -= fw / 2;
                r += fw / 2;
            }
            if (fh > 0) {
                t -= fh / 2;
                b += fh / 2;
            }
            if (fw <= 0 && fh <= 0) {
                res[id] = o;
                continue;
            }
            const recortar = () => {
                for (const otro of FIJOS) {
                    if (otro === id) continue;
                    const n = orig[otro];
                    if (!(l < n[2] - .5 && r > n[0] + .5 && t < n[3] - .5 && b > n[1] + .5)) continue;
                    const cortes = [];
                    if (n[3] <= o[1] + .5) cortes.push([ "t", n[3] - t ]);
                    if (n[1] >= o[3] - .5) cortes.push([ "b", b - n[1] ]);
                    if (n[2] <= o[0] + .5) cortes.push([ "l", n[2] - l ]);
                    if (n[0] >= o[2] - .5) cortes.push([ "r", r - n[0] ]);
                    if (!cortes.length) continue;
                    cortes.sort(((a, c) => a[1] - c[1]));
                    const lado = cortes[0][0];
                    if (lado === "t") t = n[3]; else if (lado === "b") b = n[1]; else if (lado === "l") l = n[2]; else r = n[0];
                }
            };
            recortar();
            if (b - t < MIN_TOQUE) {
                const falta = MIN_TOQUE - (b - t);
                if (t > o[1] - fh / 2 + .5) b += falta; else t -= falta;
            }
            if (r - l < MIN_TOQUE) {
                const falta = MIN_TOQUE - (r - l);
                if (l > o[0] - fw / 2 + .5) r += falta; else l -= falta;
            }
            recortar();
            res[id] = [ Math.min(l, o[0]), Math.min(t, o[1]), Math.max(r, o[2]), Math.max(b, o[3]) ];
        }
        return res;
    }
    function medir() {
        const r = raiz.getBoundingClientRect();
        vw = Math.max(1, r.width);
        vh = Math.max(1, r.height);
        dpr = Math.min(3, window.devicePixelRatio || 1);
        canvas.width = Math.round(vw * dpr);
        canvas.height = Math.round(vh * dpr);
        canvas.style.width = `${vw}px`;
        canvas.style.height = `${vh}px`;
        M = margenes(r);
        const aw = Math.max(1, vw - M.l - M.r);
        const ah = Math.max(1, vh - M.t - M.b);
        const s = Math.min(aw / (SX1 - SX0), ah / (SY1 - SY0));
        const cx = (SX0 + SX1) / 2;
        const cy = (SY0 + SY1) / 2;
        let ox = M.l + aw / 2 - cx * s;
        let oy = M.t + ah / 2 - cy * s;
        ox = MW * s >= vw ? Math.min(0, Math.max(vw - MW * s, ox)) : (vw - MW * s) / 2;
        oy = MH * s >= vh ? Math.min(0, Math.max(vh - MH * s, oy)) : (vh - MH * s) / 2;
        ox = Math.max(M.l - SX0 * s, Math.min(vw - M.r - SX1 * s, ox));
        oy = Math.max(M.t - SY0 * s, Math.min(vh - M.b - SY1 * s, oy));
        T = {
            s: s,
            ox: ox,
            oy: oy
        };
        const toque = cajasDeToque();
        for (const [id, {el: el, caja: caja}] of Object.entries(botones)) {
            const [x0, y0, x1, y1] = toque[id] || [ ox + caja[0] * s, oy + caja[1] * s, ox + (caja[2] + 1) * s, oy + (caja[3] + 1) * s ];
            el.style.left = `${x0}px`;
            el.style.top = `${y0}px`;
            el.style.width = `${x1 - x0}px`;
            el.style.height = `${y1 - y0}px`;
        }
        ubicarGlobo();
        dibujar(performance.now());
    }
    function ponerGlobo(el, x, top) {
        const cx = T.ox + x * T.s;
        const w = el.offsetWidth;
        const lo = M.l + 6 + w / 2;
        const hi = vw - M.r - 6 - w / 2;
        const c = w && lo <= hi ? Math.max(lo, Math.min(hi, cx)) : cx;
        el.style.left = `${Math.round(c)}px`;
        el.style.top = `${Math.round(top)}px`;
        el.style.setProperty("--cola", `${Math.round(Math.max(-w / 2 + 12, Math.min(w / 2 - 12, cx - c)))}px`);
    }
    function ubicarGlobo() {
        const f = Personaje.figura(actor.pose);
        const arriba = PIE - (f.pies - Math.max(f.arriba, 8));
        ponerGlobo(globo, actor.x, T.oy + arriba * T.s);
    }
    const actor = {
        x: bcx,
        pose: "sentado",
        dir: 1,
        paso: null,
        plan: [],
        prox: performance.now() + 14e3 + Math.random() * 12e3,
        mira: [ 0, 0 ],
        salto: 0,
        estira: 0,
        t0: 0
    };
    const VELOCIDAD = 24;
    const PLANES = {
        ventana: () => [ {
            tipo: "pararse"
        }, {
            tipo: "caminar",
            a: 156
        }, {
            tipo: "mirar",
            ms: 6500,
            ojo: [ -1, -1 ]
        }, {
            tipo: "caminar",
            a: bcx
        }, {
            tipo: "sentarse"
        } ],
        tele: () => [ {
            tipo: "pararse"
        }, {
            tipo: "caminar",
            a: 236
        }, {
            tipo: "mirar",
            ms: 5500,
            ojo: [ 1, 0 ]
        }, {
            tipo: "caminar",
            a: bcx
        }, {
            tipo: "sentarse"
        } ],
        estirarse: () => [ {
            tipo: "pararse"
        }, {
            tipo: "estirarse",
            ms: 1700
        }, {
            tipo: "mirar",
            ms: 900,
            ojo: [ 0, 0 ]
        }, {
            tipo: "sentarse"
        } ],
        visita: () => [ {
            tipo: "pararse"
        }, {
            tipo: "caminar",
            a: 156
        }, {
            tipo: "mirar",
            ms: 6e5,
            ojo: [ -1, -1 ]
        } ],
        pasear: () => [ {
            tipo: "pararse"
        }, {
            tipo: "caminar",
            a: bcx + 26
        }, {
            tipo: "mirar",
            ms: 1500,
            ojo: [ 1, 0 ]
        }, {
            tipo: "caminar",
            a: bcx - 22
        }, {
            tipo: "mirar",
            ms: 1500,
            ojo: [ -1, 0 ]
        }, {
            tipo: "caminar",
            a: bcx
        }, {
            tipo: "sentarse"
        } ]
    };
    let ultimoNpc = null;
    function empezarPlan(nombre, ahora) {
        actor.plan = PLANES[nombre]();
        actor.paso = null;
        actor.prox = ahora + 26e3 + Math.random() * 34e3;
    }
    function aCasa() {
        actor.plan = [];
        actor.paso = null;
        actor.x = bcx;
        actor.pose = "sentado";
        actor.mira = [ 0, 0 ];
        actor.estira = 0;
    }
    function moverActor(e, ahora, dt) {
        if (e.dormido || e.quieto) {
            if (actor.pose !== "sentado" || actor.x !== bcx) aCasa();
            actor.prox = Math.max(actor.prox, ahora + 8e3);
            return;
        }
        if (e.npc && e.npc !== ultimoNpc && actor.plan.length === 0) empezarPlan("ventana", ahora);
        ultimoNpc = e.npc;
        if (actor.plan.length === 0) {
            actor.mira = [ 0, 0 ];
            if (ahora > actor.prox) {
                const r = Math.random();
                empezarPlan(r < .4 ? "ventana" : r < .62 ? "tele" : r < .82 ? "pasear" : "estirarse", ahora);
            }
            return;
        }
        if (!actor.paso) {
            actor.paso = actor.plan[0];
            actor.t0 = ahora;
        }
        const p = actor.paso;
        const t = ahora - actor.t0;
        let listo = false;
        if (p.tipo === "pararse") {
            actor.pose = "parado";
            actor.salto = t < 120 ? -2 : t < 240 ? -1 : 0;
            listo = t > 320;
        } else if (p.tipo === "sentarse") {
            actor.mira = [ 0, 0 ];
            actor.salto = t < 120 ? -1 : 0;
            if (t > 120) actor.pose = "sentado";
            listo = t > 300;
        } else if (p.tipo === "caminar") {
            const d = p.a - actor.x;
            actor.dir = d < 0 ? -1 : 1;
            actor.mira = [ actor.dir, 0 ];
            const pasoX = VELOCIDAD * dt / 1e3;
            if (Math.abs(d) <= pasoX) {
                actor.x = p.a;
                listo = true;
            } else actor.x += Math.sign(d) * pasoX;
            actor.salto = Math.floor(ahora / 180) % 2 ? -1 : 0;
        } else if (p.tipo === "mirar") {
            actor.mira = p.ojo;
            actor.salto = 0;
            listo = t > p.ms;
        } else if (p.tipo === "estirarse") {
            const k = t / p.ms;
            actor.estira = k < .5 ? Math.sin(k * Math.PI) : Math.sin(k * Math.PI);
            listo = t > p.ms;
            if (listo) actor.estira = 0;
        }
        if (listo) {
            actor.plan.shift();
            actor.paso = null;
            actor.salto = 0;
        }
    }
    function ubicarCajaActor() {
        const f = Personaje.figura(actor.pose);
        const caja = [ actor.x - 24, PIE - (f.pies - Math.max(f.arriba, 6)), actor.x + 24, PIE ];
        const b = botones.baozi;
        if (!b) return;
        b.caja = caja;
        const [x0, y0, x1, y1] = caja;
        b.el.style.left = `${T.ox + x0 * T.s}px`;
        b.el.style.top = `${T.oy + y0 * T.s}px`;
        b.el.style.width = `${(x1 - x0 + 1) * T.s}px`;
        b.el.style.height = `${(y1 - y0 + 1) * T.s}px`;
    }
    const compuestos = new Map;
    function mantouCompuesto(pose, cara, tinte) {
        const clave = `${pose}|${cara}|${tinte.join(",")}`;
        if (compuestos.has(clave)) return compuestos.get(clave);
        const capasM = Personaje.capas("", "", pose === "parado" ? "parado" : "sentado", "mantou");
        const cuerpo = imgOAnterior("cuerpo-alta", capasM[0].src);
        const real = img(cara);
        const caraImg = imgOAnterior("cara-alta", cara);
        if (!listo(cuerpo) || !listo(caraImg)) return null;
        const provisoria = caraImg !== real || cuerpo !== img(capasM[0].src);
        const c = document.createElement("canvas");
        c.width = cuerpo.naturalWidth;
        c.height = cuerpo.naturalHeight;
        const x = c.getContext("2d");
        x.drawImage(cuerpo, 0, 0);
        x.drawImage(caraImg, 0, 0, c.width, c.height);
        x.globalCompositeOperation = "multiply";
        x.fillStyle = `rgb(${tinte.join(",")})`;
        x.fillRect(0, 0, c.width, c.height);
        x.globalCompositeOperation = "destination-in";
        x.drawImage(cuerpo, 0, 0);
        if (provisoria) return c;
        if (compuestos.size > 10) compuestos.delete(compuestos.keys().next().value);
        compuestos.set(clave, c);
        return c;
    }
    const TINTES = {
        dia: [ 255, 250, 244 ],
        amanecer: [ 248, 226, 222 ],
        atardecer: [ 246, 218, 200 ],
        noche: [ 212, 212, 240 ],
        dormido: [ 156, 160, 212 ],
        siesta: [ 196, 192, 200 ]
    };
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(medir) : null;
    if (ro) ro.observe(raiz); else window.addEventListener("resize", medir);
    function golpe(id) {
        golpes[id] = performance.now();
        if (id === "mascota") mas.corazon = performance.now();
    }
    function offsetGolpe(id, ahora) {
        const t = golpes[id];
        if (!t) return 0;
        const dt = ahora - t;
        if (dt > 250) return 0;
        return dt < 90 ? -2 : dt < 170 ? 1 : 0;
    }
    function sprite(rel, x, y) {
        const i = img(rel);
        if (listo(i)) m.drawImage(i, Math.round(x), Math.round(y));
    }
    function dibujarDeco(id, e, ahora) {
        const d = DECORACIONES[id];
        if (!d) return;
        const a = ANIM_DECO[id];
        const i = a ? img(srcAnim(id, e)) : null;
        if (!a || !listo(i)) {
            sprite(srcDeco(id, e), d[0], d[1]);
            return;
        }
        const w = i.naturalWidth / a.n;
        const k = Math.max(0, Math.min(a.n - 1, a.cuadro(ahora, e) | 0));
        m.drawImage(i, k * w, 0, w, i.naturalHeight, d[0] - 1, d[1] - 1 + (a.dy ? a.dy(ahora) : 0), w, i.naturalHeight);
    }
    const COLOR_PEZ = {
        nativo: [ "rgb(244,122,44)", "rgb(255,170,90)" ],
        dorado: [ "rgb(244,132,44)", "rgb(255,180,100)" ],
        koi: [ "rgb(246,244,240)", "rgb(230,70,60)" ],
        koi_dorado: [ "rgb(250,206,80)", "rgb(255,236,150)" ]
    };
    function px(x, y, color) {
        m.fillStyle = color;
        m.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    function voluta(x0, y0, ahora, ciclo, fase, alto, rgb, alfa) {
        const t = (ahora + fase) % ciclo / ciclo;
        for (let k = 0; k < 3; k++) {
            const tk = t - k * .09;
            if (tk < 0 || tk > 1) continue;
            const y = y0 - tk * alto;
            const x = x0 + Math.sin(tk * 7 + fase) * 1.2;
            px(x, y, `rgba(${rgb},${(alfa * (1 - tk) * (1 - k * .25)).toFixed(3)})`);
        }
    }
    function vidaDecos(decos, e, ahora, clave) {
        const hay = new Set(decos);
        if (hay.has("pecera")) {
            const [bx, by] = DECORACIONES.pecera;
            const peces = [ "nativo", "nativo", ...(e.pecera || []).slice(-4) ];
            peces.forEach(((id, i) => {
                const t = ahora / (2300 + i * 470) + i * 1.9;
                const dir = Math.cos(t) > 0 ? 1 : -1;
                const x = bx + 8 + Math.sin(t) * (4 - i % 2);
                const y = by + 6 + i * 2 % 5 + Math.round(Math.sin(ahora / 1700 + i) * .6);
                const [c1, c2] = COLOR_PEZ[id] || COLOR_PEZ.nativo;
                const xi = Math.round(x);
                px(xi - dir, y, c1);
                px(xi, y, c1);
                px(xi + dir, y, c2);
                px(xi - 2 * dir, y + (Math.floor(ahora / 260 + i) % 2 ? 0 : -1), c1);
                const r = (ahora + i * 1300) % 3100;
                if (i < 3 && r < 1300) {
                    const yb = y - 1 - r / 1300 * (y - by - 3);
                    px(xi + dir * 2 + Math.floor(r / 300) % 2, yb, "rgba(250,254,255,0.95)");
                }
            }));
        }
        if (hay.has("chiva")) {
            const [cx, cy] = DECORACIONES.chiva;
            const r = ahora % 9e3;
            if (r < 2300) {
                for (let k = 0; k < 4; k++) {
                    const nace = k * 380;
                    const vida = r - nace;
                    if (vida < 0 || vida > 900 || nace > 1500) continue;
                    const t = vida / 900;
                    m.fillStyle = `rgba(214,214,220,${(.75 * (1 - t)).toFixed(3)})`;
                    m.fillRect(Math.round(cx - 1 - t * 5), Math.round(cy + 11 - t * 4), t < .5 ? 1 : 2, 1);
                }
            }
        }
        if (hay.has("saco")) {
            const [sx, sy] = DECORACIONES.saco;
            voluta(sx + 7, sy - 1, ahora, 3400, 0, 8, "236,214,180", .8);
            voluta(sx + 11, sy - 1, ahora, 3400, 1700, 7, "236,214,180", .7);
        }
        if (hay.has("te")) {
            const [tx, ty] = DECORACIONES.te;
            voluta(tx + 4, ty - 1, ahora, 2600, 0, 7, "255,255,255", .85);
            voluta(tx + 12, ty + 5, ahora, 2600, 1300, 5, "255,255,255", .75);
        }
        if (hay.has("cuadro")) {
            const [qx, qy] = DECORACIONES.cuadro;
            for (let k = 0; k < 2; k++) {
                const t = (ahora + k * 2900) % 5800 / 5800;
                const x = qx + (k ? 17 : 3) + Math.floor(t * 9) % 2;
                px(x, qy + 3 + t * 19, "rgba(246,186,210,0.95)");
            }
        }
        if (hay.has("luces") && clave === "dia") {
            const k = Math.floor(ahora / 1300);
            if (ahora % 1300 < 260) {
                const [lx, ly] = DECORACIONES.luces;
                const [x, y] = FOCOS_LUCES[k * 7 % FOCOS_LUCES.length];
                px(lx + x, ly + y + 1, "rgba(255,252,226,0.95)");
            }
        }
    }
    const VELAS = [];
    for (let x = VX0 - 3; x <= VX1 + 3; x += 9) VELAS.push([ x, VY1 + 5 ]);
    for (let x = 14; x <= MW - 10; x += 20) if (x < 150 || x > 250) VELAS.push([ x, 146 - (x % 40 === 14 ? 2 : 0) ]);
    const FAROLES_VELITAS = [ [ 40, 140, "220,60,60" ], [ 92, 143, "246,200,40" ], [ 262, 141, "60,150,90" ], [ 316, 143, "60,100,200" ], [ 150, 145, "230,110,170" ], [ 238, 145, "246,140,40" ] ];
    function brilloVela(x, y, rgb, a, r = 5) {
        m.save();
        m.globalCompositeOperation = "screen";
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                const dd = Math.hypot(dx, dy * 1.15);
                if (dd > r) continue;
                if (BAYER[(y + dy + 40) % 4][(x + dx + 40) % 4] > 16 * (1 - dd / r)) continue;
                m.fillStyle = `rgba(${rgb},${(a * (1 - dd / r)).toFixed(3)})`;
                m.fillRect(Math.round(x + dx), Math.round(y + dy), 1, 1);
            }
        }
        m.restore();
    }
    const FLOR_MINI = {
        girasol: "252,206,52",
        longjing: "186,226,112",
        loto: "244,160,190",
        bambu: "140,186,86",
        cafe: "210,44,50",
        orquidea: "222,160,230",
        maracuya: "240,200,60",
        osmanto: "250,170,48"
    };
    function jardinera(estados, momento) {
        const X0 = 112, Y0 = 72;
        const noche = momento === "noche";
        const px = (x, y, w, h, c) => {
            m.fillStyle = `rgb(${c})`;
            m.fillRect(x, y, w, h);
        };
        estados.forEach(((p, i) => {
            if (!p) return;
            const x = X0 + 3 + i * 7;
            const verde = p.mustia ? "164,150,84" : noche ? "62,100,60" : "96,150,72";
            const oscuro = p.mustia ? "126,110,64" : noche ? "44,74,44" : "60,108,54";
            if (p.etapa === 0) {
                px(x + 1, Y0 - 1, 2, 1, "110,80,54");
                return;
            }
            const alto = p.etapa === 1 ? 2 : p.etapa === 2 ? 5 : p.planta === "bambu" ? 9 : 7;
            px(x + 1, Y0 - alto, 1, alto, oscuro);
            px(x, Y0 - 2, 1, 1, verde);
            px(x + 2, Y0 - 2, 1, 1, verde);
            if (p.etapa >= 2) {
                px(x, Y0 - 4, 1, 1, verde);
                px(x + 2, Y0 - 5, 1, 1, verde);
            }
            if (p.etapa === 3) {
                const c = p.mustia ? "170,150,118" : FLOR_MINI[p.planta] || "250,250,250";
                if (p.planta === "bambu") px(x + 2, Y0 - 8, 1, 1, verde); else px(x, Y0 - alto - 1, 3, 2, c);
            }
        }));
        px(X0, Y0, 30, 6, noche ? "120,72,48" : "176,104,66");
        px(X0, Y0, 30, 1, noche ? "146,92,64" : "206,134,92");
        px(X0, Y0 + 5, 30, 1, noche ? "88,52,36" : "130,74,48");
    }
    function velitas(ahora) {
        VELAS.forEach((([x, y], i) => {
            const tit = Math.floor(ahora / 140 + i * 3.3) % 3;
            brilloVela(x, y - 5, "255,190,100", .32 + tit * .04, 6);
            m.fillStyle = "rgb(244,240,226)";
            m.fillRect(x, y - 4, 2, 4);
            m.fillStyle = "rgb(206,198,180)";
            m.fillRect(x + 1, y - 4, 1, 4);
            m.fillStyle = tit === 2 ? "rgb(255,236,170)" : "rgb(255,200,90)";
            m.fillRect(x, y - 6 - (tit === 1 ? 1 : 0), 1, 2);
            m.fillStyle = "rgb(255,150,50)";
            m.fillRect(x + (tit === 0 ? 1 : 0), y - 5, 1, 1);
        }));
        FAROLES_VELITAS.forEach((([x, y, rgb], i) => {
            const tit = Math.floor(ahora / 170 + i * 2.1) % 2;
            brilloVela(x + 3, y - 4, rgb, .3 + tit * .05, 8);
            m.fillStyle = `rgb(${rgb})`;
            m.fillRect(x, y - 8, 7, 8);
            m.fillStyle = "rgba(255,240,200,0.75)";
            m.fillRect(x + 2, y - 6, 3, 5);
            m.fillStyle = "rgb(60,40,30)";
            m.fillRect(x, y - 9, 7, 1);
            m.fillRect(x, y, 7, 1);
            m.fillStyle = tit ? "rgb(255,230,150)" : "rgb(255,200,90)";
            m.fillRect(x + 3, y - 4, 1, 2);
        }));
    }
    function pixel(x, y, c) {
        m.fillStyle = c;
        m.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    function linea(x0, y0, x1, y1, c) {
        x0 = Math.round(x0);
        y0 = Math.round(y0);
        x1 = Math.round(x1);
        y1 = Math.round(y1);
        const dx = Math.abs(x1 - x0);
        const dy = -Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        for (;;) {
            pixel(x0, y0, c);
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 >= dy) {
                err += dy;
                x0 += sx;
            }
            if (e2 <= dx) {
                err += dx;
                y0 += sy;
            }
        }
    }
    function aviso(id, ahora) {
        const caja = cajas[id];
        if (!caja) return;
        const yMin = Math.ceil((M.t - T.oy) / T.s) + 2;
        const xMin = Math.ceil((M.l - T.ox) / T.s) + 6;
        const xMax = Math.floor((vw - M.r - T.ox) / T.s) - 6;
        let cx = Math.round((caja[0] + caja[2]) / 2);
        let y = caja[1] - 9 + Math.floor(ahora / 400) % 2;
        let lado = "abajo";
        if (y < yMin) {
            cx = caja[2] + 7;
            y = Math.max(yMin, Math.round((caja[1] + caja[3]) / 2) - 4 + Math.floor(ahora / 400) % 2);
            lado = "izquierda";
        }
        if (xMin <= xMax) cx = Math.max(xMin, Math.min(xMax, cx));
        m.fillStyle = TINTA;
        m.fillRect(cx - 4, y - 1, 9, 9);
        m.fillStyle = "rgb(252,248,238)";
        m.fillRect(cx - 3, y, 7, 7);
        m.fillStyle = TINTA;
        if (lado === "abajo") m.fillRect(cx - 1, y + 8, 2, 1); else m.fillRect(cx - 5, y + 3, 1, 2);
        m.fillStyle = "rgb(214,70,80)";
        m.fillRect(cx, y + 1, 1, 3);
        m.fillRect(cx, y + 5, 1, 1);
    }
    const compC = document.createElement("canvas");
    compC.width = compC.height = 96;
    const compX = compC.getContext("2d");
    const compTin = document.createElement("canvas");
    compTin.width = compTin.height = 96;
    const compTinX = compTin.getContext("2d");
    const comp = {
        pose: "sentado",
        t0: 0,
        prox: performance.now() + 25e3 + Math.random() * 2e4,
        parpadeo: performance.now() + 3e3,
        corazon: 0,
        proxCorazon: performance.now() + 12e3
    };
    function dibujarCompanero(e, ahora) {
        const c = e.companero;
        const b = botones.companero;
        if (b) b.el.hidden = !c;
        if (!c) return;
        const dormido = !!e.dormido;
        if (!dormido && comp.pose === "sentado" && ahora > comp.prox) {
            comp.pose = "parado";
            comp.t0 = ahora;
        }
        let x = COMP_X;
        let volteado = false;
        if (comp.pose === "parado") {
            const t = (ahora - comp.t0) / 6e3;
            if (t >= 1 || dormido) {
                comp.pose = "sentado";
                comp.prox = ahora + 3e4 + Math.random() * 4e4;
            } else {
                x = COMP_X + Math.round(16 * Math.sin(Math.PI * t));
                volteado = t < .5;
            }
        }
        const pose = dormido ? "dormido" : comp.pose;
        let ojo = "ojo_base_energia_alta.png";
        let boca = "boca_base_feliz.png";
        if (dormido) {
            ojo = "ojo_dormida.png";
            boca = "boca_dormida.png";
        } else if (ahora > comp.parpadeo) {
            ojo = "ojo_base_energia_baja.png";
            if (ahora > comp.parpadeo + 140) comp.parpadeo = ahora + 2600 + Math.random() * 3600;
        }
        const capas = Personaje.capas(ojo, boca, pose, c.quien);
        compX.clearRect(0, 0, 96, 96);
        for (const capa of capas) {
            if (capa.tipo === "accesorio") continue;
            const i = img(capa.src);
            if (listo(i)) compX.drawImage(i, 0, 0);
        }
        const luz = c.quien === "mantou" ? LUZ_CLARO[dormido ? e.momento === "noche" ? "dormido" : "siesta" : e.momento] : null;
        if (luz) {
            compTinX.globalCompositeOperation = "source-over";
            compTinX.clearRect(0, 0, 96, 96);
            compTinX.fillStyle = `rgb(${luz.join(",")})`;
            compTinX.fillRect(0, 0, 96, 96);
            compTinX.globalCompositeOperation = "destination-in";
            compTinX.drawImage(compC, 0, 0);
            compX.globalCompositeOperation = "multiply";
            compX.drawImage(compTin, 0, 0);
            compX.globalCompositeOperation = "source-over";
        }
        const fig = Personaje.figura(pose === "parado" ? "parado" : "sentado", c.quien);
        const respira = pose === "sentado" && Math.floor(ahora / 760) % 3 === 1 ? -1 : 0;
        m.save();
        m.translate(x, 0);
        m.scale(volteado ? -1 : 1, 1);
        m.drawImage(compC, -48, PIE - fig.pies + respira);
        m.restore();
        if (b) {
            b.caja = [ x - 22, PIE - (fig.pies - Math.max(fig.arriba, 6)), x + 22, PIE ];
            const [x0, y0, x1, y1] = b.caja;
            b.el.style.left = `${T.ox + x0 * T.s}px`;
            b.el.style.top = `${T.oy + y0 * T.s}px`;
            b.el.style.width = `${(x1 - x0 + 1) * T.s}px`;
            b.el.style.height = `${(y1 - y0 + 1) * T.s}px`;
        }
        const texto = e.globoCompanero || "";
        if (globoComp.textContent !== texto) {
            globoComp.textContent = texto;
            globoComp.classList.toggle("oculto", !texto);
        }
        const encima = e.globo ? 30 : 0;
        if (texto) ponerGlobo(globoComp, x, T.oy + (PIE - (fig.pies - Math.max(fig.arriba, 8))) * T.s - encima);
        if (!dormido && !e.dormido && comp.pose === "sentado" && ahora > comp.proxCorazon) {
            comp.corazon = ahora;
            comp.proxCorazon = ahora + 25e3 + Math.random() * 25e3;
        }
        if (comp.corazon && ahora - comp.corazon < 2200) {
            const t = (ahora - comp.corazon) / 2200;
            const hx = Math.round((bcx + COMP_X) / 2) - 3;
            const hy = Math.round(PIE - 58 - t * 12);
            CORAZON_NUBE.forEach(((fila, j) => {
                for (let i = 0; i < fila.length; i++) {
                    if (fila[i] === "0") continue;
                    m.fillStyle = fila[i] === "2" ? `rgba(255,214,224,${1 - t})` : `rgba(232,64,96,${1 - t})`;
                    m.fillRect(hx + i, hy + j, 1, 1);
                }
            }));
        }
    }
    const LUGARES_MASCOTA = [ 152, 52, 306 ];
    const PIE_MASCOTA = 147;
    const VEL_MASCOTA = {
        gato: 20,
        perro: 26,
        serpiente: 8
    };
    const mas = {
        id: null,
        x: LUGARES_MASCOTA[0],
        dir: 1,
        pose: "quieta",
        destino: null,
        prox: 0,
        siesta: 0,
        corazon: 0,
        parpadeo: 0
    };
    const CUADROS_MASCOTA = {
        gato: [ "sentado", "sentado_b", "parpadeo", "dormido", "dormido_b", "camina", "camina_b", "camina_c", "camina_d" ],
        perro: [ "sentado", "sentado_b", "parpadeo", "contento", "dormido", "dormido_b", "camina", "camina_b", "camina_c", "camina_d" ],
        serpiente: [ "enroscada", "alta", "lengua", "dormida", "repta", "repta_b", "repta_c", "repta_d", "repta_e", "repta_f" ]
    };
    let ultimoCuadro = null;
    const masC = document.createElement("canvas");
    masC.width = 22;
    masC.height = 21;
    const masX = masC.getContext("2d");
    function moverMascota(e, ahora, dt) {
        const id = e.mascota || null;
        if (mas.id !== id) {
            mas.id = id;
            ultimoCuadro = null;
            if (id && CUADROS_MASCOTA[id]) for (const c of CUADROS_MASCOTA[id]) img(`mascotas/${id}_${c}.png`);
            mas.x = LUGARES_MASCOTA[0];
            mas.pose = "quieta";
            mas.destino = null;
            mas.prox = ahora + 9e3 + Math.random() * 9e3;
        }
        if (!id) return;
        if (e.dormido) {
            mas.destino = null;
            mas.pose = "dormida";
            mas.siesta = ahora + 4e3;
            return;
        }
        if (mas.pose === "dormida" && ahora > mas.siesta) mas.pose = "quieta";
        if (id === "perro" && mas.pose !== "dormida" && actor.paso && actor.paso.tipo === "caminar") {
            const obj = Math.max(40, Math.min(318, Math.round(actor.x - 30 * actor.dir)));
            if (Math.abs(obj - mas.x) > 8) mas.destino = obj;
        }
        if (mas.destino == null && mas.pose !== "dormida" && ahora > mas.prox) {
            const r = Math.random();
            if (r < .5) {
                const otros = LUGARES_MASCOTA.filter((l => Math.abs(l - mas.x) > 20));
                mas.destino = otros[Math.floor(Math.random() * otros.length)];
            } else if (r < .75) {
                mas.pose = "dormida";
                mas.siesta = ahora + 18e3 + Math.random() * 25e3;
            }
            mas.prox = ahora + 22e3 + Math.random() * 26e3;
        }
        if (mas.destino != null) {
            mas.pose = "camina";
            const d = mas.destino - mas.x;
            mas.dir = d < 0 ? -1 : 1;
            const paso = (VEL_MASCOTA[id] || 20) * dt / 1e3;
            if (Math.abs(d) <= paso) {
                mas.x = mas.destino;
                mas.destino = null;
                mas.pose = "quieta";
            } else mas.x += Math.sign(d) * paso;
        }
    }
    function cuadroMascota(id, ahora) {
        const alt = ms => Math.floor(ahora / ms) % 2 === 1;
        if (mas.pose === "dormida") return id === "serpiente" ? "serpiente_dormida" : `${id}_dormido${alt(1100) ? "_b" : ""}`;
        if (mas.pose === "camina") return id === "serpiente" ? `serpiente_repta${[ "", "_b", "_c", "_d", "_e", "_f" ][Math.floor(ahora / 120) % 6]}` : `${id}_camina${[ "", "_b", "_c", "_d" ][Math.floor(ahora / (id === "perro" ? 120 : 150)) % 4]}`;
        if (!mas.parpadeo) mas.parpadeo = ahora + 3e3;
        if (ahora > mas.parpadeo + 150) mas.parpadeo = ahora + 2500 + Math.random() * 3500;
        const parpadea = ahora > mas.parpadeo;
        if (id === "serpiente") {
            if (ahora % 3600 < 360) return "serpiente_lengua";
            return alt(1700) ? "serpiente_alta" : "serpiente_enroscada";
        }
        if (parpadea) return `${id}_parpadeo`;
        if (id === "perro") {
            if (mas.corazon && ahora - mas.corazon < 2e3) return "perro_contento";
            return `perro_sentado${alt(240) ? "_b" : ""}`;
        }
        return `gato_sentado${Math.floor(ahora / 650) % 4 === 0 ? "_b" : ""}`;
    }
    function dibujarMascota(e, ahora) {
        const b = botones.mascota;
        if (b) b.el.hidden = !mas.id;
        if (!mas.id) return;
        let sp = img(`mascotas/${cuadroMascota(mas.id, ahora)}.png`);
        if (!listo(sp)) sp = ultimoCuadro;
        if (!listo(sp)) return;
        ultimoCuadro = sp;
        const x = Math.round(mas.x);
        const rs = (sp.naturalWidth || 22) > 22 ? 13 : 8;
        for (let xx = x - rs; xx <= x + rs; xx++) {
            for (let yy = PIE_MASCOTA - 1; yy <= PIE_MASCOTA + 1; yy++) {
                if (((xx - x) / (rs + .5)) ** 2 + ((yy - PIE_MASCOTA) / 1.6) ** 2 <= 1 && BAYER[(yy % 4 + 4) % 4][(xx % 4 + 4) % 4] < 10) pixel(xx, yy, "rgb(22,24,46)");
            }
        }
        const sw = sp.naturalWidth || 22;
        const sh = sp.naturalHeight || 21;
        if (masC.width !== sw || masC.height !== sh) {
            masC.width = sw;
            masC.height = sh;
        }
        masX.globalCompositeOperation = "source-over";
        masX.clearRect(0, 0, sw, sh);
        masX.drawImage(sp, 0, 0);
        const luz = LUZ_CLARO[luzDe(e)];
        if (luz) {
            masX.globalCompositeOperation = "multiply";
            masX.fillStyle = `rgb(${luz.join(",")})`;
            masX.fillRect(0, 0, sw, sh);
            masX.globalCompositeOperation = "destination-in";
            masX.drawImage(sp, 0, 0);
            masX.globalCompositeOperation = "source-over";
        }
        const y0 = PIE_MASCOTA - (sh - 1) + offsetGolpe("mascota", ahora);
        m.save();
        m.translate(x, 0);
        m.scale(mas.dir < 0 ? -1 : 1, 1);
        m.drawImage(masC, -Math.floor(sw / 2), y0);
        m.restore();
        if (b) {
            const mitad = Math.max(12, Math.ceil(sw / 2) + 1);
            b.caja = [ x - mitad, PIE_MASCOTA - 22, x + mitad, PIE_MASCOTA + 2 ];
            const [x0, yA, x1, yB] = b.caja;
            b.el.style.left = `${T.ox + x0 * T.s}px`;
            b.el.style.top = `${T.oy + yA * T.s}px`;
            b.el.style.width = `${(x1 - x0 + 1) * T.s}px`;
            b.el.style.height = `${(yB - yA + 1) * T.s}px`;
        }
        if (mas.corazon && ahora - mas.corazon < 1600) {
            const t = (ahora - mas.corazon) / 1600;
            const hx = x - 3;
            const hy = Math.round(PIE_MASCOTA - 30 - t * 10);
            CORAZON_NUBE.forEach(((fila, j) => {
                for (let i = 0; i < fila.length; i++) {
                    if (fila[i] === "0") continue;
                    m.fillStyle = fila[i] === "2" ? `rgba(255,214,224,${1 - t})` : `rgba(232,64,96,${1 - t})`;
                    m.fillRect(hx + i, hy + j, 1, 1);
                }
            }));
        }
    }
    const fuegoC = document.createElement("canvas");
    fuegoC.width = MW;
    fuegoC.height = MH;
    const f = fuegoC.getContext("2d");
    let silueta = null;
    const silC = document.createElement("canvas");
    silC.width = MW;
    silC.height = MH;
    const sil = silC.getContext("2d", {
        willReadFrequently: true
    });
    function llamas(fuegoXs, ahora, dormido) {
        f.clearRect(0, 0, MW, MH);
        dibujarLlamas(fuegoXs, ahora, dormido);
        if (silueta) {
            const {c: c, tx: tx, ty: ty, sx: sx, sy: sy, pies: pies} = silueta;
            const zx0 = Math.max(0, fuegoXs[0] - 4);
            const zx1 = Math.min(MW - 1, fuegoXs[1] + 4);
            const zy0 = 40;
            const zh = PIEZA.piso - zy0;
            sil.setTransform(1, 0, 0, 1, 0, 0);
            sil.clearRect(zx0, zy0, zx1 - zx0 + 1, zh);
            sil.setTransform(sx, 0, 0, sy, tx, ty);
            sil.drawImage(c, -48, -pies, 96, 96);
            sil.setTransform(1, 0, 0, 1, 0, 0);
            const d = sil.getImageData(zx0, zy0, zx1 - zx0 + 1, zh).data;
            const w = zx1 - zx0 + 1;
            const arriba = new Array(w).fill(Infinity);
            for (let i = 0; i < w; i++) {
                for (let j = 0; j < zh; j++) {
                    if (d[(j * w + i) * 4 + 3] > 40) {
                        arriba[i] = zy0 + j;
                        break;
                    }
                }
            }
            for (let i = 0; i < w; i++) {
                let top = Infinity;
                for (let k = Math.max(0, i - 2); k <= Math.min(w - 1, i + 2); k++) top = Math.min(top, arriba[k]);
                if (top !== Infinity) f.clearRect(zx0 + i, top - 2, 1, MH);
            }
        }
        m.drawImage(fuegoC, 0, 0);
    }
    function dibujarLlamas([x0, x1], ahora, dormido) {
        const base = PIEZA.piso - 11;
        const n = Math.floor((x1 - x0 - 8) / 5);
        for (let i = 0; i <= n; i++) {
            const cx = x0 + 6 + i * 5;
            const centro = 1 - Math.abs(i - n / 2) / (n / 2 + 1);
            const t = ahora / 140 + i * 2.3;
            let alto = Math.round((dormido ? 3 : 7 + 9 * centro) * (.75 + .25 * Math.sin(t) + .12 * Math.sin(t * 2.7)));
            if (alto < 2) alto = 2;
            for (let k = 0; k < alto; k++) {
                const ancho = Math.max(0, Math.round(2.4 * (1 - k / alto)));
                const dx = Math.round(Math.sin(t * 1.3 + k * .5) * (k / alto) * 1.5);
                for (let xx = cx - ancho; xx <= cx + ancho; xx++) {
                    const borde = Math.abs(xx - cx) >= ancho;
                    f.fillStyle = dormido ? "rgb(200,70,40)" : k < 2 || !borde ? k > alto * .6 ? "rgb(255,170,70)" : "rgb(255,226,140)" : "rgb(236,104,48)";
                    f.fillRect(xx + dx, base - k, 1, 1);
                }
            }
        }
        if (!dormido) {
            for (let i = 0; i < 3; i++) {
                const t = (ahora / 1100 + i * .37) % 1;
                const x = x0 + 12 + (i * 17 + Math.floor(ahora / 1100) * 7) % (x1 - x0 - 20);
                f.fillStyle = `rgba(255,200,110,${(1 - t).toFixed(2)})`;
                f.fillRect(Math.round(x + Math.sin(t * 9) * 2), Math.round(base - 18 - t * 20), 1, 1);
            }
        }
    }
    const CORAZON_NUBE = [ "0110110", "1211111", "1111111", "0111110", "0011100", "0001000" ];
    function nubeDeseo(x, y, ahora) {
        y += Math.floor(ahora / 520) % 2;
        x = Math.max(2, Math.min(MW - 24, x));
        y = Math.max(2, y);
        m.fillStyle = TINTA;
        m.fillRect(x + 1, y, 18, 13);
        m.fillRect(x, y + 1, 20, 11);
        m.fillStyle = "rgb(252,248,238)";
        m.fillRect(x + 1, y + 1, 18, 11);
        m.fillStyle = TINTA;
        m.fillRect(x - 2, y + 13, 3, 3);
        m.fillRect(x - 5, y + 17, 2, 2);
        m.fillStyle = "rgb(252,248,238)";
        m.fillRect(x - 1, y + 14, 1, 1);
        CORAZON_NUBE.forEach(((fila, j) => {
            for (let i = 0; i < fila.length; i++) {
                if (fila[i] === "0") continue;
                m.fillStyle = fila[i] === "2" ? "rgb(255,214,224)" : "rgb(232,64,96)";
                m.fillRect(x + 6 + i, y + 3 + j, 1, 1);
            }
        }));
    }
    const rayo = {
        prox: 0,
        hasta: 0
    };
    const gotas = Array.from({
        length: 48
    }, ((_, i) => ({
        x: i * 37 % (vx1 - vx0 + 1),
        y: i * 53 % (vy1 - vy0 + 1),
        v: .9 + i * 7 % 5 * .12
    })));
    const vidrio = Array.from({
        length: 9
    }, ((_, i) => ({
        x: vx0 + 4 + i * 23 % (vx1 - vx0 - 8),
        y: vy0 + 20 + i * 17 % (vy1 - vy0 - 24)
    })));
    function climaVentana(clima, ahora) {
        const w = vx1 - vx0 + 1;
        const h = vy1 - vy0 + 1;
        m.save();
        m.beginPath();
        m.rect(vx0, vy0, w, h);
        m.clip();
        const velo = {
            nublado: "rgba(150,156,170,0.38)",
            niebla: "rgba(200,204,212,0.55)",
            llovizna: "rgba(110,120,140,0.42)",
            lluvia: "rgba(80,90,112,0.5)",
            tormenta: "rgba(50,56,78,0.6)",
            nieve: "rgba(200,206,220,0.4)",
            ventisca: "rgba(88,96,120,0.55)"
        }[clima];
        const conRayos = clima === "tormenta" || clima === "ventisca";
        if (velo) {
            m.fillStyle = velo;
            m.fillRect(vx0, vy0, w, h);
        }
        if (clima !== "niebla") {
            m.fillStyle = conRayos ? "rgba(40,44,60,0.7)" : "rgba(170,176,190,0.6)";
            for (let k = 0; k < 3; k++) {
                const cx = vx0 + (ahora / 900 + k * 29) % (w + 30) - 15;
                const cy = vy0 + 4 + k * 7;
                m.fillRect(Math.round(cx), cy, 16, 3);
                m.fillRect(Math.round(cx) + 3, cy - 2, 9, 2);
            }
        }
        if (clima === "niebla") {
            m.fillStyle = "rgba(225,228,234,0.5)";
            for (let y = vy0 + h - 30; y < vy0 + h; y += 2) {
                const off = Math.round(Math.sin(ahora / 1500 + y) * 3);
                m.fillRect(vx0 + off, y, w, 1);
            }
        }
        const cuantas = {
            llovizna: 14,
            lluvia: 30,
            tormenta: 48
        }[clima] || 0;
        if (cuantas) {
            m.fillStyle = "rgba(190,206,236,0.8)";
            for (let i = 0; i < cuantas; i++) {
                const g = gotas[i];
                const y = vy0 + (g.y + ahora / 1e3 * 90 * g.v) % (h + 6) - 4;
                const x = vx0 + ((g.x - (y - vy0) * .25) % w + w) % w;
                m.fillRect(Math.round(x), Math.round(y), 1, clima === "llovizna" ? 2 : 3);
            }
        }
        if (clima === "nieve" || clima === "ventisca") {
            const fuerte = clima === "ventisca";
            m.fillStyle = "rgb(244,246,252)";
            for (let i = 0; i < (fuerte ? 48 : 26); i++) {
                const g = gotas[i];
                const y = vy0 + (g.y + ahora / 1e3 * (fuerte ? 26 : 10) * g.v) % h;
                const x = vx0 + ((g.x + (fuerte ? -(y - vy0) * .6 : 0) + Math.sin(ahora / 700 + i) * 2) % w + w) % w;
                m.fillRect(Math.round(x), Math.round(y), fuerte && i % 3 === 0 ? 2 : 1, 1);
            }
        }
        if (cuantas >= 30) {
            m.fillStyle = "rgba(210,224,248,0.85)";
            for (const v of vidrio) {
                m.fillRect(v.x, v.y, 1, 2);
                m.fillRect(v.x, v.y + 3 + Math.floor(ahora / 700 + v.x) % 3, 1, 1);
            }
        }
        if (conRayos && ahora < rayo.hasta) {
            m.fillStyle = "rgba(240,244,255,0.9)";
            m.fillRect(vx0, vy0, w, h);
            m.fillStyle = "rgb(255,255,255)";
            let x = vx0 + 20 + Math.floor(rayo.prox) % 30;
            for (let y = vy0; y < vy0 + 34; y += 3) {
                x += (y % 2 ? 1 : -1) * 2;
                m.fillRect(x, y, 1, 3);
            }
        }
        m.restore();
    }
    const polvo = Array.from({
        length: 7
    }, ((_, i) => ({
        x: Math.random() * 40 - 20,
        y: Math.random() * 60,
        v: .6 + Math.random() * .8,
        f: i * 1.7
    })));
    function dibujar(ahora) {
        const e = estado();
        cuarto = cuartoValido(e.cuarto);
        const datosCuarto = CUARTOS[cuarto];
        const clave = luzDe(e);
        const clima = e.clima || "despejado";
        const gris = clima !== "despejado";
        const base = clave === "siesta" ? ambienteSiesta(e.momento) : AMBIENTES[clave] || AMBIENTES.dia;
        const amb = gris && clave !== "noche" && clave !== "dormido" && clave !== "siesta" ? {
            ...base,
            amb: base.amb.map(((v, i) => Math.round(v * [ .78, .8, .88 ][i]))),
            haz: clima === "nieve" ? base.haz * .4 : 0,
            ventana: [ 200, 210, 225 ]
        } : base;
        const lamparas = e.farol && !e.dormido ? amb.lamparas || .25 : 0;
        const teleViva = !e.dormido;
        m.clearRect(0, 0, MW, MH);
        sprite(rutaCuarto(`cielo_${e.momento}.png`), vx0, vy0);
        if (e.npc) {
            const n = img(e.npcArte || `npcs/npc_${e.npc}.png`);
            if (listo(n)) {
                m.save();
                m.beginPath();
                m.rect(vx0, vy0, vx1 - vx0 + 1, vy1 - vy0 + 1);
                m.clip();
                const toc = Math.floor(ahora / 300) % 4 === 0 ? -1 : 0;
                m.drawImage(amigoTenido(n, e.npc, e.momento), vx0 + 18 + toc, vy0 + 12 - bordeDeArriba(n) + Math.round(Math.sin(ahora / 500)));
                m.restore();
            }
        }
        if (e.jardin) jardinera(e.jardin, e.momento);
        if (gris) climaVentana(cuarto === "cabana" && (clima === "lluvia" || clima === "llovizna") ? "nieve" : cuarto === "cabana" && clima === "tormenta" ? "ventisca" : clima, ahora);
        sprite(rutaCuarto("fondo.png"), 0, 0);
        sprite(rutaCuarto("cortinas.png"), 0, 0);
        for (const [id, caja] of Object.entries(PIEZA.objetos)) {
            let rel = id === "cartel" ? "pieza/cartel.png" : rutaCuarto(`${id}.png`);
            if (id === "farol" && !lamparas) rel = rutaCuarto("farol_apagado.png");
            if (id === "radio" && (!e.sonido || e.dormido)) rel = rutaCuarto("radio_apagada.png");
            let dx = 0;
            if (id === "farol") dx = Math.floor(ahora / 1400) % 4 === 1 ? 1 : Math.floor(ahora / 1400) % 4 === 3 ? -1 : 0;
            sprite(rel, caja[0] + dx, caja[1] + offsetGolpe(id, ahora));
        }
        for (const id of e.decoraciones || []) dibujarDeco(id, e, ahora);
        vidaDecos(e.decoraciones || [], e, ahora, clave);
        if (e.companero) {
            const f = img(rutaCuarto("fondo.png"));
            if (listo(f)) m.drawImage(f, 168, 120, 56, 19, COMP_X - 28, 120, 56, 19);
        }
        if (e.companero && e.companero.valija) sprite("tienda/valija.png", COMP_X + 28, 114);
        if (e.fotoAnillo) {
            const f = fotoChica(e.fotoAnillo);
            sprite("tienda/deco_marco.png", MARCO[0], MARCO[1]);
            if (f && f.listo) m.drawImage(f.c, MARCO[0] + 2, MARCO[1] + 2);
        }
        const ahoraFecha = new Date;
        const [rx0, ry0, rx1, ry1] = PIEZA.objetos.reloj;
        const rcx = (rx0 + rx1) / 2;
        const rcy = (ry0 + ry1) / 2 + offsetGolpe("reloj", ahora);
        const aH = (ahoraFecha.getHours() % 12 + ahoraFecha.getMinutes() / 60) / 12 * Math.PI * 2 - Math.PI / 2;
        const aM = ahoraFecha.getMinutes() / 60 * Math.PI * 2 - Math.PI / 2;
        linea(rcx, rcy, rcx + Math.cos(aM) * 6, rcy + Math.sin(aM) * 6, "rgb(70,60,54)");
        linea(rcx, rcy, rcx + Math.cos(aH) * 4, rcy + Math.sin(aH) * 4, TINTA);
        const [cx0, cy0, cx1] = PIEZA.objetos.calendario;
        const texto = String(e.dia);
        const ancho = texto.length * 4 - 1;
        let x = Math.round((cx0 + cx1) / 2 - ancho / 2);
        const yDia = cy0 + 11 + offsetGolpe("calendario", ahora);
        for (const ch of texto) {
            const d = DIGITOS[ch];
            if (d) d.forEach(((fila, j) => [ ...fila ].forEach(((b, i) => b === "1" && pixel(x + i, yDia + j, TINTA)))));
            x += 4;
        }
        if (e.anillo) {
            pixel(cx1 - 3, cy0 + 18, "rgb(230,180,70)");
            pixel(cx1 - 4, cy0 + 19, "rgb(230,180,70)");
            pixel(cx1 - 2, cy0 + 19, "rgb(230,180,70)");
            pixel(cx1 - 3, cy0 + 20, "rgb(230,180,70)");
        }
        if (e.sonido && !e.dormido) {
            const [dx0, dy0] = PIEZA.objetos.radio;
            const a = ahora / 160;
            pixel(dx0 + 11 + Math.cos(a) * 7, dy0 + 4 + Math.sin(a) * 2, "rgb(96,96,108)");
        }
        const [tx0, ty0] = PIEZA.objetos.tele;
        const tv = offsetGolpe("tele", ahora);
        const [px0, py0, px1, py1] = PANTALLA_TELE;
        if (teleViva) {
            Tele.dibujar(m, px0, py0 + tv, ahora, {
                clima: e.clima,
                temperatura: e.temperatura,
                noche: e.momento === "noche",
                especial: !!e.diaEspecial
            });
            m.fillStyle = "rgba(255,255,255,0.12)";
            for (let yy = py0; yy <= py1; yy += 2) m.fillRect(px0, yy + tv, px1 - px0 + 1, 1);
            if (Math.floor(ahora / 83) % 9 === 0) {
                m.fillStyle = "rgba(255,255,255,0.3)";
                m.fillRect(px0, py0 + Math.floor(ahora / 50) % 22 + tv, px1 - px0 + 1, 1);
            }
        } else {
            m.fillStyle = "rgb(22,24,28)";
            m.fillRect(px0, py0 + tv, px1 - px0 + 1, py1 - py0 + 1);
        }
        for (const id of e.recuerdos) {
            const r = PIEZA.ranuras[id];
            const s = img(`pieza/recuerdo_${r ? id : "generico"}.png`);
            if (!r || !listo(s)) continue;
            m.drawImage(s, r[0] - Math.floor(s.naturalWidth / 2), r[1] - s.naturalHeight + 1);
        }
        const [kx0, ky0, kx1, ky1] = PIEZA.objetos.corcho;
        const mp = PIEZA.mapa;
        const kw = kx1 - kx0 - 17;
        const kh = ky1 - ky0 - 15;
        for (const p of e.pines) {
            const ppx = kx0 + 8 + (p.lon - mp.lonO) / (mp.lonE - mp.lonO) * kw;
            const ppy = ky0 + 7 + (mp.latN - p.lat) / (mp.latN - mp.latS) * kh + offsetGolpe("corcho", ahora);
            m.fillStyle = "rgba(0,0,0,0.3)";
            m.fillRect(Math.round(ppx) + 1, Math.round(ppy) + 1, 2, 2);
            m.fillStyle = p.color || "rgb(214,70,80)";
            m.fillRect(Math.round(ppx), Math.round(ppy), 2, 2);
        }
        {
            const ax = Math.round(actor.x);
            const rx = actor.pose === "sentado" ? 22 : 13;
            for (let yy = 127; yy <= 130; yy++) {
                for (let xx = ax - rx - 2; xx <= ax + rx; xx++) {
                    if (((xx - ax + 2) / rx) ** 2 + ((yy - 128.5) / 2) ** 2 <= 1 && BAYER[yy % 4][xx % 4] < 11) pixel(xx, yy, "rgb(22,24,46)");
                }
            }
        }
        m.save();
        m.globalCompositeOperation = "multiply";
        const fuego = datosCuarto.fuego ? e.dormido ? .45 : 1 : 0;
        m.drawImage(mascara(`${clave}${clave === "siesta" ? "-" + e.momento : ""}|${lamparas}|${teleViva}|${gris ? clima : ""}`, amb, lamparas, teleViva, fuego), 0, 0);
        m.globalCompositeOperation = "screen";
        if (clave !== "dia" || fuego) m.drawImage(brillo(`${clave}|${lamparas}`, clave === "dia" ? 0 : lamparas, clave === "noche" || clave === "atardecer", fuego), 0, 0);
        m.restore();
        if (fuego) llamas(datosCuarto.fuego, ahora, e.dormido);
        if (clave !== "dia" && clave !== "dormido" && clave !== "siesta") {
            const decos = e.decoraciones || [];
            const halo = (x, y, rgb, a) => {
                m.save();
                m.globalCompositeOperation = "screen";
                for (let dy = -3; dy <= 3; dy++) {
                    for (let dx = -3; dx <= 3; dx++) {
                        const dd = Math.hypot(dx, dy * 1.1);
                        if (dd > 3.2) continue;
                        m.fillStyle = `rgba(${rgb},${(a * (dd < 1.6 ? 1 : .45)).toFixed(3)})`;
                        m.fillRect(Math.round(x + dx), Math.round(y + dy), 1, 1);
                    }
                }
                m.restore();
            };
            if (decos.includes("farolitos")) {
                const [fx, fy] = DECORACIONES.farolitos;
                dibujarDeco("farolitos", e, ahora);
                for (const [lx, ly] of FOCOS_FAROLITOS) halo(fx + lx, fy + ly, "255,130,90", .22);
            }
            if (decos.includes("luces")) {
                const [lx0, ly0] = DECORACIONES.luces;
                dibujarDeco("luces", e, ahora);
                FOCOS_LUCES.forEach((([x, y], i) => {
                    if (Math.floor(ahora / 700 + i * 1.7) % 5 !== 0) halo(lx0 + x, ly0 + y + 1, "255,220,150", .16);
                }));
            }
        }
        if (e.velitas && clave !== "dia" && clave !== "siesta") velitas(ahora);
        if (clima === "tormenta") {
            if (!rayo.prox) rayo.prox = ahora + 5e3 + Math.random() * 12e3;
            if (ahora > rayo.prox) {
                rayo.hasta = ahora + 180;
                rayo.prox = ahora + 9e3 + Math.random() * 2e4;
                setTimeout(alRayo, 0);
            }
            if (ahora < rayo.hasta) {
                m.save();
                m.globalCompositeOperation = "screen";
                m.fillStyle = Math.floor(ahora / 60) % 2 ? "rgba(210,220,255,0.55)" : "rgba(210,220,255,0.25)";
                m.fillRect(0, 0, MW, MH);
                m.restore();
            }
        }
        if (lamparas && LUCES.farol) {
            const [lx, ly] = LUCES.farol;
            for (const p of polvo) {
                const yy = ly + 18 + (p.y + ahora / 1e3 * p.v * 3) % 64;
                const xx = lx + p.x + Math.sin(ahora / 900 + p.f) * 3;
                if (BAYER[Math.floor(yy) % 4][Math.floor(xx) % 4] < 12) pixel(xx, yy, "rgba(255,226,180,0.55)");
            }
        }
        if (!e.dormido) {
            const [mx0, my0] = PIEZA.objetos.mesita;
            for (let i = 0; i < 3; i++) {
                const t = (ahora / 1400 + i / 3) % 1;
                const yy = my0 + 2 - t * 10;
                const xx = mx0 + 46 + Math.sin(t * 6 + i) * 1.5;
                pixel(xx, yy, `rgba(236,236,244,${(.55 * (1 - t)).toFixed(2)})`);
            }
        }
        dibujarCompanero(e, ahora);
        const dt = ultimoDibujo ? Math.min(250, ahora - ultimoDibujo) : 0;
        ultimoDibujo = ahora;
        moverActor(e, ahora, dt);
        moverMascota(e, ahora, dt);
        ubicarCajaActor();
        ubicarGlobo();
        const respira = actor.pose === "sentado" && Math.floor(ahora / 700) % 3 === 0 ? -1 : 0;
        const fig = Personaje.figura(actor.pose);
        const x0 = Math.round(actor.x) - 48;
        const y0 = PIE - fig.pies + (e.dormido ? 0 : respira) + actor.salto + offsetGolpe("baozi", ahora) * 2;
        let alto = 1;
        if (e.parpadea) {
            if (!parpadeo.t) parpadeo.t = ahora + 2500;
            const k = Math.floor((ahora - parpadeo.t) / 60);
            const pasos = [ 1, .45, .1, .45, 1 ];
            if (k >= 0 && k < pasos.length) alto = pasos[k]; else if (k >= pasos.length) parpadeo.t = ahora + 2200 + Math.random() * 3800;
        }
        const pose = e.dormido ? "dormido" : actor.pose;
        const volteado = actor.dir > 0 && actor.pose === "parado";
        const ey = actor.estira ? 1 + .12 * actor.estira : 1;
        const ex = actor.estira ? 1 - .06 * actor.estira : 1;
        const pixelado = Personaje.estilo() === "pixel";
        if (pixelado) {
            const capasP = Personaje.capas(e.ojos, e.boca, pose);
            const cuerpo = imgOAnterior("cuerpo", capasP[0].src);
            act.clearRect(0, 0, 96, 96);
            if (listo(cuerpo)) act.drawImage(cuerpo, 0, 0);
            const mx = volteado ? -actor.mira[0] : actor.mira[0];
            const my = actor.mira[1];
            if (capasP[1] && capasP[1].tipo === "ojos") {
                const ojos = imgOAnterior("ojos", capasP[1].src);
                const boca = imgOAnterior("boca", capasP[2].src);
                if (listo(ojos)) {
                    if (alto === 1) act.drawImage(ojos, mx, my); else {
                        const h = Math.max(1, Math.round(96 * alto));
                        act.drawImage(ojos, mx, my + 31 - Math.round(31 * alto), 96, h);
                    }
                }
                if (listo(boca)) act.drawImage(boca, 0, 0);
            } else if (capasP[1]) {
                const cara = imgOAnterior("cara", capasP[1].src);
                if (listo(cara)) {
                    const CORTE = 39;
                    const h = Math.max(1, Math.round(CORTE * alto));
                    act.drawImage(cara, 0, 0, 96, CORTE, 0, 34 - Math.round(34 * alto), 96, h);
                    act.drawImage(cara, 0, CORTE, 96, 96 - CORTE, 0, CORTE, 96, 96 - CORTE);
                }
            }
            for (const c of capasP) {
                if (c.tipo !== "accesorio") continue;
                const a = img(c.src);
                if (listo(a)) act.drawImage(a, 0, 0);
            }
            const luz = Personaje.esMantou() ? LUZ_CLARO[luzDe(e)] : null;
            if (luz) {
                tin.globalCompositeOperation = "source-over";
                tin.clearRect(0, 0, 96, 96);
                tin.fillStyle = `rgb(${luz.join(",")})`;
                tin.fillRect(0, 0, 96, 96);
                tin.globalCompositeOperation = "destination-in";
                tin.drawImage(actC, 0, 0);
                act.globalCompositeOperation = "multiply";
                act.drawImage(tinC, 0, 0);
                act.globalCompositeOperation = "source-over";
            }
            m.save();
            m.translate(x0 + 48, y0 + fig.pies);
            m.scale(volteado ? -ex : ex, ey);
            m.translate(-48, -fig.pies);
            m.drawImage(actC, 0, 0);
            m.restore();
            silueta = {
                c: actC,
                tx: x0 + 48,
                ty: y0 + fig.pies,
                sx: volteado ? -ex : ex,
                sy: ey,
                pies: fig.pies
            };
        }
        personajeAlta = !pixelado ? {
            x0: x0,
            y0: y0,
            pose: pose,
            volteado: volteado,
            ex: ex,
            ey: ey,
            fig: fig,
            alto: alto
        } : null;
        dibujarMascota(e, ahora);
        for (const id of e.avisos) aviso(id, ahora);
        if (e.deseo === "nuevo" && !e.dormido) {
            let yNube = y0 + fig.arriba - 16;
            if (e.globo && globo.offsetHeight) {
                const arribaGlobo = (parseFloat(globo.style.top) - globo.offsetHeight - T.oy) / T.s;
                yNube = Math.min(yNube, Math.floor(arribaGlobo) - 21);
            }
            if (yNube >= Math.ceil((M.t - T.oy) / T.s) + 1) nubeDeseo(Math.round(actor.x) + 20, yNube, ahora);
        }
        if (e.dormido) {
            const z = Math.floor(ahora / 600) % 3;
            for (let i = 0; i <= z; i++) {
                const zx = bcx + 16 + i * 5;
                const zy = bcy - 36 - i * 5;
                m.fillStyle = "rgb(150,170,240)";
                m.fillRect(zx, zy, 3, 1);
                m.fillRect(zx + 1, zy + 1, 1, 1);
                m.fillRect(zx, zy + 2, 3, 1);
            }
        }
        if (ahora > proximoDestello) {
            const ids = Object.keys(botones).filter((k => k !== "baozi" && !botones[k].el.hidden));
            const id = ids[Math.floor(Math.random() * ids.length)];
            const c = botones[id].caja;
            destello = {
                x: c[2] - 1,
                y: Math.max(c[1] + 1, Math.ceil((M.t - T.oy) / T.s) + 3),
                hasta: ahora + 600
            };
            proximoDestello = ahora + 2600 + Math.random() * 2400;
        }
        if (destello && ahora < destello.hasta && !e.dormido) {
            const r = ahora < destello.hasta - 300 ? 2 : 1;
            for (let d = -r; d <= r; d++) {
                pixel(destello.x + d, destello.y, "rgb(255,244,214)");
                pixel(destello.x, destello.y + d, "rgb(255,244,214)");
            }
            pixel(destello.x, destello.y, "rgb(255,255,255)");
        }
        g.imageSmoothingEnabled = false;
        g.fillStyle = "rgb(14,12,14)";
        g.fillRect(0, 0, canvas.width, canvas.height);
        g.drawImage(mundo, Math.round(T.ox * dpr), Math.round(T.oy * dpr), Math.round(MW * T.s * dpr), Math.round(MH * T.s * dpr));
        if (personajeAlta) {
            const p = personajeAlta;
            const tinte = TINTES[luzDe(e)] || TINTES.dia;
            const cara = Personaje.caraMantou(Personaje.estadoDeArchivos(e.ojos, e.boca));
            const comp = mantouCompuesto(p.pose, cara, tinte);
            if (comp) {
                const k = T.s * dpr;
                g.save();
                g.imageSmoothingEnabled = true;
                g.imageSmoothingQuality = "high";
                g.translate((T.ox + (p.x0 + 48) * T.s) * dpr, (T.oy + (p.y0 + p.fig.pies) * T.s) * dpr);
                g.scale(p.volteado ? -p.ex : p.ex, p.ey * (p.alto < 1 ? 1 : 1));
                g.drawImage(comp, -48 * k, -p.fig.pies * k, 96 * k, 96 * k);
                g.restore();
                silueta = {
                    c: comp,
                    tx: p.x0 + 48,
                    ty: p.y0 + p.fig.pies,
                    sx: p.volteado ? -p.ex : p.ex,
                    sy: p.ey,
                    pies: p.fig.pies
                };
            }
        }
        const texto2 = e.globo || "";
        if (globo.textContent !== texto2) {
            globo.textContent = texto2;
            globo.classList.toggle("oculto", !texto2);
            ubicarGlobo();
        }
        globo.classList.toggle("rosa", !!e.globoRosa);
    }
    let ultimo = 0;
    function bucle(ahora) {
        if (!vivo) return;
        if (!raiz.isConnected) {
            destruir();
            return;
        }
        requestAnimationFrame(bucle);
        if (ahora - ultimo < 1e3 / FPS) return;
        ultimo = ahora;
        dibujar(ahora);
    }
    function destruir() {
        vivo = false;
        if (ro) ro.disconnect(); else window.removeEventListener("resize", medir);
    }
    medir();
    requestAnimationFrame(bucle);
    return {
        raiz: raiz,
        golpe: golpe,
        plan: nombre => empezarPlan(nombre, performance.now()),
        refrescar: () => dibujar(performance.now()),
        vivo: () => vivo && raiz.isConnected,
        destruir: destruir
    };
}

export function posicionEnMapa(lat, lon) {
    const mp = PIEZA.mapa;
    return {
        x: Math.min(.97, Math.max(.03, (lon - mp.lonO) / (mp.lonE - mp.lonO))),
        y: Math.min(.95, Math.max(.05, (mp.latN - lat) / (mp.latN - mp.latS)))
    };
}

export function dentroDelDibujo(lat, lon) {
    const mp = PIEZA.mapa;
    return lat <= mp.latN && lat >= mp.latS && lon >= mp.lonO && lon <= mp.lonE;
}
