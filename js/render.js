import { arte } from "./arte.js";

import * as Personaje from "./personaje.js";

import { buscarCategoria } from "./gameController.js";

import { TRAITS, TRAIT_NOMBRES, PESO_HISTORICO, PESO_RECIENTE, FELICIDAD_A_BOCA } from "./petState.js";

import { LUGARES, NPCS, VECES_PARA_ENAMORADO, CATEGORIAS, SELLOS_PROPIOS } from "./mundo.js";

import { resumenDelDia, fotoDelDia, fechaLegible, ANIMOS, preguntaDelDia, claveDelDia, claveDelDiaLogico } from "./diario.js";

import { buscarCarta } from "./cartas.js";

import { papelDe, HOJAS, ANILLOS, PAPELES_CUADERNO } from "./estiloDiario.js";

import { SECCIONES_ALBUM, TOTAL_ALBUM, srcStickerLugar, tieneSticker } from "./album.js";

import { fotosDelDia, fotoDeLugar } from "./camara.js";

import { RECORTES_MENU } from "./recortes.js";

import { AMIGOS, REGALOS, MAX_CORAZONES } from "./amigos.js";

import { CATALOGO, ULTIMA_SEMANA } from "./tienda.js";

import { rutaCuarto } from "./pieza.js";

import { mapaDe } from "./mapaDia.js";

import * as Donde from "./dondeEstuvimos.js";

const HAY_BOCA_ABIERTA = true;

const ARCHIVO_BOCA_ABIERTA = "boca_especial_sorprendido.png";

export const ESPECIALES_CON_ARTE = new Set([ "aburrido", "asqueado", "asustado", "curioso", "decepcionado", "enamorado", "euforico", "hambriento", "sorprendido" ]);

function esc(s) {
    return String(s ?? "").replace(/[&<>"]/g, (c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;"
    }[c])));
}

export function glifo(nombre, clase = "") {
    return `<i class="glifo g-${nombre} ${clase}" aria-hidden="true"></i>`;
}

export function spriteCara(archivoOjo, archivoBoca, parpadeando = false, clase = "", opts = {}) {
    const pose = opts.pose || (archivoOjo === "ojo_dormida.png" ? "dormido" : "parado");
    const quien = opts.quien || Personaje.actual();
    const capas = Personaje.capas(archivoOjo, archivoBoca, pose, quien);
    const imgs = capas.map((c => {
        if (c.tipo === "cara") return `<img class="capa-ojos capa-cara cara-arriba" src="${arte(c.src)}" alt="" draggable="false" /><img class="capa-cara cara-abajo" src="${arte(c.src)}" alt="" draggable="false" />`;
        const cls = c.tipo === "cuerpo" ? "capa-cuerpo" : `capa-${c.tipo}`;
        return `<img class="${cls}" src="${arte(c.src)}" alt="" draggable="false" />`;
    })).join("");
    return `\n    <div class="sprite-cara estilo-${Personaje.estilo(quien)} ${parpadeando ? "parpadeando" : ""} ${clase}" data-ojo="${archivoOjo}" data-boca="${archivoBoca}">\n      ${imgs}\n    </div>\n  `;
}

export function cambiarCara(spriteEl, archivoOjo, archivoBoca) {
    if (!spriteEl) return;
    spriteEl.dataset.ojo = archivoOjo;
    if (Personaje.esMantou()) {
        const src = arte(Personaje.caraMantou(Personaje.estadoDeArchivos(archivoOjo, archivoBoca)));
        spriteEl.querySelectorAll(".capa-cara").forEach((c => c.src = src));
        return;
    }
    const ojos = spriteEl.querySelector(".capa-ojos");
    const boca = spriteEl.querySelector(".capa-boca");
    if (ojos) ojos.src = arte("caras/" + archivoOjo);
    if (boca) boca.src = arte("caras/" + archivoBoca);
}

export function cambiarBoca(spriteEl, archivoBoca) {
    if (!spriteEl) return;
    if (Personaje.esMantou()) {
        const src = arte(Personaje.caraMantou(Personaje.estadoDeArchivos(spriteEl.dataset.ojo, archivoBoca)));
        spriteEl.querySelectorAll(".capa-cara").forEach((c => c.src = src));
        return;
    }
    const boca = spriteEl.querySelector(".capa-boca");
    if (boca) boca.src = arte("caras/" + archivoBoca);
}

function esLisa(foto) {
    return !!foto && typeof foto.dataUrl === "string" && foto.dataUrl.startsWith("data:image/jpeg");
}

function caraSegunEstado(estado, parpadeando = false) {
    const archivoOjo = `ojo_base_energia_${estado.nivelEnergia}.png`;
    const archivoBoca = `boca_base_${FELICIDAD_A_BOCA[estado.nivelFelicidad] ?? "neutral"}.png`;
    return spriteCara(archivoOjo, archivoBoca, parpadeando);
}

function encabezado(titulo, idVolver) {
    return `\n    <div class="encabezado-vista">\n      <button class="boton-volver" id="${idVolver}" aria-label="Back">${glifo("atras")}</button>\n      <div class="titulo-vista">${esc(titulo)}</div>\n    </div>`;
}

const PIPS_POR_STAT = 5;

