import { arte } from "./arte.js";

import { ESCENA } from "./escena_datos.js";

import { CUARTO } from "./escena_cuarto_datos.js";

function cargar(rel) {
    const img = new Image;
    img.decoding = "async";
    img.src = arte(rel);
    return img;
}

const listo = img => !!img && (img instanceof HTMLCanvasElement || img.complete && img.naturalWidth > 0);

const anchoDe = im => im.naturalWidth || im.width;

const altoDe = im => im.naturalHeight || im.height;

const BAYER8 = (() => {
    const b4 = [ [ 0, 8, 2, 10 ], [ 12, 4, 14, 6 ], [ 3, 11, 1, 9 ], [ 15, 7, 13, 5 ] ];
    const m = [];
    for (let y = 0; y < 8; y++) {
        m.push([]);
        for (let x = 0; x < 8; x++) m[y].push((4 * b4[y % 4][x % 4] + [ 0, 2, 3, 1 ][(y >> 2) * 2 + (x >> 2)]) / 64);
    }
    return m;
})();

function claveBote(formas) {
    if (formas.ella && formas.el) return "";
    if (formas.ella) return "_ella";
    return "_mascotas";
}

const suave = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const frena = t => 1 - Math.pow(1 - t, 3);

function medidas(cuarto) {
    if (cuarto) return {
        MW: CUARTO.mundo[0],
        MH: CUARTO.mundo[1],
        BX: CUARTO.bote.en[0],
        BY: CUARTO.bote.en[1],
        cuarto: true
    };
    return {
        MW: ESCENA.mundo[0],
        MH: ESCENA.mundo[1],
        BX: ESCENA.bote.en[0],
        BY: ESCENA.bote.en[1],
        cuarto: false
    };
}

function plano(nombre, vw, vh, D) {
    const vertical = vh > vw;
    const cara = q => [ D.BX + ESCENA.cara[q][0], D.BY + ESCENA.cara[q][1] ];
    const [ex, ey] = cara("el");
    const [ax_, ay_] = cara("ella");
    const medio = (ex + ax_) / 2;
    if (D.cuarto) {
        switch (nombre) {
          case "ventanal":
            return vertical ? {
                x: 300,
                y: 60,
                w: 100,
                h: 200,
                ax: .5,
                ay: .5
            } : {
                x: 270,
                y: 44,
                w: 164,
                h: 76,
                ax: .5,
                ay: .5
            };

          case "general":
            return vertical ? {
                x: medio,
                y: 124,
                w: 170,
                h: 250,
                ax: .5,
                ay: .5
            } : {
                x: D.MW / 2,
                y: 132,
                w: D.MW,
                h: 163,
                ax: .5,
                ay: .5
            };

          case "pregunta":
            return vertical ? {
                x: medio,
                y: 112,
                w: 170,
                h: 250,
                ax: .5,
                ay: .5
            } : {
                x: D.MW / 2,
                y: 118,
                w: D.MW,
                h: 163,
                ax: .5,
                ay: .5
            };

          case "pareja":
            return vertical ? {
                x: medio,
                y: ey + 6,
                w: 150,
                h: 300,
                ax: .5,
                ay: .55
            } : {
                x: medio + 2,
                y: ey + 10,
                w: 232,
                h: 107,
                ax: .5,
                ay: .5
            };

          case "dialogo":
            return vertical ? {
                x: medio,
                y: ey + 6,
                w: 140,
                h: 280,
                ax: .5,
                ay: .45
            } : {
                x: medio + 3,
                y: ey + 8,
                w: 206,
                h: 95,
                ax: .5,
                ay: .4
            };

          case "dialogo-cerca":
            return vertical ? {
                x: medio,
                y: ey + 5,
                w: 124,
                h: 250,
                ax: .5,
                ay: .45
            } : {
                x: medio + 3,
                y: ey + 6,
                w: 178,
                h: 82,
                ax: .5,
                ay: .4
            };

          default:
            break;
        }
    }
    switch (nombre) {
      case "general":
        return vertical ? {
            x: medio + 20,
            y: ey - 10,
            w: 170,
            h: 380,
            ax: .5,
            ay: .55
        } : {
            x: 256,
            y: 200,
            w: 440,
            h: 232,
            ax: .5,
            ay: .5
        };

      case "pareja":
        return vertical ? {
            x: medio,
            y: ey,
            w: 150,
            h: 300,
            ax: .5,
            ay: .55
        } : {
            x: medio + 30,
            y: ey + 4,
            w: 250,
            h: 128,
            ax: .5,
            ay: .5
        };

      case "ella":
        return vertical ? {
            x: ax_,
            y: ay_,
            w: 100,
            h: 200,
            ax: .5,
            ay: .46
        } : {
            x: ax_,
            y: ay_ + 1,
            w: 112,
            h: 62,
            ax: .5,
            ay: .5
        };

      case "el":
        return vertical ? {
            x: ex,
            y: ey - 6,
            w: 104,
            h: 210,
            ax: .5,
            ay: .46
        } : {
            x: ex,
            y: ey - 7,
            w: 120,
            h: 74,
            ax: .5,
            ay: .5
        };

      case "dialogo":
        return vertical ? {
            x: ex + 6,
            y: ey + 4,
            w: 128,
            h: 260,
            ax: .5,
            ay: .5
        } : {
            x: ex,
            y: ey + 4,
            w: 200,
            h: 104,
            ax: .36,
            ay: .4
        };

      case "dialogo-cerca":
        return vertical ? {
            x: ex + 4,
            y: ey + 4,
            w: 112,
            h: 230,
            ax: .5,
            ay: .5
        } : {
            x: ex,
            y: ey + 3,
            w: 176,
            h: 92,
            ax: .36,
            ay: .4
        };

      default:
        return plano("general", vw, vh, D);
    }
}

