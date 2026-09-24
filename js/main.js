/**
 * main.js
 * ========
 * El equivalente de bucle_principal() en main.py: arranca todo, cablea
 * los eventos y corre el loop de tiempo real. Dirigido por eventos del
 * navegador + un tick liviano cada 5 s para el decay y el autoguardado.
 *
 * Mapa de modulos:
 *   petState / mundo / diario / cartas   el juego (sin DOM)
 *   render                               HTML de cada pantalla
 *   camara / lente                       fotos y visor en vivo
 *   musica / sonido                      temas y efectos
 *   final / director / config            la propuesta
 */

import { PetState, estadoCara, especialPorEstado } from "./petState.js";
import * as Personaje from "./personaje.js";
import { iniciarJuego } from "./juego.js";
import { RegistroNPCs, RegistroLugares, LUGARES, NPCS } from "./mundo.js";
import * as storage from "./storage.js";
import { ejecutarItemMenu, ControladorVistas, MOTIVOS_ACCION_FALLIDA } from "./gameController.js";
import * as R from "./render.js";
import * as Sensores from "./sensores.js";
import { vibrar } from "./actuadores.js";
import * as Sonido from "./sonido.js";
import * as Musica from "./musica.js";
import { Diario, claveDelDia, fechaLegible, ANIMOS, preguntaDelDia } from "./diario.js";
import { cartaPendiente } from "./cartas.js";
import * as Camara from "./camara.js";
import { abrirLente } from "./lente.js";
import * as Final from "./final.js";
import * as Director from "./director.js";
import { escribir, conNombre } from "./dialogo.js";
import { arte } from "./arte.js";
import { FINAL, FECHAS } from "./config.js";
import { crearPieza, posicionEnMapa } from "./pieza.js";
import * as Clima from "./clima.js";
import { RegistroAmigos, AMIGOS, REGALOS, LUGARES_SECRETOS, lugarCercano, progresoDe } from "./amigos.js";
import { leerRecord } from "./juego.js";

const NOMBRE_POR_DEFECTO = "friend";
const DURACION_ESPECIAL_MS = 3000;
const DURACION_FEEDBACK_MS = 1600;
const COOLDOWN_ESPECIAL_ESTADO_MS = 30000;
const COMIDA_REL = [
  "comida/comida_manzana.png",
  "comida/comida_naranja.png",
  "comida/comida_grillo1.png",
  "comida/comida_grillo2.png",
  "comida/comida_grillo3.png",
];

const screenEl = document.getElementById("screen");
const tabbarEl = document.getElementById("tabbar");
const marcoEl = document.querySelector(".marco-manito");

// Momentos narrativos grandes: rompen el marco del aparato y ocupan el
// telefono entero. Todo lo demas vive adentro del aparato.
const VISTAS_PANTALLA_COMPLETA = new Set(["descubrimiento", "lugarcerca", "encuentro", "carta", "final"]);
// Vistas que llegan hasta el borde de la pantalla del aparato.
const VISTAS_SIN_MARGEN = new Set(["intro", "escribir", "elegir", "huevo", "nombre", "feedback", "cara", "descubrimiento", "lugarcerca", "encuentro", "carta", "final", "lente", "caminar", "heladera", "mapa", "sello", "postal", "consulta"]);
// La botonera de abajo ya no existe: el cuarto es el menu.
const VISTAS_CON_TABBAR = new Set([]);

const veloEl = document.getElementById("velo-transicion");
const DURACION_VELO_MS = 130;

// El final se puede leer tambien con el telefono en vertical: despues de
// "look up" es natural bajarlo o girarlo, y la pregunta no puede
// desaparecer detras del cartel de "gira el telefono".
const VISTAS_EN_VERTICAL = new Set(["final"]);

function actualizarMarco() {
  if (!marcoEl) return;
  // v19: todo a pantalla completa (sin el aparato alrededor): el cuarto es el telefono
  marcoEl.classList.add("pantalla-completa");
  document.body.classList.toggle("permite-vertical", VISTAS_EN_VERTICAL.has(controller.vista));
}

/** Un solo lugar que sabe todo lo que hay que persistir. */
function guardarTodo() {
  if (!mascota) return false;
  return storage.guardar(mascota, npcsReg, lugaresReg, diario, cartasEntregadas, { final: Final.estadoParaGuardar(), personaje: Personaje.actual(), amigos: amigos.aObjeto() });
}

function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (!location.protocol.startsWith("http")) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js", { updateViaCache: "none" })
      .then((reg) => {
        // instalada, la app puede quedar abierta dias: al volver a primer
        // plano se fija si hay un deploy nuevo (se aplica la proxima vez que abra)
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") reg.update().catch(() => {});
        });
      })
      .catch(() => {});
  });
}

function conTransicion(fn) {
  if (!veloEl) {
    fn();
    return;
  }
  veloEl.classList.add("activo");
  setTimeout(() => {
    try {
      fn();
    } finally {
      // pase lo que pase, el velo se levanta: si no, tapa todos los toques
      requestAnimationFrame(() => veloEl.classList.remove("activo"));
    }
  }, DURACION_VELO_MS);
}

// ------------------------------------------------------------------
// Estado global de la sesion
// ------------------------------------------------------------------

let mascota, npcsReg, lugaresReg, diario;
let amigos = new RegistroAmigos(); // amistad, secretos, misiones y regalos (amigos.js)
let cartasEntregadas = [];
let cartaActual = null;
const controller = new ControladorVistas();
let guardadoAuto;

let pasosSesion = 0;
let encuentro = null;
let minijuego = null;
let lenteAbierto = null; // { cerrar }

let especialActiva = null;
let especialHastaMs = 0;
let proximoEspecialPermitidoMs = 0;

let parpadeando = false;
let pieza = null;             // el cuarto (pieza.js), vivo mientras la vista es "cara"
let globoTemporal = "";       // lo que Baozi dice un ratito (radio, calendario...)
let timeoutGlobo = null;
let visita = null;            // { npc, hastaMs }: un amigo golpeando la ventana
let proximaConsultaVisitaMs = Date.now() + 40000;
let proximoClimaMs = Date.now() + 3000;     // el clima de afuera: al rato de abrir y cada 20 min
let ultimaPosicion = null;                  // la ultima ubicacion conocida (para el clima)
let mapaSeleccion = null;
let proximaLecturaLugaresMs = 0;
let timeoutBlink = null;
let saludoPendiente = "";

// La ultima vez que ella tuvo la app abierta (para saber si Baozi la extraño).
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
  } catch (e) {
    /* sin almacenamiento: no pasa nada */
  }
}


// Sensores reales (ver sensores.js). En iOS el permiso de movimiento
// necesita un toque real: arranca en "unknown" y lo pide un boton.
let permisoMotionEstado = Sensores.motionRequierePermiso()
  ? "unknown"
  : Sensores.motionDisponible()
    ? "granted"
    : "unnecessary";

let watchIdGPS = null;
let detenerMotionCaminar = null;
let detectorPasosGPS = null;
let detectorSacudida = null;
let detenerMotionMinijuego = null;
let lugarCercaDetectado = null;
let lugarDescubierto = null;
let fotoDelDescubrimiento = false;

// ------------------------------------------------------------------
// Arranque
// ------------------------------------------------------------------

/** La proxima de las fechas de ustedes (config FECHAS), con los dias que faltan. */
function proximaFecha(ahora = new Date()) {
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  let mejor = null;
  for (const f of FECHAS || []) {
    if (!f || !f.nombre || !f.mes || !f.dia) continue;
    let d = new Date(hoy.getFullYear(), f.mes - 1, f.dia);
    if (d < hoy) d = new Date(hoy.getFullYear() + 1, f.mes - 1, f.dia);
    const dias = Math.round((d - hoy) / 86400000);
    if (!mejor || dias < mejor.dias) mejor = { nombre: f.nombre, dias };
  }
  return mejor;
}

// De noche, si todavia no escribio la pagina de hoy, el personaje se lo pide (una vez por dia).
const CLAVE_PEDIDO_DIARIO = "baozi_pedido_diario";
function esHoraDeEscribir(h = new Date().getHours()) {
  return h >= 19 || h < 3;
}
function talVezPedirDiario() {
  if (!mascota || !diario || controller.vista !== "cara" || mascota.dormida || !puedeComentar()) return;
  if (!esHoraDeEscribir() || diario.hoyEscrito()) return;
  const clave = claveDelDia();
  try {
    if (localStorage.getItem(CLAVE_PEDIDO_DIARIO) === clave) return;
    localStorage.setItem(CLAVE_PEDIDO_DIARIO, clave);
  } catch (e) {
    return;
  }
  decir(`How was your day, ${mascota.nombre}? Tell me in the notebook ♥`, 6000);
}

// Si ella juega con Mantou, todo lo que la interfaz dice de "Baozi" pasa a
// decir "Mantou" (menos las cartas de rom, marcadas con data-sin-nombre).
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
  new MutationObserver(() => nombrarTextos(screenEl)).observe(screenEl, { childList: true, subtree: true, characterData: true });
}

