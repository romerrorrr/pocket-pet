import { dibujarCoccion } from "./coccion.js";

import { pixelar } from "./pixelar.js";

import { GESTOS } from "./gestos.js";

const SVG = "http://www.w3.org/2000/svg";

const esc = s => String(s).replace(/[&<>"']/g, (c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
}[c])));

export const RELLENOS = {
    carne: {
        nombre: "pork",
        color: "rgb(200,120,96)",
        sombra: "rgb(160,84,70)"
    },
    verdura: {
        nombre: "veggies",
        color: "rgb(120,170,90)",
        sombra: "rgb(84,130,64)"
    },
    frijol: {
        nombre: "red bean",
        color: "rgb(150,50,60)",
        sombra: "rgb(110,30,44)"
    },
    caldo: {
        nombre: "pork & soup",
        color: "rgb(214,150,100)",
        sombra: "rgb(176,110,70)"
    },
    camaron: {
        nombre: "shrimp",
        color: "rgb(252,232,220)",
        sombra: "rgb(232,180,160)"
    },
    loto: {
        nombre: "lotus paste",
        color: "rgb(200,150,90)",
        sombra: "rgb(160,110,60)"
    },
    queso: {
        nombre: "cheese",
        color: "rgb(250,230,150)",
        sombra: "rgb(220,190,100)"
    },
    pollo: {
        nombre: "chicken & potato",
        color: "rgb(230,190,120)",
        sombra: "rgb(196,150,80)"
    },
    arroz: {
        nombre: "sticky rice",
        color: "rgb(250,248,240)",
        sombra: "rgb(220,214,200)"
    },
    natilla: {
        nombre: "golden custard",
        color: "rgb(255,200,80)",
        sombra: "rgb(226,160,50)"
    },
    sesamo: {
        nombre: "black sesame",
        color: "rgb(60,50,56)",
        sombra: "rgb(30,26,30)"
    },
    repollo: {
        nombre: "cabbage & carrot",
        color: "rgb(190,220,140)",
        sombra: "rgb(150,190,100)"
    },
    carne_repollo: {
        nombre: "pork & cabbage",
        color: "rgb(200,120,96)",
        sombra: "rgb(160,84,70)",
        motas: "rgb(150,206,110)"
    }
};

export const LIQUIDOS = {
    agua: {
        nombre: "hot water",
        color: "rgb(200,226,240)"
    },
    te: {
        nombre: "tea",
        color: "rgb(170,200,120)"
    },
    leche: {
        nombre: "milk",
        color: "rgb(246,240,226)"
    },
    cafe: {
        nombre: "coffee",
        color: "rgb(90,56,40)"
    },
    jarabe: {
        nombre: "osmanthus syrup",
        color: "rgb(250,210,110)"
    },
    jugo: {
        nombre: "passion fruit juice",
        color: "rgb(255,196,60)"
    },
    chocolate: {
        nombre: "hot chocolate",
        color: "rgb(110,62,40)"
    },
    natilla: {
        nombre: "custard",
        color: "rgb(255,214,110)"
    },
    masa: {
        nombre: "batter",
        color: "rgb(250,230,180)"
    },
    huevo: {
        nombre: "beaten egg",
        color: "rgb(255,220,90)"
    },
    caldo: {
        nombre: "broth",
        color: "rgb(214,170,110)"
    },
    vinagre_dulce: {
        nombre: "sweet vinegar sauce",
        color: "rgb(150,70,40)"
    },
    te_negro: {
        nombre: "black tea",
        color: "rgb(150,90,50)"
    },
    agua_fria: {
        nombre: "cold water",
        color: "rgb(206,230,244)"
    },
    pulpa: {
        nombre: "passion fruit pulp",
        color: "rgb(250,190,40)"
    },
    jugo_sandia: {
        nombre: "watermelon juice",
        color: "rgb(246,112,112)"
    },
    pulpa_lulo: {
        nombre: "lulo pulp",
        color: "rgb(204,222,110)"
    },
    arroz_cocido: {
        nombre: "cooked rice",
        color: "rgb(246,244,232)"
    }
};

export const INGREDIENTES = {
    cebollin: {
        nombre: "scallions",
        color: "rgb(130,190,100)",
        vena: "rgb(220,240,200)",
        alto: 14
    },
    fruta: {
        nombre: "passion fruit",
        color: "rgb(150,90,140)",
        vena: "rgb(255,200,70)",
        alto: 40,
        redondo: true
    },
    pescado: {
        nombre: "fish",
        color: "rgb(236,210,170)",
        vena: "rgb(200,170,140)",
        alto: 46
    },
    cerdo: {
        nombre: "pork belly",
        color: "rgb(220,120,100)",
        vena: "rgb(252,232,210)",
        alto: 42
    },
    platano: {
        nombre: "plantain",
        color: "rgb(240,200,90)",
        vena: "rgb(250,230,160)",
        alto: 34,
        redondo: true
    },
    papa: {
        nombre: "potatoes",
        color: "rgb(236,206,140)",
        vena: "rgb(250,232,190)",
        alto: 36,
        redondo: true
    },
    bokchoy: {
        nombre: "bok choy",
        color: "rgb(110,170,90)",
        vena: "rgb(230,246,220)",
        alto: 30
    },
    camaron: {
        nombre: "shrimp",
        color: "rgb(250,170,140)",
        alto: 30
    },
    masa_arepa: {
        nombre: "arepa dough",
        color: "rgb(250,232,170)",
        alto: 40,
        redondo: true
    },
    tofu: {
        nombre: "tofu",
        color: "rgb(250,246,232)",
        vena: "rgb(236,228,206)",
        alto: 40
    },
    res: {
        nombre: "beef",
        color: "rgb(190,80,70)",
        vena: "rgb(240,200,190)",
        alto: 34
    },
    repollo: {
        nombre: "cabbage",
        color: "rgb(190,226,160)",
        vena: "rgb(236,246,220)",
        alto: 40,
        redondo: true
    },
    queso: {
        nombre: "cheese",
        color: "rgb(250,226,140)",
        vena: "rgb(255,240,190)",
        alto: 40
    },
    chocolate: {
        nombre: "chocolate",
        color: "rgb(110,62,40)",
        vena: "rgb(150,90,60)",
        alto: 40
    },
    coco: {
        nombre: "coconut",
        color: "rgb(250,250,246)",
        vena: "rgb(170,120,80)",
        alto: 40
    },
    mango: {
        nombre: "mango",
        color: "rgb(150,190,70)",
        pulpa: "rgb(255,200,70)",
        alto: 40,
        redondo: true
    },
    lulo: {
        nombre: "lulo",
        color: "rgb(240,160,40)",
        vena: "rgb(200,230,120)",
        pulpa: "rgb(200,230,120)",
        alto: 40,
        redondo: true
    },
    papaya: {
        nombre: "papaya",
        color: "rgb(250,140,70)",
        vena: "rgb(60,40,40)",
        alto: 40,
        redondo: true
    },
    maduro: {
        nombre: "ripe plantain",
        color: "rgb(240,200,80)",
        pulpa: "rgb(250,220,140)",
        alto: 34,
        redondo: true
    },
    loto: {
        nombre: "lotus root",
        color: "rgb(214,180,140)",
        pulpa: "rgb(246,236,220)",
        alto: 40,
        redondo: true
    },
    hoja: {
        nombre: "leaves",
        color: "rgb(110,160,80)",
        vena: "rgb(170,210,130)",
        alto: 40
    },
    pollo: {
        nombre: "chicken",
        color: "rgb(240,214,170)",
        vena: "rgb(250,232,200)",
        alto: 44,
        redondo: true
    },
    arroz: {
        nombre: "rice",
        color: "rgb(250,248,240)",
        alto: 30
    },
    panela: {
        nombre: "panela",
        color: "rgb(176,110,50)",
        vena: "rgb(210,150,80)",
        alto: 40
    },
    barro: {
        nombre: "clay",
        color: "rgb(170,120,80)",
        alto: 40
    },
    hojas_te: {
        nombre: "tea leaves",
        color: "rgb(110,160,80)",
        alto: 30
    },
    oblea: {
        nombre: "wafer",
        color: "rgb(246,222,170)",
        alto: 10
    },
    masa: {
        nombre: "dough",
        color: "rgb(250,244,228)",
        alto: 44
    },
    mazorca: {
        nombre: "corn",
        color: "rgb(250,210,80)",
        alto: 36
    },
    molde: {
        nombre: "mooncake",
        color: "rgb(236,190,120)",
        alto: 40
    },
    perlas: {
        nombre: "tapioca pearls",
        color: "rgb(60,38,34)",
        alto: 20
    },
    cafe: {
        nombre: "ground coffee",
        color: "rgb(70,46,32)",
        alto: 20
    },
    masa_cebollin: {
        nombre: "scallion dough",
        color: "rgb(246,236,210)",
        alto: 40,
        redondo: true
    }
};

export const COCCIONES = {
    vapor: {
        verbo: "STEAM",
        boton: "Take it out!",
        ms: 3600
    },
    hervir: {
        verbo: "BOIL",
        boton: "Scoop them out!",
        ms: 3400
    },
    plancha: {
        verbo: "GRILL",
        boton: "Flip!",
        ms: 2800,
        vuelta: true
    },
    freir: {
        verbo: "FRY",
        boton: "Take it out!",
        ms: 3e3
    },
    horno: {
        verbo: "BAKE",
        boton: "Take it out!",
        ms: 3800
    },
    caramelo: {
        verbo: "DIP",
        boton: "Lift it!",
        ms: 2600
    },
    calentar: {
        verbo: "HEAT",
        boton: "Pour it!",
        ms: 3e3
    },
    enfriar: {
        verbo: "CHILL",
        boton: "Unmold!",
        ms: 3200
    },
    rebozar: {
        verbo: "DIP",
        boton: "Lift it!",
        ms: 2600
    },
    tapar: {
        verbo: "COVER",
        boton: "Lift the lid!",
        ms: 3400
    }
};

export function notaDe(err, tol, fuera = tol) {
    const e = Math.abs(err);
    if (e <= tol) return 3 - .5 * (e / Math.max(1e-9, tol));
    return Math.max(1, 2.5 - 1.5 * Math.min(1, (e - tol) / Math.max(1e-9, fuera)));
}

export const promedio = xs => xs.length ? xs.reduce(((a, b) => a + b), 0) / xs.length : 3;

export const estrellasDeAciertos = (buenos, total) => total <= 0 ? 3 : 1 + 2 * Math.pow(Math.max(0, Math.min(1, buenos / total)), 1.6);

export const estrellasDeEstirar = (r, min, max) => notaDe(r - (min + max) / 2, (max - min) / 2, 10);

export const estrellasDeCantidad = (f, a, b) => notaDe(f - (a + b) / 2, (b - a) / 2, .12);

export const estrellasDeCoccion = (x, a, b) => notaDe(x - (a + b) / 2, (b - a) / 2, .1);

export function estrellasDeEleccion(elegido, pedido) {
    const e = new Set(elegido);
    const p = new Set(pedido);
    let mal = 0;
    for (const x of e) if (!p.has(x)) mal++;
    for (const x of p) if (!e.has(x)) mal++;
    return mal === 0 ? 3 : mal === 1 ? 2 : 1;
}

function svg(area) {
    const s = document.createElementNS(SVG, "svg");
    s.setAttribute("viewBox", "0 0 300 200");
    s.setAttribute("class", "cocina-svg");
    area.appendChild(s);
    return s;
}

function el(padre, tag, attrs = {}) {
    const e = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    padre.appendChild(e);
    return e;
}

const TINTA = "rgb(22,20,22)";

const MASA = "rgb(250,244,228)";

const MASA_SOMBRA = "rgb(226,214,190)";

const MASA_DE = {
    arepa: "rgb(250,226,140)",
    empanada: "rgb(250,222,130)",
    pandebono: "rgb(250,226,160)",
    bunuelos: "rgb(250,230,170)",
    luna: "rgb(236,196,130)",
    dan_ta: "rgb(250,228,170)",
    tangyuan: "rgb(255,255,253)",
    liusha: "rgb(253,250,244)",
    hargow: "rgb(238,242,238)",
    siumai: "rgb(250,226,140)",
    congyoubing: "rgb(246,236,210)"
};

const oscurecer = (col, k) => `rgb(${col.match(/\d+/g).map((v => Math.round(v * k))).join(",")})`;

let idClip = 0;

const CAMARON = "rgb(250,160,130)";

const CAMARON_OSC = "rgb(220,104,90)";

export function dibujarCamaron(padre, x, y, k = 1, girado = false) {
    const g = el(padre, "g", {
        transform: `translate(${x} ${y}) scale(${girado ? -k : k} ${k})`
    });
    for (let i = 0; i < 4; i++) el(g, "line", {
        x1: -2 + i * 4,
        y1: 8,
        x2: -4 + i * 4,
        y2: 15,
        stroke: CAMARON_OSC,
        "stroke-width": 1.5
    });
    el(g, "path", {
        d: "M14 -6 A14 14 0 1 0 6 13",
        fill: "none",
        stroke: TINTA,
        "stroke-width": 13,
        "stroke-linecap": "round"
    });
    el(g, "path", {
        d: "M14 -6 A14 14 0 1 0 6 13",
        fill: "none",
        stroke: CAMARON,
        "stroke-width": 9,
        "stroke-linecap": "round"
    });
    for (const a of [ 200, 235, 270, 305, 340 ]) {
        const r = a * Math.PI / 180;
        el(g, "line", {
            x1: 9.5 * Math.cos(r),
            y1: 9.5 * Math.sin(r),
            x2: 18.5 * Math.cos(r),
            y2: 18.5 * Math.sin(r),
            stroke: "rgb(255,214,196)",
            "stroke-width": 1.6
        });
    }
    el(g, "path", {
        d: "M6 13 L0 22 L8 20 L14 24 L12 14 Z",
        fill: CAMARON_OSC,
        stroke: TINTA,
        "stroke-width": 2,
        "stroke-linejoin": "round"
    });
    el(g, "circle", {
        cx: 15,
        cy: -7,
        r: 2,
        fill: TINTA
    });
    el(g, "path", {
        d: "M16 -10 Q24 -18 30 -14",
        fill: "none",
        stroke: CAMARON_OSC,
        "stroke-width": 1.5
    });
    return g;
}

function dibujarPescado(g, x0, x1, cy, h) {
    const L = x1 - x0;
    el(g, "path", {
        d: `M${x1 - 18} ${cy} L${x1} ${cy - h * .55} L${x1 - 4} ${cy} L${x1} ${cy + h * .55} Z`,
        fill: "rgb(200,170,140)",
        stroke: TINTA,
        "stroke-width": 3,
        "stroke-linejoin": "round"
    });
    el(g, "ellipse", {
        cx: x0 + L * .45,
        cy: cy,
        rx: L * .46,
        ry: h / 2,
        fill: "rgb(226,214,196)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(g, "path", {
        d: `M${x0 + L * .1} ${cy + 3} Q${x0 + L * .45} ${cy + h * .32} ${x0 + L * .85} ${cy + 2}`,
        fill: "none",
        stroke: "rgb(250,244,232)",
        "stroke-width": 4
    });
    for (let i = 0; i < 6; i++) {
        const cx = x0 + L * (.3 + i * .09);
        el(g, "path", {
            d: `M${cx} ${cy - h * .28} q5 6 0 12`,
            fill: "none",
            stroke: "rgb(176,160,140)",
            "stroke-width": 2
        });
    }
    el(g, "path", {
        d: `M${x0 + L * .2} ${cy - h * .38} Q${x0 + L * .22} ${cy} ${x0 + L * .2} ${cy + h * .38}`,
        fill: "none",
        stroke: TINTA,
        "stroke-width": 2
    });
    el(g, "circle", {
        cx: x0 + L * .1,
        cy: cy - h * .12,
        r: 4,
        fill: "#fff",
        stroke: TINTA,
        "stroke-width": 2
    });
    el(g, "circle", {
        cx: x0 + L * .1,
        cy: cy - h * .12,
        r: 1.6,
        fill: TINTA
    });
    el(g, "path", {
        d: `M${x0 + L * .42} ${cy - h / 2 + 1} L${x0 + L * .5} ${cy - h * .85} L${x0 + L * .62} ${cy - h / 2 + 2} Z`,
        fill: "rgb(200,170,140)",
        stroke: TINTA,
        "stroke-width": 2,
        "stroke-linejoin": "round"
    });
}

export function dibujarIngrediente(g, que, x0, x1, cy) {
    const I = INGREDIENTES[que] || INGREDIENTES.cebollin;
    const h = I.alto;
    const L = x1 - x0;
    const borde = {
        stroke: TINTA,
        "stroke-width": 3
    };
    if (que === "pescado") return dibujarPescado(g, x0, x1, cy, h);
    if (que === "bokchoy") return dibujarBokchoy(g, (x0 + x1) / 2, cy);
    if (que === "queso") {
        el(g, "rect", {
            x: x0 + 10,
            y: cy - 22,
            width: L - 20,
            height: 40,
            rx: 6,
            fill: "rgb(250,232,170)",
            ...borde
        });
        el(g, "rect", {
            x: x0 + 14,
            y: cy - 18,
            width: L - 28,
            height: 5,
            rx: 2,
            fill: "rgb(255,246,214)"
        });
        for (const [fx, fy, r] of [ [ .2, .2, 4 ], [ .45, -.3, 3 ], [ .7, .35, 4.5 ], [ .85, -.2, 2.5 ], [ .33, .55, 2.5 ] ]) el(g, "circle", {
            cx: x0 + L * fx,
            cy: cy + 10 * fy,
            r: r,
            fill: "rgb(230,206,130)"
        });
        return;
    }
    if (que === "pollo") {
        el(g, "path", {
            d: `M${x0 + 8} ${cy + 6} Q${x0 + 4} ${cy - 26} ${x0 + L * .45} ${cy - 24} Q${x1 - 6} ${cy - 20} ${x1 - 4} ${cy + 2} Q${x0 + L * .6} ${cy + 26} ${x0 + 8} ${cy + 6} Z`,
            fill: "rgb(246,206,190)",
            ...borde
        });
        el(g, "path", {
            d: `M${x0 + 22} ${cy - 10} Q${x0 + L * .5} ${cy - 20} ${x1 - 24} ${cy - 8}`,
            fill: "none",
            stroke: "rgb(252,228,216)",
            "stroke-width": 4
        });
        for (const fx of [ .3, .5, .7 ]) el(g, "path", {
            d: `M${x0 + L * fx} ${cy - 6} q6 6 2 14`,
            fill: "none",
            stroke: "rgb(230,180,166)",
            "stroke-width": 2
        });
        return;
    }
    if (que === "cebollin") {
        for (let j = 0; j < 3; j++) {
            const y = cy - 18 + j * 14;
            const h2 = 12;
            const xb = x0 + 14 + j % 2 * 4;
            for (let i = 0; i < 4; i++) el(g, "line", {
                x1: xb,
                y1: y - 2 + i * 1.5,
                x2: xb - 10,
                y2: y - 6 + i * 4,
                stroke: "rgb(200,190,160)",
                "stroke-width": 1.5
            });
            el(g, "rect", {
                x: xb,
                y: y - h2 / 2,
                width: L * .26,
                height: h2,
                rx: h2 / 2,
                fill: "rgb(248,248,238)",
                ...borde
            });
            el(g, "rect", {
                x: xb + L * .22,
                y: y - h2 / 2,
                width: L * .7 - j % 2 * 8,
                height: h2,
                rx: 3,
                fill: "rgb(110,180,80)",
                ...borde
            });
            el(g, "rect", {
                x: xb + L * .22,
                y: y - h2 / 2 + 2.5,
                width: L * .7 - j % 2 * 8,
                height: 2.5,
                fill: "rgb(170,220,130)"
            });
        }
        return;
    }
    if (que === "cerdo" || que === "panceta") {
        el(g, "rect", {
            x: x0,
            y: cy - h / 2,
            width: L,
            height: h,
            rx: 4,
            fill: "rgb(230,140,120)",
            ...borde
        });
        const capas = [ [ "rgb(170,90,60)", 0, .16 ], [ "rgb(252,236,214)", .16, .34 ], [ "rgb(214,110,96)", .34, .58 ], [ "rgb(252,236,214)", .58, .72 ], [ "rgb(214,110,96)", .72, 1 ] ];
        for (const [c, a, b] of capas) el(g, "rect", {
            x: x0 + 1.5,
            y: cy - h / 2 + 1.5 + (h - 3) * a,
            width: L - 3,
            height: (h - 3) * (b - a),
            fill: c
        });
        el(g, "rect", {
            x: x0,
            y: cy - h / 2,
            width: L,
            height: h,
            rx: 4,
            fill: "none",
            ...borde
        });
        return;
    }
    if (que === "platano") {
        el(g, "path", {
            d: `M${x0 + 4} ${cy - 2} Q${x0 + L / 2} ${cy + 44} ${x1 - 4} ${cy - 4} Q${x1 + 4} ${cy - 22} ${x1 - 16} ${cy - 20} Q${x0 + L / 2} ${cy + 4} ${x0 + 16} ${cy - 22} Q${x0 - 2} ${cy - 20} ${x0 + 4} ${cy - 2} Z`,
            fill: "rgb(140,186,76)",
            ...borde
        });
        el(g, "path", {
            d: `M${x0 + 18} ${cy - 8} Q${x0 + L / 2} ${cy + 26} ${x1 - 18} ${cy - 10}`,
            fill: "none",
            stroke: "rgb(186,220,120)",
            "stroke-width": 4
        });
        el(g, "path", {
            d: `M${x0 + 10} ${cy - 2} Q${x0 + L / 2} ${cy + 36} ${x1 - 10} ${cy - 4}`,
            fill: "none",
            stroke: "rgb(110,150,60)",
            "stroke-width": 2
        });
        el(g, "rect", {
            x: x1 - 12,
            y: cy - 22,
            width: 7,
            height: 7,
            fill: "rgb(90,70,40)"
        });
        el(g, "rect", {
            x: x0 + 4,
            y: cy - 8,
            width: 6,
            height: 6,
            fill: "rgb(90,70,40)"
        });
        return;
    }
    if (que === "papa") {
        for (let i = 0; i < 2; i++) {
            const cx = x0 + L * (.27 + i * .47);
            el(g, "ellipse", {
                cx: cx,
                cy: cy,
                rx: L * .24,
                ry: h / 2,
                fill: "rgb(222,184,120)",
                ...borde
            });
            for (const [dx, dy] of [ [ -8, -6 ], [ 6, 4 ], [ 12, -8 ], [ -14, 6 ] ]) el(g, "circle", {
                cx: cx + dx,
                cy: cy + dy,
                r: 1.6,
                fill: "rgb(150,110,60)"
            });
        }
        return;
    }
    if (que === "fruta") {
        for (let i = 0; i < 2; i++) {
            const cx = x0 + L * (.27 + i * .47);
            el(g, "ellipse", {
                cx: cx,
                cy: cy,
                rx: L * .22,
                ry: h / 2,
                fill: "rgb(130,70,120)",
                ...borde
            });
            el(g, "ellipse", {
                cx: cx - 8,
                cy: cy - 8,
                rx: 6,
                ry: 4,
                fill: "rgb(170,110,160)"
            });
        }
        return;
    }
    if (que === "tofu") {
        el(g, "rect", {
            x: x0 + 8,
            y: cy - 16,
            width: L - 16,
            height: 38,
            rx: 5,
            fill: "rgb(236,228,206)",
            ...borde
        });
        el(g, "rect", {
            x: x0 + 8,
            y: cy - 24,
            width: L - 16,
            height: 22,
            rx: 5,
            fill: "rgb(252,250,240)",
            ...borde
        });
        el(g, "rect", {
            x: x0 + 18,
            y: cy - 20,
            width: L * .4,
            height: 4,
            rx: 2,
            fill: "#fff"
        });
        return;
    }
    if (que === "res") {
        el(g, "path", {
            d: `M${x0 + 8} ${cy - 14} Q${x0 + 12} ${cy - 32} ${x0 + L * .35} ${cy - 30} Q${x0 + L * .7} ${cy - 36} ${x1 - 10} ${cy - 22} Q${x1 + 4} ${cy} ${x1 - 12} ${cy + 24} Q${x0 + L * .5} ${cy + 34} ${x0 + 14} ${cy + 22} Q${x0 - 2} ${cy + 6} ${x0 + 8} ${cy - 14} Z`,
            fill: "rgb(196,70,66)",
            ...borde
        });
        el(g, "path", {
            d: `M${x0 + 12} ${cy - 18} Q${x0 + L * .4} ${cy - 32} ${x1 - 12} ${cy - 20}`,
            fill: "none",
            stroke: "rgb(252,236,220)",
            "stroke-width": 5
        });
        for (const [fx, fy, fw] of [ [ .18, -4, .14 ], [ .42, 6, .18 ], [ .68, -6, .14 ], [ .3, 16, .12 ], [ .58, -14, .1 ], [ .75, 12, .1 ] ]) el(g, "path", {
            d: `M${x0 + L * fx} ${cy + fy} q${L * fw / 2} -5 ${L * fw} 2`,
            fill: "none",
            stroke: "rgb(244,200,190)",
            "stroke-width": 2.5
        });
        return;
    }
    if (que === "mango") {
        el(g, "ellipse", {
            cx: x0 + L / 2,
            cy: cy,
            rx: L * .47,
            ry: 24,
            fill: "rgb(218,228,140)",
            ...borde
        });
        el(g, "ellipse", {
            cx: x0 + L / 2,
            cy: cy + 2,
            rx: L * .32,
            ry: 10,
            fill: "rgb(236,240,180)"
        });
        el(g, "path", {
            d: `M${x0 + 20} ${cy - 10} Q${x0 + L / 2} ${cy - 22} ${x1 - 20} ${cy - 10}`,
            fill: "none",
            stroke: "rgb(246,248,210)",
            "stroke-width": 3
        });
        return;
    }
    if (que === "repollo") {
        el(g, "ellipse", {
            cx: x0 + L / 2,
            cy: cy,
            rx: L * .42,
            ry: 34,
            fill: "rgb(120,180,90)",
            ...borde
        });
        el(g, "ellipse", {
            cx: x0 + L / 2,
            cy: cy,
            rx: L * .36,
            ry: 28,
            fill: "rgb(214,236,180)"
        });
        for (let i = 1; i <= 4; i++) el(g, "ellipse", {
            cx: x0 + L / 2 + 2 * i,
            cy: cy + i,
            rx: L * .36 - i * 11,
            ry: 28 - i * 6,
            fill: "none",
            stroke: "rgb(170,206,130)",
            "stroke-width": 2
        });
        el(g, "path", {
            d: `M${x0 + L / 2 - 10} ${cy + 24} Q${x0 + L / 2} ${cy + 4} ${x0 + L / 2 + 6} ${cy - 2}`,
            fill: "none",
            stroke: "rgb(246,250,226)",
            "stroke-width": 5
        });
        return;
    }
    if (que === "lulo") {
        for (let i = 0; i < 2; i++) {
            const cx = x0 + L * (.27 + i * .47);
            el(g, "circle", {
                cx: cx,
                cy: cy,
                r: 30,
                fill: "rgb(240,150,40)",
                ...borde
            });
            el(g, "circle", {
                cx: cx,
                cy: cy,
                r: 22,
                fill: "rgb(200,226,120)"
            });
            for (let j = 0; j < 10; j++) {
                const a = j / 10 * Math.PI * 2;
                el(g, "circle", {
                    cx: cx + 12 * Math.cos(a),
                    cy: cy + 12 * Math.sin(a),
                    r: 1.8,
                    fill: "rgb(120,140,60)"
                });
            }
            el(g, "circle", {
                cx: cx,
                cy: cy,
                r: 5,
                fill: "rgb(226,240,170)"
            });
        }
        return;
    }
    if (que === "papaya") {
        el(g, "path", {
            d: `M${x0 + 8} ${cy} Q${x0 + 10} ${cy - 30} ${x0 + L * .5} ${cy - 28} Q${x1 - 4} ${cy - 26} ${x1 - 6} ${cy} Q${x1 - 4} ${cy + 26} ${x0 + L * .5} ${cy + 28} Q${x0 + 10} ${cy + 30} ${x0 + 8} ${cy} Z`,
            fill: "rgb(250,150,90)",
            ...borde
        });
        el(g, "ellipse", {
            cx: x0 + L * .52,
            cy: cy,
            rx: L * .3,
            ry: 11,
            fill: "rgb(236,120,70)"
        });
        for (let j = 0; j < 16; j++) el(g, "circle", {
            cx: x0 + L * .27 + j * L * .033,
            cy: cy + (j % 2 ? 4 : -4),
            r: 2.8,
            fill: "rgb(50,36,36)"
        });
        return;
    }
    if (que === "maduro") {
        el(g, "path", {
            d: `M${x0 + 4} ${cy - 2} Q${x0 + L / 2} ${cy + 44} ${x1 - 4} ${cy - 4} Q${x1 + 4} ${cy - 22} ${x1 - 16} ${cy - 20} Q${x0 + L / 2} ${cy + 4} ${x0 + 16} ${cy - 22} Q${x0 - 2} ${cy - 20} ${x0 + 4} ${cy - 2} Z`,
            fill: "rgb(246,204,96)",
            ...borde
        });
        el(g, "path", {
            d: `M${x0 + 18} ${cy - 8} Q${x0 + L / 2} ${cy + 26} ${x1 - 18} ${cy - 10}`,
            fill: "none",
            stroke: "rgb(252,232,160)",
            "stroke-width": 4
        });
        for (const fx of [ .22, .38, .55, .7, .82 ]) el(g, "circle", {
            cx: x0 + L * fx,
            cy: cy + 10 - 22 * Math.abs(fx - .5),
            r: 2,
            fill: "rgb(200,140,60)"
        });
        return;
    }
    if (que === "masa") {
        el(g, "rect", {
            x: x0 + 6,
            y: cy - 24,
            width: L - 12,
            height: 48,
            rx: 8,
            fill: "rgb(250,244,228)",
            ...borde
        });
        for (const fy of [ -10, 2, 14 ]) el(g, "line", {
            x1: x0 + 10,
            y1: cy + fy,
            x2: x1 - 10,
            y2: cy + fy,
            stroke: "rgb(226,214,190)",
            "stroke-width": 2
        });
        for (let i = 0; i < 14; i++) el(g, "rect", {
            x: x0 + 14 + i * 37 % (L - 28),
            y: cy - 20 + i * 13 % 38,
            width: 2,
            height: 2,
            fill: "rgb(255,255,255)"
        });
        return;
    }
    if (que === "mazorca") {
        el(g, "path", {
            d: `M${x1 - 30} ${cy - 6} L${x1 + 2} ${cy - 26} L${x1 - 6} ${cy} L${x1 + 2} ${cy + 24} L${x1 - 30} ${cy + 6} Z`,
            fill: "rgb(140,190,90)",
            ...borde
        });
        el(g, "rect", {
            x: x0 + 6,
            y: cy - 20,
            width: L - 40,
            height: 40,
            rx: 20,
            fill: "rgb(250,210,80)",
            ...borde
        });
        for (let fx = x0 + 18; fx < x1 - 40; fx += 9) for (let fy = -14; fy <= 12; fy += 8) el(g, "rect", {
            x: fx,
            y: cy + fy,
            width: 6,
            height: 5,
            rx: 2,
            fill: "rgb(255,232,130)",
            stroke: "rgba(200,150,40,0.7)",
            "stroke-width": 1
        });
        return;
    }
    el(g, "rect", {
        x: x0,
        y: cy - h / 2,
        width: L,
        height: h,
        rx: I.redondo ? h / 2.4 : 4,
        fill: I.color,
        ...borde
    });
    if (I.vena) el(g, "rect", {
        x: x0 + 4,
        y: cy - h / 2 + h * .3,
        width: L - 8,
        height: Math.max(2, h * .16),
        fill: I.vena
    });
}

