/**
 * render.js
 * ==========
 * Funciones que arman el HTML de cada pantalla (equivalente a los
 * dibujar_*() de pantalla.py). Ninguna sabe de storage ni de reglas de
 * juego: reciben los datos ya calculados y escriben markup. Los eventos
 * se cablean desde main.js.
 *
 * DIRECCION DE ARTE (sep 2026) — "todo lo que esta adentro de la
 * pantalla es pixel":
 *   - Tipografia: Press Start 2P para rotulos cortos (la voz del
 *     aparato), Pixelify Sans para todo lo que se lee. Nada de fuentes
 *     "de app".
 *   - Iconos: el arte de rom + los que dibujo Claude en su mismo estilo
 *     (tools/pixel_art.py). Nada de emoji: un emoji es un dibujo de
 *     otro, con otra luz y otro trazo.
 *   - Botones con esquinas "mordidas" de pixel, borde de 2px y relieve
 *     duro — se aprietan como botones de un aparato.
 *   - Dorado = accion / atencion. Rosa = afecto. Crema = papel: las
 *     cartas y el final se leen en papel, no en la pantalla oscura.
 *   - Todo el texto en ingles, con la voz de Baozi (corta, tierna).
 *
 * Arte: sprites 1:1 del ESP32 (assets/caras, menu, comida, npcs,
 * lugares, fondo_caminar.png). Ojos y boca son lienzos de 64x64 ya
 * posicionados: combinarlos es apilarlos, sin offset.
 */

import { arte } from "./arte.js";
import * as Personaje from "./personaje.js";
import { buscarCategoria } from "./gameController.js";
import { TRAITS, TRAIT_NOMBRES, PESO_HISTORICO, PESO_RECIENTE, FELICIDAD_A_BOCA } from "./petState.js";
import { LUGARES, NPCS, VECES_PARA_ENAMORADO, CATEGORIAS } from "./mundo.js";
import { resumenDelDia, fotoDelDia, fechaLegible, ANIMOS, preguntaDelDia, claveDelDia } from "./diario.js";
import { buscarCarta } from "./cartas.js";
import { fotosDelDia, fotoDeLugar } from "./camara.js";
import { RECORTES_MENU } from "./recortes.js";
import { AMIGOS, REGALOS, MAX_CORAZONES } from "./amigos.js";
import { CATALOGO } from "./tienda.js";

// Boca abierta: rom confirmo que la boca de "sorprendido" ES la boca
// abierta del set. Comer y atrapar usan ese sprite real.
const HAY_BOCA_ABIERTA = true;
const ARCHIVO_BOCA_ABIERTA = "boca_especial_sorprendido.png";

export const ESPECIALES_CON_ARTE = new Set([
  "aburrido", "asqueado", "asustado", "curioso", "decepcionado",
  "enamorado", "euforico", "hambriento", "sorprendido",
]);

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

/** Glifo de interfaz (assets/ui/g_*.png como mascara, toma el color del texto). */
export function glifo(nombre, clase = "") {
  return `<i class="glifo g-${nombre} ${clase}" aria-hidden="true"></i>`;
}

/**
 * El personaje (Baozi o Mantou) con una cara: capas apiladas en el mismo
 * lienzo. Parado en las pantallas; dormido, sentado con los ojos cerrados.
 * opts.pose fuerza una pose ("parado" | "sentado" | "dormido").
 */
export function spriteCara(archivoOjo, archivoBoca, parpadeando = false, clase = "", opts = {}) {
  const pose = opts.pose || (archivoOjo === "ojo_dormida.png" ? "dormido" : "parado");
  const quien = opts.quien || Personaje.actual();
  const capas = Personaje.capas(archivoOjo, archivoBoca, pose, quien);
  const imgs = capas
    .map((c) => {
      // una capa de cara entera (Mantou) va dos veces, recortada: arriba
      // los ojos (parpadean), abajo la boca (queda quieta)
      if (c.tipo === "cara")
        return `<img class="capa-ojos capa-cara cara-arriba" src="${arte(c.src)}" alt="" draggable="false" /><img class="capa-cara cara-abajo" src="${arte(c.src)}" alt="" draggable="false" />`;
      const cls = c.tipo === "cuerpo" ? "capa-cuerpo" : `capa-${c.tipo}`;
      return `<img class="${cls}" src="${arte(c.src)}" alt="" draggable="false" />`;
    })
    .join("");
  return `
    <div class="sprite-cara estilo-${Personaje.estilo(quien)} ${parpadeando ? "parpadeando" : ""} ${clase}" data-ojo="${archivoOjo}" data-boca="${archivoBoca}">
      ${imgs}
    </div>
  `;
}

/** Cambia ojos y boca de un sprite ya dibujado (con Mantou, la capa de la cara). */
export function cambiarCara(spriteEl, archivoOjo, archivoBoca) {
  if (!spriteEl) return;
  spriteEl.dataset.ojo = archivoOjo;
  if (Personaje.esMantou()) {
    const src = arte(Personaje.caraMantou(Personaje.estadoDeArchivos(archivoOjo, archivoBoca)));
    spriteEl.querySelectorAll(".capa-cara").forEach((c) => (c.src = src));
    return;
  }
  const ojos = spriteEl.querySelector(".capa-ojos");
  const boca = spriteEl.querySelector(".capa-boca");
  if (ojos) ojos.src = arte("caras/" + archivoOjo);
  if (boca) boca.src = arte("caras/" + archivoBoca);
}

/**
 * Cambia en vivo la boca de un sprite ya dibujado (el minijuego abre la
 * boca al atrapar). Con Mantou cambia la capa de la cara entera.
 */
export function cambiarBoca(spriteEl, archivoBoca) {
  if (!spriteEl) return;
  if (Personaje.esMantou()) {
    const src = arte(Personaje.caraMantou(Personaje.estadoDeArchivos(spriteEl.dataset.ojo, archivoBoca)));
    spriteEl.querySelectorAll(".capa-cara").forEach((c) => (c.src = src));
    return;
  }
  const boca = spriteEl.querySelector(".capa-boca");
  if (boca) boca.src = arte("caras/" + archivoBoca);
}

/** Solo las fotos lisas de la v19 (jpeg) se ven suavizadas; desde la v20 todas son pixel. */
function esLisa(foto) {
  return !!foto && typeof foto.dataUrl === "string" && foto.dataUrl.startsWith("data:image/jpeg");
}

function caraSegunEstado(estado, parpadeando = false) {
  const archivoOjo = `ojo_base_energia_${estado.nivelEnergia}.png`;
  const archivoBoca = `boca_base_${FELICIDAD_A_BOCA[estado.nivelFelicidad] ?? "neutral"}.png`;
  return spriteCara(archivoOjo, archivoBoca, parpadeando);
}

function encabezado(titulo, idVolver) {
  return `
    <div class="encabezado-vista">
      <button class="boton-volver" id="${idVolver}" aria-label="Back">${glifo("atras")}</button>
      <div class="titulo-vista">${esc(titulo)}</div>
    </div>`;
}

const PIPS_POR_STAT = 5;

function pipsLlenos(valor, total = PIPS_POR_STAT) {
  if (valor <= 0) return 0;
  return Math.max(1, Math.min(total, Math.round(valor / (100.0 / total))));
}

function colorBarraStat(valor) {
  if (valor >= 60) return "verde";
  if (valor >= 30) return "iris";
  return "rojo";
}

function pips(valor) {
  const llenos = pipsLlenos(valor);
  const color = colorBarraStat(valor);
  let html = "";
  for (let i = 0; i < PIPS_POR_STAT; i++) html += `<span class="pip ${i < llenos ? `lleno ${color}` : ""}"></span>`;
  return html;
}

// ------------------------------------------------------------------
// Primer arranque: el huevo y el nombre
// ------------------------------------------------------------------

/** Lo primero de todo: con quien va a jugar (Baozi o Mantou). */
export function renderElegir(container) {
  const tarjeta = (quien, frase) => `
    <button class="tarjeta-personaje" data-personaje="${quien}" aria-label="${Personaje.nombre(quien)}">
      <div class="tarjeta-personaje-figura">${spriteCara("ojo_base_energia_neutral.png", "boca_base_neutral.png", false, "", { quien })}</div>
      <div class="tarjeta-personaje-nombre">${Personaje.nombre(quien)}</div>
      <div class="tarjeta-personaje-frase">${frase}</div>
    </button>`;
  container.innerHTML = `
    <div class="pantalla-elegir con-cuarto" id="pantalla-elegir">
      <div class="rotulo-elegir">Who's coming home with you?</div>
      <div class="fila-personajes">
        ${tarjeta("baozi", "Spiky, dramatic, secretly soft.")}
        ${tarjeta("mantou", "White, calm, a little bit judgy.")}
      </div>
      <div class="pista-huevo">you can only pick once</div>
    </div>`;
}

// v21: instrucciones muy cortas, despues de elegir el personaje (y desde Settings)
export const TUTORIAL = [
  {
    titulo: "This is your room",
    texto: "Tap anything to use it: the fridge to eat and drink, the bucket for a bath, the TV to play, the camera for photos, the radio for music. Keep Baozi happy!",
    arte: ["pieza/heladera.png", "pieza/balde.png", "pieza/tele.png", "pieza/camara.png"],
  },
  {
    titulo: "Your notebook",
    texto: "The notebook on the little table is your diary. Write a page every night. Your friends, the shop and your settings live there too.",
    arte: ["pieza/mesita.png"],
  },
  {
    titulo: "Go out together",
    texto: "Open the app when you're out in Hangzhou: places stamp themselves on the map on the wall. In the evening, tell Baozi your steps from the Health app.",
    arte: ["pieza/corcho.png", "pieza/sello_pagoda.png"],
  },
  {
    titulo: "Friends will visit",
    texto: "Sometimes a friend knocks on the window. Say hi! They'll ask for little favors and send you gifts.",
    arte: ["npcs/npc_usagi.png", "npcs/npc_mimi.png"],
  },
];

export function renderTutorial(container, i) {
  const c = TUTORIAL[i];
  const ultima = i === TUTORIAL.length - 1;
  container.innerHTML = `
    <div class="pantalla-tutorial con-cuarto" id="pantalla-tutorial">
      <div class="tarjeta-tutorial papel">
        <div class="tutorial-arte">${c.arte.map((a) => `<img src="${arte(a)}" alt="" draggable="false" />`).join("")}</div>
        <div class="tutorial-titulo">${esc(c.titulo)}</div>
        <div class="tutorial-texto">${esc(c.texto)}</div>
        <div class="tutorial-puntos">${TUTORIAL.map((_, k) => `<i class="${k === i ? "activo" : ""}"></i>`).join("")}</div>
        <div class="fila-botones">
          ${ultima ? "" : `<button class="boton boton-fantasma" id="tutorial-saltar">Skip</button>`}
          <button class="boton" id="tutorial-seguir">${ultima ? "Let's go!" : "Next"}</button>
        </div>
      </div>
    </div>`;
}

