export const W = 38;

export const H = 24;

const L = {
    A: [ "010", "101", "111", "101", "101" ],
    B: [ "110", "101", "110", "101", "110" ],
    C: [ "011", "100", "100", "100", "011" ],
    D: [ "110", "101", "101", "101", "110" ],
    E: [ "111", "100", "110", "100", "111" ],
    F: [ "111", "100", "110", "100", "100" ],
    G: [ "011", "100", "101", "101", "011" ],
    H: [ "101", "101", "111", "101", "101" ],
    I: [ "111", "010", "010", "010", "111" ],
    J: [ "001", "001", "001", "101", "010" ],
    K: [ "101", "101", "110", "101", "101" ],
    L: [ "100", "100", "100", "100", "111" ],
    M: [ "101", "111", "111", "101", "101" ],
    N: [ "110", "101", "101", "101", "101" ],
    O: [ "010", "101", "101", "101", "010" ],
    P: [ "110", "101", "110", "100", "100" ],
    Q: [ "010", "101", "101", "110", "011" ],
    R: [ "110", "101", "110", "101", "101" ],
    S: [ "011", "100", "010", "001", "110" ],
    T: [ "111", "010", "010", "010", "010" ],
    U: [ "101", "101", "101", "101", "111" ],
    V: [ "101", "101", "101", "101", "010" ],
    W: [ "101", "101", "111", "111", "101" ],
    X: [ "101", "101", "010", "101", "101" ],
    Y: [ "101", "101", "010", "010", "010" ],
    Z: [ "111", "001", "010", "100", "111" ],
    "!": [ "010", "010", "010", "000", "010" ],
    "?": [ "110", "001", "010", "000", "010" ],
    ".": [ "000", "000", "000", "000", "010" ],
    ",": [ "000", "000", "000", "010", "100" ],
    "'": [ "010", "010", "000", "000", "000" ],
    "-": [ "000", "000", "111", "000", "000" ],
    "♥": [ "000", "101", "111", "111", "010" ],
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

export function texto(px, s, x0, y0, c) {
    [ ...s.toUpperCase() ].forEach(((ch, i) => {
        const g = L[ch];
        if (!g) return;
        g.forEach(((fila, y) => {
            for (let x = 0; x < 3; x++) if (fila[x] === "1") px(x0 + i * 4 + x, y0 + y, c);
        }));
    }));
}

const ciclo = (t, n) => (t % n + n) % n;

const onda = (t, per, amp) => Math.round(Math.sin(t / per * Math.PI * 2) * amp);

function dumplings(px, rect, t) {
    rect(0, 0, W - 1, H - 1, "rgb(255,226,190)");
    rect(0, 20, W - 1, H - 1, "rgb(196,140,96)");
    for (let x = 0; x < W; x += 5) px(x, 20, "rgb(214,162,116)");
    [ 4, 15, 26 ].forEach(((x, k) => {
        const fase = ciclo(t - k * 2, 8);
        const alto = fase < 4 ? [ 0, 3, 4, 3 ][fase] : 0;
        const y = 15 - alto;
        rect(x + 1 + (alto > 2 ? 1 : 0), 20, x + 6 - (alto > 2 ? 1 : 0), 20, "rgb(170,116,78)");
        rect(x + 2, y, x + 5, y, "rgb(232,222,200)");
        rect(x + 1, y + 1, x + 6, y + 1, "rgb(246,240,226)");
        rect(x, y + 2, x + 7, y + 3, "rgb(252,248,238)");
        rect(x + 1, y + 4, x + 6, y + 4, "rgb(236,228,212)");
        px(x + 2, y, "rgb(204,190,164)");
        px(x + 4, y, "rgb(204,190,164)");
        px(x + 2, y + 2, "rgb(40,30,30)");
        px(x + 5, y + 2, "rgb(40,30,30)");
        px(x + 3, y + 3, "rgb(230,120,120)");
        px(x + 4, y + 3, "rgb(230,120,120)");
        px(x + 1, y + 3, "rgb(246,190,190)");
        px(x + 6, y + 3, "rgb(246,190,190)");
    }));
}

function bubbleTea(px, rect, t) {
    rect(0, 0, W - 1, H - 1, "rgb(246,200,214)");
    for (let y = 2; y < H; y += 6) for (let x = y % 12 ? 3 : 0; x < W; x += 6) px(x, y, "rgb(252,224,232)");
    for (let y = 5; y <= 21; y++) {
        const m = Math.floor((y - 5) / 8);
        rect(12 + m, y, 25 - m, y, y < 7 ? "rgb(240,236,232)" : "rgb(214,170,120)");
    }
    rect(11, 4, 26, 4, "rgb(250,250,250)");
    rect(20, 0, 21, 18, "rgb(236,90,110)");
    const yp = 18 - ciclo(t, 20);
    if (yp >= 0) rect(20, yp, 21, yp, "rgb(50,30,30)");
    [ [ 14, 20 ], [ 16, 19 ], [ 18, 20 ], [ 22, 19 ], [ 23, 20 ], [ 15, 18 ], [ 24, 18 ], [ 19, 18 ] ].forEach((([x, y], k) => px(x + (ciclo(t + k, 6) === 0 ? 1 : 0), y, "rgb(50,30,30)")));
    px(16, 11, "rgb(70,40,30)");
    px(23, 11, "rgb(70,40,30)");
    rect(19, 13, 20, 13, "rgb(200,90,90)");
    px(15, 12, "rgb(236,140,140)");
    px(24, 12, "rgb(236,140,140)");
}

function cafecito(px, rect, t) {
    rect(0, 0, W - 1, H - 1, "rgb(240,220,190)");
    rect(0, 19, W - 1, H - 1, "rgb(150,100,60)");
    rect(0, 19, W - 1, 19, "rgb(176,124,80)");
    rect(12, 11, 25, 18, "rgb(250,250,246)");
    rect(13, 19, 24, 19, "rgb(220,214,206)");
    rect(26, 12, 28, 16, "rgb(250,250,246)");
    rect(27, 13, 27, 15, "rgb(240,220,190)");
    rect(13, 11, 24, 12, "rgb(90,52,30)");
    px(16, 15, "rgb(60,40,30)");
    px(21, 15, "rgb(60,40,30)");
    rect(18, 16, 19, 16, "rgb(220,120,110)");
    const f = ciclo(t, 16);
    if (f < 9) {
        const y = f;
        rect(18, y, 19, y + 2, "rgb(110,66,36)");
        px(18, y + 1, "rgb(70,40,22)");
    } else if (f < 12) {
        px(16, 9, "rgb(120,72,40)");
        px(21, 9, "rgb(120,72,40)");
        px(15, 8, "rgb(120,72,40)");
        px(22, 8, "rgb(120,72,40)");
    }
    [ 15, 22 ].forEach(((bx, k) => {
        const y = 9 - ciclo(t + k * 3, 8);
        if (y < 0 || f < 9) return;
        for (const [dx, dy] of [ [ 0, 0 ], [ 1, 0 ], [ 0, -1 ] ]) px(bx + dx + (ciclo(t + k, 4) < 2 ? 1 : 0), y + dy, "rgb(214,204,196)");
    }));
}

function puenteLluvia(px, rect, t) {
    rect(0, 0, W - 1, H - 1, "rgb(132,142,160)");
    rect(0, 16, W - 1, H - 1, "rgb(84,104,124)");
    for (let x = 0; x < W; x++) {
        const h = 3 + Math.round(2 * Math.sin(x / 5) + Math.sin(x / 2.3));
        rect(x, 14 - h, x, 15, "rgb(112,124,142)");
    }
    const cubierta = x => 13 - Math.round(4 * Math.sin(Math.PI * (x - 3) / 31));
    for (let x = 3; x <= 34; x++) {
        const y = cubierta(x);
        rect(x, y, x, y, "rgb(206,204,198)");
        rect(x, y + 1, x, 16, "rgb(164,162,158)");
    }
    for (let x = 12; x <= 25; x++) {
        const d = (x - 18.5) / 7;
        const top = 16 - Math.round(Math.sqrt(Math.max(0, 1 - d * d)) * 4);
        rect(x, top, x, 16, "rgb(70,88,108)");
    }
    for (let x = 12; x <= 25; x += 2) px(x, 18, "rgb(110,128,148)");
    const x = ciclo(t, 46) - 4;
    const y = cubierta(Math.min(34, Math.max(3, x + 2))) - 6;
    rect(x, y + 1, x + 5, y + 2, "rgb(214,50,60)");
    rect(x + 1, y, x + 4, y, "rgb(214,50,60)");
    px(x + 2, y + 3, "rgb(60,50,50)");
    px(x + 3, y + 3, "rgb(60,50,50)");
    rect(x + 2, y + 4, x + 3, y + 5, "rgb(240,226,206)");
    for (let k = 0; k < 14; k++) {
        const rx = (k * 11 + t * 2) % W;
        const ry = (k * 7 + t * 3) % H;
        px(rx, ry, "rgb(190,206,226)");
        px(rx - 1, ry - 1, "rgb(160,176,200)");
    }
    const r = ciclo(t, 6);
    if (r < 3) {
        px(31 - r, 20, "rgb(150,170,190)");
        px(31 + r, 20, "rgb(150,170,190)");
    }
}

function longjing(px, rect, t) {
    rect(0, 0, W - 1, H - 1, "rgb(200,228,236)");
    rect(30, 2, 33, 5, "rgb(255,236,170)");
    const filas = [ [ 8, "rgb(120,176,100)", "rgb(98,150,84)" ], [ 13, "rgb(96,160,86)", "rgb(76,132,70)" ], [ 18, "rgb(76,142,72)", "rgb(58,116,58)" ] ];
    filas.forEach((([y0, c, sombra], k) => {
        rect(0, y0 + 2, W - 1, H - 1, c);
        for (let x = k % 2 * 3; x < W; x += 6) {
            rect(x, y0, x + 4, y0 + 2, c);
            rect(x + 1, y0 + 2, x + 3, y0 + 2, sombra);
        }
    }));
    const f = ciclo(t, 22);
    const lx = 8 + f + onda(t, 6, 2);
    const ly = f;
    px(lx, ly, "rgb(110,190,90)");
    px(lx + 1, ly, "rgb(140,210,110)");
    px(lx + (ciclo(t, 2) ? 1 : 0), ly + 1, "rgb(90,160,70)");
    rect(4, 19, 8, 21, "rgb(196,150,90)");
    rect(4, 19, 8, 19, "rgb(226,186,120)");
}

function farolitos(px, rect, t) {
    rect(0, 0, W - 1, H - 1, "rgb(24,28,62)");
    rect(0, 17, W - 1, H - 1, "rgb(20,38,72)");
    for (let x = 0; x < W; x += 3) px(x, 17, "rgb(40,58,96)");
    [ [ 2, 4 ], [ 12, 2 ], [ 30, 6 ], [ 24, 1 ] ].forEach((([x, y], k) => ciclo(t + k, 3) && px(x, y, "rgb(220,220,240)")));
    [ 5, 14, 23, 31 ].forEach(((bx, k) => {
        const y = 20 - ciclo(t + k * 7, 28);
        const x = bx + onda(t + k * 3, 10, 1);
        if (y > 13) {
            px(x + 1, y + 4, "rgb(200,120,60)");
        }
        rect(x, y, x + 2, y + 3, "rgb(236,90,60)");
        rect(x + 1, y + 1, x + 1, y + 2, "rgb(255,210,120)");
        px(x - 1, y + 1, "rgba(255,160,80,0.5)");
        px(x + 3, y + 1, "rgba(255,160,80,0.5)");
    }));
}

function koi(px, rect, t) {
    rect(0, 0, W - 1, H - 1, "rgb(50,110,120)");
    for (let k = 0; k < 9; k++) px((k * 13 + 5) % W, (k * 7 + 3) % H, "rgb(66,128,136)");
    [ [ 3, 3 ], [ 33, 19 ], [ 34, 4 ] ].forEach((([cx, cy]) => {
        for (let y = -2; y <= 2; y++) for (let x = -3; x <= 3; x++) if (x * x / 9 + y * y / 4 <= 1 && !(x === 0 && y < 0)) px(cx + x, cy + y, "rgb(86,160,90)");
    }));
    px(33, 18, "rgb(246,170,200)");
    const pez = (x, y, der, base, mancha) => {
        const X = dx => der ? x + dx : x + 6 - dx;
        rect(Math.min(X(1), X(5)), y, Math.max(X(1), X(5)), y + 2, base);
        px(X(6), y + 1, base);
        px(X(2), y, mancha);
        px(X(3), y + 1, mancha);
        px(X(4), y + 2, mancha);
        px(X(5), y + 1, "rgb(30,30,30)");
        const cola = ciclo(t, 2);
        px(X(0), y + cola, base);
        px(X(-1), y + 2 - cola, base);
    };
    [ [ 0, "rgb(246,246,240)", "rgb(240,100,40)" ], [ Math.PI, "rgb(250,196,60)", "rgb(250,240,200)" ] ].forEach((([fase, base, mancha]) => {
        const a = t * .16 + fase;
        const x = Math.round(16 + Math.cos(a) * 11);
        const y = Math.round(10 + Math.sin(a) * 6);
        pez(x, y, -Math.sin(a) > 0, base, mancha);
    }));
}

function chiva(px, rect, t) {
    rect(0, 0, W - 1, H - 1, "rgb(130,200,240)");
    [ [ 4, 3 ], [ 26, 5 ] ].forEach((([x, y]) => {
        const cx = ciclo(x - Math.floor(t / 3), W + 10) - 6;
        rect(cx, y, cx + 6, y + 1, "rgb(250,250,250)");
        rect(cx + 2, y - 1, cx + 4, y - 1, "rgb(250,250,250)");
    }));
    const suelo = x => 17 + Math.round(2 * Math.sin((x + t) / 5));
    for (let x = 0; x < W; x++) {
        rect(x, suelo(x), x, H - 1, "rgb(86,160,80)");
        px(x, suelo(x), "rgb(110,186,96)");
    }
    const x0 = 13;
    const y0 = Math.min(suelo(x0 + 2), suelo(x0 + 8)) - 7;
    rect(x0 + 1, y0, x0 + 9, y0, "rgb(140,90,50)");
    rect(x0 + 2, y0, x0 + 3, y0, "rgb(60,120,200)");
    rect(x0 + 6, y0, x0 + 7, y0, "rgb(220,70,60)");
    rect(x0, y0 + 1, x0 + 10, y0 + 5, "rgb(250,210,60)");
    for (const wx of [ 1, 4, 7 ]) rect(x0 + wx, y0 + 2, x0 + wx + 1, y0 + 2, "rgb(60,50,50)");
    rect(x0, y0 + 4, x0 + 10, y0 + 4, "rgb(220,60,50)");
    rect(x0, y0 + 5, x0 + 10, y0 + 5, "rgb(60,110,200)");
    rect(x0 + 10, y0 + 2, x0 + 11, y0 + 3, "rgb(220,60,50)");
    const r = ciclo(t, 2);
    [ 2, 8 ].forEach((wx => {
        rect(x0 + wx, y0 + 6, x0 + wx + 1, y0 + 7, "rgb(40,40,46)");
        px(x0 + wx + r, y0 + 6, "rgb(120,120,130)");
    }));
}

function guacamaya(px, rect, t) {
    rect(0, 0, W - 1, H - 1, "rgb(150,206,236)");
    for (let x = 0; x < W; x++) rect(x, 18 + Math.round(1.5 * Math.sin(x / 2.2) + Math.sin(x / 5)), x, H - 1, x % 5 < 2 ? "rgb(54,130,70)" : "rgb(70,150,80)");
    const x = ciclo(t * 2, 56) - 14;
    const y = 7 + onda(t, 8, 2);
    const alas = ciclo(t, 2) === 0;
    rect(x - 5, y + 2, x - 1, y + 2, "rgb(214,50,50)");
    rect(x - 4, y + 3, x - 2, y + 3, "rgb(60,110,200)");
    rect(x, y + 1, x + 5, y + 3, "rgb(222,46,46)");
    rect(x + 5, y, x + 7, y + 2, "rgb(222,46,46)");
    px(x + 6, y + 1, "rgb(250,250,250)");
    px(x + 7, y + 1, "rgb(30,30,30)");
    px(x + 8, y + 2, "rgb(50,50,50)");
    if (alas) {
        rect(x + 1, y - 3, x + 3, y, "rgb(250,200,50)");
        rect(x + 1, y - 4, x + 2, y - 3, "rgb(60,110,200)");
    } else {
        rect(x + 1, y + 3, x + 3, y + 6, "rgb(250,200,50)");
        rect(x + 1, y + 6, x + 2, y + 7, "rgb(60,110,200)");
    }
}

function futbol(px, rect, t) {
    rect(0, 0, W - 1, H - 1, "rgb(70,150,70)");
    for (let x = 0; x < W; x += 8) rect(x, 0, x + 3, H - 1, "rgb(80,162,78)");
    rect(0, 0, W - 1, 0, "rgb(240,240,240)");
    rect(0, H - 1, W - 1, H - 1, "rgb(240,240,240)");
    rect(10, 0, 10, H - 1, "rgb(240,240,240)");
    rect(33, 6, 37, 6, "rgb(250,250,250)");
    rect(33, 6, 33, 17, "rgb(250,250,250)");
    rect(33, 17, 37, 17, "rgb(250,250,250)");
    for (let y = 8; y < 17; y += 2) rect(34, y, 37, y, "rgb(180,200,180)");
    const f = ciclo(t, 20);
    if (f < 13) {
        const x = 3 + f * 2.5;
        const y = 15 - Math.round(Math.sin(f / 13 * Math.PI) * 6);
        rect(Math.round(x), y, Math.round(x) + 1, y + 1, "rgb(250,250,250)");
        px(Math.round(x) + f % 2, y + f % 2, "rgb(30,30,30)");
        rect(Math.round(x), 20, Math.round(x) + 1, 20, "rgb(56,120,56)");
    } else {
        rect(34, 13, 35, 14, "rgb(250,250,250)");
        rect(6, 7, 26, 15, "rgb(250,210,60)");
        texto(px, "GOL!", 9, 9, "rgb(200,40,40)");
        for (let k = 0; k < 10; k++) px((k * 7 + f * 3) % W, (k * 5 + f * 2) % 7, [ "rgb(250,210,60)", "rgb(60,110,200)", "rgb(220,60,50)" ][k % 3]);
    }
}

function gatito(px, rect, t) {
    rect(0, 0, W - 1, H - 1, "rgb(238,224,200)");
    rect(0, 18, W - 1, H - 1, "rgb(196,150,110)");
    for (let x = 2; x < W; x += 7) rect(x, 18, x, H - 1, "rgb(176,130,94)");
    const punto = tt => [ 19 + Math.round(Math.sin(tt * .35) * 14), 19 + Math.round(Math.sin(tt * .7) * 2) ];
    const [lx, ly] = punto(t);
    const [cx] = punto(t - 4);
    const mira = lx >= cx ? 1 : -1;
    px(lx, ly, "rgb(250,40,40)");
    px(lx + 1, ly, "rgba(255,120,120,0.6)");
    const x = cx - 3;
    const y = 13 + (ciclo(t, 2) ? 0 : -1);
    rect(x, y + 1, x + 6, y + 4, "rgb(240,150,60)");
    rect(x + (mira > 0 ? 4 : -1), y - 1, x + (mira > 0 ? 7 : 2), y + 2, "rgb(240,150,60)");
    const hx = mira > 0 ? x + 4 : x - 1;
    px(hx, y - 2, "rgb(240,150,60)");
    px(hx + 3, y - 2, "rgb(240,150,60)");
    px(hx + (mira > 0 ? 2 : 1), y, "rgb(40,30,30)");
    rect(x + 1, y + 2, x + 1, y + 2, "rgb(214,120,40)");
    rect(x + 3, y + 2, x + 3, y + 2, "rgb(214,120,40)");
    const cola = mira > 0 ? x - 1 : x + 7;
    rect(cola, y - 1 + ciclo(t, 2), cola, y + 2, "rgb(240,150,60)");
    px(x + 1, y + 5, "rgb(214,120,40)");
    px(x + 5, y + 5, "rgb(214,120,40)");
}

function pato(px, rect, t) {
    rect(0, 0, W - 1, H - 1, "rgb(170,214,240)");
    rect(0, 13, W - 1, H - 1, "rgb(70,140,190)");
    for (let x = ciclo(t, 4); x < W; x += 4) px(x, 15, "rgb(110,170,214)");
    for (let x = ciclo(-t, 6); x < W; x += 6) px(x, 19, "rgb(110,170,214)");
    rect(30, 9, 33, 12, "rgb(70,150,80)");
    rect(31, 7, 32, 8, "rgb(70,150,80)");
    const f = ciclo(t, 52);
    const x = f - 6;
    const zambulle = f >= 22 && f < 28;
    if (zambulle) {
        px(x + 3, 11, "rgb(250,220,60)");
        px(x + 2, 12, "rgb(250,220,60)");
        px(x, 13, "rgb(200,230,250)");
        px(x + 5, 13, "rgb(200,230,250)");
        return;
    }
    const b = ciclo(t, 2);
    rect(x, 10 + b, x + 5, 12 + b, "rgb(250,220,60)");
    rect(x + 4, 7 + b, x + 6, 9 + b, "rgb(250,220,60)");
    px(x + 6, 8 + b, "rgb(40,30,30)");
    rect(x + 7, 9 + b, x + 8, 9 + b, "rgb(240,140,40)");
    px(x, 9 + b, "rgb(250,220,60)");
    rect(x + 1, 11 + b, x + 3, 11 + b, "rgb(236,196,40)");
}

function conejito(px, rect, t) {
    rect(0, 0, W - 1, H - 1, "rgb(200,234,190)");
    rect(0, 19, W - 1, H - 1, "rgb(110,180,90)");
    for (let x = 1; x < W; x += 3) px(x, 18, "rgb(110,180,90)");
    const f = ciclo(t, 32);
    const mordidas = Math.floor(f / 4);
    const masca = ciclo(t, 2);
    const x = 7;
    rect(x, 11, x + 8, 18, "rgb(250,250,250)");
    rect(x + 5, 8, x + 11, 14, "rgb(250,250,250)");
    rect(x + 6, 2, x + 7, 8, "rgb(250,250,250)");
    rect(x + 9, 3 + (masca ? 1 : 0), x + 10, 8, "rgb(250,250,250)");
    px(x + 6, 4, "rgb(246,180,200)");
    px(x + 9, 5, "rgb(246,180,200)");
    px(x + 9, 10, "rgb(40,30,30)");
    px(x + 11, 12 + masca, "rgb(246,150,170)");
    px(x + 7, 12, "rgb(246,190,200)");
    rect(x - 1, 14, x, 15, "rgb(250,250,250)");
    const largo = Math.max(1, 8 - mordidas);
    const cx = x + 12;
    for (let i = 0; i < largo; i++) rect(cx + i, 12 + (i > largo - 3 ? 0 : 0), cx + i, 14 - Math.floor(i / 4), "rgb(240,130,40)");
    rect(cx + largo, 11, cx + largo + 1, 12, "rgb(80,170,70)");
    px(cx + largo + 2, 10, "rgb(80,170,70)");
    if (masca && mordidas < 8) px(cx - 1, 11, "rgb(240,170,90)");
}

function pinguino(px, rect, t) {
    rect(0, 0, W - 1, H - 1, "rgb(196,224,246)");
    for (let x = 0; x < W; x++) rect(x, 10 + Math.floor(x / 4), x, H - 1, "rgb(246,250,255)");
    for (let x = 0; x < W; x += 5) px(x, 11 + Math.floor(x / 4), "rgb(210,226,240)");
    const f = ciclo(t, 30);
    const x = f * 1.6 - 6;
    const y = 7 + Math.floor((x + 3) / 4);
    const X = Math.round(x);
    rect(X, y, X + 6, y + 2, "rgb(30,34,44)");
    rect(X + 1, y + 2, X + 5, y + 3, "rgb(250,250,250)");
    px(X + 6, y, "rgb(250,250,250)");
    px(X + 5, y, "rgb(30,30,30)");
    rect(X + 7, y + 1, X + 8, y + 1, "rgb(240,150,40)");
    px(X - 1, y + 2, "rgb(240,150,40)");
    if (ciclo(t, 2)) {
        px(X - 3, y + 2, "rgb(220,236,250)");
        px(X - 5, y + 1, "rgb(220,236,250)");
    }
}

function abejita(px, rect, t) {
    rect(0, 0, W - 1, H - 1, "rgb(206,236,250)");
    rect(0, 20, W - 1, H - 1, "rgb(110,180,90)");
    const flores = [ [ 7, 13, "rgb(246,130,170)" ], [ 19, 11, "rgb(250,210,70)" ], [ 31, 14, "rgb(180,130,230)" ] ];
    flores.forEach((([x, y, c]) => {
        rect(x, y + 2, x, 19, "rgb(70,150,70)");
        px(x + 1, y + 5, "rgb(70,150,70)");
        rect(x - 1, y, x + 1, y + 2, c);
        rect(x - 2, y + 1, x + 2, y + 1, c);
        px(x, y + 1, "rgb(250,240,170)");
    }));
    const tramo = Math.floor(t / 10) % 3;
    const f = t % 10 / 10;
    const [ax, ay] = flores[tramo];
    const [bx, by] = flores[(tramo + 1) % 3];
    const x = Math.round(ax + (bx - ax) * f);
    const y = Math.round(ay - 4 + (by - ay) * f - Math.sin(f * Math.PI) * 5);
    rect(x, y, x + 2, y + 1, "rgb(250,210,40)");
    px(x + 1, y, "rgb(40,30,30)");
    px(x + 1, y + 1, "rgb(40,30,30)");
    px(x + 3, y, "rgb(40,30,30)");
    px(x + 1, y - 1 - (ciclo(t, 2) ? 0 : 1) + 1, "rgba(255,255,255,0.9)");
    px(x, y - 1, "rgba(255,255,255,0.9)");
}

function caracol(px, rect, t) {
    rect(0, 0, W - 1, H - 1, "rgb(220,236,210)");
    rect(0, 18, W - 1, H - 1, "rgb(176,150,110)");
    for (let x = 0; x < W; x += 6) rect(x, 18, x + 2, 18, "rgb(240,240,240)");
    rect(33, 8, 33, 17, "rgb(90,70,60)");
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) px(34 + x, 8 + y, (x + y) % 2 ? "rgb(30,30,30)" : "rgb(250,250,250)");
    const x = 1 + Math.min(t, 26);
    if (x >= 27) {
        for (let k = 0; k < 8; k++) px((k * 9 + t) % W, (k * 3 + t) % 8, [ "rgb(250,210,60)", "rgb(240,110,150)", "rgb(90,170,230)" ][k % 3]);
    }
    rect(x, 15, x + 6, 17, "rgb(200,214,180)");
    rect(x + 5, 13, x + 5, 15, "rgb(200,214,180)");
    rect(x + 7, 12, x + 7, 15, "rgb(200,214,180)");
    px(x + 5, 12, "rgb(40,30,30)");
    px(x + 7, 11, "rgb(40,30,30)");
    rect(x, 11, x + 4, 15, "rgb(176,110,60)");
    px(x + 2, 13, "rgb(230,180,110)");
    px(x + 3, 12, "rgb(230,180,110)");
    px(x + 1, 12, "rgb(140,80,40)");
    if (ciclo(t, 2)) {
        rect(x - 4, 13, x - 2, 13, "rgb(160,170,150)");
        rect(x - 5, 15, x - 2, 15, "rgb(160,170,150)");
    }
}

