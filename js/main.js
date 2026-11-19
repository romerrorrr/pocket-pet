import { PetState, estadoCara, especialPorEstado } from "./petState.js";

import * as Personaje from "./personaje.js";

import { iniciarJuego, Volante } from "./juego.js";

import { RegistroNPCs, RegistroLugares, LUGARES, NPCS, VECES_PARA_ENAMORADO, SELLOS_PROPIOS, MAX_LUGARES_DE_ELLA, ponerLugaresDeElla, lugarDeEllaValido } from "./mundo.js";

import * as storage from "./storage.js";

import { ejecutarItemMenu, ControladorVistas, MOTIVOS_ACCION_FALLIDA } from "./gameController.js";

import * as R from "./render.js";

import * as Sensores from "./sensores.js";

import { vibrar } from "./actuadores.js";

import * as Sonido from "./sonido.js";

import * as Musica from "./musica.js";

import { Diario, claveDelDia, claveDelDiaLogico, fechaLegible, ANIMOS, preguntaDelDia } from "./diario.js";

import { cartaPendiente, cartaAtrasada, buscarCarta } from "./cartas.js";

import * as Camara from "./camara.js";

import { abrirLente } from "./lente.js";

import * as Final from "./final.js";

import * as Director from "./director.js";

import { escribir, conNombre } from "./dialogo.js";

import { arte } from "./arte.js";

import { FINAL, FECHAS, DESEOS_PROPIOS, MUDANZA } from "./config.js";

import { Deseos } from "./deseos.js";

import { crearPieza, posicionEnMapa, dentroDelDibujo, ponerCuarto } from "./pieza.js";

import * as Clima from "./clima.js";

import { RegistroAmigos, LUGARES_SECRETOS, lugarCercano, progresoDe, registrarAccesoriosExtra } from "./amigos.js";

import { Tienda, porId as productoTienda } from "./tienda.js";

import { leerRecord } from "./juego.js";

import { iniciarPesca, leerRecordPesca, PECES, pezPorId } from "./pesca.js";

import { iniciarTorre, leerRecordTorre } from "./torre.js";

import { Restaurante, abrirRestaurante, RECETAS as RECETAS_REST } from "./restaurante.js";

import { iniciarFaroles, leerRecordFaroles } from "./faroles.js";

import { iniciarRitmo } from "./ritmo.js";

import { iniciarTejo, leerRecordTejo } from "./tejo.js";

import * as Galeria from "./galeria.js";

import * as Grabacion from "./grabacion.js";

import * as Donde from "./dondeEstuvimos.js";

import * as MapaDia from "./mapaDia.js";

import * as Corcho from "./corchoReal.js";

import { crearVisor } from "./visorMapa.js";

import * as Fechas from "./fechas.js";

import { Jardin, PLANTAS as PLANTAS_JARDIN, SEMILLAS_DE_REGALO } from "./jardin.js";

import { abrirDecorar } from "./decorar.js";

import { limpiarCuaderno } from "./estiloDiario.js";

import { Palabras, PALABRAS, decirEnVoz, hayVoz } from "./palabras.js";

import { tieneSticker, srcStickerLugar, cuantosTiene } from "./album.js";

import { resumenDelMes, abrirLibrito, mesDe, mesAnterior, nombreDelMes } from "./nuestroMes.js";

const NOMBRE_POR_DEFECTO = "friend";

const DURACION_ESPECIAL_MS = 3e3;

const DURACION_FEEDBACK_MS = 1600;

const COOLDOWN_ESPECIAL_ESTADO_MS = 3e4;

const COMIDA_REL = [ "comida/comida_manzana.png", "comida/comida_naranja.png", "comida/comida_grillo1.png", "comida/comida_grillo2.png", "comida/comida_grillo3.png" ];

const screenEl = document.getElementById("screen");

const tabbarEl = document.getElementById("tabbar");

const marcoEl = document.querySelector(".marco-manito");

const VISTAS_SIN_MARGEN = new Set([ "intro", "escribir", "pasos", "deseo", "juegos", "pesca", "mudanza", "elegir", "huevo", "nombre", "feedback", "cara", "descubrimiento", "lugarcerca", "encuentro", "carta", "final", "lente", "caminar", "heladera", "mapa", "sello", "postal", "consulta", "mapadia", "torre", "ritmo", "tejo", "fechas", "jardin", "decorar", "palabra", "mes", "sobremes", "restaurante", "faroles" ]);

const VISTAS_CON_TABBAR = new Set([]);

const veloEl = document.getElementById("velo-transicion");

const DURACION_VELO_MS = 130;

const VISTAS_EN_VERTICAL = new Set([ "final" ]);

function actualizarMarco() {
    if (!marcoEl) return;
    marcoEl.classList.add("pantalla-completa");
    document.body.classList.toggle("permite-vertical", VISTAS_EN_VERTICAL.has(controller.vista));
}

function guardarTodo() {
    if (!mascota) return false;
    return storage.guardar(mascota, npcsReg, lugaresReg, diario, cartasEntregadas, {
        final: Final.estadoParaGuardar(),
        personaje: Personaje.actual(),
        amigos: amigos.aObjeto(),
        tienda: tienda.aObjeto(),
        deseos: deseos.aObjeto(),
        pesca: pescaReg,
        mudanza: mudanza,
        lugaresPropios: lugaresDeElla,
        fechasPropias: fechasDeElla,
        jardin: jardin.aObjeto(),
        cuaderno: estiloCuaderno,
        palabras: palabras.aObjeto(),
        meses: mesesReg,
        restaurante: restauranteReg.aObjeto()
    });
}

const SW_BUSCAR_CADA_MS = 6 * 60 * 60 * 1e3;

const SW_APLICAR_TRAS_MS = 30 * 60 * 1e3;

function momentoTranquiloParaActualizar() {
    return !!mascota && controller.vista === "cara" && !lenteAbierto && !finalOcupado() && !Final.secuenciaEnCurso();
}

function registrarServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (!location.protocol.startsWith("http")) return;
    window.addEventListener("load", (() => {
        navigator.serviceWorker.register("sw.js", {
            updateViaCache: "none"
        }).then((reg => {
            if (!reg) return;
            let ultimaBusqueda = Date.now();
            let guardadaDesde = 0;
            let pedimosActivar = false;
            const recargar = () => {
                if (pedimosActivar === "recargando") return;
                pedimosActivar = "recargando";
                location.reload();
            };
            navigator.serviceWorker.addEventListener("controllerchange", (() => {
                if (pedimosActivar) recargar();
            }));
            document.addEventListener("visibilitychange", (() => {
                if (document.visibilityState === "hidden") {
                    guardadaDesde = Date.now();
                    return;
                }
                const largaPausa = guardadaDesde && Date.now() - guardadaDesde >= SW_APLICAR_TRAS_MS;
                guardadaDesde = 0;
                if (reg.waiting && largaPausa && !pedimosActivar && momentoTranquiloParaActualizar()) {
                    pedimosActivar = true;
                    guardarTodo();
                    reg.waiting.postMessage({
                        tipo: "activar"
                    });
                    setTimeout(recargar, 4e3);
                    return;
                }
                if (Date.now() - ultimaBusqueda >= SW_BUSCAR_CADA_MS) {
                    ultimaBusqueda = Date.now();
                    reg.update().catch((() => {}));
                }
            }));
        })).catch((() => {}));
    }));
}

function conTransicion(fn) {
    if (!veloEl) {
        fn();
        return;
    }
    veloEl.classList.add("activo");
    clearTimeout(conTransicion._guardia);
    conTransicion._guardia = setTimeout((() => veloEl.classList.remove("activo")), 1500);
    setTimeout((() => {
        try {
            fn();
        } finally {
            requestAnimationFrame((() => veloEl.classList.remove("activo")));
        }
    }), DURACION_VELO_MS);
}

function sinZoom() {
    for (const ev of [ "gesturestart", "gesturechange", "gestureend" ]) document.addEventListener(ev, (e => e.preventDefault()), {
        passive: false
    });
    const vv = window.visualViewport;
    const meta = document.querySelector('meta[name="viewport"]');
    if (!vv || !meta) return;
    const original = meta.getAttribute("content");
    let t = null;
    vv.addEventListener("resize", (() => {
        clearTimeout(t);
        t = setTimeout((() => {
            const escribiendo = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
            if (vv.scale <= 1.02 || escribiendo) return;
            meta.setAttribute("content", `${original}, minimum-scale=1`);
            setTimeout((() => meta.setAttribute("content", original)), 300);
        }), 350);
    }));
}

sinZoom();

let mascota, npcsReg, lugaresReg, diario;

let amigos = new RegistroAmigos;

let tienda = new Tienda;

let deseos = Deseos.desdeObjeto(null, DESEOS_PROPIOS);

let jardin = new Jardin;

let estiloCuaderno = limpiarCuaderno(null);

let palabras = new Palabras;

let restauranteReg = new Restaurante;

let restaurante = null;

let mesesReg = {
    entregados: []
};

const cargarMeses = d => ({
    entregados: (d && Array.isArray(d.entregados) ? d.entregados : []).filter((m => typeof m === "string" && /^\d{4}-\d{2}$/.test(m)))
});

let mudanza = {
    estado: "no",
    desde: 0
};

function cargarMudanza(datos) {
    mudanza = {
        estado: "no",
        desde: 0
    };
    if (datos && [ "no", "llega", "vive" ].includes(datos.estado)) mudanza = {
        estado: datos.estado,
        desde: Number.isFinite(datos.desde) ? datos.desde : 0
    };
}

let pescaReg = {
    libro: {},
    pecera: []
};

const PECES_DE_PECERA = new Set([ "dorado", "koi", "koi_dorado" ]);

function cargarPesca(datos) {
    pescaReg = {
        libro: {},
        pecera: []
    };
    if (!datos || typeof datos !== "object") return;
    for (const [id, n] of Object.entries(datos.libro || {})) if (pezPorId(id) && Number.isFinite(n) && n > 0) pescaReg.libro[id] = Math.floor(n);
    pescaReg.pecera = (datos.pecera || []).filter((id => PECES_DE_PECERA.has(id))).slice(-4);
}

registrarAccesoriosExtra((() => tienda.accesorios()));

let lugaresDeElla = [];

function cargarLugaresDeElla(datos) {
    lugaresDeElla = (Array.isArray(datos) ? datos : []).map(lugarDeEllaValido).filter(Boolean).slice(0, MAX_LUGARES_DE_ELLA);
    ponerLugaresDeElla(lugaresDeElla);
}

let fechasDeElla = [];

function cargarFechasDeElla(datos) {
    fechasDeElla = (Array.isArray(datos) ? datos : []).map(Fechas.fechaValida).filter(Boolean).slice(0, Fechas.MAX_FECHAS);
}

const todasLasFechas = () => [ ...Fechas.fechasDeConfig(FECHAS), ...fechasDeElla ];

const bodaEsHoy = () => Fechas.bodaEsHoy(fechasDeElla);

let cartasEntregadas = [];

let cartaActual = null;

let cartaReleida = false;

let verCartas = false;

let verAlbum = false;

let verMeses = false;

let verCalendario = false;

let cal = {
    mes: null,
    filtro: "todo",
    marcado: null
};

let anclaDiario = null;

let recienElegida = null;

const controller = new ControladorVistas;

let guardadoAuto;

let pasosSesion = 0;

let encuentro = null;

let minijuego = null;

let lenteAbierto = null;

let especialActiva = null;

let especialHastaMs = 0;

let proximoEspecialPermitidoMs = 0;

let pieza = null;

let globoTemporal = "";

let timeoutGlobo = null;

let visita = null;

let proximaConsultaVisitaMs = Date.now() + 4e4;

let proximoClimaMs = Date.now() + 3e3;

let ultimaPosicion = null;

let mapaSeleccion = null;

let proximaLecturaLugaresMs = 0;

let timeoutBlink = null;

let saludoPendiente = "";

const CLAVE_ULTIMA_VISTA = "baozi_ultima_vista";

function ultimaVista() {
    try {
        return Number(localStorage.getItem(CLAVE_ULTIMA_VISTA)) || 0;
    } catch (e) {
        return 0;
    }
}

function marcarVista() {
    try {
        localStorage.setItem(CLAVE_ULTIMA_VISTA, String(Date.now()));
    } catch (e) {}
}

let permisoMotionEstado = Sensores.motionRequierePermiso() ? "unknown" : Sensores.motionDisponible() ? "granted" : "unnecessary";

let watchIdGPS = null;

let detenerMotionCaminar = null;

let detectorPasosGPS = null;

let volanteJuego = null;

let detenerMotionMinijuego = null;

let lugarCercaDetectado = null;

let lugarDescubierto = null;

let fotoDelDescubrimiento = false;

function proximaFecha(ahora = new Date) {
    return Fechas.proxima(todasLasFechas(), ahora);
}

const CLAVE_PEDIDO_DIARIO = "baozi_pedido_diario";

function esHoraDeEscribir(h = (new Date).getHours()) {
    return h >= 19 || h < 3;
}

const HORA_PASOS = 18;

const CLAVE_PASOS_LUEGO = "baozi_pasos_luego";

const MAX_PASOS_DIA = 8e4;

const MS_PASOS_LUEGO = 36e5;

let preguntaPasos = null;

function diaParaPreguntarPasos(ahora = new Date) {
    if (!diario) return null;
    const hoy = claveDelDia(ahora);
    if (ahora.getHours() >= HORA_PASOS) return diario.pasosAnotados(hoy) ? null : {
        clave: hoy,
        cuando: "today"
    };
    const ayer = claveDelDia(new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 1));
    return diario.entradaDe(ayer) && !diario.pasosAnotados(ayer) ? {
        clave: ayer,
        cuando: "yesterday"
    } : null;
}

function diaDeLaTarjetaPasos(ahora = new Date) {
    return diaParaPreguntarPasos(ahora) || {
        clave: claveDelDia(ahora),
        cuando: "today"
    };
}

function pasosDeLaTarjeta() {
    if (!diario) return null;
    const d = diaDeLaTarjetaPasos();
    const e = diario.entradaDe(d.clave);
    return {
        cuando: d.cuando,
        anotados: diario.pasosAnotados(d.clave),
        pasos: e ? e.pasos : 0
    };
}

function talVezPreguntarPasos() {
    if (!mascota || !diario || controller.vista !== "cara" || visita || !puedeComentar()) return false;
    if ([ "armado", "pedido", "en_curso" ].includes(Final.fase())) return false;
    const dia = diaParaPreguntarPasos();
    if (!dia) return false;
    try {
        const luego = JSON.parse(localStorage.getItem(CLAVE_PASOS_LUEGO) || "null");
        if (luego && luego.clave === dia.clave && Date.now() < luego.hasta) return false;
    } catch (e) {
        return false;
    }
    abrirPreguntaPasos(dia);
    return true;
}

function abrirPreguntaPasos(dia, {volverA: volverA = "cara"} = {}) {
    if (dia.cuando === "today") diario.hoy();
    preguntaPasos = {
        ...dia,
        volverA: volverA
    };
    Sonido.sonar("tocar");
    conTransicion((() => {
        controller.vista = "pasos";
        renderVistaActual();
    }));
}

function wirePreguntaPasos() {
    const p = preguntaPasos;
    const input = document.getElementById("input-pasos");
    const nota = document.getElementById("pasos-nota");
    const salir = () => {
        preguntaPasos = null;
        if (p.volverA === "caminar") {
            conTransicion(volverACaminar);
        } else if (p.volverA === "diario") abrirCuaderno("diary"); else conTransicion(irACasa);
    };
    input.addEventListener("input", (() => {
        const limpio = input.value.replace(/[^0-9]/g, "").slice(0, 6);
        if (limpio !== input.value) input.value = limpio;
    }));
    input.addEventListener("keydown", (ev => {
        if (ev.key === "Enter") document.getElementById("btn-pasos-guardar").click();
    }));
    document.getElementById("btn-pasos-luego").addEventListener("click", (() => {
        try {
            localStorage.setItem(CLAVE_PASOS_LUEGO, JSON.stringify({
                clave: p.clave,
                hasta: Date.now() + MS_PASOS_LUEGO
            }));
        } catch (e) {}
        salir();
    }));
    document.getElementById("btn-pasos-guardar").addEventListener("click", (() => {
        const n = Number(input.value.replace(/[^0-9]/g, ""));
        if (!input.value || !Number.isFinite(n)) {
            nota.textContent = "Write the number of steps ♥";
            input.focus();
            return;
        }
        if (n > MAX_PASOS_DIA) {
            nota.textContent = `${n.toLocaleString("en-US")}?! That's too many for one day. Check it again?`;
            input.focus();
            return;
        }
        input.blur();
        guardarPasosAnotados(p, n);
    }));
}

function volverACaminar() {
    controller.vista = "caminar";
    if (permisoMotionEstado === "granted") activarPedometro();
    renderVistaActual();
    iniciarSensoresCaminar();
}

function guardarPasosAnotados(p, n) {
    const nuevos = diario.anotarPasosDelDia(p.clave, n);
    let hito = false;
    if (nuevos > 0) hito = mascota.registrarPasos(nuevos, Date.now(), {
        anotados: true
    });
    if (hito) diario.anotarHito(`${mascota.pasosTotales.toLocaleString("en-US")} steps`);
    const e = diario.entradaDe(p.clave);
    const delDia = e ? e.pasos : n;
    eventoAmigos({
        ...estadoParaAmigos(),
        pasosHoy: Math.max(diario.hoy().pasos, delDia)
    }, {
        sinVisita: true
    });
    const monedas = tienda.ganarPorPasos(p.clave, delDia);
    eventoDeseo({
        tipo: "pasos",
        pasos: delDia,
        hoy: p.clave === claveDelDia()
    });
    guardarTodo();
    if (monedas) setTimeout((() => mostrarMonedas(monedas)), 500);
    preguntaPasos = null;
    vibrar([ 20, 40, 20 ]);
    Sonido.sonar(nuevos > 0 ? "hito" : "tocar");
    const titulo = `${Math.max(n, delDia).toLocaleString("en-US")} steps!`;
    const sub = n >= 8e3 ? "We walked so much together!" : n >= 3e3 ? "Thank you for walking with me ♥" : "Every step counts ♥";
    controller.vista = "feedback";
    conTransicion((() => R.renderFeedback(screenEl, titulo, {
        icono: "pie",
        sub: sub
    })));
    setTimeout((() => {
        if (controller.vista !== "feedback") return;
        if (mostrarCartaSiCorresponde({
            pasosTotales: mascota.pasosTotales
        })) return;
        if (p.volverA === "caminar") {
            conTransicion(volverACaminar);
        } else if (p.volverA === "diario") abrirCuaderno("diary"); else conTransicion(irACasa);
    }), DURACION_FEEDBACK_MS + 300);
}

function talVezPedirDiario() {
    if (!mascota || !diario || controller.vista !== "cara" || mascota.dormida || !puedeComentar()) return;
    if (!esHoraDeEscribir() || diario.hoyEscrito()) return;
    const clave = claveDelDiaLogico();
    try {
        if (localStorage.getItem(CLAVE_PEDIDO_DIARIO) === clave) return;
        localStorage.setItem(CLAVE_PEDIDO_DIARIO, clave);
    } catch (e) {
        return;
    }
    decir(`How was your day, ${mascota.nombre}? Tell me in the notebook ♥`, 6e3);
}

const CLAVE_AVISO_BACKUP = "baozi_aviso_backup";

const SEMANA_MS = 7 * 864e5;

function talVezAvisarBackup(ahora = Date.now()) {
    if (!mascota || controller.vista !== "cara" || visita || !puedeComentar() || finalOcupado()) return false;
    const hora = new Date(ahora).getHours();
    if (hora < 10 || hora >= 22) return false;
    const desde = storage.ultimoBackup() || mascota.creadoEn || ahora;
    if (ahora - desde < SEMANA_MS) return false;
    try {
        if (ahora - (Number(localStorage.getItem(CLAVE_AVISO_BACKUP)) || 0) < SEMANA_MS) return false;
        localStorage.setItem(CLAVE_AVISO_BACKUP, String(ahora));
    } catch (e) {
        return false;
    }
    decir("Psst… let's save a backup of me? Notebook → Settings → Save backup ♥", 7e3);
    return true;
}

function nombrarTextos(raiz) {
    if (!Personaje.esMantou() || !raiz) return;
    const recorrido = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    const cambiar = [];
    while (recorrido.nextNode()) {
        const n = recorrido.currentNode;
        if (/\bBaozi\b/.test(n.nodeValue) && !(n.parentElement && n.parentElement.closest("[data-sin-nombre]"))) cambiar.push(n);
    }
    for (const n of cambiar) n.nodeValue = Personaje.conNombre(n.nodeValue);
}

if (typeof MutationObserver !== "undefined" && screenEl) {
    new MutationObserver((() => nombrarTextos(screenEl))).observe(screenEl, {
        childList: true,
        subtree: true,
        characterData: true
    });
}

function arrancar() {
    actualizarFondoPorHora();
    Sonido.despertarConPrimerToque();
    registrarServiceWorker();
    storage.pedirAlmacenamientoPersistente();
    const fotosListas = Camara.precargarFotos();
    fotosListasPromesa = fotosListas;
    Corcho.precargar();
    MapaDia.precargarMapas().then((() => {
        if (controller.vista === "consulta" && controller.consultaActual === "diary") renderVistaActual();
    }));
    fotosListas.then((() => {
        if (controller.vista === "consulta" && controller.consultaActual === "diary") renderVistaActual();
    }));
    Final.iniciar({
        pantalla: screenEl,
        datos: () => ({
            mascota: mascota,
            diario: diario,
            lugaresReg: lugaresReg,
            npcsReg: npcsReg
        }),
        prepararVista: prepararVista,
        abrirLente: opts => abrirLenteEnPantalla(opts),
        volverACasa: () => conTransicion(irACasa),
        abrirDirector: () => conTransicion(abrirDirector),
        abrirPin: opts => conTransicion((() => abrirPin(opts))),
        guardarTodo: guardarTodo,
        estadoPieza: estadoPieza
    });
    const guardado = storage.cargar();
    guardadoAuto = new storage.GuardadoAutomatico;
    if (guardado) {
        ({mascota: mascota, npcs: npcsReg, lugares: lugaresReg, diario: diario, cartasEntregadas: cartasEntregadas} = guardado);
        cargarLugaresDeElla(guardado.extras && guardado.extras.lugaresPropios);
        cargarFechasDeElla(guardado.extras && guardado.extras.fechasPropias);
        Final.restaurarDesdeGuardado(guardado.extras && guardado.extras.final);
        Personaje.restaurar(guardado.extras && guardado.extras.personaje);
        tienda = Tienda.desdeObjeto(guardado.extras && guardado.extras.tienda);
        aplicarCuarto();
        deseos = Deseos.desdeObjeto(guardado.extras && guardado.extras.deseos, DESEOS_PROPIOS);
        cargarPesca(guardado.extras && guardado.extras.pesca);
        cargarMudanza(guardado.extras && guardado.extras.mudanza);
        cargarAmigos(guardado.extras && guardado.extras.amigos);
        jardin = Jardin.desdeObjeto(guardado.extras && guardado.extras.jardin);
        estiloCuaderno = limpiarCuaderno(guardado.extras && guardado.extras.cuaderno);
        palabras = Palabras.desdeObjeto(guardado.extras && guardado.extras.palabras);
        mesesReg = cargarMeses(guardado.extras && guardado.extras.meses);
        restauranteReg = Restaurante.desdeObjeto(guardado.extras && guardado.extras.restaurante);
        if (restauranteReg.reembolso) {
            tienda.monedas += restauranteReg.reembolso;
            restauranteReg.reembolso = 0;
        }
        const vista = ultimaVista() || Number(guardado.guardadoEn) || Date.now();
        const horasSinVerla = (Date.now() - Math.max(mascota.ultimaInteraccion || 0, vista)) / 36e5;
        mascota.actualizarTiempo(Date.now(), {
            suenioAuto: ![ "pedido", "en_curso" ].includes(Final.fase())
        });
        mascota.revisarSuenioAutomatico(Date.now());
        mascota.decaerRasgosPorDias(Date.now());
        cuidarParaElFinal();
        programarProximoParpadeo();
        if (Final.hayQueRetomar()) {
            Promise.race([ fotosListas, new Promise((r => setTimeout(r, 2500))) ]).then((() => Final.pantallaRetomar()));
            return;
        }
        const laExtrano = horasSinVerla >= 18 && !mascota.dormida && !mascota.enferma && !Final.fotoPedida() && !finalOcupado();
        const hora = (new Date).getHours();
        const saludoHora = hora >= 5 && hora < 11 ? `Good morning, ${mascota.nombre}!` : hora >= 22 || hora < 4 ? `Still up, ${mascota.nombre}?` : `Hi, ${mascota.nombre}!`;
        saludoPendiente = laExtrano ? "You're back… I missed you!" : mascota.nombre ? saludoHora : "";
        setTimeout((() => {
            saludoPendiente = "";
            if (controller.vista === "cara") renderVistaActual();
        }), 4500);
        controller.irACara();
        renderVistaActual();
        if (laExtrano) mostrarEspecial("decepcionado", 2600, {
            nombre: "euforico",
            ms: 2400
        });
        if (Final.fotoPedida()) {
            setTimeout((() => conTransicion((() => Final.abrirPedido()))), 900);
        }
        vigilarLugarFinal();
        setTimeout((() => revisarLugares(true)), 2500);
    } else {
        diario = new Diario;
        cartasEntregadas = [];
        controller.vista = "elegir";
        renderVistaActual();
    }
}