function arrancar() {
  actualizarFondoPorHora();
  Sonido.despertarConPrimerToque();
  registrarServiceWorker();
  storage.pedirAlmacenamientoPersistente();
  const fotosListas = Camara.precargarFotos();
  fotosListas.then(() => {
    // si el diario ya estaba abierto, que aparezcan las fotos reales
    if (controller.vista === "consulta" && controller.consultaActual === "diary") renderVistaActual();
  });

  Final.iniciar({
    pantalla: screenEl,
    datos: () => ({ mascota, diario, lugaresReg, npcsReg }),
    prepararVista,
    abrirLente: (opts) => abrirLenteEnPantalla(opts),
    volverACasa: () => conTransicion(irACasa),
    abrirDirector: () => conTransicion(abrirDirector),
    guardarTodo,
    estadoPieza,
  });

  const guardado = storage.cargar();
  guardadoAuto = new storage.GuardadoAutomatico();
  if (guardado) {
    ({ mascota, npcs: npcsReg, lugares: lugaresReg, diario, cartasEntregadas } = guardado);
    Final.restaurarDesdeGuardado(guardado.extras && guardado.extras.final);
    Personaje.restaurar(guardado.extras && guardado.extras.personaje);
    cargarAmigos(guardado.extras && guardado.extras.amigos);
    // (la primera vez despues de actualizar no hay "ultima vista": vale la del guardado)
    const vista = ultimaVista() || Number(guardado.guardadoEn) || Date.now();
    const horasSinVerla = (Date.now() - Math.max(mascota.ultimaInteraccion || 0, vista)) / 3600000;
    mascota.actualizarTiempo(Date.now());
    mascota.revisarSuenioAutomatico(Date.now());
    programarProximoParpadeo();
    if (Final.hayQueRetomar()) {
      // La app se cerro en medio del final: se vuelve al mismo paso, pero
      // DESPUES de leer las fotos (si no, el montaje quedaria vacio).
      Promise.race([fotosListas, new Promise((r) => setTimeout(r, 2500))]).then(() => Final.iniciarSecuencia({}));
      return;
    }
    const laExtrano = horasSinVerla >= 18 && !mascota.dormida && !mascota.enferma && !Final.fotoPedida() && !finalOcupado();
    const hora = new Date().getHours();
    const saludoHora = hora >= 5 && hora < 11 ? `Good morning, ${mascota.nombre}!` : hora >= 22 || hora < 4 ? `Still up, ${mascota.nombre}?` : `Hi, ${mascota.nombre}!`;
    saludoPendiente = laExtrano ? "You're back… I missed you!" : mascota.nombre ? saludoHora : "";
    setTimeout(() => {
      saludoPendiente = "";
      if (controller.vista === "cara") renderVistaActual();
    }, 4500);
    controller.irACara();
    renderVistaActual();
    // mucho tiempo sin verla: primero un pucherito, despues contentisimo
    if (laExtrano) mostrarEspecial("decepcionado", 2600, { nombre: "euforico", ms: 2400 });
    if (Final.fotoPedida()) {
      // Baozi ya habia pedido la foto y ella cerro la app: se lo vuelve a pedir.
      setTimeout(() => conTransicion(() => Final.abrirPedido()), 900);
    }
    vigilarLugarFinal();
    setTimeout(() => revisarLugares(true), 2500);
  } else {
    diario = new Diario();
    cartasEntregadas = [];
    controller.vista = "elegir";
    renderVistaActual();
  }
}

// ------------------------------------------------------------------
// Primer arranque: el huevo -> el nombre
// ------------------------------------------------------------------

const TOQUES_PARA_ECLOSIONAR = 3;

function wireHuevo() {
  let toques = 0;
  const pantalla = document.getElementById("pantalla-huevo");
  const huevo = document.getElementById("huevo");
  pantalla.addEventListener("click", () => {
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
      setTimeout(() => {
        controller.vista = "nombre";
        renderVistaActual();
      }, 900);
    }
  });
}

function wireElegir() {
  for (const b of screenEl.querySelectorAll("[data-personaje]")) {
    b.addEventListener("click", () => {
      Personaje.elegir(b.dataset.personaje);
      Sonido.sonar("tocar");
      b.classList.add("elegida");
      setTimeout(() => {
        conTransicion(() => {
          controller.vista = "huevo";
          renderVistaActual();
        });
      }, 350);
    });
  }
}

function wireNombre() {
  const saludo = document.getElementById("nombre-saludo");
  escribir(saludo, `Hi!! I'm ${Personaje.nombre()}. What's your name?`);
  const input = document.getElementById("input-nombre");
  document.getElementById("btn-confirmar-nombre").addEventListener("click", confirmarNombre);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirmarNombre();
  });
  setTimeout(() => input.focus(), 300);
}

function confirmarNombre() {
  const input = document.getElementById("input-nombre");
  const nombre = (input.value || "").trim().slice(0, 12) || NOMBRE_POR_DEFECTO;
  mascota = new PetState(nombre, Date.now());
  npcsReg = new RegistroNPCs();
  lugaresReg = new RegistroLugares();
  cargarAmigos(null);
  diario = diario || new Diario();
  cartasEntregadas = [];
  guardarTodo();
  Sonido.sonar("guardado");
  saludoPendiente = `Nice to meet you, ${nombre}!`;
  setTimeout(() => {
    saludoPendiente = "";
    if (controller.vista === "cara") renderVistaActual();
  }, 5000);
  conTransicion(() => {
    controller.irACara();
    renderVistaActual();
    programarProximoParpadeo();
  });
}

// ------------------------------------------------------------------
// Render dispatcher
// ------------------------------------------------------------------

function actualizarTabbar() {
  tabbarEl.classList.toggle("oculto", !VISTAS_CON_TABBAR.has(controller.vista));
  for (const boton of tabbarEl.querySelectorAll("button")) {
    boton.classList.toggle("activo", boton.dataset.cat === controller.categoria);
  }
}

/** Cambia de vista sin dibujar (el que llama dibuja). La usan lente/final. */
function prepararVista(nombre) {
  if (lenteAbierto && nombre !== "lente") cerrarLente();
  controller.vista = nombre;
  actualizarTabbar();
  actualizarMarco();
  screenEl.classList.toggle("sin-margen", VISTAS_SIN_MARGEN.has(nombre));
}

function irACasa() {
  if (lenteAbierto) cerrarLente();
  controller.irACara();
  renderVistaActual();
}

function renderVistaActual() {
  actualizarTabbar();
  actualizarMarco();
  screenEl.classList.toggle("sin-margen", VISTAS_SIN_MARGEN.has(controller.vista));

  switch (controller.vista) {
    case "escribir":
      abrirEscribir();
      break;
    case "elegir":
      R.renderElegir(screenEl);
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
      if (pieza && pieza.vivo()) pieza.refrescar();
      else pieza = crearPieza(screenEl, { estado: estadoPieza, alTocar: tocarObjeto, alRayo });
      break;
    case "heladera":
      R.renderHeladera(screenEl);
      wireHeladera();
      break;
    case "mapa":
      renderMapaActual();
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
        estado: estadoCara(mascota),
      });
      wireCaminar();
      break;
    case "wheretogo":
      R.renderWhereTo(screenEl, lugaresReg.pendientes().filter((l) => amigos.lugarVisible(l.id, lugaresReg.desbloqueados)));
      wireWhereTo();
      break;
    case "lugarcerca":
      R.renderLugarCerca(screenEl, lugarCercaDetectado);
      wireLugarCerca();
      break;
    case "descubrimiento":
      R.renderDescubrimiento(screenEl, lugarDescubierto, { fotoGuardada: fotoDelDescubrimiento });
      wireDescubrimiento();
      break;
    case "encuentro":
      renderEncuentro();
      break;
    case "carta":
      R.renderCarta(screenEl, cartaActual);
      document.getElementById("btn-continuar-carta").addEventListener("click", () => {
        Musica.detener();
        conTransicion(() => {
          cartaActual = null;
          irACasa();
        });
      });
      break;
    case "director":
      abrirDirector();
      break;
    case "minijuego":
    case "lente":
    case "final":
    case "intro":
      // arman su propio DOM (iniciarMinijuego / abrirLenteEnPantalla / final.js)
      break;
  }
}

const MESES_CORTOS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fechaCorta(ms) {
  const f = new Date(ms);
  return `${MESES_CORTOS[f.getMonth()]} ${f.getDate()}`;
}

// ------------------------------------------------------------------
// Casa: acariciar, busqueda armada, reloj secreto
// ------------------------------------------------------------------

const COOLDOWN_MIMO_MS = 60000;
let proximoMimoConEfectoMs = 0;
let toquesReloj = [];

/** Lo que el cuarto necesita saber para dibujarse (se consulta a 12 fps). */
function estadoPieza() {
  const estado = estadoCara(mascota);
  const fotoPedida = Final.fotoPedida();
  const [ojos, boca] = R.archivosCara(mascota, estado, { especialActiva, fotoPedida });
  const dormido = mascota.dormida && !fotoPedida;
  const globo = globoTemporal ? { texto: globoTemporal, rosa: false } : R.globoCara(mascota, { fotoPedida, saludo: saludoPendiente });
  return {
    momento: momentoActual || "dia",
    dormido,
    farol: !dormido,
    sonido: Sonido.sonidoHabilitado(),
    ojos,
    boca,
    parpadea: !dormido && !especialActiva && !fotoPedida && (estado.tipo === "base" || estado.tipo === "aburrido"),
    // se queda sentado en su zabuton (no pasea) si esta enfermo o si Baozi pidio la foto del lago
    quieto: fotoPedida || mascota.enferma || finalOcupado(),
    recuerdos: [...lugaresReg.desbloqueados],
    pines: LUGARES.filter((l) => lugaresReg.desbloqueados.has(l.id)).map((l) => ({ lat: l.lat, lon: l.lon, color: l.color })),
    dia: new Date().getDate(),
    anillo: Final.dijoQueSi(),
    avisos: fotoPedida
      ? []
      : [
          ...new Set([
            ...(dormido ? [] : R.necesidades(mascota).map((n) => n.objeto).filter(Boolean)),
            // la pagina de hoy sin escribir: un "!" sobre el cuaderno de la mesita
            ...(esHoraDeEscribir() && diario && !diario.hoyEscrito() ? ["mesita"] : []),
            // un amigo trae un regalo: "!" sobre la ventana
            ...(visita && visita.regalo ? ["ventana"] : []),
          ]),
        ],
    npc: visita ? visita.npc.id : null,
    decoraciones: amigos.decoraciones(),
    clima: Clima.tipo(),
    globo: globo.texto,
    globoRosa: globo.rosa,
  };
}

