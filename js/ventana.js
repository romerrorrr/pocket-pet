import { arte } from "./arte.js";

import { VENTANA } from "./ventana_datos.js";

import { VENTANAS } from "./ventana_cuartos_datos.js";

export const MOMENTOS_VENTANA = new Set([ "amanecer", "dia", "atardecer", "noche" ]);

const CAPAS = [ "cielo", "lejos", "ciudad", "cerca" ];

const CAPAS_CUARTO = [ "cielo", "lejos", "medio", "cerca" ];

const FACTOR = {
    cielo: .6,
    lejos: 1.4,
    ciudad: 2.4,
    medio: 2.4,
    cerca: 3.4,
    sauce: 4
};

const VM = VENTANA.margen;

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

const rutaCapa = (cuarto, c, momento) => cuarto === "depto" ? `pieza/ventana/${c}_${momento}.png` : `pieza/${cuarto}/ventana/${c}_${momento}.png`;

export function ventanaLista(momento, cuarto = "depto") {
    if (cuarto !== "depto" && !(VENTANAS.cuartos[cuarto] && VENTANAS.cuartos[cuarto][momento])) return false;
    return (cuarto === "depto" ? CAPAS : CAPAS_CUARTO).every((c => listo(img(rutaCapa(cuarto, c, momento)))));
}

const azar = n => {
    const s = Math.sin(n * 12.9898) * 43758.5453;
    return s - Math.floor(s);
};

const NUBE = {
    dia: "rgba(250,252,255,0.85)",
    amanecer: "rgba(255,214,206,0.8)",
    atardecer: "rgba(255,190,170,0.75)",
    noche: "rgba(70,78,120,0.55)"
};

const NUBE_SOMBRA = {
    dia: "rgba(214,226,240,0.85)",
    amanecer: "rgba(214,160,176,0.8)",
    atardecer: "rgba(196,120,140,0.75)",
    noche: "rgba(44,50,86,0.55)"
};

const SAUCE = {
    dia: [ "rgb(96,140,72)", "rgb(132,170,92)" ],
    amanecer: [ "rgb(92,104,84)", "rgb(130,128,100)" ],
    atardecer: [ "rgb(78,82,66)", "rgb(124,104,80)" ],
    noche: [ "rgb(22,34,34)", "rgb(32,48,48)" ]
};

const LUZ_CIUDAD = {
    amanecer: "rgb(255,214,150)",
    atardecer: "rgb(255,206,130)",
    noche: "rgb(240,206,130)"
};

const ESTRELLAS = Array.from({
    length: 16
}, ((_, i) => ({
    x: Math.floor(azar(i + 1) * 67),
    y: Math.floor(azar(i + 50) * 26),
    v: .5 + azar(i + 99) * 1.5,
    f: azar(i + 7) * 6.28
})));

const TIRAS = Array.from({
    length: 6
}, ((_, i) => ({
    x: 52 + i * 3 + Math.floor(azar(i + 3) * 2),
    largo: 16 + Math.floor(azar(i + 11) * 20),
    f: azar(i + 21) * 6.28
})));

function px(m, x, y, w = 1, h = 1) {
    m.fillRect(Math.round(x), Math.round(y), w, h);
}