const TOQUES_PARA_ECLOSIONAR = 3;

function wireHuevo() {
    let toques = 0;
    const pantalla = document.getElementById("pantalla-huevo");
    const huevo = document.getElementById("huevo");
    pantalla.addEventListener("click", (() => {
        if (toques >= TOQUES_PARA_ECLOSIONAR) return;
        toques += 1;
        huevo.classList.remove("tiembla");
        void huevo.offsetWidth;
        huevo.classList.add("tiembla");
        huevo.dataset.grietas = String(toques);
        vibrar(25 * toques);
        Sonido.sonar("grieta");
        if (toques >= TOQUES_PARA_ECLOSIONAR) {
            pantalla.classList.add("eclosiona");
            Sonido.sonar("eclosion");
            setTimeout((() => {
                controller.vista = "nombre";
                renderVistaActual();
            }), 900);
        }
    }));
}

function wireElegir() {
    const input = document.getElementById("input-restaurar-inicio");
    const mensajeEl = document.getElementById("mensaje-restaurar-inicio");
    if (input && mensajeEl) {
        input.addEventListener("change", (() => {
            const archivo = input.files[0];
            input.value = "";
            if (!archivo) return;
            restaurarDesdeArchivo(archivo, ((texto, clase = "") => {
                mensajeEl.textContent = texto;
                mensajeEl.className = `mensaje-backup ${clase}`;
            }));
        }));
    }
    for (const b of screenEl.querySelectorAll("[data-personaje]")) {
        b.addEventListener("click", (() => {
            Personaje.elegir(b.dataset.personaje);
            Sonido.sonar("tocar");
            b.classList.add("elegida");
            setTimeout((() => {
                conTransicion((() => abrirTutorial((() => {
                    controller.vista = "huevo";
                    renderVistaActual();
                }))));
            }), 350);
        }));
    }
}

function abrirTutorial(alTerminar) {
    let i = 0;
    const mostrar = () => {
        controller.vista = "tutorial";
        screenEl.classList.add("sin-margen");
        R.renderTutorial(screenEl, i);
        const saltar = document.getElementById("tutorial-saltar");
        if (saltar) saltar.addEventListener("click", (() => conTransicion(alTerminar)));
        document.getElementById("tutorial-seguir").addEventListener("click", (() => {
            Sonido.sonar("tocar");
            if (i >= R.TUTORIAL.length - 1) conTransicion(alTerminar); else {
                i += 1;
                mostrar();
            }
        }));
    };
    mostrar();
}

function wireNombre() {
    const saludo = document.getElementById("nombre-saludo");
    escribir(saludo, `Hi!! I'm ${Personaje.nombre()}. What's your name?`);
    const input = document.getElementById("input-nombre");
    document.getElementById("btn-confirmar-nombre").addEventListener("click", confirmarNombre);
    input.addEventListener("keydown", (e => {
        if (e.key === "Enter") confirmarNombre();
    }));
    setTimeout((() => input.focus()), 300);
}

function confirmarNombre() {
    const input = document.getElementById("input-nombre");
    const nombre = (input.value || "").trim().slice(0, 12) || NOMBRE_POR_DEFECTO;
    mascota = new PetState(nombre, Date.now());
    npcsReg = new RegistroNPCs;
    lugaresReg = new RegistroLugares;
    tienda = new Tienda;
    aplicarCuarto();
    deseos = Deseos.desdeObjeto(null, DESEOS_PROPIOS);
    cargarPesca(null);
    cargarMudanza(null);
    cargarAmigos(null);
    jardin = new Jardin;
    estiloCuaderno = limpiarCuaderno(null);
    palabras = new Palabras;
    mesesReg = cargarMeses(null);
    restauranteReg = new Restaurante;
    cargarLugaresDeElla(null);
    cargarFechasDeElla(null);
    diario = diario || new Diario;
    cartasEntregadas = [];
    guardarTodo();
    Sonido.sonar("guardado");
    saludoPendiente = `Nice to meet you, ${nombre}!`;
    setTimeout((() => {
        saludoPendiente = "";
        if (controller.vista === "cara") renderVistaActual();
    }), 5e3);
    conTransicion((() => {
        controller.irACara();
        renderVistaActual();
        programarProximoParpadeo();
    }));
}

function actualizarTabbar() {
    tabbarEl.classList.toggle("oculto", !VISTAS_CON_TABBAR.has(controller.vista));
    for (const boton of tabbarEl.querySelectorAll("button")) {
        boton.classList.toggle("activo", boton.dataset.cat === controller.categoria);
    }
}

function prepararVista(nombre) {
    if (lenteAbierto && nombre !== "lente") cerrarLente();
    controller.vista = nombre;
    actualizarTabbar();
    actualizarMarco();
    screenEl.classList.toggle("sin-margen", VISTAS_SIN_MARGEN.has(nombre));
}

function irACasa() {
    if (lenteAbierto) cerrarLente();
    detenerSensoresCaminar();
    if (minijuego) {
        const m = minijuego;
        minijuego = null;
        m.detener();
    }
    if (pesca) {
        const q = pesca;
        pesca = null;
        q.destruir();
    }
    if (juegoTele) {
        const j = juegoTele;
        juegoTele = null;
        j.destruir();
    }
    if (restaurante) {
        const r = restaurante;
        restaurante = null;
        r.destruir();
    }
    controller.irACara();
    renderVistaActual();
    if (deseos.celebrar) setTimeout(celebrarDeseo, 700);
}

function musicaDeFondo() {
    const est = Musica.estacionActual();
    const enCasa = controller.vista === "cara" && !finalOcupado() && Sonido.sonidoHabilitado() && !(mascota && mascota.dormida);
    const sonando = Musica.escenaSonando();
    const esRadio = Musica.esEstacion(sonando);
    if (enCasa && est && (!sonando || esRadio && sonando !== est.id)) Musica.tocar(est.id); else if (esRadio && (!enCasa || !est)) Musica.detener(.8);
}

function renderVistaActual() {
    musicaDeFondo();
    sonidoDelClima();
    actualizarTabbar();
    actualizarMarco();
    screenEl.classList.toggle("sin-margen", VISTAS_SIN_MARGEN.has(controller.vista));
    switch (controller.vista) {
      case "escribir":
        abrirEscribir();
        break;

      case "decorar":
        if (decorando) abrirDecorarDia(decorando.clave, decorando.estilo, false); else irACasa();
        break;

      case "palabra":
        renderPalabraActual();
        break;

      case "mes":
        renderMesActual();
        break;

      case "sobremes":
        renderSobreMesActual();
        break;

      case "elegir":
        R.renderElegir(screenEl, {
            cargaFallida: storage.estadoDeCarga().fallida
        });
        wireElegir();
        break;

      case "huevo":
        R.renderHuevo(screenEl);
        wireHuevo();
        break;

      case "nombre":
        R.renderNombre(screenEl);
        wireNombre();
        break;

      case "cara":
        if (pieza && pieza.vivo()) pieza.refrescar(); else pieza = crearPieza(screenEl, {
            estado: estadoPieza,
            alTocar: tocarObjeto,
            alRayo: alRayo
        });
        break;

      case "heladera":
        R.renderHeladera(screenEl, Object.keys(tienda.comida).map((id => productoTienda(id))).filter(Boolean).map((c => ({
            id: c.id,
            arte: c.arte,
            nombre: c.nombre,
            n: tienda.cantidadComida(c.id),
            manana: !tienda.puedeUsarHoy(c.id)
        }))));
        wireHeladera();
        break;

      case "mapa":
        renderMapaActual();
        break;

      case "jardin":
        renderJardinActual();
        break;

      case "mapadia":
        renderMapaDiaActual();
        break;

      case "fechas":
        renderFechasActual();
        break;

      case "menu":
        renderMenuActual();
        break;

      case "consulta":
        renderConsulta();
        break;

      case "caminar":
        R.renderCaminar(screenEl, mascota, pasosSesion, {
            mostrarBannerMotion: permisoMotionEstado === "unknown",
            hayLugaresPendientes: lugaresReg.pendientes().length > 0,
            podometroActivo: !!detenerMotionCaminar,
            estado: estadoCara(mascota)
        });
        wireCaminar();
        break;

      case "wheretogo":
        R.renderWhereTo(screenEl, lugaresReg.pendientes().filter((l => amigos.lugarVisible(l.id, lugaresReg.desbloqueados))));
        wireWhereTo();
        break;

      case "lugarcerca":
        R.renderLugarCerca(screenEl, lugarCercaDetectado);
        wireLugarCerca();
        break;

      case "descubrimiento":
        R.renderDescubrimiento(screenEl, lugarDescubierto, {
            fotoGuardada: fotoDelDescubrimiento
        });
        wireDescubrimiento();
        break;

      case "encuentro":
        renderEncuentro();
        break;

      case "mudanza":
        R.renderMudanza(screenEl, {
            quien: companeroId(),
            texto: MUDANZA.llegada
        });
        wireMudanza();
        break;

      case "juegos":
        R.renderJuegos(screenEl, {
            recordSnack: leerRecord(),
            recordPesca: leerRecordPesca(),
            recordTorre: leerRecordTorre(),
            recordTejo: leerRecordTejo(),
            recordFaroles: leerRecordFaroles(),
            cancionesRitmo: Musica.estacionesParaJugar().length,
            libro: PECES.map((p => ({
                id: p.id,
                nombre: p.nombre,
                n: pescaReg.libro[p.id] || 0
            }))),
            primeras: Object.fromEntries([ "snack", "pesca", "torre", "ritmo", "tejo", "faroles" ].map((j => [ j, tienda.primeraDelDia(j) ])))
        });
        document.getElementById("btn-juego-snack").addEventListener("click", (() => conTransicion(iniciarMinijuego)));
        document.getElementById("btn-juego-pesca").addEventListener("click", (() => conTransicion(iniciarPescaJuego)));
        document.getElementById("btn-juego-torre").addEventListener("click", (() => conTransicion((() => iniciarJuegoTele("torre")))));
        document.getElementById("btn-juego-ritmo").addEventListener("click", (() => conTransicion((() => iniciarJuegoTele("ritmo")))));
        document.getElementById("btn-juego-tejo").addEventListener("click", (() => conTransicion((() => iniciarJuegoTele("tejo")))));
        document.getElementById("btn-juego-faroles").addEventListener("click", (() => conTransicion((() => iniciarJuegoTele("faroles")))));
        document.getElementById("btn-volver-juegos").addEventListener("click", (() => conTransicion(irACasa)));
        break;

      case "deseo":
        {
            const d = deseos.actual();
            if (!d) {
                controller.vista = "cara";
                renderVistaActual();
                break;
            }
            R.renderDeseo(screenEl, {
                texto: d.texto,
                real: !!d.real,
                estado: deseos.estado,
                progreso: deseos.progreso,
                meta: d.meta || 0
            });
            wireDeseo();
            break;
        }

      case "pasos":
        if (!preguntaPasos) {
            controller.vista = "cara";
            renderVistaActual();
            break;
        }
        R.renderPreguntaPasos(screenEl, {
            clave: preguntaPasos.clave,
            cuando: preguntaPasos.cuando,
            contados: (diario.entradaDe(preguntaPasos.clave) || {
                pasos: 0
            }).pasos,
            anotados: (diario.entradaDe(preguntaPasos.clave) || {}).pasosAnotados ?? null
        });
        wirePreguntaPasos();
        break;

      case "carta":
        if (cartaReleida) {
            R.renderCarta(screenEl, cartaActual, {
                releer: true,
                fecha: fechaDeCarta(cartaActual && cartaActual.id)
            });
            document.getElementById("btn-continuar-carta").addEventListener("click", (() => {
                Sonido.sonar("tocar");
                conTransicion((() => {
                    cartaActual = null;
                    cartaReleida = false;
                    controller.abrirConsulta("diary");
                    controller.vista = "consulta";
                    renderVistaActual();
                }));
            }));
            break;
        }
        R.renderCarta(screenEl, cartaActual);
        document.getElementById("btn-continuar-carta").addEventListener("click", (() => {
            Musica.detener();
            conTransicion((() => {
                cartaActual = null;
                irACasa();
            }));
        }));
        break;

      case "director":
        abrirDirector();
        break;

      case "restaurante":
        if (!restaurante) abrirElRestaurante();
        break;

      case "minijuego":
      case "pesca":
      case "torre":
      case "ritmo":
      case "tejo":
      case "faroles":
      case "lente":
      case "final":
      case "intro":
        break;
    }
}

const MESES_CORTOS = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];

function fechaCorta(ms) {
    const f = new Date(ms);
    return `${MESES_CORTOS[f.getMonth()]} ${f.getDate()}`;
}

const COOLDOWN_MIMO_MS = 6e4;

let proximoMimoConEfectoMs = 0;

let toquesReloj = [];

function estadoPieza() {
    const estado = estadoCara(mascota);
    const fotoPedida = Final.fotoPedida();
    const [ojos, boca] = R.archivosCara(mascota, estado, {
        especialActiva: especialActiva,
        fotoPedida: fotoPedida
    });
    const dormido = mascota.dormida && !fotoPedida;
    const globo = globoTemporal ? {
        texto: globoTemporal,
        rosa: false
    } : R.globoCara(mascota, {
        fotoPedida: fotoPedida,
        saludo: saludoPendiente
    });
    return {
        momento: momentoActual || "dia",
        dormido: dormido,
        farol: !dormido,
        sonido: Sonido.sonidoHabilitado() && !!Musica.estacionActual(),
        ojos: ojos,
        boca: boca,
        parpadea: !dormido && !especialActiva && !fotoPedida && (estado.tipo === "base" || estado.tipo === "aburrido"),
        quieto: fotoPedida || mascota.enferma || finalOcupado(),
        recuerdos: [ ...lugaresReg.desbloqueados ],
        pines: LUGARES.filter((l => lugaresReg.desbloqueados.has(l.id) && dentroDelDibujo(l.lat, l.lon))).map((l => ({
            lat: l.lat,
            lon: l.lon,
            color: l.color
        }))),
        dia: (new Date).getDate(),
        anillo: Final.dijoQueSi(),
        cuarto: tienda.cuarto || "depto",
        mascota: tienda.mascota || null,
        avisos: fotoPedida ? [] : [ ...new Set([ ...dormido ? [] : R.necesidades(mascota).map((n => n.objeto)).filter(Boolean), ...esHoraDeEscribir() && diario && !diario.hoyEscrito() ? [ "mesita" ] : [], ...puedeComentar() && !finalEnMarcha() && !palabras.vioLaDeHoy(claveDelDia()) ? [ "calendario" ] : [], ...visita && visita.regalo ? [ "ventana" ] : [], ...puedeComentar() && !finalEnMarcha() && (jardin.hayCosecha(claveDelDia()) || jardin.quiereAgua(claveDelDia()) && (new Date).getHours() >= 8) ? [ "ventana" ] : [], ...puedeComentar() && ![ "armado", "pedido", "en_curso" ].includes(Final.fase()) && tienda.nuevas().length ? [ "mesita" ] : [] ]) ],
        npc: visita ? visita.npc.id : null,
        decoraciones: [ ...amigos.decoraciones(), ...tienda.decoraciones() ].filter((id => tienda.estaPuesta(id))),
        deseo: deseos.estado === "nuevo" && !fotoPedida && !finalEnMarcha() && !enCalma("deseo") ? "nuevo" : null,
        peluche: Personaje.IDS.find((q => q !== Personaje.actual())) || "baozi",
        pecera: tienda.tiene("pecera") ? pescaReg.pecera : [],
        companero: mudanza.estado === "vive" ? {
            quien: companeroId(),
            valija: Date.now() - mudanza.desde < 3 * 864e5
        } : null,
        globoCompanero: globoCompanero,
        fotoAnillo: Final.dijoQueSi() ? fotoDelAnillo() : null,
        clima: Clima.tipo(),
        velitas: esNocheDeVelitas(),
        jardin: jardin.estados(claveDelDia()),
        globo: globo.texto,
        globoRosa: globo.rosa
    };
}

function fotoDelAnillo() {
    const finales = Camara.todasLasFotos().filter((f => f.tipo === "final" && f.dataUrl));
    return finales.length ? finales[finales.length - 1].dataUrl : null;
}

function decir(texto, ms = 2600) {
    globoTemporal = Personaje.conNombre(texto);
    clearTimeout(timeoutGlobo);
    timeoutGlobo = setTimeout((() => {
        globoTemporal = "";
        if (controller.vista === "cara") renderVistaActual();
    }), ms);
    if (controller.vista === "cara") renderVistaActual();
}

function tocarObjeto(id) {
    if (!mascota) return;
    switch (id) {
      case "baozi":
        tocarBaozi();
        break;

      case "companero":
        tocarCompanero();
        break;

      case "mascota":
        Sonido.sonar("mimo");
        vibrar(12);
        break;

      case "reloj":
        tocarReloj();
        break;

      case "heladera":
        Sonido.sonar("tocar");
        conTransicion((() => {
            prepararVista("heladera");
            renderVistaActual();
        }));
        break;

      case "botiquin":
        manejarTapItem("medicine");
        break;

      case "balde":
        manejarTapItem("clean");
        break;

      case "farol":
        manejarTapItem("sleep");
        break;

      case "tele":
        manejarTapItem("play");
        break;

      case "camara":
        manejarTapItem("lens");
        break;

      case "radio":
        {
            let est;
            if (!Sonido.sonidoHabilitado()) {
                Sonido.alternarSonido();
                est = Musica.estacionActual() || Musica.siguienteEstacion();
            } else est = Musica.siguienteEstacion();
            Sonido.sonar("tocar");
            musicaDeFondo();
            if (est && mascota && mascota.dormida) decir(`♪ ${est.nombre}… I'll play it when I wake up.`, 3200); else decir(est ? `♪ ${est.nombre} (${Musica.numeroDeEstacion(est)})` : "Radio off. Shh…", 3200);
            if (est) eventoDeseo({
                tipo: "radio",
                estacion: est.id
            });
            break;
        }

      case "mesita":
        Sonido.sonar("tocar");
        abrirCuaderno("diary");
        break;

      case "corcho":
        Sonido.sonar("tocar");
        abrirMapa();
        break;

      case "cartel":
        Sonido.sonar("tocar");
        conTransicion(abrirElRestaurante);
        break;

      case "calendario":
        Sonido.sonar("tocar");
        abrirPalabra();
        break;

      case "ventana":
        tocarVentana();
        break;
    }
}

function tocarBaozi() {
    const caja = screenEl.querySelector(".caja-cara");
    if (Final.fotoPedida() && mascota) {
        if (mascota.dormida) {
            mascota.alternarDormir(Date.now());
            guardarTodo();
        }
        conTransicion((() => Final.abrirPedido()));
        return;
    }
    if (!mascota) return;
    if (mascota.dormida) {
        suenoDeBaozi();
        return;
    }
    const ahora = Date.now();
    if (!finalEnMarcha() && !enCalma("deseo") && deseos.actual()) {
        const d = deseos.actual();
        if (deseos.estado === "nuevo" || d.real && deseos.estado === "escuchado" && ahora - ultimaTarjetaDeseo > 10 * 6e4) {
            abrirDeseo();
            return;
        }
    }
    eventoDeseo({
        tipo: "mimo"
    });
    if (mudanza.estado === "vive" && Math.random() < .35) decirCompanero(MUDANZA.celoso || "Me too!", 2200);
    if (ahora >= proximoMimoConEfectoMs) {
        mascota.mimar(ahora);
        proximoMimoConEfectoMs = ahora + COOLDOWN_MIMO_MS;
        guardarTodo();
    }
    Sonido.sonar("mimo");
    vibrar(15);
    if (caja) lanzarCorazon(caja);
}

function tocarReloj() {
    const ahora = Date.now();
    toquesReloj = toquesReloj.filter((t => ahora - t < 3e3));
    toquesReloj.push(ahora);
    if (toquesReloj.length >= 5) {
        toquesReloj = [];
        conTransicion(abrirPin);
    }
}

function mostrarMonedas(n) {
    if (!n) return;
    const app = document.getElementById("app");
    if (!app) return;
    const el = document.createElement("div");
    el.className = "pop-monedas";
    el.setAttribute("aria-live", "polite");
    el.innerHTML = `<img src="${arte("tienda/moneda.png")}" alt="" draggable="false" /><span>+${n}</span>`;
    app.appendChild(el);
    Sonido.sonar("moneda");
    setTimeout((() => el.remove()), 2e3);
}

function ganarMonedas(fuente, cantidad) {
    if (!mascota) return 0;
    const n = tienda.ganar(fuente, cantidad);
    if (n) {
        guardarTodo();
        mostrarMonedas(n);
    }
    return n;
}

const finalEnMarcha = () => [ "armado", "pedido", "en_curso" ].includes(Final.fase());

const CALMA_MS = {
    deseo: 2 * 6e4,
    visita: 3.5 * 6e4
};

const enCalma = que => !!mascota && Date.now() - (mascota.creadoEn || 0) < CALMA_MS[que];

function contextoDeseos(ahora = new Date) {
    return {
        hora: ahora.getHours(),
        finDeSemana: ahora.getDay() === 0 || ahora.getDay() === 6,
        tieneRopa: amigos.accesorios().length + tienda.accesorios().length > 0,
        quedanLugares: !!lugaresReg && lugaresReg.pendientes().length > 0,
        tienePlantas: jardin.hayPlantas()
    };
}

function elegirDeseo() {
    if (!mascota) return;
    if (deseos.elegir(claveDelDia(), contextoDeseos())) guardarTodo();
}

function eventoDeseo(ev) {
    if (!mascota || enCalma("deseo")) return;
    elegirDeseo();
    const antes = deseos.progreso;
    if (deseos.evento({
        hora: (new Date).getHours(),
        ...ev
    })) cumplirDeseo(); else if (deseos.progreso !== antes) guardarTodo();
}

function cumplirDeseo() {
    tienda.ganar("deseo", 10);
    mascota.stats.felicidad = Math.min(100, mascota.stats.felicidad + 10);
    diario.anotarHito("A wish came true ♥");
    guardarTodo();
    if (controller.vista === "cara") celebrarDeseo();
}

function celebrarDeseo() {
    if (!deseos.celebrar || controller.vista !== "cara" || !mascota || mascota.dormida) return false;
    deseos.celebrar = false;
    guardarTodo();
    Sonido.sonar("hallazgo");
    vibrar([ 20, 40, 20 ]);
    mostrarEspecial("euforico", 3500);
    decir("My wish came true! Thank you ♥", 4200);
    setTimeout((() => mostrarMonedas(10)), 400);
    return true;
}

let ultimaTarjetaDeseo = 0;

function abrirDeseo(desde = "cara") {
    const d = deseos.actual();
    if (!d) return;
    deseos.escuchar();
    ultimaTarjetaDeseo = Date.now();
    guardarTodo();
    Sonido.sonar("carta");
    conTransicion((() => {
        controller.vista = "deseo";
        vistaDeseoDesde = desde;
        renderVistaActual();
    }));
}

let vistaDeseoDesde = "cara";

function wireDeseo() {
    const volver = () => {
        if (vistaDeseoDesde === "stats") {
            controller.abrirConsulta("stats");
            conTransicion(renderVistaActual);
        } else conTransicion(irACasa);
    };
    const ok = document.getElementById("btn-deseo-ok");
    if (ok) ok.addEventListener("click", volver);
    const luego = document.getElementById("btn-deseo-luego");
    if (luego) luego.addEventListener("click", volver);
    const hecho = document.getElementById("btn-deseo-hecho");
    if (hecho) {
        hecho.addEventListener("click", (() => {
            if (deseos.hecho()) {
                tienda.ganar("deseo", 10);
                mascota.stats.felicidad = Math.min(100, mascota.stats.felicidad + 10);
                diario.anotarHito("A wish came true ♥");
                guardarTodo();
            }
            volver();
        }));
    }
}

