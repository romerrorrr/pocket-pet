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
import { cartaPendiente, cartaAtrasada } from "./cartas.js";
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
import { iniciarRitmo } from "./ritmo.js";
import { iniciarTejo, leerRecordTejo } from "./tejo.js"; // v40: el tejo reemplaza a Boat Ride
import * as Galeria from "./galeria.js";
import * as Grabacion from "./grabacion.js";
import * as Donde from "./dondeEstuvimos.js";
import * as MapaDia from "./mapaDia.js";
import * as Corcho from "./corchoReal.js";
import { crearVisor } from "./visorMapa.js";
import * as Fechas from "./fechas.js";

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

// Vistas que llegan hasta el borde de la pantalla del aparato.
const VISTAS_SIN_MARGEN = new Set(["intro", "escribir", "pasos", "deseo", "juegos", "pesca", "mudanza", "elegir", "huevo", "nombre", "feedback", "cara", "descubrimiento", "lugarcerca", "encuentro", "carta", "final", "lente", "caminar", "heladera", "mapa", "sello", "postal", "consulta", "mapadia", "torre", "ritmo", "tejo", "fechas"]);
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
  return storage.guardar(mascota, npcsReg, lugaresReg, diario, cartasEntregadas, { final: Final.estadoParaGuardar(), personaje: Personaje.actual(), amigos: amigos.aObjeto(), tienda: tienda.aObjeto(), deseos: deseos.aObjeto(), pesca: pescaReg, mudanza, lugaresPropios: lugaresDeElla, fechasPropias: fechasDeElla });
}

// v35: actualizaciones seguras (ver el comentario de arriba de sw.js).
//  - Un deploy nuevo se baja en segundo plano y ESPERA: nunca cambia el
//    codigo con el juego abierto. Se aplica en el proximo arranque en frio.
//  - Instalada, iOS puede tener la app "abierta" (suspendida) por dias:
//    si vuelve a primer plano tras >= 30 min guardada, esta en la cara de
//    Baozi y el final no esta en juego, se aplica ahi: guarda, activa el
//    sw nuevo y recarga (para ella es como abrirla de nuevo).
//  - Buscar deploys nuevos (reg.update) como mucho cada 6 h: el navegador
//    igual se fija solo en cada arranque.
const SW_BUSCAR_CADA_MS = 6 * 60 * 60 * 1000;
const SW_APLICAR_TRAS_MS = 30 * 60 * 1000;

function momentoTranquiloParaActualizar() {
  return !!mascota && controller.vista === "cara" && !lenteAbierto && !finalOcupado() && !Final.secuenciaEnCurso();
}

function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (!location.protocol.startsWith("http")) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js", { updateViaCache: "none" })
      .then((reg) => {
        if (!reg) return; // (sin service worker: navegadores raros o pruebas)
        let ultimaBusqueda = Date.now(); // register() recien se fijo
        let guardadaDesde = 0;
        let pedimosActivar = false;
        const recargar = () => {
          if (pedimosActivar === "recargando") return;
          pedimosActivar = "recargando";
          location.reload();
        };
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (pedimosActivar) recargar();
        });
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "hidden") {
            guardadaDesde = Date.now();
            return;
          }
          const largaPausa = guardadaDesde && Date.now() - guardadaDesde >= SW_APLICAR_TRAS_MS;
          guardadaDesde = 0;
          if (reg.waiting && largaPausa && !pedimosActivar && momentoTranquiloParaActualizar()) {
            pedimosActivar = true;
            guardarTodo();
            reg.waiting.postMessage({ tipo: "activar" });
            setTimeout(recargar, 4000); // por si controllerchange no llega
            return;
          }
          if (Date.now() - ultimaBusqueda >= SW_BUSCAR_CADA_MS) {
            ultimaBusqueda = Date.now();
            reg.update().catch(() => {});
          }
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
let tienda = new Tienda(); // v23: las monedas y lo comprado (tienda.js)
let deseos = Deseos.desdeObjeto(null, DESEOS_PROPIOS); // v24: el deseo del dia (deseos.js)
// v24: despues del si, el personaje de rom se muda: "no" -> "llega" (golpea la puerta) -> "vive"
let mudanza = { estado: "no", desde: 0 };
function cargarMudanza(datos) {
  mudanza = { estado: "no", desde: 0 };
  if (datos && ["no", "llega", "vive"].includes(datos.estado)) mudanza = { estado: datos.estado, desde: Number.isFinite(datos.desde) ? datos.desde : 0 };
}
// v24: la pesca: el libro de peces (cuantos de cada uno) y los que nadan en la pecera
let pescaReg = { libro: {}, pecera: [] };
const PECES_DE_PECERA = new Set(["dorado", "koi", "koi_dorado"]);
function cargarPesca(datos) {
  pescaReg = { libro: {}, pecera: [] };
  if (!datos || typeof datos !== "object") return;
  for (const [id, n] of Object.entries(datos.libro || {})) if (pezPorId(id) && Number.isFinite(n) && n > 0) pescaReg.libro[id] = Math.floor(n);
  pescaReg.pecera = (datos.pecera || []).filter((id) => PECES_DE_PECERA.has(id)).slice(-4);
}
registrarAccesoriosExtra(() => tienda.accesorios());
// v30: los lugares de ustedes que ella agrega desde el mapa del corcho (mundo.js los suma a LUGARES)
let lugaresDeElla = [];
function cargarLugaresDeElla(datos) {
  lugaresDeElla = (Array.isArray(datos) ? datos : []).map(lugarDeEllaValido).filter(Boolean).slice(0, MAX_LUGARES_DE_ELLA);
  ponerLugaresDeElla(lugaresDeElla);
}
// v33: las fechas que ella agrega desde el calendario del cuarto (fechas.js)
let fechasDeElla = [];
function cargarFechasDeElla(datos) {
  fechasDeElla = (Array.isArray(datos) ? datos : []).map(Fechas.fechaValida).filter(Boolean).slice(0, Fechas.MAX_FECHAS);
}
const todasLasFechas = () => [...Fechas.fechasDeConfig(FECHAS), ...fechasDeElla];
const bodaEsHoy = () => Fechas.bodaEsHoy(fechasDeElla); // v35: la carta de la boda, solo ese dia
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

let pieza = null;            // el cuarto (pieza.js), vivo mientras la vista es "cara"
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
let volanteJuego = null;
let detenerMotionMinijuego = null;
let lugarCercaDetectado = null;
let lugarDescubierto = null;
let fotoDelDescubrimiento = false;

// ------------------------------------------------------------------
// Arranque
// ------------------------------------------------------------------

/** La proxima de las fechas de ustedes (las de config y las de ella), con los dias que faltan. */
function proximaFecha(ahora = new Date()) {
  return Fechas.proxima(todasLasFechas(), ahora);
}

// De noche, si todavia no escribio la pagina de hoy, el personaje se lo pide (una vez por dia).
const CLAVE_PEDIDO_DIARIO = "baozi_pedido_diario";
function esHoraDeEscribir(h = new Date().getHours()) {
  return h >= 19 || h < 3;
}
// ------------------------------------------------------------------
// v22: los pasos del dia. La app no puede leer la app Salud ni contar con
// la app cerrada, asi que Baozi pregunta: una vez por dia, desde las 18 h
// (y a la manana siguiente, si ayer no se anoto).
// ------------------------------------------------------------------

const HORA_PASOS = 18;
const CLAVE_PASOS_LUEGO = "baozi_pasos_luego";
const MAX_PASOS_DIA = 80000;
let preguntaPasos = null; // { clave, cuando, volverA }

function diaParaPreguntarPasos(ahora = new Date()) {
  if (!diario) return null;
  const hoy = claveDelDia(ahora);
  if (ahora.getHours() >= HORA_PASOS) return diario.pasosAnotados(hoy) ? null : { clave: hoy, cuando: "today" };
  const ayer = claveDelDia(new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 1));
  return diario.entradaDe(ayer) && !diario.pasosAnotados(ayer) ? { clave: ayer, cuando: "yesterday" } : null;
}

function talVezPreguntarPasos() {
  if (!mascota || !diario || controller.vista !== "cara" || visita || !puedeComentar()) return false;
  if (["armado", "pedido", "en_curso"].includes(Final.fase())) return false;
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

function abrirPreguntaPasos(dia, { volverA = "cara" } = {}) {
  // el dia queda en el diario: si hoy dice "Not now", manana pregunta por "ayer"
  if (dia.cuando === "today") diario.hoy();
  preguntaPasos = { ...dia, volverA };
  Sonido.sonar("tocar");
  conTransicion(() => {
    controller.vista = "pasos";
    renderVistaActual();
  });
}

function wirePreguntaPasos() {
  const p = preguntaPasos;
  const input = document.getElementById("input-pasos");
  const nota = document.getElementById("pasos-nota");
  const salir = () => {
    preguntaPasos = null;
    if (p.volverA === "caminar") {
      conTransicion(volverACaminar);
    } else conTransicion(irACasa);
  };
  input.addEventListener("input", () => {
    const limpio = input.value.replace(/[^0-9]/g, "").slice(0, 6);
    if (limpio !== input.value) input.value = limpio;
  });
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") document.getElementById("btn-pasos-guardar").click();
  });
  document.getElementById("btn-pasos-luego").addEventListener("click", () => {
    try {
      localStorage.setItem(CLAVE_PASOS_LUEGO, JSON.stringify({ clave: p.clave, hasta: Date.now() + 3 * 3600000 }));
    } catch (e) {
      /* nada */
    }
    salir();
  });
  document.getElementById("btn-pasos-guardar").addEventListener("click", () => {
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
  });
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
  if (nuevos > 0) hito = mascota.registrarPasos(nuevos, Date.now(), { anotados: true });
  if (hito) diario.anotarHito(`${mascota.pasosTotales.toLocaleString("en-US")} steps`);
  // las misiones de "X pasos en un dia" miran el dia que se anoto
  const e = diario.entradaDe(p.clave);
  const delDia = e ? e.pasos : n;
  eventoAmigos({ ...estadoParaAmigos(), pasosHoy: Math.max(diario.hoy().pasos, delDia) }, { sinVisita: true });
  const monedas = tienda.ganarPorPasos(p.clave, delDia);
  eventoDeseo({ tipo: "pasos", pasos: delDia, hoy: p.clave === claveDelDia() });
  guardarTodo();
  if (monedas) setTimeout(() => mostrarMonedas(monedas), 500);
  preguntaPasos = null;
  vibrar([20, 40, 20]);
  Sonido.sonar(nuevos > 0 ? "hito" : "tocar");
  const titulo = `${Math.max(n, delDia).toLocaleString("en-US")} steps!`;
  const sub = n >= 8000 ? "We walked so much together!" : n >= 3000 ? "Thank you for walking with me ♥" : "Every step counts ♥";
  controller.vista = "feedback";
  conTransicion(() => R.renderFeedback(screenEl, titulo, { icono: "pie", sub }));
  setTimeout(() => {
    if (controller.vista !== "feedback") return;
    if (mostrarCartaSiCorresponde({ pasosTotales: mascota.pasosTotales })) return;
    if (p.volverA === "caminar") {
      conTransicion(volverACaminar);
    } else conTransicion(irACasa);
  }, DURACION_FEEDBACK_MS + 300);
}