function pipsLlenos(valor, total = PIPS_POR_STAT) {
    if (valor <= 0) return 0;
    return Math.max(1, Math.min(total, Math.round(valor / (100 / total))));
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

export function renderElegir(container, {cargaFallida: cargaFallida = false} = {}) {
    const tarjeta = (quien, frase) => `\n    <button class="tarjeta-personaje" data-personaje="${quien}" aria-label="${Personaje.nombre(quien)}">\n      <div class="tarjeta-personaje-figura">${spriteCara("ojo_base_energia_neutral.png", "boca_base_neutral.png", false, "", {
        quien: quien
    })}</div>\n      <div class="tarjeta-personaje-nombre">${Personaje.nombre(quien)}</div>\n      <div class="tarjeta-personaje-frase">${frase}</div>\n    </button>`;
    container.innerHTML = `\n    <div class="pantalla-elegir con-cuarto" id="pantalla-elegir">\n      <div class="rotulo-elegir">Who's coming home with you?</div>\n      <div class="fila-personajes">\n        ${tarjeta("baozi", "Spiky, dramatic, secretly soft.")}\n        ${tarjeta("mantou", "White, calm, a little bit judgy.")}\n      </div>\n      <div class="pista-huevo">you can only pick once</div>\n      <div class="restaurar-inicio" style="position:absolute;right:max(16px,env(safe-area-inset-right));bottom:max(8px,env(safe-area-inset-bottom));max-width:46%;display:flex;flex-direction:column;align-items:flex-end;gap:4px;text-align:right;font-size:13px">\n        ${cargaFallida ? `<div class="mensaje-backup error" style="margin:0;font-size:13px">Your saved game couldn't be read. Restore a backup, or start again (the old data stays on this phone).</div>` : ""}\n        <div id="mensaje-restaurar-inicio" class="mensaje-backup" style="margin:0;font-size:13px" aria-live="polite"></div>\n        <label class="enlace-restaurar" style="text-decoration:underline;opacity:.8;cursor:pointer;padding:6px 0">\n          Restore from backup\n          <input type="file" id="input-restaurar-inicio" hidden />\n        </label>\n      </div>\n    </div>`;
}

export const TUTORIAL = [ {
    titulo: "This is your room",
    texto: "Tap anything to use it: the fridge to eat and drink, the bucket for a bath, the TV to play, the camera for photos, the radio for music. Keep Baozi happy!",
    arte: [ "pieza/heladera.png", "pieza/balde.png", "pieza/tele.png", "pieza/camara.png" ]
}, {
    titulo: "Your notebook",
    texto: "The notebook on the little table is your diary. Write a page every night. Your friends, the shop and your settings live there too.",
    arte: [ "pieza/mesita.png" ]
}, {
    titulo: "Go out together",
    texto: "Open the app when you're out in Hangzhou: places stamp themselves on the map on the wall. In the evening, tell Baozi your steps from the Health app.",
    arte: [ "pieza/corcho.png", "pieza/sello_pagoda.png" ]
}, {
    titulo: "Friends will visit",
    texto: "Sometimes a friend knocks on the window. Say hi! They'll ask for little favors and send you gifts.",
    arte: [ "npcs/npc_usagi.png", "npcs/npc_mimi.png" ]
} ];

export function renderTutorial(container, i) {
    const c = TUTORIAL[i];
    const ultima = i === TUTORIAL.length - 1;
    container.innerHTML = `\n    <div class="pantalla-tutorial con-cuarto" id="pantalla-tutorial">\n      <div class="tarjeta-tutorial papel">\n        <div class="tutorial-arte">${c.arte.map((a => `<img src="${arte(a)}" alt="" draggable="false" />`)).join("")}</div>\n        <div class="tutorial-titulo">${esc(c.titulo)}</div>\n        <div class="tutorial-texto">${esc(c.texto)}</div>\n        <div class="tutorial-puntos">${TUTORIAL.map(((_, k) => `<i class="${k === i ? "activo" : ""}"></i>`)).join("")}</div>\n        <div class="fila-botones">\n          ${ultima ? "" : `<button class="boton boton-fantasma" id="tutorial-saltar">Skip</button>`}\n          <button class="boton" id="tutorial-seguir">${ultima ? "Let's go!" : "Next"}</button>\n        </div>\n      </div>\n    </div>`;
}

export function renderHuevo(container) {
    container.innerHTML = `\n    <div class="pantalla-huevo con-cuarto" id="pantalla-huevo">\n      <div class="huevo" id="huevo">\n        <img class="huevo-sprite" src="${arte(Personaje.esMantou() ? "final/huevo_blanco.png" : "final/huevo.png")}" alt="" draggable="false" />\n        <img class="huevo-grieta" src="${arte(Personaje.esMantou() ? "final/grieta_blanco.png" : "final/grieta.png")}" alt="" draggable="false" />\n      </div>\n      <div class="sombra-huevo"></div>\n      <div class="rotulo-huevo" id="rotulo-huevo">Something's hatching…</div>\n      <div class="pista-huevo">tap the egg</div>\n    </div>`;
}

export function renderNombre(container) {
    container.innerHTML = `\n    <div class="pantalla-nombre con-cuarto">\n      <div class="nombre-cara rebote">${spriteCara("ojo_especial_euforico.png", "boca_especial_euforico.png")}</div>\n      <div class="nombre-lado">\n        <div class="caja-dialogo">\n          <div class="caja-dialogo-nombre">${Personaje.nombre().toUpperCase()}</div>\n          <div class="caja-dialogo-texto" id="nombre-saludo"></div>\n        </div>\n        <div class="fila-nombre">\n          <input id="input-nombre" type="text" maxlength="12" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="your name" aria-label="Your name" />\n          <button class="boton" id="btn-confirmar-nombre">${glifo("check")} OK</button>\n        </div>\n      </div>\n    </div>\n  `;
}

function svgCaraEspecial(tipo) {
    return `<div class="cara-sin-arte">${esc(tipo.toUpperCase())}</div>`;
}

export function necesidades(mascota) {
    const s = mascota.stats;
    const lista = [];
    if (mascota.enferma) lista.push({
        glifo: "exclama",
        objeto: "botiquin",
        texto: "I don't feel so good… medicine?"
    });
    if (s.hambre <= 30) lista.push({
        glifo: "tenedor",
        objeto: "heladera",
        texto: "I'm hungry…"
    });
    if (s.sed <= 30) lista.push({
        glifo: "gota",
        objeto: "heladera",
        texto: "I'm thirsty…"
    });
    if (s.higiene <= 30) lista.push({
        glifo: "burbuja",
        objeto: "balde",
        texto: "I need a bath…"
    });
    if (!mascota.dormida && s.energia <= 20) lista.push({
        glifo: "estrella",
        objeto: "farol",
        texto: "So sleepy…"
    });
    if (!mascota.dormida && s.aburrimiento >= 70) lista.push({
        glifo: "corazon",
        objeto: "tele",
        texto: "Let's play?"
    });
    return lista;
}

export function reloj(fecha = new Date) {
    return `${String(fecha.getHours()).padStart(2, "0")}:${String(fecha.getMinutes()).padStart(2, "0")}`;
}

export function renderCara(container, mascota, estado, opts = {}) {
    const {especialActiva: especialActiva = null, parpadeando: parpadeando = false, fotoPedida: fotoPedida = false, desdeElSi: desdeElSi = null, saludo: saludo = ""} = opts;
    let contenidoCara;
    if (especialActiva && ESPECIALES_CON_ARTE.has(especialActiva)) {
        contenidoCara = spriteCara(`ojo_especial_${especialActiva}.png`, `boca_especial_${especialActiva}.png`);
    } else if (especialActiva) {
        contenidoCara = svgCaraEspecial(especialActiva);
    } else if (fotoPedida) {
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
        linea = "Are we at the lake? Tap me for a little surprise :)";
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
    container.innerHTML = `\n    <div class="pantalla-cara ${mascota.dormida && !fotoPedida ? "de-noche" : ""}">\n      <div class="barra-estado">\n        <button class="reloj" id="reloj" aria-label="Clock">${reloj()}</button>\n        ${desdeElSi ? `<div class="compromiso"><img src="${arte("final/anillo.png")}" alt="" /> ${esc(desdeElSi)}</div>` : ""}\n        <div class="necesidades">${lista.map((n => glifo(n.glifo, "necesidad"))).join("")}</div>\n      </div>\n      <div class="caja-cara">\n        ${contenidoCara}\n      </div>\n      <div class="linea-mochi ${claseLinea}" id="linea-mochi">${esc(linea)}</div>\n    </div>\n  `;
}

export function archivosCara(mascota, estado, {especialActiva: especialActiva = null, fotoPedida: fotoPedida = false} = {}) {
    if (especialActiva && ESPECIALES_CON_ARTE.has(especialActiva)) return [ `ojo_especial_${especialActiva}.png`, `boca_especial_${especialActiva}.png` ];
    if (fotoPedida) return [ "ojo_especial_euforico.png", "boca_especial_euforico.png" ];
    if (estado.tipo === "enferma") return [ "ojo_enferma.png", "boca_enferma.png" ];
    if (estado.tipo === "dormida") return [ "ojo_dormida.png", "boca_dormida.png" ];
    if (estado.tipo === "aburrido") return [ "ojo_especial_aburrido.png", "boca_especial_aburrido.png" ];
    return [ `ojo_base_energia_${estado.nivelEnergia}.png`, `boca_base_${FELICIDAD_A_BOCA[estado.nivelFelicidad] ?? "neutral"}.png` ];
}

export function globoCara(mascota, {fotoPedida: fotoPedida = false, saludo: saludo = ""} = {}) {
    if (fotoPedida) return {
        texto: "Are we at the lake? Tap me for a little surprise :)",
        rosa: true
    };
    if (saludo) return {
        texto: saludo,
        rosa: false
    };
    if (mascota.dormida) return {
        texto: "",
        rosa: false
    };
    const lista = necesidades(mascota);
    return {
        texto: lista.length ? lista[0].texto : "",
        rosa: false
    };
}

export const HELADERA = [ {
    src: "comida/comida_bao.png",
    accion: "feed",
    x: 56,
    y: 40,
    nombre: "Bao"
}, {
    src: "comida/comida_onigiri.png",
    accion: "feed",
    x: 84,
    y: 40,
    nombre: "Onigiri"
}, {
    src: "comida/comida_dumpling.png",
    accion: "feed",
    x: 112,
    y: 40,
    nombre: "Dumpling"
}, {
    src: "comida/comida_manzana.png",
    accion: "feed",
    x: 142,
    y: 40,
    nombre: "Cherries"
}, {
    src: "comida/bebida_te.png",
    accion: "water",
    x: 64,
    y: 76,
    nombre: "Milk tea"
}, {
    src: "comida/bebida_agua.png",
    accion: "water",
    x: 92,
    y: 76,
    nombre: "Water"
}, {
    src: "comida/comida_naranja.png",
    accion: "feed",
    x: 128,
    y: 76,
    nombre: "Watermelon"
} ];

const xTienda = (i, n) => n <= 3 ? 76 + i * 24 : 100 + (i - (n - 1) / 2) * Math.min(24, 156 / (n - 1));

const X_MACETAS = [ 40, 80, 120, 160 ];

const Y_ESTANTE = 92;

function etiquetaMaceta(e) {
    if (!e) return {
        nombre: "",
        estado: "+ Plant",
        clase: "vacia"
    };
    if (e.lista) return {
        nombre: e.nombre,
        estado: "Ready! ♥",
        clase: "lista"
    };
    if (e.mustia) return {
        nombre: e.nombre,
        estado: "Thirsty!",
        clase: "sed"
    };
    return {
        nombre: e.nombre,
        estado: `Day ${e.dia}/${e.dias}${e.regadaHoy ? " ✓" : ""}`,
        clase: e.regadaHoy ? "regada" : ""
    };
}

export function renderJardin(container, {momento: momento = "dia", cuarto: cuarto = "depto", estados: estados = [], semillas: semillas = [], eligiendo: eligiendo = null, aviso: aviso = "", quiereAgua: quiereAgua = false} = {}) {
    const fondoCuarto = cuarto && cuarto !== "depto" ? `jardin/balcon_${cuarto}_${momento}.png` : `jardin/balcon_${momento}.png`;
    const pct = (v, total) => `${(v / total * 100).toFixed(3)}%`;
    const macetas = X_MACETAS.map(((x, i) => {
        const e = estados[i] || null;
        const et = etiquetaMaceta(e);
        const planta = e ? `<img class="planta-jardin" src="${arte(`jardin/${e.planta}_${e.etapa}${e.mustia && e.etapa > 0 ? "m" : ""}.png`)}" alt="" draggable="false" />` : "";
        return `\n      <button class="maceta-jardin ${e && e.lista ? "lista" : ""} ${e && e.mustia ? "mustia" : ""}" data-maceta="${i}"\n        style="left:${pct(x - 13, 200)};top:${pct(Y_ESTANTE - 12 - 39, 112)}" aria-label="${esc(e ? `${et.nombre}: ${et.estado}` : "Empty pot: plant a seed")}">\n        ${planta}\n        <img class="maceta-img" src="${arte("jardin/maceta.png")}" alt="" draggable="false" />\n        <span class="etiqueta-maceta ${et.clase}">${et.nombre ? `<b>${esc(et.nombre)}</b>` : ""}${esc(et.estado)}</span>\n      </button>`;
    })).join("");
    const eligiendoHtml = eligiendo === null ? "" : `<div class="semillas-jardin papel" role="dialog" aria-label="Choose a seed">\n          <div class="semillas-titulo">What shall we plant?</div>\n          ${semillas.length ? `<div class="semillas-fila">${semillas.map((s => `<button class="semilla-jardin" data-semilla="${esc(s.planta)}">\n                      <img src="${arte(`jardin/semilla_${s.planta}.png`)}" alt="" draggable="false" />\n                      <span class="semilla-nombre">${esc(s.nombre)}</span>\n                      <span class="semilla-n">×${s.n} · ${s.dias} days</span>\n                    </button>`)).join("")}</div>` : `<div class="vacio-suave">No seeds yet. Get some at the shop (notebook → Shop) ♥</div>`}\n          <div class="fila-botones"><button class="boton boton-fantasma chico" id="btn-semilla-cancelar">Not now</button></div>\n        </div>`;
    container.innerHTML = `\n    <div class="pantalla-jardin con-cuarto" data-momento="${esc(momento)}">\n      <div class="jardin-caja">\n        <img class="jardin-fondo" src="${arte(fondoCuarto)}" alt="" draggable="false" />\n        ${macetas}\n        <button class="regadera-jardin ${quiereAgua ? "" : "sin-sed"}" id="btn-regar" style="left:${pct(170, 200)};top:${pct(83, 112)}" aria-label="Water the plants">\n          <img src="${arte("jardin/regadera.png")}" alt="" draggable="false" />\n          <span class="etiqueta-maceta regar">Water ♥</span>\n        </button>\n      </div>\n      <div class="aviso-jardin ${aviso ? "" : "oculto"}" id="aviso-jardin" aria-live="polite">${esc(aviso)}</div>\n      ${eligiendoHtml}\n      <button class="boton-volver volver-flotante" id="btn-volver-jardin" aria-label="Back to the room">${glifo("atras")}</button>\n    </div>`;
}

export function renderHeladera(container, especiales = []) {
    const deLaTienda = especiales.map(((it, i) => `\n      <button class="item-heladera item-tienda ${it.manana ? "manana" : ""}" data-comida-tienda="${esc(it.id)}"\n        style="left:${xTienda(i, especiales.length) / 200 * 100}%;top:${98 / 112 * 100}%" aria-label="${esc(it.nombre)} (${it.n})">\n        <img src="${arte(it.arte)}" alt="" draggable="false" />\n        <span class="cuantos-tienda">${it.manana ? "Tomorrow" : `×${it.n}`}</span>\n        <span class="etiqueta-item">${esc(it.nombre)}</span>\n      </button>`)).join("");
    const items = deLaTienda + HELADERA.map(((it, i) => `\n      <button class="item-heladera" data-comida="${it.accion}" data-item="${it.src}" ${i === 0 ? 'id="btn-heladera-feed"' : it.src.endsWith("agua.png") ? 'id="btn-heladera-water"' : ""}\n        style="left:${it.x / 200 * 100}%;top:${it.y / 112 * 100}%" aria-label="${esc(it.nombre)}">\n        <img src="${arte(it.src)}" alt="" draggable="false" />\n        <span class="etiqueta-item">${esc(it.nombre)}</span>\n      </button>`)).join("");
    container.innerHTML = `\n    <div class="pantalla-heladera con-cuarto">\n      <div class="heladera-caja">\n        <img class="heladera-fondo" src="${arte(rutaCuarto("heladera_adentro.png"))}" alt="" draggable="false" />\n        ${items}\n      </div>\n      <div class="heladera-espia">${spriteCara("ojo_especial_hambriento.png", "boca_especial_hambriento.png")}</div>\n      <button class="boton-volver volver-flotante" id="btn-volver-heladera" aria-label="Close the fridge">${glifo("atras")}</button>\n    </div>`;
}

const MESES = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];

function fechaDeMs(ms) {
    const f = new Date(ms);
    return `${MESES[f.getMonth()]} ${f.getDate()}`;
}

const LUGARES_CON_FOTO = new Set([ "westlake", "longjing", "lingyin" ]);

const LUGARES_CON_RECUERDO = new Set([ "westlake", "longjing", "lingyin", "leifeng" ]);

export function arteDeLugar(id) {
    if (LUGARES_CON_FOTO.has(id)) return arte("lugares/lugar_" + id + ".png");
    return arte(LUGARES_CON_RECUERDO.has(id) ? "pieza/recuerdo_" + id + ".png" : "pieza/recuerdo_generico.png");
}

function imagenDePostal(lugar, foto) {
    if (foto) return `<img class="postal-foto-img" src="${foto}" alt="" draggable="false" />`;
    if ([ "westlake", "longjing", "lingyin" ].includes(lugar.id)) return `<img class="postal-foto-img" src="${arte("lugares/lugar_" + lugar.id + ".png")}" alt="" draggable="false" />`;
    return `<div class="postal-sin-foto"><img src="${arte("pieza/sello_" + lugar.sello + ".png")}" alt="" draggable="false" /></div>`;
}

function stickerBaozi() {
    return `<div class="sticker-baozi" aria-hidden="true">${spriteCara("ojo_especial_euforico.png", "boca_especial_euforico.png")}</div>`;
}

function formLugar(form) {
    const nuevo = form.modo === "nuevo";
    const sellos = SELLOS_PROPIOS.map((s => `<button class="sello-opcion ${s === form.sello ? "elegido" : ""}" type="button" data-sello="${s}" role="radio" aria-checked="${s === form.sello}" aria-label="${s}">\n      <img src="${arte("pieza/sello_" + s + ".png")}" alt="" draggable="false" />\n    </button>`)).join("");
    return `\n    <div class="postal postal-form" id="form-lugar">\n      <div class="postal-nombre">${nuevo ? "A place of ours" : "Our place"}</div>\n      <input id="lugar-nombre" type="text" maxlength="28" autocomplete="off" autocapitalize="sentences" spellcheck="false" placeholder="Name it (our first coffee…)" aria-label="Name of the place" value="${esc(form.nombre || "")}" data-sin-nombre />\n      <textarea id="lugar-recuerdo" maxlength="90" rows="2" placeholder="What happened here? (optional)" aria-label="A memory of this place" data-sin-nombre>${esc(form.recuerdo || "")}</textarea>\n      <div class="fila-sellos" role="radiogroup" aria-label="Stamp">${sellos}</div>\n      <div class="aviso-lugar ${form.error ? "error" : ""}" id="aviso-lugar" aria-live="polite">${esc(form.aviso || (nuevo ? "It gets stamped right where you are now." : ""))}</div>\n      <div class="fila-botones">\n        <button class="boton boton-fantasma chico" type="button" id="btn-lugar-cancelar">Cancel</button>\n        ${nuevo ? "" : `<button class="boton boton-fantasma chico" type="button" id="btn-lugar-borrar">${form.borrar ? "Tap again" : "Delete"}</button>`}\n        <button class="boton chico" type="button" id="btn-lugar-ok" ${form.buscando ? "disabled" : ""}>${nuevo ? `${glifo("pin")} Stamp it here` : `${glifo("check")} Save`}</button>\n      </div>\n    </div>`;
}

export function renderMapa(container, opts) {
    const {lugares: lugares, sellados: sellados, fechas: fechas, seleccionado: seleccionado, ubicacion: ubicacion, fotoDe: fotoDe, posicion: posicion, form: form = null, puedeAgregar: puedeAgregar = true, real: real = null, armando: armando = false} = opts;
    const sel = lugares.find((l => l.id === seleccionado)) || lugares[0];
    const marcas = lugares.map((l => {
        const hecho = sellados.has(l.id);
        let donde;
        if (real) {
            const p = real.posicion(l.lat, l.lon);
            donde = `data-mx="${p.x}" data-my="${p.y}"`;
        } else {
            const {x: x, y: y} = posicion(l.lat, l.lon);
            donde = `style="left:${(x * 100).toFixed(1)}%;top:${(y * 100).toFixed(1)}%"`;
        }
        return `<button class="sello-mapa ${hecho ? "hecho" : "falta"} ${l.id === sel.id ? "elegido" : ""}" data-lugar="${l.id}" ${donde} aria-label="${esc(l.nombre)}">\n        ${hecho ? `<img src="${arte("pieza/sello_" + l.sello + ".png")}" alt="" draggable="false" />` : "<span>?</span>"}\n      </button>`;
    })).join("");
    const papel = real ? `<div class="mapa-papel real" id="mapa-real">\n          <img class="mapa-real-img" id="mapa-real-img" src="${real.png}" alt="Map of Hangzhou" draggable="false" />\n          <div class="mapa-real-sellos">${marcas}</div>\n          <div class="mapa-zoom">\n            <button class="boton-volver" type="button" id="btn-zoom-mas" aria-label="Zoom in">+</button>\n            <button class="boton-volver" type="button" id="btn-zoom-menos" aria-label="Zoom out">−</button>\n          </div>\n          <span class="mapa-credito">© OpenStreetMap</span>\n        </div>` : `<div class="mapa-papel">\n          <img class="mapa-img" src="${arte("pieza/mapa.png")}" alt="Map of Hangzhou" draggable="false" />\n          ${marcas}\n        </div>`;
    const hecho = sellados.has(sel.id);
    let lado;
    if (form) {
        lado = formLugar(form);
    } else if (hecho) {
        lado = `\n      <figure class="postal">\n        <div class="postal-foto">${imagenDePostal(sel, fotoDe(sel.id))}${stickerBaozi()}</div>\n        <img class="postal-sello" src="${arte("pieza/sello_" + sel.sello + ".png")}" alt="" draggable="false" />\n        <figcaption>\n          <div class="postal-nombre" ${sel.deElla ? "data-sin-nombre" : ""}>${esc(sel.nombre)}</div>\n          <div class="postal-fecha">Stamped ${esc(fechaDeMs(fechas[sel.id] || Date.now()))}</div>\n          <div class="postal-frase" ${sel.deElla ? "data-sin-nombre" : ""}>“${esc(sel.recuerdo || sel.frase)}”</div>\n          ${sel.deElla ? `<button class="boton-texto editar-lugar" type="button" id="btn-editar-lugar">Edit</button>` : ""}\n        </figcaption>\n      </figure>`;
    } else {
        const accion = ubicacion === "pedir" ? `<button class="boton" id="btn-ubicacion">${glifo("pin")} Let Baozi know where we are</button>` : ubicacion === "sin" ? `<button class="boton boton-fantasma" id="btn-aqui">${glifo("pin")} We're here now</button>` : "";
        lado = `\n      <div class="postal postal-vacia">\n        <div class="postal-nombre">${esc(sel.nombre)}</div>\n        <div class="postal-hueco">${glifo("pin", "x4")}</div>\n        <div class="postal-frase">Not stamped yet. Open Baozi when you're there together.</div>\n        ${accion}\n      </div>`;
    }
    container.innerHTML = `\n    <div class="pantalla-mapa">\n      <div class="mapa-cabecera">\n        <button class="boton-volver" id="btn-volver-mapa" aria-label="Back">${glifo("atras")}</button>\n        <div class="titulo-vista">Hangzhou · ${lugares.filter((l => sellados.has(l.id))).length}/${lugares.length}</div>\n        ${armando ? `<span class="mapa-estado">Drawing the real map…</span>` : ""}\n        ${puedeAgregar && !form ? `<button class="boton chico boton-agregar-lugar" type="button" id="btn-agregar-lugar">+ Our place</button>` : ""}\n        <div class="colecciones">${Object.entries(CATEGORIAS).map((([id, nombre]) => {
        const de = lugares.filter((l => (l.categoria || "propio") === id));
        if (!de.length) return "";
        const n = de.filter((l => sellados.has(l.id))).length;
        return `<span class="coleccion ${n === de.length ? "completa" : ""}">${esc(nombre)} ${n}/${de.length}</span>`;
    })).join("")}</div>\n      </div>\n      <div class="mapa-cuerpo">\n        ${papel}\n        <div class="mapa-lado">${lado}</div>\n      </div>\n    </div>`;
}

export function renderSello(container, lugar) {
    container.innerHTML = `\n    <div class="pantalla-sello">\n      <div class="papel-sello">\n        <div class="rotulo-sello">NEW STAMP</div>\n        <div class="nombre-sello">${esc(lugar.nombre)}</div>\n        <div class="huella-sello" id="huella-sello"><img src="${arte("pieza/sello_" + lugar.sello + ".png")}" alt="" draggable="false" /></div>\n        <div class="caja-dialogo frase-sello">\n          <div class="caja-dialogo-nombre">${Personaje.nombre().toUpperCase()}</div>\n          <div class="caja-dialogo-texto" id="frase-sello"></div>\n        </div>\n        ${tieneSticker(lugar.id) ? `<div class="sticker-nuevo oculto" id="sticker-nuevo"><img src="${arte(srcStickerLugar(lugar.id))}" alt="" draggable="false" /><span><b>NEW STICKER!</b>It's in your album, your camera and your diary.</span></div>` : ""}\n        <div class="fila-botones oculto" id="botones-sello">\n          <button class="boton boton-fantasma" id="btn-sello-despues">Later</button>\n          <button class="boton" id="btn-sello-foto">${glifo("camara")} Postcard photo</button>\n        </div>\n      </div>\n    </div>`;
}

export function renderPostal(container, lugar, foto, fechaMs) {
    container.innerHTML = `\n    <div class="pantalla-postal">\n      <figure class="postal grande">\n        <div class="postal-foto">${imagenDePostal(lugar, foto)}${stickerBaozi()}</div>\n        <img class="postal-sello" src="${arte("pieza/sello_" + lugar.sello + ".png")}" alt="" draggable="false" />\n        <figcaption>\n          <div class="postal-nombre">${esc(lugar.nombre)}</div>\n          <div class="postal-fecha">${esc(fechaDeMs(fechaMs))}</div>\n        </figcaption>\n      </figure>\n      <div class="fila-botones">\n        ${foto ? `<button class="boton boton-fantasma boton-galeria" id="btn-postal-guardar" type="button">Save to Photos</button>` : ""}\n        <button class="boton" id="btn-postal-listo">${glifo("pin")} Pin it on the board</button>\n      </div>\n    </div>`;
}

export const PESTANAS_CUADERNO = [ [ "diary", "Days" ], [ "npcs", "Friends" ], [ "closet", "Closet" ], [ "shop", "Shop" ], [ "stats", "Baozi" ], [ "ajustes", "Settings" ] ];

export function renderCuaderno(container, pestana, contenido, estilo = null) {
    const cl = estilo ? `hojas-${estilo.hojas} anillos-${estilo.anillos}` : "";
    container.innerHTML = `\n    <div class="cuaderno ${cl}" data-pestana="${pestana}">\n      <div class="cuaderno-hoja">\n        <div class="cuaderno-espiral" aria-hidden="true"></div>\n        <div class="cuaderno-contenido">${contenido}</div>\n      </div>\n      <nav class="cuaderno-pestanas">\n        ${PESTANAS_CUADERNO.map((([id, nombre]) => `<button class="pestana ${id === pestana ? "activa" : ""}" data-pestana="${id}">${esc(nombre)}</button>`)).join("")}\n      </nav>\n      <button class="boton-volver cuaderno-cerrar" id="btn-volver-consulta" aria-label="Close the notebook">${glifo("cerrar")}</button>\n    </div>`;
}

export function htmlAjustes(sonidoOn, lugaresOn = true, {fotos: fotos = 0, conVideo: conVideo = false} = {}) {
    return `\n    <div class="lista-journal">\n      <div class="subtitulo-lista">Sound</div>\n      <div class="fila-botones">\n        <button class="boton ${sonidoOn ? "" : "boton-fantasma"}" id="btn-ajuste-sonido">${glifo("nota")} Sound ${sonidoOn ? "ON" : "OFF"}</button>\n      </div>\n      <div class="subtitulo-lista">Diary map</div>\n      <div class="cuerpo-backup">Baozi remembers the places where you open the app and draws the map of your day. It stays only on this phone.</div>\n      <div class="fila-botones">\n        <button class="boton ${lugaresOn ? "" : "boton-fantasma"}" id="btn-ajuste-lugares">${glifo("pin")} Places ${lugaresOn ? "ON" : "OFF"}</button>\n      </div>\n      <div class="subtitulo-lista">Help</div>\n      <div class="fila-botones">\n        <button class="boton boton-fantasma" id="btn-ver-tutorial">How to play</button>\n      </div>\n      <div class="subtitulo-lista">Backup</div>\n      <div class="cuerpo-backup">\n        Baozi lives only on this phone. If the browser data gets cleared or you change phones,\n        a backup file is the only way to bring Baozi along.\n        <span class="tenue">(${conVideo ? "Your photos and our video go in it too." : "Your photos go in it too."})</span>\n      </div>\n      <div class="fila-botones">\n        <button class="boton" id="btn-exportar-backup">${glifo("check")} Save backup</button>\n        <label class="boton boton-fantasma">\n          Restore\n          <input type="file" id="input-importar-backup" hidden />\n        </label>\n      </div>\n      ${fotos > 0 ? `<div class="fila-botones"><button class="boton boton-fantasma" id="btn-guardar-fotos" type="button">${glifo("camara")} Save all photos (${fotos})</button></div>` : ""}\n      <div id="mensaje-backup" class="mensaje-backup" aria-live="polite"></div>\n    </div>`;
}

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
    backup: "menu_backup.png"
};

