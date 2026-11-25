import { FINAL } from "./config.js";

import { arte } from "./arte.js";

import { escribir, conNombre } from "./dialogo.js";

import { todasLasFotos } from "./camara.js";

import { distanciaMetros, wgsAGcj } from "./mundo.js";

import { claveDelDia, fechaLegible } from "./diario.js";

import * as Musica from "./musica.js";

import * as Sonido from "./sonido.js";

import { vibrar } from "./actuadores.js";

import { camaraEnVivoPosible } from "./lente.js";

import * as Despierto from "./despierto.js";

import { crearEscena } from "./escena.js";

import { crearPieza, posicionEnMapa } from "./pieza.js";

import { crearMapaFinal } from "./mapa_final.js";

import * as Grabacion from "./grabacion.js";

import { guardarVideoEnGaleria } from "./galeria.js";

import { spriteCara } from "./render.js";

import * as Personaje from "./personaje.js";

import { lanzarPregunta } from "./pregunta.js";

const CLAVE = "mochi_final";

const ESTADO_INICIAL = {
    fase: "dormido",
    paso: 0,
    terminado: false,
    pedidoEn: null,
    empezoEn: null,
    siEn: null,
    armadoAutoHecho: false,
    videos: [],
    videoDelSi: null
};

let estado = {
    ...ESTADO_INICIAL
};

let ctx = null;

let sesion = null;

function cargarEstado() {
    try {
        const crudo = localStorage.getItem(CLAVE);
        if (crudo) {
            const leido = JSON.parse(crudo);
            if (leido.fase === "encontrado") leido.fase = "en_curso";
            estado = {
                ...estado,
                ...leido
            };
        }
    } catch (e) {}
}

function guardarEstado() {
    try {
        localStorage.setItem(CLAVE, JSON.stringify(estado));
    } catch (e) {}
}

export function estadoParaGuardar() {
    return {
        ...estado
    };
}

export function restaurarDesdeGuardado(desdeBackup, {forzar: forzar = false} = {}) {
    if (!desdeBackup || typeof desdeBackup !== "object") return;
    let propio = null;
    try {
        propio = localStorage.getItem(CLAVE);
    } catch (e) {}
    if (!propio || forzar) {
        estado = {
            ...estado,
            ...desdeBackup
        };
        guardarEstado();
    }
}

export const fase = () => estado.fase;

export const armada = () => estado.fase === "armado";

export const fotoPedida = () => estado.fase === "pedido";

export const dijoQueSi = () => estado.fase === "si";

export const fechaDelSi = () => estado.siEn;

export function armar() {
    if ([ "si", "en_curso" ].includes(estado.fase)) return;
    estado.fase = "armado";
    estado.paso = 0;
    guardarEstado();
}

export function desarmar() {
    if ([ "si", "en_curso" ].includes(estado.fase)) return;
    estado.fase = "dormido";
    guardarEstado();
}

export function reiniciarTodo() {
    const conservar = estado.fase === "si" ? {
        videos: estado.videos || [],
        videoDelSi: estado.videoDelSi || null
    } : {};
    if (sesion && !sesion.ensayo) cortarSesion();
    Grabacion.detener();
    estado = {
        ...ESTADO_INICIAL,
        videos: [],
        armadoAutoHecho: estado.armadoAutoHecho,
        ...conservar
    };
    guardarEstado();
}

export function revisarArmadoPorFecha(ahora = Date.now()) {
    if (!FINAL.armarDesde || estado.armadoAutoHecho || estado.fase !== "dormido") return false;
    const t = Date.parse(FINAL.armarDesde);
    if (Number.isNaN(t) || ahora < t) return false;
    estado.armadoAutoHecho = true;
    armar();
    return true;
}

export function tocaPedirSinGPS(ahora = Date.now()) {
    if (estado.fase !== "armado" || !FINAL.pedirSinGPSDesde) return false;
    const t = Date.parse(FINAL.pedirSinGPSDesde);
    return !Number.isNaN(t) && ahora >= t;
}

export function distanciaAlLugar(lat, lon) {
    const {lat: llat, lon: llon} = FINAL.lugar;
    const d = [ distanciaMetros(lat, lon, llat, llon) ];
    try {
        const [glat, glon] = wgsAGcj(llat, llon);
        d.push(distanciaMetros(lat, lon, glat, glon));
        const [plat, plon] = wgsAGcj(lat, lon);
        d.push(distanciaMetros(plat, plon, llat, llon));
    } catch (e) {}
    return Math.min(...d.filter(Number.isFinite));
}

export const HOLGURA_GPS_MAX = 100;

export function dentroDelLugar(lat, lon, precision = 0) {
    return distanciaAlLugar(lat, lon) - Math.min(Math.max(0, precision || 0), HOLGURA_GPS_MAX) <= FINAL.lugar.radioMetros;
}

export function posicionRecibida(lat, lon, precision = 0) {
    if (estado.fase !== "armado") return false;
    return dentroDelLugar(lat, lon, precision);
}

export function marcarPedido() {
    if (estado.fase !== "armado") return;
    estado.fase = "pedido";
    estado.pedidoEn = Date.now();
    guardarEstado();
}

export function hayQueRetomar() {
    return (estado.fase === "en_curso" || estado.fase === "si") && !estado.terminado;
}

export function iniciar(contexto) {
    ctx = contexto;
    cargarEstado();
    if (!iniciado) {
        iniciado = true;
        document.addEventListener("visibilitychange", (() => {
            if (document.visibilityState === "visible") setTimeout(vigilarGrabacion, 600);
        }));
        engancharSalidaEscondida();
    }
}

let iniciado = false;

const MS_SALIDA = 3e3;

const ESQUINA_PX = 76;

function salidaDisponible() {
    if (!ctx) return false;
    if (ctx.pantalla.querySelector(".lente")) return false;
    if (sesion) return !sesion.repeticion;
    return !!ctx.pantalla.querySelector("#escena-pedido, #final-retomar");
}

function engancharSalidaEscondida() {
    let timer = 0;
    let inicio = null;
    const cancelar = () => {
        clearTimeout(timer);
        timer = 0;
        inicio = null;
    };
    window.addEventListener("pointerdown", (e => {
        cancelar();
        if (!salidaDisponible()) return;
        if (e.clientX < window.innerWidth - ESQUINA_PX || e.clientY > ESQUINA_PX) return;
        inicio = {
            x: e.clientX,
            y: e.clientY
        };
        timer = setTimeout((() => {
            timer = 0;
            inicio = null;
            if (!salidaDisponible()) return;
            tragarProximoToque();
            vibrar(40);
            irAlDirectorEscondido();
        }), MS_SALIDA);
    }), {
        passive: true,
        capture: true
    });
    window.addEventListener("pointermove", (e => {
        if (inicio && Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) > 24) cancelar();
    }), {
        passive: true,
        capture: true
    });
    window.addEventListener("pointerup", cancelar, {
        passive: true,
        capture: true
    });
    window.addEventListener("pointercancel", cancelar, {
        passive: true,
        capture: true
    });
}