function resolver(p, vw, vh, D) {
    const cubrir = Math.max(vw / D.MW, vh / D.MH);
    const s = Math.max(cubrir, Math.min(vw / p.w, vh / p.h));
    return {
        x: p.x,
        y: p.y,
        s: s,
        ax: p.ax,
        ay: p.ay
    };
}

function aPantalla(cam, vw, vh, D) {
    let tx = cam.ax * vw - cam.x * cam.s;
    let ty = cam.ay * vh - cam.y * cam.s;
    tx = Math.min(0, Math.max(vw - D.MW * cam.s, tx));
    ty = Math.min(0, Math.max(vh - D.MH * cam.s, ty));
    return {
        tx: tx,
        ty: ty,
        s: cam.s
    };
}

function tenido(im, rgb) {
    if (!rgb || rgb[0] >= 255 && rgb[1] >= 255 && rgb[2] >= 255) return im;
    const c = document.createElement("canvas");
    c.width = 0;
    const hacer = () => {
        c.width = anchoDe(im);
        c.height = altoDe(im);
        const x = c.getContext("2d");
        x.drawImage(im, 0, 0);
        x.globalCompositeOperation = "multiply";
        x.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
        x.fillRect(0, 0, c.width, c.height);
        x.globalCompositeOperation = "destination-in";
        x.drawImage(im, 0, 0);
        c.listo = true;
    };
    if (listo(im)) hacer(); else im.addEventListener("load", hacer, {
        once: true
    });
    return c;
}

const azar = (a, b) => a + Math.random() * (b - a);