function iconoItemMenu(item, clase) {
    const archivo = ICONO_ITEM[item.id];
    const recorte = archivo && RECORTES_MENU[archivo];
    if (!recorte) return `<span class="${clase} marcador">${esc(item.nombre.charAt(0).toUpperCase())}</span>`;
    const [x, y, w, h] = recorte;
    const objetivo = clase === "icono-actual" ? 84 : 40;
    const k = Math.max(1, Math.min(6, Math.round(objetivo / Math.max(w, h))));
    return `<span class="${clase} icono-pixel" style="width:${w * k}px;height:${h * k}px;background-image:url('${arte("menu/" + archivo)}');background-size:${64 * k}px ${64 * k}px;background-position:${-x * k}px ${-y * k}px" aria-hidden="true"></span>`;
}

export function renderMenu(container, idCategoria, indice = 0, opts = {}) {
    const {brilla: brilla = null, estadoItem: estadoItem = {}} = opts;
    const categoria = buscarCategoria(idCategoria);
    if (!categoria) return;
    const total = categoria.items.length;
    const actual = categoria.items[indice];
    const anterior = categoria.items[(indice - 1 + total) % total];
    const siguiente = categoria.items[(indice + 1) % total];
    const puntos = categoria.items.map(((_, i) => `<span class="punto-pagina ${i === indice ? "activo" : ""}"></span>`)).join("");
    const extra = estadoItem[actual.id];
    container.innerHTML = `\n    ${encabezado(categoria.nombre, "btn-volver-menu")}\n    <div class="carrusel-menu">\n      <button class="flecha-carrusel" id="btn-carrusel-prev" aria-label="Previous">${glifo("izq")}</button>\n      <div class="pista-carrusel" id="pista-carrusel">\n        ${total > 1 ? `<button class="item-carrusel vecino" data-mover="-1" aria-label="${esc(anterior.nombre)}">${iconoItemMenu(anterior, "icono-vecino")}</button>` : ""}\n        <button class="item-carrusel actual ${brilla === actual.id ? "brilla" : ""}" data-item="${actual.id}">\n          <span class="pedestal">${iconoItemMenu(actual, "icono-actual")}</span>\n          <span class="nombre-item-actual">${esc(actual.nombre)}</span>\n          ${extra ? `<span class="estado-item">${esc(extra)}</span>` : ""}\n        </button>\n        ${total > 1 ? `<button class="item-carrusel vecino" data-mover="1" aria-label="${esc(siguiente.nombre)}">${iconoItemMenu(siguiente, "icono-vecino")}</button>` : ""}\n      </div>\n      <button class="flecha-carrusel" id="btn-carrusel-next" aria-label="Next">${glifo("der")}</button>\n    </div>\n    ${total > 1 ? `<div class="paginacion-menu">${puntos}</div>` : ""}\n  `;
}

function figuraPrimerPlano(ojo, boca, {clase: clase = "", extra: extra = "", pose: pose = "parado", capas2: capas2 = null} = {}) {
    const segunda = capas2 ? `<div class="pp-segunda">${spriteCara(capas2[0], capas2[1], false, "", {
        pose: pose
    })}</div>` : "";
    return `\n    <div class="pp-figura ${clase}">\n      <div class="pp-primera">${spriteCara(ojo, boca, false, "", {
        pose: pose
    })}</div>\n      ${segunda}\n      ${extra}\n    </div>`;
}

function primerPlano({variante: variante = "", figura: figura, titulo: titulo = "", sub: sub = "", fondo: fondo = ""}) {
    return `\n    <div class="primer-plano con-cuarto ${variante}">\n      ${fondo}\n      ${figura}\n      <div class="pp-texto">\n        ${titulo ? `<div class="pp-titulo">${esc(titulo)}</div>` : ""}\n        ${sub ? `<div class="pp-sub">${esc(sub)}</div>` : ""}\n      </div>\n    </div>`;
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
    "comida/bebida_agua.png": "Fresh water."
};

export function renderFeedback(container, titulo, opts = {}) {
    const {especial: especial = null, icono: icono = "check", sub: sub = ""} = opts;
    if (especial && ESPECIALES_CON_ARTE.has(especial)) {
        container.innerHTML = primerPlano({
            variante: `pp-${especial}`,
            figura: figuraPrimerPlano(`ojo_especial_${especial}.png`, `boca_especial_${especial}.png`, {
                extra: especial === "enamorado" ? `<span class="pp-corazon c1"></span><span class="pp-corazon c2"></span><span class="pp-corazon c3"></span>` : ""
            }),
            titulo: titulo,
            sub: sub
        });
        return;
    }
    container.innerHTML = primerPlano({
        variante: "pp-simple",
        figura: figuraPrimerPlano("ojo_especial_euforico.png", "boca_especial_euforico.png", {
            extra: `<div class="pp-insignia">${glifo(icono, "x4")}</div>`
        }),
        titulo: titulo,
        sub: sub
    });
}

export function renderFeedAccion(container, comidaSrc) {
    const boca = HAY_BOCA_ABIERTA ? ARCHIVO_BOCA_ABIERTA : "boca_base_feliz.png";
    container.innerHTML = primerPlano({
        variante: "pp-comer",
        figura: figuraPrimerPlano("ojo_base_energia_alta.png", boca, {
            capas2: [ "ojo_especial_euforico.png", "boca_especial_euforico.png" ],
            extra: `<img class="pp-comida" src="${arte(comidaSrc)}" alt="" draggable="false" /><span class="pp-miga m1"></span><span class="pp-miga m2"></span><span class="pp-miga m3"></span>`
        }),
        titulo: "Yum!",
        sub: NOMBRES_COMIDA[comidaSrc] || ""
    });
}

export function renderBeberAccion(container, bebidaSrc = "comida/bebida_agua.png") {
    container.innerHTML = primerPlano({
        variante: "pp-beber",
        figura: figuraPrimerPlano("ojo_base_energia_alta.png", HAY_BOCA_ABIERTA ? ARCHIVO_BOCA_ABIERTA : "boca_base_feliz.png", {
            capas2: [ "ojo_especial_euforico.png", "boca_especial_euforico.png" ],
            extra: `<img class="pp-comida pp-bebida" src="${arte(bebidaSrc)}" alt="" draggable="false" /><span class="pp-gota g1"></span><span class="pp-gota g2"></span>`
        }),
        titulo: "Gulp gulp!",
        sub: NOMBRES_COMIDA[bebidaSrc] || ""
    });
}

export function renderCleanAccion(container) {
    const burbujas = Array.from({
        length: 9
    }, ((_, i) => `<span class="pp-burbuja" style="--i:${i}"></span>`)).join("");
    container.innerHTML = primerPlano({
        variante: "pp-limpiar",
        figura: figuraPrimerPlano("ojo_base_energia_alta.png", "boca_base_feliz.png", {
            capas2: [ "ojo_especial_euforico.png", "boca_especial_euforico.png" ],
            extra: burbujas + `<span class="pp-brillo b1"></span><span class="pp-brillo b2"></span><span class="pp-brillo b3"></span>`
        }),
        titulo: "Squeaky clean!",
        sub: "Soap, bubbles, done."
    });
}

export function renderMedicineAccion(container) {
    container.innerHTML = primerPlano({
        variante: "pp-remedio",
        figura: figuraPrimerPlano("ojo_enferma.png", "boca_enferma.png", {
            capas2: [ "ojo_especial_euforico.png", "boca_especial_euforico.png" ],
            extra: `<span class="pp-pastilla"></span><span class="pp-brillo b1"></span><span class="pp-brillo b2"></span>`
        }),
        titulo: "All better!",
        sub: "Brave little patient."
    });
}

const ESTRELLAS_DORMIR = [ [ 12, 18 ], [ 28, 10 ], [ 78, 14 ], [ 88, 30 ], [ 8, 55 ], [ 92, 60 ], [ 18, 82 ], [ 70, 85 ], [ 45, 8 ], [ 60, 92 ] ];

export function renderSleepAccion(container) {
    const estrellas = ESTRELLAS_DORMIR.map((([x, y]) => `<span class="estrella-fija" style="left:${x}%;top:${y}%"></span>`)).join("");
    const zzz = [ [ 0, 0 ], [ 1, .3 ], [ 2, .6 ] ].map((([k, retraso]) => `<span class="pp-zzz" style="--k:${k};animation-delay:${retraso}s">z</span>`)).join("");
    container.innerHTML = primerPlano({
        variante: "pp-dormir",
        fondo: `<div class="pp-noche">${estrellas}</div>`,
        figura: figuraPrimerPlano("ojo_dormida.png", "boca_dormida.png", {
            pose: "dormido",
            extra: zzz
        }),
        titulo: "Good night…",
        sub: "Lights off. Sweet dreams."
    });
}

export function renderDespertarAccion(container) {
    container.innerHTML = primerPlano({
        variante: "pp-despertar",
        figura: figuraPrimerPlano("ojo_base_energia_baja.png", "boca_base_neutral.png", {
            capas2: [ "ojo_especial_euforico.png", "boca_especial_euforico.png" ],
            extra: `<span class="pp-sol"></span>`
        }),
        titulo: "Good morning!",
        sub: "*big stretch*"
    });
}