function talVezPedirDiario() {
  if (!mascota || !diario || controller.vista !== "cara" || mascota.dormida || !puedeComentar()) return;
  if (!esHoraDeEscribir() || diario.hoyEscrito()) return;
  const clave = claveDelDiaLogico(); // v35: pasada la medianoche sigue siendo la noche de "hoy"
  try {
    if (localStorage.getItem(CLAVE_PEDIDO_DIARIO) === clave) return;
    localStorage.setItem(CLAVE_PEDIDO_DIARIO, clave);
  } catch (e) {
    return;
  }
  decir(`How was your day, ${mascota.nombre}? Tell me in the notebook ♥`, 6000);
}

// v35: una vez por semana, si hace mas de 7 dias que no guarda un backup
// (o nunca, despues de la primera semana), Baozi se lo recuerda. Despacito:
// solo de dia, en el cuarto, sin nada mas pasando.
const CLAVE_AVISO_BACKUP = "baozi_aviso_backup";
const SEMANA_MS = 7 * 86400000;
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
  decir("Psst… let's save a backup of me? Notebook → Settings → Save backup ♥", 7000);
  return true;
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
  Corcho.precargar();
  MapaDia.precargarMapas().then(() => {
    if (controller.vista === "consulta" && controller.consultaActual === "diary") renderVistaActual();
  });
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
    abrirPin: (opts) => conTransicion(() => abrirPin(opts)), // v35: la salida escondida del final
    guardarTodo,
    estadoPieza,
  });

  const guardado = storage.cargar();
  guardadoAuto = new storage.GuardadoAutomatico();
  if (guardado) {
    ({ mascota, npcs: npcsReg, lugares: lugaresReg, diario, cartasEntregadas } = guardado);
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
    // (la primera vez despues de actualizar no hay "ultima vista": vale la del guardado)
    const vista = ultimaVista() || Number(guardado.guardadoEn) || Date.now();
    const horasSinVerla = (Date.now() - Math.max(mascota.ultimaInteraccion || 0, vista)) / 3600000;
    // v35: la noche con la app cerrada se pasa durmiendo (petState.js, por tramos)
    mascota.actualizarTiempo(Date.now(), { suenioAuto: !["pedido", "en_curso"].includes(Final.fase()) });
    mascota.revisarSuenioAutomatico(Date.now());
    mascota.decaerRasgosPorDias(Date.now());
    cuidarParaElFinal();
    programarProximoParpadeo();
    if (Final.hayQueRetomar()) {
      // La app se cerro en medio del final: se vuelve al mismo paso, pero
      // DESPUES de leer las fotos (si no, el montaje quedaria vacio).
      // v35: primero "Tap to continue ♥" (en ese toque: pantalla, audio y microfono)
      Promise.race([fotosListas, new Promise((r) => setTimeout(r, 2500))]).then(() => Final.pantallaRetomar());
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
  // v35: "Restore from backup" en la primera pantalla (el mismo camino que Settings)
  const input = document.getElementById("input-restaurar-inicio");
  const mensajeEl = document.getElementById("mensaje-restaurar-inicio");
  if (input && mensajeEl) {
    input.addEventListener("change", () => {
      const archivo = input.files[0];
      input.value = "";
      if (!archivo) return;
      restaurarDesdeArchivo(archivo, (texto, clase = "") => {
        mensajeEl.textContent = texto;
        mensajeEl.className = `mensaje-backup ${clase}`;
      });
    });
  }
  for (const b of screenEl.querySelectorAll("[data-personaje]")) {
    b.addEventListener("click", () => {
      Personaje.elegir(b.dataset.personaje);
      Sonido.sonar("tocar");
      b.classList.add("elegida");
      setTimeout(() => {
        conTransicion(() => abrirTutorial(() => {
          controller.vista = "huevo";
          renderVistaActual();
        }));
      }, 350);
    });
  }
}

/** v21: las instrucciones cortas (despues de elegir, o desde Settings). al final: que sigue. */
function abrirTutorial(alTerminar) {
  let i = 0;
  const mostrar = () => {
    controller.vista = "tutorial";
    screenEl.classList.add("sin-margen");
    R.renderTutorial(screenEl, i);
    const saltar = document.getElementById("tutorial-saltar");
    if (saltar) saltar.addEventListener("click", () => conTransicion(alTerminar));
    document.getElementById("tutorial-seguir").addEventListener("click", () => {
      Sonido.sonar("tocar");
      if (i >= R.TUTORIAL.length - 1) conTransicion(alTerminar);
      else {
        i += 1;
        mostrar();
      }
    });
  };
  mostrar();
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
  tienda = new Tienda();
  aplicarCuarto();
  deseos = Deseos.desdeObjeto(null, DESEOS_PROPIOS);
  cargarPesca(null);
  cargarMudanza(null);
  cargarAmigos(null);
  cargarLugaresDeElla(null);
  cargarFechasDeElla(null);
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
  // v35: volver al cuarto es salir del paseo: si se llego desde Walk por un
  // encuentro, un lugar cerca o una carta, el GPS, el acelerometro y la
  // pantalla encendida quedaban prendidos (bateria). Apagar dos veces no hace nada.
  detenerSensoresCaminar();
  controller.irACara();
  renderVistaActual();
  // v24: si un deseo se cumplio afuera del cuarto, se festeja al volver
  if (deseos.celebrar) setTimeout(celebrarDeseo, 700);
}

/**
 * v22: la radio del cuarto. Suena la estacion elegida mientras ella esta en
 * el cuarto; se va al salir. Si suena otra musica (una carta, un sello), la
 * radio espera a que termine y vuelve sola.
 */
function musicaDeFondo() {
  const est = Musica.estacionActual();
  // mientras duerme, la radio se apaga (y vuelve sola cuando se despierta)
  const enCasa = controller.vista === "cara" && !finalOcupado() && Sonido.sonidoHabilitado() && !(mascota && mascota.dormida);
  const sonando = Musica.escenaSonando();
  const esRadio = Musica.esEstacion(sonando);
  if (enCasa && est && (!sonando || (esRadio && sonando !== est.id))) Musica.tocar(est.id);
  else if (esRadio && (!enCasa || !est)) Musica.detener(0.8);
}

function renderVistaActual() {
  musicaDeFondo();
  sonidoDelClima(); // la lluvia se corta al salir del cuarto (antes seguia hasta el proximo tick)
  actualizarTabbar();
  actualizarMarco();
  screenEl.classList.toggle("sin-margen", VISTAS_SIN_MARGEN.has(controller.vista));

  switch (controller.vista) {
    case "escribir":
      abrirEscribir();
      break;
    case "elegir":
      R.renderElegir(screenEl, { cargaFallida: storage.estadoDeCarga().fallida });
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
      R.renderHeladera(
        screenEl,
        Object.keys(tienda.comida)
          .map((id) => productoTienda(id))
          .filter(Boolean)
          .map((c) => ({ id: c.id, arte: c.arte, nombre: c.nombre, n: tienda.cantidadComida(c.id) })),
      );
      wireHeladera();
      break;
    case "mapa":
      renderMapaActual();
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
    case "mudanza":
      R.renderMudanza(screenEl, { quien: companeroId(), texto: MUDANZA.llegada });
      wireMudanza();
      break;
    case "juegos":
      R.renderJuegos(screenEl, {
        recordSnack: leerRecord(),
        recordPesca: leerRecordPesca(),
        recordTorre: leerRecordTorre(),
        recordTejo: leerRecordTejo(),
        cancionesRitmo: Musica.estacionesParaJugar().length,
        libro: PECES.map((p) => ({ id: p.id, nombre: p.nombre, n: pescaReg.libro[p.id] || 0 })),
      });
      document.getElementById("btn-juego-snack").addEventListener("click", () => conTransicion(iniciarMinijuego));
      document.getElementById("btn-juego-pesca").addEventListener("click", () => conTransicion(iniciarPescaJuego));
      document.getElementById("btn-juego-torre").addEventListener("click", () => conTransicion(() => iniciarJuegoTele("torre")));
      document.getElementById("btn-juego-ritmo").addEventListener("click", () => conTransicion(() => iniciarJuegoTele("ritmo")));
      document.getElementById("btn-juego-tejo").addEventListener("click", () => conTransicion(() => iniciarJuegoTele("tejo")));
      document.getElementById("btn-volver-juegos").addEventListener("click", () => conTransicion(irACasa));
      break;
    case "deseo": {
      const d = deseos.actual();
      if (!d) {
        controller.vista = "cara";
        renderVistaActual();
        break;
      }
      R.renderDeseo(screenEl, { texto: d.texto, real: !!d.real, estado: deseos.estado, progreso: deseos.progreso, meta: d.meta || 0 });
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
        contados: (diario.entradaDe(preguntaPasos.clave) || { pasos: 0 }).pasos,
        anotados: (diario.entradaDe(preguntaPasos.clave) || {}).pasosAnotados ?? null,
      });
      wirePreguntaPasos();
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
    case "pesca":
    case "torre":
    case "ritmo":
    case "tejo":
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
    sonido: Sonido.sonidoHabilitado() && !!Musica.estacionActual(),
    ojos,
    boca,
    parpadea: !dormido && !especialActiva && !fotoPedida && (estado.tipo === "base" || estado.tipo === "aburrido"),
    // se queda sentado en su zabuton (no pasea) si esta enfermo o si Baozi pidio la foto del lago
    quieto: fotoPedida || mascota.enferma || finalOcupado(),
    recuerdos: [...lugaresReg.desbloqueados],
    pines: LUGARES.filter((l) => lugaresReg.desbloqueados.has(l.id) && dentroDelDibujo(l.lat, l.lon)).map((l) => ({ lat: l.lat, lon: l.lon, color: l.color })),
    dia: new Date().getDate(),
    anillo: Final.dijoQueSi(),
    cuarto: tienda.cuarto || "depto", // v25
    mascota: tienda.mascota || null, // v25
    avisos: fotoPedida
      ? []
      : [
          ...new Set([
            ...(dormido ? [] : R.necesidades(mascota).map((n) => n.objeto).filter(Boolean)),
            // la pagina de hoy sin escribir: un "!" sobre el cuaderno de la mesita
            ...(esHoraDeEscribir() && diario && !diario.hoyEscrito() ? ["mesita"] : []),
            // un amigo trae un regalo: "!" sobre la ventana
            ...(visita && visita.regalo ? ["ventana"] : []),
            // v23: cosas nuevas en la tienda (en el cuaderno): "!" sobre la mesita
            ...(puedeComentar() && !["armado", "pedido", "en_curso"].includes(Final.fase()) && tienda.nuevas().length ? ["mesita"] : []),
          ]),
        ],
    npc: visita ? visita.npc.id : null,
    decoraciones: [...amigos.decoraciones(), ...tienda.decoraciones()],
    deseo: deseos.estado === "nuevo" && !fotoPedida && !finalEnMarcha() && !enCalma("deseo") ? "nuevo" : null,
    // v23: el peluche es del OTRO personaje; y despues del si, la foto del anillo enmarcada
    peluche: Personaje.IDS.find((q) => q !== Personaje.actual()) || "baozi",
    pecera: tienda.tiene("pecera") ? pescaReg.pecera : [],
    companero: mudanza.estado === "vive" ? { quien: companeroId(), valija: Date.now() - mudanza.desde < 3 * 86400000 } : null,
    globoCompanero,
    fotoAnillo: Final.dijoQueSi() ? fotoDelAnillo() : null,
    clima: Clima.tipo(),
    velitas: esNocheDeVelitas(), // v40
    globo: globo.texto,
    globoRosa: globo.rosa,
  };
}