let formFecha = null;

let borrarFecha = null;

function abrirFechas() {
    formFecha = null;
    borrarFecha = null;
    conTransicion((() => {
        prepararVista("fechas");
        renderVistaActual();
    }));
}

function cabezaDeFechas() {
    const p = proximaFecha();
    const cuenta = p ? p.dias === 0 ? `Today: ${p.nombre} ♥` : p.dias === 1 ? `Tomorrow: ${p.nombre}!` : `${p.dias} days until ${p.nombre}.` : "";
    const si = Final.dijoQueSi() && Final.fechaDelSi();
    if (si) return `Engaged since ${fechaCorta(si)} ♥${cuenta ? ` ${cuenta}` : ""}`;
    return cuenta || `Today is ${fechaCorta(Date.now())}.`;
}

function renderFechasActual() {
    const ahora = new Date;
    const filas = Fechas.ordenadas(todasLasFechas(), ahora).map((f => {
        const dias = Fechas.diasHasta(f, ahora);
        const veces = Fechas.vecesCumplidas(f, ahora);
        return {
            id: f.id,
            nombre: f.nombre,
            tipo: f.tipo,
            fija: !!f.fija,
            fecha: `${MESES_CORTOS[f.mes - 1]} ${f.dia}${f.anio != null ? `, ${f.anio}` : ""}${veces > 0 ? ` · ${veces} ${veces === 1 ? "year" : "years"}` : ""}`,
            falta: dias === 0 ? "Today! ♥" : dias === 1 ? "tomorrow" : `in ${dias} days`,
            hoy: dias === 0
        };
    }));
    const tipos = Fechas.TIPOS_FECHA.filter((t => t !== "boda" || Final.dijoQueSi())).map((id => ({
        id: id,
        nombre: Fechas.NOMBRES_TIPO[id]
    })));
    R.renderFechas(screenEl, {
        cabeza: cabezaDeFechas(),
        filas: filas,
        form: formFecha,
        tipos: tipos,
        borrar: borrarFecha,
        puedeAgregar: fechasDeElla.length < Fechas.MAX_FECHAS,
        enamorado: Final.dijoQueSi()
    });
    wireFechas();
}

function wireFechas() {
    const $ = id => document.getElementById(id);
    if (!formFecha) {
        $("btn-fechas-cerrar").addEventListener("click", (() => conTransicion(irACasa)));
        const agregar = $("btn-fecha-agregar");
        if (agregar) {
            agregar.addEventListener("click", (() => {
                Sonido.sonar("tocar");
                const hoy = new Date;
                formFecha = {
                    nombre: "",
                    mes: hoy.getMonth() + 1,
                    dia: hoy.getDate(),
                    anio: null,
                    tipo: "aniversario"
                };
                borrarFecha = null;
                renderFechasActual();
            }));
        }
        for (const b of screenEl.querySelectorAll("[data-borrar-fecha]")) {
            b.addEventListener("click", (() => {
                const id = b.dataset.borrarFecha;
                if (borrarFecha !== id) {
                    borrarFecha = id;
                    Sonido.sonar("tocar");
                    renderFechasActual();
                    return;
                }
                fechasDeElla = fechasDeElla.filter((f => f.id !== id));
                borrarFecha = null;
                guardarTodo();
                Sonido.sonar("tocar");
                renderFechasActual();
            }));
        }
        return;
    }
    const f = formFecha;
    const nombre = $("fecha-nombre");
    const leer = () => {
        f.nombre = nombre.value;
        f.mes = Number($("fecha-mes").value);
        f.dia = Number($("fecha-dia").value);
        f.anio = $("fecha-anio").value ? Number($("fecha-anio").value) : null;
    };
    for (const id of [ "fecha-nombre", "fecha-mes", "fecha-dia", "fecha-anio" ]) $(id).addEventListener("change", leer);
    nombre.addEventListener("input", leer);
    for (const b of screenEl.querySelectorAll("[data-tipo-fecha]")) {
        b.addEventListener("click", (() => {
            leer();
            f.tipo = b.dataset.tipoFecha;
            Sonido.sonar("tocar");
            renderFechasActual();
        }));
    }
    $("btn-fecha-cancelar").addEventListener("click", (() => {
        formFecha = null;
        Sonido.sonar("tocar");
        renderFechasActual();
    }));
    $("btn-fecha-guardar").addEventListener("click", (() => {
        leer();
        const aviso = texto => {
            f.aviso = texto;
            f.error = true;
            Sonido.sonar("no");
            const el = $("aviso-fecha");
            if (el) {
                el.textContent = texto;
                el.classList.add("error");
            }
        };
        if (!f.nombre.trim()) {
            aviso("Give it a name ♥");
            nombre.focus();
            return;
        }
        const nueva = Fechas.fechaValida({
            nombre: f.nombre,
            mes: f.mes,
            dia: f.dia,
            anio: f.anio,
            tipo: f.tipo,
            id: `fecha_${Date.now().toString(36)}`
        });
        if (!nueva) {
            aviso(`${R.NOMBRE_MES(f.mes)} doesn't have a ${f.dia}${f.anio ? ` in ${f.anio}` : ""}.`);
            return;
        }
        nombre.blur();
        fechasDeElla = [ ...fechasDeElla, nueva ];
        formFecha = null;
        guardarTodo();
        Sonido.sonar("guardado");
        renderFechasActual();
    }));
}

const companeroId = () => Personaje.IDS.find((q => q !== Personaje.actual())) || "baozi";

let globoCompanero = "";

let timeoutGloboComp = null;

let ultimaFraseComp = -1;

function decirCompanero(texto, ms = 3600) {
    globoCompanero = texto;
    clearTimeout(timeoutGloboComp);
    timeoutGloboComp = setTimeout((() => {
        globoCompanero = "";
    }), ms);
}

function talVezMudanza() {
    if (!mascota) return false;
    if (mudanza.estado === "no" && Final.dijoQueSi() && Final.fechaDelSi() && claveDelDia() > claveDelDia(new Date(Final.fechaDelSi()))) {
        mudanza.estado = "llega";
        guardarTodo();
    }
    if (mudanza.estado !== "llega" || controller.vista !== "cara" || visita || mascota.dormida || finalEnMarcha()) return false;
    Sonido.sonar("encuentro");
    vibrar([ 30, 80, 30 ]);
    conTransicion((() => {
        controller.vista = "mudanza";
        renderVistaActual();
    }));
    return true;
}

function wireMudanza() {
    document.getElementById("btn-mudanza-si").addEventListener("click", (() => {
        mudanza = {
            estado: "vive",
            desde: Date.now()
        };
        diario.anotarHito(`${Personaje.nombre(companeroId())} moved in ♥`);
        guardarTodo();
        Sonido.sonar("hallazgo");
        vibrar([ 20, 40, 20, 40, 20 ]);
        controller.vista = "feedback";
        conTransicion((() => R.renderFeedback(screenEl, MUDANZA.siSeQueda, {
            especial: "enamorado"
        })));
        setTimeout((() => conTransicion(irACasa)), DURACION_FEEDBACK_MS + 1600);
    }));
}

function tocarCompanero() {
    if (mudanza.estado !== "vive" || !mascota) return;
    if (mascota.dormida) {
        decirCompanero("Zzz…", 1800);
        return;
    }
    const frases = (MUDANZA.frases || []).filter((f => typeof f === "string" && f.trim()));
    if (!frases.length) return;
    let i = Math.floor(Math.random() * frases.length);
    if (frases.length > 1 && i === ultimaFraseComp) i = (i + 1) % frases.length;
    ultimaFraseComp = i;
    Sonido.sonar("mimo");
    vibrar(15);
    decirCompanero(frases[i], 4200);
}

function aplicarCuarto() {
    const id = ponerCuarto(tienda.cuarto);
    document.documentElement.dataset.cuarto = id;
}

function talVezAvisarTienda() {
    if (!mascota || controller.vista !== "cara" || visita || !puedeComentar()) return false;
    if ([ "armado", "pedido", "en_curso" ].includes(Final.fase())) return false;
    const semana = tienda.semanaActual();
    if (semana <= tienda.avisoSemana || !tienda.nuevas().length) return false;
    tienda.avisoSemana = semana;
    guardarTodo();
    const nuevas = tienda.nuevas();
    const texto = semana === 0 ? "I opened a little shop in the notebook! ♪" : nuevas.some((c => c.tipo === "cuarto")) ? "A whole new room at the shop! ♪" : nuevas.some((c => c.tipo === "mascota")) ? "There's a little friend waiting at the shop! ♪" : "New things at the shop! ♪";
    decir(texto, 5e3);
    return true;
}

function cargarAmigos(datos) {
    amigos = RegistroAmigos.desdeObjeto(datos);
    Personaje.ponerAccesorio(amigos.puesto);
}

function contextoAmigos() {
    return {
        pasosHoy: diario ? diario.hoy().pasos : 0,
        racha: diario ? diario.racha() : 0,
        sellados: lugaresReg ? lugaresReg.desbloqueados : new Set,
        record: leerRecord()
    };
}

function estadoParaAmigos() {
    return {
        tipo: "estado",
        ...contextoAmigos()
    };
}

function eventoAmigos(ev, {sinVisita: sinVisita = false} = {}) {
    if (!mascota) return;
    const listos = amigos.evento(ev);
    if (!listos.length) return;
    guardarTodo();
    if (sinVisita) return;
    if (controller.vista === "cara" && !visita && !mascota.dormida && !finalOcupado()) {
        const npc = NPCS.find((n => n.id === listos[0]));
        if (npc) anunciarVisita(npc, {
            regalo: true
        });
    }
}

function alSellar(idLugar) {
    if (LUGARES_SECRETOS.has(idLugar)) amigos.revelar(idLugar);
    eventoAmigos({
        tipo: "sello",
        lugar: idLugar
    });
    eventoAmigos(estadoParaAmigos());
    const lugar = LUGARES.find((l => l.id === idLugar));
    ganarMonedas(lugar && lugar.deElla ? "propio" : "sello");
    eventoDeseo({
        tipo: "sello"
    });
}

function fotoParaAmigos(foto) {
    ganarMonedas("foto");
    eventoDeseo({
        tipo: "foto",
        filtro: foto.filtro,
        stickers: foto.stickers || []
    });
    const base = {
        tipo: "foto",
        filtro: foto.filtro,
        stickers: foto.stickers || [],
        momento: momentoActual
    };
    if (foto.lugar) {
        eventoAmigos({
            ...base,
            lugar: foto.lugar
        });
        return;
    }
    const conPosicion = (lat, lon) => {
        const l = lugarCercano(lat, lon);
        eventoAmigos({
            ...base,
            lugar: l ? l.id : null
        });
    };
    if (ultimaPosicion && Date.now() - (ultimaPosicion.t || 0) < 5 * 6e4) {
        conPosicion(ultimaPosicion.lat, ultimaPosicion.lon);
        return;
    }
    if (estadoUbicacion === "ok" && Sensores.geolocationDisponible()) {
        navigator.geolocation.getCurrentPosition((pos => {
            ultimaPosicion = {
                lat: pos.coords.latitude,
                lon: pos.coords.longitude,
                t: Date.now()
            };
            anotarDondeEstamos(pos);
            conPosicion(pos.coords.latitude, pos.coords.longitude);
        }), (() => eventoAmigos({
            ...base,
            lugar: null
        })), {
            enableHighAccuracy: true,
            timeout: 1e4,
            maximumAge: 12e4
        });
        return;
    }
    eventoAmigos({
        ...base,
        lugar: null
    });
}

function tocarVentana() {
    if (visita) {
        const npc = visita.npc;
        visita = null;
        encuentro = {
            npc: npc,
            paso: "anuncio",
            pendienteEnamorado: false
        };
        diario.anotarNpc(npc.id);
        guardarTodo();
        conTransicion((() => {
            controller.vista = "encuentro";
            renderVistaActual();
        }));
        return;
    }
    abrirJardin();
}

function fraseDeLaVentana() {
    const frases = {
        amanecer: "Good morning, lake!",
        dia: "The lake looks so pretty today.",
        atardecer: "Look at that sky…",
        noche: "The city lights are on."
    };
    const delClima = {
        nublado: "Cloudy today. Cozy.",
        niebla: "I can't even see the pagoda…",
        llovizna: "Tiny raindrops on the glass.",
        lluvia: "Listen to the rain…",
        tormenta: "Stay inside with me, okay?",
        nieve: "SNOW! Everything's white!"
    };
    return delClima[Clima.tipo()] || frases[momentoActual] || frases.dia;
}

function talVezVisita() {
    if (!mascota || mascota.dormida || visita || controller.vista !== "cara" || enCalma("visita")) return;
    if ([ "armado", "pedido", "en_curso" ].includes(Final.fase())) return;
    const conRegalo = amigos.regaloPendiente();
    if (conRegalo) {
        const npc = NPCS.find((n => n.id === conRegalo));
        if (npc) {
            anunciarVisita(npc, {
                regalo: true
            });
            return;
        }
    }
    const ahora = Date.now();
    if (ahora < proximaConsultaVisitaMs) return;
    proximaConsultaVisitaMs = ahora + 5 * 6e4;
    const npc = npcsReg.talVezVisitar(ahora);
    if (!npc) return;
    guardarTodo();
    anunciarVisita(npc);
}

function anunciarVisita(npc, {regalo: regalo = false} = {}) {
    visita = {
        npc: npc,
        hastaMs: regalo ? Infinity : Date.now() + 35e3,
        regalo: regalo
    };
    Sonido.sonar("encuentro");
    vibrar(30);
    sorpresa(2500, {
        nombre: "curioso",
        ms: 5500
    });
    decir(regalo ? `${npc.nombre} is at the window with a gift!` : "Knock knock… someone's at the window!", 4e3);
}

let timeoutEspecial = null;

function mostrarEspecial(nombre, ms, luego = null) {
    if (!mascota || mascota.dormida || mascota.enferma || Final.fotoPedida() || finalOcupado()) return;
    const ahora = Date.now();
    clearTimeout(timeoutEspecial);
    especialActiva = nombre;
    especialHastaMs = ahora + ms + 6e3;
    proximoEspecialPermitidoMs = Math.max(proximoEspecialPermitidoMs, ahora + ms + (luego ? luego.ms : 0) + 5e3);
    timeoutEspecial = setTimeout((() => {
        timeoutEspecial = null;
        if (especialActiva !== nombre) return;
        especialActiva = null;
        if (luego) mostrarEspecial(luego.nombre, luego.ms, luego.luego || null); else if (controller.vista === "cara") renderVistaActual();
    }), ms);
    if (controller.vista === "cara") renderVistaActual();
}

let velitasForzadas = null;

function esNocheDeVelitas(f = new Date) {
    if (velitasForzadas !== null) return velitasForzadas;
    const m = f.getMonth();
    const d = f.getDate();
    const h = f.getHours();
    return m === 11 && (d === 7 && h >= 17 || d === 8 && h < 3);
}

function talVezContarVelitas() {
    if (!esNocheDeVelitas() || !mascota || mascota.dormida || controller.vista !== "cara" || visita || !puedeComentar()) return false;
    const clave = `baozi_velitas_${(new Date).getFullYear()}`;
    try {
        if (localStorage.getItem(clave)) return false;
        localStorage.setItem(clave, "1");
    } catch (e) {
        return false;
    }
    if (diario) diario.anotarHito("Día de las Velitas ♥");
    guardarTodo();
    decir("It's the Day of the Little Candles! In Colombia we light them tonight ♥", 6e3);
    return true;
}

function puedeComentar() {
    return !!mascota && !mascota.dormida && !Final.fotoPedida() && !finalOcupado();
}

function sorpresa(ms = 3e3, luego = null) {
    mostrarEspecial("sorprendido", ms, luego);
}

let proximoSustoMs = 0;

function alRayo() {
    Clima.trueno();
    const ahora = Date.now();
    if (controller.vista !== "cara" || ahora < proximoSustoMs || especialActiva && especialActiva !== "asustado") return;
    proximoSustoMs = ahora + 2e4;
    mostrarEspecial("asustado", 2600);
    if (especialActiva === "asustado" && Math.random() < .35) decir([ "Eek!!", "That was loud…", "I'm not scared. You're scared." ][Math.floor(Math.random() * 3)], 2400);
}

async function revisarClima() {
    const ahora = Date.now();
    if (ahora < proximoClimaMs) return;
    proximoClimaMs = ahora + 20 * 6e4;
    const {antes: antes, ahora: nuevo} = await Clima.actualizar(ultimaPosicion);
    if (nuevo && nuevo !== antes && Clima.esMalo(nuevo) && controller.vista === "cara" && puedeComentar()) {
        sorpresa(3500);
        decir(Clima.FRASES[nuevo] || "Look outside!", 4e3);
    }
    sonidoDelClima();
}

function sonidoDelClima() {
    const t = Clima.tipo();
    let nivel = controller.vista === "cara" && mascota && Clima.llueve(t) ? {
        llovizna: .3,
        lluvia: .7,
        tormenta: 1
    }[t] : 0;
    if (tienda && tienda.cuarto === "cabana") nivel = t === "tormenta" ? .25 : 0;
    Clima.sonidoLluvia(nivel);
}

let jardinUI = {
    eligiendo: null,
    aviso: ""
};

let timeoutAvisoJardin = null;

function abrirJardin() {
    Sonido.sonar("tocar");
    jardinUI = {
        eligiendo: null,
        aviso: ""
    };
    if (!jardin.regalo) {
        jardin.regalo = true;
        for (const p of SEMILLAS_DE_REGALO) tienda.darSemillas(p, 1);
        guardarTodo();
        jardinUI.aviso = "Our balcony! Here are two seeds to start: sunflower and Longjing tea ♥";
    } else if (Clima.llueve(Clima.tipo()) && jardin.hayPlantas()) jardinUI.aviso = "The rain is watering our plants ♪";
    conTransicion((() => {
        prepararVista("jardin");
        renderVistaActual();
    }));
}

function avisoJardin(texto, ms = 3200) {
    jardinUI.aviso = texto;
    const el = document.getElementById("aviso-jardin");
    if (el) {
        el.textContent = texto;
        el.classList.toggle("oculto", !texto);
    }
    clearTimeout(timeoutAvisoJardin);
    timeoutAvisoJardin = setTimeout((() => {
        jardinUI.aviso = "";
        const e2 = document.getElementById("aviso-jardin");
        if (e2) e2.classList.add("oculto");
    }), ms);
}

function renderJardinActual() {
    const hoy = claveDelDia();
    R.renderJardin(screenEl, {
        momento: momentoActual || "dia",
        estados: jardin.estados(hoy),
        semillas: Object.keys(PLANTAS_JARDIN).filter((p => tienda.cantidadSemillas(p) > 0)).map((p => ({
            planta: p,
            nombre: PLANTAS_JARDIN[p].nombre,
            n: tienda.cantidadSemillas(p),
            dias: PLANTAS_JARDIN[p].dias
        }))),
        eligiendo: jardinUI.eligiendo,
        aviso: jardinUI.aviso,
        quiereAgua: jardin.quiereAgua(hoy)
    });
    if (jardinUI.aviso) avisoJardin(jardinUI.aviso, 4200);
    wireJardin();
}

function wireJardin() {
    const hoy = claveDelDia();
    document.getElementById("btn-volver-jardin").addEventListener("click", (() => {
        jardinUI = {
            eligiendo: null,
            aviso: ""
        };
        conTransicion((() => {
            irACasa();
            if (puedeComentar()) decir(fraseDeLaVentana(), 2600);
        }));
    }));
    for (const b of screenEl.querySelectorAll("[data-maceta]")) {
        b.addEventListener("click", (() => tocarMaceta(Number(b.dataset.maceta))));
    }
    for (const b of screenEl.querySelectorAll("[data-semilla]")) {
        b.addEventListener("click", (() => {
            const i = jardinUI.eligiendo;
            const p = b.dataset.semilla;
            if (i === null || !tienda.cantidadSemillas(p) || !jardin.sembrar(i, p, hoy)) return;
            tienda.usarSemilla(p);
            jardinUI.eligiendo = null;
            guardarTodo();
            Sonido.sonar("guardado");
            vibrar(15);
            jardinUI.aviso = `${PLANTAS_JARDIN[p].nombre} planted! Water it every day ♥`;
            renderJardinActual();
        }));
    }
    const cancelar = document.getElementById("btn-semilla-cancelar");
    if (cancelar) {
        cancelar.addEventListener("click", (() => {
            jardinUI.eligiendo = null;
            Sonido.sonar("tocar");
            renderJardinActual();
        }));
    }
    document.getElementById("btn-regar").addEventListener("click", regarJardin);
}

function tocarMaceta(i) {
    const hoy = claveDelDia();
    const e = jardin.estado(i, hoy);
    if (!e) {
        Sonido.sonar("tocar");
        jardinUI.eligiendo = i;
        jardinUI.aviso = "";
        renderJardinActual();
        return;
    }
    if (e.lista) {
        cosecharMaceta(i);
        return;
    }
    Sonido.sonar("tocar");
    const faltan = e.dias - e.dia;
    if (e.mustia) avisoJardin(`The ${e.nombre.toLowerCase()} is so thirsty… water it! (it won't die ♥)`); else if (!e.regadaHoy) avisoJardin(`${e.nombre}: ${faltan} more ${faltan === 1 ? "day" : "days"} of water. Let's water it today!`); else avisoJardin(`${e.nombre}: watered today ✓ ${faltan} more ${faltan === 1 ? "day" : "days"} to go.`);
}

function regarJardin() {
    const hoy = claveDelDia();
    if (!jardin.hayPlantas()) {
        Sonido.sonar("no");
        avisoJardin("Plant a seed first ♥ (tap an empty pot)");
        return;
    }
    const n = jardin.regar(hoy);
    if (!n) {
        Sonido.sonar("tocar");
        avisoJardin(jardin.hayCosecha(hoy) && !jardin.quiereAgua(hoy) ? "Already watered! Something is ready to pick ♥" : "Already watered today ✓ See you tomorrow!");
        return;
    }
    guardarTodo();
    Sonido.sonar("beber");
    vibrar([ 15, 30, 15 ]);
    if (diario) diario.anotarCuidado();
    ganarMonedas("cuidar");
    eventoDeseo({
        tipo: "regar"
    });
    const regadera = document.getElementById("btn-regar");
    if (regadera) regadera.classList.add("regando");
    setTimeout((() => {
        if (controller.vista !== "jardin") return;
        jardinUI.aviso = n === 1 ? "Glug glug… watered! ♥" : `Glug glug… ${n} plants watered! ♥`;
        renderJardinActual();
    }), 1e3);
}

function cosecharMaceta(i) {
    const hoy = claveDelDia();
    const r = jardin.cosechar(i, hoy);
    if (!r) return;
    let texto;
    if (r.cosecha.monedas) {
        const n = tienda.ganar("cosecha", r.cosecha.monedas);
        setTimeout((() => mostrarMonedas(n)), 300);
        texto = `${r.nombre}! Sold for ${n} coins ♥`;
    } else {
        tienda.darComida(r.cosecha.comida, r.cosecha.n);
        const c = productoTienda(r.cosecha.comida);
        texto = `+${r.cosecha.n} ${c ? c.nombre : r.nombre} in the fridge ♥`;
    }
    if (diario) diario.anotarHito(r.primera ? `Our first harvest: ${r.nombre} ♥` : `Harvest: ${r.nombre}`);
    guardarTodo();
    Sonido.sonar("hallazgo");
    vibrar([ 20, 40, 20 ]);
    jardinUI.aviso = texto;
    renderJardinActual();
}

function talVezLluviaRiega() {
    if (!mascota || !jardin.hayPlantas() || !Clima.llueve(Clima.tipo())) return;
    const hoy = claveDelDia();
    if (!jardin.quiereAgua(hoy)) return;
    jardin.regar(hoy);
    guardarTodo();
}

function talVezContarLluvia() {
    const hoy = claveDelDia();
    if (!mascota || controller.vista !== "cara" || visita || !puedeComentar() || jardin.lluviaAvisada === hoy) return false;
    if (!jardin.hayPlantas() || !Clima.llueve(Clima.tipo()) || jardin.quiereAgua(hoy)) return false;
    if (!jardin.estados(hoy).some((e => e && e.regadaHoy))) return false;
    jardin.lluviaAvisada = hoy;
    guardarTodo();
    decir("The rain is watering our plants ♪", 4200);
    return true;
}