function fuegos(px, rect, t) {
    rect(0, 0, W - 1, H - 1, "rgb(16,18,40)");
    [ [ 0, 15, 5 ], [ 5, 17, 4 ], [ 9, 13, 5 ], [ 14, 16, 6 ], [ 20, 12, 4 ], [ 24, 15, 5 ], [ 29, 14, 4 ], [ 33, 16, 5 ] ].forEach((([x, y, w], k) => {
        rect(x, y, x + w - 1, H - 1, "rgb(34,36,62)");
        for (let wy = y + 2; wy < H - 1; wy += 3) for (let wx = x + 1; wx < x + w - 1; wx += 2) if ((wx + wy + k) % 3 === 0) px(wx, wy, "rgb(250,210,110)");
    }));
    const COLORES = [ "rgb(250,90,110)", "rgb(250,210,70)", "rgb(110,200,250)", "rgb(170,120,250)" ];
    [ [ 9, 5, 0 ], [ 27, 4, 9 ] ].forEach((([cx, cy, desfase], k) => {
        const f = ciclo(t - desfase, 18);
        if (f < 5) {
            px(cx, 14 - f * 2, "rgb(250,230,190)");
            px(cx, 15 - f * 2, "rgba(250,200,150,0.5)");
        } else if (f < 12) {
            const r = f - 4;
            const c = COLORES[(k + Math.floor(t / 18)) % 4];
            for (let i = 0; i < 10; i++) {
                const a = i / 10 * Math.PI * 2;
                px(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * .8 + (r > 4 ? r - 4 : 0)), r > 5 && i % 2 ? "rgba(255,255,255,0.4)" : c);
            }
        }
    }));
}