export function renderHuevo(container) {
  container.innerHTML = `
    <div class="pantalla-huevo con-cuarto" id="pantalla-huevo">
      <div class="huevo" id="huevo">
        <img class="huevo-sprite" src="${arte(Personaje.esMantou() ? "final/huevo_blanco.png" : "final/huevo.png")}" alt="" draggable="false" />
        <img class="huevo-grieta g1" src="${arte("final/grieta.png")}" alt="" draggable="false" />
      </div>
      <div class="sombra-huevo"></div>
      <div class="rotulo-huevo" id="rotulo-huevo">Something's hatching…</div>
      <div class="pista-huevo">tap the egg</div>
    </div>`;
}

export function renderNombre(container) {
  container.innerHTML = `
    <div class="pantalla-nombre con-cuarto">
      <div class="nombre-cara rebote">${spriteCara("ojo_especial_euforico.png", "boca_especial_euforico.png")}</div>
      <div class="nombre-lado">
        <div class="caja-dialogo">
          <div class="caja-dialogo-nombre">${Personaje.nombre().toUpperCase()}</div>
          <div class="caja-dialogo-texto" id="nombre-saludo"></div>
        </div>
        <div class="fila-nombre">
          <input id="input-nombre" type="text" maxlength="12" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="your name" aria-label="Your name" />
          <button class="boton" id="btn-confirmar-nombre">${glifo("check")} OK</button>
        </div>
      </div>
    </div>
  `;
}

// ------------------------------------------------------------------
// Cara / casa
// ------------------------------------------------------------------

function svgCaraEspecial(tipo) {
  // Red de seguridad: solo para una especial sin sprite ("sediento"),
  // que main.js ya no dispara. No deberia verse nunca.
  return `<div class="cara-sin-arte">${esc(tipo.toUpperCase())}</div>`;
}

/**
 * Lo que Baozi necesita, de mas urgente a menos. Se muestra como
 * iconitos arriba a la derecha y la mas urgente, en palabras de Baozi.
 */
export function necesidades(mascota) {
  const s = mascota.stats;
  const lista = [];
  if (mascota.enferma) lista.push({ glifo: "exclama", objeto: "botiquin", texto: "I don't feel so good… medicine?" });
  if (s.hambre <= 30) lista.push({ glifo: "tenedor", objeto: "heladera", texto: "I'm hungry…" });
  if (s.sed <= 30) lista.push({ glifo: "gota", objeto: "heladera", texto: "I'm thirsty…" });
  if (s.higiene <= 30) lista.push({ glifo: "burbuja", objeto: "balde", texto: "I need a bath…" });
  if (!mascota.dormida && s.energia <= 20) lista.push({ glifo: "estrella", objeto: "farol", texto: "So sleepy…" });
  if (!mascota.dormida && s.aburrimiento >= 70) lista.push({ glifo: "corazon", objeto: "tele", texto: "Let's play?" });
  return lista;
}

export function reloj(fecha = new Date()) {
  return `${String(fecha.getHours()).padStart(2, "0")}:${String(fecha.getMinutes()).padStart(2, "0")}`;
}

/**
 * opts: especialActiva, parpadeando, fotoPedida, desdeElSi (texto
 * de fecha si ya dijo que si), saludo (linea opcional de Baozi)
 */
export function renderCara(container, mascota, estado, opts = {}) {
  const { especialActiva = null, parpadeando = false, fotoPedida = false, desdeElSi = null, saludo = "" } = opts;
  let contenidoCara;

  if (especialActiva && ESPECIALES_CON_ARTE.has(especialActiva)) {
    contenidoCara = spriteCara(`ojo_especial_${especialActiva}.png`, `boca_especial_${especialActiva}.png`);
  } else if (especialActiva) {
    contenidoCara = svgCaraEspecial(especialActiva);
  } else if (fotoPedida) {
    // Baozi pidio la foto del lago: despierto y feliz, sea la hora que
    // sea — el final no puede quedar bloqueado porque "duerme".
    contenidoCara = spriteCara("ojo_especial_euforico.png", "boca_especial_euforico.png");
  } else if (estado.tipo === "enferma") {
    contenidoCara = spriteCara("ojo_enferma.png", "boca_enferma.png");
  } else if (estado.tipo === "dormida") {
    contenidoCara = spriteCara("ojo_dormida.png", "boca_dormida.png");
  } else if (estado.tipo === "aburrido") {
    contenidoCara = spriteCara("ojo_especial_aburrido.png", "boca_especial_aburrido.png");
  } else {
    contenidoCara = caraSegunEstado(estado, parpadeando);
  }

  const lista = mascota.dormida || fotoPedida ? [] : necesidades(mascota);
  let linea = "";
  let claseLinea = "";
  if (fotoPedida) {
    linea = "We're on the lake!! Tap me!";
    claseLinea = "rosa";
  } else if (mascota.dormida) {
    linea = "Zzz…";
    claseLinea = "tenue";
  } else if (lista.length) {
    linea = lista[0].texto;
    claseLinea = mascota.enferma ? "alerta" : "";
  } else if (saludo) {
    linea = saludo;
    claseLinea = "tenue";
  }

  container.innerHTML = `
    <div class="pantalla-cara ${mascota.dormida && !fotoPedida ? "de-noche" : ""}">
      <div class="barra-estado">
        <button class="reloj" id="reloj" aria-label="Clock">${reloj()}</button>
        ${desdeElSi ? `<div class="compromiso"><img src="${arte("final/anillo.png")}" alt="" /> ${esc(desdeElSi)}</div>` : ""}
        <div class="necesidades">${lista.map((n) => glifo(n.glifo, "necesidad")).join("")}</div>
      </div>
      <div class="caja-cara">
        ${contenidoCara}
      </div>
      <div class="linea-mochi ${claseLinea}" id="linea-mochi">${esc(linea)}</div>
    </div>
  `;
}


// ------------------------------------------------------------------
// La pieza: que cara pone Baozi y que dice (el cuarto lo dibuja pieza.js)
// ------------------------------------------------------------------

/** [ojo, boca] de la carita segun el estado (misma logica que la cara grande). */
export function archivosCara(mascota, estado, { especialActiva = null, fotoPedida = false } = {}) {
  if (especialActiva && ESPECIALES_CON_ARTE.has(especialActiva)) return [`ojo_especial_${especialActiva}.png`, `boca_especial_${especialActiva}.png`];
  if (fotoPedida) return ["ojo_especial_euforico.png", "boca_especial_euforico.png"];
  if (estado.tipo === "enferma") return ["ojo_enferma.png", "boca_enferma.png"];
  if (estado.tipo === "dormida") return ["ojo_dormida.png", "boca_dormida.png"];
  if (estado.tipo === "aburrido") return ["ojo_especial_aburrido.png", "boca_especial_aburrido.png"];
  return [`ojo_base_energia_${estado.nivelEnergia}.png`, `boca_base_${FELICIDAD_A_BOCA[estado.nivelFelicidad] ?? "neutral"}.png`];
}

/** Lo que dice el globito de Baozi en el cuarto. */
export function globoCara(mascota, { fotoPedida = false, saludo = "" } = {}) {
  if (fotoPedida) return { texto: "We're on the lake!! Tap me!", rosa: true };
  if (saludo) return { texto: saludo, rosa: false };
  if (mascota.dormida) return { texto: "", rosa: false };
  const lista = necesidades(mascota);
  return { texto: lista.length ? lista[0].texto : "", rosa: false };
}

// ------------------------------------------------------------------
// La heladera abierta
// ------------------------------------------------------------------

// Lo que hay en la heladera (coordenadas en px del dibujo de 200x112: donde apoya cada cosa)
export const HELADERA = [
  { src: "comida/comida_bao.png", accion: "feed", x: 56, y: 40, nombre: "Bao" },
  { src: "comida/comida_onigiri.png", accion: "feed", x: 84, y: 40, nombre: "Onigiri" },
  { src: "comida/comida_dumpling.png", accion: "feed", x: 112, y: 40, nombre: "Dumpling" },
  { src: "comida/comida_manzana.png", accion: "feed", x: 142, y: 40, nombre: "Cherries" },
  { src: "comida/bebida_te.png", accion: "water", x: 64, y: 76, nombre: "Milk tea" },
  { src: "comida/bebida_agua.png", accion: "water", x: 92, y: 76, nombre: "Water" },
  { src: "comida/comida_naranja.png", accion: "feed", x: 128, y: 76, nombre: "Watermelon" },
];

export function renderHeladera(container, especiales = []) {
  // v23: la comida comprada en la tienda, en el cajon de abajo, con cuantas quedan
  const deLaTienda = especiales
    .map(
      (it, i) => `
      <button class="item-heladera item-tienda" data-comida-tienda="${esc(it.id)}"
        style="left:${((76 + i * 24) / 200) * 100}%;top:${(98 / 112) * 100}%" aria-label="${esc(it.nombre)} (${it.n})">
        <img src="${arte(it.arte)}" alt="" draggable="false" />
        <span class="cuantos-tienda">×${it.n}</span>
        <span class="etiqueta-item">${esc(it.nombre)}</span>
      </button>`,
    )
    .join("");
  const items = deLaTienda + HELADERA.map(
    (it, i) => `
      <button class="item-heladera" data-comida="${it.accion}" data-item="${it.src}" ${i === 0 ? 'id="btn-heladera-feed"' : it.src.endsWith("agua.png") ? 'id="btn-heladera-water"' : ""}
        style="left:${(it.x / 200) * 100}%;top:${(it.y / 112) * 100}%" aria-label="${esc(it.nombre)}">
        <img src="${arte(it.src)}" alt="" draggable="false" />
        <span class="etiqueta-item">${esc(it.nombre)}</span>
      </button>`,
  ).join("");
  container.innerHTML = `
    <div class="pantalla-heladera con-cuarto">
      <div class="heladera-caja">
        <img class="heladera-fondo" src="${arte("pieza/heladera_adentro.png")}" alt="" draggable="false" />
        ${items}
      </div>
      <div class="heladera-espia">${spriteCara("ojo_especial_hambriento.png", "boca_especial_hambriento.png")}</div>
      <button class="boton-volver volver-flotante" id="btn-volver-heladera" aria-label="Close the fridge">${glifo("atras")}</button>
    </div>`;
}

// ------------------------------------------------------------------
// Sellos de Hangzhou: el mapa, el sello que cae y la postal
// ------------------------------------------------------------------

const MESES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fechaDeMs(ms) {
  const f = new Date(ms);
  return `${MESES[f.getMonth()]} ${f.getDate()}`;
}

// Solo tres lugares tienen foto pintada; el resto usa su recuerdo del estante
// (o el generico, para los lugares propios de ustedes).
const LUGARES_CON_FOTO = new Set(["westlake", "longjing", "lingyin"]);
const LUGARES_CON_RECUERDO = new Set(["westlake", "longjing", "lingyin", "leifeng"]);
export function arteDeLugar(id) {
  if (LUGARES_CON_FOTO.has(id)) return arte("lugares/lugar_" + id + ".png");
  return arte(LUGARES_CON_RECUERDO.has(id) ? "pieza/recuerdo_" + id + ".png" : "pieza/recuerdo_generico.png");
}

