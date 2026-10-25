/**
 * final.js
 * =========
 * La propuesta. El texto personal esta en config.js; aca la puesta en
 * escena. Es la escena que rom imagino desde el principio (la version
 * del aparato fisico, BEATS_PROPUESTA en main.py), llevada al telefono:
 *
 *   0. EL DISPARO. Nada que buscar, nada que sospechar. Con la busqueda
 *      armada, cuando ella abre Baozi en el lago, Baozi se entusiasma y
 *      le pide una selfie de los dos "para su album". El Lente es la
 *      excusa perfecta para tener el telefono en la mano (y para que
 *      alguien grabe sin levantar sospechas).
 *   1. Esa selfie se revela como una foto de Game Boy... y se funde en
 *      el lago: el bote entra con los dos arriba.
 *   2. La camara entra a la cara de ella, despues a la de el: todo en
 *      el mismo mundo (escena.js), sin cortes. Los dos tienen los ojos
 *      de Baozi y parpadean como el.
 *   3. Pasamos a el: su dialogo, y al lado van pasando TODAS las fotos
 *      que sacaron juntos, con la musica.
 *   4. "Look up." — ella levanta la vista.
 *   5. En la pantalla queda solo un corazon latiendo con la musica,
 *      mientras el le da el anillo. Antes de este punto no hay NINGUNA
 *      pista del anillo.
 *   6. Cuando ella toca el corazon: festejo, "now one with the ring?",
 *      y queda para siempre en el diario con marco rosa.
 *
 * CONFIABILIDAD
 *   - Retomable: cada paso queda guardado. Si la app se cierra, vuelve
 *     al mismo paso (y despues del si, nunca antes del festejo).
 *   - Ensayo (director) y repeticion (diario): el mismo recorrido sin
 *     guardar nada.
 *   - Pantalla encendida y audio aunque el switch de silencio este
 *     puesto (despierto.js).
 */

import { FINAL } from "./config.js";
import { arte } from "./arte.js";
import { escribir, conNombre } from "./dialogo.js";
import { todasLasFotos, cantidadDeFotos } from "./camara.js";
import { LUGARES, NPCS, distanciaMetros, wgsAGcj } from "./mundo.js";
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
import { arteDeLugar, spriteCara } from "./render.js";
import * as Personaje from "./personaje.js";
import { lanzarPregunta } from "./pregunta.js";

const CLAVE = "mochi_final";

// fase: "dormido" | "armado" | "pedido" | "en_curso" | "si"
// v35: videos = ids de TODAS las grabaciones de la secuencia de verdad (en
// orden; si una llamada corta la camara o la app se reabre, hay varias);
// videoDelSi = la que estaba grabando cuando ella toco el corazon (la
// principal). Los videos se buscan por id: nunca "el ultimo".
const ESTADO_INICIAL = { fase: "dormido", paso: 0, terminado: false, pedidoEn: null, empezoEn: null, siEn: null, armadoAutoHecho: false, videos: [], videoDelSi: null };
let estado = { ...ESTADO_INICIAL };
let ctx = null;
let sesion = null;

// ------------------------------------------------------------------
// Estado persistente
// ------------------------------------------------------------------

function cargarEstado() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo) {
      const leido = JSON.parse(crudo);
      // guardados de la version con QR ("encontrado") -> "en_curso"
      if (leido.fase === "encontrado") leido.fase = "en_curso";
      estado = { ...estado, ...leido };
    }
  } catch (e) {
    /* default */
  }
}

function guardarEstado() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado));
  } catch (e) {
    /* nada */
  }
}

export function estadoParaGuardar() {
  return { ...estado };
}

export function restaurarDesdeGuardado(desdeBackup, { forzar = false } = {}) {
  if (!desdeBackup || typeof desdeBackup !== "object") return;
  let propio = null;
  try {
    propio = localStorage.getItem(CLAVE);
  } catch (e) {
    /* nada */
  }
  // forzar: al importar un backup a mano, lo del backup manda (si no, se
  // perderia el "si" al pasarse a un telefono nuevo)
  if (!propio || forzar) {
    estado = { ...estado, ...desdeBackup };
    guardarEstado();
  }
}

export const fase = () => estado.fase;
export const armada = () => estado.fase === "armado";
export const fotoPedida = () => estado.fase === "pedido";
export const dijoQueSi = () => estado.fase === "si";
export const fechaDelSi = () => estado.siEn;

export function armar() {
  if (["si", "en_curso"].includes(estado.fase)) return;
  estado.fase = "armado";
  estado.paso = 0;
  guardarEstado();
}

export function desarmar() {
  if (["si", "en_curso"].includes(estado.fase)) return;
  estado.fase = "dormido";
  guardarEstado();
}

export function reiniciarTodo() {
  // v35: si ya habia un si, los ids de ese video no se pierden (por las
  // dudas: el video del si nunca puede quedar inalcanzable)
  const conservar = estado.fase === "si" ? { videos: estado.videos || [], videoDelSi: estado.videoDelSi || null } : {};
  if (sesion && !sesion.ensayo) cortarSesion();
  Grabacion.detener();
  estado = { ...ESTADO_INICIAL, videos: [], armadoAutoHecho: estado.armadoAutoHecho, ...conservar };
  guardarEstado();
}

/** Arma sola la busqueda a partir de config.armarDesde (una sola vez). */
export function revisarArmadoPorFecha(ahora = Date.now()) {
  if (!FINAL.armarDesde || estado.armadoAutoHecho || estado.fase !== "dormido") return false;
  const t = Date.parse(FINAL.armarDesde);
  if (Number.isNaN(t) || ahora < t) return false;
  estado.armadoAutoHecho = true;
  armar();
  return true;
}

/** Con la busqueda armada: ¿ya es hora de pedir la foto aunque no haya GPS? */
export function tocaPedirSinGPS(ahora = Date.now()) {
  if (estado.fase !== "armado" || !FINAL.pedirSinGPSDesde) return false;
  const t = Date.parse(FINAL.pedirSinGPSDesde);
  return !Number.isNaN(t) && ahora >= t;
}

/**
 * Distancia en metros al lugar del final (para el GPS y el modo director).
 * v35: tolera el "corrimiento chino" (GCJ-02) en los dos sentidos, como
 * mundo.js: el telefono puede dar la posicion corrida, o las coordenadas de
 * config.js pueden venir de un mapa chino. Vale la menor.
 */
export function distanciaAlLugar(lat, lon) {
  const { lat: llat, lon: llon } = FINAL.lugar;
  const d = [distanciaMetros(lat, lon, llat, llon)];
  try {
    const [glat, glon] = wgsAGcj(llat, llon); // el lugar corrido (posicion en GCJ)
    d.push(distanciaMetros(lat, lon, glat, glon));
    const [plat, plon] = wgsAGcj(lat, lon); // la posicion corrida (lugar en GCJ)
    d.push(distanciaMetros(plat, plon, llat, llon));
  } catch (e) {
    /* con la de siempre alcanza */
  }
  return Math.min(...d.filter(Number.isFinite));
}