export function dibujarVentana(m, x0, y0, w, h, momento, ahora, {gris: gris = false, off: off = {
    x: 0,
    y: 0
}, alfa: alfa = 1, cuarto: cuarto = "depto"} = {}) {
    if (cuarto !== "depto") return dibujarCuarto(m, x0, y0, w, h, cuarto, momento, ahora, {
        gris: gris,
        off: off,
        alfa: alfa
    });
    const datos = VENTANA.momentos[momento];
    if (!datos) return;
    const seg = ahora / 1e3;
    const corre = f => ({
        x: Math.max(-VM, Math.min(VM, Math.round(off.x * f))),
        y: Math.max(-VM, Math.min(VM, Math.round(off.y * f * .6)))
    });
    m.save();
    m.beginPath();
    m.rect(x0, y0, w, h);
    m.clip();
    m.globalAlpha = alfa;
    const capa = nombre => {
        const c = corre(FACTOR[nombre]);
        const i = img(`pieza/ventana/${nombre}_${momento}.png`);
        if (listo(i)) m.drawImage(i, x0 - VM + c.x, y0 - VM + c.y);
        return c;
    };
    const cc = capa("cielo");
    const ox = x0 + cc.x;
    const oy = y0 + cc.y;
    if (momento === "noche") {
        for (const s of ESTRELLAS) {
            const v = Math.sin(seg * s.v + s.f);
            if (v < .2) continue;
            m.fillStyle = v > .8 ? "rgb(255,252,236)" : "rgb(190,196,224)";
            px(m, ox + s.x, oy + s.y);
        }
        const ciclo = seg % 50;
        if (ciclo < 16) {
            const ax = ox - 4 + ciclo / 16 * (w + 8);
            const ay = oy + 8 + ciclo * .25;
            m.fillStyle = Math.floor(seg * 1.6) % 2 ? "rgb(255,90,90)" : "rgb(255,255,255)";
            px(m, ax, ay);
        }
    }
    if (!gris) {
        for (let k = 0; k < 3; k++) {
            const vel = .7 + k * .35;
            const cx = ox + (seg * vel + k * 37) % (w + 30) - 15;
            const cy = oy + 3 + k * 6;
            const largo = 10 + k * 3;
            m.fillStyle = NUBE_SOMBRA[momento];
            px(m, cx, cy + 2, largo, 1);
            m.fillStyle = NUBE[momento];
            px(m, cx + 1, cy + 1, largo - 2, 1);
            px(m, cx + 3, cy, largo - 7, 1);
            px(m, cx + 4, cy - 1, 3, 1);
        }
    }
    const cl = capa("lejos");
    if (momento !== "dia" && datos.pagoda) {
        const [pxg, pyg] = datos.pagoda;
        const late = .5 + .5 * Math.sin(seg * .8);
        m.fillStyle = `rgba(255,200,120,${(.08 + .06 * late) * (momento === "noche" ? 1.4 : .8)})`;
        for (let r = 0; r < 3; r++) px(m, x0 - VM + cl.x + pxg - 4 + r, y0 - VM + cl.y + pyg - 6 + r, 9 - 2 * r, 14 - 2 * r);
    }
    if (momento !== "noche" && !gris) {
        const ciclo = seg % 23;
        if (ciclo < 8) {
            m.fillStyle = momento === "dia" ? "rgb(60,70,84)" : "rgb(54,40,60)";
            for (let k = 0; k < 3; k++) {
                const bx = x0 - 6 + ciclo / 8 * (w + 12) - k * 5;
                const by = y0 + 16 + k * 2 + Math.sin(seg * 2 + k) * 1.2;
                const arriba = Math.floor(seg * 6 + k) % 2;
                px(m, bx, by);
                px(m, bx - 1, by - arriba);
                px(m, bx + 1, by - arriba);
            }
        }
    }
    const ci = capa("ciudad");
    const luz = LUZ_CIUDAD[momento];
    if (luz) {
        m.fillStyle = luz;
        const vs = datos.ventanas;
        const p = momento === "noche" ? .3 : .18;
        for (let i = 0; i < vs.length; i += 2) {
            const turno = Math.floor(seg / 9 + azar(i) * 5);
            if (azar(i * 7.3 + turno * 1.91) < p) px(m, x0 - VM + ci.x + vs[i][0], y0 - VM + ci.y + vs[i][1]);
        }
    }
    capa("cerca");
    const cs = corre(FACTOR.sauce);
    const [verde, verdeCl] = SAUCE[momento];
    for (const t of TIRAS) {
        for (let k = 0; k < t.largo; k++) {
            const vaiven = Math.sin(seg * .9 + t.f + k * .09) * (k / t.largo) * 2.4;
            const x = x0 + cs.x + t.x + vaiven;
            const y = y0 + cs.y - 2 + k;
            m.fillStyle = (k + t.x) % 3 ? verde : verdeCl;
            px(m, x, y);
            if (k % 4 === 1) px(m, x + 1, y);
        }
    }
    m.restore();
}

const VMC = VENTANAS.margen;

const BUGANVILLA = {
    dia: [ "rgb(206,58,132)", "rgb(236,104,166)", "rgb(70,120,60)" ],
    amanecer: [ "rgb(176,64,128)", "rgb(214,110,156)", "rgb(80,100,70)" ],
    atardecer: [ "rgb(150,50,104)", "rgb(196,90,130)", "rgb(70,76,60)" ],
    noche: [ "rgb(60,28,58)", "rgb(80,40,74)", "rgb(22,34,34)" ]
};

const TIRAS_B = Array.from({
    length: 5
}, ((_, i) => ({
    x: 50 + i * 4 + Math.floor(azar(i + 31) * 3),
    largo: 8 + Math.floor(azar(i + 41) * 14),
    f: azar(i + 51) * 6.28
})));

const COPOS = Array.from({
    length: 34
}, ((_, i) => ({
    x: azar(i + 61) * 80,
    y: azar(i + 71) * 70,
    v: 3 + azar(i + 81) * 4,
    f: azar(i + 91) * 6.28,
    cerca: i % 3 === 0
})));