/** La foto del anillo (la ultima foto del final), para el marco del cuarto. */
function fotoDelAnillo() {
  const finales = Camara.todasLasFotos().filter((f) => f.tipo === "final" && f.dataUrl);
  return finales.length ? finales[finales.length - 1].dataUrl : null;
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
    case "companero":
      tocarCompanero();
      break;
    case "mascota":
      // v25: la mascota de compania: un corazon (lo dibuja pieza.js) y un sonidito
      Sonido.sonar("mimo");
      vibrar(12);
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
    case "radio": {
      // v22: la perilla de la radio: cada toque, la estacion siguiente (y "Off")
      let est;
      if (!Sonido.sonidoHabilitado()) {
        Sonido.alternarSonido(); // con el sonido apagado, el primer toque solo la prende
        est = Musica.estacionActual() || Musica.siguienteEstacion();
      } else est = Musica.siguienteEstacion();
      Sonido.sonar("tocar");
      musicaDeFondo();
      // v35: dormido no suena (musicaDeFondo): que el globo no prometa musica
      if (est && mascota && mascota.dormida) decir(`♪ ${est.nombre}… I'll play it when I wake up.`, 3200);
      else decir(est ? `♪ ${est.nombre} (${Musica.numeroDeEstacion(est)})` : "Radio off. Shh…", 3200);
      if (est) eventoDeseo({ tipo: "radio", estacion: est.id });
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
    case "calendario":
      // v33: el calendario abre las fechas de ustedes (y se pueden agregar)
      Sonido.sonar("tocar");
      abrirFechas();
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
  // v24: el primer toque del dia cuenta el deseo; uno de la vida real pendiente se vuelve a mostrar (cada 10 min)
  if (!finalEnMarcha() && !enCalma("deseo") && deseos.actual()) {
    const d = deseos.actual();
    if (deseos.estado === "nuevo" || (d.real && deseos.estado === "escuchado" && ahora - ultimaTarjetaDeseo > 10 * 60000)) {
      abrirDeseo();
      return;
    }
  }
  eventoDeseo({ tipo: "mimo" });
  if (mudanza.estado === "vive" && Math.random() < 0.35) decirCompanero(MUDANZA.celoso || "Me too!", 2200);
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

// ------------------------------------------------------------------
// v23: las monedas (tienda.js). Se ganan con lo de todos los dias, con
// tope por dia, y sale una monedita "+N" cada vez.
// ------------------------------------------------------------------

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
  setTimeout(() => el.remove(), 2000);
}

/** Suma monedas de una fuente (con su tope del dia). Devuelve cuantas. */
function ganarMonedas(fuente, cantidad) {
  if (!mascota) return 0;
  const n = tienda.ganar(fuente, cantidad);
  if (n) {
    guardarTodo();
    mostrarMonedas(n);
  }
  return n;
}

// ------------------------------------------------------------------
// v24: el deseo del dia (deseos.js)
// ------------------------------------------------------------------

const finalEnMarcha = () => ["armado", "pedido", "en_curso"].includes(Final.fase());

// v36: los primeros minutos con la mascota nueva son tranquilos: primero
// conocerse (comer, jugar, tocar el cuarto); el deseo llega a los 2 min y
// las visitas desde los 3,5 min. Cuenta desde que nace (creadoEn), asi una mascota que ya existe
// (o un backup restaurado) no espera nada.
const CALMA_MS = { deseo: 2 * 60000, visita: 3.5 * 60000 };
const enCalma = (que) => !!mascota && Date.now() - (mascota.creadoEn || 0) < CALMA_MS[que];

function contextoDeseos(ahora = new Date()) {
  return {
    hora: ahora.getHours(),
    finDeSemana: ahora.getDay() === 0 || ahora.getDay() === 6,
    tieneRopa: amigos.accesorios().length + tienda.accesorios().length > 0,
    quedanLugares: !!lugaresReg && lugaresReg.pendientes().length > 0,
  };
}

/** Elige el deseo del dia (si cambio el dia). */
function elegirDeseo() {
  if (!mascota) return;
  if (deseos.elegir(claveDelDia(), contextoDeseos())) guardarTodo();
}

/** Algo paso en el juego: ¿se cumplio el deseo? (solo guarda si cambio algo) */
function eventoDeseo(ev) {
  if (!mascota || enCalma("deseo")) return; // v36: todavia no lo conto
  elegirDeseo();
  const antes = deseos.progreso;
  if (deseos.evento({ hora: new Date().getHours(), ...ev })) cumplirDeseo();
  else if (deseos.progreso !== antes) guardarTodo();
}

function cumplirDeseo() {
  tienda.ganar("deseo", 10);
  mascota.stats.felicidad = Math.min(100, mascota.stats.felicidad + 10);
  diario.anotarHito("A wish came true ♥");
  guardarTodo();
  if (controller.vista === "cara") celebrarDeseo();
}

/** El festejo, en el cuarto (si se cumplio en otro lado, cuando vuelve). */
function celebrarDeseo() {
  if (!deseos.celebrar || controller.vista !== "cara" || !mascota || mascota.dormida) return false;
  deseos.celebrar = false;
  guardarTodo();
  Sonido.sonar("hallazgo");
  vibrar([20, 40, 20]);
  mostrarEspecial("euforico", 3500);
  decir("My wish came true! Thank you ♥", 4200);
  setTimeout(() => mostrarMonedas(10), 400);
  return true;
}

let ultimaTarjetaDeseo = 0;
/** La tarjeta del deseo (el primer toque del dia a Baozi, o desde el cuaderno). */
function abrirDeseo(desde = "cara") {
  const d = deseos.actual();
  if (!d) return;
  deseos.escuchar();
  ultimaTarjetaDeseo = Date.now();
  guardarTodo();
  Sonido.sonar("carta");
  conTransicion(() => {
    controller.vista = "deseo";
    vistaDeseoDesde = desde;
    renderVistaActual();
  });
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
    hecho.addEventListener("click", () => {
      if (deseos.hecho()) {
        tienda.ganar("deseo", 10);
        mascota.stats.felicidad = Math.min(100, mascota.stats.felicidad + 10);
        diario.anotarHito("A wish came true ♥");
        guardarTodo();
      }
      volver(); // v35: abierto desde Stats, vuelve a Stats (como Back y Later)
    });
  }
}

// ------------------------------------------------------------------
// v33: las fechas de ustedes (el calendario del cuarto)
// ------------------------------------------------------------------

let formFecha = null; // { nombre, mes, dia, anio, tipo, aviso, error }
let borrarFecha = null; // la que pide el segundo toque para borrarse

function abrirFechas() {
  formFecha = null;
  borrarFecha = null;
  conTransicion(() => {
    prepararVista("fechas");
    renderVistaActual();
  });
}

/** "12 days until our anniversary." (o el dia del si, despues del si) */
function cabezaDeFechas() {
  const p = proximaFecha();
  const cuenta = p ? (p.dias === 0 ? `Today: ${p.nombre} ♥` : p.dias === 1 ? `Tomorrow: ${p.nombre}!` : `${p.dias} days until ${p.nombre}.`) : "";
  const si = Final.dijoQueSi() && Final.fechaDelSi();
  if (si) return `Engaged since ${fechaCorta(si)} ♥${cuenta ? ` ${cuenta}` : ""}`;
  return cuenta || `Today is ${fechaCorta(Date.now())}.`;
}

function renderFechasActual() {
  const ahora = new Date();
  const filas = Fechas.ordenadas(todasLasFechas(), ahora).map((f) => {
    const dias = Fechas.diasHasta(f, ahora);
    const veces = Fechas.vecesCumplidas(f, ahora);
    return {
      id: f.id,
      nombre: f.nombre,
      tipo: f.tipo,
      fija: !!f.fija,
      fecha: `${MESES_CORTOS[f.mes - 1]} ${f.dia}${f.anio != null ? `, ${f.anio}` : ""}${veces > 0 ? ` · ${veces} ${veces === 1 ? "year" : "years"}` : ""}`,
      falta: dias === 0 ? "Today! ♥" : dias === 1 ? "tomorrow" : `in ${dias} days`,
      hoy: dias === 0,
    };
  });
  const tipos = Fechas.TIPOS_FECHA.filter((t) => t !== "boda" || Final.dijoQueSi()).map((id) => ({ id, nombre: Fechas.NOMBRES_TIPO[id] }));
  R.renderFechas(screenEl, { cabeza: cabezaDeFechas(), filas, form: formFecha, tipos, borrar: borrarFecha, puedeAgregar: fechasDeElla.length < Fechas.MAX_FECHAS, enamorado: Final.dijoQueSi() });
  wireFechas();
}