// v35: cuanto de la imprecision del GPS cuenta a favor. Antes eran 300 m
// (con el radio de 1.8 km, cualquier punto de la costa del lago); ahora
// como mucho 100 m.
export const HOLGURA_GPS_MAX = 100;

/** ¿Esa posicion (con su precision en metros) cuenta como "en el lugar"? */
export function dentroDelLugar(lat, lon, precision = 0) {
  return distanciaAlLugar(lat, lon) - Math.min(Math.max(0, precision || 0), HOLGURA_GPS_MAX) <= FINAL.lugar.radioMetros;
}

/**
 * Llamar con cada posicion GPS. true si justo ahora corresponde pedir la foto.
 * Solo con la busqueda ARMADA: sin armar, el GPS nunca dispara nada (rom
 * la arranca a mano desde el director).
 */
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

/** true si al abrir la app hay que retomar la secuencia a medias. */
export function hayQueRetomar() {
  return (estado.fase === "en_curso" || estado.fase === "si") && !estado.terminado;
}

// ------------------------------------------------------------------
// Contexto de main.js
// ------------------------------------------------------------------

/**
 * ctx = { pantalla, datos(), prepararVista(nombre), abrirLente(opts),
 *         volverACasa(), abrirDirector(), guardarTodo() }
 */
export function iniciar(contexto) {
  ctx = contexto;
  cargarEstado();
  if (!iniciado) {
    iniciado = true;
    // v35: al volver a primer plano (despues de una llamada, por ejemplo),
    // si la grabacion se corto, se vuelve a grabar
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") setTimeout(vigilarGrabacion, 600);
    });
    engancharSalidaEscondida();
  }
}
let iniciado = false;

// ------------------------------------------------------------------
// v35: la salida escondida. Una vez pedida la foto o empezada la
// secuencia no habia forma de llegar al director. Ahora: mantener
// apretada la esquina de arriba a la derecha 3 segundos -> el PIN.
// (Ella nunca lo va a hacer por accidente: es un rincon vacio y hay
// que quedarse quieto 3 s.)
// ------------------------------------------------------------------

const MS_SALIDA = 3000;
const ESQUINA_PX = 76;

function salidaDisponible() {
  if (!ctx) return false;
  if (ctx.pantalla.querySelector(".lente")) return false; // (con la camara abierta, no: quedaria prendida)
  if (sesion) return !sesion.repeticion; // la secuencia (de verdad o ensayo)
  return !!ctx.pantalla.querySelector("#escena-pedido, #final-retomar"); // el pedido de la foto
}

function engancharSalidaEscondida() {
  let timer = 0;
  let inicio = null;
  const cancelar = () => {
    clearTimeout(timer);
    timer = 0;
    inicio = null;
  };
  window.addEventListener(
    "pointerdown",
    (e) => {
      cancelar();
      if (!salidaDisponible()) return;
      if (e.clientX < window.innerWidth - ESQUINA_PX || e.clientY > ESQUINA_PX) return;
      inicio = { x: e.clientX, y: e.clientY };
      timer = setTimeout(() => {
        timer = 0;
        inicio = null;
        if (!salidaDisponible()) return;
        tragarProximoToque();
        vibrar(40);
        irAlDirectorEscondido();
      }, MS_SALIDA);
    },
    { passive: true, capture: true },
  );
  window.addEventListener(
    "pointermove",
    (e) => {
      if (inicio && Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) > 24) cancelar();
    },
    { passive: true, capture: true },
  );
  window.addEventListener("pointerup", cancelar, { passive: true, capture: true });
  window.addEventListener("pointercancel", cancelar, { passive: true, capture: true });
}

/** El "click" de cuando se suelta el dedo no puede caer en el teclado del PIN. */
function tragarProximoToque() {
  // (solo un toque en la misma esquina: los del teclado del PIN pasan)
  const tragar = (e) => {
    if (e.clientX < window.innerWidth - ESQUINA_PX * 1.5 || e.clientY > ESQUINA_PX * 1.5) return;
    e.stopPropagation();
    e.preventDefault();
    window.removeEventListener("click", tragar, { capture: true });
  };
  window.addEventListener("click", tragar, { capture: true });
  setTimeout(() => window.removeEventListener("click", tragar, { capture: true }), 1500);
}

function irAlDirectorEscondido() {
  const ensayo = !!(sesion && sesion.ensayo);
  if (ensayo) {
    // el ensayo se termina aca (sin guardar nada)
    Grabacion.detener();
    cortarSesion();
    Musica.detener(0.4);
    Despierto.soltar();
    ctx.abrirPin();
    return;
  }
  // lo de verdad queda en pausa: la grabacion sigue (si rom vuelve sin
  // tocar nada, la secuencia sigue desde el mismo paso)
  cortarSesion();
  Musica.detener(0.4);
  ctx.abrirPin({ alSalir: retomarDespuesDelDirector });
}

/**
 * Al salir del director (o del PIN) con el final a medias: se vuelve a
 * donde estaba. true si se encargo; false si no habia nada que retomar.
 */
export function retomarDespuesDelDirector() {
  if (!ctx) return false;
  if (hayQueRetomar()) {
    pantallaRetomar(); // (con su toque: pantalla, audio y microfono)
    return true;
  }
  if (estado.fase === "pedido") {
    abrirPedido();
    return true;
  }
  return false;
}

/**
 * v35: "Pause: back to armed" del director. Del pedido o de la secuencia
 * vuelve a ARMADO: corta la grabacion con cuidado (lo grabado queda, con
 * su id anotado) y no muestra nada. Despues del si no hace nada.
 */
export async function pausar() {
  if (!["pedido", "en_curso"].includes(estado.fase)) return false;
  const s = sesion;
  if (s && !s.ensayo) cortarSesion();
  await Grabacion.detener().catch(() => null);
  Musica.detener(0.4);
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
  return (m && m.nombre) || "";
}

const t = (texto) => conNombre(texto, nombreDeElla());

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

const CARAS = {
  euforico: ["ojo_especial_euforico.png", "boca_especial_euforico.png"],
  enamorado: ["ojo_especial_enamorado.png", "boca_especial_enamorado.png"],
  feliz: ["ojo_base_energia_alta.png", "boca_base_feliz.png"],
};

function cara(nombre) {
  const [ojo, boca] = CARAS[nombre] || CARAS.feliz;
  return spriteCara(ojo, boca);
}

// ------------------------------------------------------------------
// 0. El pedido de la foto (dentro del aparato, voz de Baozi)
// ------------------------------------------------------------------

/**
 * Baozi pide la selfie. Se llama cuando el GPS la ubica en el lago (o
 * por el respaldo), y cada vez que se abre la app mientras el pedido
 * este pendiente.
 */