function dibujarBokchoy(g, cx, cy) {
    el(g, "path", {
        d: `M${cx - 80} ${cy + 6} Q${cx - 20} ${cy + 18} ${cx + 10} ${cy + 8} L${cx + 10} ${cy - 4} Q${cx - 20} ${cy - 12} ${cx - 80} ${cy - 2} Z`,
        fill: "rgb(236,244,226)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(g, "path", {
        d: `M${cx + 4} ${cy + 2} Q${cx + 40} ${cy - 40} ${cx + 84} ${cy - 6} Q${cx + 60} ${cy + 36} ${cx + 4} ${cy + 2} Z`,
        fill: "rgb(80,150,70)",
        stroke: TINTA,
        "stroke-width": 3
    });
    el(g, "path", {
        d: `M${cx + 6} ${cy + 2} Q${cx + 44} ${cy - 4} ${cx + 78} ${cy - 6}`,
        fill: "none",
        stroke: "rgb(200,230,180)",
        "stroke-width": 3
    });
    for (const t of [ .35, .6, .82 ]) el(g, "line", {
        x1: cx + 6 + 72 * t,
        y1: cy - 2 - 4 * t,
        x2: cx + 6 + 72 * t + 6,
        y2: cy - 18 + 6 * t,
        stroke: "rgb(200,230,180)",
        "stroke-width": 2
    });
}

const MODO_ADICION = {
    chile: "salsa",
    soya: "salsa",
    vinagre: "salsa",
    salsa_dulce: "salsa",
    arequipe: "salsa",
    hogao: "salsa",
    aji: "salsa",
    guacamole: "salsa",
    crema: "salsa",
    sesamo: "polvo",
    azucar: "polvo",
    canela: "polvo",
    pimienta: "polvo",
    sal: "polvo",
    coco: "polvo",
    osmanto: "polvo",
    cebollin: "polvo",
    cilantro: "polvo",
    mani: "polvo",
    panela: "polvo",
    perlas: "dentro",
    hielo: "dentro",
    almojabana: "lado",
    limon: "lado",
    bocadillo: "lado"
};

const PICADO = {
    cebollin: "rgb(110,180,80)",
    cilantro: "rgb(90,170,80)",
    mani: "rgb(214,170,110)",
    osmanto: "rgb(250,180,50)"
};

export const ZONA_COMIDA = {
    aborrajados: [ 20, 31, 80, 46 ],
    ajiaco: [ 14, 32, 84, 48 ],
    arepa: [ 22, 30, 78, 51 ],
    arroz_con_leche: [ 22, 24, 78, 46 ],
    arroz_frito: [ 21, 29, 67, 46 ],
    bao_cerdo: [ 24, 28, 76, 60 ],
    bao_frijol: [ 24, 28, 76, 60 ],
    bao_verdura: [ 24, 28, 76, 60 ],
    bunuelos: [ 30, 24, 73, 54 ],
    camarones_longjing: [ 23, 31, 81, 42 ],
    chocolate: [ 30, 27, 88, 61 ],
    chunjuan: [ 17, 29, 80, 51 ],
    congyoubing: [ 20, 29, 80, 49 ],
    dan_ta: [ 21, 24, 79, 42 ],
    dongpo: [ 25, 25, 71, 46 ],
    empanada: [ 22, 30, 84, 49 ],
    fideos: [ 16, 30, 84, 48 ],
    guotie: [ 18, 32, 82, 59 ],
    hargow: [ 18, 32, 82, 59 ],
    jianbing: [ 19, 11, 81, 63 ],
    jiaozi: [ 18, 32, 82, 59 ],
    jugo: [ 20, 33, 73, 67 ],
    lamian: [ 14, 30, 84, 48 ],
    liusha: [ 22, 26, 78, 56 ],
    longjing: [ 30, 22, 70, 66 ],
    lulada: [ 34, 31, 66, 66 ],
    luna: [ 15, 22, 85, 59 ],
    mango_biche: [ 24, 10, 79, 38 ],
    mapo: [ 15, 27, 85, 42 ],
    obleas: [ 21, 33, 75, 46 ],
    osmanto: [ 23, 26, 84, 45 ],
    ouzi: [ 17, 29, 83, 49 ],
    pandebono: [ 23, 23, 77, 51 ],
    patacones: [ 12, 35, 85, 46 ],
    pescado_vinagre: [ 15, 33, 74, 48 ],
    pollo_mendigo: [ 20, 23, 80, 49 ],
    salpicon: [ 21, 21, 75, 67 ],
    siumai: [ 16, 19, 84, 61 ],
    sopa_ternera: [ 18, 27, 82, 42 ],
    tamal: [ 21, 30, 79, 58 ],
    tanghulu: [ 39, 17, 56, 50 ],
    tangyuan: [ 20, 24, 80, 50 ],
    te_leche: [ 32, 16, 68, 66 ],
    tinto: [ 30, 28, 60, 44 ],
    xiaolongbao: [ 16, 28, 84, 68 ],
    zongzi: [ 24, 17, 76, 59 ]
};

const BEBIDAS = new Set([ "te_leche", "tinto", "jugo", "lulada", "chocolate", "longjing" ]);

const azarDe = txt => {
    let h = 2166136261;
    for (const c of txt) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return () => {
        h = Math.imul(h ^ h >>> 15, 2246822507) >>> 0;
        return h % 1e4 / 1e4;
    };
};

export function capaAdiciones(lista, receta) {
    const [x0, y0, x1, y1] = ZONA_COMIDA[receta] || [ 22, 26, 78, 56 ];
    const bebida = BEBIDAS.has(receta);
    const w = x1 - x0;
    const h = y1 - y0;
    let svg = "";
    let imgs = "";
    let encima = 0;
    let lado = 0;
    const px = 3;
    const punto = (x, y, color, borde = true) => (borde ? `<rect x="${(x + .8).toFixed(1)}" y="${(y + .8).toFixed(1)}" width="${px}" height="${px}" fill="rgba(22,20,22,0.45)"/>` : "") + `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${px}" height="${px}" fill="${color}"/>`;
    lista.forEach(((o, k) => {
        const modo = MODO_ADICION[o.id] || "encima";
        const r = azarDe(o.id + receta);
        if (modo === "salsa") {
            const ya = y0 + h * (bebida ? .05 : .12) + k * 4;
            const amp = Math.max(4, h * (bebida ? .08 : .28));
            let d = "";
            for (let t = 0; t <= 1; t += .035) {
                const x = x0 + w * (.12 + .76 * t);
                const y = ya + amp * (.5 + .5 * Math.sin(t * Math.PI * 5 + k));
                d += punto(x, y, o.color, true);
            }
            svg += `<g class="ad-salsa">${d}</g>`;
        } else if (modo === "polvo") {
            const n = PICADO[o.id] ? 9 : 16;
            let d = "";
            for (let i = 0; i < n; i++) {
                const x = x0 + w * (.1 + .8 * r());
                const y = y0 + h * (bebida ? .02 + .12 * r() : .05 + .55 * r());
                d += punto(x, y, PICADO[o.id] || o.color, true);
                if (PICADO[o.id]) d += punto(x + px, y, PICADO[o.id], false);
            }
            svg += `<g class="ad-polvo">${d}</g>`;
        } else if (modo === "dentro" && bebida) {
            if (o.id === "perlas") {
                let d = "";
                for (let i = 0; i < 9; i++) d += `<circle cx="${(x0 + w * (.2 + .6 * r())).toFixed(1)}" cy="${(y1 - 6 - 8 * r()).toFixed(1)}" r="3.4" fill="rgb(60,38,34)" stroke="rgb(22,20,22)" stroke-width="0.8"/>`;
                svg += `<g class="ad-dentro">${d}</g>`;
            } else imgs += `<img class="ad-hielo" src="${esc(o.icono || "")}" alt="" draggable="false" style="left:${(x0 + w * (.32 + .3 * (k % 2))).toFixed(1)}%;top:${(y0 + h * .2).toFixed(1)}%" />` + `<img class="ad-hielo" src="${esc(o.icono || "")}" alt="" draggable="false" style="left:${(x0 + w * .62).toFixed(1)}%;top:${(y0 + h * .34).toFixed(1)}%" />`;
        } else if (modo === "lado") {
            const ang = (60 + lado++ * 40) * Math.PI / 180;
            imgs += `<img class="ad-lado" src="${esc(o.icono || "")}" alt="" draggable="false" style="left:${(50 + 52 * Math.cos(ang)).toFixed(1)}%;top:${(50 + 46 * Math.sin(ang)).toFixed(1)}%" />`;
        } else {
            const cx = x0 + w * (.5 + (encima % 2 ? .22 : -.08) * Math.min(1, encima));
            const cy = y0 + h * (bebida ? .08 : .3) - encima * 3;
            encima++;
            imgs += `<img class="ad-encima" src="${esc(o.icono || "")}" alt="" draggable="false" style="left:${cx.toFixed(1)}%;top:${cy.toFixed(1)}%" />`;
        }
    }));
    return `<div class="cocina-sobre"><svg viewBox="0 0 100 100" preserveAspectRatio="none" shape-rendering="crispEdges">${svg}</svg>${imgs}</div>`;
}

function crearVertedor(padre, liquido, px = 228, py = 40) {
    const L = LIQUIDOS[liquido] || LIQUIDOS.agua;
    const tipo = liquido === "te" || liquido === "te_negro" ? "tetera" : liquido === "agua" || liquido === "cafe" ? "olleta" : "jarra";
    const chorroBorde = el(padre, "path", {
        d: "",
        fill: "none",
        stroke: TINTA,
        "stroke-width": 7.5,
        "stroke-linecap": "round",
        opacity: .85
    });
    const chorro = el(padre, "path", {
        d: "",
        fill: "none",
        stroke: L.color,
        "stroke-width": 4.5,
        "stroke-linecap": "round"
    });
    const brillo = el(padre, "path", {
        d: "",
        fill: "none",
        stroke: "rgba(255,255,255,0.55)",
        "stroke-width": 1.4,
        "stroke-linecap": "round"
    });
    const gotas = el(padre, "g", {});
    const g = el(padre, "g", {});
    let pico;
    let inclinado;
    if (tipo === "tetera") {
        el(g, "path", {
            d: "M18 -6 q20 0 18 16 q-2 14 -18 12",
            fill: "none",
            stroke: TINTA,
            "stroke-width": 7
        });
        el(g, "path", {
            d: "M18 -6 q20 0 18 16 q-2 14 -18 12",
            fill: "none",
            stroke: "rgb(250,250,246)",
            "stroke-width": 3.5
        });
        el(g, "path", {
            d: "M-18 10 Q-32 10 -40 -10",
            fill: "none",
            stroke: TINTA,
            "stroke-width": 9,
            "stroke-linecap": "round"
        });
        el(g, "path", {
            d: "M-18 10 Q-32 10 -40 -10",
            fill: "none",
            stroke: "rgb(250,250,246)",
            "stroke-width": 5,
            "stroke-linecap": "round"
        });
        el(g, "ellipse", {
            cx: 0,
            cy: 6,
            rx: 26,
            ry: 20,
            fill: "rgb(250,250,246)",
            stroke: TINTA,
            "stroke-width": 3
        });
        el(g, "path", {
            d: "M-24 8 Q0 18 24 8",
            fill: "none",
            stroke: "rgb(110,150,214)",
            "stroke-width": 3
        });
        for (const [x, y] of [ [ -12, -2 ], [ 2, 2 ], [ 14, -4 ], [ -4, 14 ] ]) {
            el(g, "circle", {
                cx: x,
                cy: y,
                r: 2.6,
                fill: "rgb(110,150,214)"
            });
            el(g, "circle", {
                cx: x,
                cy: y,
                r: .9,
                fill: "rgb(250,250,246)"
            });
        }
        el(g, "ellipse", {
            cx: 0,
            cy: -13,
            rx: 14,
            ry: 4.5,
            fill: "rgb(250,250,246)",
            stroke: TINTA,
            "stroke-width": 2.5
        });
        el(g, "circle", {
            cx: 0,
            cy: -19,
            r: 3.5,
            fill: "rgb(110,150,214)",
            stroke: TINTA,
            "stroke-width": 2
        });
        el(g, "ellipse", {
            cx: -10,
            cy: -2,
            rx: 6,
            ry: 3,
            fill: "rgba(255,255,255,0.9)"
        });
        pico = [ -41, -12 ];
        inclinado = -32;
    } else if (tipo === "olleta") {
        el(g, "rect", {
            x: 22,
            y: -6,
            width: 30,
            height: 7,
            rx: 3,
            fill: "rgb(90,60,40)",
            stroke: TINTA,
            "stroke-width": 2.5
        });
        el(g, "path", {
            d: "M-24 -16 L22 -16 L18 22 Q0 28 -18 22 Z",
            fill: "rgb(196,204,214)",
            stroke: TINTA,
            "stroke-width": 3,
            "stroke-linejoin": "round"
        });
        el(g, "path", {
            d: "M-24 -16 L-32 -22 L-22 -10 Z",
            fill: "rgb(196,204,214)",
            stroke: TINTA,
            "stroke-width": 2.5,
            "stroke-linejoin": "round"
        });
        el(g, "ellipse", {
            cx: -1,
            cy: -16,
            rx: 23,
            ry: 4,
            fill: L.color,
            stroke: TINTA,
            "stroke-width": 2
        });
        el(g, "path", {
            d: "M-16 -8 L-13 16",
            stroke: "rgba(255,255,255,0.8)",
            "stroke-width": 3,
            "stroke-linecap": "round"
        });
        el(g, "path", {
            d: "M-20 4 L20 4",
            stroke: "rgb(70,110,170)",
            "stroke-width": 3
        });
        pico = [ -33, -22 ];
        inclinado = -42;
    } else {
        el(g, "path", {
            d: "M18 -16 q22 2 18 18 q-4 14 -20 14",
            fill: "none",
            stroke: TINTA,
            "stroke-width": 7.5
        });
        el(g, "path", {
            d: "M18 -16 q22 2 18 18 q-4 14 -20 14",
            fill: "none",
            stroke: "rgb(246,236,214)",
            "stroke-width": 3.5
        });
        el(g, "path", {
            d: "M-20 -26 L18 -26 Q28 -2 18 26 L-16 26 Q-28 -2 -20 -26 Z",
            fill: "rgb(246,236,214)",
            stroke: TINTA,
            "stroke-width": 3,
            "stroke-linejoin": "round"
        });
        el(g, "path", {
            d: "M-20 -26 L-34 -31 L-21 -17 Z",
            fill: "rgb(246,236,214)",
            stroke: TINTA,
            "stroke-width": 2.5,
            "stroke-linejoin": "round"
        });
        el(g, "path", {
            d: "M-24 -4 Q0 2 25 -4",
            fill: "none",
            stroke: "rgb(214,120,90)",
            "stroke-width": 4
        });
        el(g, "path", {
            d: "M-23 4 Q0 10 24 4",
            fill: "none",
            stroke: "rgb(214,120,90)",
            "stroke-width": 1.5
        });
        el(g, "ellipse", {
            cx: -1,
            cy: -26,
            rx: 19,
            ry: 4,
            fill: L.color,
            stroke: TINTA,
            "stroke-width": 2
        });
        el(g, "path", {
            d: "M-13 -18 Q-17 0 -11 18",
            fill: "none",
            stroke: "rgba(255,255,255,0.75)",
            "stroke-width": 3,
            "stroke-linecap": "round"
        });
        pico = [ -35, -31 ];
        inclinado = -40;
    }
    let ang = 0;
    let ultima = 0;
    const actualizar = (apretado, [dx, dy], t) => {
        const meta = apretado ? inclinado : 0;
        ang += (meta - ang) * .22;
        g.setAttribute("transform", `translate(${px} ${py}) rotate(${ang.toFixed(1)})`);
        const a = ang * Math.PI / 180;
        const tx = px + Math.cos(a) * pico[0] - Math.sin(a) * pico[1];
        const ty = py + Math.sin(a) * pico[0] + Math.cos(a) * pico[1];
        const sale = apretado && ang < inclinado * .7;
        if (sale) {
            const temb = Math.sin(t / 45) * 1.2;
            const d = `M${tx.toFixed(1)} ${ty.toFixed(1)} C${(tx - 10).toFixed(1)} ${(ty + 2).toFixed(1)} ${(dx + 6 + temb).toFixed(1)} ${(dy - 40).toFixed(1)} ${(dx + temb).toFixed(1)} ${dy.toFixed(1)}`;
            chorroBorde.setAttribute("d", d);
            chorro.setAttribute("d", d);
            brillo.setAttribute("d", d);
            brillo.setAttribute("transform", "translate(-1 0)");
            if (t - ultima > 70) {
                ultima = t;
                const gt = el(gotas, "circle", {
                    cx: dx + (Math.random() - .5) * 14,
                    cy: dy - 2,
                    r: 1.6 + Math.random() * 1.4,
                    fill: L.color,
                    stroke: "rgba(0,0,0,0.3)",
                    "stroke-width": .6
                });
                gt._t = t;
                gt._vx = (Math.random() - .5) * 40;
            }
        } else {
            chorroBorde.setAttribute("d", "");
            chorro.setAttribute("d", "");
            brillo.setAttribute("d", "");
        }
        for (const gt of [ ...gotas.children ]) {
            if (gt.hasAttribute("data-px")) continue;
            const e = (t - gt._t) / 1e3;
            if (e > .35) gt.remove(); else {
                gt.setAttribute("transform", `translate(${(gt._vx * e).toFixed(1)} ${(-60 * e + 220 * e * e).toFixed(1)})`);
                gt.setAttribute("opacity", (1 - e / .35).toFixed(2));
            }
        }
    };
    return {
        actualizar: actualizar
    };
}

function baseEspolvorear(s, receta, plato) {
    const Z = {
        cx: 150,
        cy: 104,
        rx: 104,
        ry: 48
    };
    const r = azarDe("polvo" + receta);
    const {cx: cx, cy: cy, rx: rx, ry: ry} = Z;
    const dentro = (k = .85) => {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * k;
        return [ cx + rx * d * Math.cos(a), cy + ry * d * Math.sin(a) ];
    };
    const VASOS = {
        jugo: "rgb(255,196,60)",
        longjing: "rgb(228,240,232)",
        mango_biche: "papel"
    };
    const TAZONES = {
        ajiaco: "rgb(250,214,110)",
        arroz_con_leche: "rgb(250,244,226)",
        mapo: "rgb(200,60,40)"
    };
    if (receta === "tinto") {
        el(s, "ellipse", {
            cx: cx,
            cy: cy + 6,
            rx: rx + 14,
            ry: ry + 14,
            fill: "rgba(60,40,30,0.15)"
        });
        el(s, "ellipse", {
            cx: cx,
            cy: cy,
            rx: rx + 12,
            ry: ry + 12,
            fill: "rgb(196,204,214)",
            stroke: TINTA,
            "stroke-width": 3
        });
        el(s, "ellipse", {
            cx: cx,
            cy: cy,
            rx: rx + 6,
            ry: ry + 6,
            fill: "none",
            stroke: "rgb(70,110,170)",
            "stroke-width": 3
        });
        el(s, "ellipse", {
            cx: cx,
            cy: cy,
            rx: rx,
            ry: ry,
            fill: "rgb(176,120,64)",
            stroke: "rgba(0,0,0,0.25)",
            "stroke-width": 2
        });
        for (let i = 0; i < 10; i++) {
            const [x, y] = dentro(.8);
            el(s, "circle", {
                cx: x,
                cy: y,
                r: 2 + r() * 3,
                fill: "none",
                stroke: "rgba(255,240,210,0.7)",
                "stroke-width": 1.5
            });
        }
        el(s, "rect", {
            x: cx + rx + 8,
            y: cy - 6,
            width: 34,
            height: 10,
            rx: 4,
            fill: "rgb(90,60,40)",
            stroke: TINTA,
            "stroke-width": 2.5
        });
        return Z;
    }
    if (VASOS[receta]) {
        const papel = VASOS[receta] === "papel";
        el(s, "ellipse", {
            cx: cx,
            cy: cy + 4,
            rx: rx + 10,
            ry: ry + 12,
            fill: "rgba(60,40,30,0.15)"
        });
        el(s, "ellipse", {
            cx: cx,
            cy: cy,
            rx: rx + 8,
            ry: ry + 8,
            fill: papel ? "rgb(252,252,248)" : "rgba(236,246,250,0.9)",
            stroke: TINTA,
            "stroke-width": 3
        });
        if (papel) el(s, "ellipse", {
            cx: cx,
            cy: cy,
            rx: rx + 4,
            ry: ry + 4,
            fill: "none",
            stroke: "rgb(220,70,70)",
            "stroke-width": 3
        });
        el(s, "ellipse", {
            cx: cx,
            cy: cy,
            rx: rx,
            ry: ry,
            fill: papel ? "rgb(214,226,150)" : VASOS[receta],
            stroke: papel ? "rgb(170,180,110)" : "rgb(180,206,220)",
            "stroke-width": 3
        });
        if (papel) {
            for (let i = 0; i < 26; i++) {
                const [x, y] = dentro(.88);
                el(s, "rect", {
                    x: x - 6,
                    y: y - 5,
                    width: 12,
                    height: 10,
                    rx: 2,
                    fill: i % 3 ? "rgb(222,232,150)" : "rgb(236,240,180)",
                    stroke: "rgb(120,140,60)",
                    "stroke-width": 1.5
                });
            }
        } else if (receta === "jugo") {
            for (let i = 0; i < 22; i++) {
                const [x, y] = dentro(.9);
                el(s, "ellipse", {
                    cx: x,
                    cy: y,
                    rx: 3.4,
                    ry: 2.6,
                    fill: "rgb(255,226,120)"
                });
                el(s, "ellipse", {
                    cx: x,
                    cy: y,
                    rx: 1.8,
                    ry: 1.4,
                    fill: "rgb(40,30,24)"
                });
            }
        }
        el(s, "path", {
            d: `M${cx - rx * .7} ${cy - ry * .75} Q${cx - rx * .2} ${cy - ry * 1.05} ${cx + rx * .3} ${cy - ry * .95}`,
            fill: "none",
            stroke: "rgba(255,255,255,0.8)",
            "stroke-width": 4,
            "stroke-linecap": "round"
        });
    } else if (TAZONES[receta]) {
        el(s, "ellipse", {
            cx: cx,
            cy: cy + 6,
            rx: rx + 14,
            ry: ry + 14,
            fill: "rgba(60,40,30,0.15)"
        });
        el(s, "ellipse", {
            cx: cx,
            cy: cy,
            rx: rx + 12,
            ry: ry + 12,
            fill: "rgb(250,250,246)",
            stroke: TINTA,
            "stroke-width": 3
        });
        el(s, "ellipse", {
            cx: cx,
            cy: cy,
            rx: rx + 7,
            ry: ry + 7,
            fill: "none",
            stroke: "rgb(110,150,214)",
            "stroke-width": 2.5
        });
        el(s, "ellipse", {
            cx: cx,
            cy: cy,
            rx: rx,
            ry: ry,
            fill: TAZONES[receta],
            stroke: "rgba(0,0,0,0.25)",
            "stroke-width": 2
        });
        if (receta === "ajiaco") {
            for (let i = 0; i < 16; i++) {
                const [x, y] = dentro();
                const tipo = i % 4;
                if (tipo === 0) el(s, "ellipse", {
                    cx: x,
                    cy: y,
                    rx: 8,
                    ry: 5,
                    fill: "rgb(250,226,110)",
                    stroke: "rgb(200,160,60)",
                    "stroke-width": 1.5
                }); else if (tipo === 1) el(s, "path", {
                    d: `M${x - 8} ${y} q8 -5 16 0`,
                    fill: "none",
                    stroke: "rgb(250,236,214)",
                    "stroke-width": 3.5,
                    "stroke-linecap": "round"
                }); else el(s, "rect", {
                    x: x - 5,
                    y: y - 4,
                    width: 10,
                    height: 8,
                    rx: 2,
                    fill: tipo === 2 ? "rgb(250,232,150)" : "rgb(240,200,90)",
                    stroke: "rgba(150,110,40,0.7)",
                    "stroke-width": 1.2
                });
            }
        } else if (receta === "arroz_con_leche") {
            for (let i = 0; i < 44; i++) {
                const [x, y] = dentro(.9);
                el(s, "ellipse", {
                    cx: x,
                    cy: y,
                    rx: 2.6,
                    ry: 1.3,
                    fill: "rgb(255,255,250)",
                    stroke: "rgba(190,170,140,0.8)",
                    "stroke-width": .7,
                    transform: `rotate(${Math.round(r() * 180)} ${x.toFixed(1)} ${y.toFixed(1)})`
                });
            }
        } else {
            for (let i = 0; i < 12; i++) {
                const [x, y] = dentro(.8);
                el(s, "rect", {
                    x: x - 7,
                    y: y - 6,
                    width: 14,
                    height: 12,
                    rx: 2,
                    fill: "rgb(252,248,236)",
                    stroke: TINTA,
                    "stroke-width": 1.5
                });
                el(s, "rect", {
                    x: x - 6,
                    y: y + 1,
                    width: 12,
                    height: 4,
                    fill: "rgba(214,70,40,0.6)"
                });
            }
        }
    } else {
        const plancha = receta === "jianbing";
        el(s, "ellipse", {
            cx: cx,
            cy: cy + 6,
            rx: rx + 14,
            ry: ry + 14,
            fill: "rgba(60,40,30,0.15)"
        });
        el(s, "ellipse", {
            cx: cx,
            cy: cy,
            rx: rx + 12,
            ry: ry + 12,
            fill: plancha ? "rgb(70,70,80)" : "rgb(252,252,250)",
            stroke: TINTA,
            "stroke-width": 3
        });
        if (!plancha) el(s, "ellipse", {
            cx: cx,
            cy: cy,
            rx: rx - 4,
            ry: ry - 4,
            fill: "none",
            stroke: "rgb(220,220,226)",
            "stroke-width": 2.5
        });
        if (receta === "patacones") {
            for (const [x, y] of [ [ -52, -12 ], [ -6, -20 ], [ 40, -8 ], [ -28, 18 ], [ 18, 18 ] ]) {
                el(s, "ellipse", {
                    cx: cx + x,
                    cy: cy + y,
                    rx: 26,
                    ry: 15,
                    fill: "rgb(236,176,70)",
                    stroke: TINTA,
                    "stroke-width": 2.5
                });
                el(s, "ellipse", {
                    cx: cx + x,
                    cy: cy + y - 1,
                    rx: 17,
                    ry: 9,
                    fill: "rgb(250,210,110)"
                });
                for (const [a, b] of [ [ -8, -3 ], [ 6, 2 ], [ -2, 5 ] ]) el(s, "circle", {
                    cx: cx + x + a,
                    cy: cy + y + b,
                    r: 1.6,
                    fill: "rgb(200,130,40)"
                });
            }
        } else if (receta === "camarones_longjing") {
            for (const [x, y, gi] of [ [ -58, -10, false ], [ -24, -22, true ], [ 12, -14, false ], [ 48, -20, true ], [ -40, 16, true ], [ 0, 14, false ], [ 44, 14, false ] ]) dibujarCamaron(s, cx + x, cy + y, .8, gi);
        } else if (receta === "obleas") {
            el(s, "ellipse", {
                cx: cx,
                cy: cy,
                rx: rx - 8,
                ry: ry - 4,
                fill: "rgb(246,222,170)",
                stroke: TINTA,
                "stroke-width": 2.5
            });
            el(s, "ellipse", {
                cx: cx,
                cy: cy,
                rx: rx - 16,
                ry: ry - 10,
                fill: "rgb(170,96,46)"
            });
            el(s, "path", {
                d: `M${cx - 50} ${cy - 18} q20 -8 40 -4`,
                fill: "none",
                stroke: "rgba(255,220,180,0.5)",
                "stroke-width": 4,
                "stroke-linecap": "round"
            });
        } else if (plancha) {
            el(s, "ellipse", {
                cx: cx,
                cy: cy,
                rx: rx,
                ry: ry,
                fill: "rgb(250,226,150)",
                stroke: TINTA,
                "stroke-width": 2.5
            });
            for (let i = 0; i < 7; i++) {
                const [x, y] = dentro(.7);
                el(s, "ellipse", {
                    cx: x,
                    cy: y,
                    rx: 14 + r() * 10,
                    ry: 7 + r() * 5,
                    fill: "rgba(255,206,70,0.75)"
                });
            }
            for (let i = 0; i < 18; i++) {
                const [x, y] = dentro(.9);
                el(s, "circle", {
                    cx: x,
                    cy: y,
                    r: 1.2,
                    fill: "rgb(40,30,30)"
                });
            }
        } else {
            el(s, "ellipse", {
                cx: cx,
                cy: cy,
                rx: rx - 8,
                ry: ry - 6,
                fill: "rgb(244,240,232)"
            });
            if (plato) el(s, "image", {
                href: plato,
                x: cx - 50,
                y: cy - 50,
                width: 100,
                height: 100,
                style: "image-rendering:pixelated"
            });
        }
    }
    return Z;
}