export function renderAviso(container, titulo, subtitulo = "") {
    const dormido = /asleep/i.test(subtitulo);
    const sano = /isn't sick/i.test(subtitulo);
    const [ojo, boca, pose] = dormido ? [ "ojo_dormida.png", "boca_dormida.png", "dormido" ] : sano ? [ "ojo_especial_euforico.png", "boca_especial_euforico.png", "parado" ] : [ "ojo_especial_aburrido.png", "boca_especial_aburrido.png", "parado" ];
    container.innerHTML = primerPlano({
        variante: `pp-aviso ${dormido ? "pp-dormir" : ""}`,
        fondo: dormido ? `<div class="pp-noche"></div>` : "",
        figura: figuraPrimerPlano(ojo, boca, {
            pose: pose,
            extra: dormido ? `<span class="pp-zzz" style="--k:0">z</span><span class="pp-zzz" style="--k:1;animation-delay:.4s">z</span>` : ""
        }),
        titulo: titulo,
        sub: subtitulo
    });
}

const ORDEN_STATS = [ [ "hambre", "Hunger", "tenedor" ], [ "sed", "Thirst", "gota" ], [ "energia", "Energy", "estrella" ], [ "higiene", "Hygiene", "burbuja" ], [ "felicidad", "Happiness", "corazon" ] ];

export function renderStats(container, mascota, opts = {}) {
    const filas = ORDEN_STATS.map((([clave, etiqueta, g]) => `\n      <div class="fila-stat">\n        <span class="etiqueta">${glifo(g, "tenue")} ${etiqueta}</span>\n        <span class="pips">${pips(mascota.stats[clave])}</span>\n      </div>`)).join("");
    const corazones = pipsLlenos(mascota.stats.vinculo);
    let corazonesHtml = "";
    for (let i = 0; i < PIPS_POR_STAT; i++) corazonesHtml += glifo("corazon", `corazon-vinculo ${i < corazones ? "lleno" : ""}`);
    let aviso = "";
    if (mascota.enferma) aviso = `<div class="aviso-salud alerta">Sick — needs medicine</div>`; else if (mascota.stats.salud < 60) aviso = `<div class="aviso-salud">Not feeling great</div>`;
    const d = opts.deseo;
    const deseoHtml = d ? `<button class="fila-deseo ${d.estado === "cumplido" ? "cumplido" : ""}" data-ver-deseo type="button">\n        <span class="deseo-etiqueta">${glifo("corazon")} Today's wish</span>\n        <span class="deseo-texto">${d.estado === "nuevo" ? "Baozi has a wish… tap to hear it" : esc(d.texto)}</span>\n        <span class="deseo-estado">${d.estado === "cumplido" ? "Came true ✓" : d.real ? "Tap when it's done" : d.meta ? `${Math.min(d.meta, d.progreso)} / ${d.meta}` : ""}</span>\n      </button>` : "";
    container.innerHTML = `\n    ${encabezado("Stats", "btn-volver-consulta")}\n    <div class="lista-journal">\n      ${deseoHtml}\n      ${filas}\n      <div class="fila-stat">\n        <span class="etiqueta rosa">${glifo("corazon")} Bond</span>\n        <span class="pips">${corazonesHtml}</span>\n      </div>\n      ${aviso}\n      ${htmlDiccionario(opts.palabras, opts.totalPalabras, opts.hayVoz)}\n    </div>\n  `;
}

function htmlDiccionario(palabras, total = 0, voz = false) {
    if (!palabras) return "";
    const filas = palabras.length ? palabras.map((p => `<div class="fila-palabra">\n            <span class="pal-es">${esc(p.es)}${p.co ? `<small>CO</small>` : ""}</span>\n            <span class="pal-zh" lang="zh-CN">${esc(p.zh)}</span>\n            <span class="pal-py">${esc(p.py)}</span>\n            <span class="pal-en">${esc(p.en)}</span>\n            ${voz ? `<span class="pal-oir"><button type="button" class="boton-oir" data-oir="${p.i}" data-idioma="es" aria-label="Listen in Spanish">ES</button><button type="button" class="boton-oir" data-oir="${p.i}" data-idioma="zh" aria-label="Listen in Chinese">中</button></span>` : ""}\n          </div>`)).join("") : `<div class="vacio-suave">Tap the calendar in the room to learn today's word ♥</div>`;
    return `<div class="subtitulo-lista">Baozi's words · ${palabras.length} of ${total}</div><div class="lista-palabras">${filas}</div>`;
}

export function renderPalabra(container, p, {fecha: fecha = "", voz: voz = false} = {}) {
    container.innerHTML = `\n    <div class="pantalla-palabra con-cuarto">\n      <div class="papel carta-palabra">\n        <div class="hoja-calendario">WORD OF THE DAY · ${esc(fecha)}</div>\n        <div class="fila-palabra-grande">\n          <div class="palabra-baozi">${spriteCara("ojo_especial_euforico.png", "boca_especial_euforico.png")}</div>\n          <div class="palabra-textos">\n            <div class="palabra-es">${esc(p.es)}</div>\n            <div class="palabra-zh-fila"><span class="palabra-zh" lang="zh-CN">${esc(p.zh)}</span><span class="palabra-py">${esc(p.py)}</span></div>\n            <div class="palabra-en">${esc(p.en)}${p.co ? ` <small>(Colombian Spanish)</small>` : ""}</div>\n          </div>\n        </div>\n        <div class="palabra-ejemplo">“${esc(p.ejEs)}” — ${esc(p.ejEn)}</div>\n        <div class="fila-botones palabra-botones">\n          ${voz ? `<button class="boton chico boton-fantasma" type="button" id="btn-oir-es">🔈 Español</button><button class="boton chico boton-fantasma" type="button" id="btn-oir-zh">🔈 中文</button>` : ""}\n          <button class="boton chico boton-fantasma" type="button" id="btn-palabra-fechas">${glifo("estrella")} Our dates</button>\n          <button class="boton chico" type="button" id="btn-palabra-listo">Got it ♥</button>\n        </div>\n      </div>\n    </div>`;
}

export function renderAlbum(container, {tengo: tengo = new Set, nombre: nombre = id => id} = {}) {
    const n = SECCIONES_ALBUM.reduce(((s, sec) => s + sec.lugares.filter((id => tengo.has(id))).length), 0);
    container.innerHTML = `\n    ${encabezado("Sticker album", "btn-volver-consulta")}\n    <div class="lista-journal album">\n      <div class="fila-botones"><button class="boton chico boton-fantasma" id="btn-album-volver" type="button">${glifo("atras")} Diary</button></div>\n      <div class="subtitulo-lista">Sticker album · ${n} of ${TOTAL_ALBUM}</div>\n      <div class="barra-album"><i style="width:${(n / TOTAL_ALBUM * 100).toFixed(1)}%"></i></div>\n      ${SECCIONES_ALBUM.map((sec => `<div class="seccion-album">${sec.nombre}</div>\n          <div class="grilla-album">${sec.lugares.map((id => tengo.has(id) ? `<div class="slot-album tengo"><img src="${arte(srcStickerLugar(id))}" alt="" draggable="false" /><span>${esc(nombre(id))}</span></div>` : `<div class="slot-album"><b>?</b><span>${esc(nombre(id))}</span></div>`)).join("")}</div>`)).join("")}\n      <div class="vacio-suave">Seal a new place to win its sticker ♥</div>\n    </div>`;
}

export function renderMeses(container, meses) {
    container.innerHTML = `\n    ${encabezado("Our months", "btn-volver-consulta")}\n    <div class="lista-journal lista-cartas">\n      <div class="fila-botones"><button class="boton chico boton-fantasma" id="btn-meses-volver" type="button">${glifo("atras")} Diary</button></div>\n      <div class="subtitulo-lista">Our months</div>\n      ${meses.map((m => `<button class="fila-carta fila-mes" type="button" data-abrir-mes="${esc(m.mes)}">\n            <span class="fila-carta-sello">${glifo("estrella")}</span>\n            <span class="fila-carta-titulo">Our ${esc(m.nombre)}</span>\n            <span class="fila-carta-fecha">${esc(m.anio)}</span>\n          </button>`)).join("")}\n    </div>`;
}

export function renderSobreMes(container, nombre) {
    container.innerHTML = `\n    <div class="pantalla-palabra pantalla-sobre-mes con-cuarto">\n      <div class="papel carta-sobre">\n        <div class="sobre-fila">\n          <div class="palabra-baozi">${spriteCara("ojo_especial_euforico.png", "boca_especial_euforico.png")}</div>\n          <div class="sobre-mes" aria-hidden="true"><span>♥</span></div>\n        </div>\n        <div class="titulo-sobre">OUR ${esc(String(nombre).toUpperCase())} IS READY!</div>\n        <div class="texto-sobre">Baozi made you a little book about our month.</div>\n        <div class="fila-botones botones-sobre">\n          <button class="boton boton-fantasma" type="button" id="btn-mes-luego">Later</button>\n          <button class="boton" type="button" id="btn-mes-abrir">Open it ♥</button>\n        </div>\n      </div>\n    </div>`;
}

const TRAIT_DESCRIPCION = {
    explorador: "loves new places",
    sociable: "loves meeting people",
    gourmet: "lives for snacks",
    leal: "just wants cuddles"
};

export function renderTraits(container, mascota) {
    const puntajes = {};
    for (const tr of TRAITS) puntajes[tr] = mascota.traitsHistorico[tr] * PESO_HISTORICO + mascota.traitsReciente[tr] * PESO_RECIENTE;
    const maximo = Math.max(...Object.values(puntajes));
    const dominante = maximo > 0 ? mascota.rasgoDominante() : null;
    const barras = TRAITS.map((rasgo => {
        const esDominante = rasgo === dominante;
        const pct = maximo > 0 ? Math.max(4, Math.round(puntajes[rasgo] / maximo * 100)) : 0;
        return `\n      <div class="barra-trait ${esDominante ? "dominante" : ""}">\n        <div class="etiqueta"><span>${esc(TRAIT_NOMBRES[rasgo])} <small>${TRAIT_DESCRIPCION[rasgo] || ""}</small></span>${esDominante ? glifo("estrella") : ""}</div>\n        <div class="pista"><div class="relleno" style="width:${pct}%"></div></div>\n      </div>`;
    })).join("");
    container.innerHTML = `\n    ${encabezado("Traits", "btn-volver-consulta")}\n    <div class="lista-journal">\n      ${maximo > 0 ? "" : `<div class="vacio-suave">Baozi's personality grows with every place, meal and friend.</div>`}\n      ${barras}\n    </div>\n  `;
}

function relacionAmigo(npcId, npcsReg) {
    const r = npcsReg && npcsReg.relacion ? npcsReg.relacion(npcId) : null;
    if (r === "amor") return ` <span class="relacion-amigo amor">${glifo("corazon")} ${esc(Personaje.nombre())}'s crush</span>`;
    if (r === "amigo") return ` <span class="relacion-amigo amigo">${glifo("estrella")} Best friends</span>`;
    return "";
}

export function renderNpcs(container, npcsReg, amigos = null, ctx = {}) {
    const filas = NPCS.map((npc => {
        const veces = npcsReg.vecesEncontrado[npc.id] || 0;
        if (veces === 0) {
            return `\n        <div class="fila-npc">\n          <img class="avatar-npc silueta" src="${arte("npcs/npc_" + npc.id + ".png")}" alt="" draggable="false" />\n          <span class="nombre-npc tenue">Not met yet<small class="pista-amigo">Someone might knock on the window…</small></span>\n        </div>`;
        }
        const llenos = amigos ? amigos.corazones(npc.id, npcsReg) : Math.min(veces, VECES_PARA_ENAMORADO);
        let marcas = "";
        for (let i = 0; i < MAX_CORAZONES; i++) marcas += glifo("corazon", `corazon-vinculo ${i < llenos ? "lleno" : ""}`);
        let detalle = "";
        if (amigos && AMIGOS[npc.id]) {
            const m = amigos.misionActual(npc.id);
            const est = amigos.estado(npc.id);
            const hechas = amigos.misiones[npc.id].n;
            const secretos = AMIGOS[npc.id].secretos.filter((sx => amigos.revelados.has(sx.lugar))).map((sx => (LUGARES.find((l => l.id === sx.lugar)) || {}).nombre)).filter(Boolean);
            const linea = est === "activa" && m ? `<span class="mision-activa">${glifo("libro")} ${esc(m.resumen)}${ctx.progreso && ctx.progreso(m) ? ` <small>${esc(ctx.progreso(m))}</small>` : ""}</span>` : est === "lista" ? `<span class="mision-lista">${glifo("estrella")} Done! ${esc(npc.nombre)} will bring you a gift</span>` : hechas >= 3 ? `<span class="mision-lista">${glifo("check")} All missions done</span>` : `<span class="tenue">No mission yet. Say hi when ${esc(npc.nombre)} visits!</span>`;
            detalle = `\n        <div class="detalle-amigo">\n          ${linea}\n          <span class="tenue">Missions ${hechas}/3${secretos.length ? ` · Secrets: ${esc(secretos.join(", "))}` : ""}</span>\n        </div>`;
        }
        return `\n      <div class="fila-npc con-detalle">\n        <img class="avatar-npc" src="${arte("npcs/npc_" + npc.id + ".png")}" alt="" draggable="false" />\n        <div class="columna-amigo">\n          <div class="cabeza-amigo"><span class="nombre-npc">${esc(npc.nombre)}${relacionAmigo(npc.id, npcsReg)}</span><span class="pips">${marcas}</span></div>\n          ${detalle}\n        </div>\n      </div>`;
    })).join("");
    container.innerHTML = `\n    ${encabezado("Friends", "btn-volver-consulta")}\n    <div class="lista-journal">${filas}</div>\n  `;
}

export function renderCloset(container, amigos, accTienda = []) {
    const acc = amigos.accesorios();
    const tarjetasAcc = [ "orejas", "antenas", "boina", "corona" ].map((id => {
        const clave = `acc:${id}`;
        const r = REGALOS[clave];
        const de = Object.keys(AMIGOS).find((n => AMIGOS[n].misiones.some((m => m.regalo === clave))));
        const nombreDe = (NPCS.find((n => n.id === de)) || {}).nombre || "";
        if (!acc.includes(id)) {
            return `<div class="tarjeta-regalo bloqueada"><span class="candado-regalo">${glifo("candado")}</span><span class="nombre-regalo">???</span><small>A gift from ${esc(nombreDe)}</small></div>`;
        }
        const puesto = amigos.puesto === id;
        return `\n      <button class="tarjeta-regalo ${puesto ? "puesto" : ""}" data-accesorio="${id}" aria-pressed="${puesto}">\n        ${vistaAcc(r.arte, id)}\n        <span class="nombre-regalo">${esc(r.nombre)}</span>\n        <small>${puesto ? "Wearing it · tap to take off" : "Tap to wear"}</small>\n      </button>`;
    })).join("") + accTienda.map((id => {
        const c = CATALOGO.find((x => x.tipo === "accesorio" && (x.acc || x.id) === id));
        if (!c) return "";
        const puesto = amigos.puesto === id;
        return `\n      <button class="tarjeta-regalo ${puesto ? "puesto" : ""}" data-accesorio="${id}" aria-pressed="${puesto}">\n        ${vistaAcc(c.arte, id)}\n        <span class="nombre-regalo">${esc(c.nombre)}</span>\n        <small>${puesto ? "Wearing it · tap to take off" : "Tap to wear"}</small>\n      </button>`;
    })).join("");
    const otros = [ ...amigos.premios ].filter((k => REGALOS[k] && REGALOS[k].tipo !== "accesorio"));
    const lista = otros.length ? otros.map((k => `<div class="fila-regalo"><img src="${arteDeRegalo(k)}" alt="" draggable="false" /><span>${esc(REGALOS[k].nombre)}</span><small class="tenue">${REGALOS[k].tipo === "sticker" ? "in your camera" : "in your room"}</small></div>`)).join("") : `<div class="vacio-suave">Help your friends with their missions and they'll send you gifts.</div>`;
    container.innerHTML = `\n    ${encabezado("Closet", "btn-volver-consulta")}\n    <div class="lista-journal">\n      <div class="closet-figura">${spriteCara("ojo_base_energia_alta.png", "boca_base_feliz.png")}</div>\n      <div class="subtitulo-lista">To wear</div>\n      <div class="grilla-regalos">${tarjetasAcc}</div>\n      <div class="subtitulo-lista">Stickers and things for your room</div>\n      ${lista}\n    </div>\n  `;
}