export function crearEscena(contenedor, opciones = {}) {
    const canvas = document.createElement("canvas");
    canvas.className = "lienzo-escena";
    contenedor.appendChild(canvas);
    const g = canvas.getContext("2d");
    const cuarto = opciones.escenario === "cuarto";
    const momento = opciones.momento === "noche" ? "noche" : "atardecer";
    const noche = momento === "noche";
    const D = medidas(cuarto);
    const {MW: MW, MH: MH, BX: BX, BY: BY} = D;
    const datosMomento = cuarto ? CUARTO.momentos[momento] : null;
    const tinte = datosMomento ? datosMomento.tinte : null;
    const img = cuarto ? {
        afuera: cargar(`final/cuarto/afuera_${momento}.png`),
        cuarto: cargar(`final/cuarto/cuarto_${momento}.png`),
        bote: cargar(`final/cuarto/pareja_${momento}.png`)
    } : {
        lago: cargar("final/lago.png"),
        bote: cargar("final/bote.png"),
        reflejo: cargar("final/bote_reflejo.png")
    };
    img.ojosEl = tenido(cargar("final/ojos_el.png"), tinte);
    img.ojosElla = tenido(cargar(`final/ojos_ella_${opciones.ojosElla === "cafe" ? "cafe" : "rosa"}.png`), tinte);
    img.boca = tenido(cargar("final/boca_hablando.png"), tinte);
    for (const k of [ "_ella", "_mascotas" ]) {
        img["bote" + k] = cargar(cuarto ? `final/cuarto/pareja${k}_${momento}.png` : `final/bote${k}.png`);
        if (!cuarto) img["reflejo" + k] = cargar(`final/bote_reflejo${k}.png`);
    }
    const lista = im => im instanceof HTMLCanvasElement ? im.listo !== false && im.width > 0 : listo(im);
    let vw = 1;
    let vh = 1;
    let dpr = 1;
    let vivo = true;
    let nombrePlano = opciones.plano || "general";
    let cam = null;
    let viaje = null;
    const bote = {
        x: opciones.boteAfuera && !cuarto ? MW + 20 : BX,
        desde: BX,
        t0: 0,
        ms: 0
    };
    const hablando = {
        el: false,
        ella: false
    };
    const formas = {
        ella: true,
        el: true,
        ...opciones.formas || {}
    };
    let transformacion = null;
    const [BW, BH] = ESCENA.bote.tam;
    const fundido = document.createElement("canvas");
    fundido.width = BW;
    fundido.height = BH;
    const fg = fundido.getContext("2d");
    const viejo = document.createElement("canvas");
    viejo.width = BW;
    viejo.height = BH;
    const vg = viejo.getContext("2d");
    const mascara = document.createElement("canvas");
    mascara.width = BW;
    mascara.height = BH;
    const mg = mascara.getContext("2d");
    const mImg = mg.createImageData(BW, BH);
    const parpadeo = {
        el: {
            t: 0,
            prox: 1800
        },
        ella: {
            t: 0,
            prox: 2600
        }
    };
    const destellos = [];
    if (!cuarto) {
        const [sx] = ESCENA.sol;
        for (let k = 0; k < 70; k++) {
            const prof = Math.random();
            const y = ESCENA.horizonte + 3 + Math.round(prof * (MH - ESCENA.horizonte - 8));
            const ancho = 12 + prof * 50;
            destellos.push({
                x: Math.round(sx + (Math.random() * 2 - 1) * ancho),
                y: y,
                largo: 1 + Math.floor(Math.random() * 4),
                fase: Math.random() * 6.28,
                vel: 1.5 + Math.random() * 2.5
            });
        }
    }
    const [VX0, VY0, VX1, VY1] = cuarto ? CUARTO.ventana : [ 0, 0, 0, 0 ];
    const estrellas = cuarto && noche ? datosMomento.cielo.map((([x, y]) => ({
        x: x,
        y: y,
        fase: Math.random() * 6.28,
        vel: .5 + Math.random() * 1.5,
        cruz: Math.random() < .12
    }))) : [];
    const luciernagas = [];
    if (cuarto && noche) {
        for (let k = 0; k < 16; k++) luciernagas.push({
            x: azar(VX0, VX1),
            y: azar(70, VY1 - 4),
            fase: Math.random() * 6.28,
            amp: azar(3, 8),
            vx: azar(-1.6, 1.6),
            vy: azar(-.8, .8),
            vel: azar(.7, 1.4)
        });
    }
    const hojas = [];
    const polvo = [];
    if (cuarto && !noche) {
        for (let k = 0; k < 34; k++) polvo.push({
            x: azar(70, MW - 10),
            y: azar(24, 214),
            fase: Math.random() * 6.28,
            vel: azar(.25, .7),
            amp: azar(2, 6),
            delante: k % 3 === 0
        });
    }
    let proximaHoja = 0;
    function medir() {
        const r = contenedor.getBoundingClientRect();
        vw = Math.max(1, r.width);
        vh = Math.max(1, r.height);
        dpr = Math.min(3, window.devicePixelRatio || 1);
        canvas.width = Math.round(vw * dpr);
        canvas.height = Math.round(vh * dpr);
        canvas.style.width = `${vw}px`;
        canvas.style.height = `${vh}px`;
        const destino = resolver(plano(nombrePlano, vw, vh, D), vw, vh, D);
        if (viaje) viaje.hasta = destino; else cam = destino;
    }
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(medir) : null;
    if (ro) ro.observe(contenedor); else window.addEventListener("resize", medir);
    medir();
    function camaraAhora(ahora) {
        if (!viaje) return cam;
        const t = Math.max(0, Math.min(1, (ahora - viaje.t0) / viaje.ms));
        const e = viaje.curva(t);
        const a = viaje.desde;
        const b = viaje.hasta;
        const s = Math.exp(Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * e);
        cam = {
            x: a.x + (b.x - a.x) * e,
            y: a.y + (b.y - a.y) * e,
            s: s,
            ax: a.ax + (b.ax - a.ax) * e,
            ay: a.ay + (b.ay - a.ay) * e
        };
        if (t >= 1) {
            const fn = viaje.fn;
            cam = viaje.hasta;
            viaje = null;
            if (fn) fn();
        }
        return cam;
    }
    function dibujarSprite(im, wx, wy, T, recorteAlto = 1) {
        if (!lista(im)) return;
        const x = Math.round((T.tx + wx * T.s) * dpr);
        const w = Math.round((T.tx + (wx + anchoDe(im)) * T.s) * dpr) - x;
        const hTotal = altoDe(im) * T.s * dpr;
        const h = Math.max(1, Math.round(hTotal * recorteAlto));
        const yCentro = (T.ty + (wy + altoDe(im) / 2) * T.s) * dpr;
        g.drawImage(im, x, Math.round(yCentro - h / 2), w, h);
    }
    function pixel(T, wx, wy, w = 1, h = 1) {
        const x = Math.round((T.tx + Math.round(wx) * T.s) * dpr);
        const y = Math.round((T.ty + Math.round(wy) * T.s) * dpr);
        g.fillRect(x, y, Math.round((T.tx + (Math.round(wx) + w) * T.s) * dpr) - x, Math.round((T.ty + (Math.round(wy) + h) * T.s) * dpr) - y);
    }
    const PASOS_PARPADEO = [ 1, .45, .1, .45, 1 ];
    const MS_PASO = 55;
    function altoDeOjos(q, ahora) {
        const p = parpadeo[q];
        if (!p.t) p.t = ahora + p.prox;
        const k = Math.floor((ahora - p.t) / MS_PASO);
        if (k < 0) return 1;
        if (k < PASOS_PARPADEO.length) return PASOS_PARPADEO[k];
        p.t = ahora + (Math.random() < .18 ? 180 : 2400 + Math.random() * 3100);
        return 1;
    }
    function corrimientoAfuera(c) {
        const M = CUARTO.margen;
        const ox = Math.max(-M, Math.min(M, (c.x - MW / 2) * .12));
        const oy = Math.max(-M, Math.min(M, (c.y - MH / 2) * .12));
        return {
            x: -M + ox,
            y: -M + oy
        };
    }
    function dibujarAfuera(T, c, ahora, dt) {
        const o = corrimientoAfuera(c);
        if (listo(img.afuera)) {
            const x0 = Math.round((T.tx + o.x * T.s) * dpr);
            const y0 = Math.round((T.ty + o.y * T.s) * dpr);
            g.drawImage(img.afuera, x0, y0, Math.round((T.tx + (o.x + anchoDe(img.afuera)) * T.s) * dpr) - x0, Math.round((T.ty + (o.y + altoDe(img.afuera)) * T.s) * dpr) - y0);
        }
        const seg = ahora / 1e3;
        const [cx, cy, cw, ch] = datosMomento.cabana;
        const late = .5 + .5 * Math.sin(seg * 1.7) * Math.sin(seg * .53 + 1);
        g.fillStyle = `rgba(255, 236, 190, ${(noche ? .1 : .06) * late})`;
        pixel(T, cx + o.x + CUARTO.margen, cy + o.y + CUARTO.margen, cw, ch);
        if (noche) {
            for (const e of estrellas) {
                const v = Math.sin(seg * e.vel + e.fase);
                if (v < -.1) continue;
                g.fillStyle = v > .65 ? "rgb(255, 250, 230)" : "rgb(170, 180, 214)";
                const ex = e.x + o.x;
                const ey = e.y + o.y;
                pixel(T, ex, ey);
                if (e.cruz && v > .9) {
                    pixel(T, ex - 1, ey, 3, 1);
                    pixel(T, ex, ey - 1, 1, 3);
                }
            }
            for (const l of luciernagas) {
                l.x += l.vx * dt / 1e3;
                l.y += l.vy * dt / 1e3;
                if (l.x < VX0 - 6) l.x = VX1 + 4;
                if (l.x > VX1 + 6) l.x = VX0 - 4;
                if (l.y < 60 || l.y > VY1 - 2) l.vy = -l.vy;
                const luz = Math.sin(seg * 2.2 * l.vel + l.fase);
                if (luz < 0) continue;
                const lx = l.x + Math.sin(seg * .9 + l.fase) * l.amp + o.x * .5;
                const ly = l.y + Math.cos(seg * .7 + l.fase) * l.amp * .5;
                g.fillStyle = `rgba(200, 255, 120, ${.28 * luz})`;
                pixel(T, lx - 1, ly - 1, 3, 3);
                g.fillStyle = `rgba(236, 255, 160, ${.4 + .6 * luz})`;
                pixel(T, lx, ly);
            }
        } else {
            if (ahora > proximaHoja && hojas.length < 4) {
                proximaHoja = ahora + azar(1800, 4200);
                hojas.push({
                    x: azar(VX0 + 10, VX1 - 10),
                    y: VY0 - 2,
                    vy: azar(5, 9),
                    fase: Math.random() * 6.28,
                    amp: azar(4, 10),
                    color: Math.random() < .5 ? "rgb(214, 186, 92)" : "rgb(150, 156, 66)"
                });
            }
            for (let k = hojas.length - 1; k >= 0; k--) {
                const h = hojas[k];
                h.y += h.vy * dt / 1e3;
                if (h.y > VY1 + 4) {
                    hojas.splice(k, 1);
                    continue;
                }
                const hx = h.x + Math.sin(seg * 1.3 + h.fase) * h.amp + o.x * .6;
                const giro = Math.floor(seg * 4 + h.fase) % 2;
                g.fillStyle = h.color;
                pixel(T, hx, h.y, giro ? 2 : 1, giro ? 1 : 2);
            }
        }
    }
    function dibujarLuzAdentro(T, ahora, delante) {
        const seg = ahora / 1e3;
        if (noche) {
            if (delante) return;
            const [lx, ly] = CUARTO.lampara;
            const r = (16 + Math.sin(seg * .7) * 1.5) * T.s * dpr;
            const cxl = (T.tx + (lx + .5) * T.s) * dpr;
            const cyl = (T.ty + ly * T.s) * dpr;
            const halo = g.createRadialGradient(cxl, cyl, r * .25, cxl, cyl, r * 3);
            halo.addColorStop(0, "rgba(255, 214, 150, 0.32)");
            halo.addColorStop(.4, "rgba(255, 196, 130, 0.1)");
            halo.addColorStop(1, "rgba(255, 196, 130, 0)");
            g.fillStyle = halo;
            g.fillRect(cxl - r * 3, cyl - r * 3, r * 6, r * 6);
            return;
        }
        if (!delante) {
            const rayos = [ [ [ 330, 8 ], [ 352, 8 ], [ 214, 260 ], [ 150, 260 ], .11 ], [ [ 262, 22 ], [ 282, 22 ], [ 120, 260 ], [ 84, 260 ], .08 ], [ [ 182, 22 ], [ 194, 22 ], [ 40, 260 ], [ 18, 260 ], .06 ] ];
            for (const [a, b, c, d, f] of rayos) {
                const fuerza = f * (.75 + .25 * Math.sin(seg * .4 + a[0]));
                const P = p => [ (T.tx + p[0] * T.s) * dpr, (T.ty + p[1] * T.s) * dpr ];
                const [ax, ay] = P(a);
                const [cx2, cy2] = P(c);
                const grad = g.createLinearGradient(ax, ay, cx2, cy2);
                grad.addColorStop(0, `rgba(255, 226, 168, ${fuerza})`);
                grad.addColorStop(.7, `rgba(255, 220, 160, ${fuerza * .5})`);
                grad.addColorStop(1, "rgba(255, 220, 160, 0)");
                g.fillStyle = grad;
                g.beginPath();
                g.moveTo(...P(a));
                g.lineTo(...P(b));
                g.lineTo(...P(c));
                g.lineTo(...P(d));
                g.closePath();
                g.fill();
            }
        }
        for (const p of polvo) {
            if (p.delante !== delante) continue;
            const v = Math.sin(seg * p.vel * 2 + p.fase);
            if (v < .1) continue;
            const px = p.x + Math.sin(seg * p.vel + p.fase) * p.amp;
            const py = p.y + Math.cos(seg * p.vel * .8 + p.fase) * p.amp;
            g.fillStyle = `rgba(255, 238, 196, ${.35 + .55 * v})`;
            pixel(T, px, py);
        }
    }
    let ultimo = performance.now();
    function cuadro(ahora) {
        if (!vivo) return;
        if (!canvas.isConnected) {
            destruir();
            return;
        }
        requestAnimationFrame(cuadro);
        const dt = Math.min(80, Math.max(0, ahora - ultimo));
        ultimo = ahora;
        g.imageSmoothingEnabled = false;
        const c = camaraAhora(ahora);
        const T = aPantalla(c, vw, vh, D);
        if (bote.ms) {
            const t = Math.max(0, Math.min(1, (ahora - bote.t0) / bote.ms));
            bote.x = Math.round(bote.desde + (BX - bote.desde) * frena(t));
            if (t >= 1) bote.ms = 0;
        }
        const balanceo = cuarto ? 0 : Math.round(Math.sin(ahora / 900) * 1.2);
        const bx = bote.x;
        const by = BY + balanceo;
        g.fillStyle = "#161416";
        g.fillRect(0, 0, canvas.width, canvas.height);
        const px = T.s * dpr;
        if (cuarto) {
            dibujarAfuera(T, c, ahora, dt);
            if (listo(img.cuarto)) {
                const x0 = Math.round(T.tx * dpr);
                const y0 = Math.round(T.ty * dpr);
                g.drawImage(img.cuarto, x0, y0, Math.round((T.tx + MW * T.s) * dpr) - x0, Math.round((T.ty + MH * T.s) * dpr) - y0);
            }
            dibujarLuzAdentro(T, ahora, false);
        } else {
            if (listo(img.lago)) {
                const x0 = Math.round(T.tx * dpr);
                const y0 = Math.round(T.ty * dpr);
                g.drawImage(img.lago, x0, y0, Math.round((T.tx + MW * T.s) * dpr) - x0, Math.round((T.ty + MH * T.s) * dpr) - y0);
            }
            g.fillStyle = "rgb(255, 238, 214)";
            for (const d of destellos) {
                if (Math.sin(ahora / 1e3 * d.vel + d.fase) > .55) {
                    g.fillRect(Math.round((T.tx + d.x * T.s) * dpr), Math.round((T.ty + d.y * T.s) * dpr), Math.ceil(px * d.largo), Math.ceil(px));
                }
            }
        }
        const ondita = Math.round(Math.sin(ahora / 400));
        const clave = claveBote(formas);
        let p = 1;
        if (transformacion) {
            p = Math.min(1, (ahora - transformacion.t0) / transformacion.ms);
            if (p >= 1) {
                formas[transformacion.q] = true;
                transformacion = null;
            }
        }
        const tr = transformacion;
        if (!cuarto) {
            const claveReflejo = tr && p < .5 ? tr.desde : claveBote(formas);
            dibujarSprite(img["reflejo" + claveReflejo] || img.reflejo, bx + ondita, BY + ESCENA.bote.lineaDeAgua, T);
        }
        if (tr) {
            const viejoImg = img["bote" + tr.desde];
            const nuevo = img["bote" + tr.hasta];
            if (!listo(nuevo)) dibujarSprite(viejoImg, bx, by, T); else {
                const [cx, cy] = ESCENA.cara[tr.q];
                const R = 46;
                const d = mImg.data;
                for (let y = 0; y < BH; y++) {
                    for (let x = 0; x < BW; x++) {
                        const dist = Math.hypot(x - cx, (y - cy) * .9) / R;
                        const v = p * 1.9 - dist;
                        d[(y * BW + x) * 4 + 3] = v > BAYER8[y & 7][x & 7] ? 255 : 0;
                    }
                }
                mg.putImageData(mImg, 0, 0);
                fg.globalCompositeOperation = "source-over";
                fg.clearRect(0, 0, BW, BH);
                fg.drawImage(nuevo, 0, 0);
                fg.globalCompositeOperation = "destination-in";
                fg.drawImage(mascara, 0, 0);
                if (listo(viejoImg)) {
                    vg.globalCompositeOperation = "source-over";
                    vg.clearRect(0, 0, BW, BH);
                    vg.drawImage(viejoImg, 0, 0);
                    vg.globalCompositeOperation = "destination-out";
                    vg.drawImage(mascara, 0, 0);
                    dibujarSprite(viejo, bx, by, T);
                }
                dibujarSprite(fundido, bx, by, T);
            }
            const [cx, cy] = ESCENA.cara[tr.q];
            g.fillStyle = "rgb(255, 250, 230)";
            const u = Math.max(1, Math.round(T.s * dpr));
            for (let k = 0; k < 7; k++) {
                const a = k * .9 + p * 5;
                const rad = 16 + 18 * p + k % 3 * 5;
                const tam = Math.sin((p * 7 + k) * 1.3) > 0 ? 2 : 1;
                const sx = Math.round((T.tx + (bx + cx + Math.cos(a) * rad) * T.s) * dpr);
                const sy = Math.round((T.ty + (by + cy + Math.sin(a) * rad * .8) * T.s) * dpr);
                g.fillRect(sx - tam * u, sy, (2 * tam + 1) * u, u);
                g.fillRect(sx, sy - tam * u, u, (2 * tam + 1) * u);
            }
        } else {
            dibujarSprite(img["bote" + clave] || img.bote, bx, by, T);
        }
        for (const q of [ "el", "ella" ]) {
            const persona = formas[q] || tr && tr.q === q && p > .85;
            if (!persona) continue;
            const [ox, oy] = ESCENA.ojos[q];
            dibujarSprite(q === "el" ? img.ojosEl : img.ojosElla, bx + ox, by + oy, T, altoDeOjos(q, ahora));
            if (hablando[q] && Math.floor(ahora / 150) % 3 !== 2) {
                const [mx, my] = ESCENA.boca[q];
                dibujarSprite(img.boca, bx + mx, by + my, T);
            }
        }
        if (cuarto) dibujarLuzAdentro(T, ahora, true);
    }
    requestAnimationFrame(cuadro);
    function mover(nombre, ms = 0, fn = null, curva = suave) {
        nombrePlano = nombre;
        const hasta = resolver(plano(nombre, vw, vh, D), vw, vh, D);
        if (!ms) {
            viaje = null;
            cam = hasta;
            if (fn) fn();
            return;
        }
        viaje = {
            desde: {
                ...cam
            },
            hasta: hasta,
            t0: performance.now(),
            ms: ms,
            fn: fn,
            curva: curva
        };
    }
    function entrarBote(ms) {
        if (cuarto) return;
        bote.desde = bote.x;
        bote.t0 = performance.now();
        bote.ms = ms;
    }
    function destruir() {
        vivo = false;
        if (ro) ro.disconnect(); else window.removeEventListener("resize", medir);
    }
    return {
        mover: mover,
        entrarBote: entrarBote,
        hablar: (q, si) => hablando[q] = !!si,
        parpadear: (q, enMs = 0) => parpadeo[q].t = performance.now() + enMs,
        plano: () => nombrePlano,
        transformar: (q, ms = 1100) => {
            if (formas[q] || transformacion) return;
            const desde = claveBote(formas);
            const hasta = claveBote({
                ...formas,
                [q]: true
            });
            transformacion = {
                q: q,
                desde: desde,
                hasta: hasta,
                t0: performance.now(),
                ms: ms
            };
        },
        formas: () => ({
            ...formas
        }),
        forzar: q => {
            if (transformacion && transformacion.q === q) transformacion = null;
            formas[q] = true;
        },
        vivo: () => vivo,
        destruir: destruir
    };
}