function wireHeladera() {
    document.getElementById("btn-volver-heladera").addEventListener("click", (() => conTransicion(irACasa)));
    for (const b of screenEl.querySelectorAll("[data-comida-tienda]")) {
        b.addEventListener("click", (() => {
            const c = productoTienda(b.dataset.comidaTienda);
            if (!c || !tienda.cantidadComida(c.id)) return;
            if (!tienda.puedeUsarHoy(c.id)) {
                Sonido.sonar("no");
                vibrar(30);
                b.classList.remove("sacude");
                void b.offsetWidth;
                b.classList.add("sacude");
                return;
            }
            const ok = manejarTapItem(c.accion, {
                item: c.arte
            });
            if (!ok) return;
            tienda.usarComida(c.id);
            tienda.marcarUsadoHoy(c.id);
            for (const [stat, v] of Object.entries(c.efecto || {})) {
                if (stat in mascota.stats) mascota.stats[stat] = Math.max(0, Math.min(100, mascota.stats[stat] + v));
            }
            guardarTodo();
        }));
    }
    for (const b of screenEl.querySelectorAll("[data-comida]")) {
        b.addEventListener("click", (() => {
            const ok = manejarTapItem(b.dataset.comida, {
                item: b.dataset.item
            });
            if (ok && (b.dataset.item || "").endsWith("bebida_te.png")) eventoAmigos({
                tipo: "comer",
                item: "te"
            });
        }));
    }
}

function abrirCuaderno(pestana) {
    conTransicion((() => {
        controller.abrirConsulta(pestana);
        renderVistaActual();
    }));
}

const CLAVE_UBICACION = "baozi_ubicacion";

function ubicacionActivada() {
    try {
        return localStorage.getItem(CLAVE_UBICACION) === "1";
    } catch (e) {
        return false;
    }
}

async function permisoUbicacion() {
    try {
        if (!navigator.permissions) return "desconocido";
        return (await navigator.permissions.query({
            name: "geolocation"
        })).state;
    } catch (e) {
        return "desconocido";
    }
}

let estadoUbicacion = "pedir";

async function actualizarEstadoUbicacion() {
    if (!Sensores.geolocationDisponible()) {
        estadoUbicacion = "sin";
        return estadoUbicacion;
    }
    const p = await permisoUbicacion();
    if (p === "denied") estadoUbicacion = "sin"; else if (p === "granted" || ubicacionActivada()) estadoUbicacion = "ok"; else estadoUbicacion = "pedir";
    return estadoUbicacion;
}

function cuidarParaElFinal() {
    if (!mascota) return;
    const fase = Final.fase();
    if (![ "armado", "pedido", "en_curso" ].includes(fase)) return;
    mascota.prepararParaElFinal({
        despierta: fase !== "armado"
    });
}

function finalOcupado() {
    return [ "armado", "pedido", "en_curso" ].includes(Final.fase());
}

function anotarDondeEstamos(pos) {
    if (!pos || !pos.coords || !diario) return;
    if (!Donde.anotar(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy)) return;
    diario.hoy();
    guardarTodo();
}

async function revisarLugares(forzar = false) {
    if (!mascota || controller.vista !== "cara" || finalOcupado()) return;
    const ahora = Date.now();
    if (!forzar && ahora < proximaLecturaLugaresMs) return;
    proximaLecturaLugaresMs = ahora + 12e4;
    if (await actualizarEstadoUbicacion() !== "ok") return;
    navigator.geolocation.getCurrentPosition((pos => {
        ultimaPosicion = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            t: Date.now()
        };
        anotarDondeEstamos(pos);
        eventoAmigos({
            tipo: "posicion",
            lat: pos.coords.latitude,
            lon: pos.coords.longitude
        });
        const lugar = lugaresReg.lugarEnRango(pos.coords.latitude, pos.coords.longitude, Date.now());
        if (lugar && controller.vista === "cara" && !finalOcupado()) abrirSello(lugar);
    }), (() => {}), {
        enableHighAccuracy: true,
        timeout: 15e3,
        maximumAge: 6e4
    });
}

function abrirMapa(seleccion = null) {
    if (seleccion) mapaSeleccion = seleccion;
    formLugar = null;
    vistaMapa = null;
    Corcho.asegurar(LUGARES).then((nuevo => {
        if (nuevo && controller.vista === "mapa" && !formLugar) renderMapaActual();
    }));
    actualizarEstadoUbicacion().then((() => {
        conTransicion((() => {
            prepararVista("mapa");
            renderVistaActual();
        }));
    }));
}

let visor = null;

let vistaMapa = null;

function montarVisor(real) {
    if (visor) visor.destruir();
    visor = null;
    const caja = document.getElementById("mapa-real");
    const img = document.getElementById("mapa-real-img");
    if (!caja || !img) return;
    const sellos = [ ...caja.querySelectorAll(".sello-mapa") ];
    if (!vistaMapa) {
        const l = LUGARES.find((x => x.id === mapaSeleccion));
        const p = l ? Corcho.posicion(l.lat, l.lon) : {
            x: real.enc.w / 2,
            y: real.enc.h / 2
        };
        vistaMapa = {
            cx: p.x,
            cy: p.y,
            s: caja.clientWidth / Corcho.pxPorKm(11)
        };
    }
    visor = crearVisor(caja, {
        capa: img,
        w: real.enc.w,
        h: real.enc.h,
        vista: vistaMapa,
        alMover: ({s: s, tx: tx, ty: ty}) => {
            for (const b of sellos) {
                b.style.left = `${tx + Number(b.dataset.mx) * s}px`;
                b.style.top = `${ty + Number(b.dataset.my) * s}px`;
            }
            if (visor) vistaMapa = visor.vista();
        }
    });
    vistaMapa = visor.vista();
    document.getElementById("btn-zoom-mas").addEventListener("click", (() => visor.zoomEn(1.6)));
    document.getElementById("btn-zoom-menos").addEventListener("click", (() => visor.zoomEn(1 / 1.6)));
}

function renderMapaActual() {
    const sellados = lugaresReg.desbloqueados;
    if (!mapaSeleccion || !LUGARES.some((l => l.id === mapaSeleccion))) mapaSeleccion = (LUGARES.find((l => sellados.has(l.id))) || LUGARES[0]).id;
    const real = Corcho.listo();
    R.renderMapa(screenEl, {
        lugares: LUGARES.filter((l => amigos.lugarVisible(l.id, sellados))),
        sellados: sellados,
        fechas: lugaresReg.fechas,
        seleccionado: mapaSeleccion,
        ubicacion: estadoUbicacion,
        fotoDe: id => Camara.fotoDeLugar(id),
        posicion: posicionEnMapa,
        form: formLugar,
        puedeAgregar: lugaresDeElla.length < MAX_LUGARES_DE_ELLA,
        real: real ? {
            png: real.png,
            w: real.enc.w,
            h: real.enc.h,
            posicion: Corcho.posicion
        } : null,
        armando: Corcho.armando()
    });
    if (real) montarVisor(real); else if (visor) {
        visor.destruir();
        visor = null;
    }
    document.getElementById("btn-volver-mapa").addEventListener("click", (() => {
        formLugar = null;
        conTransicion(irACasa);
    }));
    for (const b of screenEl.querySelectorAll("[data-lugar]")) {
        b.addEventListener("click", (() => {
            Sonido.sonar("tocar");
            mapaSeleccion = siguienteEnLaPila(b.dataset.lugar, sellados);
            formLugar = null;
            renderMapaActual();
        }));
    }
    wireLugaresDeElla();
    const btnUbicacion = document.getElementById("btn-ubicacion");
    if (btnUbicacion) {
        btnUbicacion.addEventListener("click", (() => {
            btnUbicacion.disabled = true;
            navigator.geolocation.getCurrentPosition((pos => {
                try {
                    localStorage.setItem(CLAVE_UBICACION, "1");
                } catch (e) {}
                estadoUbicacion = "ok";
                ultimaPosicion = {
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude,
                    t: Date.now()
                };
                anotarDondeEstamos(pos);
                eventoAmigos({
                    tipo: "posicion",
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude
                });
                const lugar = lugaresReg.lugarEnRango(pos.coords.latitude, pos.coords.longitude, Date.now());
                if (lugar) abrirSello(lugar); else renderMapaActual();
            }), (err => {
                estadoUbicacion = err && err.code === 1 ? "sin" : "pedir";
                renderMapaActual();
            }), {
                enableHighAccuracy: true,
                timeout: 15e3,
                maximumAge: 0
            });
        }));
    }
    const btnAqui = document.getElementById("btn-aqui");
    if (btnAqui) {
        btnAqui.addEventListener("click", (() => {
            const lugar = LUGARES.find((l => l.id === mapaSeleccion));
            if (lugar && !lugaresReg.desbloqueados.has(lugar.id)) abrirSello(lugar);
        }));
    }
}

function siguienteEnLaPila(id, sellados) {
    if (id !== mapaSeleccion) return id;
    const actual = LUGARES.find((l => l.id === id));
    if (!actual) return id;
    const real = Corcho.listo();
    const s = vistaMapa ? vistaMapa.s : 1;
    const pos = l => real ? Corcho.posicion(l.lat, l.lon) : posicionEnMapa(l.lat, l.lon);
    const juntos = (a, b) => real ? Math.hypot(a.x - b.x, a.y - b.y) * s < 16 : Math.hypot(a.x - b.x, (a.y - b.y) * .5) < .025;
    const p0 = pos(actual);
    const pila = LUGARES.filter((l => amigos.lugarVisible(l.id, sellados) && juntos(pos(l), p0)));
    if (pila.length < 2) return id;
    return pila[(pila.findIndex((l => l.id === id)) + 1) % pila.length].id;
}

let formLugar = null;

function wireLugaresDeElla() {
    const agregar = document.getElementById("btn-agregar-lugar");
    if (agregar) {
        agregar.addEventListener("click", (() => {
            Sonido.sonar("tocar");
            formLugar = {
                modo: "nuevo",
                nombre: "",
                recuerdo: "",
                sello: SELLOS_PROPIOS[0]
            };
            renderMapaActual();
        }));
    }
    const editar = document.getElementById("btn-editar-lugar");
    if (editar) {
        editar.addEventListener("click", (() => {
            const l = lugaresDeElla.find((x => x.id === mapaSeleccion));
            if (!l) return;
            Sonido.sonar("tocar");
            formLugar = {
                modo: "editar",
                id: l.id,
                nombre: l.nombre,
                recuerdo: l.recuerdo,
                sello: l.sello
            };
            renderMapaActual();
        }));
    }
    if (!formLugar) return;
    const f = formLugar;
    const nombre = document.getElementById("lugar-nombre");
    const recuerdo = document.getElementById("lugar-recuerdo");
    nombre.addEventListener("input", (() => f.nombre = nombre.value));
    recuerdo.addEventListener("input", (() => f.recuerdo = recuerdo.value));
    nombre.addEventListener("keydown", (e => {
        if (e.key === "Enter") recuerdo.focus();
    }));
    for (const b of screenEl.querySelectorAll("[data-sello]")) {
        b.addEventListener("click", (() => {
            f.sello = b.dataset.sello;
            for (const o of screenEl.querySelectorAll("[data-sello]")) {
                o.classList.toggle("elegido", o === b);
                o.setAttribute("aria-checked", String(o === b));
            }
            Sonido.sonar("tocar");
        }));
    }
    document.getElementById("btn-lugar-cancelar").addEventListener("click", (() => {
        formLugar = null;
        Sonido.sonar("tocar");
        renderMapaActual();
    }));
    const borrar = document.getElementById("btn-lugar-borrar");
    if (borrar) {
        borrar.addEventListener("click", (() => {
            if (!f.borrar) {
                f.borrar = true;
                borrar.textContent = "Tap again";
                return;
            }
            borrarLugarDeElla(f.id);
        }));
    }
    document.getElementById("btn-lugar-ok").addEventListener("click", (() => {
        const texto = nombre.value.trim();
        if (!texto) {
            avisoLugar("Give it a name ♥", true);
            Sonido.sonar("no");
            nombre.focus();
            return;
        }
        f.nombre = texto;
        f.recuerdo = recuerdo.value.trim();
        nombre.blur();
        recuerdo.blur();
        if (f.modo === "editar") guardarLugarEditado(f); else sellarLugarNuevo(f);
    }));
}

function avisoLugar(texto, error = false) {
    if (formLugar) {
        formLugar.aviso = texto;
        formLugar.error = error;
    }
    const el = document.getElementById("aviso-lugar");
    if (!el) return;
    el.textContent = texto;
    el.classList.toggle("error", error);
}

function sellarLugarNuevo(f) {
    if (!Sensores.geolocationDisponible()) {
        avisoLugar("This phone can't tell where we are.", true);
        return;
    }
    f.buscando = true;
    const ok = document.getElementById("btn-lugar-ok");
    if (ok) ok.disabled = true;
    avisoLugar("Finding where we are…");
    const pedir = intento => navigator.geolocation.getCurrentPosition((pos => {
        if (formLugar !== f) return;
        const precision = pos.coords.accuracy;
        if (Number.isFinite(precision) && precision > PRECISION_LUGAR_PROPIO_M) {
            if (intento < 2) {
                avisoLugar("Getting a better signal…");
                pedir(intento + 1);
                return;
            }
            f.buscando = false;
            f.aviso = `The signal is weak here (±${Math.round(precision)} m). Try again outside or near a window?`;
            f.error = true;
            renderMapaActual();
            return;
        }
        try {
            localStorage.setItem(CLAVE_UBICACION, "1");
        } catch (e) {}
        estadoUbicacion = "ok";
        ultimaPosicion = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            t: Date.now()
        };
        anotarDondeEstamos(pos);
        const nuevo = lugarDeEllaValido({
            id: `propio_${Date.now().toString(36)}`,
            nombre: f.nombre,
            recuerdo: f.recuerdo,
            sello: f.sello,
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            creado: Date.now()
        });
        formLugar = null;
        if (!nuevo) {
            renderMapaActual();
            return;
        }
        lugaresDeElla = [ ...lugaresDeElla, nuevo ];
        ponerLugaresDeElla(lugaresDeElla);
        mapaSeleccion = nuevo.id;
        guardarTodo();
        abrirSello(LUGARES.find((l => l.id === nuevo.id)));
    }), (err => {
        if (formLugar !== f) return;
        f.buscando = false;
        if (err && err.code === 1) estadoUbicacion = "sin";
        f.aviso = err && err.code === 1 ? "Baozi needs to know where you are: allow location for Baozi in the phone settings." : "Couldn't find where we are. Try again in a moment?";
        f.error = true;
        renderMapaActual();
    }), {
        enableHighAccuracy: true,
        timeout: 15e3,
        maximumAge: intento === 1 ? 3e4 : 0
    });
    pedir(1);
}

const PRECISION_LUGAR_PROPIO_M = 100;

function guardarLugarEditado(f) {
    lugaresDeElla = lugaresDeElla.map((l => l.id === f.id ? lugarDeEllaValido({
        ...l,
        nombre: f.nombre,
        recuerdo: f.recuerdo,
        sello: f.sello
    }) || l : l));
    ponerLugaresDeElla(lugaresDeElla);
    formLugar = null;
    guardarTodo();
    Sonido.sonar("guardado");
    renderMapaActual();
}

function borrarLugarDeElla(id) {
    lugaresDeElla = lugaresDeElla.filter((l => l.id !== id));
    ponerLugaresDeElla(lugaresDeElla);
    lugaresReg.desbloqueados.delete(id);
    delete lugaresReg.fechas[id];
    delete lugaresReg.ultimaOfertaMs[id];
    formLugar = null;
    mapaSeleccion = null;
    guardarTodo();
    Sonido.sonar("tocar");
    renderMapaActual();
}

let lugarDelSello = null;

function abrirSello(lugar) {
    if (!mascota || lugaresReg.desbloqueados.has(lugar.id)) return;
    lugarDelSello = lugaresReg.descubrir(mascota, lugar.id, Date.now()) || lugar;
    diario.anotarLugar(lugar.id);
    alSellar(lugar.id);
    guardarTodo();
    Musica.tocar("descubrimiento");
    conTransicion((() => {
        prepararVista("sello");
        R.renderSello(screenEl, lugarDelSello);
        wireSello(lugarDelSello);
    }));
}

function wireSello(lugar) {
    const huella = document.getElementById("huella-sello");
    setTimeout((() => {
        if (!huella || !huella.isConnected) return;
        huella.classList.add("cae");
        Sonido.sonar("hallazgo");
        vibrar([ 40, 30, 80 ]);
    }), 500);
    setTimeout((() => {
        const texto = document.getElementById("frase-sello");
        if (!texto || !texto.isConnected) return;
        escribir(texto, lugar.frase || lugar.dialogo || "", {
            alTerminar: () => {
                const b = document.getElementById("botones-sello");
                if (b) b.classList.remove("oculto");
                const st = document.getElementById("sticker-nuevo");
                if (st) st.classList.remove("oculto");
            }
        });
    }), 1300);
    document.getElementById("btn-sello-despues").addEventListener("click", (() => terminarSello(lugar)));
    document.getElementById("btn-sello-foto").addEventListener("click", (() => {
        Musica.detener(.3);
        conTransicion((() => abrirLenteEnPantalla({
            modo: "foto",
            lugar: lugar.id,
            titulo: lugar.nombre.toUpperCase(),
            alGuardar: () => {
                if (mascota) diario.anotarFoto();
                guardarTodo();
                mostrarPostal(lugar);
            },
            alSalir: () => mostrarPostal(lugar)
        })));
    }));
}

function mostrarPostal(lugar) {
    conTransicion((() => {
        prepararVista("postal");
        const fotoPostal = Camara.fotoDeLugar(lugar.id);
        R.renderPostal(screenEl, lugar, fotoPostal, lugaresReg.fechas[lugar.id] || Date.now());
        const guardarPostal = document.getElementById("btn-postal-guardar");
        if (guardarPostal && fotoPostal) guardarPostal.addEventListener("click", (() => Galeria.guardarFotoEnGaleria(fotoPostal, `baozi-${lugar.id}`)));
        document.getElementById("btn-postal-listo").addEventListener("click", (() => {
            Sonido.sonar("guardado");
            terminarSello(lugar);
        }));
    }));
}

function terminarSello(lugar) {
    lugarDelSello = null;
    mapaSeleccion = lugar.id;
    if (mostrarCartaSiCorresponde({
        lugarDescubierto: lugar.id
    })) return;
    Musica.detener();
    conTransicion(irACasa);
}

function lanzarCorazon(caja) {
    const corazon = document.createElement("img");
    corazon.className = "corazon-mimo";
    corazon.src = arte("final/corazon_rosa.png");
    corazon.alt = "";
    corazon.style.left = `${35 + Math.random() * 30}%`;
    caja.appendChild(corazon);
    corazon.addEventListener("animationend", (() => corazon.remove()));
}

function abrirPin(opts = {}) {
    prepararVista("director");
    Director.renderPin(screenEl, {
        alOk: () => conTransicion(abrirDirector),
        alSalir: () => conTransicion((() => {
            if (!(opts.alSalir && opts.alSalir())) irACasa();
        }))
    });
}

function abrirDirector() {
    Musica.detener();
    prepararVista("director");
    Director.renderDirector(screenEl, {
        sonidoHabilitado: Sonido.sonidoHabilitado,
        cerrar: () => conTransicion((() => {
            if (!Final.retomarDespuesDelDirector()) irACasa();
        })),
        probarGPS: probarGPSDirector,
        ensayar: () => conTransicion((() => Final.abrirPedido({
            ensayo: true
        }))),
        pedirYa: () => {
            if (Final.fase() === "dormido") Final.armar();
            conTransicion((() => Final.abrirPedido()));
        },
        empezarYa: () => Final.empezarYa(),
        mudanza: {
            estado: () => mudanza.estado,
            previa: () => {
                mudanza = {
                    estado: "llega",
                    desde: 0
                };
                guardarTodo();
                conTransicion(irACasa);
                setTimeout((() => talVezMudanza()), 900);
            },
            deshacer: () => {
                mudanza = {
                    estado: "no",
                    desde: 0
                };
                guardarTodo();
            }
        },
        probarCocina: () => conTransicion(abrirCocinaDePrueba),
        tienda: {
            sumar: n => {
                tienda.monedas += n;
                guardarTodo();
                return tienda.monedas;
            },
            todo: () => tienda.todoDesbloqueado,
            alternarTodo: () => {
                tienda.todoDesbloqueado = !tienda.todoDesbloqueado;
                guardarTodo();
            }
        }
    });
}

let watchFinal = null;

let pedidoPendiente = false;

const VISTAS_INTERRUMPIBLES = new Set([ "cara", "menu", "consulta", "caminar", "heladera", "mapa", "mapadia", "jardin" ]);

function dejarDeVigilar() {
    if (watchFinal !== null) {
        Sensores.detenerSeguimientoGPS(watchFinal);
        watchFinal = null;
    }
}

function vigilarLugarFinal() {
    const debe = !!mascota && Final.armada() && document.visibilityState === "visible" && Sensores.geolocationDisponible();
    if (debe && watchFinal === null) {
        watchFinal = Sensores.iniciarSeguimientoGPS(((lat, lon, precision) => {
            if (Final.posicionRecibida(lat, lon, precision)) {
                pedidoPendiente = true;
                dejarDeVigilar();
                intentarPedido();
            }
        }), (() => {}));
    } else if (!debe) {
        dejarDeVigilar();
    }
}

function intentarPedido() {
    if (!pedidoPendiente) return;
    if (!Final.armada() && !Final.fotoPedida()) {
        pedidoPendiente = false;
        return;
    }
    if (!VISTAS_INTERRUMPIBLES.has(controller.vista) || minijuego) return;
    pedidoPendiente = false;
    if (controller.vista === "caminar") detenerSensoresCaminar();
    conTransicion((() => Final.abrirPedido()));
}

function probarGPSDirector(el) {
    if (!el) return;
    if (!Sensores.geolocationDisponible()) {
        el.textContent = "No GPS in this browser.";
        return;
    }
    el.textContent = "Locating…";
    navigator.geolocation.getCurrentPosition((pos => {
        const {latitude: latitude, longitude: longitude, accuracy: accuracy} = pos.coords;
        const d = Final.distanciaAlLugar(latitude, longitude);
        const dentro = Final.dentroDelLugar(latitude, longitude, accuracy);
        el.textContent = `${Math.round(d)} m from ${FINAL.lugar.nombre} (±${Math.round(accuracy)} m) — ${dentro ? "INSIDE ✓" : "outside"}`;
        el.className = `director-gps ${dentro ? "ok" : ""}`;
    }), (err => {
        el.textContent = err && err.code === 1 ? "Location permission denied." : "No GPS fix right now.";
    }), {
        enableHighAccuracy: true,
        timeout: 15e3,
        maximumAge: 0
    });
}

function cerrarLente() {
    if (lenteAbierto) {
        lenteAbierto.cerrar();
        lenteAbierto = null;
    }
}

const CARAS_STICKER = [ [ "feliz", "ojo_base_energia_alta.png", "boca_base_feliz.png" ], [ "euforico", "ojo_especial_euforico.png", "boca_especial_euforico.png" ], [ "enamorado", "ojo_especial_enamorado.png", "boca_especial_enamorado.png" ], [ "sorprendido", "ojo_especial_sorprendido.png", "boca_especial_sorprendido.png" ], [ "curioso", "ojo_especial_curioso.png", "boca_especial_curioso.png" ], [ "hambriento", "ojo_especial_hambriento.png", "boca_especial_hambriento.png" ], [ "aburrido", "ojo_especial_aburrido.png", "boca_especial_aburrido.png" ], [ "triste", "ojo_especial_decepcionado.png", "boca_especial_decepcionado.png" ], [ "asustado", "ojo_especial_asustado.png", "boca_especial_asustado.png" ], [ "asqueado", "ojo_especial_asqueado.png", "boca_especial_asqueado.png" ], [ "cansada", "ojo_base_energia_baja.png", "boca_base_neutral.png" ], [ "dormida", "ojo_dormida.png", "boca_dormida.png" ] ];