function tragarProximoToque() {
    const tragar = e => {
        if (e.clientX < window.innerWidth - ESQUINA_PX * 1.5 || e.clientY > ESQUINA_PX * 1.5) return;
        e.stopPropagation();
        e.preventDefault();
        window.removeEventListener("click", tragar, {
            capture: true
        });
    };
    window.addEventListener("click", tragar, {
        capture: true
    });
    setTimeout((() => window.removeEventListener("click", tragar, {
        capture: true
    })), 1500);
}

function irAlDirectorEscondido() {
    const ensayo = !!(sesion && sesion.ensayo);
    if (ensayo) {
        Grabacion.detener();
        cortarSesion();
        Musica.detener(.4);
        Despierto.soltar();
        ctx.abrirPin();
        return;
    }
    cortarSesion();
    Musica.detener(.4);
    ctx.abrirPin({
        alSalir: retomarDespuesDelDirector
    });
}

export function retomarDespuesDelDirector() {
    if (!ctx) return false;
    if (hayQueRetomar()) {
        pantallaRetomar();
        return true;
    }
    if (estado.fase === "pedido") {
        abrirPedido();
        return true;
    }
    return false;
}

export async function pausar() {
    if (![ "pedido", "en_curso" ].includes(estado.fase)) return false;
    const s = sesion;
    if (s && !s.ensayo) cortarSesion();
    await Grabacion.detener().catch((() => null));
    Musica.detener(.4);
    Despierto.soltar();
    estado.fase = "armado";
    estado.paso = 0;
    estado.terminado = false;
    guardarEstado();
    if (ctx) ctx.guardarTodo();
    return true;
}

function nombreDeElla() {
    const m = ctx.datos().mascota;
    return m && m.nombre || "";
}

const t = texto => conNombre(texto, nombreDeElla());

function esc(s) {
    return String(s ?? "").replace(/[&<>"]/g, (c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;"
    }[c])));
}

const CARAS = {
    euforico: [ "ojo_especial_euforico.png", "boca_especial_euforico.png" ],
    enamorado: [ "ojo_especial_enamorado.png", "boca_especial_enamorado.png" ],
    feliz: [ "ojo_base_energia_alta.png", "boca_base_feliz.png" ]
};

function cara(nombre) {
    const [ojo, boca] = CARAS[nombre] || CARAS.feliz;
    return spriteCara(ojo, boca);
}

export function abrirPedido({ensayo: ensayo = false} = {}) {
    Grabacion.soltarMicrofono();
    ctx.prepararVista("intro");
    if (!ensayo) marcarPedido();
    Sonido.sonar("descubrimiento");
    vibrar([ 30, 50, 30 ]);
    const lineas = FINAL.pedido.map(t).filter(Boolean);
    let i = 0;
    let escritor = null;
    ctx.pantalla.innerHTML = `\n    <div class="escena-dialogo escena-lago${enCuarto() ? ` escena-cuarto es-${momentoDelCuarto()}` : ""}" id="escena-pedido">\n      ${ensayo ? `<div class="sello-ensayo">REHEARSAL</div>` : ""}\n      <div class="dialogo-cara rebote">${cara("euforico")}</div>\n      <div class="caja-dialogo">\n        <div class="caja-dialogo-nombre">${Personaje.nombre().toUpperCase()}</div>\n        <div class="caja-dialogo-texto" id="pedido-texto"></div>\n        <div class="caja-dialogo-siguiente" id="pedido-siguiente"><i class="glifo g-der"></i></div>\n        <div class="caja-dialogo-acciones oculto" id="pedido-acciones">\n          <button class="boton" id="pedido-abrir"><i class="glifo g-camara"></i> Take the photo</button>\n        </div>\n      </div>\n    </div>`;
    const texto = ctx.pantalla.querySelector("#pedido-texto");
    const sig = ctx.pantalla.querySelector("#pedido-siguiente");
    const acciones = ctx.pantalla.querySelector("#pedido-acciones");
    const mostrar = () => {
        sig.classList.add("oculto");
        escritor = escribir(texto, lineas[i] || "", {
            alTerminar: () => {
                if (i >= lineas.length - 1) acciones.classList.remove("oculto"); else sig.classList.remove("oculto");
            }
        });
    };
    ctx.pantalla.querySelector("#escena-pedido").addEventListener("click", (e => {
        if (e.target.closest("button")) return;
        if (escritor && escritor.escribiendo()) {
            escritor.completar();
            return;
        }
        if (i < lineas.length - 1) {
            i += 1;
            Sonido.sonar("tocar");
            mostrar();
        }
    }));
    const abrir = ctx.pantalla.querySelector("#pedido-abrir");
    abrir.addEventListener("click", (() => {
        if (abrir.disabled) return;
        abrir.disabled = true;
        Despierto.mantener();
        Grabacion.asegurarPermisos().catch((() => false)).then((() => {
            if (ctx.pantalla.contains(abrir)) abrirSelfie({
                ensayo: ensayo
            });
        }));
    }));
    mostrar();
}

function abrirSelfie({ensayo: ensayo}) {
    Musica.precargar("propuesta");
    ctx.abrirLente({
        modo: "pedido",
        frontal: true,
        ensayo: ensayo,
        titulo: "US",
        alSalir: () => {
            if (ensayo) ctx.abrirDirector(); else abrirPedido();
        },
        alGuardar: foto => {
            if (!ensayo) {
                const {diario: diario} = ctx.datos();
                if (diario) diario.anotarFoto();
            }
            empezar({
                ensayo: ensayo,
                selfie: foto && foto.dataUrl
            });
        }
    });
}

export function empezar({ensayo: ensayo = false, selfie: selfie = null} = {}) {
    if (!ensayo) {
        estado.fase = "en_curso";
        estado.paso = 0;
        estado.terminado = false;
        estado.empezoEn = Date.now();
        guardarEstado();
        ctx.guardarTodo();
    }
    iniciarSecuencia({
        ensayo: ensayo,
        desde: 0,
        selfie: selfie
    });
}