export function abrirPedido({ ensayo = false } = {}) {
  // (si volvio de la selfie sin sacarla, el microfono no queda abierto)
  Grabacion.soltarMicrofono();
  ctx.prepararVista("intro");
  if (!ensayo) marcarPedido();
  Sonido.sonar("descubrimiento");
  vibrar([30, 50, 30]);
  const lineas = FINAL.pedido.map(t).filter(Boolean);
  let i = 0;
  let escritor = null;

  ctx.pantalla.innerHTML = `
    <div class="escena-dialogo escena-lago" id="escena-pedido">
      ${ensayo ? `<div class="sello-ensayo">REHEARSAL</div>` : ""}
      <div class="dialogo-cara rebote">${cara("euforico")}</div>
      <div class="caja-dialogo">
        <div class="caja-dialogo-nombre">${Personaje.nombre().toUpperCase()}</div>
        <div class="caja-dialogo-texto" id="pedido-texto"></div>
        <div class="caja-dialogo-siguiente" id="pedido-siguiente"><i class="glifo g-der"></i></div>
        <div class="caja-dialogo-acciones oculto" id="pedido-acciones">
          <button class="boton" id="pedido-abrir"><i class="glifo g-camara"></i> Take the photo</button>
        </div>
      </div>
    </div>`;

  const texto = ctx.pantalla.querySelector("#pedido-texto");
  const sig = ctx.pantalla.querySelector("#pedido-siguiente");
  const acciones = ctx.pantalla.querySelector("#pedido-acciones");

  const mostrar = () => {
    sig.classList.add("oculto");
    escritor = escribir(texto, lineas[i] || "", {
      alTerminar: () => {
        if (i >= lineas.length - 1) acciones.classList.remove("oculto");
        else sig.classList.remove("oculto");
      },
    });
  };

  ctx.pantalla.querySelector("#escena-pedido").addEventListener("click", (e) => {
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
  });
  const abrir = ctx.pantalla.querySelector("#pedido-abrir");
  abrir.addEventListener("click", () => {
    // v35: un solo toque cuenta (un doble toque pedia dos veces el microfono)
    if (abrir.disabled) return;
    abrir.disabled = true;
    Despierto.mantener(); // dentro del toque: es cuando iOS lo permite
    // v21: antes de la secuencia, revisar camara + microfono para el video
    // (si faltan, se piden ahora, en el toque). Pase lo que pase, sigue:
    // v35: con tope de 8 s (si iOS no contesta, sigue sin video).
    Grabacion.asegurarPermisos()
      .catch(() => false)
      .then(() => {
        if (ctx.pantalla.contains(abrir)) abrirSelfie({ ensayo });
      });
  });
  mostrar();
}

function abrirSelfie({ ensayo }) {
  Musica.precargar("propuesta");
  ctx.abrirLente({
    modo: "pedido",
    frontal: true,
    ensayo,
    titulo: "US",
    alSalir: () => {
      // Se arrepintio o apreto volver: el pedido sigue en pie.
      if (ensayo) ctx.abrirDirector();
      else abrirPedido();
    },
    alGuardar: (foto) => {
      if (!ensayo) {
        const { diario } = ctx.datos();
        if (diario) diario.anotarFoto();
      }
      empezar({ ensayo, selfie: foto && foto.dataUrl });
    },
  });
}

/** La selfie ya se revelo: arranca la secuencia. */
export function empezar({ ensayo = false, selfie = null } = {}) {
  if (!ensayo) {
    estado.fase = "en_curso";
    estado.paso = 0;
    estado.terminado = false;
    estado.empezoEn = Date.now();
    guardarEstado();
    ctx.guardarTodo();
  }
  iniciarSecuencia({ ensayo, desde: 0, selfie });
}

// ------------------------------------------------------------------
// La secuencia
// ------------------------------------------------------------------

function construirPasos({ repeticion = false } = {}) {
  const pasos = [
    { tipo: "ventana" },
    { tipo: "mapa" },
    { tipo: "llegada" },
    { tipo: "ella" },
    { tipo: "el" },
    { tipo: "dialogo" },
    ...(String(FINAL.pregunta || "").trim() ? [{ tipo: "pregunta" }] : []),
    { tipo: "mirar" },
    { tipo: "corazon" },
    { tipo: "celebracion" },
    { tipo: "foto" },
    { tipo: "fin" },
  ];
  return repeticion ? pasos.filter((p) => p.tipo !== "foto") : pasos;
}

export function iniciarSecuencia({ ensayo = false, desde = null, repeticion = false, selfie = null } = {}) {
  const pasos = construirPasos({ repeticion });
  let i = desde ?? estado.paso ?? 0;
  i = Math.max(0, Math.min(pasos.length - 1, i));
  if (!ensayo && !repeticion && estado.fase === "si") {
    i = Math.max(i, pasos.findIndex((p) => p.tipo === "celebracion"));
  }
  if (sesion) cortarSesion();
  Despierto.mantener();
  sesion = { pasos, i, ensayo: ensayo || repeticion, repeticion, selfie, escritor: null, timers: [], bloqueadoHasta: 0 };
  // v21: el video del momento (camara frontal + audio, sin filtro). Tambien
  // en el ensayo, para que rom lo pruebe. Si se retoma, se graba de nuevo
  // desde ahi (v35: como OTRO video, anotado aparte: el del si nunca se
  // reemplaza). Hasta la foto con el anillo o el final.
  const pasoActual = pasos[i] && pasos[i].tipo;
  if (!repeticion && !["foto", "fin"].includes(pasoActual)) grabar(sesion);
  // v35: si la grabacion se corta sola (una llamada, el tope de 20 min), se reintenta
  if (!sesion.ensayo) sesion.vigia = setInterval(vigilarGrabacion, 5000);
  ctx.prepararVista("final");
  mostrarPaso();
}

/** Empieza a grabar para esta sesion; en la de verdad, anota el id del video. */
function grabar(s) {
  return Grabacion.empezar({
    ensayo: s.ensayo,
    alEmpezar: (id) => {
      if (s.ensayo) return;
      const lista = Array.isArray(estado.videos) ? estado.videos : [];
      if (!lista.includes(id)) estado.videos = [...lista, id];
      guardarEstado();
    },
  }).catch(() => false);
}

/**
 * v35: en la secuencia de verdad, antes de la foto con el anillo, tiene que
 * estar grabando. Si no (una llamada corto la camara, se volvio de segundo
 * plano), se arranca otra grabacion. Solo si la camara ya se abrio bien
 * alguna vez: un reintento nunca le muestra a ella un cartel de permisos.
 */
function vigilarGrabacion() {
  const s = sesion;
  if (!s || s.ensayo || document.visibilityState !== "visible") return;
  const iFoto = s.pasos.findIndex((p) => p.tipo === "foto");
  if (iFoto >= 0 && s.i >= iFoto) return;
  if (Grabacion.grabando() || !Grabacion.camaraConcedida()) return;
  grabar(s);
}

/**
 * v35: al abrir la app con el final a medias, ya no arranca solo: primero
 * "Tap to continue ♥". En ese toque (el unico momento en que iOS deja):
 * pantalla encendida, audio, microfono; y recien ahi sigue la secuencia.
 */