const TAM_ARTE_TIENDA = {
    te: [ 92, 52 ],
    bote: [ 92, 52 ],
    cabana: [ 92, 52 ],
    finca: [ 92, 52 ],
    guatape: [ 92, 52 ],
    chiva: [ 24, 15 ],
    orquidea: [ 16, 26 ],
    banderin: [ 132, 9 ],
    saco: [ 18, 20 ],
    gato: [ 22, 21 ],
    perro: [ 22, 21 ],
    serpiente: [ 22, 21 ],
    farolitos: [ 58, 17 ],
    pecera: [ 17, 15 ],
    bonsai: [ 15, 14 ],
    poster: [ 18, 24 ],
    luces: [ 70, 9 ],
    peluche: [ 18, 18 ],
    loto: [ 13, 13 ],
    corazones: [ 13, 13 ]
};

const DESPLAZAR_ACC_VISTA = {
    lentes: -32,
    ruana: -57,
    mochila: -63
};

function vistaAcc(rutaArte, id) {
    const top = DESPLAZAR_ACC_VISTA[id];
    return `<span class="acc-vista"><img src="${arte(rutaArte)}" alt="" draggable="false"${top !== undefined ? ` style="top:${top}px"` : ""} /></span>`;
}

function vistaTienda(c, peluche) {
    if (c.tipo === "accesorio") return vistaAcc(c.arte, c.acc || c.id);
    if (c.tipo === "comida" || c.tipo === "semilla") return `<span class="vista-tienda vista-comida"><img src="${arte(c.arte)}" alt="" draggable="false" /></span>`;
    const src = c.id === "peluche" ? `tienda/deco_peluche_${peluche}.png` : c.arte;
    const [w, h] = TAM_ARTE_TIENDA[c.id] || [ 16, 16 ];
    const k = Math.max(1, Math.min(Math.floor(92 / w), Math.floor(52 / h)));
    return `<span class="vista-tienda"><img src="${arte(src)}" alt="" draggable="false" style="width:${w * k}px;height:${h * k}px" /></span>`;
}

function estadoTienda(c, tienda, puesto) {
    if (c.tipo === "comida") return tienda.cantidadComida(c.id) ? `×${tienda.cantidadComida(c.id)} in the fridge` : "";
    if (c.tipo === "semilla") return tienda.cantidadSemillas(c.planta) ? `×${tienda.cantidadSemillas(c.planta)} for the garden` : "";
    if (!tienda.tiene(c.id)) return "";
    if (c.tipo === "accesorio") return puesto === (c.acc || c.id) ? "Wearing it ✓" : "In your closet ✓";
    if (c.tipo === "sticker") return "In your camera ✓";
    if (c.tipo === "cuarto") return "Yours ✓";
    if (c.tipo === "mascota") return "Yours ✓";
    return tienda.estaPuesta(c.id) ? "In your room ✓" : "In storage";
}

function tarjetaTienda(c, tienda, {nuevas: nuevas, confirmar: confirmar, recien: recien, puesto: puesto, peluche: peluche, falta: falta}) {
    const tiene = c.tipo !== "comida" && c.tipo !== "semilla" && tienda.tiene(c.id);
    const estado = estadoTienda(c, tienda, puesto);
    const moneda = `<img class="moneda-mini" src="${arte("tienda/moneda.png")}" alt="coins" draggable="false" />`;
    let pie;
    if (confirmar === c.id) {
        pie = `<span class="tienda-pregunta">Buy for ${c.precio}?</span>\n      <span class="fila-tienda"><button class="boton boton-fantasma chico" data-cancelar-compra>No</button><button class="boton chico" data-confirmar-compra="${esc(c.id)}">Buy</button></span>`;
    } else if (tiene && c.tipo === "decoracion") {
        const puesta = tienda.estaPuesta(c.id);
        pie = `<span class="estado-tienda ${puesta ? "" : "guardada"}">${esc(estado)}</span>\n      <button class="boton ${puesta ? "boton-fantasma" : ""} chico boton-deco" data-alternar-deco="${esc(c.id)}">${puesta ? "Put away" : "Place"}</button>`;
    } else if (tiene) {
        pie = `<span class="estado-tienda">${esc(estado)}</span>`;
    } else {
        const caro = tienda.monedas < c.precio;
        pie = `<button class="precio-tienda ${caro ? "caro" : ""}" data-comprar="${esc(c.id)}" aria-label="Buy ${esc(c.nombre)} for ${c.precio} coins">${moneda}${c.precio}</button>\n      ${estado ? `<span class="estado-tienda">${esc(estado)}</span>` : ""}\n      ${falta === c.id ? `<span class="falta-tienda">You need ${c.precio - tienda.monedas} more</span>` : ""}`;
    }
    return `\n    <div class="tarjeta-tienda ${tiene ? "tengo" : ""} ${recien === c.id ? "recien" : ""}" data-producto="${esc(c.id)}">\n      ${nuevas.has(c.id) ? `<span class="nuevo-tienda">NEW</span>` : ""}\n      ${vistaTienda(c, peluche)}\n      <span class="nombre-tienda">${esc(c.nombre)}</span>\n      <span class="texto-tienda">${esc(c.texto)}</span>\n      ${recien === c.id ? `<span class="recien-tienda">${c.tipo === "comida" ? "In the fridge! ♥" : c.tipo === "semilla" ? "Plant it on the balcony! ♥" : "It's yours! ♥"}</span>` : ""}\n      ${pie}\n    </div>`;
}

const NOMBRE_DEPTO = "Apartment";

function elegirCasa(tienda) {
    const cuartos = tienda.cuartos();
    const mascotas = tienda.mascotas();
    let html = "";
    if (cuartos.length) {
        const opciones = [ {
            id: "depto",
            nombre: NOMBRE_DEPTO
        }, ...cuartos.map((id => CATALOGO.find((c => c.id === id)))) ];
        html += `<div class="subtitulo-lista">Your room</div><div class="fila-elegir" role="group" aria-label="Your room">${opciones.map((c => `<button class="chip-elegir ${tienda.cuarto === c.id ? "puesto" : ""}" data-poner-cuarto="${esc(c.id)}" aria-pressed="${tienda.cuarto === c.id}">${esc(c.nombre)}${tienda.cuarto === c.id ? " ✓" : ""}</button>`)).join("")}</div>`;
    }
    if (mascotas.length) {
        const opciones = [ ...mascotas.map((id => CATALOGO.find((c => c.id === id)))), {
            id: "",
            nombre: "None"
        } ];
        html += `<div class="subtitulo-lista">Your pet</div><div class="fila-elegir" role="group" aria-label="Your pet">${opciones.map((c => {
            const puesto = (tienda.mascota || "") === c.id;
            return `<button class="chip-elegir ${puesto ? "puesto" : ""}" data-poner-mascota="${esc(c.id)}" aria-pressed="${puesto}">${c.id ? `<img src="${arte(c.arte)}" alt="" draggable="false" />` : ""}${esc(c.nombre)}${puesto ? " ✓" : ""}</button>`;
        })).join("")}</div>`;
    }
    return html;
}

function elegirDecos(decos) {
    if (!decos || !decos.length) return "";
    return `<div class="subtitulo-lista">Your decorations</div><div class="fila-elegir fila-decos" role="group" aria-label="Your decorations">${decos.map((d => `<button class="chip-elegir chip-deco ${d.puesta ? "puesto" : ""}" data-alternar-deco="${esc(d.id)}" aria-pressed="${d.puesta}"><img src="${arte(d.arte)}" alt="" draggable="false" />${esc(d.nombre)}${d.puesta ? " ✓" : ""}</button>`)).join("")}</div><div class="ayuda-decos">Tap one to put it away or bring it back.</div>`;
}

export function renderTienda(container, tienda, opts = {}) {
    const o = {
        nuevas: new Set,
        confirmar: null,
        recien: null,
        falta: null,
        puesto: null,
        peluche: "baozi",
        ...opts
    };
    const ahora = opts.ahora || Date.now();
    const todas = tienda.disponibles(ahora);
    const semana = tienda.deEstaSemana(ahora).filter((c => todas.includes(c)));
    const hayNuevasSemana = tienda.semanaActual(ahora) > 0 && semana.length;
    const resto = hayNuevasSemana ? todas.filter((c => !semana.includes(c))) : todas;
    const faltan = tienda.semanaActual(ahora) < ULTIMA_SEMANA;
    container.innerHTML = `\n    ${encabezado("Shop", "btn-volver-consulta")}\n    <div class="lista-journal tienda">\n      <div class="tienda-cabeza">\n        <div class="billetera" aria-label="${tienda.monedas} coins"><img src="${arte("tienda/moneda.png")}" alt="" draggable="false" /><b id="monedas-tienda">${tienda.monedas}</b></div>\n        <div class="tienda-ayuda">Earn coins by caring for Baozi, writing your diary, telling Baozi your steps, playing and taking photos.</div>\n      </div>\n      ${elegirCasa(tienda)}\n      ${elegirDecos(o.decos)}\n      ${hayNuevasSemana ? `<div class="subtitulo-lista">New this week</div><div class="grilla-tienda">${semana.map((c => tarjetaTienda(c, tienda, o))).join("")}</div>` : ""}\n      <div class="subtitulo-lista">${hayNuevasSemana ? "Everything else" : "Everything"}</div>\n      <div class="grilla-tienda">${resto.map((c => tarjetaTienda(c, tienda, o))).join("")}</div>\n      ${faltan ? `<div class="vacio-suave">New things arrive every week ♥</div>` : ""}\n    </div>`;
}

export function renderProgress(container, mascota, lugaresReg) {
    const filas = LUGARES.map((lugar => {
        const desbloqueado = lugaresReg.desbloqueados.has(lugar.id);
        const propia = desbloqueado ? fotoDeLugar(lugar.id) : null;
        const miniatura = desbloqueado ? `<img class="miniatura-lugar ${propia ? "propia" : ""}" src="${propia || arteDeLugar(lugar.id)}" alt="" draggable="false" />` : `<span class="miniatura-lugar bloqueada">${glifo("candado")}</span>`;
        return `\n      <div class="fila-lugar ${desbloqueado ? "" : "tenue"}">\n        ${miniatura}\n        <span class="nombre-fila-lugar">${desbloqueado ? esc(lugar.nombre) : "???"}</span>\n        ${desbloqueado ? glifo("check", "verde") : ""}\n      </div>`;
    })).join("");
    container.innerHTML = `\n    ${encabezado("Places", "btn-volver-consulta")}\n    <div class="lista-journal">\n      <div class="fila-stat"><span class="etiqueta">${glifo("pie", "tenue")} Steps</span><span class="numero">${mascota.pasosTotales.toLocaleString("en-US")}</span></div>\n      <div class="subtitulo-lista">Places</div>\n      ${filas}\n    </div>\n  `;
}

export function renderCaminar(container, mascota, pasosSesion, opts = {}) {
    const {mostrarBannerMotion: mostrarBannerMotion = false, hayLugaresPendientes: hayLugaresPendientes = false, estadoSensores: estadoSensores = "", podometroActivo: podometroActivo = false, estado: estado = null} = opts;
    const bannerMotion = mostrarBannerMotion ? `<button class="banner-sensor" id="btn-habilitar-motion">${glifo("pie")} Tap to count steps automatically</button>` : "";
    const cara = estado && estado.tipo === "base" ? caraSegunEstado(estado) : spriteCara("ojo_base_energia_alta.png", "boca_base_feliz.png");
    container.innerHTML = `\n    <div class="pantalla-caminar">\n      <div class="escena-caminar en-marcha">\n        <div class="nube lenta" aria-hidden="true"><span class="n1"></span><span class="n2"></span><span class="n3"></span></div>\n        <div class="nube media" aria-hidden="true"><span class="n1"></span><span class="n2"></span><span class="n3"></span></div>\n        <div class="bosque" aria-hidden="true">\n          ${[ 0, 1, 2, 3, 4, 5 ].map((i => `<div class="arbol ${i % 2 ? "der" : ""}" style="animation-delay:-${(i / 6 * 5.5).toFixed(2)}s"><span class="copa"></span><span class="tronco"></span></div>`)).join("")}\n        </div>\n        \x3c!-- Baozi camina con ella: su carita rebota a cada paso. --\x3e\n        <div class="mochi-caminando" id="mochi-caminando" aria-hidden="true">${cara}</div>\n        <div class="pies-personaje" id="pies-personaje" aria-hidden="true"></div>\n        <div class="hud-caminar">\n          <button class="boton-volver sobre-escena" id="btn-volver-caminar" aria-label="Back">${glifo("atras")}</button>\n          <div class="chip-pasos">${glifo("pie")} <b class="contador-pasos" id="contador-pasos">${pasosSesion.toLocaleString("en-US")}</b></div>\n          <div class="chip-pasos tenue">TOTAL <b id="total-pasos">${mascota.pasosTotales.toLocaleString("en-US")}</b></div>\n        </div>\n      </div>\n      <div class="barra-caminar">\n        ${bannerMotion}\n        <div class="estado-sensores" id="estado-sensores">${esc(estadoSensores)}</div>\n        <div class="acciones-caminar">\n          ${hayLugaresPendientes ? `<button class="boton boton-fantasma" id="btn-wheretogo-manual">${glifo("pin")} Where to?</button>` : ""}\n          <button class="boton boton-fantasma" id="btn-anotar-pasos">${glifo("pie")} From Health</button>\n          <button class="boton ${podometroActivo ? "boton-fantasma chico" : ""}" id="btn-paso">${podometroActivo ? "+1" : `${glifo("pie")} Step`}</button>\n        </div>\n      </div>\n    </div>\n  `;
}

function fotoLugarHtml(lugar) {
    const src = arteDeLugar(lugar.id);
    return `\n    <img class="relleno-foto" src="${src}" alt="" aria-hidden="true" draggable="false" />\n    <img class="foto-lugar" src="${src}" alt="" draggable="false" />`;
}

export function renderLugarCerca(container, lugar) {
    container.innerHTML = `\n    <div class="pantalla-lugar">\n      ${fotoLugarHtml(lugar)}\n      <div class="franja-lugar">\n        <div class="etiqueta-lugar">You're near</div>\n        <div class="titulo-lugar">${esc(lugar.nombre)}</div>\n        <div class="fila-botones">\n          <button class="boton boton-fantasma" data-eleccion-lugar="not_now">Not now</button>\n          <button class="boton" data-eleccion-lugar="explorar">${glifo("pin")} Explore</button>\n        </div>\n      </div>\n    </div>\n  `;
}

