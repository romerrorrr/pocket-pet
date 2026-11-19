import { HTML_VOLVER, cablearVolver, crearPausa, blindarToques } from "./juegoComun.js";

const DURACION_MS = 4e4;

const CORAZONES = 3;

const CLAVE_RECORD = "baozi_record_juego";

const CLAVE_DIFICULTAD = "baozi_dificultad_juego";

export const DIFICULTADES = {
    easy: {
        nombre: "EASY",
        v0: .32,
        dv: .3,
        cada0: 760,
        cada1: 430,
        ch0: .1,
        dch: .1
    },
    normal: {
        nombre: "NORMAL",
        v0: .46,
        dv: .46,
        cada0: 620,
        cada1: 320,
        ch0: .14,
        dch: .14
    },
    hard: {
        nombre: "HARD",
        v0: .62,
        dv: .62,
        cada0: 500,
        cada1: 250,
        ch0: .18,
        dch: .16
    }
};

const BUENAS = [ "comida/comida_manzana.png", "comida/comida_naranja.png", "comida/comida_bao.png", "comida/comida_onigiri.png", "comida/comida_dumpling.png", "comida/comida_grillo1.png" ];

const DORADO = "comida/juego_bao_dorado.png";

const CHILE = "comida/juego_chile.png";

const claveRecord = dif => dif === "normal" ? CLAVE_RECORD : `${CLAVE_RECORD}_${dif}`;

export function leerRecord(dif = null) {
    if (!dif) return Math.max(...Object.keys(DIFICULTADES).map((d => leerRecord(d))));
    try {
        return Number(localStorage.getItem(claveRecord(dif))) || 0;
    } catch (e) {
        return 0;
    }
}

function guardarRecord(dif, n) {
    try {
        localStorage.setItem(claveRecord(dif), String(n));
    } catch (e) {}
}

function leerDificultad() {
    try {
        const d = localStorage.getItem(CLAVE_DIFICULTAD);
        return DIFICULTADES[d] ? d : "normal";
    } catch (e) {
        return "normal";
    }
}

function multiplicador(combo) {
    return combo >= 16 ? 4 : combo >= 10 ? 3 : combo >= 5 ? 2 : 1;
}

