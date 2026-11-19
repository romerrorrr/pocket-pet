import { leerRecordDe, guardarRecordDe, leerDificultadDe, htmlDificultad, cablearDificultad, lienzoPixel, flotante, HTML_VOLVER, cablearVolver, crearPausa, blindarToques } from "./juegoComun.js";

const CLAVE = "baozi_record_tejo";

const ALTO = 168;

const POR_RONDA = 3;

const RONDAS = 3;

const TEJOS = POR_RONDA * RONDAS;

const PUNTOS = {
    mano: 1,
    mecha: 3,
    embocinada: 6,
    monona: 9
};

const CAJ = {
    y0: 40,
    y1: 78,
    top: 30,
    bot: 42
};

const BOC = {
    y: 59,
    rx: 10,
    ry: 5.5
};

const MECHA_R = 4.5;

export const DIFICULTADES_TEJO = {
    easy: {
        pw: .17,
        ruido: .05,
        viento: 0,
        guia: "todo"
    },
    normal: {
        pw: .12,
        ruido: .08,
        viento: .18,
        guia: "zona"
    },
    hard: {
        pw: .09,
        ruido: .1,
        viento: .32,
        guia: "nada"
    }
};

const FUERZA_JUSTA = .6;

export const leerRecordTejo = (dif = null) => leerRecordDe(CLAVE, dif);

export function puntuar(x, y, mechas) {
    const enCaja = dentroDelCajon(x, y);
    if (!enCaja) return {
        tipo: "fuera",
        puntos: 0,
        reventadas: []
    };
    const dx = x / BOC.rx;
    const dy = (y - BOC.y) / BOC.ry;
    const d = Math.hypot(dx, dy);
    const reventadas = [];
    mechas.forEach(((m, i) => {
        if (m.viva && Math.hypot(x - m.x, (y - m.y) * 1.4) <= MECHA_R) reventadas.push(i);
    }));
    const adentro = d < .82;
    if (adentro && reventadas.length) return {
        tipo: "monona",
        puntos: PUNTOS.monona,
        reventadas: reventadas,
        d: d
    };
    if (adentro) return {
        tipo: "embocinada",
        puntos: PUNTOS.embocinada,
        reventadas: reventadas,
        d: d
    };
    if (reventadas.length) return {
        tipo: "mecha",
        puntos: PUNTOS.mecha,
        reventadas: reventadas,
        d: d
    };
    return {
        tipo: "greda",
        puntos: 0,
        reventadas: reventadas,
        d: d
    };
}

function dentroDelCajon(x, y) {
    if (y < CAJ.y0 || y > CAJ.y1) return false;
    const t = (y - CAJ.y0) / (CAJ.y1 - CAJ.y0);
    return Math.abs(x) <= CAJ.top + (CAJ.bot - CAJ.top) * t;
}

function mechasNuevas() {
    return [ {
        x: -BOC.rx,
        y: BOC.y,
        viva: true
    }, {
        x: BOC.rx,
        y: BOC.y,
        viva: true
    }, {
        x: 0,
        y: BOC.y - BOC.ry,
        viva: true
    }, {
        x: 0,
        y: BOC.y + BOC.ry,
        viva: true
    } ];
}

export function caida(fuerza, punteria, pw) {
    const fy = (FUERZA_JUSTA - fuerza) / pw;
    const y = BOC.y + fy * ((CAJ.y1 - CAJ.y0) / 2);
    const t = Math.max(0, Math.min(1, (y - CAJ.y0) / (CAJ.y1 - CAJ.y0)));
    const medio = CAJ.top + (CAJ.bot - CAJ.top) * t;
    return {
        x: punteria * medio,
        y: y
    };
}