export function renderWhereTo(container, pendientes) {
    const opciones = pendientes.map((l => `<button class="boton boton-fantasma" data-lugar="${l.id}">${glifo("pin")} ${esc(l.nombre)}</button>`)).join("");
    container.innerHTML = `\n    <div class="tarjeta-narrativa destinos con-cuarto">\n      <div class="titulo">Where to?</div>\n      <div class="opciones-narrativa">\n        ${opciones}\n        <button class="boton-texto" data-lugar="__not_now">Not now</button>\n      </div>\n    </div>\n  `;
}

export function renderDescubrimiento(container, lugar, opts = {}) {
    const {fotoGuardada: fotoGuardada = false} = opts;
    container.innerHTML = `\n    <div class="pantalla-lugar acercando">\n      ${fotoLugarHtml(lugar)}\n      <div class="franja-lugar">\n        <div class="etiqueta-lugar">New place discovered</div>\n        <div class="titulo-lugar">${esc(lugar.nombre)}</div>\n        <div class="texto-lugar">${esc(lugar.dialogo)}</div>\n        <div class="fila-botones">\n          ${fotoGuardada ? `<span class="chip-guardado">${glifo("check")} Photo saved</span>` : `<button id="btn-tomar-foto-descubrimiento" class="boton boton-fantasma" type="button">${glifo("camara")} Take a photo</button>`}\n          <button id="btn-continuar-descubrimiento" class="boton">Continue</button>\n        </div>\n      </div>\n    </div>\n  `;
}

function escenaEncuentro(contenidoNpc, franja, opts = {}) {
    const {clase: clase = ""} = opts;
    return `\n    <div class="pantalla-encuentro ${clase}">\n      <div class="escenario-npc">${contenidoNpc}</div>\n      <div class="franja-lugar">${franja}</div>\n    </div>\n  `;
}

function spriteNpc(npc, saludando = false) {
    const archivo = saludando ? `npc_${npc.id}_saludo.png` : `npc_${npc.id}.png`;
    return `<img class="npc-grande" src="${arte("npcs/" + archivo)}" alt="" draggable="false" />`;
}

export function renderEncuentroAnuncio(container, npc = null) {
    container.innerHTML = escenaEncuentro(npc ? `<img class="npc-grande npc-sombra" src="${arte("npcs/npc_" + npc.id + ".png")}" alt="" draggable="false" />` : `<div class="silueta-npc" aria-hidden="true">?</div>`, `<div class="etiqueta-lugar">Knock knock…</div>\n     <button id="btn-continuar-encuentro" class="boton">Open the window</button>`);
}

export function renderEncuentroEleccion(container, npc) {
    container.innerHTML = escenaEncuentro(spriteNpc(npc), `<div class="etiqueta-lugar">At the window</div>\n     <div class="titulo-lugar">${esc(npc.nombre)}</div>\n     <div class="fila-botones">\n       <button class="boton boton-fantasma" data-eleccion="seguir">Not now</button>\n       <button class="boton" data-eleccion="saludar">${glifo("corazon")} Say hi</button>\n     </div>`);
}

export function renderEncuentroDialogo(container, npc, linea) {
    container.innerHTML = escenaEncuentro(spriteNpc(npc, true), `<div class="titulo-lugar">${esc(npc.nombre)}</div>\n     <div class="texto-lugar globo-dialogo">“${esc(linea)}”</div>\n     <button id="btn-continuar-encuentro" class="boton">Continue</button>`, {
        clase: "hablando"
    });
}

export function arteDeRegalo(clave) {
    const r = REGALOS[clave];
    if (!r) return "";
    if (clave === "deco:cuadro") return arte(`amigos/deco_cuadro_${Personaje.actual()}.png`);
    return arte(r.arte);
}

function htmlRegalo(clave) {
    const r = REGALOS[clave];
    if (!r) return "";
    if (r.tipo === "accesorio") {
        return `<div class="regalo-muestra con-personaje">${spriteCara("ojo_especial_euforico.png", "boca_especial_euforico.png")}<img class="regalo-acc-encima" src="${arte(r.arte)}" alt="" draggable="false" /></div>`;
    }
    return `<div class="regalo-muestra"><img class="regalo-arte ${r.tipo}" src="${arteDeRegalo(clave)}" alt="" draggable="false" /></div>`;
}

export function renderEncuentroRegalo(container, npc, texto, clave) {
    const r = REGALOS[clave] || {};
    const tipo = {
        sticker: "A new sticker for your camera",
        accesorio: "Something to wear (see the Closet)",
        decoracion: "For your room"
    }[r.tipo] || "";
    container.innerHTML = escenaEncuentro(`${spriteNpc(npc, true)}${htmlRegalo(clave)}`, `<div class="titulo-lugar">${esc(npc.nombre)}</div>\n     <div class="texto-lugar globo-dialogo">“${esc(texto)}”</div>\n     <div class="etiqueta-lugar regalo-nombre">${glifo("estrella")} ${esc(r.nombre || "")} · ${esc(tipo)}</div>\n     <button id="btn-continuar-encuentro" class="boton">${glifo("corazon")} Thank you!</button>`, {
        clase: "hablando con-regalo"
    });
}

export function renderEncuentroSecreto(container, npc, texto, lugar) {
    container.innerHTML = escenaEncuentro(spriteNpc(npc, true), `<div class="titulo-lugar">${esc(npc.nombre)}</div>\n     <div class="texto-lugar globo-dialogo">“${esc(texto)}”</div>\n     <div class="etiqueta-lugar regalo-nombre">${glifo("pin")} New on your map: ${esc(lugar ? lugar.nombre : "")}</div>\n     <button id="btn-continuar-encuentro" class="boton">Continue</button>`, {
        clase: "hablando"
    });
}

export function renderEncuentroMision(container, npc, mision) {
    container.innerHTML = escenaEncuentro(spriteNpc(npc, true), `<div class="titulo-lugar">${esc(npc.nombre)}</div>\n     <div class="texto-lugar globo-dialogo">“${esc(mision.pide)}”</div>\n     <div class="etiqueta-lugar regalo-nombre">${glifo("libro")} ${esc(mision.resumen)}</div>\n     <div class="fila-botones">\n       <button class="boton boton-fantasma" data-mision="despues">Later</button>\n       <button class="boton" data-mision="si">${glifo("check")} Okay!</button>\n     </div>`, {
        clase: "hablando"
    });
}

export function renderEncuentroDespedida(container, npc = null) {
    container.innerHTML = escenaEncuentro(npc ? spriteNpc(npc) : `<div class="silueta-npc" aria-hidden="true">·</div>`, `<div class="titulo-lugar">See you around!</div>`, {
        clase: "yendose"
    });
}

export function renderMinijuegoBase(container, mascota, estado, opts = {}) {
    const {mostrarBannerMotion: mostrarBannerMotion = false, sacudidaActiva: sacudidaActiva = false} = opts;
    const bannerMotion = mostrarBannerMotion ? `<button class="banner-sensor" id="btn-habilitar-motion">Tap to shake your phone and catch</button>` : "";
    const archivoOjo = `ojo_base_energia_${estado.nivelEnergia || "alta"}.png`;
    const archivoBoca = `boca_base_${FELICIDAD_A_BOCA[estado.nivelFelicidad] ?? "neutral"}.png`;
    container.innerHTML = `\n    <div class="pantalla-minijuego" id="area-minijuego">\n      <div class="caja-cara-minijuego" id="caja-cara-minijuego" data-boca-cerrada="${archivoBoca}">\n        ${spriteCara(archivoOjo, archivoBoca)}\n        <div class="aro-atrape"></div>\n      </div>\n      ${bannerMotion}\n      <div class="hud-minijuego">\n        <span class="chip-pasos" id="minijuego-atrapadas">CAUGHT 0</span>\n        <span class="chip-pasos" id="minijuego-tiempo">5.0</span>\n      </div>\n      <div class="pista-minijuego">${sacudidaActiva ? "Shake or tap to catch!" : "Tap the food to catch it!"}</div>\n    </div>\n  `;
}

function fotoArteDelDia(entrada) {
    const foto = fotoDelDia(entrada);
    if (foto.tipo === "lugar") return `<img class="imagen-polaroid" src="${arteDeLugar(foto.id)}" alt="" draggable="false" />`;
    if (foto.tipo === "npc") return `<img class="imagen-polaroid retrato" src="${arte("npcs/npc_" + foto.id + "_saludo.png")}" alt="" draggable="false" />`;
    const boca = foto.id === "feliz" ? "boca_base_feliz.png" : "boca_base_neutral.png";
    return `<div class="imagen-polaroid cara-polaroid">${spriteCara("ojo_base_energia_alta.png", boca)}</div>`;
}

const animoDe = id => ANIMOS.find((a => a.id === id)) || null;

export const caritaAnimo = id => caraAnimo(id, "");

function caraAnimo(id, clase = "") {
    const a = animoDe(id);
    if (!a) return `<span class="animo-vacio ${clase}"></span>`;
    return `<span class="animo-cara ${clase}">${spriteCara(a.ojo, a.boca)}</span>`;
}

function tarjetaPasos(p) {
    const etiqueta = p.cuando === "yesterday" ? "Yesterday's steps" : "Steps today";
    const valor = p.anotados ? Number(p.pasos || 0).toLocaleString("en-US") : "+ add";
    return `<button class="tarjeta-pasos ${p.anotados ? "" : "pendiente"}" id="btn-anotar-pasos-diario" type="button">${glifo("pie")} <span>${etiqueta}</span><b>${valor}</b></button>`;
}

function cabezaDiario(diario, cartas = 0, extra = {}) {
    if (!diario) return "";
    const hoy = diario.entrada(claveDelDiaLogico());
    const escrita = diario.hoyEscrito();
    const racha = diario.racha();
    const semana = diario.semana();
    const DIAS_1 = [ "S", "M", "T", "W", "T", "F", "S" ];
    const tira = semana.map((d => {
        const [y, m, dd] = d.clave.split("-").map(Number);
        const letra = DIAS_1[new Date(y, m - 1, dd).getDay()];
        return `<div class="dia-semana ${d.escrita ? "escrito" : ""} ${d.clave === claveDelDiaLogico() ? "hoy" : ""}">${caraAnimo(d.animo, "mini")}<span>${letra}</span></div>`;
    })).join("");
    const rachaTxt = racha > 1 ? `${racha} days in a row` : racha === 1 ? "1 day — keep it going" : "Start a streak tonight";
    const tarjetaHoy = escrita ? `<button class="tarjeta-hoy escrita" id="btn-escribir-hoy">\n         ${caraAnimo(hoy.animo, "grande")}\n         <div class="tarjeta-hoy-texto">\n           <div class="tarjeta-hoy-titulo">Today</div>\n           <div class="tarjeta-hoy-frase">${hoy.texto ? esc(hoy.texto) : esc(animoDe(hoy.animo)?.nombre || "")}</div>\n           <div class="tarjeta-hoy-pista">tap to edit</div>\n         </div>\n       </button>` : `<button class="tarjeta-hoy" id="btn-escribir-hoy">\n         <span class="tarjeta-hoy-lapiz">${glifo("nota", "x2")}</span>\n         <div class="tarjeta-hoy-texto">\n           <div class="tarjeta-hoy-titulo">Write today's page</div>\n           <div class="tarjeta-hoy-frase">${esc(preguntaDelDia())}</div>\n         </div>\n       </button>`;
    const recuerdo = diario.recuerdo();
    const tarjetaRecuerdo = recuerdo ? `<div class="tarjeta-recuerdo">\n         <div class="tarjeta-recuerdo-cuando">${glifo("estrella")} ${esc(recuerdo.cuando)}</div>\n         <div class="tarjeta-recuerdo-texto">${caraAnimo(recuerdo.entrada.animo, "mini")} ${esc(recuerdo.entrada.texto || animoDe(recuerdo.entrada.animo)?.nombre || "")}</div>\n       </div>` : "";
    return `\n    <div class="cabeza-diario">\n      ${tarjetaHoy}\n      <button class="semana-diario" id="btn-semana-calendario" type="button" aria-label="Open the calendar">\n        <div class="semana-dias">${tira}</div>\n        <div class="racha">${esc(rachaTxt)}</div>\n      </button>\n      ${tarjetaRecuerdo}\n      <div class="fila-cabeza-diario">\n        ${extra.paginas ? `<button class="tarjeta-calendario" id="btn-ver-calendario" type="button"><i class="icono-calendario" aria-hidden="true"></i> <span>Calendar</span><b>${extra.paginas}</b></button>` : ""}\n        ${cartas ? `<button class="tarjeta-cartas" id="btn-ver-cartas" type="button">${glifo("corazon")} <span>Letters</span><b>${cartas}</b></button>` : ""}\n        ${extra.meses ? `<button class="tarjeta-meses" id="btn-ver-meses" type="button">${glifo("estrella")} <span>Our months</span><b>${extra.meses}</b></button>` : ""}\n        ${extra.pasos ? tarjetaPasos(extra.pasos) : ""}\n        <button class="tarjeta-album" id="btn-ver-album" type="button"><span class="flor-album" aria-hidden="true">✿</span> <span>Sticker album</span><b>${extra.album || 0}/${TOTAL_ALBUM}</b></button>\n        <button class="tarjeta-estilo" id="btn-estilo-cuaderno" type="button"><span class="muestra-estilo" aria-hidden="true"></span> Notebook style</button>\n      </div>\n    </div>`;
}

export function itemsDelDia(dia) {
    const fotos = fotosDelDia(dia);
    const final = fotos.find((f => f.tipo === "final"));
    const resto = fotos.filter((f => f !== final));
    const m = mapaDe(dia);
    const mapa = m ? [ {
        tipo: "mapa",
        dataUrl: m.mini
    } ] : [];
    return final ? [ final, ...mapa, ...resto ] : [ ...mapa, ...resto ];
}

function imagenDeItem(item, i = 0) {
    if (item.tipo === "mapa") return `<img class="imagen-polaroid mapa-polaroid" src="${item.dataUrl}" alt="" draggable="false" data-item="${i}" />`;
    return `<img class="imagen-polaroid foto-real ${esLisa(item) ? "lisa" : ""}" src="${item.dataUrl}" alt="" draggable="false" data-item="${i}" data-clave="${esc(item.clave || "")}" data-tipo="${esc(item.tipo || "")}" />`;
}

export function clasesPagina(e, cuaderno) {
    const st = e.estilo || {};
    const c = [ `papel-${papelDe(st, cuaderno, e.fecha)}` ];
    if (st.papel) c.push("papel-elegido");
    if (st.cinta) c.push(`cinta-${st.cinta}`);
    if (st.tinta) c.push(`tinta-${st.tinta}`);
    if (st.giro != null) c.push(`giro-${st.giro < 0 ? "izq" : st.giro > 0 ? "der" : "recta"}`);
    return c.join(" ");
}