export function pantallaRetomar() {
  if (sesion) cortarSesion();
  ctx.prepararVista("final");
  ctx.pantalla.innerHTML = `
    <div class="final cine es-retomar" id="final-retomar" style="cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center">
      <div class="corazon-grande"><img src="${arte("final/corazon_rosa.png")}" alt="" draggable="false" /></div>
      <div class="texto-cine" id="retomar-texto" style="font-size:28px;margin-top:18px">Tap to continue ♥</div>
    </div>`;
  const pantalla = ctx.pantalla.querySelector("#final-retomar");
  let tocado = false;
  pantalla.addEventListener("click", () => {
    if (tocado) return;
    tocado = true;
    Despierto.mantener(); // dentro del toque
    Sonido.sonar("tocar"); // (despierta el audio de la pagina dentro del toque)
    const texto = pantalla.querySelector("#retomar-texto");
    if (texto) texto.textContent = "♥";
    const pasos = construirPasos();
    let i = Math.max(0, Math.min(pasos.length - 1, estado.paso || 0));
    if (estado.fase === "si") i = Math.max(i, pasos.findIndex((p) => p.tipo === "celebracion"));
    const vaAGrabar = !["foto", "fin"].includes(pasos[i] && pasos[i].tipo);
    // el microfono (y la camara) se piden aca adentro; con tope, nunca traba
    const listo = vaAGrabar ? Grabacion.asegurarPermisos().catch(() => false) : Promise.resolve(false);
    listo.then(() => {
      if (ctx.pantalla.contains(pantalla)) iniciarSecuencia({});
    });
  });
}

/**
 * v35: "Start the sequence now" del director (rom la va a arrancar asi, en
 * el telefono de ella). Todo dentro de ese toque: pantalla encendida, audio,
 * microfono + camara (con tope) y recien despues la secuencia.
 */
export function empezarYa() {
  Despierto.mantener(); // dentro del toque
  Sonido.sonar("tocar");
  Musica.precargar("propuesta");
  return Grabacion.asegurarPermisos()
    .catch(() => false)
    .then(() => empezar({}));
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
  for (const k of ["escena", "pieza", "mapa"]) {
    if (sesion[k]) {
      sesion[k].destruir();
      sesion[k] = null;
    }
  }
}

function programar(fn, ms) {
  const s = sesion;
  const tm = setTimeout(() => {
    if (sesion === s) fn();
  }, ms);
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
    sesion.efectoPregunta.destruir();
    sesion.efectoPregunta = null;
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
  vigilarGrabacion(); // v35: ¿se corto el video? (solo en la de verdad, antes de la foto)
  const trasElSi = ["celebracion", "foto", "fin"].includes(paso.tipo);
  // en el cuarto, silencio (solo el toc toc); la musica arranca con el mapa
  if (paso.tipo === "ventana") Musica.detener(0.4);
  else Musica.tocar(trasElSi ? "si" : "propuesta", { forzar: FINAL.musicaIgnoraSilencio });
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
    fin: pasoFin,
  })[paso.tipo]();
}

/** Escenario comun: negro, con la escena pixel centrada. */
function escenario(interior, clase = "") {
  soltarEscena();
  ctx.pantalla.innerHTML = `
    <div class="final cine ${clase}" id="final-cine">
      ${sesion.ensayo && !sesion.repeticion ? `<div class="sello-ensayo">REHEARSAL</div>` : ""}
      ${interior}
    </div>`;
  sesion.bloqueadoHasta = performance.now() + 500;
  return ctx.pantalla.querySelector("#final-cine");
}

/** Boton a prueba de doble toque. */
function alTocar(el, fn) {
  el.addEventListener("click", (e) => {
    if (!sesion || performance.now() < sesion.bloqueadoHasta) return;
    if (el.disabled) return;
    el.disabled = true;
    fn(e);
    setTimeout(() => (el.disabled = false), 800);
  });
}

// 0a. LA VENTANA: su mascota en el cuarto; golpea la otra ------------
//
// El cuarto de siempre (pieza.js) con un guion: la otra mascota se asoma
// a la ventana y la invita a pasear. Un dialogo cortito que avanza solo
// (o con un toque).

const CARA_PIEZA = {
  normal: ["ojo_base_energia_alta.png", "boca_base_feliz.png"],
  sorprendido: ["ojo_especial_sorprendido.png", "boca_especial_sorprendido.png"],
  curioso: ["ojo_especial_curioso.png", "boca_especial_curioso.png"],
  euforico: ["ojo_especial_euforico.png", "boca_especial_euforico.png"],
  enamorado: ["ojo_especial_enamorado.png", "boca_especial_enamorado.png"],
};

function otraMascota() {
  return Personaje.actual() === "mantou" ? "baozi" : "mantou";
}

/** v35: lo del atardecer solo cuando de verdad es la hora (16 a 19 h). */
export function lineaDelLago(hora = new Date().getHours()) {
  return hora >= 16 && hora < 19 ? "The sun is going down over the lake…" : "The lake looks so pretty right now…";
}

function lineasVentana() {
  const suya = Personaje.nombre();
  const otra = Personaje.nombre(otraMascota());
  return [
    { quien: otra, texto: "Knock knock! It's me!", cara: "curioso" },
    { quien: otra, texto: lineaDelLago(), cara: "curioso" },
    { quien: otra, texto: "Shall we go for a walk? Just the two of us ♥", cara: "enamorado" },
    { quien: suya, texto: "Yes!! Let's go!", cara: "euforico" },
  ];
}

function pasoVentana() {
  const cine = escenario(
    `<div class="ventana-cuarto" id="ventana-cuarto"></div>
     <div class="capa-paso">
       <div class="caja-dialogo cine-dialogo oculto" id="ventana-caja">
         <div class="caja-dialogo-nombre" id="ventana-quien"></div>
         <div class="caja-dialogo-texto" id="ventana-texto"></div>
         <div class="caja-dialogo-siguiente oculto" id="ventana-sig"><i class="glifo g-der"></i></div>
       </div>
     </div>`,
    "es-ventana",
  );
  const guion = { npc: null, npcArte: null, cara: "normal", globo: "" };
  const base = ctx.estadoPieza ? ctx.estadoPieza : () => ({ momento: "dia" });
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
        ojos,
        boca,
        npc: guion.npc,
        npcArte: guion.npcArte,
        globo: guion.globo,
        globoRosa: false,
      };
    },
    alTocar: () => {},
  });
  // (el cuarto de la casa sigue siendo el unico #pieza de la app)
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
        timer = setTimeout(() => {
          if (sesion === s) siguiente();
        }, Math.max(2600, 1200 + l.texto.length * 55));
        s.timers.push(timer);
      },
    });
  };

  // toc toc: llega la otra mascota, la suya se sorprende y va a la ventana
  programar(() => {
    guion.npc = `pareja_${otraMascota()}`;
    guion.npcArte = `final/ventana_${otraMascota()}.png`;
    guion.cara = "sorprendido";
    guion.globo = "!";
    Sonido.sonar("encuentro");
    vibrar(30);
    sesion.pieza.plan("visita");
  }, 1800);
  programar(() => {
    guion.globo = "";
    siguiente();
  }, 1800 + 3600);

  cine.querySelector(".capa-paso").addEventListener("click", () => {
    if (!sesion || performance.now() < sesion.bloqueadoHasta || i < 0) return;
    if (sesion.escritor && sesion.escritor.escribiendo()) sesion.escritor.completar();
    else siguiente();
  });
}