function wireFechas() {
  const $ = (id) => document.getElementById(id);
  if (!formFecha) {
    $("btn-fechas-cerrar").addEventListener("click", () => conTransicion(irACasa));
    const agregar = $("btn-fecha-agregar");
    if (agregar) {
      agregar.addEventListener("click", () => {
        Sonido.sonar("tocar");
        const hoy = new Date();
        formFecha = { nombre: "", mes: hoy.getMonth() + 1, dia: hoy.getDate(), anio: null, tipo: "aniversario" };
        borrarFecha = null;
        renderFechasActual();
      });
    }
    for (const b of screenEl.querySelectorAll("[data-borrar-fecha]")) {
      b.addEventListener("click", () => {
        const id = b.dataset.borrarFecha;
        if (borrarFecha !== id) {
          // borrar no tiene vuelta atras: pide un segundo toque
          borrarFecha = id;
          Sonido.sonar("tocar");
          renderFechasActual();
          return;
        }
        fechasDeElla = fechasDeElla.filter((f) => f.id !== id);
        borrarFecha = null;
        guardarTodo();
        Sonido.sonar("tocar");
        renderFechasActual();
      });
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
  for (const id of ["fecha-nombre", "fecha-mes", "fecha-dia", "fecha-anio"]) $(id).addEventListener("change", leer);
  nombre.addEventListener("input", leer);
  for (const b of screenEl.querySelectorAll("[data-tipo-fecha]")) {
    b.addEventListener("click", () => {
      leer();
      f.tipo = b.dataset.tipoFecha;
      Sonido.sonar("tocar");
      renderFechasActual();
    });
  }
  $("btn-fecha-cancelar").addEventListener("click", () => {
    formFecha = null;
    Sonido.sonar("tocar");
    renderFechasActual();
  });
  $("btn-fecha-guardar").addEventListener("click", () => {
    leer();
    const aviso = (texto) => {
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
    const nueva = Fechas.fechaValida({ nombre: f.nombre, mes: f.mes, dia: f.dia, anio: f.anio, tipo: f.tipo, id: `fecha_${Date.now().toString(36)}` });
    if (!nueva) {
      aviso(`${R.NOMBRE_MES(f.mes)} doesn't have a ${f.dia}${f.anio ? ` in ${f.anio}` : ""}.`);
      return;
    }
    nombre.blur();
    fechasDeElla = [...fechasDeElla, nueva];
    formFecha = null;
    guardarTodo();
    Sonido.sonar("guardado");
    renderFechasActual();
  });
}

// ------------------------------------------------------------------
// v24: la mudanza (despues del si)
// ------------------------------------------------------------------

const companeroId = () => Personaje.IDS.find((q) => q !== Personaje.actual()) || "baozi";
let globoCompanero = "";
let timeoutGloboComp = null;
let ultimaFraseComp = -1;

function decirCompanero(texto, ms = 3600) {
  globoCompanero = texto;
  clearTimeout(timeoutGloboComp);
  timeoutGloboComp = setTimeout(() => {
    globoCompanero = "";
  }, ms);
}

/** La mañana siguiente al si (despues de medianoche), golpea la puerta. */
function talVezMudanza() {
  if (!mascota) return false;
  if (mudanza.estado === "no" && Final.dijoQueSi() && Final.fechaDelSi() && claveDelDia() > claveDelDia(new Date(Final.fechaDelSi()))) {
    mudanza.estado = "llega";
    guardarTodo();
  }
  if (mudanza.estado !== "llega" || controller.vista !== "cara" || visita || mascota.dormida || finalEnMarcha()) return false;
  Sonido.sonar("encuentro");
  vibrar([30, 80, 30]);
  conTransicion(() => {
    controller.vista = "mudanza";
    renderVistaActual();
  });
  return true;
}

function wireMudanza() {
  document.getElementById("btn-mudanza-si").addEventListener("click", () => {
    mudanza = { estado: "vive", desde: Date.now() };
    diario.anotarHito(`${Personaje.nombre(companeroId())} moved in ♥`);
    guardarTodo();
    Sonido.sonar("hallazgo");
    vibrar([20, 40, 20, 40, 20]);
    controller.vista = "feedback";
    conTransicion(() => R.renderFeedback(screenEl, MUDANZA.siSeQueda, { especial: "enamorado" }));
    setTimeout(() => conTransicion(irACasa), DURACION_FEEDBACK_MS + 1600);
  });
}

function tocarCompanero() {
  if (mudanza.estado !== "vive" || !mascota) return;
  if (mascota.dormida) {
    decirCompanero("Zzz…", 1800);
    return;
  }
  const frases = (MUDANZA.frases || []).filter((f) => typeof f === "string" && f.trim());
  if (!frases.length) return;
  let i = Math.floor(Math.random() * frases.length);
  if (frases.length > 1 && i === ultimaFraseComp) i = (i + 1) % frases.length;
  ultimaFraseComp = i;
  Sonido.sonar("mimo");
  vibrar(15);
  decirCompanero(frases[i], 4200);
}

/** v25: el cuarto puesto, para el dibujo del cuarto y las pantallas (CSS). */
function aplicarCuarto() {
  const id = ponerCuarto(tienda.cuarto);
  document.documentElement.dataset.cuarto = id;
}

/** Baozi avisa una vez por entrega que hay cosas nuevas en la tienda. */
function talVezAvisarTienda() {
  if (!mascota || controller.vista !== "cara" || visita || !puedeComentar()) return false;
  if (["armado", "pedido", "en_curso"].includes(Final.fase())) return false;
  const semana = tienda.semanaActual();
  if (semana <= tienda.avisoSemana || !tienda.nuevas().length) return false;
  tienda.avisoSemana = semana;
  guardarTodo();
  const nuevas = tienda.nuevas();
  const texto = semana === 0
    ? "I opened a little shop in the notebook! ♪"
    : nuevas.some((c) => c.tipo === "cuarto")
      ? "A whole new room at the shop! ♪"
      : nuevas.some((c) => c.tipo === "mascota")
        ? "There's a little friend waiting at the shop! ♪"
        : "New things at the shop! ♪";
  decir(texto, 5000);
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
  const lugar = LUGARES.find((l) => l.id === idLugar);
  ganarMonedas(lugar && lugar.deElla ? "propio" : "sello");
  eventoDeseo({ tipo: "sello" });
}

/** Una foto guardada: donde se saco (el lugar del sello, o el GPS) y a que hora. */
function fotoParaAmigos(foto) {
  ganarMonedas("foto");
  eventoDeseo({ tipo: "foto", filtro: foto.filtro, stickers: foto.stickers || [] });
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
        anotarDondeEstamos(pos);
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
  if (!mascota || mascota.dormida || visita || controller.vista !== "cara" || enCalma("visita")) return;
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
// v40: el Dia de las Velitas (Colombia): la noche del 7 de diciembre (hasta
// la madrugada del 8) el cuarto se llena de velitas. Baozi lo cuenta una vez por año.
let velitasForzadas = null; // para las pruebas
function esNocheDeVelitas(f = new Date()) {
  if (velitasForzadas !== null) return velitasForzadas;
  const m = f.getMonth();
  const d = f.getDate();
  const h = f.getHours();
  return m === 11 && ((d === 7 && h >= 17) || (d === 8 && h < 3));
}
function talVezContarVelitas() {
  if (!esNocheDeVelitas() || !mascota || mascota.dormida || controller.vista !== "cara" || visita || !puedeComentar()) return false;
  const clave = `baozi_velitas_${new Date().getFullYear()}`;
  try {
    if (localStorage.getItem(clave)) return false;
    localStorage.setItem(clave, "1");
  } catch (e) {
    return false;
  }
  if (diario) diario.anotarHito("Día de las Velitas ♥");
  guardarTodo();
  decir("It's the Day of the Little Candles! In Colombia we light them tonight ♥", 6000);
  return true;
}

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
  let nivel = controller.vista === "cara" && mascota && Clima.llueve(t) ? { llovizna: 0.3, lluvia: 0.7, tormenta: 1 }[t] : 0;
  // v35: en la cabaña la lluvia se ve como nieve: la nieve no suena (la ventisca, apenas, como viento)
  if (tienda && tienda.cuarto === "cabana") nivel = t === "tormenta" ? 0.25 : 0;
  Clima.sonidoLluvia(nivel);
}

// ------------------------------------------------------------------
// La heladera
// ------------------------------------------------------------------

function wireHeladera() {
  document.getElementById("btn-volver-heladera").addEventListener("click", () => conTransicion(irACasa));
  // v23: la comida especial de la tienda: como la de siempre, mas su efecto
  for (const b of screenEl.querySelectorAll("[data-comida-tienda]")) {
    b.addEventListener("click", () => {
      const c = productoTienda(b.dataset.comidaTienda);
      if (!c || !tienda.cantidadComida(c.id)) return;
      const ok = manejarTapItem(c.accion, { item: c.arte });
      if (!ok) return;
      tienda.usarComida(c.id);
      for (const [stat, v] of Object.entries(c.efecto || {})) {
        if (stat in mascota.stats) mascota.stats[stat] = Math.max(0, Math.min(100, mascota.stats[stat] + v));
      }
      guardarTodo();
    });
  }
  for (const b of screenEl.querySelectorAll("[data-comida]")) {
    b.addEventListener("click", () => {
      // v35: la mision del te solo cuenta si de verdad se lo tomo (dormida, no)
      const ok = manejarTapItem(b.dataset.comida, { item: b.dataset.item });
      if (ok && (b.dataset.item || "").endsWith("bebida_te.png")) eventoAmigos({ tipo: "comer", item: "te" });
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

/**
 * v21: desde que rom arma el final, la mascota esta bien (energia, animo,
 * hambre, sed, sana). En el pedido y la secuencia, ademas, despierta.
 */
function cuidarParaElFinal() {
  if (!mascota) return;
  const fase = Final.fase();
  if (!["armado", "pedido", "en_curso"].includes(fase)) return;
  mascota.prepararParaElFinal({ despierta: fase !== "armado" });
}

function finalOcupado() {
  return ["armado", "pedido", "en_curso"].includes(Final.fase());
}

/** v28: cada lectura de ubicacion puede dejar un punto en el mapa del dia. */
function anotarDondeEstamos(pos) {
  if (!pos || !pos.coords || !diario) return;
  if (!Donde.anotar(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy)) return;
  diario.hoy(); // que el dia tenga su pagina (y su polaroid)
  guardarTodo();
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
      anotarDondeEstamos(pos);
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
  formLugar = null;
  vistaMapa = null; // el mapa real abre centrado en el lugar elegido
  // v31: el mapa real del corcho (si falta o quedo chico, se arma en segundo plano)
  // (v35: solo se redibuja si de verdad se armo uno nuevo: redibujar igual cortaba el pellizco)
  Corcho.asegurar(LUGARES).then((nuevo) => {
    if (nuevo && controller.vista === "mapa" && !formLugar) renderMapaActual();
  });
  actualizarEstadoUbicacion().then(() => {
    conTransicion(() => {
      prepararVista("mapa");
      renderVistaActual();
    });
  });
}

// v31: el mapa real se mueve y se acerca con los dedos (visorMapa.js)
let visor = null;
let vistaMapa = null; // { s, cx, cy }: donde quedo, para redibujar sin moverlo

function montarVisor(real) {
  if (visor) visor.destruir();
  visor = null;
  const caja = document.getElementById("mapa-real");
  const img = document.getElementById("mapa-real-img");
  if (!caja || !img) return;
  const sellos = [...caja.querySelectorAll(".sello-mapa")];
  if (!vistaMapa) {
    // la primera vez: el lugar elegido en el centro, con unos 11 km a lo ancho
    const l = LUGARES.find((x) => x.id === mapaSeleccion);
    const p = l ? Corcho.posicion(l.lat, l.lon) : { x: real.enc.w / 2, y: real.enc.h / 2 };
    vistaMapa = { cx: p.x, cy: p.y, s: caja.clientWidth / Corcho.pxPorKm(11) };
  }
  visor = crearVisor(caja, {
    capa: img,
    w: real.enc.w,
    h: real.enc.h,
    vista: vistaMapa,
    alMover: ({ s, tx, ty }) => {
      for (const b of sellos) {
        b.style.left = `${tx + Number(b.dataset.mx) * s}px`;
        b.style.top = `${ty + Number(b.dataset.my) * s}px`;
      }
      if (visor) vistaMapa = visor.vista();
    },
  });
  vistaMapa = visor.vista();
  document.getElementById("btn-zoom-mas").addEventListener("click", () => visor.zoomEn(1.6));
  document.getElementById("btn-zoom-menos").addEventListener("click", () => visor.zoomEn(1 / 1.6));
}

function renderMapaActual() {
  const sellados = lugaresReg.desbloqueados;
  if (!mapaSeleccion || !LUGARES.some((l) => l.id === mapaSeleccion)) mapaSeleccion = (LUGARES.find((l) => sellados.has(l.id)) || LUGARES[0]).id;
  const real = Corcho.listo();
  R.renderMapa(screenEl, {
    lugares: LUGARES.filter((l) => amigos.lugarVisible(l.id, sellados)),
    sellados,
    fechas: lugaresReg.fechas,
    seleccionado: mapaSeleccion,
    ubicacion: estadoUbicacion,
    fotoDe: (id) => Camara.fotoDeLugar(id),
    posicion: posicionEnMapa,
    form: formLugar,
    puedeAgregar: lugaresDeElla.length < MAX_LUGARES_DE_ELLA,
    real: real ? { png: real.png, w: real.enc.w, h: real.enc.h, posicion: Corcho.posicion } : null,
    armando: Corcho.armando(),
  });
  if (real) montarVisor(real);
  else if (visor) {
    visor.destruir();
    visor = null;
  }
  document.getElementById("btn-volver-mapa").addEventListener("click", () => {
    formLugar = null;
    conTransicion(irACasa);
  });
  for (const b of screenEl.querySelectorAll("[data-lugar]")) {
    b.addEventListener("click", () => {
      Sonido.sonar("tocar");
      mapaSeleccion = siguienteEnLaPila(b.dataset.lugar, sellados);
      formLugar = null;
      renderMapaActual();
    });
  }
  wireLugaresDeElla();
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
          anotarDondeEstamos(pos);
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

/**
 * Varios sellos casi en el mismo punto del mapa (West Lake y Baochu, o dos
 * lugares de ustedes en casa) se tapan: tocar el elegido pasa al de abajo.
 */
function siguienteEnLaPila(id, sellados) {
  if (id !== mapaSeleccion) return id;
  const actual = LUGARES.find((l) => l.id === id);
  if (!actual) return id;
  // en el mapa real, "encima" depende del zoom (en pixeles de pantalla); en el dibujo, del dibujo
  const real = Corcho.listo();
  const s = vistaMapa ? vistaMapa.s : 1;
  const pos = (l) => (real ? Corcho.posicion(l.lat, l.lon) : posicionEnMapa(l.lat, l.lon));
  const juntos = (a, b) => (real ? Math.hypot(a.x - b.x, a.y - b.y) * s < 16 : Math.hypot(a.x - b.x, (a.y - b.y) * 0.5) < 0.025);
  const p0 = pos(actual);
  const pila = LUGARES.filter((l) => amigos.lugarVisible(l.id, sellados) && juntos(pos(l), p0));
  if (pila.length < 2) return id;
  return pila[(pila.findIndex((l) => l.id === id) + 1) % pila.length].id;
}

// ------------------------------------------------------------------
// v30: los lugares de ustedes. En el mapa, "+ Our place": se sella ahi
// mismo, donde estan (GPS), con un nombre, un recuerdo y el sello que ella
// elija. Los suyos se renombran o se borran desde su postal ("Edit").
// ------------------------------------------------------------------

let formLugar = null; // { modo: "nuevo" | "editar", id, nombre, recuerdo, sello, aviso, error, buscando, borrar }

function wireLugaresDeElla() {
  const agregar = document.getElementById("btn-agregar-lugar");
  if (agregar) {
    agregar.addEventListener("click", () => {
      Sonido.sonar("tocar");
      formLugar = { modo: "nuevo", nombre: "", recuerdo: "", sello: SELLOS_PROPIOS[0] };
      renderMapaActual();
    });
  }
  const editar = document.getElementById("btn-editar-lugar");
  if (editar) {
    editar.addEventListener("click", () => {
      const l = lugaresDeElla.find((x) => x.id === mapaSeleccion);
      if (!l) return;
      Sonido.sonar("tocar");
      formLugar = { modo: "editar", id: l.id, nombre: l.nombre, recuerdo: l.recuerdo, sello: l.sello };
      renderMapaActual();
    });
  }
  if (!formLugar) return;
  const f = formLugar;
  const nombre = document.getElementById("lugar-nombre");
  const recuerdo = document.getElementById("lugar-recuerdo");
  nombre.addEventListener("input", () => (f.nombre = nombre.value));
  recuerdo.addEventListener("input", () => (f.recuerdo = recuerdo.value));
  nombre.addEventListener("keydown", (e) => {
    if (e.key === "Enter") recuerdo.focus();
  });
  for (const b of screenEl.querySelectorAll("[data-sello]")) {
    b.addEventListener("click", () => {
      f.sello = b.dataset.sello;
      for (const o of screenEl.querySelectorAll("[data-sello]")) {
        o.classList.toggle("elegido", o === b);
        o.setAttribute("aria-checked", String(o === b));
      }
      Sonido.sonar("tocar");
    });
  }
  document.getElementById("btn-lugar-cancelar").addEventListener("click", () => {
    formLugar = null;
    Sonido.sonar("tocar");
    renderMapaActual();
  });
  const borrar = document.getElementById("btn-lugar-borrar");
  if (borrar) {
    borrar.addEventListener("click", () => {
      if (!f.borrar) {
        // borrar no tiene vuelta atras: pide un segundo toque
        f.borrar = true;
        borrar.textContent = "Tap again";
        return;
      }
      borrarLugarDeElla(f.id);
    });
  }
  document.getElementById("btn-lugar-ok").addEventListener("click", () => {
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
    if (f.modo === "editar") guardarLugarEditado(f);
    else sellarLugarNuevo(f);
  });
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
  // v35: un lugar se sella para siempre: con una lectura mala (adentro, ±500 m)
  // quedaba en cualquier lado. Se pide ≤ 100 m; si no, se reintenta una vez
  // sin cache, y si sigue mal se le explica (nada se sella).
  const pedir = (intento) => navigator.geolocation.getCurrentPosition(
    (pos) => {
      if (formLugar !== f) return; // cerro el formulario mientras buscaba
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
      } catch (e) {
        /* nada */
      }
      estadoUbicacion = "ok";
      ultimaPosicion = { lat: pos.coords.latitude, lon: pos.coords.longitude, t: Date.now() };
      anotarDondeEstamos(pos);
      const nuevo = lugarDeEllaValido({ id: `propio_${Date.now().toString(36)}`, nombre: f.nombre, recuerdo: f.recuerdo, sello: f.sello, lat: pos.coords.latitude, lon: pos.coords.longitude, creado: Date.now() });
      formLugar = null;
      if (!nuevo) {
        renderMapaActual();
        return;
      }
      lugaresDeElla = [...lugaresDeElla, nuevo];
      ponerLugaresDeElla(lugaresDeElla);
      mapaSeleccion = nuevo.id;
      guardarTodo();
      abrirSello(LUGARES.find((l) => l.id === nuevo.id));
    },
    (err) => {
      if (formLugar !== f) return;
      f.buscando = false;
      if (err && err.code === 1) estadoUbicacion = "sin";
      f.aviso = err && err.code === 1 ? "Baozi needs to know where you are: allow location for Baozi in the phone settings." : "Couldn't find where we are. Try again in a moment?";
      f.error = true;
      renderMapaActual();
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: intento === 1 ? 30000 : 0 },
  );
  pedir(1);
}
const PRECISION_LUGAR_PROPIO_M = 100;

function guardarLugarEditado(f) {
  lugaresDeElla = lugaresDeElla.map((l) => (l.id === f.id ? lugarDeEllaValido({ ...l, nombre: f.nombre, recuerdo: f.recuerdo, sello: f.sello }) || l : l));
  ponerLugaresDeElla(lugaresDeElla);
  formLugar = null;
  guardarTodo();
  Sonido.sonar("guardado");
  renderMapaActual();
}

function borrarLugarDeElla(id) {
  lugaresDeElla = lugaresDeElla.filter((l) => l.id !== id);
  ponerLugaresDeElla(lugaresDeElla);
  // su sello se va con el (las fotos y los dias del diario quedan)
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
    const fotoPostal = Camara.fotoDeLugar(lugar.id);
    R.renderPostal(screenEl, lugar, fotoPostal, lugaresReg.fechas[lugar.id] || Date.now());
    const guardarPostal = document.getElementById("btn-postal-guardar");
    if (guardarPostal && fotoPostal) guardarPostal.addEventListener("click", () => Galeria.guardarFotoEnGaleria(fotoPostal, `baozi-${lugar.id}`));
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

// opts.alSalir (v35, la salida escondida del final): true si se encargo de volver
function abrirPin(opts = {}) {
  prepararVista("director");
  Director.renderPin(screenEl, {
    alOk: () => conTransicion(abrirDirector),
    alSalir: () =>
      conTransicion(() => {
        if (!(opts.alSalir && opts.alSalir())) irACasa();
      }),
  });
}

function abrirDirector() {
  Musica.detener();
  prepararVista("director");
  Director.renderDirector(screenEl, {
    sonidoHabilitado: Sonido.sonidoHabilitado,
    // v35: con el final a medias, salir del director vuelve al final (no a la casa)
    cerrar: () =>
      conTransicion(() => {
        if (!Final.retomarDespuesDelDirector()) irACasa();
      }),
    probarGPS: probarGPSDirector,
    ensayar: () => conTransicion(() => Final.abrirPedido({ ensayo: true })),
    pedirYa: () => {
      if (Final.fase() === "dormido") Final.armar();
      conTransicion(() => Final.abrirPedido());
    },
    // v35: dentro del toque: pantalla, audio, permisos (con tope) y recien ahi empieza
    empezarYa: () => Final.empezarYa(),
    mudanza: {
      estado: () => mudanza.estado,
      previa: () => {
        mudanza = { estado: "llega", desde: 0 };
        guardarTodo();
        conTransicion(irACasa);
        setTimeout(() => talVezMudanza(), 900);
      },
      deshacer: () => {
        mudanza = { estado: "no", desde: 0 };
        guardarTodo();
      },
    },
    tienda: {
      sumar: (n) => {
        tienda.monedas += n;
        guardarTodo();
        return tienda.monedas;
      },
      todo: () => tienda.todoDesbloqueado,
      alternarTodo: () => {
        tienda.todoDesbloqueado = !tienda.todoDesbloqueado;
        guardarTodo();
      },
    },
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
const VISTAS_INTERRUMPIBLES = new Set(["cara", "menu", "consulta", "caminar", "heladera", "mapa", "mapadia"]);

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
      const dentro = Final.dentroDelLugar(latitude, longitude, accuracy); // (la misma cuenta que el disparo)
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
    // v23: los stickers comprados en la tienda
    ...tienda.stickers().map((id) => [`tienda-${id}`, `tienda/sticker_${id}.png`]),
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
      // (v35: la foto con el anillo no da monedas ni suena el "+N")
      if (opts.modo !== "pedido" && opts.tipoFoto !== "final" && foto && !opts.ensayo) fotoParaAmigos(foto);
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
  if (!resultado) return false;

  if (resultado.tipo === "accion") {
    if (resultado.ok) {
      mostrarFeedbackAccion(itemId, opts);
      guardarTodo();
      return true;
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
      // v24: dos juegos en la tele: Snack Rain o Lake Fishing
      Sonido.sonar("tocar");
      conTransicion(() => {
        controller.vista = "juegos";
        renderVistaActual();
      });
    }
  } else if (resultado.tipo === "caminar") {
    conTransicion(iniciarCaminar);
  } else if (resultado.tipo === "lente") {
    if (Final.fotoPedida()) conTransicion(() => Final.abrirPedido());
    else conTransicion(abrirLenteDesdeMenu);
  } else if (resultado.tipo === "ajuste") {
    Sonido.alternarSonido();
    if (!Sonido.sonidoHabilitado()) Musica.detener(0.1);
    sonidoDelClima();
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
  ganarMonedas("cuidar");

  if (itemId === "feed" || itemId === "water") eventoDeseo({ tipo: "comer", item: opts.item || (itemId === "water" ? "comida/bebida_agua.png" : "") });
  else eventoDeseo({ tipo: "cuidar", accion: itemId });
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
  else if (tipo === "stats") {
    elegirDeseo();
    const d = deseos.actual();
    R.renderStats(tmp, mascota, { deseo: d && !finalEnMarcha() && !enCalma("deseo") ? { texto: d.texto, real: !!d.real, estado: deseos.estado, progreso: deseos.progreso, meta: d.meta || 0 } : null });
  }
  else if (tipo === "traits") R.renderTraits(tmp, mascota);
  else if (tipo === "npcs") R.renderNpcs(tmp, npcsReg, amigos, { progreso: (m) => progresoDe(m, contextoAmigos()) });
  else if (tipo === "closet") R.renderCloset(tmp, amigos, tienda.accesorios());
  else if (tipo === "shop") {
    // lo nuevo se marca como visto al abrir la tienda (el "NEW" queda mientras ella este aca)
    if (!estadoTiendaUI.nuevas) estadoTiendaUI.nuevas = new Set(tienda.nuevas().map((c) => c.id));
    tienda.marcarVistas();
    R.renderTienda(tmp, tienda, { ...estadoTiendaUI, puesto: amigos.puesto, peluche: Personaje.IDS.find((q) => q !== Personaje.actual()) || "baozi" });
  }
  else if (tipo === "ajustes" || tipo === "backup") tmp.innerHTML = R.htmlAjustes(Sonido.sonidoHabilitado(), Donde.activo(), { fotos: Camara.cantidadDeFotos(), conVideo: Final.dijoQueSi() });
  else R.renderProgress(tmp, mascota, lugaresReg);
  const cabecera = tmp.querySelector(".encabezado-vista");
  if (cabecera) cabecera.remove();
  R.renderCuaderno(screenEl, tipo === "backup" ? "ajustes" : tipo, tmp.innerHTML);
  if (tipo !== "shop") estadoTiendaUI = {};
  if (tipo === "shop") wireTienda();
  const pestanaTienda = screenEl.querySelector('.cuaderno-pestanas [data-pestana="shop"]');
  if (pestanaTienda && tienda.nuevas().length) pestanaTienda.classList.add("con-novedad");

  if (tipo === "diary") wireDiario();
  if (tipo === "stats") {
    const b = screenEl.querySelector("[data-ver-deseo]");
    if (b) b.addEventListener("click", () => abrirDeseo("stats"));
  }
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
    document.getElementById("btn-ver-tutorial").addEventListener("click", () =>
      conTransicion(() =>
        abrirTutorial(() => {
          controller.abrirConsulta("ajustes");
          controller.vista = "consulta";
          renderVistaActual();
        }),
      ),
    );
    document.getElementById("btn-ajuste-lugares").addEventListener("click", () => {
      Donde.ponerActivo(!Donde.activo());
      Sonido.sonar("tocar");
      renderConsulta();
    });
    document.getElementById("btn-ajuste-sonido").addEventListener("click", () => {
      Sonido.alternarSonido();
      if (!Sonido.sonidoHabilitado()) Musica.detener(0.1);
      sonidoDelClima(); // apagado: la lluvia se calla ya, no al proximo tick
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
  document.getElementById("btn-volver-consulta").addEventListener("click", () => {
    estadoTiendaUI = {};
    conTransicion(irACasa);
  });
}

// v23: la tienda del cuaderno
let estadoTiendaUI = {}; // { nuevas, confirmar, recien, falta } mientras la tienda esta abierta

function wireTienda() {
  const repintar = (cambios) => {
    estadoTiendaUI = { ...estadoTiendaUI, ...cambios };
    const scroll = screenEl.querySelector(".cuaderno-contenido");
    const y = scroll ? scroll.scrollTop : 0;
    renderConsulta();
    const scroll2 = screenEl.querySelector(".cuaderno-contenido");
    if (scroll2) scroll2.scrollTop = y;
  };
  for (const b of screenEl.querySelectorAll("[data-comprar]")) {
    b.addEventListener("click", () => {
      const c = productoTienda(b.dataset.comprar);
      if (!c) return;
      if (tienda.monedas < c.precio) {
        Sonido.sonar("no");
        repintar({ falta: c.id, confirmar: null, recien: null });
        return;
      }
      Sonido.sonar("tocar");
      repintar({ confirmar: c.id, falta: null, recien: null });
    });
  }
  // v25: elegir el cuarto y la mascota
  for (const b of screenEl.querySelectorAll("[data-poner-cuarto]")) {
    b.addEventListener("click", () => {
      if (!tienda.ponerCuarto(b.dataset.ponerCuarto)) return;
      aplicarCuarto();
      guardarTodo();
      Sonido.sonar("guardado");
      repintar({ confirmar: null, recien: null, falta: null });
    });
  }
  for (const b of screenEl.querySelectorAll("[data-poner-mascota]")) {
    b.addEventListener("click", () => {
      if (!tienda.ponerMascota(b.dataset.ponerMascota || null)) return;
      guardarTodo();
      Sonido.sonar(tienda.mascota ? "guardado" : "tocar");
      repintar({ confirmar: null, recien: null, falta: null });
    });
  }
  const cancelar = screenEl.querySelector("[data-cancelar-compra]");
  if (cancelar) cancelar.addEventListener("click", () => repintar({ confirmar: null }));
  const confirmar = screenEl.querySelector("[data-confirmar-compra]");
  if (confirmar) {
    confirmar.addEventListener("click", () => {
      const c = productoTienda(confirmar.dataset.confirmarCompra);
      if (!c || tienda.comprar(c.id) !== "ok") {
        Sonido.sonar("no");
        repintar({ confirmar: null });
        return;
      }
      // lo que se pone, se pone enseguida (como los regalos de los amigos)
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
      vibrar([15, 30, 15]);
      if (diario) diario.anotarHito(`Bought: ${c.nombre}`);
      guardarTodo();
      repintar({ confirmar: null, recien: c.id, falta: null });
    });
  }
}

let urlVideoDiario = null;
function wireDiario() {
  // v21: despues del si, el video del momento arriba del diario (se ve y se guarda)
  if (Final.dijoQueSi()) {
    // v35: el video del si por id (no "el ultimo": si la app se reabrio
    // despues del si, el ultimo es un pedacito); los otros pedazos, aparte
    Final.videosDelSi()
      .then((vs) => {
        const v = vs.find((x) => x.principal) || vs[0];
        const otros = vs.filter((x) => x !== v);
        const tira = screenEl.querySelector(".tira-diario");
        if (!v || !tira || screenEl.querySelector(".tarjeta-video")) return;
        // v35: una sola URL viva: la de la vez anterior se suelta (si no, cada
        // vez que se abria el diario quedaba un video entero en memoria)
        if (urlVideoDiario) URL.revokeObjectURL(urlVideoDiario);
        const url = (urlVideoDiario = URL.createObjectURL(v.blob));
        const t = document.createElement("div");
        t.className = "tarjeta-video";
        t.innerHTML = `<video src="${url}" controls playsinline preload="metadata"></video>
          <div class="tarjeta-video-texto"><b>Our video ♥</b><span>${fechaLegible(claveDelDia(new Date(v.empezo)))}</span>
          <button class="boton chico boton-galeria" type="button">Save to Photos</button></div>`;
        t.querySelector("button").addEventListener("click", () => Galeria.guardarVideoEnGaleria(v.blob, "nuestro-video"));
        for (const o of otros) {
          const b = document.createElement("button");
          b.className = "boton chico boton-fantasma boton-galeria";
          b.type = "button";
          b.textContent = `Save clip ${o.parte}`;
          b.addEventListener("click", () => Galeria.guardarVideoEnGaleria(o.blob, `nuestro-video-${o.parte}`));
          t.querySelector(".tarjeta-video-texto").appendChild(b);
        }
        tira.parentNode.insertBefore(t, tira);
      })
      .catch(() => {});
  }
  const escribirBtn = document.getElementById("btn-escribir-hoy");
  if (escribirBtn) escribirBtn.addEventListener("click", () => conTransicion(abrirEscribir));
  for (const fig of screenEl.querySelectorAll(".polaroid")) wirePolaroid(fig);
  // v28: los mapas de "donde estuvimos" que falten se hacen de a poco y
  // aparecen en su polaroid cuando estan listos
  const dias = [...screenEl.querySelectorAll(".polaroid")].map((f) => f.dataset.dia).filter((d) => Donde.hayMapa(d));
  MapaDia.hacerPendientes(dias, refrescarPolaroid);
}

function wirePolaroid(fig) {
  fig.addEventListener("click", (e) => {
    if (e.target.closest("[data-ver-mapa]")) {
      Sonido.sonar("tocar");
      abrirMapaDia(fig.dataset.dia);
      return;
    }
    if (e.target.closest("[data-guardar-foto]")) {
      // lo que se esta viendo en la polaroid (foto o mapa), a la galeria del telefono
      const img = fig.querySelector("img.imagen-polaroid");
      if (img && img.classList.contains("mapa-polaroid")) {
        const m = MapaDia.mapaDe(fig.dataset.dia);
        if (m) Galeria.guardarFotoEnGaleria(m.grande, "baozi-mapa-" + fig.dataset.dia);
      } else if (img && img.classList.contains("foto-real")) Galeria.guardarFotoEnGaleria(img.src, "baozi-" + fig.dataset.dia);
      return;
    }
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

/** Un mapa quedo listo: si el diario esta abierto, su polaroid se rehace. */
function refrescarPolaroid(dia) {
  // (v35: con el mapa grande de ese dia abierto, se redibuja el grande)
  if (controller.vista === "mapadia" && mapaDiaAbierto === dia) {
    renderMapaDiaActual();
    return;
  }
  if (controller.vista !== "consulta" || controller.consultaActual !== "diary") return;
  const vieja = screenEl.querySelector(`.polaroid[data-dia="${dia}"]`);
  const e = diario && diario.entradaDe(dia);
  if (!vieja || !e) return;
  const caja = document.createElement("div");
  caja.innerHTML = R.htmlPolaroid(e, { puedeRepetirFinal: Final.dijoQueSi() });
  const nueva = caja.firstElementChild;
  vieja.replaceWith(nueva);
  wirePolaroid(nueva);
}

// ------------------------------------------------------------------
// v28: el mapa grande de "donde estuvimos"
// ------------------------------------------------------------------

let mapaDiaAbierto = null;
let relojesMapaDia = [];

function abrirMapaDia(dia) {
  if (!MapaDia.mapaDe(dia)) return;
  mapaDiaAbierto = dia;
  conTransicion(() => {
    prepararVista("mapadia");
    renderVistaActual();
  });
  // v35: si el mapa guardado quedo viejo (hubo puntos nuevos), se rehace y,
  // si sigue abierto, se vuelve a dibujar (las horas salen de los pines de ahora)
  MapaDia.hacerPendientes([dia], refrescarPolaroid);
}

function volverAlDiario() {
  relojesMapaDia.forEach(clearTimeout);
  relojesMapaDia = [];
  mapaDiaAbierto = null;
  conTransicion(() => {
    controller.abrirConsulta("diary");
    renderVistaActual();
  });
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
  const { pines, orden } = Donde.pinesDe(dia);
  R.renderMapaDia(screenEl, { dia, mapa, pines, puntos: Donde.puntosDe(dia), fotos: Camara.fotosDelDia(dia).length });
  document.getElementById("btn-volver-mapa-dia").addEventListener("click", volverAlDiario);
  acomodarMapaDia(mapa, orden);
}

/** Tamaño del mapa (2x si entra), las horas al lado de cada pin y el personaje que pasea. */
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
  const pos = (mapa.pos || []).map(([x, y]) => [x * k, y * k]);
  // las horas: abajo del pin; si choca con otra o se sale, arriba
  const puestas = [];
  for (const chip of marco.querySelectorAll(".chip-hora")) {
    const p = pos[Number(chip.dataset.pin)];
    if (!p) continue;
    const w = chip.offsetWidth, h = chip.offsetHeight;
    const x = Math.max(2, Math.min(W * k - w - 2, p[0] - w / 2));
    const opciones = [p[1] + 4, p[1] - 16 - h, p[1] - h / 2];
    let y = opciones[0];
    for (const yy of opciones) {
      const dentro = yy >= 2 && yy + h <= H * k - 2;
      const choca = puestas.some((q) => x < q.x + q.w + 2 && q.x < x + w + 2 && yy < q.y + q.h + 2 && q.y < yy + h + 2);
      if (dentro && !choca) {
        y = yy;
        break;
      }
    }
    y = Math.max(2, Math.min(H * k - h - 2, y));
    puestas.push({ x, y, w, h });
    chip.style.left = `${Math.round(x)}px`;
    chip.style.top = `${Math.round(y)}px`;
  }
  // el personaje va de pin en pin, en el orden del dia
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
  orden.slice(1).forEach((i, n) => {
    relojesMapaDia.push(
      setTimeout(() => {
        if (controller.vista !== "mapadia") return;
        const antes = orden[n];
        pj.classList.toggle("al-reves", pos[i] && pos[antes] && pos[i][0] < pos[antes][0]);
        ponerEn(i);
      }, 700 + n * 1100),
    );
  });
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
  // v35: la pagina es la del dia logico (a la 1 de la mañana, la de ayer)
  const guardada = diario.entrada(claveDelDiaLogico());
  const entrada = borradorHoy ? { ...(guardada || {}), ...borradorHoy } : guardada;
  const fotos = [...Camara.fotosDelDia(claveDelDiaLogico()), ...(claveDelDiaLogico() !== claveDelDia() ? Camara.fotosDelDia(claveDelDia()) : [])];
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
    const racha = diario.racha();
    const monedasDiario = tienda.ganar("diario") + tienda.ganarPorRacha(racha);
    eventoDeseo({ tipo: "diario" });
    guardarTodo();
    Sonido.sonar("guardado");
    if (monedasDiario) setTimeout(() => mostrarMonedas(monedasDiario), 700);
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
  const mensajeEl = document.getElementById("mensaje-backup");
  const mensaje = (texto, clase = "") => {
    mensajeEl.textContent = texto;
    mensajeEl.className = `mensaje-backup ${clase}`;
  };
  // v33: el video del si va en el backup. Se busca al abrir los ajustes, no
  // en el toque: compartir tiene que salir enseguida del toque (si espera a
  // IndexedDB, el iPhone lo niega).
  const videos = Final.dijoQueSi() ? Grabacion.videosParaBackup().catch(() => []) : Promise.resolve([]);
  document.getElementById("btn-exportar-backup").addEventListener("click", async () => {
    guardarTodo();
    const blob = storage.armarBackup({ fotos: Camara.todasLasFotos(), videos: await videos });
    if (!blob) {
      mensaje("Nothing to save yet.", "error");
      return;
    }
    const r = await Galeria.guardarBlob(blob, storage.nombreDelBackup());
    if (r === "compartido" || r === "descargado") storage.marcarBackup(); // v35: para el aviso semanal
    if (r === "compartido" || r === "descargado") mensaje(r === "compartido" ? "Backup ready ♥ Keep it somewhere safe (Files, iCloud…)." : "Backup saved in your downloads ♥", "ok");
    else if (r === "error") mensaje("Couldn't save the backup. Try again?", "error");
  });

  const btnFotos = document.getElementById("btn-guardar-fotos");
  if (btnFotos) {
    let listas = null;
    const textoBase = btnFotos.innerHTML;
    btnFotos.addEventListener("click", async () => {
      if (listas) {
        const r = await Galeria.guardarVarios(listas);
        listas = null;
        btnFotos.innerHTML = textoBase;
        btnFotos.classList.add("boton-fantasma");
        if (r === "compartido" || r === "descargado") mensaje("Photos saved ♥", "ok");
        else if (r === "error") mensaje("Couldn't save the photos. Try again?", "error");
        return;
      }
      // primer toque: se preparan (lleva un momento); el segundo las comparte
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
    });
  }

  const inputArchivo = document.getElementById("input-importar-backup");
  inputArchivo.addEventListener("change", () => {
    const archivo = inputArchivo.files[0];
    inputArchivo.value = ""; // asi se puede elegir el mismo archivo otra vez
    if (archivo) restaurarDesdeArchivo(archivo, mensaje);
  });
}

/**
 * v35: lo que dice cuando un backup no se puede restaurar, sin repetir "that
 * file" ni mostrar errores crudos del navegador (sin lugar, etc.).
 */
function mensajeErrorBackup(e) {
  const m = String((e && e.message) || "");
  if ((e && (e.name === "QuotaExceededError" || e.code === 22)) || /quota|exceeded|space/i.test(m)) {
    return "There isn't enough space on this phone to restore it. Free up some space and try again?";
  }
  if (m === "vacio") return "That backup looks empty or damaged. Try another file?";
  // los de storage.js ya vienen en ingles y para ella ("that backup is from a newer Baozi.")
  if (/^that (file|backup) /.test(m)) return m.charAt(0).toUpperCase() + m.slice(1);
  return "Couldn't read that file. Is it a Baozi backup?";
}

/**
 * Restaura un backup elegido por ella (desde Settings o, v35, desde la
 * primera pantalla). mensaje(texto, clase) muestra como va.
 */
async function restaurarDesdeArchivo(archivo, mensaje) {
  {
    mensaje("Reading the backup…");
    try {
      const datos = await storage.leerBackup(archivo);
      storage.restaurarBackup(datos);
      const guardado = storage.cargar();
      // (si lo restaurado no se pudo leer y cargar() volvio a la copia anterior, NO es el backup)
      if (!guardado || guardado.recuperadoDe) {
        if (mascota) guardarTodo(); // el principal vuelve a ser lo de antes
        throw new Error("vacio");
      }
      const nFotos = await Camara.importarFotos(datos.fotos);
      await Grabacion.importarVideos(datos.videos);
      // lo de la memoria pasa a ser lo del backup (si algo guarda antes de
      // recargar, guarda lo restaurado, no lo de antes)
      ({ mascota, npcs: npcsReg, lugares: lugaresReg, diario, cartasEntregadas } = guardado);
      cargarLugaresDeElla(guardado.extras && guardado.extras.lugaresPropios);
      cargarFechasDeElla(guardado.extras && guardado.extras.fechasPropias);
      Final.restaurarDesdeGuardado(guardado.extras && guardado.extras.final, { forzar: true });
      Personaje.restaurar(guardado.extras && guardado.extras.personaje);
      tienda = Tienda.desdeObjeto(guardado.extras && guardado.extras.tienda);
      deseos = Deseos.desdeObjeto(guardado.extras && guardado.extras.deseos, DESEOS_PROPIOS);
      cargarPesca(guardado.extras && guardado.extras.pesca);
      cargarMudanza(guardado.extras && guardado.extras.mudanza);
      cargarAmigos(guardado.extras && guardado.extras.amigos);
      mascota.actualizarTiempo(Date.now());
      mensaje(`Backup restored${nFotos ? ` (+${nFotos} ${nFotos === 1 ? "photo" : "photos"})` : ""}. Welcome back, Baozi!`, "ok");
      // se recarga para que todo (records, el cuarto, el album) arranque del backup
      setTimeout(() => location.reload(), 1800);
    } catch (e) {
      console.warn("No se pudo restaurar el backup:", e);
      mensaje(mensajeErrorBackup(e), "error");
    }
  }
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
  // v22: anotar los pasos de hoy desde la app Salud cuando ella quiera
  document.getElementById("btn-anotar-pasos").addEventListener("click", () => {
    detenerSensoresCaminar();
    abrirPreguntaPasos({ clave: claveDelDia(), cuando: "today" }, { volverA: "caminar" });
  });
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

/** v33: ¿hoy ya llego una carta? (el diario anota cada una en su dia) */
function huboCartaHoy() {
  const e = diario && diario.entradaDe(claveDelDia());
  return !!e && e.cartas.length > 0;
}

function mostrarCartaSiCorresponde(contexto) {
  // las de pasos, como mucho una por dia; las de un momento (un lugar, el In Love), en ese momento
  const carta = cartaPendiente({ ...contexto, sinPasos: huboCartaHoy() }, cartasEntregadas);
  if (!carta) return false;
  entregarCarta(carta);
  return true;
}

// v30: las cartas de algo que ya habia pasado (un lugar sellado antes de que
// la carta existiera) y (v33) las del compromiso llegan en el cuarto, como
// mucho una por dia (y no el dia que ya llego otra).
const abiertaDesdeMs = performance.now();

/** Dias enteros desde el si (o null si todavia no). */
function diasTrasElSi(ahora = new Date()) {
  const si = Final.dijoQueSi() && Final.fechaDelSi();
  if (!si) return null;
  const d0 = new Date(si);
  const a = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate());
  const b = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  return Math.round((b - a) / 86400000);
}

function talVezCartaAtrasada() {
  if (!mascota || controller.vista !== "cara" || visita || !puedeComentar()) return false;
  if (performance.now() - abiertaDesdeMs < 10000) return false; // primero el saludo
  // (el dia de la boda su carta llega aunque hoy ya haya llegado otra: no hay otro dia para ella)
  const boda = bodaEsHoy() && !cartasEntregadas.includes("boda");
  if (huboCartaHoy() && !boda) return false;
  const enamorado = NPCS.some((n) => (npcsReg.vecesEncontrado[n.id] || 0) >= VECES_PARA_ENAMORADO);
  const carta = boda
    ? cartaAtrasada(cartasEntregadas, { boda: true })
    : cartaAtrasada(cartasEntregadas, { sellados: lugaresReg.desbloqueados, enamorado, diasTrasElSi: diasTrasElSi(), boda: false });
  if (!carta) return false;
  entregarCarta(carta);
  return true;
}

function entregarCarta(carta) {
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
  conTransicion(() => {
    encuentro.paso = siguiente;
    renderVistaActual();
  });
}

function manejarEleccionEncuentro(eleccion) {
  const huboEnamorado = npcsReg.procesarEncuentro(mascota, encuentro.npc, eleccion, Date.now());
  encuentro.paso = eleccion === "saludar" ? "dialogo" : "despedida";
  if (eleccion !== "saludar") encuentro.desairado = true;
  else ganarMonedas("saludo");
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

// ------------------------------------------------------------------
// v24: Lake Fishing (pesca.js)
// ------------------------------------------------------------------

let pesca = null;
function iniciarPescaJuego() {
  controller.vista = "pesca";
  actualizarTabbar();
  actualizarMarco();
  screenEl.classList.add("sin-margen");
  const h = new Date().getHours();
  pesca = iniciarPesca(screenEl, {
    arte,
    capas: Personaje.capas("ojo_base_energia_alta.png", "boca_base_feliz.png", "sentado").map((c) => arte(c.src)),
    pies: Personaje.figura("sentado").pies,
    noche: h >= 19 || h < 6,
    sonar: (n) => Sonido.sonar(n),
    vibrar,
    alTerminar: terminarPesca,
    alSalir: volverALaTele,
  });
}

function terminarPesca({ puntos = 0, peces = [], record = 0, nuevoRecord = false } = {}) {
  if (pesca) pesca.destruir();
  pesca = null;
  const buenos = peces.filter((id) => (pezPorId(id) || {}).puntos > 0);
  const nuevos = [...new Set(peces)].filter((id) => !pescaReg.libro[id]);
  for (const id of peces) pescaReg.libro[id] = (pescaReg.libro[id] || 0) + 1;
  // los peces lindos van a la pecera (si la tiene), hasta 4
  if (tienda.tiene("pecera")) {
    for (const id of peces) if (PECES_DE_PECERA.has(id)) pescaReg.pecera = [...pescaReg.pecera, id].slice(-4);
  }
  mascota.resultadoMinijuego(buenos.length, Date.now());
  diario.anotarJuego(puntos);
  const monedasPesca = tienda.ganar("juego", Math.floor(puntos / 3)) + (nuevoRecord && puntos > 0 ? tienda.ganar("record") : 0);
  eventoDeseo({ tipo: "pesca", peces });
  guardarTodo();
  if (monedasPesca) setTimeout(() => mostrarMonedas(monedasPesca), 600);
  vibrar(buenos.length ? [20, 40, 20] : 20);
  Sonido.sonar(buenos.length ? "hito" : "mimo");
  controller.vista = "feedback";
  const titulo = nuevoRecord && puntos > 0 ? `New record: ${puntos}!` : buenos.length ? `${buenos.length} fish!` : "No fish today…";
  const nombres = nuevos.map((id) => pezPorId(id).nombre.replace(/…$/, "")).join(", ");
  const sub = nuevos.length ? `New in your fish book: ${nombres}` : `${puntos} points · best ${record}`;
  conTransicion(() => R.renderFeedback(screenEl, titulo, { especial: buenos.length ? "euforico" : "decepcionado", sub }));
  setTimeout(() => conTransicion(irACasa), DURACION_FEEDBACK_MS + 1400);
}

function iniciarMinijuego() {
  controller.vista = "minijuego";
  actualizarTabbar();
  actualizarMarco();
  screenEl.classList.add("sin-margen");
  // v35 (F31): el banner del permiso quedaba debajo del cartel de dificultad.
  // Ahora el permiso se pide en el mismo toque que elige la dificultad (iOS
  // lo olvida en cada arranque de la app: el toque lo vuelve a pedir).
  minijuego = iniciarJuego(screenEl, {
    arte,
    sprite: (ojo, boca) => R.spriteCara(ojo, boca),
    cambiarCara: (el, ojo, boca) => R.cambiarCara(el, ojo, boca),
    sonar: (n) => Sonido.sonar(n),
    vibrar,
    alTerminar: terminarMinijuego,
    alSalir: volverALaTele,
    alElegir: () => {
      if (permisoMotionEstado !== "unknown") return null;
      return Sensores.pedirPermisoMotion().then((r) => {
        permisoMotionEstado = r;
        if (r === "granted" && minijuego) activarVolante();
      });
    },
    // F37: en el GO! (y al volver de una pausa) la postura de ahora es "derecho"
    alEmpezar: () => {
      if (volanteJuego) volanteJuego.recalibrar();
    },
  });
  wireMinijuego();
  if (permisoMotionEstado === "granted") activarVolante();
}

function wireMinijuego() {
  const btnMotion = document.getElementById("btn-habilitar-motion");
  if (btnMotion) {
    btnMotion.addEventListener("click", async (e) => {
      e.stopPropagation();
      permisoMotionEstado = await Sensores.pedirPermisoMotion();
      btnMotion.remove();
      if (permisoMotionEstado === "granted" && minijuego) activarVolante();
    });
  }
}

/** v29: inclinar el telefono mueve al personaje (antes: sacudir atrapaba sola la comida). */
function anguloPantalla() {
  try {
    if (screen.orientation && Number.isFinite(screen.orientation.angle)) return screen.orientation.angle;
  } catch (e) {
    /* nada */
  }
  return Number.isFinite(window.orientation) ? (window.orientation + 360) % 360 : 90;
}

function activarVolante() {
  if (detenerMotionMinijuego) return;
  volanteJuego = new Volante();
  detenerMotionMinijuego = Sensores.iniciarEscuchaMotion((x, y, z) => {
    if (!minijuego || !volanteJuego) return;
    const pos = volanteJuego.leer(x, y, z, anguloPantalla());
    if (pos === null) return;
    // F42: mientras manda el dedo, la base del volante sigue al personaje:
    // al soltar, inclinar mueve desde ahi (no salta a donde dice el telefono)
    if (minijuego.usandoDedo && minijuego.usandoDedo()) volanteJuego.centrarEn(minijuego.estado().objetivo);
    else minijuego.inclinar(pos);
  });
}

function soltarVolante() {
  if (detenerMotionMinijuego) {
    detenerMotionMinijuego();
    detenerMotionMinijuego = null;
  }
  volanteJuego = null;
}

/** v30: la flechita de volver antes de jugar: de vuelta a la tele, sin premio ni cartel. */
function volverALaTele() {
  if (minijuego) minijuego.detener();
  minijuego = null;
  soltarVolante();
  if (pesca) pesca.destruir();
  pesca = null;
  if (juegoTele) juegoTele.destruir();
  juegoTele = null;
  Sonido.sonar("tocar");
  conTransicion(() => {
    controller.vista = "juegos";
    renderVistaActual();
  });
}

function terminarMinijuego({ puntos = 0, atrapadas = 0, record = 0, nuevoRecord = false } = {}) {
  minijuego = null;
  soltarVolante();
  mascota.resultadoMinijuego(atrapadas, Date.now());
  diario.anotarJuego(puntos);
  eventoAmigos({ tipo: "juego", puntos });
  const monedasJuego = tienda.ganar("juego", Math.floor(puntos / 10)) + (nuevoRecord && puntos > 0 ? tienda.ganar("record") : 0);
  eventoDeseo({ tipo: "juego", puntos, atrapadas });
  guardarTodo();
  if (monedasJuego) setTimeout(() => mostrarMonedas(monedasJuego), 600);
  vibrar(puntos > 0 ? [20, 40, 20, 40, 20] : 20);
  Sonido.sonar(puntos > 0 ? "hito" : "mimo");
  controller.vista = "feedback";
  const titulo = nuevoRecord && puntos > 0 ? `New record: ${puntos}!` : puntos ? `${puntos} points!` : "So close!";
  const sub = nuevoRecord && puntos > 0 ? "Best snack catcher in Hangzhou." : `Caught ${atrapadas} · best ${record}`;
  conTransicion(() => R.renderFeedback(screenEl, titulo, { especial: puntos ? "euforico" : "decepcionado", sub }));
  setTimeout(() => conTransicion(irACasa), DURACION_FEEDBACK_MS + 1200);
}

// ------------------------------------------------------------------
// v29: los juegos nuevos de la tele (Steamer Stack, Radio Beats, Boat Ride)
// ------------------------------------------------------------------

let juegoTele = null;

function iniciarJuegoTele(cual) {
  controller.vista = cual;
  actualizarTabbar();
  actualizarMarco();
  screenEl.classList.add("sin-margen");
  Musica.detener(0.3);
  const comunes = {
    arte,
    sprite: (ojo, boca) => R.spriteCara(ojo, boca),
    cambiarCara: (el, ojo, boca) => R.cambiarCara(el, ojo, boca),
    sonar: (n) => Sonido.sonar(n),
    vibrar,
    alSalir: volverALaTele,
  };
  if (cual === "torre") juegoTele = iniciarTorre(screenEl, { ...comunes, alTerminar: (r) => terminarJuegoTele("torre", r) });
  else if (cual === "ritmo") juegoTele = iniciarRitmo(screenEl, { ...comunes, musica: Musica, alTerminar: (r) => terminarJuegoTele("ritmo", r) });
  else juegoTele = iniciarTejo(screenEl, { ...comunes, alTerminar: (r) => terminarJuegoTele("tejo", r) });
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
    monedas = tienda.ganar("juego", Math.floor(puntos / 3));
    titulo = r.nuevoRecord && puntos > 0 ? `New record: ${puntos}!` : r.pisos ? `${r.pisos} steamers tall!` : "Oops!";
    sub = `${puntos} points · best ${r.record}`;
  } else if (cual === "ritmo") {
    bien = r.perfectos + r.buenos > 0;
    monedas = tienda.ganar("juego", Math.floor(puntos / 60));
    const notas = r.total ? Math.round(((r.perfectos + r.buenos) / r.total) * 100) : 0;
    titulo = r.nuevoRecord && puntos > 0 ? `New record: ${puntos.toLocaleString("en-US")}!` : r.fallados === 0 && r.total ? "Full combo!" : `${notas}% of the notes!`;
    sub = `${r.nombreCancion} · ${r.perfectos} perfect · best ${r.record.toLocaleString("en-US")}`;
  } else {
    // v40: el tejo
    bien = puntos > 0;
    monedas = tienda.ganar("juego", Math.floor(puntos / 3));
    const mechas = r.mechas || 0;
    titulo = r.nuevoRecord && puntos > 0 ? `New record: ${puntos} pts!` : mechas ? `${mechas} mecha${mechas === 1 ? "" : "s"} exploded!` : puntos ? `${puntos} points!` : "Not this time…";
    sub = `${r.embocinadas || 0} embocinada${r.embocinadas === 1 ? "" : "s"} · best ${r.record} pts`;
  }
  if (r.nuevoRecord && puntos > 0) monedas += tienda.ganar("record");
  // v35 (F38): cuantas cosas buenas hizo de verdad (0 si salio enseguida con la flechita):
  // pisos de la torre, notas acertadas / 4, mechas y embocinadas del tejo
  const logros = cual === "torre" ? r.pisos || 0 : cual === "ritmo" ? Math.floor(((r.perfectos || 0) + (r.buenos || 0)) / 4) : (r.mechas || 0) + (r.embocinadas || 0);
  mascota.resultadoMinijuego(logros, Date.now());
  diario.anotarJuego(puntos);
  eventoDeseo({ tipo: cual, puntos });
  guardarTodo();
  if (monedas) setTimeout(() => mostrarMonedas(monedas), 600);
  vibrar(bien ? [20, 40, 20] : 20);
  Sonido.sonar(bien ? "hito" : "mimo");
  controller.vista = "feedback";
  conTransicion(() => R.renderFeedback(screenEl, titulo, { especial: bien ? "euforico" : "decepcionado", sub }));
  setTimeout(() => conTransicion(irACasa), DURACION_FEEDBACK_MS + 1400);
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
        spriteEl.classList.add("parpadeando");
        setTimeout(() => {
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

function tick() {
  if (!mascota) return;
  const ahora = Date.now();

  // (los dias del pedido y de la secuencia no se duerme sola)
  const sinSuenioAuto = ["pedido", "en_curso"].includes(Final.fase());
  const { suenio: suenioEnElTiempo } = mascota.actualizarTiempo(ahora, { suenioAuto: !sinSuenioAuto });
  actualizarFondoPorHora();
  if (!document.hidden) marcarVista();

  // (en el cuarto "#reloj" es el boton invisible del reloj de pared: no se le escribe la hora)
  const relojEl = document.getElementById("reloj");
  if (relojEl && !relojEl.classList.contains("toque-objeto")) relojEl.textContent = R.reloj();

  Final.revisarArmadoPorFecha(ahora);
  if (Final.tocaPedirSinGPS(ahora)) pedidoPendiente = true;
  vigilarLugarFinal();
  intentarPedido();

  cuidarParaElFinal();
  // (v35: el cambio puede haber pasado adentro de actualizarTiempo, en el corte de la hora)
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

  // v35: una vez por dia de calendario, guardado en la mascota (antes solo en memoria)
  mascota.decaerRasgosPorDias(ahora);

  if (visita && ahora > visita.hastaMs) {
    visita = null;
    if (controller.vista === "cara" && puedeComentar()) {
      mostrarEspecial("decepcionado", 3500);
      decir("Aw… they left.", 3000);
    }
  }
  // v22: la pregunta de los pasos va antes que una visita al azar (la visita puede esperar)
  elegirDeseo();
  if (deseos.pendiente() && amigos.puesto) eventoDeseo({ tipo: "estado", puesto: amigos.puesto });
  if (!talVezMudanza() && !talVezPreguntarPasos() && !talVezContarVelitas() && !talVezAvisarTienda() && !celebrarDeseo() && !talVezCartaAtrasada() && !talVezAvisarBackup(ahora)) {
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
  // v22
  diario: () => diario,
  donde: Donde,
  lugares: () => lugaresReg,
  mapaDia: MapaDia,
  tick: () => tick(),
  tienda: () => tienda,
  deseos: () => deseos,
  pesca: () => pesca,
  juegoTele: () => juegoTele,
  mudanza: () => mudanza,
  pescaReg: () => pescaReg,
  velitas: (si) => {
    velitasForzadas = si === null || si === undefined ? null : !!si;
  },
  sinVisita: () => {
    visita = null;
  },
  estadoPasos: () => ({ vista: controller.vista, dormida: mascota && mascota.dormida, visita: !!visita, fase: Final.fase(), dia: diaParaPreguntarPasos() }),
  musica: () => Musica.escenaSonando(),
  caminar: () => conTransicion(iniciarCaminar),
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