export function htmlStickersPagina(stickers, htmlSticker) {
    if (!stickers || !stickers.length || !htmlSticker) return `<div class="stickers-pagina" aria-hidden="true"></div>`;
    return `<div class="stickers-pagina" aria-hidden="true">${stickers.map(((st, i) => {
        const h = htmlSticker(st.id);
        if (!h) return "";
        return `<div class="sticker-pagina" data-sticker="${i}" style="left:${st.x}px;top:${st.y}px;width:${st.s}px;height:${st.s}px;transform:translate(-50%,-50%) rotate(${st.r}deg)">${h}</div>`;
    })).join("")}</div>`;
}

export function htmlPolaroid(e, {puedeRepetirFinal: puedeRepetirFinal = false, htmlSticker: htmlSticker = null, cuaderno: cuaderno = null, edicion: edicion = false} = {}) {
    const items = itemsDelDia(e.fecha);
    const hayMapa = items.some((x => x.tipo === "mapa"));
    const dorada = items.some((x => x.tipo === "final")) || e.hitos.some((h => h.startsWith("The day you said yes")));
    const notas = e.cartas.map((id => buscarCarta(id))).filter(Boolean).map((c => `<button class="nota-polaroid" type="button" data-leer-carta="${esc(c.id)}">${glifo("corazon")} ${esc(c.titulo)}</button>`)).join("");
    const hitos = e.hitos.slice(-2).map((h => `<div class="hito-polaroid">${glifo("estrella")} ${esc(h)}</div>`)).join("");
    const imagen = items.length ? imagenDeItem(items[0]) : fotoArteDelDia(e);
    const lugares = Donde.pinesDe(e.fecha).pines.length;
    return `\n    <figure class="polaroid ${dorada ? "dorada" : ""} ${clasesPagina(e, cuaderno)}" data-dia="${e.fecha}" data-indice="0" data-total="${items.length}">\n      <div class="marco-imagen">\n        ${imagen}\n        ${items.length > 1 ? `<span class="contador-fotos">1/${items.length}</span>` : ""}\n        ${dorada && puedeRepetirFinal ? `<button class="boton chico repetir-final" data-repetir-final="1">${glifo("corazon")} Relive</button>` : ""}\n      </div>\n      <figcaption>\n        <div class="fecha-polaroid">${esc(fechaPolaroid(e.fecha))} ${e.animo ? caraAnimo(e.animo, "mini") : ""}</div>\n        ${e.texto ? `<div class="escrito-polaroid" data-sin-nombre>${esc(e.texto)}</div>` : ""}\n        <div class="texto-polaroid ${e.texto ? "chico" : ""}">${esc(resumenDelDia(e, lugares))}</div>\n        ${hitos}${notas}\n        ${edicion ? "" : `<div class="botones-polaroid">\n          ${hayMapa ? `<button class="boton-mapa-dia" data-ver-mapa="1" type="button">${glifo("pin")} Our day's map</button>` : ""}\n          ${items.length ? `<button class="boton chico boton-fantasma boton-galeria" data-guardar-foto="1" type="button">Save to Photos</button>` : ""}\n          ${items.some((x => x.tipo !== "mapa" && x.tipo !== "final")) ? `<button class="boton-mapa-dia boton-borrar-foto ${items[0].tipo === "mapa" || items[0].tipo === "final" ? "oculto" : ""}" data-borrar-foto="1" type="button" aria-label="Delete this photo">🗑 Delete</button>` : ""}\n          <button class="boton-mapa-dia boton-decorar" data-decorar="1" type="button">✎ Decorate</button>\n        </div>`}\n      </figcaption>\n      ${htmlStickersPagina(e.estilo && e.estilo.stickers, htmlSticker)}\n    </figure>`;
}

export function renderDiario(container, diario, opts = {}) {
    const v = opts.ventana || {
        entradas: diario ? diario.entradasRecientes(VENTANA_DIARIO) : [],
        masNuevas: false,
        masViejas: false
    };
    const entradas = v.entradas;
    const punta = cual => `<button class="pagina-mas" type="button" data-mover-paginas="${cual}">\n       ${glifo(cual === "nuevas" ? "izq" : "der", "x2")}\n       <span>${cual === "nuevas" ? "Newer pages" : "Older pages"}</span>\n     </button>`;
    const cuerpo = entradas.length ? `<div class="tira-diario">${v.masNuevas ? punta("nuevas") : ""}${entradas.map((e => htmlPolaroid(e, opts))).join("")}${v.masViejas ? punta("viejas") : ""}</div>` : `<div class="vacio-suave">No pages yet. Take care of Baozi and go places together — this notebook writes itself.</div>`;
    container.innerHTML = `\n    ${encabezado("Diary", "btn-volver-consulta")}\n    ${cabezaDiario(diario, opts.cartas || 0, {
        meses: opts.meses || 0,
        album: opts.album || 0,
        paginas: diario ? diario.entradas.length : 0,
        pasos: opts.pasos || null
    })}\n    ${cuerpo}\n  `;
}

export const VENTANA_DIARIO = 21;

const FILTROS_CAL = [ [ "todo", "All", "" ], [ "fotos", "Photos", "camara" ], [ "cartas", "Letters", "corazon" ], [ "lugares", "Places", "pin" ] ];

const clave2 = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function sumarMes(mes, n) {
    const [y, m] = mes.split("-").map(Number);
    const f = new Date(y, m - 1 + n, 1);
    return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}`;
}

export function marcasDelDia(e) {
    if (!e) return null;
    const fotos = fotosDelDia(e.fecha).filter((f => f.dataUrl));
    return {
        fotos: fotos.length > 0,
        cartas: e.cartas.length > 0,
        lugares: e.lugares.length > 0 || Donde.pinesDe(e.fecha).pines.length > 0,
        hitos: e.hitos.length > 0,
        foto: fotos.find((f => f.tipo === "final")) || fotos[0] || null
    };
}

function miniDelDia(e, m) {
    if (m.foto) return `<img class="cal-mini foto-real" src="${m.foto.dataUrl}" alt="" draggable="false" />`;
    const f = fotoDelDia(e);
    if (f.tipo === "lugar") return `<img class="cal-mini" src="${arteDeLugar(f.id)}" alt="" draggable="false" />`;
    if (f.tipo === "npc") return `<img class="cal-mini retrato" src="${arte("npcs/npc_" + f.id + "_saludo.png")}" alt="" draggable="false" />`;
    if (e.animo) return caraAnimo(e.animo, "cal-cara");
    return `<span class="animo-cara cal-cara sin-animo">${spriteCara("ojo_base_energia_alta.png", f.id === "feliz" ? "boca_base_feliz.png" : "boca_base_neutral.png")}</span>`;
}

export function renderCalendario(container, diario, {mes: mes, filtro: filtro = "todo", marcado: marcado = null, hoy: hoy, primera: primera = null, saltos: saltos = []} = {}) {
    const [y, m] = mes.split("-").map(Number);
    const primerDiaSemana = new Date(y, m - 1, 1).getDay();
    const diasMes = new Date(y, m, 0).getDate();
    let celdas = "";
    for (let i = 0; i < primerDiaSemana; i++) celdas += `<div class="cal-dia vacio"></div>`;
    let cuenta = 0;
    for (let d = 1; d <= diasMes; d++) {
        const clave = clave2(y, m, d);
        const e = diario ? diario.entrada(clave) : null;
        const mk = marcasDelDia(e);
        const pasa = !!mk && (filtro === "todo" || mk[filtro]);
        if (pasa) cuenta += 1;
        const cl = [ "cal-dia", e ? "con-pagina" : "sin", e && !pasa ? "filtrado" : "", clave === hoy ? "hoy" : "", clave === marcado ? "marcado" : "", clave > hoy ? "futuro" : "" ].filter(Boolean).join(" ");
        const marcas = mk ? [ mk.cartas ? glifo("corazon") : "", mk.lugares ? glifo("pin") : "", mk.hitos ? glifo("estrella") : "" ].join("") : "";
        celdas += e ? `<button class="${cl}" type="button" data-cal-dia="${clave}" aria-label="${esc(fechaLegible(clave))}"><span class="cal-num">${d}</span>${pasa ? miniDelDia(e, mk) : ""}${pasa && marcas ? `<span class="cal-marcas">${marcas}</span>` : ""}</button>` : `<div class="${cl}"><span class="cal-num">${d}</span></div>`;
    }
    const mesHoy = hoy.slice(0, 7);
    const hayAntes = primera && mes > primera.slice(0, 7);
    const hayDespues = mes < mesHoy;
    const que = filtro === "todo" ? cuenta === 1 ? "page" : "pages" : filtro === "fotos" ? "with photos" : filtro === "cartas" ? "with letters" : "with places";
    container.innerHTML = `\n    ${encabezado("Calendar", "btn-volver-consulta")}\n    <div class="calendario-diario">\n      <div class="cal-lado">\n        <button class="boton chico boton-fantasma cal-volver" id="btn-calendario-volver" data-cal-volver type="button">${glifo("atras")} Pages</button>\n        <div class="cal-saltos">\n          ${saltos.map((s => `<button class="boton chico cal-salto" type="button" data-cal-ir="${s.id}">${glifo(s.glifo)} ${esc(s.nombre)}</button>`)).join("")}\n        </div>\n        <div class="cal-solo">Show only</div>\n        <div class="cal-filtros">\n          ${FILTROS_CAL.map((([id, nombre, g]) => `<button class="cal-filtro ${id === filtro ? "activo" : ""}" type="button" data-cal-filtro="${id}" aria-pressed="${id === filtro}">${g ? glifo(g) : ""}${nombre}</button>`)).join("")}\n        </div>\n      </div>\n      <div class="cal-mes">\n        <div class="cal-cabeza">\n          <button class="boton chico boton-fantasma cal-volver-chico" type="button" data-cal-volver aria-label="Back to the pages">${glifo("atras")}</button>\n          <button class="boton chico boton-fantasma cal-flecha" type="button" data-cal-mes="-1" ${hayAntes ? "" : "disabled"} aria-label="Previous month">${glifo("izq")}</button>\n          <div class="cal-titulo"><b>${MESES_LARGOS[m - 1]} ${y}</b><span>${cuenta} ${que}</span></div>\n          <button class="boton chico boton-fantasma cal-flecha" type="button" data-cal-mes="1" ${hayDespues ? "" : "disabled"} aria-label="Next month">${glifo("der")}</button>\n        </div>\n        <div class="cal-semana">${[ "S", "M", "T", "W", "T", "F", "S" ].map((x => `<span>${x}</span>`)).join("")}</div>\n        <div class="cal-grilla">${celdas}</div>\n      </div>\n    </div>`;
}

export function renderEscribir(container, {entrada: entrada = null, foto: foto = null, clave: clave = null} = {}) {
    const animo = entrada && entrada.animo ? entrada.animo : null;
    const a = animoDe(animo) || ANIMOS[1];
    const pasado = !!clave;
    const pregunta = entrada && entrada.pregunta || preguntaDelDia(clave || undefined);
    container.innerHTML = `\n    <div class="pantalla-escribir con-cuarto">\n      <div class="escribir-personaje" id="escribir-personaje">${spriteCara(a.ojo, a.boca)}</div>\n      <div class="hoja-escribir papel">\n        <div class="hoja-fecha">${esc(fechaLegible(clave || claveDelDiaLogico()))}</div>\n        <div class="hoja-pregunta">${esc(pregunta)}</div>\n        <div class="fila-animos" role="radiogroup" aria-label="How was today?">\n          ${ANIMOS.map((x => `<button class="boton-animo ${x.id === animo ? "elegido" : ""}" data-animo="${x.id}" role="radio" aria-checked="${x.id === animo}" aria-label="${x.nombre}">${caraAnimo(x.id, "mini")}<span>${x.nombre}</span></button>`)).join("")}\n        </div>\n        <textarea id="texto-hoy" maxlength="400" rows="3" placeholder="A few words about today…" data-sin-nombre>${esc(entrada && entrada.texto || "")}</textarea>\n        <div class="hoja-pie">\n          ${foto ? `<img class="hoja-foto ${esLisa(foto) ? "lisa" : ""}" src="${foto.dataUrl}" alt="" />` : pasado ? "<span></span>" : `<button class="boton boton-fantasma chico" id="btn-foto-hoy">${glifo("camara")} Photo</button>`}\n          <div class="hoja-botones">\n            <button class="boton boton-fantasma" id="btn-cancelar-hoy">Later</button>\n            <button class="boton" id="btn-guardar-hoy">${glifo("check")} Save</button>\n          </div>\n        </div>\n      </div>\n    </div>`;
}

const DIAS_CORTOS = [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ];

const MESES_CORTOS = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];

function fechaPolaroid(clave) {
    const [y, m, d] = clave.split("-").map(Number);
    return `${DIAS_CORTOS[new Date(y, m - 1, d).getDay()]} ${MESES_CORTOS[m - 1]} ${d}`;
}

export function siguienteFotoPolaroid(figura) {
    const items = itemsDelDia(figura.dataset.dia);
    if (items.length < 2) return;
    const i = (Number(figura.dataset.indice) + 1) % items.length;
    figura.dataset.indice = String(i);
    const img = figura.querySelector(".imagen-polaroid");
    if (img) img.outerHTML = imagenDeItem(items[i], i);
    const c = figura.querySelector(".contador-fotos");
    if (c) c.textContent = `${i + 1}/${items.length}`;
    const b = figura.querySelector("[data-borrar-foto]");
    if (b) b.classList.toggle("oculto", items[i].tipo === "mapa" || items[i].tipo === "final");
}

export function renderMapaDia(container, {dia: dia, mapa: mapa, pines: pines, puntos: puntos, fotos: fotos = 0}) {
    const chips = pines.map(((p, i) => `<span class="chip-hora" data-pin="${i}">${esc(p.horas.map(Donde.hora).join(" · "))}</span>`)).join("");
    const lista = puntos.map((p => `<li>${glifo("pin")} ${esc(Donde.hora(p.min))}</li>`)).join("");
    container.innerHTML = `\n    <div class="pantalla-mapa-dia">\n      <div class="mapa-dia-marco" id="mapa-dia-marco">\n        <img class="mapa-dia-img" src="${mapa.grande}" alt="" draggable="false" />\n        ${chips}\n        <div class="mapa-dia-personaje" id="mapa-dia-personaje">${spriteCara("ojo_base_energia_alta.png", "boca_base_feliz.png")}</div>\n        ${mapa.real && !mapa.osm ? `<span class="mapa-dia-credito">© OpenStreetMap</span>` : ""}\n      </div>\n      <div class="mapa-dia-hoja">\n        <div class="mapa-dia-fecha">${esc(fechaPolaroid(dia))}</div>\n        <div class="mapa-dia-titulo">Our day</div>\n        <ol class="mapa-dia-horas">${lista}</ol>\n        ${fotos ? `<div class="mapa-dia-extra">${glifo("camara")} ${fotos} photo${fotos === 1 ? "" : "s"}</div>` : ""}\n        ${mapa.real ? "" : `<div class="mapa-dia-extra tenue">The real map shows up when there's internet.</div>`}\n        <button class="boton chico" id="btn-volver-mapa-dia">${glifo("atras")} Back</button>\n      </div>\n    </div>`;
}

export function renderPreguntaPasos(container, {clave: clave, cuando: cuando = "today", contados: contados = 0, anotados: anotados = null} = {}) {
    const ya = anotados != null ? anotados : 0;
    container.innerHTML = `\n    <div class="pantalla-escribir con-cuarto pantalla-pasos">\n      <div class="escribir-personaje">${spriteCara("ojo_base_energia_alta.png", "boca_base_feliz.png")}</div>\n      <div class="hoja-escribir papel">\n        <div class="hoja-fecha">${esc(fechaLegible(clave))}</div>\n        <div class="hoja-pregunta">How many steps did we walk ${cuando === "yesterday" ? "yesterday" : "today"}?</div>\n        <div class="pasos-ayuda">${glifo("pie")} Look in the Health app on your phone ♥</div>\n        <label class="fila-pasos">\n          <input id="input-pasos" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" placeholder="${Math.max(contados, ya) || "0"}" aria-label="Steps" />\n          <span>steps</span>\n        </label>\n        <div class="pasos-ayuda tenue" id="pasos-nota">${contados > 0 ? `I counted ${contados.toLocaleString("en-US")} steps while we walked together.` : ""}</div>\n        <div class="hoja-botones">\n          <button class="boton boton-fantasma" id="btn-pasos-luego">Not now</button>\n          <button class="boton" id="btn-pasos-guardar">${glifo("check")} Save</button>\n        </div>\n      </div>\n    </div>`;
}