// 0b. EL MAPA: de casa al lago, y zoom a West Lake -------------------

function pasoMapa() {
  const cine = escenario(
    `<div class="mundo-lago" id="mundo-mapa"></div>
     <div class="bandas-cine" aria-hidden="true"></div>
     <div class="rotulo-mapa oculto" id="rotulo-mapa">West Lake</div>
     <div class="velo-salida" id="velo-mapa"></div>`,
    "es-mapa",
  );
  const lugar = FINAL.lugar || {};
  const destino = Number.isFinite(lugar.lat) && Number.isFinite(lugar.lon) ? posicionEnMapa(lugar.lat, lugar.lon) : { x: 0.44, y: 0.47 };
  sesion.mapa = crearMapaFinal(cine.querySelector("#mundo-mapa"), { casa: { x: 0.8, y: 0.3 }, destino });
  const RECORRIDO = 3600;
  const ZOOM = 3800;
  sesion.mapa.recorrer(RECORRIDO);
  programar(() => sesion.mapa.acercar(ZOOM), RECORRIDO - 400);
  programar(() => {
    const r = cine.querySelector("#rotulo-mapa");
    r.textContent = lugar.nombre || "West Lake";
    r.classList.remove("oculto");
  }, RECORRIDO - 400 + ZOOM - 600);
  programar(() => cine.querySelector("#velo-mapa").classList.add("cerrando"), RECORRIDO - 400 + ZOOM + 1800);
  programar(avanzar, RECORRIDO - 400 + ZOOM + 2700);
}

// 1-3. EL LAGO: un solo plano continuo ---------------------------------
//
// Llegada, ella, el y el dialogo comparten el MISMO mundo (escena.js):
// entre paso y paso no se corta nada, solo se mueve la camara. Si la app
// se reabre en el medio, el mundo se arma de nuevo con el bote ya
// adentro y la camara vuela al plano de ese paso.

function escenaDelLago(tipo, { boteAfuera = false, plano = "general" } = {}) {
  const cine = ctx.pantalla.querySelector("#final-cine.es-lago");
  if (cine && sesion.escena && sesion.escena.vivo()) {
    cine.className = `final cine es-lago es-${tipo}`;
    cine.querySelectorAll(".capa-paso").forEach((n) => n.remove());
    sesion.bloqueadoHasta = performance.now() + 500;
    // si se adelanto con un toque, quien ya paso queda como persona
    if (tipo !== "llegada" && tipo !== "ella") sesion.escena.forzar("ella");
    if (tipo !== "llegada" && tipo !== "ella" && tipo !== "el") sesion.escena.forzar("el");
    return { cine, escena: sesion.escena };
  }
  const nuevo = escenario(
    `<div class="mundo-lago" id="mundo-lago"></div>
     <div class="bandas-cine" aria-hidden="true"></div>`,
    `es-lago es-${tipo}`,
  );
  // el bote arranca con las dos mascotas (Mantou es ella, Baozi es el); cada una se vuelve persona
  // cuando la camara llega a su cara (si se retoma despues, ya lo son)
  const formas = { ella: !["llegada", "ella"].includes(tipo), el: !["llegada", "ella", "el"].includes(tipo) };
  sesion.escena = crearEscena(nuevo.querySelector("#mundo-lago"), { ojosElla: FINAL.ojosDeElla, boteAfuera, plano, formas });
  return { cine: nuevo, escena: sesion.escena };
}

function capa(cine, html) {
  const d = document.createElement("div");
  d.className = "capa-paso";
  d.innerHTML = html;
  cine.appendChild(d);
  return d;
}

function pasoLlegada() {
  const { cine, escena } = escenaDelLago("llegada", { boteAfuera: true });
  escena.mover("general", 0);
  // la selfie recien sacada se funde en el lago
  if (sesion.selfie) capa(cine, `<img class="selfie-que-se-funde" src="${sesion.selfie}" alt="" />`);
  programar(() => escena.entrarBote(5600), 900);
  programar(() => escena.mover("pareja", 2600), 900 + 5000);
  programar(avanzar, 900 + 5000 + 2900);
}

// La camara entra a la cara de la mascota de ella y ahi se transforma en
// ella; despues pasa a la otra mascota, que se transforma en el.
const MS_TRANSFORMAR = 1600;
function pasoEnfoque(quien) {
  const { escena } = escenaDelLago(quien);
  const viaje = quien === "ella" ? 2600 : 1900;
  const antes = 700; // un momento mirando a la mascota antes del cambio
  const quieto = quien === "ella" ? 3000 : 2800;
  escena.mover(quien, viaje);
  programar(() => {
    Sonido.sonar("hallazgo");
    escena.transformar(quien, MS_TRANSFORMAR);
  }, viaje + antes);
  escena.parpadear(quien, viaje + antes + MS_TRANSFORMAR + 900);
  programar(avanzar, viaje + antes + MS_TRANSFORMAR + quieto);
}

// 3. su dialogo mientras pasan las fotos -------------------------------

function recuerdos() {
  const fotos = todasLasFotos();
  if (fotos.length) {
    const max = 40;
    let elegidas = fotos;
    if (fotos.length > max) elegidas = Array.from({ length: max }, (_, k) => fotos[Math.round((k * (fotos.length - 1)) / (max - 1))]);
    return elegidas.map((f) => ({ src: f.dataUrl, pie: f.dia ? fechaCorta(f.dia) : "" }));
  }
  const { lugaresReg, npcsReg } = ctx.datos();
  const lista = [];
  for (const l of LUGARES) if (lugaresReg && lugaresReg.desbloqueados.has(l.id)) lista.push({ src: arteDeLugar(l.id), pie: l.nombre });
  for (const n of NPCS) if (npcsReg && (npcsReg.vecesEncontrado[n.id] || 0) > 0) lista.push({ src: arte(`npcs/npc_${n.id}_saludo.png`), pie: n.nombre, retrato: true });
  return lista;
}


/** "SEP 23": entra en el pie de una polaroid chica. */
function fechaCorta(clave) {
  const [y, m, d] = clave.split("-").map(Number);
  return `${new Date(y, m - 1, d).toLocaleString("en-US", { month: "short" }).toUpperCase()} ${d}`;
}

// Cada linea se queda el doble de lo que tarda una lectura tranquila
// (minimo 7 s): ella esta emocionada, y vos al lado. Tocar adelanta.
const MS_POR_LETRA = 45;

function msDeLectura(texto) {
  const palabras = texto.split(/\s+/).filter(Boolean).length;
  return Math.max(7000, 2 * (1400 + palabras * 380));
}

/** Cuanto dura el dialogo entero si nadie toca (para repartir las fotos). */
function duracionDelDialogo(lineas) {
  return lineas.reduce((total, l) => total + l.length * MS_POR_LETRA + msDeLectura(l), 0);
}