function imagenDePostal(lugar, foto) {
  if (foto) return `<img class="postal-foto-img" src="${foto}" alt="" draggable="false" />`;
  if (["westlake", "longjing", "lingyin"].includes(lugar.id)) return `<img class="postal-foto-img" src="${arte("lugares/lugar_" + lugar.id + ".png")}" alt="" draggable="false" />`;
  return `<div class="postal-sin-foto"><img src="${arte("pieza/sello_" + lugar.sello + ".png")}" alt="" draggable="false" /></div>`;
}

function stickerBaozi() {
  return `<div class="sticker-baozi" aria-hidden="true">${spriteCara("ojo_especial_euforico.png", "boca_especial_euforico.png")}</div>`;
}

/**
 * opts: lugares (LUGARES), sellados (Set de ids), fechas {id: ms},
 * seleccionado (id), ubicacion: "ok" | "pedir" | "sin", fotoDe(id)
 */
export function renderMapa(container, opts) {
  const { lugares, sellados, fechas, seleccionado, ubicacion, fotoDe, posicion } = opts;
  const sel = lugares.find((l) => l.id === seleccionado) || lugares[0];
  const marcas = lugares
    .map((l) => {
      const { x, y } = posicion(l.lat, l.lon);
      const hecho = sellados.has(l.id);
      return `<button class="sello-mapa ${hecho ? "hecho" : "falta"} ${l.id === sel.id ? "elegido" : ""}" data-lugar="${l.id}" style="left:${(x * 100).toFixed(1)}%;top:${(y * 100).toFixed(1)}%" aria-label="${esc(l.nombre)}">
        ${hecho ? `<img src="${arte("pieza/sello_" + l.sello + ".png")}" alt="" draggable="false" />` : "<span>?</span>"}
      </button>`;
    })
    .join("");
  const hecho = sellados.has(sel.id);
  let lado;
  if (hecho) {
    lado = `
      <figure class="postal">
        <div class="postal-foto">${imagenDePostal(sel, fotoDe(sel.id))}${stickerBaozi()}</div>
        <img class="postal-sello" src="${arte("pieza/sello_" + sel.sello + ".png")}" alt="" draggable="false" />
        <figcaption>
          <div class="postal-nombre">${esc(sel.nombre)}</div>
          <div class="postal-fecha">Stamped ${esc(fechaDeMs(fechas[sel.id] || Date.now()))}</div>
          <div class="postal-frase">“${esc(sel.frase)}”</div>
        </figcaption>
      </figure>`;
  } else {
    const accion =
      ubicacion === "pedir"
        ? `<button class="boton" id="btn-ubicacion">${glifo("pin")} Let Baozi know where we are</button>`
        : ubicacion === "sin"
          ? `<button class="boton boton-fantasma" id="btn-aqui">${glifo("pin")} We're here now</button>`
          : "";
    lado = `
      <div class="postal postal-vacia">
        <div class="postal-nombre">${esc(sel.nombre)}</div>
        <div class="postal-hueco">${glifo("pin", "x4")}</div>
        <div class="postal-frase">Not stamped yet. Open Baozi when you're there together.</div>
        ${accion}
      </div>`;
  }
  container.innerHTML = `
    <div class="pantalla-mapa">
      <div class="mapa-cabecera">
        <button class="boton-volver" id="btn-volver-mapa" aria-label="Back">${glifo("atras")}</button>
        <div class="titulo-vista">Hangzhou · ${sellados.size}/${lugares.length}</div>
        <div class="colecciones">${Object.entries(CATEGORIAS)
          .map(([id, nombre]) => {
            const de = lugares.filter((l) => (l.categoria || "propio") === id);
            if (!de.length) return "";
            const n = de.filter((l) => sellados.has(l.id)).length;
            return `<span class="coleccion ${n === de.length ? "completa" : ""}">${esc(nombre)} ${n}/${de.length}</span>`;
          })
          .join("")}</div>
      </div>
      <div class="mapa-cuerpo">
        <div class="mapa-papel">
          <img class="mapa-img" src="${arte("pieza/mapa.png")}" alt="Map of Hangzhou" draggable="false" />
          ${marcas}
        </div>
        <div class="mapa-lado">${lado}</div>
      </div>
    </div>`;
}

export function renderSello(container, lugar) {
  container.innerHTML = `
    <div class="pantalla-sello">
      <div class="papel-sello">
        <div class="rotulo-sello">NEW STAMP</div>
        <div class="nombre-sello">${esc(lugar.nombre)}</div>
        <div class="huella-sello" id="huella-sello"><img src="${arte("pieza/sello_" + lugar.sello + ".png")}" alt="" draggable="false" /></div>
        <div class="caja-dialogo frase-sello">
          <div class="caja-dialogo-nombre">${Personaje.nombre().toUpperCase()}</div>
          <div class="caja-dialogo-texto" id="frase-sello"></div>
        </div>
        <div class="fila-botones oculto" id="botones-sello">
          <button class="boton boton-fantasma" id="btn-sello-despues">Later</button>
          <button class="boton" id="btn-sello-foto">${glifo("camara")} Postcard photo</button>
        </div>
      </div>
    </div>`;
}

export function renderPostal(container, lugar, foto, fechaMs) {
  container.innerHTML = `
    <div class="pantalla-postal">
      <figure class="postal grande">
        <div class="postal-foto">${imagenDePostal(lugar, foto)}${stickerBaozi()}</div>
        <img class="postal-sello" src="${arte("pieza/sello_" + lugar.sello + ".png")}" alt="" draggable="false" />
        <figcaption>
          <div class="postal-nombre">${esc(lugar.nombre)}</div>
          <div class="postal-fecha">${esc(fechaDeMs(fechaMs))}</div>
        </figcaption>
      </figure>
      <div class="fila-botones">
        ${foto ? `<button class="boton boton-fantasma boton-galeria" id="btn-postal-guardar" type="button">Save to Photos</button>` : ""}
        <button class="boton" id="btn-postal-listo">${glifo("pin")} Pin it on the board</button>
      </div>
    </div>`;
}

// ------------------------------------------------------------------
// El cuaderno (reemplaza al Journal): pestañas de washi tape
// ------------------------------------------------------------------

export const PESTANAS_CUADERNO = [
  ["diary", "Days"],
  ["npcs", "Friends"],
  ["closet", "Closet"],
  ["shop", "Shop"],
  ["stats", "Baozi"],
  ["traits", "Traits"],
  ["ajustes", "Settings"],
];

/** Envuelve el contenido de una consulta en las hojas del cuaderno. */
export function renderCuaderno(container, pestana, contenido) {
  container.innerHTML = `
    <div class="cuaderno" data-pestana="${pestana}">
      <div class="cuaderno-hoja">
        <div class="cuaderno-espiral" aria-hidden="true"></div>
        <div class="cuaderno-contenido">${contenido}</div>
      </div>
      <nav class="cuaderno-pestanas">
        ${PESTANAS_CUADERNO.map(([id, nombre]) => `<button class="pestana ${id === pestana ? "activa" : ""}" data-pestana="${id}">${esc(nombre)}</button>`).join("")}
      </nav>
      <button class="boton-volver cuaderno-cerrar" id="btn-volver-consulta" aria-label="Close the notebook">${glifo("cerrar")}</button>
    </div>`;
}

export function htmlAjustes(sonidoOn) {
  return `
    <div class="lista-journal">
      <div class="subtitulo-lista">Sound</div>
      <div class="fila-botones">
        <button class="boton ${sonidoOn ? "" : "boton-fantasma"}" id="btn-ajuste-sonido">${glifo("nota")} Sound ${sonidoOn ? "ON" : "OFF"}</button>
      </div>
      <div class="subtitulo-lista">Help</div>
      <div class="fila-botones">
        <button class="boton boton-fantasma" id="btn-ver-tutorial">How to play</button>
      </div>
      <div class="subtitulo-lista">Backup</div>
      <div class="cuerpo-backup">
        Baozi lives only on this phone. If the browser data gets cleared or you change phones,
        a backup file is the only way to bring Baozi along.
        <span class="tenue">(Photos live in the album on this phone and aren't included.)</span>
      </div>
      <div class="fila-botones">
        <button class="boton" id="btn-exportar-backup">${glifo("check")} Save backup</button>
        <label class="boton boton-fantasma">
          Restore
          <input type="file" id="input-importar-backup" accept="application/json,.json" hidden />
        </label>
      </div>
      <div id="mensaje-backup" class="mensaje-backup"></div>
    </div>`;
}

// ------------------------------------------------------------------
// Menu: carrusel tipo ruleta
// ------------------------------------------------------------------

const ICONO_ITEM = {
  feed: "menu_feed.png",
  water: "menu_water.png",
  clean: "menu_clean.png",
  sleep: "menu_sleep.png",
  medicine: "menu_medicine.png",
  play: "menu_play.png",
  walk: "menu_walk.png",
  lens: "menu_lens.png",
  stats: "menu_stats.png",
  traits: "menu_traits.png",
  npcs: "menu_npcs.png",
  diary: "menu_diary.png",
  progress: "menu_progress.png",
  sound: "menu_sound.png",
  backup: "menu_backup.png",
};

/**
 * Icono de menu a escala ENTERA sobre su dibujo real (no sobre el lienzo
 * de 64x64, que es 70-95% transparente): el pixel queda nitido y todos
 * los iconos ocupan mas o menos lo mismo, sean chicos o grandes.
 */
function iconoItemMenu(item, clase) {
  const archivo = ICONO_ITEM[item.id];
  const recorte = archivo && RECORTES_MENU[archivo];
  if (!recorte) return `<span class="${clase} marcador">${esc(item.nombre.charAt(0).toUpperCase())}</span>`;
  const [x, y, w, h] = recorte;
  const objetivo = clase === "icono-actual" ? 84 : 40;
  const k = Math.max(1, Math.min(6, Math.round(objetivo / Math.max(w, h))));
  return `<span class="${clase} icono-pixel" style="width:${w * k}px;height:${h * k}px;background-image:url('${arte("menu/" + archivo)}');background-size:${64 * k}px ${64 * k}px;background-position:${-x * k}px ${-y * k}px" aria-hidden="true"></span>`;
}

