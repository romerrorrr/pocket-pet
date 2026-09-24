/**
 * lente.js
 * =========
 * EL LENTE DE BAOZI: la camara del telefono vista a traves del
 * aparato. El visor muestra el mundo en vivo ya convertido a la paleta
 * del juego (ver camara.js), como una Game Boy Camera: la foto no se
 * "filtra despues", el aparato directamente VE asi.
 *
 * Modos:
 *   "foto"    fotos para el diario (y para el lugar, si se abre desde un
 *             descubrimiento). Obturador + "revelado" con Keep / Retake,
 *             como una impresora de Game Boy.
 *   "pedido"  la selfie que pide Baozi el dia del final. Sin Keep ni
 *             Retake: la foto se imprime y sigue sola — esa foto ES la
 *             puerta de la secuencia.
 *
 * Respaldo: si el visor en vivo no puede abrir la camara (permiso,
 * navegador), se ofrece la app de camara del sistema.
 */

import * as Personaje from "./personaje.js";
import {
  ANCHO_FOTO, ALTO_FOTO, recorte43, medirNiveles, aplicarFiltro, fotoTramada,
  guardarFoto, abrirCaptura, cargarImagen,
} from "./camara.js";
import { claveDelDia } from "./diario.js";
import * as Sonido from "./sonido.js";
import { vibrar } from "./actuadores.js";

const MS_ENTRE_CUADROS = 45; // ~22 fps: de sobra para pixel art, y cuida la bateria
const MS_REVELADO_PEDIDO = 1900;

// Filtros: todos pixel (176x132, tramados); cada uno con su paleta
// (camara.js, FILTROS_PIXEL). El pedido del final es siempre PIXEL.
export const FILTROS = [
  { id: "pixel", nombre: "PIXEL" },
  { id: "bn", nombre: "B&W" },
  { id: "sepia", nombre: "SEPIA" },
  { id: "vintage", nombre: "VINTAGE" },
  { id: "color", nombre: "COLOR" },
];
const CLAVE_FILTRO = "baozi_filtro";
const MAX_STICKERS = 8;
// con stickers la foto se guarda al doble (352x264): la foto tramada se
// agranda sin suavizar y los stickers van encima en pixel limpio
const ESCALA_CON_STICKERS = 2;

function leerFiltro() {
  try {
    const f = localStorage.getItem(CLAVE_FILTRO);
    return FILTROS.some((x) => x.id === f) ? f : "pixel";
  } catch (e) {
    return "pixel";
  }
}