function catalogoStickers() {
    const suya = Personaje.actual();
    const quienes = [ suya, ...Personaje.IDS.filter((q => q !== suya)) ];
    const stickers = [];
    for (const quien of quienes) {
        for (const pose of [ "parado", "sentado" ]) {
            for (const [nombre, ojo, boca] of CARAS_STICKER) {
                const p = nombre === "dormida" ? pose === "parado" ? null : "dormido" : pose;
                if (!p) continue;
                stickers.push({
                    id: `${quien}-${pose}-${nombre}`,
                    nombre: `${Personaje.nombre(quien)} ${nombre}`,
                    grupo: quien,
                    pose: pose,
                    html: R.spriteCara(ojo, boca, false, "", {
                        pose: p,
                        quien: quien
                    }),
                    capas: Personaje.capas(ojo, boca, p, quien).map((c => arte(c.src))),
                    lado: 96
                });
            }
        }
    }
    const extras = [ [ "corazon", "final/corazon_rojo.png" ], [ "corazon-rosa", "final/corazon_rosa.png" ], [ "destello", "final/destello.png" ], [ "estrella", "ui/g_estrella@4.png" ], ...Final.dijoQueSi() ? [ [ "anillo", "final/anillo.png" ] ] : [], ...tienda.stickers().map((id => [ `tienda-${id}`, `tienda/sticker_${id}.png` ])) ];
    for (const [id, src] of extras) {
        stickers.push({
            id: `extra-${id}`,
            nombre: id,
            grupo: "extras",
            html: `<img class="sticker-extra" src="${arte(src)}" alt="" draggable="false" />`,
            capas: [ arte(src) ]
        });
    }
    for (const id of amigos.stickers()) {
        const npc = NPCS.find((n => n.id === id));
        if (!npc) continue;
        const src = arte(`npcs/npc_${id}.png`);
        stickers.push({
            id: `npc-${id}`,
            nombre: npc.nombre,
            grupo: "amigos",
            html: `<img class="sticker-extra sticker-npc" src="${src}" alt="" draggable="false" />`,
            capas: [ src ],
            lado: 80
        });
    }
    const deLugares = [ ...lugaresReg.desbloqueados ].filter(tieneSticker);
    for (const id of deLugares) {
        const src = arte(srcStickerLugar(id));
        stickers.push({
            id: `lugar-${id}`,
            nombre: nombreDeLugar(id),
            grupo: "lugares",
            html: `<img class="sticker-extra" src="${src}" alt="" draggable="false" />`,
            capas: [ src ],
            lado: 64
        });
    }
    const mini = quien => R.spriteCara("ojo_especial_euforico.png", "boca_especial_euforico.png", false, "mini", {
        quien: quien
    });
    return {
        stickers: stickers,
        grupos: [ ...quienes.map((q => ({
            id: q,
            nombre: Personaje.nombre(q),
            html: `${mini(q)}<span>${Personaje.nombre(q)}</span>`
        }))), {
            id: "extras",
            nombre: "Extras",
            html: `<img class="sticker-extra" src="${arte("final/corazon_rojo.png")}" alt="" /><span>Extras</span>`
        }, ...amigos.stickers().length ? [ {
            id: "amigos",
            nombre: "Friends",
            html: `<img class="sticker-extra" src="${arte(`npcs/npc_${amigos.stickers()[0]}.png`)}" alt="" /><span>Friends</span>`
        } ] : [], ...deLugares.length ? [ {
            id: "lugares",
            nombre: "Places",
            html: `<img class="sticker-extra" src="${arte(srcStickerLugar(deLugares[0]))}" alt="" /><span>Places</span>`
        } ] : [] ],
        iconoSticker: mini(suya)
    };
}

function abrirLenteEnPantalla(opts = {}) {
    cerrarLente();
    prepararVista("lente");
    lenteAbierto = abrirLente(screenEl, {
        ...catalogoStickers(),
        ...opts,
        alSalir: () => {
            lenteAbierto = null;
            (opts.alSalir || (() => conTransicion(irACasa)))();
        },
        alGuardar: foto => {
            lenteAbierto = null;
            if (opts.modo !== "pedido" && opts.tipoFoto !== "final" && foto && !opts.ensayo) fotoParaAmigos(foto);
            (opts.alGuardar || (() => conTransicion(irACasa)))(foto);
        }
    });
}

function abrirLenteDesdeMenu() {
    abrirLenteEnPantalla({
        modo: "foto",
        alGuardar: () => {
            if (mascota) diario.anotarFoto();
            guardarTodo();
            conTransicion((() => {
                R.renderFeedback(screenEl, "Saved to the diary", {
                    icono: "camara"
                });
                prepararVista("feedback");
                setTimeout((() => conTransicion(irACasa)), DURACION_FEEDBACK_MS + 200);
            }));
        }
    });
}

function abrirCategoriaDesdeTab(idCategoria) {
    if (idCategoria === controller.categoria && controller.vista === "menu") return;
    Sonido.sonar("tocar");
    conTransicion((() => {
        controller.abrirCategoria(idCategoria);
        renderVistaActual();
    }));
}

function renderMenuActual() {
    R.renderMenu(screenEl, controller.categoria, controller.indiceCarrusel, {
        estadoItem: {
            sound: Sonido.sonidoHabilitado() ? "ON" : "OFF"
        }
    });
    wireMenu();
}

function moverCarrusel(delta) {
    controller.moverCarrusel(delta);
    Sonido.sonar("tocar");
    renderMenuActual();
}

const UMBRAL_SWIPE_PX = 32;

function wireSwipeCarrusel(pista) {
    let xInicio = null;
    pista.addEventListener("touchstart", (e => {
        xInicio = e.touches[0].clientX;
    }), {
        passive: true
    });
    pista.addEventListener("touchend", (e => {
        if (xInicio === null) return;
        const delta = e.changedTouches[0].clientX - xInicio;
        xInicio = null;
        if (delta > UMBRAL_SWIPE_PX) moverCarrusel(-1); else if (delta < -UMBRAL_SWIPE_PX) moverCarrusel(1);
    }));
}

function wireMenu() {
    document.getElementById("btn-volver-menu").addEventListener("click", (() => {
        conTransicion((() => {
            controller.cerrarCategoria();
            renderVistaActual();
        }));
    }));
    const actual = screenEl.querySelector(".item-carrusel.actual");
    if (actual) actual.addEventListener("click", (() => manejarTapItem(actual.dataset.item)));
    for (const vecino of screenEl.querySelectorAll(".item-carrusel.vecino")) {
        vecino.addEventListener("click", (() => moverCarrusel(Number(vecino.dataset.mover))));
    }
    const btnPrev = document.getElementById("btn-carrusel-prev");
    const btnNext = document.getElementById("btn-carrusel-next");
    if (btnPrev) btnPrev.addEventListener("click", (() => moverCarrusel(-1)));
    if (btnNext) btnNext.addEventListener("click", (() => moverCarrusel(1)));
    const pista = document.getElementById("pista-carrusel");
    if (pista) wireSwipeCarrusel(pista);
}

function manejarTapItem(itemId, opts = {}) {
    const resultado = ejecutarItemMenu(itemId, mascota, Date.now());
    if (!resultado) return false;
    if (resultado.tipo === "accion") {
        if (resultado.ok) {
            mostrarFeedbackAccion(itemId, opts);
            guardarTodo();
            return true;
        } else {
            const [titulo, subtitulo] = MOTIVOS_ACCION_FALLIDA[itemId] || [ "Not now", "" ];
            Sonido.sonar("no");
            mostrarAviso(titulo, subtitulo);
        }
        guardarTodo();
    } else if (resultado.tipo === "minijuego") {
        if (mascota.dormida) {
            const [titulo, subtitulo] = MOTIVOS_ACCION_FALLIDA.play;
            Sonido.sonar("no");
            mostrarAviso(titulo, subtitulo);
        } else {
            Sonido.sonar("tocar");
            conTransicion((() => {
                controller.vista = "juegos";
                renderVistaActual();
            }));
        }
    } else if (resultado.tipo === "caminar") {
        conTransicion(iniciarCaminar);
    } else if (resultado.tipo === "lente") {
        if (Final.fotoPedida()) conTransicion((() => Final.abrirPedido())); else conTransicion(abrirLenteDesdeMenu);
    } else if (resultado.tipo === "ajuste") {
        Sonido.alternarSonido();
        if (!Sonido.sonidoHabilitado()) Musica.detener(.1);
        sonidoDelClima();
        renderMenuActual();
    } else if (resultado.tipo === "consulta") {
        Sonido.sonar("tocar");
        conTransicion((() => {
            controller.abrirConsulta(resultado.dato);
            renderVistaActual();
        }));
    }
}

function etiquetaFeedback(itemId) {
    return {
        feed: "Yum!",
        water: "Gulp gulp!",
        clean: "Squeaky clean!",
        sleep: mascota.dormida ? "Good night…" : "Good morning!",
        medicine: "All better!"
    }[itemId] || "Done!";
}

const DURACION_FEEDBACK_ACCION_MS = 2400;

const SONIDO_POR_ACCION = {
    feed: "comer",
    water: "beber",
    clean: "limpiar",
    medicine: "medicina"
};

function mostrarFeedbackAccion(itemId, opts = {}) {
    Sonido.sonar(itemId === "sleep" ? mascota.dormida ? "dormir" : "despertar" : SONIDO_POR_ACCION[itemId] || "mimo");
    diario.anotarCuidado();
    ganarMonedas("cuidar");
    if (itemId === "feed" || itemId === "water") eventoDeseo({
        tipo: "comer",
        item: opts.item || (itemId === "water" ? "comida/bebida_agua.png" : "")
    }); else eventoDeseo({
        tipo: "cuidar",
        accion: itemId
    });
    if (itemId === "feed") {
        const comida = opts.item || COMIDA_REL[Math.floor(Math.random() * COMIDA_REL.length)];
        conTransicion((() => R.renderFeedAccion(screenEl, comida)));
    } else if (itemId === "water") {
        conTransicion((() => R.renderBeberAccion(screenEl, opts.item || "comida/bebida_agua.png")));
    } else if (itemId === "sleep" && !mascota.dormida) {
        conTransicion((() => R.renderDespertarAccion(screenEl)));
    } else if (itemId === "clean") {
        conTransicion((() => R.renderCleanAccion(screenEl)));
    } else if (itemId === "medicine") {
        conTransicion((() => R.renderMedicineAccion(screenEl)));
    } else if (itemId === "sleep" && mascota.dormida) {
        conTransicion((() => R.renderSleepAccion(screenEl)));
    } else {
        mostrarFeedback(etiquetaFeedback(itemId), {
            icono: itemId === "water" ? "gota" : "check"
        });
        return;
    }
    controller.vista = "feedback";
    actualizarTabbar();
    setTimeout((() => conTransicion(irACasa)), DURACION_FEEDBACK_ACCION_MS);
}

function mostrarFeedback(titulo, opts = {}) {
    controller.vista = "feedback";
    actualizarTabbar();
    conTransicion((() => R.renderFeedback(screenEl, titulo, opts)));
    setTimeout((() => conTransicion(irACasa)), DURACION_FEEDBACK_MS);
}

function mostrarAviso(titulo, subtitulo) {
    controller.vista = "feedback";
    actualizarTabbar();
    conTransicion((() => R.renderAviso(screenEl, titulo, subtitulo)));
    setTimeout((() => conTransicion(irACasa)), DURACION_FEEDBACK_MS + 300);
}

function renderConsulta() {
    const tipo = controller.consultaActual;
    const tmp = document.createElement("div");
    if (tipo === "diary") {
        if (verCartas) R.renderCartas(tmp, cartasQueLlegaron()); else if (verAlbum) R.renderAlbum(tmp, {
            tengo: lugaresReg.desbloqueados,
            nombre: nombreDeLugar
        }); else if (verMeses) R.renderMeses(tmp, mesesDisponibles().map((m => ({
            mes: m,
            nombre: nombreDelMes(m),
            anio: m.slice(0, 4)
        })))); else if (verCalendario) R.renderCalendario(tmp, diario, {
            ...cal,
            hoy: claveDelDia(),
            primera: diario.primeraFecha(),
            saltos: saltosCalendario()
        }); else R.renderDiario(tmp, diario, {
            puedeRepetirFinal: Final.dijoQueSi(),
            cartas: cartasQueLlegaron().length,
            meses: mesesDisponibles().length,
            album: cuantosTiene(lugaresReg.desbloqueados),
            pasos: pasosDeLaTarjeta(),
            ventana: ventanaDiario(),
            ...opcionesPagina()
        });
    } else if (tipo === "stats") {
        elegirDeseo();
        const d = deseos.actual();
        R.renderStats(tmp, mascota, {
            deseo: d && !finalEnMarcha() && !enCalma("deseo") ? {
                texto: d.texto,
                real: !!d.real,
                estado: deseos.estado,
                progreso: deseos.progreso,
                meta: d.meta || 0
            } : null,
            palabras: palabras.diccionario(),
            totalPalabras: PALABRAS.length,
            hayVoz: hayVoz()
        });
    } else if (tipo === "traits") R.renderTraits(tmp, mascota); else if (tipo === "npcs") R.renderNpcs(tmp, npcsReg, amigos, {
        progreso: m => progresoDe(m, contextoAmigos())
    }); else if (tipo === "closet") R.renderCloset(tmp, amigos, tienda.accesorios()); else if (tipo === "shop") {
        if (!estadoTiendaUI.nuevas) estadoTiendaUI.nuevas = new Set(tienda.nuevas().map((c => c.id)));
        tienda.marcarVistas();
        R.renderTienda(tmp, tienda, {
            ...estadoTiendaUI,
            puesto: amigos.puesto,
            peluche: Personaje.IDS.find((q => q !== Personaje.actual())) || "baozi",
            decos: decosDelCuarto()
        });
    } else if (tipo === "ajustes" || tipo === "backup") tmp.innerHTML = R.htmlAjustes(Sonido.sonidoHabilitado(), Donde.activo(), {
        fotos: Camara.cantidadDeFotos(),
        conVideo: Final.dijoQueSi()
    }); else R.renderProgress(tmp, mascota, lugaresReg);
    const cabecera = tmp.querySelector(".encabezado-vista");
    if (cabecera) cabecera.remove();
    R.renderCuaderno(screenEl, tipo === "backup" ? "ajustes" : tipo, tmp.innerHTML, estiloCuaderno);
    if (tipo !== "shop") estadoTiendaUI = {};
    if (tipo !== "diary") {
        verCartas = verAlbum = verMeses = verCalendario = false;
        anclaDiario = null;
    }
    if (tipo === "shop") wireTienda();
    const pestanaTienda = screenEl.querySelector('.cuaderno-pestanas [data-pestana="shop"]');
    if (pestanaTienda && tienda.nuevas().length) pestanaTienda.classList.add("con-novedad");
    if (tipo === "diary") wireDiario();
    if (tipo === "diary") {
        const ver = document.getElementById("btn-ver-cartas");
        if (ver) ver.addEventListener("click", (() => {
            Sonido.sonar("tocar");
            verCartas = true;
            renderConsulta();
        }));
        const volver = document.getElementById("btn-cartas-volver");
        if (volver) volver.addEventListener("click", (() => {
            Sonido.sonar("tocar");
            verCartas = false;
            renderConsulta();
        }));
        if (verCartas) for (const b of screenEl.querySelectorAll("[data-leer-carta]")) b.addEventListener("click", (() => releerCarta(b.dataset.leerCarta)));
        const sub = (id, fn) => {
            const b = document.getElementById(id);
            if (b) b.addEventListener("click", (() => {
                Sonido.sonar("tocar");
                fn();
                renderConsulta();
            }));
        };
        sub("btn-ver-album", (() => verAlbum = true));
        const bPasos = document.getElementById("btn-anotar-pasos-diario");
        if (bPasos) bPasos.addEventListener("click", (() => {
            try {
                localStorage.removeItem(CLAVE_PASOS_LUEGO);
            } catch (e) {}
            abrirPreguntaPasos(diaDeLaTarjetaPasos(), {
                volverA: "diario"
            });
        }));
        sub("btn-album-volver", (() => verAlbum = false));
        sub("btn-ver-meses", (() => verMeses = true));
        sub("btn-meses-volver", (() => verMeses = false));
        for (const b of screenEl.querySelectorAll("[data-abrir-mes]")) b.addEventListener("click", (() => abrirMes(b.dataset.abrirMes, "diario")));
        const abrirCal = () => {
            verCalendario = true;
            const dia = anclaDiario ? centroDeVentana() : claveDelDia();
            cal = {
                mes: dia.slice(0, 7),
                filtro: cal.filtro || "todo",
                marcado: dia
            };
        };
        sub("btn-ver-calendario", abrirCal);
        sub("btn-semana-calendario", abrirCal);
        for (const b of screenEl.querySelectorAll("[data-cal-volver]")) b.addEventListener("click", (() => {
            Sonido.sonar("tocar");
            verCalendario = false;
            renderConsulta();
        }));
        if (verCalendario) wireCalendario();
        for (const b of screenEl.querySelectorAll("[data-mover-paginas]")) b.addEventListener("click", (() => moverPaginas(b.dataset.moverPaginas)));
        const estilo = document.getElementById("btn-estilo-cuaderno");
        if (estilo) estilo.addEventListener("click", (() => {
            Sonido.sonar("tocar");
            abrirEstiloCuaderno();
        }));
        if (paginaParaMostrar && !verCalendario) {
            const fig = screenEl.querySelector(`.polaroid[data-dia="${paginaParaMostrar}"]`);
            if (fig) fig.scrollIntoView({
                block: "nearest",
                inline: "center"
            });
            if (fig && recienElegida === paginaParaMostrar) {
                fig.classList.add("recien-elegida");
                setTimeout((() => fig.classList.remove("recien-elegida")), 1600);
            }
            paginaParaMostrar = recienElegida = null;
        }
    }
    if (tipo === "stats") {
        const b = screenEl.querySelector("[data-ver-deseo]");
        if (b) b.addEventListener("click", (() => abrirDeseo("stats")));
        for (const o of screenEl.querySelectorAll("[data-oir]")) o.addEventListener("click", (() => oirPalabra(PALABRAS[Number(o.dataset.oir)], o.dataset.idioma)));
    }
    if (tipo === "closet") {
        for (const b of screenEl.querySelectorAll("[data-accesorio]")) {
            b.addEventListener("click", (() => {
                amigos.poner(amigos.puesto === b.dataset.accesorio ? null : b.dataset.accesorio);
                Personaje.ponerAccesorio(amigos.puesto);
                guardarTodo();
                Sonido.sonar(amigos.puesto ? "guardado" : "tocar");
                renderConsulta();
            }));
        }
    }
    if (tipo === "ajustes" || tipo === "backup") {
        wireBackup();
        document.getElementById("btn-ver-tutorial").addEventListener("click", (() => conTransicion((() => abrirTutorial((() => {
            controller.abrirConsulta("ajustes");
            controller.vista = "consulta";
            renderVistaActual();
        }))))));
        document.getElementById("btn-ajuste-lugares").addEventListener("click", (() => {
            Donde.ponerActivo(!Donde.activo());
            Sonido.sonar("tocar");
            renderConsulta();
        }));
        document.getElementById("btn-ajuste-sonido").addEventListener("click", (() => {
            Sonido.alternarSonido();
            if (!Sonido.sonidoHabilitado()) Musica.detener(.1);
            sonidoDelClima();
            renderConsulta();
        }));
    }
    for (const b of screenEl.querySelectorAll(".cuaderno-pestanas [data-pestana]")) {
        b.addEventListener("click", (() => {
            if (b.dataset.pestana === controller.consultaActual) return;
            Sonido.sonar("tocar");
            controller.abrirConsulta(b.dataset.pestana);
            renderConsulta();
        }));
    }
    document.getElementById("btn-volver-consulta").addEventListener("click", (() => {
        estadoTiendaUI = {};
        verCartas = verAlbum = verMeses = verCalendario = false;
        anclaDiario = null;
        conTransicion(irACasa);
    }));
}

function decosDelCuarto() {
    const peluche = Personaje.IDS.find((q => q !== Personaje.actual())) || "baozi";
    const compradas = tienda.decoraciones().map((id => {
        const c = productoTienda(id);
        return {
            id: id,
            nombre: c.nombre,
            arte: id === "peluche" ? `tienda/deco_peluche_${peluche}.png` : c.arte
        };
    }));
    const regaladas = amigos.delTipo("decoracion").map((r => ({
        id: r.id,
        nombre: r.nombre,
        arte: r.id === "cuadro" ? `amigos/deco_cuadro_${Personaje.actual()}.png` : r.arte
    })));
    return [ ...compradas, ...regaladas ].map((d => ({
        ...d,
        puesta: tienda.estaPuesta(d.id)
    })));
}

let estadoTiendaUI = {};

function wireTienda() {
    const repintar = cambios => {
        estadoTiendaUI = {
            ...estadoTiendaUI,
            ...cambios
        };
        const scroll = screenEl.querySelector(".cuaderno-contenido");
        const y = scroll ? scroll.scrollTop : 0;
        renderConsulta();
        const scroll2 = screenEl.querySelector(".cuaderno-contenido");
        if (scroll2) scroll2.scrollTop = y;
    };
    for (const b of screenEl.querySelectorAll("[data-comprar]")) {
        b.addEventListener("click", (() => {
            const c = productoTienda(b.dataset.comprar);
            if (!c) return;
            if (tienda.monedas < c.precio) {
                Sonido.sonar("no");
                repintar({
                    falta: c.id,
                    confirmar: null,
                    recien: null
                });
                return;
            }
            Sonido.sonar("tocar");
            repintar({
                confirmar: c.id,
                falta: null,
                recien: null
            });
        }));
    }
    for (const b of screenEl.querySelectorAll("[data-alternar-deco]")) {
        b.addEventListener("click", (() => {
            const puesta = tienda.alternarDeco(b.dataset.alternarDeco);
            guardarTodo();
            Sonido.sonar(puesta ? "guardado" : "tocar");
            repintar({
                confirmar: null,
                recien: null,
                falta: null
            });
        }));
    }
    for (const b of screenEl.querySelectorAll("[data-poner-cuarto]")) {
        b.addEventListener("click", (() => {
            if (!tienda.ponerCuarto(b.dataset.ponerCuarto)) return;
            aplicarCuarto();
            guardarTodo();
            Sonido.sonar("guardado");
            repintar({
                confirmar: null,
                recien: null,
                falta: null
            });
        }));
    }
    for (const b of screenEl.querySelectorAll("[data-poner-mascota]")) {
        b.addEventListener("click", (() => {
            if (!tienda.ponerMascota(b.dataset.ponerMascota || null)) return;
            guardarTodo();
            Sonido.sonar(tienda.mascota ? "guardado" : "tocar");
            repintar({
                confirmar: null,
                recien: null,
                falta: null
            });
        }));
    }
    const cancelar = screenEl.querySelector("[data-cancelar-compra]");
    if (cancelar) cancelar.addEventListener("click", (() => repintar({
        confirmar: null
    })));
    const confirmar = screenEl.querySelector("[data-confirmar-compra]");
    if (confirmar) {
        confirmar.addEventListener("click", (() => {
            const c = productoTienda(confirmar.dataset.confirmarCompra);
            if (!c || tienda.comprar(c.id) !== "ok") {
                Sonido.sonar("no");
                repintar({
                    confirmar: null
                });
                return;
            }
            if (c.tipo === "accesorio") {
                amigos.poner(c.acc || c.id);
                Personaje.ponerAccesorio(amigos.puesto);
            }
            if (c.tipo === "cuarto") {
                tienda.ponerCuarto(c.id);
                aplicarCuarto();
            }
            if (c.tipo === "mascota") tienda.ponerMascota(c.id);
            guardarTodo();
            Sonido.sonar("compra");
            vibrar([ 15, 30, 15 ]);
            if (diario) diario.anotarHito(`Bought: ${c.nombre}`);
            guardarTodo();
            repintar({
                confirmar: null,
                recien: c.id,
                falta: null
            });
        }));
    }
}

let urlVideoDiario = null;

let decorando = null;

let paginaParaMostrar = null;

function opcionesPagina() {
    const cat = catalogoStickers();
    const html = new Map(cat.stickers.map((s => [ s.id, s.html ])));
    return {
        htmlSticker: id => html.get(id) || "",
        cuaderno: estiloCuaderno
    };
}

function abrirDecorarDia(clave, estilo = undefined, transicion = true) {
    const entrada = diario && diario.entradaDe(clave);
    if (!entrada) return;
    const empezar = () => {
        if (decorando && decorando.ui) decorando.ui.destruir();
        controller.vista = "decorar";
        actualizarTabbar();
        actualizarMarco();
        screenEl.classList.add("sin-margen");
        const inicial = estilo !== undefined ? estilo : entrada.estilo || null;
        decorando = {
            clave: clave,
            estilo: inicial,
            ui: null
        };
        const cat = catalogoStickers();
        const op = {
            puedeRepetirFinal: false,
            htmlSticker: id => (cat.stickers.find((s => s.id === id)) || {}).html || "",
            cuaderno: estiloCuaderno,
            edicion: true
        };
        decorando.ui = abrirDecorar(screenEl, {
            entrada: entrada,
            estilo: inicial,
            catalogo: {
                stickers: cat.stickers,
                grupos: cat.grupos
            },
            htmlPagina: e => R.htmlPolaroid({
                ...entrada,
                estilo: e
            }, op),
            sonar: n => Sonido.sonar(n),
            alCambiar: e => {
                if (decorando) decorando.estilo = e;
            },
            alListo: e => {
                diario.ponerEstilo(clave, e);
                guardarTodo();
                Sonido.sonar("guardado");
                terminarDecorar(clave, irAlDiario);
            },
            alPalabras: e => {
                diario.ponerEstilo(clave, e);
                guardarTodo();
                terminarDecorar(clave, (() => abrirEscribir({
                    clave: clave,
                    alDiario: true
                })));
            }
        });
    };
    if (transicion) conTransicion(empezar); else empezar();
}