/** opts.brilla: id de item que late (ej. el Lente con la busqueda armada). opts.estadoItem: texto extra por id. */
export function renderMenu(container, idCategoria, indice = 0, opts = {}) {
  const { brilla = null, estadoItem = {} } = opts;
  const categoria = buscarCategoria(idCategoria);
  if (!categoria) return;

  const total = categoria.items.length;
  const actual = categoria.items[indice];
  const anterior = categoria.items[(indice - 1 + total) % total];
  const siguiente = categoria.items[(indice + 1) % total];

  const puntos = categoria.items.map((_, i) => `<span class="punto-pagina ${i === indice ? "activo" : ""}"></span>`).join("");
  const extra = estadoItem[actual.id];

  container.innerHTML = `
    ${encabezado(categoria.nombre, "btn-volver-menu")}
    <div class="carrusel-menu">
      <button class="flecha-carrusel" id="btn-carrusel-prev" aria-label="Previous">${glifo("izq")}</button>
      <div class="pista-carrusel" id="pista-carrusel">
        ${total > 1 ? `<button class="item-carrusel vecino" data-mover="-1" aria-label="${esc(anterior.nombre)}">${iconoItemMenu(anterior, "icono-vecino")}</button>` : ""}
        <button class="item-carrusel actual ${brilla === actual.id ? "brilla" : ""}" data-item="${actual.id}">
          <span class="pedestal">${iconoItemMenu(actual, "icono-actual")}</span>
          <span class="nombre-item-actual">${esc(actual.nombre)}</span>
          ${extra ? `<span class="estado-item">${esc(extra)}</span>` : ""}
        </button>
        ${total > 1 ? `<button class="item-carrusel vecino" data-mover="1" aria-label="${esc(siguiente.nombre)}">${iconoItemMenu(siguiente, "icono-vecino")}</button>` : ""}
      </div>
      <button class="flecha-carrusel" id="btn-carrusel-next" aria-label="Next">${glifo("der")}</button>
    </div>
    ${total > 1 ? `<div class="paginacion-menu">${puntos}</div>` : ""}
  `;
}

// ------------------------------------------------------------------
// Feedback / avisos transitorios
// ------------------------------------------------------------------

// v19: los momentos (comer, tomar, bañarse, remedio, dormir, avisos) son un
// PRIMER PLANO: la camara se acerca al personaje, grande, con el cuarto
// desenfocado de fondo y un titulo al costado. Nada de cuerpito chiquito
// sobre un color liso.

/** El personaje grande (la cabeza cae siempre en el mismo lugar de la pantalla). */
function figuraPrimerPlano(ojo, boca, { clase = "", extra = "", pose = "parado", capas2 = null } = {}) {
  const segunda = capas2
    ? `<div class="pp-segunda">${spriteCara(capas2[0], capas2[1], false, "", { pose })}</div>`
    : "";
  return `
    <div class="pp-figura ${clase}">
      <div class="pp-primera">${spriteCara(ojo, boca, false, "", { pose })}</div>
      ${segunda}
      ${extra}
    </div>`;
}

function primerPlano({ variante = "", figura, titulo = "", sub = "", fondo = "" }) {
  return `
    <div class="primer-plano con-cuarto ${variante}">
      ${fondo}
      ${figura}
      <div class="pp-texto">
        ${titulo ? `<div class="pp-titulo">${esc(titulo)}</div>` : ""}
        ${sub ? `<div class="pp-sub">${esc(sub)}</div>` : ""}
      </div>
    </div>`;
}

const NOMBRES_COMIDA = {
  "comida/comida_bao.png": "A warm bao!",
  "comida/comida_onigiri.png": "Onigiri time.",
  "comida/comida_dumpling.png": "Dumpliiing.",
  "comida/comida_manzana.png": "Cherries!",
  "comida/comida_naranja.png": "Watermelon!!",
  "comida/comida_grillo1.png": "…a crunchy snack.",
  "comida/comida_grillo2.png": "…a crunchy snack.",
  "comida/comida_grillo3.png": "…a crunchy snack.",
  "comida/bebida_te.png": "Milk tea with pearls.",
  "comida/bebida_agua.png": "Fresh water.",
};

export function renderFeedback(container, titulo, opts = {}) {
  const { especial = null, icono = "check", sub = "" } = opts;
  if (especial && ESPECIALES_CON_ARTE.has(especial)) {
    container.innerHTML = primerPlano({
      variante: `pp-${especial}`,
      figura: figuraPrimerPlano(`ojo_especial_${especial}.png`, `boca_especial_${especial}.png`, {
        extra: especial === "enamorado" ? `<span class="pp-corazon c1"></span><span class="pp-corazon c2"></span><span class="pp-corazon c3"></span>` : "",
      }),
      titulo,
      sub,
    });
    return;
  }
  container.innerHTML = primerPlano({
    variante: "pp-simple",
    figura: figuraPrimerPlano("ojo_especial_euforico.png", "boca_especial_euforico.png", { extra: `<div class="pp-insignia">${glifo(icono, "x4")}</div>` }),
    titulo,
    sub,
  });
}

export function renderFeedAccion(container, comidaSrc) {
  const boca = HAY_BOCA_ABIERTA ? ARCHIVO_BOCA_ABIERTA : "boca_base_feliz.png";
  container.innerHTML = primerPlano({
    variante: "pp-comer",
    figura: figuraPrimerPlano("ojo_base_energia_alta.png", boca, {
      capas2: ["ojo_especial_euforico.png", "boca_especial_euforico.png"],
      extra: `<img class="pp-comida" src="${arte(comidaSrc)}" alt="" draggable="false" /><span class="pp-miga m1"></span><span class="pp-miga m2"></span><span class="pp-miga m3"></span>`,
    }),
    titulo: "Yum!",
    sub: NOMBRES_COMIDA[comidaSrc] || "",
  });
}

export function renderBeberAccion(container, bebidaSrc = "comida/bebida_agua.png") {
  container.innerHTML = primerPlano({
    variante: "pp-beber",
    figura: figuraPrimerPlano("ojo_base_energia_alta.png", HAY_BOCA_ABIERTA ? ARCHIVO_BOCA_ABIERTA : "boca_base_feliz.png", {
      capas2: ["ojo_especial_euforico.png", "boca_especial_euforico.png"],
      extra: `<img class="pp-comida pp-bebida" src="${arte(bebidaSrc)}" alt="" draggable="false" /><span class="pp-gota g1"></span><span class="pp-gota g2"></span>`,
    }),
    titulo: "Gulp gulp!",
    sub: NOMBRES_COMIDA[bebidaSrc] || "",
  });
}

export function renderCleanAccion(container) {
  const burbujas = Array.from({ length: 9 }, (_, i) => `<span class="pp-burbuja" style="--i:${i}"></span>`).join("");
  container.innerHTML = primerPlano({
    variante: "pp-limpiar",
    figura: figuraPrimerPlano("ojo_base_energia_alta.png", "boca_base_feliz.png", {
      capas2: ["ojo_especial_euforico.png", "boca_especial_euforico.png"],
      extra: burbujas + `<span class="pp-brillo b1"></span><span class="pp-brillo b2"></span><span class="pp-brillo b3"></span>`,
    }),
    titulo: "Squeaky clean!",
    sub: "Soap, bubbles, done.",
  });
}

export function renderMedicineAccion(container) {
  container.innerHTML = primerPlano({
    variante: "pp-remedio",
    figura: figuraPrimerPlano("ojo_enferma.png", "boca_enferma.png", {
      capas2: ["ojo_especial_euforico.png", "boca_especial_euforico.png"],
      extra: `<span class="pp-pastilla"></span><span class="pp-brillo b1"></span><span class="pp-brillo b2"></span>`,
    }),
    titulo: "All better!",
    sub: "Brave little patient.",
  });
}

const ESTRELLAS_DORMIR = [
  [12, 18], [28, 10], [78, 14], [88, 30], [8, 55], [92, 60], [18, 82], [70, 85], [45, 8], [60, 92],
];

export function renderSleepAccion(container) {
  const estrellas = ESTRELLAS_DORMIR.map(([x, y]) => `<span class="estrella-fija" style="left:${x}%;top:${y}%"></span>`).join("");
  const zzz = [[0, 0], [1, 0.3], [2, 0.6]]
    .map(([k, retraso]) => `<span class="pp-zzz" style="--k:${k};animation-delay:${retraso}s">z</span>`)
    .join("");
  container.innerHTML = primerPlano({
    variante: "pp-dormir",
    fondo: `<div class="pp-noche">${estrellas}</div>`,
    figura: figuraPrimerPlano("ojo_dormida.png", "boca_dormida.png", { pose: "dormido", extra: zzz }),
    titulo: "Good night…",
    sub: "Lights off. Sweet dreams.",
  });
}

export function renderDespertarAccion(container) {
  container.innerHTML = primerPlano({
    variante: "pp-despertar",
    figura: figuraPrimerPlano("ojo_base_energia_baja.png", "boca_base_neutral.png", {
      capas2: ["ojo_especial_euforico.png", "boca_especial_euforico.png"],
      extra: `<span class="pp-sol"></span>`,
    }),
    titulo: "Good morning!",
    sub: "*big stretch*",
  });
}

export function renderAviso(container, titulo, subtitulo = "") {
  // la cara depende del motivo: dormido, sano, o un "no" cualquiera
  const dormido = /asleep/i.test(subtitulo);
  const sano = /isn't sick/i.test(subtitulo);
  const [ojo, boca, pose] = dormido
    ? ["ojo_dormida.png", "boca_dormida.png", "dormido"]
    : sano
      ? ["ojo_especial_euforico.png", "boca_especial_euforico.png", "parado"]
      : ["ojo_especial_aburrido.png", "boca_especial_aburrido.png", "parado"];
  container.innerHTML = primerPlano({
    variante: `pp-aviso ${dormido ? "pp-dormir" : ""}`,
    fondo: dormido ? `<div class="pp-noche"></div>` : "",
    figura: figuraPrimerPlano(ojo, boca, { pose, extra: dormido ? `<span class="pp-zzz" style="--k:0">z</span><span class="pp-zzz" style="--k:1;animation-delay:.4s">z</span>` : "" }),
    titulo,
    sub: subtitulo,
  });
}

// ------------------------------------------------------------------
// Journal: Stats / Traits / NPCs / Progress / Backup
// ------------------------------------------------------------------

const ORDEN_STATS = [
  ["hambre", "Hunger", "tenedor"],
  ["sed", "Thirst", "gota"],
  ["energia", "Energy", "estrella"],
  ["higiene", "Hygiene", "burbuja"],
  ["felicidad", "Happiness", "corazon"],
];

export function renderStats(container, mascota, opts = {}) {
  const filas = ORDEN_STATS.map(
    ([clave, etiqueta, g]) => `
      <div class="fila-stat">
        <span class="etiqueta">${glifo(g, "tenue")} ${etiqueta}</span>
        <span class="pips">${pips(mascota.stats[clave])}</span>
      </div>`,
  ).join("");

  const corazones = pipsLlenos(mascota.stats.vinculo);
  let corazonesHtml = "";
  for (let i = 0; i < PIPS_POR_STAT; i++) corazonesHtml += glifo("corazon", `corazon-vinculo ${i < corazones ? "lleno" : ""}`);

  let aviso = "";
  if (mascota.enferma) aviso = `<div class="aviso-salud alerta">Sick — needs medicine</div>`;
  else if (mascota.stats.salud < 60) aviso = `<div class="aviso-salud">Not feeling great</div>`;

  // v24: el deseo de hoy, arriba de todo
  const d = opts.deseo;
  const deseoHtml = d
    ? `<button class="fila-deseo ${d.estado === "cumplido" ? "cumplido" : ""}" data-ver-deseo type="button">
        <span class="deseo-etiqueta">${glifo("corazon")} Today's wish</span>
        <span class="deseo-texto">${d.estado === "nuevo" ? "Baozi has a wish… tap to hear it" : esc(d.texto)}</span>
        <span class="deseo-estado">${d.estado === "cumplido" ? "Came true ✓" : d.real ? "Tap when it's done" : d.meta ? `${Math.min(d.meta, d.progreso)} / ${d.meta}` : ""}</span>
      </button>`
    : "";
  container.innerHTML = `
    ${encabezado("Stats", "btn-volver-consulta")}
    <div class="lista-journal">
      ${deseoHtml}
      ${filas}
      <div class="fila-stat">
        <span class="etiqueta rosa">${glifo("corazon")} Bond</span>
        <span class="pips">${corazonesHtml}</span>
      </div>
      ${aviso}
    </div>
  `;
}