function decir(texto, ms = 2600) {
  globoTemporal = Personaje.conNombre(texto);
  clearTimeout(timeoutGlobo);
  timeoutGlobo = setTimeout(() => {
    globoTemporal = "";
    if (controller.vista === "cara") renderVistaActual();
  }, ms);
  if (controller.vista === "cara") renderVistaActual();
}

/** Cada objeto del cuarto es una parte del juego. */
function tocarObjeto(id) {
  if (!mascota) return;
  switch (id) {
    case "baozi":
      tocarBaozi();
      break;
    case "reloj":
      tocarReloj();
      break;
    case "heladera":
      Sonido.sonar("tocar");
      conTransicion(() => {
        prepararVista("heladera");
        renderVistaActual();
      });
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
      Sonido.alternarSonido();
      if (!Sonido.sonidoHabilitado()) Musica.detener(0.1);
      Sonido.sonar("tocar");
      decir(Sonido.sonidoHabilitado() ? "Music on ♪" : "Shh… quiet mode.");
      break;
    case "mesita":
      Sonido.sonar("tocar");
      abrirCuaderno("diary");
      break;
    case "corcho":
      Sonido.sonar("tocar");
      abrirMapa();
      break;
    case "calendario": {
      Sonido.sonar("tocar");
      const si = Final.fechaDelSi();
      const proxima = proximaFecha();
      decir(
        Final.dijoQueSi() && si
          ? `Since ${fechaCorta(si)} ♥`
          : proxima
            ? proxima.dias === 0
              ? `Today is ${proxima.nombre}!! ♥`
              : `${proxima.dias} ${proxima.dias === 1 ? "day" : "days"} until ${proxima.nombre}.`
            : `Today is ${fechaCorta(Date.now())}.`,
        3200,
      );
      break;
    }
    case "ventana":
      tocarVentana();
      break;
  }
}

function tocarBaozi() {
  const caja = screenEl.querySelector(".caja-cara");
  if (Final.fotoPedida() && mascota) {
    if (mascota.dormida) {
      mascota.alternarDormir(Date.now()); // hoy no se duerme: quiere su foto
      guardarTodo();
    }
    conTransicion(() => Final.abrirPedido());
    return;
  }
  if (!mascota || mascota.dormida) {
    Sonido.sonar("no");
    return;
  }
  const ahora = Date.now();
  if (ahora >= proximoMimoConEfectoMs) {
    mascota.mimar(ahora);
    proximoMimoConEfectoMs = ahora + COOLDOWN_MIMO_MS;
    guardarTodo();
  }
  Sonido.sonar("mimo");
  vibrar(15);
  if (caja) lanzarCorazon(caja);
}

// 5 toques rapidos en el reloj -> PIN -> modo director (solo rom).
function tocarReloj() {
  const ahora = Date.now();
  toquesReloj = toquesReloj.filter((t) => ahora - t < 3000);
  toquesReloj.push(ahora);
  if (toquesReloj.length >= 5) {
    toquesReloj = [];
    conTransicion(abrirPin);
  }
}

// ------------------------------------------------------------------
// Los amigos (amigos.js): misiones que se cumplen solas con lo que ella hace
// ------------------------------------------------------------------

function cargarAmigos(datos) {
  amigos = RegistroAmigos.desdeObjeto(datos);
  Personaje.ponerAccesorio(amigos.puesto);
}

function contextoAmigos() {
  return {
    pasosHoy: diario ? diario.hoy().pasos : 0,
    racha: diario ? diario.racha() : 0,
    sellados: lugaresReg ? lugaresReg.desbloqueados : new Set(),
    record: leerRecord(),
  };
}

function estadoParaAmigos() {
  return { tipo: "estado", ...contextoAmigos() };
}

/** Algo paso: si cumple una mision, el amigo viene a la ventana con el regalo. */
function eventoAmigos(ev, { sinVisita = false } = {}) {
  if (!mascota) return;
  const listos = amigos.evento(ev);
  if (!listos.length) return;
  guardarTodo();
  if (sinVisita) return;
  // si esta en el cuarto, llega enseguida; si no, cuando vuelva (talVezVisita)
  if (controller.vista === "cara" && !visita && !mascota.dormida && !finalOcupado()) {
    const npc = NPCS.find((n) => n.id === listos[0]);
    if (npc) anunciarVisita(npc, { regalo: true });
  }
}

/** Se sello un lugar: los secretos sellados antes de tiempo quedan revelados. */
function alSellar(idLugar) {
  if (LUGARES_SECRETOS.has(idLugar)) amigos.revelar(idLugar);
  eventoAmigos({ tipo: "sello", lugar: idLugar });
  eventoAmigos(estadoParaAmigos());
}

/** Una foto guardada: donde se saco (el lugar del sello, o el GPS) y a que hora. */
function fotoParaAmigos(foto) {
  const base = { tipo: "foto", filtro: foto.filtro, stickers: foto.stickers || [], momento: momentoActual };
  if (foto.lugar) {
    eventoAmigos({ ...base, lugar: foto.lugar });
    return;
  }
  const conPosicion = (lat, lon) => {
    const l = lugarCercano(lat, lon);
    eventoAmigos({ ...base, lugar: l ? l.id : null });
  };
  if (ultimaPosicion && Date.now() - (ultimaPosicion.t || 0) < 5 * 60000) {
    conPosicion(ultimaPosicion.lat, ultimaPosicion.lon);
    return;
  }
  if (estadoUbicacion === "ok" && Sensores.geolocationDisponible()) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        ultimaPosicion = { lat: pos.coords.latitude, lon: pos.coords.longitude, t: Date.now() };
        conPosicion(pos.coords.latitude, pos.coords.longitude);
      },
      () => eventoAmigos({ ...base, lugar: null }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 },
    );
    return;
  }
  eventoAmigos({ ...base, lugar: null });
}

function tocarVentana() {
  if (visita) {
    const npc = visita.npc;
    visita = null;
    encuentro = { npc, paso: "anuncio", pendienteEnamorado: false };
    diario.anotarNpc(npc.id);
    guardarTodo();
    conTransicion(() => {
      controller.vista = "encuentro";
      renderVistaActual();
    });
    return;
  }
  Sonido.sonar("tocar");
  const frases = {
    amanecer: "Good morning, lake!",
    dia: "The lake looks so pretty today.",
    atardecer: "Look at that sky…",
    noche: "The city lights are on.",
  };
  const delClima = {
    nublado: "Cloudy today. Cozy.",
    niebla: "I can't even see the pagoda…",
    llovizna: "Tiny raindrops on the glass.",
    lluvia: "Listen to the rain…",
    tormenta: "Stay inside with me, okay?",
    nieve: "SNOW! Everything's white!",
  };
  decir(delClima[Clima.tipo()] || frases[momentoActual] || frases.dia);
}

// Visitas: de vez en cuando un amigo golpea la ventana (antes pasaba caminando).
function talVezVisita() {
  if (!mascota || mascota.dormida || visita || controller.vista !== "cara") return;
  if (["armado", "pedido", "en_curso"].includes(Final.fase())) return;
  // un amigo con un regalo viene enseguida, y espera en la ventana hasta que ella abra
  const conRegalo = amigos.regaloPendiente();
  if (conRegalo) {
    const npc = NPCS.find((n) => n.id === conRegalo);
    if (npc) {
      anunciarVisita(npc, { regalo: true });
      return;
    }
  }
  const ahora = Date.now();
  if (ahora < proximaConsultaVisitaMs) return;
  proximaConsultaVisitaMs = ahora + 5 * 60000;
  const npc = npcsReg.talVezVisitar(ahora);
  if (!npc) return;
  guardarTodo();
  anunciarVisita(npc);
}

function anunciarVisita(npc, { regalo = false } = {}) {
  visita = { npc, hastaMs: regalo ? Infinity : Date.now() + 35000, regalo };
  Sonido.sonar("encuentro");
  vibrar(30);
  // primero el susto, despues la curiosidad: "¿quien sera?"
  sorpresa(2500, { nombre: "curioso", ms: 5500 });
  decir(regalo ? `${npc.nombre} is at the window with a gift!` : "Knock knock… someone's at the window!", 4000);
}

/**
 * Una cara especial por un ratito, con otra opcional despues
 * (luego = { nombre, ms }). La lleva un temporizador propio, asi la
 * cadena no depende del tick de 5 s.
 */
let timeoutEspecial = null;
function mostrarEspecial(nombre, ms, luego = null) {
  if (!mascota || mascota.dormida || mascota.enferma || Final.fotoPedida() || finalOcupado()) return;
  const ahora = Date.now();
  clearTimeout(timeoutEspecial);
  especialActiva = nombre;
  especialHastaMs = ahora + ms + 6000; // el tick no la corta: la corta el temporizador
  proximoEspecialPermitidoMs = Math.max(proximoEspecialPermitidoMs, ahora + ms + (luego ? luego.ms : 0) + 5000);
  timeoutEspecial = setTimeout(() => {
    timeoutEspecial = null;
    if (especialActiva !== nombre) return;
    especialActiva = null;
    if (luego) mostrarEspecial(luego.nombre, luego.ms, luego.luego || null);
    else if (controller.vista === "cara") renderVistaActual();
  }, ms);
  if (controller.vista === "cara") renderVistaActual();
}

/** Baozi solo comenta cosas si esta despierto y no hay nada del final en curso. */
function puedeComentar() {
  return !!mascota && !mascota.dormida && !Final.fotoPedida() && !finalOcupado();
}

/** Cara de sorprendido un ratito (alguien en la ventana, el clima se pone feo). */
function sorpresa(ms = 3000, luego = null) {
  mostrarEspecial("sorprendido", ms, luego);
}