function construirPasos({repeticion: repeticion = false} = {}) {
    const pasos = [ {
        tipo: "ventana"
    }, {
        tipo: "mapa"
    }, {
        tipo: "llegada"
    }, {
        tipo: "ella"
    }, {
        tipo: "el"
    }, {
        tipo: "dialogo"
    }, ...String(FINAL.pregunta || "").trim() ? [ {
        tipo: "pregunta"
    } ] : [], {
        tipo: "mirar"
    }, {
        tipo: "corazon"
    }, {
        tipo: "celebracion"
    }, {
        tipo: "foto"
    }, {
        tipo: "fin"
    } ];
    return repeticion ? pasos.filter((p => p.tipo !== "foto")) : pasos;
}

export function iniciarSecuencia({ensayo: ensayo = false, desde: desde = null, repeticion: repeticion = false, selfie: selfie = null} = {}) {
    const pasos = construirPasos({
        repeticion: repeticion
    });
    let i = desde ?? estado.paso ?? 0;
    i = Math.max(0, Math.min(pasos.length - 1, i));
    if (!ensayo && !repeticion && estado.fase === "si") {
        i = Math.max(i, pasos.findIndex((p => p.tipo === "celebracion")));
    }
    if (sesion) cortarSesion();
    Despierto.mantener();
    sesion = {
        pasos: pasos,
        i: i,
        ensayo: ensayo || repeticion,
        repeticion: repeticion,
        selfie: selfie,
        escritor: null,
        timers: [],
        bloqueadoHasta: 0
    };
    const pasoActual = pasos[i] && pasos[i].tipo;
    if (!repeticion && ![ "foto", "fin" ].includes(pasoActual)) grabar(sesion);
    if (!sesion.ensayo) sesion.vigia = setInterval(vigilarGrabacion, 5e3);
    ctx.prepararVista("final");
    mostrarPaso();
}

function grabar(s) {
    return Grabacion.empezar({
        ensayo: s.ensayo,
        alEmpezar: id => {
            if (s.ensayo) return;
            const lista = Array.isArray(estado.videos) ? estado.videos : [];
            if (!lista.includes(id)) estado.videos = [ ...lista, id ];
            guardarEstado();
        }
    }).catch((() => false));
}

function vigilarGrabacion() {
    const s = sesion;
    if (!s || s.ensayo || document.visibilityState !== "visible") return;
    const iFoto = s.pasos.findIndex((p => p.tipo === "foto"));
    if (iFoto >= 0 && s.i >= iFoto) return;
    if (Grabacion.grabando() || !Grabacion.camaraConcedida()) return;
    grabar(s);
}

export function pantallaRetomar() {
    if (sesion) cortarSesion();
    ctx.prepararVista("final");
    ctx.pantalla.innerHTML = `\n    <div class="final cine es-retomar" id="final-retomar" style="cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center">\n      <div class="corazon-grande"><img src="${arte("final/corazon_rosa.png")}" alt="" draggable="false" /></div>\n      <div class="texto-cine" id="retomar-texto" style="font-size:28px;margin-top:18px">Tap to continue ♥</div>\n    </div>`;
    const pantalla = ctx.pantalla.querySelector("#final-retomar");
    let tocado = false;
    pantalla.addEventListener("click", (() => {
        if (tocado) return;
        tocado = true;
        Despierto.mantener();
        Sonido.sonar("tocar");
        const texto = pantalla.querySelector("#retomar-texto");
        if (texto) texto.textContent = "♥";
        const pasos = construirPasos();
        let i = Math.max(0, Math.min(pasos.length - 1, estado.paso || 0));
        if (estado.fase === "si") i = Math.max(i, pasos.findIndex((p => p.tipo === "celebracion")));
        const vaAGrabar = ![ "foto", "fin" ].includes(pasos[i] && pasos[i].tipo);
        const listo = vaAGrabar ? Grabacion.asegurarPermisos().catch((() => false)) : Promise.resolve(false);
        listo.then((() => {
            if (ctx.pantalla.contains(pantalla)) iniciarSecuencia({});
        }));
    }));
}

export function empezarYa() {
    Despierto.mantener();
    Sonido.sonar("tocar");
    Musica.precargar("propuesta");
    return Grabacion.asegurarPermisos().catch((() => false)).then((() => empezar({})));
}

export const secuenciaEnCurso = () => !!sesion;

function cortarSesion() {
    if (!sesion) return;
    clearInterval(sesion.vigia);
    if (sesion.efectoPregunta) sesion.efectoPregunta.destruir();
    for (const tm of sesion.timers) clearTimeout(tm);
    if (sesion.escritor) sesion.escritor.cancelar();
    soltarEscena();
    sesion = null;
}

function soltarEscena() {
    if (!sesion) return;
    for (const k of [ "escena", "pieza", "mapa" ]) {
        if (sesion[k]) {
            sesion[k].destruir();
            sesion[k] = null;
        }
    }
}

function programar(fn, ms) {
    const s = sesion;
    const tm = setTimeout((() => {
        if (sesion === s) fn();
    }), ms);
    s.timers.push(tm);
}

function avanzar() {
    if (!sesion || sesion.i >= sesion.pasos.length - 1) return;
    for (const tm of sesion.timers) clearTimeout(tm);
    sesion.timers = [];
    if (sesion.escritor) sesion.escritor.cancelar();
    sesion.escritor = null;
    if (sesion.escena) sesion.escena.hablar("el", false);
    if (sesion.efectoPregunta) {
        const ef = sesion.efectoPregunta;
        sesion.efectoPregunta = null;
        if (enCuarto() && sesion.pasos[sesion.i + 1] && sesion.pasos[sesion.i + 1].tipo === "mirar") setTimeout((() => ef.destruir()), 2800); else ef.destruir();
    }
    sesion.i += 1;
    if (!sesion.ensayo) {
        estado.paso = sesion.i;
        guardarEstado();
    }
    mostrarPaso();
}

function mostrarPaso() {
    const paso = sesion.pasos[sesion.i];
    vigilarGrabacion();
    const trasElSi = [ "celebracion", "foto", "fin" ].includes(paso.tipo);
    if (paso.tipo === "ventana") Musica.detener(.3); else if (paso.tipo === "mapa") Musica.tocar("propuesta", {
        forzar: FINAL.musicaIgnoraSilencio,
        fadeIn: 1
    }); else Musica.tocar(trasElSi ? "si" : "propuesta", {
        forzar: FINAL.musicaIgnoraSilencio
    });
    ({
        ventana: pasoVentana,
        mapa: pasoMapa,
        llegada: pasoLlegada,
        ella: () => pasoEnfoque("ella"),
        el: () => pasoEnfoque("el"),
        dialogo: pasoDialogo,
        pregunta: pasoPregunta,
        mirar: pasoMirar,
        corazon: pasoCorazon,
        celebracion: pasoCelebracion,
        foto: pasoFoto,
        fin: pasoFin
    })[paso.tipo]();
}