const TRAIT_DESCRIPCION = {
  explorador: "loves new places",
  sociable: "loves meeting people",
  gourmet: "lives for snacks",
  leal: "just wants cuddles",
};

export function renderTraits(container, mascota) {
  const puntajes = {};
  for (const tr of TRAITS) puntajes[tr] = mascota.traitsHistorico[tr] * PESO_HISTORICO + mascota.traitsReciente[tr] * PESO_RECIENTE;
  const maximo = Math.max(...Object.values(puntajes));
  const dominante = maximo > 0 ? mascota.rasgoDominante() : null;

  const barras = TRAITS.map((rasgo) => {
    const esDominante = rasgo === dominante;
    const pct = maximo > 0 ? Math.max(4, Math.round((puntajes[rasgo] / maximo) * 100)) : 0;
    return `
      <div class="barra-trait ${esDominante ? "dominante" : ""}">
        <div class="etiqueta"><span>${esc(TRAIT_NOMBRES[rasgo])} <small>${TRAIT_DESCRIPCION[rasgo] || ""}</small></span>${esDominante ? glifo("estrella") : ""}</div>
        <div class="pista"><div class="relleno" style="width:${pct}%"></div></div>
      </div>`;
  }).join("");

  container.innerHTML = `
    ${encabezado("Traits", "btn-volver-consulta")}
    <div class="lista-journal">
      ${maximo > 0 ? "" : `<div class="vacio-suave">Baozi's personality grows with every place, meal and friend.</div>`}
      ${barras}
    </div>
  `;
}

export function renderNpcs(container, npcsReg, amigos = null, ctx = {}) {
  const filas = NPCS.map((npc) => {
    const veces = npcsReg.vecesEncontrado[npc.id] || 0;
    if (veces === 0) {
      return `
        <div class="fila-npc">
          <span class="avatar-npc desconocido">?</span>
          <span class="nombre-npc tenue">Not met yet</span>
        </div>`;
    }
    const llenos = amigos ? amigos.corazones(npc.id, npcsReg) : Math.min(veces, VECES_PARA_ENAMORADO);
    let marcas = "";
    for (let i = 0; i < MAX_CORAZONES; i++) marcas += glifo("corazon", `corazon-vinculo ${i < llenos ? "lleno" : ""}`);
    let detalle = "";
    if (amigos && AMIGOS[npc.id]) {
      const m = amigos.misionActual(npc.id);
      const est = amigos.estado(npc.id);
      const hechas = amigos.misiones[npc.id].n;
      const secretos = AMIGOS[npc.id].secretos.filter((sx) => amigos.revelados.has(sx.lugar)).map((sx) => (LUGARES.find((l) => l.id === sx.lugar) || {}).nombre).filter(Boolean);
      const linea =
        est === "activa" && m
          ? `<span class="mision-activa">${glifo("libro")} ${esc(m.resumen)}${ctx.progreso && ctx.progreso(m) ? ` <small>${esc(ctx.progreso(m))}</small>` : ""}</span>`
          : est === "lista"
            ? `<span class="mision-lista">${glifo("estrella")} Done! ${esc(npc.nombre)} will bring you a gift</span>`
            : hechas >= 3
              ? `<span class="mision-lista">${glifo("check")} All missions done</span>`
              : `<span class="tenue">No mission yet. Say hi when ${esc(npc.nombre)} visits!</span>`;
      detalle = `
        <div class="detalle-amigo">
          ${linea}
          <span class="tenue">Missions ${hechas}/3${secretos.length ? ` · Secrets: ${esc(secretos.join(", "))}` : ""}</span>
        </div>`;
    }
    return `
      <div class="fila-npc con-detalle">
        <img class="avatar-npc" src="${arte("npcs/npc_" + npc.id + ".png")}" alt="" draggable="false" />
        <div class="columna-amigo">
          <div class="cabeza-amigo"><span class="nombre-npc">${esc(npc.nombre)}</span><span class="pips">${marcas}</span></div>
          ${detalle}
        </div>
      </div>`;
  }).join("");

  container.innerHTML = `
    ${encabezado("Friends", "btn-volver-consulta")}
    <div class="lista-journal">${filas}</div>
  `;
}

/** El ropero: los regalos de los amigos. Los accesorios se tocan para ponerlos. */
export function renderCloset(container, amigos, accTienda = []) {
  const acc = amigos.accesorios();
  const tarjetasAcc = ["orejas", "antenas", "boina", "corona"].map((id) => {
    const clave = `acc:${id}`;
    const r = REGALOS[clave];
    const de = Object.keys(AMIGOS).find((n) => AMIGOS[n].misiones.some((m) => m.regalo === clave));
    const nombreDe = (NPCS.find((n) => n.id === de) || {}).nombre || "";
    if (!acc.includes(id)) {
      return `<div class="tarjeta-regalo bloqueada"><span class="candado-regalo">${glifo("candado")}</span><span class="nombre-regalo">???</span><small>A gift from ${esc(nombreDe)}</small></div>`;
    }
    const puesto = amigos.puesto === id;
    return `
      <button class="tarjeta-regalo ${puesto ? "puesto" : ""}" data-accesorio="${id}" aria-pressed="${puesto}">
        <span class="acc-vista"><img src="${arte(r.arte)}" alt="" draggable="false" /></span>
        <span class="nombre-regalo">${esc(r.nombre)}</span>
        <small>${puesto ? "Wearing it · tap to take off" : "Tap to wear"}</small>
      </button>`;
  }).join("") + accTienda.map((id) => {
    // v23: lo que compro en la tienda
    const c = CATALOGO.find((x) => x.tipo === "accesorio" && (x.acc || x.id) === id);
    if (!c) return "";
    const puesto = amigos.puesto === id;
    return `
      <button class="tarjeta-regalo ${puesto ? "puesto" : ""}" data-accesorio="${id}" aria-pressed="${puesto}">
        <span class="acc-vista"><img src="${arte(c.arte)}" alt="" draggable="false" /></span>
        <span class="nombre-regalo">${esc(c.nombre)}</span>
        <small>${puesto ? "Wearing it · tap to take off" : "Tap to wear"}</small>
      </button>`;
  }).join("");
  const otros = [...amigos.premios].filter((k) => REGALOS[k] && REGALOS[k].tipo !== "accesorio");
  const lista = otros.length
    ? otros.map((k) => `<div class="fila-regalo"><img src="${arteDeRegalo(k)}" alt="" draggable="false" /><span>${esc(REGALOS[k].nombre)}</span><small class="tenue">${REGALOS[k].tipo === "sticker" ? "in your camera" : "in your room"}</small></div>`).join("")
    : `<div class="vacio-suave">Help your friends with their missions and they'll send you gifts.</div>`;
  container.innerHTML = `
    ${encabezado("Closet", "btn-volver-consulta")}
    <div class="lista-journal">
      <div class="closet-figura">${spriteCara("ojo_base_energia_alta.png", "boca_base_feliz.png")}</div>
      <div class="subtitulo-lista">To wear</div>
      <div class="grilla-regalos">${tarjetasAcc}</div>
      <div class="subtitulo-lista">Stickers and things for your room</div>
      ${lista}
    </div>
  `;
}

// ------------------------------------------------------------------
// v23: la tienda (pestaña "Shop" del cuaderno)
// ------------------------------------------------------------------

// tamaño del arte de las cosas del cuarto y los stickers (para agrandarlas en pixel entero)
const TAM_ARTE_TIENDA = { farolitos: [58, 17], pecera: [17, 15], bonsai: [15, 14], poster: [18, 24], luces: [70, 9], peluche: [18, 18], loto: [13, 13], corazones: [13, 13] };

function vistaTienda(c, peluche) {
  if (c.tipo === "accesorio") return `<span class="acc-vista"><img src="${arte(c.arte)}" alt="" draggable="false" /></span>`;
  if (c.tipo === "comida") return `<span class="vista-tienda vista-comida"><img src="${arte(c.arte)}" alt="" draggable="false" /></span>`;
  const src = c.id === "peluche" ? `tienda/deco_peluche_${peluche}.png` : c.arte;
  const [w, h] = TAM_ARTE_TIENDA[c.id] || [16, 16];
  const k = Math.max(1, Math.min(Math.floor(92 / w), Math.floor(52 / h)));
  return `<span class="vista-tienda"><img src="${arte(src)}" alt="" draggable="false" style="width:${w * k}px;height:${h * k}px" /></span>`;
}

function estadoTienda(c, tienda, puesto) {
  if (c.tipo === "comida") return tienda.cantidadComida(c.id) ? `×${tienda.cantidadComida(c.id)} in the fridge` : "";
  if (!tienda.tiene(c.id)) return "";
  if (c.tipo === "accesorio") return puesto === (c.acc || c.id) ? "Wearing it ✓" : "In your closet ✓";
  if (c.tipo === "sticker") return "In your camera ✓";
  return "In your room ✓";
}

function tarjetaTienda(c, tienda, { nuevas, confirmar, recien, puesto, peluche, falta }) {
  const tiene = c.tipo !== "comida" && tienda.tiene(c.id);
  const estado = estadoTienda(c, tienda, puesto);
  const moneda = `<img class="moneda-mini" src="${arte("tienda/moneda.png")}" alt="coins" draggable="false" />`;
  let pie;
  if (confirmar === c.id) {
    pie = `<span class="tienda-pregunta">Buy for ${c.precio}?</span>
      <span class="fila-tienda"><button class="boton boton-fantasma chico" data-cancelar-compra>No</button><button class="boton chico" data-confirmar-compra="${esc(c.id)}">Buy</button></span>`;
  } else if (tiene) {
    pie = `<span class="estado-tienda">${esc(estado)}</span>`;
  } else {
    const caro = tienda.monedas < c.precio;
    pie = `<button class="precio-tienda ${caro ? "caro" : ""}" data-comprar="${esc(c.id)}" aria-label="Buy ${esc(c.nombre)} for ${c.precio} coins">${moneda}${c.precio}</button>
      ${estado ? `<span class="estado-tienda">${esc(estado)}</span>` : ""}
      ${falta === c.id ? `<span class="falta-tienda">You need ${c.precio - tienda.monedas} more</span>` : ""}`;
  }
  return `
    <div class="tarjeta-tienda ${tiene ? "tengo" : ""} ${recien === c.id ? "recien" : ""}" data-producto="${esc(c.id)}">
      ${nuevas.has(c.id) ? `<span class="nuevo-tienda">NEW</span>` : ""}
      ${vistaTienda(c, peluche)}
      <span class="nombre-tienda">${esc(c.nombre)}</span>
      <span class="texto-tienda">${esc(c.texto)}</span>
      ${recien === c.id ? `<span class="recien-tienda">${c.tipo === "comida" ? "In the fridge! ♥" : "It's yours! ♥"}</span>` : ""}
      ${pie}
    </div>`;
}