/** Un trueno: Baozi se asusta (no siempre, y no si esta en otra pantalla). */
let proximoSustoMs = 0;
function alRayo() {
  Clima.trueno();
  const ahora = Date.now();
  if (controller.vista !== "cara" || ahora < proximoSustoMs || (especialActiva && especialActiva !== "asustado")) return;
  proximoSustoMs = ahora + 20000;
  mostrarEspecial("asustado", 2600);
  if (especialActiva === "asustado" && Math.random() < 0.35) decir(["Eek!!", "That was loud…", "I'm not scared. You're scared."][Math.floor(Math.random() * 3)], 2400);
}

/** Consulta el clima real de afuera; si se puso feo, Baozi lo nota. */
async function revisarClima() {
  const ahora = Date.now();
  if (ahora < proximoClimaMs) return;
  proximoClimaMs = ahora + 20 * 60000;
  const { antes, ahora: nuevo } = await Clima.actualizar(ultimaPosicion);
  if (nuevo && nuevo !== antes && Clima.esMalo(nuevo) && controller.vista === "cara" && puedeComentar()) {
    sorpresa(3500);
    decir(Clima.FRASES[nuevo] || "Look outside!", 4000);
  }
  sonidoDelClima();
}

/** La lluvia se escucha solo en el cuarto, con el sonido prendido. */
function sonidoDelClima() {
  const t = Clima.tipo();
  const nivel = controller.vista === "cara" && mascota && Clima.llueve(t) ? { llovizna: 0.3, lluvia: 0.7, tormenta: 1 }[t] : 0;
  Clima.sonidoLluvia(nivel);
}

// ------------------------------------------------------------------
// La heladera
// ------------------------------------------------------------------

function wireHeladera() {
  document.getElementById("btn-volver-heladera").addEventListener("click", () => conTransicion(irACasa));
  for (const b of screenEl.querySelectorAll("[data-comida]")) {
    b.addEventListener("click", () => {
      if ((b.dataset.item || "").endsWith("bebida_te.png")) eventoAmigos({ tipo: "comer", item: "te" });
      manejarTapItem(b.dataset.comida, { item: b.dataset.item });
    });
  }
}

// ------------------------------------------------------------------
// El cuaderno (diario, amigos, Baozi, rasgos, ajustes)
// ------------------------------------------------------------------

function abrirCuaderno(pestana) {
  conTransicion(() => {
    controller.abrirConsulta(pestana);
    renderVistaActual();
  });
}

// ------------------------------------------------------------------
// Sellos de Hangzhou (reemplazan a la caminata)
// ------------------------------------------------------------------

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
    return (await navigator.permissions.query({ name: "geolocation" })).state;
  } catch (e) {
    return "desconocido";
  }
}

let estadoUbicacion = "pedir"; // "ok" | "pedir" | "sin"

async function actualizarEstadoUbicacion() {
  if (!Sensores.geolocationDisponible()) {
    estadoUbicacion = "sin";
    return estadoUbicacion;
  }
  const p = await permisoUbicacion();
  if (p === "denied") estadoUbicacion = "sin";
  else if (p === "granted" || ubicacionActivada()) estadoUbicacion = "ok";
  else estadoUbicacion = "pedir";
  return estadoUbicacion;
}

function finalOcupado() {
  return ["armado", "pedido", "en_curso"].includes(Final.fase());
}

/** Con la app abierta en el cuarto, cada ~2 min se fija si estan en un lugar nuevo. */
async function revisarLugares(forzar = false) {
  if (!mascota || controller.vista !== "cara" || finalOcupado()) return;
  const ahora = Date.now();
  if (!forzar && ahora < proximaLecturaLugaresMs) return;
  proximaLecturaLugaresMs = ahora + 120000;
  if ((await actualizarEstadoUbicacion()) !== "ok") return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      ultimaPosicion = { lat: pos.coords.latitude, lon: pos.coords.longitude, t: Date.now() };
      eventoAmigos({ tipo: "posicion", lat: pos.coords.latitude, lon: pos.coords.longitude });
      const lugar = lugaresReg.lugarEnRango(pos.coords.latitude, pos.coords.longitude, Date.now());
      if (lugar && controller.vista === "cara" && !finalOcupado()) abrirSello(lugar);
    },
    () => {},
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
  );
}

function abrirMapa(seleccion = null) {
  if (seleccion) mapaSeleccion = seleccion;
  actualizarEstadoUbicacion().then(() => {
    conTransicion(() => {
      prepararVista("mapa");
      renderVistaActual();
    });
  });
}

function renderMapaActual() {
  const sellados = lugaresReg.desbloqueados;
  if (!mapaSeleccion) mapaSeleccion = (LUGARES.find((l) => sellados.has(l.id)) || LUGARES[0]).id;
  R.renderMapa(screenEl, {
    lugares: LUGARES.filter((l) => amigos.lugarVisible(l.id, sellados)),
    sellados,
    fechas: lugaresReg.fechas,
    seleccionado: mapaSeleccion,
    ubicacion: estadoUbicacion,
    fotoDe: (id) => Camara.fotoDeLugar(id),
    posicion: posicionEnMapa,
  });
  document.getElementById("btn-volver-mapa").addEventListener("click", () => conTransicion(irACasa));
  for (const b of screenEl.querySelectorAll("[data-lugar]")) {
    b.addEventListener("click", () => {
      Sonido.sonar("tocar");
      mapaSeleccion = b.dataset.lugar;
      renderMapaActual();
    });
  }
  const btnUbicacion = document.getElementById("btn-ubicacion");
  if (btnUbicacion) {
    btnUbicacion.addEventListener("click", () => {
      btnUbicacion.disabled = true;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          try {
            localStorage.setItem(CLAVE_UBICACION, "1");
          } catch (e) {}
          estadoUbicacion = "ok";
          ultimaPosicion = { lat: pos.coords.latitude, lon: pos.coords.longitude, t: Date.now() };
          eventoAmigos({ tipo: "posicion", lat: pos.coords.latitude, lon: pos.coords.longitude });
          const lugar = lugaresReg.lugarEnRango(pos.coords.latitude, pos.coords.longitude, Date.now());
          if (lugar) abrirSello(lugar);
          else renderMapaActual();
        },
        (err) => {
          estadoUbicacion = err && err.code === 1 ? "sin" : "pedir";
          renderMapaActual();
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    });
  }
  const btnAqui = document.getElementById("btn-aqui");
  if (btnAqui) {
    btnAqui.addEventListener("click", () => {
      const lugar = LUGARES.find((l) => l.id === mapaSeleccion);
      if (lugar && !lugaresReg.desbloqueados.has(lugar.id)) abrirSello(lugar);
    });
  }
}

let lugarDelSello = null;

function abrirSello(lugar) {
  if (!mascota || lugaresReg.desbloqueados.has(lugar.id)) return;
  lugarDelSello = lugaresReg.descubrir(mascota, lugar.id, Date.now()) || lugar;
  diario.anotarLugar(lugar.id);
  alSellar(lugar.id);
  guardarTodo();
  Musica.tocar("descubrimiento");
  conTransicion(() => {
    prepararVista("sello");
    R.renderSello(screenEl, lugarDelSello);
    wireSello(lugarDelSello);
  });
}

function wireSello(lugar) {
  const huella = document.getElementById("huella-sello");
  setTimeout(() => {
    if (!huella || !huella.isConnected) return;
    huella.classList.add("cae");
    Sonido.sonar("hallazgo");
    vibrar([40, 30, 80]);
  }, 500);
  setTimeout(() => {
    const texto = document.getElementById("frase-sello");
    if (!texto || !texto.isConnected) return;
    escribir(texto, lugar.frase || lugar.dialogo || "", {
      alTerminar: () => {
        const b = document.getElementById("botones-sello");
        if (b) b.classList.remove("oculto");
      },
    });
  }, 1300);
  document.getElementById("btn-sello-despues").addEventListener("click", () => terminarSello(lugar));
  document.getElementById("btn-sello-foto").addEventListener("click", () => {
    Musica.detener(0.3);
    conTransicion(() =>
      abrirLenteEnPantalla({
        modo: "foto",
        lugar: lugar.id,
        titulo: lugar.nombre.toUpperCase(),
        alGuardar: () => {
          if (mascota) diario.anotarFoto();
          guardarTodo();
          mostrarPostal(lugar);
        },
        alSalir: () => mostrarPostal(lugar),
      }),
    );
  });
}

function mostrarPostal(lugar) {
  conTransicion(() => {
    prepararVista("postal");
    R.renderPostal(screenEl, lugar, Camara.fotoDeLugar(lugar.id), lugaresReg.fechas[lugar.id] || Date.now());
    document.getElementById("btn-postal-listo").addEventListener("click", () => {
      Sonido.sonar("guardado");
      terminarSello(lugar);
    });
  });
}

function terminarSello(lugar) {
  lugarDelSello = null;
  mapaSeleccion = lugar.id;
  if (mostrarCartaSiCorresponde({ lugarDescubierto: lugar.id })) return;
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
  corazon.addEventListener("animationend", () => corazon.remove());
}

// ------------------------------------------------------------------
// Modo director
// ------------------------------------------------------------------

function abrirPin() {
  prepararVista("director");
  Director.renderPin(screenEl, {
    alOk: () => conTransicion(abrirDirector),
    alSalir: () => conTransicion(irACasa),
  });
}

function abrirDirector() {
  Musica.detener();
  prepararVista("director");
  Director.renderDirector(screenEl, {
    sonidoHabilitado: Sonido.sonidoHabilitado,
    cerrar: () => conTransicion(irACasa),
    probarGPS: probarGPSDirector,
    ensayar: () => conTransicion(() => Final.abrirPedido({ ensayo: true })),
    pedirYa: () => {
      if (Final.fase() === "dormido") Final.armar();
      conTransicion(() => Final.abrirPedido());
    },
    empezarYa: () => Final.empezar({}),
  });
}

// ------------------------------------------------------------------
// El final: con el final ARMADO (y solo entonces), se vigila en
// silencio si ella esta en el lago. Armado no se ve en ningun lado.
// ------------------------------------------------------------------