const BICHITOS = Array.from({
    length: 9
}, ((_, i) => ({
    x: 4 + azar(i + 101) * 62,
    y: 46 + azar(i + 111) * 14,
    f: azar(i + 121) * 6.28,
    v: .6 + azar(i + 131)
})));

const FAROLITOS = Array.from({
    length: 5
}, ((_, i) => ({
    x: azar(i + 141) * 90,
    y: 44 + i * 3,
    v: .35 + azar(i + 151) * .3
})));

function nubes(m, ox, oy, w, seg, momento) {
    for (let k = 0; k < 3; k++) {
        const vel = .7 + k * .35;
        const cx = ox + (seg * vel + k * 37) % (w + 30) - 15;
        const cy = oy + 3 + k * 6;
        const largo = 10 + k * 3;
        m.fillStyle = NUBE_SOMBRA[momento];
        px(m, cx, cy + 2, largo, 1);
        m.fillStyle = NUBE[momento];
        px(m, cx + 1, cy + 1, largo - 2, 1);
        px(m, cx + 3, cy, largo - 7, 1);
        px(m, cx + 4, cy - 1, 3, 1);
    }
}

function pajaros(m, x0, y0, w, seg, color, cada = 23, y = 16) {
    const ciclo = seg % cada;
    if (ciclo >= 8) return;
    m.fillStyle = color;
    for (let k = 0; k < 3; k++) {
        const bx = x0 - 6 + ciclo / 8 * (w + 12) - k * 5;
        const by = y0 + y + k * 2 + Math.sin(seg * 2 + k) * 1.2;
        const arriba = Math.floor(seg * 6 + k) % 2;
        px(m, bx, by);
        px(m, bx - 1, by - arriba);
        px(m, bx + 1, by - arriba);
    }
}