/** Las lineas de rom. Las de relleno ("TODO…") solo se ven en el ensayo. */
function lineasDeLaCarta(ensayo) {
  return FINAL.carta
    .map(t)
    .filter(Boolean)
    .filter((l) => ensayo || !esRelleno(l));
}
const esRelleno = (l) => /^\s*TODO/i.test(l);

function pasoDialogo() {
  const lineas = lineasDeLaCarta(sesion.ensayo && !sesion.repeticion);
  const fotos = recuerdos();
  const nombre = (FINAL.nombreDeEl || "").trim();
  const { cine, escena } = escenaDelLago("dialogo");
  const duracion = duracionDelDialogo(lineas);
  // las fotos se reparten a lo largo de todo el dialogo (ni corren ni se amontonan)
  const msPorFoto = fotos.length && lineas.length ? Math.min(7000, Math.max(3400, duracion / fotos.length)) : 3400;
  escena.mover("dialogo", 2200, () => escena.mover("dialogo-cerca", Math.max(30000, duracion), null, (x) => x));
  const capaDialogo = capa(
    cine,
    `
    <div class="mesa-fotos" id="mesa-fotos"></div>
    ${
      lineas.length
        ? `<div class="caja-dialogo cine-dialogo">
             ${nombre ? `<div class="caja-dialogo-nombre">${esc(nombre.toUpperCase())}</div>` : ""}
             <div class="caja-dialogo-texto" id="dialogo-texto"></div>
             <div class="caja-dialogo-siguiente oculto" id="dialogo-siguiente"><i class="glifo g-der"></i></div>
           </div>`
        : ""
    }`,
  );

  // Las fotos corren solas, a su ritmo, de principio a fin.
  const mesa = cine.querySelector("#mesa-fotos");
  let k = 0;
  let fotosTerminadas = fotos.length === 0;
  let lineasTerminadas = lineas.length === 0;
  let saliendo = false;
  const quizasSeguir = () => {
    if (fotosTerminadas && lineasTerminadas && !saliendo) {
      saliendo = true;
      programar(avanzar, 2200);
    }
  };
  const soltarFoto = () => {
    if (k >= fotos.length) {
      fotosTerminadas = true;
      quizasSeguir();
      return;
    }
    const r = fotos[k];
    const fig = document.createElement("figure");
    fig.className = `polaroid-final ${r.retrato ? "retrato" : ""}`;
    fig.style.setProperty("--giro", `${(Math.random() * 10 - 5).toFixed(1)}deg`);
    fig.style.setProperty("--dx", `${Math.round(Math.random() * 30 - 15)}px`);
    fig.style.setProperty("--dy", `${Math.round(Math.random() * 14 - 7)}px`);
    fig.innerHTML = `<img src="${r.src}" alt="" draggable="false" /><figcaption>${esc(r.pie)}</figcaption>`;
    mesa.appendChild(fig);
    while (mesa.children.length > 6) mesa.removeChild(mesa.firstChild);
    k += 1;
    programar(soltarFoto, msPorFoto);
  };
  programar(soltarFoto, 2000);

  // Su dialogo, linea por linea: avanza solo al ritmo de lectura, o con un toque.
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
          timerLinea = setTimeout(() => {
            if (sesion === s) siguienteLinea();
          }, msDeLectura(lineas[i]));
          s.timers.push(timerLinea);
        },
      });
    };
    capaDialogo.addEventListener("click", () => {
      if (!sesion || performance.now() < sesion.bloqueadoHasta) return;
      if (sesion.escritor && sesion.escritor.escribiendo()) sesion.escritor.completar();
      else if (!lineasTerminadas) siguienteLinea();
    });
    programar(mostrarLinea, 2400);
  } else {
    quizasSeguir();
  }
}

// 3b. la pregunta, escrita en el cielo -----------------------------------

function pasoPregunta() {
  const { cine, escena } = escenaDelLago("pregunta");
  escena.hablar("el", false);
  escena.mover("general", 3600);
  const c = capa(cine, `<div class="velo-cielo"></div>`);
  let efecto = null;
  const empezarEfecto = () => {
    efecto = lanzarPregunta(c, t(FINAL.pregunta), {
      estilo: FINAL.preguntaEstilo,
      // ya escrita: queda en el cielo un rato largo (o hasta que ella toque)
      alFormar: () => programar(avanzar, 9000),
    });
    sesion.efectoPregunta = efecto;
  };
  programar(empezarEfecto, 1400);
  c.addEventListener("click", () => {
    if (!sesion || performance.now() < sesion.bloqueadoHasta || !efecto) return;
    efecto.completar();
  });
}

// 4. look up -----------------------------------------------------------

function pasoMirar() {
  const escribirMirar = (cine) => {
    const caja = cine.querySelector("#texto-mirar");
    sesion.escritor = escribir(caja, t(FINAL.mirarArriba), {
      velocidad: 90,
      alTerminar: () => programar(avanzar, 3400),
    });
  };
  // Si venimos del lago: la camara se aleja y el lago se apaga, sin corte.
  const lago = ctx.pantalla.querySelector("#final-cine.es-lago");
  if (lago && sesion.escena && sesion.escena.vivo()) {
    const { cine, escena } = escenaDelLago("mirar");
    escena.mover("general", 3600);
    const anterior = sesion.pasos[sesion.i - 1];
    // si venimos de la pregunta, el cielo ya esta de noche: el velo arranca oscuro (sin fogonazo)
    capa(cine, `<div class="velo-noche ${anterior && anterior.tipo === "pregunta" ? "desde-noche" : ""}"></div><div class="texto-cine" id="texto-mirar"></div>`);
    programar(() => escribirMirar(cine), 3000);
    return;
  }
  escribirMirar(escenario(`<div class="texto-cine" id="texto-mirar"></div>`, "es-mirar"));
}

// 5. el corazon (mientras el le da el anillo) --------------------------

function pasoCorazon() {
  const cine = escenario(
    `
    <div class="corazon-grande">
      <img src="${arte("final/corazon_rosa.png")}" alt="" draggable="false" />
    </div>`,
    "es-corazon",
  );
  vibrar([60, 80, 60]);
  // Se toca cuando ella quiera — nunca pasa solo. El toque es el si.
  // v35: solo un toque SOBRE el corazon (con margen generoso): rozar la
  // pantalla al recibir el anillo no cuenta.
  const bloqueo = performance.now() + 4000;
  const corazon = cine.querySelector(".corazon-grande img") || cine.querySelector(".corazon-grande");
  let hecho = false;
  cine.addEventListener("click", (e) => {
    if (!sesion || hecho || performance.now() < bloqueo) return;
    if (!tocaElCorazon(corazon, e)) return;
    hecho = true;
    dijoSi();
  });
}

/** ¿El toque cayo sobre el corazon? Margen: media vez su tamaño (y 48 px como minimo) para cada lado. */
export function tocaElCorazon(el, e) {
  if (!el || !e || typeof e.clientX !== "number") return true; // sin forma de saberlo: vale
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return true;
  const mx = Math.max(48, r.width * 0.5);
  const my = Math.max(48, r.height * 0.5);
  return e.clientX >= r.left - mx && e.clientX <= r.right + mx && e.clientY >= r.top - my && e.clientY <= r.bottom + my;
}