let watchFinal = null;
let pedidoPendiente = false;
// Baozi espera a que ella termine lo que esta haciendo (una foto, el
// minijuego, un encuentro) para no cortarle nada a la mitad.
const VISTAS_INTERRUMPIBLES = new Set(["cara", "menu", "consulta", "caminar", "heladera", "mapa"]);

function dejarDeVigilar() {
  if (watchFinal !== null) {
    Sensores.detenerSeguimientoGPS(watchFinal);
    watchFinal = null;
  }
}

function vigilarLugarFinal() {
  const debe = !!mascota && Final.armada() && document.visibilityState === "visible" && Sensores.geolocationDisponible();
  if (debe && watchFinal === null) {
    watchFinal = Sensores.iniciarSeguimientoGPS(
      (lat, lon, precision) => {
        if (Final.posicionRecibida(lat, lon, precision)) {
          pedidoPendiente = true;
          dejarDeVigilar();
          intentarPedido();
        }
      },
      () => {},
    );
  } else if (!debe) {
    dejarDeVigilar();
  }
}

function intentarPedido() {
  if (!pedidoPendiente) return;
  // si mientras tanto se desarmo o se reinicio desde el director, no se pide nada
  if (!Final.armada() && !Final.fotoPedida()) {
    pedidoPendiente = false;
    return;
  }
  if (!VISTAS_INTERRUMPIBLES.has(controller.vista) || minijuego) return;
  pedidoPendiente = false;
  if (controller.vista === "caminar") detenerSensoresCaminar();
  conTransicion(() => Final.abrirPedido());
}

function probarGPSDirector(el) {
  if (!el) return;
  if (!Sensores.geolocationDisponible()) {
    el.textContent = "No GPS in this browser.";
    return;
  }
  el.textContent = "Locating…";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      const d = Final.distanciaAlLugar(latitude, longitude);
      const dentro = d - Math.min(accuracy || 0, 300) <= FINAL.lugar.radioMetros;
      el.textContent = `${Math.round(d)} m from ${FINAL.lugar.nombre} (±${Math.round(accuracy)} m) — ${dentro ? "INSIDE ✓" : "outside"}`;
      el.className = `director-gps ${dentro ? "ok" : ""}`;
    },
    (err) => {
      el.textContent = err && err.code === 1 ? "Location permission denied." : "No GPS fix right now.";
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
  );
}

// ------------------------------------------------------------------
// El Lente
// ------------------------------------------------------------------

function cerrarLente() {
  if (lenteAbierto) {
    lenteAbierto.cerrar();
    lenteAbierto = null;
  }
}

// Los stickers de la camara: los dos personajes (no solo el de ella), con
// todas sus caras, parados o sentados; y unos extras.
const CARAS_STICKER = [
  ["feliz", "ojo_base_energia_alta.png", "boca_base_feliz.png"],
  ["euforico", "ojo_especial_euforico.png", "boca_especial_euforico.png"],
  ["enamorado", "ojo_especial_enamorado.png", "boca_especial_enamorado.png"],
  ["sorprendido", "ojo_especial_sorprendido.png", "boca_especial_sorprendido.png"],
  ["curioso", "ojo_especial_curioso.png", "boca_especial_curioso.png"],
  ["hambriento", "ojo_especial_hambriento.png", "boca_especial_hambriento.png"],
  ["aburrido", "ojo_especial_aburrido.png", "boca_especial_aburrido.png"],
  ["triste", "ojo_especial_decepcionado.png", "boca_especial_decepcionado.png"],
  ["asustado", "ojo_especial_asustado.png", "boca_especial_asustado.png"],
  ["asqueado", "ojo_especial_asqueado.png", "boca_especial_asqueado.png"],
  ["cansada", "ojo_base_energia_baja.png", "boca_base_neutral.png"],
  ["dormida", "ojo_dormida.png", "boca_dormida.png"],
];

function catalogoStickers() {
  const suya = Personaje.actual();
  const quienes = [suya, ...Personaje.IDS.filter((q) => q !== suya)];
  const stickers = [];
  for (const quien of quienes) {
    for (const pose of ["parado", "sentado"]) {
      for (const [nombre, ojo, boca] of CARAS_STICKER) {
        // dormida: siempre con el cuerpo de dormir
        const p = nombre === "dormida" ? (pose === "parado" ? null : "dormido") : pose;
        if (!p) continue;
        stickers.push({
          id: `${quien}-${pose}-${nombre}`,
          nombre: `${Personaje.nombre(quien)} ${nombre}`,
          grupo: quien,
          pose,
          html: R.spriteCara(ojo, boca, false, "", { pose: p, quien }),
          capas: Personaje.capas(ojo, boca, p, quien).map((c) => arte(c.src)),
          lado: 96,
        });
      }
    }
  }
  const extras = [
    ["corazon", "final/corazon_rojo.png"],
    ["corazon-rosa", "final/corazon_rosa.png"],
    ["destello", "final/destello.png"],
    ["estrella", "ui/g_estrella@4.png"],
    ...(Final.dijoQueSi() ? [["anillo", "final/anillo.png"]] : []),
  ];
  for (const [id, src] of extras) {
    stickers.push({ id: `extra-${id}`, nombre: id, grupo: "extras", html: `<img class="sticker-extra" src="${arte(src)}" alt="" draggable="false" />`, capas: [arte(src)] });
  }
  // los stickers que regalaron los amigos
  for (const id of amigos.stickers()) {
    const npc = NPCS.find((n) => n.id === id);
    if (!npc) continue;
    const src = arte(`npcs/npc_${id}.png`);
    stickers.push({ id: `npc-${id}`, nombre: npc.nombre, grupo: "amigos", html: `<img class="sticker-extra sticker-npc" src="${src}" alt="" draggable="false" />`, capas: [src], lado: 80 });
  }
  const mini = (quien) => R.spriteCara("ojo_especial_euforico.png", "boca_especial_euforico.png", false, "mini", { quien });
  return {
    stickers,
    grupos: [
      ...quienes.map((q) => ({ id: q, nombre: Personaje.nombre(q), html: `${mini(q)}<span>${Personaje.nombre(q)}</span>` })),
      { id: "extras", nombre: "Extras", html: `<img class="sticker-extra" src="${arte("final/corazon_rojo.png")}" alt="" /><span>Extras</span>` },
      ...(amigos.stickers().length ? [{ id: "amigos", nombre: "Friends", html: `<img class="sticker-extra" src="${arte(`npcs/npc_${amigos.stickers()[0]}.png`)}" alt="" /><span>Friends</span>` }] : []),
    ],
    iconoSticker: mini(suya),
  };
}

/** Abre el lente dentro del aparato. */
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
    alGuardar: (foto) => {
      lenteAbierto = null;
      if (opts.modo !== "pedido" && foto && !opts.ensayo) fotoParaAmigos(foto);
      (opts.alGuardar || (() => conTransicion(irACasa)))(foto);
    },
  });
}

function abrirLenteDesdeMenu() {
  abrirLenteEnPantalla({
    modo: "foto",
    alGuardar: () => {
      if (mascota) diario.anotarFoto();
      guardarTodo();
      conTransicion(() => {
        R.renderFeedback(screenEl, "Saved to the diary", { icono: "camara" });
        prepararVista("feedback");
        setTimeout(() => conTransicion(irACasa), DURACION_FEEDBACK_MS + 200);
      });
    },
  });
}

// ------------------------------------------------------------------
// Menu (Care / Play / Journal)
// ------------------------------------------------------------------

function abrirCategoriaDesdeTab(idCategoria) {
  if (idCategoria === controller.categoria && controller.vista === "menu") return;
  Sonido.sonar("tocar");
  conTransicion(() => {
    controller.abrirCategoria(idCategoria);
    renderVistaActual();
  });
}