function dibujarCuarto(m, x0, y0, w, h, cuarto, momento, ahora, {gris: gris, off: off, alfa: alfa}) {
    const datos = VENTANAS.cuartos[cuarto][momento];
    const seg = ahora / 1e3;
    const noche = momento === "noche";
    const deDia = momento === "dia";
    const meceY = cuarto === "bote" ? Math.sin(seg * .9) * .5 : 0;
    const corre = f => ({
        x: Math.max(-VMC, Math.min(VMC, Math.round(off.x * f))),
        y: Math.max(-VMC, Math.min(VMC, Math.round((off.y * .6 + meceY) * f)))
    });
    m.save();
    m.beginPath();
    m.rect(x0, y0, w, h);
    m.clip();
    m.globalAlpha = alfa;
    const capa = nombre => {
        const c = corre(FACTOR[nombre]);
        const i = img(rutaCapa(cuarto, nombre, momento));
        if (listo(i)) m.drawImage(i, x0 - VMC + c.x, y0 - VMC + c.y);
        return {
            x: x0 - VMC + c.x,
            y: y0 - VMC + c.y
        };
    };
    const cc = capa("cielo");
    if (noche) {
        for (const s of ESTRELLAS) {
            const v = Math.sin(seg * s.v + s.f);
            if (v < .2) continue;
            m.fillStyle = v > .8 ? "rgb(255,252,236)" : "rgb(190,196,224)";
            px(m, cc.x + VMC + s.x, cc.y + VMC + s.y);
        }
    }
    if (cuarto === "cabana" && noche && !gris) {
        for (let x = 0; x < w + 8; x++) {
            const yb = cc.y + 14 + Math.sin(x / 9 + seg * .3) * 3 + Math.sin(x / 4 - seg * .5);
            const f = .5 + .5 * Math.sin(x / 6 + seg * .7);
            for (let k = 0; k < 6; k++) {
                m.fillStyle = `rgba(${k < 2 ? "120,240,190" : "90,200,200"},${(.08 + .2 * f) * (1 - k / 6)})`;
                px(m, cc.x + x, yb + k * 1.5 - 4, 1, 2);
            }
        }
    }
    if (!gris) nubes(m, cc.x + VMC, cc.y + VMC, w, seg, momento);
    const cl = capa("lejos");
    if (!noche && !gris) pajaros(m, x0, y0, w, seg, cuarto === "guatape" ? "rgb(240,240,236)" : deDia ? "rgb(60,70,84)" : "rgb(54,40,60)", cuarto === "finca" ? 19 : 23, cuarto === "finca" ? 12 : 16);
    if (cuarto === "finca") {
        const ox = seg * 1.2 % (w + 60) - 50;
        m.fillStyle = noche ? "rgba(120,130,170,0.16)" : "rgba(255,255,255,0.22)";
        for (let k = 0; k < 4; k++) px(m, x0 + ox + k * 3, y0 + 30 + k, 40 - k * 6, 1);
    }
    const nieve = deCerca => {
        if (cuarto !== "cabana" || gris) return;
        m.fillStyle = noche ? "rgba(220,226,246,0.8)" : "rgba(255,255,255,0.9)";
        for (const c of COPOS) {
            if (c.cerca !== deCerca) continue;
            const v = deCerca ? c.v * 1.8 : c.v;
            const y = (c.y + seg * v) % (h + 6) - 3;
            const x = (c.x + Math.sin(seg * .8 + c.f) * (deCerca ? 2 : 1) + (deCerca ? off.x * 4 : off.x * 2)) % (w + 6);
            px(m, x0 + x - 3, y0 + y, deCerca ? 2 : 1, deCerca ? 2 : 1);
        }
    };
    const cm = capa("medio");
    if (cuarto === "bote") {
        const [a0, a1] = datos.agua;
        const col = noche ? "rgb(230,232,214)" : momento === "atardecer" ? "rgb(255,196,120)" : momento === "amanecer" ? "rgb(255,214,170)" : "rgb(255,250,230)";
        m.fillStyle = col;
        for (let y = a0; y < a1; y += 2) {
            const ancho = 1 + Math.floor((y - a0) / 6);
            const t = Math.floor(seg * 4 + y);
            if (azar(t * 1.7 + y) < .65) px(m, cm.x + datos.reflejo + Math.round((azar(t + y * 3) - .5) * 3) - ancho / 2, cm.y + y, ancho + 1, 1);
        }
        const ciclo = seg % 40;
        if (ciclo < 26) {
            const bx = cm.x + w + 10 - ciclo / 26 * (w + 24);
            const by = cm.y + a0 + 2 + Math.round(Math.sin(seg * 1.3));
            m.fillStyle = noche ? "rgb(20,22,36)" : "rgb(40,36,40)";
            px(m, bx, by, 7, 1);
            px(m, bx + 1, by + 1, 5, 1);
            px(m, bx + 3, by - 3, 1, 3);
            px(m, bx + 2, by - 4, 3, 1);
            if (noche) {
                m.fillStyle = "rgb(255,200,110)";
                px(m, bx + 6, by - 2);
            }
        }
        if (!deDia) {
            for (const f of FAROLITOS) {
                const fx = cm.x + (f.x + seg * f.v) % (w + 16) - 4;
                const fy = cm.y + f.y + Math.round(Math.sin(seg + f.x));
                m.fillStyle = "rgb(255,176,90)";
                px(m, fx, fy);
                m.fillStyle = "rgba(255,176,90,0.45)";
                px(m, fx, fy + 2);
                px(m, fx, fy + 4);
            }
        }
    }
    if (cuarto === "te") {
        const ciclo = seg % 60;
        const bx = cm.x + 6 + ciclo / 60 * (w + 10);
        m.fillStyle = noche ? "rgb(14,16,30)" : "rgb(44,44,52)";
        px(m, bx, cm.y + datos.agua[0] + 2, 4, 1);
        px(m, bx + 1, cm.y + datos.agua[0] + 1, 1, 1);
    }
    if (cuarto === "guatape") {
        const [a0, a1] = datos.agua;
        if (!noche) {
            m.fillStyle = "rgba(255,255,255,0.85)";
            for (let i = 0; i < 7; i++) {
                const t = Math.floor(seg * 1.5 + i * 3.1);
                if (azar(t + i) < .6) px(m, cm.x + 4 + azar(t * 3.3 + i) * 66, cm.y + a0 + 2 + azar(t * 7.1 + i) * (a1 - a0 - 4), 2, 1);
            }
        }
        const ciclo = seg % 34;
        if (ciclo < 20) {
            const bx = cm.x - 8 + ciclo / 20 * (w + 24);
            const by = cm.y + a0 + 5;
            m.fillStyle = "rgba(255,255,255,0.7)";
            for (let k = 1; k < 10; k++) px(m, bx - k * 2, by + 1 + (k > 4 ? 1 : 0) * (k % 2 * 2 - 1), 2, 1);
            m.fillStyle = noche ? "rgb(70,70,90)" : "rgb(250,250,246)";
            px(m, bx, by, 5, 1);
            m.fillStyle = noche ? "rgb(40,40,60)" : "rgb(206,60,60)";
            px(m, bx + 1, by - 1, 3, 1);
            if (noche) {
                m.fillStyle = "rgb(255,220,140)";
                px(m, bx + 4, by - 1);
            }
        }
        if (!deDia) {
            for (let i = 0; i < datos.orilla.length; i++) {
                const [lx, ly] = datos.orilla[i];
                const v = .6 + .4 * Math.sin(seg * 2 + i * 1.7);
                m.fillStyle = `rgba(255,214,140,${v})`;
                px(m, cm.x + lx, cm.y + ly);
                m.fillStyle = `rgba(255,214,140,${v * .35})`;
                px(m, cm.x + lx, cm.y + ly + 2 + Math.floor(seg * 3 + i) % 2);
            }
            if (Math.floor(seg * 1.2) % 2) {
                m.fillStyle = "rgb(255,90,80)";
                px(m, cm.x + datos.penol[0], cm.y + datos.penol[1]);
            }
        }
    }
    if (cuarto === "finca") {
        if (!deDia) {
            m.fillStyle = "rgb(255,210,130)";
            px(m, cm.x + datos.casita[0], cm.y + datos.casita[1] - 1);
        }
        const ox = w + 40 - seg * .8 % (w + 80);
        m.fillStyle = noche ? "rgba(120,130,170,0.12)" : "rgba(255,255,255,0.18)";
        for (let k = 0; k < 3; k++) px(m, x0 + ox + k * 4, y0 + 40 + k, 34 - k * 8, 1);
    }
    if (cuarto === "cabana") {
        if (!deDia) {
            m.fillStyle = "rgb(255,196,110)";
            px(m, cm.x + datos.ventanita[0], cm.y + datos.ventanita[1], 2, 1);
        }
        for (let k = 0; k < 6; k++) {
            const t = (seg * .5 + k / 6) % 1;
            m.fillStyle = `rgba(${noche ? "150,156,180" : "236,240,246"},${.55 * (1 - t)})`;
            const sz = 1 + Math.floor(t * 2.5);
            px(m, cm.x + datos.chimenea[0] + Math.sin(t * 5 + seg) * 1.5 + t * 4, cm.y + datos.chimenea[1] - t * 14, sz, sz);
        }
        nieve(false);
    }
    capa("cerca");
    nieve(true);
    if (cuarto === "finca" && (noche || momento === "atardecer")) {
        for (const b of BICHITOS) {
            const v = Math.sin(seg * b.v * 2 + b.f);
            if (v < .3) continue;
            m.fillStyle = v > .8 ? "rgb(236,255,150)" : "rgba(200,240,120,0.6)";
            px(m, x0 + b.x + Math.sin(seg * .4 + b.f) * 3 + off.x * 3, y0 + b.y + Math.cos(seg * .3 + b.f) * 2);
        }
    }
    if (cuarto === "guatape") {
        const cs = corre(FACTOR.sauce);
        const [flor, florCl, hoja] = BUGANVILLA[momento];
        for (const t of TIRAS_B) {
            for (let k = 0; k < t.largo; k++) {
                const vaiven = Math.sin(seg * .9 + t.f + k * .12) * (k / t.largo) * 1.8;
                const x = x0 + cs.x + t.x + vaiven;
                const y = y0 + cs.y - 2 + k;
                m.fillStyle = k % 3 === 2 ? hoja : (k + t.x) % 2 ? flor : florCl;
                px(m, x, y);
                if (k % 3 !== 2) px(m, x + ((k >> 1) % 2 ? 1 : -1), y);
            }
        }
    }
    if (cuarto === "te") {
        for (let i = 0; i < datos.faroles.length; i++) {
            const [fx, fy] = datos.faroles[i];
            const vai = Math.round(Math.sin(seg * .8 + i * 2) * 1);
            const bx = x0 - VMC + fx + vai;
            const by = y0 + fy + 6;
            m.fillStyle = "rgb(60,40,30)";
            px(m, x0 - VMC + fx, y0, 1, 6);
            if (!deDia) {
                m.fillStyle = `rgba(255,120,80,${noche ? .22 : .12})`;
                px(m, bx - 3, by - 1, 7, 7);
            }
            m.fillStyle = "rgb(210,150,60)";
            px(m, bx - 1, by, 3, 1);
            m.fillStyle = noche ? "rgb(255,90,70)" : "rgb(200,46,40)";
            px(m, bx - 2, by + 1, 5, 3);
            m.fillStyle = noche ? "rgb(255,170,110)" : "rgb(230,80,60)";
            px(m, bx - 1, by + 1, 1, 3);
            m.fillStyle = "rgb(210,150,60)";
            px(m, bx - 1, by + 4, 3, 1);
            px(m, bx, by + 5, 1, 2);
        }
    }
    m.restore();
}