/**
 * opts: { nuevas: Set(ids), confirmar: id|null, recien: id|null, falta: id|null,
 *         puesto: id del accesorio puesto, peluche: "baozi"|"mantou", ahora }
 */
export function renderTienda(container, tienda, opts = {}) {
  const o = { nuevas: new Set(), confirmar: null, recien: null, falta: null, puesto: null, peluche: "baozi", ...opts };
  const ahora = opts.ahora || Date.now();
  const todas = tienda.disponibles(ahora);
  const semana = tienda.deEstaSemana(ahora).filter((c) => todas.includes(c));
  const hayNuevasSemana = tienda.semanaActual(ahora) > 0 && semana.length;
  const resto = hayNuevasSemana ? todas.filter((c) => !semana.includes(c)) : todas;
  const faltan = tienda.semanaActual(ahora) < 3;
  container.innerHTML = `
    ${encabezado("Shop", "btn-volver-consulta")}
    <div class="lista-journal tienda">
      <div class="tienda-cabeza">
        <div class="billetera" aria-label="${tienda.monedas} coins"><img src="${arte("tienda/moneda.png")}" alt="" draggable="false" /><b id="monedas-tienda">${tienda.monedas}</b></div>
        <div class="tienda-ayuda">Earn coins by caring for Baozi, writing your diary, telling Baozi your steps, playing and taking photos.</div>
      </div>
      ${hayNuevasSemana ? `<div class="subtitulo-lista">New this week</div><div class="grilla-tienda">${semana.map((c) => tarjetaTienda(c, tienda, o)).join("")}</div>` : ""}
      <div class="subtitulo-lista">${hayNuevasSemana ? "Everything else" : "Everything"}</div>
      <div class="grilla-tienda">${resto.map((c) => tarjetaTienda(c, tienda, o)).join("")}</div>
      ${faltan ? `<div class="vacio-suave">New things arrive every week ♥</div>` : ""}
    </div>`;
}

export function renderProgress(container, mascota, lugaresReg) {
  const filas = LUGARES.map((lugar) => {
    const desbloqueado = lugaresReg.desbloqueados.has(lugar.id);
    const propia = desbloqueado ? fotoDeLugar(lugar.id) : null;
    const miniatura = desbloqueado
      ? `<img class="miniatura-lugar ${propia ? "propia" : ""}" src="${propia || arteDeLugar(lugar.id)}" alt="" draggable="false" />`
      : `<span class="miniatura-lugar bloqueada">${glifo("candado")}</span>`;
    return `
      <div class="fila-lugar ${desbloqueado ? "" : "tenue"}">
        ${miniatura}
        <span class="nombre-fila-lugar">${desbloqueado ? esc(lugar.nombre) : "???"}</span>
        ${desbloqueado ? glifo("check", "verde") : ""}
      </div>`;
  }).join("");

  container.innerHTML = `
    ${encabezado("Places", "btn-volver-consulta")}
    <div class="lista-journal">
      <div class="fila-stat"><span class="etiqueta">${glifo("pie", "tenue")} Steps</span><span class="numero">${mascota.pasosTotales.toLocaleString("en-US")}</span></div>
      <div class="subtitulo-lista">Places</div>
      ${filas}
    </div>
  `;
}

export function renderBackup(container) {
  container.innerHTML = `
    ${encabezado("Backup", "btn-volver-consulta")}
    <div class="lista-journal">
      <div class="cuerpo-backup">
        Baozi lives only on this phone. If the browser data gets cleared or you change phones,
        a backup file is the only way to bring Baozi along.
        <span class="tenue">(Photos live in the album on this phone and aren't included.)</span>
      </div>
      <div class="fila-botones">
        <button class="boton" id="btn-exportar-backup">${glifo("check")} Save backup</button>
        <label class="boton boton-fantasma">
          Restore
          <input type="file" id="input-importar-backup" accept="application/json,.json" hidden />
        </label>
      </div>
      <div id="mensaje-backup" class="mensaje-backup"></div>
    </div>
  `;
}

// ------------------------------------------------------------------
// Caminar
// ------------------------------------------------------------------

export function renderCaminar(container, mascota, pasosSesion, opts = {}) {
  const { mostrarBannerMotion = false, hayLugaresPendientes = false, estadoSensores = "", podometroActivo = false, estado = null } = opts;

  const bannerMotion = mostrarBannerMotion
    ? `<button class="banner-sensor" id="btn-habilitar-motion">${glifo("pie")} Tap to count steps automatically</button>`
    : "";
  const cara = estado && estado.tipo === "base" ? caraSegunEstado(estado) : spriteCara("ojo_base_energia_alta.png", "boca_base_feliz.png");

  container.innerHTML = `
    <div class="pantalla-caminar">
      <div class="escena-caminar en-marcha">
        <div class="nube lenta" aria-hidden="true"><span class="n1"></span><span class="n2"></span><span class="n3"></span></div>
        <div class="nube media" aria-hidden="true"><span class="n1"></span><span class="n2"></span><span class="n3"></span></div>
        <div class="bosque" aria-hidden="true">
          ${[0, 1, 2, 3, 4, 5]
            .map((i) => `<div class="arbol ${i % 2 ? "der" : ""}" style="animation-delay:-${((i / 6) * 5.5).toFixed(2)}s"><span class="copa"></span><span class="tronco"></span></div>`)
            .join("")}
        </div>
        <!-- Baozi camina con ella: su carita rebota a cada paso. -->
        <div class="mochi-caminando" id="mochi-caminando" aria-hidden="true">${cara}</div>
        <div class="pies-personaje" id="pies-personaje" aria-hidden="true"></div>
        <div class="hud-caminar">
          <button class="boton-volver sobre-escena" id="btn-volver-caminar" aria-label="Back">${glifo("atras")}</button>
          <div class="chip-pasos">${glifo("pie")} <b class="contador-pasos" id="contador-pasos">${pasosSesion.toLocaleString("en-US")}</b></div>
          <div class="chip-pasos tenue">TOTAL <b id="total-pasos">${mascota.pasosTotales.toLocaleString("en-US")}</b></div>
        </div>
      </div>
      <div class="barra-caminar">
        ${bannerMotion}
        <div class="estado-sensores" id="estado-sensores">${esc(estadoSensores)}</div>
        <div class="acciones-caminar">
          ${hayLugaresPendientes ? `<button class="boton boton-fantasma" id="btn-wheretogo-manual">${glifo("pin")} Where to?</button>` : ""}
          <button class="boton boton-fantasma" id="btn-anotar-pasos">${glifo("pie")} From Health</button>
          <button class="boton ${podometroActivo ? "boton-fantasma chico" : ""}" id="btn-paso">${podometroActivo ? "+1" : `${glifo("pie")} Step`}</button>
        </div>
      </div>
    </div>
  `;
}

// ------------------------------------------------------------------
// Lugares
// ------------------------------------------------------------------

function fotoLugarHtml(lugar) {
  const src = arteDeLugar(lugar.id);
  return `
    <img class="relleno-foto" src="${src}" alt="" aria-hidden="true" draggable="false" />
    <img class="foto-lugar" src="${src}" alt="" draggable="false" />`;
}

export function renderLugarCerca(container, lugar) {
  container.innerHTML = `
    <div class="pantalla-lugar">
      ${fotoLugarHtml(lugar)}
      <div class="franja-lugar">
        <div class="etiqueta-lugar">You're nearby</div>
        <div class="titulo-lugar">${esc(lugar.nombre)}</div>
        <div class="fila-botones">
          <button class="boton boton-fantasma" data-eleccion-lugar="not_now">Not now</button>
          <button class="boton" data-eleccion-lugar="explorar">${glifo("pin")} Explore</button>
        </div>
      </div>
    </div>
  `;
}

export function renderWhereTo(container, pendientes) {
  const opciones = pendientes.map((l) => `<button class="boton boton-fantasma" data-lugar="${l.id}">${glifo("pin")} ${esc(l.nombre)}</button>`).join("");
  container.innerHTML = `
    <div class="tarjeta-narrativa">
      <div class="titulo">Where to?</div>
      <div class="opciones-narrativa">
        ${opciones}
        <button class="boton-texto" data-lugar="__not_now">Not now</button>
      </div>
    </div>
  `;
}

export function renderDescubrimiento(container, lugar, opts = {}) {
  const { fotoGuardada = false } = opts;
  container.innerHTML = `
    <div class="pantalla-lugar acercando">
      ${fotoLugarHtml(lugar)}
      <div class="franja-lugar">
        <div class="etiqueta-lugar">New place discovered</div>
        <div class="titulo-lugar">${esc(lugar.nombre)}</div>
        <div class="texto-lugar">${esc(lugar.dialogo)}</div>
        <div class="fila-botones">
          ${
            fotoGuardada
              ? `<span class="chip-guardado">${glifo("check")} Photo saved</span>`
              : `<button id="btn-tomar-foto-descubrimiento" class="boton boton-fantasma" type="button">${glifo("camara")} Take a photo</button>`
          }
          <button id="btn-continuar-descubrimiento" class="boton">Continue</button>
        </div>
      </div>
    </div>
  `;
}

// ------------------------------------------------------------------
// Encuentros con NPC
// ------------------------------------------------------------------

function escenaEncuentro(contenidoNpc, franja, opts = {}) {
  const { clase = "" } = opts;
  return `
    <div class="pantalla-encuentro ${clase}">
      <div class="escenario-npc">${contenidoNpc}</div>
      <div class="franja-lugar">${franja}</div>
    </div>
  `;
}

function spriteNpc(npc, saludando = false) {
  const archivo = saludando ? `npc_${npc.id}_saludo.png` : `npc_${npc.id}.png`;
  return `<img class="npc-grande" src="${arte("npcs/" + archivo)}" alt="" draggable="false" />`;
}

export function renderEncuentroAnuncio(container, npc = null) {
  container.innerHTML = escenaEncuentro(
    npc
      ? `<img class="npc-grande npc-sombra" src="${arte("npcs/npc_" + npc.id + ".png")}" alt="" draggable="false" />`
      : `<div class="silueta-npc" aria-hidden="true">?</div>`,
    `<div class="etiqueta-lugar">Knock knock…</div>
     <button id="btn-continuar-encuentro" class="boton">Open the window</button>`,
  );
}