export function camaraEnVivoPosible() {
  return !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

function escaparHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

/**
 * Abre el lente dentro de `contenedor`. Devuelve { cerrar }.
 * opts: modo, frontal, lugar, tipoFoto, ensayo, titulo, alGuardar(foto), alSalir()
 *   stickers: [{ id, grupo, pose?, html, capas: [src], lado }]  (el catalogo)
 *   grupos:   [{ id, nombre, html }]  (las pestañas del catalogo)
 *   iconoSticker: html del boton que abre el catalogo
 */
export function abrirLente(contenedor, opts = {}) {
  const {
    modo = "foto",
    lugar = null,
    tipoFoto = "diario",
    ensayo = false,
    titulo = `${Personaje.nombre().toUpperCase()} LENS`,
    alGuardar = () => {},
    alSalir = () => {},
  } = opts;
  let frontal = !!opts.frontal;
  const esPedido = modo === "pedido";
  // el pedido del final es siempre la foto pixel, sin stickers
  let filtro = esPedido ? "pixel" : leerFiltro();
  const catalogo = esPedido ? [] : opts.stickers || [];
  const grupos = (opts.grupos || []).filter((g) => catalogo.some((c) => c.grupo === g.id));
  let grupoAbierto = grupos.length ? grupos[0].id : null;
  let poseAbierta = "parado";
  const puestos = []; // los stickers en la foto: { def, x, y, s, el, imgs }
  let elegido = null;
  let stickersDeLaFoto = []; // los ids que quedaron en la ultima foto (para las misiones)

  contenedor.innerHTML = `
    <div class="lente modo-${modo}">
      <div class="visor" id="visor">
        <canvas class="visor-lienzo" id="visor-lienzo" width="${ANCHO_FOTO}" height="${ALTO_FOTO}"></canvas>
        <video class="visor-video" id="visor-video" playsinline muted autoplay></video>
        <div class="visor-esquinas" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <div class="visor-rotulo"><span class="rec"></span>${escaparHtml(titulo)}</div>
        ${ensayo ? `<div class="visor-rotulo derecha">REHEARSAL</div>` : ""}
        <div class="visor-flash" id="visor-flash"></div>
        <div class="visor-aviso oculto" id="visor-aviso"></div>
        ${
          esPedido
            ? ""
            : `<div class="capa-stickers" id="capa-stickers"></div>
               <div class="bandeja-stickers oculto" id="bandeja-stickers" data-sin-nombre>
                 <div class="bandeja-pestanas">
                   ${grupos.map((g) => `<button class="pestana-sticker" data-grupo="${g.id}">${g.html || escaparHtml(g.nombre)}</button>`).join("")}
                   <span class="bandeja-poses">
                     <button class="chip-filtro" data-pose="parado">STAND</button>
                     <button class="chip-filtro" data-pose="sentado">SIT</button>
                   </span>
                   <button class="bandeja-cerrar" id="bandeja-cerrar" aria-label="Close"><i class="glifo g-cerrar"></i></button>
                 </div>
                 <div class="bandeja-grilla" id="bandeja-grilla"></div>
               </div>
               <div class="visor-filtros" id="visor-filtros">
                 ${FILTROS.map((f) => `<button class="chip-filtro" data-filtro="${f.id}">${f.nombre}</button>`).join("")}
               </div>`
        }
      </div>
      <div class="lente-lateral">
        <button class="boton-icono" id="lente-volver" aria-label="Back"><i class="glifo g-atras"></i></button>
        ${esPedido || !catalogo.length ? "" : `<button class="boton-icono boton-sticker" id="lente-sticker" aria-label="Stickers">${opts.iconoSticker || ""}</button>`}
        <button class="obturador" id="lente-obturador" aria-label="Take photo"><span></span></button>
        <button class="boton-icono" id="lente-girar" aria-label="Flip camera"><i class="glifo g-girar"></i></button>
      </div>
      <div class="lente-revelado oculto" id="lente-revelado">
        <div class="revelado-marco">
          <canvas class="revelado-lienzo" id="revelado-lienzo" width="${ANCHO_FOTO}" height="${ALTO_FOTO}"></canvas>
        </div>
        ${
          esPedido
            ? ""
            : `<div class="revelado-botones">
                 <button class="boton boton-fantasma" id="revelado-otra">Retake</button>
                 <button class="boton" id="revelado-guardar"><i class="glifo g-check"></i> Keep</button>
               </div>`
        }
      </div>
    </div>
  `;

  const $ = (id) => contenedor.querySelector(`#${id}`);
  const lienzo = $("visor-lienzo");
  const vctx = lienzo.getContext("2d");
  const video = $("visor-video");
  video.muted = true;
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");

  const trabajo = document.createElement("canvas");
  trabajo.width = ANCHO_FOTO;
  trabajo.height = ALTO_FOTO;
  const tctx = trabajo.getContext("2d", { willReadFrequently: true });

  let stream = null;
  let pedidoCamara = 0;
  let raf = 0;
  let vivo = true;
  let congelado = false;
  let guardando = false;
  let ultimoCuadro = 0;
  let niveles = null;

  // ------------------------------------------------------------------
  // Camara
  // ------------------------------------------------------------------

  function detenerStream() {
    if (stream) {
      for (const pista of stream.getTracks()) pista.stop();
      stream = null;
    }
    video.srcObject = null;
  }

  async function iniciarStream() {
    const miPedido = ++pedidoCamara;
    detenerStream();
    ocultarAviso();
    if (!camaraEnVivoPosible()) {
      mostrarRespaldo("no-soportado");
      return;
    }
    try {
      const nuevo = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: frontal ? "user" : "environment" }, width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      if (!vivo || miPedido !== pedidoCamara) {
        for (const pista of nuevo.getTracks()) pista.stop();
        return;
      }
      stream = nuevo;
      const pistaVideo = stream.getVideoTracks()[0];
      if (pistaVideo) {
        // Una llamada u otra app pueden cortar la camara sin avisar: se reabre sola.
        pistaVideo.addEventListener("ended", () => {
          if (vivo && stream === nuevo && document.visibilityState === "visible") iniciarStream();
        });
      }
      video.srcObject = stream;
      await video.play().catch(() => {});
    } catch (e) {
      if (miPedido !== pedidoCamara || !vivo) return;
      mostrarRespaldo(e && e.name === "NotAllowedError" ? "permiso" : "sin-camara");
    }
  }

  // ------------------------------------------------------------------
  // Cuadro a cuadro: video -> 176x132 -> niveles -> tramado -> visor
  // ------------------------------------------------------------------

  function cuadro(ts) {
    if (!vivo) return;
    raf = requestAnimationFrame(cuadro);
    if (congelado || ts - ultimoCuadro < MS_ENTRE_CUADROS) return;
    if (!video.videoWidth || video.readyState < 2) return;
    ultimoCuadro = ts;

    const r = recorte43(video.videoWidth, video.videoHeight);
    if (lienzo.width !== ANCHO_FOTO) {
      lienzo.width = ANCHO_FOTO;
      lienzo.height = ALTO_FOTO;
    }
    tctx.save();
    if (frontal) {
      tctx.translate(ANCHO_FOTO, 0);
      tctx.scale(-1, 1);
    }
    tctx.drawImage(video, r.sx, r.sy, r.sw, r.sh, 0, 0, ANCHO_FOTO, ALTO_FOTO);
    tctx.restore();
    const datos = tctx.getImageData(0, 0, ANCHO_FOTO, ALTO_FOTO);
    const medidos = medirNiveles(datos);
    // Suavizado entre cuadros: sin esto el brillo "respira" solo.
    niveles = niveles
      ? { lo: niveles.lo + (medidos.lo - niveles.lo) * 0.2, hi: niveles.hi + (medidos.hi - niveles.hi) * 0.2 }
      : medidos;
    aplicarFiltro(datos, niveles, filtro);
    vctx.putImageData(datos, 0, 0);
  }

  // ------------------------------------------------------------------
  // Obturador y revelado
  // ------------------------------------------------------------------

  function destellar() {
    const f = $("visor-flash");
    if (!f) return;
    f.classList.remove("activo");
    void f.offsetWidth;
    f.classList.add("activo");
  }

  function mostrarRevelado(fuenteLienzo) {
    congelado = true;
    const rev = $("lente-revelado");
    const rl = $("revelado-lienzo");
    rl.width = fuenteLienzo.width;
    rl.height = fuenteLienzo.height;
    rl.getContext("2d").drawImage(fuenteLienzo, 0, 0);
    rev.classList.remove("oculto", "imprimiendo");
    void rev.offsetWidth;
    rev.classList.add("imprimiendo");
    Sonido.sonar("impresora");
    if (esPedido) {
      // la foto del pedido no se discute: se imprime y sigue
      const volver = $("lente-volver");
      if (volver) volver.disabled = true;
      setTimeout(() => {
        if (vivo) guardarRevelado();
      }, MS_REVELADO_PEDIDO);
    }
  }

  /** La foto final: el visor (ya tramado con su filtro), con los stickers encima. */
  function fotoFinal() {
    const copia = document.createElement("canvas");
    copia.width = ANCHO_FOTO;
    copia.height = ALTO_FOTO;
    copia.getContext("2d").drawImage(lienzo, 0, 0);
    return pegarStickers(copia);
  }

  /**
   * Con stickers: la foto al doble (sin suavizar) y cada sticker en pixel
   * limpio, a una escala de medio en medio (asi no se deforman los pixeles).
   */
  function pegarStickers(foto) {
    const listos = puestos.filter((p) => p.imgs.every((i) => i.complete && i.naturalWidth));
    if (!listos.length) return foto;
    const k = ESCALA_CON_STICKERS;
    const c = document.createElement("canvas");
    c.width = foto.width * k;
    c.height = foto.height * k;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.drawImage(foto, 0, 0, c.width, c.height);
    for (const p of listos) {
      const lado = p.def.lado || Math.max(p.imgs[0].naturalWidth, p.imgs[0].naturalHeight);
      const esc = Math.max(0.5, Math.round(((p.s * c.height) / lado) * 2) / 2);
      for (const i of p.imgs) {
        const w = i.naturalWidth * esc;
        const h = i.naturalHeight * esc;
        g.drawImage(i, Math.round(p.x * c.width - w / 2), Math.round(p.y * c.height - h / 2), w, h);
      }
    }
    return c;
  }

  function sacarFoto() {
    if (congelado || !video.videoWidth) return;
    Sonido.sonar("obturador");
    vibrar(25);
    destellar();
    const copia = fotoFinal();
    stickersDeLaFoto = puestos.map((p) => p.def.id);
    setTimeout(() => {
      if (vivo) mostrarRevelado(copia);
    }, 160);
  }

  async function guardarRevelado() {
    if (guardando) return;
    guardando = true;
    const rl = $("revelado-lienzo");
    // todas son pixel: png (sin artefactos, y pesan poco)
    const dataUrl = rl.toDataURL("image/png");
    let foto = { dataUrl, dia: claveDelDia(), lugar, tipo: tipoFoto, filtro, stickers: stickersDeLaFoto };
    if (!ensayo) foto = await guardarFoto(foto);
    if (!esPedido) Sonido.sonar("guardado");
    cerrar();
    alGuardar(foto);
  }

  // ------------------------------------------------------------------
  // Respaldo: sin visor en vivo
  // ------------------------------------------------------------------

  function mostrarAviso(html) {
    const a = $("visor-aviso");
    a.innerHTML = html;
    a.classList.remove("oculto");
  }

  function ocultarAviso() {
    const a = $("visor-aviso");
    if (a) a.classList.add("oculto");
  }

  function mostrarRespaldo(motivo) {
    const textos = {
      permiso: "Baozi needs permission to see through your camera.",
      "sin-camara": "Baozi can't find a camera right now.",
      "no-soportado": "This browser won't let Baozi look through the camera.",
    };
    mostrarAviso(`
      <div class="aviso-texto">${textos[motivo] || textos["sin-camara"]}</div>
      <div class="aviso-botones">
        ${motivo !== "no-soportado" ? `<button class="boton boton-fantasma" id="aviso-reintentar">Try again</button>` : ""}
        <button class="boton" id="aviso-app"><i class="glifo g-camara"></i> Use camera app</button>
      </div>
    `);
    const reintentar = $("aviso-reintentar");
    if (reintentar) reintentar.addEventListener("click", iniciarStream);
    $("aviso-app").addEventListener("click", usarAppDeCamara);
  }

  async function usarAppDeCamara() {
    const archivo = await abrirCaptura({ frontal });
    if (!archivo || !vivo) return;
    try {
      const img = await cargarImagen(archivo);
      const lista = pegarStickers(fotoTramada(img, img.naturalWidth, img.naturalHeight, { filtro }));
      stickersDeLaFoto = puestos.map((p) => p.def.id);
      ocultarAviso();
      mostrarRevelado(lista);
    } catch (e) {
      /* no se pudo leer: se puede volver a intentar */
    }
  }

  // ------------------------------------------------------------------
  // Ciclo de vida
  // ------------------------------------------------------------------

  function alCambiarVisibilidad() {
    if (!vivo) return;
    if (document.visibilityState === "hidden") detenerStream();
    else if (!stream && !congelado) iniciarStream();
  }

  function cerrar() {
    if (!vivo) return;
    vivo = false;
    cancelAnimationFrame(raf);
    detenerStream();
    document.removeEventListener("visibilitychange", alCambiarVisibilidad);
  }

  $("lente-volver").addEventListener("click", () => {
    if ($("lente-volver").disabled) return;
    cerrar();
    alSalir();
  });
  $("lente-girar").addEventListener("click", () => {
    frontal = !frontal;
    niveles = null;
    iniciarStream();
  });
  $("lente-obturador").addEventListener("click", sacarFoto);

  // ---- filtros y sticker ----
  function marcarFiltro() {
    for (const b of contenedor.querySelectorAll("[data-filtro]")) b.classList.toggle("activo", b.dataset.filtro === filtro);
  }
  for (const b of contenedor.querySelectorAll("[data-filtro]")) {
    b.addEventListener("click", () => {
      filtro = b.dataset.filtro;
      niveles = null;
      try {
        localStorage.setItem(CLAVE_FILTRO, filtro);
      } catch (e) {
        /* nada */
      }
      Sonido.sonar("tocar");
      marcarFiltro();
    });
  }
  marcarFiltro();

  // ---- stickers: un catalogo (los dos personajes, sus caras y poses, y
  // algunos extras), varios a la vez; se mueven con un dedo, se agrandan
  // con dos (o la ruedita) y se borran con la x del elegido ----
  const capa = $("capa-stickers");
  const bandeja = $("bandeja-stickers");

  function ubicar(p) {
    p.el.style.left = `${p.x * 100}%`;
    p.el.style.top = `${p.y * 100}%`;
    p.el.style.height = `${p.s * 100}%`;
    p.el.style.width = `${p.s * 75}%`; // el visor es 4:3: cada sticker es cuadrado
  }

  function elegir(p) {
    elegido = p;
    for (const q of puestos) q.el.classList.toggle("elegido", q === p);
  }

  function quitar(p) {
    const i = puestos.indexOf(p);
    if (i >= 0) puestos.splice(i, 1);
    p.el.remove();
    if (elegido === p) elegir(puestos[puestos.length - 1] || null);
    Sonido.sonar("tocar");
  }

  function poner(def) {
    if (puestos.length >= MAX_STICKERS) quitar(puestos[0]);
    const el = document.createElement("div");
    el.className = "visor-sticker";
    el.dataset.sticker = def.id;
    el.innerHTML = `${def.html}<button class="sticker-quitar" aria-label="Remove sticker"><i class="glifo g-cerrar"></i></button>`;
    const n = puestos.length;
    const p = {
      def,
      el,
      x: Math.min(0.85, 0.5 + ((n % 3) - 1) * 0.18),
      y: 0.56,
      s: def.grupo === "extras" ? 0.24 : 0.62,
      imgs: def.capas.map((src) => {
        const i = new Image();
        i.src = src;
        return i;
      }),
    };
    capa.appendChild(el);
    puestos.push(p);
    ubicar(p);
    elegir(p);
    movible(p);
    el.querySelector(".sticker-quitar").addEventListener("pointerdown", (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      quitar(p);
    });
  }

  function movible(p) {
    const dedos = new Map();
    let inicio = null;
    const visorEl = $("visor");
    const el = p.el;
    el.addEventListener("pointerdown", (ev) => {
      el.setPointerCapture(ev.pointerId);
      dedos.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      inicio = { x: p.x, y: p.y, s: p.s, dedos: new Map(dedos) };
      elegir(p);
      capa.appendChild(el); // el que se toca queda arriba
      ev.preventDefault();
    });
    el.addEventListener("pointermove", (ev) => {
      if (!dedos.has(ev.pointerId) || !inicio) return;
      dedos.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      const r = visorEl.getBoundingClientRect();
      const ps = [...dedos.values()];
      const ps0 = [...inicio.dedos.values()];
      if (ps.length >= 2 && ps0.length >= 2) {
        const d = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
        const d0 = Math.hypot(ps0[0].x - ps0[1].x, ps0[0].y - ps0[1].y) || 1;
        p.s = Math.min(1.2, Math.max(0.16, inicio.s * (d / d0)));
      } else if (ps.length === 1 && ps0.length >= 1) {
        p.x = Math.min(1, Math.max(0, inicio.x + (ps[0].x - ps0[0].x) / r.width));
        p.y = Math.min(1.1, Math.max(0, inicio.y + (ps[0].y - ps0[0].y) / r.height));
      }
      ubicar(p);
    });
    const soltar = (ev) => {
      dedos.delete(ev.pointerId);
      inicio = { x: p.x, y: p.y, s: p.s, dedos: new Map(dedos) };
    };
    el.addEventListener("pointerup", soltar);
    el.addEventListener("pointercancel", soltar);
    el.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      p.s = Math.min(1.2, Math.max(0.16, p.s * (ev.deltaY < 0 ? 1.08 : 0.93)));
      ubicar(p);
    }, { passive: false });
  }

  function pintarBandeja() {
    if (!bandeja) return;
    for (const b of bandeja.querySelectorAll("[data-grupo]")) b.classList.toggle("activo", b.dataset.grupo === grupoAbierto);
    const conPoses = catalogo.some((c) => c.grupo === grupoAbierto && c.pose);
    bandeja.querySelector(".bandeja-poses").classList.toggle("oculto", !conPoses);
    for (const b of bandeja.querySelectorAll("[data-pose]")) b.classList.toggle("activo", b.dataset.pose === poseAbierta);
    const lista = catalogo.filter((c) => c.grupo === grupoAbierto && (!conPoses || !c.pose || c.pose === poseAbierta));
    const grilla = $("bandeja-grilla");
    grilla.innerHTML = lista.map((c) => `<button class="item-sticker" data-id="${escaparHtml(c.id)}" aria-label="${escaparHtml(c.nombre || c.id)}">${c.html}</button>`).join("");
    for (const b of grilla.querySelectorAll("[data-id]")) {
      b.addEventListener("click", () => {
        const def = catalogo.find((c) => c.id === b.dataset.id);
        if (!def) return;
        poner(def);
        Sonido.sonar("tocar");
        bandeja.classList.add("oculto");
        $("lente-sticker").classList.remove("activo");
      });
    }
  }

  if (bandeja) {
    $("lente-sticker").addEventListener("click", () => {
      const abrir = bandeja.classList.contains("oculto");
      bandeja.classList.toggle("oculto", !abrir);
      $("lente-sticker").classList.toggle("activo", abrir);
      if (abrir) pintarBandeja();
      Sonido.sonar("tocar");
    });
    $("bandeja-cerrar").addEventListener("click", () => {
      bandeja.classList.add("oculto");
      $("lente-sticker").classList.remove("activo");
    });
    for (const b of bandeja.querySelectorAll("[data-grupo]")) {
      b.addEventListener("click", () => {
        grupoAbierto = b.dataset.grupo;
        pintarBandeja();
      });
    }
    for (const b of bandeja.querySelectorAll("[data-pose]")) {
      b.addEventListener("click", () => {
        poseAbierta = b.dataset.pose;
        pintarBandeja();
      });
    }
  }
  if (!esPedido) {
    $("revelado-otra").addEventListener("click", () => {
      $("lente-revelado").classList.add("oculto");
      congelado = false;
      // si la foto vino de la app de camara (sin video en vivo), se vuelve a ofrecer
      if (!stream) iniciarStream();
    });
    $("revelado-guardar").addEventListener("click", guardarRevelado);
  }
  document.addEventListener("visibilitychange", alCambiarVisibilidad);

  vctx.fillStyle = "#181618";
  vctx.fillRect(0, 0, ANCHO_FOTO, ALTO_FOTO);
  iniciarStream();
  raf = requestAnimationFrame(cuadro);

  return { cerrar };
}