function escenario(interior, clase = "") {
    soltarEscena();
    ctx.pantalla.innerHTML = `\n    <div class="final cine ${clase}" id="final-cine">\n      ${sesion.ensayo && !sesion.repeticion ? `<div class="sello-ensayo">REHEARSAL</div>` : ""}\n      ${interior}\n    </div>`;
    sesion.bloqueadoHasta = performance.now() + 500;
    return ctx.pantalla.querySelector("#final-cine");
}

function alTocar(el, fn) {
    el.addEventListener("click", (e => {
        if (!sesion || performance.now() < sesion.bloqueadoHasta) return;
        if (el.disabled) return;
        el.disabled = true;
        fn(e);
        setTimeout((() => el.disabled = false), 800);
    }));
}

const CARA_PIEZA = {
    normal: [ "ojo_base_energia_alta.png", "boca_base_feliz.png" ],
    sorprendido: [ "ojo_especial_sorprendido.png", "boca_especial_sorprendido.png" ],
    curioso: [ "ojo_especial_curioso.png", "boca_especial_curioso.png" ],
    euforico: [ "ojo_especial_euforico.png", "boca_especial_euforico.png" ],
    enamorado: [ "ojo_especial_enamorado.png", "boca_especial_enamorado.png" ]
};

function otraMascota() {
    return Personaje.actual() === "mantou" ? "baozi" : "mantou";
}

export const enCuarto = () => FINAL.escenario === "cuarto";

export function momentoDelCuarto(hora = (new Date).getHours()) {
    const m = FINAL.momentoCuarto;
    if (m === "atardecer" || m === "noche") return m;
    return hora >= 18 || hora < 5 ? "noche" : "atardecer";
}

export function lineaDelLago(hora = (new Date).getHours()) {
    if (enCuarto()) {
        if (hora >= 16 && hora < 18) return "The sun is going down behind the mountains…";
        return hora >= 18 || hora < 5 ? "The mountains look so pretty tonight…" : "The mountains look so pretty right now…";
    }
    return hora >= 16 && hora < 19 ? "The sun is going down over the lake…" : "The lake looks so pretty right now…";
}

function lineasVentana() {
    const suya = Personaje.nombre();
    const otra = Personaje.nombre(otraMascota());
    return [ {
        quien: otra,
        texto: "Knock knock! It's me!",
        cara: "curioso"
    }, {
        quien: otra,
        texto: lineaDelLago(),
        cara: "curioso"
    }, {
        quien: otra,
        texto: "Shall we go for a walk? Just the two of us ♥",
        cara: "enamorado"
    }, {
        quien: suya,
        texto: "Yes!! Let's go!",
        cara: "euforico"
    } ];
}

function pasoVentana() {
    const cine = escenario(`<div class="ventana-cuarto" id="ventana-cuarto"></div>\n     <div class="capa-paso">\n       <div class="caja-dialogo cine-dialogo oculto" id="ventana-caja">\n         <div class="caja-dialogo-nombre" id="ventana-quien"></div>\n         <div class="caja-dialogo-texto" id="ventana-texto"></div>\n         <div class="caja-dialogo-siguiente oculto" id="ventana-sig"><i class="glifo g-der"></i></div>\n       </div>\n     </div>`, "es-ventana");
    const guion = {
        npc: null,
        npcArte: null,
        cara: "normal",
        globo: ""
    };
    const base = ctx.estadoPieza ? ctx.estadoPieza : () => ({
        momento: "dia"
    });
    sesion.pieza = crearPieza(cine.querySelector("#ventana-cuarto"), {
        estado: () => {
            const [ojos, boca] = CARA_PIEZA[guion.cara] || CARA_PIEZA.normal;
            return {
                ...base(),
                dormido: false,
                farol: true,
                quieto: false,
                parpadea: guion.cara === "normal",
                avisos: [],
                anillo: false,
                ojos: ojos,
                boca: boca,
                npc: guion.npc,
                npcArte: guion.npcArte,
                globo: guion.globo,
                globoRosa: false
            };
        },
        alTocar: () => {}
    });
    sesion.pieza.raiz.id = "pieza-final";
    const lineas = lineasVentana();
    const caja = cine.querySelector("#ventana-caja");
    const quien = cine.querySelector("#ventana-quien");
    const texto = cine.querySelector("#ventana-texto");
    const sig = cine.querySelector("#ventana-sig");
    let i = -1;
    let timer = 0;
    let terminado = false;
    const siguiente = () => {
        clearTimeout(timer);
        if (i >= lineas.length - 1) {
            if (terminado) return;
            terminado = true;
            sig.classList.add("oculto");
            programar(avanzar, 1400);
            return;
        }
        i += 1;
        const l = lineas[i];
        guion.cara = l.cara;
        quien.textContent = l.quien.toUpperCase();
        caja.classList.remove("oculto");
        sig.classList.add("oculto");
        Sonido.sonar("tocar");
        sesion.escritor = escribir(texto, l.texto, {
            velocidad: MS_POR_LETRA,
            alTerminar: () => {
                sig.classList.remove("oculto");
                const s = sesion;
                timer = setTimeout((() => {
                    if (sesion === s) siguiente();
                }), Math.max(2600, 1200 + l.texto.length * 55));
                s.timers.push(timer);
            }
        });
    };
    programar((() => {
        guion.npc = `pareja_${otraMascota()}`;
        guion.npcArte = `final/ventana_${otraMascota()}.png`;
        guion.cara = "sorprendido";
        guion.globo = "!";
        Sonido.sonar("encuentro");
        vibrar(30);
        sesion.pieza.plan("visita");
    }), 1800);
    programar((() => {
        guion.globo = "";
        siguiente();
    }), 1800 + 3600);
    cine.querySelector(".capa-paso").addEventListener("click", (() => {
        if (!sesion || performance.now() < sesion.bloqueadoHasta || i < 0) return;
        if (sesion.escritor && sesion.escritor.escribiendo()) sesion.escritor.completar(); else siguiente();
    }));
}

