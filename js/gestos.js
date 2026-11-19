const VERDE = "rgb(120,190,110)";

const VERDE_O = "rgb(80,150,80)";

const ROJO = "rgb(214,70,64)";

const PAPEL = "rgb(252,246,232)";

const ZONA = "rgb(160,210,140)";

const MADERA = "rgb(196,150,100)";

const MADERA_O = "rgb(150,100,60)";

const METAL = "rgb(176,180,190)";

const OLLA = "rgb(120,124,136)";

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

const lerp = (a, b, k) => a + (b - a) * k;

const mezcla = (c1, c2, k) => {
    const a = c1.match(/\d+/g).map(Number);
    const b = c2.match(/\d+/g).map(Number);
    return `rgb(${a.slice(0, 3).map(((v, i) => Math.round(lerp(v, b[i], clamp(k))))).join(",")})`;
};

function arrastrar(s, H, {abajo: abajo, mover: mover, arriba: arriba}) {
    let activo = false;
    s.addEventListener("pointerdown", (e => {
        if (!H.vivo()) return;
        e.preventDefault();
        try {
            s.setPointerCapture(e.pointerId);
        } catch (err) {}
        activo = true;
        if (abajo) abajo(H.aSvg(e), e);
    }));
    s.addEventListener("pointermove", (e => {
        if (!H.vivo() || !activo) return;
        if (mover) mover(H.aSvg(e), e);
    }));
    const soltar = e => {
        if (!activo) return;
        activo = false;
        if (H.vivo() && arriba) arriba(H.aSvg(e), e);
    };
    s.addEventListener("pointerup", soltar);
    s.addEventListener("pointercancel", soltar);
}

function letrero(H, s, txt, x = 150, y = 24, ancla = "middle") {
    const t = H.el(s, "text", {
        x: x,
        y: y,
        "text-anchor": ancla,
        class: "cocina-cuenta"
    });
    t.textContent = txt;
    return t;
}

function medidor(H, s, {x: x, y: y, w: w, h: h, a: a = 0, b: b = 0, vertical: vertical = false, rojo: rojo = 0}) {
    const {el: el, TINTA: TINTA} = H;
    el(s, "rect", {
        x: x,
        y: y,
        width: w,
        height: h,
        rx: 3,
        fill: PAPEL,
        stroke: TINTA,
        "stroke-width": 2.5
    });
    if (rojo) {
        if (vertical) el(s, "rect", {
            x: x + 2,
            y: y + 2,
            width: w - 4,
            height: h * rojo,
            fill: "rgb(240,170,160)"
        }); else el(s, "rect", {
            x: x + w * (1 - rojo),
            y: y + 2,
            width: w * rojo - 2,
            height: h - 4,
            fill: "rgb(240,170,160)"
        });
    }
    const zona = el(s, "rect", {
        fill: ZONA
    });
    const aguja = el(s, "rect", {
        fill: TINTA,
        rx: 1
    });
    const ponerZona = (a2, b2) => {
        if (vertical) {
            zona.setAttribute("x", x + 2);
            zona.setAttribute("width", w - 4);
            zona.setAttribute("y", y + h * (1 - b2));
            zona.setAttribute("height", Math.max(0, h * (b2 - a2)));
        } else {
            zona.setAttribute("y", y + 2);
            zona.setAttribute("height", h - 4);
            zona.setAttribute("x", x + w * a2);
            zona.setAttribute("width", Math.max(0, w * (b2 - a2)));
        }
    };
    ponerZona(a, b);
    const poner = v => {
        v = clamp(v);
        if (vertical) {
            aguja.setAttribute("x", x - 4);
            aguja.setAttribute("width", w + 8);
            aguja.setAttribute("y", (y + h * (1 - v) - 2).toFixed(1));
            aguja.setAttribute("height", 4);
        } else {
            aguja.setAttribute("y", y - 4);
            aguja.setAttribute("height", h + 8);
            aguja.setAttribute("x", (x + w * v - 2).toFixed(1));
            aguja.setAttribute("width", 4);
        }
    };
    poner(0);
    return {
        poner: poner,
        zona: ponerZona
    };
}

function mano(H, padre, x, y, k = 1, der = true) {
    const {el: el, TINTA: TINTA} = H;
    const g = el(padre, "g", {
        transform: `translate(${x} ${y}) scale(${der ? k : -k} ${k})`
    });
    el(g, "rect", {
        x: -16,
        y: -14,
        width: 26,
        height: 28,
        rx: 10,
        fill: "rgb(250,214,184)",
        stroke: TINTA,
        "stroke-width": 2.5
    });
    for (let i = 0; i < 3; i++) el(g, "rect", {
        x: 6,
        y: -12 + i * 8,
        width: 14,
        height: 7,
        rx: 3.5,
        fill: "rgb(250,214,184)",
        stroke: TINTA,
        "stroke-width": 2
    });
    return g;
}

function torcer(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const N = H.mas(paso.n || 18, 2);
    const CX = 150;
    const CY = 100;
    const R = 56;
    const RG = R + 24;
    const W0 = 2 * Math.PI / (3600 / H.rapido(.2));
    const TOL = H.ancho(.32);
    el(s, "circle", {
        cx: CX,
        cy: CY + 5,
        r: R + 6,
        fill: "rgba(60,40,30,0.18)"
    });
    const piel = el(s, "circle", {
        cx: CX,
        cy: CY,
        r: R,
        fill: H.MASA_R,
        stroke: TINTA,
        "stroke-width": 3
    });
    const relleno = el(s, "circle", {
        cx: CX,
        cy: CY,
        r: 26,
        fill: "rgb(214,150,110)",
        stroke: TINTA,
        "stroke-width": 2
    });
    const pliegues = el(s, "g", {});
    el(s, "circle", {
        cx: CX,
        cy: CY,
        r: RG,
        fill: "none",
        stroke: VERDE_O,
        "stroke-width": 2,
        "stroke-dasharray": "5 7",
        opacity: .7
    });
    const dedo = el(s, "circle", {
        cx: CX + RG,
        cy: CY,
        r: 9,
        fill: "rgb(250,214,184)",
        stroke: TINTA,
        "stroke-width": 2.5
    });
    const med = medidor(H, s, {
        x: 70,
        y: 186,
        w: 160,
        h: 9,
        a: .5 - TOL / 2.6,
        b: .5 + TOL / 2.6
    });
    const cuenta = letrero(H, s, `0 / ${N}`);
    H.ayuda("Circle around the bun with your finger · keep a steady speed");
    const paso1 = 2 * Math.PI / N;
    let previo = null;
    let total = 0;
    let sentido = 0;
    let k = 0;
    let tUlt = 0;
    let w = 0;
    const notas = [];
    Object.assign(H.g, {
        tipo: "torcer",
        cx: CX,
        cy: CY,
        r: RG,
        W0: W0,
        k: 0,
        N: N
    });
    const pliegue = i => {
        const a = sentido * i * paso1;
        const x1 = CX + (R - 1) * Math.cos(a);
        const y1 = CY + (R - 1) * Math.sin(a);
        const x2 = CX + 8 * Math.cos(a + sentido * .9);
        const y2 = CY + 8 * Math.sin(a + sentido * .9);
        const xm = CX + R * .55 * Math.cos(a + sentido * .35);
        const ym = CY + R * .55 * Math.sin(a + sentido * .35);
        el(pliegues, "path", {
            d: `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${xm.toFixed(1)} ${ym.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`,
            fill: "none",
            stroke: H.oscurecer(H.MASA_R, .78),
            "stroke-width": 2.5,
            "stroke-linecap": "round"
        });
    };
    arrastrar(s, H, {
        abajo: p => {
            previo = Math.atan2(p[1] - CY, p[0] - CX);
            tUlt = H.ahora();
        },
        mover: p => {
            const a = Math.atan2(p[1] - CY, p[0] - CX);
            let d = a - previo;
            if (d > Math.PI) d -= 2 * Math.PI;
            if (d < -Math.PI) d += 2 * Math.PI;
            previo = a;
            if (Math.hypot(p[0] - CX, p[1] - CY) < 20) return;
            if (!sentido && Math.abs(d) > .02) sentido = Math.sign(d);
            if (!sentido) return;
            const avance = d * sentido;
            if (avance <= 0) return;
            total += avance;
            const ahora = H.ahora();
            dedo.setAttribute("cx", (CX + RG * Math.cos(a)).toFixed(1));
            dedo.setAttribute("cy", (CY + RG * Math.sin(a)).toFixed(1));
            while (total >= (k + 1) * paso1 && k < N) {
                const v = paso1 / Math.max(1, ahora - tUlt) / W0;
                tUlt = ahora;
                w = v;
                if (k > 0) notas.push(H.notaDe(v - 1, TOL, .7));
                pliegue(k);
                k++;
                H.g.k = k;
                H.sonar(Math.abs(v - 1) <= TOL ? "tocar" : "no");
                cuenta.textContent = `${k} / ${N}`;
                const c = 1 - k / N;
                relleno.setAttribute("r", (26 * c + 3).toFixed(1));
                piel.setAttribute("r", (R - 6 * (1 - c)).toFixed(1));
                med.poner(clamp(w / 2.6 + .5 - 1 / 2.6));
            }
            if (k >= N) {
                el(s, "circle", {
                    cx: CX,
                    cy: CY,
                    r: 7,
                    fill: H.oscurecer(H.MASA_R, .85),
                    stroke: TINTA,
                    "stroke-width": 2.5
                });
                H.fin(H.promedio(notas));
            }
        }
    });
}

function cuchilla(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const N = H.mas(paso.n || 3, 1);
    const CX = 130;
    const CY = 112;
    const R0 = 14;
    const OBJ = 46;
    const TOL = H.ancho(5, .4);
    const K = .42;
    el(s, "rect", {
        x: 30,
        y: 52,
        width: 210,
        height: 128,
        rx: 10,
        fill: "rgb(214,176,124)",
        stroke: TINTA,
        "stroke-width": 3
    });
    for (let i = 0; i < 5; i++) el(s, "line", {
        x1: 40,
        y1: 70 + i * 24,
        x2: 230,
        y2: 66 + i * 24,
        stroke: "rgb(196,156,104)",
        "stroke-width": 2
    });
    el(s, "circle", {
        cx: CX,
        cy: CY,
        r: OBJ + TOL,
        fill: "none",
        stroke: VERDE,
        "stroke-width": TOL * 2,
        opacity: .25
    });
    el(s, "circle", {
        cx: CX,
        cy: CY,
        r: OBJ,
        fill: "none",
        stroke: VERDE_O,
        "stroke-width": 2,
        "stroke-dasharray": "6 6"
    });
    const pila = el(s, "g", {});
    const masa = el(s, "circle", {
        cx: CX,
        cy: CY,
        r: R0,
        fill: H.MASA_R,
        stroke: TINTA,
        "stroke-width": 3,
        opacity: .95
    });
    const cuchillo = el(s, "g", {
        transform: `translate(${CX - 70} ${CY})`
    });
    el(cuchillo, "rect", {
        x: -6,
        y: -34,
        width: 66,
        height: 52,
        rx: 4,
        fill: METAL,
        stroke: TINTA,
        "stroke-width": 3
    });
    el(cuchillo, "rect", {
        x: -6,
        y: -34,
        width: 66,
        height: 8,
        fill: "rgb(214,218,226)"
    });
    el(cuchillo, "circle", {
        cx: 50,
        cy: -20,
        r: 4,
        fill: "rgb(140,144,156)",
        stroke: TINTA,
        "stroke-width": 2
    });
    el(cuchillo, "rect", {
        x: -40,
        y: -6,
        width: 36,
        height: 13,
        rx: 5,
        fill: MADERA_O,
        stroke: TINTA,
        "stroke-width": 3
    });
    const cuenta = letrero(H, s, `0 / ${N}`);
    H.ayuda("Press the cleaver on the dough and smear it in ONE swipe · stop at the green circle");
    Object.assign(H.g, {
        tipo: "cuchilla",
        cx: CX,
        cy: CY,
        r0: R0,
        k: K,
        obj: OBJ,
        n: 0,
        N: N
    });
    let x0 = null;
    let r = R0;
    let n = 0;
    const notas = [];
    const nueva = () => {
        r = R0;
        masa.setAttribute("r", R0);
        masa.setAttribute("opacity", .95);
        cuchillo.setAttribute("transform", `translate(${CX - 70} ${CY})`);
    };
    arrastrar(s, H, {
        abajo: p => {
            x0 = p[0];
        },
        mover: p => {
            if (x0 === null) return;
            const d = Math.max(0, p[0] - x0);
            r = Math.min(80, Math.max(r, R0 + d * K));
            masa.setAttribute("r", r.toFixed(1));
            masa.setAttribute("opacity", (.95 - .25 * clamp((r - R0) / 40)).toFixed(2));
            cuchillo.setAttribute("transform", `translate(${(CX - 30 + d * .9).toFixed(1)} ${CY}) rotate(-8)`);
        },
        arriba: () => {
            if (x0 === null) return;
            x0 = null;
            if (r < R0 + 4) return nueva();
            const nota = H.notaDe(r - OBJ, TOL, 14);
            notas.push(nota);
            H.sonar(nota >= 2.5 ? "tocar" : "no");
            n++;
            H.g.n = n;
            cuenta.textContent = `${n} / ${N}`;
            el(pila, "circle", {
                cx: 262,
                cy: 160 - n * 6,
                r: 18,
                fill: H.MASA_R,
                stroke: TINTA,
                "stroke-width": 2.5,
                opacity: .9
            });
            if (n >= N) return H.fin(H.promedio(notas));
            nueva();
        }
    });
}