export function renderEncuentroEleccion(container, npc) {
  container.innerHTML = escenaEncuentro(
    spriteNpc(npc),
    `<div class="etiqueta-lugar">At the window</div>
     <div class="titulo-lugar">${esc(npc.nombre)}</div>
     <div class="fila-botones">
       <button class="boton boton-fantasma" data-eleccion="seguir">Not now</button>
       <button class="boton" data-eleccion="saludar">${glifo("corazon")} Say hi</button>
     </div>`,
  );
}

export function renderEncuentroDialogo(container, npc, linea) {
  container.innerHTML = escenaEncuentro(
    spriteNpc(npc, true),
    `<div class="titulo-lugar">${esc(npc.nombre)}</div>
     <div class="texto-lugar globo-dialogo">“${esc(linea)}”</div>
     <button id="btn-continuar-encuentro" class="boton">Continue</button>`,
    { clase: "hablando" },
  );
}

/** El arte de un regalo (el cuadro depende de con quien juega ella). */
export function arteDeRegalo(clave) {
  const r = REGALOS[clave];
  if (!r) return "";
  if (clave === "deco:cuadro") return arte(`amigos/deco_cuadro_${Personaje.actual()}.png`);
  return arte(r.arte);
}

/** Un regalo que se ve bien grande: el accesorio puesto en el personaje, lo demas tal cual. */
function htmlRegalo(clave) {
  const r = REGALOS[clave];
  if (!r) return "";
  if (r.tipo === "accesorio") {
    // el personaje de ella con el accesorio puesto encima (aunque todavia no lo tenga puesto)
    return `<div class="regalo-muestra con-personaje">${spriteCara("ojo_especial_euforico.png", "boca_especial_euforico.png")}<img class="regalo-acc-encima" src="${arte(r.arte)}" alt="" draggable="false" /></div>`;
  }
  return `<div class="regalo-muestra"><img class="regalo-arte ${r.tipo}" src="${arteDeRegalo(clave)}" alt="" draggable="false" /></div>`;
}

export function renderEncuentroRegalo(container, npc, texto, clave) {
  const r = REGALOS[clave] || {};
  const tipo = { sticker: "A new sticker for your camera", accesorio: "Something to wear (see the Closet)", decoracion: "For your room" }[r.tipo] || "";
  container.innerHTML = escenaEncuentro(
    `${spriteNpc(npc, true)}${htmlRegalo(clave)}`,
    `<div class="titulo-lugar">${esc(npc.nombre)}</div>
     <div class="texto-lugar globo-dialogo">“${esc(texto)}”</div>
     <div class="etiqueta-lugar regalo-nombre">${glifo("estrella")} ${esc(r.nombre || "")} · ${esc(tipo)}</div>
     <button id="btn-continuar-encuentro" class="boton">${glifo("corazon")} Thank you!</button>`,
    { clase: "hablando con-regalo" },
  );
}

export function renderEncuentroSecreto(container, npc, texto, lugar) {
  container.innerHTML = escenaEncuentro(
    spriteNpc(npc, true),
    `<div class="titulo-lugar">${esc(npc.nombre)}</div>
     <div class="texto-lugar globo-dialogo">“${esc(texto)}”</div>
     <div class="etiqueta-lugar regalo-nombre">${glifo("pin")} New on your map: ${esc(lugar ? lugar.nombre : "")}</div>
     <button id="btn-continuar-encuentro" class="boton">Continue</button>`,
    { clase: "hablando" },
  );
}

export function renderEncuentroMision(container, npc, mision) {
  container.innerHTML = escenaEncuentro(
    spriteNpc(npc, true),
    `<div class="titulo-lugar">${esc(npc.nombre)}</div>
     <div class="texto-lugar globo-dialogo">“${esc(mision.pide)}”</div>
     <div class="etiqueta-lugar regalo-nombre">${glifo("libro")} ${esc(mision.resumen)}</div>
     <div class="fila-botones">
       <button class="boton boton-fantasma" data-mision="despues">Later</button>
       <button class="boton" data-mision="si">${glifo("check")} Okay!</button>
     </div>`,
    { clase: "hablando" },
  );
}

export function renderEncuentroDespedida(container, npc = null) {
  container.innerHTML = escenaEncuentro(
    npc ? spriteNpc(npc) : `<div class="silueta-npc" aria-hidden="true">·</div>`,
    `<div class="titulo-lugar">See you around!</div>`,
    { clase: "yendose" },
  );
}

// ------------------------------------------------------------------
// Minijuego
// ------------------------------------------------------------------

export function renderMinijuegoBase(container, mascota, estado, opts = {}) {
  const { mostrarBannerMotion = false, sacudidaActiva = false } = opts;
  const bannerMotion = mostrarBannerMotion
    ? `<button class="banner-sensor" id="btn-habilitar-motion">Tap to shake your phone and catch</button>`
    : "";
  const archivoOjo = `ojo_base_energia_${estado.nivelEnergia || "alta"}.png`;
  const archivoBoca = `boca_base_${FELICIDAD_A_BOCA[estado.nivelFelicidad] ?? "neutral"}.png`;
  container.innerHTML = `
    <div class="pantalla-minijuego" id="area-minijuego">
      <div class="caja-cara-minijuego" id="caja-cara-minijuego" data-boca-cerrada="${archivoBoca}">
        ${spriteCara(archivoOjo, archivoBoca)}
        <div class="aro-atrape"></div>
      </div>
      ${bannerMotion}
      <div class="hud-minijuego">
        <span class="chip-pasos" id="minijuego-atrapadas">CAUGHT 0</span>
        <span class="chip-pasos" id="minijuego-tiempo">5.0</span>
      </div>
      <div class="pista-minijuego">${sacudidaActiva ? "Shake or tap to catch!" : "Tap the food to catch it!"}</div>
    </div>
  `;
}

// ------------------------------------------------------------------
// Diario: el album
// ------------------------------------------------------------------

function fotoArteDelDia(entrada) {
  const foto = fotoDelDia(entrada);
  if (foto.tipo === "lugar") return `<img class="imagen-polaroid" src="${arteDeLugar(foto.id)}" alt="" draggable="false" />`;
  if (foto.tipo === "npc") return `<img class="imagen-polaroid retrato" src="${arte("npcs/npc_" + foto.id + "_saludo.png")}" alt="" draggable="false" />`;
  const boca = foto.id === "feliz" ? "boca_base_feliz.png" : "boca_base_neutral.png";
  return `<div class="imagen-polaroid cara-polaroid">${spriteCara("ojo_base_energia_alta.png", boca)}</div>`;
}

/**
 * Un dia con fotos reales muestra la mas linda (la del final si la hay,
 * si no la mas reciente) y se puede tocar para pasar a las otras.
 */
const animoDe = (id) => ANIMOS.find((a) => a.id === id) || null;

function caraAnimo(id, clase = "") {
  const a = animoDe(id);
  if (!a) return `<span class="animo-vacio ${clase}"></span>`;
  return `<span class="animo-cara ${clase}">${spriteCara(a.ojo, a.boca)}</span>`;
}

/** Arriba del diario: la pagina de hoy (o el boton para escribirla), la semana y un recuerdo. */
function cabezaDiario(diario) {
  if (!diario) return "";
  const hoy = diario.entrada(claveDelDia());
  const escrita = diario.hoyEscrito();
  const racha = diario.racha();
  const semana = diario.semana();
  const DIAS_1 = ["S", "M", "T", "W", "T", "F", "S"];
  const tira = semana
    .map((d) => {
      const [y, m, dd] = d.clave.split("-").map(Number);
      const letra = DIAS_1[new Date(y, m - 1, dd).getDay()];
      return `<div class="dia-semana ${d.escrita ? "escrito" : ""} ${d.clave === claveDelDia() ? "hoy" : ""}">${caraAnimo(d.animo, "mini")}<span>${letra}</span></div>`;
    })
    .join("");
  const rachaTxt = racha > 1 ? `${racha} days in a row` : racha === 1 ? "1 day — keep it going" : "Start a streak tonight";
  const tarjetaHoy = escrita
    ? `<button class="tarjeta-hoy escrita" id="btn-escribir-hoy">
         ${caraAnimo(hoy.animo, "grande")}
         <div class="tarjeta-hoy-texto">
           <div class="tarjeta-hoy-titulo">Today</div>
           <div class="tarjeta-hoy-frase">${hoy.texto ? esc(hoy.texto) : esc(animoDe(hoy.animo)?.nombre || "")}</div>
           <div class="tarjeta-hoy-pista">tap to edit</div>
         </div>
       </button>`
    : `<button class="tarjeta-hoy" id="btn-escribir-hoy">
         <span class="tarjeta-hoy-lapiz">${glifo("nota", "x2")}</span>
         <div class="tarjeta-hoy-texto">
           <div class="tarjeta-hoy-titulo">Write today's page</div>
           <div class="tarjeta-hoy-frase">${esc(preguntaDelDia())}</div>
         </div>
       </button>`;
  const recuerdo = diario.recuerdo();
  const tarjetaRecuerdo = recuerdo
    ? `<div class="tarjeta-recuerdo">
         <div class="tarjeta-recuerdo-cuando">${glifo("estrella")} ${esc(recuerdo.cuando)}</div>
         <div class="tarjeta-recuerdo-texto">${caraAnimo(recuerdo.entrada.animo, "mini")} ${esc(recuerdo.entrada.texto || animoDe(recuerdo.entrada.animo)?.nombre || "")}</div>
       </div>`
    : "";
  return `
    <div class="cabeza-diario">
      ${tarjetaHoy}
      <div class="semana-diario">
        <div class="semana-dias">${tira}</div>
        <div class="racha">${esc(rachaTxt)}</div>
      </div>
      ${tarjetaRecuerdo}
    </div>`;
}