export function iniciarJuego(contenedor, opts) {
    const {arte: arte, sprite: sprite, cambiarCara: cambiarCara, sonar: sonar = () => {}, vibrar: vibrar = () => {}, alTerminar: alTerminar = () => {}, alSalir: alSalir = () => {}} = opts;
    let dif = leerDificultad();
    let D = DIFICULTADES[dif];
    let record = leerRecord(dif);
    contenedor.innerHTML = `\n    <div class="pantalla-juego pantalla-snack con-cuarto" id="area-minijuego">\n      ${HTML_VOLVER}\n      <div class="juego-hud">\n        <span class="juego-chip" id="juego-puntos">0</span>\n        <span class="juego-chip juego-combo oculto" id="juego-combo">x2</span>\n        <span class="juego-corazones" id="juego-corazones">${"<i></i>".repeat(CORAZONES)}</span>\n        <span class="juego-chip" id="minijuego-tiempo">40</span>\n      </div>\n      <div class="juego-record" id="juego-record">BEST ${record}</div>\n      <div class="juego-cielo" id="juego-cielo"></div>\n      <div class="juego-personaje" id="caja-cara-minijuego">${sprite("ojo_base_energia_alta.png", "boca_base_feliz.png")}</div>\n      ${opts.bannerMotion || ""}\n      <div class="pista-minijuego" id="juego-pista">Drag or tilt to move · catch the snacks · avoid the chili!</div>\n      <div class="juego-cuenta oculto" id="juego-cuenta">3</div>\n      <div class="juego-dificultad" id="juego-dificultad">\n        <div class="juego-dificultad-titulo">SNACK RAIN</div>\n        <div class="juego-dificultad-botones">\n          ${Object.entries(DIFICULTADES).map((([id, d]) => `<button class="boton ${id === dif ? "" : "boton-fantasma"}" data-dificultad="${id}">${d.nombre}<small>best ${leerRecord(id)}</small></button>`)).join("")}\n        </div>\n      </div>\n    </div>`;
    const area = contenedor.querySelector("#area-minijuego");
    blindarToques(area);
    const cielo = contenedor.querySelector("#juego-cielo");
    const pj = contenedor.querySelector("#caja-cara-minijuego");
    const $ = id => contenedor.querySelector(`#${id}`);
    const st = {
        x: .5,
        objetivo: .5,
        puntos: 0,
        atrapadas: 0,
        combo: 0,
        corazones: CORAZONES,
        items: [],
        empezo: 0,
        ultimo: 0,
        proximo: 0,
        vivo: true,
        terminado: false,
        caraHasta: 0
    };
    let contando = false;
    const pausa = crearPausa(area, {
        activa: () => st.vivo && !st.terminado && (st.empezo > 0 || contando),
        alSeguir: ms => {
            if (st.empezo) {
                st.empezo += ms;
                st.proximo += ms;
            }
            if (st.caraHasta) st.caraHasta += ms;
            st.ultimo = 0;
            if (st.empezo && opts.alEmpezar) opts.alEmpezar();
        }
    });
    const mover = clientX => {
        const r = area.getBoundingClientRect();
        st.objetivo = Math.min(.94, Math.max(.06, (clientX - r.left) / r.width));
    };
    let dedoHasta = 0;
    area.addEventListener("pointerdown", (e => {
        if (e.target.closest("button")) return;
        dedoHasta = performance.now() + 1200;
        mover(e.clientX);
    }));
    const soltarDedo = () => {
        dedoHasta = Math.min(dedoHasta, performance.now() + 250);
    };
    area.addEventListener("pointerup", soltarDedo);
    area.addEventListener("pointercancel", soltarDedo);
    area.addEventListener("pointermove", (e => {
        if (e.buttons || e.pointerType === "touch") {
            dedoHasta = performance.now() + 1200;
            mover(e.clientX);
        }
    }));
    const teclas = e => {
        if (e.key === "ArrowLeft") st.objetivo = Math.max(.06, st.objetivo - .12);
        if (e.key === "ArrowRight") st.objetivo = Math.min(.94, st.objetivo + .12);
    };
    window.addEventListener("keydown", teclas);
    cablearVolver(contenedor, (() => {
        if (!st.vivo || st.terminado) return;
        if (!st.empezo) alSalir(); else terminar();
    }));
    function cara(ojo, boca, ms = 380) {
        const el = pj.querySelector(".sprite-cara");
        cambiarCara(el, ojo, boca);
        st.caraHasta = performance.now() + ms;
    }
    function nuevoItem(t) {
        const avance = Math.min(1, (t - st.empezo) / DURACION_MS);
        const r = Math.random();
        const tipo = r < D.ch0 + avance * D.dch ? "chile" : r < D.ch0 + .07 + avance * D.dch ? "dorado" : "buena";
        const src = tipo === "chile" ? CHILE : tipo === "dorado" ? DORADO : BUENAS[Math.floor(Math.random() * BUENAS.length)];
        const el = document.createElement("img");
        el.className = `juego-item ${tipo}`;
        el.src = arte(src);
        el.alt = "";
        el.draggable = false;
        const item = {
            el: el,
            tipo: tipo,
            x: .08 + Math.random() * .84,
            y: -.12,
            v: D.v0 + avance * D.dv + Math.random() * .08,
            giro: (Math.random() - .5) * 40
        };
        cielo.appendChild(el);
        st.items.push(item);
    }
    function quitar(item, clase = "") {
        st.items = st.items.filter((i => i !== item));
        if (clase) {
            item.el.classList.add(clase);
            setTimeout((() => item.el.remove()), 300);
        } else item.el.remove();
    }
    function flotante(texto, x, clase = "") {
        const f = document.createElement("div");
        f.className = `juego-flota ${clase}`;
        f.textContent = texto;
        f.style.left = `${x * 100}%`;
        cielo.appendChild(f);
        setTimeout((() => f.remove()), 700);
    }
    function atrapar(item) {
        if (!st.vivo || st.terminado) return;
        if (item.tipo === "chile") {
            st.corazones -= 1;
            st.combo = 0;
            sonar("no");
            vibrar([ 30, 40, 30 ]);
            cara("ojo_especial_asqueado.png", "boca_especial_asqueado.png", 700);
            pj.classList.remove("pica");
            void pj.offsetWidth;
            pj.classList.add("pica");
            flotante("HOT!", item.x, "mal");
            quitar(item, "comido");
            pintarHud();
            if (st.corazones <= 0) terminar();
            return;
        }
        st.combo += 1;
        const base = item.tipo === "dorado" ? 5 : 1;
        const gana = base * multiplicador(st.combo);
        st.puntos += gana;
        st.atrapadas += 1;
        sonar("atrapar");
        vibrar(15);
        cara("ojo_base_energia_alta.png", "boca_especial_sorprendido.png", 260);
        flotante(`+${gana}`, item.x, item.tipo === "dorado" ? "oro" : "");
        quitar(item, "comido");
        pintarHud();
    }
    function inclinar(objetivo) {
        if (performance.now() < dedoHasta || !Number.isFinite(objetivo)) return;
        st.objetivo = Math.min(.94, Math.max(.06, objetivo));
    }
    function pintarHud() {
        $("juego-puntos").textContent = String(st.puntos);
        const m = multiplicador(st.combo);
        const c = $("juego-combo");
        c.textContent = `x${m}`;
        c.classList.toggle("oculto", m < 2);
        const cs = [ ...$("juego-corazones").children ];
        cs.forEach(((h, i) => h.classList.toggle("vacio", i >= st.corazones)));
    }
    function cuadro(t) {
        if (!st.vivo) return;
        requestAnimationFrame(cuadro);
        if (!st.empezo) return;
        if (pausa.pausado()) {
            st.ultimo = 0;
            return;
        }
        const dt = Math.min(50, t - (st.ultimo || t)) / 1e3;
        st.ultimo = t;
        if (st.terminado) return;
        const restante = Math.max(0, DURACION_MS - (t - st.empezo));
        $("minijuego-tiempo").textContent = String(Math.ceil(restante / 1e3));
        if (restante <= 0) {
            terminar();
            return;
        }
        st.x += (st.objetivo - st.x) * Math.min(1, dt * 12);
        pj.style.left = `${st.x * 100}%`;
        pj.classList.toggle("mira-izq", st.objetivo < st.x - .01);
        if (st.caraHasta && t > st.caraHasta) {
            st.caraHasta = 0;
            cambiarCara(pj.querySelector(".sprite-cara"), "ojo_base_energia_alta.png", "boca_base_feliz.png");
        }
        if (t > st.proximo) {
            nuevoItem(t);
            const avance = Math.min(1, (t - st.empezo) / DURACION_MS);
            st.proximo = t + D.cada0 - avance * (D.cada0 - D.cada1) + Math.random() * 200;
        }
        for (const it of [ ...st.items ]) {
            it.y += it.v * dt;
            it.el.style.transform = `translate(-50%, -50%) rotate(${it.giro * it.y}deg)`;
            it.el.style.left = `${it.x * 100}%`;
            it.el.style.top = `${it.y * 100}%`;
            if (it.y > .7 && it.y < .88 && Math.abs(it.x - st.x) < .08) {
                atrapar(it);
            } else if (it.y > 1.12) {
                if (it.tipo !== "chile") st.combo = 0;
                quitar(it);
                pintarHud();
            }
        }
    }
    function terminar() {
        if (st.terminado) return;
        st.terminado = true;
        pausa.destruir();
        const nuevoRecord = st.puntos > record;
        if (nuevoRecord) guardarRecord(dif, st.puntos);
        for (const it of st.items) it.el.remove();
        st.items = [];
        setTimeout((() => {
            detener();
            alTerminar({
                puntos: st.puntos,
                atrapadas: st.atrapadas,
                record: Math.max(record, st.puntos),
                nuevoRecord: nuevoRecord,
                dificultad: dif
            });
        }), 400);
    }
    function detener() {
        st.vivo = false;
        pausa.destruir();
        window.removeEventListener("keydown", teclas);
    }
    function arrancar() {
        if (!st.vivo || st.terminado) return;
        const cuenta = $("juego-cuenta");
        cuenta.classList.remove("oculto");
        contando = true;
        let n = 3;
        const tic = setInterval((() => {
            if (!st.vivo || st.terminado) {
                clearInterval(tic);
                return;
            }
            if (pausa.pausado()) return;
            n -= 1;
            if (n > 0) cuenta.textContent = String(n); else {
                clearInterval(tic);
                contando = false;
                cuenta.textContent = "GO!";
                setTimeout((() => cuenta.remove()), 500);
                st.empezo = performance.now();
                st.proximo = st.empezo + 200;
                if (opts.alEmpezar) opts.alEmpezar();
                const pista = $("juego-pista");
                if (pista) setTimeout((() => pista.classList.add("oculto")), 3500);
            }
        }), 600);
    }
    for (const b of contenedor.querySelectorAll("[data-dificultad]")) {
        b.addEventListener("pointerdown", (e => e.stopPropagation()));
        b.addEventListener("click", (e => {
            e.stopPropagation();
            dif = b.dataset.dificultad;
            D = DIFICULTADES[dif];
            record = leerRecord(dif);
            try {
                localStorage.setItem(CLAVE_DIFICULTAD, dif);
            } catch (err) {}
            $("juego-record").textContent = `${D.nombre} · BEST ${record}`;
            $("juego-dificultad").remove();
            sonar("tocar");
            let espera = null;
            try {
                espera = opts.alElegir ? opts.alElegir() : null;
            } catch (err) {
                espera = null;
            }
            if (espera && typeof espera.then === "function") espera.then(arrancar, arrancar); else arrancar();
        }));
    }
    requestAnimationFrame(cuadro);
    return {
        detener: detener,
        inclinar: inclinar,
        terminar: terminar,
        estado: () => st,
        usandoDedo: () => performance.now() < dedoHasta,
        _pausado: () => pausa.pausado()
    };
}

