import { arte } from "./arte.js";

import { VENTANA } from "./ventana_datos.js";

export const MOMENTOS_VENTANA = new Set([ "amanecer", "dia", "atardecer", "noche" ]);

const CAPAS = [ "cielo", "lejos", "ciudad", "cerca" ];

const FACTOR = {
    cielo: .6,
    lejos: 1.4,
    ciudad: 2.4,
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

export function ventanaLista(momento) {
    return CAPAS.every((c => listo(img(`pieza/ventana/${c}_${momento}.png`))));
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
}, alfa: alfa = 1} = {}) {
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

export function crearParalaje() {
    let base = null;
    let crudo = {
        x: 0,
        y: 0
    };
    const suave = {
        x: 0,
        y: 0
    };
    let ultimo = 0;
    const lim = v => Math.max(-1, Math.min(1, v));
    function alMover(ev) {
        const gr = ev.accelerationIncludingGravity;
        if (!gr || gr.x == null || gr.y == null) return;
        const ang = (screen.orientation && typeof screen.orientation.angle === "number" ? screen.orientation.angle : window.orientation) || 0;
        const r = -ang * Math.PI / 180;
        const sx = gr.x * Math.cos(r) - gr.y * Math.sin(r);
        const sy = gr.x * Math.sin(r) + gr.y * Math.cos(r);
        if (!base) base = {
            x: sx,
            y: sy
        };
        base.x += (sx - base.x) * .004;
        base.y += (sy - base.y) * .004;
        crudo = {
            x: lim((sx - base.x) / 2.2),
            y: lim((sy - base.y) / 2.2)
        };
        ultimo = performance.now();
    }
    try {
        window.addEventListener("devicemotion", alMover);
    } catch (e) {}
    return {
        leer(ahora) {
            const conSensor = performance.now() - ultimo < 2e3;
            const obj = conSensor ? crudo : {
                x: .7 * Math.sin(ahora / 11e3),
                y: .35 * Math.sin(ahora / 13700 + 1)
            };
            suave.x += (obj.x - suave.x) * .3;
            suave.y += (obj.y - suave.y) * .3;
            return suave;
        },
        destruir() {
            window.removeEventListener("devicemotion", alMover);
        }
    };
}