function renderMenuActual() {
  R.renderMenu(screenEl, controller.categoria, controller.indiceCarrusel, {
    estadoItem: { sound: Sonido.sonidoHabilitado() ? "ON" : "OFF" },
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
  pista.addEventListener("touchstart", (e) => {
    xInicio = e.touches[0].clientX;
  }, { passive: true });
  pista.addEventListener("touchend", (e) => {
    if (xInicio === null) return;
    const delta = e.changedTouches[0].clientX - xInicio;
    xInicio = null;
    if (delta > UMBRAL_SWIPE_PX) moverCarrusel(-1);
    else if (delta < -UMBRAL_SWIPE_PX) moverCarrusel(1);
  });
}

function wireMenu() {
  document.getElementById("btn-volver-menu").addEventListener("click", () => {
    conTransicion(() => {
      controller.cerrarCategoria();
      renderVistaActual();
    });
  });
  const actual = screenEl.querySelector(".item-carrusel.actual");
  if (actual) actual.addEventListener("click", () => manejarTapItem(actual.dataset.item));
  for (const vecino of screenEl.querySelectorAll(".item-carrusel.vecino")) {
    vecino.addEventListener("click", () => moverCarrusel(Number(vecino.dataset.mover)));
  }
  const btnPrev = document.getElementById("btn-carrusel-prev");
  const btnNext = document.getElementById("btn-carrusel-next");
  if (btnPrev) btnPrev.addEventListener("click", () => moverCarrusel(-1));
  if (btnNext) btnNext.addEventListener("click", () => moverCarrusel(1));
  const pista = document.getElementById("pista-carrusel");
  if (pista) wireSwipeCarrusel(pista);
}

function manejarTapItem(itemId, opts = {}) {
  const resultado = ejecutarItemMenu(itemId, mascota, Date.now());
  if (!resultado) return;

  if (resultado.tipo === "accion") {
    if (resultado.ok) {
      mostrarFeedbackAccion(itemId, opts);
    } else {
      const [titulo, subtitulo] = MOTIVOS_ACCION_FALLIDA[itemId] || ["Not now", ""];
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
      conTransicion(iniciarMinijuego);
    }
  } else if (resultado.tipo === "caminar") {
    conTransicion(iniciarCaminar);
  } else if (resultado.tipo === "lente") {
    if (Final.fotoPedida()) conTransicion(() => Final.abrirPedido());
    else conTransicion(abrirLenteDesdeMenu);
  } else if (resultado.tipo === "ajuste") {
    Sonido.alternarSonido();
    if (!Sonido.sonidoHabilitado()) Musica.detener(0.1);
    renderMenuActual();
  } else if (resultado.tipo === "consulta") {
    Sonido.sonar("tocar");
    conTransicion(() => {
      controller.abrirConsulta(resultado.dato);
      renderVistaActual();
    });
  }
}

function etiquetaFeedback(itemId) {
  return { feed: "Yum!", water: "Gulp gulp!", clean: "Squeaky clean!", sleep: mascota.dormida ? "Good night…" : "Good morning!", medicine: "All better!" }[itemId] || "Done!";
}

const DURACION_FEEDBACK_ACCION_MS = 2400;
const SONIDO_POR_ACCION = { feed: "comer", water: "beber", clean: "limpiar", medicine: "medicina" };

function mostrarFeedbackAccion(itemId, opts = {}) {
  Sonido.sonar(itemId === "sleep" ? (mascota.dormida ? "dormir" : "despertar") : SONIDO_POR_ACCION[itemId] || "mimo");
  diario.anotarCuidado();

  if (itemId === "feed") {
    const comida = opts.item || COMIDA_REL[Math.floor(Math.random() * COMIDA_REL.length)];
    conTransicion(() => R.renderFeedAccion(screenEl, comida));
  } else if (itemId === "water") {
    conTransicion(() => R.renderBeberAccion(screenEl, opts.item || "comida/bebida_agua.png"));
  } else if (itemId === "sleep" && !mascota.dormida) {
    conTransicion(() => R.renderDespertarAccion(screenEl));
  } else if (itemId === "clean") {
    conTransicion(() => R.renderCleanAccion(screenEl));
  } else if (itemId === "medicine") {
    conTransicion(() => R.renderMedicineAccion(screenEl));
  } else if (itemId === "sleep" && mascota.dormida) {
    conTransicion(() => R.renderSleepAccion(screenEl));
  } else {
    mostrarFeedback(etiquetaFeedback(itemId), { icono: itemId === "water" ? "gota" : "check" });
    return;
  }
  controller.vista = "feedback";
  actualizarTabbar();
  setTimeout(() => conTransicion(irACasa), DURACION_FEEDBACK_ACCION_MS);
}

function mostrarFeedback(titulo, opts = {}) {
  controller.vista = "feedback";
  actualizarTabbar();
  conTransicion(() => R.renderFeedback(screenEl, titulo, opts));
  setTimeout(() => conTransicion(irACasa), DURACION_FEEDBACK_MS);
}

function mostrarAviso(titulo, subtitulo) {
  controller.vista = "feedback";
  actualizarTabbar();
  conTransicion(() => R.renderAviso(screenEl, titulo, subtitulo));
  setTimeout(() => conTransicion(irACasa), DURACION_FEEDBACK_MS + 300);
}

// ------------------------------------------------------------------
// Journal
// ------------------------------------------------------------------

function renderConsulta() {
  const tipo = controller.consultaActual;
  // Cada pestaña se arma con su render de siempre y se pega en la hoja del cuaderno.
  const tmp = document.createElement("div");
  if (tipo === "diary") R.renderDiario(tmp, diario, { puedeRepetirFinal: Final.dijoQueSi() });
  else if (tipo === "stats") R.renderStats(tmp, mascota);
  else if (tipo === "traits") R.renderTraits(tmp, mascota);
  else if (tipo === "npcs") R.renderNpcs(tmp, npcsReg, amigos, { progreso: (m) => progresoDe(m, contextoAmigos()) });
  else if (tipo === "closet") R.renderCloset(tmp, amigos);
  else if (tipo === "ajustes" || tipo === "backup") tmp.innerHTML = R.htmlAjustes(Sonido.sonidoHabilitado());
  else R.renderProgress(tmp, mascota, lugaresReg);
  const cabecera = tmp.querySelector(".encabezado-vista");
  if (cabecera) cabecera.remove();
  R.renderCuaderno(screenEl, tipo === "backup" ? "ajustes" : tipo, tmp.innerHTML);

  if (tipo === "diary") wireDiario();
  if (tipo === "closet") {
    for (const b of screenEl.querySelectorAll("[data-accesorio]")) {
      b.addEventListener("click", () => {
        amigos.poner(amigos.puesto === b.dataset.accesorio ? null : b.dataset.accesorio);
        Personaje.ponerAccesorio(amigos.puesto);
        guardarTodo();
        Sonido.sonar(amigos.puesto ? "guardado" : "tocar");
        renderConsulta();
      });
    }
  }
  if (tipo === "ajustes" || tipo === "backup") {
    wireBackup();
    document.getElementById("btn-ajuste-sonido").addEventListener("click", () => {
      Sonido.alternarSonido();
      if (!Sonido.sonidoHabilitado()) Musica.detener(0.1);
      renderConsulta();
    });
  }
  for (const b of screenEl.querySelectorAll(".cuaderno-pestanas [data-pestana]")) {
    b.addEventListener("click", () => {
      if (b.dataset.pestana === controller.consultaActual) return;
      Sonido.sonar("tocar");
      controller.abrirConsulta(b.dataset.pestana);
      renderConsulta();
    });
  }
  document.getElementById("btn-volver-consulta").addEventListener("click", () => conTransicion(irACasa));
}

function wireDiario() {
  const escribirBtn = document.getElementById("btn-escribir-hoy");
  if (escribirBtn) escribirBtn.addEventListener("click", () => conTransicion(abrirEscribir));
  for (const fig of screenEl.querySelectorAll(".polaroid")) {
    fig.addEventListener("click", (e) => {
      if (e.target.closest("[data-repetir-final]")) {
        conTransicion(() => Final.repetir());
        return;
      }
      if (Number(fig.dataset.total) > 1) {
        Sonido.sonar("tocar");
        R.siguienteFotoPolaroid(fig);
      }
    });
  }
}

// ------------------------------------------------------------------
// v19: la pagina de hoy (ella escribe al final del dia)
// ------------------------------------------------------------------

let borradorHoy = null; // { animo, texto } mientras no se guarda (sobrevive a ir a sacar una foto)

function abrirEscribir() {
  controller.vista = "escribir";
  actualizarTabbar();
  actualizarMarco();
  screenEl.classList.add("sin-margen");
  const guardada = diario.entrada(claveDelDia());
  const entrada = borradorHoy ? { ...(guardada || {}), ...borradorHoy } : guardada;
  const fotos = Camara.fotosDelDia(claveDelDia());
  R.renderEscribir(screenEl, { entrada, foto: fotos.length ? fotos[fotos.length - 1] : null });
  let animo = entrada && entrada.animo ? entrada.animo : null;
  const texto = document.getElementById("texto-hoy");
  const personaje = document.getElementById("escribir-personaje");
  const recordar = () => {
    borradorHoy = { animo, texto: texto.value };
  };
  for (const b of screenEl.querySelectorAll("[data-animo]")) {
    b.addEventListener("click", () => {
      animo = b.dataset.animo;
      for (const o of screenEl.querySelectorAll("[data-animo]")) {
        o.classList.toggle("elegido", o === b);
        o.setAttribute("aria-checked", String(o === b));
      }
      const a = ANIMOS.find((x) => x.id === animo);
      personaje.innerHTML = R.spriteCara(a.ojo, a.boca, false, "rebote");
      Sonido.sonar("tocar");
      recordar();
    });
  }
  texto.addEventListener("input", recordar);
  const foto = document.getElementById("btn-foto-hoy");
  if (foto) {
    foto.addEventListener("click", () => {
      recordar();
      conTransicion(() =>
        abrirLenteEnPantalla({
          modo: "foto",
          alGuardar: () => {
            diario.anotarFoto();
            guardarTodo();
            conTransicion(abrirEscribir);
          },
          alSalir: () => conTransicion(abrirEscribir),
        }),
      );
    });
  }
  document.getElementById("btn-cancelar-hoy").addEventListener("click", () => {
    recordar();
    conTransicion(irACasa);
  });
  document.getElementById("btn-guardar-hoy").addEventListener("click", () => {
    if (!animo && !texto.value.trim()) {
      // sin nada no se guarda: el personaje le pide el animo
      const fila = screenEl.querySelector(".fila-animos");
      fila.classList.remove("sacude");
      void fila.offsetWidth;
      fila.classList.add("sacude");
      Sonido.sonar("no");
      return;
    }
    diario.escribirHoy({ animo, texto: texto.value.trim(), pregunta: preguntaDelDia() });
    borradorHoy = null;
    eventoAmigos(estadoParaAmigos());
    if (mascota) mascota._marcarInteraccion?.(Date.now());
    guardarTodo();
    Sonido.sonar("guardado");
    const racha = diario.racha();
    const frases = {
      genial: "Best kind of day!",
      bien: "A good one.",
      normal: "Okay days count too.",
      cansada: "Rest well tonight.",
      triste: "Sending you a big hug. I'm here.",
    };
    const sub = `${frases[animo] || "Saved."}${racha > 1 ? ` ${racha} days in a row.` : ""}`;
    controller.vista = "feedback";
    conTransicion(() => R.renderFeedback(screenEl, "Page saved ♥", { especial: animo === "triste" ? "enamorado" : "euforico", sub }));
    setTimeout(() => conTransicion(irACasa), DURACION_FEEDBACK_MS + 900);
  });
}

function wireBackup() {
  document.getElementById("btn-exportar-backup").addEventListener("click", () => {
    guardarTodo();
    storage.exportarBackup();
  });
  const inputArchivo = document.getElementById("input-importar-backup");
  inputArchivo.addEventListener("change", async () => {
    const archivo = inputArchivo.files[0];
    if (!archivo) return;
    const mensajeEl = document.getElementById("mensaje-backup");
    try {
      await storage.importarBackup(archivo);
      const guardado = storage.cargar();
      if (!guardado) throw new Error("empty backup");
      ({ mascota, npcs: npcsReg, lugares: lugaresReg, diario, cartasEntregadas } = guardado);
      Final.restaurarDesdeGuardado(guardado.extras && guardado.extras.final, { forzar: true });
      Personaje.restaurar(guardado.extras && guardado.extras.personaje);
      cargarAmigos(guardado.extras && guardado.extras.amigos);
      if (pieza) pieza.destruir();
      pieza = null;
      mascota.actualizarTiempo(Date.now());
      mensajeEl.textContent = "Backup restored. Welcome back, Baozi!";
      mensajeEl.className = "mensaje-backup ok";
    } catch (e) {
      mensajeEl.textContent = "Couldn't read that file: " + e.message;
      mensajeEl.className = "mensaje-backup error";
    }
  });
}

// ------------------------------------------------------------------
// Caminar + GPS + Where to? + encuentros
// ------------------------------------------------------------------

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
    conTransicion(() => {
      controller.vista = "lugarcerca";
      renderVistaActual();
    });
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
    bloqueoPantalla.addEventListener("release", () => {
      bloqueoPantalla = null;
    });
  } catch (e) {
    bloqueoPantalla = null;
  }
}

