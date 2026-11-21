import { arte } from "./arte.js";

const MW = 320;

const MH = 150;

const CORAZON = [ "0110110", "1211111", "1111111", "0111110", "0011100", "0001000" ];

const suave = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function crearMapaFinal(contenedor, {casa: casa, destino: destino, imagen: imagen = "pieza/mapa.png", ruta: ruta = null}) {
    const canvas = document.createElement("canvas");
    canvas.className = "lienzo-escena";
    contenedor.appendChild(canvas);
    const g = canvas.getContext("2d");
    const mapa = new Image;
    mapa.decoding = "async";
    mapa.src = arte(imagen);
    const A = {
        x: casa.x * MW,
        y: casa.y * MH
    };
    const B = {
        x: destino.x * MW,
        y: destino.y * MH
    };
    const C = {
        x: (A.x + B.x) / 2 + 6,
        y: Math.min(A.y, B.y) - 18
    };
    let punto = t => ({
        x: (1 - t) * (1 - t) * A.x + 2 * (1 - t) * t * C.x + t * t * B.x,
        y: (1 - t) * (1 - t) * A.y + 2 * (1 - t) * t * C.y + t * t * B.y
    });
    if (ruta && ruta.length > 1) {
        const P = ruta.map((p => ({
            x: p.x * MW,
            y: p.y * MH
        })));
        const largos = P.slice(1).map(((p, i) => Math.hypot(p.x - P[i].x, p.y - P[i].y)));
        const total = largos.reduce(((a, b) => a + b), 0) || 1;
        punto = t => {
            let d = Math.max(0, Math.min(1, t)) * total;
            for (let i = 0; i < largos.length; i++) {
                if (d <= largos[i] || i === largos.length - 1) {
                    const k = largos[i] ? Math.min(1, d / largos[i]) : 0;
                    return {
                        x: P[i].x + (P[i + 1].x - P[i].x) * k,
                        y: P[i].y + (P[i + 1].y - P[i].y) * k
                    };
                }
                d -= largos[i];
            }
            return P[P.length - 1];
        };
    }
    let vw = 1;
    let vh = 1;
    let dpr = 1;
    let vivo = true;
    let camino = {
        t0: 0,
        ms: 0,
        listo: 0
    };
    let zoom = {
        t0: 0,
        ms: 0
    };
    function medir() {
        const r = contenedor.getBoundingClientRect();
        vw = Math.max(1, r.width);
        vh = Math.max(1, r.height);
        dpr = Math.min(3, window.devicePixelRatio || 1);
        canvas.width = Math.round(vw * dpr);
        canvas.height = Math.round(vh * dpr);
        canvas.style.width = `${vw}px`;
        canvas.style.height = `${vh}px`;
    }
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(medir) : null;
    if (ro) ro.observe(contenedor); else window.addEventListener("resize", medir);
    medir();
    function camara(ahora) {
        const s0 = Math.max(vw / MW, vh / MH);
        const s1 = Math.max(s0 * 2.2, Math.min(vw / 120, vh / 64));
        const k = zoom.ms ? suave(Math.max(0, Math.min(1, (ahora - zoom.t0) / zoom.ms))) : 0;
        const s = Math.exp(Math.log(s0) + (Math.log(s1) - Math.log(s0)) * k);
        const cx = MW / 2 + (B.x - MW / 2) * k;
        const cy = MH / 2 + (B.y - MH / 2) * k;
        let tx = vw / 2 - cx * s;
        let ty = vh / 2 - cy * s;
        tx = Math.min(0, Math.max(vw - MW * s, tx));
        ty = Math.min(0, Math.max(vh - MH * s, ty));
        return {
            tx: tx,
            ty: ty,
            s: s
        };
    }
    function cuadro(ahora) {
        if (!vivo) return;
        if (!canvas.isConnected) {
            destruir();
            return;
        }
        requestAnimationFrame(cuadro);
        g.imageSmoothingEnabled = false;
        g.fillStyle = "#161416";
        g.fillRect(0, 0, canvas.width, canvas.height);
        const T = camara(ahora);
        const u = T.s * dpr;
        const px = (x, y, c, n = 1) => {
            g.fillStyle = c;
            g.fillRect(Math.round((T.tx + x * T.s) * dpr), Math.round((T.ty + y * T.s) * dpr), Math.ceil(u * n), Math.ceil(u * n));
        };
        if (mapa.complete && mapa.naturalWidth) {
            const x0 = Math.round(T.tx * dpr);
            const y0 = Math.round(T.ty * dpr);
            g.drawImage(mapa, x0, y0, Math.round((T.tx + MW * T.s) * dpr) - x0, Math.round((T.ty + MH * T.s) * dpr) - y0);
        }
        const hx = Math.round(A.x);
        const hy = Math.round(A.y);
        for (let i = 0; i < 4; i++) for (let j = -i; j <= i; j++) px(hx + j, hy - 4 + i, "rgb(196,84,72)");
        for (let y = 0; y < 3; y++) for (let x = -2; x <= 2; x++) px(hx + x, hy + y, x === 0 && y > 0 ? "rgb(90,60,48)" : "rgb(246,236,214)");
        let hasta = camino.listo;
        if (camino.ms) hasta = Math.max(0, Math.min(1, (ahora - camino.t0) / camino.ms));
        const N = ruta ? 90 : 46;
        for (let i = 0; i <= N * hasta; i++) {
            if (i % 2) continue;
            const p = punto(i / N);
            px(Math.round(p.x), Math.round(p.y), "rgb(214,86,110)");
        }
        const p = punto(hasta);
        const late = hasta >= 1 ? Math.floor(ahora / 380) % 2 ? 0 : -1 : Math.floor(ahora / 160) % 2 ? 0 : -1;
        const cx = Math.round(p.x) - 3;
        const cy = Math.round(p.y) - 7 + late;
        for (let y = 0; y < CORAZON.length; y++) {
            for (let x = 0; x < 7; x++) {
                const c = CORAZON[y][x];
                if (c !== "0") px(cx + x, cy + y, c === "2" ? "rgb(255,214,224)" : "rgb(232,64,96)");
            }
        }
        for (let y = -1; y <= CORAZON.length; y++) {
            for (let x = -1; x <= 7; x++) {
                const lleno = (xx, yy) => yy >= 0 && yy < CORAZON.length && xx >= 0 && xx < 7 && CORAZON[yy][xx] !== "0";
                if (!lleno(x, y) && (lleno(x + 1, y) || lleno(x - 1, y) || lleno(x, y + 1) || lleno(x, y - 1))) px(cx + x, cy + y, "rgb(58,30,40)");
            }
        }
    }
    requestAnimationFrame(cuadro);
    function destruir() {
        vivo = false;
        if (ro) ro.disconnect(); else window.removeEventListener("resize", medir);
    }
    return {
        recorrer: ms => camino = {
            t0: performance.now(),
            ms: ms,
            listo: 0
        },
        completar: () => camino = {
            t0: 0,
            ms: 0,
            listo: 1
        },
        acercar: ms => zoom = {
            t0: performance.now(),
            ms: ms
        },
        vivo: () => vivo,
        destruir: destruir
    };
}