function terminarDecorar(clave, despues) {
    if (decorando && decorando.ui) decorando.ui.destruir();
    decorando = null;
    paginaParaMostrar = clave;
    conTransicion(despues);
}

function abrirEstiloCuaderno() {
    const viejo = document.getElementById("velo-estilo");
    if (viejo) viejo.remove();
    screenEl.insertAdjacentHTML("beforeend", R.htmlEstiloCuaderno(estiloCuaderno));
    const velo = document.getElementById("velo-estilo");
    velo.addEventListener("click", (e => {
        if (e.target === velo || e.target.closest("#btn-estilo-listo")) {
            Sonido.sonar("tocar");
            velo.remove();
            return;
        }
        const b = e.target.closest("[data-estilo-hojas], [data-estilo-anillos], [data-estilo-papel]");
        if (!b) return;
        const campo = b.dataset.estiloHojas ? "hojas" : b.dataset.estiloAnillos ? "anillos" : "papel";
        estiloCuaderno = limpiarCuaderno({
            ...estiloCuaderno,
            [campo]: b.dataset[`estilo${campo[0].toUpperCase()}${campo.slice(1)}`]
        });
        guardarTodo();
        Sonido.sonar("tocar");
        const scroll = screenEl.querySelector(".tira-diario");
        const x = scroll ? scroll.scrollLeft : 0;
        renderConsulta();
        const scroll2 = screenEl.querySelector(".tira-diario");
        if (scroll2) scroll2.scrollLeft = x;
        abrirEstiloCuaderno();
    }));
}

const nombreDeLugar = id => (LUGARES.find((l => l.id === id)) || {}).nombre || "a special place";

const LUGARES_CON_FOTO_ARTE = new Set([ "westlake", "longjing", "lingyin" ]);

const arteDeRecuerdo = id => LUGARES_CON_FOTO_ARTE.has(id) ? arte(`lugares/lugar_${id}.png`) : tieneSticker(id) ? arte(srcStickerLugar(id)) : null;

function fechaCortaHoy() {
    const f = new Date;
    return `${f.toLocaleString("en-US", {
        month: "short"
    }).toUpperCase()} ${f.getDate()}`;
}

function abrirElRestaurante() {
    if (restaurante) restaurante.destruir();
    prepararVista("restaurante");
    Musica.detener(.3);
    restaurante = abrirRestaurante(screenEl, {
        arte: arte,
        sprite: (ojo, boca) => R.spriteCara(ojo, boca),
        cambiarCara: (el, ojo, boca) => R.cambiarCara(el, ojo, boca),
        sonar: n => Sonido.sonar(n),
        vibrar: vibrar,
        reg: restauranteReg,
        tienda: tienda,
        sellados: lugaresReg.desbloqueados,
        nombreLugar: nombreDeLugar,
        amigos: NPCS.map((n => ({
            id: n.id,
            nombre: n.nombre,
            conocido: (npcsReg.vecesEncontrado[n.id] || 0) > 0
        }))),
        nombre: Personaje.nombre(),
        guardar: () => guardarTodo(),
        alSalir: () => conTransicion(irACasa),
        alCerrarTurno: ({paga: paga, felices: felices, sobras: sobras}) => {
            if (paga) tienda.ganar("restaurante", paga);
            for (const id of sobras) tienda.darComida(id, 1);
            if (felices) {
                mascota.resultadoMinijuego(Math.min(felices, 10), Date.now());
                diario.anotarJuego(paga);
            }
            if (paga) setTimeout((() => mostrarMonedas(paga)), 400);
        }
    });
}

function abrirCocinaDePrueba() {
    if (restaurante) restaurante.destruir();
    prepararVista("restaurante");
    Musica.detener(.3);
    const reg = new Restaurante;
    for (const r of RECETAS_REST) reg.compradas.add(r.id);
    restaurante = abrirRestaurante(screenEl, {
        prueba: true,
        arte: arte,
        sprite: (ojo, boca) => R.spriteCara(ojo, boca),
        cambiarCara: (el, ojo, boca) => R.cambiarCara(el, ojo, boca),
        sonar: n => Sonido.sonar(n),
        vibrar: vibrar,
        reg: reg,
        tienda: {
            monedas: 0,
            gastar: () => false,
            ganar: () => {},
            darComida: () => {}
        },
        sellados: new Set,
        nombreLugar: nombreDeLugar,
        amigos: NPCS.map((n => ({
            id: n.id,
            nombre: n.nombre,
            conocido: true
        }))),
        nombre: Personaje.nombre(),
        guardar: () => {},
        alSalir: () => {
            if (restaurante) restaurante.destruir();
            restaurante = null;
            conTransicion(abrirDirector);
        },
        alCerrarTurno: () => {}
    });
}

function abrirPalabra() {
    palabras.ver(claveDelDia());
    guardarTodo();
    conTransicion((() => {
        prepararVista("palabra");
        renderVistaActual();
    }));
}

function oirPalabra(p, idioma) {
    if (!p) return;
    const ok = idioma === "zh" ? decirEnVoz(p.zh, "zh-CN") : decirEnVoz(p.es.replace(/[¡!¿?]/g, ""), "es-ES");
    if (!ok) Sonido.sonar("no");
}

function renderPalabraActual() {
    const p = palabras.deHoy(claveDelDia());
    R.renderPalabra(screenEl, p, {
        fecha: fechaCortaHoy(),
        voz: hayVoz()
    });
    const en = (id, fn) => {
        const b = document.getElementById(id);
        if (b) b.addEventListener("click", fn);
    };
    en("btn-oir-es", (() => oirPalabra(p, "es")));
    en("btn-oir-zh", (() => oirPalabra(p, "zh")));
    en("btn-palabra-fechas", (() => {
        Sonido.sonar("tocar");
        abrirFechas();
    }));
    en("btn-palabra-listo", (() => {
        Sonido.sonar("tocar");
        conTransicion(irACasa);
    }));
}

function haceCuanto(clave) {
    const [y, m, d] = clave.split("-").map(Number);
    const dias = Math.round(((new Date).setHours(12, 0, 0, 0) - new Date(y, m - 1, d, 12).getTime()) / 864e5);
    if (dias <= 1) return "yesterday";
    if (dias < 14) return `${dias} days ago`;
    if (dias < 60) return `${Math.round(dias / 7)} weeks ago`;
    return `${Math.round(dias / 30)} months ago`;
}

let ultimoSueno = "";

function suenoDeBaozi() {
    const hoy = claveDelDia();
    const recuerdos = [];
    for (const f of Camara.todasLasFotos()) {
        if (!f || !f.dataUrl || !f.dia || f.dia === hoy || f.tipo === "final") continue;
        recuerdos.push({
            clave: `f${f.clave || f.t}`,
            src: f.dataUrl,
            que: f.lugar ? nombreDeLugar(f.lugar) : "a photo we took",
            dia: f.dia,
            propia: true
        });
    }
    for (const id of lugaresReg.desbloqueados) {
        const src = arteDeRecuerdo(id);
        const t = lugaresReg.fechas && lugaresReg.fechas[id];
        if (!src || !t) continue;
        const dia = claveDelDia(new Date(t));
        if (dia === hoy) continue;
        recuerdos.push({
            clave: `l${id}`,
            src: src,
            que: nombreDeLugar(id),
            dia: dia,
            propia: false
        });
    }
    const opciones = recuerdos.length > 1 ? recuerdos.filter((r => r.clave !== ultimoSueno)) : recuerdos;
    const r = opciones.length ? opciones[Math.floor(Math.random() * opciones.length)] : null;
    if (r) ultimoSueno = r.clave;
    const viejo = screenEl.querySelector(".burbuja-sueno");
    if (viejo) viejo.remove();
    if (globoTemporal) {
        globoTemporal = "";
        clearTimeout(timeoutGlobo);
        renderVistaActual();
    }
    const caja = screenEl.querySelector(".caja-cara");
    const pant = screenEl.getBoundingClientRect();
    const c = caja ? caja.getBoundingClientRect() : {
        left: pant.left + pant.width / 2,
        top: pant.top + pant.height / 2,
        width: 0,
        height: 0
    };
    const x = Math.min(pant.width - 250, Math.max(8, c.left - pant.left + c.width * .55));
    const y = Math.max(6, c.top - pant.top - 150);
    const el = document.createElement("div");
    el.className = "burbuja-sueno";
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.innerHTML = r ? `<span class="sueno-bolita sb1"></span><span class="sueno-bolita sb2"></span><div class="nube-sueno"><img class="${r.propia ? "" : "arte"}" src="${r.src}" alt="" draggable="false" /><div class="texto-sueno"><b>${Personaje.nombre().toUpperCase()} IS DREAMING OF…</b>${r.que}, ${haceCuanto(r.dia)}</div></div>` : `<span class="sueno-bolita sb1"></span><span class="sueno-bolita sb2"></span><div class="nube-sueno"><img class="arte" src="${arte("comida/comida_dumpling.png")}" alt="" draggable="false" /><div class="texto-sueno"><b>${Personaje.nombre().toUpperCase()} IS DREAMING OF…</b>a mountain of dumplings</div></div>`;
    screenEl.appendChild(el);
    Sonido.sonar("tocar");
    const quitar = () => {
        el.classList.add("se-va");
        setTimeout((() => el.remove()), 400);
    };
    el.addEventListener("click", quitar);
    setTimeout((() => el.isConnected && quitar()), 6500);
}

function resumenDe(mes) {
    return resumenDelMes(mes, {
        entradas: diario ? diario.entradas : [],
        fotosDelDia: k => Camara.fotosDelDia(k).filter((f => f.tipo !== "final")),
        nombreLugar: nombreDeLugar,
        arteLugar: arteDeRecuerdo,
        conSticker: tieneSticker
    });
}

function mesesDisponibles() {
    if (!diario) return [];
    const actual = mesDe(claveDelDia());
    const meses = [ ...new Set(diario.entradas.map((e => mesDe(e.fecha)))) ].filter((m => /^\d{4}-\d{2}$/.test(m) && m < actual)).sort().reverse();
    return meses.filter((m => resumenDe(m)));
}

let mesAbierto = null;

let librito = null;

let mesRevisado = null;

function entregarMes(mes) {
    if (!mesesReg.entregados.includes(mes)) mesesReg.entregados.push(mes);
    guardarTodo();
}

function abrirMes(mes, volver) {
    entregarMes(mes);
    mesAbierto = {
        mes: mes,
        volver: volver
    };
    conTransicion((() => {
        prepararVista("mes");
        renderVistaActual();
    }));
}

function renderMesActual() {
    const r = mesAbierto && resumenDe(mesAbierto.mes);
    if (!r) {
        mesAbierto = null;
        irACasa();
        return;
    }
    if (librito) librito.destruir();
    librito = abrirLibrito(screenEl, r, {
        carita: a => R.caritaAnimo(a),
        baozi: cara => cara === "euforico" ? R.spriteCara("ojo_especial_euforico.png", "boca_especial_euforico.png") : R.spriteCara("ojo_base_energia_alta.png", "boca_base_feliz.png"),
        sticker: id => arte(srcStickerLugar(id)),
        sonar: n => Sonido.sonar(n),
        alCerrar: () => {
            const volver = mesAbierto ? mesAbierto.volver : "casa";
            librito = null;
            mesAbierto = null;
            conTransicion(volver === "diario" ? irAlDiario : irACasa);
        }
    });
}

function talVezEntregarMes() {
    if (!mascota || controller.vista !== "cara" || visita || !puedeComentar() || finalEnMarcha()) return false;
    if (performance.now() - abiertaDesdeMs < 8e3) return false;
    const mes = mesAnterior(claveDelDia());
    if (mesesReg.entregados.includes(mes) || mesRevisado === mes) return false;
    if (!resumenDe(mes)) {
        mesRevisado = mes;
        return false;
    }
    Musica.tocar("carta");
    vibrar([ 20, 60, 20 ]);
    conTransicion((() => {
        prepararVista("sobremes");
        renderVistaActual();
    }));
    return true;
}

function renderSobreMesActual() {
    const mes = mesAnterior(claveDelDia());
    R.renderSobreMes(screenEl, nombreDelMes(mes));
    document.getElementById("btn-mes-luego").addEventListener("click", (() => {
        entregarMes(mes);
        Musica.detener();
        Sonido.sonar("tocar");
        conTransicion(irACasa);
    }));
    document.getElementById("btn-mes-abrir").addEventListener("click", (() => {
        Sonido.sonar("tocar");
        abrirMes(mes, "casa");
    }));
}

function ventanaDiario() {
    const todas = diario.todasRecientes();
    const N = R.VENTANA_DIARIO;
    const maxInicio = Math.max(0, todas.length - N);
    let inicio = 0;
    const buscar = c => todas.findIndex((e => e.fecha === c));
    if (paginaParaMostrar && buscar(paginaParaMostrar) >= 0) {
        const i = buscar(paginaParaMostrar);
        const actual = anclaDiario ? Math.max(0, buscar(anclaDiario)) : 0;
        inicio = i >= actual && i < actual + N ? actual : Math.min(maxInicio, Math.max(0, i - Math.floor(N / 2)));
    } else if (anclaDiario) {
        const i = buscar(anclaDiario);
        inicio = i < 0 ? 0 : Math.min(maxInicio, i);
    }
    anclaDiario = inicio > 0 ? todas[inicio].fecha : null;
    return {
        entradas: todas.slice(inicio, inicio + N),
        masNuevas: inicio > 0,
        masViejas: inicio + N < todas.length
    };
}

function centroDeVentana() {
    const v = ventanaDiario();
    return v.entradas.length ? v.entradas[Math.floor(v.entradas.length / 2)].fecha : claveDelDia();
}

function moverPaginas(hacia) {
    Sonido.sonar("tocar");
    const todas = diario.todasRecientes();
    const N = R.VENTANA_DIARIO;
    const actual = anclaDiario ? Math.max(0, todas.findIndex((e => e.fecha === anclaDiario))) : 0;
    const paso = N - 3;
    const inicio = hacia === "nuevas" ? Math.max(0, actual - paso) : Math.min(Math.max(0, todas.length - N), actual + paso);
    anclaDiario = inicio > 0 ? todas[inicio].fecha : null;
    renderConsulta();
    const tira = screenEl.querySelector(".tira-diario");
    if (tira && hacia === "nuevas") tira.scrollLeft = tira.scrollWidth;
}

function saltosCalendario() {
    const hoy = claveDelDia();
    const primera = diario.primeraFecha();
    const [y, m, d] = hoy.split("-").map(Number);
    const s = [ {
        id: "hoy",
        nombre: "Today",
        glifo: "check"
    } ];
    if (primera && primera < hoy) s.push({
        id: "primero",
        nombre: "Our first day",
        glifo: "corazon"
    });
    const haceMes = claveDelDia(new Date(y, m - 2, Math.min(d, new Date(y, m - 1, 0).getDate())));
    const haceAnio = claveDelDia(new Date(y - 1, m - 1, Math.min(d, new Date(y - 1, m, 0).getDate())));
    if (primera && haceMes >= primera.slice(0, 7) + "-01") s.push({
        id: "mes",
        nombre: "1 month ago",
        glifo: "girar"
    });
    if (primera && haceAnio >= primera.slice(0, 7) + "-01") s.push({
        id: "anio",
        nombre: "1 year ago",
        glifo: "girar"
    });
    return s;
}

function destinoSalto(id) {
    const hoy = claveDelDia();
    const [y, m, d] = hoy.split("-").map(Number);
    if (id === "primero") return diario.primeraFecha() || hoy;
    if (id === "mes") return claveDelDia(new Date(y, m - 2, Math.min(d, new Date(y, m - 1, 0).getDate())));
    if (id === "anio") return claveDelDia(new Date(y - 1, m - 1, Math.min(d, new Date(y - 1, m, 0).getDate())));
    return hoy;
}

function wireCalendario() {
    const cont = screenEl.querySelector(".calendario-diario");
    if (!cont) return;
    cont.addEventListener("click", (e => {
        const flecha = e.target.closest("[data-cal-mes]");
        if (flecha && !flecha.disabled) {
            Sonido.sonar("tocar");
            cal.mes = R.sumarMes(cal.mes, Number(flecha.dataset.calMes));
            renderConsulta();
            return;
        }
        const salto = e.target.closest("[data-cal-ir]");
        if (salto) {
            Sonido.sonar("tocar");
            const dia = destinoSalto(salto.dataset.calIr);
            cal.mes = dia.slice(0, 7);
            cal.marcado = dia;
            renderConsulta();
            return;
        }
        const filtro = e.target.closest("[data-cal-filtro]");
        if (filtro) {
            Sonido.sonar("tocar");
            cal.filtro = filtro.dataset.calFiltro;
            renderConsulta();
            return;
        }
        const dia = e.target.closest("[data-cal-dia]");
        if (dia) {
            Sonido.sonar("tocar");
            cal.marcado = dia.dataset.calDia;
            verCalendario = false;
            paginaParaMostrar = recienElegida = dia.dataset.calDia;
            renderConsulta();
        }
    }));
}

function wireDiario() {
    if (Final.dijoQueSi()) {
        Final.videosDelSi().then((vs => {
            const v = vs.find((x => x.principal)) || vs[0];
            const otros = vs.filter((x => x !== v));
            const tira = screenEl.querySelector(".tira-diario");
            if (!v || !tira || screenEl.querySelector(".tarjeta-video")) return;
            if (urlVideoDiario) URL.revokeObjectURL(urlVideoDiario);
            const url = urlVideoDiario = URL.createObjectURL(v.blob);
            const t = document.createElement("div");
            t.className = "tarjeta-video";
            t.innerHTML = `<video src="${url}" controls playsinline preload="metadata"></video>\n          <div class="tarjeta-video-texto"><b>Our video ♥</b><span>${fechaLegible(claveDelDia(new Date(v.empezo)))}</span>\n          <button class="boton chico boton-galeria" type="button">Save to Photos</button></div>`;
            t.querySelector("button").addEventListener("click", (() => Galeria.guardarVideoEnGaleria(v.blob, "nuestro-video")));
            for (const o of otros) {
                const b = document.createElement("button");
                b.className = "boton chico boton-fantasma boton-galeria";
                b.type = "button";
                b.textContent = `Save clip ${o.parte}`;
                b.addEventListener("click", (() => Galeria.guardarVideoEnGaleria(o.blob, `nuestro-video-${o.parte}`)));
                t.querySelector(".tarjeta-video-texto").appendChild(b);
            }
            tira.parentNode.insertBefore(t, tira);
        })).catch((() => {}));
    }
    const escribirBtn = document.getElementById("btn-escribir-hoy");
    if (escribirBtn) escribirBtn.addEventListener("click", (() => conTransicion((() => abrirEscribir({
        clave: null,
        alDiario: false
    })))));
    for (const fig of screenEl.querySelectorAll(".polaroid")) wirePolaroid(fig);
    const dias = [ ...screenEl.querySelectorAll(".polaroid") ].map((f => f.dataset.dia)).filter((d => Donde.hayMapa(d)));
    MapaDia.hacerPendientes(dias, refrescarPolaroid);
}

function confirmarBorrarFoto(clave, src) {
    Sonido.sonar("tocar");
    const capa = document.createElement("div");
    capa.className = "capa-borrar-foto";
    capa.innerHTML = `\n    <div class="papel hoja-borrar-foto" role="dialog" aria-label="Delete photo">\n      <img src="${src}" alt="" draggable="false" />\n      <div class="hoja-borrar-texto"><b>Delete this photo?</b><small>It can't be undone.</small></div>\n      <div class="fila-botones">\n        <button class="boton boton-fantasma" id="btn-borrar-no" type="button">Keep it</button>\n        <button class="boton boton-peligro" id="btn-borrar-si" type="button">Delete</button>\n      </div>\n    </div>`;
    document.getElementById("app").appendChild(capa);
    const cerrar = () => capa.remove();
    capa.querySelector("#btn-borrar-no").addEventListener("click", (() => {
        Sonido.sonar("tocar");
        cerrar();
    }));
    capa.addEventListener("click", (e => {
        if (e.target === capa) cerrar();
    }));
    capa.querySelector("#btn-borrar-si").addEventListener("click", (async () => {
        capa.querySelector("#btn-borrar-si").disabled = true;
        await Camara.borrarFoto(clave);
        Sonido.sonar("mimo");
        cerrar();
        renderVistaActual();
    }));
}

function wirePolaroid(fig) {
    fig.addEventListener("click", (e => {
        if (e.target.closest("[data-decorar]")) {
            Sonido.sonar("tocar");
            abrirDecorarDia(fig.dataset.dia);
            return;
        }
        const nota = e.target.closest("[data-leer-carta]");
        if (nota) {
            releerCarta(nota.dataset.leerCarta);
            return;
        }
        if (e.target.closest("[data-ver-mapa]")) {
            Sonido.sonar("tocar");
            abrirMapaDia(fig.dataset.dia);
            return;
        }
        if (e.target.closest("[data-guardar-foto]")) {
            const img = fig.querySelector("img.imagen-polaroid");
            if (img && img.classList.contains("mapa-polaroid")) {
                const m = MapaDia.mapaDe(fig.dataset.dia);
                if (m) Galeria.guardarFotoEnGaleria(m.grande, "baozi-mapa-" + fig.dataset.dia);
            } else if (img && img.classList.contains("foto-real")) Galeria.guardarFotoEnGaleria(img.src, "baozi-" + fig.dataset.dia);
            return;
        }
        if (e.target.closest("[data-repetir-final]")) {
            conTransicion((() => Final.repetir()));
            return;
        }
        if (e.target.closest("[data-borrar-foto]")) {
            const img = fig.querySelector("img.imagen-polaroid.foto-real");
            if (img && img.dataset.clave && img.dataset.tipo !== "final") confirmarBorrarFoto(img.dataset.clave, img.src);
            return;
        }
        if (Number(fig.dataset.total) > 1) {
            Sonido.sonar("tocar");
            R.siguienteFotoPolaroid(fig);
        }
    }));
}

function refrescarPolaroid(dia) {
    if (controller.vista === "mapadia" && mapaDiaAbierto === dia) {
        renderMapaDiaActual();
        return;
    }
    if (controller.vista !== "consulta" || controller.consultaActual !== "diary") return;
    const vieja = screenEl.querySelector(`.polaroid[data-dia="${dia}"]`);
    const e = diario && diario.entradaDe(dia);
    if (!vieja || !e) return;
    const caja = document.createElement("div");
    caja.innerHTML = R.htmlPolaroid(e, {
        puedeRepetirFinal: Final.dijoQueSi(),
        ...opcionesPagina()
    });
    const nueva = caja.firstElementChild;
    vieja.replaceWith(nueva);
    wirePolaroid(nueva);
}

let mapaDiaAbierto = null;

let relojesMapaDia = [];

function abrirMapaDia(dia) {
    if (!MapaDia.mapaDe(dia)) return;
    mapaDiaAbierto = dia;
    conTransicion((() => {
        prepararVista("mapadia");
        renderVistaActual();
    }));
    MapaDia.hacerPendientes([ dia ], refrescarPolaroid);
}

function volverAlDiario() {
    relojesMapaDia.forEach(clearTimeout);
    relojesMapaDia = [];
    mapaDiaAbierto = null;
    conTransicion((() => {
        controller.abrirConsulta("diary");
        renderVistaActual();
    }));
}

function renderMapaDiaActual() {
    relojesMapaDia.forEach(clearTimeout);
    relojesMapaDia = [];
    const dia = mapaDiaAbierto;
    const mapa = dia && MapaDia.mapaDe(dia);
    if (!mapa) {
        controller.abrirConsulta("diary");
        renderVistaActual();
        return;
    }
    const {pines: pines, orden: orden} = Donde.pinesDe(dia);
    R.renderMapaDia(screenEl, {
        dia: dia,
        mapa: mapa,
        pines: pines,
        puntos: Donde.puntosDe(dia),
        fotos: Camara.fotosDelDia(dia).length
    });
    document.getElementById("btn-volver-mapa-dia").addEventListener("click", volverAlDiario);
    acomodarMapaDia(mapa, orden);
}