function dijoSi() {
  if (!sesion.ensayo && estado.fase !== "si") {
    estado.fase = "si";
    estado.siEn = Date.now();
    estado.terminado = false;
    // v35: el video principal es el que estaba grabando en este momento
    const lista = Array.isArray(estado.videos) ? estado.videos : [];
    estado.videoDelSi = Grabacion.idActual() || lista[lista.length - 1] || null;
    const { diario } = ctx.datos();
    if (diario) diario.anotarHito("The day you said yes ♥");
    ctx.guardarTodo();
  }
  vibrar([60, 40, 60, 40, 200]);
  avanzar();
}

// 6. despues del si ----------------------------------------------------

function lienzoPapel(interior, clase) {
  soltarEscena();
  ctx.pantalla.innerHTML = `
    <div class="final papel ${clase}" id="final-papel">
      ${sesion.ensayo && !sesion.repeticion ? `<div class="sello-ensayo">REHEARSAL</div>` : ""}
      ${interior}
    </div>`;
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

// v34: la carita de la celebracion (config.js) dibujada en pixel. Sus letras
// (tibetanas y japonesas) no estan en las fuentes pixel: cada celular las
// dibujaba con otra fuente, desparejas, y en algunos salian cuadraditos.
const KAOMOJI = "༼ つ ◕_◕ ༽つ";
const KAOMOJI_SVG = `<svg class="kaomoji" viewBox="0 0 50 12" role="img" aria-label="${KAOMOJI}" shape-rendering="crispEdges"><path fill="currentColor" d="M2 0h2v1h-2zM40 0h2v1h-2zM1 1h1v1h-1zM4 1h1v1h-1zM39 1h1v1h-1zM42 1h1v1h-1zM1 2h1v1h-1zM18 2h3v1h-3zM31 2h3v1h-3zM42 2h1v1h-1zM0 3h1v1h-1zM17 3h1v1h-1zM20 3h2v1h-2zM30 3h1v1h-1zM33 3h2v1h-2zM43 3h1v1h-1zM0 4h1v1h-1zM8 4h4v1h-4zM16 4h1v1h-1zM20 4h3v1h-3zM29 4h1v1h-1zM33 4h3v1h-3zM43 4h1v1h-1zM45 4h4v1h-4zM0 5h1v1h-1zM12 5h1v1h-1zM16 5h7v1h-7zM29 5h7v1h-7zM43 5h1v1h-1zM49 5h1v1h-1zM0 6h1v1h-1zM12 6h1v1h-1zM16 6h7v1h-7zM29 6h7v1h-7zM43 6h1v1h-1zM49 6h1v1h-1zM0 7h1v1h-1zM11 7h1v1h-1zM17 7h5v1h-5zM30 7h5v1h-5zM43 7h1v1h-1zM48 7h1v1h-1zM0 8h1v1h-1zM8 8h3v1h-3zM18 8h3v1h-3zM31 8h3v1h-3zM43 8h1v1h-1zM45 8h3v1h-3zM1 9h1v1h-1zM24 9h4v1h-4zM42 9h1v1h-1zM1 10h1v1h-1zM42 10h1v1h-1zM2 11h2v1h-2zM40 11h2v1h-2z"/></svg>`;
// (en config.js van con espacios duros: cualquier espacio vale)
const conKaomoji = (html) => html.replace(/༼\s*つ\s*◕_◕\s*༽\s*つ/gu, KAOMOJI_SVG);

function pasoCelebracion() {
  const [l1, l2] = (FINAL.celebracion || []).map(t);
  const papel = lienzoPapel(
    `
    <div class="final-cara salto">${cara("euforico")}</div>
    <div class="celebracion-grande">${conKaomoji(esc(l1 || "♥"))}</div>
    ${l2 ? `<div class="final-texto">${conKaomoji(esc(l2))}</div>` : ""}
    <button class="boton oculto" id="celebracion-seguir">Continue</button>`,
    "es-celebracion",
  );
  lluviaDeCorazones(papel);
  const seguir = papel.querySelector("#celebracion-seguir");
  programar(() => seguir.classList.remove("oculto"), 3500);
  alTocar(seguir, avanzar);
}

function pasoFoto() {
  const papel = lienzoPapel(
    `
    <div class="final-cara">${cara("enamorado")}</div>
    <div class="final-texto">${esc(t(FINAL.fotoConAnillo))}</div>
    <div class="fila-botones">
      <button class="boton boton-fantasma" id="foto-despues">Later</button>
      <button class="boton" id="foto-sacar"><i class="glifo g-camara"></i> Take it</button>
    </div>`,
    "es-foto",
  );
  alTocar(papel.querySelector("#foto-despues"), avanzar);
  alTocar(papel.querySelector("#foto-sacar"), () => {
    const s = sesion;
    // la camara pasa a la foto: el video se corta aca (el momento ya quedo)
    Grabacion.detener();
    ctx.abrirLente({
      modo: "foto",
      frontal: true,
      tipoFoto: "final",
      ensayo: s.ensayo,
      titulo: "US ♥",
      alGuardar: (foto) => {
        s.fotoFinal = foto && foto.dataUrl;
        const { diario } = ctx.datos();
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
      },
    });
  });
}

function pasoFin() {
  const fecha = fechaLegible(claveDelDia(new Date(estado.siEn || Date.now())));
  const finales = todasLasFotos().filter((f) => f.tipo === "final");
  const foto = sesion.fotoFinal || ((!sesion.ensayo || sesion.repeticion) && finales.length ? finales[finales.length - 1].dataUrl : null) || sesion.selfie;
  const papel = lienzoPapel(
    `
    ${
      foto
        ? `<figure class="polaroid-final dorada fija"><img src="${foto}" alt="" draggable="false" /><figcaption>${esc(fecha)}</figcaption></figure>`
        : `<div class="final-cara">${cara("enamorado")}</div><div class="final-rotulo">${esc(fecha)}</div>`
    }
    <div class="final-texto">Let's remember this day forever.</div>
    <div class="fila-botones">
      <button class="boton boton-fantasma boton-galeria oculto" id="fin-video" type="button">Save our video</button>
      <button class="boton" id="fin-casa"><i class="glifo g-corazon"></i> Home</button>
    </div>`,
    "es-fin",
  );
  alTocar(papel.querySelector("#fin-casa"), terminar);
  // v21: el video del momento, listo para guardar en la galeria (se arma
  // antes del toque: compartir tiene que salir enseguida del toque)
  if (!sesion.repeticion) {
    const s = sesion;
    const ensayo = s.ensayo;
    // v35: el de verdad se busca por id (el del si primero), nunca "el
    // ultimo": si la app se reabrio despues del si, el ultimo es un pedacito
    Grabacion.detener()
      .then(() => (ensayo ? Grabacion.ultimoVideo({ ensayo: true }).then((v) => (v ? [{ ...v, principal: true }] : [])) : videosDelSi()))
      .then((vs) => {
        const b = papel.querySelector("#fin-video");
        if (!vs || !vs.length || !b || sesion !== s) return;
        const principal = vs.find((v) => v.principal) || vs[0];
        if (ensayo) b.textContent = "Save the test video";
        b.classList.remove("oculto");
        b.addEventListener("click", () => guardarVideoEnGaleria(principal.blob, ensayo ? "ensayo-video" : "nuestro-video"));
        // los otros pedazos (si hubo), cada uno por su lado (no se pegan MP4s)
        const otros = vs.filter((v) => v !== principal);
        if (otros.length) {
          const extra = document.createElement("button");
          extra.className = "boton boton-fantasma boton-galeria";
          extra.type = "button";
          extra.id = "fin-video-otros";
          extra.textContent = otros.length === 1 ? "+1 more clip" : `+${otros.length} more clips`;
          let k = 0;
          extra.addEventListener("click", () => {
            const v = otros[k % otros.length];
            k += 1;
            guardarVideoEnGaleria(v.blob, `nuestro-video-${k + 1}`);
            if (otros.length > 1) extra.textContent = k < otros.length ? `Next clip (${k + 1}/${otros.length})` : "All clips saved ♥";
          });
          b.after(extra);
        }
      })
      .catch(() => {});
  }
}

/**
 * v35: los videos de la propuesta de verdad, en orden, cada uno
 * { id, blob, mime, empezo, termino, conAudio, picoAudio, principal, parte }.
 * principal = el que estaba grabando cuando ella dijo que si (si no se
 * sabe, el mas largo). Por id; si no hay ids anotados (un guardado viejo),
 * los que empezaron desde el arranque de la secuencia; y si tampoco, el
 * ultimo de verdad, como antes.
 */
export async function videosDelSi() {
  let lista = [];
  try {
    const ids = Array.isArray(estado.videos) ? estado.videos : [];
    lista = await Grabacion.videosPorId(ids);
    if (!lista.length && estado.empezoEn) lista = await Grabacion.videosDesde(estado.empezoEn - 60000);
    if (!lista.length) {
      const v = await Grabacion.ultimoVideo();
      if (v) lista = [v];
    }
  } catch (e) {
    return [];
  }
  lista.sort((a, b) => (a.empezo || 0) - (b.empezo || 0));
  let principal = lista.find((v) => v.id && v.id === estado.videoDelSi);
  // (el mas largo = el de mas bytes)
  if (!principal) principal = lista.reduce((m, v) => (!m || v.blob.size > m.blob.size ? v : m), null);
  return lista.map((v, k) => ({ ...v, principal: v === principal, parte: k + 1 }));
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

/** Ver el final otra vez desde el diario, sin cambiar nada. */
export function repetir() {
  iniciarSecuencia({ repeticion: true, desde: 0 });
}

// ------------------------------------------------------------------
// Modo director
// ------------------------------------------------------------------

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
    const r = await navigator.permissions.query({ name: "geolocation" });
    return r.state;
  } catch (e) {
    return "desconocido";
  }
}

