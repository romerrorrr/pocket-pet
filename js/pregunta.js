const PALETAS = {
    polvora: [ "#ffd76a", "#ff9fbf", "#ffffff", "#ffb35c", "#bfe3ff" ],
    farolitos: [ "#ffb347", "#ffc86b", "#ff9a3c" ],
    estrellas: [ "#ffffff", "#dfe9ff", "#fff3c4" ]
};

const LETRA = {
    polvora: [ "#ffd76a", "#ffd76a", "#ffe9a8", "#ffd76a", "#ffffff" ],
    farolitos: [ "#ffb347", "#ffc86b", "#ffb347" ],
    estrellas: [ "#ffffff", "#ffffff", "#dfe9ff" ]
};

const CJK = /[\u3000-\u9fff\uff00-\uffef]/;

function celdasDelTexto(texto, ancho, alto) {
    const lineas = partir(texto);
    const c = document.createElement("canvas");
    c.width = ancho;
    c.height = alto;
    const x = c.getContext("2d");
    const fuente = (l, px) => CJK.test(l) ? `700 ${px * 2}px "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif` : `${px}px "Press Start 2P", monospace`;
    const alturaDe = (l, px) => CJK.test(l) ? px * 2 : px;
    let px = 8;
    for (const prueba of [ 24, 16, 8 ]) {
        const anchos = lineas.map((l => {
            x.font = fuente(l, prueba);
            return x.measureText(l).width;
        }));
        const altoTotal = lineas.reduce(((a, l) => a + alturaDe(l, prueba) + prueba * .6), 0);
        if (Math.max(...anchos) <= ancho * .92 && altoTotal <= alto * .42) {
            px = prueba;
            break;
        }
    }
    x.textAlign = "center";
    x.textBaseline = "top";
    x.fillStyle = "#fff";
    const altoTotal = lineas.reduce(((a, l) => a + alturaDe(l, px)), 0) + (lineas.length - 1) * Math.round(px * .6);
    let y = Math.round(alto * .24 - altoTotal / 2);
    for (const l of lineas) {
        x.font = fuente(l, px);
        x.fillText(l, Math.round(ancho / 2), y);
        y += alturaDe(l, px) + Math.round(px * .6);
    }
    const d = x.getImageData(0, 0, ancho, alto).data;
    const celdas = [];
    for (let yy = 0; yy < alto; yy++) for (let xx = 0; xx < ancho; xx++) if (d[(yy * ancho + xx) * 4 + 3] > 120) celdas.push({
        x: xx,
        y: yy
    });
    return celdas;
}

function partir(texto) {
    const t = String(texto || "").trim();
    const m = t.match(/^(.{1,14}?[,，])\s*(.+)$/);
    if (m) return [ m[1], m[2] ];
    const palabras = t.split(/\s+/);
    if (t.length <= 16 || palabras.length < 3) return [ t ];
    const mitad = Math.ceil(palabras.length / 2);
    return [ palabras.slice(0, mitad).join(" "), palabras.slice(mitad).join(" ") ];
}

const azar = (a, b) => a + Math.random() * (b - a);

const suave = k => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);