function comidaDelWok(padre, receta) {
    const g = el(padre, "g", {
        class: "wok-comida"
    });
    const piezas = [];
    const r = azarDe("wok" + receta);
    const pieza = (dx, dy) => {
        const p = el(g, "g", {
            transform: `translate(${dx} ${dy})`
        });
        p._dx = dx;
        p._dy = dy;
        p._giro = (r() - .5) * 720;
        piezas.push(p);
        return p;
    };
    if (receta === "camarones_longjing") {
        const base = pieza(0, -6);
        el(base, "ellipse", {
            cx: 0,
            cy: 0,
            rx: 44,
            ry: 7,
            fill: "rgb(200,214,150)",
            stroke: TINTA,
            "stroke-width": 2
        });
        for (const [x, y, gi] of [ [ -26, -14, false ], [ -2, -18, true ], [ 22, -13, false ], [ 8, -8, true ] ]) dibujarCamaron(pieza(x, y), 0, 0, .5, gi);
        for (let i = 0; i < 8; i++) {
            const p = pieza(-38 + i * 11, -8 - r() * 12);
            el(p, "ellipse", {
                cx: 0,
                cy: 0,
                rx: 4.5,
                ry: 2,
                fill: "rgb(100,156,74)",
                stroke: "rgba(0,0,0,0.45)",
                "stroke-width": .8,
                transform: `rotate(${Math.round(r() * 180)})`
            });
        }
    } else if (receta === "mapo") {
        const base = pieza(0, -6);
        el(base, "ellipse", {
            cx: 0,
            cy: 0,
            rx: 46,
            ry: 8,
            fill: "rgb(196,56,36)",
            stroke: TINTA,
            "stroke-width": 2
        });
        for (let i = 0; i < 8; i++) {
            const p = pieza(-36 + i * 10 + (r() - .5) * 4, -12 - i % 3 * 5);
            el(p, "rect", {
                x: -5,
                y: -5,
                width: 10,
                height: 10,
                rx: 1.5,
                fill: "rgb(252,248,236)",
                stroke: TINTA,
                "stroke-width": 1.6
            });
            el(p, "rect", {
                x: -4,
                y: 1,
                width: 8,
                height: 3,
                fill: "rgba(214,70,40,0.75)"
            });
        }
        for (let i = 0; i < 10; i++) el(pieza(-40 + r() * 80, -6 - r() * 16), "rect", {
            x: -1.5,
            y: -1.5,
            width: 3,
            height: 3,
            fill: i % 2 ? "rgb(120,50,30)" : "rgb(60,30,24)"
        });
    } else {
        const base = pieza(0, -7);
        el(base, "path", {
            d: "M-46 2 Q-40 -14 0 -16 Q40 -14 46 2 Z",
            fill: "rgb(250,244,226)",
            stroke: TINTA,
            "stroke-width": 2
        });
        for (let i = 0; i < 26; i++) {
            const p = pieza(-40 + r() * 80, -8 - r() * 14);
            el(p, "ellipse", {
                cx: 0,
                cy: 0,
                rx: 2.6,
                ry: 1.4,
                fill: "rgb(255,252,240)",
                stroke: "rgba(150,130,100,0.7)",
                "stroke-width": .7,
                transform: `rotate(${Math.round(r() * 180)})`
            });
        }
        for (let i = 0; i < 7; i++) el(pieza(-34 + i * 11, -10 - r() * 10), "rect", {
            x: -3,
            y: -2.5,
            width: 6,
            height: 5,
            rx: 2,
            fill: "rgb(255,214,80)",
            stroke: "rgba(180,130,30,0.8)",
            "stroke-width": .8
        });
        for (let i = 0; i < 9; i++) el(pieza(-38 + r() * 76, -8 - r() * 14), "rect", {
            x: -1.5,
            y: -1.5,
            width: 3.5,
            height: 3,
            fill: "rgb(100,176,70)"
        });
    }
    return {
        g: g,
        piezas: piezas
    };
}