function pasoMapa() {
    const cine = escenario(`<div class="mundo-lago" id="mundo-mapa"></div>\n     <div class="bandas-cine" aria-hidden="true"></div>\n     <div class="rotulo-mapa oculto" id="rotulo-mapa">West Lake</div>\n     <div class="velo-salida" id="velo-mapa"></div>`, "es-mapa");
    const lugar = FINAL.lugar || {};
    if (enCuarto()) {
        const RUTA = [ [ .3756, .6929 ], [ .3781, .64 ], [ .3844, .5733 ], [ .3937, .5067 ], [ .4, .44 ], [ .3969, .3867 ], [ .3844, .3333 ], [ .3719, .2933 ], [ .3625, .2533 ], [ .375, .2267 ], [ .35, .2067 ], [ .3688, .1867 ], [ .3438, .1667 ], [ .3531, .1467 ] ].map((([x, y]) => ({
            x: x,
            y: y
        })));
        sesion.mapa = crearMapaFinal(cine.querySelector("#mundo-mapa"), {
            casa: RUTA[0],
            destino: RUTA[RUTA.length - 1],
            imagen: "final/cuarto/mapa_dongming.png",
            ruta: RUTA
        });
    } else {
        const destino = Number.isFinite(lugar.lat) && Number.isFinite(lugar.lon) ? posicionEnMapa(lugar.lat, lugar.lon) : {
            x: .44,
            y: .47
        };
        sesion.mapa = crearMapaFinal(cine.querySelector("#mundo-mapa"), {
            casa: {
                x: .8,
                y: .3
            },
            destino: destino
        });
    }
    const RECORRIDO = 3600;
    const ZOOM = 3800;
    sesion.mapa.recorrer(RECORRIDO);
    programar((() => sesion.mapa.acercar(ZOOM)), RECORRIDO - 400);
    programar((() => {
        const r = cine.querySelector("#rotulo-mapa");
        r.textContent = lugar.nombre || "West Lake";
        r.classList.remove("oculto");
    }), RECORRIDO - 400 + ZOOM - 600);
    programar((() => cine.querySelector("#velo-mapa").classList.add("cerrando")), RECORRIDO - 400 + ZOOM + 1800);
    programar(avanzar, RECORRIDO - 400 + ZOOM + 2700);
}

function escenaDelLago(tipo, {boteAfuera: boteAfuera = false, plano: plano = "general"} = {}) {
    const cine = ctx.pantalla.querySelector("#final-cine.es-lago");
    if (cine && sesion.escena && sesion.escena.vivo()) {
        cine.className = `final cine es-lago es-${tipo}${enCuarto() ? " es-cuarto" : ""}`;
        cine.querySelectorAll(".capa-paso").forEach((n => {
            if (enCuarto() && !n.classList.contains("saliendo")) {
                n.classList.add("saliendo");
                setTimeout((() => n.remove()), 2800);
            } else if (!enCuarto()) n.remove();
        }));
        sesion.bloqueadoHasta = performance.now() + 500;
        if (tipo !== "llegada" && tipo !== "ella") sesion.escena.forzar("ella");
        if (tipo !== "llegada" && tipo !== "ella" && tipo !== "el") sesion.escena.forzar("el");
        return {
            cine: cine,
            escena: sesion.escena
        };
    }
    const nuevo = escenario(`<div class="mundo-lago" id="mundo-lago"></div>\n     <div class="bandas-cine" aria-hidden="true"></div>`, `es-lago es-${tipo}${enCuarto() ? " es-cuarto" : ""}`);
    const formas = {
        ella: ![ "llegada", "ella" ].includes(tipo),
        el: ![ "llegada", "ella", "el" ].includes(tipo)
    };
    if (!sesion.momentoCuarto) sesion.momentoCuarto = momentoDelCuarto();
    sesion.escena = crearEscena(nuevo.querySelector("#mundo-lago"), {
        ojosElla: FINAL.ojosDeElla,
        boteAfuera: boteAfuera,
        plano: plano,
        formas: formas,
        escenario: enCuarto() ? "cuarto" : "lago",
        momento: sesion.momentoCuarto
    });
    return {
        cine: nuevo,
        escena: sesion.escena
    };
}

function capa(cine, html) {
    const d = document.createElement("div");
    d.className = "capa-paso";
    d.innerHTML = html;
    cine.appendChild(d);
    return d;
}

function pasoLlegada() {
    if (enCuarto()) {
        const {cine: cine, escena: escena} = escenaDelLago("llegada", {
            plano: "ventanal"
        });
        escena.mover("ventanal", 0);
        if (sesion.selfie) capa(cine, `<img class="selfie-que-se-funde" src="${sesion.selfie}" alt="" />`);
        programar((() => escena.mover("general", 5e3)), 2200);
        programar((() => escena.mover("pareja", 2600)), 2200 + 5e3 + 600);
        programar(avanzar, 2200 + 5e3 + 600 + 2900);
        return;
    }
    const {cine: cine, escena: escena} = escenaDelLago("llegada", {
        boteAfuera: true
    });
    escena.mover("general", 0);
    if (sesion.selfie) capa(cine, `<img class="selfie-que-se-funde" src="${sesion.selfie}" alt="" />`);
    programar((() => escena.entrarBote(5600)), 900);
    programar((() => escena.mover("pareja", 2600)), 900 + 5e3);
    programar(avanzar, 900 + 5e3 + 2900);
}

const MS_TRANSFORMAR = 1600;

function pasoEnfoque(quien) {
    const {escena: escena} = escenaDelLago(quien);
    const viaje = quien === "ella" ? 2600 : 1900;
    const antes = 700;
    const quieto = quien === "ella" ? 3e3 : 2800;
    escena.mover(quien, viaje);
    programar((() => {
        Sonido.sonar("hallazgo");
        escena.transformar(quien, MS_TRANSFORMAR);
    }), viaje + antes);
    escena.parpadear(quien, viaje + antes + MS_TRANSFORMAR + 900);
    programar(avanzar, viaje + antes + MS_TRANSFORMAR + quieto);
}

const MS_POR_LETRA = 45;

function msDeLectura(texto) {
    const palabras = texto.split(/\s+/).filter(Boolean).length;
    return Math.max(7e3, 2 * (1400 + palabras * 380));
}

function duracionDelDialogo(lineas) {
    return lineas.reduce(((total, l) => total + l.length * MS_POR_LETRA + msDeLectura(l)), 0);
}

function lineasDeLaCarta(ensayo) {
    return FINAL.carta.map(t).filter(Boolean).filter((l => ensayo || !esRelleno(l)));
}

const esRelleno = l => /^\s*TODO/i.test(l);