export function ejesDePantalla(ax, ay, az, angulo = 90) {
    const g = 9.81;
    const a = (Math.round(angulo / 90) * 90 % 360 + 360) % 360;
    const der = {
        0: [ 1, 0 ],
        90: [ 0, -1 ],
        180: [ -1, 0 ],
        270: [ 0, 1 ]
    }[a];
    const arr = {
        0: [ 0, 1 ],
        90: [ 1, 0 ],
        180: [ 0, -1 ],
        270: [ -1, 0 ]
    }[a];
    const vertical = (ax * arr[0] + ay * arr[1]) / g;
    return {
        lateral: -(ax * der[0] + ay * der[1]) / g,
        arriba: vertical + az / g,
        vertical: vertical,
        z: az / g
    };
}

const CLAVE_SIGNO = "baozi_volante_signo";

function signoGuardado() {
    try {
        const s = Number(localStorage.getItem(CLAVE_SIGNO));
        return s === 1 || s === -1 ? s : null;
    } catch (e) {
        return null;
    }
}

function guardarSigno(s) {
    try {
        localStorage.setItem(CLAVE_SIGNO, String(s));
    } catch (e) {}
}

export class Volante {
    constructor({rango: rango = .3, calibrar: calibrar = 8, signo: signo = undefined} = {}) {
        this.rango = rango;
        this.calibrar = calibrar;
        this.signoConocido = signo === undefined ? signoGuardado() : signo;
        this.signo = this.signoConocido || 1;
        this.seguro = false;
        this.recalibrar();
    }
    recalibrar() {
        this.faltan = this.calibrar;
        this.suma = 0;
        this.sumaVertical = 0;
        this.sumaZ = 0;
        this.n = 0;
        this.base = 0;
        this.suave = null;
    }
    centrarEn(pos) {
        if (this.faltan > 0 || this.suave === null || !Number.isFinite(pos)) return;
        const f = Math.max(-1, Math.min(1, (pos - .5) / .44));
        const quiero = f * this.rango;
        this.base += this.suave - quiero;
        this.suave = quiero;
    }
    leer(ax, ay, az, angulo) {
        if (![ ax, ay, az ].every(Number.isFinite)) return null;
        const {lateral: lateral, vertical: vertical, z: z} = ejesDePantalla(ax, ay, az, angulo);
        if (this.faltan > 0) {
            this.suma += lateral;
            this.sumaVertical += vertical;
            this.sumaZ += z;
            this.n++;
            this.faltan--;
            if (this.faltan === 0) {
                const ver = this.sumaVertical / this.n;
                if (Math.abs(ver) >= .3) {
                    this.signo = ver < 0 ? -1 : 1;
                    this.seguro = true;
                    if (this.signo !== this.signoConocido) guardarSigno(this.signo);
                    this.signoConocido = this.signo;
                } else if (this.signoConocido) this.signo = this.signoConocido; else this.signo = this.sumaZ / this.n < 0 ? -1 : 1;
                this.base = this.suma / this.n * this.signo;
            }
            return null;
        }
        const v = lateral * this.signo - this.base;
        this.suave = this.suave === null ? v : this.suave + (v - this.suave) * .35;
        const f = Math.max(-1, Math.min(1, this.suave / this.rango));
        return .5 + f * .44;
    }
}