function acomodarMapaDia(mapa, orden) {
    const marco = document.getElementById("mapa-dia-marco");
    const hoja = screenEl.querySelector(".mapa-dia-hoja");
    if (!marco || !hoja) return;
    const W = MapaDia.GRANDE.w, H = MapaDia.GRANDE.h;
    const libreAncho = screenEl.clientWidth - hoja.offsetWidth - 52;
    const libreAlto = screenEl.clientHeight - 28;
    let k = Math.min(2, libreAncho / W, libreAlto / H);
    if (k >= 2) k = 2;
    k = Math.max(1, k);
    marco.style.width = `${Math.round(W * k)}px`;
    marco.style.height = `${Math.round(H * k)}px`;
    const pos = (mapa.pos || []).map((([x, y]) => [ x * k, y * k ]));
    const puestas = [];
    for (const chip of marco.querySelectorAll(".chip-hora")) {
        const p = pos[Number(chip.dataset.pin)];
        if (!p) continue;
        const w = chip.offsetWidth, h = chip.offsetHeight;
        const x = Math.max(2, Math.min(W * k - w - 2, p[0] - w / 2));
        const opciones = [ p[1] + 4, p[1] - 16 - h, p[1] - h / 2 ];
        let y = opciones[0];
        for (const yy of opciones) {
            const dentro = yy >= 2 && yy + h <= H * k - 2;
            const choca = puestas.some((q => x < q.x + q.w + 2 && q.x < x + w + 2 && yy < q.y + q.h + 2 && q.y < yy + h + 2));
            if (dentro && !choca) {
                y = yy;
                break;
            }
        }
        y = Math.max(2, Math.min(H * k - h - 2, y));
        puestas.push({
            x: x,
            y: y,
            w: w,
            h: h
        });
        chip.style.left = `${Math.round(x)}px`;
        chip.style.top = `${Math.round(y)}px`;
    }
    const pj = document.getElementById("mapa-dia-personaje");
    if (!pj || !orden.length) return;
    const lado = pj.offsetWidth || 44;
    const ponerEn = (i, mirarA) => {
        const p = pos[i];
        if (!p) return;
        pj.style.left = `${Math.round(p[0] - lado / 2)}px`;
        pj.style.top = `${Math.round(p[1] - lado + 4)}px`;
        if (mirarA !== undefined && pos[mirarA]) pj.classList.toggle("al-reves", pos[mirarA][0] < p[0]);
    };
    pj.classList.add("sin-transicion");
    ponerEn(orden[0], orden[1]);
    void pj.offsetWidth;
    pj.classList.remove("sin-transicion");
    orden.slice(1).forEach(((i, n) => {
        relojesMapaDia.push(setTimeout((() => {
            if (controller.vista !== "mapadia") return;
            const antes = orden[n];
            pj.classList.toggle("al-reves", pos[i] && pos[antes] && pos[i][0] < pos[antes][0]);
            ponerEn(i);
        }), 700 + n * 1100));
    }));
}

let borradorHoy = null;

let escribiendo = {
    clave: null,
    alDiario: false
};

function irAlDiario() {
    verCartas = verAlbum = verMeses = verCalendario = false;
    controller.abrirConsulta("diary");
    controller.vista = "consulta";
    renderVistaActual();
}

function abrirEscribir(como = null) {
    if (como) escribiendo = {
        clave: como.clave || null,
        alDiario: !!como.alDiario
    };
    controller.vista = "escribir";
    actualizarTabbar();
    actualizarMarco();
    screenEl.classList.add("sin-margen");
    const claveHoy = claveDelDiaLogico();
    const pasado = !!escribiendo.clave && escribiendo.clave !== claveHoy;
    const clave = pasado ? escribiendo.clave : claveHoy;
    const guardada = diario.entrada(clave);
    const entrada = !pasado && borradorHoy ? {
        ...guardada || {},
        ...borradorHoy
    } : guardada;
    const fotos = pasado ? Camara.fotosDelDia(clave) : [ ...Camara.fotosDelDia(claveHoy), ...claveHoy !== claveDelDia() ? Camara.fotosDelDia(claveDelDia()) : [] ];
    R.renderEscribir(screenEl, {
        entrada: entrada,
        foto: fotos.length ? fotos[fotos.length - 1] : null,
        clave: pasado ? clave : null
    });
    let animo = entrada && entrada.animo ? entrada.animo : null;
    const texto = document.getElementById("texto-hoy");
    const personaje = document.getElementById("escribir-personaje");
    const recordar = () => {
        if (!pasado) borradorHoy = {
            animo: animo,
            texto: texto.value
        };
    };
    for (const b of screenEl.querySelectorAll("[data-animo]")) {
        b.addEventListener("click", (() => {
            animo = b.dataset.animo;
            for (const o of screenEl.querySelectorAll("[data-animo]")) {
                o.classList.toggle("elegido", o === b);
                o.setAttribute("aria-checked", String(o === b));
            }
            const a = ANIMOS.find((x => x.id === animo));
            personaje.innerHTML = R.spriteCara(a.ojo, a.boca, false, "rebote");
            Sonido.sonar("tocar");
            recordar();
        }));
    }
    texto.addEventListener("input", recordar);
    const foto = document.getElementById("btn-foto-hoy");
    if (foto) {
        foto.addEventListener("click", (() => {
            recordar();
            conTransicion((() => abrirLenteEnPantalla({
                modo: "foto",
                alGuardar: () => {
                    diario.anotarFoto();
                    guardarTodo();
                    conTransicion(abrirEscribir);
                },
                alSalir: () => conTransicion(abrirEscribir)
            })));
        }));
    }
    document.getElementById("btn-cancelar-hoy").addEventListener("click", (() => {
        recordar();
        conTransicion(escribiendo.alDiario ? irAlDiario : irACasa);
    }));
    document.getElementById("btn-guardar-hoy").addEventListener("click", (() => {
        if (!animo && !texto.value.trim()) {
            const fila = screenEl.querySelector(".fila-animos");
            fila.classList.remove("sacude");
            void fila.offsetWidth;
            fila.classList.add("sacude");
            Sonido.sonar("no");
            return;
        }
        if (pasado) {
            diario.escribirDia(clave, {
                animo: animo,
                texto: texto.value.trim()
            });
            guardarTodo();
            Sonido.sonar("guardado");
            paginaParaMostrar = clave;
            controller.vista = "feedback";
            conTransicion((() => R.renderFeedback(screenEl, "Page updated ♥", {
                especial: "euforico",
                sub: fechaLegible(clave)
            })));
            setTimeout((() => conTransicion(irAlDiario)), DURACION_FEEDBACK_MS + 300);
            return;
        }
        diario.escribirHoy({
            animo: animo,
            texto: texto.value.trim(),
            pregunta: preguntaDelDia()
        });
        borradorHoy = null;
        eventoAmigos(estadoParaAmigos());
        if (mascota) mascota._marcarInteraccion?.(Date.now());
        const racha = diario.racha();
        const monedasDiario = tienda.ganar("diario") + tienda.ganarPorRacha(racha);
        eventoDeseo({
            tipo: "diario"
        });
        guardarTodo();
        Sonido.sonar("guardado");
        if (monedasDiario) setTimeout((() => mostrarMonedas(monedasDiario)), 700);
        const frases = {
            genial: "Best kind of day!",
            bien: "A good one.",
            normal: "Okay days count too.",
            cansada: "Rest well tonight.",
            triste: "Sending you a big hug. I'm here."
        };
        const sub = `${frases[animo] || "Saved."}${racha > 1 ? ` ${racha} days in a row.` : ""}`;
        controller.vista = "feedback";
        conTransicion((() => R.renderFeedback(screenEl, "Page saved ♥", {
            especial: animo === "triste" ? "enamorado" : "euforico",
            sub: sub
        })));
        if (escribiendo.alDiario) paginaParaMostrar = claveHoy;
        setTimeout((() => conTransicion(escribiendo.alDiario ? irAlDiario : irACasa)), DURACION_FEEDBACK_MS + 900);
    }));
}

let fotosListasPromesa = Promise.resolve();

function wireBackup() {
    const mensajeEl = document.getElementById("mensaje-backup");
    const mensaje = (texto, clase = "") => {
        mensajeEl.textContent = texto;
        mensajeEl.className = `mensaje-backup ${clase}`;
    };
    const videos = Final.dijoQueSi() ? Grabacion.videosParaBackup().catch((() => [])) : Promise.resolve([]);
    document.getElementById("btn-exportar-backup").addEventListener("click", (async () => {
        guardarTodo();
        if (!Camara.fotosCargadas()) {
            mensaje("Getting your photos ready…");
            await fotosListasPromesa;
        }
        const blob = storage.armarBackup({
            fotos: Camara.todasLasFotos(),
            videos: await videos
        });
        if (!blob) {
            mensaje("Nothing to save yet.", "error");
            return;
        }
        const r = await Galeria.guardarBlob(blob, storage.nombreDelBackup());
        if (r === "compartido" || r === "descargado") storage.marcarBackup();
        if (r === "compartido" || r === "descargado") mensaje(r === "compartido" ? "Backup ready ♥ Keep it somewhere safe (Files, iCloud…)." : "Backup saved in your downloads ♥", "ok"); else if (r === "error") mensaje("Couldn't save the backup. Try again?", "error");
    }));
    const btnFotos = document.getElementById("btn-guardar-fotos");
    if (btnFotos) {
        let listas = null;
        const textoBase = btnFotos.innerHTML;
        btnFotos.addEventListener("click", (async () => {
            if (listas) {
                const r = await Galeria.guardarVarios(listas);
                listas = null;
                btnFotos.innerHTML = textoBase;
                btnFotos.classList.add("boton-fantasma");
                if (r === "compartido" || r === "descargado") mensaje("Photos saved ♥", "ok"); else if (r === "error") mensaje("Couldn't save the photos. Try again?", "error");
                return;
            }
            btnFotos.disabled = true;
            btnFotos.textContent = "Getting them ready…";
            listas = await Galeria.prepararFotos(Camara.todasLasFotos());
            btnFotos.disabled = false;
            if (!listas.length) {
                listas = null;
                btnFotos.innerHTML = textoBase;
                mensaje("Couldn't read the photos.", "error");
                return;
            }
            btnFotos.classList.remove("boton-fantasma");
            btnFotos.textContent = `Save ${listas.length} ${listas.length === 1 ? "photo" : "photos"} ♥`;
            Sonido.sonar("tocar");
        }));
    }
    const inputArchivo = document.getElementById("input-importar-backup");
    inputArchivo.addEventListener("change", (() => {
        const archivo = inputArchivo.files[0];
        inputArchivo.value = "";
        if (archivo) restaurarDesdeArchivo(archivo, mensaje);
    }));
}

function mensajeErrorBackup(e) {
    const m = String(e && e.message || "");
    if (e && (e.name === "QuotaExceededError" || e.code === 22) || /quota|exceeded|space/i.test(m)) {
        return "There isn't enough space on this phone to restore it. Free up some space and try again?";
    }
    if (m === "vacio") return "That backup looks empty or damaged. Try another file?";
    if (/^that (file|backup) /.test(m)) return m.charAt(0).toUpperCase() + m.slice(1);
    return "Couldn't read that file. Is it a Baozi backup?";
}

async function restaurarDesdeArchivo(archivo, mensaje) {
    {
        mensaje("Reading the backup…");
        try {
            const datos = await storage.leerBackup(archivo);
            storage.restaurarBackup(datos);
            const guardado = storage.cargar();
            if (!guardado || guardado.recuperadoDe) {
                if (mascota) guardarTodo();
                throw new Error("vacio");
            }
            const nFotos = await Camara.importarFotos(datos.fotos);
            await Grabacion.importarVideos(datos.videos);
            ({mascota: mascota, npcs: npcsReg, lugares: lugaresReg, diario: diario, cartasEntregadas: cartasEntregadas} = guardado);
            cargarLugaresDeElla(guardado.extras && guardado.extras.lugaresPropios);
            cargarFechasDeElla(guardado.extras && guardado.extras.fechasPropias);
            Final.restaurarDesdeGuardado(guardado.extras && guardado.extras.final, {
                forzar: true
            });
            Personaje.restaurar(guardado.extras && guardado.extras.personaje);
            tienda = Tienda.desdeObjeto(guardado.extras && guardado.extras.tienda);
            deseos = Deseos.desdeObjeto(guardado.extras && guardado.extras.deseos, DESEOS_PROPIOS);
            cargarPesca(guardado.extras && guardado.extras.pesca);
            cargarMudanza(guardado.extras && guardado.extras.mudanza);
            cargarAmigos(guardado.extras && guardado.extras.amigos);
            jardin = Jardin.desdeObjeto(guardado.extras && guardado.extras.jardin);
            estiloCuaderno = limpiarCuaderno(guardado.extras && guardado.extras.cuaderno);
            palabras = Palabras.desdeObjeto(guardado.extras && guardado.extras.palabras);
            mesesReg = cargarMeses(guardado.extras && guardado.extras.meses);
            restauranteReg = Restaurante.desdeObjeto(guardado.extras && guardado.extras.restaurante);
            mascota.actualizarTiempo(Date.now());
            mensaje(`Backup restored${nFotos ? ` (+${nFotos} ${nFotos === 1 ? "photo" : "photos"})` : ""}. Welcome back, Baozi!`, "ok");
            setTimeout((() => location.reload()), 1800);
        } catch (e) {
            console.warn("No se pudo restaurar el backup:", e);
            mensaje(mensajeErrorBackup(e), "error");
        }
    }
}

function iniciarCaminar() {
    pasosSesion = 0;
    controller.vista = "caminar";
    if (permisoMotionEstado === "granted") activarPedometro();
    renderVistaActual();
    iniciarSensoresCaminar();
}

function manejarPosicionGPS(lat, lon) {
    if (!mascota || controller.vista !== "caminar") return;
    const lugar = lugaresReg.lugarEnRango(lat, lon, Date.now());
    if (lugar) {
        lugarCercaDetectado = lugar;
        vibrar(40);
        conTransicion((() => {
            controller.vista = "lugarcerca";
            renderVistaActual();
        }));
    }
}

function manejarErrorGPS(error) {
    if (error && error.code === error.PERMISSION_DENIED) {
        const estadoEl = document.getElementById("estado-sensores");
        if (estadoEl) estadoEl.textContent = "No location — use “Where to?” to explore.";
    }
}

let bloqueoPantalla = null;

async function tomarWakeLock() {
    try {
        if (!("wakeLock" in navigator) || bloqueoPantalla) return;
        bloqueoPantalla = await navigator.wakeLock.request("screen");
        bloqueoPantalla.addEventListener("release", (() => {
            bloqueoPantalla = null;
        }));
    } catch (e) {
        bloqueoPantalla = null;
    }
}

function soltarWakeLock() {
    if (!bloqueoPantalla) return;
    bloqueoPantalla.release().catch((() => {}));
    bloqueoPantalla = null;
}

function iniciarSensoresCaminar() {
    tomarWakeLock();
    if (Sensores.geolocationDisponible() && watchIdGPS === null) {
        watchIdGPS = Sensores.iniciarSeguimientoGPS(manejarPosicionGPS, manejarErrorGPS);
    }
    if (permisoMotionEstado === "granted") activarPedometro();
}

function detenerSensoresCaminar() {
    soltarWakeLock();
    if (watchIdGPS !== null) {
        Sensores.detenerSeguimientoGPS(watchIdGPS);
        watchIdGPS = null;
    }
    if (detenerMotionCaminar) {
        detenerMotionCaminar();
        detenerMotionCaminar = null;
    }
    detectorPasosGPS = null;
}

function activarPedometro() {
    if (detenerMotionCaminar) return;
    detectorPasosGPS = new Sensores.DetectorPasos;
    detenerMotionCaminar = Sensores.iniciarEscuchaMotion(((x, y, z, ahoraSeg) => {
        if (controller.vista !== "caminar") return;
        if (detectorPasosGPS.procesarLectura(x, y, z, ahoraSeg)) registrarPasoDetectado();
    }));
}

async function habilitarMotion() {
    permisoMotionEstado = await Sensores.pedirPermisoMotion();
    if (permisoMotionEstado === "granted" && controller.vista === "caminar") activarPedometro();
    renderVistaActual();
}

function descubrirLugar(idLugar) {
    lugarDescubierto = lugaresReg.descubrir(mascota, idLugar, Date.now());
    fotoDelDescubrimiento = false;
    diario.anotarLugar(idLugar);
    alSellar(idLugar);
    Musica.tocar("descubrimiento");
    guardarTodo();
}

function wireWhereTo() {
    for (const boton of screenEl.querySelectorAll("[data-lugar]")) {
        boton.addEventListener("click", (() => {
            const idLugar = boton.dataset.lugar;
            if (idLugar === "__not_now") {
                conTransicion((() => {
                    controller.vista = "caminar";
                    renderVistaActual();
                }));
                return;
            }
            descubrirLugar(idLugar);
            conTransicion((() => {
                controller.vista = "descubrimiento";
                renderVistaActual();
            }));
        }));
    }
}

function wireLugarCerca() {
    for (const boton of screenEl.querySelectorAll("[data-eleccion-lugar]")) {
        boton.addEventListener("click", (() => {
            const lugar = lugarCercaDetectado;
            if (boton.dataset.eleccionLugar === "explorar") {
                descubrirLugar(lugar.id);
                lugarCercaDetectado = null;
                controller.vista = "descubrimiento";
            } else {
                lugaresReg.marcarOfrecido(lugar.id, Date.now());
                guardarTodo();
                lugarCercaDetectado = null;
                controller.vista = "caminar";
            }
            conTransicion(renderVistaActual);
        }));
    }
}

function volverADescubrimiento() {
    conTransicion((() => {
        prepararVista("descubrimiento");
        renderVistaActual();
    }));
}

function wireDescubrimiento() {
    const btnFoto = document.getElementById("btn-tomar-foto-descubrimiento");
    if (btnFoto) {
        btnFoto.addEventListener("click", (() => {
            Musica.detener(.3);
            conTransicion((() => abrirLenteEnPantalla({
                modo: "foto",
                lugar: lugarDescubierto ? lugarDescubierto.id : null,
                titulo: lugarDescubierto ? lugarDescubierto.nombre.toUpperCase() : `${Personaje.nombre().toUpperCase()} LENS`,
                alGuardar: () => {
                    fotoDelDescubrimiento = true;
                    if (mascota) diario.anotarFoto();
                    guardarTodo();
                    volverADescubrimiento();
                },
                alSalir: volverADescubrimiento
            })));
        }));
    }
    document.getElementById("btn-continuar-descubrimiento").addEventListener("click", (() => {
        if (mostrarCartaSiCorresponde({
            lugarDescubierto: lugarDescubierto?.id
        })) return;
        Musica.detener();
        conTransicion((() => {
            controller.vista = "caminar";
            renderVistaActual();
        }));
    }));
}

function wireCaminar() {
    document.getElementById("btn-volver-caminar").addEventListener("click", (() => {
        detenerSensoresCaminar();
        conTransicion(irACasa);
    }));
    document.getElementById("btn-paso").addEventListener("click", (() => registrarPasoDetectado()));
    document.getElementById("btn-anotar-pasos").addEventListener("click", (() => {
        detenerSensoresCaminar();
        abrirPreguntaPasos({
            clave: claveDelDia(),
            cuando: "today"
        }, {
            volverA: "caminar"
        });
    }));
    const btnManual = document.getElementById("btn-wheretogo-manual");
    if (btnManual) {
        btnManual.addEventListener("click", (() => {
            conTransicion((() => {
                controller.vista = "wheretogo";
                renderVistaActual();
            }));
        }));
    }
    const btnMotion = document.getElementById("btn-habilitar-motion");
    if (btnMotion) btnMotion.addEventListener("click", habilitarMotion);
}

function animarPaso() {
    for (const id of [ "pies-personaje", "mochi-caminando" ]) {
        const el = document.getElementById(id);
        if (!el) continue;
        el.classList.remove("paso");
        void el.offsetWidth;
        el.classList.add("paso");
    }
}

function actualizarContadorPasos() {
    const el = document.getElementById("contador-pasos");
    const total = document.getElementById("total-pasos");
    if (el) el.textContent = pasosSesion.toLocaleString("en-US");
    if (total) total.textContent = mascota.pasosTotales.toLocaleString("en-US");
    if (!el) renderVistaActual();
}

function registrarPasoDetectado() {
    pasosSesion += 1;
    const ahora = Date.now();
    const seDisparoOrgulloso = mascota.registrarPasos(1, ahora);
    diario.sumarPasos(1);
    if (pasosSesion % 50 === 0) eventoAmigos(estadoParaAmigos());
    const npc = npcsReg.talVezEncontrarAlguien(1, ahora);
    guardarTodo();
    if (npc) {
        encuentro = {
            npc: npc,
            paso: "anuncio",
            pendienteEnamorado: false
        };
        diario.anotarNpc(npc.id);
        vibrar(40);
        Sonido.sonar("encuentro");
        conTransicion((() => {
            controller.vista = "encuentro";
            renderVistaActual();
        }));
        return;
    }
    if (seDisparoOrgulloso) {
        vibrar([ 30, 60, 30 ]);
        Sonido.sonar("hito");
        diario.anotarHito(`${mascota.pasosTotales.toLocaleString("en-US")} steps`);
        controller.vista = "feedback";
        conTransicion((() => R.renderFeedback(screenEl, `${mascota.pasosTotales.toLocaleString("en-US")} steps!`, {
            icono: "pie"
        })));
        setTimeout((() => {
            conTransicion((() => {
                controller.vista = "caminar";
                renderVistaActual();
            }));
        }), DURACION_FEEDBACK_MS + 300);
        return;
    }
    if (mostrarCartaSiCorresponde({
        pasosTotales: mascota.pasosTotales
    })) return;
    controller.vista = "caminar";
    actualizarContadorPasos();
    animarPaso();
}

function huboCartaHoy() {
    const e = diario && diario.entradaDe(claveDelDia());
    return !!e && e.cartas.length > 0;
}

function mostrarCartaSiCorresponde(contexto) {
    const carta = cartaPendiente({
        ...contexto,
        sinPasos: huboCartaHoy()
    }, cartasEntregadas);
    if (!carta) return false;
    entregarCarta(carta);
    return true;
}

const abiertaDesdeMs = performance.now();

function diasTrasElSi(ahora = new Date) {
    const si = Final.dijoQueSi() && Final.fechaDelSi();
    if (!si) return null;
    const d0 = new Date(si);
    const a = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate());
    const b = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    return Math.round((b - a) / 864e5);
}

function talVezCartaAtrasada() {
    if (!mascota || controller.vista !== "cara" || visita || !puedeComentar()) return false;
    if (performance.now() - abiertaDesdeMs < 1e4) return false;
    const boda = bodaEsHoy() && !cartasEntregadas.includes("boda");
    if (huboCartaHoy() && !boda) return false;
    const enamorado = NPCS.some((n => (npcsReg.vecesEncontrado[n.id] || 0) >= VECES_PARA_ENAMORADO));
    const carta = boda ? cartaAtrasada(cartasEntregadas, {
        boda: true
    }) : cartaAtrasada(cartasEntregadas, {
        sellados: lugaresReg.desbloqueados,
        enamorado: enamorado,
        diasTrasElSi: diasTrasElSi(),
        boda: false
    });
    if (!carta) return false;
    entregarCarta(carta);
    return true;
}

function cartasQueLlegaron() {
    return [ ...new Set(cartasEntregadas) ].map((id => buscarCarta(id))).filter(Boolean).map((c => ({
        id: c.id,
        titulo: c.titulo,
        fecha: fechaDeCarta(c.id)
    })));
}

function fechaDeCarta(id) {
    const e = id && diario && diario.entradas.find((x => (x.cartas || []).includes(id)));
    return e ? fechaLegible(e.fecha) : "";
}

function releerCarta(id) {
    const carta = buscarCarta(id);
    if (!carta || !cartasEntregadas.includes(id)) return;
    Sonido.sonar("tocar");
    cartaActual = carta;
    cartaReleida = true;
    conTransicion((() => {
        controller.vista = "carta";
        renderVistaActual();
    }));
}

function entregarCarta(carta) {
    cartasEntregadas.push(carta.id);
    cartaActual = carta;
    cartaReleida = false;
    diario.anotarCarta(carta.id);
    guardarTodo();
    Musica.tocar("carta");
    vibrar([ 20, 60, 20 ]);
    conTransicion((() => {
        controller.vista = "carta";
        renderVistaActual();
    }));
}