function pasoDialogo() {
    const lineas = lineasDeLaCarta(sesion.ensayo && !sesion.repeticion);
    const nombre = (FINAL.nombreDeEl || "").trim();
    const {cine: cine, escena: escena} = escenaDelLago("dialogo");
    const duracion = duracionDelDialogo(lineas);
    escena.mover("dialogo", 2200, (() => escena.mover("dialogo-cerca", Math.max(3e4, duracion), null, (x => x))));
    const capaDialogo = capa(cine, lineas.length ? `<div class="caja-dialogo cine-dialogo">\n           ${nombre ? `<div class="caja-dialogo-nombre">${esc(nombre.toUpperCase())}</div>` : ""}\n           <div class="caja-dialogo-texto" id="dialogo-texto"></div>\n           <div class="caja-dialogo-siguiente oculto" id="dialogo-siguiente"><i class="glifo g-der"></i></div>\n         </div>` : "");
    let lineasTerminadas = lineas.length === 0;
    let saliendo = false;
    const quizasSeguir = () => {
        if (lineasTerminadas && !saliendo) {
            saliendo = true;
            programar(avanzar, 2200);
        }
    };
    if (lineas.length) {
        const texto = cine.querySelector("#dialogo-texto");
        const sig = cine.querySelector("#dialogo-siguiente");
        let i = 0;
        let timerLinea = 0;
        const siguienteLinea = () => {
            clearTimeout(timerLinea);
            if (i >= lineas.length - 1) {
                lineasTerminadas = true;
                sig.classList.add("oculto");
                quizasSeguir();
                return;
            }
            i += 1;
            mostrarLinea();
        };
        const mostrarLinea = () => {
            sig.classList.add("oculto");
            escena.hablar("el", true);
            sesion.escritor = escribir(texto, lineas[i], {
                velocidad: MS_POR_LETRA,
                alTerminar: () => {
                    escena.hablar("el", false);
                    sig.classList.remove("oculto");
                    const s = sesion;
                    timerLinea = setTimeout((() => {
                        if (sesion === s) siguienteLinea();
                    }), msDeLectura(lineas[i]));
                    s.timers.push(timerLinea);
                }
            });
        };
        capaDialogo.addEventListener("click", (() => {
            if (!sesion || performance.now() < sesion.bloqueadoHasta) return;
            if (sesion.escritor && sesion.escritor.escribiendo()) sesion.escritor.completar(); else if (!lineasTerminadas) siguienteLinea();
        }));
        programar(mostrarLinea, 2400);
    } else {
        quizasSeguir();
    }
}

function pasoPregunta() {
    const {cine: cine, escena: escena} = escenaDelLago("pregunta");
    escena.hablar("el", false);
    escena.mover(enCuarto() ? "pregunta" : "general", 3600);
    const c = capa(cine, `<div class="velo-cielo"></div>`);
    let efecto = null;
    const empezarEfecto = () => {
        efecto = lanzarPregunta(c, t(FINAL.pregunta), {
            estilo: FINAL.preguntaEstilo,
            lados: enCuarto(),
            alFormar: () => programar(avanzar, 9e3)
        });
        sesion.efectoPregunta = efecto;
    };
    programar(empezarEfecto, 1400);
    c.addEventListener("click", (() => {
        if (!sesion || performance.now() < sesion.bloqueadoHasta || !efecto) return;
        efecto.completar();
    }));
}

function pasoMirar() {
    const escribirMirar = cine => {
        const caja = cine.querySelector("#texto-mirar");
        sesion.escritor = escribir(caja, t(FINAL.mirarArriba), {
            velocidad: 90,
            alTerminar: () => programar(avanzar, 3400)
        });
    };
    const lago = ctx.pantalla.querySelector("#final-cine.es-lago");
    if (lago && sesion.escena && sesion.escena.vivo()) {
        const {cine: cine, escena: escena} = escenaDelLago("mirar");
        escena.mover("general", 3600);
        const anterior = sesion.pasos[sesion.i - 1];
        capa(cine, `<div class="velo-noche ${anterior && anterior.tipo === "pregunta" ? "desde-noche" : ""}"></div><div class="texto-cine" id="texto-mirar"></div>`);
        programar((() => escribirMirar(cine)), 3e3);
        return;
    }
    escribirMirar(escenario(`<div class="texto-cine" id="texto-mirar"></div>`, "es-mirar"));
}

function pasoCorazon() {
    const cine = escenario(`\n    <div class="corazon-grande">\n      <img src="${arte("final/corazon_rosa.png")}" alt="" draggable="false" />\n    </div>`, "es-corazon");
    vibrar([ 60, 80, 60 ]);
    const bloqueo = performance.now() + 4e3;
    const corazon = cine.querySelector(".corazon-grande img") || cine.querySelector(".corazon-grande");
    let hecho = false;
    cine.addEventListener("click", (e => {
        if (!sesion || hecho || performance.now() < bloqueo) return;
        if (!tocaElCorazon(corazon, e)) return;
        hecho = true;
        dijoSi();
    }));
}

export function tocaElCorazon(el, e) {
    if (!el || !e || typeof e.clientX !== "number") return true;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return true;
    const mx = Math.max(48, r.width * .5);
    const my = Math.max(48, r.height * .5);
    return e.clientX >= r.left - mx && e.clientX <= r.right + mx && e.clientY >= r.top - my && e.clientY <= r.bottom + my;
}

function dijoSi() {
    if (!sesion.ensayo && estado.fase !== "si") {
        estado.fase = "si";
        estado.siEn = Date.now();
        estado.terminado = false;
        const lista = Array.isArray(estado.videos) ? estado.videos : [];
        estado.videoDelSi = Grabacion.idActual() || lista[lista.length - 1] || null;
        const {diario: diario} = ctx.datos();
        if (diario) diario.anotarHito("The day you said yes ♥");
        ctx.guardarTodo();
    }
    vibrar([ 60, 40, 60, 40, 200 ]);
    avanzar();
}

function lienzoPapel(interior, clase) {
    soltarEscena();
    ctx.pantalla.innerHTML = `\n    <div class="final papel ${clase}" id="final-papel">\n      ${sesion.ensayo && !sesion.repeticion ? `<div class="sello-ensayo">REHEARSAL</div>` : ""}\n      ${interior}\n    </div>`;
    sesion.bloqueadoHasta = performance.now() + 500;
    return ctx.pantalla.querySelector("#final-papel");
}