export function iniciarTejo(contenedor, opts) {
    const {sprite: sprite, cambiarCara: cambiarCara, sonar: sonar = () => {}, vibrar: vibrar = () => {}, alTerminar: alTerminar = () => {}, alSalir: alSalir = () => {}} = opts;
    let dif = leerDificultadDe(CLAVE);
    let D = DIFICULTADES_TEJO[dif];
    contenedor.innerHTML = `\n    <div class="pantalla-juego pantalla-tejo" id="area-tejo">\n      ${HTML_VOLVER}\n      <div class="juego-hud">\n        <span class="juego-chip tejo-chip-tejos" id="tejo-tejos"></span>\n        <span class="juego-chip" id="tejo-puntos">0 pts</span>\n        <span class="juego-chip tejo-viento oculto" id="tejo-viento"></span>\n      </div>\n      <div class="juego-record" id="tejo-record">TEJO</div>\n      <div class="tejo-personaje" id="tejo-personaje">${sprite("ojo_base_energia_alta.png", "boca_base_feliz.png")}</div>\n      <div class="juego-cielo" id="tejo-capa"></div>\n      <div class="pista-minijuego" id="tejo-pista">Drag down to swing, sideways to aim, let go to throw · hit a mecha and BOOM!</div>\n      ${htmlDificultad("TEJO", CLAVE, dif, " pts")}\n    </div>`;
    const $ = id => contenedor.querySelector(`#${id}`);
    const area = $("area-tejo");
    blindarToques(area);
    const L = lienzoPixel(area, ALTO, "juego-lienzo tejo-lienzo");
    const pjEl = $("tejo-personaje");
    area.insertBefore(L.lienzo, pjEl);
    const capa = $("tejo-capa");
    const st = {
        estado: "eligiendo",
        quedan: TEJOS,
        puntos: 0,
        mechasRotas: 0,
        embocinadas: 0,
        mechas: mechasNuevas(),
        clavados: [],
        ronda: 1,
        polvo: [],
        vuelo: null,
        arrastre: null,
        viento: 0,
        explosion: null,
        sacudon: 0,
        vivo: true
    };
    const pausa = crearPausa(area, {
        activa: () => st.vivo && (st.estado === "apuntando" || st.estado === "volando" || st.estado === "viendo")
    });
    const reloj = () => pausa.ahora();
    function cara(ojo, boca) {
        const el = pjEl.querySelector(".sprite-cara");
        if (el) cambiarCara(el, ojo, boca);
    }
    function hud() {
        const enRonda = Math.max(0, st.quedan - (RONDAS - st.ronda) * POR_RONDA);
        $("tejo-tejos").innerHTML = `R${Math.min(st.ronda, RONDAS)} ${'<i class="tejo-ficha"></i>'.repeat(enRonda)}`;
        $("tejo-puntos").textContent = `${st.puntos} pts`;
        const v = $("tejo-viento");
        if (D.viento > 0 && st.estado !== "eligiendo") {
            const fuerza = Math.abs(st.viento) / D.viento;
            const flechas = fuerza < .2 ? "·" : fuerza < .6 ? "›" : "››";
            v.textContent = st.viento < 0 && fuerza >= .2 ? `wind ${flechas.replace(/›/g, "‹")}` : `wind ${flechas}`;
            v.classList.remove("oculto");
        } else v.classList.add("oculto");
    }
    function nuevoTiro() {
        st.viento = D.viento ? (Math.random() * 2 - 1) * D.viento : 0;
        st.estado = "apuntando";
        cara("ojo_base_energia_alta.png", "boca_base_feliz.png");
        hud();
    }
    cablearDificultad(contenedor, CLAVE, (d => {
        dif = d;
        D = DIFICULTADES_TEJO[dif];
        $("tejo-record").textContent = `${dif.toUpperCase()} · BEST ${leerRecordTejo(dif)} pts`;
        sonar("tocar");
        nuevoTiro();
        setTimeout((() => {
            const p = $("tejo-pista");
            if (p) p.classList.add("oculto");
        }), 7e3);
    }));
    cablearVolver(contenedor, (() => {
        if (!st.vivo) return;
        if (st.estado === "eligiendo") alSalir(); else terminar();
    }));
    const MAX_ARRASTRE = () => area.getBoundingClientRect().height * .55;
    function lectura(a) {
        const r = area.getBoundingClientRect();
        const fuerza = Math.max(0, Math.min(1.15, (a.y - a.y0) / MAX_ARRASTRE()));
        const punteria = Math.max(-1.8, Math.min(1.8, -(a.x - a.x0) / (r.width * .11)));
        return {
            fuerza: fuerza,
            punteria: punteria
        };
    }
    area.addEventListener("pointerdown", (e => {
        if (e.target.closest("button") || st.estado !== "apuntando" || pausa.pausado()) return;
        if (e.target.closest(".juego-hud, .juego-record")) return;
        e.preventDefault();
        st.arrastre = {
            x0: e.clientX,
            y0: e.clientY,
            x: e.clientX,
            y: e.clientY,
            id: e.pointerId
        };
        try {
            area.setPointerCapture(e.pointerId);
        } catch (err) {}
        cara("ojo_especial_curioso.png", "boca_especial_curioso.png");
    }));
    area.addEventListener("pointermove", (e => {
        if (!st.arrastre || e.pointerId !== st.arrastre.id) return;
        st.arrastre.x = e.clientX;
        st.arrastre.y = e.clientY;
    }));
    const soltar = e => {
        if (!st.arrastre || e.pointerId !== st.arrastre.id) return;
        const a = st.arrastre;
        st.arrastre = null;
        if (st.estado !== "apuntando") return;
        const {fuerza: fuerza, punteria: punteria} = lectura(a);
        if (fuerza < .12) {
            cara("ojo_base_energia_alta.png", "boca_base_feliz.png");
            return;
        }
        lanzar(fuerza, punteria);
    };
    area.addEventListener("pointerup", soltar);
    area.addEventListener("pointercancel", (e => {
        if (st.arrastre && e.pointerId === st.arrastre.id) st.arrastre = null;
    }));
    function gauss() {
        return (Math.random() + Math.random() + Math.random() - 1.5) / .75;
    }
    function lanzar(fuerza, punteria, {exacto: exacto = false} = {}) {
        if (st.estado !== "apuntando") return;
        const desvio = exacto ? 0 : D.ruido;
        const f = fuerza + gauss() * desvio * D.pw;
        const p = punteria + st.viento + gauss() * desvio;
        const hasta = caida(f, p, D.pw);
        const res = puntuar(hasta.x, hasta.y, st.mechas);
        if (res.tipo === "fuera") {
            if (hasta.y > CAJ.y1) hasta.y = Math.min(ALTO - 30, CAJ.y1 + (hasta.y - CAJ.y1) * 1.6);
            if (hasta.y < CAJ.y0) hasta.y = Math.max(22, hasta.y);
        }
        st.quedan -= 1;
        st.vuelo = {
            t0: reloj(),
            hasta: hasta,
            res: res
        };
        st.estado = "volando";
        sonar("tocar");
        vibrar(10);
        hud();
    }
    function aterrizar() {
        const {hasta: hasta, res: res} = st.vuelo;
        st.vuelo = null;
        const W = L.W;
        const cx = W / 2;
        const xPct = (cx + hasta.x) / W * 100;
        const yPct = hasta.y / ALTO * 100;
        st.puntos += res.puntos;
        if (res.tipo !== "fuera") {
            st.clavados.push({
                x: hasta.x,
                y: hasta.y,
                d: res.d
            });
            for (let i = 0; i < 10; i++) st.polvo.push({
                x: hasta.x,
                y: hasta.y,
                vx: (Math.random() * 2 - 1) * 26,
                vy: -10 - Math.random() * 22,
                t0: reloj()
            });
        }
        if (res.reventadas.length) {
            for (const i of res.reventadas) st.mechas[i].viva = false;
            st.mechasRotas += res.reventadas.length;
            st.explosion = {
                t0: reloj(),
                x: hasta.x,
                y: hasta.y
            };
            st.sacudon = reloj() + 380;
            sonar("mecha");
            vibrar([ 40, 30, 60 ]);
        } else sonar(res.tipo === "fuera" ? "no" : "tejo");
        if (res.tipo === "embocinada" || res.tipo === "monona") st.embocinadas += 1;
        const textos = {
            mecha: "+3 MECHA!",
            embocinada: "+6 Embocinada!",
            monona: "+9 ¡MOÑONA!",
            greda: "In the clay!",
            fuera: "Out!"
        };
        flotante(capa, textos[res.tipo], xPct, Math.max(12, yPct - 10), res.puntos >= 3 ? "oro" : res.tipo === "fuera" ? "mal" : "");
        if (res.puntos >= 3) cara("ojo_especial_euforico.png", "boca_especial_euforico.png"); else if (res.puntos > 0 || res.tipo === "greda") cara("ojo_base_energia_alta.png", "boca_base_feliz.png"); else cara("ojo_especial_decepcionado.png", "boca_especial_decepcionado.png");
        st.estado = "viendo";
        hud();
        const espera = res.reventadas.length ? 1300 : 800;
        st.siguiente = reloj() + espera;
    }
    function despuesDeVer() {
        for (const m of st.mechas) m.viva = true;
        const tirados = TEJOS - st.quedan;
        if (tirados > 0 && tirados % POR_RONDA === 0 && !st.manoDada) {
            st.manoDada = true;
            const enGreda = st.clavados.filter((c => Number.isFinite(c.d)));
            if (enGreda.length) {
                const mejor = enGreda.reduce(((a, b) => b.d < a.d ? b : a));
                st.puntos += PUNTOS.mano;
                st.manos = (st.manos || 0) + 1;
                st.manoMarca = {
                    x: mejor.x,
                    y: mejor.y,
                    t0: reloj()
                };
                const W = L.W;
                flotante(capa, "+1 Mano!", (W / 2 + mejor.x) / W * 100, Math.max(12, mejor.y / ALTO * 100 - 12), "");
                sonar("moneda");
            }
            hud();
            st.estado = "viendo";
            st.siguiente = reloj() + (enGreda.length ? 1100 : 300);
            return;
        }
        st.manoDada = false;
        if (tirados > 0 && tirados % POR_RONDA === 0) {
            st.clavados = [];
            st.ronda += 1;
        }
        if (st.quedan <= 0) terminar(); else nuevoTiro();
    }
    let fondoC = null;
    function fondo(W) {
        if (fondoC && fondoC.width === W) return fondoC;
        fondoC = document.createElement("canvas");
        fondoC.width = W;
        fondoC.height = ALTO;
        const g = fondoC.getContext("2d");
        const px = (x, y, w, h, c) => {
            g.fillStyle = c;
            g.fillRect(Math.round(x), Math.round(y), w, h);
        };
        const cx = Math.round(W / 2);
        for (let y = 0; y < 86; y++) {
            const k = y % 9;
            px(0, y, W, 1, k === 0 ? "rgb(70,44,28)" : k < 3 ? "rgb(138,94,58)" : "rgb(118,78,48)");
        }
        for (let x = 0; x < W; x += 37) px(x, 0, 2, 86, "rgb(84,54,34)");
        for (let x = 0; x < W; x++) px(x, 7 + Math.round(2 * Math.sin(Math.PI * (x % 120) / 119)), 1, 1, "rgb(60,40,30)");
        px(0, ALTO - 13, W, 3, "rgb(110,72,42)");
        px(0, ALTO - 13, W, 1, "rgb(150,106,64)");
        px(14, 20, 34, 24, "rgb(40,52,44)");
        px(14, 20, 34, 1, "rgb(120,84,50)");
        px(14, 43, 34, 1, "rgb(120,84,50)");
        for (let i = 0; i < 4; i++) px(18 + i * 3, 25, 1, 6, "rgba(236,236,230,0.85)");
        px(17, 28, 12, 1, "rgba(236,236,230,0.85)");
        for (let i = 0; i < 3; i++) px(33 + i * 3, 25, 1, 6, "rgba(236,236,230,0.85)");
        px(18, 35, 26, 1, "rgba(236,236,230,0.5)");
        for (let y = 86; y < ALTO; y++) {
            const t = (y - 86) / (ALTO - 86);
            const c = `rgb(${Math.round(156 + 20 * t)},${Math.round(118 + 14 * t)},${Math.round(80 + 10 * t)})`;
            px(0, y, W, 1, c);
        }
        for (let i = 0; i < 160; i++) px(Math.random() * W, 86 + Math.random() * (ALTO - 86), 1, 1, "rgb(132,96,62)");
        for (let y = CAJ.y1; y < ALTO; y++) {
            const t = (y - CAJ.y1) / (ALTO - CAJ.y1);
            const m = CAJ.bot + 8 + t * 70;
            px(cx - m, y, 2 * m, 1, y < 86 ? "rgb(118,84,54)" : `rgb(${Math.round(142 + 18 * t)},${Math.round(104 + 12 * t)},${Math.round(70 + 8 * t)})`);
        }
        for (let y = CAJ.y0 - 5; y <= CAJ.y1 + 5; y++) {
            const t = (y - (CAJ.y0 - 5)) / (CAJ.y1 - CAJ.y0 + 10);
            const m = CAJ.top + 5 + (CAJ.bot - CAJ.top) * t;
            px(cx - m, y, 2 * m, 1, "rgb(96,62,36)");
        }
        px(cx - CAJ.top - 5, CAJ.y0 - 5, 2 * (CAJ.top + 5), 1, "rgb(150,106,64)");
        for (let y = CAJ.y0; y <= CAJ.y1; y++) {
            const t = (y - CAJ.y0) / (CAJ.y1 - CAJ.y0);
            const m = CAJ.top + (CAJ.bot - CAJ.top) * t;
            const c = `rgb(${Math.round(150 - 26 * t)},${Math.round(134 - 24 * t)},${Math.round(116 - 20 * t)})`;
            px(cx - m, y, 2 * m, 1, c);
        }
        for (let i = 0; i < 90; i++) {
            const y = CAJ.y0 + Math.random() * (CAJ.y1 - CAJ.y0);
            const t = (y - CAJ.y0) / (CAJ.y1 - CAJ.y0);
            const m = CAJ.top + (CAJ.bot - CAJ.top) * t;
            px(cx + (Math.random() * 2 - 1) * m, y, 1, 1, "rgb(108,96,84)");
        }
        for (let a = 0; a < 360; a += 4) {
            const x = cx + BOC.rx * Math.cos(a * Math.PI / 180);
            const y = BOC.y + BOC.ry * Math.sin(a * Math.PI / 180);
            px(x, y, 1, 1, a > 180 ? "rgb(40,40,46)" : "rgb(70,70,78)");
            px(x, y + 1, 1, 1, "rgb(30,30,34)");
        }
        for (let y = -BOC.ry + 1; y <= BOC.ry - 1; y++) {
            const m = BOC.rx * Math.sqrt(Math.max(0, 1 - (y / BOC.ry) ** 2)) - 1;
            px(cx - m, BOC.y + y, 2 * m, 1, "rgb(96,84,74)");
        }
        return fondoC;
    }
    function dibujarMecha(g, x, y) {
        g.fillStyle = "rgb(250,248,240)";
        g.fillRect(x - 2, y - 2, 5, 3);
        g.fillRect(x - 1, y - 3, 3, 1);
        g.fillStyle = "rgb(214,40,40)";
        g.fillRect(x, y - 3, 1, 1);
        g.fillStyle = "rgb(180,170,150)";
        g.fillRect(x - 2, y + 1, 5, 1);
    }
    function dibujarTejo(g, x, y, r, giro = .55) {
        const rx = Math.max(1, r);
        const ry = Math.max(1, r * giro);
        g.fillStyle = "rgb(24,22,30)";
        g.beginPath();
        g.ellipse(Math.round(x), Math.round(y), rx + 1, ry + 1, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "rgb(70,70,80)";
        g.beginPath();
        g.ellipse(Math.round(x), Math.round(y), rx, ry, 0, 0, Math.PI * 2);
        g.fill();
        if (r > 2) {
            g.fillStyle = "rgb(170,170,182)";
            g.fillRect(Math.round(x - rx * .5), Math.round(y - ry * .6), Math.max(1, Math.round(rx * .7)), 1);
        }
    }
    function cuadro() {
        if (!st.vivo) return;
        requestAnimationFrame(cuadro);
        if (pausa.pausado()) return;
        const t = reloj();
        const W = L.W;
        const g = L.ctx;
        const cx = Math.round(W / 2);
        const sac = t < st.sacudon ? Math.round((Math.random() * 2 - 1) * 2) : 0;
        g.setTransform(1, 0, 0, 1, sac, sac ? 1 : 0);
        g.drawImage(fondo(W), 0, 0);
        const cols = [ "rgb(246,200,40)", "rgb(40,76,168)", "rgb(210,40,48)" ];
        for (let x = 4, i = 0; x < W; x += 9, i++) {
            const y = 8 + Math.round(2 * Math.sin(Math.PI * (x % 120) / 119));
            const lado = st.viento * 9 + Math.sin(t / 260 + i) * (.6 + Math.abs(st.viento) * 3);
            g.fillStyle = cols[i % 3];
            for (let k = 0; k < 6; k++) g.fillRect(Math.round(x - 3 + k / 2 + lado * k / 6), y + k, 6 - k, 1);
        }
        for (const c of st.clavados) dibujarTejo(g, cx + c.x, c.y, 2.5);
        if (st.manoMarca && t - st.manoMarca.t0 < 1400 && Math.floor(t / 180) % 2) {
            g.strokeStyle = "rgb(255,236,120)";
            g.strokeRect(Math.round(cx + st.manoMarca.x) - 4, Math.round(st.manoMarca.y) - 3, 8, 6);
        }
        st.polvo = st.polvo.filter((p => t - p.t0 < 500));
        for (const p of st.polvo) {
            const k = (t - p.t0) / 1e3;
            g.fillStyle = `rgba(150,128,104,${1 - k * 2})`;
            g.fillRect(Math.round(cx + p.x + p.vx * k), Math.round(p.y + p.vy * k + 60 * k * k), 1, 1);
        }
        for (const m of st.mechas) if (m.viva) dibujarMecha(g, Math.round(cx + m.x), Math.round(m.y));
        if (st.explosion) {
            const k = (t - st.explosion.t0) / 700;
            if (k > 1) st.explosion = null; else {
                const ex = cx + st.explosion.x;
                const ey = st.explosion.y;
                const r = 6 + k * 26;
                g.fillStyle = `rgba(255,150,40,${(1 - k) * .85})`;
                g.beginPath();
                g.arc(ex, ey, r, 0, Math.PI * 2);
                g.fill();
                g.fillStyle = `rgba(255,236,150,${(1 - k) * .95})`;
                g.beginPath();
                g.arc(ex, ey, r * .6, 0, Math.PI * 2);
                g.fill();
                for (let i = 0; i < 24; i++) {
                    const a = i / 24 * Math.PI * 2 + i % 3;
                    const rr = r * (i % 2 ? 1.5 : 1.15);
                    g.fillStyle = i % 2 ? `rgba(255,220,90,${1 - k})` : `rgba(255,110,40,${1 - k})`;
                    g.fillRect(Math.round(ex + Math.cos(a) * rr), Math.round(ey + Math.sin(a) * rr * .8), 2, 2);
                }
                g.fillStyle = `rgba(210,206,200,${(1 - k) * .55})`;
                g.beginPath();
                g.arc(ex - 4, ey - k * 22, 4 + k * 12, 0, Math.PI * 2);
                g.arc(ex + 6, ey - k * 18, 3 + k * 9, 0, Math.PI * 2);
                g.fill();
                if (k < .15) {
                    g.fillStyle = "rgba(255,255,240,0.6)";
                    g.fillRect(-4, -4, W + 8, ALTO + 8);
                }
            }
        }
        if (st.vuelo) {
            const k = Math.min(1, (t - st.vuelo.t0) / 720);
            const x0 = cx - 40;
            const y0 = ALTO - 26;
            const x1 = cx + st.vuelo.hasta.x;
            const y1 = st.vuelo.hasta.y;
            const x = x0 + (x1 - x0) * k;
            const y = y0 + (y1 - y0) * k - Math.sin(Math.PI * k) * 46;
            dibujarTejo(g, x, y, 6 - 3.5 * k, .15 + .6 * Math.abs(Math.cos(k * 14)));
            if (k >= 1) aterrizar();
        }
        if (st.estado === "viendo" && t >= st.siguiente) despuesDeVer();
        if (st.estado === "apuntando") {
            const bx = W - 18;
            const by0 = 40;
            const bh = 96;
            g.fillStyle = "rgba(30,24,20,0.55)";
            g.fillRect(bx - 1, by0 - 1, 8, bh + 2);
            if (D.guia !== "nada") {
                const z0 = by0 + bh * (1 - Math.min(1, (FUERZA_JUSTA + D.pw) / 1.15));
                const z1 = by0 + bh * (1 - (FUERZA_JUSTA - D.pw) / 1.15);
                g.fillStyle = "rgba(90,200,110,0.75)";
                g.fillRect(bx, Math.round(z0), 6, Math.round(z1 - z0));
            }
            if (st.arrastre) {
                const {fuerza: fuerza, punteria: punteria} = lectura(st.arrastre);
                const h = Math.round(bh * Math.min(1, fuerza / 1.15));
                g.fillStyle = "rgb(246,200,40)";
                g.fillRect(bx, by0 + bh - h, 6, h);
                if (D.guia !== "nada") {
                    const z0 = by0 + bh * (1 - Math.min(1, (FUERZA_JUSTA + D.pw) / 1.15));
                    const z1 = by0 + bh * (1 - (FUERZA_JUSTA - D.pw) / 1.15);
                    g.strokeStyle = "rgb(90,220,120)";
                    g.strokeRect(bx - 1.5, Math.round(z0) - .5, 9, Math.round(z1 - z0) + 1);
                }
                {
                    const p = caida(fuerza, punteria + (D.guia === "todo" ? st.viento : 0), D.pw);
                    const hasta = D.guia === "todo" ? 12 : D.guia === "zona" ? 7 : 4;
                    const punto = k => [ cx - 40 + (cx + p.x - (cx - 40)) * k, ALTO - 26 + (p.y - (ALTO - 26)) * k - Math.sin(Math.PI * k) * 46 ];
                    for (let i = 1; i < hasta; i++) {
                        const [x, y] = punto(i / 12);
                        g.fillStyle = "rgba(30,20,14,0.6)";
                        g.fillRect(Math.round(x), Math.round(y) + 1, 2, 2);
                        g.fillStyle = "rgb(255,250,236)";
                        g.fillRect(Math.round(x), Math.round(y), 2, 2);
                    }
                    if (D.guia === "todo") {
                        g.strokeStyle = "rgb(255,236,120)";
                        g.strokeRect(Math.round(cx + p.x) - 3.5, Math.round(p.y) - 2.5, 7, 5);
                    } else {
                        const [x1, y1] = punto((hasta - 1) / 12);
                        const [x0, y0] = punto((hasta - 2) / 12);
                        const a = Math.atan2(y1 - y0, x1 - x0);
                        g.fillStyle = "rgb(255,250,236)";
                        for (const da of [ -2.5, 2.5 ]) {
                            for (let r = 1; r <= 4; r++) g.fillRect(Math.round(x1 - Math.cos(a + da * .3) * r), Math.round(y1 - Math.sin(a + da * .3) * r), 2, 2);
                        }
                    }
                }
                dibujarTejo(g, cx - 40, ALTO - 26, 6);
            } else {
                dibujarTejo(g, cx - 40, ALTO - 26 + Math.floor(t / 400) % 2, 6);
            }
        }
        g.setTransform(1, 0, 0, 1, 0, 0);
        const s = L.escala;
        const lado = Math.round(70 * s);
        pjEl.style.width = `${lado}px`;
        pjEl.style.height = `${lado}px`;
        const ladeo = st.arrastre && st.estado === "apuntando" ? Math.round(lectura(st.arrastre).punteria * 6) : 0;
        pjEl.style.left = `${Math.round((cx - 110 + ladeo) * s)}px`;
        pjEl.style.top = `${Math.round((ALTO - 66) * s)}px`;
    }
    requestAnimationFrame(cuadro);
    hud();
    function terminar() {
        if (!st.vivo) return;
        st.vivo = false;
        st.estado = "fin";
        pausa.destruir();
        window.removeEventListener("resize", L.medir);
        const record = leerRecordTejo(dif);
        const nuevoRecord = st.puntos > record;
        if (nuevoRecord) guardarRecordDe(CLAVE, dif, st.puntos);
        alTerminar({
            puntos: st.puntos,
            mechas: st.mechasRotas,
            embocinadas: st.embocinadas,
            record: Math.max(record, st.puntos),
            nuevoRecord: nuevoRecord,
            dificultad: dif
        });
    }
    window.addEventListener("resize", L.medir);
    return {
        terminar: terminar,
        destruir: () => {
            st.vivo = false;
            pausa.destruir();
            window.removeEventListener("resize", L.medir);
        },
        _pausado: () => pausa.pausado(),
        _lanzar: (fuerza, punteria, exacto = true) => {
            if (exacto) st.viento = 0;
            lanzar(fuerza, punteria, {
                exacto: exacto
            });
        },
        _estado: () => ({
            estado: st.estado,
            quedan: st.quedan,
            puntos: st.puntos,
            mechas: st.mechasRotas,
            embocinadas: st.embocinadas,
            viento: st.viento,
            ronda: st.ronda,
            manos: st.manos || 0
        })
    };
}