export async function chequeos({ sonidoHabilitado }) {
  const persistente = await almacenamientoPersistente();
  const gps = await permisoUbicacion();
  const permisos = await Grabacion.detallePermisos();
  const video = await Grabacion.estadoPermisos();
  const txt = (e) => ({ granted: "allowed", denied: "DENIED", prompt: "not asked yet", desconocido: "unknown", "sin-soporte": "not supported" })[e] || e;
  const lineas = FINAL.carta.filter((l) => l && !esRelleno(l)).length;
  const relleno = FINAL.carta.filter((l) => l && esRelleno(l)).length;
  return [
    [camaraEnVivoPosible(), camaraEnVivoPosible() ? "Live camera available" : "No live camera here (will use the camera app)"],
    [gps === "granted", gps === "granted" ? "Location allowed" : gps === "denied" ? "Location DENIED — use 'Ask for the photo now'" : "Location not asked yet (the corkboard map asks for it)"],
    [
      video === "granted",
      video === "sin-soporte"
        ? "This browser can't record video"
        : `Video: camera ${txt(permisos.camara)}, mic ${txt(permisos.microfono)}` +
          (video === "granted" ? "" : video === "denied" ? " — allow them in the phone settings" : " — tap 'Allow camera + mic' and 'Test video (5 s)'"),
    ],
    (() => {
      // v21.2: la prueba del microfono (boton "Allow microphone")
      const p = Grabacion.ultimaPruebaMic();
      if (!p) return [false, "Mic not tested yet — tap 'Allow microphone' and talk"];
      const cuando = claveDelDia(new Date(p.t)) === claveDelDia(new Date()) ? "today" : "on another day — test again today";
      return [p.ok && cuando === "today", p.ok ? `Mic test: sound OK (${cuando})` : "Mic test FAILED — tap 'Allow microphone'"];
    })(),
    [standalone(), standalone() ? "Installed on the home screen" : "Not installed — add to home screen"],
    [persistente, persistente ? "Storage is protected" : "Storage not protected yet"],
    [true, sonidoHabilitado ? "Sound on" : "Sound off (the ending plays music anyway)"],
    [!!nombreDeElla(), nombreDeElla() ? `Her name: ${nombreDeElla()}` : "No name set"],
    [cantidadDeFotos() > 0, `Photos for the montage: ${cantidadDeFotos()}`],
    [lineas > 0 && !relleno, lineas ? `Your dialogue: ${lineas} lines${relleno ? ` (+${relleno} placeholders, only in rehearsal)` : ""}` : relleno ? `Your dialogue: only ${relleno} placeholders (they don't show on the real day)` : "Your dialogue is empty (only photos + music)"],
    [
      estado.fase !== "armado",
      `GPS trigger: ${Math.round(FINAL.lugar.radioMetros)} m around ${FINAL.lugar.nombre} (+ up to ${HOLGURA_GPS_MAX} m GPS error) — ` +
        (estado.fase === "armado" ? "ARMED: it can start by itself there" : "only works when armed. Not armed = only you can start it"),
    ],
    [FINAL.pin !== "0000", FINAL.pin !== "0000" ? "PIN changed" : "PIN is still 0000"],
    [true, "Hidden exit: hold the top-right corner 3 s (photo request or sequence) → PIN"],
    [false, "On the day: Auto-Lock → Never, Low Power off, volume up"],
  ];
}

export function descripcionFase() {
  return {
    dormido: "Not armed — only you can start it (GPS does nothing). Use 'Start the sequence now' when you're ready.",
    armado: `ARMED — when she opens Baozi within ${Math.round(FINAL.lugar.radioMetros)} m of ${FINAL.lugar.nombre}, Baozi asks for a photo of you two. Disarm to keep it manual.`,
    pedido: "Baozi already asked for the photo — waiting for her selfie.",
    en_curso: "The ending is in progress (recording). 'Pause' goes back to armed and keeps the video.",
    si: `She said yes ♥ ${estado.siEn ? fechaLegible(claveDelDia(new Date(estado.siEn))) : ""}`,
  }[estado.fase];
}