export function renderDiario(container, diario, opts = {}) {
  const { puedeRepetirFinal = false } = opts;
  const entradas = diario ? diario.entradasRecientes(60) : [];

  const cuerpo = entradas.length
    ? `<div class="tira-diario">${entradas
        .map((e) => {
          const fotos = fotosDelDia(e.fecha);
          const final = fotos.find((f) => f.tipo === "final");
          const ordenadas = final ? [final, ...fotos.filter((f) => f !== final)] : fotos;
          const dorada = !!final || e.hitos.some((h) => h.startsWith("The day you said yes"));
          const notas = e.cartas
            .map((id) => buscarCarta(id))
            .filter(Boolean)
            .map((c) => `<div class="nota-polaroid">${glifo("corazon")} ${esc(c.titulo)}</div>`)
            .join("");
          const hitos = e.hitos.slice(-2).map((h) => `<div class="hito-polaroid">${glifo("estrella")} ${esc(h)}</div>`).join("");
          const imagen = ordenadas.length
            ? `<img class="imagen-polaroid foto-real ${esLisa(ordenadas[0]) ? "lisa" : ""}" src="${ordenadas[0].dataUrl}" alt="" draggable="false" />`
            : fotoArteDelDia(e);
          return `
            <figure class="polaroid ${dorada ? "dorada" : ""}" data-dia="${e.fecha}" data-indice="0" data-total="${ordenadas.length}">
              <div class="marco-imagen">
                ${imagen}
                ${ordenadas.length > 1 ? `<span class="contador-fotos">1/${ordenadas.length}</span>` : ""}
                ${dorada && puedeRepetirFinal ? `<button class="boton chico repetir-final" data-repetir-final="1">${glifo("corazon")} Relive</button>` : ""}
              </div>
              <figcaption>
                <div class="fecha-polaroid">${esc(fechaPolaroid(e.fecha))} ${e.animo ? caraAnimo(e.animo, "mini") : ""}</div>
                ${e.texto ? `<div class="escrito-polaroid" data-sin-nombre>${esc(e.texto)}</div>` : ""}
                <div class="texto-polaroid ${e.texto ? "chico" : ""}">${esc(resumenDelDia(e))}</div>
                ${hitos}${notas}
                ${ordenadas.length ? `<button class="boton chico boton-fantasma boton-galeria" data-guardar-foto="1" type="button">Save to Photos</button>` : ""}
              </figcaption>
            </figure>`;
        })
        .join("")}</div>`
    : `<div class="vacio-suave">No pages yet. Take care of Baozi and go places together — this notebook writes itself.</div>`;

  container.innerHTML = `
    ${encabezado("Diary", "btn-volver-consulta")}
    ${cabezaDiario(diario)}
    ${cuerpo}
  `;
}

/**
 * Escribir la pagina de hoy: el personaje a la izquierda (pone la cara del
 * animo que ella elige) y una hoja a la derecha.
 */
export function renderEscribir(container, { entrada = null, foto = null } = {}) {
  const animo = entrada && entrada.animo ? entrada.animo : null;
  const a = animoDe(animo) || ANIMOS[1];
  const pregunta = (entrada && entrada.pregunta) || preguntaDelDia();
  container.innerHTML = `
    <div class="pantalla-escribir con-cuarto">
      <div class="escribir-personaje" id="escribir-personaje">${spriteCara(a.ojo, a.boca)}</div>
      <div class="hoja-escribir papel">
        <div class="hoja-fecha">${esc(fechaLegible(claveDelDia()))}</div>
        <div class="hoja-pregunta">${esc(pregunta)}</div>
        <div class="fila-animos" role="radiogroup" aria-label="How was today?">
          ${ANIMOS.map((x) => `<button class="boton-animo ${x.id === animo ? "elegido" : ""}" data-animo="${x.id}" role="radio" aria-checked="${x.id === animo}" aria-label="${x.nombre}">${caraAnimo(x.id, "mini")}<span>${x.nombre}</span></button>`).join("")}
        </div>
        <textarea id="texto-hoy" maxlength="400" rows="3" placeholder="A few words about today…" data-sin-nombre>${esc((entrada && entrada.texto) || "")}</textarea>
        <div class="hoja-pie">
          ${foto ? `<img class="hoja-foto ${esLisa(foto) ? "lisa" : ""}" src="${foto.dataUrl}" alt="" />` : `<button class="boton boton-fantasma chico" id="btn-foto-hoy">${glifo("camara")} Photo</button>`}
          <div class="hoja-botones">
            <button class="boton boton-fantasma" id="btn-cancelar-hoy">Later</button>
            <button class="boton" id="btn-guardar-hoy">${glifo("check")} Save</button>
          </div>
        </div>
      </div>
    </div>`;
}

const DIAS_CORTOS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MESES_CORTOS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fechaPolaroid(clave) {
  const [y, m, d] = clave.split("-").map(Number);
  return `${DIAS_CORTOS[new Date(y, m - 1, d).getDay()]} ${MESES_CORTOS[m - 1]} ${d}`;
}

/** Pasa a la siguiente foto del dia dentro de una polaroid. */
export function siguienteFotoPolaroid(figura) {
  const dia = figura.dataset.dia;
  const fotos = fotosDelDia(dia);
  const final = fotos.find((f) => f.tipo === "final");
  const ordenadas = final ? [final, ...fotos.filter((f) => f !== final)] : fotos;
  if (ordenadas.length < 2) return;
  const i = (Number(figura.dataset.indice) + 1) % ordenadas.length;
  figura.dataset.indice = String(i);
  const img = figura.querySelector(".imagen-polaroid");
  if (img) {
    img.src = ordenadas[i].dataUrl;
    img.classList.toggle("lisa", esLisa(ordenadas[i]));
  }
  const c = figura.querySelector(".contador-fotos");
  if (c) c.textContent = `${i + 1}/${ordenadas.length}`;
}

// ------------------------------------------------------------------
// Carta: papel crema, como el final. Se lee, no se mira.
// ------------------------------------------------------------------

/**
 * v22: Baozi pregunta los pasos del dia (la app no puede leer la app Salud:
 * ella los mira y los anota). Mismo papel que la hoja del diario.
 */
export function renderPreguntaPasos(container, { clave, cuando = "today", contados = 0, anotados = null } = {}) {
  const ya = anotados != null ? anotados : 0;
  container.innerHTML = `
    <div class="pantalla-escribir con-cuarto pantalla-pasos">
      <div class="escribir-personaje">${spriteCara("ojo_base_energia_alta.png", "boca_base_feliz.png")}</div>
      <div class="hoja-escribir papel">
        <div class="hoja-fecha">${esc(fechaLegible(clave))}</div>
        <div class="hoja-pregunta">How many steps did we walk ${cuando === "yesterday" ? "yesterday" : "today"}?</div>
        <div class="pasos-ayuda">${glifo("pie")} Look in the Health app on your phone ♥</div>
        <label class="fila-pasos">
          <input id="input-pasos" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" placeholder="${Math.max(contados, ya) || "0"}" aria-label="Steps" />
          <span>steps</span>
        </label>
        <div class="pasos-ayuda tenue" id="pasos-nota">${contados > 0 ? `I counted ${contados.toLocaleString("en-US")} while we walked together.` : ""}</div>
        <div class="hoja-botones">
          <button class="boton boton-fantasma" id="btn-pasos-luego">Not now</button>
          <button class="boton" id="btn-pasos-guardar">${glifo("check")} Save</button>
        </div>
      </div>
    </div>`;
}

/** v24: el personaje de rom golpea la puerta con su valijita (la mañana despues del si). */
export function renderMudanza(container, { quien = "baozi", texto = "" } = {}) {
  container.innerHTML = `
    <div class="primer-plano con-cuarto pp-mudanza">
      <div class="pp-figura">
        <div class="pp-primera">${spriteCara("ojo_especial_enamorado.png", "boca_especial_enamorado.png", false, "", { quien })}</div>
        <img class="mudanza-valija" src="${arte("tienda/valija.png")}" alt="" draggable="false" />
      </div>
      <div class="pp-texto deseo-hoja papel">
        <div class="pp-titulo">Knock knock…</div>
        <div class="deseo-grande" data-sin-nombre>“${esc(texto)}”</div>
        <div class="fila-botones"><button class="boton" id="btn-mudanza-si">${glifo("corazon")} Yes ♥</button></div>
      </div>
    </div>`;
}

/** v24: la tele tiene dos juegos: se elige cual (con el libro de peces). */
export function renderJuegos(container, { recordSnack = 0, recordPesca = 0, libro = [] } = {}) {
  const pescados = libro.filter((p) => p.n > 0).length;
  container.innerHTML = `
    <div class="pantalla-juegos con-cuarto">
      <button class="boton-volver volver-flotante" id="btn-volver-juegos" aria-label="Back">${glifo("atras")}</button>
      <div class="juegos-titulo">What shall we play?</div>
      <div class="juegos-fila">
        <button class="tarjeta-juego" id="btn-juego-snack">
          <span class="juego-arte"><img src="${arte("comida/juego_bao_dorado.png")}" alt="" draggable="false" /></span>
          <span class="juego-nombre">Snack Rain</span>
          <span class="juego-best">Best ${recordSnack}</span>
        </button>
        <button class="tarjeta-juego" id="btn-juego-pesca">
          <span class="juego-arte pez"><img src="${arte("pesca/pez_koi.png")}" alt="" draggable="false" /></span>
          <span class="juego-nombre">Lake Fishing</span>
          <span class="juego-best">Best ${recordPesca}</span>
        </button>
      </div>
      <div class="libro-peces" aria-label="Fish book: ${pescados} of ${libro.length}">
        <span class="libro-titulo">Fish book ${pescados}/${libro.length}</span>
        ${libro
          .map(
            (p) => `<span class="libro-pez ${p.n ? "" : "sin"}" title="${p.n ? esc(p.nombre) : "???"}"><img src="${arte(`pesca/pez_${p.id}.png`)}" alt="" draggable="false" />${p.n ? `<small>×${p.n}</small>` : "<small>?</small>"}</span>`,
          )
          .join("")}
      </div>
    </div>`;
}

/** v24: la tarjeta del deseo del dia (primer plano del personaje con su nubecita). */
export function renderDeseo(container, { texto, real = false, estado = "escuchado", progreso = 0, meta = 0 } = {}) {
  const cumplido = estado === "cumplido";
  const pie = cumplido
    ? `<button class="boton" id="btn-deseo-ok">${glifo("corazon")} Yay!</button>`
    : real
      ? `<button class="boton boton-fantasma" id="btn-deseo-luego">Later</button><button class="boton" id="btn-deseo-hecho">${glifo("check")} Done ♥</button>`
      : `<button class="boton" id="btn-deseo-ok">${glifo("corazon")} Okay!</button>`;
  container.innerHTML = `
    <div class="primer-plano con-cuarto pp-deseo">
      ${figuraPrimerPlano(cumplido ? "ojo_especial_euforico.png" : "ojo_especial_curioso.png", cumplido ? "boca_especial_euforico.png" : "boca_especial_curioso.png")}
      <div class="pp-texto deseo-hoja papel">
        <div class="pp-titulo">${cumplido ? "My wish came true!" : "Baozi's wish"}</div>
        <div class="deseo-grande">“${esc(texto)}”</div>
        ${!cumplido && meta ? `<div class="deseo-progreso">${Math.min(meta, progreso)} / ${meta}</div>` : ""}
        <div class="deseo-nota">${cumplido ? "Thank you ♥ (+10 coins)" : real ? "A wish for real life. Tap Done when you did it ♥" : "It comes true by itself when you do it. +10 coins"}</div>
        <div class="fila-botones">${pie}</div>
      </div>
    </div>`;
}

export function renderCarta(container, carta) {
  if (!carta) return;
  container.innerHTML = `
    <div class="papel carta-papel">
      <div class="sello-carta">${glifo("corazon", "x4")}</div>
      <div class="carta-titulo">${esc(carta.titulo)}</div>
      <div class="carta-texto" data-sin-nombre>${esc(carta.texto)}</div>
      <button id="btn-continuar-carta" class="boton">Continue</button>
    </div>
  `;
}
