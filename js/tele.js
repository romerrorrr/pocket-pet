export const ANCHO = 38;

export const ALTO = 24;

const MS_CANAL = 8e3;

const MS_ESTATICA = 520;

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
    9: [ "111", "101", "111", "001", "111" ],
    "-": [ "000", "000", "111", "000", "000" ]
};

export function canales({especial: especial = false} = {}) {
    return especial ? [ "corazon", "cocina", "pecera", "clima" ] : [ "cocina", "pecera", "clima" ];
}

export function enAire(ahora, opts = {}) {
    const lista = canales(opts);
    const ciclo = MS_CANAL + MS_ESTATICA;
    const n = Math.floor(ahora / ciclo);
    const dentro = ahora - n * ciclo;
    return {
        canal: lista[n % lista.length],
        t: Math.floor(ahora / 260),
        estatica: dentro >= MS_CANAL
    };
}

export function dibujar(m, x0, y0, ahora, opts = {}) {
    const px = (x, y, c) => {
        if (x < 0 || y < 0 || x >= ANCHO || y >= ALTO) return;
        m.fillStyle = c;
        m.fillRect(x0 + x, y0 + y, 1, 1);
    };
    const rect = (xa, ya, xb, yb, c) => {
        const a = Math.max(0, xa), b = Math.max(0, ya), c2 = Math.min(ANCHO - 1, xb), d = Math.min(ALTO - 1, yb);
        if (c2 < a || d < b) return;
        m.fillStyle = c;
        m.fillRect(x0 + a, y0 + b, c2 - a + 1, d - b + 1);
    };
    const {canal: canal, t: t, estatica: estatica} = enAire(ahora, opts);
    if (estatica) {
        const tonos = [ "rgb(40,40,44)", "rgb(90,90,96)", "rgb(150,150,156)", "rgb(210,210,214)" ];
        let s = t * 9301 + 49297;
        for (let y = 0; y < ALTO; y++) {
            for (let x = 0; x < ANCHO; x += 2) {
                s = (s * 9301 + 49297) % 233280;
                rect(x, y, x + 1, y, tonos[Math.floor(s / 233280 * 4)]);
            }
        }
        return;
    }
    if (canal === "cocina") cocina(px, rect, t); else if (canal === "pecera") pecera(px, rect, t); else if (canal === "corazon") corazon(px, rect, t); else clima(px, rect, t, opts);
}

function cocina(px, rect, t) {
    rect(0, 0, ANCHO - 1, ALTO - 1, "rgb(60,40,34)");
    rect(0, 19, ANCHO - 1, ALTO - 1, "rgb(98,64,44)");
    for (let x = 0; x < ANCHO; x += 4) px(x, 19, "rgb(120,82,56)");
    rect(9, 13, 27, 19, "rgb(196,150,90)");
    rect(9, 13, 27, 13, "rgb(226,186,120)");
    for (const x of [ 11, 15, 19, 23 ]) rect(x, 15, x, 18, "rgb(160,116,66)");
    const blanco = "rgb(248,244,232)";
    rect(13, 9, 23, 12, blanco);
    rect(12, 10, 24, 12, blanco);
    rect(15, 8, 21, 8, blanco);
    px(18, 8, "rgb(214,200,180)");
    px(17, 9, "rgb(214,200,180)");
    px(19, 9, "rgb(214,200,180)");
    if (t % 6 !== 5) {
        px(16, 10, "rgb(40,30,30)");
        px(20, 10, "rgb(40,30,30)");
    }
    px(18, 11, "rgb(220,110,110)");
    [ 15, 19, 23 ].forEach(((bx, k) => {
        const y = 6 - (t + k * 2) % 7;
        if (y < 0) return;
        const c = y > 3 ? "rgb(226,222,216)" : "rgb(150,132,120)";
        const x = bx + ((t + k) % 4 < 2 ? 1 : 0);
        for (const [dx, dy] of [ [ 0, 0 ], [ 1, 0 ], [ -1, 0 ], [ 0, -1 ], [ 0, 1 ] ]) if (y + dy >= 0 && y + dy < 8) px(x + dx, y + dy, c);
    }));
}

function pecera(px, rect, t) {
    rect(0, 0, ANCHO - 1, 9, "rgb(40,96,150)");
    rect(0, 10, ANCHO - 1, ALTO - 1, "rgb(34,82,136)");
    for (let x = t % 2; x < ANCHO; x += 2) px(x, 10, "rgb(40,96,150)");
    rect(0, 21, ANCHO - 1, ALTO - 1, "rgb(214,190,130)");
    for (const [x0, h] of [ [ 4, 6 ], [ 30, 8 ], [ 33, 5 ] ]) {
        for (let y = 0; y < h; y++) px(x0 + Math.floor((y + t) / 2) % 2, 21 - y, "rgb(70,150,90)");
    }
    const pez = (x, y, c, izq) => {
        const X = dx => izq ? x + 4 - dx : x + dx;
        for (let dx = 1; dx < 5; dx++) for (let dy = 0; dy < 3; dy++) px(X(dx), y + dy, c);
        px(X(0), y + 1, c);
        px(X(-1), y, c);
        px(X(-1), y + 2, c);
        px(X(3), y, "rgb(250,250,250)");
    };
    pez(t * 2 % (ANCHO + 8) - 6, 6, "rgb(246,140,60)", false);
    pez(ANCHO - (t * 2 + 14) % (ANCHO + 8), 13, "rgb(250,210,80)", true);
    [ 8, 20, 26 ].forEach(((bx, k) => px(bx, 20 - (t * 2 + k * 5) % 20, "rgb(200,230,250)")));
}