function aguaFria(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const N = paso.n || 3;
    const X0 = 70;
    const X1 = 210;
    const BORDE = 78;
    const AGUA = 118;
    const FONDO = 172;
    const A = .86;
    const B = .98;
    const TOL = H.ancho(.06, .3);
    const MID = (A + B) / 2;
    const fuego = el(s, "g", {});
    for (let i = 0; i < 5; i++) el(fuego, "path", {
        d: `M${X0 + 20 + i * 25} 192 Q${X0 + 28 + i * 25} 176 ${X0 + 34 + i * 25} 192 Z`,
        fill: i % 2 ? "rgb(255,170,60)" : "rgb(240,100,50)",
        stroke: TINTA,
        "stroke-width": 1.5
    });
    el(s, "rect", {
        x: X0,
        y: BORDE,
        width: X1 - X0,
        height: FONDO - BORDE,
        rx: 8,
        fill: OLLA,
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "rect", {
        x: X0 + 6,
        y: AGUA,
        width: X1 - X0 - 12,
        height: FONDO - AGUA - 6,
        rx: 4,
        fill: "rgb(170,204,224)"
    });
    const bolas = el(s, "g", {});
    const pos = [ [ 95, 0 ], [ 125, 1 ], [ 155, 2 ], [ 185, 3 ] ];
    const jiaos = pos.map((([x]) => {
        const g = el(bolas, "g", {});
        el(g, "path", {
            d: `M-11 4 Q0 -12 11 4 Z`,
            fill: H.MASA_R,
            stroke: TINTA,
            "stroke-width": 2.5,
            "stroke-linejoin": "round"
        });
        return {
            g: g,
            x: x
        };
    }));
    const espuma = el(s, "g", {});
    const capa = el(espuma, "rect", {
        x: X0 + 6,
        y: 0,
        width: X1 - X0 - 12,
        height: 30,
        fill: "rgb(250,250,246)"
    });
    const burb = el(espuma, "g", {});
    for (let i = 0; i < 9; i++) el(burb, "circle", {
        cx: X0 + 14 + i * 15,
        cy: 0,
        r: 7 + i % 3,
        fill: "rgb(250,250,246)",
        stroke: "rgb(200,206,214)",
        "stroke-width": 1.5
    });
    el(s, "rect", {
        x: X0 - 14,
        y: BORDE + 10,
        width: 16,
        height: 9,
        rx: 4,
        fill: OLLA,
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "rect", {
        x: X1 - 2,
        y: BORDE + 10,
        width: 16,
        height: 9,
        rx: 4,
        fill: OLLA,
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "rect", {
        x: X0 - 4,
        y: BORDE - 4,
        width: X1 - X0 + 8,
        height: 8,
        rx: 3,
        fill: "rgb(150,154,166)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const yDe = f => AGUA - (AGUA - BORDE) * f;
    el(s, "rect", {
        x: X0 - 30,
        y: yDe(B),
        width: 12,
        height: yDe(A) - yDe(B),
        fill: ZONA,
        stroke: TINTA,
        "stroke-width": 2
    });
    el(s, "line", {
        x1: X0 + 6,
        y1: yDe(MID),
        x2: X1 - 6,
        y2: yDe(MID),
        stroke: VERDE_O,
        "stroke-width": 2.5,
        "stroke-dasharray": "6 5"
    });
    const taza = el(s, "g", {
        transform: "translate(250 70)"
    });
    el(taza, "rect", {
        x: -18,
        y: -16,
        width: 36,
        height: 34,
        rx: 6,
        fill: "rgb(236,240,246)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(taza, "rect", {
        x: -14,
        y: -6,
        width: 28,
        height: 20,
        rx: 3,
        fill: "rgb(150,200,236)"
    });
    const chorro = el(s, "rect", {
        x: 222,
        y: 72,
        width: 6,
        height: 0,
        fill: "rgb(150,200,236)",
        opacity: 0
    });
    const cuenta = letrero(H, s, `0 / ${N}`);
    H.ayuda("When the foam reaches the green mark, tap to splash in cold water");
    let f = .15;
    let n = 0;
    let tUlt = 0;
    let enfria = 0;
    const notas = [];
    const vel = (38e-5 + 8e-5 * H.D) * H.rapido(.15);
    Object.assign(H.g, {
        tipo: "agua_fria",
        f: f,
        a: A,
        b: B,
        n: 0
    });
    const echar = nota => {
        notas.push(nota);
        n++;
        H.g.n = n;
        cuenta.textContent = `${n} / ${N}`;
        f = .12;
        enfria = 500;
        taza.setAttribute("transform", "translate(244 70) rotate(-40)");
        chorro.setAttribute("opacity", 1);
        chorro.setAttribute("height", 52);
        setTimeout((() => {
            taza.setAttribute("transform", "translate(250 70)");
            chorro.setAttribute("opacity", 0);
            chorro.setAttribute("height", 0);
        }), 380);
        if (n >= N) {
            jiaos.forEach((j => j.flota = true));
            setTimeout((() => H.fin(H.promedio(notas))), 500);
        }
    };
    H.bucle((t => {
        const dt = Math.min(50, t - tUlt);
        tUlt = t;
        if (n < N) {
            if (enfria > 0) enfria -= dt; else f += dt * vel * (.6 + f);
            if (f >= 1.12) {
                H.sonar("no");
                echar(1);
            }
        }
        H.g.f = f;
        const top = yDe(Math.min(1.12, f));
        capa.setAttribute("y", top.toFixed(1));
        capa.setAttribute("height", Math.max(0, AGUA - top + 4).toFixed(1));
        burb.setAttribute("transform", `translate(${(Math.sin(t / 180) * 2).toFixed(1)} ${top.toFixed(1)})`);
        jiaos.forEach(((j, i) => {
            const y = j.flota ? AGUA - 4 : AGUA + 22 + Math.sin(t / 240 + i * 1.7) * 6 - f * 12;
            j.g.setAttribute("transform", `translate(${j.x} ${y.toFixed(1)})`);
        }));
    }));
    s.addEventListener("pointerdown", (e => {
        e.preventDefault();
        if (!H.vivo() || n >= N || enfria > 0) return;
        const nota = H.notaDe(f - MID, (B - A) / 2 + TOL - .06, .4);
        H.sonar(nota >= 2.5 ? "tocar" : "no");
        echar(nota);
    }));
}

function leudar(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const az = H.azarDe("leudar" + (paso.n || ""));
    const bols = [ {
        cx: 92,
        td: (3400 + az() * 900) / H.rapido(.2)
    }, {
        cx: 208,
        td: (2500 + az() * 700) / H.rapido(.2)
    } ];
    const BASE = 150;
    const RX = 46;
    const RY0 = 15;
    const TOL = H.ancho(.09);
    const notas = [];
    for (const b of bols) {
        b.g = el(s, "g", {});
        el(s, "line", {
            x1: b.cx - RX - 6,
            y1: BASE - RY0 * 2,
            x2: b.cx + RX + 6,
            y2: BASE - RY0 * 2,
            stroke: VERDE_O,
            "stroke-width": 2.5,
            "stroke-dasharray": "6 5"
        });
        el(s, "rect", {
            x: b.cx - RX - 8,
            y: BASE - RY0 * 2 - TOL * RY0,
            width: RX * 2 + 16,
            height: TOL * RY0 * 2,
            fill: ZONA,
            opacity: .35
        });
        b.masa = el(b.g, "ellipse", {
            cx: b.cx,
            cy: BASE,
            rx: RX - 4,
            ry: RY0,
            fill: H.MASA_R,
            stroke: TINTA,
            "stroke-width": 3
        });
        b.tela = el(b.g, "ellipse", {
            cx: b.cx,
            cy: BASE,
            rx: RX + 2,
            ry: RY0 + 3,
            fill: "rgb(236,226,206)",
            stroke: TINTA,
            "stroke-width": 3
        });
        b.raya = el(b.g, "line", {
            x1: b.cx - RX + 6,
            y1: BASE - 6,
            x2: b.cx + RX - 6,
            y2: BASE - 6,
            stroke: "rgb(214,96,86)",
            "stroke-width": 3
        });
        el(s, "path", {
            d: `M${b.cx - RX - 6} ${BASE} L${b.cx - RX + 6} ${BASE + 32} L${b.cx + RX - 6} ${BASE + 32} L${b.cx + RX + 6} ${BASE} Z`,
            fill: "rgb(232,214,180)",
            stroke: TINTA,
            "stroke-width": 3,
            "stroke-linejoin": "round"
        });
        el(s, "rect", {
            x: b.cx - RX - 8,
            y: BASE - 3,
            width: RX * 2 + 16,
            height: 7,
            rx: 3,
            fill: "rgb(214,192,150)",
            stroke: TINTA,
            "stroke-width": 2.5
        });
        b.k = 1;
        b.listo = false;
    }
    const cuenta = letrero(H, s, "0 / 2");
    H.ayuda("The dough is rising · tap each bowl when it has doubled (green line)");
    Object.assign(H.g, {
        tipo: "leudar",
        k: [ 1, 1 ],
        cx: bols.map((b => b.cx)),
        y: BASE - 10
    });
    const destapar = (b, nota) => {
        b.listo = true;
        notas.push(nota);
        b.tela.setAttribute("opacity", 0);
        b.raya.setAttribute("opacity", 0);
        H.sonar(nota >= 2.5 ? "tocar" : "no");
        const n = bols.filter((x => x.listo)).length;
        cuenta.textContent = `${n} / 2`;
        if (n >= 2) setTimeout((() => H.fin(H.promedio(notas))), 350);
    };
    H.bucle((t => {
        bols.forEach(((b, i) => {
            if (b.listo) return;
            b.k = 1 + t / b.td;
            H.g.k[i] = b.k;
            if (b.k >= 2.7) {
                b.masa.setAttribute("ry", RY0 * 1.4);
                return destapar(b, 1);
            }
            const ry = RY0 * b.k;
            b.masa.setAttribute("ry", ry.toFixed(1));
            b.tela.setAttribute("ry", (ry + 3).toFixed(1));
            b.raya.setAttribute("y1", (BASE - ry * .55).toFixed(1));
            b.raya.setAttribute("y2", (BASE - ry * .55).toFixed(1));
        }));
    }));
    s.addEventListener("pointerdown", (e => {
        e.preventDefault();
        if (!H.vivo()) return;
        const [x] = H.aSvg(e);
        const b = x < 150 ? bols[0] : bols[1];
        if (b.listo) return;
        destapar(b, H.notaDe(b.k - 2, TOL, .45));
    }));
}

function exprimir(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const limon = paso.que === "limon";
    const N = paso.n || 2;
    const A = .55;
    const B = .7;
    const TOL = H.ancho(.075, .35);
    const MID = (A + B) / 2;
    const JUGO = limon ? "rgb(214,236,140)" : "rgb(176,214,150)";
    const BX0 = 100;
    const BX1 = 200;
    const BY0 = 132;
    const BY1 = 182;
    const yNivel = v => BY1 - 6 - (BY1 - BY0 - 10) * v;
    el(s, "path", {
        d: `M${BX0} ${BY0} L${BX0 + 12} ${BY1} L${BX1 - 12} ${BY1} L${BX1} ${BY0} Z`,
        fill: "rgb(236,240,246)",
        stroke: TINTA,
        "stroke-width": 3,
        "stroke-linejoin": "round"
    });
    const liq = el(s, "rect", {
        x: BX0 + 10,
        y: BY1 - 6,
        width: BX1 - BX0 - 20,
        height: 0,
        fill: JUGO
    });
    el(s, "rect", {
        x: BX1 + 6,
        y: yNivel(B),
        width: 9,
        height: yNivel(A) - yNivel(B),
        fill: ZONA,
        stroke: TINTA,
        "stroke-width": 2
    });
    const cosa = el(s, "g", {
        transform: "translate(150 74)"
    });
    if (limon) {
        el(cosa, "circle", {
            cx: 0,
            cy: 0,
            r: 26,
            fill: "rgb(110,170,60)",
            stroke: TINTA,
            "stroke-width": 3
        });
        el(cosa, "circle", {
            cx: 0,
            cy: 3,
            r: 21,
            fill: "rgb(222,240,160)"
        });
        for (let i = 0; i < 6; i++) {
            const a = i * Math.PI / 3;
            el(cosa, "line", {
                x1: 0,
                y1: 3,
                x2: 19 * Math.cos(a),
                y2: 3 + 19 * Math.sin(a),
                stroke: "rgb(250,252,220)",
                "stroke-width": 2
            });
        }
    } else {
        el(cosa, "circle", {
            cx: 0,
            cy: 4,
            r: 30,
            fill: "rgb(240,234,220)",
            stroke: TINTA,
            "stroke-width": 3
        });
        for (const [x, y] of [ [ -12, 0 ], [ 8, -4 ], [ -2, 14 ], [ 14, 12 ] ]) el(cosa, "circle", {
            cx: x,
            cy: y + 4,
            r: 8,
            fill: "rgb(110,170,80)",
            opacity: .85
        });
        el(cosa, "path", {
            d: "M-8 -26 Q0 -40 8 -26",
            fill: "rgb(240,234,220)",
            stroke: TINTA,
            "stroke-width": 3
        });
        for (let i = 0; i < 3; i++) el(cosa, "line", {
            x1: -22 + i * 18,
            y1: -18,
            x2: -14 + i * 18,
            y2: 28,
            stroke: "rgb(214,96,86)",
            "stroke-width": 2,
            opacity: .6
        });
    }
    const mi = mano(H, s, 106, 74, 1.1, true);
    const md = mano(H, s, 194, 74, 1.1, false);
    const gotas = el(s, "g", {});
    const gs = [ 0, 1, 2 ].map((() => el(gotas, "ellipse", {
        cx: 150,
        cy: 110,
        rx: 2.5,
        ry: 4,
        fill: JUGO,
        stroke: TINTA,
        "stroke-width": 1,
        opacity: 0
    })));
    const cuenta = letrero(H, s, `0 / ${N}`);
    H.ayuda(limon ? "Hold to squeeze the lime · let go when the bowl reaches the green band" : "Hold to squeeze the water out · let go at the green band");
    let n = 0;
    let v = 0;
    let aprieta = false;
    let tUlt = 0;
    let tA = 0;
    const notas = [];
    Object.assign(H.g, {
        tipo: "exprimir",
        v: 0,
        a: A,
        b: B,
        n: 0
    });
    H.bucle((t => {
        const dt = Math.min(50, t - tUlt);
        tUlt = t;
        if (aprieta) {
            tA += dt;
            const ritmo = 28e-5 * (.55 + .9 * Math.abs(Math.sin(tA / 260))) * H.rapido(.2);
            v = Math.min(1.15, v + dt * ritmo);
        }
        H.g.v = v;
        liq.setAttribute("y", yNivel(v).toFixed(1));
        liq.setAttribute("height", Math.max(0, BY1 - 6 - yNivel(v)).toFixed(1));
        const ap = aprieta ? 1 : 0;
        cosa.setAttribute("transform", `translate(150 74) scale(${1 - .18 * ap} ${1 + .06 * ap})`);
        mi.setAttribute("transform", `translate(${106 + 12 * ap} 74) scale(1.1 1.1)`);
        md.setAttribute("transform", `translate(${194 - 12 * ap} 74) scale(-1.1 1.1)`);
        gs.forEach(((gt, i) => {
            if (!aprieta) return gt.setAttribute("opacity", 0);
            const y = 104 + (t / 3 + i * 14) % 40 / 40 * (yNivel(v) - 104);
            gt.setAttribute("opacity", 1);
            gt.setAttribute("cy", y.toFixed(1));
            gt.setAttribute("cx", 146 + i * 4);
        }));
    }));
    arrastrar(s, H, {
        abajo: () => {
            aprieta = true;
        },
        arriba: () => {
            aprieta = false;
            if (v < .12) return;
            const nota = H.notaDe(v - MID, (B - A) / 2 + TOL - .075, .3);
            notas.push(nota);
            n++;
            H.g.n = n;
            cuenta.textContent = `${n} / ${N}`;
            H.sonar(nota >= 2.5 ? "tocar" : "no");
            if (n >= N) return H.fin(H.promedio(notas));
            setTimeout((() => {
                v = 0;
            }), 300);
        }
    });
}

function mortero(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const pimienta = paso.que === "pimienta";
    const N = H.mas(paso.n || 8, 2);
    const az = H.azarDe("mortero" + paso.que);
    const V = .12 * H.rapido(.25);
    const XH = 64;
    const TOLMS = H.ancho(75, .35);
    const tiempos = [];
    let tt = 1300;
    for (let i = 0; i < N; i++) {
        tiempos.push(tt);
        tt += (az() < .25 ? 330 : 520 + az() * 330) / H.rapido(.15);
    }
    el(s, "rect", {
        x: 30,
        y: 12,
        width: 240,
        height: 26,
        rx: 13,
        fill: PAPEL,
        stroke: TINTA,
        "stroke-width": 2.5
    });
    el(s, "circle", {
        cx: XH,
        cy: 25,
        r: 13,
        fill: ZONA,
        stroke: VERDE_O,
        "stroke-width": 3
    });
    const puntos = tiempos.map((() => el(s, "circle", {
        cx: 400,
        cy: 25,
        r: 7,
        fill: pimienta ? "rgb(170,60,40)" : "rgb(150,50,50)",
        stroke: TINTA,
        "stroke-width": 2
    })));
    const CX = 150;
    el(s, "path", {
        d: `M${CX - 62} 116 Q${CX - 58} 180 ${CX} 182 Q${CX + 58} 180 ${CX + 62} 116 Z`,
        fill: "rgb(150,150,156)",
        stroke: TINTA,
        "stroke-width": 3,
        "stroke-linejoin": "round"
    });
    el(s, "ellipse", {
        cx: CX,
        cy: 116,
        rx: 62,
        ry: 12,
        fill: "rgb(120,120,128)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const dentro = el(s, "g", {});
    const granos = [];
    for (let i = 0; i < 12; i++) granos.push(el(dentro, "ellipse", {
        cx: CX - 40 + i % 6 * 16,
        cy: 113 + Math.floor(i / 6) * 7,
        rx: pimienta ? 5 : 7,
        ry: pimienta ? 5 : 5,
        fill: pimienta ? "rgb(150,60,40)" : "rgb(160,50,56)",
        stroke: TINTA,
        "stroke-width": 1.5
    }));
    const pasta = el(dentro, "ellipse", {
        cx: CX,
        cy: 117,
        rx: 0,
        ry: 0,
        fill: pimienta ? "rgb(110,50,36)" : "rgb(130,46,50)"
    });
    const mano_ = el(s, "g", {});
    el(mano_, "rect", {
        x: -13,
        y: -54,
        width: 26,
        height: 60,
        rx: 12,
        fill: "rgb(176,176,182)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(mano_, "rect", {
        x: -9,
        y: -50,
        width: 6,
        height: 48,
        rx: 3,
        fill: "rgb(206,206,212)"
    });
    mano_.setAttribute("transform", `translate(${CX + 10} 100)`);
    const cuenta = letrero(H, s, `0 / ${N}`, 284, 70, "end");
    H.ayuda("Tap when each dot reaches the green circle");
    const notas = [];
    const hecho = tiempos.map((() => false));
    let golpes = 0;
    let sueltos = 0;
    Object.assign(H.g, {
        tipo: "mortero",
        prox: null
    });
    const golpe = () => {
        golpes++;
        const k = clamp(golpes / N);
        mano_.setAttribute("transform", `translate(${CX + 4} 112)`);
        setTimeout((() => mano_.setAttribute("transform", `translate(${CX + 10} 100)`)), 110);
        granos.forEach(((g, i) => g.setAttribute("opacity", i < 12 * (1 - k) ? 1 : 0)));
        pasta.setAttribute("rx", (52 * k).toFixed(1));
        pasta.setAttribute("ry", (9 * k).toFixed(1));
    };
    const resueltos = () => hecho.filter(Boolean).length;
    const cerrar = () => {
        cuenta.textContent = `${resueltos()} / ${N}`;
        if (resueltos() >= N) H.fin(H.promedio(notas) - .12 * sueltos);
    };
    H.bucle((t => {
        let prox = null;
        tiempos.forEach(((ti, i) => {
            const x = XH + (ti - t) * V;
            puntos[i].setAttribute("cx", hecho[i] ? -40 : clamp(x, -40, 400).toFixed(1));
            if (!hecho[i] && t - ti > 260) {
                hecho[i] = true;
                notas.push(1);
                H.sonar("no");
                cerrar();
            }
            if (!hecho[i] && prox === null) prox = ti;
        }));
        H.g.prox = prox === null ? null : H.t0 + prox;
    }));
    s.addEventListener("pointerdown", (e => {
        e.preventDefault();
        if (!H.vivo()) return;
        const t = H.ahora() - H.t0;
        let mej = -1;
        tiempos.forEach(((ti, i) => {
            if (!hecho[i] && (mej < 0 || Math.abs(ti - t) < Math.abs(tiempos[mej] - t))) mej = i;
        }));
        golpe();
        if (mej < 0 || Math.abs(tiempos[mej] - t) > 260) {
            sueltos++;
            H.sonar("no");
            return;
        }
        hecho[mej] = true;
        const nota = H.notaDe(t - tiempos[mej], TOLMS, 170);
        notas.push(nota);
        H.sonar(nota >= 2.5 ? "tocar" : "no");
        cerrar();
    }));
}

function abrir(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const CX = 150;
    const CY = 100;
    const R = 44;
    const META = 46;
    const VLIM = .075 * H.rapido(.2);
    const TOL = H.ancho(.3);
    el(s, "ellipse", {
        cx: CX,
        cy: CY + 46,
        rx: 110,
        ry: 24,
        fill: "rgb(250,250,246)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const lava = el(s, "ellipse", {
        cx: CX,
        cy: CY + 42,
        rx: 0,
        ry: 0,
        fill: "rgb(255,190,40)",
        stroke: TINTA,
        "stroke-width": 2
    });
    const chorro = el(s, "rect", {
        x: CX - 3,
        y: CY - 30,
        width: 6,
        height: 0,
        fill: "rgb(255,190,40)"
    });
    const mitad = lado => {
        const g = el(s, "g", {});
        const d = lado < 0 ? `M${CX} ${CY - R} A${R} ${R} 0 0 0 ${CX} ${CY + R} Z` : `M${CX} ${CY - R} A${R} ${R} 0 0 1 ${CX} ${CY + R} Z`;
        el(g, "path", {
            d: d,
            fill: H.MASA_R,
            stroke: TINTA,
            "stroke-width": 3
        });
        for (let i = 0; i < 3; i++) el(g, "path", {
            d: `M${CX + lado * (4 + i * 9)} ${CY - R + 3 + i * 3} q${lado * 6} 10 ${lado * 2} 18`,
            fill: "none",
            stroke: H.oscurecer(H.MASA_R, .8),
            "stroke-width": 2,
            "stroke-linecap": "round"
        });
        g.lava = el(g, "path", {
            d: lado < 0 ? `M${CX} ${CY - 26} A26 26 0 0 0 ${CX} ${CY + 26} Z` : `M${CX} ${CY - 26} A26 26 0 0 1 ${CX} ${CY + 26} Z`,
            fill: "rgb(255,196,60)",
            opacity: 0
        });
        return g;
    };
    const izq = mitad(-1);
    const der = mitad(1);
    const salpica = el(s, "g", {});
    const med = medidor(H, s, {
        x: 60,
        y: 14,
        w: 180,
        h: 10,
        a: 0,
        b: 1 / 1.6,
        rojo: 1 - 1 / 1.6
    });
    H.ayuda("Drag sideways to pull the bun open · slowly, so the custard flows");
    Object.assign(H.g, {
        tipo: "abrir",
        cx: CX,
        cy: CY,
        meta: META,
        vlim: VLIM,
        gap: 0
    });
    let x0 = null;
    let gap = 0;
    let tPrev = 0;
    let xPrev = 0;
    let v = 0;
    let vMax = 0;
    arrastrar(s, H, {
        abajo: p => {
            x0 = p[0] - gap / 2 * Math.sign(p[0] - CX || 1);
            tPrev = H.ahora();
            xPrev = p[0];
        },
        mover: p => {
            if (x0 === null) return;
            const ahora = H.ahora();
            const dt = Math.max(1, ahora - tPrev);
            const inst = Math.abs(p[0] - xPrev) / dt;
            v = v * .75 + inst * .25;
            tPrev = ahora;
            xPrev = p[0];
            const g2 = clamp(Math.abs(p[0] - x0) * 2, gap, 90);
            if (g2 > gap) {
                if (v > VLIM) {
                    vMax = Math.max(vMax, v);
                    if (salpica.childNodes.length < 14) {
                        for (let i = 0; i < 2; i++) el(salpica, "circle", {
                            cx: CX + (Math.random() - .5) * 120,
                            cy: CY - 20 + Math.random() * 60,
                            r: 3 + Math.random() * 3,
                            fill: "rgb(255,190,40)",
                            stroke: TINTA,
                            "stroke-width": 1.5
                        });
                        H.sonar("no");
                    }
                }
                vMax = Math.max(vMax, Math.min(v, VLIM));
                gap = g2;
            }
            H.g.gap = gap;
            med.poner(v / (VLIM * 1.6));
            izq.setAttribute("transform", `translate(${(-gap / 2).toFixed(1)} 0) rotate(${(-gap / 6).toFixed(1)} ${CX} ${CY + R})`);
            der.setAttribute("transform", `translate(${(gap / 2).toFixed(1)} 0) rotate(${(gap / 6).toFixed(1)} ${CX} ${CY + R})`);
            for (const m of [ izq, der ]) m.lava.setAttribute("opacity", gap > 6 ? 1 : 0);
            const k = clamp(gap / META);
            chorro.setAttribute("height", (70 * k).toFixed(1));
            lava.setAttribute("rx", (60 * k).toFixed(1));
            lava.setAttribute("ry", (13 * k).toFixed(1));
            if (gap >= META) {
                x0 = null;
                H.fin(H.notaDe(Math.max(0, vMax / VLIM - 1), TOL, 1));
            }
        },
        arriba: () => {
            x0 = null;
            v = 0;
            med.poner(0);
        }
    });
}

function rodar(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const N = paso.n || 3;
    const CX = 150;
    const CY = 104;
    const RC = 78;
    const A = .85;
    const B = 1.05;
    const TOL = H.ancho(.12, .35);
    const MID = (A + B) / 2;
    el(s, "circle", {
        cx: CX,
        cy: CY + 4,
        r: RC + 12,
        fill: "rgba(60,40,30,0.2)"
    });
    el(s, "circle", {
        cx: CX,
        cy: CY,
        r: RC + 10,
        fill: "rgb(196,150,90)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "circle", {
        cx: CX,
        cy: CY,
        r: RC,
        fill: "rgb(226,190,130)",
        stroke: TINTA,
        "stroke-width": 2.5
    });
    for (let i = -3; i <= 3; i++) el(s, "line", {
        x1: CX + i * 22,
        y1: CY - Math.sqrt(RC * RC - (i * 22) ** 2),
        x2: CX + i * 22,
        y2: CY + Math.sqrt(RC * RC - (i * 22) ** 2),
        stroke: "rgb(206,168,110)",
        "stroke-width": 2
    });
    for (const [x, y, r] of [ [ -30, -20, 16 ], [ 24, 18, 20 ], [ -10, 34, 12 ], [ 36, -30, 12 ], [ -44, 20, 10 ] ]) el(s, "ellipse", {
        cx: CX + x,
        cy: CY + y,
        rx: r,
        ry: r * .7,
        fill: "rgb(252,250,244)",
        opacity: .8
    });
    const az = H.azarDe("rodar");
    const bolas = [];
    for (let i = 0; i < N; i++) {
        const a = i / N * Math.PI * 2;
        bolas.push({
            x: CX + 26 * Math.cos(a),
            y: CY + 26 * Math.sin(a),
            vx: 0,
            vy: 0,
            c: 0,
            roce: .95 + az() * .1,
            e: el(s, "circle", {
                r: 9,
                fill: "rgb(40,36,40)",
                stroke: TINTA,
                "stroke-width": 2.5
            })
        });
    }
    const flecha = el(s, "line", {
        x1: CX,
        y1: CY,
        x2: CX,
        y2: CY,
        stroke: VERDE_O,
        "stroke-width": 4,
        "stroke-linecap": "round",
        opacity: .7
    });
    const med = medidor(H, s, {
        x: 262,
        y: 30,
        w: 12,
        h: 150,
        a: A / 1.4,
        b: B / 1.4,
        vertical: true
    });
    H.ayuda("Hold and drag to tilt the basket · tap Done when the balls are white (green)");
    Object.assign(H.g, {
        tipo: "rodar",
        c: bolas.map((() => 0)),
        a: A,
        b: B,
        cx: CX,
        cy: CY
    });
    let tilt = [ 0, 0 ];
    let dedo = null;
    let tUlt = 0;
    H.bucle((t => {
        const dt = Math.min(40, t - tUlt);
        tUlt = t;
        if (dedo) tilt = [ clamp((dedo[0] - CX) / 70, -1, 1), clamp((dedo[1] - CY) / 70, -1, 1) ]; else tilt = [ tilt[0] * .9, tilt[1] * .9 ];
        flecha.setAttribute("x2", (CX + tilt[0] * 40).toFixed(1));
        flecha.setAttribute("y2", (CY + tilt[1] * 40).toFixed(1));
        let cmin = 9;
        bolas.forEach(((b, i) => {
            const fr = Math.exp(-dt / 450);
            b.vx = (b.vx + tilt[0] * 6e-4 * dt) * fr;
            b.vy = (b.vy + tilt[1] * 6e-4 * dt) * fr;
            const nx = b.x + b.vx * dt;
            const ny = b.y + b.vy * dt;
            const r = 9 + 5 * Math.min(1.3, b.c);
            const d = Math.hypot(nx - CX, ny - CY);
            if (d > RC - r) {
                const ux = (nx - CX) / d;
                const uy = (ny - CY) / d;
                const vn = b.vx * ux + b.vy * uy;
                b.vx -= 1.6 * vn * ux;
                b.vy -= 1.6 * vn * uy;
                b.x = CX + ux * (RC - r);
                b.y = CY + uy * (RC - r);
            } else {
                b.x = nx;
                b.y = ny;
            }
            b.c += Math.hypot(b.vx, b.vy) * dt * .0021 * b.roce * H.rapido(.2);
            H.g.c[i] = b.c;
            cmin = Math.min(cmin, b.c);
            b.e.setAttribute("cx", b.x.toFixed(1));
            b.e.setAttribute("cy", b.y.toFixed(1));
            b.e.setAttribute("r", r.toFixed(1));
            b.e.setAttribute("fill", b.c > B + .2 ? "rgb(236,226,206)" : mezcla("rgb(40,36,40)", "rgb(253,252,248)", b.c / A));
        }));
        med.poner(cmin / 1.4);
    }));
    arrastrar(s, H, {
        abajo: p => {
            dedo = p;
        },
        mover: p => {
            dedo = p;
        },
        arriba: () => {
            dedo = null;
        }
    });
    H.boton("Done ✓", (() => {
        H.fin(H.promedio(bolas.map((b => H.notaDe(b.c - MID, (B - A) / 2 + TOL - .12, .4)))));
    }));
}

function moler(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const A = .6;
    const B = .72;
    const TOL = H.ancho(.06, .35);
    const MID = (A + B) / 2;
    const CX = 150;
    const PC = [ 150, 60 ];
    const L = 40;
    el(s, "rect", {
        x: 108,
        y: 82,
        width: 84,
        height: 96,
        rx: 6,
        fill: MADERA,
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "rect", {
        x: 118,
        y: 138,
        width: 64,
        height: 32,
        rx: 3,
        fill: "rgb(120,80,50)",
        stroke: TINTA,
        "stroke-width": 2.5
    });
    const molido = el(s, "rect", {
        x: 120,
        y: 168,
        width: 60,
        height: 0,
        fill: "rgb(80,52,36)"
    });
    const yDe = v => 168 - 28 * v;
    el(s, "rect", {
        x: 186,
        y: yDe(B),
        width: 9,
        height: yDe(A) - yDe(B),
        fill: ZONA,
        stroke: TINTA,
        "stroke-width": 2
    });
    el(s, "circle", {
        cx: CX,
        cy: 158,
        r: 3,
        fill: "rgb(230,200,140)",
        stroke: TINTA,
        "stroke-width": 1.5
    });
    el(s, "path", {
        d: `M118 82 L128 62 L172 62 L182 82 Z`,
        fill: METAL,
        stroke: TINTA,
        "stroke-width": 3,
        "stroke-linejoin": "round"
    });
    const granos = el(s, "g", {});
    const gr = [];
    for (let i = 0; i < 7; i++) gr.push(el(granos, "ellipse", {
        cx: 132 + i * 6,
        cy: 68 + i % 2 * 4,
        rx: 4,
        ry: 3,
        fill: "rgb(110,66,40)",
        stroke: TINTA,
        "stroke-width": 1.2
    }));
    const brazo = el(s, "line", {
        x1: PC[0],
        y1: PC[1],
        x2: PC[0] + L,
        y2: PC[1],
        stroke: METAL,
        "stroke-width": 6,
        "stroke-linecap": "round"
    });
    el(s, "circle", {
        cx: PC[0],
        cy: PC[1],
        r: 6,
        fill: METAL,
        stroke: TINTA,
        "stroke-width": 2.5
    });
    const pomo = el(s, "circle", {
        cx: PC[0] + L,
        cy: PC[1],
        r: 9,
        fill: MADERA_O,
        stroke: TINTA,
        "stroke-width": 2.5
    });
    el(s, "circle", {
        cx: PC[0],
        cy: PC[1],
        r: L,
        fill: "none",
        stroke: VERDE_O,
        "stroke-width": 2,
        "stroke-dasharray": "4 7",
        opacity: .6
    });
    H.ayuda("Turn the crank in circles · tap Done when the drawer reaches the green mark");
    Object.assign(H.g, {
        tipo: "moler",
        v: 0,
        a: A,
        b: B,
        cx: PC[0],
        cy: PC[1],
        r: L
    });
    let previo = null;
    let v = 0;
    let ang = 0;
    arrastrar(s, H, {
        abajo: p => {
            previo = Math.atan2(p[1] - PC[1], p[0] - PC[0]);
        },
        mover: p => {
            const a = Math.atan2(p[1] - PC[1], p[0] - PC[0]);
            let d = a - previo;
            if (d > Math.PI) d -= 2 * Math.PI;
            if (d < -Math.PI) d += 2 * Math.PI;
            previo = a;
            if (Math.hypot(p[0] - PC[0], p[1] - PC[1]) < 12) return;
            ang = a;
            v = Math.min(1.1, v + Math.abs(d) / (2 * Math.PI) * .13);
            H.g.v = v;
            const x = PC[0] + L * Math.cos(ang);
            const y = PC[1] + L * Math.sin(ang);
            brazo.setAttribute("x2", x.toFixed(1));
            brazo.setAttribute("y2", y.toFixed(1));
            pomo.setAttribute("cx", x.toFixed(1));
            pomo.setAttribute("cy", y.toFixed(1));
            molido.setAttribute("y", yDe(v).toFixed(1));
            molido.setAttribute("height", (168 - yDe(v)).toFixed(1));
            gr.forEach(((g, i) => g.setAttribute("opacity", i < 7 * (1 - v) ? 1 : 0)));
            if (Math.abs(d) > .05 && Math.random() < .2) H.sonar("tecla");
        }
    });
    H.boton("Done ✓", (() => {
        if (v < .1) return;
        H.fin(H.notaDe(v - MID, (B - A) / 2 + TOL - .06, .3));
    }));
}

function licuar(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const color = paso.color || "rgb(255,196,60)";
    const LIM = .72;
    const TOL = H.ancho(.12, .4);
    el(s, "path", {
        d: "M112 34 L120 148 L180 148 L188 34 Z",
        fill: "rgb(236,244,250)",
        stroke: TINTA,
        "stroke-width": 3,
        "stroke-linejoin": "round"
    });
    const liq = el(s, "path", {
        d: "M117 80 L121 144 L179 144 L183 80 Z",
        fill: "rgb(250,240,200)"
    });
    const espuma = el(s, "rect", {
        x: 117,
        y: 80,
        width: 66,
        height: 0,
        fill: "rgb(255,250,236)"
    });
    const trozos = el(s, "g", {});
    const tz = [];
    for (let i = 0; i < 8; i++) tz.push(el(trozos, "rect", {
        x: 124 + i % 4 * 13,
        y: 96 + Math.floor(i / 4) * 22,
        width: 10,
        height: 9,
        rx: 2,
        fill: i % 2 ? "rgb(236,170,40)" : "rgb(120,40,70)",
        stroke: TINTA,
        "stroke-width": 1.5
    }));
    const aspas = el(s, "g", {
        transform: "translate(150 138)"
    });
    el(aspas, "rect", {
        x: -16,
        y: -2,
        width: 32,
        height: 4,
        rx: 2,
        fill: METAL,
        stroke: TINTA,
        "stroke-width": 1.5
    });
    el(s, "rect", {
        x: 106,
        y: 30,
        width: 88,
        height: 8,
        rx: 3,
        fill: "rgb(60,60,70)",
        stroke: TINTA,
        "stroke-width": 2.5
    });
    el(s, "path", {
        d: "M104 148 L196 148 L202 186 L98 186 Z",
        fill: "rgb(214,90,80)",
        stroke: TINTA,
        "stroke-width": 3,
        "stroke-linejoin": "round"
    });
    const luz = el(s, "circle", {
        cx: 150,
        cy: 168,
        r: 8,
        fill: "rgb(250,240,220)",
        stroke: TINTA,
        "stroke-width": 2.5
    });
    const med = medidor(H, s, {
        x: 222,
        y: 34,
        w: 12,
        h: 140,
        a: 0,
        b: LIM,
        vertical: true,
        rojo: 1 - LIM
    });
    el(s, "text", {
        x: 228,
        y: 28,
        "text-anchor": "middle",
        class: "cocina-cuenta",
        "font-size": 10
    }).textContent = "foam";
    const lisu = medidor(H, s, {
        x: 66,
        y: 34,
        w: 12,
        h: 140,
        a: .97,
        b: 1,
        vertical: true
    });
    H.ayuda("Hold to blend in pulses · don't let the foam reach the red");
    Object.assign(H.g, {
        tipo: "licuar",
        e: 0,
        l: 0,
        lim: LIM
    });
    let on = false;
    let tOn = 0;
    let tUlt = 0;
    let e = 0;
    let eMax = 0;
    let l = 0;
    let rebose = 0;
    H.bucle((t => {
        const dt = Math.min(40, t - tUlt);
        tUlt = t;
        if (on) {
            tOn += dt;
            l += dt * 33e-5 * H.rapido(.2);
            e += dt * 26e-5 * (1 + tOn / 650) * H.rapido(.25);
        } else e = Math.max(0, e - dt * 62e-5);
        eMax = Math.max(eMax, e);
        if (e >= 1) {
            rebose++;
            e = .45;
            H.sonar("no");
        }
        H.g.e = e;
        H.g.l = l;
        med.poner(e);
        lisu.poner(l);
        espuma.setAttribute("y", (80 - 34 * e).toFixed(1));
        espuma.setAttribute("height", (34 * e + 4).toFixed(1));
        liq.setAttribute("fill", mezcla("rgb(250,240,200)", color, l));
        tz.forEach(((z, i) => {
            z.setAttribute("opacity", i < 8 * (1 - l) ? 1 : 0);
            if (on) z.setAttribute("transform", `rotate(${((t / 3 + i * 45) % 360).toFixed(0)} 150 118)`);
        }));
        aspas.setAttribute("transform", `translate(150 138) rotate(${on ? (t * 1.5 % 180).toFixed(0) : 0})`);
        luz.setAttribute("fill", on ? "rgb(140,220,120)" : "rgb(250,240,220)");
        if (l >= 1) {
            on = false;
            H.fin(H.notaDe(Math.max(0, eMax - LIM * .86), TOL, .35) - .5 * rebose);
        }
    }));
    arrastrar(s, H, {
        abajo: () => {
            on = true;
            tOn = 0;
        },
        arriba: () => {
            on = false;
        }
    });
}

function termometro(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const OBJ = 80;
    const TOL = H.ancho(2.2, .35);
    const TAU = 5200 / H.rapido(.25);
    el(s, "ellipse", {
        cx: 112,
        cy: 132,
        rx: 52,
        ry: 42,
        fill: "rgb(214,226,232)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "path", {
        d: "M160 124 Q186 110 192 92 L198 96 Q192 122 162 140 Z",
        fill: "rgb(214,226,232)",
        stroke: TINTA,
        "stroke-width": 3,
        "stroke-linejoin": "round"
    });
    el(s, "rect", {
        x: 94,
        y: 84,
        width: 36,
        height: 10,
        rx: 4,
        fill: "rgb(190,204,212)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "path", {
        d: "M70 110 Q40 120 62 150",
        fill: "none",
        stroke: TINTA,
        "stroke-width": 5
    });
    const vapor = el(s, "g", {});
    const vs = [ 0, 1, 2 ].map((i => el(vapor, "path", {
        d: `M${186 + i * 6} 84 q-6 -10 0 -20 q6 -10 0 -20`,
        fill: "none",
        stroke: "rgb(230,236,240)",
        "stroke-width": 4,
        "stroke-linecap": "round"
    })));
    const TX = 244;
    const Y0 = 34;
    const Y1 = 160;
    const yDe = T => Y1 - (T - 60) / 40 * (Y1 - Y0);
    el(s, "rect", {
        x: TX - 9,
        y: Y0 - 8,
        width: 18,
        height: Y1 - Y0 + 16,
        rx: 9,
        fill: PAPEL,
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "rect", {
        x: TX - 7,
        y: yDe(OBJ + TOL),
        width: 14,
        height: yDe(OBJ - TOL) - yDe(OBJ + TOL),
        fill: ZONA
    });
    for (let T = 60; T <= 100; T += 10) {
        el(s, "line", {
            x1: TX - 16,
            y1: yDe(T),
            x2: TX - 10,
            y2: yDe(T),
            stroke: TINTA,
            "stroke-width": 2
        });
        el(s, "text", {
            x: TX - 19,
            y: yDe(T) + 3,
            "text-anchor": "end",
            "font-size": 9,
            class: "cocina-cuenta"
        }).textContent = `${T}`;
    }
    const columna = el(s, "rect", {
        x: TX - 3,
        y: Y0,
        width: 6,
        height: Y1 - Y0,
        fill: ROJO
    });
    el(s, "circle", {
        cx: TX,
        cy: Y1 + 12,
        r: 11,
        fill: ROJO,
        stroke: TINTA,
        "stroke-width": 3
    });
    const grados = letrero(H, s, "100°C", 150, 26);
    H.ayuda("Let the water cool · tap to pour at 80 °C (green)");
    let T = 100;
    Object.assign(H.g, {
        tipo: "termometro",
        T: T,
        obj: OBJ
    });
    H.bucle((t => {
        T = 60 + 40 * Math.exp(-t / TAU);
        H.g.T = T;
        columna.setAttribute("y", yDe(T).toFixed(1));
        columna.setAttribute("height", (Y1 - yDe(T)).toFixed(1));
        grados.textContent = `${Math.round(T)}°C`;
        vs.forEach(((v, i) => {
            v.setAttribute("opacity", clamp((T - 70 - i * 8) / 18).toFixed(2));
            v.setAttribute("transform", `translate(0 ${(-((t / 30 + i * 9) % 12)).toFixed(1)})`);
        }));
        if (T < 66) H.fin(1);
    }));
    s.addEventListener("pointerdown", (e => {
        e.preventDefault();
        if (!H.vivo()) return;
        H.fin(H.notaDe(T - OBJ, TOL, 8));
    }));
}

function aceite(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const A = .48;
    const B = .66;
    const DUR = 6500 / H.rapido(.15);
    const anchoZ = H.ancho(1, .3);
    const a = .57 - (.57 - A) * anchoZ;
    const b = .57 + (B - .57) * anchoZ;
    const rollos = paso.forma === "rollo";
    const fuego = el(s, "g", {});
    const llamas = [ 0, 1, 2, 3, 4 ].map((i => el(fuego, "path", {
        d: `M${100 + i * 25} 194 Q${108 + i * 25} 180 ${114 + i * 25} 194 Z`,
        fill: i % 2 ? "rgb(255,170,60)" : "rgb(240,100,50)",
        stroke: TINTA,
        "stroke-width": 1.5
    })));
    el(s, "path", {
        d: "M62 92 L76 176 L224 176 L238 92 Z",
        fill: "rgb(60,60,70)",
        stroke: TINTA,
        "stroke-width": 3,
        "stroke-linejoin": "round"
    });
    el(s, "rect", {
        x: 66,
        y: 104,
        width: 168,
        height: 66,
        fill: "rgb(236,190,80)",
        opacity: .85
    });
    const comida = [];
    for (let i = 0; i < (rollos ? 3 : 4); i++) {
        const g = el(s, "g", {});
        if (rollos) el(g, "rect", {
            x: -20,
            y: -8,
            width: 40,
            height: 16,
            rx: 7,
            stroke: TINTA,
            "stroke-width": 2.5
        }); else el(g, "circle", {
            r: 13,
            stroke: TINTA,
            "stroke-width": 2.5
        });
        comida.push({
            g: g,
            x: rollos ? 100 + i * 50 : 94 + i * 37
        });
    }
    const burb = el(s, "g", {});
    const bs = [];
    for (let i = 0; i < 10; i++) bs.push(el(burb, "circle", {
        cx: 80 + i * 15,
        cy: 108,
        r: 2.5,
        fill: "rgb(255,236,170)",
        stroke: TINTA,
        "stroke-width": 1
    }));
    const humo = el(s, "path", {
        d: "M150 86 q-8 -12 0 -24 q8 -12 0 -24",
        fill: "none",
        stroke: "rgb(160,160,170)",
        "stroke-width": 5,
        "stroke-linecap": "round",
        opacity: 0
    });
    el(s, "rect", {
        x: 56,
        y: 88,
        width: 188,
        height: 8,
        rx: 3,
        fill: "rgb(80,80,90)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const med = medidor(H, s, {
        x: 70,
        y: 22,
        w: 160,
        h: 11,
        a: a,
        b: b,
        rojo: .14
    });
    const prog = medidor(H, s, {
        x: 262,
        y: 40,
        w: 10,
        h: 130,
        a: 0,
        b: 0,
        vertical: true
    });
    H.ayuda("Hold to turn the heat up, let go to cool · keep the oil in the green");
    let T = .42;
    let on = false;
    let tUlt = 0;
    let p = 0;
    let dentro = 0;
    let total = 0;
    const az = H.azarDe("aceite");
    const fase = [ az() * 6, az() * 6 ];
    Object.assign(H.g, {
        tipo: "aceite",
        T: T,
        a: a,
        b: b,
        p: 0
    });
    H.bucle((t => {
        const dt = Math.min(40, t - tUlt);
        tUlt = t;
        const deriva = 9e-5 * (Math.sin(t / 700 + fase[0]) + Math.sin(t / 430 + fase[1]));
        T += dt * ((on ? 42e-5 : -34e-5) + deriva) * H.rapido(.25);
        T = clamp(T, .05, 1);
        p += dt / DUR;
        total += dt;
        if (T >= a && T <= b) dentro += dt;
        H.g.T = T;
        H.g.p = p;
        med.poner(T);
        prog.poner(p);
        const dorado = clamp(p) * (T > b ? 1.25 : T < a ? .7 : 1);
        comida.forEach(((c, i) => {
            const y = 132 + Math.sin(t / 300 + i) * 3;
            c.g.setAttribute("transform", `translate(${c.x} ${y.toFixed(1)})`);
            c.g.firstChild.setAttribute("fill", mezcla("rgb(252,236,190)", T > b + .12 ? "rgb(150,90,40)" : "rgb(222,150,50)", dorado));
        }));
        bs.forEach(((bb, i) => {
            const vivo = i < 10 * T;
            bb.setAttribute("opacity", vivo ? 1 : 0);
            bb.setAttribute("cy", (108 + (t / (6 - T * 4) + i * 13) % 60).toFixed(1));
        }));
        humo.setAttribute("opacity", T > b + .08 ? .8 : 0);
        llamas.forEach((l => l.setAttribute("transform", `translate(0 ${on ? -6 : 0}) scale(1 ${on ? 1 : .7})`)));
        if (p >= 1) H.fin(1 + 2 * Math.pow(clamp(dentro / total / .92), 1.5));
    }));
    arrastrar(s, H, {
        abajo: () => {
            on = true;
        },
        arriba: () => {
            on = false;
        }
    });
}

function palmear(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const N = H.mas(paso.n || 8, 2);
    const TOL = H.ancho(.25, .35);
    const CX = 150;
    const CY = 104;
    const zi = el(s, "rect", {
        x: 8,
        y: 40,
        width: 120,
        height: 150,
        rx: 14,
        fill: ZONA,
        opacity: 0
    });
    const zd = el(s, "rect", {
        x: 172,
        y: 40,
        width: 120,
        height: 150,
        rx: 14,
        fill: ZONA,
        opacity: 0
    });
    const masa = el(s, "ellipse", {
        cx: CX,
        cy: CY,
        rx: 26,
        ry: 24,
        fill: H.MASA_R,
        stroke: TINTA,
        "stroke-width": 3
    });
    const grieta = el(s, "path", {
        d: `M${CX - 10} ${CY - 6} l6 5 l-4 6`,
        fill: "none",
        stroke: TINTA,
        "stroke-width": 2,
        opacity: 0
    });
    const mi = mano(H, s, 64, CY, 1.4, true);
    const md = mano(H, s, 236, CY, 1.4, false);
    const cuenta = letrero(H, s, `0 / ${N}`);
    H.ayuda("Tap left, right, left… at an even beat to pat the arepa flat");
    Object.assign(H.g, {
        tipo: "palmear",
        lado: -1,
        n: 0
    });
    let lado = -1;
    let n = 0;
    let tUlt = null;
    const ints = [];
    const notas = [];
    const marcar = () => {
        zi.setAttribute("opacity", lado < 0 ? .35 : 0);
        zd.setAttribute("opacity", lado > 0 ? .35 : 0);
    };
    marcar();
    s.addEventListener("pointerdown", (e => {
        e.preventDefault();
        if (!H.vivo()) return;
        const [x] = H.aSvg(e);
        const l = x < CX ? -1 : 1;
        const ahora = H.ahora();
        const m = l < 0 ? mi : md;
        m.setAttribute("transform", `translate(${l < 0 ? 104 : 196} ${CY}) scale(${l < 0 ? 1.4 : -1.4} 1.4)`);
        setTimeout((() => m.setAttribute("transform", `translate(${l < 0 ? 64 : 236} ${CY}) scale(${l < 0 ? 1.4 : -1.4} 1.4)`)), 120);
        if (l !== lado) {
            notas.push(1.4);
            grieta.setAttribute("opacity", 1);
            H.sonar("no");
        } else {
            if (tUlt !== null) {
                const d = ahora - tUlt;
                ints.push(d);
                const ref = ints.length > 1 ? ints.slice(0, -1).reduce(((a2, b2) => a2 + b2), 0) / (ints.length - 1) : d;
                const desv = d / ref - 1;
                notas.push(ints.length > 1 ? H.notaDe(desv, TOL, .6) : 3);
                H.sonar(Math.abs(desv) <= TOL ? "tocar" : "no");
            } else H.sonar("tocar");
            tUlt = ahora;
            lado = -lado;
            n++;
            H.g.lado = lado;
            H.g.n = n;
            cuenta.textContent = `${n} / ${N}`;
            const k = n / N;
            masa.setAttribute("rx", (26 + 30 * k).toFixed(1));
            masa.setAttribute("ry", (24 - 9 * k).toFixed(1));
        }
        marcar();
        if (n >= N) H.fin(H.promedio(notas));
    }));
}

function enroscar(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const CX = 150;
    const CY = 104;
    const VUELTAS = 2.4;
    const R0 = 76;
    const R1 = 8;
    const pts = [];
    for (let i = 0; i <= 160; i++) {
        const k = i / 160;
        const a = -Math.PI / 2 + k * VUELTAS * 2 * Math.PI;
        const r = lerp(R0, R1, k);
        pts.push([ CX + r * Math.cos(a), CY + r * Math.sin(a) * .86 ]);
    }
    const TOL = H.ancho(7, .35);
    const camino = hasta => pts.slice(0, hasta + 1).map(((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)).join(" ");
    el(s, "rect", {
        x: 40,
        y: 18,
        width: 220,
        height: 176,
        rx: 10,
        fill: "rgb(214,176,124)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "path", {
        d: camino(160),
        fill: "none",
        stroke: VERDE_O,
        "stroke-width": 3,
        "stroke-dasharray": "5 6",
        opacity: .75
    });
    const borde = el(s, "path", {
        d: "",
        fill: "none",
        stroke: TINTA,
        "stroke-width": 15,
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
    });
    const tira = el(s, "path", {
        d: "",
        fill: "none",
        stroke: H.MASA_R,
        "stroke-width": 10,
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
    });
    const puntos = el(s, "g", {});
    el(s, "circle", {
        cx: pts[0][0],
        cy: pts[0][1],
        r: 9,
        fill: ZONA,
        stroke: VERDE_O,
        "stroke-width": 2.5
    });
    H.ayuda("Start at the green dot and coil the dough along the spiral");
    Object.assign(H.g, {
        tipo: "enroscar",
        pts: pts,
        i: 0
    });
    let i = 0;
    let activo = false;
    const desv = [];
    arrastrar(s, H, {
        abajo: p => {
            activo = Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]) < 30;
        },
        mover: p => {
            if (!activo) return;
            let mej = i;
            let dm = 1e9;
            for (let j = i; j < Math.min(pts.length, i + 14); j++) {
                const d = Math.hypot(p[0] - pts[j][0], p[1] - pts[j][1]);
                if (d < dm) {
                    dm = d;
                    mej = j;
                }
            }
            if (dm > 34) return;
            desv.push(dm);
            if (mej > i) {
                for (let j = i + 1; j <= mej; j++) if (j % 9 === 0) el(puntos, "circle", {
                    cx: pts[j][0].toFixed(1),
                    cy: pts[j][1].toFixed(1),
                    r: 2,
                    fill: "rgb(90,160,70)"
                });
                i = mej;
                H.g.i = i;
                borde.setAttribute("d", camino(i));
                tira.setAttribute("d", camino(i));
            }
            if (i >= pts.length - 3) {
                activo = false;
                const prom = desv.reduce(((a, b) => a + b), 0) / desv.length;
                el(s, "circle", {
                    cx: CX,
                    cy: CY,
                    r: 0,
                    fill: H.MASA_R,
                    stroke: TINTA,
                    "stroke-width": 3
                }).setAttribute("r", 70);
                H.fin(H.notaDe(prom, TOL, 12));
            }
        },
        arriba: () => {
            activo = false;
        }
    });
}

function desgranar(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const N = H.mas(paso.n || 5, 2);
    const az = H.azarDe("desgranar");
    el(s, "ellipse", {
        cx: 150,
        cy: 108,
        rx: 128,
        ry: 80,
        fill: "rgb(60,60,70)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "ellipse", {
        cx: 150,
        cy: 104,
        rx: 116,
        ry: 70,
        fill: "rgb(90,92,104)"
    });
    const sueltos = el(s, "g", {});
    const grumos = [];
    for (let i = 0; i < N; i++) {
        const g = {
            x: 70 + az() * 160,
            y: 66 + az() * 76,
            vx: (az() - .5) * .05,
            vy: (az() - .5) * .04,
            hp: 3,
            e: el(s, "g", {})
        };
        grumos.push(g);
    }
    const dibujar = g => {
        g.e.innerHTML = "";
        if (g.hp <= 0) return;
        const r = 7 + g.hp * 5;
        el(g.e, "circle", {
            cx: 0,
            cy: 0,
            r: r,
            fill: "rgb(250,248,236)",
            stroke: TINTA,
            "stroke-width": 2.5
        });
        for (let j = 0; j < g.hp * 2; j++) el(g.e, "ellipse", {
            cx: Math.cos(j * 2.4) * r * .5,
            cy: Math.sin(j * 2.4) * r * .5,
            rx: 3,
            ry: 1.6,
            fill: "rgb(226,220,200)"
        });
    };
    grumos.forEach(dibujar);
    const cuenta = letrero(H, s, `0 / ${N}`);
    H.ayuda("Tap the rice clumps to break them apart");
    Object.assign(H.g, {
        tipo: "desgranar",
        grumos: []
    });
    let malos = 0;
    let tUlt = 0;
    const vel = H.rapido(.5);
    H.bucle((t => {
        const dt = Math.min(40, t - tUlt);
        tUlt = t;
        H.g.grumos = grumos.filter((g => g.hp > 0)).map((g => ({
            x: g.x,
            y: g.y,
            r: 7 + g.hp * 5
        })));
        for (const g of grumos) {
            if (g.hp <= 0) continue;
            g.x += g.vx * dt * vel;
            g.y += g.vy * dt * vel;
            if (g.x < 50 || g.x > 250) g.vx = -g.vx;
            if (g.y < 50 || g.y > 160) g.vy = -g.vy;
            g.e.setAttribute("transform", `translate(${g.x.toFixed(1)} ${g.y.toFixed(1)})`);
        }
    }));
    s.addEventListener("pointerdown", (e => {
        e.preventDefault();
        if (!H.vivo()) return;
        const [x, y] = H.aSvg(e);
        const g = grumos.find((q => q.hp > 0 && Math.hypot(q.x - x, q.y - y) < 7 + q.hp * 5 + 5));
        if (!g) {
            malos++;
            H.sonar("no");
            return;
        }
        g.hp--;
        H.sonar("tocar");
        for (let j = 0; j < 5; j++) el(sueltos, "ellipse", {
            cx: (g.x + (Math.random() - .5) * 50).toFixed(1),
            cy: (g.y + (Math.random() - .5) * 36).toFixed(1),
            rx: 3,
            ry: 1.6,
            fill: "rgb(250,248,236)"
        });
        dibujar(g);
        g.vx *= 1.25;
        g.vy *= 1.25;
        const listos = grumos.filter((q => q.hp <= 0)).length;
        cuenta.textContent = `${listos} / ${N}`;
        if (listos >= N) H.fin(Math.max(1, 3 - .25 * malos));
    }));
}

function espesar(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const A = .72;
    const B = .86;
    const TOL = H.ancho(.07, .35);
    const MID = (A + B) / 2;
    const CX = 140;
    const CY = 106;
    el(s, "ellipse", {
        cx: CX,
        cy: CY + 4,
        rx: 104,
        ry: 82,
        fill: OLLA,
        stroke: TINTA,
        "stroke-width": 3
    });
    const sopa = el(s, "ellipse", {
        cx: CX,
        cy: CY,
        rx: 92,
        ry: 70,
        fill: "rgb(250,232,150)"
    });
    const pegado = el(s, "g", {
        opacity: 0
    });
    for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        el(pegado, "ellipse", {
            cx: CX + 82 * Math.cos(a),
            cy: CY + 62 * Math.sin(a),
            rx: 9,
            ry: 6,
            fill: "rgb(150,90,40)"
        });
    }
    const papas = [];
    const az = H.azarDe("espesar");
    for (let i = 0; i < 9; i++) papas.push(el(s, "circle", {
        cx: CX - 60 + az() * 120,
        cy: CY - 40 + az() * 80,
        r: 9,
        fill: "rgb(252,240,200)",
        stroke: TINTA,
        "stroke-width": 2
    }));
    const cuchara = el(s, "g", {});
    el(cuchara, "ellipse", {
        cx: 0,
        cy: 0,
        rx: 11,
        ry: 8,
        fill: MADERA,
        stroke: TINTA,
        "stroke-width": 2.5
    });
    el(cuchara, "rect", {
        x: -3,
        y: -60,
        width: 6,
        height: 54,
        rx: 3,
        fill: MADERA,
        stroke: TINTA,
        "stroke-width": 2.5
    });
    cuchara.setAttribute("transform", `translate(${CX + 40} ${CY})`);
    const med = medidor(H, s, {
        x: 262,
        y: 30,
        w: 12,
        h: 150,
        a: A / 1.2,
        b: B / 1.2,
        vertical: true
    });
    H.ayuda("Stir in circles until it thickens · tap Check when it's in the green");
    Object.assign(H.g, {
        tipo: "espesar",
        v: 0,
        a: A,
        b: B,
        cx: CX,
        cy: CY
    });
    let previo = null;
    let v = 0;
    let pega = 0;
    let tMov = 0;
    let tUlt = 0;
    const pintar = () => {
        sopa.setAttribute("fill", mezcla("rgb(250,232,150)", "rgb(232,190,70)", v));
        papas.forEach(((p, i) => p.setAttribute("r", Math.max(0, 9 - v * 9 * (.8 + i % 3 * .2)).toFixed(1))));
        med.poner(v / 1.2);
        pegado.setAttribute("opacity", clamp(pega * 3).toFixed(2));
    };
    H.bucle((t => {
        const dt = Math.min(40, t - tUlt);
        tUlt = t;
        if (v > .15 && H.ahora() - tMov > 500) pega += dt * 12e-5;
        H.g.v = v;
        pintar();
    }));
    arrastrar(s, H, {
        abajo: p => {
            previo = Math.atan2(p[1] - CY, p[0] - CX);
        },
        mover: p => {
            const a = Math.atan2(p[1] - CY, p[0] - CX);
            let d = a - previo;
            if (d > Math.PI) d -= 2 * Math.PI;
            if (d < -Math.PI) d += 2 * Math.PI;
            previo = a;
            cuchara.setAttribute("transform", `translate(${clamp(p[0], 50, 230).toFixed(1)} ${clamp(p[1], 40, 176).toFixed(1)})`);
            if (Math.hypot(p[0] - CX, p[1] - CY) < 18) return;
            if (Math.abs(d) > .01) tMov = H.ahora();
            v = Math.min(1.2, v + Math.abs(d) * .016 * H.rapido(.2));
        }
    });
    H.boton("Check ✓", (() => {
        if (v < .1) return;
        H.fin(H.notaDe(v - MID, (B - A) / 2 + TOL - .07, .3) - Math.min(1, pega * 4));
    }));
}

function remolino(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const N = paso.n || 2;
    const A = .5;
    const B = .72;
    const TOL = H.ancho(.11, .35);
    const MID = (A + B) / 2;
    const CX = 130;
    const CY = 108;
    el(s, "ellipse", {
        cx: CX,
        cy: CY + 4,
        rx: 100,
        ry: 80,
        fill: OLLA,
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "ellipse", {
        cx: CX,
        cy: CY,
        rx: 88,
        ry: 68,
        fill: "rgb(214,170,110)"
    });
    const giro = el(s, "g", {});
    for (let i = 0; i < 4; i++) el(giro, "path", {
        d: `M0 0 Q${30} ${-10} ${60} ${10}`,
        fill: "none",
        stroke: "rgb(236,200,150)",
        "stroke-width": 3,
        "stroke-linecap": "round",
        transform: `rotate(${i * 90})`
    });
    const cintas = el(s, "g", {});
    const bol = el(s, "g", {
        transform: "translate(262 70)"
    });
    el(bol, "path", {
        d: "M-26 -8 Q-24 22 0 24 Q24 22 26 -8 Z",
        fill: "rgb(236,240,246)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(bol, "ellipse", {
        cx: 0,
        cy: -8,
        rx: 26,
        ry: 7,
        fill: "rgb(255,210,70)",
        stroke: TINTA,
        "stroke-width": 2.5
    });
    const med = medidor(H, s, {
        x: 50,
        y: 14,
        w: 160,
        h: 10,
        a: A,
        b: B
    });
    el(s, "text", {
        x: 262,
        y: 112,
        "text-anchor": "middle",
        class: "cocina-cuenta",
        "font-size": 10
    }).textContent = "egg";
    const cuenta = letrero(H, s, `0 / ${N}`, 262, 140);
    H.ayuda("Stir to make a whirlpool · tap the egg bowl when the swirl is in the green");
    Object.assign(H.g, {
        tipo: "remolino",
        w: 0,
        a: A,
        b: B,
        cx: CX,
        cy: CY,
        bol: [ 262, 70 ]
    });
    let previo = null;
    let w = 0;
    let ang = 0;
    let tUlt = 0;
    let n = 0;
    const notas = [];
    H.bucle((t => {
        const dt = Math.min(40, t - tUlt);
        tUlt = t;
        w *= Math.exp(-dt / 1300);
        ang += dt * w * .5;
        H.g.w = w;
        med.poner(w);
        giro.setAttribute("transform", `translate(${CX} ${CY}) rotate(${ang.toFixed(1)}) scale(1 0.78)`);
        cintas.setAttribute("transform", `rotate(${(ang * .6).toFixed(1)} ${CX} ${CY})`);
    }));
    arrastrar(s, H, {
        abajo: p => {
            previo = Math.atan2(p[1] - CY, p[0] - CX);
            if (p[0] > 228) {
                previo = null;
                if (n >= N) return;
                const nota = H.notaDe(w - MID, (B - A) / 2 + TOL - .11, .35);
                notas.push(nota);
                n++;
                cuenta.textContent = `${n} / ${N}`;
                H.sonar(nota >= 2.5 ? "tocar" : "no");
                bol.setAttribute("transform", "translate(250 70) rotate(-35)");
                setTimeout((() => bol.setAttribute("transform", "translate(262 70)")), 350);
                const fino = nota >= 2.5;
                for (let i = 0; i < 6; i++) {
                    const a = i / 6 * Math.PI * 2 + n;
                    const r = 22 + i * 7;
                    el(cintas, "path", {
                        d: `M${(CX + r * Math.cos(a)).toFixed(1)} ${(CY + r * .78 * Math.sin(a)).toFixed(1)} A${r} ${r * .78} 0 0 1 ${(CX + r * Math.cos(a + 1.1)).toFixed(1)} ${(CY + r * .78 * Math.sin(a + 1.1)).toFixed(1)}`,
                        fill: "none",
                        stroke: "rgb(255,220,90)",
                        "stroke-width": fino ? 3 : 8,
                        "stroke-linecap": "round"
                    });
                }
                if (n >= N) setTimeout((() => H.fin(H.promedio(notas))), 400);
            }
        },
        mover: p => {
            if (previo === null) return;
            const a = Math.atan2(p[1] - CY, p[0] - CX);
            let d = a - previo;
            if (d > Math.PI) d -= 2 * Math.PI;
            if (d < -Math.PI) d += 2 * Math.PI;
            previo = a;
            if (Math.hypot(p[0] - CX, p[1] - CY) < 16) return;
            w = Math.min(1, w + Math.abs(d) * .028 * H.rapido(.2));
        }
    });
}

function escurrir(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const NEC = H.mas(6, 2);
    const YC = 104;
    const A = 34;
    const B = 90;
    const MAXV = 120;
    const caidos = el(s, "g", {});
    const col = el(s, "g", {});
    el(col, "path", {
        d: "M-56 -14 Q-50 34 0 36 Q50 34 56 -14 Z",
        fill: METAL,
        stroke: TINTA,
        "stroke-width": 3
    });
    for (let i = 0; i < 6; i++) el(col, "circle", {
        cx: -34 + i * 14,
        cy: 12 + i % 2 * 8,
        r: 2,
        fill: TINTA
    });
    el(col, "rect", {
        x: 54,
        y: -18,
        width: 50,
        height: 8,
        rx: 4,
        fill: METAL,
        stroke: TINTA,
        "stroke-width": 3
    });
    for (let i = 0; i < 5; i++) el(col, "path", {
        d: `M${-40 + i * 18} -14 q6 12 -2 22 q-6 8 4 14`,
        fill: "none",
        stroke: "rgb(250,232,170)",
        "stroke-width": 4,
        "stroke-linecap": "round"
    });
    const agua = el(col, "rect", {
        x: -44,
        y: -10,
        width: 88,
        height: 14,
        fill: "rgb(170,204,224)",
        opacity: .8
    });
    const gotas = el(s, "g", {});
    const med = medidor(H, s, {
        x: 268,
        y: 30,
        w: 14,
        h: 150,
        a: A / MAXV,
        b: B / MAXV,
        vertical: true,
        rojo: 1 - B / MAXV
    });
    el(s, "text", {
        x: 286,
        y: 24,
        "text-anchor": "end",
        "font-size": 7,
        class: "cocina-cuenta"
    }).textContent = "shake";
    const cuenta = letrero(H, s, `0 / ${NEC}`);
    H.ayuda("Drag up and down to shake the colander · each shake big enough to reach the green, not the red");
    Object.assign(H.g, {
        tipo: "escurrir",
        a: A,
        b: B,
        n: 0
    });
    let y = YC;
    let y0 = null;
    let base = YC;
    let dir = 0;
    let ext = YC;
    let tramo = YC;
    let n = 0;
    let caen = 0;
    col.setAttribute("transform", `translate(140 ${YC})`);
    const mostrar = amp => med.poner(amp / MAXV);
    arrastrar(s, H, {
        abajo: p => {
            y0 = p[1];
            base = y;
            dir = 0;
            ext = y;
            tramo = y;
        },
        mover: p => {
            if (y0 === null) return;
            const ny = clamp(base + (p[1] - y0), YC - 70, YC + 70);
            const d = ny - y;
            y = ny;
            col.setAttribute("transform", `translate(140 ${y.toFixed(1)})`);
            if (Math.abs(d) < .3) return;
            const sd = Math.sign(d);
            if (dir === 0) dir = sd;
            if (sd === dir) {
                ext = dir > 0 ? Math.max(ext, y) : Math.min(ext, y);
                mostrar(Math.abs(ext - tramo));
                return;
            }
            if (Math.abs(y - ext) < 5) return;
            const amp = Math.abs(ext - tramo);
            if (amp > B) {
                caen++;
                H.sonar("no");
                el(caidos, "path", {
                    d: `M${110 + caen * 14} 186 q8 -8 16 0`,
                    fill: "none",
                    stroke: "rgb(250,232,170)",
                    "stroke-width": 4,
                    "stroke-linecap": "round"
                });
            } else if (amp >= A) {
                n++;
                H.g.n = n;
                cuenta.textContent = `${Math.min(n, NEC)} / ${NEC}`;
                agua.setAttribute("height", Math.max(0, 14 * (1 - n / NEC)).toFixed(1));
                el(gotas, "circle", {
                    cx: 120 + Math.random() * 40,
                    cy: 170 + Math.random() * 16,
                    r: 3,
                    fill: "rgb(170,204,224)"
                });
                H.sonar("tocar");
                if (n >= NEC) {
                    y0 = null;
                    return H.fin(Math.max(1, 3 - .45 * caen));
                }
            }
            tramo = ext;
            dir = sd;
            ext = y;
        },
        arriba: () => {
            y0 = null;
        }
    });
}

function marcar(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const N = H.mas(paso.n || 4, 1);
    const g = el(s, "g", {});
    H.dibujarPescado(g, 30, 270, 108, 74);
    const guias = [];
    const ANG = -62 * Math.PI / 180;
    for (let i = 0; i < N; i++) {
        const cx = 92 + i * 128 / Math.max(1, N - 1);
        const L = 30;
        const g2 = {
            cx: cx,
            cy: 104,
            x1: cx - L * Math.cos(ANG),
            y1: 104 - L * Math.sin(ANG),
            x2: cx + L * Math.cos(ANG),
            y2: 104 + L * Math.sin(ANG)
        };
        g2.e = el(s, "line", {
            x1: g2.x1,
            y1: g2.y1,
            x2: g2.x2,
            y2: g2.y2,
            stroke: VERDE_O,
            "stroke-width": 3,
            "stroke-dasharray": "5 5"
        });
        guias.push(g2);
    }
    const traz = el(s, "line", {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
        stroke: ROJO,
        "stroke-width": 2,
        opacity: 0
    });
    const cuenta = letrero(H, s, `0 / ${N}`);
    H.ayuda("Swipe along each dashed line to score the fish");
    const TOLA = H.ancho(9, .35);
    const TOLD = H.ancho(6, .35);
    Object.assign(H.g, {
        tipo: "marcar",
        guias: guias.map((({x1: x1, y1: y1, x2: x2, y2: y2}) => ({
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2
        }))),
        n: 0
    });
    const notas = [];
    const hechas = new Set;
    let ini = null;
    arrastrar(s, H, {
        abajo: p => {
            ini = p;
            traz.setAttribute("x1", p[0]);
            traz.setAttribute("y1", p[1]);
        },
        mover: p => {
            if (!ini) return;
            traz.setAttribute("x2", p[0].toFixed(1));
            traz.setAttribute("y2", p[1].toFixed(1));
            traz.setAttribute("opacity", .8);
        },
        arriba: p => {
            traz.setAttribute("opacity", 0);
            if (!ini) return;
            const [x0, y0] = ini;
            ini = null;
            const L = Math.hypot(p[0] - x0, p[1] - y0);
            if (L < 22) return;
            const mx = (p[0] + x0) / 2;
            const my = (p[1] + y0) / 2;
            let mej = -1;
            let dm = 1e9;
            guias.forEach(((gg, i) => {
                if (hechas.has(i)) return;
                const d = Math.hypot(mx - gg.cx, my - gg.cy);
                if (d < dm) {
                    dm = d;
                    mej = i;
                }
            }));
            if (mej < 0 || dm > 40) return H.sonar("no");
            hechas.add(mej);
            const gg = guias[mej];
            let ang = (Math.atan2(p[1] - y0, p[0] - x0) - ANG) * (180 / Math.PI);
            ang = (ang % 180 + 180) % 180;
            if (ang > 90) ang -= 180;
            const ux = Math.cos(ANG);
            const uy = Math.sin(ANG);
            const perp = Math.abs((mx - gg.cx) * uy - (my - gg.cy) * ux);
            const nota = (H.notaDe(ang, TOLA, 25) + H.notaDe(perp, TOLD, 16)) / 2 - (L < 40 ? .4 : 0);
            notas.push(nota);
            gg.e.setAttribute("opacity", 0);
            el(s, "line", {
                x1: x0.toFixed(1),
                y1: y0.toFixed(1),
                x2: p[0].toFixed(1),
                y2: p[1].toFixed(1),
                stroke: "rgb(250,236,226)",
                "stroke-width": 5,
                "stroke-linecap": "round"
            });
            el(s, "line", {
                x1: x0.toFixed(1),
                y1: y0.toFixed(1),
                x2: p[0].toFixed(1),
                y2: p[1].toFixed(1),
                stroke: TINTA,
                "stroke-width": 1.5
            });
            H.sonar(nota >= 2.5 ? "tocar" : "no");
            cuenta.textContent = `${hechas.size} / ${N}`;
            H.g.n = hechas.size;
            if (hechas.size >= N) H.fin(H.promedio(notas));
        }
    });
}

function banar(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const N = H.mas(paso.n || 4, 1);
    const TOL = H.ancho(10, .35);
    const CX = 150;
    const TOPE = 82;
    el(s, "path", {
        d: "M40 112 Q44 190 150 192 Q256 190 260 112 Z",
        fill: "rgb(150,80,56)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const salsa = el(s, "ellipse", {
        cx: 150,
        cy: 150,
        rx: 104,
        ry: 26,
        fill: "rgb(110,40,24)"
    });
    el(s, "ellipse", {
        cx: 150,
        cy: 112,
        rx: 110,
        ry: 16,
        fill: "none",
        stroke: TINTA,
        "stroke-width": 3
    });
    const cerdo = el(s, "g", {});
    const capas = [ [ TOPE, 12, "rgb(176,90,56)" ], [ TOPE + 12, 10, "rgb(252,236,214)" ], [ TOPE + 22, 10, "rgb(214,110,96)" ], [ TOPE + 32, 9, "rgb(252,236,214)" ], [ TOPE + 41, 12, "rgb(200,96,84)" ] ];
    const cs = capas.map((([y, h, c]) => el(cerdo, "rect", {
        x: CX - 34,
        y: y,
        width: 68,
        height: h,
        fill: c
    })));
    el(cerdo, "rect", {
        x: CX - 34,
        y: TOPE,
        width: 68,
        height: 53,
        rx: 4,
        fill: "none",
        stroke: TINTA,
        "stroke-width": 3
    });
    const brillo = el(cerdo, "rect", {
        x: CX - 26,
        y: TOPE + 3,
        width: 30,
        height: 4,
        rx: 2,
        fill: "rgb(255,220,180)",
        opacity: 0
    });
    el(s, "rect", {
        x: CX - 22,
        y: TOPE - 10,
        width: 44,
        height: 8,
        rx: 4,
        fill: ZONA,
        stroke: VERDE_O,
        "stroke-width": 2
    });
    const cucharon = el(s, "g", {});
    el(cucharon, "ellipse", {
        cx: 0,
        cy: 0,
        rx: 16,
        ry: 10,
        fill: METAL,
        stroke: TINTA,
        "stroke-width": 2.5
    });
    const lleno = el(cucharon, "ellipse", {
        cx: 0,
        cy: -1,
        rx: 12,
        ry: 6,
        fill: "rgb(110,40,24)",
        opacity: 0
    });
    el(cucharon, "rect", {
        x: 12,
        y: -42,
        width: 6,
        height: 40,
        rx: 3,
        fill: METAL,
        stroke: TINTA,
        "stroke-width": 2.5,
        transform: "rotate(25)"
    });
    cucharon.setAttribute("transform", "translate(232 60)");
    const chorro = el(s, "rect", {
        x: 0,
        y: 0,
        width: 8,
        height: 0,
        fill: "rgb(110,40,24)",
        opacity: 0
    });
    const cuenta = letrero(H, s, `0 / ${N}`);
    H.ayuda("Dip the ladle in the sauce, drag it up and let go right over the pork");
    Object.assign(H.g, {
        tipo: "banar",
        salsa: [ 150, 160 ],
        meta: [ CX, TOPE - 6 ],
        n: 0
    });
    let carga = false;
    let n = 0;
    const notas = [];
    arrastrar(s, H, {
        abajo: p => {
            carga = p[1] > 136;
            lleno.setAttribute("opacity", carga ? 1 : 0);
            cucharon.setAttribute("transform", `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`);
        },
        mover: p => {
            cucharon.setAttribute("transform", `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`);
        },
        arriba: p => {
            cucharon.setAttribute("transform", "translate(232 60)");
            if (!carga) return;
            carga = false;
            lleno.setAttribute("opacity", 0);
            if (p[1] > 136) return;
            const d = Math.hypot(p[0] - CX, (p[1] - (TOPE - 6)) * 1.4);
            const nota = H.notaDe(d, TOL, 30);
            notas.push(nota);
            n++;
            H.g.n = n;
            cuenta.textContent = `${n} / ${N}`;
            H.sonar(nota >= 2.5 ? "tocar" : "no");
            chorro.setAttribute("x", (p[0] - 4).toFixed(1));
            chorro.setAttribute("y", (p[1] + 6).toFixed(1));
            chorro.setAttribute("height", Math.max(0, 150 - p[1]).toFixed(1));
            chorro.setAttribute("opacity", 1);
            setTimeout((() => chorro.setAttribute("opacity", 0)), 300);
            if (nota >= 2) {
                const k = n / N;
                cs.forEach(((c, i) => c.setAttribute("fill", mezcla(capas[i][2], "rgb(130,50,30)", k * (i === 0 ? .7 : .35)))));
                brillo.setAttribute("opacity", k);
            } else el(s, "ellipse", {
                cx: p[0].toFixed(1),
                cy: 128,
                rx: 10,
                ry: 4,
                fill: "rgb(110,40,24)"
            });
            if (n >= N) H.fin(H.promedio(notas));
        }
    });
    void salsa;
}

function descascarar(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const CX = 150;
    const CY = 108;
    const K = 3.4;
    const N = 5;
    H.dibujarCamaron(s, CX - 10, CY - 6, K);
    const TOL = H.ancho(22, .35);
    const angs = [ 200, 235, 270, 305, 340 ];
    const segs = angs.map(((a, i) => {
        const r = a * Math.PI / 180;
        const x = CX - 10 + 14 * K * Math.cos(r);
        const y = CY - 6 + 14 * K * Math.sin(r);
        const g = el(s, "g", {});
        el(g, "path", {
            d: `M${(x - 13).toFixed(1)} ${(y + 2).toFixed(1)} q13 -14 26 0 q-13 8 -26 0 Z`,
            fill: "rgb(232,190,176)",
            stroke: TINTA,
            "stroke-width": 2.5,
            transform: `rotate(${a + 90} ${x.toFixed(1)} ${y.toFixed(1)})`
        });
        const fl = el(g, "line", {
            x1: x,
            y1: y,
            x2: x + 26 * Math.cos(r),
            y2: y + 26 * Math.sin(r),
            stroke: VERDE_O,
            "stroke-width": 3,
            "stroke-linecap": "round",
            "stroke-dasharray": "4 4",
            opacity: i === 0 ? 1 : 0
        });
        return {
            x: x,
            y: y,
            r: r,
            g: g,
            fl: fl,
            hecho: false
        };
    }));
    const cuenta = letrero(H, s, `0 / ${N}`);
    H.ayuda("Slide each piece of shell off, outward along the arrow");
    Object.assign(H.g, {
        tipo: "descascarar",
        segs: segs.map((({x: x, y: y, r: r}) => ({
            x: x,
            y: y,
            r: r
        }))),
        i: 0
    });
    let i = 0;
    let ini = null;
    const notas = [];
    arrastrar(s, H, {
        abajo: p => {
            ini = Math.hypot(p[0] - segs[i].x, p[1] - segs[i].y) < 30 ? p : null;
        },
        arriba: p => {
            if (!ini) return;
            const dx = p[0] - ini[0];
            const dy = p[1] - ini[1];
            ini = null;
            if (Math.hypot(dx, dy) < 18) return;
            const sg = segs[i];
            let err = (Math.atan2(dy, dx) - sg.r) * (180 / Math.PI);
            err = ((err + 180) % 360 + 360) % 360 - 180;
            const nota = H.notaDe(err, TOL, 45);
            notas.push(nota);
            H.sonar(nota >= 2.5 ? "tocar" : "no");
            sg.g.setAttribute("transform", `translate(${(dx * 2).toFixed(1)} ${(dy * 2).toFixed(1)})`);
            sg.g.setAttribute("opacity", 0);
            i++;
            H.g.i = i;
            cuenta.textContent = `${i} / ${N}`;
            if (i >= N) return H.fin(H.promedio(notas));
            segs[i].fl.setAttribute("opacity", 1);
        }
    });
}

function cono(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const N = paso.n || 2;
    const PX = 150;
    const PY = 168;
    const OBJ = 34;
    const TOL = H.ancho(4.5, .35);
    const ALTO = 120;
    const guia = ap => {
        const a = ap / 2 * (Math.PI / 180);
        return `M${(PX - ALTO * Math.tan(a)).toFixed(1)} ${PY - ALTO} L${PX} ${PY} L${(PX + ALTO * Math.tan(a)).toFixed(1)} ${PY - ALTO}`;
    };
    const hoja = el(s, "path", {
        d: "",
        fill: "rgb(110,160,80)",
        stroke: TINTA,
        "stroke-width": 3,
        "stroke-linejoin": "round"
    });
    const vetas = el(s, "path", {
        d: "",
        fill: "none",
        stroke: "rgb(150,200,110)",
        "stroke-width": 2
    });
    el(s, "path", {
        d: guia(OBJ + TOL * 2),
        fill: "none",
        stroke: "rgb(200,240,170)",
        "stroke-width": 2.5,
        "stroke-dasharray": "5 5"
    });
    el(s, "path", {
        d: guia(OBJ - TOL * 2),
        fill: "none",
        stroke: "rgb(200,240,170)",
        "stroke-width": 2.5,
        "stroke-dasharray": "5 5"
    });
    const listos = el(s, "g", {});
    const cuenta = letrero(H, s, `0 / ${N}`);
    H.ayuda("Drag sideways to curl the leaf into a cone · let go between the green lines");
    let rot = 0;
    let previo = null;
    let n = 0;
    const notas = [];
    const K_ROT = .45;
    const apertura = () => clamp(84 - rot * K_ROT, 6, 84);
    Object.assign(H.g, {
        tipo: "cono",
        px: PX,
        py: PY,
        obj: OBJ,
        ap: apertura(),
        n: 0,
        k: K_ROT
    });
    const pintar = () => {
        const ap = apertura();
        H.g.ap = ap;
        const a = ap / 2 * (Math.PI / 180);
        const xl = PX - ALTO * Math.tan(a);
        const xr = PX + ALTO * Math.tan(a);
        hoja.setAttribute("d", `M${xl.toFixed(1)} ${PY - ALTO} Q${PX} ${PY - ALTO - 14} ${xr.toFixed(1)} ${PY - ALTO} L${PX} ${PY} Z`);
        vetas.setAttribute("d", `M${PX} ${PY - 6} L${PX} ${PY - ALTO + 4} M${PX} ${PY - 10} L${((xl + PX) / 2).toFixed(1)} ${PY - ALTO + 6} M${PX} ${PY - 10} L${((xr + PX) / 2).toFixed(1)} ${PY - ALTO + 6}`);
    };
    pintar();
    arrastrar(s, H, {
        abajo: p => {
            previo = p[0];
        },
        mover: p => {
            rot = Math.abs(p[0] - previo);
            pintar();
        },
        arriba: () => {
            if (rot < 12) return;
            const ap = apertura();
            const nota = H.notaDe(ap - OBJ, TOL, 14);
            notas.push(nota);
            n++;
            H.g.n = n;
            cuenta.textContent = `${n} / ${N}`;
            H.sonar(nota >= 2.5 ? "tocar" : "no");
            el(listos, "path", {
                d: `M${40 + n * 40} 192 L${30 + n * 40} 160 L${50 + n * 40} 160 Z`,
                fill: "rgb(110,160,80)",
                stroke: TINTA,
                "stroke-width": 2
            });
            if (n >= N) return H.fin(H.promedio(notas));
            rot = 0;
            pintar();
        }
    });
}

function soasar(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const NS = 4;
    const A = .75;
    const B = 1;
    const TOL = H.ancho(.13, .35);
    const MID = (A + B) / 2;
    const FX = 150;
    const FW = 50;
    const W = 220;
    const fuego = el(s, "g", {
        "data-sin-px": ""
    });
    const llamas = [ 0, 1, 2 ].map((i => el(fuego, "path", {
        d: `M${FX - 22 + i * 15} 178 Q${FX - 14 + i * 15} 140 ${FX - 6 + i * 15} 178 Z`,
        fill: i === 1 ? "rgb(255,200,70)" : "rgb(240,110,50)",
        stroke: TINTA,
        "stroke-width": 1.5
    })));
    el(s, "rect", {
        x: FX - 40,
        y: 176,
        width: 80,
        height: 14,
        rx: 4,
        fill: OLLA,
        stroke: TINTA,
        "stroke-width": 3
    });
    const hoja = el(s, "g", {});
    const partes = [];
    for (let i = 0; i < NS; i++) partes.push({
        h: 0,
        e: el(hoja, "rect", {
            x: -W / 2 + i * W / NS,
            y: -20,
            width: W / NS,
            height: 40,
            fill: "rgb(96,140,70)"
        })
    });
    el(hoja, "rect", {
        x: -W / 2,
        y: -20,
        width: W,
        height: 40,
        rx: 6,
        fill: "none",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(hoja, "line", {
        x1: -W / 2,
        y1: 0,
        x2: W / 2,
        y2: 0,
        stroke: "rgb(190,220,150)",
        "stroke-width": 2
    });
    const marcas = partes.map(((p, i) => el(s, "rect", {
        x: 0,
        y: 36,
        width: W / NS - 8,
        height: 7,
        rx: 3,
        fill: PAPEL,
        stroke: TINTA,
        "stroke-width": 1.5
    })));
    const barras = partes.map((() => el(s, "rect", {
        x: 0,
        y: 37,
        width: 0,
        height: 5,
        fill: "rgb(120,190,110)"
    })));
    H.ayuda("Drag the leaf over the flame · every part bright green, none burnt · then Done");
    let x = FX;
    let tUlt = 0;
    Object.assign(H.g, {
        tipo: "soasar",
        h: partes.map((() => 0)),
        a: A,
        b: B,
        fx: FX,
        w: W,
        ns: NS,
        x: x
    });
    H.bucle((t => {
        const dt = Math.min(40, t - tUlt);
        tUlt = t;
        partes.forEach(((p, i) => {
            const x0 = x - W / 2 + i * W / NS;
            const x1 = x0 + W / NS;
            const solape = Math.max(0, Math.min(x1, FX + FW / 2) - Math.max(x0, FX - FW / 2)) / FW;
            p.h += dt * solape * 52e-5 * H.rapido(.2);
            H.g.h[i] = p.h;
            p.e.setAttribute("fill", p.h > B + .25 ? "rgb(110,80,40)" : mezcla("rgb(96,140,70)", "rgb(80,190,80)", p.h / A));
            const bx = x - W / 2 + i * W / NS + 4;
            marcas[i].setAttribute("x", bx);
            barras[i].setAttribute("x", bx + 1);
            barras[i].setAttribute("width", (clamp(p.h / 1.4) * (W / NS - 10)).toFixed(1));
            barras[i].setAttribute("fill", p.h > B + .25 ? "rgb(150,100,60)" : p.h >= A ? "rgb(120,190,110)" : "rgb(230,200,120)");
        }));
        llamas.forEach(((l, i) => l.setAttribute("transform", `translate(0 ${(Math.sin(t / 90 + i) * 3).toFixed(1)})`)));
    }));
    hoja.setAttribute("transform", `translate(${x} 110)`);
    arrastrar(s, H, {
        mover: p => {
            x = clamp(p[0], FX - W / 2 + 10, FX + W / 2 - 10);
            H.g.x = x;
            hoja.setAttribute("transform", `translate(${x.toFixed(1)} 110)`);
        }
    });
    H.boton("Done ✓", (() => {
        H.fin(H.promedio(partes.map((p => H.notaDe(p.h - MID, (B - A) / 2 + TOL - .13, .4)))));
    }));
}

function huecos(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const CX = 150;
    const CY = 104;
    const RH = 13;
    const A = .85;
    const B = 1;
    const TOL = H.ancho(.075, .35);
    const MID = (A + B) / 2;
    el(s, "circle", {
        cx: CX,
        cy: CY,
        r: 82,
        fill: "rgb(240,214,200)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "circle", {
        cx: CX,
        cy: CY,
        r: 74,
        fill: "rgb(250,234,222)"
    });
    const hs = [ [ 0, 0 ] ];
    for (let i = 0; i < 6; i++) hs.push([ 44 * Math.cos(i * Math.PI / 3), 44 * Math.sin(i * Math.PI / 3) ]);
    const hoyos = hs.map((([dx, dy]) => {
        const x = CX + dx;
        const y = CY + dy;
        el(s, "circle", {
            cx: x,
            cy: y,
            r: RH,
            fill: "rgb(150,110,100)",
            stroke: TINTA,
            "stroke-width": 2.5
        });
        const arroz = el(s, "circle", {
            cx: x,
            cy: y,
            r: 0,
            fill: "rgb(252,250,244)",
            stroke: "rgb(214,206,190)",
            "stroke-width": 1.5
        });
        const aro = el(s, "circle", {
            cx: x,
            cy: y,
            r: RH * MID,
            fill: "none",
            stroke: VERDE_O,
            "stroke-width": 1.5,
            "stroke-dasharray": "3 3"
        });
        return {
            x: x,
            y: y,
            f: 0,
            listo: false,
            arroz: arroz,
            aro: aro
        };
    }));
    const palillo = el(s, "rect", {
        x: 0,
        y: -60,
        width: 6,
        height: 60,
        rx: 3,
        fill: MADERA,
        stroke: TINTA,
        "stroke-width": 2,
        opacity: 0
    });
    const cuenta = letrero(H, s, `0 / ${hoyos.length}`, 14, 24, "start");
    H.ayuda("Hold on a hole to pack it with rice · let go when the rice reaches the edge");
    Object.assign(H.g, {
        tipo: "huecos",
        hoyos: hoyos.map((({x: x, y: y}) => ({
            x: x,
            y: y
        }))),
        f: 0,
        a: A,
        b: B
    });
    let act = null;
    let tUlt = 0;
    let tA = 0;
    const notas = [];
    H.bucle((t => {
        const dt = Math.min(40, t - tUlt);
        tUlt = t;
        if (act) {
            tA += dt;
            act.f = Math.min(1.3, act.f + dt * 62e-5 * H.rapido(.3) * (.7 + .6 * Math.abs(Math.sin(tA / 140))));
            H.g.f = act.f;
            act.arroz.setAttribute("r", (RH * Math.min(1.15, act.f)).toFixed(1));
            act.arroz.setAttribute("fill", act.f > 1.1 ? "rgb(240,226,200)" : "rgb(252,250,244)");
            palillo.setAttribute("transform", `translate(${act.x - 3} ${(act.y + Math.sin(tA / 70) * 4).toFixed(1)})`);
        }
    }));
    arrastrar(s, H, {
        abajo: p => {
            act = hoyos.find((h => !h.listo && Math.hypot(p[0] - h.x, p[1] - h.y) < RH + 8)) || null;
            tA = 0;
            if (act) {
                palillo.setAttribute("opacity", 1);
                H.g.f = act.f;
            }
        },
        arriba: () => {
            palillo.setAttribute("opacity", 0);
            if (!act) return;
            const h = act;
            act = null;
            if (h.f < .2) return;
            h.listo = true;
            h.aro.setAttribute("opacity", 0);
            const nota = H.notaDe(h.f - MID, (B - A) / 2 + TOL - .075, .35);
            notas.push(nota);
            H.sonar(nota >= 2.5 ? "tocar" : "no");
            const n = hoyos.filter((x => x.listo)).length;
            cuenta.textContent = `${n} / ${hoyos.length}`;
            if (n >= hoyos.length) H.fin(H.promedio(notas));
        }
    });
}

function balanza(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const OBJ = paso.g || 250;
    const MAX = OBJ * 1.6;
    const TOL = H.ancho(OBJ * .035, .35);
    const POLVO = paso.color || "rgb(252,252,248)";
    const nombre = paso.nombre || "starch";
    el(s, "rect", {
        x: 92,
        y: 140,
        width: 116,
        height: 44,
        rx: 8,
        fill: "rgb(236,240,246)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "path", {
        d: "M96 140 L204 140 L196 128 L104 128 Z",
        fill: METAL,
        stroke: TINTA,
        "stroke-width": 3,
        "stroke-linejoin": "round"
    });
    const pantalla = el(s, "rect", {
        x: 118,
        y: 150,
        width: 64,
        height: 24,
        rx: 3,
        fill: "rgb(190,220,170)",
        stroke: TINTA,
        "stroke-width": 2
    });
    const num = el(s, "text", {
        x: 150,
        y: 167,
        "text-anchor": "middle",
        class: "cocina-cuenta",
        "font-size": 14
    });
    num.textContent = "0 g";
    el(s, "path", {
        d: "M108 96 Q112 128 150 128 Q188 128 192 96 Z",
        fill: "rgb(236,226,206)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const monte = el(s, "ellipse", {
        cx: 150,
        cy: 100,
        rx: 0,
        ry: 0,
        fill: POLVO,
        stroke: "rgb(200,196,186)",
        "stroke-width": 1.5
    });
    const saco = el(s, "g", {
        transform: "translate(200 58)"
    });
    el(saco, "rect", {
        x: -20,
        y: -18,
        width: 40,
        height: 40,
        rx: 6,
        fill: "rgb(232,214,180)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(saco, "rect", {
        x: -12,
        y: -6,
        width: 24,
        height: 12,
        rx: 2,
        fill: POLVO,
        stroke: TINTA,
        "stroke-width": 1.5
    });
    const chorro = el(s, "rect", {
        x: 172,
        y: 74,
        width: 7,
        height: 0,
        fill: POLVO,
        stroke: "rgb(200,196,186)",
        "stroke-width": 1
    });
    const med = medidor(H, s, {
        x: 30,
        y: 30,
        w: 14,
        h: 150,
        a: (OBJ - TOL) / MAX,
        b: (OBJ + TOL) / MAX,
        vertical: true
    });
    const cuenta = letrero(H, s, `Add ${OBJ} g of ${nombre}`, 150, 24);
    H.ayuda(`Hold to pour · let go a little early: what's in the air still falls`);
    let on = false;
    let flujo = 0;
    let aire = [];
    let m = 0;
    let tUlt = 0;
    let tOn = 0;
    let cerrado = false;
    Object.assign(H.g, {
        tipo: "balanza",
        m: 0,
        obj: OBJ,
        aire: 0
    });
    H.bucle((t => {
        const dt = Math.min(40, t - tUlt);
        tUlt = t;
        if (on) {
            tOn += dt;
            flujo = OBJ / 2200 * H.rapido(.25) * Math.min(1, tOn / 450);
            aire.push({
                t: t,
                g: flujo * dt
            });
        } else flujo = 0;
        const caen = aire.filter((a => t - a.t >= 280));
        aire = aire.filter((a => t - a.t < 280));
        for (const a of caen) m += a.g;
        H.g.m = m;
        H.g.aire = aire.reduce(((x, a) => x + a.g), 0);
        H.g.flujo = flujo;
        num.textContent = `${Math.round(m)} g`;
        med.poner(m / MAX);
        const k = clamp(m / OBJ, 0, 1.6);
        monte.setAttribute("rx", (8 + 30 * Math.min(1, k)).toFixed(1));
        monte.setAttribute("ry", (3 + 10 * Math.min(1.3, k)).toFixed(1));
        monte.setAttribute("cy", (104 - 6 * k).toFixed(1));
        chorro.setAttribute("height", aire.length ? Math.max(0, 100 - 6 * k - 74).toFixed(1) : 0);
        saco.setAttribute("transform", on ? "translate(192 62) rotate(-35)" : "translate(200 58)");
        pantalla.setAttribute("fill", Math.abs(m - OBJ) <= TOL ? "rgb(170,230,150)" : m > OBJ + TOL ? "rgb(240,180,170)" : "rgb(190,220,170)");
        if (!on && !aire.length && m > OBJ * .2 && !cerrado && H.g.listo) {
            cerrado = true;
            setTimeout((() => H.fin(H.notaDe(m - OBJ, TOL, OBJ * .2))), 350);
        }
    }));
    arrastrar(s, H, {
        abajo: () => {
            on = true;
            tOn = 0;
            H.g.listo = false;
        },
        arriba: () => {
            on = false;
            if (m + H.g.aire > OBJ * .5) H.g.listo = true;
        }
    });
    void cuenta;
}

function huevo(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const N = paso.n || 1;
    const A = .55;
    const B = .75;
    const TOL = H.ancho(.12, .3);
    const MID = (A + B) / 2;
    const P = 1900 / H.rapido(.2);
    const crepe = paso.sobre === "crepe";
    if (crepe) {
        el(s, "circle", {
            cx: 130,
            cy: 120,
            r: 76,
            fill: "rgb(60,60,70)",
            stroke: TINTA,
            "stroke-width": 3
        });
        el(s, "circle", {
            cx: 130,
            cy: 120,
            r: 64,
            fill: "rgb(250,222,150)",
            stroke: "rgb(214,180,110)",
            "stroke-width": 2
        });
    } else {
        el(s, "path", {
            d: "M70 116 Q76 186 130 188 Q184 186 190 116 Z",
            fill: "rgb(236,240,246)",
            stroke: TINTA,
            "stroke-width": 3
        });
        el(s, "ellipse", {
            cx: 130,
            cy: 116,
            rx: 60,
            ry: 12,
            fill: "rgb(214,220,228)",
            stroke: TINTA,
            "stroke-width": 3
        });
    }
    const dentro = el(s, "g", {});
    const cascaras = el(s, "g", {});
    const egg = el(s, "g", {});
    el(egg, "ellipse", {
        cx: 0,
        cy: 0,
        rx: 15,
        ry: 19,
        fill: "rgb(250,240,226)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(egg, "ellipse", {
        cx: -5,
        cy: -7,
        rx: 4,
        ry: 6,
        fill: "rgb(255,252,246)"
    });
    const pos0 = crepe ? "translate(130 40)" : "translate(130 62)";
    egg.setAttribute("transform", pos0);
    const med = medidor(H, s, {
        x: 236,
        y: 30,
        w: 14,
        h: 150,
        a: A,
        b: B,
        vertical: true,
        rojo: .12
    });
    el(s, "text", {
        x: 243,
        y: 22,
        "text-anchor": "middle",
        "font-size": 9,
        class: "cocina-cuenta"
    }).textContent = "force";
    const cuenta = letrero(H, s, `0 / ${N}`, 14, 24, "start");
    H.ayuda("Tap to crack the egg when the force is in the green");
    let n = 0;
    let ocupado = false;
    let tBase = 0;
    const notas = [];
    const fuerza = t => .5 - .5 * Math.cos(2 * Math.PI * (t - tBase) / P);
    Object.assign(H.g, {
        tipo: "huevo",
        P: P,
        tBase: H.t0,
        a: A,
        b: B,
        mid: MID,
        n: 0
    });
    let f = 0;
    H.bucle((t => {
        if (ocupado) return;
        f = fuerza(t);
        med.poner(f);
    }));
    s.addEventListener("pointerdown", (e => {
        e.preventDefault();
        if (!H.vivo() || ocupado) return;
        ocupado = true;
        let nota = H.notaDe(f - MID, (B - A) / 2 + TOL - .1, .35);
        if (f < .3) nota = Math.min(nota, 1.5);
        notas.push(nota);
        H.sonar(f < .3 ? "no" : "grieta");
        egg.setAttribute("transform", crepe ? "translate(130 80) rotate(20)" : "translate(130 96) rotate(20)");
        setTimeout((() => {
            egg.setAttribute("opacity", 0);
            const x = 112 + n * 18;
            const y = crepe ? 118 : 140;
            el(dentro, "ellipse", {
                cx: x,
                cy: y,
                rx: 18,
                ry: 12,
                fill: "rgb(255,252,244)",
                stroke: TINTA,
                "stroke-width": 2
            });
            el(dentro, "circle", {
                cx: x,
                cy: y - 1,
                r: 7,
                fill: f > B + .1 ? "rgb(240,170,60)" : "rgb(255,196,40)",
                stroke: TINTA,
                "stroke-width": 2
            });
            if (f > B + .08) for (let j = 0; j < 3; j++) el(cascaras, "path", {
                d: `M${x - 10 + j * 9} ${y + 4} l4 -5 l4 5 Z`,
                fill: "rgb(250,240,226)",
                stroke: TINTA,
                "stroke-width": 1.2
            });
            n++;
            H.g.n = n;
            cuenta.textContent = `${n} / ${N}`;
            if (n >= N) return H.fin(H.promedio(notas));
            setTimeout((() => {
                egg.setAttribute("transform", pos0);
                egg.setAttribute("opacity", 1);
                tBase = H.ahora() - H.t0;
                H.g.tBase = H.t0 + tBase;
                ocupado = false;
            }), 250);
        }), 260);
    }));
}

function prensar(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const N = paso.n || 2;
    const A = .68;
    const B = .84;
    const TOL = H.ancho(.08, .35);
    const MID = (A + B) / 2;
    const T = 1700 / H.rapido(.25);
    const CX = 130;
    el(s, "rect", {
        x: 70,
        y: 150,
        width: 120,
        height: 30,
        rx: 6,
        fill: MADERA,
        stroke: TINTA,
        "stroke-width": 3
    });
    const masa = el(s, "ellipse", {
        cx: CX,
        cy: 146,
        rx: 30,
        ry: 16,
        fill: H.MASA_R,
        stroke: TINTA,
        "stroke-width": 3
    });
    const sale = el(s, "g", {
        opacity: 0
    });
    el(sale, "ellipse", {
        cx: CX - 46,
        cy: 148,
        rx: 10,
        ry: 5,
        fill: H.MASA_R,
        stroke: TINTA,
        "stroke-width": 2
    });
    el(sale, "ellipse", {
        cx: CX + 46,
        cy: 148,
        rx: 10,
        ry: 5,
        fill: H.MASA_R,
        stroke: TINTA,
        "stroke-width": 2
    });
    const molde = el(s, "g", {});
    el(molde, "rect", {
        x: -40,
        y: -20,
        width: 80,
        height: 34,
        rx: 6,
        fill: MADERA_O,
        stroke: TINTA,
        "stroke-width": 3
    });
    el(molde, "rect", {
        x: -8,
        y: -92,
        width: 16,
        height: 74,
        rx: 5,
        fill: MADERA,
        stroke: TINTA,
        "stroke-width": 3
    });
    el(molde, "rect", {
        x: -24,
        y: -100,
        width: 48,
        height: 14,
        rx: 6,
        fill: MADERA_O,
        stroke: TINTA,
        "stroke-width": 3
    });
    const listos = el(s, "g", {});
    const med = medidor(H, s, {
        x: 236,
        y: 30,
        w: 14,
        h: 150,
        a: A,
        b: B,
        vertical: true,
        rojo: .1
    });
    const cuenta = letrero(H, s, `0 / ${N}`, 14, 24, "start");
    H.ayuda("Hold to press the mold · it gets harder fast · let go in the green");
    let on = false;
    let tOn = 0;
    let p = 0;
    let tUlt = 0;
    let n = 0;
    const notas = [];
    Object.assign(H.g, {
        tipo: "prensar",
        p: 0,
        a: A,
        b: B,
        n: 0
    });
    const pintar = () => {
        H.g.p = p;
        med.poner(p);
        molde.setAttribute("transform", `translate(${CX} ${(118 + 16 * Math.min(1, p)).toFixed(1)})`);
        masa.setAttribute("ry", (16 - 6 * Math.min(1, p)).toFixed(1));
        masa.setAttribute("rx", (30 + 10 * Math.min(1, p)).toFixed(1));
        sale.setAttribute("opacity", p > .95 ? 1 : 0);
    };
    pintar();
    H.bucle((t => {
        const dt = Math.min(40, t - tUlt);
        tUlt = t;
        if (on) {
            tOn += dt;
            p = Math.min(1.1, Math.pow(tOn / T, 1.7));
            H.g.p = p;
            pintar();
        }
    }));
    arrastrar(s, H, {
        abajo: () => {
            on = true;
            tOn = 0;
        },
        arriba: () => {
            on = false;
            if (p < .15) {
                p = 0;
                return pintar();
            }
            const nota = H.notaDe(p - MID, (B - A) / 2 + TOL - .08, .3);
            notas.push(nota);
            n++;
            H.g.n = n;
            cuenta.textContent = `${n} / ${N}`;
            H.sonar(nota >= 2.5 ? "tocar" : "no");
            const x = 40 + n * 36;
            el(listos, "circle", {
                cx: x,
                cy: 40,
                r: 15,
                fill: "rgb(214,150,80)",
                stroke: TINTA,
                "stroke-width": 2.5
            });
            el(listos, "circle", {
                cx: x,
                cy: 40,
                r: 8,
                fill: "none",
                stroke: "rgb(170,110,50)",
                "stroke-width": nota >= 2.5 ? 2 : 1,
                opacity: clamp((nota - 1) / 2)
            });
            if (n >= N) return H.fin(H.promedio(notas));
            p = 0;
            pintar();
        }
    });
}

function picar(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const DUR = 5e3;
    const A = 2.5;
    const B = 4.3;
    el(s, "rect", {
        x: 40,
        y: 92,
        width: 220,
        height: 94,
        rx: 8,
        fill: "rgb(214,176,124)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const trozos = [];
    for (let i = 0; i < 10; i++) trozos.push(el(s, "rect", {
        x: 112 + i % 5 * 16,
        y: 124 + Math.floor(i / 5) * 18,
        width: 14,
        height: 14,
        rx: 3,
        fill: "rgb(196,80,70)",
        stroke: TINTA,
        "stroke-width": 2
    }));
    const zi = el(s, "rect", {
        x: 8,
        y: 40,
        width: 128,
        height: 150,
        rx: 14,
        fill: ZONA,
        opacity: .3
    });
    const zd = el(s, "rect", {
        x: 164,
        y: 40,
        width: 128,
        height: 150,
        rx: 14,
        fill: ZONA,
        opacity: 0
    });
    const cuchi = [ 118, 182 ].map((x => {
        const g = el(s, "g", {
            transform: `translate(${x} 96)`
        });
        el(g, "rect", {
            x: -18,
            y: -40,
            width: 36,
            height: 36,
            rx: 3,
            fill: METAL,
            stroke: TINTA,
            "stroke-width": 2.5
        });
        el(g, "rect", {
            x: -5,
            y: -64,
            width: 10,
            height: 26,
            rx: 4,
            fill: MADERA_O,
            stroke: TINTA,
            "stroke-width": 2.5
        });
        return {
            g: g,
            x: x
        };
    }));
    const med = medidor(H, s, {
        x: 70,
        y: 16,
        w: 160,
        h: 10,
        a: A / 6,
        b: B / 6
    });
    const prog = medidor(H, s, {
        x: 278,
        y: 40,
        w: 10,
        h: 140,
        vertical: true
    });
    H.ayuda("Chop left, right, left… keep the speed in the green until the bar fills");
    Object.assign(H.g, {
        tipo: "picar",
        lado: -1,
        a: A,
        b: B
    });
    let lado = -1;
    let tUlt = null;
    let ritmo = 0;
    let empezo = false;
    let total = 0;
    let dentro = 0;
    let malos = 0;
    let tB = 0;
    H.bucle((t => {
        const dt = Math.min(40, t - tB);
        tB = t;
        if (!empezo) return;
        const quieto = H.ahora() - tUlt > 700;
        const r = quieto ? 0 : ritmo;
        total += dt;
        if (r >= A && r <= B) dentro += dt;
        med.poner(r / 6);
        const p = clamp(total / DUR);
        prog.poner(p);
        trozos.forEach(((q, i) => {
            const w = 14 * (1 - .6 * p);
            q.setAttribute("width", w.toFixed(1));
            q.setAttribute("height", w.toFixed(1));
            q.setAttribute("x", (112 + i % 5 * 16 * (1 - .3 * p)).toFixed(1));
        }));
        if (p >= 1) H.fin(1 + 2 * Math.pow(clamp(dentro / total / .88), 1.4) - .15 * malos);
    }));
    s.addEventListener("pointerdown", (e => {
        e.preventDefault();
        if (!H.vivo()) return;
        const [x] = H.aSvg(e);
        const l = x < 150 ? -1 : 1;
        const c = cuchi[l < 0 ? 0 : 1];
        c.g.setAttribute("transform", `translate(${c.x} 118)`);
        setTimeout((() => c.g.setAttribute("transform", `translate(${c.x} 96)`)), 90);
        if (l !== lado) {
            malos++;
            H.sonar("no");
            return;
        }
        const ahora = H.ahora();
        if (tUlt !== null) {
            const inst = 1e3 / Math.max(1, ahora - tUlt);
            ritmo = ritmo ? .6 * ritmo + .4 * inst : inst;
        }
        tUlt = ahora;
        empezo = true;
        H.sonar("tecla");
        lado = -lado;
        H.g.lado = lado;
        zi.setAttribute("opacity", lado < 0 ? .3 : 0);
        zd.setAttribute("opacity", lado > 0 ? .3 : 0);
    }));
}

function espumar(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const N = H.mas(paso.n || 7, 2);
    const VIDA = 2700 / H.rapido(.25);
    const CADA = 950 / H.rapido(.2);
    const CX = 150;
    const CY = 108;
    el(s, "ellipse", {
        cx: CX,
        cy: CY + 4,
        rx: 120,
        ry: 82,
        fill: OLLA,
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "ellipse", {
        cx: CX,
        cy: CY,
        rx: 108,
        ry: 70,
        fill: "rgb(196,150,96)"
    });
    const az = H.azarDe("espumar");
    const esp = [];
    for (let i = 0; i < N; i++) {
        const a = az() * Math.PI * 2;
        const r = Math.sqrt(az()) * .75;
        esp.push({
            x: CX + 100 * r * Math.cos(a),
            y: CY + 62 * r * Math.sin(a),
            t0: 600 + i * CADA,
            e: null,
            hecho: false
        });
    }
    const cuchara = el(s, "g", {
        opacity: 0
    });
    el(cuchara, "ellipse", {
        cx: 0,
        cy: 0,
        rx: 15,
        ry: 10,
        fill: METAL,
        stroke: TINTA,
        "stroke-width": 2.5
    });
    el(cuchara, "rect", {
        x: 10,
        y: -44,
        width: 6,
        height: 40,
        rx: 3,
        fill: METAL,
        stroke: TINTA,
        "stroke-width": 2.5,
        transform: "rotate(25)"
    });
    const cuenta = letrero(H, s, `0 / ${N}`);
    H.ayuda("Tap the grey foam to skim it off before it sinks");
    Object.assign(H.g, {
        tipo: "espumar",
        espumas: []
    });
    let buenos = 0;
    let sueltos = 0;
    const cerrar = () => {
        const n = esp.filter((q => q.hecho)).length;
        cuenta.textContent = `${buenos} / ${N}`;
        if (n >= N) H.fin(1 + 2 * Math.pow(buenos / N, 1.6) - .1 * sueltos);
    };
    H.bucle((t => {
        const vivas = [];
        for (const q of esp) {
            if (q.hecho) continue;
            const edad = t - q.t0;
            if (edad < 0) continue;
            if (!q.e) {
                q.e = el(s, "g", {
                    transform: `translate(${q.x.toFixed(1)} ${q.y.toFixed(1)})`
                });
                for (const [dx, dy, r] of [ [ 0, 0, 9 ], [ -8, 3, 6 ], [ 8, 2, 6 ], [ 2, -6, 5 ] ]) el(q.e, "circle", {
                    cx: dx,
                    cy: dy,
                    r: r,
                    fill: "rgb(176,170,160)",
                    stroke: "rgb(120,114,106)",
                    "stroke-width": 1.5
                });
            }
            if (edad > VIDA) {
                q.hecho = true;
                q.e.remove();
                H.sonar("no");
                cerrar();
                continue;
            }
            q.e.setAttribute("opacity", (1 - .6 * (edad / VIDA)).toFixed(2));
            vivas.push({
                x: q.x,
                y: q.y
            });
        }
        H.g.espumas = vivas;
    }));
    s.addEventListener("pointerdown", (e => {
        e.preventDefault();
        if (!H.vivo()) return;
        const [x, y] = H.aSvg(e);
        cuchara.setAttribute("opacity", 1);
        cuchara.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
        setTimeout((() => cuchara.setAttribute("opacity", 0)), 220);
        const q = esp.find((z => z.e && !z.hecho && Math.hypot(z.x - x, z.y - y) < 20));
        if (!q) {
            sueltos++;
            return H.sonar("no");
        }
        q.hecho = true;
        q.e.remove();
        buenos++;
        H.sonar("tocar");
        cerrar();
    }));
}

function sacudir(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const META = 24;
    const CX = 150;
    const MIN = 34;
    const MAX = 88;
    el(s, "ellipse", {
        cx: CX,
        cy: 176,
        rx: 120,
        ry: 16,
        fill: "rgb(236,226,206)",
        stroke: TINTA,
        "stroke-width": 2.5
    });
    const caidas = el(s, "g", {});
    el(s, "rect", {
        x: CX - 9,
        y: 92,
        width: 18,
        height: 76,
        rx: 4,
        fill: "rgb(120,80,50)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const copa = el(s, "g", {});
    for (const [dx, dy, r] of [ [ 0, -20, 46 ], [ -40, 6, 32 ], [ 40, 6, 32 ], [ -20, 20, 30 ], [ 22, 22, 30 ] ]) el(copa, "circle", {
        cx: dx,
        cy: dy,
        r: r,
        fill: "rgb(80,130,70)",
        stroke: TINTA,
        "stroke-width": 2.5
    });
    const az = H.azarDe("sacudir");
    for (let i = 0; i < 22; i++) el(copa, "circle", {
        cx: (az() - .5) * 120,
        cy: (az() - .5) * 70,
        r: 3,
        fill: "rgb(250,180,60)"
    });
    copa.setAttribute("transform", `translate(${CX} 70)`);
    for (const s2 of [ -1, 1 ]) {
        el(s, "rect", {
            x: CX + s2 * MIN / 2 - (s2 < 0 ? (MAX - MIN) / 2 : 0),
            y: 6,
            width: (MAX - MIN) / 2,
            height: 8,
            fill: ZONA
        });
        el(s, "line", {
            x1: CX + s2 * MAX / 2,
            y1: 2,
            x2: CX + s2 * MAX / 2,
            y2: 18,
            stroke: ROJO,
            "stroke-width": 3
        });
    }
    const cuenta = letrero(H, s, `0 / ${META}`, 14, 30, "start");
    H.ayuda("Drag the tree left and right to shake the flowers down · not past the red");
    Object.assign(H.g, {
        tipo: "sacudir",
        cx: CX,
        min: MIN,
        max: MAX
    });
    let x0 = null;
    let off = 0;
    let dir = 0;
    let ext = 0;
    let tramo = 0;
    let flores = 0;
    let fuertes = 0;
    const caer = (n, hoja) => {
        for (let i = 0; i < n; i++) {
            const x = CX + (Math.random() - .5) * 210;
            const y = 168 + Math.random() * 16;
            if (hoja) el(caidas, "ellipse", {
                cx: x.toFixed(1),
                cy: y.toFixed(1),
                rx: 6,
                ry: 3,
                fill: "rgb(70,110,60)"
            }); else el(caidas, "circle", {
                cx: x.toFixed(1),
                cy: y.toFixed(1),
                r: 2.5,
                fill: "rgb(250,180,60)"
            });
        }
    };
    arrastrar(s, H, {
        abajo: p => {
            x0 = p[0] - off;
        },
        mover: p => {
            if (x0 === null) return;
            const n = clamp(p[0] - x0, -60, 60);
            const d = n - off;
            off = n;
            copa.setAttribute("transform", `translate(${(CX + off).toFixed(1)} 70) rotate(${(off / 6).toFixed(1)})`);
            if (Math.abs(d) < .5) return;
            const sd = Math.sign(d);
            if (!dir) dir = sd;
            if (sd === dir) ext = dir > 0 ? Math.max(ext, off) : Math.min(ext, off); else if (Math.abs(off - ext) > 6) {
                const amp = Math.abs(ext - tramo);
                if (amp > MAX) {
                    fuertes++;
                    caer(2, true);
                    caer(1, false);
                    flores += 1;
                    H.sonar("no");
                } else if (amp >= MIN) {
                    caer(3, false);
                    flores += 3;
                    H.sonar("tocar");
                }
                cuenta.textContent = `${Math.min(flores, META)} / ${META}`;
                tramo = ext;
                dir = sd;
                ext = off;
                if (flores >= META) {
                    x0 = null;
                    H.fin(Math.max(1, 3 - .3 * fuertes));
                }
            }
        },
        arriba: () => {
            x0 = null;
        }
    });
}

function limpiar(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    el(s, "rect", {
        x: 30,
        y: 30,
        width: 240,
        height: 156,
        rx: 10,
        fill: "rgb(240,232,214)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const az = H.azarDe("limpiar");
    for (let i = 0; i < 38; i++) {
        const x = 46 + az() * 208;
        const y = 46 + az() * 124;
        const g = el(s, "g", {
            transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})`
        });
        for (let k = 0; k < 4; k++) el(g, "circle", {
            cx: 3 * Math.cos(k * Math.PI / 2),
            cy: 3 * Math.sin(k * Math.PI / 2),
            r: 2.6,
            fill: "rgb(250,176,56)"
        });
    }
    const N = H.mas(paso.n || 6, 2);
    const bits = [];
    for (let i = 0; i < N; i++) {
        const x = 56 + az() * 188;
        const y = 56 + az() * 112;
        const g = el(s, "g", {
            transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${Math.round(az() * 180)})`
        });
        if (i % 2) el(g, "ellipse", {
            cx: 0,
            cy: 0,
            rx: 8,
            ry: 4,
            fill: "rgb(70,110,60)",
            stroke: TINTA,
            "stroke-width": 1.5
        }); else el(g, "rect", {
            x: -9,
            y: -1.5,
            width: 18,
            height: 3,
            rx: 1.5,
            fill: "rgb(120,80,50)",
            stroke: TINTA,
            "stroke-width": 1
        });
        bits.push({
            x: x,
            y: y,
            g: g,
            hecho: false
        });
    }
    const cuenta = letrero(H, s, `0 / ${N}`, 150, 22);
    H.ayuda("Pick out the little leaves and twigs · don't touch the flowers");
    Object.assign(H.g, {
        tipo: "limpiar",
        bits: bits.map((({x: x, y: y}) => ({
            x: x,
            y: y
        })))
    });
    let malos = 0;
    s.addEventListener("pointerdown", (e => {
        e.preventDefault();
        if (!H.vivo()) return;
        const [x, y] = H.aSvg(e);
        const b = bits.find((q => !q.hecho && Math.hypot(q.x - x, q.y - y) < 13));
        if (!b) {
            malos++;
            return H.sonar("no");
        }
        b.hecho = true;
        b.g.remove();
        H.sonar("tocar");
        const n = bits.filter((q => q.hecho)).length;
        cuenta.textContent = `${n} / ${N}`;
        H.g.bits = bits.filter((q => !q.hecho)).map((({x: bx, y: by}) => ({
            x: bx,
            y: by
        })));
        if (n >= N) H.fin(Math.max(1, 3 - .3 * malos));
    }));
}

function brotes(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    el(s, "ellipse", {
        cx: 150,
        cy: 150,
        rx: 140,
        ry: 56,
        fill: "rgb(70,120,60)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "ellipse", {
        cx: 150,
        cy: 140,
        rx: 120,
        ry: 40,
        fill: "rgb(90,146,72)"
    });
    const cesta = el(s, "g", {
        transform: "translate(262 40)"
    });
    el(cesta, "path", {
        d: "M-24 -10 L24 -10 L18 18 L-18 18 Z",
        fill: MADERA,
        stroke: TINTA,
        "stroke-width": 2.5
    });
    const az = H.azarDe("brotes");
    const pos = [ [ 52, 118 ], [ 82, 104 ], [ 112, 96 ], [ 142, 92 ], [ 172, 96 ], [ 202, 102 ], [ 232, 114 ], [ 96, 132 ], [ 190, 132 ], [ 140, 124 ] ];
    const buenos = [ 0, 2, 3, 5, 7, 9 ];
    const brs = pos.map((([x, y], i) => {
        const bueno = buenos.includes(i);
        const g = el(s, "g", {});
        el(g, "line", {
            x1: 0,
            y1: 0,
            x2: 0,
            y2: -22,
            stroke: "rgb(80,110,50)",
            "stroke-width": 2.5
        });
        if (bueno) {
            el(g, "ellipse", {
                cx: 0,
                cy: -26,
                rx: 3,
                ry: 7,
                fill: "rgb(196,230,140)",
                stroke: TINTA,
                "stroke-width": 1.5
            });
            el(g, "ellipse", {
                cx: 7,
                cy: -16,
                rx: 7,
                ry: 3.5,
                fill: "rgb(150,206,110)",
                stroke: TINTA,
                "stroke-width": 1.5,
                transform: "rotate(-30 7 -16)"
            });
        } else {
            el(g, "ellipse", {
                cx: -8,
                cy: -20,
                rx: 12,
                ry: 6,
                fill: "rgb(50,96,46)",
                stroke: TINTA,
                "stroke-width": 1.5,
                transform: "rotate(30 -8 -20)"
            });
            el(g, "ellipse", {
                cx: 8,
                cy: -24,
                rx: 12,
                ry: 6,
                fill: "rgb(50,96,46)",
                stroke: TINTA,
                "stroke-width": 1.5,
                transform: "rotate(-30 8 -24)"
            });
        }
        return {
            x: x,
            y: y,
            bueno: bueno,
            g: g,
            fase: az() * 6,
            hecho: false
        };
    }));
    const N = buenos.length;
    const cuenta = letrero(H, s, `0 / ${N}`, 14, 24, "start");
    H.ayuda("Pick only the tender tips (one bud + one leaf): swipe up on them");
    Object.assign(H.g, {
        tipo: "brotes",
        brotes: brs.map((({x: x, y: y, bueno: bueno}) => ({
            x: x,
            y: y - 18,
            bueno: bueno
        })))
    });
    H.bucle((t => {
        for (const b of brs) if (!b.hecho) b.g.setAttribute("transform", `translate(${b.x} ${b.y}) rotate(${(Math.sin(t / 500 + b.fase) * 6).toFixed(1)})`);
    }));
    let ini = null;
    let n = 0;
    let malos = 0;
    arrastrar(s, H, {
        abajo: p => {
            ini = p;
        },
        arriba: p => {
            if (!ini) return;
            const [x0, y0] = ini;
            ini = null;
            if (y0 - p[1] < 16) return;
            const b = brs.find((q => !q.hecho && Math.abs(q.x - x0) < 16 && y0 > q.y - 40 && y0 < q.y + 8));
            if (!b) return;
            b.hecho = true;
            b.g.setAttribute("transform", `translate(${b.x} ${b.y - 60})`);
            b.g.setAttribute("opacity", 0);
            if (b.bueno) {
                n++;
                H.sonar("tocar");
            } else {
                malos++;
                H.sonar("no");
            }
            cuenta.textContent = `${n} / ${N}`;
            if (n >= N) H.fin(Math.max(1, 3 - .35 * malos));
        }
    });
}

function red(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const CX = 140;
    const CY = 108;
    const RN = 26;
    const TOL = H.ancho(9, .35);
    el(s, "ellipse", {
        cx: CX,
        cy: CY + 4,
        rx: 124,
        ry: 80,
        fill: "rgb(120,124,136)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "ellipse", {
        cx: CX,
        cy: CY,
        rx: 112,
        ry: 68,
        fill: "rgb(150,196,214)"
    });
    const pez = el(s, "g", {});
    el(pez, "ellipse", {
        cx: 0,
        cy: 0,
        rx: 22,
        ry: 9,
        fill: "rgb(150,150,140)",
        stroke: TINTA,
        "stroke-width": 2.5
    });
    el(pez, "path", {
        d: "M-20 0 L-32 -8 L-32 8 Z",
        fill: "rgb(130,130,120)",
        stroke: TINTA,
        "stroke-width": 2
    });
    el(pez, "circle", {
        cx: 13,
        cy: -2,
        r: 2,
        fill: TINTA
    });
    const malla = el(s, "g", {
        opacity: 0
    });
    el(malla, "circle", {
        cx: 0,
        cy: 0,
        r: RN,
        fill: "rgba(250,250,250,0.25)",
        stroke: "rgb(60,60,70)",
        "stroke-width": 3,
        "stroke-dasharray": "4 3"
    });
    el(malla, "rect", {
        x: RN - 2,
        y: -3,
        width: 50,
        height: 6,
        rx: 3,
        fill: MADERA,
        stroke: TINTA,
        "stroke-width": 2
    });
    const cuenta = letrero(H, s, "Catch the fish!", 150, 22);
    H.ayuda("Hold to lower the net where the fish will be · let go right on top of it");
    const az = H.azarDe("red");
    const f1 = .0011 * H.rapido(.3);
    const f2 = .0017 * H.rapido(.3);
    const ph = az() * 6;
    let fx = CX;
    let fy = CY;
    let fallos = 0;
    Object.assign(H.g, {
        tipo: "red",
        fx: fx,
        fy: fy,
        vx: 0,
        vy: 0,
        rn: RN
    });
    H.bucle((t => {
        const nx = CX + 82 * Math.sin(t * f1 + ph);
        const ny = CY + 44 * Math.sin(t * f2);
        const ang = Math.atan2(ny - fy, nx - fx);
        fx = nx;
        fy = ny;
        H.g.fx = fx;
        H.g.fy = fy;
        H.g.vx = 82 * f1 * Math.cos(t * f1 + ph);
        H.g.vy = 44 * f2 * Math.cos(t * f2);
        pez.setAttribute("transform", `translate(${fx.toFixed(1)} ${fy.toFixed(1)}) rotate(${(ang * 180 / Math.PI).toFixed(0)})`);
    }));
    arrastrar(s, H, {
        abajo: p => {
            malla.setAttribute("opacity", 1);
            malla.setAttribute("transform", `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`);
        },
        mover: p => malla.setAttribute("transform", `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`),
        arriba: p => {
            const d = Math.hypot(p[0] - fx, p[1] - fy);
            if (d <= RN) {
                malla.setAttribute("opacity", 0);
                H.sonar("atrapar");
                return H.fin(H.notaDe(d, TOL, 20) - .35 * fallos);
            }
            fallos++;
            H.sonar("no");
            cuenta.textContent = fallos >= 3 ? "Got it… at last" : "Missed! Try again";
            setTimeout((() => malla.setAttribute("opacity", 0)), 250);
            if (fallos >= 4) H.fin(1.2);
        }
    });
}

function palillo(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const T = 6500 / H.rapido(.2);
    const A = .85;
    const B = 1.08;
    const TOL = H.ancho(.11, .35);
    el(s, "ellipse", {
        cx: 150,
        cy: 120,
        rx: 132,
        ry: 66,
        fill: "rgb(60,60,70)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "ellipse", {
        cx: 150,
        cy: 116,
        rx: 120,
        ry: 56,
        fill: "rgb(196,216,222)"
    });
    const g = el(s, "g", {});
    H.dibujarPescado(g, 50, 250, 116, 56);
    const carne = el(s, "ellipse", {
        cx: 140,
        cy: 116,
        rx: 70,
        ry: 14,
        fill: "rgb(214,190,186)",
        opacity: .85
    });
    const ojo = el(s, "circle", {
        cx: 70,
        cy: 108,
        r: 5,
        fill: TINTA
    });
    const burb = el(s, "g", {});
    const bs = [ 0, 1, 2, 3 ].map((i => el(burb, "circle", {
        cx: 50 + i * 60,
        cy: 150,
        r: 2.5,
        fill: "rgb(240,250,252)",
        stroke: "rgb(150,180,190)",
        "stroke-width": 1
    })));
    const palo = el(s, "g", {
        opacity: 0
    });
    el(palo, "rect", {
        x: -3,
        y: -90,
        width: 6,
        height: 90,
        rx: 2,
        fill: MADERA,
        stroke: TINTA,
        "stroke-width": 2
    });
    const aviso = letrero(H, s, "", 150, 24);
    H.ayuda("Poke the thickest part with the chopstick · serve when it slides in softly");
    let c = 0;
    let pinchazos = 0;
    Object.assign(H.g, {
        tipo: "palillo",
        c: 0,
        a: A,
        b: B
    });
    H.bucle((t => {
        c = t / T;
        H.g.c = c;
        carne.setAttribute("fill", mezcla("rgb(214,190,186)", "rgb(252,250,246)", c / A));
        ojo.setAttribute("fill", c > .7 ? "rgb(240,240,236)" : TINTA);
        bs.forEach(((b, i) => b.setAttribute("cy", (150 - (t / 40 + i * 13) % 30).toFixed(1))));
        if (c > 1.45) H.fin(1.2);
    }));
    s.addEventListener("pointerdown", (e => {
        e.preventDefault();
        if (!H.vivo()) return;
        const prof = clamp(c / A);
        palo.setAttribute("opacity", 1);
        palo.setAttribute("transform", `translate(140 ${(100 + 30 * prof).toFixed(1)})`);
        setTimeout((() => palo.setAttribute("opacity", 0)), 450);
        if (c < A - .04) {
            pinchazos++;
            aviso.textContent = c < A * .6 ? "Still raw…" : "Almost…";
            H.sonar("no");
            return;
        }
        H.sonar("tocar");
        H.fin(H.notaDe(c - (A + B) / 2, (B - A) / 2 + TOL - .11, .3) - .12 * Math.max(0, pinchazos - 2));
    }));
}

function aceiteTibio(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const N = H.mas(paso.n || 5, 1);
    const TOL = H.ancho(260, .35);
    el(s, "ellipse", {
        cx: 150,
        cy: 112,
        rx: 130,
        ry: 76,
        fill: "rgb(60,60,70)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "ellipse", {
        cx: 150,
        cy: 108,
        rx: 116,
        ry: 64,
        fill: "rgb(236,200,110)"
    });
    const az = H.azarDe("aceite_tibio");
    const cams = [];
    for (let i = 0; i < N; i++) {
        const x = 70 + i * 160 / Math.max(1, N - 1);
        const y = 96 + i % 2 * 26;
        const g = el(s, "g", {
            transform: `translate(${x} ${y})`
        });
        const cuerpo = el(g, "path", {
            d: "M10 -5 A10 10 0 1 0 4 9",
            fill: "none",
            stroke: "rgb(150,150,156)",
            "stroke-width": 8,
            "stroke-linecap": "round"
        });
        cams.push({
            x: x,
            y: y,
            g: g,
            cuerpo: cuerpo,
            listo: (1600 + az() * 2600 + i * 500) / H.rapido(.2),
            hecho: false
        });
    }
    const cuenta = letrero(H, s, `0 / ${N}`);
    H.ayuda("Each shrimp turns white when it's ready · tap it right then to take it out");
    Object.assign(H.g, {
        tipo: "aceite_tibio",
        cams: []
    });
    const notas = [];
    let tA = 0;
    H.bucle((t => {
        tA = t;
        const vivos = [];
        for (const c of cams) {
            if (c.hecho) continue;
            const k = t / c.listo;
            c.cuerpo.setAttribute("stroke", k < 1 ? mezcla("rgb(150,150,156)", "rgb(236,236,230)", k * k) : mezcla("rgb(250,246,240)", "rgb(240,140,100)", (k - 1) * 2.5));
            vivos.push({
                x: c.x,
                y: c.y,
                listo: c.listo
            });
            if (k > 1.9) {
                c.hecho = true;
                notas.push(1);
                c.g.setAttribute("opacity", .4);
                H.sonar("no");
            }
        }
        H.g.cams = vivos;
        H.g.t = t;
        if (notas.length >= N) H.fin(H.promedio(notas));
    }));
    s.addEventListener("pointerdown", (e => {
        e.preventDefault();
        if (!H.vivo()) return;
        const [x, y] = H.aSvg(e);
        const c = cams.find((q => !q.hecho && Math.hypot(q.x - x, q.y - y) < 22));
        if (!c) return;
        c.hecho = true;
        const nota = H.notaDe(tA - c.listo - 150, TOL, 900);
        notas.push(nota);
        c.g.setAttribute("transform", `translate(${c.x} 30)`);
        H.sonar(nota >= 2.5 ? "tocar" : "no");
        cuenta.textContent = `${notas.length} / ${N}`;
    }));
}

function raspar(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    el(s, "rect", {
        x: 40,
        y: 50,
        width: 220,
        height: 120,
        rx: 8,
        fill: "rgb(214,110,96)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "rect", {
        x: 40,
        y: 50,
        width: 220,
        height: 34,
        rx: 8,
        fill: "rgb(240,200,170)",
        stroke: TINTA,
        "stroke-width": 3
    });
    for (let i = 0; i < 3; i++) el(s, "rect", {
        x: 44,
        y: 96 + i * 24,
        width: 212,
        height: 8,
        fill: "rgb(252,236,214)"
    });
    const az = H.azarDe("raspar");
    const pelos = [];
    for (let i = 0; i < 26; i++) {
        const x = 52 + az() * 196;
        const y = 56 + az() * 22;
        pelos.push({
            x: x,
            y: y,
            e: el(s, "line", {
                x1: x,
                y1: y,
                x2: x + 2,
                y2: y - 7,
                stroke: "rgb(60,40,30)",
                "stroke-width": 1.5
            }),
            hecho: false
        });
    }
    const hoja = el(s, "rect", {
        x: -20,
        y: -6,
        width: 40,
        height: 12,
        rx: 2,
        fill: METAL,
        stroke: TINTA,
        "stroke-width": 2,
        opacity: 0
    });
    const cuenta = letrero(H, s, "", 150, 24);
    H.ayuda("Scrape the skin clean: long swipes along the top");
    Object.assign(H.g, {
        tipo: "raspar",
        y: 67
    });
    let pasadas = 0;
    let toco = 0;
    arrastrar(s, H, {
        abajo: p => {
            toco = 0;
            hoja.setAttribute("opacity", 1);
            hoja.setAttribute("transform", `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`);
        },
        mover: p => {
            hoja.setAttribute("transform", `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`);
            for (const q of pelos) if (!q.hecho && Math.abs(q.x - p[0]) < 12 && Math.abs(q.y - p[1]) < 14) {
                q.hecho = true;
                q.e.remove();
                toco++;
            }
        },
        arriba: () => {
            hoja.setAttribute("opacity", 0);
            pasadas++;
            if (toco) H.sonar("limpiar");
            const quedan = pelos.filter((q => !q.hecho)).length;
            cuenta.textContent = quedan ? `${quedan} left` : "";
            if (!quedan) H.fin(Math.max(1, 3 - .25 * Math.max(0, pasadas - 2)));
        }
    });
}

function tapita(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const N = paso.n || 3;
    const TOL = H.ancho(4, .35);
    const P = 1500 / H.rapido(.25);
    el(s, "rect", {
        x: 90,
        y: 70,
        width: 120,
        height: 112,
        rx: 10,
        fill: "rgb(240,214,200)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "rect", {
        x: 90,
        y: 64,
        width: 120,
        height: 12,
        fill: "rgb(250,234,222)",
        stroke: TINTA,
        "stroke-width": 2
    });
    const tapa = el(s, "g", {});
    el(tapa, "rect", {
        x: -60,
        y: -30,
        width: 120,
        height: 34,
        rx: 10,
        fill: "rgb(240,214,200)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "line", {
        x1: 150,
        y1: 22,
        x2: 150,
        y2: 62,
        stroke: VERDE_O,
        "stroke-width": 2,
        "stroke-dasharray": "4 4"
    });
    const marca = el(tapa, "line", {
        x1: 0,
        y1: -30,
        x2: 0,
        y2: 4,
        stroke: ROJO,
        "stroke-width": 2
    });
    const listos = el(s, "g", {});
    const cuenta = letrero(H, s, `0 / ${N}`, 14, 24, "start");
    H.ayuda("Tap to pin the lid when its red line meets the green one");
    Object.assign(H.g, {
        tipo: "tapita",
        P: P,
        t0: H.t0
    });
    let off = 0;
    let n = 0;
    const notas = [];
    H.bucle((t => {
        off = 18 * Math.sin(2 * Math.PI * t / P) * (1 - n * .25);
        tapa.setAttribute("transform", `translate(${(150 + off).toFixed(1)} 62)`);
        H.g.off = off;
    }));
    s.addEventListener("pointerdown", (e => {
        e.preventDefault();
        if (!H.vivo() || n >= N) return;
        const nota = H.notaDe(off, TOL, 14);
        notas.push(nota);
        n++;
        H.sonar(nota >= 2.5 ? "tocar" : "no");
        el(listos, "line", {
            x1: 110 + n * 20 + off,
            y1: 30,
            x2: 110 + n * 20 + off,
            y2: 90,
            stroke: MADERA,
            "stroke-width": 3
        });
        cuenta.textContent = `${n} / ${N}`;
        if (n >= N) H.fin(H.promedio(notas));
    }));
}

function volar(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const N = H.mas(paso.n || 6, 2);
    const TOLA = H.ancho(14, .35);
    const X0 = 40;
    const X1 = 120;
    const GUIA = Math.atan2(120 - 70, 200 - 50);
    el(s, "rect", {
        x: 130,
        y: 120,
        width: 140,
        height: 66,
        rx: 8,
        fill: OLLA,
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "rect", {
        x: 136,
        y: 132,
        width: 128,
        height: 48,
        rx: 4,
        fill: "rgb(170,204,224)"
    });
    const tiras = el(s, "g", {});
    const bloque = el(s, "rect", {
        x: X0,
        y: 50,
        width: X1 - X0,
        height: 40,
        rx: 10,
        fill: H.MASA_R,
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "line", {
        x1: 30,
        y1: 66,
        x2: 214,
        y2: 128,
        stroke: VERDE_O,
        "stroke-width": 3,
        "stroke-dasharray": "6 6"
    });
    el(s, "path", {
        d: "M214 128 l-14 -1 l7 -11 Z",
        fill: VERDE_O
    });
    const traz = el(s, "line", {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
        stroke: "rgb(250,250,250)",
        "stroke-width": 3,
        opacity: 0
    });
    const aviso = letrero(H, s, "", 150, 24);
    const cuenta = letrero(H, s, `0 / ${N}`, 284, 40, "end");
    H.ayuda("Swipe along the green arrow: start on the dough and swipe all the way past it, toward the pot");
    Object.assign(H.g, {
        tipo: "volar",
        n: 0,
        x0: X0,
        x1: X1
    });
    let ini = null;
    let n = 0;
    const notas = [];
    arrastrar(s, H, {
        abajo: p => {
            ini = p;
            traz.setAttribute("x1", p[0].toFixed(1));
            traz.setAttribute("y1", p[1].toFixed(1));
        },
        mover: p => {
            if (!ini) return;
            traz.setAttribute("x2", p[0].toFixed(1));
            traz.setAttribute("y2", p[1].toFixed(1));
            traz.setAttribute("opacity", .8);
        },
        arriba: p => {
            traz.setAttribute("opacity", 0);
            if (!ini) return;
            const [x0, y0] = ini;
            ini = null;
            if (Math.hypot(p[0] - x0, p[1] - y0) < 25) return;
            const largo = x0 < X1 - 10 && y0 > 36 && y0 < 104 && p[0] > X1 + 10;
            if (!largo) {
                aviso.textContent = x0 >= X1 - 10 ? "Start on the dough!" : "All the way across!";
                return H.sonar("no");
            }
            aviso.textContent = "";
            let err = (Math.atan2(p[1] - y0, p[0] - x0) - GUIA) * (180 / Math.PI);
            err = ((err + 180) % 360 + 360) % 360 - 180;
            const nota = H.notaDe(err, TOLA, 35);
            notas.push(nota);
            n++;
            H.g.n = n;
            el(tiras, "path", {
                d: `M${146 + n * 23 % 100} ${148 + n % 3 * 9} q12 -8 24 0`,
                fill: "none",
                stroke: H.MASA_R,
                "stroke-width": 5,
                "stroke-linecap": "round"
            });
            bloque.setAttribute("height", Math.max(18, 40 - n * 3));
            H.sonar(nota >= 2.5 ? "tocar" : "no");
            cuenta.textContent = `${n} / ${N}`;
            if (n >= N) H.fin(H.promedio(notas));
        }
    });
}

function flotar(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const N = 5;
    const az = H.azarDe("flotar");
    el(s, "rect", {
        x: 60,
        y: 60,
        width: 180,
        height: 120,
        rx: 10,
        fill: OLLA,
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "rect", {
        x: 68,
        y: 74,
        width: 164,
        height: 100,
        rx: 4,
        fill: "rgb(190,214,226)"
    });
    const sube = [];
    for (let i = 0; i < N; i++) sube.push((1500 + az() * 2600) / H.rapido(.2));
    const tUlt = Math.max(...sube);
    const bolas = sube.map(((ts, i) => ({
        ts: ts,
        e: el(s, "circle", {
            cx: 90 + i * 30,
            cy: 160,
            r: 11,
            fill: "rgb(253,252,248)",
            stroke: TINTA,
            "stroke-width": 2.5
        })
    })));
    const cuenta = letrero(H, s, `0 / ${N} floating`);
    H.ayuda("Wait until ALL of them float, then tap to scoop them out");
    Object.assign(H.g, {
        tipo: "flotar",
        tUlt: tUlt,
        t: 0
    });
    let tA = 0;
    H.bucle((t => {
        tA = t;
        H.g.t = t;
        let arriba = 0;
        bolas.forEach(((b, i) => {
            const k = clamp((t - b.ts) / 500 + 1, 0, 1);
            if (t >= b.ts) arriba++;
            b.e.setAttribute("cy", (160 - 78 * k + Math.sin(t / 200 + i) * 2).toFixed(1));
        }));
        cuenta.textContent = `${arriba} / ${N} floating`;
        if (t > tUlt + 4e3) H.fin(1.3);
    }));
    s.addEventListener("pointerdown", (e => {
        e.preventDefault();
        if (!H.vivo()) return;
        if (tA < tUlt) {
            H.sonar("no");
            return H.fin(1.4);
        }
        H.fin(H.notaDe(tA - tUlt - 300, H.ancho(450, .3), 2500));
    }));
}

function vigilar(s, H, {T: T, a: a, b: b, pintar: pintar, alTocar: alTocar, tol: tol = .07, tope: tope = 1.6, g: g = {}}) {
    let k = 0;
    Object.assign(H.g, g, {
        k: 0,
        a: a,
        b: b,
        T: T
    });
    H.bucle((t => {
        k = t / T;
        H.g.k = k;
        pintar(k, t);
        if (k > tope) alTocar(1.2, k);
    }));
    s.addEventListener("pointerdown", (e => {
        e.preventDefault();
        if (!H.vivo()) return;
        const nota = k < a - .25 ? 1.3 : H.notaDe(k - (a + b) / 2, (b - a) / 2 + H.ancho(tol, .35) - tol, .4);
        alTocar(nota, k);
    }));
}

function escaldar(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const CX = 140;
    const CY = 118;
    el(s, "path", {
        d: `M${CX - 76} ${CY - 26} Q${CX - 70} ${CY + 66} ${CX} ${CY + 68} Q${CX + 70} ${CY + 66} ${CX + 76} ${CY - 26} Z`,
        fill: "rgb(236,240,246)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const masa = el(s, "ellipse", {
        cx: CX,
        cy: CY - 18,
        rx: 66,
        ry: 16,
        fill: "rgb(252,252,250)",
        stroke: "rgb(214,214,210)",
        "stroke-width": 2
    });
    const grumos = el(s, "g", {});
    const tetera = el(s, "g", {
        transform: "translate(250 46)"
    });
    el(tetera, "ellipse", {
        cx: 0,
        cy: 0,
        rx: 26,
        ry: 20,
        fill: "rgb(214,226,232)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(tetera, "path", {
        d: "M-24 -4 L-46 -16 L-44 -8 L-24 6 Z",
        fill: "rgb(214,226,232)",
        stroke: TINTA,
        "stroke-width": 2.5
    });
    const chorro = el(s, "rect", {
        x: 202,
        y: 34,
        width: 4,
        height: 0,
        fill: "rgb(190,220,240)"
    });
    const cuchara = el(s, "g", {});
    el(cuchara, "rect", {
        x: -3,
        y: -50,
        width: 6,
        height: 50,
        rx: 3,
        fill: MADERA,
        stroke: TINTA,
        "stroke-width": 2
    });
    cuchara.setAttribute("transform", `translate(${CX + 30} ${CY - 18})`);
    const med = medidor(H, s, {
        x: 20,
        y: 40,
        w: 12,
        h: 140,
        vertical: true
    });
    H.ayuda("Hold to pour the boiling water · keep stirring in circles while it pours");
    Object.assign(H.g, {
        tipo: "escaldar",
        cx: CX,
        cy: CY - 18,
        agua: 0
    });
    let on = false;
    let agua = 0;
    let grumo = 0;
    let giro = 0;
    let previo = null;
    let tU = 0;
    H.bucle((t => {
        const dt = Math.min(40, t - tU);
        tU = t;
        giro *= Math.exp(-dt / 250);
        if (on) {
            agua += dt * 28e-5 * H.rapido(.2);
            if (giro < .004) grumo += dt * 28e-5;
        }
        H.g.agua = agua;
        med.poner(agua);
        chorro.setAttribute("height", on ? 66 : 0);
        tetera.setAttribute("transform", on ? "translate(244 48) rotate(-25)" : "translate(250 46)");
        masa.setAttribute("fill", mezcla("rgb(252,252,250)", "rgb(236,240,236)", agua));
        if (agua >= 1) H.fin(H.notaDe(grumo, H.ancho(.1, .35), .4));
    }));
    arrastrar(s, H, {
        abajo: p => {
            on = true;
            previo = Math.atan2(p[1] - (CY - 18), p[0] - CX);
        },
        mover: p => {
            const a = Math.atan2(p[1] - (CY - 18), p[0] - CX);
            let d = a - previo;
            if (d > Math.PI) d -= 2 * Math.PI;
            if (d < -Math.PI) d += 2 * Math.PI;
            previo = a;
            giro = Math.max(giro, Math.abs(d) / 16);
            cuchara.setAttribute("transform", `translate(${clamp(p[0], CX - 60, CX + 60).toFixed(1)} ${clamp(p[1], CY - 40, CY + 10).toFixed(1)})`);
            if (on && giro < .004 && Math.random() < .05) el(grumos, "circle", {
                cx: CX - 50 + Math.random() * 100,
                cy: CY - 24 + Math.random() * 14,
                r: 4,
                fill: "rgb(240,240,236)",
                stroke: "rgb(190,190,186)",
                "stroke-width": 1
            });
        },
        arriba: () => {
            on = false;
        }
    });
}

function transparente(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    el(s, "ellipse", {
        cx: 150,
        cy: 118,
        rx: 120,
        ry: 66,
        fill: "rgb(214,176,124)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const ds = [];
    for (let i = 0; i < 3; i++) {
        const x = 92 + i * 58;
        el(s, "ellipse", {
            cx: x,
            cy: 116,
            rx: 16,
            ry: 9,
            fill: "rgb(250,160,130)"
        });
        ds.push(el(s, "path", {
            d: `M${x - 26} 128 Q${x} 82 ${x + 26} 128 Z`,
            fill: "rgb(250,250,246)",
            stroke: TINTA,
            "stroke-width": 2.5
        }));
    }
    const vapor = [ 0, 1, 2 ].map((i => el(s, "path", {
        d: `M${100 + i * 50} 70 q-6 -10 0 -20 q6 -10 0 -20`,
        fill: "none",
        stroke: "rgb(250,250,250)",
        "stroke-width": 4,
        "stroke-linecap": "round",
        opacity: .7
    })));
    H.ayuda("Watch the skin turn see-through · tap when you can see the pink shrimp");
    vigilar(s, H, {
        T: 4200 / H.rapido(.2),
        a: .9,
        b: 1.05,
        g: {
            tipo: "transparente"
        },
        pintar: (k, t) => {
            ds.forEach((d => {
                d.setAttribute("opacity", clamp(1 - .55 * k, .4, 1).toFixed(2));
                d.setAttribute("fill", k > 1.35 ? "rgb(230,226,214)" : "rgb(250,250,246)");
            }));
            vapor.forEach(((v, i) => v.setAttribute("transform", `translate(0 ${(-((t / 30 + i * 9) % 12)).toFixed(1)})`)));
        },
        alTocar: nota => H.fin(nota)
    });
}

function laminar(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const SEQ = [ "up", "down", "side", "up", "down", "side", "up", "down", "side" ];
    const masa = el(s, "rect", {
        x: 90,
        y: 50,
        width: 120,
        height: 120,
        rx: 8,
        fill: H.MASA_R,
        stroke: TINTA,
        "stroke-width": 3
    });
    const capas = el(s, "g", {});
    const flecha = el(s, "path", {
        d: "",
        fill: "none",
        stroke: VERDE_O,
        "stroke-width": 5,
        "stroke-linecap": "round",
        "stroke-linejoin": "round"
    });
    const cuenta = letrero(H, s, "Layers: 1", 14, 24, "start");
    H.ayuda("Follow the arrow: fold up, fold down, roll sideways · three times");
    let i = 0;
    let malos = 0;
    Object.assign(H.g, {
        tipo: "laminar",
        sig: SEQ[0]
    });
    const dibujar = () => {
        const q = SEQ[i];
        H.g.sig = q;
        flecha.setAttribute("d", q === "up" ? "M150 160 L150 70 M136 86 L150 70 L164 86" : q === "down" ? "M150 60 L150 150 M136 134 L150 150 L164 134" : "M100 110 L200 110 M184 96 L200 110 L184 124");
        const h = q === "side" ? 40 : 120;
        masa.setAttribute("height", i % 3 === 2 ? 40 : i % 3 === 1 ? 80 : 120);
        void h;
    };
    dibujar();
    let ini = null;
    arrastrar(s, H, {
        abajo: p => {
            ini = p;
        },
        arriba: p => {
            if (!ini) return;
            const dx = p[0] - ini[0];
            const dy = p[1] - ini[1];
            ini = null;
            if (Math.hypot(dx, dy) < 30) return;
            const hizo = Math.abs(dx) > Math.abs(dy) ? "side" : dy < 0 ? "up" : "down";
            if (hizo !== SEQ[i]) {
                malos++;
                H.sonar("no");
                return;
            }
            H.sonar("tocar");
            i++;
            if (i % 3 === 0) {
                el(capas, "line", {
                    x1: 96,
                    y1: 54 + i / 3 * 10,
                    x2: 204,
                    y2: 54 + i / 3 * 10,
                    stroke: H.oscurecer(H.MASA_R, .85),
                    "stroke-width": 2
                });
                cuenta.textContent = `Layers: ${Math.pow(3, i / 3)}`;
            }
            if (i >= SEQ.length) return H.fin(Math.max(1, 3 - .3 * malos));
            dibujar();
        }
    });
}

function ventanita(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    el(s, "rect", {
        x: 40,
        y: 30,
        width: 220,
        height: 156,
        rx: 10,
        fill: "rgb(80,80,90)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "rect", {
        x: 62,
        y: 52,
        width: 176,
        height: 108,
        rx: 6,
        fill: "rgb(60,40,30)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const az = H.azarDe("ventanita");
    const tartas = [];
    for (let i = 0; i < 3; i++) {
        const x = 96 + i * 54;
        el(s, "ellipse", {
            cx: x,
            cy: 112,
            rx: 22,
            ry: 10,
            fill: "rgb(232,190,110)",
            stroke: TINTA,
            "stroke-width": 2
        });
        const crema = el(s, "ellipse", {
            cx: x,
            cy: 109,
            rx: 17,
            ry: 6,
            fill: "rgb(255,214,90)"
        });
        const manchas = [ 0, 1, 2, 3, 4, 5 ].map((() => el(s, "circle", {
            cx: x - 12 + az() * 24,
            cy: 106 + az() * 6,
            r: 2.5,
            fill: "rgb(110,60,30)",
            opacity: 0
        })));
        tartas.push({
            crema: crema,
            manchas: manchas
        });
    }
    el(s, "rect", {
        x: 62,
        y: 52,
        width: 176,
        height: 108,
        rx: 6,
        fill: "rgba(255,170,60,0.12)"
    });
    const cuenta = letrero(H, s, "", 150, 24);
    H.ayuda("Look through the window · take them out when they have a few dark spots (3–4)");
    vigilar(s, H, {
        T: 5200 / H.rapido(.2),
        a: .5,
        b: .67,
        tol: .08,
        g: {
            tipo: "ventanita"
        },
        pintar: k => {
            const n = Math.floor(k * 6);
            tartas.forEach((q => q.manchas.forEach(((m, j) => m.setAttribute("opacity", j < n ? 1 : 0)))));
            tartas.forEach((q => q.crema.setAttribute("fill", k > 1 ? "rgb(170,110,50)" : "rgb(255,214,90)")));
            cuenta.textContent = `${Math.min(6, n)} spots`;
        },
        alTocar: nota => H.fin(nota)
    });
}

function hojasPlancha(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const N = paso.n || 3;
    const T = 1700 / H.rapido(.2);
    el(s, "circle", {
        cx: 140,
        cy: 112,
        r: 80,
        fill: "rgb(60,60,70)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const hoja = el(s, "circle", {
        cx: 140,
        cy: 112,
        r: 0,
        fill: "rgb(250,250,246)",
        stroke: "rgb(214,210,200)",
        "stroke-width": 3
    });
    const borde = el(s, "circle", {
        cx: 140,
        cy: 112,
        r: 58,
        fill: "none",
        stroke: "rgb(250,240,214)",
        "stroke-width": 0
    });
    const bola = el(s, "circle", {
        cx: 140,
        cy: 30,
        r: 16,
        fill: H.MASA_R,
        stroke: TINTA,
        "stroke-width": 2.5
    });
    const pila = el(s, "g", {});
    const cuenta = letrero(H, s, `0 / ${N}`, 290, 30, "end");
    H.ayuda("Tap to dab the dough on the griddle · tap again when the edges curl up");
    let n = 0;
    let t0 = null;
    let tA = 0;
    const notas = [];
    Object.assign(H.g, {
        tipo: "hojas",
        T: T,
        t0: null,
        t: 0
    });
    H.bucle((t => {
        tA = t;
        H.g.t = t;
        if (t0 === null) return;
        const k = (t - t0) / T;
        hoja.setAttribute("fill", mezcla("rgb(236,236,230)", "rgb(252,250,240)", k));
        borde.setAttribute("stroke-width", (k > .8 ? Math.min(6, (k - .8) * 25) : 0).toFixed(1));
        if (k > 1.8) {
            hoja.setAttribute("fill", "rgb(214,170,110)");
            levantar(1.2);
        }
    }));
    const levantar = nota => {
        notas.push(nota);
        n++;
        t0 = null;
        H.g.t0 = null;
        hoja.setAttribute("r", 0);
        borde.setAttribute("stroke-width", 0);
        el(pila, "ellipse", {
            cx: 270,
            cy: 170 - n * 5,
            rx: 22,
            ry: 6,
            fill: "rgb(250,248,236)",
            stroke: TINTA,
            "stroke-width": 1.5
        });
        cuenta.textContent = `${n} / ${N}`;
        H.sonar(nota >= 2.5 ? "tocar" : "no");
        if (n >= N) H.fin(H.promedio(notas));
    };
    s.addEventListener("pointerdown", (e => {
        e.preventDefault();
        if (!H.vivo()) return;
        if (t0 === null) {
            t0 = tA;
            H.g.t0 = tA;
            hoja.setAttribute("r", 58);
            bola.setAttribute("transform", "translate(0 70)");
            setTimeout((() => bola.setAttribute("transform", "")), 200);
            return H.sonar("tocar");
        }
        const k = (tA - t0) / T;
        levantar(k < .6 ? 1.4 : H.notaDe(k - 1, H.ancho(.15, .35), .5));
    }));
}

function budare(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const T = 2600 / H.rapido(.2);
    el(s, "ellipse", {
        cx: 150,
        cy: 130,
        rx: 120,
        ry: 40,
        fill: "rgb(60,60,70)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const arepa = el(s, "ellipse", {
        cx: 150,
        cy: 118,
        rx: 56,
        ry: 16,
        fill: H.MASA_R,
        stroke: TINTA,
        "stroke-width": 3
    });
    const manchas = el(s, "g", {
        opacity: 0
    });
    for (const [x, y] of [ [ -20, -4 ], [ 10, 2 ], [ 28, -6 ], [ -36, 4 ] ]) el(manchas, "ellipse", {
        cx: 150 + x,
        cy: 118 + y,
        rx: 6,
        ry: 2.5,
        fill: "rgb(170,110,50)"
    });
    const fase = letrero(H, s, "Side 1", 150, 24);
    H.ayuda("Tap to flip when the bottom is golden · then tap to take it out when it puffs up");
    let lado = 0;
    let t0 = 0;
    let tA = 0;
    const notas = [];
    Object.assign(H.g, {
        tipo: "budare",
        T: T,
        t: 0,
        t0: 0,
        lado: 0
    });
    H.bucle((t => {
        tA = t;
        H.g.t = t;
        const k = (t - t0) / T;
        if (lado === 0) {
            arepa.setAttribute("stroke", k > .85 ? "rgb(200,140,60)" : TINTA);
            arepa.setAttribute("stroke-width", k > .85 ? 5 : 3);
        } else {
            arepa.setAttribute("ry", (16 + 10 * clamp(k)).toFixed(1));
            arepa.setAttribute("cy", (118 - 6 * clamp(k)).toFixed(1));
        }
        if (k > 1.9) {
            notas.push(1.2);
            paso2();
        }
    }));
    const paso2 = () => {
        if (lado === 0) {
            lado = 1;
            t0 = tA;
            H.g.lado = 1;
            H.g.t0 = tA;
            manchas.setAttribute("opacity", 1);
            fase.textContent = "Side 2";
            arepa.setAttribute("stroke", TINTA);
            arepa.setAttribute("stroke-width", 3);
        } else H.fin(H.promedio(notas));
    };
    s.addEventListener("pointerdown", (e => {
        e.preventDefault();
        if (!H.vivo()) return;
        const k = (tA - t0) / T;
        const nota = k < .5 ? 1.4 : H.notaDe(k - 1, H.ancho(.13, .35), .5);
        notas.push(nota);
        H.sonar(nota >= 2.5 ? "tocar" : "no");
        paso2();
    }));
}

function bolsa(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const N = paso.n || 3;
    const CX = 150;
    const CY = 112;
    const R = 54;
    const TOL = H.ancho(6, .35);
    el(s, "rect", {
        x: 40,
        y: 40,
        width: 220,
        height: 150,
        rx: 6,
        fill: "rgba(230,240,250,0.6)",
        stroke: "rgb(170,190,210)",
        "stroke-width": 2
    });
    el(s, "path", {
        d: `M${CX - R} ${CY} A${R} ${R} 0 0 0 ${CX + R} ${CY} Z`,
        fill: H.MASA_R,
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "ellipse", {
        cx: CX,
        cy: CY + 18,
        rx: 30,
        ry: 12,
        fill: "rgb(200,120,70)"
    });
    const tapa = el(s, "path", {
        d: "",
        fill: H.MASA_R,
        stroke: TINTA,
        "stroke-width": 3,
        opacity: .95
    });
    el(s, "line", {
        x1: CX - R - 10,
        y1: CY,
        x2: CX + R + 10,
        y2: CY,
        stroke: VERDE_O,
        "stroke-width": 2,
        "stroke-dasharray": "5 5"
    });
    const listas = el(s, "g", {});
    const cuenta = letrero(H, s, `0 / ${N}`, 14, 24, "start");
    H.ayuda("Drag the top half down over the filling · let go when the edges meet");
    let ang = 0;
    let y0 = null;
    let n = 0;
    const notas = [];
    Object.assign(H.g, {
        tipo: "bolsa",
        cy: CY,
        r: R,
        cx: CX
    });
    const pintar = () => {
        const yb = CY - R * Math.cos(ang);
        tapa.setAttribute("d", `M${CX - R} ${CY} A${R} ${Math.abs(CY - yb) + .1} 0 0 ${yb < CY ? 1 : 0} ${CX + R} ${CY} Z`);
        H.g.borde = yb;
    };
    pintar();
    arrastrar(s, H, {
        abajo: p => {
            y0 = p[1];
        },
        mover: p => {
            if (y0 === null) return;
            ang = clamp(Math.acos(clamp((CY - (CY - R + (p[1] - y0))) / R, -1, 1)), 0, Math.PI);
            pintar();
        },
        arriba: () => {
            if (y0 === null) return;
            y0 = null;
            if (ang < .4) return;
            const yb = CY - R * Math.cos(ang);
            const nota = H.notaDe(yb - (CY + R), TOL, 25);
            notas.push(nota);
            n++;
            H.sonar(nota >= 2.5 ? "tocar" : "no");
            el(listas, "path", {
                d: `M${20 + n * 40} 186 a16 16 0 0 1 32 0 Z`,
                fill: H.MASA_R,
                stroke: TINTA,
                "stroke-width": 2
            });
            cuenta.textContent = `${n} / ${N}`;
            if (n >= N) return H.fin(H.promedio(notas));
            ang = 0;
            pintar();
        }
    });
}

function gelatina(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const N = paso.n || 4;
    el(s, "rect", {
        x: 50,
        y: 60,
        width: 200,
        height: 120,
        rx: 10,
        fill: "rgb(214,176,124)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const gel = el(s, "rect", {
        x: 90,
        y: 86,
        width: 120,
        height: 70,
        rx: 8,
        fill: "rgb(236,190,120)",
        stroke: TINTA,
        "stroke-width": 3,
        opacity: .9
    });
    const cortes = el(s, "g", {});
    const med = medidor(H, s, {
        x: 70,
        y: 22,
        w: 160,
        h: 10,
        a: 0,
        b: .15
    });
    const cuenta = letrero(H, s, `0 / ${N}`, 290, 50, "end");
    H.ayuda("The jelly wobbles · cut it (tap) only when it's still");
    let amp = 1;
    let n = 0;
    let tU = 0;
    const notas = [];
    Object.assign(H.g, {
        tipo: "gelatina",
        amp: 1
    });
    H.bucle((t => {
        const dt = Math.min(40, t - tU);
        tU = t;
        amp *= Math.exp(-dt / (650 / H.rapido(.2)));
        H.g.amp = amp;
        med.poner(amp);
        const w = Math.sin(t / 45) * amp;
        gel.setAttribute("transform", `translate(${(w * 6).toFixed(1)} 0) skewX(${(w * 8).toFixed(1)})`);
    }));
    s.addEventListener("pointerdown", (e => {
        e.preventDefault();
        if (!H.vivo()) return;
        const nota = H.notaDe(Math.max(0, amp - .06), H.ancho(.09, .35), .5);
        notas.push(nota);
        n++;
        el(cortes, "line", {
            x1: 90 + n * 120 / (N + 1),
            y1: 86,
            x2: 90 + n * 120 / (N + 1) + amp * 14,
            y2: 156,
            stroke: TINTA,
            "stroke-width": 2
        });
        H.sonar(nota >= 2.5 ? "tocar" : "no");
        cuenta.textContent = `${n} / ${N}`;
        amp = 1;
        if (n >= N) H.fin(H.promedio(notas));
    }));
}

function desmechar(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const N = H.mas(paso.n || 6, 2);
    el(s, "ellipse", {
        cx: 150,
        cy: 112,
        rx: 120,
        ry: 70,
        fill: "rgb(250,250,246)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const pechuga = el(s, "ellipse", {
        cx: 150,
        cy: 112,
        rx: 60,
        ry: 34,
        fill: "rgb(236,200,150)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const hebras = el(s, "g", {});
    el(s, "line", {
        x1: 80,
        y1: 112,
        x2: 220,
        y2: 112,
        stroke: VERDE_O,
        "stroke-width": 2,
        "stroke-dasharray": "5 6"
    });
    const cuenta = letrero(H, s, `0 / ${N}`);
    H.ayuda("Pull the chicken apart: long swipes across, end to end");
    Object.assign(H.g, {
        tipo: "desmechar"
    });
    let n = 0;
    let cortas = 0;
    let ini = null;
    arrastrar(s, H, {
        abajo: p => {
            ini = p;
        },
        arriba: p => {
            if (!ini) return;
            const L = Math.abs(p[0] - ini[0]);
            ini = null;
            if (L < 25) return;
            if (L < 110) {
                cortas++;
                H.sonar("no");
            } else H.sonar("tocar");
            n++;
            for (let j = 0; j < 4; j++) el(hebras, "path", {
                d: `M${100 + Math.random() * 100} ${86 + Math.random() * 52} q8 -4 18 2`,
                fill: "none",
                stroke: "rgb(236,200,150)",
                "stroke-width": 3,
                "stroke-linecap": "round"
            });
            pechuga.setAttribute("rx", Math.max(10, 60 - n * 7));
            pechuga.setAttribute("ry", Math.max(6, 34 - n * 4));
            cuenta.textContent = `${n} / ${N}`;
            if (n >= N) H.fin(Math.max(1, 3 - .3 * cortas));
        }
    });
}

function remojar(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const N = paso.n || 3;
    const A = .8;
    const B = 1.2;
    const T = 1e3 / H.rapido(.2);
    el(s, "path", {
        d: "M70 110 Q74 186 150 188 Q226 186 230 110 Z",
        fill: "rgb(236,240,246)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "ellipse", {
        cx: 150,
        cy: 112,
        rx: 80,
        ry: 14,
        fill: "rgb(200,220,226)",
        stroke: TINTA,
        "stroke-width": 2
    });
    for (const [x, y] of [ [ 120, 112 ], [ 176, 110 ] ]) el(s, "ellipse", {
        cx: x,
        cy: y,
        rx: 6,
        ry: 4,
        fill: "rgb(250,246,230)",
        stroke: TINTA,
        "stroke-width": 1
    });
    const pat = el(s, "ellipse", {
        cx: 0,
        cy: 0,
        rx: 24,
        ry: 9,
        fill: "rgb(232,190,90)",
        stroke: TINTA,
        "stroke-width": 2.5
    });
    const med = medidor(H, s, {
        x: 252,
        y: 40,
        w: 12,
        h: 140,
        a: A / 1.6,
        b: B / 1.6,
        vertical: true
    });
    const cuenta = letrero(H, s, `0 / ${N}`, 14, 24, "start");
    H.ayuda("Drag the patacón into the garlic water, hold it there a moment, then lift it out");
    let dentro = false;
    let tD = 0;
    let tA = 0;
    let n = 0;
    const notas = [];
    pat.setAttribute("transform", "translate(150 50)");
    Object.assign(H.g, {
        tipo: "remojar",
        k: 0,
        a: A,
        b: B
    });
    H.bucle((t => {
        tA = t;
        const k = dentro ? (t - tD) / T : 0;
        H.g.k = k;
        med.poner(k / 1.6);
    }));
    arrastrar(s, H, {
        mover: p => {
            pat.setAttribute("transform", `translate(${clamp(p[0], 80, 220).toFixed(1)} ${clamp(p[1], 30, 150).toFixed(1)})`);
            const en = p[1] > 108;
            if (en && !dentro) {
                dentro = true;
                tD = tA;
                H.sonar("tocar");
            } else if (!en && dentro) {
                dentro = false;
                const k = (tA - tD) / T;
                const nota = H.notaDe(k - (A + B) / 2, (B - A) / 2 + H.ancho(.15, .35) - .15, .6);
                notas.push(nota);
                n++;
                cuenta.textContent = `${n} / ${N}`;
                H.sonar(nota >= 2.5 ? "tocar" : "no");
                if (n >= N) H.fin(H.promedio(notas));
            }
        }
    });
}

function sinAbrir(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    el(s, "rect", {
        x: 40,
        y: 30,
        width: 220,
        height: 156,
        rx: 10,
        fill: "rgb(80,80,90)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "rect", {
        x: 62,
        y: 52,
        width: 176,
        height: 108,
        rx: 6,
        fill: "rgb(60,40,30)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const panes = [ 0, 1, 2 ].map((i => el(s, "ellipse", {
        cx: 100 + i * 50,
        cy: 128,
        rx: 18,
        ry: 8,
        fill: H.MASA_R,
        stroke: TINTA,
        "stroke-width": 2.5
    })));
    el(s, "rect", {
        x: 62,
        y: 52,
        width: 176,
        height: 108,
        rx: 6,
        fill: "rgba(255,170,60,0.12)"
    });
    H.ayuda("Don't open the oven too soon! Tap when they've puffed up and turned golden");
    vigilar(s, H, {
        T: 4800 / H.rapido(.2),
        a: .92,
        b: 1.08,
        g: {
            tipo: "sin_abrir"
        },
        pintar: k => panes.forEach(((p, i) => {
            p.setAttribute("ry", (8 + 12 * clamp(k)).toFixed(1));
            p.setAttribute("cy", (128 - 10 * clamp(k)).toFixed(1));
            p.setAttribute("fill", k > 1.3 ? "rgb(170,110,50)" : mezcla(H.MASA_R, "rgb(222,160,70)", clamp(k - .5) * 2));
            void i;
        })),
        alTocar: (nota, k) => {
            if (k < .75) panes.forEach((p => p.setAttribute("ry", 6)));
            H.fin(nota);
        }
    });
}

function dibujarIng(H, padre, nombre, x, y, k = 1) {
    const {el: el, TINTA: TINTA} = H;
    const g = el(padre, "g", {
        transform: `translate(${x} ${y}) scale(${k})`
    });
    const sw = 2 / Math.max(.4, k);
    switch (nombre) {
      case "Dough":
        el(g, "rect", {
            x: -26,
            y: -9,
            width: 52,
            height: 18,
            rx: 7,
            fill: "rgb(250,226,140)",
            stroke: TINTA,
            "stroke-width": sw
        });
        el(g, "path", {
            d: "M-18 -2 q6 -4 12 0 M4 2 q6 -4 12 0",
            fill: "none",
            stroke: "rgb(226,196,110)",
            "stroke-width": sw
        });
        break;

      case "Rice":
        el(g, "ellipse", {
            cx: 0,
            cy: 0,
            rx: 24,
            ry: 10,
            fill: "rgb(252,252,246)",
            stroke: TINTA,
            "stroke-width": sw
        });
        for (let i = 0; i < 7; i++) el(g, "ellipse", {
            cx: -16 + i * 5.5,
            cy: i % 2 * 4 - 2,
            rx: 2.2,
            ry: 1.2,
            fill: "rgb(226,222,206)"
        });
        break;

      case "Chicken":
        for (let i = 0; i < 4; i++) el(g, "path", {
            d: `M${-22 + i * 4} ${-6 + i * 4} q12 -5 26 0 q8 3 16 -1`,
            fill: "none",
            stroke: "rgb(226,180,120)",
            "stroke-width": 5,
            "stroke-linecap": "round"
        });
        break;

      case "Pork":
        el(g, "rect", {
            x: -16,
            y: -10,
            width: 32,
            height: 20,
            rx: 4,
            fill: "rgb(214,110,96)",
            stroke: TINTA,
            "stroke-width": sw
        });
        el(g, "rect", {
            x: -15,
            y: -3,
            width: 30,
            height: 5,
            fill: "rgb(252,236,214)"
        });
        break;

      case "Egg":
        el(g, "ellipse", {
            cx: 0,
            cy: 0,
            rx: 15,
            ry: 11,
            fill: "rgb(255,252,244)",
            stroke: TINTA,
            "stroke-width": sw
        });
        el(g, "circle", {
            cx: 0,
            cy: 0,
            r: 6,
            fill: "rgb(255,196,40)"
        });
        break;

      case "Carrot":
        for (const dx of [ -12, 0, 12 ]) {
            el(g, "circle", {
                cx: dx,
                cy: 0,
                r: 6,
                fill: "rgb(240,130,50)",
                stroke: TINTA,
                "stroke-width": sw
            });
            el(g, "circle", {
                cx: dx,
                cy: 0,
                r: 2.5,
                fill: "rgb(250,180,100)"
            });
        }
        break;

      case "Peas":
        for (const [dx, dy] of [ [ -10, 2 ], [ 0, -3 ], [ 10, 2 ], [ -4, 6 ], [ 6, 6 ] ]) el(g, "circle", {
            cx: dx,
            cy: dy,
            r: 4,
            fill: "rgb(110,170,70)",
            stroke: TINTA,
            "stroke-width": sw * .75
        });
        break;

      case "Plantain":
        el(g, "ellipse", {
            cx: 0,
            cy: 0,
            rx: 26,
            ry: 9,
            fill: "rgb(240,190,80)",
            stroke: "rgb(150,90,40)",
            "stroke-width": sw * 1.5
        });
        el(g, "path", {
            d: "M-16 0 q16 -5 32 0",
            fill: "none",
            stroke: "rgb(250,214,130)",
            "stroke-width": sw
        });
        break;

      case "Cheese":
        el(g, "rect", {
            x: -22,
            y: -7,
            width: 44,
            height: 14,
            rx: 2,
            fill: "rgb(252,250,236)",
            stroke: TINTA,
            "stroke-width": sw
        });
        for (const dx of [ -12, 2, 14 ]) el(g, "circle", {
            cx: dx,
            cy: 0,
            r: 2,
            fill: "rgb(232,226,200)"
        });
        break;

      case "Guava":
        el(g, "rect", {
            x: -20,
            y: -6,
            width: 40,
            height: 12,
            rx: 2,
            fill: "rgb(170,40,60)",
            stroke: TINTA,
            "stroke-width": sw
        });
        el(g, "rect", {
            x: -18,
            y: -4,
            width: 12,
            height: 3,
            fill: "rgb(210,80,100)"
        });
        break;

      default:
        el(g, "circle", {
            cx: 0,
            cy: 0,
            r: 10,
            fill: "rgb(220,200,170)",
            stroke: TINTA,
            "stroke-width": sw
        });
    }
    return g;
}

function armar(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const ORDEN = paso.orden || [ [ "Dough", "rgb(250,226,140)" ], [ "Rice", "rgb(252,252,246)" ], [ "Chicken", "rgb(236,200,150)" ], [ "Pork", "rgb(214,110,96)" ], [ "Egg", "rgb(255,214,90)" ], [ "Carrot", "rgb(240,140,60)" ], [ "Peas", "rgb(110,170,70)" ] ];
    el(s, "ellipse", {
        cx: 88,
        cy: 120,
        rx: 76,
        ry: 54,
        fill: paso.base || "rgb(96,150,70)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const capa = el(s, "g", {});
    const az = H.azarDe("armar");
    const pos = ORDEN.map(((_, i) => i)).sort((() => az() - .5));
    const alto = Math.min(24, 168 / ORDEN.length);
    const botones = ORDEN.map((([nombre, color], i) => {
        const k = pos[i];
        const x = 236;
        const y = 30 + k * alto + alto / 2;
        el(s, "rect", {
            x: x - 60,
            y: y - alto / 2 + 1,
            width: 120,
            height: alto - 3,
            rx: 5,
            fill: PAPEL,
            stroke: TINTA,
            "stroke-width": 2
        });
        dibujarIng(H, s, nombre, x - 44, y, .42);
        void color;
        el(s, "text", {
            x: x - 28,
            y: y + 3.5,
            "text-anchor": "start",
            "font-size": 8.5,
            class: "cocina-cuenta"
        }).textContent = nombre;
        return {
            x: x,
            y: y,
            i: i,
            nombre: nombre,
            alto: alto
        };
    }));
    const cartel = letrero(H, s, `Next: ${ORDEN[0][0]}`, 14, 24, "start");
    H.ayuda(paso.ayuda || "Add the fillings in the tamal's order: tap the one shown at the top");
    let i = 0;
    let malos = 0;
    Object.assign(H.g, {
        tipo: "armar",
        sig: {
            x: botones[0].x,
            y: botones[0].y
        }
    });
    s.addEventListener("pointerdown", (e => {
        e.preventDefault();
        if (!H.vivo()) return;
        const [x, y] = H.aSvg(e);
        const b = botones.find((q => !q.usado && Math.abs(q.x - x) < 62 && Math.abs(q.y - y) < q.alto / 2));
        if (!b) return;
        if (b.nombre !== ORDEN[i][0]) {
            malos++;
            return H.sonar("no");
        }
        H.sonar("tocar");
        b.usado = true;
        el(s, "rect", {
            x: b.x - 60,
            y: b.y - b.alto / 2 + 1,
            width: 120,
            height: b.alto - 3,
            rx: 5,
            fill: "rgba(120,120,120,0.45)"
        });
        const capas = ORDEN.length;
        const k = 1.25 - .35 * i / capas;
        for (const dx of capas > 5 ? [ -22, 22 ] : [ 0 ]) dibujarIng(H, capa, ORDEN[i][0], 88 + dx + i * 7 % 9 - 4, 128 - i * (capas > 5 ? 6 : 9), k);
        i++;
        if (i >= ORDEN.length) return H.fin(Math.max(1, 3 - .3 * malos));
        cartel.textContent = `Next: ${ORDEN[i][0]}`;
        const sg = botones.find((q => !q.usado && q.nombre === ORDEN[i][0]));
        H.g.sig = {
            x: sg.x,
            y: sg.y
        };
    }));
}

function quesoEstira(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const META = 80;
    const VLIM = .09 * H.rapido(.2);
    el(s, "path", {
        d: "M90 110 L100 186 L200 186 L210 110 Z",
        fill: "rgb(250,250,246)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "ellipse", {
        cx: 150,
        cy: 112,
        rx: 60,
        ry: 12,
        fill: "rgb(110,60,40)",
        stroke: TINTA,
        "stroke-width": 2
    });
    const hilo = el(s, "rect", {
        x: 146,
        y: 112,
        width: 8,
        height: 0,
        fill: "rgb(252,246,220)",
        stroke: "rgb(220,210,180)",
        "stroke-width": 1
    });
    const cuchara = el(s, "g", {});
    el(cuchara, "ellipse", {
        cx: 0,
        cy: 0,
        rx: 14,
        ry: 8,
        fill: METAL,
        stroke: TINTA,
        "stroke-width": 2.5
    });
    el(cuchara, "ellipse", {
        cx: 0,
        cy: -2,
        rx: 9,
        ry: 5,
        fill: "rgb(252,246,220)"
    });
    cuchara.setAttribute("transform", "translate(150 112)");
    el(s, "line", {
        x1: 120,
        y1: 112 - META,
        x2: 180,
        y2: 112 - META,
        stroke: VERDE_O,
        "stroke-width": 2,
        "stroke-dasharray": "5 5"
    });
    const med = medidor(H, s, {
        x: 252,
        y: 40,
        w: 12,
        h: 140,
        a: 0,
        b: 1 / 1.5,
        vertical: true,
        rojo: 1 - 1 / 1.5
    });
    H.ayuda("Pull the melted cheese up slowly so it stretches to the line");
    Object.assign(H.g, {
        tipo: "queso",
        meta: META,
        vlim: VLIM
    });
    let y0 = null;
    let tP = 0;
    let yP = 0;
    let v = 0;
    let largo = 0;
    arrastrar(s, H, {
        abajo: p => {
            y0 = p[1];
            tP = H.ahora();
            yP = p[1];
        },
        mover: p => {
            if (y0 === null) return;
            const ahora = H.ahora();
            v = .7 * v + .3 * (Math.max(0, yP - p[1]) / Math.max(1, ahora - tP));
            tP = ahora;
            yP = p[1];
            med.poner(v / VLIM / 1.5);
            largo = Math.max(largo, y0 - p[1]);
            cuchara.setAttribute("transform", `translate(150 ${(112 - largo).toFixed(1)})`);
            hilo.setAttribute("y", (112 - largo).toFixed(1));
            hilo.setAttribute("height", largo.toFixed(1));
            if (v > VLIM * 1.5) {
                y0 = null;
                H.sonar("no");
                hilo.setAttribute("height", 0);
                return H.fin(Math.max(1, 1 + 2 * clamp(largo / META) - .6));
            }
            if (largo >= META) {
                y0 = null;
                H.fin(H.notaDe(Math.max(0, v / VLIM - 1), H.ancho(.25, .35), .6));
            }
        },
        arriba: () => {
            y0 = null;
        }
    });
}

function tostar(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const A = .72;
    const B = .86;
    const sarten = el(s, "g", {});
    el(sarten, "rect", {
        x: 60,
        y: -6,
        width: 80,
        height: 12,
        rx: 5,
        fill: "rgb(60,60,70)",
        stroke: TINTA,
        "stroke-width": 2.5
    });
    el(sarten, "ellipse", {
        cx: 0,
        cy: 0,
        rx: 70,
        ry: 28,
        fill: "rgb(60,60,70)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const az = H.azarDe("tostar");
    const granos = [];
    for (let i = 0; i < 14; i++) granos.push({
        e: el(sarten, "ellipse", {
            cx: (az() - .5) * 100,
            cy: (az() - .5) * 30,
            rx: 6,
            ry: 4,
            fill: "rgb(150,170,90)",
            stroke: TINTA,
            "stroke-width": 1.2
        }),
        r: 0,
        sesgo: .7 + az() * .6
    });
    sarten.setAttribute("transform", "translate(140 110)");
    const med = medidor(H, s, {
        x: 70,
        y: 20,
        w: 160,
        h: 10,
        a: A,
        b: B
    });
    H.ayuda("Shake the pan side to side so they roast evenly · tap Done when they're dark brown");
    Object.assign(H.g, {
        tipo: "tostar",
        r: 0,
        a: A,
        b: B,
        cx: 140
    });
    let x0 = null;
    let off = 0;
    let mov = 0;
    let tU = 0;
    H.bucle((t => {
        const dt = Math.min(40, t - tU);
        tU = t;
        mov *= Math.exp(-dt / 300);
        const parejo = clamp(mov / .15);
        let suma = 0;
        granos.forEach((g => {
            const f = parejo + (1 - parejo) * g.sesgo * 1.5;
            g.r += dt * 11e-5 * f * H.rapido(.2);
            suma += g.r;
            g.e.setAttribute("fill", g.r < .5 ? mezcla("rgb(150,170,90)", "rgb(200,150,80)", g.r * 2) : mezcla("rgb(200,150,80)", "rgb(50,30,20)", (g.r - .5) * 2));
        }));
        const r = suma / granos.length;
        H.g.r = r;
        med.poner(r);
    }));
    arrastrar(s, H, {
        abajo: p => {
            x0 = p[0] - off;
        },
        mover: p => {
            if (x0 === null) return;
            const n = clamp(p[0] - x0, -40, 40);
            mov = Math.min(1, mov + Math.abs(n - off) * .004);
            off = n;
            sarten.setAttribute("transform", `translate(${(140 + off).toFixed(1)} 110)`);
        },
        arriba: () => {
            x0 = null;
        }
    });
    H.boton("Done ✓", (() => {
        const rs = granos.map((g => g.r));
        const m = rs.reduce(((a, b) => a + b), 0) / rs.length;
        const desv = Math.sqrt(rs.reduce(((a, b) => a + (b - m) ** 2), 0) / rs.length);
        H.fin(H.notaDe(m - (A + B) / 2, (B - A) / 2, .3) - Math.max(0, desv - .05) * 6);
    }));
}

function pelusa(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    el(s, "circle", {
        cx: 150,
        cy: 110,
        r: 56,
        fill: "rgb(240,170,40)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "ellipse", {
        cx: 130,
        cy: 88,
        rx: 14,
        ry: 8,
        fill: "rgb(255,214,120)"
    });
    const az = H.azarDe("pelusa");
    const pelos = [];
    for (let i = 0; i < 40; i++) {
        const a = az() * Math.PI * 2;
        const r = Math.sqrt(az()) * 50;
        const x = 150 + r * Math.cos(a);
        const y = 110 + r * Math.sin(a);
        pelos.push({
            x: x,
            y: y,
            e: el(s, "circle", {
                cx: x.toFixed(1),
                cy: y.toFixed(1),
                r: 2.2,
                fill: "rgb(250,240,214)"
            }),
            v: 2
        });
    }
    const trapo = el(s, "rect", {
        x: -18,
        y: -12,
        width: 36,
        height: 24,
        rx: 5,
        fill: "rgb(200,220,240)",
        stroke: TINTA,
        "stroke-width": 2,
        opacity: 0
    });
    const cuenta = letrero(H, s, "", 150, 24);
    H.ayuda("Rub the fuzz off the lulo with the cloth");
    Object.assign(H.g, {
        tipo: "pelusa",
        cx: 150,
        cy: 110
    });
    let t0 = null;
    arrastrar(s, H, {
        abajo: p => {
            if (t0 === null) t0 = H.ahora();
            trapo.setAttribute("opacity", 1);
            trapo.setAttribute("transform", `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`);
        },
        mover: p => {
            trapo.setAttribute("transform", `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`);
            for (const q of pelos) if (q.v > 0 && Math.abs(q.x - p[0]) < 18 && Math.abs(q.y - p[1]) < 13) {
                q.v--;
                q.e.setAttribute("opacity", q.v ? .5 : 0);
            }
            const quedan = pelos.filter((q => q.v > 0)).length;
            cuenta.textContent = quedan ? `${quedan} left` : "";
            if (!quedan) H.fin(H.notaDe(Math.max(0, (H.ahora() - t0) / 1e3 - 4), H.ancho(3, .35), 8));
        },
        arriba: () => trapo.setAttribute("opacity", 0)
    });
}

function gota(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const T = 5200 / H.rapido(.2);
    const A = .88;
    const B = 1.1;
    el(s, "rect", {
        x: 22,
        y: 92,
        width: 120,
        height: 92,
        rx: 10,
        fill: OLLA,
        stroke: TINTA,
        "stroke-width": 3
    });
    const almibar = el(s, "rect", {
        x: 30,
        y: 104,
        width: 104,
        height: 72,
        rx: 4,
        fill: "rgb(250,236,190)"
    });
    const burb = [ 0, 1, 2, 3 ].map((i => el(s, "circle", {
        cx: 46 + i * 24,
        cy: 110,
        r: 4,
        fill: "rgb(255,246,214)",
        stroke: TINTA,
        "stroke-width": 1
    })));
    el(s, "text", {
        x: 82,
        y: 86,
        "text-anchor": "middle",
        "font-size": 10,
        class: "cocina-cuenta"
    }).textContent = "syrup";
    el(s, "path", {
        d: "M176 70 L184 186 L262 186 L270 70 Z",
        fill: "rgb(220,236,246)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "rect", {
        x: 180,
        y: 96,
        width: 86,
        height: 86,
        fill: "rgb(176,214,240)",
        opacity: .6
    });
    el(s, "text", {
        x: 223,
        y: 62,
        "text-anchor": "middle",
        "font-size": 10,
        class: "cocina-cuenta"
    }).textContent = "cold water";
    const cuchara = el(s, "g", {
        opacity: 0
    });
    el(cuchara, "ellipse", {
        cx: 0,
        cy: 0,
        rx: 10,
        ry: 6,
        fill: METAL,
        stroke: TINTA,
        "stroke-width": 2
    });
    const resultado = el(s, "g", {});
    const cartel = letrero(H, s, "Tap to test a drop", 150, 26);
    H.ayuda("Tap to drop a little syrup into the cold water · soft = not yet · CRACK = ready!");
    let k = 0;
    let pruebas = 0;
    let ocupado = false;
    Object.assign(H.g, {
        tipo: "gota",
        k: 0,
        a: A,
        b: B
    });
    H.bucle((t => {
        k = t / T;
        H.g.k = k;
        almibar.setAttribute("fill", k > 1.3 ? "rgb(110,60,30)" : mezcla("rgb(250,236,190)", "rgb(214,130,50)", k));
        burb.forEach(((b, i) => b.setAttribute("cy", (112 + (t / (30 - 12 * clamp(k)) + i * 9) % 28).toFixed(1))));
        if (k > 1.5) {
            cartel.textContent = "Burnt…";
            H.fin(1.2);
        }
    }));
    s.addEventListener("pointerdown", (e => {
        e.preventDefault();
        if (!H.vivo() || ocupado) return;
        ocupado = true;
        const kk = k;
        cuchara.setAttribute("opacity", 1);
        cuchara.setAttribute("transform", "translate(223 80)");
        resultado.innerHTML = "";
        const gotaE = el(resultado, "circle", {
            cx: 223,
            cy: 84,
            r: 6,
            fill: mezcla("rgb(250,236,190)", "rgb(214,130,50)", kk),
            stroke: TINTA,
            "stroke-width": 1.5
        });
        setTimeout((() => gotaE.setAttribute("cy", 160)), 60);
        setTimeout((() => {
            cuchara.setAttribute("opacity", 0);
            resultado.innerHTML = "";
            const col = mezcla("rgb(250,236,190)", "rgb(214,130,50)", kk);
            if (kk < A) {
                el(resultado, "ellipse", {
                    cx: 223,
                    cy: 168,
                    rx: 16,
                    ry: 6,
                    fill: col,
                    stroke: TINTA,
                    "stroke-width": 2
                });
                el(resultado, "text", {
                    x: 223,
                    y: 150,
                    "text-anchor": "middle",
                    "font-size": 13,
                    class: "cocina-cuenta"
                }).textContent = kk < .6 ? "runny" : "soft";
                cartel.textContent = "Not yet… keep boiling";
                pruebas++;
                H.sonar("no");
                ocupado = false;
                return;
            }
            for (const [dx, dy, r] of [ [ -12, 0, 0 ], [ 4, -4, 30 ], [ 14, 2, -20 ] ]) el(resultado, "path", {
                d: `M${223 + dx} ${166 + dy} l8 -6 l6 8 l-10 4 Z`,
                fill: col,
                stroke: TINTA,
                "stroke-width": 1.5,
                transform: `rotate(${r} ${223 + dx} ${166 + dy})`
            });
            el(resultado, "text", {
                x: 223,
                y: 146,
                "text-anchor": "middle",
                "font-size": 15,
                class: "cocina-cuenta"
            }).textContent = "CRACK!";
            cartel.textContent = "Ready to dip the fruit";
            H.sonar("grieta");
            H.fin(H.notaDe(kk - (A + B) / 2, (B - A) / 2 + H.ancho(.1, .35) - .1, .35) - .12 * Math.max(0, pruebas - 2));
        }), 380);
    }));
}

function pitillo(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const CX = 150;
    const TOL = H.ancho(8, .35);
    el(s, "path", {
        d: "M106 70 L116 186 L184 186 L194 70 Z",
        fill: "rgb(214,180,140)",
        stroke: TINTA,
        "stroke-width": 3
    });
    for (let i = 0; i < 6; i++) el(s, "circle", {
        cx: 126 + i * 10,
        cy: 176,
        r: 5,
        fill: "rgb(60,40,30)"
    });
    el(s, "ellipse", {
        cx: CX,
        cy: 70,
        rx: 44,
        ry: 9,
        fill: "rgb(240,236,246)",
        stroke: TINTA,
        "stroke-width": 2.5
    });
    el(s, "circle", {
        cx: CX,
        cy: 70,
        r: 3,
        fill: ROJO
    });
    const paja = el(s, "rect", {
        x: -6,
        y: -110,
        width: 12,
        height: 110,
        rx: 3,
        fill: "rgb(240,120,150)",
        stroke: TINTA,
        "stroke-width": 2
    });
    paja.setAttribute("transform", "translate(150 50)");
    H.ayuda("Swipe down fast to stab the straw through the lid, right in the middle");
    Object.assign(H.g, {
        tipo: "pitillo",
        cx: CX
    });
    let ini = null;
    arrastrar(s, H, {
        abajo: p => {
            ini = {
                p: p,
                t: H.ahora()
            };
        },
        mover: p => paja.setAttribute("transform", `translate(${p[0].toFixed(1)} ${Math.min(60, p[1]).toFixed(1)})`),
        arriba: p => {
            if (!ini) return;
            const dy = p[1] - ini.p[1];
            const v = dy / Math.max(1, H.ahora() - ini.t);
            ini = null;
            if (dy < 40) return paja.setAttribute("transform", "translate(150 50)");
            paja.setAttribute("transform", `translate(${p[0].toFixed(1)} 110)`);
            H.sonar("enganche");
            const lento = v < .35 ? .8 : 0;
            H.fin(H.notaDe(p[0] - CX, TOL, 25) - lento);
        }
    });
}

function voltear(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const A = .55;
    const B = .95;
    const bol = paso.que === "bol";
    el(s, "ellipse", {
        cx: 150,
        cy: 168,
        rx: 90,
        ry: 18,
        fill: "rgb(250,250,246)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const cosa = el(s, "g", {});
    if (bol) {
        el(cosa, "path", {
            d: "M-50 -30 Q-46 30 0 32 Q46 30 50 -30 Z",
            fill: "rgb(236,240,246)",
            stroke: TINTA,
            "stroke-width": 3
        });
    } else {
        el(cosa, "ellipse", {
            cx: 0,
            cy: 0,
            rx: 60,
            ry: 16,
            fill: "rgb(60,60,70)",
            stroke: TINTA,
            "stroke-width": 3
        });
        el(cosa, "rect", {
            x: 56,
            y: -5,
            width: 50,
            height: 10,
            rx: 4,
            fill: "rgb(60,60,70)",
            stroke: TINTA,
            "stroke-width": 2
        });
    }
    cosa.setAttribute("transform", "translate(150 110)");
    const med = medidor(H, s, {
        x: 70,
        y: 18,
        w: 160,
        h: 10,
        a: A / 1.5,
        b: B / 1.5
    });
    H.ayuda("Flip it onto the plate: one swipe up · not too soft, not too hard");
    Object.assign(H.g, {
        tipo: "voltear",
        a: A,
        b: B
    });
    let ini = null;
    arrastrar(s, H, {
        abajo: p => {
            ini = {
                p: p,
                t: H.ahora()
            };
        },
        arriba: p => {
            if (!ini) return;
            const dy = ini.p[1] - p[1];
            const v = dy / Math.max(1, H.ahora() - ini.t);
            ini = null;
            if (dy < 25) return;
            med.poner(v / 1.5);
            cosa.setAttribute("transform", "translate(150 150) rotate(180)");
            if (bol) el(s, "path", {
                d: "M110 166 Q112 120 150 118 Q188 120 190 166 Z",
                fill: "rgb(250,226,140)",
                stroke: TINTA,
                "stroke-width": 2.5
            }); else for (let i = 0; i < 4; i++) el(s, "path", {
                d: `M${110 + i * 22} 166 q10 -14 20 0 Z`,
                fill: "rgb(220,170,90)",
                stroke: TINTA,
                "stroke-width": 2
            });
            const nota = H.notaDe(v - (A + B) / 2, (B - A) / 2 + H.ancho(.1, .35) - .1, .5);
            H.sonar(nota >= 2.5 ? "tocar" : "no");
            setTimeout((() => cosa.setAttribute("opacity", 0)), 250);
            H.fin(nota);
        }
    });
}

function extender(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const CX = 140;
    const CY = 110;
    const R = 74;
    el(s, "circle", {
        cx: CX,
        cy: CY,
        r: R + 8,
        fill: "rgb(60,60,70)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const anillos = [];
    for (let i = 0; i < 6; i++) anillos.push({
        v: i === 0 ? 1 : 0,
        e: el(s, "circle", {
            cx: CX,
            cy: CY,
            r: R * (i + 1) / 6,
            fill: "none",
            stroke: "rgb(250,222,150)",
            "stroke-width": R / 6 + .5,
            opacity: i === 0 ? 1 : 0
        })
    });
    anillos.forEach(((a, i) => a.e.setAttribute("r", (R * (i + .5) / 6).toFixed(1))));
    const paleta = el(s, "g", {
        transform: `translate(${CX + R + 30} ${CY})`
    });
    el(paleta, "rect", {
        x: -3,
        y: -40,
        width: 6,
        height: 40,
        fill: MADERA,
        stroke: TINTA,
        "stroke-width": 2
    });
    el(paleta, "rect", {
        x: -16,
        y: -4,
        width: 32,
        height: 8,
        rx: 3,
        fill: MADERA_O,
        stroke: TINTA,
        "stroke-width": 2
    });
    const cuenta = letrero(H, s, "", 284, 30, "end");
    H.ayuda("Spread the batter with the paddle in circles, from the middle out to the edge");
    Object.assign(H.g, {
        tipo: "extender",
        cx: CX,
        cy: CY,
        r: R
    });
    let previo = null;
    let saltos = 0;
    arrastrar(s, H, {
        abajo: p => {
            previo = p;
        },
        mover: p => {
            paleta.setAttribute("transform", `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`);
            const d = Math.hypot(p[0] - CX, p[1] - CY);
            const i = Math.min(5, Math.floor(d / R * 6));
            const mov = Math.hypot(p[0] - previo[0], p[1] - previo[1]);
            previo = p;
            if (d > R + 6) return;
            if (anillos[i].v < 1) {
                if (i > 0 && anillos[i - 1].v < 1) {
                    saltos += mov * .002;
                    return;
                }
                anillos[i].v = Math.min(1, anillos[i].v + mov * .006);
                anillos[i].e.setAttribute("opacity", anillos[i].v.toFixed(2));
            }
            const hecho = anillos.filter((a => a.v >= 1)).length;
            cuenta.textContent = `${Math.round(hecho / 6 * 100)}%`;
            H.g.anillo = hecho;
            if (hecho >= 6) {
                previo = null;
                H.fin(Math.max(1, 3 - saltos));
            }
        }
    });
}

function helado(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const OBJ = 120;
    const TOL = H.ancho(24, .35);
    el(s, "rect", {
        x: 40,
        y: 90,
        width: 150,
        height: 90,
        rx: 8,
        fill: "rgb(250,240,246)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "rect", {
        x: 48,
        y: 100,
        width: 134,
        height: 70,
        rx: 4,
        fill: "rgb(250,200,214)"
    });
    const bola = el(s, "circle", {
        cx: 250,
        cy: 120,
        r: 0,
        fill: "rgb(250,200,214)",
        stroke: TINTA,
        "stroke-width": 2.5
    });
    el(s, "path", {
        d: "M220 130 L250 186 L280 130 Z",
        fill: "rgb(230,180,110)",
        stroke: TINTA,
        "stroke-width": 2.5
    });
    const traz = el(s, "path", {
        d: "",
        fill: "none",
        stroke: "rgb(214,150,170)",
        "stroke-width": 8,
        "stroke-linecap": "round"
    });
    H.ayuda("Drag the scoop across the ice cream in one stroke · release for a round ball");
    Object.assign(H.g, {
        tipo: "helado",
        obj: OBJ
    });
    let pts = null;
    let largo = 0;
    arrastrar(s, H, {
        abajo: p => {
            pts = [ p ];
            largo = 0;
        },
        mover: p => {
            if (!pts) return;
            const q = pts[pts.length - 1];
            if (p[0] > 40 && p[0] < 190 && p[1] > 90 && p[1] < 180) largo += Math.hypot(p[0] - q[0], p[1] - q[1]);
            pts.push(p);
            traz.setAttribute("d", pts.map(((z, i) => `${i ? "L" : "M"}${z[0].toFixed(1)} ${z[1].toFixed(1)}`)).join(" "));
            bola.setAttribute("r", Math.min(34, largo / 5).toFixed(1));
        },
        arriba: () => {
            if (!pts) return;
            pts = null;
            if (largo < 30) return;
            H.fin(H.notaDe(largo - OBJ, TOL, 70));
        }
    });
}

function unaDireccion(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const CX = 140;
    const CY = 116;
    el(s, "path", {
        d: `M${CX - 76} ${CY - 26} Q${CX - 70} ${CY + 66} ${CX} ${CY + 68} Q${CX + 70} ${CY + 66} ${CX + 76} ${CY - 26} Z`,
        fill: "rgb(236,240,246)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const relleno = el(s, "ellipse", {
        cx: CX,
        cy: CY - 18,
        rx: 66,
        ry: 16,
        fill: "rgb(214,150,130)"
    });
    const motas = [];
    for (let i = 0; i < 8; i++) motas.push(el(s, "circle", {
        cx: CX - 50 + i * 14,
        cy: CY - 18 + (i % 3 - 1) * 6,
        r: 3,
        fill: "rgb(130,180,90)"
    }));
    const palillos = el(s, "g", {});
    el(palillos, "rect", {
        x: -4,
        y: -56,
        width: 3,
        height: 56,
        fill: MADERA,
        stroke: TINTA,
        "stroke-width": 1
    });
    el(palillos, "rect", {
        x: 2,
        y: -56,
        width: 3,
        height: 56,
        fill: MADERA,
        stroke: TINTA,
        "stroke-width": 1
    });
    const med = medidor(H, s, {
        x: 252,
        y: 40,
        w: 12,
        h: 140,
        a: .97,
        b: 1,
        vertical: true
    });
    const aviso = letrero(H, s, "", 150, 24);
    H.ayuda("Stir the filling in ONE direction only until it turns sticky");
    Object.assign(H.g, {
        tipo: "una_direccion",
        cx: CX,
        cy: CY - 18,
        v: 0
    });
    let previo = null;
    let sentido = 0;
    let v = 0;
    let cambios = 0;
    let ang = 0;
    arrastrar(s, H, {
        abajo: p => {
            previo = Math.atan2(p[1] - (CY - 18), p[0] - CX);
        },
        mover: p => {
            const a = Math.atan2(p[1] - (CY - 18), p[0] - CX);
            let d = a - previo;
            if (d > Math.PI) d -= 2 * Math.PI;
            if (d < -Math.PI) d += 2 * Math.PI;
            previo = a;
            palillos.setAttribute("transform", `translate(${clamp(p[0], CX - 60, CX + 60).toFixed(1)} ${clamp(p[1], CY - 40, CY + 10).toFixed(1)})`);
            if (Math.abs(d) < .01 || Math.hypot(p[0] - CX, p[1] - CY + 18) < 10) return;
            if (!sentido) sentido = Math.sign(d);
            if (Math.sign(d) !== sentido) {
                if (Math.abs(d) > .08) {
                    cambios++;
                    v = Math.max(0, v - .15);
                    aviso.textContent = "Same direction!";
                    H.sonar("no");
                    sentido = Math.sign(d);
                }
                return;
            }
            aviso.textContent = "";
            v = Math.min(1, v + Math.abs(d) * .02 * H.rapido(.2));
            ang += d;
            H.g.v = v;
            med.poner(v);
            relleno.setAttribute("fill", mezcla("rgb(214,150,130)", "rgb(196,120,110)", v));
            motas.forEach(((m, i) => {
                const a2 = ang + i * Math.PI * 2 / motas.length;
                const rr = .35 + .5 * (i % 3 / 2);
                m.setAttribute("cx", (CX + 60 * rr * Math.cos(a2)).toFixed(1));
                m.setAttribute("cy", (CY - 18 + 13 * rr * Math.sin(a2)).toFixed(1));
            }));
            if (v >= 1) {
                previo = null;
                H.fin(Math.max(1, 3 - .35 * cambios));
            }
        }
    });
}

function tofuPalma(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const N = H.mas(paso.n || 4, 1);
    const VLIM = .22 * H.rapido(.15);
    const PIEL = "rgb(250,214,184)";
    el(s, "rect", {
        x: 210,
        y: 112,
        width: 70,
        height: 46,
        rx: 14,
        fill: PIEL,
        stroke: TINTA,
        "stroke-width": 3
    });
    for (let i = 0; i < 4; i++) el(s, "rect", {
        x: 20,
        y: 96 + i * 16,
        width: 82,
        height: 15,
        rx: 7.5,
        fill: PIEL,
        stroke: TINTA,
        "stroke-width": 2.5
    });
    el(s, "path", {
        d: "M150 160 Q150 196 108 192 Q94 188 104 176 Q124 172 132 158 Z",
        fill: PIEL,
        stroke: TINTA,
        "stroke-width": 2.5
    });
    el(s, "rect", {
        x: 86,
        y: 92,
        width: 140,
        height: 74,
        rx: 22,
        fill: PIEL,
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "path", {
        d: "M110 150 Q150 160 196 140",
        fill: "none",
        stroke: "rgb(226,180,150)",
        "stroke-width": 2
    });
    el(s, "rect", {
        x: 96,
        y: 86,
        width: 108,
        height: 62,
        rx: 6,
        fill: "rgb(252,250,240)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const guias = [];
    for (let i = 0; i < N; i++) {
        const x = 96 + 108 * (i + 1) / (N + 1);
        guias.push({
            x: x,
            e: el(s, "line", {
                x1: x,
                y1: 80,
                x2: x,
                y2: 154,
                stroke: VERDE_O,
                "stroke-width": 2,
                "stroke-dasharray": "4 4"
            }),
            hecho: false
        });
    }
    const cortes = el(s, "g", {});
    const med = medidor(H, s, {
        x: 70,
        y: 18,
        w: 160,
        h: 10,
        a: 0,
        b: 1 / 1.6,
        rojo: 1 - 1 / 1.6
    });
    const cuenta = letrero(H, s, `0 / ${N}`, 284, 50, "end");
    H.ayuda("Cut the soft tofu on your palm: slow, gentle strokes down each line");
    Object.assign(H.g, {
        tipo: "tofu",
        guias: guias.map((g => g.x)),
        vlim: VLIM
    });
    let ini = null;
    const notas = [];
    arrastrar(s, H, {
        abajo: p => {
            ini = {
                p: p,
                t: H.ahora()
            };
        },
        arriba: p => {
            if (!ini) return;
            const dy = p[1] - ini.p[1];
            const v = Math.abs(dy) / Math.max(1, H.ahora() - ini.t);
            const x = (p[0] + ini.p[0]) / 2;
            ini = null;
            if (Math.abs(dy) < 30) return;
            const g = guias.find((q => !q.hecho && Math.abs(q.x - x) < 14));
            if (!g) return H.sonar("no");
            g.hecho = true;
            g.e.setAttribute("opacity", 0);
            med.poner(v / VLIM / 1.6);
            const roto = v > VLIM;
            notas.push(roto ? H.notaDe(v / VLIM - 1, .01, 1) : H.notaDe(Math.abs(x - g.x), H.ancho(6, .35), 14));
            el(cortes, "line", {
                x1: x,
                y1: 88,
                x2: x + (roto ? 8 : 0),
                y2: 146,
                stroke: TINTA,
                "stroke-width": roto ? 3 : 1.5
            });
            H.sonar(roto ? "no" : "tocar");
            const n = guias.filter((q => q.hecho)).length;
            cuenta.textContent = `${n} / ${N}`;
            if (n >= N) H.fin(H.promedio(notas));
        }
    });
}

function pintarHuevo(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const CX = 150;
    const CY = 110;
    const R = 50;
    el(s, "circle", {
        cx: CX,
        cy: CY,
        r: R + 14,
        fill: "rgb(222,170,100)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "circle", {
        cx: CX,
        cy: CY,
        r: R,
        fill: "rgb(236,196,130)",
        stroke: "rgb(190,140,80)",
        "stroke-width": 3
    });
    for (let i = 0; i < 8; i++) el(s, "line", {
        x1: CX,
        y1: CY,
        x2: CX + R * Math.cos(i * Math.PI / 4),
        y2: CY + R * Math.sin(i * Math.PI / 4),
        stroke: "rgb(200,150,90)",
        "stroke-width": 2
    });
    const pintado = el(s, "g", {});
    const az = H.azarDe("pintar");
    const pts = [];
    for (let i = 0; i < 30; i++) {
        const a = az() * Math.PI * 2;
        const r = Math.sqrt(az()) * (R - 6);
        pts.push({
            x: CX + r * Math.cos(a),
            y: CY + r * Math.sin(a),
            ok: false
        });
    }
    const cuenta = letrero(H, s, "", 150, 24);
    H.ayuda("Brush egg over the pattern only · don't paint the sides");
    Object.assign(H.g, {
        tipo: "pintar",
        cx: CX,
        cy: CY,
        r: R
    });
    let fuera = 0;
    let previo = null;
    arrastrar(s, H, {
        abajo: p => {
            previo = p;
        },
        mover: p => {
            const d = Math.hypot(p[0] - CX, p[1] - CY);
            const m = Math.hypot(p[0] - previo[0], p[1] - previo[1]);
            previo = p;
            el(pintado, "circle", {
                cx: p[0].toFixed(1),
                cy: p[1].toFixed(1),
                r: 6,
                fill: d > R + 4 ? "rgba(255,190,60,0.5)" : "rgba(255,210,90,0.55)"
            });
            if (d > R + 4) fuera += m;
            for (const q of pts) if (!q.ok && Math.hypot(q.x - p[0], q.y - p[1]) < 12) q.ok = true;
            const n = pts.filter((q => q.ok)).length;
            cuenta.textContent = `${Math.round(n / pts.length * 100)}%`;
            if (n >= pts.length) {
                previo = null;
                H.fin(H.notaDe(fuera, H.ancho(30, .35), 160));
            }
        }
    });
}

function glasear(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const N = paso.n || 4;
    const P = 3600 / H.rapido(.25);
    const TOL = H.ancho(7, .35);
    const X0 = 60;
    const X1 = 240;
    const Y0 = 70;
    const ALTO = 90;
    const FR = ALTO / 2;
    const NF = N * 2;
    el(s, "rect", {
        x: 30,
        y: 168,
        width: 240,
        height: 22,
        rx: 6,
        fill: "rgb(60,60,70)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const brasas = [ 0, 1, 2, 3, 4 ].map((i => el(s, "circle", {
        cx: 60 + i * 45,
        cy: 178,
        r: 6,
        fill: "rgb(240,110,50)"
    })));
    el(s, "line", {
        x1: 20,
        y1: Y0 + ALTO / 2,
        x2: 280,
        y2: Y0 + ALTO / 2,
        stroke: METAL,
        "stroke-width": 5
    });
    el(s, "rect", {
        x: X0,
        y: Y0,
        width: X1 - X0,
        height: ALTO,
        rx: 14,
        fill: "rgb(196,80,60)"
    });
    const franjasG = el(s, "g", {});
    const franjas = [];
    for (let i = 0; i < NF; i++) franjas.push({
        palida: i % 2 === 0,
        hecha: false,
        e: el(franjasG, "rect", {
            x: X0 + 4,
            y: 0,
            width: X1 - X0 - 8,
            height: FR - 4,
            rx: 4,
            fill: i % 2 === 0 ? "rgb(240,190,170)" : "rgb(196,80,60)"
        })
    });
    el(s, "rect", {
        x: X0,
        y: Y0,
        width: X1 - X0,
        height: ALTO,
        rx: 14,
        fill: "none",
        stroke: TINTA,
        "stroke-width": 3
    });
    const ZY = Y0 + ALTO / 2;
    el(s, "rect", {
        x: X0 - 6,
        y: ZY - FR / 2,
        width: X1 - X0 + 12,
        height: FR,
        fill: "none",
        stroke: VERDE,
        "stroke-width": 3,
        "stroke-dasharray": "6 5"
    });
    const brocha = el(s, "g", {
        transform: `translate(${X1 + 22} ${ZY})`
    });
    el(brocha, "rect", {
        x: 0,
        y: -4,
        width: 30,
        height: 8,
        fill: MADERA,
        stroke: TINTA,
        "stroke-width": 2
    });
    el(brocha, "rect", {
        x: -12,
        y: -10,
        width: 14,
        height: 20,
        rx: 3,
        fill: "rgb(220,150,60)",
        stroke: TINTA,
        "stroke-width": 2
    });
    const cuenta = letrero(H, s, `0 / ${N}`, 14, 24, "start");
    const aviso = letrero(H, s, "", 150, 24);
    H.ayuda("Tap when a PALE stripe is inside the green box to brush it with honey");
    let off = 0;
    let hechas = 0;
    const notas = [];
    Object.assign(H.g, {
        tipo: "glasear",
        P: P,
        t0: H.t0,
        n: 0,
        N: N,
        nf: NF,
        fr: FR
    });
    const centro = i => {
        const total = NF * FR;
        let y = (i * FR - off) % total;
        if (y < 0) y += total;
        return Y0 + y - total / 2 + ALTO / 2 + FR / 2;
    };
    H.bucle((t => {
        off = t / P * NF * FR % (NF * FR);
        franjas.forEach(((f, i) => {
            const y1 = Math.max(Y0 + 4, centro(i) - FR / 2 + 2);
            const y2 = Math.min(Y0 + ALTO - 4, centro(i) + FR / 2 - 2);
            if (y2 <= y1) return f.e.setAttribute("opacity", 0);
            f.e.setAttribute("opacity", 1);
            f.e.setAttribute("y", y1.toFixed(1));
            f.e.setAttribute("height", (y2 - y1).toFixed(1));
        }));
        brasas.forEach(((b, i) => b.setAttribute("r", (6 + Math.sin(t / 150 + i) * 1.5).toFixed(1))));
        let mejor = null;
        franjas.forEach(((f, i) => {
            if (!f.palida || f.hecha) return;
            const dy = centro(i) - ZY;
            if (dy > -FR / 2 && (mejor === null || dy < mejor)) mejor = dy;
        }));
        H.g.dy = mejor;
        H.g.vel = NF * FR / P;
    }));
    s.addEventListener("pointerdown", (e => {
        e.preventDefault();
        if (!H.vivo()) return;
        brocha.setAttribute("transform", `translate(${X1 - 10} ${ZY})`);
        setTimeout((() => brocha.setAttribute("transform", `translate(${X1 + 22} ${ZY})`)), 160);
        let mej = -1;
        let dm = 1e9;
        franjas.forEach(((f, i) => {
            const d = Math.abs(centro(i) - ZY);
            if (d < dm) {
                dm = d;
                mej = i;
            }
        }));
        const f = franjas[mej];
        if (!f.palida || f.hecha || dm > FR / 2) {
            aviso.textContent = f.hecha ? "Already glazed" : "Wait for a pale one";
            notas.push(1.6);
            H.sonar("no");
        } else {
            f.hecha = true;
            f.e.setAttribute("fill", "rgb(222,130,40)");
            hechas++;
            aviso.textContent = "";
            notas.push(H.notaDe(dm, TOL, FR / 2));
            H.sonar("tocar");
        }
        H.g.n = hechas;
        cuenta.textContent = `${hechas} / ${N}`;
        if (hechas >= N) H.fin(H.promedio(notas));
    }));
}

function blanquear(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const A = .8;
    const B = 1.2;
    const T = 1500 / H.rapido(.2);
    el(s, "rect", {
        x: 20,
        y: 100,
        width: 120,
        height: 84,
        rx: 8,
        fill: OLLA,
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "rect", {
        x: 28,
        y: 112,
        width: 104,
        height: 64,
        fill: "rgb(176,210,226)"
    });
    for (let i = 0; i < 4; i++) el(s, "circle", {
        cx: 42 + i * 26,
        cy: 116,
        r: 4,
        fill: "rgb(240,250,255)",
        stroke: TINTA,
        "stroke-width": 1
    });
    el(s, "text", {
        x: 80,
        y: 94,
        "text-anchor": "middle",
        "font-size": 10,
        class: "cocina-cuenta"
    }).textContent = "boiling";
    el(s, "path", {
        d: "M164 110 Q168 186 222 188 Q276 186 280 110 Z",
        fill: "rgb(236,244,250)",
        stroke: TINTA,
        "stroke-width": 3
    });
    for (const [x, y] of [ [ 196, 120 ], [ 230, 126 ], [ 252, 118 ] ]) el(s, "rect", {
        x: x,
        y: y,
        width: 14,
        height: 12,
        rx: 2,
        fill: "rgb(230,246,255)",
        stroke: "rgb(150,190,220)",
        "stroke-width": 1.5
    });
    el(s, "text", {
        x: 222,
        y: 104,
        "text-anchor": "middle",
        "font-size": 10,
        class: "cocina-cuenta"
    }).textContent = "ice water";
    const bok = el(s, "g", {});
    el(bok, "ellipse", {
        cx: 0,
        cy: -8,
        rx: 12,
        ry: 16,
        fill: "rgb(110,170,80)",
        stroke: TINTA,
        "stroke-width": 2
    });
    el(bok, "rect", {
        x: -5,
        y: 2,
        width: 10,
        height: 18,
        rx: 4,
        fill: "rgb(230,240,214)",
        stroke: TINTA,
        "stroke-width": 2
    });
    bok.setAttribute("transform", "translate(150 40)");
    const med = medidor(H, s, {
        x: 70,
        y: 14,
        w: 160,
        h: 10,
        a: A / 1.8,
        b: B / 1.8
    });
    H.ayuda("Drag the bok choy into the boiling water, then quickly into the ice water");
    let enOlla = false;
    let tD = 0;
    let tA = 0;
    let k = 0;
    let fijo = null;
    Object.assign(H.g, {
        tipo: "blanquear",
        k: 0,
        a: A,
        b: B
    });
    H.bucle((t => {
        tA = t;
        if (enOlla) {
            k = (t - tD) / T;
            H.g.k = k;
            med.poner(k / 1.8);
            bok.firstChild.setAttribute("fill", mezcla("rgb(110,170,80)", k > 1.4 ? "rgb(120,130,60)" : "rgb(60,190,80)", clamp(k)));
        }
    }));
    arrastrar(s, H, {
        mover: p => {
            bok.setAttribute("transform", `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`);
            if (fijo !== null) return;
            if (!enOlla && p[0] < 140 && p[1] > 108) {
                enOlla = true;
                tD = tA;
                H.sonar("tocar");
            }
            if (enOlla && p[0] > 166 && p[1] > 112) {
                fijo = k;
                enOlla = false;
                H.fin(H.notaDe(k - (A + B) / 2, (B - A) / 2 + H.ancho(.15, .35) - .15, .6));
            }
        }
    });
}

function despegar(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const CX = 150;
    const CY = 112;
    el(s, "ellipse", {
        cx: CX,
        cy: CY,
        rx: 120,
        ry: 74,
        fill: "rgb(60,60,70)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const pasta = el(s, "ellipse", {
        cx: CX,
        cy: CY,
        rx: 90,
        ry: 52,
        fill: "rgb(150,50,56)"
    });
    const pegado = [];
    for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2;
        pegado.push(el(s, "ellipse", {
            cx: CX + 96 * Math.cos(a),
            cy: CY + 58 * Math.sin(a),
            rx: 9,
            ry: 5,
            fill: "rgb(130,40,46)"
        }));
    }
    const quemado = el(s, "g", {
        opacity: 0
    });
    for (let i = 0; i < 5; i++) el(quemado, "circle", {
        cx: CX - 40 + i * 20,
        cy: CY + 10,
        r: 5,
        fill: "rgb(50,20,20)"
    });
    const espatula = el(s, "g", {});
    el(espatula, "rect", {
        x: -3,
        y: -50,
        width: 6,
        height: 46,
        fill: MADERA,
        stroke: TINTA,
        "stroke-width": 2
    });
    el(espatula, "rect", {
        x: -12,
        y: -6,
        width: 24,
        height: 10,
        rx: 3,
        fill: MADERA_O,
        stroke: TINTA,
        "stroke-width": 2
    });
    espatula.setAttribute("transform", `translate(${CX + 50} ${CY})`);
    const med = medidor(H, s, {
        x: 276,
        y: 40,
        w: 12,
        h: 140,
        vertical: true
    });
    H.ayuda("Stir the red bean paste in circles until it comes away from the wok · don't stop or it burns");
    Object.assign(H.g, {
        tipo: "despegar",
        cx: CX,
        cy: CY,
        v: 0
    });
    let previo = null;
    let v = 0;
    let quema = 0;
    let tMov = 0;
    let tU = 0;
    H.bucle((t => {
        const dt = Math.min(40, t - tU);
        tU = t;
        if (v > .05 && H.ahora() - tMov > 500) quema += dt * 2e-4;
        quemado.setAttribute("opacity", clamp(quema * 2).toFixed(2));
    }));
    arrastrar(s, H, {
        abajo: p => {
            previo = Math.atan2(p[1] - CY, p[0] - CX);
        },
        mover: p => {
            const a = Math.atan2(p[1] - CY, p[0] - CX);
            let d = a - previo;
            if (d > Math.PI) d -= 2 * Math.PI;
            if (d < -Math.PI) d += 2 * Math.PI;
            previo = a;
            espatula.setAttribute("transform", `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`);
            if (Math.abs(d) < .01) return;
            tMov = H.ahora();
            v = Math.min(1, v + Math.abs(d) * .013 * H.rapido(.2));
            H.g.v = v;
            med.poner(v);
            pegado.forEach(((q, i) => q.setAttribute("opacity", i < 10 * (1 - v) ? 1 : 0)));
            pasta.setAttribute("rx", (90 - 40 * v).toFixed(1));
            pasta.setAttribute("ry", (52 - 20 * v).toFixed(1));
            pasta.setAttribute("fill", mezcla("rgb(150,50,56)", "rgb(110,30,40)", v));
            if (v >= 1) {
                previo = null;
                H.fin(H.notaDe(quema, H.ancho(.08, .35), .4));
            }
        }
    });
}

function rizar(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const CX = 150;
    const CY = 106;
    const R = 62;
    const TOL = H.ancho(7, .35);
    el(s, "circle", {
        cx: CX,
        cy: CY,
        r: R + 4,
        fill: "rgb(250,226,140)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "circle", {
        cx: CX,
        cy: CY,
        r: R,
        fill: "none",
        stroke: VERDE_O,
        "stroke-width": 2,
        "stroke-dasharray": "5 5"
    });
    const segs = [];
    for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2;
        segs.push({
            a: a,
            e: el(s, "circle", {
                cx: CX + (R + 4) * Math.cos(a),
                cy: CY + (R + 4) * Math.sin(a),
                r: 7,
                fill: "rgb(250,226,140)",
                stroke: TINTA,
                "stroke-width": 2,
                opacity: 0
            }),
            ok: false
        });
    }
    const cuenta = letrero(H, s, "0%", 284, 30, "end");
    H.ayuda("Roll just the edge all the way around (follow the dashed circle) to make it frilly");
    Object.assign(H.g, {
        tipo: "rizar",
        cx: CX,
        cy: CY,
        r: R
    });
    const desv = [];
    arrastrar(s, H, {
        mover: p => {
            const d = Math.hypot(p[0] - CX, p[1] - CY);
            if (d < R - 30) return;
            desv.push(Math.abs(d - R));
            const a = (Math.atan2(p[1] - CY, p[0] - CX) + Math.PI * 2) % (Math.PI * 2);
            const i = Math.round(a / (Math.PI * 2) * 16) % 16;
            if (!segs[i].ok) {
                segs[i].ok = true;
                segs[i].e.setAttribute("opacity", 1);
            }
            const n = segs.filter((q => q.ok)).length;
            cuenta.textContent = `${Math.round(n / 16 * 100)}%`;
            if (n >= 16) H.fin(H.notaDe(desv.reduce(((x, y) => x + y), 0) / desv.length, TOL, 14));
        }
    });
}

function yemas(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const N = paso.n || 4;
    el(s, "ellipse", {
        cx: 150,
        cy: 112,
        rx: 120,
        ry: 70,
        fill: "rgb(250,250,246)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const pure = el(s, "ellipse", {
        cx: 150,
        cy: 112,
        rx: 0,
        ry: 0,
        fill: "rgb(255,170,40)"
    });
    const az = H.azarDe("yemas");
    const ys = [];
    for (let i = 0; i < N; i++) ys.push({
        x: 90 + i * 40,
        y: 100 + az() * 24,
        vx: (az() - .5) * .03,
        hp: 3,
        e: el(s, "circle", {
            r: 14,
            fill: "rgb(255,150,30)",
            stroke: TINTA,
            "stroke-width": 2.5
        })
    });
    const cuenta = letrero(H, s, `0 / ${N}`);
    H.ayuda("Mash each salted yolk with the fork (3 taps each)");
    let malos = 0;
    let tU = 0;
    Object.assign(H.g, {
        tipo: "yemas",
        yemas: []
    });
    H.bucle((t => {
        const dt = Math.min(40, t - tU);
        tU = t;
        H.g.yemas = ys.filter((q => q.hp > 0)).map((q => ({
            x: q.x,
            y: q.y
        })));
        for (const q of ys) {
            if (q.hp <= 0) continue;
            q.x += q.vx * dt;
            if (q.x < 60 || q.x > 240) q.vx = -q.vx;
            q.e.setAttribute("cx", q.x.toFixed(1));
            q.e.setAttribute("cy", q.y.toFixed(1));
        }
    }));
    s.addEventListener("pointerdown", (e => {
        e.preventDefault();
        if (!H.vivo()) return;
        const [x, y] = H.aSvg(e);
        const q = ys.find((z => z.hp > 0 && Math.hypot(z.x - x, z.y - y) < 18));
        if (!q) {
            malos++;
            return H.sonar("no");
        }
        q.hp--;
        H.sonar("tocar");
        q.e.setAttribute("r", 6 + q.hp * 3);
        q.e.setAttribute("ry", 8);
        if (q.hp <= 0) q.e.setAttribute("opacity", 0);
        const n = ys.filter((z => z.hp <= 0)).length;
        pure.setAttribute("rx", 20 * n);
        pure.setAttribute("ry", 9 * n);
        cuenta.textContent = `${n} / ${N}`;
        if (n >= N) H.fin(Math.max(1, 3 - .2 * malos));
    }));
}

function chile(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const A = .6;
    const B = .78;
    el(s, "path", {
        d: "M80 120 Q84 188 150 190 Q216 188 220 120 Z",
        fill: "rgb(236,240,246)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const chil = el(s, "ellipse", {
        cx: 150,
        cy: 124,
        rx: 64,
        ry: 14,
        fill: "rgb(160,60,40)"
    });
    for (let i = 0; i < 12; i++) el(s, "circle", {
        cx: 100 + i % 6 * 20,
        cy: 120 + Math.floor(i / 6) * 8,
        r: 2,
        fill: "rgb(240,220,140)"
    });
    const olla = el(s, "g", {
        transform: "translate(230 40)"
    });
    el(olla, "rect", {
        x: -26,
        y: -16,
        width: 52,
        height: 32,
        rx: 6,
        fill: "rgb(60,60,70)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(olla, "rect", {
        x: 24,
        y: -4,
        width: 34,
        height: 8,
        rx: 3,
        fill: "rgb(60,60,70)",
        stroke: TINTA,
        "stroke-width": 2
    });
    const chorro = el(s, "rect", {
        x: 196,
        y: 52,
        width: 6,
        height: 0,
        fill: "rgb(240,190,60)"
    });
    const chis = el(s, "g", {});
    const cs = [ 0, 1, 2, 3, 4 ].map((() => el(chis, "circle", {
        r: 2.5,
        fill: "rgb(255,240,180)",
        opacity: 0
    })));
    const med = medidor(H, s, {
        x: 20,
        y: 40,
        w: 12,
        h: 140,
        a: A,
        b: B,
        vertical: true,
        rojo: .12
    });
    H.ayuda("Hold to pour the hot oil over the chili · let go when it's bright red (green)");
    let on = false;
    let v = 0;
    let tU = 0;
    Object.assign(H.g, {
        tipo: "chile",
        v: 0,
        a: A,
        b: B
    });
    H.bucle((t => {
        const dt = Math.min(40, t - tU);
        tU = t;
        if (on) v = Math.min(1.1, v + dt * 35e-5 * H.rapido(.2) * (.7 + .6 * Math.abs(Math.sin(t / 200))));
        H.g.v = v;
        med.poner(v);
        chil.setAttribute("fill", v > .9 ? "rgb(90,30,20)" : mezcla("rgb(160,60,40)", "rgb(230,40,30)", v / .7));
        chorro.setAttribute("height", on ? 66 : 0);
        olla.setAttribute("transform", on ? "translate(222 44) rotate(-30)" : "translate(230 40)");
        cs.forEach(((c, i) => {
            c.setAttribute("opacity", on ? 1 : 0);
            c.setAttribute("cx", (110 + i * 20 + Math.sin(t / 50 + i) * 6).toFixed(1));
            c.setAttribute("cy", (112 - (t / 6 + i * 13) % 26).toFixed(1));
        }));
    }));
    arrastrar(s, H, {
        abajo: () => {
            on = true;
        },
        arriba: () => {
            on = false;
            if (v < .15) return;
            H.fin(H.notaDe(v - (A + B) / 2, (B - A) / 2 + H.ancho(.08, .35) - .08, .3));
        }
    });
}

function aplaudir(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const N = paso.n || 6;
    el(s, "ellipse", {
        cx: 150,
        cy: 150,
        rx: 110,
        ry: 22,
        fill: "rgb(250,250,246)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const pan = el(s, "g", {});
    const capas = [];
    for (let i = 0; i < 5; i++) capas.push(el(pan, "ellipse", {
        cx: 150,
        cy: 136 - i * 6,
        rx: 70,
        ry: 8,
        fill: i % 2 ? "rgb(230,190,110)" : "rgb(246,220,150)",
        stroke: TINTA,
        "stroke-width": 1.5
    }));
    const mi = mano(H, s, 50, 120, 1.3, true);
    const md = mano(H, s, 250, 120, 1.3, false);
    const cuenta = letrero(H, s, `0 / ${N}`);
    H.ayuda("Swipe in from the left, then from the right… to fluff up the layers");
    let lado = -1;
    let n = 0;
    let malos = 0;
    let ini = null;
    Object.assign(H.g, {
        tipo: "aplaudir",
        lado: lado
    });
    arrastrar(s, H, {
        abajo: p => {
            ini = p;
        },
        arriba: p => {
            if (!ini) return;
            const dx = p[0] - ini[0];
            ini = null;
            if (Math.abs(dx) < 40) return;
            const de = dx > 0 ? -1 : 1;
            const m = de < 0 ? mi : md;
            m.setAttribute("transform", `translate(${de < 0 ? 90 : 210} 120) scale(${de < 0 ? 1.3 : -1.3} 1.3)`);
            setTimeout((() => m.setAttribute("transform", `translate(${de < 0 ? 50 : 250} 120) scale(${de < 0 ? 1.3 : -1.3} 1.3)`)), 150);
            if (de !== lado) {
                malos++;
                return H.sonar("no");
            }
            n++;
            lado = -lado;
            H.g.lado = lado;
            H.sonar("tocar");
            capas.forEach(((c, i) => c.setAttribute("cy", (136 - i * (6 + n * 1.5)).toFixed(1))));
            cuenta.textContent = `${n} / ${N}`;
            if (n >= N) H.fin(Math.max(1, 3 - .3 * malos));
        }
    });
}

function soya(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const A = .62;
    const B = .8;
    const CX = 140;
    const CY = 120;
    el(s, "path", {
        d: `M${CX - 80} ${CY - 20} Q${CX - 74} ${CY + 66} ${CX} ${CY + 68} Q${CX + 74} ${CY + 66} ${CX + 80} ${CY - 20} Z`,
        fill: "rgb(236,240,246)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const arroz = el(s, "ellipse", {
        cx: CX,
        cy: CY - 14,
        rx: 72,
        ry: 18,
        fill: "rgb(252,250,240)"
    });
    const manchas = el(s, "g", {});
    const botella = el(s, "g", {
        transform: "translate(250 40)"
    });
    el(botella, "rect", {
        x: -12,
        y: -26,
        width: 24,
        height: 48,
        rx: 6,
        fill: "rgb(60,30,20)",
        stroke: TINTA,
        "stroke-width": 2.5
    });
    el(botella, "rect", {
        x: -5,
        y: -36,
        width: 10,
        height: 12,
        fill: ROJO,
        stroke: TINTA,
        "stroke-width": 2
    });
    const med = medidor(H, s, {
        x: 20,
        y: 40,
        w: 12,
        h: 140,
        a: A,
        b: B,
        vertical: true
    });
    H.ayuda("Hold to pour soy sauce, drag to mix it in · stop when the rice is evenly brown (green)");
    let on = false;
    let soy = 0;
    let mezclado = 0;
    let previo = null;
    let tU = 0;
    Object.assign(H.g, {
        tipo: "soya",
        soy: 0,
        mezcla: 0,
        a: A,
        b: B,
        cx: CX,
        cy: CY - 14
    });
    H.bucle((t => {
        const dt = Math.min(40, t - tU);
        tU = t;
        if (on) soy = Math.min(1.2, soy + dt * 3e-4 * H.rapido(.2));
        H.g.soy = soy;
        H.g.mezcla = mezclado;
        med.poner(soy);
        botella.setAttribute("transform", on ? "translate(220 50) rotate(-60)" : "translate(250 40)");
        arroz.setAttribute("fill", mezcla("rgb(252,250,240)", "rgb(150,100,60)", soy * clamp(mezclado)));
        manchas.setAttribute("opacity", (1 - clamp(mezclado)).toFixed(2));
        if (on && Math.random() < .15) el(manchas, "ellipse", {
            cx: CX - 40 + Math.random() * 80,
            cy: CY - 18 + Math.random() * 10,
            rx: 6,
            ry: 3,
            fill: "rgb(80,40,20)"
        });
    }));
    arrastrar(s, H, {
        abajo: p => {
            on = p[0] > 200;
            previo = p;
        },
        mover: p => {
            if (on) return;
            mezclado = Math.min(1.5, mezclado + Math.hypot(p[0] - previo[0], p[1] - previo[1]) * .004);
            previo = p;
        },
        arriba: () => {
            on = false;
        }
    });
    H.boton("Done ✓", (() => {
        if (soy < .15) return;
        H.fin(H.notaDe(soy - (A + B) / 2, (B - A) / 2, .3) - 1.2 * Math.max(0, 1 - mezclado));
    }));
}

function masaje(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    el(s, "ellipse", {
        cx: 150,
        cy: 112,
        rx: 78,
        ry: 52,
        fill: "rgb(250,220,190)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(s, "ellipse", {
        cx: 84,
        cy: 140,
        rx: 20,
        ry: 12,
        fill: "rgb(250,220,190)",
        stroke: TINTA,
        "stroke-width": 2.5
    });
    el(s, "ellipse", {
        cx: 216,
        cy: 140,
        rx: 20,
        ry: 12,
        fill: "rgb(250,220,190)",
        stroke: TINTA,
        "stroke-width": 2.5
    });
    const capa = el(s, "g", {});
    const az = H.azarDe("masaje");
    const pts = [];
    for (let i = 0; i < 26; i++) {
        const a = az() * Math.PI * 2;
        const r = Math.sqrt(az());
        pts.push({
            x: 150 + 70 * r * Math.cos(a),
            y: 112 + 44 * r * Math.sin(a),
            ok: false
        });
    }
    const cuenta = letrero(H, s, "0%", 150, 26);
    H.ayuda("Rub the marinade all over the chicken");
    Object.assign(H.g, {
        tipo: "masaje",
        cx: 150,
        cy: 112
    });
    let t0 = null;
    arrastrar(s, H, {
        abajo: () => {
            if (t0 === null) t0 = H.ahora();
        },
        mover: p => {
            if (Math.hypot((p[0] - 150) / 78, (p[1] - 112) / 52) > 1.05) return;
            el(capa, "circle", {
                cx: p[0].toFixed(1),
                cy: p[1].toFixed(1),
                r: 9,
                fill: "rgba(150,80,40,0.35)"
            });
            for (const q of pts) if (!q.ok && Math.hypot(q.x - p[0], q.y - p[1]) < 14) q.ok = true;
            const n = pts.filter((q => q.ok)).length;
            cuenta.textContent = `${Math.round(n / pts.length * 100)}%`;
            if (n >= pts.length) H.fin(H.notaDe(Math.max(0, (H.ahora() - t0) / 1e3 - 5), H.ancho(3, .35), 8));
        }
    });
}

function pulpa(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const mitades = [ 80, 200 ].map((cx => {
        el(s, "circle", {
            cx: cx,
            cy: 100,
            r: 44,
            fill: "rgb(120,40,70)",
            stroke: TINTA,
            "stroke-width": 3
        });
        el(s, "circle", {
            cx: cx,
            cy: 100,
            r: 36,
            fill: "rgb(250,240,214)"
        });
        const sem = [];
        for (let i = 0; i < 14; i++) {
            const a = i / 14 * Math.PI * 2;
            const r = 8 + i % 3 * 9;
            sem.push({
                x: cx + r * Math.cos(a),
                y: 100 + r * Math.sin(a),
                e: el(s, "circle", {
                    cx: cx + r * Math.cos(a),
                    cy: 100 + r * Math.sin(a),
                    r: 5,
                    fill: "rgb(250,190,40)",
                    stroke: "rgb(60,40,30)",
                    "stroke-width": 2
                }),
                ok: false
            });
        }
        return {
            cx: cx,
            sem: sem
        };
    }));
    el(s, "path", {
        d: "M110 160 Q114 196 150 196 Q186 196 190 160 Z",
        fill: "rgb(236,240,246)",
        stroke: TINTA,
        "stroke-width": 2.5
    });
    const enVaso = el(s, "ellipse", {
        cx: 150,
        cy: 176,
        rx: 0,
        ry: 0,
        fill: "rgb(250,190,40)"
    });
    const cuenta = letrero(H, s, "0%", 150, 26);
    H.ayuda("Scrape the pulp out of both halves with the spoon");
    Object.assign(H.g, {
        tipo: "pulpa",
        mitades: [ 80, 200 ]
    });
    let fuera = 0;
    arrastrar(s, H, {
        mover: p => {
            const m = mitades.find((q => Math.hypot(p[0] - q.cx, p[1] - 100) < 40));
            if (!m) {
                fuera++;
                return;
            }
            for (const q of m.sem) if (!q.ok && Math.hypot(q.x - p[0], q.y - p[1]) < 10) {
                q.ok = true;
                q.e.setAttribute("opacity", 0);
            }
            const total = mitades.reduce(((a, q) => a + q.sem.length), 0);
            const n = mitades.reduce(((a, q) => a + q.sem.filter((z => z.ok)).length), 0);
            enVaso.setAttribute("rx", 34 * n / total);
            enVaso.setAttribute("ry", 10 * n / total);
            cuenta.textContent = `${Math.round(n / total * 100)}%`;
            if (n >= total) H.fin(Math.max(2.4, 3 - fuera * .002));
        }
    });
}

function flor(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const N = paso.n || 6;
    const P = 2400 / H.rapido(.25);
    const TOL = H.ancho(14, .35);
    const RX = 40;
    el(s, "rect", {
        x: 146,
        y: 150,
        width: 8,
        height: 46,
        fill: MADERA,
        stroke: TINTA,
        "stroke-width": 2
    });
    el(s, "ellipse", {
        cx: 150,
        cy: 96,
        rx: RX,
        ry: 56,
        fill: "rgb(170,210,90)",
        stroke: TINTA,
        "stroke-width": 3
    });
    const vetas = [ 0, 1, 2, 3 ].map((() => el(s, "path", {
        d: "",
        fill: "none",
        stroke: "rgb(150,190,80)",
        "stroke-width": 2
    })));
    const cortesG = el(s, "g", {});
    const marca = el(s, "path", {
        d: "",
        fill: "none",
        stroke: ROJO,
        "stroke-width": 3,
        "stroke-dasharray": "5 4"
    });
    el(s, "path", {
        d: "M150 30 l-10 -18 h20 Z",
        fill: METAL,
        stroke: TINTA,
        "stroke-width": 2
    });
    el(s, "line", {
        x1: 150,
        y1: 30,
        x2: 150,
        y2: 40,
        stroke: TINTA,
        "stroke-width": 2
    });
    const cuenta = letrero(H, s, `0 / ${N}`, 14, 24, "start");
    H.ayuda("The mango spins · tap to cut each time the red line passes in front, under the knife");
    const linea = a => {
        const x = 150 + RX * .92 * Math.sin(a);
        const curva = 6 * Math.sin(a);
        return `M${x.toFixed(1)} 44 Q${(x + curva).toFixed(1)} 96 ${x.toFixed(1)} 148`;
    };
    let fase = 0;
    let sitio = 0;
    const cortes = [];
    const notas = [];
    Object.assign(H.g, {
        tipo: "flor",
        P: P,
        t0: H.t0,
        n: 0,
        N: N,
        sitio: 0
    });
    H.bucle((t => {
        fase = t / P % 1 * 2 * Math.PI;
        const pinta = (e, a, base) => {
            e.setAttribute("d", linea(a));
            e.setAttribute("opacity", Math.cos(a) > 0 ? base : 0);
        };
        pinta(marca, fase - sitio, 1);
        vetas.forEach(((v, i) => pinta(v, fase + .8 + i * Math.PI / 2, .8)));
        cortes.forEach((c => {
            pinta(c.e, fase - c.a, 1);
            pinta(c.e2, fase - c.a, 1);
        }));
    }));
    s.addEventListener("pointerdown", (e => {
        e.preventDefault();
        if (!H.vivo()) return;
        const x = RX * Math.sin(fase - sitio);
        const err = Math.cos(fase - sitio) > 0 ? x : 60;
        const nota = H.notaDe(err, TOL / 2.2, 18);
        notas.push(nota);
        const a = fase;
        const c = {
            a: a,
            e: el(cortesG, "path", {
                d: "",
                fill: "none",
                stroke: "rgb(250,250,210)",
                "stroke-width": 4
            }),
            e2: el(cortesG, "path", {
                d: "",
                fill: "none",
                stroke: TINTA,
                "stroke-width": 1
            })
        };
        cortes.push(c);
        sitio = notas.length * 2 * Math.PI / N % (2 * Math.PI);
        H.g.sitio = sitio;
        H.sonar(nota >= 2.5 ? "tocar" : "no");
        cuenta.textContent = `${notas.length} / ${N}`;
        H.g.n = notas.length;
        if (notas.length >= N) H.fin(H.promedio(notas));
    }));
}

function solos(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const A = .4;
    const B = .62;
    el(s, "path", {
        d: "M62 92 L76 176 L224 176 L238 92 Z",
        fill: "rgb(60,60,70)",
        stroke: TINTA,
        "stroke-width": 3,
        "stroke-linejoin": "round"
    });
    el(s, "rect", {
        x: 66,
        y: 104,
        width: 168,
        height: 66,
        fill: "rgb(236,190,80)",
        opacity: .85
    });
    const llamas = [ 0, 1, 2, 3, 4 ].map((i => el(s, "path", {
        d: `M${100 + i * 25} 194 Q${108 + i * 25} 180 ${114 + i * 25} 194 Z`,
        fill: "rgb(240,110,50)",
        stroke: TINTA,
        "stroke-width": 1.5
    })));
    const bs = [ 0, 1, 2 ].map((i => {
        const g = el(s, "g", {
            transform: `translate(${110 + i * 40} 132)`
        });
        const cuerpo = el(g, "circle", {
            r: 15,
            fill: "rgb(252,236,190)",
            stroke: TINTA,
            "stroke-width": 2.5
        });
        const raja = el(g, "path", {
            d: "M-6 -6 l5 6 l-4 6",
            fill: "none",
            stroke: TINTA,
            "stroke-width": 2,
            opacity: 0
        });
        return {
            g: g,
            cuerpo: cuerpo,
            raja: raja,
            x: 110 + i * 40,
            c: 0,
            v: 0,
            roto: false,
            listo: .9 + i * .12
        };
    }));
    const med = medidor(H, s, {
        x: 70,
        y: 22,
        w: 160,
        h: 11,
        a: A,
        b: B,
        rojo: .15
    });
    H.ayuda("Keep the oil warm (green): hold for more heat · they turn over by themselves when ready");
    let T = .35;
    let on = false;
    let tU = 0;
    Object.assign(H.g, {
        tipo: "solos",
        T: T,
        a: A,
        b: B
    });
    H.bucle((t => {
        const dt = Math.min(40, t - tU);
        tU = t;
        T = clamp(T + dt * ((on ? 4e-4 : -3e-4) + 6e-5 * Math.sin(t / 600)) * H.rapido(.25), .05, 1);
        H.g.T = T;
        med.poner(T);
        llamas.forEach((l => l.setAttribute("transform", `translate(0 ${on ? -6 : 0})`)));
        let vueltas = 0;
        bs.forEach((b => {
            if (T >= A) b.c += dt * 3e-4 * (T > B ? 1.4 : 1);
            if (T > .85 && !b.roto) {
                b.roto = true;
                b.raja.setAttribute("opacity", 1);
                H.sonar("no");
            }
            const v = b.c >= b.listo * 2 ? 2 : b.c >= b.listo ? 1 : 0;
            vueltas += v;
            b.g.setAttribute("transform", `translate(${b.x} 132) rotate(${v * 180})`);
            b.cuerpo.setAttribute("fill", mezcla("rgb(252,236,190)", "rgb(222,150,50)", clamp(b.c / (b.listo * 2))));
        }));
        if (vueltas >= 6) H.fin(Math.max(1, 3 - .6 * bs.filter((b => b.roto)).length));
    }));
    arrastrar(s, H, {
        abajo: () => {
            on = true;
        },
        arriba: () => {
            on = false;
        }
    });
}

function arequipe(s, paso, H) {
    const {el: el, TINTA: TINTA} = H;
    const A = .78;
    const B = .92;
    const CX = 140;
    const CY = 112;
    el(s, "ellipse", {
        cx: CX,
        cy: CY,
        rx: 110,
        ry: 72,
        fill: OLLA,
        stroke: TINTA,
        "stroke-width": 3
    });
    const leche = el(s, "ellipse", {
        cx: CX,
        cy: CY,
        rx: 98,
        ry: 62,
        fill: "rgb(250,244,228)"
    });
    const surco = el(s, "line", {
        x1: CX - 80,
        y1: CY,
        x2: CX + 80,
        y2: CY,
        stroke: OLLA,
        "stroke-width": 0,
        "stroke-linecap": "round"
    });
    const med = medidor(H, s, {
        x: 268,
        y: 40,
        w: 12,
        h: 140,
        vertical: true
    });
    H.ayuda("Stir in circles · it's ready when the spoon's trail shows the bottom of the pot · then Done");
    let previo = null;
    let v = 0;
    let surcoV = 0;
    let tU = 0;
    Object.assign(H.g, {
        tipo: "arequipe",
        v: 0,
        a: A,
        b: B,
        cx: CX,
        cy: CY
    });
    H.bucle((t => {
        const dt = Math.min(40, t - tU);
        tU = t;
        surcoV = Math.max(0, surcoV - dt * (.004 * (1 - v) + 4e-4));
        surco.setAttribute("stroke-width", (surcoV * 10).toFixed(1));
        surco.setAttribute("transform", `rotate(${(t / 20 % 180).toFixed(0)} ${CX} ${CY})`);
    }));
    arrastrar(s, H, {
        abajo: p => {
            previo = Math.atan2(p[1] - CY, p[0] - CX);
        },
        mover: p => {
            const a = Math.atan2(p[1] - CY, p[0] - CX);
            let d = a - previo;
            if (d > Math.PI) d -= 2 * Math.PI;
            if (d < -Math.PI) d += 2 * Math.PI;
            previo = a;
            if (Math.abs(d) < .01) return;
            v = Math.min(1.2, v + Math.abs(d) * .009 * H.rapido(.2));
            surcoV = 1;
            H.g.v = v;
            med.poner(v / 1.2);
            leche.setAttribute("fill", mezcla("rgb(250,244,228)", v > 1.05 ? "rgb(120,70,40)" : "rgb(196,130,70)", clamp(v)));
        }
    });
    H.boton("Done ✓", (() => {
        if (v < .1) return;
        H.fin(H.notaDe(v - (A + B) / 2, (B - A) / 2 + H.ancho(.06, .35) - .06, .3));
    }));
}

export const GESTOS = {
    torcer: {
        nombre: "TWIST",
        texto: p => `Twist the top closed (${p.n || 18} pleats)`,
        crear: torcer
    },
    cuchilla: {
        nombre: "SMEAR",
        texto: () => "Smear the wrappers with the cleaver",
        crear: cuchilla
    },
    agua_fria: {
        nombre: "SPLASH",
        texto: () => "Boil, and splash in cold water 3 times",
        crear: aguaFria
    },
    leudar: {
        nombre: "PROOF",
        texto: () => "Let the dough rise until it doubles",
        crear: leudar
    },
    exprimir: {
        nombre: "SQUEEZE",
        texto: p => p.que === "limon" ? "Squeeze the lime" : "Squeeze the water out of the greens",
        crear: exprimir
    },
    mortero: {
        nombre: "POUND",
        texto: p => p.que === "pimienta" ? "Grind the Sichuan pepper (it numbs!)" : "Mash the red beans",
        crear: mortero
    },
    abrir: {
        nombre: "OPEN",
        texto: () => "Break it open, slowly…",
        crear: abrir
    },
    rodar: {
        nombre: "COAT",
        texto: () => "Roll them in the rice flour",
        crear: rodar
    },
    moler: {
        nombre: "GRIND",
        texto: () => "Grind the coffee",
        crear: moler
    },
    licuar: {
        nombre: "BLEND",
        texto: () => "Blend it in pulses",
        crear: licuar
    },
    termometro: {
        nombre: "COOL",
        texto: () => "Let the boiled water cool to 80 °C",
        crear: termometro
    },
    aceite: {
        nombre: "OIL",
        texto: () => "Fry, keeping the oil just right",
        crear: aceite
    },
    palmear: {
        nombre: "PAT",
        texto: () => "Pat the arepa between your hands",
        crear: palmear
    },
    enroscar: {
        nombre: "COIL",
        texto: () => "Coil it into a snail",
        crear: enroscar
    },
    desgranar: {
        nombre: "BREAK UP",
        texto: () => "Break up the cold rice",
        crear: desgranar
    },
    espesar: {
        nombre: "THICKEN",
        texto: () => "Stir until the potatoes melt in",
        crear: espesar
    },
    remolino: {
        nombre: "SWIRL",
        texto: () => "Swirl the soup and drizzle in the egg",
        crear: remolino
    },
    escurrir: {
        nombre: "DRAIN",
        texto: () => "Drain the noodles",
        crear: escurrir
    },
    marcar: {
        nombre: "SCORE",
        texto: () => "Score the fish diagonally",
        crear: marcar
    },
    banar: {
        nombre: "BASTE",
        texto: () => "Baste the pork with the sauce",
        crear: banar
    },
    descascarar: {
        nombre: "SHELL",
        texto: () => "Shell the shrimp",
        crear: descascarar
    },
    cono: {
        nombre: "CONE",
        texto: () => "Fold the leaves into cones",
        crear: cono
    },
    soasar: {
        nombre: "WILT",
        texto: () => "Wilt the banana leaf over the fire",
        crear: soasar
    },
    huecos: {
        nombre: "STUFF",
        texto: () => "Stuff the holes with sticky rice",
        crear: huecos
    },
    balanza: {
        nombre: "WEIGH",
        texto: p => `Weigh ${p.g || 250} g of ${p.nombre || "starch"}`,
        crear: balanza
    },
    huevo: {
        nombre: "EGG",
        texto: p => (p.n || 1) > 1 ? `Crack ${p.n} eggs` : "Crack an egg",
        crear: huevo
    },
    prensar: {
        nombre: "MOLD",
        texto: () => "Press them in the mooncake mold",
        crear: prensar
    },
    picar: {
        nombre: "MINCE",
        texto: () => "Mince the beef with two cleavers",
        crear: picar
    },
    espumar: {
        nombre: "SKIM",
        texto: () => "Skim the foam off the broth",
        crear: espumar
    },
    sacudir: {
        nombre: "SHAKE TREE",
        texto: () => "Shake the osmanthus tree",
        crear: sacudir
    },
    limpiar: {
        nombre: "CLEAN",
        texto: () => "Clean the flowers",
        crear: limpiar
    },
    brotes: {
        nombre: "TEA TIPS",
        texto: () => "Pick the tea: one bud, one leaf",
        crear: brotes
    },
    red: {
        nombre: "NET",
        texto: () => "Net a fish from the tank",
        crear: red
    },
    aceite_tibio: {
        nombre: "WARM OIL",
        texto: () => "Take each shrimp out the moment it turns white",
        crear: aceiteTibio
    },
    raspar: {
        nombre: "SCRAPE",
        texto: () => "Scrape the pork skin clean",
        crear: raspar
    },
    tapita: {
        nombre: "PIN LID",
        texto: () => "Pin the lid back on with toothpicks",
        crear: tapita
    },
    volar: {
        nombre: "SHAVE",
        texto: () => "Shave the noodles straight into the pot",
        crear: volar
    },
    flotar: {
        nombre: "FLOAT",
        texto: () => "Boil until they all float",
        crear: flotar
    },
    escaldar: {
        nombre: "SCALD",
        texto: () => "Scald the starch with boiling water, stirring",
        crear: escaldar
    },
    transparente: {
        nombre: "SEE-THROUGH",
        texto: () => "Steam until you can see the shrimp",
        crear: transparente
    },
    laminar: {
        nombre: "LAYER",
        texto: () => "Fold and roll the pastry into layers",
        crear: laminar
    },
    ventanita: {
        nombre: "OVEN WINDOW",
        texto: () => "Bake until a few dark spots appear",
        crear: ventanita
    },
    hojas: {
        nombre: "WRAPPERS",
        texto: () => "Make the wrappers on the hot griddle",
        crear: hojasPlancha
    },
    budare: {
        nombre: "BUDARE",
        texto: () => "Grill it: flip when golden, out when it puffs",
        crear: budare
    },
    bolsa: {
        nombre: "SEAL",
        texto: () => "Fold and seal with the plastic bag",
        crear: bolsa
    },
    gelatina: {
        nombre: "JELLY",
        texto: () => "Cut the soup jelly",
        crear: gelatina
    },
    desmechar: {
        nombre: "SHRED",
        texto: () => "Shred the chicken with two forks",
        crear: desmechar
    },
    remojar: {
        nombre: "GARLIC DIP",
        texto: () => "Dip them in garlic salt water",
        crear: remojar
    },
    sin_abrir: {
        nombre: "DON'T PEEK",
        texto: () => "Bake without opening the oven",
        crear: sinAbrir
    },
    armar: {
        nombre: "LAYER UP",
        texto: p => p.texto2 || "Build the tamal in order",
        crear: armar
    },
    queso: {
        nombre: "CHEESE",
        texto: () => "Drop in the cheese and pull it out stretchy",
        crear: quesoEstira
    },
    tostar: {
        nombre: "ROAST",
        texto: () => "Roast the coffee beans",
        crear: tostar
    },
    pelusa: {
        nombre: "RUB",
        texto: () => "Rub the fuzz off the lulo",
        crear: pelusa
    },
    gota: {
        nombre: "SNAP TEST",
        texto: () => "Cook the syrup until a drop snaps in cold water",
        crear: gota
    },
    pitillo: {
        nombre: "STRAW",
        texto: () => "Stab the straw through the sealed lid",
        crear: pitillo
    },
    voltear: {
        nombre: "FLIP",
        texto: p => p.que === "bol" ? "Press into a bowl and flip it onto the plate" : "Flip the pan onto the plate",
        crear: voltear
    },
    extender: {
        nombre: "SPREAD BATTER",
        texto: () => "Spread the batter in circles",
        crear: extender
    },
    helado: {
        nombre: "SCOOP",
        texto: () => "Scoop the ice cream on top",
        crear: helado
    },
    una_direccion: {
        nombre: "BEAT",
        texto: () => "Beat the filling in one direction",
        crear: unaDireccion
    },
    tofu: {
        nombre: "PALM CUT",
        texto: () => "Cut the tofu on your palm",
        crear: tofuPalma
    },
    pintar: {
        nombre: "EGG WASH",
        texto: () => "Brush egg over the pattern",
        crear: pintarHuevo
    },
    glasear: {
        nombre: "GLAZE",
        texto: () => "Glaze the char siu with honey",
        crear: glasear
    },
    blanquear: {
        nombre: "BLANCH",
        texto: () => "Blanch the bok choy, then ice water",
        crear: blanquear
    },
    despegar: {
        nombre: "FRY PASTE",
        texto: () => "Fry the bean paste until it comes away",
        crear: despegar
    },
    rizar: {
        nombre: "FRILL",
        texto: () => "Roll a frilly edge on the wrappers",
        crear: rizar
    },
    yemas: {
        nombre: "YOLKS",
        texto: () => "Mash the salted egg yolks",
        crear: yemas
    },
    chile: {
        nombre: "CHILI OIL",
        texto: () => "Pour hot oil over the chili",
        crear: chile
    },
    aplaudir: {
        nombre: "FLUFF",
        texto: () => "Squeeze it to open the layers",
        crear: aplaudir
    },
    soya: {
        nombre: "SOY",
        texto: () => "Soak the rice in soy sauce",
        crear: soya
    },
    masaje: {
        nombre: "MARINATE",
        texto: () => "Rub the marinade all over",
        crear: masaje
    },
    pulpa: {
        nombre: "SCRAPE PULP",
        texto: () => "Scrape out the passion fruit pulp",
        crear: pulpa
    },
    flor: {
        nombre: "FLOWER CUT",
        texto: () => "Cut the mango into a flower",
        crear: flor
    },
    solos: {
        nombre: "WARM OIL FRY",
        texto: () => "Fry in warm oil until they turn by themselves",
        crear: solos
    },
    arequipe: {
        nombre: "AREQUIPE",
        texto: () => "Cook the arequipe until you see the bottom",
        crear: arequipe
    },
    palillo: {
        nombre: "POACH",
        texto: () => "Poach it gently and test with a chopstick",
        crear: palillo
    }
};