function lluviaDeCorazones(contenedor, cantidad = 36) {
    const capa = document.createElement("div");
    capa.className = "lluvia-corazones";
    for (let k = 0; k < cantidad; k++) {
        const img = document.createElement("img");
        img.src = arte(k % 3 === 0 ? "final/corazon_rojo.png" : "final/corazon_rosa.png");
        img.alt = "";
        img.style.left = `${Math.random() * 100}%`;
        img.style.animationDelay = `${(Math.random() * 2.6).toFixed(2)}s`;
        img.style.animationDuration = `${(2.6 + Math.random() * 2).toFixed(2)}s`;
        img.style.setProperty("--escala", String(2 + Math.floor(Math.random() * 3)));
        img.style.setProperty("--vaiven", `${Math.round(Math.random() * 40 - 20)}px`);
        capa.appendChild(img);
    }
    contenedor.appendChild(capa);
}

const KAOMOJI = "༼ つ ◕_◕ ༽つ";

const KAOMOJI_SVG = `<svg class="kaomoji" viewBox="0 0 50 12" role="img" aria-label="${KAOMOJI}" shape-rendering="crispEdges"><path fill="currentColor" d="M2 0h2v1h-2zM40 0h2v1h-2zM1 1h1v1h-1zM4 1h1v1h-1zM39 1h1v1h-1zM42 1h1v1h-1zM1 2h1v1h-1zM18 2h3v1h-3zM31 2h3v1h-3zM42 2h1v1h-1zM0 3h1v1h-1zM17 3h1v1h-1zM20 3h2v1h-2zM30 3h1v1h-1zM33 3h2v1h-2zM43 3h1v1h-1zM0 4h1v1h-1zM8 4h4v1h-4zM16 4h1v1h-1zM20 4h3v1h-3zM29 4h1v1h-1zM33 4h3v1h-3zM43 4h1v1h-1zM45 4h4v1h-4zM0 5h1v1h-1zM12 5h1v1h-1zM16 5h7v1h-7zM29 5h7v1h-7zM43 5h1v1h-1zM49 5h1v1h-1zM0 6h1v1h-1zM12 6h1v1h-1zM16 6h7v1h-7zM29 6h7v1h-7zM43 6h1v1h-1zM49 6h1v1h-1zM0 7h1v1h-1zM11 7h1v1h-1zM17 7h5v1h-5zM30 7h5v1h-5zM43 7h1v1h-1zM48 7h1v1h-1zM0 8h1v1h-1zM8 8h3v1h-3zM18 8h3v1h-3zM31 8h3v1h-3zM43 8h1v1h-1zM45 8h3v1h-3zM1 9h1v1h-1zM24 9h4v1h-4zM42 9h1v1h-1zM1 10h1v1h-1zM42 10h1v1h-1zM2 11h2v1h-2zM40 11h2v1h-2z"/></svg>`;

const conKaomoji = html => html.replace(/༼\s*つ\s*◕_◕\s*༽\s*つ/gu, KAOMOJI_SVG);

function pasoCelebracion() {
    const [l1, l2] = (FINAL.celebracion || []).map(t);
    const papel = lienzoPapel(`\n    <div class="final-cara salto">${cara("euforico")}</div>\n    <div class="celebracion-grande">${conKaomoji(esc(l1 || "♥"))}</div>\n    ${l2 ? `<div class="final-texto">${conKaomoji(esc(l2))}</div>` : ""}\n    <button class="boton oculto" id="celebracion-seguir">Continue</button>`, "es-celebracion");
    lluviaDeCorazones(papel);
    const seguir = papel.querySelector("#celebracion-seguir");
    programar((() => seguir.classList.remove("oculto")), 3500);
    alTocar(seguir, avanzar);
}

function pasoFoto() {
    const papel = lienzoPapel(`\n    <div class="final-cara">${cara("enamorado")}</div>\n    <div class="final-texto">${esc(t(FINAL.fotoConAnillo))}</div>\n    <div class="fila-botones">\n      <button class="boton boton-fantasma" id="foto-despues">Later</button>\n      <button class="boton" id="foto-sacar"><i class="glifo g-camara"></i> Take it</button>\n    </div>`, "es-foto");
    alTocar(papel.querySelector("#foto-despues"), avanzar);
    alTocar(papel.querySelector("#foto-sacar"), (() => {
        const s = sesion;
        Grabacion.detener();
        ctx.abrirLente({
            modo: "foto",
            frontal: true,
            tipoFoto: "final",
            ensayo: s.ensayo,
            titulo: "US ♥",
            alGuardar: foto => {
                s.fotoFinal = foto && foto.dataUrl;
                const {diario: diario} = ctx.datos();
                if (!s.ensayo && diario) {
                    diario.anotarFoto();
                    ctx.guardarTodo();
                }
                ctx.prepararVista("final");
                avanzar();
            },
            alSalir: () => {
                ctx.prepararVista("final");
                mostrarPaso();
            }
        });
    }));
}

function pasoFin() {
    const fecha = fechaLegible(claveDelDia(new Date(estado.siEn || Date.now())));
    const finales = todasLasFotos().filter((f => f.tipo === "final"));
    const foto = sesion.fotoFinal || ((!sesion.ensayo || sesion.repeticion) && finales.length ? finales[finales.length - 1].dataUrl : null) || sesion.selfie;
    const papel = lienzoPapel(`\n    ${foto ? `<figure class="polaroid-final dorada fija"><img src="${foto}" alt="" draggable="false" /><figcaption>${esc(fecha)}</figcaption></figure>` : `<img class="final-bote-fin${enCuarto() ? " en-cuarto" : ""}" src="${arte(enCuarto() ? "final/cuarto/fin_mascotas.png" : "final/bote_mascotas.png")}" alt="" draggable="false" /><div class="final-rotulo">${esc(fecha)}</div>`}\n    <div class="final-texto">Let's remember this day forever.</div>\n    <div class="fila-botones">\n      <button class="boton boton-fantasma boton-galeria oculto" id="fin-video" type="button">Save our video</button>\n      <button class="boton" id="fin-casa"><i class="glifo g-corazon"></i> Home</button>\n    </div>`, "es-fin");
    alTocar(papel.querySelector("#fin-casa"), terminar);
    if (!sesion.repeticion) {
        const s = sesion;
        const ensayo = s.ensayo;
        Grabacion.detener().then((() => ensayo ? Grabacion.ultimoVideo({
            ensayo: true
        }).then((v => v ? [ {
            ...v,
            principal: true
        } ] : [])) : videosDelSi())).then((vs => {
            const b = papel.querySelector("#fin-video");
            if (!vs || !vs.length || !b || sesion !== s) return;
            const principal = vs.find((v => v.principal)) || vs[0];
            if (ensayo) b.textContent = "Save the test video";
            b.classList.remove("oculto");
            b.addEventListener("click", (() => guardarVideoEnGaleria(principal.blob, ensayo ? "ensayo-video" : "nuestro-video")));
            const otros = vs.filter((v => v !== principal));
            if (otros.length) {
                const extra = document.createElement("button");
                extra.className = "boton boton-fantasma boton-galeria";
                extra.type = "button";
                extra.id = "fin-video-otros";
                extra.textContent = otros.length === 1 ? "+1 more clip" : `+${otros.length} more clips`;
                let k = 0;
                extra.addEventListener("click", (() => {
                    const v = otros[k % otros.length];
                    k += 1;
                    guardarVideoEnGaleria(v.blob, `nuestro-video-${k + 1}`);
                    if (otros.length > 1) extra.textContent = k < otros.length ? `Next clip (${k + 1}/${otros.length})` : "All clips saved ♥";
                }));
                b.after(extra);
            }
        })).catch((() => {}));
    }
}