export function crearPaso(area, paso, ctx, alTerminar) {
    area.innerHTML = "";
    const {sonar: sonar = () => {}, vibrar: vibrar = () => {}, ayuda: ayuda = () => {}, boton: boton = () => {}} = ctx;
    const D = Math.max(-.5, Math.min(1, ctx.dif || 0));
    const MJ = ctx.mejoras || {};
    const MASA_R = MASA_DE[ctx.receta] || MASA;
    const ancho = (w, k = .35) => w * (1 - k * D);
    const rapido = (k = .25) => 1 + k * D;
    const mas = (n, k) => n + Math.round(Math.max(0, D) * k);
    let vivo = true;
    let raf = 0;
    let terminado = false;
    const fin = e => {
        if (terminado) return;
        terminado = true;
        vivo = false;
        cancelAnimationFrame(raf);
        boton(null);
        e = Math.max(1, Math.min(3, Math.round(e * 10) / 10));
        sonar(e >= 2.9 ? "hallazgo" : e >= 2.3 ? "hito" : "mimo");
        vibrar(e >= 2.9 ? [ 15, 30, 15 ] : 20);
        setTimeout((() => alTerminar(e)), 450);
    };
    const s = svg(area);
    const pix = pixelar(s, {
        G: 2
    });
    const t0 = performance.now();
    const bucle = fn => {
        const f = ahora => {
            if (!vivo) return;
            fn(ahora - t0);
            raf = requestAnimationFrame(f);
        };
        raf = requestAnimationFrame(f);
    };
    const aSvg = e => {
        const r = s.getBoundingClientRect();
        const k = Math.min(r.width / 300, r.height / 200);
        const ox = (r.width - 300 * k) / 2;
        const oy = (r.height - 200 * k) / 2;
        return [ (e.clientX - r.left - ox) / k, (e.clientY - r.top - oy) / k ];
    };
    if (paso.t === "amasar") {
        const TOTAL = 6;
        let n = 0;
        let buenos = 0;
        const masa = el(s, "ellipse", {
            cx: 150,
            cy: 104,
            rx: 46,
            ry: 38,
            fill: MASA_R,
            stroke: TINTA,
            "stroke-width": 3
        });
        el(s, "ellipse", {
            cx: 150,
            cy: 128,
            rx: 36,
            ry: 6,
            fill: MASA_R === MASA ? MASA_SOMBRA : oscurecer(MASA_R, .88),
            opacity: .8
        });
        const anillo = el(s, "ellipse", {
            cx: 150,
            cy: 104,
            rx: 90,
            ry: 74,
            fill: "none",
            stroke: "rgb(214,70,64)",
            "stroke-width": 4,
            "stroke-dasharray": "8 6"
        });
        const zona = el(s, "ellipse", {
            cx: 150,
            cy: 104,
            rx: 50,
            ry: 42,
            fill: "none",
            stroke: "rgb(120,190,110)",
            "stroke-width": 9,
            opacity: .45
        });
        const cuenta = el(s, "text", {
            x: 150,
            y: 24,
            "text-anchor": "middle",
            class: "cocina-cuenta"
        });
        cuenta.textContent = `0 / ${TOTAL}`;
        ayuda("Tap when the red ring meets the green line");
        const P = 1300 / rapido();
        const TOL = ancho(.13);
        const notasA = [];
        let k = 1;
        bucle((t => {
            k = 1 + .95 * (1 - t % P / P);
            anillo.setAttribute("rx", 46 * k);
            anillo.setAttribute("ry", 38 * k);
        }));
        const tocar = e => {
            e.preventDefault();
            if (!vivo) return;
            n++;
            const ok = Math.abs(k - 1.09) < TOL;
            if (ok) buenos++;
            notasA.push(notaDe(k - 1.09, TOL, .25));
            sonar(ok ? "tocar" : "no");
            masa.setAttribute("rx", ok ? 52 : 44);
            masa.setAttribute("ry", ok ? 32 : 40);
            setTimeout((() => {
                masa.setAttribute("rx", 46);
                masa.setAttribute("ry", 38);
            }), 140);
            zona.setAttribute("stroke", ok ? "rgb(120,190,110)" : "rgb(222,110,100)");
            cuenta.textContent = `${n} / ${TOTAL}`;
            if (n >= TOTAL) fin(promedio(notasA));
        };
        s.addEventListener("pointerdown", tocar);
    } else if (paso.t === "estirar") {
        const MIN = 71 - ancho(5, .4);
        const MAX = 71 + ancho(5, .4);
        let r = 32;
        el(s, "circle", {
            cx: 150,
            cy: 104,
            r: MAX,
            fill: "none",
            stroke: "rgb(120,190,110)",
            "stroke-width": MAX - MIN,
            opacity: .25
        });
        el(s, "circle", {
            cx: 150,
            cy: 104,
            r: (MIN + MAX) / 2,
            fill: "none",
            stroke: "rgb(80,150,80)",
            "stroke-width": 2,
            "stroke-dasharray": "6 6"
        });
        const masa = el(s, "circle", {
            cx: 150,
            cy: 104,
            r: r,
            fill: MASA_R,
            stroke: TINTA,
            "stroke-width": 3
        });
        const palote = el(s, "g", {});
        el(palote, "rect", {
            x: -70,
            y: -8,
            width: 140,
            height: 16,
            rx: 7,
            fill: "rgb(214,170,104)",
            stroke: TINTA,
            "stroke-width": 3
        });
        el(palote, "rect", {
            x: -92,
            y: -5,
            width: 24,
            height: 10,
            rx: 4,
            fill: "rgb(150,100,60)",
            stroke: TINTA,
            "stroke-width": 3
        });
        el(palote, "rect", {
            x: 68,
            y: -5,
            width: 24,
            height: 10,
            rx: 4,
            fill: "rgb(150,100,60)",
            stroke: TINTA,
            "stroke-width": 3
        });
        palote.setAttribute("transform", "translate(150 104)");
        ayuda("Drag the pin · stop inside the green circle");
        let prev = null;
        s.addEventListener("pointerdown", (e => {
            if (!vivo) return;
            e.preventDefault();
            try {
                s.setPointerCapture(e.pointerId);
            } catch (err) {}
            prev = aSvg(e);
        }));
        s.addEventListener("pointermove", (e => {
            if (!vivo || !prev) return;
            const p = aSvg(e);
            const d = Math.hypot(p[0] - prev[0], p[1] - prev[1]);
            r = Math.min(110, r + d * .07);
            masa.setAttribute("r", r.toFixed(1));
            masa.setAttribute("fill", r > MAX ? "rgb(250,232,220)" : MASA_R);
            palote.setAttribute("transform", `translate(${Math.max(60, Math.min(240, p[0]))} ${Math.max(40, Math.min(170, p[1]))}) rotate(${(p[1] - 104) * .2})`);
            prev = p;
        }));
        const soltar = () => {
            if (!vivo || !prev) return;
            prev = null;
            if (r >= MIN) fin(estrellasDeEstirar(r, MIN, MAX));
        };
        s.addEventListener("pointerup", soltar);
        s.addEventListener("pointercancel", soltar);
    } else if (paso.t === "rellenar" || paso.t === "verter") {
        const MEDIO_RV = ancho(.09) + .015 * (MJ.ollas || 0);
        const META = paso.meta || .71;
        const A = META - MEDIO_RV;
        const B = META + MEDIO_RV;
        const esVerter = paso.t === "verter";
        const F0 = paso.previo ? paso.previo.nivel : 0;
        let f = F0;
        s.dataset.meta = META;
        s.dataset.desde = F0;
        let apretado = false;
        let barra;
        if (esVerter && (paso.en === "plancha" || paso.en === "plato" || paso.en === "wok" || paso.en === "tazon")) {
            const L = LIQUIDOS[paso.liquido] || LIQUIDOS.agua;
            if (paso.en === "tazon") {
                el(s, "circle", {
                    cx: 130,
                    cy: 108,
                    r: 84,
                    fill: "rgb(250,250,246)",
                    stroke: TINTA,
                    "stroke-width": 3
                });
                el(s, "circle", {
                    cx: 130,
                    cy: 108,
                    r: 78,
                    fill: "none",
                    stroke: "rgb(110,150,214)",
                    "stroke-width": 3
                });
                el(s, "circle", {
                    cx: 130,
                    cy: 108,
                    r: 72,
                    fill: "rgb(236,232,222)"
                });
            } else if (paso.en === "plancha" || paso.en === "wok") {
                el(s, "circle", {
                    cx: 130,
                    cy: 108,
                    r: 82,
                    fill: paso.en === "wok" ? "rgb(56,56,64)" : "rgb(70,70,80)",
                    stroke: TINTA,
                    "stroke-width": 3
                });
                el(s, "circle", {
                    cx: 130,
                    cy: 108,
                    r: 74,
                    fill: paso.en === "wok" ? "rgb(84,84,96)" : "rgb(96,96,108)"
                });
                if (paso.en === "wok") el(s, "circle", {
                    cx: 130,
                    cy: 108,
                    r: 50,
                    fill: "rgb(104,104,116)"
                });
                el(s, "rect", {
                    x: 208,
                    y: 102,
                    width: 40,
                    height: 12,
                    rx: 5,
                    fill: "rgb(110,72,50)",
                    stroke: TINTA,
                    "stroke-width": 3
                });
            } else {
                el(s, "circle", {
                    cx: 130,
                    cy: 108,
                    r: 80,
                    fill: "rgb(252,252,250)",
                    stroke: TINTA,
                    "stroke-width": 3
                });
                el(s, "circle", {
                    cx: 130,
                    cy: 108,
                    r: 62,
                    fill: "none",
                    stroke: "rgb(214,214,222)",
                    "stroke-width": 3
                });
                if (ctx.plato) el(s, "image", {
                    href: ctx.plato,
                    x: 96,
                    y: 74,
                    width: 68,
                    height: 68,
                    style: "image-rendering:pixelated",
                    opacity: .9
                });
            }
            el(s, "circle", {
                cx: 130,
                cy: 108,
                r: 60 * B,
                fill: "rgba(120,190,110,0.22)",
                stroke: "rgb(80,150,80)",
                "stroke-width": 2,
                "stroke-dasharray": "5 4"
            });
            el(s, "circle", {
                cx: 130,
                cy: 108,
                r: 60 * A,
                fill: "none",
                stroke: "rgb(80,150,80)",
                "stroke-width": 2,
                "stroke-dasharray": "5 4"
            });
            barra = el(s, "circle", {
                cx: 130,
                cy: 108,
                r: 0,
                fill: L.color,
                stroke: "rgba(0,0,0,0.25)",
                "stroke-width": 2,
                opacity: paso.en === "plato" ? .85 : paso.en === "wok" ? .8 : 1
            });
            if (paso.en === "plancha" && ctx.receta === "guotie") {
                for (const [x, y] of [ [ -34, -22 ], [ 8, -26 ], [ -22, 18 ], [ 22, 14 ] ]) {
                    const g = el(s, "g", {
                        transform: `translate(${130 + x} ${108 + y})`
                    });
                    el(g, "path", {
                        d: "M-22 8 Q-22 -14 0 -14 Q22 -14 22 8 Z",
                        fill: "rgb(250,244,230)",
                        stroke: TINTA,
                        "stroke-width": 2.5
                    });
                    el(g, "rect", {
                        x: -20,
                        y: 4,
                        width: 40,
                        height: 4,
                        rx: 2,
                        fill: "rgb(214,150,70)"
                    });
                    for (const a of [ -12, -4, 4, 12 ]) el(g, "path", {
                        d: `M${a} -12 q2 4 0 8`,
                        fill: "none",
                        stroke: "rgba(150,130,110,0.6)",
                        "stroke-width": 1.5
                    });
                }
            }
            if (paso.en === "tazon") {
                for (let i = 0; i < 7; i++) {
                    const y = 108 - 36 + i * 12;
                    el(s, "path", {
                        d: `M${90} ${y} q10 -6 20 0 t20 0 t20 0 t20 0`,
                        fill: "none",
                        stroke: "rgb(196,170,110)",
                        "stroke-width": 6,
                        "stroke-linecap": "round"
                    });
                    el(s, "path", {
                        d: `M${90} ${y} q10 -6 20 0 t20 0 t20 0 t20 0`,
                        fill: "none",
                        stroke: "rgb(250,236,190)",
                        "stroke-width": 3,
                        "stroke-linecap": "round"
                    });
                }
                if (ctx.receta === "lamian") for (const [x, y] of [ [ -30, -30 ], [ 16, -34 ], [ 30, 20 ], [ -22, 26 ] ]) {
                    el(s, "rect", {
                        x: 130 + x - 10,
                        y: 108 + y - 6,
                        width: 20,
                        height: 12,
                        rx: 3,
                        fill: "rgb(170,80,66)",
                        stroke: TINTA,
                        "stroke-width": 2
                    });
                    el(s, "rect", {
                        x: 130 + x - 8,
                        y: 108 + y - 4,
                        width: 16,
                        height: 3,
                        fill: "rgb(236,190,170)"
                    });
                }
            }
            if (paso.en === "wok") for (const [x, y, gi] of [ [ -30, -12, false ], [ 4, -26, true ], [ 30, -4, false ], [ -8, 16, true ], [ 22, 24, false ] ]) dibujarCamaron(s, 130 + x, 108 + y, .75, gi);
            const vertedor = crearVertedor(s, paso.liquido, 236, 44);
            ayuda("Hold to pour · let go in the green ring");
            let tPrevV = 0;
            bucle((t => {
                const dt = Math.min(50, t - tPrevV) / (1e3 / 60);
                tPrevV = t;
                if (apretado) f = Math.min(1, f + .0085 * dt);
                barra.setAttribute("r", (60 * f).toFixed(1));
                vertedor.actualizar(apretado, [ 134, 106 ], t);
                if (f >= 1 && apretado) {
                    apretado = false;
                    fin(1);
                }
            }));
        } else if (esVerter && paso.en === "olla") {
            const L = LIQUIDOS[paso.liquido] || LIQUIDOS.agua;
            const Y_ARR = 70;
            const Y_ABA = 164;
            el(s, "rect", {
                x: 60,
                y: Y_ARR,
                width: 180,
                height: Y_ABA - Y_ARR,
                rx: 10,
                fill: "rgb(150,154,170)",
                stroke: TINTA,
                "stroke-width": 3
            });
            el(s, "rect", {
                x: 40,
                y: Y_ARR + 8,
                width: 22,
                height: 8,
                fill: "rgb(90,90,100)",
                stroke: TINTA,
                "stroke-width": 3
            });
            el(s, "rect", {
                x: 238,
                y: Y_ARR + 8,
                width: 22,
                height: 8,
                fill: "rgb(90,90,100)",
                stroke: TINTA,
                "stroke-width": 3
            });
            el(s, "rect", {
                x: 68,
                y: Y_ARR + 4,
                width: 164,
                height: Y_ABA - Y_ARR - 10,
                fill: "rgb(70,72,84)"
            });
            const ALTO = Y_ABA - Y_ARR - 12;
            if (paso.previo) {
                el(s, "rect", {
                    x: 68,
                    y: Y_ABA - 6 - ALTO * F0,
                    width: 164,
                    height: ALTO * F0,
                    fill: (LIQUIDOS[paso.previo.liquido] || LIQUIDOS.agua).color
                });
                const rp = azarDe("olla" + paso.previo.liquido);
                for (let i = 0; i < (paso.previo.liquido === "arroz_cocido" ? 34 : 10); i++) {
                    const x = 74 + rp() * 150;
                    const y = Y_ABA - 9 - rp() * (ALTO * F0 - 6);
                    if (paso.previo.liquido === "arroz_cocido") el(s, "ellipse", {
                        cx: x,
                        cy: y,
                        rx: 2.8,
                        ry: 1.4,
                        fill: "rgb(255,255,252)",
                        stroke: "rgba(190,170,140,0.8)",
                        "stroke-width": .7
                    }); else el(s, "rect", {
                        x: x - 4,
                        y: y - 3,
                        width: 8,
                        height: 6,
                        rx: 1.5,
                        fill: i % 3 ? "rgb(160,70,56)" : "rgb(110,170,80)",
                        stroke: "rgba(0,0,0,0.4)",
                        "stroke-width": 1
                    });
                }
            }
            barra = el(s, "rect", {
                x: 68,
                y: Y_ABA - 6 - ALTO * F0,
                width: 164,
                height: 0,
                fill: L.color
            });
            el(s, "rect", {
                x: 64,
                y: Y_ABA - 6 - ALTO * B,
                width: 172,
                height: ALTO * (B - A),
                fill: "rgba(120,190,110,0.28)",
                stroke: "rgb(80,150,80)",
                "stroke-width": 2,
                "stroke-dasharray": "5 4"
            });
            el(s, "rect", {
                x: 60,
                y: Y_ARR,
                width: 180,
                height: Y_ABA - Y_ARR,
                rx: 10,
                fill: "none",
                stroke: TINTA,
                "stroke-width": 3
            });
            const vertedor = crearVertedor(s, paso.liquido, 240, 34);
            ayuda("Hold to pour · let go on the green line");
            let tPrevV = 0;
            bucle((t => {
                const dt = Math.min(50, t - tPrevV) / (1e3 / 60);
                tPrevV = t;
                if (apretado) f = Math.min(1, f + .0085 * dt);
                barra.setAttribute("y", Y_ABA - 6 - ALTO * f);
                barra.setAttribute("height", ALTO * (f - F0));
                vertedor.actualizar(apretado, [ 170, Y_ABA - 6 - ALTO * f ], t);
                if (f >= 1 && apretado) {
                    apretado = false;
                    fin(1);
                }
            }));
        } else if (esVerter) {
            const L = LIQUIDOS[paso.liquido] || LIQUIDOS.agua;
            const taza = paso.liquido === "cafe" || paso.liquido === "chocolate";
            const G = taza ? {
                x: 96,
                y: 74,
                w: 104,
                h: 92
            } : {
                x: 110,
                y: 40,
                w: 80,
                h: 130
            };
            const FONDO = G.y + G.h - 3;
            const ALT = G.h - 3;
            if (taza) {
                el(s, "path", {
                    d: `M${G.x + G.w - 2} ${G.y + 18} q30 4 26 30 q-4 22 -26 22`,
                    fill: "none",
                    stroke: TINTA,
                    "stroke-width": 11
                });
                el(s, "path", {
                    d: `M${G.x + G.w - 2} ${G.y + 18} q30 4 26 30 q-4 22 -26 22`,
                    fill: "none",
                    stroke: "rgb(250,248,240)",
                    "stroke-width": 6
                });
                el(s, "ellipse", {
                    cx: G.x + G.w / 2,
                    cy: G.y + G.h + 8,
                    rx: G.w / 2 + 22,
                    ry: 9,
                    fill: "rgb(250,248,240)",
                    stroke: TINTA,
                    "stroke-width": 3
                });
            }
            el(s, "rect", {
                x: G.x,
                y: G.y,
                width: G.w,
                height: G.h,
                rx: taza ? 10 : 0,
                fill: taza ? "rgb(250,248,240)" : "rgba(255,255,255,0.55)",
                stroke: TINTA,
                "stroke-width": 3
            });
            if (paso.previo) el(s, "rect", {
                x: G.x + 3,
                y: FONDO - ALT * F0,
                width: G.w - 6,
                height: ALT * F0,
                fill: (LIQUIDOS[paso.previo.liquido] || LIQUIDOS.agua).color
            });
            if (paso.previo && paso.previo.liquido.startsWith("pulpa")) {
                const rp = azarDe("pulpa");
                for (let i = 0; i < 16; i++) el(s, "circle", {
                    cx: G.x + 8 + rp() * (G.w - 16),
                    cy: FONDO - 3 - rp() * (ALT * F0 - 6),
                    r: 1.8,
                    fill: "rgb(40,30,24)"
                });
            }
            barra = el(s, "rect", {
                x: G.x + 3,
                y: FONDO - ALT * F0,
                width: G.w - 6,
                height: 0,
                rx: taza ? 6 : 0,
                fill: L.color
            });
            if (Array.isArray(paso.trozos) && paso.trozos.length) {
                const rt = azarDe("trozos" + paso.trozos.join());
                for (let i = 0; i < 18; i++) {
                    const c = paso.trozos[i % paso.trozos.length];
                    const x = G.x + 6 + rt() * (G.w - 22);
                    const y = FONDO - 14 - i / 18 * ALT * .5 - rt() * 6;
                    el(s, "rect", {
                        x: x,
                        y: y,
                        width: 13,
                        height: 12,
                        rx: 2,
                        fill: c,
                        stroke: TINTA,
                        "stroke-width": 1.5,
                        transform: `rotate(${Math.round((rt() - .5) * 40)} ${(x + 6).toFixed(1)} ${(y + 6).toFixed(1)})`
                    });
                }
            }
            if (paso.hojas) {
                const rh = azarDe("hojas");
                for (let i = 0; i < 14; i++) {
                    const x = G.x + 10 + rh() * (G.w - 20);
                    const y = FONDO - 6 - rh() * 22;
                    el(s, "ellipse", {
                        cx: x,
                        cy: y,
                        rx: 6,
                        ry: 2.5,
                        fill: "rgb(100,156,74)",
                        stroke: "rgba(0,0,0,0.4)",
                        "stroke-width": .8,
                        transform: `rotate(${Math.round(rh() * 180)} ${x.toFixed(1)} ${y.toFixed(1)})`
                    });
                }
            }
            el(s, "rect", {
                x: G.x,
                y: G.y + G.h * (1 - B),
                width: G.w,
                height: G.h * (B - A),
                fill: "rgba(120,190,110,0.28)",
                stroke: "rgb(80,150,80)",
                "stroke-width": 2,
                "stroke-dasharray": "5 4"
            });
            el(s, "rect", {
                x: G.x,
                y: G.y,
                width: G.w,
                height: G.h,
                rx: taza ? 10 : 0,
                fill: "none",
                stroke: TINTA,
                "stroke-width": 3
            });
            if (taza) for (let i = 0; i < 4; i++) el(s, "rect", {
                x: G.x + 10 + i * 24,
                y: G.y + 8,
                width: 12,
                height: 4,
                fill: "rgb(110,170,214)"
            });
            if (paso.colar) {
                el(s, "path", {
                    d: `M${G.x + 18} ${G.y - 26} Q${G.x + G.w / 2} ${G.y + 18} ${G.x + G.w - 18} ${G.y - 26} Z`,
                    fill: "rgb(246,236,214)",
                    stroke: TINTA,
                    "stroke-width": 3
                });
                el(s, "path", {
                    d: `M${G.x + 30} ${G.y - 18} Q${G.x + G.w / 2} ${G.y + 4} ${G.x + G.w - 30} ${G.y - 18}`,
                    fill: "rgb(90,60,44)"
                });
                el(s, "ellipse", {
                    cx: G.x + G.w / 2,
                    cy: G.y - 26,
                    rx: G.w / 2 - 18,
                    ry: 4,
                    fill: "none",
                    stroke: "rgb(150,154,170)",
                    "stroke-width": 3
                });
                el(s, "rect", {
                    x: G.x + G.w - 20,
                    y: G.y - 30,
                    width: 40,
                    height: 7,
                    rx: 3,
                    fill: "rgb(110,72,50)",
                    stroke: TINTA,
                    "stroke-width": 2
                });
            }
            const vertedor = crearVertedor(s, paso.liquido, 244, taza ? 40 : 36);
            ayuda(paso.colar ? "Hold to strain it into the cup · let go on the green line" : `Hold to pour · let go on the green line`);
            let tPrevV = 0;
            bucle((t => {
                const dt = Math.min(50, t - tPrevV) / (1e3 / 60);
                tPrevV = t;
                if (apretado) f = Math.min(1, f + .0085 * dt);
                barra.setAttribute("y", FONDO - ALT * f);
                barra.setAttribute("height", ALT * (f - F0));
                vertedor.actualizar(apretado, [ G.x + G.w / 2 + 8, FONDO - ALT * f ], t);
                if (f >= 1 && apretado) {
                    apretado = false;
                    fin(1);
                }
            }));
        } else {
            const R = RELLENOS[paso.relleno] || RELLENOS.carne;
            if (paso.base === "loto") {
                el(s, "circle", {
                    cx: 130,
                    cy: 108,
                    r: 74,
                    fill: "rgb(236,222,200)",
                    stroke: TINTA,
                    "stroke-width": 3
                });
                el(s, "circle", {
                    cx: 130,
                    cy: 108,
                    r: 68,
                    fill: "none",
                    stroke: "rgb(196,160,120)",
                    "stroke-width": 5
                });
                for (let i = 0; i < 9; i++) {
                    const a = i / 9 * Math.PI * 2;
                    el(s, "circle", {
                        cx: 130 + 52 * Math.cos(a),
                        cy: 108 + 52 * Math.sin(a),
                        r: 9,
                        fill: "rgb(200,180,150)",
                        stroke: "rgb(176,150,116)",
                        "stroke-width": 2
                    });
                }
            } else if (paso.base === "hoja") {
                for (const rot of [ -30, 30 ]) {
                    const gh = el(s, "g", {
                        transform: `rotate(${rot} 130 108)`
                    });
                    el(gh, "path", {
                        d: "M50 108 Q130 50 210 108 Q130 166 50 108 Z",
                        fill: "rgb(100,160,80)",
                        stroke: TINTA,
                        "stroke-width": 3
                    });
                    el(gh, "line", {
                        x1: 56,
                        y1: 108,
                        x2: 204,
                        y2: 108,
                        stroke: "rgb(170,210,130)",
                        "stroke-width": 2
                    });
                }
            } else if (paso.base === "maduro") {
                el(s, "ellipse", {
                    cx: 130,
                    cy: 108,
                    rx: 84,
                    ry: 64,
                    fill: "rgb(246,204,96)",
                    stroke: TINTA,
                    "stroke-width": 3
                });
                el(s, "ellipse", {
                    cx: 130,
                    cy: 108,
                    rx: 70,
                    ry: 52,
                    fill: "none",
                    stroke: "rgb(252,228,150)",
                    "stroke-width": 4
                });
            } else el(s, "circle", {
                cx: 130,
                cy: 108,
                r: 74,
                fill: MASA_R,
                stroke: TINTA,
                "stroke-width": 3
            });
            el(s, "circle", {
                cx: 130,
                cy: 108,
                r: 50 * B,
                fill: "rgba(120,190,110,0.25)",
                stroke: "rgb(80,150,80)",
                "stroke-width": 2,
                "stroke-dasharray": "5 4"
            });
            el(s, "circle", {
                cx: 130,
                cy: 108,
                r: 50 * A,
                fill: "none",
                stroke: "rgb(80,150,80)",
                "stroke-width": 2,
                "stroke-dasharray": "5 4"
            });
            barra = el(s, "ellipse", {
                cx: 130,
                cy: 108,
                rx: 0,
                ry: 0,
                fill: R.color,
                stroke: R.sombra,
                "stroke-width": 3
            });
            let camarones = null;
            if (paso.relleno === "caldo") {
                camarones = el(s, "g", {
                    transform: "translate(130 108) scale(0)"
                });
                for (const [x, y] of [ [ -16, -8 ], [ 6, -14 ], [ 14, 6 ], [ -6, 10 ], [ -18, 10 ], [ 20, -6 ] ]) el(camarones, "rect", {
                    x: x,
                    y: y,
                    width: 9,
                    height: 9,
                    rx: 2,
                    fill: "rgba(250,220,150,0.85)",
                    stroke: "rgb(214,170,100)",
                    "stroke-width": 1.5
                });
            }
            if (R.motas) {
                camarones = el(s, "g", {
                    transform: "translate(130 108) scale(0)"
                });
                for (const [x, y] of [ [ -20, -10 ], [ -6, -20 ], [ 12, -14 ], [ 24, 2 ], [ 8, 10 ], [ -14, 12 ], [ -26, 2 ], [ 2, -2 ], [ 18, 18 ] ]) el(camarones, "rect", {
                    x: x,
                    y: y,
                    width: 6,
                    height: 4,
                    rx: 1,
                    fill: R.motas
                });
            }
            if (paso.relleno === "camaron") {
                camarones = el(s, "g", {
                    transform: "translate(130 108) scale(0)"
                });
                dibujarCamaron(camarones, -16, -4, .75);
                dibujarCamaron(camarones, 14, -8, .75, true);
                dibujarCamaron(camarones, 0, 14, .75);
            }
            el(s, "path", {
                d: "M222 120 Q252 170 282 120 Z",
                fill: "rgb(236,232,224)",
                stroke: TINTA,
                "stroke-width": 3
            });
            el(s, "ellipse", {
                cx: 252,
                cy: 120,
                rx: 30,
                ry: 8,
                fill: R.color,
                stroke: TINTA,
                "stroke-width": 3
            });
            if (paso.relleno === "camaron") {
                dibujarCamaron(s, 240, 112, .5);
                dibujarCamaron(s, 262, 110, .5, true);
            }
            el(s, "rect", {
                x: 248,
                y: 64,
                width: 6,
                height: 52,
                rx: 3,
                fill: "rgb(196,170,140)",
                stroke: TINTA,
                "stroke-width": 2,
                transform: "rotate(-20 252 116)"
            });
            ayuda(`Hold to fill · let go in the green ring`);
            let tPrevR = 0;
            bucle((t => {
                const dt = Math.min(50, t - tPrevR) / (1e3 / 60);
                tPrevR = t;
                if (apretado) f = Math.min(1, f + .009 * dt);
                barra.setAttribute("rx", 50 * f);
                barra.setAttribute("ry", 44 * f);
                if (camarones) camarones.setAttribute("transform", `translate(130 108) scale(${(f * 1.15).toFixed(3)})`);
                if (f >= 1 && apretado) {
                    apretado = false;
                    fin(1);
                }
            }));
        }
        s.addEventListener("pointerdown", (e => {
            if (!vivo) return;
            e.preventDefault();
            apretado = true;
            sonar("tocar");
        }));
        const soltar = () => {
            if (!vivo || !apretado) return;
            apretado = false;
            if (f > F0 + .05) fin(estrellasDeCantidad(f, A, B));
        };
        s.addEventListener("pointerup", soltar);
        s.addEventListener("pointercancel", soltar);
        s.addEventListener("pointerleave", soltar);
    } else if (paso.t === "plegar") {
        const N = mas(paso.n || 8, 3);
        const R = paso.relleno ? RELLENOS[paso.relleno] : RELLENOS.carne;
        const media = paso.forma === "media";
        const a0 = media ? 200 : -90;
        const barrido = media ? 140 : 360;
        const canasta = paso.forma === "canasta";
        const angCanasta = [];
        const disco = el(s, "circle", {
            cx: 150,
            cy: 104,
            r: 74,
            fill: MASA_R,
            stroke: TINTA,
            "stroke-width": 3
        });
        el(s, "ellipse", {
            cx: 150,
            cy: 104,
            rx: 34,
            ry: 30,
            fill: R.color,
            stroke: R.sombra,
            "stroke-width": 3
        });
        if (R.motas) for (const [x, y] of [ [ -20, -10 ], [ -6, -20 ], [ 12, -14 ], [ 22, 2 ], [ 8, 10 ], [ -14, 12 ], [ -26, 0 ], [ 2, -2 ], [ 14, 16 ] ]) el(s, "rect", {
            x: 150 + x,
            y: 104 + y,
            width: 6,
            height: 4,
            rx: 1,
            fill: R.motas
        });
        if (paso.relleno === "camaron") {
            dibujarCamaron(s, 136, 100, .8);
            dibujarCamaron(s, 166, 98, .8, true);
            dibujarCamaron(s, 150, 116, .7);
        }
        const pliegues = el(s, "g", {});
        const zona = el(s, "path", {
            fill: "rgba(120,190,110,0.55)",
            stroke: "rgb(80,150,80)",
            "stroke-width": 2
        });
        const marca = el(s, "rect", {
            x: -6,
            y: -90,
            width: 12,
            height: 18,
            fill: "rgb(186,78,104)",
            stroke: TINTA,
            "stroke-width": 2
        });
        const cuenta = el(s, "text", {
            x: 8,
            y: 18,
            "text-anchor": "start",
            class: "cocina-cuenta"
        });
        let k = 0;
        let buenos = 0;
        const objetivo = () => a0 + barrido * (k + .5) / N;
        const ANCHO = Math.max(16, Math.min(30, barrido / N));
        const arco = (a, ancho) => {
            const r1 = 84;
            const r2 = 100;
            const p = (ang, r) => [ 150 + r * Math.cos(ang * Math.PI / 180), 104 + r * Math.sin(ang * Math.PI / 180) ];
            const [x1, y1] = p(a - ancho / 2, r1);
            const [x2, y2] = p(a + ancho / 2, r1);
            const [x3, y3] = p(a + ancho / 2, r2);
            const [x4, y4] = p(a - ancho / 2, r2);
            return `M${x1} ${y1} A${r1} ${r1} 0 0 1 ${x2} ${y2} L${x3} ${y3} A${r2} ${r2} 0 0 0 ${x4} ${y4} Z`;
        };
        const dibujarZona = () => {
            zona.setAttribute("d", arco(objetivo(), ANCHO));
            cuenta.textContent = `PLEAT ${k} / ${N}`;
        };
        dibujarZona();
        ayuda(`Tap when the pink mark is in the green`);
        let ang = objetivo() - 70;
        const notasP = [];
        const VEL = .11 * rapido(.35);
        let tPrev = 0;
        bucle((t => {
            const dt = t - tPrev;
            tPrev = t;
            ang += VEL * dt;
            if (ang > objetivo() + 60) ang = objetivo() - 70;
            marca.setAttribute("transform", `translate(150 104) rotate(${ang + 90})`);
        }));
        s.addEventListener("pointerdown", (e => {
            if (!vivo) return;
            e.preventDefault();
            const ok = Math.abs(ang - objetivo()) <= ANCHO / 2 + 3;
            if (ok) buenos++;
            notasP.push(notaDe(ang - objetivo(), ANCHO / 2 + 3, 25));
            sonar(ok ? "tocar" : "no");
            const a = objetivo();
            if (canasta) {
                angCanasta.push([ a, ok ]);
                const rr = 74 - 32 * ((k + 1) / N);
                disco.setAttribute("r", rr.toFixed(1));
                pliegues.innerHTML = "";
                for (const [b, bien] of angCanasta) {
                    const c = Math.cos(b * Math.PI / 180);
                    const sn = Math.sin(b * Math.PI / 180);
                    el(pliegues, "path", {
                        d: `M${(150 + (rr - 13) * c).toFixed(1)} ${(104 + (rr - 13) * sn).toFixed(1)} L${(150 + (rr + 1) * c).toFixed(1)} ${(104 + (rr + 1) * sn).toFixed(1)}`,
                        stroke: bien ? "rgba(150,110,40,0.75)" : "rgba(200,90,80,0.8)",
                        "stroke-width": 3,
                        "stroke-linecap": "round"
                    });
                }
            } else {
                const x = 150 + 70 * Math.cos(a * Math.PI / 180);
                const y = 104 + 70 * Math.sin(a * Math.PI / 180);
                el(pliegues, "rect", {
                    x: x - 4,
                    y: y - 12,
                    width: 8,
                    height: 24,
                    rx: 3,
                    fill: ok ? "rgb(240,232,210)" : "rgb(226,200,190)",
                    stroke: "rgba(0,0,0,0.4)",
                    "stroke-width": 2,
                    transform: `rotate(${a + 90} ${x} ${y})`
                });
            }
            k++;
            if (k >= N) {
                zona.setAttribute("d", "");
                cuenta.textContent = `PLEAT ${N} / ${N}`;
                fin(promedio(notasP));
                return;
            }
            ang = objetivo() - 70;
            dibujarZona();
        }));
    } else if (paso.t === "cocinar") {
        const C = COCCIONES[paso.como] || COCCIONES.vapor;
        const MEDIO_C = ancho(.085, .4) + .0125 * (MJ.ollas || 0);
        const A = .635 - MEDIO_C;
        const B = .635 + MEDIO_C;
        const MS = C.ms / rapido(.2);
        const f = paso.como;
        const cc = ctx.receta ? dibujarCoccion(s, f, ctx.receta, {
            segunda: !!paso.segunda
        }) : null;
        if (cc) {} else if (f === "vapor") {
            el(s, "rect", {
                x: 70,
                y: 70,
                width: 160,
                height: 80,
                fill: "rgb(214,170,104)",
                stroke: TINTA,
                "stroke-width": 3
            });
            el(s, "rect", {
                x: 70,
                y: 136,
                width: 160,
                height: 14,
                fill: "rgb(170,124,72)"
            });
            el(s, "rect", {
                x: 70,
                y: 70,
                width: 160,
                height: 80,
                fill: "none",
                stroke: TINTA,
                "stroke-width": 3
            });
        } else if (f === "calentar") {
            el(s, "rect", {
                x: 96,
                y: 150,
                width: 108,
                height: 8,
                fill: "rgb(50,46,54)",
                stroke: TINTA,
                "stroke-width": 2
            });
            for (let i = 0; i < 6; i++) el(s, "rect", {
                x: 106 + i * 16,
                y: 158,
                width: 8,
                height: 4,
                fill: i % 2 ? "rgb(110,150,240)" : "rgb(250,140,50)"
            });
            el(s, "path", {
                d: "M104 146 Q100 86 150 82 Q200 86 196 146 Z",
                fill: "rgb(196,204,214)",
                stroke: TINTA,
                "stroke-width": 3
            });
            el(s, "path", {
                d: "M114 138 Q112 100 132 92",
                fill: "none",
                stroke: "rgb(236,240,246)",
                "stroke-width": 5,
                "stroke-linecap": "round"
            });
            el(s, "path", {
                d: "M194 118 L232 92 L236 100 L198 130 Z",
                fill: "rgb(196,204,214)",
                stroke: TINTA,
                "stroke-width": 3,
                "stroke-linejoin": "round"
            });
            el(s, "path", {
                d: "M118 90 Q150 44 182 90",
                fill: "none",
                stroke: TINTA,
                "stroke-width": 6
            });
            el(s, "path", {
                d: "M118 90 Q150 44 182 90",
                fill: "none",
                stroke: "rgb(110,72,50)",
                "stroke-width": 3
            });
            el(s, "rect", {
                x: 140,
                y: 76,
                width: 20,
                height: 8,
                rx: 3,
                fill: "rgb(110,72,50)",
                stroke: TINTA,
                "stroke-width": 2
            });
        } else if (f === "hervir" || f === "caramelo") {
            el(s, "rect", {
                x: 60,
                y: 76,
                width: 180,
                height: 76,
                rx: 8,
                fill: "rgb(150,154,170)",
                stroke: TINTA,
                "stroke-width": 3
            });
            el(s, "rect", {
                x: 66,
                y: 80,
                width: 168,
                height: 14,
                fill: f === "caramelo" ? "rgb(214,120,60)" : "rgb(200,226,240)"
            });
            el(s, "rect", {
                x: 40,
                y: 82,
                width: 22,
                height: 8,
                fill: "rgb(90,90,100)",
                stroke: TINTA,
                "stroke-width": 3
            });
            el(s, "rect", {
                x: 238,
                y: 82,
                width: 22,
                height: 8,
                fill: "rgb(90,90,100)",
                stroke: TINTA,
                "stroke-width": 3
            });
        } else if (f === "horno") {
            el(s, "rect", {
                x: 60,
                y: 46,
                width: 180,
                height: 116,
                rx: 6,
                fill: "rgb(80,70,80)",
                stroke: TINTA,
                "stroke-width": 3
            });
            el(s, "rect", {
                x: 76,
                y: 60,
                width: 148,
                height: 84,
                fill: "rgb(250,170,90)",
                stroke: TINTA,
                "stroke-width": 3
            });
        } else if (f === "enfriar") {
            el(s, "rect", {
                x: 80,
                y: 50,
                width: 140,
                height: 110,
                rx: 6,
                fill: "rgb(200,226,240)",
                stroke: TINTA,
                "stroke-width": 3
            });
        } else {
            el(s, "ellipse", {
                cx: 150,
                cy: 118,
                rx: 96,
                ry: 34,
                fill: "rgb(60,60,70)",
                stroke: TINTA,
                "stroke-width": 3
            });
            el(s, "ellipse", {
                cx: 150,
                cy: 112,
                rx: 84,
                ry: 26,
                fill: f === "freir" ? "rgb(250,200,90)" : "rgb(90,90,100)"
            });
            el(s, "rect", {
                x: 240,
                y: 108,
                width: 54,
                height: 10,
                rx: 4,
                fill: "rgb(110,72,50)",
                stroke: TINTA,
                "stroke-width": 3
            });
        }
        const comida = el(s, "image", {
            href: f === "calentar" || cc ? "" : ctx.plato || "",
            x: 110,
            y: f === "horno" ? 66 : 62,
            width: 80,
            height: 80,
            style: "image-rendering:pixelated"
        });
        if (!cc && (f === "hervir" || f === "caramelo")) {
            el(s, "rect", {
                x: 63,
                y: 112,
                width: 174,
                height: 37,
                rx: 4,
                fill: f === "caramelo" ? "rgba(214,120,60,0.55)" : "rgba(170,206,230,0.6)"
            });
            el(s, "rect", {
                x: 60,
                y: 76,
                width: 180,
                height: 76,
                rx: 8,
                fill: "none",
                stroke: TINTA,
                "stroke-width": 3
            });
        }
        const humo = el(s, "g", {
            opacity: 0
        });
        for (let i = 0; i < 4; i++) el(humo, "rect", {
            x: 104 + i * 26,
            y: 30 + i % 2 * 8,
            width: 7,
            height: 14,
            fill: "rgba(255,255,255,0.85)"
        });
        const M = {
            x: 30,
            y: 168,
            w: 240,
            h: 20
        };
        el(s, "rect", {
            x: M.x,
            y: M.y,
            width: M.w * A,
            height: M.h,
            fill: "rgb(240,230,200)"
        });
        el(s, "rect", {
            x: M.x + M.w * A,
            y: M.y,
            width: M.w * (B - A),
            height: M.h,
            fill: "rgb(150,200,130)"
        });
        el(s, "rect", {
            x: M.x + M.w * B,
            y: M.y,
            width: M.w * (1 - B),
            height: M.h,
            fill: "rgb(222,140,110)"
        });
        el(s, "rect", {
            x: M.x,
            y: M.y,
            width: M.w,
            height: M.h,
            fill: "none",
            stroke: TINTA,
            "stroke-width": 3
        });
        const aguja = el(s, "rect", {
            x: M.x - 2,
            y: M.y - 7,
            width: 5,
            height: M.h + 14,
            fill: TINTA
        });
        let fase = 0;
        let x = 0;
        let desde = 0;
        let suma = 0;
        ayuda(`Tap the button when the needle is in the green`);
        bucle((t => {
            x = Math.min(1.02, (t - desde) / MS);
            aguja.setAttribute("x", M.x - 2 + M.w * Math.min(1, x));
            humo.setAttribute("opacity", Math.min(1, x * 1.4));
            comida.setAttribute("opacity", x > B + .12 ? .75 : 1);
            if (cc) cc.actualizar(x, A, B, t);
            if (x >= 1.02) {
                boton(null);
                fin(1);
            }
        }));
        const sacar = () => {
            if (!vivo) return;
            const e = estrellasDeCoccion(x, A, B);
            if (C.vuelta && fase === 0) {
                fase = 1;
                suma = e;
                desde = performance.now() - t0;
                comida.setAttribute("opacity", .3);
                setTimeout((() => comida.setAttribute("opacity", 1)), 160);
                if (cc) cc.voltear();
                sonar("tocar");
                boton("Take it out!", sacar);
                return;
            }
            fin(C.vuelta ? (suma + e) / 2 : e);
        };
        boton(C.boton, sacar);
    } else if (paso.t === "cortar") {
        const I = INGREDIENTES[paso.que] || INGREDIENTES.cebollin;
        const N = mas(paso.n || 4, 2);
        const TOL_C = ancho(9) + 3 * (MJ.cuchillo || 0);
        const TORCIDO = ancho(26, .3) + 4 * (MJ.cuchillo || 0);
        const X0 = 60;
        const X1 = 240;
        const lineas = Array.from({
            length: N
        }, ((_, i) => X0 + (X1 - X0) * (i + 1) / (N + 1)));
        const trozos = el(s, "g", {});
        const pintar = cortes => {
            trozos.innerHTML = "";
            const bordes = [ X0, ...cortes.slice().sort(((a, b) => a - b)), X1 ];
            const defs = el(trozos, "defs", {});
            for (let i = 0; i < bordes.length - 1; i++) {
                const id = `corte${++idClip}`;
                const cp = el(defs, "clipPath", {
                    id: id
                });
                el(cp, "rect", {
                    x: bordes[i] - (i === 0 ? 40 : 0),
                    y: 0,
                    width: bordes[i + 1] - bordes[i] + (i === 0 ? 40 : 0) + (i === bordes.length - 2 ? 40 : 0),
                    height: 200
                });
                const desp = (i - (bordes.length - 2) / 2) * (cortes.length ? 4 : 0);
                const trozo = el(trozos, "g", {
                    "clip-path": `url(#${id})`,
                    transform: `translate(${desp} 0)`
                });
                dibujarIngrediente(trozo, paso.que, X0 + 6, X1 - 6, 104);
            }
        };
        const hechos = [];
        const notasC = [];
        const cortesX = [];
        pintar([]);
        const guias = lineas.map((x => el(s, "line", {
            x1: x,
            y1: 52,
            x2: x,
            y2: 156,
            stroke: "rgb(80,150,80)",
            "stroke-width": 3,
            "stroke-dasharray": "6 5"
        })));
        const cuchillo = el(s, "g", {
            opacity: 0
        });
        el(cuchillo, "path", {
            d: "M-4 -46 L8 -46 L8 10 L-4 18 Z",
            fill: "rgb(226,232,238)",
            stroke: TINTA,
            "stroke-width": 3
        });
        el(cuchillo, "rect", {
            x: -3,
            y: -72,
            width: 10,
            height: 26,
            rx: 3,
            fill: "rgb(110,72,50)",
            stroke: TINTA,
            "stroke-width": 3
        });
        const cuenta = el(s, "text", {
            x: 8,
            y: 18,
            "text-anchor": "start",
            class: "cocina-cuenta"
        });
        cuenta.textContent = `CUT 0 / ${N}`;
        ayuda(`Swipe down along each dotted line`);
        let ini = null;
        let buenos = 0;
        s.addEventListener("pointerdown", (e => {
            if (!vivo) return;
            e.preventDefault();
            try {
                s.setPointerCapture(e.pointerId);
            } catch (err) {}
            ini = aSvg(e);
            cuchillo.setAttribute("opacity", 1);
            cuchillo.setAttribute("transform", `translate(${ini[0]} ${ini[1]})`);
        }));
        s.addEventListener("pointermove", (e => {
            if (!vivo || !ini) return;
            const p = aSvg(e);
            cuchillo.setAttribute("transform", `translate(${p[0]} ${p[1]})`);
        }));
        const soltar = e => {
            if (!vivo || !ini) return;
            const p = aSvg(e);
            const a = ini;
            ini = null;
            cuchillo.setAttribute("opacity", 0);
            if (p[1] - a[1] < 30) return;
            const xm = (a[0] + p[0]) / 2;
            let mejor = -1;
            let dmin = 1e9;
            lineas.forEach(((x, i) => {
                if (!hechos.includes(i) && Math.abs(x - xm) < dmin) {
                    dmin = Math.abs(x - xm);
                    mejor = i;
                }
            }));
            if (mejor < 0) return;
            const torcido = Math.abs(p[0] - a[0]) > TORCIDO;
            const ok = dmin <= TOL_C && !torcido;
            if (ok) buenos++;
            notasC.push(Math.min(notaDe(dmin, TOL_C, 14), torcido ? 1.8 : 3));
            hechos.push(mejor);
            guias[mejor].setAttribute("stroke", ok ? "rgb(120,190,110)" : "rgb(222,110,100)");
            guias[mejor].setAttribute("stroke-dasharray", "");
            guias[mejor].setAttribute("opacity", .5);
            cortesX.push(ok ? lineas[mejor] : Math.max(X0 + 4, Math.min(X1 - 4, xm)));
            pintar(cortesX);
            sonar(ok ? "tocar" : "no");
            vibrar(ok ? 12 : 25);
            cuenta.textContent = `CUT ${hechos.length} / ${N}`;
            if (hechos.length >= N) fin(promedio(notasC));
        };
        s.addEventListener("pointerup", soltar);
        s.addEventListener("pointercancel", (() => {
            ini = null;
            cuchillo.setAttribute("opacity", 0);
        }));
    } else if (paso.t === "revolver") {
        const color = paso.color || "rgb(214,150,90)";
        const CX = 150;
        const CY = 100;
        const R = 46;
        const pocillo = ctx.receta === "tinto";
        if (pocillo) {
            el(s, "rect", {
                x: CX + 82,
                y: CY - 12,
                width: 40,
                height: 22,
                rx: 10,
                fill: "rgb(250,248,240)",
                stroke: TINTA,
                "stroke-width": 3
            });
            el(s, "ellipse", {
                cx: CX,
                cy: CY + 6,
                rx: 94,
                ry: 76,
                fill: "rgb(250,248,240)",
                stroke: TINTA,
                "stroke-width": 3
            });
            el(s, "ellipse", {
                cx: CX,
                cy: CY + 4,
                rx: 89,
                ry: 72,
                fill: "none",
                stroke: "rgb(110,170,214)",
                "stroke-width": 3,
                "stroke-dasharray": "10 8"
            });
        } else el(s, "ellipse", {
            cx: CX,
            cy: CY + 10,
            rx: 96,
            ry: 78,
            fill: "rgb(120,124,140)",
            stroke: TINTA,
            "stroke-width": 3
        });
        el(s, "ellipse", {
            cx: CX,
            cy: CY,
            rx: 84,
            ry: 70,
            fill: color,
            stroke: TINTA,
            "stroke-width": 2
        });
        const adentro = el(s, "g", {});
        const ra = azarDe("revolver" + ctx.receta);
        const lugar = (k = .85) => {
            const a = ra() * Math.PI * 2;
            const d = .25 + Math.sqrt(ra()) * (k - .25);
            return [ CX + 82 * d * Math.cos(a), CY + 66 * d * Math.sin(a) ];
        };
        if (ctx.receta === "ajiaco" || ctx.receta === "sopa_ternera") {
            for (let i = 0; i < 16; i++) {
                const [x, y] = lugar();
                const tipo = i % 4;
                if (ctx.receta === "sopa_ternera") el(adentro, "rect", {
                    x: x - 4,
                    y: y - 3,
                    width: 8,
                    height: 6,
                    rx: 1.5,
                    fill: tipo === 0 ? "rgb(110,170,80)" : "rgb(160,70,56)",
                    stroke: "rgba(0,0,0,0.4)",
                    "stroke-width": 1
                }); else if (tipo === 0) el(adentro, "ellipse", {
                    cx: x,
                    cy: y,
                    rx: 7,
                    ry: 5,
                    fill: "rgb(250,226,110)",
                    stroke: "rgb(200,160,60)",
                    "stroke-width": 1.5
                }); else if (tipo === 1) el(adentro, "path", {
                    d: `M${x - 7} ${y} q7 -5 14 0`,
                    fill: "none",
                    stroke: "rgb(250,240,222)",
                    "stroke-width": 3.5,
                    "stroke-linecap": "round"
                }); else el(adentro, "rect", {
                    x: x - 5,
                    y: y - 4,
                    width: 10,
                    height: 8,
                    rx: 2,
                    fill: "rgb(250,234,160)",
                    stroke: "rgba(150,110,40,0.7)",
                    "stroke-width": 1.2
                });
            }
        } else if (ctx.receta === "dongpo") {
            for (const [x, y] of [ [ -34, -22 ], [ 18, -26 ], [ -20, 20 ], [ 32, 16 ] ]) {
                el(adentro, "rect", {
                    x: CX + x - 13,
                    y: CY + y - 11,
                    width: 26,
                    height: 22,
                    rx: 3,
                    fill: "rgb(176,84,56)",
                    stroke: TINTA,
                    "stroke-width": 2
                });
                el(adentro, "rect", {
                    x: CX + x - 11,
                    y: CY + y - 4,
                    width: 22,
                    height: 4,
                    fill: "rgb(240,200,160)"
                });
            }
        } else if (ctx.receta === "mapo") {
            for (let i = 0; i < 10; i++) {
                const [x, y] = lugar();
                el(adentro, "rect", {
                    x: x - 7,
                    y: y - 6,
                    width: 14,
                    height: 12,
                    rx: 2,
                    fill: "rgb(252,248,236)",
                    stroke: TINTA,
                    "stroke-width": 1.5
                });
                el(adentro, "rect", {
                    x: x - 6,
                    y: y + 1,
                    width: 12,
                    height: 4,
                    fill: "rgba(214,70,40,0.6)"
                });
            }
        } else if (ctx.receta === "arroz_con_leche") {
            for (let i = 0; i < 40; i++) {
                const [x, y] = lugar(.92);
                el(adentro, "ellipse", {
                    cx: x,
                    cy: y,
                    rx: 3.2,
                    ry: 1.6,
                    fill: "rgb(255,255,255)",
                    stroke: "rgb(176,156,120)",
                    "stroke-width": 1,
                    transform: `rotate(${Math.round(ra() * 180)} ${x.toFixed(1)} ${y.toFixed(1)})`
                });
            }
        }
        el(s, "ellipse", {
            cx: CX - 30,
            cy: CY - 30,
            rx: 18,
            ry: 8,
            fill: "rgba(255,255,255,0.25)"
        });
        el(s, "circle", {
            cx: CX,
            cy: CY,
            r: R,
            fill: "none",
            stroke: "rgba(255,255,255,0.75)",
            "stroke-width": 3,
            "stroke-dasharray": "4 7"
        });
        for (let a = 0; a < 4; a++) {
            const r = a * Math.PI / 2 + .4;
            const x = CX + R * Math.cos(r);
            const y = CY + R * Math.sin(r);
            el(s, "path", {
                d: "M-4 -5 L4 0 L-4 5",
                fill: "none",
                stroke: "rgba(255,255,255,0.9)",
                "stroke-width": 2.5,
                transform: `translate(${x} ${y}) rotate(${r * 180 / Math.PI + 90})`
            });
        }
        const remolino = el(s, "path", {
            d: `M${CX - 20} ${CY} A20 20 0 0 1 ${CX + 20} ${CY}`,
            fill: "none",
            stroke: "rgba(255,255,255,0.45)",
            "stroke-width": 4,
            "stroke-linecap": "round"
        });
        const cuchara = el(s, "g", {});
        el(cuchara, "rect", {
            x: -3,
            y: -48,
            width: 6,
            height: 44,
            rx: 3,
            fill: "rgb(196,150,100)",
            stroke: TINTA,
            "stroke-width": 2
        });
        el(cuchara, "ellipse", {
            cx: 0,
            cy: 0,
            rx: 9,
            ry: 7,
            fill: "rgb(214,180,130)",
            stroke: TINTA,
            "stroke-width": 3
        });
        cuchara.setAttribute("transform", `translate(${CX} ${CY + 6})`);
        const guia = el(s, "g", {
            class: "guia-revolver"
        });
        const halo = el(guia, "circle", {
            r: 20,
            fill: "rgba(120,190,110,0.35)",
            stroke: "rgb(80,150,80)",
            "stroke-width": 2
        });
        el(guia, "circle", {
            r: 7,
            fill: "rgb(110,190,100)",
            stroke: TINTA,
            "stroke-width": 2
        });
        el(s, "rect", {
            x: 30,
            y: 184,
            width: 240,
            height: 10,
            fill: "rgb(240,230,200)",
            stroke: TINTA,
            "stroke-width": 2
        });
        const prog = el(s, "rect", {
            x: 31,
            y: 185,
            width: 0,
            height: 8,
            fill: "rgb(120,190,110)"
        });
        ayuda("Put your finger on the green dot and follow it around");
        const VUELTA = 2400 / rapido(.2);
        const CERCA = ancho(22) + 6 * (MJ.ollas || 0);
        let dedo = null;
        let progreso = 0;
        let tTotal = 0;
        let tBien = 0;
        let tPrev = 0;
        let empezo = false;
        s.addEventListener("pointerdown", (e => {
            if (!vivo) return;
            e.preventDefault();
            try {
                s.setPointerCapture(e.pointerId);
            } catch (err) {}
            dedo = aSvg(e);
        }));
        s.addEventListener("pointermove", (e => {
            if (!vivo || !dedo) return;
            dedo = aSvg(e);
        }));
        const soltar = () => {
            dedo = null;
        };
        s.addEventListener("pointerup", soltar);
        s.addEventListener("pointercancel", soltar);
        let ang = 0;
        bucle((t => {
            const dt = Math.min(.05, (t - tPrev) / 1e3);
            tPrev = t;
            const gx = CX + R * Math.cos(ang);
            const gy = CY + R * Math.sin(ang);
            const cerca = dedo && Math.hypot(dedo[0] - gx, dedo[1] - gy) <= CERCA;
            if (cerca) empezo = true;
            if (empezo) ang += 2 * Math.PI / VUELTA * dt * 1e3;
            guia.setAttribute("transform", `translate(${gx.toFixed(1)} ${gy.toFixed(1)})`);
            if (!empezo) halo.setAttribute("r", (20 + 4 * Math.sin(t / 180)).toFixed(1)); else halo.setAttribute("r", 20);
            halo.setAttribute("fill", !empezo || cerca ? "rgba(120,190,110,0.55)" : "rgba(240,180,80,0.35)");
            if (dedo) {
                const a = Math.atan2(dedo[1] - CY, dedo[0] - CX);
                const r = Math.max(18, Math.min(70, Math.hypot(dedo[0] - CX, dedo[1] - CY)));
                cuchara.setAttribute("transform", `translate(${(CX + r * Math.cos(a)).toFixed(1)} ${(CY + r * Math.sin(a)).toFixed(1)})`);
            }
            if (empezo) {
                tTotal += dt;
                if (cerca) {
                    tBien += dt;
                    progreso = Math.min(1, progreso + dt / (VUELTA / 1e3 * 2));
                    remolino.setAttribute("transform", `rotate(${(ang * 180 / Math.PI).toFixed(1)} ${CX} ${CY})`);
                    adentro.setAttribute("transform", `rotate(${(ang * 90 / Math.PI).toFixed(1)} ${CX} ${CY})`);
                }
            }
            prog.setAttribute("width", 238 * progreso);
            if (progreso >= 1) {
                const r = tBien / Math.max(.1, tTotal);
                fin(1 + 2 * Math.max(0, Math.min(1, (r - .45) / .5)));
            } else if (tTotal > 14) fin(1);
        }));
    } else if (paso.t === "saltear") {
        const N = mas(paso.n || 4, 2);
        const ATRAPA = ancho(40, .3) + 8 * (MJ.wok || 0);
        const LLAMA = Math.min(.6, ancho(.33) + .06 * (MJ.wok || 0));
        const WOK_Y = 150;
        let wokX = 150;
        const brilloFuego = el(s, "ellipse", {
            cx: 150,
            cy: WOK_Y + 18,
            rx: 80,
            ry: 26,
            fill: "rgb(255,150,60)",
            opacity: .15
        });
        const fogon = el(s, "g", {});
        el(fogon, "rect", {
            x: -60,
            y: 26,
            width: 120,
            height: 8,
            fill: "rgb(50,46,54)",
            stroke: TINTA,
            "stroke-width": 2
        });
        const llama = el(s, "g", {
            "data-sin-px": ""
        });
        const PX = 4;
        const COLS = 35;
        const capasFuego = Array.from({
            length: COLS
        }, (() => [ el(llama, "rect", {
            width: PX,
            fill: "rgb(214,64,40)"
        }), el(llama, "rect", {
            width: PX,
            fill: "rgb(250,140,50)"
        }), el(llama, "rect", {
            width: PX,
            fill: "rgb(255,214,90)"
        }), el(llama, "rect", {
            width: PX,
            fill: "rgb(255,248,210)"
        }), el(llama, "rect", {
            width: PX / 2,
            height: PX,
            fill: "rgb(214,64,40)"
        }) ]));
        const azul = Array.from({
            length: COLS
        }, (() => el(llama, "rect", {
            width: PX,
            height: PX,
            fill: "rgb(110,150,240)"
        })));
        const chispas = el(s, "g", {
            "data-sin-px": ""
        });
        const ruidoFuego = Array.from({
            length: COLS
        }, (() => Math.random()));
        const wok = el(s, "g", {});
        el(wok, "path", {
            d: "M-62 -10 Q0 40 62 -10 Z",
            fill: "rgb(60,60,70)",
            stroke: TINTA,
            "stroke-width": 3
        });
        el(wok, "rect", {
            x: 60,
            y: -14,
            width: 46,
            height: 8,
            rx: 4,
            fill: "rgb(110,72,50)",
            stroke: TINTA,
            "stroke-width": 3
        });
        const {g: comida, piezas: piezasWok} = comidaDelWok(s, ctx.receta);
        const abrir = f => {
            for (const p of piezasWok) p.setAttribute("transform", `translate(${(p._dx * (1 + .5 * f)).toFixed(1)} ${(p._dy * (1 + .8 * f) - 10 * f).toFixed(1)}) rotate(${(p._giro * f).toFixed(0)})`);
        };
        const cuenta = el(s, "text", {
            x: 8,
            y: 18,
            "text-anchor": "start",
            class: "cocina-cuenta"
        });
        const brillo = el(s, "text", {
            x: 150,
            y: 40,
            "text-anchor": "middle",
            class: "cocina-cuenta",
            opacity: 0
        });
        let k = 0;
        let buenos = 0;
        let vuelo = null;
        const notasW = [];
        let ini = null;
        const P = 1500;
        const flama = t => {
            const f = t % P / P;
            return f > .95 - LLAMA && f < .95;
        };
        cuenta.textContent = `TOSS 0 / ${N}`;
        ayuda("Swipe up on the big flame · slide to catch it");
        s.addEventListener("pointerdown", (e => {
            if (!vivo) return;
            e.preventDefault();
            try {
                s.setPointerCapture(e.pointerId);
            } catch (err) {}
            ini = aSvg(e);
        }));
        const lanzar = () => {
            const conLlama = flama(performance.now() - t0);
            const T = conLlama ? 1.6 : 1.2;
            let vx = (Math.random() < .5 ? -1 : 1) * (22 + Math.random() * 32);
            if (wokX + vx * T > 215 || wokX + vx * T < 85) vx = -vx;
            vx = Math.max((85 - wokX) / T, Math.min((215 - wokX) / T, vx));
            vuelo = {
                t0: performance.now() - t0,
                x0: wokX,
                vx: vx,
                conLlama: conLlama
            };
            sonar(conLlama ? "hito" : "tocar");
        };
        s.addEventListener("pointermove", (e => {
            if (!vivo || !ini) return;
            const p = aSvg(e);
            if (!vuelo && !ini.lanzo && ini[1] - p[1] > 24) {
                ini.lanzo = true;
                lanzar();
            }
            if (vuelo) wokX = Math.max(70, Math.min(230, p[0]));
        }));
        s.addEventListener("pointerup", (() => {
            ini = null;
        }));
        bucle((t => {
            const alto = flama(t);
            s.dataset.llama = alto ? "1" : "0";
            if (Math.floor(t / 70) !== s._paso) {
                s._paso = Math.floor(t / 70);
                for (let i = 0; i < COLS; i++) ruidoFuego[i] = ruidoFuego[i] * .5 + Math.random() * .5;
            }
            const base = WOK_Y + 24;
            for (let i = 0; i < COLS; i++) {
                const x = wokX - COLS * PX / 2 + i * PX;
                const centro = 1 - Math.abs(i - (COLS - 1) / 2) / ((COLS - 1) / 2);
                const lado = 1 - centro;
                const enRango = Math.abs(i - (COLS - 1) / 2) <= 13;
                const hBase = alto ? lado > .93 ? 0 : 22 + 54 * Math.sin(Math.min(1, lado * 1.15) * Math.PI * .85) : enRango ? 4 + 10 * centro : 0;
                const h = Math.round(hBase * (.35 + .95 * ruidoFuego[i] * ruidoFuego[(i + 1) % COLS] + .2 * ruidoFuego[i]) / PX) * PX;
                const [rojo, naranja, amarillo, blanco, punta] = capasFuego[i];
                const capa = (r, f) => {
                    const hh = Math.max(0, Math.round(h * f / PX) * PX);
                    r.setAttribute("x", x);
                    r.setAttribute("y", base - hh);
                    r.setAttribute("height", hh);
                };
                capa(rojo, 1);
                capa(naranja, .72);
                capa(amarillo, alto ? .45 : .3);
                capa(blanco, alto && Math.abs(i - (COLS - 1) / 2) <= 6 ? .25 : 0);
                punta.setAttribute("x", x + (i % 2 ? 0 : PX / 2));
                punta.setAttribute("y", base - h - PX);
                punta.setAttribute("opacity", h >= PX * 3 ? 1 : 0);
                azul[i].setAttribute("x", x);
                azul[i].setAttribute("y", base);
                azul[i].setAttribute("opacity", Math.abs(i - (COLS - 1) / 2) <= 14 ? i % 2 ? .9 : .6 : 0);
            }
            fogon.setAttribute("transform", `translate(${wokX} ${WOK_Y})`);
            brilloFuego.setAttribute("cx", wokX);
            brilloFuego.setAttribute("opacity", alto ? .32 : .12);
            if (alto && Math.random() < .35) {
                const c = el(chispas, "rect", {
                    x: wokX - 40 + Math.random() * 80,
                    y: base - 30,
                    width: 3,
                    height: 3,
                    fill: "rgb(255,220,120)"
                });
                c._vy = 30 + Math.random() * 40;
                c._t = t;
            }
            for (const c of [ ...chispas.children ]) {
                if (c.hasAttribute("data-px")) continue;
                const dt = (t - c._t) / 1e3;
                c.setAttribute("y", base - 30 - c._vy * dt);
                c.setAttribute("opacity", Math.max(0, 1 - dt * 1.6));
                if (dt > .7) c.remove();
            }
            wok.setAttribute("transform", `translate(${wokX} ${WOK_Y})`);
            if (vuelo) {
                const tv = (t - vuelo.t0) / 1e3;
                const T = vuelo.conLlama ? 1.6 : 1.2;
                const h = vuelo.conLlama ? 120 : 70;
                const x = vuelo.x0 + vuelo.vx * tv;
                const y = WOK_Y - 4 * h * (tv / T) * (1 - tv / T);
                comida.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
                abrir(Math.sin(Math.PI * Math.min(1, tv / T)));
                if (tv >= T) {
                    const atrapo = Math.abs(x - wokX) < ATRAPA;
                    const ok = atrapo && vuelo.conLlama;
                    if (ok) buenos++;
                    notasW.push(!atrapo ? 1 : !vuelo.conLlama ? 1.8 : notaDe(x - wokX, ATRAPA, 1));
                    brillo.textContent = !atrapo ? "Oops! It fell" : vuelo.conLlama ? "Wok hei! ✨" : "Wait for the flame";
                    brillo.setAttribute("opacity", 1);
                    setTimeout((() => brillo.setAttribute("opacity", 0)), 700);
                    sonar(ok ? "hallazgo" : "no");
                    vibrar(ok ? 15 : 30);
                    vuelo = null;
                    k++;
                    cuenta.textContent = `TOSS ${k} / ${N}`;
                    if (k >= N) fin(promedio(notasW));
                }
            } else {
                comida.setAttribute("transform", `translate(${wokX} ${WOK_Y - 6})`);
                abrir(0);
            }
        }));
    } else if (paso.t === "lamian") {
        const N = paso.n || 4;
        const A = 170 - ancho(20);
        const B = 170 + ancho(20);
        let largo = 70;
        let hilos = 1;
        let k = 0;
        let buenos = 0;
        const notasL = [];
        let ini = null;
        el(s, "rect", {
            x: 150 - B / 2,
            y: 70,
            width: B,
            height: 70,
            fill: "rgba(120,190,110,0.12)"
        });
        el(s, "line", {
            x1: 150 - A / 2,
            y1: 64,
            x2: 150 - A / 2,
            y2: 146,
            stroke: "rgb(80,150,80)",
            "stroke-width": 3,
            "stroke-dasharray": "5 4"
        });
        el(s, "line", {
            x1: 150 + A / 2,
            y1: 64,
            x2: 150 + A / 2,
            y2: 146,
            stroke: "rgb(80,150,80)",
            "stroke-width": 3,
            "stroke-dasharray": "5 4"
        });
        el(s, "line", {
            x1: 150 - B / 2,
            y1: 64,
            x2: 150 - B / 2,
            y2: 146,
            stroke: "rgb(222,110,100)",
            "stroke-width": 3,
            "stroke-dasharray": "5 4"
        });
        el(s, "line", {
            x1: 150 + B / 2,
            y1: 64,
            x2: 150 + B / 2,
            y2: 146,
            stroke: "rgb(222,110,100)",
            "stroke-width": 3,
            "stroke-dasharray": "5 4"
        });
        const masa = el(s, "g", {});
        const manos = [ el(s, "circle", {
            r: 13,
            fill: "rgb(250,214,190)",
            stroke: TINTA,
            "stroke-width": 3
        }), el(s, "circle", {
            r: 13,
            fill: "rgb(250,214,190)",
            stroke: TINTA,
            "stroke-width": 3
        }) ];
        const cuenta = el(s, "text", {
            x: 8,
            y: 18,
            "text-anchor": "start",
            class: "cocina-cuenta"
        });
        const pintar = (roto = false) => {
            masa.innerHTML = "";
            const n = Math.min(hilos, 16);
            const grosor = Math.max(2, 22 / Math.sqrt(n));
            for (let i = 0; i < n; i++) {
                const y = 105 + (i - (n - 1) / 2) * Math.min(5, 34 / n);
                if (roto) {
                    el(masa, "line", {
                        x1: 150 - largo / 2,
                        y1: y,
                        x2: 150 - 14,
                        y2: y + 6,
                        stroke: MASA,
                        "stroke-width": grosor,
                        "stroke-linecap": "round"
                    });
                    el(masa, "line", {
                        x1: 150 + 14,
                        y1: y + 6,
                        x2: 150 + largo / 2,
                        y2: y,
                        stroke: MASA,
                        "stroke-width": grosor,
                        "stroke-linecap": "round"
                    });
                } else el(masa, "path", {
                    d: `M${150 - largo / 2} ${y} Q150 ${y + 8 + largo / 30} ${150 + largo / 2} ${y}`,
                    fill: "none",
                    stroke: MASA,
                    "stroke-width": grosor,
                    "stroke-linecap": "round"
                });
            }
            masa.insertBefore(el(masa, "path", {
                d: `M${150 - largo / 2} 105 Q150 ${113 + largo / 30} ${150 + largo / 2} 105`,
                fill: "none",
                stroke: TINTA,
                "stroke-width": grosor + 4,
                "stroke-linecap": "round",
                opacity: .25
            }), masa.firstChild);
            manos[0].setAttribute("cx", 150 - largo / 2 - 8);
            manos[1].setAttribute("cx", 150 + largo / 2 + 8);
            manos.forEach((m => m.setAttribute("cy", 105)));
            cuenta.textContent = `${hilos} STRAND${hilos === 1 ? "" : "S"} · PULL ${k} / ${N}`;
        };
        pintar();
        ayuda("Drag sideways to pull · let go between the green lines");
        s.addEventListener("pointerdown", (e => {
            if (!vivo) return;
            e.preventDefault();
            try {
                s.setPointerCapture(e.pointerId);
            } catch (err) {}
            ini = aSvg(e);
        }));
        s.addEventListener("pointermove", (e => {
            if (!vivo || !ini) return;
            const p = aSvg(e);
            largo = Math.max(70, Math.min(260, 70 + Math.abs(p[0] - ini[0]) * 1.4));
            pintar();
        }));
        const soltar = () => {
            if (!vivo || !ini) return;
            ini = null;
            if (largo < 90) {
                largo = 70;
                pintar();
                return;
            }
            const ok = largo >= A && largo <= B;
            const roto = largo > B + 12;
            if (ok) buenos++;
            notasL.push(notaDe(largo - (A + B) / 2, (B - A) / 2, 20));
            sonar(ok ? "tocar" : "no");
            vibrar(ok ? 12 : 30);
            if (roto) pintar(true);
            k++;
            setTimeout((() => {
                if (!vivo && k < N) return;
                hilos = ok || !roto ? hilos * 2 : hilos;
                largo = 70;
                pintar();
                if (k >= N) fin(promedio(notasL));
            }), roto ? 400 : 120);
        };
        s.addEventListener("pointerup", soltar);
        s.addEventListener("pointercancel", soltar);
    } else if (paso.t === "lavar") {
        const I = INGREDIENTES[paso.que] || INGREDIENTES.bokchoy;
        el(s, "ellipse", {
            cx: 150,
            cy: 112,
            rx: 120,
            ry: 70,
            fill: "rgb(200,226,240)",
            stroke: TINTA,
            "stroke-width": 3
        });
        el(s, "ellipse", {
            cx: 150,
            cy: 112,
            rx: 104,
            ry: 56,
            fill: "rgb(220,238,248)"
        });
        if (paso.que === "camaron") {
            for (let i = 0; i < 3; i++) dibujarCamaron(s, 100 + i * 52, 108 + i % 2 * 6, 1.25, i % 2 === 1);
        } else if (paso.que === "pescado") {
            dibujarPescado(s, 70, 230, 112, 50);
        } else if (paso.que === "bokchoy") {
            dibujarBokchoy(s, 150, 116);
        } else if (paso.que === "arroz") {
            for (let i = 0; i < 90; i++) {
                const a = Math.random() * Math.PI * 2;
                const r = Math.sqrt(Math.random()) * 52;
                const x = 150 + r * Math.cos(a) * 1.5;
                const y = 112 + r * Math.sin(a) * .7;
                el(s, "ellipse", {
                    cx: x,
                    cy: y,
                    rx: 4,
                    ry: 2,
                    fill: "rgb(252,250,242)",
                    stroke: "rgb(190,186,176)",
                    "stroke-width": 1,
                    transform: `rotate(${Math.random() * 180} ${x} ${y})`
                });
            }
        } else if (paso.que === "hoja") {
            for (const [dy, rot] of [ [ -12, -6 ], [ 14, 5 ] ]) {
                const g = el(s, "g", {
                    transform: `rotate(${rot} 150 ${112 + dy})`
                });
                el(g, "path", {
                    d: `M50 ${112 + dy} Q150 ${84 + dy} 250 ${112 + dy} Q150 ${140 + dy} 50 ${112 + dy} Z`,
                    fill: "rgb(100,160,80)",
                    stroke: TINTA,
                    "stroke-width": 3
                });
                el(g, "line", {
                    x1: 56,
                    y1: 112 + dy,
                    x2: 244,
                    y2: 112 + dy,
                    stroke: "rgb(170,210,130)",
                    "stroke-width": 2
                });
            }
        } else if (paso.que === "pollo") {
            el(s, "ellipse", {
                cx: 150,
                cy: 114,
                rx: 62,
                ry: 36,
                fill: "rgb(244,220,184)",
                stroke: TINTA,
                "stroke-width": 3
            });
            for (const sx of [ -1, 1 ]) {
                el(s, "ellipse", {
                    cx: 150 + sx * 58,
                    cy: 96,
                    rx: 16,
                    ry: 11,
                    fill: "rgb(244,220,184)",
                    stroke: TINTA,
                    "stroke-width": 3,
                    transform: `rotate(${sx * 30} ${150 + sx * 58} 96)`
                });
                el(s, "circle", {
                    cx: 150 + sx * 70,
                    cy: 86,
                    r: 5,
                    fill: "rgb(252,246,236)",
                    stroke: TINTA,
                    "stroke-width": 2
                });
            }
            el(s, "path", {
                d: "M118 104 Q150 92 182 104",
                fill: "none",
                stroke: "rgb(250,236,214)",
                "stroke-width": 4
            });
        } else {
            dibujarIngrediente(s, paso.que, 80, 220, 112);
        }
        const manchas = [];
        const rnd = (a, b) => a + Math.random() * (b - a);
        for (let i = 0; i < 12; i++) {
            const m = {
                x: rnd(86, 214),
                y: rnd(92, 130),
                sucio: 1
            };
            m.el = el(s, "circle", {
                cx: m.x,
                cy: m.y,
                r: 8,
                fill: "rgb(110,84,58)",
                stroke: "rgb(80,60,40)",
                "stroke-width": 2,
                opacity: .9
            });
            manchas.push(m);
        }
        const burbujas = el(s, "g", {});
        el(s, "rect", {
            x: 30,
            y: 180,
            width: 240,
            height: 10,
            fill: "rgb(240,230,200)",
            stroke: TINTA,
            "stroke-width": 2
        });
        const tiempo = el(s, "rect", {
            x: 31,
            y: 181,
            width: 238,
            height: 8,
            fill: "rgb(120,170,220)"
        });
        ayuda("Rub back and forth to wash it clean");
        const T = 7e3 * (1 - .25 * D);
        let frotando = false;
        let prev = null;
        s.addEventListener("pointerdown", (e => {
            if (!vivo) return;
            e.preventDefault();
            try {
                s.setPointerCapture(e.pointerId);
            } catch (err) {}
            frotando = true;
            prev = aSvg(e);
        }));
        s.addEventListener("pointermove", (e => {
            if (!vivo || !frotando) return;
            const p = aSvg(e);
            const d = Math.hypot(p[0] - prev[0], p[1] - prev[1]);
            for (const m of manchas) {
                if (m.sucio > 0 && Math.hypot(m.x - p[0], m.y - p[1]) < 20) {
                    m.sucio = Math.max(0, m.sucio - d * .02);
                    m.el.setAttribute("opacity", .9 * m.sucio);
                }
            }
            if (Math.random() < .3) {
                const b = el(burbujas, "circle", {
                    cx: p[0] + rnd(-10, 10),
                    cy: p[1] + rnd(-10, 10),
                    r: rnd(3, 6),
                    fill: "rgba(255,255,255,0.8)",
                    stroke: "rgba(120,170,220,0.9)",
                    "stroke-width": 1
                });
                setTimeout((() => b.remove()), 600);
            }
            prev = p;
            if (manchas.every((m => m.sucio <= .05))) {
                const r = (performance.now() - t0) / T;
                fin(notaDe(Math.max(0, r - .3), .35, .6));
            }
        }));
        const soltar = () => {
            frotando = false;
        };
        s.addEventListener("pointerup", soltar);
        s.addEventListener("pointercancel", soltar);
        bucle((t => {
            const f = Math.max(0, 1 - t / T);
            tiempo.setAttribute("width", 238 * f);
            if (t >= T) {
                const limpias = manchas.filter((m => m.sucio <= .05)).length / manchas.length;
                fin(limpias >= .8 ? 2 : 1);
            }
        }));
    } else if (paso.t === "espolvorear") {
        const polvo = paso.color || "rgb(255,255,255)";
        const ZONAS = 5;
        const ZX0 = 50;
        const ZW = 40;
        const Z = baseEspolvorear(s, ctx.receta, ctx.plato);
        const capa = el(s, "g", {});
        const barras = [];
        const cant = Array(ZONAS).fill(0);
        const BAJO = .75 - ancho(.25, .3);
        const ALTO = .75 + ancho(.25, .3);
        for (let i = 0; i < ZONAS; i++) {
            const x = ZX0 + i * ZW + 4;
            el(s, "rect", {
                x: x,
                y: 172,
                width: ZW - 8,
                height: 12,
                fill: "rgb(240,230,200)",
                stroke: TINTA,
                "stroke-width": 2
            });
            el(s, "rect", {
                x: x + 1 + (ZW - 10) * BAJO,
                y: 172,
                width: (ZW - 10) * (Math.min(1, ALTO) - BAJO),
                height: 12,
                fill: "rgba(120,190,110,0.5)"
            });
            barras.push(el(s, "rect", {
                x: x + 1,
                y: 174,
                width: 0,
                height: 8,
                fill: polvo === "rgb(255,255,255)" ? "rgb(200,200,210)" : polvo
            }));
        }
        const salero = el(s, "g", {
            opacity: .9
        });
        el(salero, "rect", {
            x: -12,
            y: -40,
            width: 24,
            height: 30,
            rx: 5,
            fill: "rgb(236,232,224)",
            stroke: TINTA,
            "stroke-width": 3
        });
        el(salero, "rect", {
            x: -12,
            y: -14,
            width: 24,
            height: 6,
            fill: "rgb(170,170,180)",
            stroke: TINTA,
            "stroke-width": 2
        });
        salero.setAttribute("transform", "translate(150 50)");
        ayuda("Hold and move to sprinkle evenly · then Ready");
        let apretado = false;
        let x = 150;
        s.addEventListener("pointerdown", (e => {
            if (!vivo) return;
            e.preventDefault();
            try {
                s.setPointerCapture(e.pointerId);
            } catch (err) {}
            apretado = true;
            x = aSvg(e)[0];
        }));
        s.addEventListener("pointermove", (e => {
            if (!vivo) return;
            x = Math.max(40, Math.min(260, aSvg(e)[0]));
        }));
        const soltar = () => {
            apretado = false;
        };
        s.addEventListener("pointerup", soltar);
        s.addEventListener("pointercancel", soltar);
        let tPrevE = 0;
        let granos = 0;
        bucle((t => {
            const dt = Math.min(50, t - tPrevE) / (1e3 / 60);
            tPrevE = t;
            salero.setAttribute("transform", `translate(${x} ${apretado ? 54 : 46}) rotate(${apretado ? 180 : 160})`);
            if (!apretado) return;
            granos += 2 * dt;
            for (;granos >= 1; granos--) {
                const px = x + (Math.random() - .5) * 28;
                const dxn = (px - Z.cx) / Z.rx;
                const hh = Math.abs(dxn) < 1 ? Z.ry * Math.sqrt(1 - dxn * dxn) * .94 : 0;
                const py = Z.cy + (Math.random() * 2 - 1) * hh;
                if (!hh) {} else if (paso.hojas) el(capa, "ellipse", {
                    cx: px,
                    cy: py,
                    rx: 3,
                    ry: 1.6,
                    fill: polvo,
                    stroke: "rgba(0,0,0,0.35)",
                    "stroke-width": .6,
                    transform: `rotate(${Math.round(Math.random() * 180)} ${px.toFixed(1)} ${py.toFixed(1)})`
                }); else el(capa, "rect", {
                    x: px,
                    y: py,
                    width: 2,
                    height: 2,
                    fill: polvo,
                    stroke: "rgba(0,0,0,0.25)",
                    "stroke-width": .5
                });
                const z = Math.floor((px - ZX0) / ZW);
                if (z >= 0 && z < ZONAS) {
                    cant[z] = Math.min(1.4, cant[z] + .008);
                    barras[z].setAttribute("width", Math.min(1, cant[z]) * (ZW - 10));
                    barras[z].setAttribute("fill", cant[z] > ALTO ? "rgb(222,110,100)" : polvo === "rgb(255,255,255)" ? "rgb(200,200,210)" : polvo);
                }
            }
        }));
        boton("Ready ✓", (() => {
            const centro = (BAJO + Math.min(1, ALTO)) / 2;
            fin(promedio(cant.map((c => notaDe(c - centro, (Math.min(1, ALTO) - BAJO) / 2, .3)))));
        }));
    } else if (paso.t === "dibujar") {
        const forma = paso.forma || "corazon";
        const fondoColor = paso.fondo || "rgb(214,170,104)";
        const tinta = paso.tinta || "rgb(252,248,236)";
        if (forma === "media_luna") {
            el(s, "path", {
                d: "M62 62 L238 62 A88 88 0 0 1 62 62 Z",
                fill: fondoColor,
                stroke: TINTA,
                "stroke-width": 3
            });
            el(s, "path", {
                d: "M80 62 A70 70 0 0 0 220 62",
                fill: "none",
                stroke: "rgba(255,255,255,0.35)",
                "stroke-width": 4
            });
        } else if (forma === "lazo") {
            el(s, "rect", {
                x: 86,
                y: 52,
                width: 128,
                height: 104,
                rx: 14,
                fill: fondoColor,
                stroke: TINTA,
                "stroke-width": 3
            });
            if (paso.vetas) for (let i = 1; i < 5; i++) el(s, "line", {
                x1: 86 + 128 * i / 5,
                y1: 56,
                x2: 86 + 128 * i / 5,
                y2: 152,
                stroke: paso.vetas,
                "stroke-width": 2
            });
            if (paso.capas) for (const [y, h] of [ [ 78, 10 ], [ 104, 8 ], [ 126, 8 ] ]) el(s, "rect", {
                x: 89,
                y: y,
                width: 122,
                height: h,
                fill: paso.capas
            });
        } else el(s, "circle", {
            cx: 150,
            cy: 104,
            r: 84,
            fill: fondoColor,
            stroke: TINTA,
            "stroke-width": 3
        });
        const pts = [];
        const N = 40;
        for (let i = 0; i <= N; i++) {
            const t = i / N * Math.PI * 2;
            let x;
            let y;
            if (forma === "corazon") {
                x = 16 * Math.sin(t) ** 3;
                y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
                x = 150 + x * 3.6;
                y = 100 + y * 3.6;
            } else if (forma === "flor") {
                const r = 40 + 16 * Math.cos(5 * t);
                x = 150 + r * Math.cos(t);
                y = 104 + r * Math.sin(t);
            } else if (forma === "media_luna") {
                const a = i / N * Math.PI;
                x = 150 + 74 * Math.cos(a);
                y = 62 + 74 * Math.sin(a);
            } else if (forma === "lazo") {
                const per = [ [ 96, 62 ], [ 204, 82 ], [ 96, 104 ], [ 204, 126 ], [ 96, 148 ] ];
                const f = i / N * (per.length - 1);
                const k = Math.min(per.length - 2, Math.floor(f));
                const u = f - k;
                x = per[k][0] + (per[k + 1][0] - per[k][0]) * u;
                y = per[k][1] + (per[k + 1][1] - per[k][1]) * u;
            } else {
                const r = 8 + i / N * 62;
                x = 150 + r * Math.cos(t * 2);
                y = 104 + r * Math.sin(t * 2);
            }
            pts.push([ x, y ]);
        }
        el(s, "polyline", {
            points: pts.map((p => p.join(","))).join(" "),
            fill: "none",
            stroke: "rgba(22,20,22,0.35)",
            "stroke-width": 4,
            "stroke-dasharray": "3 6",
            "stroke-linecap": "round"
        });
        const inicio = el(s, "circle", {
            cx: pts[0][0],
            cy: pts[0][1],
            r: 8,
            fill: "rgb(120,190,110)",
            stroke: TINTA,
            "stroke-width": 2
        });
        const trazo = el(s, "polyline", {
            points: "",
            fill: "none",
            stroke: tinta,
            "stroke-width": forma === "lazo" ? 5 : 7,
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            ...forma === "media_luna" ? {
                "stroke-dasharray": "3 5",
                "stroke-width": 10
            } : {}
        });
        const tocados = new Set;
        let dibujados = [];
        let fuera = 0;
        let dentro = 0;
        let dibujando = false;
        ayuda(forma === "media_luna" ? "Run the fork along the edge, from the green dot, in one go" : forma === "lazo" ? "Wrap the string: follow the line from the green dot" : "Start at the green dot and trace the shape in one go");
        s.addEventListener("pointerdown", (e => {
            if (!vivo) return;
            e.preventDefault();
            try {
                s.setPointerCapture(e.pointerId);
            } catch (err) {}
            dibujando = true;
            dibujados = [ aSvg(e) ];
        }));
        s.addEventListener("pointermove", (e => {
            if (!vivo || !dibujando) return;
            const p = aSvg(e);
            dibujados.push(p);
            trazo.setAttribute("points", dibujados.map((q => q.map((v => v.toFixed(1))).join(","))).join(" "));
            let dmin = 1e9;
            pts.forEach(((q, i) => {
                const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
                if (d < 12) tocados.add(i);
                dmin = Math.min(dmin, d);
            }));
            if (dmin < 14) dentro++; else fuera++;
            inicio.setAttribute("opacity", .3);
        }));
        const soltar = () => {
            if (!vivo || !dibujando) return;
            dibujando = false;
            const cubierto = tocados.size / pts.length;
            if (cubierto < .35) {
                dibujados = [];
                tocados.clear();
                fuera = 0;
                dentro = 0;
                trazo.setAttribute("points", "");
                inicio.setAttribute("opacity", 1);
                return;
            }
            const prolijo = dentro / Math.max(1, dentro + fuera);
            const exige = Math.max(.6, Math.min(.88, .75 + .12 * D));
            const kC = Math.max(0, Math.min(1, (cubierto - .5) / .45));
            const kP = Math.max(0, Math.min(1, (prolijo - .45) / (exige + .08 - .45)));
            fin(1 + 2 * kC * kP);
        };
        s.addEventListener("pointerup", soltar);
        s.addEventListener("pointercancel", soltar);
    } else if (paso.t === "aplastar") {
        const I = INGREDIENTES[paso.que] || INGREDIENTES.platano;
        const PIEZAS = paso.n || 2;
        const A = .35 - ancho(.07);
        const B = .35 + ancho(.07);
        let grosor = 1;
        let pieza = 0;
        const notas = [];
        const molde = paso.que === "molde";
        const g = el(s, "g", {});
        const prensa = el(s, "g", {});
        if (molde) {
            el(prensa, "rect", {
                x: -44,
                y: -26,
                width: 88,
                height: 26,
                rx: 4,
                fill: "rgb(150,96,56)",
                stroke: TINTA,
                "stroke-width": 3
            });
            el(prensa, "rect", {
                x: -38,
                y: -6,
                width: 76,
                height: 6,
                fill: "rgb(110,66,36)"
            });
            for (let i = -3; i <= 3; i++) el(prensa, "rect", {
                x: i * 10 - 2,
                y: -5,
                width: 4,
                height: 4,
                fill: "rgb(196,140,90)"
            });
            el(prensa, "rect", {
                x: -9,
                y: -70,
                width: 18,
                height: 46,
                rx: 5,
                fill: "rgb(196,150,100)",
                stroke: TINTA,
                "stroke-width": 3
            });
            el(prensa, "circle", {
                cx: 0,
                cy: -72,
                r: 9,
                fill: "rgb(196,150,100)",
                stroke: TINTA,
                "stroke-width": 3
            });
        } else {
            el(prensa, "rect", {
                x: -60,
                y: -14,
                width: 120,
                height: 14,
                rx: 4,
                fill: "rgb(170,124,72)",
                stroke: TINTA,
                "stroke-width": 3
            });
            el(prensa, "rect", {
                x: -8,
                y: -50,
                width: 16,
                height: 38,
                rx: 4,
                fill: "rgb(196,150,100)",
                stroke: TINTA,
                "stroke-width": 3
            });
        }
        const BASE = 150;
        const ALTO = 60;
        el(s, "rect", {
            x: 60,
            y: BASE - ALTO * B,
            width: 180,
            height: ALTO * (B - A),
            fill: "rgba(120,190,110,0.3)",
            stroke: "rgb(80,150,80)",
            "stroke-width": 2,
            "stroke-dasharray": "5 4"
        });
        el(s, "rect", {
            x: 40,
            y: BASE,
            width: 220,
            height: 10,
            fill: "rgb(190,150,104)",
            stroke: TINTA,
            "stroke-width": 3
        });
        const cuenta = el(s, "text", {
            x: 8,
            y: 18,
            "text-anchor": "start",
            class: "cocina-cuenta"
        });
        const pintar = () => {
            g.innerHTML = "";
            const h = ALTO * grosor;
            const w = 60 + (1 - grosor) * 70;
            el(g, "ellipse", {
                cx: 150,
                cy: BASE - h / 2,
                rx: w / 2,
                ry: h / 2,
                fill: I.color,
                stroke: TINTA,
                "stroke-width": 3
            });
            if (paso.que === "masa_cebollin") {
                el(g, "path", {
                    d: `M150 ${BASE - h / 2} m-${(w * .3).toFixed(1)} 0 a${(w * .3).toFixed(1)} ${(h * .3).toFixed(1)} 0 1 1 ${(w * .3).toFixed(1)} ${(h * .3).toFixed(1)} a${(w * .18).toFixed(1)} ${(h * .18).toFixed(1)} 0 1 1 -${(w * .12).toFixed(1)} -${(h * .2).toFixed(1)}`,
                    fill: "none",
                    stroke: "rgb(214,196,160)",
                    "stroke-width": 2
                });
                for (const [fx, fy] of [ [ -.3, -.15 ], [ .22, -.2 ], [ .05, .18 ], [ -.12, .05 ], [ .3, .1 ], [ -.25, .22 ] ]) el(g, "rect", {
                    x: 150 + w * fx - 2,
                    y: BASE - h / 2 + h * fy - 1.5,
                    width: 4,
                    height: 3,
                    fill: "rgb(110,180,80)"
                });
            }
            if (molde && grosor < .75) {
                const k2 = Math.min(1, (.75 - grosor) / .4);
                const yy = BASE - h + Math.min(10, h * .25);
                el(g, "ellipse", {
                    cx: 150,
                    cy: yy,
                    rx: w * .36,
                    ry: Math.max(2, h * .12),
                    fill: "none",
                    stroke: "rgba(150,80,30,0.8)",
                    "stroke-width": 2,
                    opacity: k2
                });
                for (let i = -2; i <= 2; i++) el(g, "circle", {
                    cx: 150 + i * w * .12,
                    cy: yy,
                    r: 2.5,
                    fill: "rgba(150,80,30,0.8)",
                    opacity: k2
                });
            }
            if (grosor < .22) for (let i = 0; i < 3; i++) el(g, "path", {
                d: `M${140 + i * 10} ${BASE - h} l4 ${h * .8}`,
                stroke: TINTA,
                "stroke-width": 2
            });
            prensa.setAttribute("transform", `translate(150 ${BASE - h - 2})`);
            cuenta.textContent = `PIECE ${pieza + 1} / ${PIEZAS}`;
        };
        pintar();
        ayuda(molde ? "Tap to press the mold · stop in the green band, then Ready" : "Tap to smash · stop in the green band, then Ready");
        s.addEventListener("pointerdown", (e => {
            if (!vivo) return;
            e.preventDefault();
            grosor = Math.max(.12, grosor - (.055 + Math.random() * .02));
            sonar("tocar");
            vibrar(15);
            pintar();
        }));
        boton("Ready ✓", (() => {
            if (!vivo) return;
            const e = notaDe(grosor - (A + B) / 2, (B - A) / 2, .2);
            notas.push(e);
            pieza++;
            if (pieza >= PIEZAS) fin(promedio(notas)); else {
                sonar(e >= 2.5 ? "hito" : "mimo");
                grosor = 1;
                pintar();
            }
        }));
    } else if (paso.t === "agitar") {
        const color = paso.color || "rgb(214,170,120)";
        const molinillo = ctx.receta === "chocolate";
        let espuma = null;
        if (molinillo) {
            el(s, "rect", {
                x: 204,
                y: 104,
                width: 52,
                height: 10,
                rx: 4,
                fill: "rgb(90,60,40)",
                stroke: TINTA,
                "stroke-width": 2.5
            });
            el(s, "ellipse", {
                cx: 150,
                cy: 94,
                rx: 58,
                ry: 12,
                fill: "rgb(196,204,214)",
                stroke: TINTA,
                "stroke-width": 3
            });
            el(s, "ellipse", {
                cx: 150,
                cy: 95,
                rx: 52,
                ry: 9,
                fill: color
            });
            espuma = el(s, "g", {
                opacity: 0
            });
            for (let i = 0; i < 9; i++) el(espuma, "circle", {
                cx: 106 + i * 11,
                cy: 92 + i % 2 * 3,
                r: 6 + i % 3,
                fill: "rgb(196,150,120)",
                stroke: "rgba(80,50,30,0.5)",
                "stroke-width": 1
            });
        }
        const vaso = el(s, "g", {});
        let liq;
        const capas = [];
        if (molinillo) {
            el(vaso, "rect", {
                x: -4,
                y: -100,
                width: 8,
                height: 92,
                rx: 3,
                fill: "rgb(196,150,100)",
                stroke: TINTA,
                "stroke-width": 2.5
            });
            el(vaso, "ellipse", {
                cx: 0,
                cy: -2,
                rx: 16,
                ry: 12,
                fill: "rgb(176,124,78)",
                stroke: TINTA,
                "stroke-width": 2.5
            });
            el(vaso, "rect", {
                x: -18,
                y: -6,
                width: 36,
                height: 5,
                rx: 2,
                fill: "rgb(150,100,60)",
                stroke: TINTA,
                "stroke-width": 1.5
            });
            el(vaso, "rect", {
                x: -12,
                y: -18,
                width: 24,
                height: 4,
                rx: 2,
                fill: "rgb(150,100,60)",
                stroke: TINTA,
                "stroke-width": 1.5
            });
            liq = el(vaso, "g", {});
        } else {
            el(vaso, "path", {
                d: "M-30 -60 L30 -60 L24 50 L-24 50 Z",
                fill: "rgba(255,255,255,0.6)",
                stroke: TINTA,
                "stroke-width": 3
            });
            liq = el(vaso, "path", {
                d: "M-27 -10 L27 -10 L24 47 L-24 47 Z",
                fill: color
            });
            el(vaso, "rect", {
                x: -32,
                y: -76,
                width: 64,
                height: 18,
                rx: 6,
                fill: "rgb(190,196,206)",
                stroke: TINTA,
                "stroke-width": 3
            });
            capas.push(el(vaso, "rect", {
                x: -26,
                y: -10,
                width: 52,
                height: 18,
                fill: "rgb(246,240,226)",
                opacity: .9
            }));
        }
        if (molinillo) {
            el(s, "path", {
                d: "M92 94 A58 12 0 0 0 208 94 L200 172 Q150 182 100 172 Z",
                fill: "rgb(196,204,214)",
                stroke: TINTA,
                "stroke-width": 3
            });
            el(s, "path", {
                d: "M104 112 Q108 150 112 166",
                fill: "none",
                stroke: "rgba(255,255,255,0.7)",
                "stroke-width": 4,
                "stroke-linecap": "round"
            });
        }
        el(s, "rect", {
            x: 30,
            y: 180,
            width: 240,
            height: 10,
            fill: "rgb(240,230,200)",
            stroke: TINTA,
            "stroke-width": 2
        });
        const barra = el(s, "rect", {
            x: 31,
            y: 181,
            width: 0,
            height: 8,
            fill: "rgb(120,190,110)"
        });
        ayuda(molinillo ? "Spin the molinillo! Drag fast side to side" : "Shake it! Drag fast side to side (or shake your phone)");
        let x = 150;
        let mezcla = 0;
        let ultX = null;
        let dirPrev = 0;
        let arrastrando = false;
        const sumar = n => {
            mezcla = Math.min(1, mezcla + n);
            sonar("tocar");
        };
        s.addEventListener("pointerdown", (e => {
            if (!vivo) return;
            e.preventDefault();
            try {
                s.setPointerCapture(e.pointerId);
            } catch (err) {}
            arrastrando = true;
            ultX = aSvg(e)[0];
        }));
        s.addEventListener("pointermove", (e => {
            if (!vivo || !arrastrando) return;
            const px = aSvg(e)[0];
            const d = px - ultX;
            if (Math.abs(d) > 4) {
                const dir = Math.sign(d);
                if (dirPrev && dir !== dirPrev) sumar(.07);
                dirPrev = dir;
                ultX = px;
            }
            x = Math.max(80, Math.min(220, 150 + (px - 150) * .8));
        }));
        const soltar = () => {
            arrastrando = false;
        };
        s.addEventListener("pointerup", soltar);
        s.addEventListener("pointercancel", soltar);
        const movio = ev => {
            const a = ev.accelerationIncludingGravity || ev.acceleration;
            if (!vivo || !a) return;
            const m = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
            if (m > 22) sumar(.05);
        };
        window.addEventListener("devicemotion", movio);
        const quitarMov = () => window.removeEventListener("devicemotion", movio);
        bucle((t => {
            const temblor = arrastrando ? Math.sin(t / 30) * 2 : 0;
            if (molinillo) {
                vaso.setAttribute("transform", `translate(${(150 + (x - 150) * .25 + temblor).toFixed(1)} 150) scale(${(.7 + .3 * Math.abs(Math.cos(t / 60))).toFixed(2)} 1)`);
                espuma.setAttribute("opacity", Math.min(1, mezcla * 1.3).toFixed(2));
            } else {
                vaso.setAttribute("transform", `translate(${x + temblor} 110) rotate(${(x - 150) * .15})`);
                capas[0].setAttribute("opacity", .9 * (1 - mezcla));
                liq.setAttribute("fill", color);
            }
            barra.setAttribute("width", 238 * mezcla);
            if (mezcla >= 1) {
                quitarMov();
                const seg = t / 1e3;
                const k = 1 - .25 * D;
                fin(notaDe(Math.max(0, seg - 2.6 * k), 1.6 * k, 4 * k));
            }
        }));
        const destruirViejo = () => quitarMov();
        ctx._alDestruir = destruirViejo;
    } else if (paso.t === "enrollar") {
        const N = mas(paso.n || 1, 1);
        const hoja = paso.hoja ? {
            fondo: "rgb(110,160,80)",
            vena: "rgb(170,210,130)"
        } : {
            fondo: paso.color || MASA,
            vena: null
        };
        const relleno = RELLENOS[paso.relleno] || null;
        const X0 = 100;
        const X1 = 200;
        const Y0 = 40;
        const Y1 = 170;
        const CARRIL = ancho(16) + 4;
        const g = el(s, "g", {});
        const cuenta = el(s, "text", {
            x: 8,
            y: 18,
            "text-anchor": "start",
            class: "cocina-cuenta"
        });
        let k = 0;
        let buenos = 0;
        const notasE = [];
        let dedo = null;
        let desvio = 0;
        let y = Y1;
        const pintar = () => {
            g.innerHTML = "";
            el(g, "rect", {
                x: X0,
                y: Y0,
                width: X1 - X0,
                height: Math.max(0, y - Y0),
                fill: hoja.fondo,
                stroke: TINTA,
                "stroke-width": 3
            });
            if (hoja.vena) for (let i = 1; i < 4; i++) el(g, "line", {
                x1: X0 + (X1 - X0) * i / 4,
                y1: Y0 + 4,
                x2: X0 + (X1 - X0) * i / 4,
                y2: Math.max(Y0 + 4, y - 4),
                stroke: hoja.vena,
                "stroke-width": 2
            });
            if (paso.cebollin) {
                for (let i = 0; i < 26; i++) {
                    const cx = X0 + 8 + i * 37 % (X1 - X0 - 16);
                    const cy = Y0 + 8 + i * 53 % (Y1 - Y0 - 16);
                    if (cy < y - 8) el(g, "rect", {
                        x: cx,
                        y: cy,
                        width: 5,
                        height: 3,
                        fill: "rgb(110,180,80)"
                    });
                }
            }
            if (relleno && y > Y1 - 30) el(g, "rect", {
                x: X0 + 10,
                y: Y1 - 34,
                width: X1 - X0 - 20,
                height: 16,
                rx: 7,
                fill: relleno.color,
                stroke: relleno.sombra,
                "stroke-width": 2
            });
            el(g, "rect", {
                x: 150 - CARRIL,
                y: Y0,
                width: CARRIL * 2,
                height: Math.max(0, y - Y0),
                fill: "rgba(120,190,110,0.18)",
                stroke: "rgb(80,150,80)",
                "stroke-width": 2,
                "stroke-dasharray": "5 4"
            });
            el(g, "path", {
                d: `M150 ${Y0 + 6} l-8 12 h16 Z`,
                fill: "rgb(80,150,80)"
            });
            const grosor = 14 + (Y1 - y) * .09;
            el(g, "rect", {
                x: X0 - 6,
                y: y - grosor / 2,
                width: X1 - X0 + 12,
                height: grosor,
                rx: grosor / 2,
                fill: hoja.fondo === MASA ? "rgb(240,220,180)" : hoja.fondo,
                stroke: TINTA,
                "stroke-width": 3
            });
            el(g, "line", {
                x1: X0,
                y1: y - grosor / 4,
                x2: X1,
                y2: y - grosor / 4,
                stroke: "rgba(255,255,255,0.4)",
                "stroke-width": 2
            });
            cuenta.textContent = N > 1 ? `ROLL ${k} / ${N}` : "";
        };
        pintar();
        ayuda("Drag the roll up, straight along the green lane");
        s.addEventListener("pointerdown", (e => {
            if (!vivo) return;
            e.preventDefault();
            try {
                s.setPointerCapture(e.pointerId);
            } catch (err) {}
            const p = aSvg(e);
            if (p[1] > y - 30) {
                dedo = p;
                desvio = 0;
            }
        }));
        s.addEventListener("pointermove", (e => {
            if (!vivo || !dedo) return;
            const p = aSvg(e);
            y = Math.max(Y0 + 6, Math.min(y, p[1] + 10));
            if (Math.abs(p[0] - 150) > CARRIL) desvio += Math.abs(p[0] - 150) - CARRIL;
            dedo = p;
            pintar();
            if (y <= Y0 + 8) terminarUno();
        }));
        const terminarUno = () => {
            dedo = null;
            const ok = desvio < 40;
            if (ok) buenos++;
            notasE.push(notaDe(desvio, 40, 80));
            sonar(ok ? "tocar" : "no");
            k++;
            if (k >= N) {
                fin(promedio(notasE));
                return;
            }
            y = Y1;
            pintar();
        };
        s.addEventListener("pointerup", (() => {
            dedo = null;
        }));
    } else if (paso.t === "rallar") {
        const I = INGREDIENTES[paso.que] || INGREDIENTES.queso;
        const N = mas(paso.n || 6, 3);
        const GX = 150;
        const GY0 = 40;
        const GY1 = 150;
        const ROJA = GY1 - ancho(22);
        el(s, "path", {
            d: `M${GX - 34} ${GY1 + 20} L${GX - 26} ${GY0} L${GX + 26} ${GY0} L${GX + 34} ${GY1 + 20} Z`,
            fill: "rgb(206,212,220)",
            stroke: TINTA,
            "stroke-width": 3
        });
        for (let y = GY0 + 10; y < GY1 + 10; y += 9) for (let x = -20; x <= 20; x += 10) el(s, "rect", {
            x: GX + x - 2,
            y: y,
            width: 5,
            height: 3,
            fill: "rgb(120,126,140)"
        });
        el(s, "rect", {
            x: GX - 12,
            y: GY0 - 18,
            width: 24,
            height: 18,
            rx: 6,
            fill: "none",
            stroke: TINTA,
            "stroke-width": 4
        });
        el(s, "rect", {
            x: GX - 40,
            y: ROJA,
            width: 80,
            height: GY1 + 20 - ROJA,
            fill: "rgba(222,90,80,0.28)"
        });
        const DESTINO = {
            arepa: "arepa",
            salpicon: "vaso",
            bunuelos: "bol",
            pandebono: "bol",
            tinto: "olleta",
            chocolate: "chocolatera"
        }[ctx.receta];
        if (DESTINO === "arepa") {
            el(s, "ellipse", {
                cx: GX,
                cy: 182,
                rx: 64,
                ry: 13,
                fill: "rgb(244,214,140)",
                stroke: TINTA,
                "stroke-width": 3
            });
            el(s, "ellipse", {
                cx: GX,
                cy: 181,
                rx: 52,
                ry: 9,
                fill: "rgba(255,226,120,0.6)"
            });
        } else if (DESTINO === "vaso") {
            el(s, "ellipse", {
                cx: GX,
                cy: 182,
                rx: 46,
                ry: 12,
                fill: "rgb(246,112,112)",
                stroke: TINTA,
                "stroke-width": 3
            });
            for (const [x, c] of [ [ -28, "rgb(250,150,90)" ], [ -12, "rgb(250,236,170)" ], [ 6, "rgb(240,80,90)" ], [ 22, "rgb(250,210,70)" ] ]) el(s, "rect", {
                x: GX + x,
                y: 178,
                width: 9,
                height: 7,
                rx: 1.5,
                fill: c,
                stroke: TINTA,
                "stroke-width": 1.2
            });
        } else if (DESTINO === "bol") {
            el(s, "ellipse", {
                cx: GX,
                cy: 183,
                rx: 66,
                ry: 13,
                fill: "rgb(250,250,246)",
                stroke: TINTA,
                "stroke-width": 3
            });
            el(s, "ellipse", {
                cx: GX,
                cy: 182,
                rx: 56,
                ry: 9,
                fill: "rgb(240,226,190)"
            });
        } else if (DESTINO === "olleta" || DESTINO === "chocolatera") {
            el(s, "ellipse", {
                cx: GX,
                cy: 183,
                rx: 60,
                ry: 13,
                fill: "rgb(196,204,214)",
                stroke: TINTA,
                "stroke-width": 3
            });
            el(s, "ellipse", {
                cx: GX,
                cy: 182,
                rx: 51,
                ry: 9,
                fill: DESTINO === "olleta" ? "rgb(200,226,240)" : "rgb(246,240,226)"
            });
        }
        const monton = el(s, "g", {});
        const bloque = el(s, "g", {});
        const cuenta = el(s, "text", {
            x: 8,
            y: 18,
            "text-anchor": "start",
            class: "cocina-cuenta"
        });
        let tam = 1;
        let k = 0;
        let buenos = 0;
        const notasR = [];
        let dedo = null;
        let bajaDesde = null;
        let toco = false;
        const pintarBloque = y => {
            bloque.innerHTML = "";
            const h = 22 + 18 * tam;
            const y0 = y - h / 2;
            el(bloque, "rect", {
                x: GX - 22,
                y: y0,
                width: 44,
                height: h,
                rx: 4,
                fill: I.color,
                stroke: TINTA,
                "stroke-width": 3
            });
            if (paso.que === "chocolate") {
                for (let i = 1; i < 3; i++) el(bloque, "line", {
                    x1: GX - 22 + 44 * i / 3,
                    y1: y0 + 3,
                    x2: GX - 22 + 44 * i / 3,
                    y2: y0 + h - 3,
                    stroke: "rgb(80,44,28)",
                    "stroke-width": 2
                });
                el(bloque, "line", {
                    x1: GX - 19,
                    y1: y0 + h / 2,
                    x2: GX + 19,
                    y2: y0 + h / 2,
                    stroke: "rgb(80,44,28)",
                    "stroke-width": 2
                });
                el(bloque, "rect", {
                    x: GX - 18,
                    y: y0 + 4,
                    width: 10,
                    height: 3,
                    fill: "rgb(150,96,64)"
                });
            } else if (paso.que === "queso") {
                for (const [dx, fy, r] of [ [ -10, .3, 4 ], [ 8, .55, 3 ], [ -4, .75, 2.5 ], [ 12, .22, 2 ] ]) el(bloque, "circle", {
                    cx: GX + dx,
                    cy: y0 + h * fy,
                    r: r * (.6 + .4 * tam),
                    fill: "rgb(226,190,90)"
                });
                el(bloque, "rect", {
                    x: GX - 19,
                    y: y0 + 3,
                    width: 38,
                    height: 3,
                    fill: "rgb(255,244,200)"
                });
            } else if (I.vena) el(bloque, "rect", {
                x: GX - 18,
                y: y0 + 4,
                width: 36,
                height: 4,
                fill: I.vena
            });
            cuenta.textContent = `GRATE ${k} / ${N}`;
        };
        pintarBloque(GY0 + 30);
        ayuda("Drag the block down the grater · stop before the red part!");
        s.addEventListener("pointerdown", (e => {
            if (!vivo) return;
            e.preventDefault();
            try {
                s.setPointerCapture(e.pointerId);
            } catch (err) {}
            dedo = aSvg(e);
            yBloque = Math.max(GY0 + 16, Math.min(GY1 + 20, dedo[1]));
            bajaDesde = yBloque;
            fondo = yBloque;
            toco = yBloque >= ROJA;
            pintarBloque(yBloque);
        }));
        const pasada = () => {
            const ok = !toco;
            if (ok) buenos++;
            notasR.push(ok ? 3 : 1.4);
            k++;
            tam = Math.max(.15, 1 - k / N);
            for (let i = 0; i < 6; i++) {
                const mx = GX - 40 + Math.random() * 80;
                const my = DESTINO ? 177 + Math.random() * 8 : 172 + Math.random() * 12;
                el(monton, "rect", {
                    x: mx,
                    y: my,
                    width: 6,
                    height: 2,
                    fill: I.color,
                    stroke: "rgba(0,0,0,0.3)",
                    "stroke-width": .5,
                    transform: `rotate(${Math.random() * 60 - 30} ${mx} ${my})`
                });
            }
            sonar(ok ? "tocar" : "no");
            toco = false;
            if (k >= N) fin(promedio(notasR));
        };
        let yBloque = GY0 + 30;
        let fondo = yBloque;
        s.addEventListener("pointermove", (e => {
            if (!vivo || !dedo) return;
            const p = aSvg(e);
            const y = Math.max(GY0 + 16, Math.min(GY1 + 20, p[1]));
            if (y >= ROJA && !toco) {
                toco = true;
                sonar("no");
                vibrar(40);
            }
            if (y >= fondo) fondo = y; else if (fondo - y > 8) {
                if (fondo - bajaDesde >= 40) pasada();
                if (!vivo) return;
                toco = false;
                bajaDesde = y;
                fondo = y;
            }
            if (y < bajaDesde) {
                bajaDesde = y;
                fondo = y;
            }
            yBloque = y;
            pintarBloque(y);
            dedo = p;
        }));
        s.addEventListener("pointerup", (() => {
            if (!vivo || !dedo) return;
            dedo = null;
            if (fondo - bajaDesde >= 40) pasada();
            if (!vivo) return;
            toco = false;
            yBloque = GY0 + 30;
            pintarBloque(yBloque);
        }));
        s.addEventListener("pointercancel", (() => {
            dedo = null;
        }));
    } else if (paso.t === "pelar") {
        const I = INGREDIENTES[paso.que] || INGREDIENTES.mango;
        const CX = 150;
        const CY = 104;
        const R = 52;
        const BANDA = ancho(14) + 4;
        el(s, "circle", {
            cx: CX,
            cy: CY,
            r: R + BANDA,
            fill: "rgba(120,190,110,0.16)",
            stroke: "rgb(80,150,80)",
            "stroke-width": 2,
            "stroke-dasharray": "5 4"
        });
        el(s, "circle", {
            cx: CX,
            cy: CY,
            r: R - BANDA,
            fill: "none",
            stroke: "rgb(80,150,80)",
            "stroke-width": 2,
            "stroke-dasharray": "5 4"
        });
        const PULPA = {
            mango: "rgb(255,200,70)",
            papaya: "rgb(250,150,90)",
            maduro: "rgb(250,214,120)",
            loto: "rgb(246,236,220)",
            lulo: "rgb(200,230,120)"
        };
        el(s, "circle", {
            cx: CX,
            cy: CY,
            r: R - 4,
            fill: PULPA[paso.que] || I.pulpa || "rgb(250,220,140)",
            stroke: TINTA,
            "stroke-width": 3
        });
        if (paso.que === "papaya") {
            el(s, "ellipse", {
                cx: CX,
                cy: CY,
                rx: 18,
                ry: 13,
                fill: "rgb(236,120,70)"
            });
            for (let i = 0; i < 14; i++) {
                const a = i / 14 * Math.PI * 2;
                el(s, "circle", {
                    cx: CX + 11 * Math.cos(a) * (i % 2 ? .6 : 1),
                    cy: CY + 8 * Math.sin(a) * (i % 2 ? .6 : 1),
                    r: 2.6,
                    fill: "rgb(50,36,36)"
                });
            }
        } else if (paso.que === "loto") {
            el(s, "circle", {
                cx: CX,
                cy: CY,
                r: 8,
                fill: "rgb(214,196,170)",
                stroke: "rgb(190,170,140)",
                "stroke-width": 2
            });
            for (let i = 0; i < 8; i++) {
                const a = i / 8 * Math.PI * 2;
                el(s, "circle", {
                    cx: CX + 27 * Math.cos(a),
                    cy: CY + 27 * Math.sin(a),
                    r: 7,
                    fill: "rgb(214,196,170)",
                    stroke: "rgb(190,170,140)",
                    "stroke-width": 2
                });
            }
        } else if (paso.que === "mango") {
            el(s, "ellipse", {
                cx: CX,
                cy: CY,
                rx: 14,
                ry: 30,
                fill: "rgb(250,226,150)",
                opacity: .8
            });
            for (let i = 0; i < 6; i++) el(s, "path", {
                d: `M${CX - 34 + i * 12} ${CY - 26} q4 26 0 52`,
                fill: "none",
                stroke: "rgb(240,176,50)",
                "stroke-width": 2,
                opacity: .6
            });
        } else if (paso.que === "maduro") {
            el(s, "circle", {
                cx: CX,
                cy: CY,
                r: 10,
                fill: "rgb(236,190,90)"
            });
            for (let i = 0; i < 3; i++) {
                const a = i / 3 * Math.PI * 2 + .5;
                el(s, "line", {
                    x1: CX,
                    y1: CY,
                    x2: CX + 20 * Math.cos(a),
                    y2: CY + 20 * Math.sin(a),
                    stroke: "rgb(230,180,80)",
                    "stroke-width": 3
                });
            }
        }
        const COLOR_CASCARA = {
            mango: "rgb(110,170,60)",
            papaya: "rgb(150,190,70)",
            maduro: "rgb(70,52,40)",
            loto: "rgb(196,150,110)"
        };
        const cascaraColor = COLOR_CASCARA[paso.que] || I.color;
        const cascaraBorde = el(s, "path", {
            d: "",
            fill: "none",
            stroke: TINTA,
            "stroke-width": 15,
            "stroke-linecap": "round"
        });
        const cascara = el(s, "path", {
            d: "",
            fill: "none",
            stroke: cascaraColor,
            "stroke-width": 10,
            "stroke-linecap": "round"
        });
        const tira = el(s, "g", {});
        const inicio = el(s, "circle", {
            cx: CX + R,
            cy: CY,
            r: 8,
            fill: "rgb(120,190,110)",
            stroke: TINTA,
            "stroke-width": 2
        });
        ayuda("Start at the green dot and go around the edge, inside the ring");
        let girado = 0;
        let prevAng = null;
        let roturas = 0;
        let dentro = true;
        let base = 0;
        let sentido = 0;
        const pintar = () => {
            if (girado >= Math.PI * 2 - .01) {
                cascara.setAttribute("d", "");
                cascaraBorde.setAttribute("d", "");
                return;
            }
            const a0 = sentido >= 0 ? base + girado : base;
            const a1 = sentido >= 0 ? base + Math.PI * 2 : base + Math.PI * 2 - girado;
            const pt = a => `${(CX + R * Math.cos(a)).toFixed(2)} ${(CY + R * Math.sin(a)).toFixed(2)}`;
            const medio = (a0 + a1) / 2;
            const d = `M${pt(a0)} A${R} ${R} 0 0 1 ${pt(medio)} A${R} ${R} 0 0 1 ${pt(a1 - .001)}`;
            cascara.setAttribute("d", d);
            cascaraBorde.setAttribute("d", d);
        };
        pintar();
        s.addEventListener("pointerdown", (e => {
            if (!vivo) return;
            e.preventDefault();
            try {
                s.setPointerCapture(e.pointerId);
            } catch (err) {}
            const p = aSvg(e);
            const d = Math.hypot(p[0] - CX, p[1] - CY);
            if (Math.abs(d - R) <= BANDA + 6) {
                prevAng = Math.atan2(p[1] - CY, p[0] - CX);
                if (girado === 0) {
                    base = prevAng;
                    inicio.setAttribute("cx", CX + R * Math.cos(base));
                    inicio.setAttribute("cy", CY + R * Math.sin(base));
                }
                dentro = true;
            }
        }));
        s.addEventListener("pointermove", (e => {
            if (!vivo || prevAng === null) return;
            const p = aSvg(e);
            const d = Math.hypot(p[0] - CX, p[1] - CY);
            const a = Math.atan2(p[1] - CY, p[0] - CX);
            let da = a - prevAng;
            if (da > Math.PI) da -= 2 * Math.PI;
            if (da < -Math.PI) da += 2 * Math.PI;
            prevAng = a;
            if (Math.abs(d - R) > BANDA) {
                if (dentro) {
                    dentro = false;
                    roturas++;
                    sonar("no");
                    vibrar(30);
                    ayuda("Oops, the peel broke! Keep going around");
                }
                return;
            }
            dentro = true;
            if (!sentido && Math.abs(da) > .02) sentido = da > 0 ? 1 : -1;
            const avance = da * sentido;
            if (sentido && avance > 0) {
                girado = Math.min(Math.PI * 2, girado + avance);
                if (Math.random() < .3) el(tira, "rect", {
                    x: p[0] + 6,
                    y: p[1],
                    width: 5,
                    height: 3,
                    fill: cascaraColor,
                    transform: `rotate(${a * 180 / Math.PI} ${p[0]} ${p[1]})`
                });
                inicio.setAttribute("opacity", .25);
                pintar();
                if (girado >= Math.PI * 2 - .01) fin(Math.max(1, 3 - .45 * roturas));
            }
        }));
        s.addEventListener("pointerup", (() => {
            prevAng = null;
        }));
    } else if (paso.t === "manga") {
        const N = mas(paso.n || 4, 2);
        const color = paso.color || "rgb(255,214,110)";
        const fondo = paso.fondo || null;
        if (fondo && !paso.punto) el(s, "ellipse", {
            cx: 150,
            cy: 108,
            rx: 120,
            ry: 70,
            fill: fondo,
            stroke: TINTA,
            "stroke-width": 3
        });
        const puntos = Array.from({
            length: N
        }, ((_, i) => {
            const fila = i % 2;
            const x = 150 + (i - (N - 1) / 2) * Math.min(52, 200 / N);
            return {
                x: x,
                y: 96 + fila * 26,
                r: 0,
                hecho: false
            };
        }));
        const ESC = paso.punto ? .5 : 1;
        const OBJ = 14 * ESC;
        const TOL = (ancho(3.5) + .5) * ESC;
        for (const p of puntos) {
            if (paso.punto) {
                el(s, "circle", {
                    cx: p.x,
                    cy: p.y + 2,
                    r: 22,
                    fill: "rgb(252,250,244)",
                    stroke: TINTA,
                    "stroke-width": 3
                });
                for (const a of [ .4, 1.6, 2.8, 4, 5.2 ]) el(s, "path", {
                    d: `M${p.x} ${p.y + 2} L${(p.x + 16 * Math.cos(a)).toFixed(1)} ${(p.y + 2 + 16 * Math.sin(a)).toFixed(1)}`,
                    stroke: "rgba(170,150,130,0.5)",
                    "stroke-width": 1.5
                });
            } else if (!fondo) el(s, "circle", {
                cx: p.x,
                cy: p.y,
                r: 20,
                fill: "rgb(214,170,104)",
                stroke: TINTA,
                "stroke-width": 3
            });
            el(s, "circle", {
                cx: p.x,
                cy: p.y,
                r: OBJ,
                fill: "none",
                stroke: "rgb(80,150,80)",
                "stroke-width": 2,
                "stroke-dasharray": "4 3"
            });
            p.el = el(s, "circle", {
                cx: p.x,
                cy: p.y,
                r: 0,
                fill: color,
                stroke: TINTA,
                "stroke-width": 2
            });
        }
        const manga = el(s, "g", {
            opacity: .9
        });
        el(manga, "path", {
            d: "M-12 -46 L12 -46 L3 -8 L-3 -8 Z",
            fill: "rgb(246,240,226)",
            stroke: TINTA,
            "stroke-width": 3
        });
        el(manga, "rect", {
            x: -3,
            y: -10,
            width: 6,
            height: 6,
            fill: "rgb(190,196,206)",
            stroke: TINTA,
            "stroke-width": 2
        });
        manga.setAttribute("transform", "translate(150 40)");
        ayuda(paso.punto ? "Hold on each bun · let go when the red dot fills the ring" : "Hold on each circle · let go when it fills the green ring");
        let actual = null;
        let buenos = 0;
        let hechos = 0;
        const notasM = [];
        s.addEventListener("pointerdown", (e => {
            if (!vivo) return;
            e.preventDefault();
            const p = aSvg(e);
            actual = puntos.find((q => !q.hecho && Math.hypot(q.x - p[0], q.y - p[1]) < 24)) || null;
            if (actual) manga.setAttribute("transform", `translate(${actual.x} ${actual.y})`);
        }));
        const soltar = () => {
            if (!vivo || !actual) return;
            const q = actual;
            actual = null;
            if (q.r < 3 * ESC) return;
            q.hecho = true;
            hechos++;
            const ok = Math.abs(q.r - OBJ) <= TOL;
            if (ok) buenos++;
            notasM.push(notaDe(q.r - OBJ, TOL, TOL * 1.5));
            sonar(ok ? "tocar" : "no");
            if (hechos >= N) fin(promedio(notasM));
        };
        s.addEventListener("pointerup", soltar);
        s.addEventListener("pointercancel", soltar);
        let tPrevM = 0;
        bucle((t => {
            const dt = Math.min(50, t - tPrevM) / (1e3 / 60);
            tPrevM = t;
            if (actual) {
                actual.r = Math.min(26 * ESC, actual.r + .32 * ESC * rapido(.3) * dt);
                actual.el.setAttribute("r", actual.r.toFixed(1));
                if (actual.r >= 26 * ESC) soltar();
            }
        }));
    } else if (paso.t === "apilar" && paso.que === "perlas") {
        const N = paso.n || 3;
        const VX0 = 112;
        const VX1 = 188;
        const VY0 = 64;
        const VY1 = 178;
        el(s, "rect", {
            x: VX0,
            y: VY0,
            width: VX1 - VX0,
            height: VY1 - VY0,
            fill: "rgba(255,255,255,0.55)",
            stroke: TINTA,
            "stroke-width": 3
        });
        el(s, "rect", {
            x: VX0 + 3,
            y: VY0 + 22,
            width: VX1 - VX0 - 6,
            height: VY1 - VY0 - 25,
            fill: paso.color || "rgb(214,170,120)"
        });
        const fondo = el(s, "g", {});
        el(s, "rect", {
            x: VX0,
            y: VY0,
            width: VX1 - VX0,
            height: VY1 - VY0,
            fill: "none",
            stroke: TINTA,
            "stroke-width": 3
        });
        el(s, "path", {
            d: `M${VX0 + 8} ${VY0 + 8} L${VX0 + 8} ${VY1 - 10}`,
            stroke: "rgba(255,255,255,0.6)",
            "stroke-width": 4,
            "stroke-linecap": "round"
        });
        el(s, "line", {
            x1: 150,
            y1: VY0 - 6,
            x2: 150,
            y2: VY0 + 14,
            stroke: "rgb(80,150,80)",
            "stroke-width": 3,
            "stroke-dasharray": "4 3"
        });
        const mesa = el(s, "g", {});
        const cuchara = el(s, "g", {});
        el(cuchara, "rect", {
            x: 14,
            y: -4,
            width: 60,
            height: 7,
            rx: 3,
            fill: "rgb(196,170,140)",
            stroke: TINTA,
            "stroke-width": 2.5
        });
        el(cuchara, "path", {
            d: "M-18 -6 Q0 18 18 -6 Z",
            fill: "rgb(226,232,238)",
            stroke: TINTA,
            "stroke-width": 2.5
        });
        const enCuchara = el(cuchara, "g", {});
        const perla = (g, x, y) => {
            el(g, "circle", {
                cx: x,
                cy: y,
                r: 4.2,
                fill: "rgb(60,38,34)",
                stroke: TINTA,
                "stroke-width": 1
            });
            el(g, "circle", {
                cx: x - 1.4,
                cy: y - 1.4,
                r: 1.2,
                fill: "rgba(255,255,255,0.5)"
            });
        };
        const llenarCuchara = () => {
            enCuchara.innerHTML = "";
            for (const [x, y] of [ [ -8, -6 ], [ 0, -8 ], [ 8, -6 ], [ -4, -11 ], [ 4, -11 ] ]) perla(enCuchara, x, y);
        };
        llenarCuchara();
        const cayendo = el(s, "g", {});
        const cuenta = el(s, "text", {
            x: 8,
            y: 18,
            "text-anchor": "start",
            class: "cocina-cuenta"
        });
        let k = 0;
        let suma = 0;
        let x = 60;
        let dir = 1;
        let caida = null;
        const VEL = 110 * rapido(.35);
        let tPrev = 0;
        cuenta.textContent = `PEARLS 0 / ${N}`;
        ayuda("Tap to drop the pearls right in the middle of the cup");
        s.addEventListener("pointerdown", (e => {
            if (!vivo || caida) return;
            e.preventDefault();
            caida = {
                x: x,
                y: 34
            };
            enCuchara.innerHTML = "";
        }));
        bucle((t => {
            const dt = Math.min(.05, (t - tPrev) / 1e3);
            tPrev = t;
            if (!caida) {
                x += dir * VEL * dt;
                if (x > 240) dir = -1;
                if (x < 60) dir = 1;
                s.dataset.apilar = `${x.toFixed(1)},150`;
            }
            cuchara.setAttribute("transform", `translate(${x.toFixed(1)} 34)`);
            s.dataset.cae = caida ? "1" : "0";
            cayendo.innerHTML = "";
            if (caida) {
                const dentroVaso = caida.x > VX0 + 6 && caida.x < VX1 - 6;
                const destino = dentroVaso ? VY1 - 8 - k * 5 : VY1;
                caida.y = Math.min(destino, caida.y + 300 * dt);
                for (const [dx, dy] of [ [ -6, 0 ], [ 0, -3 ], [ 6, 0 ], [ -3, 5 ], [ 3, 5 ] ]) perla(cayendo, caida.x + dx, caida.y + dy);
                if (caida.y >= destino) {
                    const off = Math.abs(caida.x - 150);
                    const e = !dentroVaso ? 1 : notaDe(off, ancho(8) + 2, 22);
                    suma += e;
                    for (const [dx, dy] of [ [ -6, 0 ], [ 0, -3 ], [ 6, 0 ], [ -3, 4 ], [ 3, 4 ] ]) {
                        if (dentroVaso) perla(fondo, Math.max(VX0 + 7, Math.min(VX1 - 7, caida.x + dx)), destino + dy); else perla(mesa, caida.x + dx, destino + dy - 4);
                    }
                    k++;
                    cuenta.textContent = `PEARLS ${k} / ${N}`;
                    sonar(e >= 2.5 ? "tocar" : e >= 2 ? "hito" : "no");
                    vibrar(e >= 2.5 ? 12 : 25);
                    caida = null;
                    x = Math.random() < .5 ? 60 : 240;
                    dir = x < 150 ? 1 : -1;
                    if (k >= N) fin(suma / N); else llenarCuchara();
                }
            }
        }));
    } else if (paso.t === "apilar") {
        const oblea = paso.que === "oblea";
        const N = oblea ? paso.n || 1 : mas(paso.n || 3, 1);
        const W = 90;
        const H = oblea ? 10 : 18;
        const BASE = 176;
        if (oblea) {
            el(s, "rect", {
                x: 105,
                y: BASE,
                width: 90,
                height: 8,
                rx: 4,
                fill: "rgb(246,222,170)",
                stroke: TINTA,
                "stroke-width": 2
            });
            el(s, "rect", {
                x: 108,
                y: BASE - 4,
                width: 84,
                height: 5,
                rx: 2,
                fill: "rgb(170,96,46)",
                stroke: TINTA,
                "stroke-width": 1.5
            });
        } else el(s, "rect", {
            x: 60,
            y: BASE,
            width: 180,
            height: 8,
            fill: "rgb(150,154,170)",
            stroke: TINTA,
            "stroke-width": 2
        });
        const pila = el(s, "g", {});
        const mov = el(s, "g", {});
        const cuenta = el(s, "text", {
            x: 8,
            y: 18,
            "text-anchor": "start",
            class: "cocina-cuenta"
        });
        const canasta = (g, x, y) => {
            if (oblea) {
                el(g, "rect", {
                    x: x - W / 2,
                    y: y,
                    width: W,
                    height: H,
                    rx: 5,
                    fill: "rgb(246,222,170)",
                    stroke: TINTA,
                    "stroke-width": 3
                });
                for (let i = 1; i < 6; i++) el(g, "line", {
                    x1: x - W / 2 + W * i / 6,
                    y1: y + 2,
                    x2: x - W / 2 + W * i / 6,
                    y2: y + H - 2,
                    stroke: "rgba(214,180,120,0.8)",
                    "stroke-width": 1
                });
                return;
            }
            el(g, "rect", {
                x: x - W / 2,
                y: y,
                width: W,
                height: H,
                fill: "rgb(214,170,104)",
                stroke: TINTA,
                "stroke-width": 3
            });
            el(g, "line", {
                x1: x - W / 2 + 3,
                y1: y + H / 2,
                x2: x + W / 2 - 3,
                y2: y + H / 2,
                stroke: "rgb(170,124,72)",
                "stroke-width": 2
            });
            for (let i = 1; i < 6; i++) el(g, "line", {
                x1: x - W / 2 + W * i / 6,
                y1: y + 2,
                x2: x - W / 2 + W * i / 6,
                y2: y + H - 2,
                stroke: "rgba(170,124,72,0.6)",
                "stroke-width": 1
            });
        };
        let k = 0;
        let suma = 0;
        let arriba = 150;
        let x = 60;
        let dir = 1;
        let cayendo = null;
        const VEL = 110 * rapido(.35);
        let tPrev = 0;
        cuenta.textContent = `STACK 0 / ${N}`;
        ayuda(oblea ? "Tap to drop the top wafer right on the bottom one" : "Tap to drop the steamer right on top of the one below");
        s.addEventListener("pointerdown", (e => {
            if (!vivo || cayendo) return;
            e.preventDefault();
            cayendo = {
                x: x,
                y: 40
            };
        }));
        bucle((t => {
            const dt = Math.min(.05, (t - tPrev) / 1e3);
            tPrev = t;
            mov.innerHTML = "";
            s.dataset.cae = cayendo ? "1" : "0";
            if (!cayendo) {
                x += dir * VEL * dt;
                if (x > 240) dir = -1;
                if (x < 60) dir = 1;
                s.dataset.apilar = `${x.toFixed(1)},${arriba.toFixed(1)}`;
                canasta(mov, x, 40);
            } else {
                const destino = BASE - (k + 1) * H;
                cayendo.y = Math.min(destino, cayendo.y + 420 * dt);
                canasta(mov, cayendo.x, cayendo.y);
                if (cayendo.y >= destino) {
                    const off = Math.abs(cayendo.x - arriba);
                    const e = notaDe(off, ancho(8) + 2, 22);
                    suma += e;
                    canasta(pila, cayendo.x, destino);
                    arriba = cayendo.x;
                    k++;
                    cuenta.textContent = `STACK ${k} / ${N}`;
                    sonar(e >= 2.5 ? "tocar" : e >= 2 ? "hito" : "no");
                    vibrar(e >= 2.5 ? 12 : 25);
                    cayendo = null;
                    x = Math.random() < .5 ? 60 : 240;
                    dir = x < 150 ? 1 : -1;
                    if (k >= N) fin(suma / N);
                }
            }
        }));
    } else if (paso.t === "bolitas") {
        const N = mas(paso.n || 3, 1);
        const color = paso.color || MASA_R;
        const cuenta = el(s, "text", {
            x: 8,
            y: 18,
            "text-anchor": "start",
            class: "cocina-cuenta"
        });
        const hechas = el(s, "g", {});
        const masa = el(s, "path", {
            d: "",
            fill: color,
            stroke: TINTA,
            "stroke-width": 3
        });
        el(s, "rect", {
            x: 240,
            y: 40,
            width: 18,
            height: 130,
            fill: "rgb(240,230,200)",
            stroke: TINTA,
            "stroke-width": 2
        });
        const A = .82 - ancho(.08);
        const B = Math.min(1.02, .82 + ancho(.08) + .06);
        el(s, "rect", {
            x: 240,
            y: 40 + 130 * (1 - Math.min(1, B)),
            width: 18,
            height: 130 * (Math.min(1, B) - A),
            fill: "rgba(120,190,110,0.5)"
        });
        const nivel = el(s, "rect", {
            x: 243,
            y: 168,
            width: 12,
            height: 0,
            fill: "rgb(232,168,30)"
        });
        let k = 0;
        let buenos = 0;
        const notasB = [];
        let redondo = 0;
        let prevAng = null;
        let dedo = false;
        const forma = () => {
            const pts = [];
            for (let i = 0; i < 16; i++) {
                const a = i / 16 * Math.PI * 2;
                const r = 30 + (1 - redondo) * 10 * Math.sin(a * 3 + k);
                pts.push(`${(130 + r * Math.cos(a)).toFixed(1)},${(104 + r * Math.sin(a) * (.75 + .25 * redondo)).toFixed(1)}`);
            }
            masa.setAttribute("d", `M${pts.join(" L")} Z`);
            nivel.setAttribute("y", 168 - 126 * Math.min(1, redondo));
            nivel.setAttribute("height", 126 * Math.min(1, redondo));
            cuenta.textContent = `BALL ${k + 1} / ${N}`;
        };
        forma();
        ayuda("Rub little circles on the dough · then Ready when it's round");
        s.addEventListener("pointerdown", (e => {
            if (!vivo) return;
            e.preventDefault();
            try {
                s.setPointerCapture(e.pointerId);
            } catch (err) {}
            dedo = true;
            const p = aSvg(e);
            prevAng = Math.atan2(p[1] - 104, p[0] - 130);
        }));
        s.addEventListener("pointermove", (e => {
            if (!vivo || !dedo) return;
            const p = aSvg(e);
            const a = Math.atan2(p[1] - 104, p[0] - 130);
            let da = a - prevAng;
            if (da > Math.PI) da -= 2 * Math.PI;
            if (da < -Math.PI) da += 2 * Math.PI;
            prevAng = a;
            if (Math.hypot(p[0] - 130, p[1] - 104) < 60) {
                redondo = Math.min(1.25, redondo + Math.abs(da) * .035 * rapido(.3));
                forma();
            }
        }));
        s.addEventListener("pointerup", (() => {
            dedo = false;
        }));
        boton("Ready ✓", (() => {
            if (!vivo) return;
            const ok = redondo >= A && redondo <= B;
            if (ok) buenos++;
            notasB.push(notaDe(redondo - (A + B) / 2, (B - A) / 2, .2));
            sonar(ok ? "tocar" : "no");
            el(hechas, "circle", {
                cx: 40 + k * 26,
                cy: 176,
                r: 10,
                fill: color,
                stroke: TINTA,
                "stroke-width": 2,
                opacity: ok ? 1 : .6
            });
            k++;
            if (k >= N) {
                fin(promedio(notasB));
                return;
            }
            redondo = 0;
            forma();
        }));
    } else if (paso.t === "untar") {
        const sobre = paso.sobre || "arepa";
        const color = paso.color || "rgb(255,226,120)";
        const CX = 150;
        const CY = 104;
        const RX = sobre === "oblea" || sobre === "crepe" ? 76 : sobre === "hoja" ? 92 : 88;
        const RY = sobre === "oblea" || sobre === "crepe" ? 64 : sobre === "hoja" ? 58 : 60;
        const dentro = (x, y) => ((x - CX) / RX) ** 2 + ((y - CY) / RY) ** 2 <= 1;
        el(s, "ellipse", {
            cx: CX,
            cy: CY + 6,
            rx: RX + 6,
            ry: RY + 6,
            fill: "rgba(60,40,30,0.2)"
        });
        if (sobre === "hoja") {
            el(s, "ellipse", {
                cx: CX,
                cy: CY,
                rx: RX,
                ry: RY,
                fill: "rgb(96,150,70)",
                stroke: TINTA,
                "stroke-width": 3
            });
            for (let i = 0; i < 10; i++) {
                const a = i / 10 * Math.PI * 2;
                el(s, "line", {
                    x1: CX,
                    y1: CY,
                    x2: CX + (RX - 6) * Math.cos(a),
                    y2: CY + (RY - 6) * Math.sin(a),
                    stroke: "rgb(150,196,110)",
                    "stroke-width": 2
                });
            }
            el(s, "path", {
                d: `M${CX - 60} ${CY - 14} Q${CX} ${CY - 34} ${CX + 58} ${CY - 10}`,
                fill: "none",
                stroke: "rgb(70,120,50)",
                "stroke-width": 3
            });
            el(s, "circle", {
                cx: CX,
                cy: CY,
                r: 5,
                fill: "rgb(150,196,110)",
                stroke: "rgb(70,120,50)",
                "stroke-width": 2
            });
        } else if (sobre === "oblea") {
            el(s, "ellipse", {
                cx: CX,
                cy: CY,
                rx: RX,
                ry: RY,
                fill: "rgb(246,222,170)",
                stroke: TINTA,
                "stroke-width": 3
            });
            for (let i = -4; i <= 4; i++) {
                el(s, "line", {
                    x1: CX + i * 16,
                    y1: CY - RY * Math.sqrt(Math.max(0, 1 - (i * 16 / RX) ** 2)) + 3,
                    x2: CX + i * 16,
                    y2: CY + RY * Math.sqrt(Math.max(0, 1 - (i * 16 / RX) ** 2)) - 3,
                    stroke: "rgba(214,180,120,0.8)",
                    "stroke-width": 1.5
                });
                el(s, "line", {
                    x1: CX - RX * Math.sqrt(Math.max(0, 1 - (i * 13 / RY) ** 2)) + 3,
                    y1: CY + i * 13,
                    x2: CX + RX * Math.sqrt(Math.max(0, 1 - (i * 13 / RY) ** 2)) - 3,
                    y2: CY + i * 13,
                    stroke: "rgba(214,180,120,0.8)",
                    "stroke-width": 1.5
                });
            }
        } else if (sobre === "crepe") {
            el(s, "ellipse", {
                cx: CX,
                cy: CY,
                rx: RX + 14,
                ry: RY + 12,
                fill: "rgb(70,70,80)",
                stroke: TINTA,
                "stroke-width": 3
            });
            el(s, "ellipse", {
                cx: CX,
                cy: CY,
                rx: RX,
                ry: RY,
                fill: "rgb(250,228,160)",
                stroke: "rgb(200,160,90)",
                "stroke-width": 2
            });
            for (const [x, y, rr] of [ [ -30, -18, 9 ], [ 24, -26, 7 ], [ 36, 14, 10 ], [ -20, 26, 8 ] ]) el(s, "ellipse", {
                cx: CX + x,
                cy: CY + y,
                rx: rr,
                ry: rr * .6,
                fill: "rgb(236,196,120)",
                opacity: .7
            });
            el(s, "ellipse", {
                cx: CX + 4,
                cy: CY - 2,
                rx: 18,
                ry: 13,
                fill: "rgba(255,255,250,0.85)"
            });
            el(s, "circle", {
                cx: CX + 4,
                cy: CY - 2,
                r: 7,
                fill: "rgb(255,196,40)",
                stroke: "rgb(220,150,20)",
                "stroke-width": 1.5
            });
        } else {
            el(s, "ellipse", {
                cx: CX,
                cy: CY,
                rx: RX,
                ry: RY,
                fill: paso.fondo || "rgb(244,214,140)",
                stroke: TINTA,
                "stroke-width": 3
            });
            for (const [x, y, rx] of [ [ -40, -20, 12 ], [ 10, -32, 9 ], [ 44, 6, 13 ], [ -14, 22, 11 ], [ -58, 18, 7 ], [ 30, 34, 8 ] ]) el(s, "ellipse", {
                cx: CX + x,
                cy: CY + y,
                rx: rx,
                ry: rx * .55,
                fill: "rgb(206,150,80)",
                opacity: .8
            });
        }
        const idU = `untar${++idClip}`;
        const cp = el(el(s, "defs", {}), "clipPath", {
            id: idU
        });
        el(cp, "ellipse", {
            cx: CX,
            cy: CY,
            rx: RX - 1.5,
            ry: RY - 1.5
        });
        const capa = el(s, "g", {
            "clip-path": `url(#${idU})`
        });
        const capaFuera = el(s, "g", {});
        const cuchillo = el(s, "g", {
            opacity: 0
        });
        el(cuchillo, "path", {
            d: "M-6 -4 L26 -4 Q32 0 26 4 L-6 4 Z",
            fill: "rgb(226,232,238)",
            stroke: TINTA,
            "stroke-width": 2.5
        });
        el(cuchillo, "rect", {
            x: -30,
            y: -4,
            width: 24,
            height: 8,
            rx: 3,
            fill: "rgb(110,72,50)",
            stroke: TINTA,
            "stroke-width": 2.5
        });
        el(cuchillo, "rect", {
            x: 4,
            y: -3,
            width: 18,
            height: 4,
            rx: 2,
            fill: color
        });
        const CEL = 16;
        const celdas = [];
        for (let y = CY - RY + CEL / 2; y < CY + RY; y += CEL) for (let x = CX - RX + CEL / 2; x < CX + RX; x += CEL) if (dentro(x, y) && ((x - CX) / (RX - 6)) ** 2 + ((y - CY) / (RY - 6)) ** 2 <= 1) celdas.push({
            x: x,
            y: y,
            ok: false
        });
        el(s, "rect", {
            x: 30,
            y: 180,
            width: 240,
            height: 10,
            fill: "rgb(240,230,200)",
            stroke: TINTA,
            "stroke-width": 2
        });
        const barra = el(s, "rect", {
            x: 31,
            y: 181,
            width: 0,
            height: 8,
            fill: color
        });
        const R_UNTAR = ancho(17, .3) + 2;
        let prev = null;
        let fuera = 0;
        let total = 0;
        s.dataset.untar = `${CX},${CY},${RX},${RY}`;
        ayuda({
            hoja: "Cover the whole package in clay · don't spill off",
            oblea: "Spread the arequipe all over the wafer · stay on it",
            crepe: "Spread the egg all over the crepe · stay on it"
        }[sobre] || "Drag the knife all over the arepa · don't spread off the edge");
        const untarEn = (x, y) => {
            total++;
            if (!dentro(x, y)) {
                fuera++;
                if (fuera % 4 === 1) el(capaFuera, "circle", {
                    cx: x,
                    cy: y,
                    r: 5,
                    fill: color,
                    opacity: .6,
                    stroke: "rgba(0,0,0,0.2)",
                    "stroke-width": 1
                });
                return;
            }
            el(capa, "circle", {
                cx: x,
                cy: y,
                r: R_UNTAR,
                fill: color,
                opacity: sobre === "hoja" ? .5 : .32
            });
            for (const c of celdas) if (!c.ok && Math.abs(c.x - x) <= R_UNTAR * .8 && Math.abs(c.y - y) <= R_UNTAR * .8) c.ok = true;
        };
        s.addEventListener("pointerdown", (e => {
            if (!vivo) return;
            e.preventDefault();
            try {
                s.setPointerCapture(e.pointerId);
            } catch (err) {}
            prev = aSvg(e);
            cuchillo.setAttribute("opacity", 1);
        }));
        s.addEventListener("pointermove", (e => {
            if (!vivo || !prev) return;
            const p = aSvg(e);
            const d = Math.hypot(p[0] - prev[0], p[1] - prev[1]);
            const pasos = Math.max(1, Math.ceil(d / 6));
            for (let i = 1; i <= pasos; i++) untarEn(prev[0] + (p[0] - prev[0]) * i / pasos, prev[1] + (p[1] - prev[1]) * i / pasos);
            cuchillo.setAttribute("transform", `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)}) rotate(${(Math.atan2(p[1] - prev[1], p[0] - prev[0]) * 180 / Math.PI).toFixed(0)})`);
            prev = p;
            const cubierto = celdas.filter((c => c.ok)).length / celdas.length;
            barra.setAttribute("width", (238 * cubierto).toFixed(1));
            if (cubierto >= .95) {
                const mancha = fuera / Math.max(1, total);
                fin(notaDe(mancha, .06, .2));
            }
        }));
        const soltar = () => {
            prev = null;
            cuchillo.setAttribute("opacity", 0);
        };
        s.addEventListener("pointerup", soltar);
        s.addEventListener("pointercancel", soltar);
    } else if (paso.t === "romper") {
        const N = mas(paso.n || 4, 1);
        const CX = 150;
        const CY = 104;
        const RX = 92;
        const RY = 56;
        const R = ancho(17, .3) + 3;
        el(s, "ellipse", {
            cx: CX,
            cy: CY + 8,
            rx: RX + 6,
            ry: RY + 6,
            fill: "rgba(60,40,30,0.25)"
        });
        const adentro = el(s, "g", {
            opacity: 0
        });
        el(adentro, "ellipse", {
            cx: CX,
            cy: CY,
            rx: RX + 4,
            ry: RY + 4,
            fill: "rgb(96,150,70)",
            stroke: TINTA,
            "stroke-width": 3
        });
        el(adentro, "ellipse", {
            cx: CX,
            cy: CY + 2,
            rx: RX - 26,
            ry: RY - 14,
            fill: "rgb(222,150,70)",
            stroke: TINTA,
            "stroke-width": 3
        });
        el(adentro, "path", {
            d: `M${CX - 40} ${CY - 10} Q${CX} ${CY - 30} ${CX + 40} ${CY - 8}`,
            fill: "none",
            stroke: "rgb(246,200,120)",
            "stroke-width": 5,
            "stroke-linecap": "round"
        });
        const barro = el(s, "g", {});
        el(barro, "ellipse", {
            cx: CX,
            cy: CY,
            rx: RX,
            ry: RY,
            fill: "rgb(150,100,64)",
            stroke: TINTA,
            "stroke-width": 3
        });
        for (const [x, y, rr] of [ [ -50, -20, 8 ], [ -10, -34, 6 ], [ 34, -18, 9 ], [ 54, 16, 7 ], [ -30, 22, 9 ], [ 8, 30, 6 ] ]) el(barro, "ellipse", {
            cx: CX + x,
            cy: CY + y,
            rx: rr,
            ry: rr * .6,
            fill: "rgb(176,124,82)"
        });
        el(barro, "path", {
            d: `M${CX - 60} ${CY - 28} Q${CX - 20} ${CY - 46} ${CX + 30} ${CY - 40}`,
            fill: "none",
            stroke: "rgba(255,230,200,0.35)",
            "stroke-width": 6,
            "stroke-linecap": "round"
        });
        const grietas = el(barro, "g", {});
        const meta = el(s, "circle", {
            r: R,
            fill: "rgba(120,190,110,0.28)",
            stroke: "rgb(80,150,80)",
            "stroke-width": 3,
            "stroke-dasharray": "5 4"
        });
        const mazo = el(s, "g", {
            opacity: 0
        });
        el(mazo, "rect", {
            x: -4,
            y: -46,
            width: 8,
            height: 40,
            rx: 3,
            fill: "rgb(196,150,100)",
            stroke: TINTA,
            "stroke-width": 2.5
        });
        el(mazo, "rect", {
            x: -18,
            y: -58,
            width: 36,
            height: 16,
            rx: 4,
            fill: "rgb(120,120,130)",
            stroke: TINTA,
            "stroke-width": 2.5
        });
        const cuenta = el(s, "text", {
            x: 8,
            y: 18,
            "text-anchor": "start",
            class: "cocina-cuenta"
        });
        const rr = azarDe("romper");
        const lugares = Array.from({
            length: N
        }, ((_, i) => {
            const a = i / N * Math.PI * 2 + rr() * .8;
            const d = .35 + rr() * .4;
            return [ CX + (RX - R) * d * Math.cos(a), CY + (RY - R) * d * Math.sin(a) ];
        }));
        let k = 0;
        let buenos = 0;
        const notasK = [];
        const ponerMeta = () => {
            const [x, y] = lugares[k];
            meta.setAttribute("cx", x.toFixed(1));
            meta.setAttribute("cy", y.toFixed(1));
            s.dataset.romper = `${x.toFixed(1)},${y.toFixed(1)}`;
            cuenta.textContent = `CRACK ${k} / ${N}`;
        };
        ponerMeta();
        ayuda("Tap the green marks to crack the clay open");
        bucle((t => meta.setAttribute("r", (R * (.92 + .08 * Math.sin(t / 160))).toFixed(1))));
        s.addEventListener("pointerdown", (e => {
            if (!vivo || k >= N) return;
            e.preventDefault();
            const [x, y] = aSvg(e);
            const [mx, my] = lugares[k];
            const ok = Math.hypot(x - mx, y - my) <= R + 2;
            if (ok) buenos++;
            notasK.push(notaDe(Math.hypot(x - mx, y - my), R + 2, 16));
            sonar(ok ? "tocar" : "no");
            vibrar(ok ? 18 : 30);
            mazo.setAttribute("opacity", 1);
            mazo.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(-20)`);
            setTimeout((() => mazo.setAttribute("opacity", 0)), 160);
            for (let j = 0; j < 4; j++) {
                const a = j / 4 * Math.PI * 2 + rr();
                let px = x;
                let py = y;
                let d = `M${px.toFixed(1)} ${py.toFixed(1)}`;
                for (let q = 0; q < 3; q++) {
                    px += Math.cos(a + (rr() - .5)) * (6 + rr() * 6);
                    py += Math.sin(a + (rr() - .5)) * (5 + rr() * 5);
                    d += ` L${px.toFixed(1)} ${py.toFixed(1)}`;
                }
                el(grietas, "path", {
                    d: d,
                    fill: "none",
                    stroke: TINTA,
                    "stroke-width": ok ? 2.5 : 1.5,
                    "stroke-linejoin": "round"
                });
            }
            k++;
            if (k >= N) {
                meta.setAttribute("opacity", 0);
                cuenta.textContent = `CRACK ${N} / ${N}`;
                adentro.setAttribute("opacity", 1);
                barro.style.transition = "transform 0.35s ease-in, opacity 0.35s ease-in";
                barro.style.transformOrigin = "150px 104px";
                barro.style.transform = "scale(1.12) translateY(14px)";
                barro.style.opacity = "0";
                fin(promedio(notasK));
                return;
            }
            ponerMeta();
        }));
    } else if (paso.t === "elegir") {
        const opciones = paso.opciones || [];
        const pedido = paso.pedido || [];
        const elegido = new Set;
        s.remove();
        const caja = document.createElement("div");
        caja.className = "cocina-elegir";
        caja.innerHTML = `\n      <div class="cocina-elegir-plato"><img src="${esc(ctx.plato || "")}" alt="" draggable="false" /><div class="cocina-elegir-puestos" data-puestos></div></div>\n      <div class="cocina-elegir-opciones">${opciones.map((o => `<button type="button" class="cocina-opcion" data-op="${esc(o.id)}" style="--c:${esc(o.color || "#fff")}">${o.icono ? `<img src="${esc(o.icono)}" alt="" draggable="false" />` : "<i></i>"}${esc(o.nombre)}</button>`)).join("")}</div>`;
        area.appendChild(caja);
        const puestos = caja.querySelector("[data-puestos]");
        if (paso.pincho) caja.querySelector(".cocina-elegir-plato").classList.add("con-pincho");
        const pintar = () => {
            const ids = [ ...elegido ];
            if (paso.pincho) {
                puestos.innerHTML = `<i class="cocina-palito"></i>` + ids.map(((id, k) => {
                    const o = opciones.find((x => x.id === id)) || {};
                    return `<img src="${esc(o.icono || "")}" alt="" draggable="false" style="left:50%;top:${(74 - k * 21).toFixed(1)}%" />`;
                })).join("");
                return;
            }
            puestos.innerHTML = capaAdiciones(ids.map((id => opciones.find((x => x.id === id)))).filter(Boolean), ctx.receta);
        };
        for (const b of caja.querySelectorAll("[data-op]")) {
            b.addEventListener("click", (() => {
                if (!vivo) return;
                if (performance.now() - t0 < 350) return;
                const id = b.dataset.op;
                if (elegido.has(id)) elegido.delete(id); else elegido.add(id);
                b.classList.toggle("elegida", elegido.has(id));
                sonar("tocar");
                pintar();
            }));
        }
        ayuda(paso.ayuda || (pedido.length ? "Add what the ticket says, then Ready" : "Plain order: nothing extra. Tap Ready"));
        boton("Ready ✓", (() => {
            if (ctx.alElegir) ctx.alElegir([ ...elegido ]);
            fin(estrellasDeEleccion([ ...elegido ], pedido));
        }));
    } else if (GESTOS[paso.t]) {
        const g = {};
        area.__g = g;
        GESTOS[paso.t].crear(s, paso, {
            el: el,
            fin: fin,
            bucle: bucle,
            aSvg: aSvg,
            ancho: ancho,
            rapido: rapido,
            mas: mas,
            D: D,
            MASA_R: MASA_R,
            TINTA: TINTA,
            sonar: sonar,
            vibrar: vibrar,
            ayuda: ayuda,
            boton: boton,
            notaDe: notaDe,
            promedio: promedio,
            azarDe: azarDe,
            oscurecer: oscurecer,
            dibujarCamaron: dibujarCamaron,
            dibujarPescado: dibujarPescado,
            g: g,
            t0: t0,
            vivo: () => vivo,
            ahora: () => performance.now()
        });
    }
    return {
        destruir() {
            vivo = false;
            cancelAnimationFrame(raf);
            pix.parar();
            if (ctx._alDestruir) ctx._alDestruir();
        },
        resolver(e = 3) {
            if (!terminado) fin(e);
        }
    };
}
