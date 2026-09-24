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
import { LUGARES, NPCS, distanciaMetros } from "./mundo.js";
import { claveDelDia, fechaLegible } from "./diario.js";
import * as Musica from "./musica.js";
import * as Sonido from "./sonido.js";
import { vibrar } from "./actuadores.js";
import { camaraEnVivoPosible } from "./lente.js";
import * as Despierto from "./despierto.js";
import { crearEscena } from "./escena.js";
import { arteDeLugar, spriteCara } from "./render.js";
import * as Personaje from "./personaje.js";

const CLAVE = "mochi_final";

// fase: "dormido" | "armado" | "pedido" | "en_curso" | "si"
const ESTADO_INICIAL = { fase: "dormido", paso: 0, terminado: false, pedidoEn: null, empezoEn: null, siEn: null, armadoAutoHecho: false };
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
  estado = { ...ESTADO_INICIAL, armadoAutoHecho: estado.armadoAutoHecho };
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

/** Distancia en metros al lugar del final (para el GPS y el modo director). */
export function distanciaAlLugar(lat, lon) {
  return distanciaMetros(lat, lon, FINAL.lugar.lat, FINAL.lugar.lon);
}

/** Llamar con cada posicion GPS. true si justo ahora corresponde pedir la foto. */
export function posicionRecibida(lat, lon, precision = 0) {
  if (estado.fase !== "armado") return false;
  // La precision cuenta a favor: arriba del agua el GPS suele ser malo,
  // y el lago es grande — mejor pedir la foto un poco antes que nunca.
  return distanciaAlLugar(lat, lon) - Math.min(precision || 0, 300) <= FINAL.lugar.radioMetros;
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
  ctx.pantalla.querySelector("#pedido-abrir").addEventListener("click", () => {
    Despierto.mantener(); // dentro del toque: es cuando iOS lo permite
    abrirSelfie({ ensayo });
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
    { tipo: "llegada" },
    { tipo: "ella" },
    { tipo: "el" },
    { tipo: "dialogo" },
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
  ctx.prepararVista("final");
  mostrarPaso();
}

export const secuenciaEnCurso = () => !!sesion;

function cortarSesion() {
  if (!sesion) return;
  for (const tm of sesion.timers) clearTimeout(tm);
  if (sesion.escritor) sesion.escritor.cancelar();
  soltarEscena();
  sesion = null;
}

function soltarEscena() {
  if (sesion && sesion.escena) {
    sesion.escena.destruir();
    sesion.escena = null;
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
  sesion.i += 1;
  if (!sesion.ensayo) {
    estado.paso = sesion.i;
    guardarEstado();
  }
  mostrarPaso();
}

function mostrarPaso() {
  const paso = sesion.pasos[sesion.i];
  const trasElSi = ["celebracion", "foto", "fin"].includes(paso.tipo);
  Musica.tocar(trasElSi ? "si" : "propuesta", { forzar: FINAL.musicaIgnoraSilencio });
  ({
    llegada: pasoLlegada,
    ella: () => pasoEnfoque("ella"),
    el: () => pasoEnfoque("el"),
    dialogo: pasoDialogo,
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
  // por ahora los dos son personas desde el principio (las mascotas del bote vuelven cuando esten definidas)
  const formas = { ella: true, el: true };
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

// La camara entra a la cara de ella; despues se pasa a la de el.
function pasoEnfoque(quien) {
  const { escena } = escenaDelLago(quien);
  const viaje = quien === "ella" ? 2400 : 1600;
  const quieto = quien === "ella" ? 2600 : 2400;
  escena.mover(quien, viaje);
  escena.parpadear(quien, viaje + 900);
  programar(avanzar, viaje + quieto);
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

function pasoDialogo() {
  const lineas = FINAL.carta.map(t).filter(Boolean);
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
    capa(cine, `<div class="velo-noche"></div><div class="texto-cine" id="texto-mirar"></div>`);
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
  const bloqueo = performance.now() + 4000;
  cine.addEventListener("click", () => {
    if (!sesion || performance.now() < bloqueo) return;
    dijoSi();
  });
}

function dijoSi() {
  if (!sesion.ensayo && estado.fase !== "si") {
    estado.fase = "si";
    estado.siEn = Date.now();
    estado.terminado = false;
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

function pasoCelebracion() {
  const [l1, l2] = (FINAL.celebracion || []).map(t);
  const papel = lienzoPapel(
    `
    <div class="final-cara salto">${cara("euforico")}</div>
    <div class="celebracion-grande">${esc(l1 || "♥")}</div>
    ${l2 ? `<div class="final-texto">${esc(l2)}</div>` : ""}
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
    <div class="final-texto">Baozi will remember this day forever.</div>
    <button class="boton" id="fin-casa"><i class="glifo g-corazon"></i> Home</button>`,
    "es-fin",
  );
  alTocar(papel.querySelector("#fin-casa"), terminar);
}

function terminar() {
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
  const lineas = FINAL.carta.filter(Boolean).length;
  return [
    [camaraEnVivoPosible(), camaraEnVivoPosible() ? "Live camera available" : "No live camera here (will use the camera app)"],
    [gps === "granted", gps === "granted" ? "Location allowed" : gps === "denied" ? "Location DENIED — use 'Ask for the photo now'" : "Location not asked yet (the corkboard map asks for it)"],
    [standalone(), standalone() ? "Installed on the home screen" : "Not installed — add to home screen"],
    [persistente, persistente ? "Storage is protected" : "Storage not protected yet"],
    [true, sonidoHabilitado ? "Sound on" : "Sound off (the ending plays music anyway)"],
    [!!nombreDeElla(), nombreDeElla() ? `Her name: ${nombreDeElla()}` : "No name set"],
    [cantidadDeFotos() > 0, `Photos for the montage: ${cantidadDeFotos()}`],
    [lineas > 0, lineas ? `Your dialogue: ${lineas} lines` : "Your dialogue is empty (only photos + music)"],
    [FINAL.pin !== "0000", FINAL.pin !== "0000" ? "PIN changed" : "PIN is still 0000"],
    [false, "On the day: Auto-Lock → Never, Low Power off, volume up"],
  ];
}

export function descripcionFase() {
  return {
    dormido: "Sleeping — nothing happens until you arm it.",
    armado: `ARMED — when she opens Baozi at ${FINAL.lugar.nombre}, Baozi asks for a photo of you two.`,
    pedido: "Baozi already asked for the photo — waiting for her selfie.",
    en_curso: "The ending is in progress.",
    si: `She said yes ♥ ${estado.siEn ? fechaLegible(claveDelDia(new Date(estado.siEn))) : ""}`,
  }[estado.fase];
}