const MESES_LARGOS = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];

export const NOMBRE_MES = mes => MESES_LARGOS[mes - 1] || "";

function iconoFecha(tipo) {
    if (tipo === "boda") return `<img class="icono-fecha" src="${arte("final/anillo.png")}" alt="" draggable="false" />`;
    return glifo({
        aniversario: "corazon",
        cumple: "estrella",
        otra: "nota"
    }[tipo] || "nota", "icono-fecha");
}

export function renderFechas(container, {cabeza: cabeza = "", filas: filas = [], form: form = null, tipos: tipos = [], borrar: borrar = null, puedeAgregar: puedeAgregar = true, enamorado: enamorado = false} = {}) {
    let cuerpo;
    if (form) {
        const anioActual = (new Date).getFullYear();
        const anios = [];
        for (let a = anioActual + 6; a >= 1950; a--) anios.push(a);
        cuerpo = `\n      <div class="form-fecha" id="form-fecha">\n        <input id="fecha-nombre" type="text" maxlength="28" autocomplete="off" autocapitalize="sentences" spellcheck="false" placeholder="What is it? (her birthday…)" aria-label="Name of the date" value="${esc(form.nombre || "")}" data-sin-nombre />\n        <div class="fila-selects">\n          <select id="fecha-mes" aria-label="Month">${MESES_LARGOS.map(((m, i) => `<option value="${i + 1}" ${form.mes === i + 1 ? "selected" : ""}>${m}</option>`)).join("")}</select>\n          <select id="fecha-dia" aria-label="Day">${Array.from({
            length: 31
        }, ((_, i) => `<option value="${i + 1}" ${form.dia === i + 1 ? "selected" : ""}>${i + 1}</option>`)).join("")}</select>\n          <select id="fecha-anio" aria-label="Year (optional)"><option value="">Year (optional)</option>${anios.map((a => `<option value="${a}" ${form.anio === a ? "selected" : ""}>${a}</option>`)).join("")}</select>\n        </div>\n        <div class="fila-tipos" role="radiogroup" aria-label="Kind">\n          ${tipos.map((t => `<button class="chip-elegir ${t.id === form.tipo ? "puesto" : ""}" type="button" data-tipo-fecha="${t.id}" role="radio" aria-checked="${t.id === form.tipo}">${iconoFecha(t.id)} ${esc(t.nombre)}</button>`)).join("")}\n        </div>\n        <div class="aviso-lugar ${form.error ? "error" : ""}" id="aviso-fecha" aria-live="polite">${esc(form.aviso || "")}</div>\n        <div class="hoja-botones">\n          <button class="boton boton-fantasma" type="button" id="btn-fecha-cancelar">Cancel</button>\n          <button class="boton" type="button" id="btn-fecha-guardar">${glifo("check")} Save</button>\n        </div>\n      </div>`;
    } else {
        const lista = filas.length ? `<ul class="lista-fechas">${filas.map((f => `<li class="fila-fecha ${f.hoy ? "hoy" : ""}">\n              <span class="tipo-fecha">${iconoFecha(f.tipo)}</span>\n              <span class="nombre-fecha" data-sin-nombre>${esc(f.nombre)}<small>${esc(f.fecha)}</small></span>\n              <span class="falta-fecha">${esc(f.falta)}</span>\n              ${f.fija ? `<span class="borrar-fecha" aria-hidden="true"></span>` : `<button class="borrar-fecha ${borrar === f.id ? "seguro" : ""}" type="button" data-borrar-fecha="${esc(f.id)}" aria-label="Delete ${esc(f.nombre)}">${borrar === f.id ? "Sure?" : glifo("cerrar")}</button>`}\n            </li>`)).join("")}</ul>` : `<div class="vacio-suave">No dates yet. Add the ones that matter to you two ♥</div>`;
        cuerpo = `\n      ${lista}\n      <div class="hoja-botones">\n        <button class="boton boton-fantasma" type="button" id="btn-fechas-cerrar">${glifo("atras")} Back</button>\n        ${puedeAgregar ? `<button class="boton" type="button" id="btn-fecha-agregar">+ Add a date</button>` : ""}\n      </div>`;
    }
    container.innerHTML = `\n    <div class="pantalla-escribir con-cuarto pantalla-fechas">\n      <div class="escribir-personaje">${enamorado ? spriteCara("ojo_especial_enamorado.png", "boca_especial_enamorado.png") : spriteCara("ojo_base_energia_alta.png", "boca_base_feliz.png")}</div>\n      <div class="hoja-escribir papel fechas-hoja">\n        <div class="hoja-fecha">${form ? "A new date" : "Our dates"}</div>\n        ${form ? "" : `<div class="hoja-pregunta">${esc(cabeza)}</div>`}\n        ${cuerpo}\n      </div>\n    </div>`;
}

export function renderMudanza(container, {quien: quien = "baozi", texto: texto = ""} = {}) {
    container.innerHTML = `\n    <div class="primer-plano con-cuarto pp-mudanza">\n      <div class="pp-figura">\n        <div class="pp-primera">${spriteCara("ojo_especial_enamorado.png", "boca_especial_enamorado.png", false, "", {
        quien: quien
    })}</div>\n        <img class="mudanza-valija" src="${arte("tienda/valija.png")}" alt="" draggable="false" />\n      </div>\n      <div class="pp-texto deseo-hoja papel">\n        <div class="pp-titulo">Knock knock…</div>\n        <div class="deseo-grande" data-sin-nombre>“${esc(texto)}”</div>\n        <div class="fila-botones"><button class="boton" id="btn-mudanza-si">${glifo("corazon")} Yes ♥</button></div>\n      </div>\n    </div>`;
}

export function renderJuegos(container, {recordSnack: recordSnack = 0, recordPesca: recordPesca = 0, recordTorre: recordTorre = 0, recordTejo: recordTejo = 0, recordFaroles: recordFaroles = 0, cancionesRitmo: cancionesRitmo = 5, libro: libro = [], primeras: primeras = {}} = {}) {
    const pescados = libro.filter((p => p.n > 0)).length;
    const moneda = j => primeras[j] ? `<span class="juego-moneda" title="First game today: coins for your score"><img src="${arte("tienda/moneda.png")}" alt="coins today" draggable="false" /></span>` : "";
    container.innerHTML = `\n    <div class="pantalla-juegos con-cuarto">\n      <button class="boton-volver volver-flotante" id="btn-volver-juegos" aria-label="Back">${glifo("atras")}</button>\n      <div class="juegos-titulo">What shall we play?</div>\n      <div class="juegos-fila">\n        <button class="tarjeta-juego" id="btn-juego-snack">\n          ${moneda("snack")}\n          <span class="juego-arte"><img src="${arte("comida/juego_bao_dorado.png")}" alt="" draggable="false" /></span>\n          <span class="juego-nombre">Snack Rain</span>\n          <span class="juego-best">Best ${recordSnack}</span>\n        </button>\n        <button class="tarjeta-juego" id="btn-juego-pesca">\n          ${moneda("pesca")}\n          <span class="juego-arte pez"><img src="${arte("pesca/pez_koi.png")}" alt="" draggable="false" /></span>\n          <span class="juego-nombre">Lake Fishing</span>\n          <span class="juego-best">Best ${recordPesca}</span>\n        </button>\n        <button class="tarjeta-juego" id="btn-juego-torre">\n          ${moneda("torre")}\n          <span class="juego-arte icono"><img src="${arte("juegos/icono_torre.png")}" alt="" draggable="false" /></span>\n          <span class="juego-nombre">Steamer Stack</span>\n          <span class="juego-best">Best ${recordTorre}</span>\n        </button>\n        <button class="tarjeta-juego" id="btn-juego-ritmo">\n          ${moneda("ritmo")}\n          <span class="juego-arte icono"><img src="${arte("juegos/icono_ritmo.png")}" alt="" draggable="false" /></span>\n          <span class="juego-nombre">Radio Beats</span>\n          <span class="juego-best">${cancionesRitmo} songs</span>\n        </button>\n        <button class="tarjeta-juego" id="btn-juego-tejo">\n          ${moneda("tejo")}\n          <span class="juego-arte icono"><img src="${arte("juegos/icono_tejo.png")}" alt="" draggable="false" /></span>\n          <span class="juego-nombre">Tejo</span>\n          <span class="juego-best">Best ${recordTejo}</span>\n        </button>\n        <button class="tarjeta-juego" id="btn-juego-faroles">\n          ${moneda("faroles")}\n          <span class="juego-arte icono"><img src="${arte("juegos/icono_faroles.png")}" alt="" draggable="false" /></span>\n          <span class="juego-nombre">Lanterns</span>\n          <span class="juego-best">Best ${recordFaroles}</span>\n        </button>\n      </div>\n      <div class="libro-peces" aria-label="Fish book: ${pescados} of ${libro.length}">\n        <span class="libro-titulo">Fish book ${pescados}/${libro.length}</span>\n        ${libro.map((p => `<span class="libro-pez ${p.n ? "" : "sin"}" title="${p.n ? esc(p.nombre) : "???"}"><img src="${arte(`pesca/pez_${p.id}.png`)}" alt="" draggable="false" />${p.n ? `<small>×${p.n}</small>` : "<small>?</small>"}</span>`)).join("")}\n      </div>\n    </div>`;
}

export function renderDeseo(container, {texto: texto, real: real = false, estado: estado = "escuchado", progreso: progreso = 0, meta: meta = 0} = {}) {
    const cumplido = estado === "cumplido";
    const pie = cumplido ? `<button class="boton" id="btn-deseo-ok">${glifo("corazon")} Yay!</button>` : real ? `<button class="boton boton-fantasma" id="btn-deseo-luego">Later</button><button class="boton" id="btn-deseo-hecho">${glifo("check")} Done ♥</button>` : `<button class="boton" id="btn-deseo-ok">${glifo("corazon")} Okay!</button>`;
    container.innerHTML = `\n    <div class="primer-plano con-cuarto pp-deseo">\n      ${figuraPrimerPlano(cumplido ? "ojo_especial_euforico.png" : "ojo_especial_curioso.png", cumplido ? "boca_especial_euforico.png" : "boca_especial_curioso.png")}\n      <div class="pp-texto deseo-hoja papel">\n        <div class="pp-titulo">${cumplido ? "My wish came true!" : "Baozi's wish"}</div>\n        <div class="deseo-grande">“${esc(texto)}”</div>\n        ${!cumplido && meta ? `<div class="deseo-progreso">${Math.min(meta, progreso)} / ${meta}</div>` : ""}\n        <div class="deseo-nota">${cumplido ? "Thank you ♥ (+10 coins)" : real ? "A wish for real life. Tap Done when you did it ♥" : "It comes true by itself when you do it. +10 coins"}</div>\n        <div class="fila-botones">${pie}</div>\n      </div>\n    </div>`;
}

export function renderCarta(container, carta, {releer: releer = false, fecha: fecha = ""} = {}) {
    if (!carta) return;
    container.innerHTML = `\n    <div class="papel carta-papel ${releer ? "releida" : ""}">\n      <div class="sello-carta">${glifo("corazon", "x4")}</div>\n      <div class="carta-titulo">${esc(carta.titulo)}</div>\n      <div class="carta-texto" data-sin-nombre>${esc(carta.texto)}</div>\n      ${releer && fecha ? `<div class="carta-fecha">${esc(fecha)}</div>` : ""}\n      <button id="btn-continuar-carta" class="boton">${releer ? "Back" : "Continue"}</button>\n    </div>\n  `;
}

export function htmlEstiloCuaderno(estilo) {
    const op = (grupo, x, actual, muestra) => `<button class="op-estilo ${x.id === actual ? "puesto" : ""}" type="button" data-estilo-${grupo}="${x.id}" aria-pressed="${x.id === actual}"><i class="muestra-${grupo} muestra-${grupo}-${x.id}" ${muestra ? `style="background:${muestra}"` : ""}></i><span>${esc(x.nombre)}</span></button>`;
    return `\n    <div class="velo-estilo" id="velo-estilo">\n      <div class="papel cartel-estilo" role="dialog" aria-label="Notebook style">\n        <div class="titulo-estilo">NOTEBOOK STYLE</div>\n        <div class="fila-estilo"><span class="etiqueta-estilo">Pages</span><div class="ops-estilo">${HOJAS.map((x => op("hojas", x, estilo.hojas))).join("")}</div></div>\n        <div class="fila-estilo"><span class="etiqueta-estilo">Rings</span><div class="ops-estilo">${ANILLOS.map((x => op("anillos", x, estilo.anillos, x.color))).join("")}</div></div>\n        <div class="fila-estilo"><span class="etiqueta-estilo">Page color</span><div class="ops-estilo">${PAPELES_CUADERNO.map((x => op("papel", x, estilo.papel))).join("")}</div></div>\n        <div class="pie-estilo"><span>Pages you decorate keep their own paper.</span><button class="boton chico" id="btn-estilo-listo" type="button">${glifo("check")} Done</button></div>\n      </div>\n    </div>`;
}

export function renderCartas(container, cartas) {
    container.innerHTML = `\n    ${encabezado("Letters", "btn-volver-consulta")}\n    <div class="lista-journal lista-cartas">\n      <div class="fila-botones"><button class="boton chico boton-fantasma" id="btn-cartas-volver" type="button">${glifo("atras")} Diary</button></div>\n      <div class="subtitulo-lista">Letters</div>\n      ${cartas.length ? cartas.map((c => `<button class="fila-carta" type="button" data-leer-carta="${esc(c.id)}">\n                  <span class="fila-carta-sello">${glifo("corazon")}</span>\n                  <span class="fila-carta-titulo">${esc(c.titulo)}</span>\n                  ${c.fecha ? `<span class="fila-carta-fecha">${esc(c.fecha)}</span>` : ""}\n                </button>`)).join("") : `<div class="vacio-suave">No letters yet.</div>`}\n    </div>`;
}