function renderEncuentro() {
    const {npc: npc, paso: paso} = encuentro;
    if (paso === "anuncio") {
        R.renderEncuentroAnuncio(screenEl, encuentro && encuentro.npc);
        document.getElementById("btn-continuar-encuentro").addEventListener("click", (() => {
            conTransicion((() => {
                encuentro.paso = "eleccion";
                renderVistaActual();
            }));
        }));
    } else if (paso === "eleccion") {
        R.renderEncuentroEleccion(screenEl, npc);
        for (const boton of screenEl.querySelectorAll("[data-eleccion]")) {
            boton.addEventListener("click", (() => manejarEleccionEncuentro(boton.dataset.eleccion)));
        }
    } else if (paso === "dialogo") {
        const m = amigos.misionActual(npc.id);
        R.renderEncuentroDialogo(screenEl, npc, amigos.lineaPara(npc.id, npcsReg, progresoDe(m, contextoAmigos())) || npcsReg.lineaPara(npc));
        document.getElementById("btn-continuar-encuentro").addEventListener("click", (() => seguirEncuentro()));
    } else if (paso === "regalo") {
        const entregado = encuentro.entregado;
        R.renderEncuentroRegalo(screenEl, npc, entregado.mision.gracias, entregado.clave);
        Musica.tocar("descubrimiento");
        Sonido.sonar("hallazgo");
        vibrar([ 30, 40, 60 ]);
        document.getElementById("btn-continuar-encuentro").addEventListener("click", (() => seguirEncuentro()));
    } else if (paso === "secreto") {
        const secreto = encuentro.secreto;
        R.renderEncuentroSecreto(screenEl, npc, secreto.texto, LUGARES.find((l => l.id === secreto.lugar)));
        Sonido.sonar("descubrimiento");
        document.getElementById("btn-continuar-encuentro").addEventListener("click", (() => seguirEncuentro()));
    } else if (paso === "mision") {
        R.renderEncuentroMision(screenEl, npc, encuentro.mision);
        for (const b of screenEl.querySelectorAll("[data-mision]")) {
            b.addEventListener("click", (() => {
                if (b.dataset.mision === "si") {
                    amigos.aceptar(npc.id);
                    Sonido.sonar("guardado");
                    eventoAmigos(estadoParaAmigos(), {
                        sinVisita: true
                    });
                    guardarTodo();
                } else Sonido.sonar("tocar");
                seguirEncuentro();
            }));
        }
    } else if (paso === "despedida") {
        R.renderEncuentroDespedida(screenEl, npc);
        setTimeout(terminarEncuentro, DURACION_FEEDBACK_MS);
    }
}

function seguirEncuentro() {
    if (!encuentro) return;
    const npc = encuentro.npc;
    let siguiente = "despedida";
    if (amigos.estado(npc.id) === "lista") {
        encuentro.entregado = amigos.entregar(npc.id);
        if (encuentro.entregado) ganarMonedas("mision");
        Personaje.ponerAccesorio(amigos.puesto);
        if (pieza) pieza.refrescar();
        diario.anotarHito(`${npc.nombre}: ${encuentro.entregado.regalo.nombre}`);
        siguiente = "regalo";
    } else if (!encuentro.secretoVisto && amigos.secretoNuevo(npc.id, npcsReg)) {
        encuentro.secreto = amigos.secretoNuevo(npc.id, npcsReg);
        encuentro.secretoVisto = true;
        amigos.revelar(encuentro.secreto.lugar);
        siguiente = "secreto";
    } else if (!encuentro.misionVista && amigos.misionParaOfrecer(npc.id, npcsReg)) {
        encuentro.mision = amigos.misionParaOfrecer(npc.id, npcsReg);
        encuentro.misionVista = true;
        siguiente = "mision";
    }
    guardarTodo();
    conTransicion((() => {
        encuentro.paso = siguiente;
        renderVistaActual();
    }));
}

function manejarEleccionEncuentro(eleccion) {
    const resultado = npcsReg.procesarEncuentro(mascota, encuentro.npc, eleccion, Date.now());
    const huboEnamorado = resultado === "amor";
    if (resultado === "amigo") encuentro.pendienteMejorAmigo = true;
    encuentro.paso = eleccion === "saludar" ? "dialogo" : "despedida";
    if (eleccion !== "saludar") encuentro.desairado = true; else ganarMonedas("saludo");
    if (huboEnamorado) encuentro.pendienteEnamorado = true;
    guardarTodo();
    conTransicion(renderVistaActual);
}

function terminarEncuentro() {
    if (!encuentro) return;
    const pendienteEnamorado = encuentro.pendienteEnamorado;
    const pendienteMejorAmigo = encuentro.pendienteMejorAmigo;
    const encuentroNombre = encuentro.npc.nombre;
    const desairado = encuentro.desairado;
    encuentro = null;
    if (pendienteEnamorado && mostrarCartaSiCorresponde({
        huboEnamorado: true
    })) return;
    conTransicion((() => {
        controller.irACara();
        if (pendienteEnamorado) {
            controller.vista = "feedback";
            Musica.tocar("enamorado");
            R.renderFeedback(screenEl, "In love! ♥", {
                especial: "enamorado"
            });
            setTimeout((() => conTransicion(irACasa)), DURACION_FEEDBACK_MS + 900);
        } else if (pendienteMejorAmigo) {
            controller.vista = "feedback";
            Sonido.sonar("hallazgo");
            R.renderFeedback(screenEl, "Best friends!", {
                especial: "euforico",
                sub: `${Personaje.nombre()} and ${encuentroNombre} are inseparable.`
            });
            setTimeout((() => conTransicion(irACasa)), DURACION_FEEDBACK_MS + 600);
        } else {
            renderVistaActual();
            if (desairado) {
                mostrarEspecial("decepcionado", 3e3);
                decir("Maybe next time…", 2800);
            }
        }
    }));
}

let pesca = null;

function iniciarPescaJuego() {
    controller.vista = "pesca";
    actualizarTabbar();
    actualizarMarco();
    screenEl.classList.add("sin-margen");
    const h = (new Date).getHours();
    pesca = iniciarPesca(screenEl, {
        arte: arte,
        capas: Personaje.capas("ojo_base_energia_alta.png", "boca_base_feliz.png", "sentado").map((c => arte(c.src))),
        pies: Personaje.figura("sentado").pies,
        noche: h >= 19 || h < 6,
        sonar: n => Sonido.sonar(n),
        vibrar: vibrar,
        alTerminar: terminarPesca,
        alSalir: volverALaTele
    });
}

function terminarPesca(r = {}) {
    const {puntos: puntos = 0, peces: peces = [], record: record = 0, nuevoRecord: nuevoRecord = false} = r;
    if (pesca) pesca.destruir();
    pesca = null;
    const buenos = peces.filter((id => (pezPorId(id) || {}).puntos > 0));
    const nuevos = [ ...new Set(peces) ].filter((id => !pescaReg.libro[id]));
    for (const id of peces) pescaReg.libro[id] = (pescaReg.libro[id] || 0) + 1;
    if (tienda.tiene("pecera")) {
        for (const id of peces) if (PECES_DE_PECERA.has(id)) pescaReg.pecera = [ ...pescaReg.pecera, id ].slice(-4);
    }
    mascota.resultadoMinijuego(buenos.length, Date.now());
    diario.anotarJuego(puntos);
    const monedasPesca = tienda.ganarPorJuego("pesca", r).monedas + (nuevoRecord && puntos > 0 ? tienda.ganar("record") : 0);
    eventoDeseo({
        tipo: "pesca",
        peces: peces
    });
    guardarTodo();
    if (monedasPesca) setTimeout((() => mostrarMonedas(monedasPesca)), 600);
    vibrar(buenos.length ? [ 20, 40, 20 ] : 20);
    Sonido.sonar(buenos.length ? "hito" : "mimo");
    controller.vista = "feedback";
    const titulo = nuevoRecord && puntos > 0 ? `New record: ${puntos}!` : buenos.length ? `${buenos.length} fish!` : "No fish today…";
    const nombres = nuevos.map((id => pezPorId(id).nombre.replace(/…$/, ""))).join(", ");
    const sub = nuevos.length ? `New in your fish book: ${nombres}` : `${puntos} points · best ${record}`;
    conTransicion((() => R.renderFeedback(screenEl, titulo, {
        especial: buenos.length ? "euforico" : "decepcionado",
        sub: sub
    })));
    setTimeout((() => conTransicion(irACasa)), DURACION_FEEDBACK_MS + 1400);
}

function iniciarMinijuego() {
    controller.vista = "minijuego";
    actualizarTabbar();
    actualizarMarco();
    screenEl.classList.add("sin-margen");
    minijuego = iniciarJuego(screenEl, {
        arte: arte,
        sprite: (ojo, boca) => R.spriteCara(ojo, boca),
        cambiarCara: (el, ojo, boca) => R.cambiarCara(el, ojo, boca),
        sonar: n => Sonido.sonar(n),
        vibrar: vibrar,
        alTerminar: terminarMinijuego,
        alSalir: volverALaTele,
        alElegir: () => {
            if (permisoMotionEstado !== "unknown") return null;
            return Sensores.pedirPermisoMotion().then((r => {
                permisoMotionEstado = r;
                if (r === "granted" && minijuego) activarVolante();
            }));
        },
        alEmpezar: () => {
            if (volanteJuego) volanteJuego.recalibrar();
        }
    });
    wireMinijuego();
    if (permisoMotionEstado === "granted") activarVolante();
}

function wireMinijuego() {
    const btnMotion = document.getElementById("btn-habilitar-motion");
    if (btnMotion) {
        btnMotion.addEventListener("click", (async e => {
            e.stopPropagation();
            permisoMotionEstado = await Sensores.pedirPermisoMotion();
            btnMotion.remove();
            if (permisoMotionEstado === "granted" && minijuego) activarVolante();
        }));
    }
}

function anguloPantalla() {
    try {
        if (screen.orientation && Number.isFinite(screen.orientation.angle)) return screen.orientation.angle;
    } catch (e) {}
    return Number.isFinite(window.orientation) ? (window.orientation + 360) % 360 : 90;
}

function activarVolante() {
    if (detenerMotionMinijuego) return;
    volanteJuego = new Volante;
    detenerMotionMinijuego = Sensores.iniciarEscuchaMotion(((x, y, z) => {
        if (!minijuego || !volanteJuego) return;
        const pos = volanteJuego.leer(x, y, z, anguloPantalla());
        if (pos === null) return;
        if (minijuego.usandoDedo && minijuego.usandoDedo()) volanteJuego.centrarEn(minijuego.estado().objetivo); else minijuego.inclinar(pos);
    }));
}

function soltarVolante() {
    if (detenerMotionMinijuego) {
        detenerMotionMinijuego();
        detenerMotionMinijuego = null;
    }
    volanteJuego = null;
}

function volverALaTele() {
    if (minijuego) minijuego.detener();
    minijuego = null;
    soltarVolante();
    if (pesca) pesca.destruir();
    pesca = null;
    if (juegoTele) juegoTele.destruir();
    juegoTele = null;
    Sonido.sonar("tocar");
    conTransicion((() => {
        controller.vista = "juegos";
        renderVistaActual();
    }));
}

function terminarMinijuego(r = {}) {
    const {puntos: puntos = 0, atrapadas: atrapadas = 0, record: record = 0, nuevoRecord: nuevoRecord = false} = r;
    minijuego = null;
    soltarVolante();
    mascota.resultadoMinijuego(atrapadas, Date.now());
    diario.anotarJuego(puntos);
    eventoAmigos({
        tipo: "juego",
        puntos: puntos
    });
    const monedasJuego = tienda.ganarPorJuego("snack", r).monedas + (nuevoRecord && puntos > 0 ? tienda.ganar("record") : 0);
    eventoDeseo({
        tipo: "juego",
        puntos: puntos,
        atrapadas: atrapadas
    });
    guardarTodo();
    if (monedasJuego) setTimeout((() => mostrarMonedas(monedasJuego)), 600);
    vibrar(puntos > 0 ? [ 20, 40, 20, 40, 20 ] : 20);
    Sonido.sonar(puntos > 0 ? "hito" : "mimo");
    controller.vista = "feedback";
    const titulo = nuevoRecord && puntos > 0 ? `New record: ${puntos}!` : puntos ? `${puntos} points!` : "So close!";
    const sub = nuevoRecord && puntos > 0 ? "Best snack catcher in Hangzhou." : `Caught ${atrapadas} · best ${record}`;
    conTransicion((() => R.renderFeedback(screenEl, titulo, {
        especial: puntos ? "euforico" : "decepcionado",
        sub: sub
    })));
    setTimeout((() => conTransicion(irACasa)), DURACION_FEEDBACK_MS + 1200);
}

let juegoTele = null;

function iniciarJuegoTele(cual) {
    controller.vista = cual;
    actualizarTabbar();
    actualizarMarco();
    screenEl.classList.add("sin-margen");
    Musica.detener(.3);
    const comunes = {
        arte: arte,
        sprite: (ojo, boca) => R.spriteCara(ojo, boca),
        cambiarCara: (el, ojo, boca) => R.cambiarCara(el, ojo, boca),
        sonar: n => Sonido.sonar(n),
        vibrar: vibrar,
        alSalir: volverALaTele
    };
    if (cual === "torre") juegoTele = iniciarTorre(screenEl, {
        ...comunes,
        alTerminar: r => terminarJuegoTele("torre", r)
    }); else if (cual === "ritmo") juegoTele = iniciarRitmo(screenEl, {
        ...comunes,
        musica: Musica,
        alTerminar: r => terminarJuegoTele("ritmo", r)
    }); else if (cual === "faroles") juegoTele = iniciarFaroles(screenEl, {
        ...comunes,
        alTerminar: r => terminarJuegoTele("faroles", r)
    }); else juegoTele = iniciarTejo(screenEl, {
        ...comunes,
        alTerminar: r => terminarJuegoTele("tejo", r)
    });
}

function terminarJuegoTele(cual, r) {
    if (juegoTele) juegoTele.destruir();
    juegoTele = null;
    const puntos = r.puntos || 0;
    let monedas = 0;
    let titulo;
    let sub;
    let bien;
    if (cual === "torre") {
        bien = r.pisos > 0;
        titulo = r.nuevoRecord && puntos > 0 ? `New record: ${puntos}!` : r.pisos ? `${r.pisos} steamers tall!` : "Oops!";
        sub = `${puntos} points · best ${r.record}`;
    } else if (cual === "ritmo") {
        bien = r.perfectos + r.buenos > 0;
        const notas = r.total ? Math.round((r.perfectos + r.buenos) / r.total * 100) : 0;
        titulo = r.nuevoRecord && puntos > 0 ? `New record: ${puntos.toLocaleString("en-US")}!` : r.fallados === 0 && r.total ? "Full combo!" : `${notas}% of the notes!`;
        sub = `${r.nombreCancion} · ${r.perfectos} perfect · best ${r.record.toLocaleString("en-US")}`;
    } else if (cual === "faroles") {
        bien = (r.faroles || 0) > 0;
        titulo = r.nuevoRecord && puntos > 0 ? `New record: ${puntos}!` : r.faroles ? `${r.faroles} lantern${r.faroles === 1 ? "" : "s"} together!` : "The lake is quiet tonight…";
        sub = `${puntos} points · best ${r.record}`;
    } else {
        bien = puntos > 0;
        const mechas = r.mechas || 0;
        titulo = r.nuevoRecord && puntos > 0 ? `New record: ${puntos} pts!` : mechas ? `${mechas} mecha${mechas === 1 ? "" : "s"} exploded!` : puntos ? `${puntos} points!` : "Not this time…";
        sub = `${r.embocinadas || 0} embocinada${r.embocinadas === 1 ? "" : "s"} · best ${r.record} pts`;
    }
    monedas = tienda.ganarPorJuego(cual, r).monedas;
    if (r.nuevoRecord && puntos > 0) monedas += tienda.ganar("record");
    const logros = cual === "torre" ? r.pisos || 0 : cual === "ritmo" ? Math.floor(((r.perfectos || 0) + (r.buenos || 0)) / 4) : cual === "faroles" ? Math.floor((r.faroles || 0) / 3) : (r.mechas || 0) + (r.embocinadas || 0);
    mascota.resultadoMinijuego(logros, Date.now());
    diario.anotarJuego(puntos);
    eventoDeseo({
        tipo: cual,
        puntos: puntos
    });
    guardarTodo();
    if (monedas) setTimeout((() => mostrarMonedas(monedas)), 600);
    vibrar(bien ? [ 20, 40, 20 ] : 20);
    Sonido.sonar(bien ? "hito" : "mimo");
    controller.vista = "feedback";
    conTransicion((() => R.renderFeedback(screenEl, titulo, {
        especial: bien ? "euforico" : "decepcionado",
        sub: sub
    })));
    setTimeout((() => conTransicion(irACasa)), DURACION_FEEDBACK_MS + 1400);
}

function programarProximoParpadeo() {
    if (timeoutBlink) clearTimeout(timeoutBlink);
    const esperaMs = (3 + Math.random() * 5) * 1e3;
    timeoutBlink = setTimeout((() => {
        const estado = mascota ? estadoCara(mascota) : null;
        const caraViva = estado && (estado.tipo === "base" || estado.tipo === "aburrido") && !Final.fotoPedida();
        if (controller.vista === "cara" && !especialActiva && caraViva) {
            const spriteEl = screenEl.querySelector(".sprite-cara");
            if (spriteEl) {
                spriteEl.classList.add("parpadeando");
                setTimeout((() => {
                    spriteEl.classList.remove("parpadeando");
                }), 250);
            }
        }
        programarProximoParpadeo();
    }), esperaMs);
}

function revisarEspecialPorEstado(ahora) {
    if (especialActiva || controller.vista !== "cara" || ahora < proximoEspecialPermitidoMs) return;
    if (Final.fotoPedida()) return;
    const estado = estadoCara(mascota);
    if (estado.tipo !== "base") return;
    let candidata = especialPorEstado(mascota);
    if (!candidata && Final.dijoQueSi() && Math.random() < .12) candidata = "enamorado";
    if (candidata && R.ESPECIALES_CON_ARTE.has(candidata)) {
        especialActiva = candidata;
        especialHastaMs = ahora + DURACION_ESPECIAL_MS;
        proximoEspecialPermitidoMs = ahora + COOLDOWN_ESPECIAL_ESTADO_MS;
        renderVistaActual();
    }
}

function momentoDelDia(horaLocal) {
    if (horaLocal >= 6 && horaLocal < 9) return "amanecer";
    if (horaLocal >= 9 && horaLocal < 18) return "dia";
    if (horaLocal >= 18 && horaLocal < 21) return "atardecer";
    return "noche";
}

let momentoActual = null;

function actualizarFondoPorHora() {
    const momento = momentoDelDia((new Date).getHours());
    if (momento === momentoActual) return;
    momentoActual = momento;
    document.documentElement.dataset.momento = momento;
    document.documentElement.style.setProperty("--fondo", `var(--fondo-${momento})`);
}

function tick() {
    if (!mascota) return;
    const ahora = Date.now();
    const sinSuenioAuto = [ "pedido", "en_curso" ].includes(Final.fase());
    const {suenio: suenioEnElTiempo} = mascota.actualizarTiempo(ahora, {
        suenioAuto: !sinSuenioAuto
    });
    actualizarFondoPorHora();
    if (!document.hidden) marcarVista();
    const relojEl = document.getElementById("reloj");
    if (relojEl && !relojEl.classList.contains("toque-objeto")) relojEl.textContent = R.reloj();
    Final.revisarArmadoPorFecha(ahora);
    if (Final.tocaPedirSinGPS(ahora)) pedidoPendiente = true;
    vigilarLugarFinal();
    intentarPedido();
    cuidarParaElFinal();
    const cambioSuenio = (sinSuenioAuto ? null : mascota.revisarSuenioAutomatico(ahora)) || suenioEnElTiempo;
    if (cambioSuenio) {
        Sonido.sonar(cambioSuenio === "durmio" ? "dormir" : "despertar");
        guardarTodo();
        if (controller.vista === "cara") renderVistaActual();
    }
    if (especialActiva && ahora >= especialHastaMs) {
        especialActiva = null;
        if (controller.vista === "cara") renderVistaActual();
    } else {
        revisarEspecialPorEstado(ahora);
    }
    mascota.decaerRasgosPorDias(ahora);
    if (visita && ahora > visita.hastaMs) {
        visita = null;
        if (controller.vista === "cara" && puedeComentar()) {
            mostrarEspecial("decepcionado", 3500);
            decir("Aw… they left.", 3e3);
        }
    }
    elegirDeseo();
    if (deseos.pendiente() && amigos.puesto) eventoDeseo({
        tipo: "estado",
        puesto: amigos.puesto
    });
    talVezLluviaRiega();
    if (!talVezMudanza() && !talVezPreguntarPasos() && !talVezContarVelitas() && !talVezAvisarTienda() && !talVezContarLluvia() && !celebrarDeseo() && !talVezEntregarMes() && !talVezCartaAtrasada() && !talVezAvisarBackup(ahora)) {
        talVezVisita();
        talVezPedirDiario();
    }
    revisarLugares();
    revisarClima();
    sonidoDelClima();
    musicaDeFondo();
    if (controller.vista === "cara" && !especialActiva) renderVistaActual();
    if (guardadoAuto.deberiaGuardar(ahora)) {
        guardarTodo();
        guardadoAuto.marcarGuardado(ahora);
    }
}

setInterval(tick, 5e3);

document.addEventListener("visibilitychange", (() => {
    if (document.visibilityState === "visible" && mascota) {
        tick();
        setTimeout((() => revisarLugares(true)), 1500);
        if (controller.vista === "caminar") tomarWakeLock();
    } else if (document.visibilityState === "hidden" && mascota) {
        dejarDeVigilar();
        guardarTodo();
    }
}));

window.addEventListener("beforeunload", (() => {
    if (mascota) guardarTodo();
}));

for (const boton of tabbarEl.querySelectorAll("button[data-cat]")) {
    boton.addEventListener("click", (() => abrirCategoriaDesdeTab(boton.dataset.cat)));
}

window.__mochi = {
    get vista() {
        return controller.vista;
    },
    final: Final,
    config: FINAL,
    lente: () => lenteAbierto,
    conNombre: conNombre,
    fechaLegible: fechaLegible,
    claveDelDia: claveDelDia,
    sellar: id => {
        const l = LUGARES.find((x => x.id === id));
        if (l) abrirSello(l);
    },
    visita: id => {
        const npc = NPCS.find((n => n.id === id));
        if (!npc) return;
        anunciarVisita(npc);
        if (controller.vista === "cara") renderVistaActual();
    },
    mascota: () => mascota,
    amigos: () => amigos,
    eventoAmigos: ev => eventoAmigos(ev),
    npcs: () => npcsReg,
    especial: () => especialActiva,
    terminarJuego: () => minijuego && minijuego.terminar(),
    personaje: quien => {
        Personaje.elegir(quien);
        guardarTodo();
        if (pieza) pieza.destruir();
        pieza = null;
        renderVistaActual();
    },
    guardar: () => guardarTodo(),
    diario: () => diario,
    donde: Donde,
    lugares: () => lugaresReg,
    mapaDia: MapaDia,
    tick: () => tick(),
    tienda: () => tienda,
    jardin: () => jardin,
    decosPuestas: () => estadoPieza().decoraciones,
    estadoPiezaAvisos: () => estadoPieza().avisos || [],
    tocar: id => tocarObjeto(id),
    aCasa: () => conTransicion(irACasa),
    deseos: () => deseos,
    pesca: () => pesca,
    juegoTele: () => juegoTele,
    restaurante: () => restaurante,
    restauranteReg: () => restauranteReg,
    mudanza: () => mudanza,
    pescaReg: () => pescaReg,
    velitas: si => {
        velitasForzadas = si === null || si === undefined ? null : !!si;
    },
    sinVisita: () => {
        visita = null;
    },
    estadoPasos: () => ({
        vista: controller.vista,
        dormida: mascota && mascota.dormida,
        visita: !!visita,
        fase: Final.fase(),
        dia: diaParaPreguntarPasos()
    }),
    musica: () => Musica.escenaSonando(),
    caminar: () => conTransicion(iniciarCaminar),
    clima: t => {
        Clima.forzar(t);
        if (t && Clima.esMalo(t)) {
            sorpresa(3500);
            decir(Clima.FRASES[t] || "Look outside!", 4e3);
        }
        sonidoDelClima();
        if (controller.vista === "cara") renderVistaActual();
    }
};

arrancar();