function estrellasFugaces(px, rect, t) {
    for (let y = 0; y < H; y++) rect(0, y, W - 1, y, y < 8 ? "rgb(36,22,70)" : y < 15 ? "rgb(56,32,92)" : "rgb(80,46,110)");
    [ [ 3, 3 ], [ 9, 7 ], [ 15, 2 ], [ 22, 5 ], [ 28, 9 ], [ 34, 3 ], [ 6, 12 ], [ 31, 13 ], [ 18, 10 ] ].forEach((([x, y], k) => px(x, y, ciclo(t + k, 4) ? "rgb(220,220,250)" : "rgb(140,130,190)")));
    for (let x = 0; x < W; x++) rect(x, 19 - Math.round(2 * Math.sin(x / 7)), x, H - 1, "rgb(26,20,40)");
    rect(26, 15, 30, 17, "rgb(230,120,90)");
    px(28, 14, "rgb(230,120,90)");
    px(28, 16, "rgb(250,220,150)");
    const f = ciclo(t, 14);
    if (f < 6) {
        const x = 6 + f * 4;
        const y = 2 + f * 2;
        px(x, y, "rgb(255,255,255)");
        for (let k = 1; k < 5; k++) px(x - k * 2, y - k, `rgba(255,255,255,${(.7 - k * .15).toFixed(2)})`);
    }
}