function soltarWakeLock() {
  if (!bloqueoPantalla) return;
  bloqueoPantalla.release().catch(() => {});
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
  detectorPasosGPS = new Sensores.DetectorPasos();
  detenerMotionCaminar = Sensores.iniciarEscuchaMotion((x, y, z, ahoraSeg) => {
    if (controller.vista !== "caminar") return;
    if (detectorPasosGPS.procesarLectura(x, y, z, ahoraSeg)) registrarPasoDetectado();
  });
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
    boton.addEventListener("click", () => {
      const idLugar = boton.dataset.lugar;
      if (idLugar === "__not_now") {
        conTransicion(() => {
          controller.vista = "caminar";
          renderVistaActual();
        });
        return;
      }
      descubrirLugar(idLugar);
      conTransicion(() => {
        controller.vista = "descubrimiento";
        renderVistaActual();
      });
    });
  }
}

function wireLugarCerca() {
  for (const boton of screenEl.querySelectorAll("[data-eleccion-lugar]")) {
    boton.addEventListener("click", () => {
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
    });
  }
}

function volverADescubrimiento() {
  conTransicion(() => {
    prepararVista("descubrimiento");
    renderVistaActual();
  });
}

function wireDescubrimiento() {
  const btnFoto = document.getElementById("btn-tomar-foto-descubrimiento");
  if (btnFoto) {
    btnFoto.addEventListener("click", () => {
      Musica.detener(0.3);
      conTransicion(() =>
        abrirLenteEnPantalla({
          modo: "foto",
          lugar: lugarDescubierto ? lugarDescubierto.id : null,
          titulo: lugarDescubierto ? lugarDescubierto.nombre.toUpperCase() : `${Personaje.nombre().toUpperCase()} LENS`,
          alGuardar: () => {
            fotoDelDescubrimiento = true;
            if (mascota) diario.anotarFoto();
            guardarTodo();
            volverADescubrimiento();
          },
          alSalir: volverADescubrimiento,
        }),
      );
    });
  }
  document.getElementById("btn-continuar-descubrimiento").addEventListener("click", () => {
    if (mostrarCartaSiCorresponde({ lugarDescubierto: lugarDescubierto?.id })) return;
    Musica.detener();
    conTransicion(() => {
      controller.vista = "caminar";
      renderVistaActual();
    });
  });
}

function wireCaminar() {
  document.getElementById("btn-volver-caminar").addEventListener("click", () => {
    detenerSensoresCaminar();
    conTransicion(irACasa);
  });
  document.getElementById("btn-paso").addEventListener("click", () => registrarPasoDetectado());
  const btnManual = document.getElementById("btn-wheretogo-manual");
  if (btnManual) {
    btnManual.addEventListener("click", () => {
      conTransicion(() => {
        controller.vista = "wheretogo";
        renderVistaActual();
      });
    });
  }
  const btnMotion = document.getElementById("btn-habilitar-motion");
  if (btnMotion) btnMotion.addEventListener("click", habilitarMotion);
}

function animarPaso() {
  for (const id of ["pies-personaje", "mochi-caminando"]) {
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
    encuentro = { npc, paso: "anuncio", pendienteEnamorado: false };
    diario.anotarNpc(npc.id);
    vibrar(40);
    Sonido.sonar("encuentro");
    conTransicion(() => {
      controller.vista = "encuentro";
      renderVistaActual();
    });
    return;
  }

  if (seDisparoOrgulloso) {
    vibrar([30, 60, 30]);
    Sonido.sonar("hito");
    diario.anotarHito(`${mascota.pasosTotales.toLocaleString("en-US")} steps`);
    controller.vista = "feedback";
    conTransicion(() => R.renderFeedback(screenEl, `${mascota.pasosTotales.toLocaleString("en-US")} steps!`, { icono: "pie" }));
    setTimeout(() => {
      conTransicion(() => {
        controller.vista = "caminar";
        renderVistaActual();
      });
    }, DURACION_FEEDBACK_MS + 300);
    return;
  }

  if (mostrarCartaSiCorresponde({ pasosTotales: mascota.pasosTotales })) return;

  controller.vista = "caminar";
  actualizarContadorPasos();
  animarPaso();
}

function mostrarCartaSiCorresponde(contexto) {
  const carta = cartaPendiente(contexto, cartasEntregadas);
  if (!carta) return false;
  cartasEntregadas.push(carta.id);
  cartaActual = carta;
  diario.anotarCarta(carta.id);
  guardarTodo();
  Musica.tocar("carta");
  vibrar([20, 60, 20]);
  conTransicion(() => {
    controller.vista = "carta";
    renderVistaActual();
  });
  return true;
}

function renderEncuentro() {
  const { npc, paso } = encuentro;
  if (paso === "anuncio") {
    R.renderEncuentroAnuncio(screenEl, encuentro && encuentro.npc);
    document.getElementById("btn-continuar-encuentro").addEventListener("click", () => {
      conTransicion(() => {
        encuentro.paso = "eleccion";
        renderVistaActual();
      });
    });
  } else if (paso === "eleccion") {
    R.renderEncuentroEleccion(screenEl, npc);
    for (const boton of screenEl.querySelectorAll("[data-eleccion]")) {
      boton.addEventListener("click", () => manejarEleccionEncuentro(boton.dataset.eleccion));
    }
  } else if (paso === "dialogo") {
    const m = amigos.misionActual(npc.id);
    R.renderEncuentroDialogo(screenEl, npc, amigos.lineaPara(npc.id, npcsReg, progresoDe(m, contextoAmigos())) || npcsReg.lineaPara(npc));
    document.getElementById("btn-continuar-encuentro").addEventListener("click", () => seguirEncuentro());
  } else if (paso === "regalo") {
    const entregado = encuentro.entregado;
    R.renderEncuentroRegalo(screenEl, npc, entregado.mision.gracias, entregado.clave);
    Musica.tocar("descubrimiento");
    Sonido.sonar("hallazgo");
    vibrar([30, 40, 60]);
    document.getElementById("btn-continuar-encuentro").addEventListener("click", () => seguirEncuentro());
  } else if (paso === "secreto") {
    const secreto = encuentro.secreto;
    R.renderEncuentroSecreto(screenEl, npc, secreto.texto, LUGARES.find((l) => l.id === secreto.lugar));
    Sonido.sonar("descubrimiento");
    document.getElementById("btn-continuar-encuentro").addEventListener("click", () => seguirEncuentro());
  } else if (paso === "mision") {
    R.renderEncuentroMision(screenEl, npc, encuentro.mision);
    for (const b of screenEl.querySelectorAll("[data-mision]")) {
      b.addEventListener("click", () => {
        if (b.dataset.mision === "si") {
          amigos.aceptar(npc.id);
          Sonido.sonar("guardado");
          // si ya estaba hecha (por ejemplo, ya tenia los lugares), se cumple enseguida
          eventoAmigos(estadoParaAmigos(), { sinVisita: true });
          guardarTodo();
        } else Sonido.sonar("tocar");
        seguirEncuentro();
      });
    }
  } else if (paso === "despedida") {
    R.renderEncuentroDespedida(screenEl, npc);
    setTimeout(terminarEncuentro, DURACION_FEEDBACK_MS);
  }
}

/**
 * Despues del saludo, lo que el amigo tenga para ella, en orden: el regalo
 * de una mision cumplida, un secreto nuevo, una mision nueva. Y chau.
 */