function corazon(px, rect, t) {
    rect(0, 0, ANCHO - 1, ALTO - 1, "rgb(250,196,210)");
    const M = [ "01100110", "11111111", "11111111", "11111111", "01111110", "00111100", "00011000" ];
    const grande = t % 2 === 0;
    const s = grande ? 2 : 1;
    const ox = grande ? 11 : 15;
    const oy = grande ? 5 : 8;
    M.forEach(((fila, y) => {
        for (let x = 0; x < 8; x++) if (fila[x] === "1") rect(ox + x * s, oy + y * s, ox + x * s + s - 1, oy + y * s + s - 1, "rgb(220,60,90)");
    }));
    rect(ox + s, oy + s, ox + 2 * s - 1, oy + 2 * s - 1, "rgb(255,230,236)");
    [ [ 4, 4 ], [ 32, 5 ], [ 6, 18 ], [ 31, 19 ] ].forEach((([x, y], k) => {
        if ((t + k) % 2) {
            px(x, y, "rgb(255,255,255)");
            px(x - 1, y, "rgb(255,240,244)");
            px(x + 1, y, "rgb(255,240,244)");
        }
    }));
}

function clima(px, rect, t, {clima: tipo = null, temperatura: temperatura = null, noche: noche = false} = {}) {
    const llueve = tipo === "lluvia" || tipo === "llovizna" || tipo === "tormenta";
    const gris = llueve || tipo === "nublado" || tipo === "nieve" || tipo === "niebla";
    const cielo = noche ? gris ? "rgb(56,60,84)" : "rgb(30,36,74)" : gris ? "rgb(128,132,150)" : "rgb(110,170,230)";
    rect(0, 0, ANCHO - 1, ALTO - 1, cielo);
    const pasto = tipo === "nieve" ? "rgb(232,236,244)" : noche ? "rgb(40,70,56)" : gris ? "rgb(60,96,72)" : "rgb(70,120,80)";
    rect(0, 18, ANCHO - 1, ALTO - 1, pasto);
    for (let x = 0; x < ANCHO; x += 3) px(x, 18, tipo === "nieve" ? "rgb(250,250,255)" : "rgb(90,150,96)");
    const nube = (x, y, c) => {
        rect(x, y + 2, x + 9, y + 4, c);
        rect(x + 2, y, x + 7, y + 1, c);
    };
    if (!gris || tipo === "nublado") {
        const cx = 13;
        const cy = 9;
        if (noche) {
            for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 10 && (x - 2) * (x - 2) + (y + 1) * (y + 1) > 6) px(cx + x, cy + y, "rgb(246,238,206)");
            [ [ 4, 3 ], [ 26, 4 ], [ 21, 12 ], [ 32, 9 ] ].forEach((([x, y], k) => (t + k) % 3 && px(x, y, "rgb(236,232,210)")));
        } else {
            for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 10) px(cx + x, cy + y, "rgb(255,214,80)");
            px(cx - 1, cy, "rgb(120,70,40)");
            px(cx + 1, cy, "rgb(120,70,40)");
            px(cx, cy + 1, "rgb(220,120,90)");
            for (let k = 0; k < 8; k++) {
                const a = k * Math.PI / 4 + t % 2 * (Math.PI / 8);
                const r = 5 + t % 2;
                px(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), "rgb(255,236,150)");
            }
        }
        if (tipo === "nublado") nube(Math.floor(t / 2) % (ANCHO + 10) - 10, 7, noche ? "rgb(120,124,150)" : "rgb(236,238,244)"); else if (!noche) for (let x = 0; x < 4; x++) {
            px((t + x) % ANCHO, 3, "rgb(250,250,250)");
            px((t + x + 1) % ANCHO, 2, "rgb(250,250,250)");
        }
    } else {
        const c = noche ? "rgb(110,114,140)" : "rgb(220,224,232)";
        nube(3, 3, c);
        nube(16, 4, c);
        if (llueve) {
            for (let k = 0; k < 10; k++) {
                const x = (k * 7 + 3) % ANCHO;
                const y = (k * 5 + t * 3) % 18;
                px(x, y, "rgb(170,200,240)");
                px(x, y + 1, "rgb(170,200,240)");
            }
            if (tipo === "tormenta" && t % 9 === 0) rect(0, 0, ANCHO - 1, 17, "rgba(255,255,255,0.45)");
        } else if (tipo === "nieve") {
            for (let k = 0; k < 9; k++) px((k * 7 + 3 + Math.floor(t / 2) % 2) % ANCHO, (k * 5 + t) % 18, "rgb(250,250,255)");
        } else if (tipo === "niebla") {
            for (let y = 9; y < 18; y += 3) rect((t + y) % 6, y, ANCHO - 1 - (t + y) % 5, y, "rgba(236,236,240,0.7)");
        }
    }
    if (Number.isFinite(temperatura)) {
        const txt = `${Math.round(temperatura)}`;
        const w = txt.length * 4 + 3;
        const x0 = ANCHO - w - 1;
        const y0 = ALTO - 6;
        rect(x0 - 1, y0 - 1, ANCHO - 1, ALTO - 1, "rgba(20,20,28,0.55)");
        [ ...txt ].forEach(((ch, i) => {
            const g = DIGITOS[ch];
            if (!g) return;
            g.forEach(((fila, y) => {
                for (let x = 0; x < 3; x++) if (fila[x] === "1") px(x0 + i * 4 + x, y0 + y, "rgb(255,255,255)");
            }));
        }));
        const gx = x0 + txt.length * 4;
        px(gx, y0, "rgb(255,255,255)");
        px(gx + 1, y0, "rgb(255,255,255)");
        px(gx, y0 + 1, "rgb(255,255,255)");
        px(gx + 1, y0 + 1, "rgb(255,255,255)");
    }
}