export function lanzarPregunta(contenedor, texto, {estilo: estilo = "polvora", alFormar: alFormar = () => {}} = {}) {
    const lienzo = document.createElement("canvas");
    lienzo.className = "lienzo-pregunta";
    lienzo.setAttribute("aria-label", texto);
    lienzo.setAttribute("role", "img");
    contenedor.appendChild(lienzo);
    const g = lienzo.getContext("2d");
    const pal = PALETAS[estilo] || PALETAS.polvora;
    const tonos = LETRA[estilo] || LETRA.polvora;
    const t0 = performance.now();
    let formado = false;
    let vivo = true;
    let adelanto = 0;
    const chispas = [];
    const FORMA = estilo === "polvora" ? 6200 + 3300 : estilo === "farolitos" ? 600 + 3600 + 1600 + 6300 : 1800 + 6200 + 900;
    let W = 1;
    let H = 1;
    let LAGO = 1;
    let letras = [];
    let cohetes = [];
    let medido = {
        w: 0,
        h: 0
    };
    let respaldo = null;
    function armar() {
        const r = contenedor.getBoundingClientRect();
        const vw = Math.max(1, r.width);
        const vh = Math.max(1, r.height);
        medido = {
            w: Math.round(r.width),
            h: Math.round(r.height)
        };
        const celda = Math.max(2, Math.round(Math.min(vw / 210, vh / 96)));
        W = Math.ceil(vw / celda);
        H = Math.ceil(vh / celda);
        lienzo.width = W;
        lienzo.height = H;
        LAGO = Math.round(H * .7);
        const objetivos = celdasDelTexto(texto, W, H);
        letras = objetivos.map(((o, i) => ({
            ...o,
            i: i,
            color: tonos[Math.floor(Math.random() * tonos.length)],
            vuelo: pal[i % pal.length],
            fase: Math.random() * 6.28
        })));
        cohetes = [];
        prepararEstilo();
        const t = performance.now() - t0 + adelanto;
        for (const c of cohetes) if (t > c.t + c.dur) c.hecho = true;
        const pocas = letras.length < Math.max(40, texto.replace(/\s/g, "").length * 6);
        ponerRespaldo(pocas);
    }
    function ponerRespaldo(si) {
        if (si && !respaldo) {
            respaldo = document.createElement("div");
            respaldo.className = "pregunta-respaldo";
            respaldo.textContent = texto;
            respaldo.style.cssText = "position:absolute;left:4%;right:4%;top:14%;text-align:center;color:#ffd76a;font-size:clamp(22px,6vw,44px);font-weight:700;line-height:1.25;text-shadow:2px 2px 0 rgba(8,6,20,.7);pointer-events:none;z-index:2";
            contenedor.appendChild(respaldo);
        } else if (!si && respaldo) {
            respaldo.remove();
            respaldo = null;
        }
    }
    function prepararEstilo() {
        if (estilo === "polvora") {
            const cx = W / 2;
            const cy = Math.round(H * .3);
            for (const [t, fx, col] of [ [ 900, .24, 0 ], [ 1900, .76, 1 ], [ 2900, .4, 3 ], [ 3700, .62, 4 ] ]) {
                cohetes.push({
                    t: t,
                    x: W * fx,
                    y0: LAGO,
                    y1: H * azar(.12, .3),
                    dur: 1100,
                    col: pal[col],
                    grande: false,
                    hecho: false
                });
            }
            cohetes.push({
                t: 4800,
                x: cx,
                y0: LAGO,
                y1: cy,
                dur: 1400,
                col: "#ffffff",
                grande: true,
                hecho: false
            });
            for (const l of letras) {
                const ang = Math.random() * Math.PI * 2;
                const vel = azar(10, Math.max(W, H) * .42);
                l.sx = cx;
                l.sy = cy;
                l.mx = cx + Math.cos(ang) * vel;
                l.my = cy + Math.sin(ang) * vel * .8;
                l.t0 = 6200;
                l.dur = azar(2200, 3200);
            }
        } else if (estilo === "farolitos") {
            for (const l of letras) {
                l.sx = azar(W * .05, W * .95);
                l.sy = LAGO + azar(2, H - LAGO - 2);
                l.t0 = 600 + Math.random() * 3600 + l.x / W * 1600;
                l.dur = azar(4200, 6200);
                l.vaiven = azar(1.5, 4);
            }
        } else {
            const orden = [ ...letras ].sort(((a, b) => (Math.round(a.y / 14) - Math.round(b.y / 14)) * 1e4 + (a.x - b.x)));
            orden.forEach(((l, k) => {
                l.t0 = 1800 + k / orden.length * 6200 + Math.random() * 300;
                l.dur = 500;
            }));
        }
    }
    armar();
    let observador = null;
    try {
        if (window.ResizeObserver) {
            observador = new ResizeObserver((() => {
                if (!vivo) return;
                const r = contenedor.getBoundingClientRect();
                if (Math.abs(Math.round(r.width) - medido.w) > 2 || Math.abs(Math.round(r.height) - medido.h) > 2) armar();
            }));
            observador.observe(contenedor);
        }
    } catch (e) {
        observador = null;
    }
    function estallido(x, y, col, n = 46) {
        for (let k = 0; k < n; k++) {
            const a = k / n * Math.PI * 2 + Math.random() * .2;
            const v = azar(6, 16);
            chispas.push({
                x: x,
                y: y,
                vx: Math.cos(a) * v,
                vy: Math.sin(a) * v * .85,
                vida: azar(900, 1500),
                t: 0,
                col: k % 4 === 0 ? "#ffffff" : col
            });
        }
    }
    let ultimo = performance.now();
    let ultimoAdorno = 0;
    function cuadro(ahora) {
        if (!vivo) return;
        const dt = Math.min(60, ahora - ultimo);
        ultimo = ahora;
        const t = ahora - t0 + adelanto;
        g.clearRect(0, 0, W, H);
        for (const c of cohetes) {
            const k = (t - c.t) / c.dur;
            if (k < 0) continue;
            if (k < 1 && !c.hecho) {
                const y = c.y0 + (c.y1 - c.y0) * (1 - (1 - k) * (1 - k));
                const x = c.x + Math.sin(k * 9) * .6;
                g.fillStyle = c.col;
                g.fillRect(Math.round(x), Math.round(y), 1, 2);
                if (Math.random() < .8) chispas.push({
                    x: x,
                    y: y + 2,
                    vx: azar(-1, 1),
                    vy: azar(2, 5),
                    vida: 420,
                    t: 0,
                    col: "#ffb35c"
                });
            } else if (!c.hecho) {
                c.hecho = true;
                if (!c.grande) estallido(c.x, c.y1, c.col); else estallido(c.x, c.y1, "#fff1b8", 24);
            }
        }
        for (let k = chispas.length - 1; k >= 0; k--) {
            const p = chispas[k];
            p.t += dt;
            if (p.t > p.vida) {
                chispas.splice(k, 1);
                continue;
            }
            p.x += p.vx * dt / 1e3;
            p.y += p.vy * dt / 1e3;
            p.vy += 9 * dt / 1e3;
            const vida = 1 - p.t / p.vida;
            if (vida < .35 && Math.random() > vida * 2.5) continue;
            g.fillStyle = p.col;
            g.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
        }
        let listas = 0;
        for (const l of letras) {
            const k = (t - l.t0) / l.dur;
            if (k < 0) continue;
            let x;
            let y;
            let a = 1;
            if (estilo === "polvora") {
                if (k < .28) {
                    const kk = 1 - Math.pow(1 - k / .28, 3);
                    x = l.sx + (l.mx - l.sx) * kk;
                    y = l.sy + (l.my - l.sy) * kk;
                } else {
                    const kk = suave((k - .28) / .72);
                    x = l.mx + (l.x - l.mx) * kk;
                    y = l.my + (l.y - l.my) * kk;
                }
            } else if (estilo === "farolitos") {
                const kk = suave(Math.min(1, k));
                x = l.sx + (l.x - l.sx) * kk + Math.sin(t / 700 + l.fase) * l.vaiven * (1 - kk);
                y = l.sy + (l.y - l.sy) * kk;
            } else {
                x = l.x;
                y = l.y;
                a = Math.min(1, k);
            }
            if (k >= 1) listas++;
            const brillo = k >= 1 ? Math.sin(t / 320 + l.fase) > .93 ? .55 : 1 : 1;
            g.globalAlpha = a * brillo;
            if (k >= 1) {
                g.fillStyle = "rgba(8,6,20,0.55)";
                g.fillRect(Math.round(x) + 1, Math.round(y) + 1, 1, 1);
            }
            if (estilo === "farolitos" && k < 1) {
                g.fillStyle = "rgba(255,170,80,0.3)";
                g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
                g.fillStyle = l.color;
            } else if (estilo === "estrellas" && k >= 1 && Math.sin(t / 400 + l.fase * 3) > .985) {
                g.fillStyle = "rgba(255,255,255,0.7)";
                g.fillRect(Math.round(x) - 1, Math.round(y), 3, 1);
                g.fillRect(Math.round(x), Math.round(y) - 1, 1, 3);
                g.fillStyle = l.color;
            } else {
                g.fillStyle = estilo === "polvora" && k < .75 ? l.vuelo : l.color;
            }
            g.fillRect(Math.round(x), Math.round(y), 1, 1);
            g.globalAlpha = 1;
        }
        if (estilo === "estrellas" && t > FORMA - 200 && t < FORMA + 1500) {
            const k = (t - FORMA + 200) / 1700;
            const x = W * (.95 - k * .8);
            const y = H * (.06 + k * .18);
            for (let s = 0; s < 10; s++) {
                g.globalAlpha = 1 - s / 10;
                g.fillStyle = "#ffffff";
                g.fillRect(Math.round(x + s * 1.6), Math.round(y - s * .36), 1, 1);
            }
            g.globalAlpha = 1;
        }
        if (estilo === "polvora" && t > FORMA && ahora - ultimoAdorno > 1700) {
            ultimoAdorno = ahora;
            const lado = Math.random() < .5 ? azar(.06, .2) : azar(.8, .94);
            estallido(W * lado, H * azar(.1, .32), pal[Math.floor(Math.random() * pal.length)], 30);
        }
        if (!formado && t > 1e3 && (respaldo ? t >= FORMA : listas === letras.length)) {
            formado = true;
            alFormar();
        }
        requestAnimationFrame(cuadro);
    }
    requestAnimationFrame(cuadro);
    return {
        completar() {
            const t = performance.now() - t0 + adelanto;
            if (t < FORMA) adelanto += FORMA - t;
        },
        destruir() {
            vivo = false;
            if (observador) observador.disconnect();
            lienzo.remove();
            ponerRespaldo(false);
        },
        duracion: FORMA
    };
}