function seguirEncuentro() {
  if (!encuentro) return;
  const npc = encuentro.npc;
  let siguiente = "despedida";
  if (amigos.estado(npc.id) === "lista") {
    encuentro.entregado = amigos.entregar(npc.id);
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
  conTransicion(() => {
    encuentro.paso = siguiente;
    renderVistaActual();
  });
}

function manejarEleccionEncuentro(eleccion) {
  const huboEnamorado = npcsReg.procesarEncuentro(mascota, encuentro.npc, eleccion, Date.now());
  encuentro.paso = eleccion === "saludar" ? "dialogo" : "despedida";
  if (eleccion !== "saludar") encuentro.desairado = true;
  if (huboEnamorado) encuentro.pendienteEnamorado = true;
  guardarTodo();
  conTransicion(renderVistaActual);
}

function terminarEncuentro() {
  if (!encuentro) return;
  const pendienteEnamorado = encuentro.pendienteEnamorado;
  const desairado = encuentro.desairado;
  encuentro = null;
  if (pendienteEnamorado && mostrarCartaSiCorresponde({ huboEnamorado: true })) return;
  conTransicion(() => {
    controller.irACara();
    if (pendienteEnamorado) {
      controller.vista = "feedback";
      Musica.tocar("enamorado");
      R.renderFeedback(screenEl, "In love! ♥", { especial: "enamorado" });
      setTimeout(() => conTransicion(irACasa), DURACION_FEEDBACK_MS + 900);
    } else {
      renderVistaActual();
      if (desairado) {
        mostrarEspecial("decepcionado", 3000);
        decir("Maybe next time…", 2800);
      }
    }
  });
}

// ------------------------------------------------------------------
// Minijuego
// ------------------------------------------------------------------

function iniciarMinijuego() {
  controller.vista = "minijuego";
  actualizarTabbar();
  actualizarMarco();
  screenEl.classList.add("sin-margen");
  const banner =
    permisoMotionEstado === "unknown" ? `<button class="banner-sensor" id="btn-habilitar-motion">Tap to shake your phone and catch</button>` : "";
  minijuego = iniciarJuego(screenEl, {
    arte,
    sprite: (ojo, boca) => R.spriteCara(ojo, boca),
    cambiarCara: (el, ojo, boca) => R.cambiarCara(el, ojo, boca),
    sonar: (n) => Sonido.sonar(n),
    vibrar,
    bannerMotion: banner,
    alTerminar: terminarMinijuego,
  });
  wireMinijuego();
  if (permisoMotionEstado === "granted") activarDeteccionSacudida();
}

function wireMinijuego() {
  const btnMotion = document.getElementById("btn-habilitar-motion");
  if (btnMotion) {
    btnMotion.addEventListener("click", async (e) => {
      e.stopPropagation();
      permisoMotionEstado = await Sensores.pedirPermisoMotion();
      btnMotion.remove();
      if (permisoMotionEstado === "granted" && minijuego) activarDeteccionSacudida();
    });
  }
}

function activarDeteccionSacudida() {
  if (detenerMotionMinijuego) return;
  detectorSacudida = new Sensores.DetectorSacudida();
  detenerMotionMinijuego = Sensores.iniciarEscuchaMotion((x, y, z, ahoraSeg) => {
    if (!minijuego) return;
    if (detectorSacudida.procesarLectura(x, y, z, ahoraSeg)) minijuego.atraparPrimera();
  });
}

function terminarMinijuego({ puntos = 0, atrapadas = 0, record = 0, nuevoRecord = false } = {}) {
  minijuego = null;
  if (detenerMotionMinijuego) {
    detenerMotionMinijuego();
    detenerMotionMinijuego = null;
  }
  detectorSacudida = null;
  mascota.resultadoMinijuego(atrapadas, Date.now());
  diario.anotarJuego(puntos);
  eventoAmigos({ tipo: "juego", puntos });
  guardarTodo();
  vibrar(puntos > 0 ? [20, 40, 20, 40, 20] : 20);
  Sonido.sonar(puntos > 0 ? "hito" : "mimo");
  controller.vista = "feedback";
  const titulo = nuevoRecord && puntos > 0 ? `New record: ${puntos}!` : puntos ? `${puntos} points!` : "So close!";
  const sub = nuevoRecord && puntos > 0 ? "Best snack catcher in Hangzhou." : `Caught ${atrapadas} · best ${record}`;
  conTransicion(() => R.renderFeedback(screenEl, titulo, { especial: puntos ? "euforico" : "decepcionado", sub }));
  setTimeout(() => conTransicion(irACasa), DURACION_FEEDBACK_MS + 1200);
}

// ------------------------------------------------------------------
// Vida en la pantalla de casa: parpadeo + expresiones especiales
// ------------------------------------------------------------------

function programarProximoParpadeo() {
  if (timeoutBlink) clearTimeout(timeoutBlink);
  const esperaMs = (3 + Math.random() * 5) * 1000;
  timeoutBlink = setTimeout(() => {
    const estado = mascota ? estadoCara(mascota) : null;
    const caraViva = estado && (estado.tipo === "base" || estado.tipo === "aburrido") && !Final.fotoPedida();
    if (controller.vista === "cara" && !especialActiva && caraViva) {
      const spriteEl = screenEl.querySelector(".sprite-cara");
      if (spriteEl) {
        parpadeando = true;
        spriteEl.classList.add("parpadeando");
        setTimeout(() => {
          parpadeando = false;
          spriteEl.classList.remove("parpadeando");
        }, 250);
      }
    }
    programarProximoParpadeo();
  }, esperaMs);
}

function revisarEspecialPorEstado(ahora) {
  if (especialActiva || controller.vista !== "cara" || ahora < proximoEspecialPermitidoMs) return;
  if (Final.fotoPedida()) return;
  const estado = estadoCara(mascota);
  if (estado.tipo !== "base") return;
  let candidata = especialPorEstado(mascota);
  // Despues del si, de vez en cuando a Baozi se le escapa la cara de enamorado.
  if (!candidata && Final.dijoQueSi() && Math.random() < 0.12) candidata = "enamorado";
  if (candidata && R.ESPECIALES_CON_ARTE.has(candidata)) {
    especialActiva = candidata;
    especialHastaMs = ahora + DURACION_ESPECIAL_MS;
    proximoEspecialPermitidoMs = ahora + COOLDOWN_ESPECIAL_ESTADO_MS;
    renderVistaActual();
  }
}

// ------------------------------------------------------------------
// Cielo segun la hora real del celular
// ------------------------------------------------------------------

function momentoDelDia(horaLocal) {
  if (horaLocal >= 6 && horaLocal < 9) return "amanecer";
  if (horaLocal >= 9 && horaLocal < 18) return "dia";
  if (horaLocal >= 18 && horaLocal < 21) return "atardecer";
  return "noche";
}

let momentoActual = null;

function actualizarFondoPorHora() {
  const momento = momentoDelDia(new Date().getHours());
  if (momento === momentoActual) return;
  momentoActual = momento;
  document.documentElement.dataset.momento = momento;
  document.documentElement.style.setProperty("--fondo", `var(--fondo-${momento})`);
}

// ------------------------------------------------------------------
// Tick periodico
// ------------------------------------------------------------------

let proximoDecaimientoRasgosMs = Date.now() + 86400000;

function tick() {
  if (!mascota) return;
  const ahora = Date.now();

  mascota.actualizarTiempo(ahora);
  actualizarFondoPorHora();
  if (!document.hidden) marcarVista();

  // (en el cuarto "#reloj" es el boton invisible del reloj de pared: no se le escribe la hora)
  const relojEl = document.getElementById("reloj");
  if (relojEl && !relojEl.classList.contains("toque-objeto")) relojEl.textContent = R.reloj();

  Final.revisarArmadoPorFecha(ahora);
  if (Final.tocaPedirSinGPS(ahora)) pedidoPendiente = true;
  vigilarLugarFinal();
  intentarPedido();

  const cambioSuenio = mascota.revisarSuenioAutomatico(ahora);
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

  if (ahora >= proximoDecaimientoRasgosMs) {
    mascota.decaerRecienteDiario();
    proximoDecaimientoRasgosMs = ahora + 86400000;
  }

  if (visita && ahora > visita.hastaMs) {
    visita = null;
    if (controller.vista === "cara" && puedeComentar()) {
      mostrarEspecial("decepcionado", 3500);
      decir("Aw… they left.", 3000);
    }
  }
  talVezVisita();
  talVezPedirDiario();
  revisarLugares();
  revisarClima();
  sonidoDelClima();

  if (controller.vista === "cara" && !especialActiva) renderVistaActual();

  if (guardadoAuto.deberiaGuardar(ahora)) {
    guardarTodo();
    guardadoAuto.marcarGuardado(ahora);
  }
}

setInterval(tick, 5000);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && mascota) {
    tick();
    setTimeout(() => revisarLugares(true), 1500);
    if (controller.vista === "caminar") tomarWakeLock();
  } else if (document.visibilityState === "hidden" && mascota) {
    dejarDeVigilar();
    guardarTodo();
  }
});

window.addEventListener("beforeunload", () => {
  if (mascota) guardarTodo();
});

// ------------------------------------------------------------------
// Tabbar
// ------------------------------------------------------------------

for (const boton of tabbarEl.querySelectorAll("button[data-cat]")) {
  boton.addEventListener("click", () => abrirCategoriaDesdeTab(boton.dataset.cat));
}

// Para tests (Playwright) y depuracion: nada de esto se usa en el juego.
window.__mochi = {
  get vista() {
    return controller.vista;
  },
  final: Final,
  config: FINAL,
  lente: () => lenteAbierto,
  conNombre,
  fechaLegible,
  claveDelDia,
  // simular lo que en la vida real trae el GPS o el azar
  sellar: (id) => {
    const l = LUGARES.find((x) => x.id === id);
    if (l) abrirSello(l);
  },
  visita: (id) => {
    const npc = NPCS.find((n) => n.id === id);
    if (!npc) return;
    anunciarVisita(npc);
    if (controller.vista === "cara") renderVistaActual();
  },
  mascota: () => mascota,
  amigos: () => amigos,
  // simular algo que cumple una mision (como lo haria el juego)
  eventoAmigos: (ev) => eventoAmigos(ev),
  npcs: () => npcsReg,
  especial: () => especialActiva,
  terminarJuego: () => minijuego && minijuego.terminar(),
  personaje: (quien) => {
    Personaje.elegir(quien);
    guardarTodo();
    if (pieza) pieza.destruir();
    pieza = null;
    renderVistaActual();
  },
  guardar: () => guardarTodo(),
  clima: (t) => {
    Clima.forzar(t);
    if (t && Clima.esMalo(t)) {
      sorpresa(3500);
      decir(Clima.FRASES[t] || "Look outside!", 4000);
    }
    sonidoDelClima();
    if (controller.vista === "cara") renderVistaActual();
  },
};

arrancar();