function cartaAjuste(px, rect, t) {
    const barras = [ "rgb(230,230,230)", "rgb(230,230,60)", "rgb(60,230,230)", "rgb(60,230,60)", "rgb(230,60,230)", "rgb(230,60,60)", "rgb(60,60,230)" ];
    barras.forEach(((c, i) => rect(Math.round(i * W / 7), 0, Math.round((i + 1) * W / 7) - 1, 14, c)));
    for (let i = 0; i < 6; i++) {
        const v = 20 + i * 44;
        rect(Math.round(i * W / 6), 15, Math.round((i + 1) * W / 6) - 1, H - 1, `rgb(${v},${v},${v})`);
    }
    if (ciclo(t, 4) < 3) {
        rect(0, 16, W - 1, 22, "rgb(20,20,24)");
        texto(px, "NO SIGNAL", 1, 17, "rgb(250,250,250)");
    }
}

const NOTICIAS = [ "BAOZI ATE A BAO TODAY", "BREAKING: IT IS NAP TIME", "LOCAL CAT VERY CUTE", "WEST LAKE STILL BEAUTIFUL", "DUMPLINGS SOLD OUT AGAIN", "MORE HUGS RECOMMENDED", "BUBBLE TEA PRICES: WORTH IT" ];

function noticias(px, rect, t, {vez: vez = 0} = {}) {
    rect(0, 0, W - 1, H - 1, "rgb(40,70,140)");
    for (let x = 0; x < W; x += 4) rect(x, 0, x + 1, 13, "rgb(48,80,152)");
    rect(1, 1, 18, 7, "rgb(220,40,50)");
    texto(px, "NEWS", 2, 2, "rgb(250,250,250)");
    const x = 22;
    rect(x, 6, x + 9, 13, "rgb(26,24,34)");
    [ [ x - 1, 5 ], [ x + 3, 3 ], [ x + 7, 4 ], [ x + 10, 6 ], [ x - 2, 9 ] ].forEach((([sx, sy]) => px(sx, sy, "rgb(26,24,34)")));
    px(x + 1, 3, "rgb(26,24,34)");
    px(x + 3, 9, "rgb(250,250,250)");
    px(x + 6, 9, "rgb(250,250,250)");
    if (ciclo(t, 3)) rect(x + 4, 11, x + 5, 11, "rgb(220,80,90)");
    rect(14, 13, W - 1, 17, "rgb(150,96,60)");
    rect(14, 13, W - 1, 13, "rgb(176,120,80)");
    rect(0, 18, W - 1, H - 1, "rgb(250,250,250)");
    rect(0, 18, 6, H - 1, "rgb(220,40,50)");
    const titular = NOTICIAS[vez % NOTICIAS.length];
    const ancho = titular.length * 4;
    const off = W - ciclo(t * 4, ancho + W + 8);
    texto(((xx, yy, c) => xx > 6 ? px(xx, yy, c) : null), titular, off, 18, "rgb(30,30,40)");
    texto(px, "♥", 2, 18, "rgb(250,250,250)");
}

export const CANALES = {
    dumplings: {
        dibujar: dumplings
    },
    bubbletea: {
        dibujar: bubbleTea
    },
    cafecito: {
        dibujar: cafecito
    },
    puente: {
        dibujar: puenteLluvia
    },
    longjing: {
        dibujar: longjing
    },
    farolitos: {
        dibujar: farolitos
    },
    koi: {
        dibujar: koi
    },
    chiva: {
        dibujar: chiva
    },
    guacamaya: {
        dibujar: guacamaya
    },
    futbol: {
        dibujar: futbol
    },
    gatito: {
        dibujar: gatito
    },
    pato: {
        dibujar: pato
    },
    conejito: {
        dibujar: conejito
    },
    pinguino: {
        dibujar: pinguino
    },
    abejita: {
        dibujar: abejita
    },
    caracol: {
        dibujar: caracol
    },
    fuegos: {
        dibujar: fuegos,
        cuando: "noche"
    },
    estrellas: {
        dibujar: estrellasFugaces,
        cuando: "noche"
    },
    ajuste: {
        dibujar: cartaAjuste
    },
    noticias: {
        dibujar: noticias
    }
};