export async function videosDelSi() {
    let lista = [];
    try {
        const ids = Array.isArray(estado.videos) ? estado.videos : [];
        lista = await Grabacion.videosPorId(ids);
        if (!lista.length && estado.empezoEn) lista = await Grabacion.videosDesde(estado.empezoEn - 6e4);
        if (!lista.length) {
            const v = await Grabacion.ultimoVideo();
            if (v) lista = [ v ];
        }
    } catch (e) {
        return [];
    }
    lista.sort(((a, b) => (a.empezo || 0) - (b.empezo || 0)));
    let principal = lista.find((v => v.id && v.id === estado.videoDelSi));
    if (!principal) principal = lista.reduce(((m, v) => !m || v.blob.size > m.blob.size ? v : m), null);
    return lista.map(((v, k) => ({
        ...v,
        principal: v === principal,
        parte: k + 1
    })));
}

function terminar() {
    Grabacion.detener();
    const ensayo = sesion && sesion.ensayo;
    const repeticion = sesion && sesion.repeticion;
    cortarSesion();
    Musica.detener(1.2);
    Despierto.soltar();
    if (repeticion) {
        ctx.volverACasa();
        return;
    }
    if (ensayo) {
        ctx.abrirDirector();
        return;
    }
    estado.terminado = true;
    guardarEstado();
    ctx.guardarTodo();
    ctx.volverACasa();
}

export function repetir() {
    iniciarSecuencia({
        repeticion: true,
        desde: 0
    });
}

export function pinCorrecto(pin) {
    return String(pin) === String(FINAL.pin);
}

function standalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

async function almacenamientoPersistente() {
    try {
        return navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : false;
    } catch (e) {
        return false;
    }
}

async function permisoUbicacion() {
    try {
        if (!navigator.permissions) return "desconocido";
        const r = await navigator.permissions.query({
            name: "geolocation"
        });
        return r.state;
    } catch (e) {
        return "desconocido";
    }
}

export async function chequeos({sonidoHabilitado: sonidoHabilitado}) {
    const persistente = await almacenamientoPersistente();
    const gps = await permisoUbicacion();
    const permisos = await Grabacion.detallePermisos();
    const video = await Grabacion.estadoPermisos();
    const txt = e => ({
        granted: "allowed",
        denied: "DENIED",
        prompt: "not asked yet",
        desconocido: "unknown",
        "sin-soporte": "not supported"
    }[e] || e);
    const lineas = FINAL.carta.filter((l => l && !esRelleno(l))).length;
    const relleno = FINAL.carta.filter((l => l && esRelleno(l))).length;
    return [ [ camaraEnVivoPosible(), camaraEnVivoPosible() ? "Live camera available" : "No live camera here (will use the camera app)" ], [ gps === "granted", gps === "granted" ? "Location allowed" : gps === "denied" ? "Location DENIED — use 'Ask for the photo now'" : "Location not asked yet (the corkboard map asks for it)" ], [ video === "granted", video === "sin-soporte" ? "This browser can't record video" : `Video: camera ${txt(permisos.camara)}, mic ${txt(permisos.microfono)}` + (video === "granted" ? "" : video === "denied" ? " — allow them in the phone settings" : " — tap 'Allow camera + mic' and 'Test video (5 s)'") ], (() => {
        const p = Grabacion.ultimaPruebaMic();
        if (!p) return [ false, "Mic not tested yet — tap 'Allow microphone' and talk" ];
        const cuando = claveDelDia(new Date(p.t)) === claveDelDia(new Date) ? "today" : "on another day — test again today";
        return [ p.ok && cuando === "today", p.ok ? `Mic test: sound OK (${cuando})` : "Mic test FAILED — tap 'Allow microphone'" ];
    })(), [ standalone(), standalone() ? "Installed on the home screen" : "Not installed — add to home screen" ], [ persistente, persistente ? "Storage is protected" : "Storage not protected yet" ], [ true, sonidoHabilitado ? "Sound on" : "Sound off (the ending plays music anyway)" ], [ !!nombreDeElla(), nombreDeElla() ? `Her name: ${nombreDeElla()}` : "No name set" ], [ lineas > 0 && !relleno, lineas ? `Your dialogue: ${lineas} lines${relleno ? ` (+${relleno} placeholders, only in rehearsal)` : ""}` : relleno ? `Your dialogue: only ${relleno} placeholders (they don't show on the real day)` : "Your dialogue is empty (only music)" ], [ estado.fase !== "armado", `GPS trigger: ${Math.round(FINAL.lugar.radioMetros)} m around ${FINAL.lugar.nombre} (+ up to ${HOLGURA_GPS_MAX} m GPS error) — ` + (estado.fase === "armado" ? "ARMED: it can start by itself there" : "only works when armed. Not armed = only you can start it") ], [ FINAL.pin !== "0000", FINAL.pin !== "0000" ? "PIN changed" : "PIN is still 0000" ], [ true, "Hidden exit: hold the top-right corner 3 s (photo request or sequence) → PIN" ], [ false, "On the day: Auto-Lock → Never, Low Power off, volume up" ] ];
}

export function descripcionFase() {
    return {
        dormido: "Not armed — only you can start it (GPS does nothing). Use 'Start the sequence now' when you're ready.",
        armado: `ARMED — when she opens Baozi within ${Math.round(FINAL.lugar.radioMetros)} m of ${FINAL.lugar.nombre}, Baozi asks for a photo of you two. Disarm to keep it manual.`,
        pedido: "Baozi already asked for the photo — waiting for her selfie.",
        en_curso: "The ending is in progress (recording). 'Pause' goes back to armed and keeps the video.",
        si: `She said yes ♥ ${estado.siEn ? fechaLegible(claveDelDia(new Date(estado.siEn))) : ""}`
    }[estado.fase];
}
