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
  ANCHO_FOTO, ALTO_FOTO, recorte43, medirNiveles, tramar, fotoTramada,
  guardarFoto, abrirCaptura, cargarImagen,
} from "./camara.js";
import { claveDelDia } from "./diario.js";
import * as Sonido from "./sonido.js";
import { vibrar } from "./actuadores.js";

const MS_ENTRE_CUADROS = 45; // ~22 fps: de sobra para pixel art, y cuida la bateria
const MS_REVELADO_PEDIDO = 1900;

// v19: filtros. "pixel" es el de siempre (Game Boy Camera, tramado en la
// paleta del juego, 176x132). Los otros son fotos lisas de 704x528.
export const FILTROS = [
  { id: "pixel", nombre: "PIXEL" },
  { id: "bn", nombre: "B&W" },
  { id: "sepia", nombre: "SEPIA" },
  { id: "vintage", nombre: "VINTAGE" },
  { id: "color", nombre: "COLOR" },
];
const CLAVE_FILTRO = "baozi_filtro";
const VIVO_LISO = [352, 264];
const FOTO_LISA = [704, 528];

function leerFiltro() {
  try {
    const f = localStorage.getItem(CLAVE_FILTRO);
    return FILTROS.some((x) => x.id === f) ? f : "pixel";
  } catch (e) {
    return "pixel";
  }
}

/** Aplica un filtro liso a un ImageData (en el lugar). */
function filtrar(datos, filtro) {
  if (filtro === "color") return datos;
  const { width: w, height: h, data: d } = datos;
  const cx = w / 2;
  const cy = h / 2;
  const rmax = Math.hypot(cx, cy);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    let r = d[i];
    let g = d[i + 1];
    let b = d[i + 2];
    if (filtro === "bn") {
      let y = 0.3 * r + 0.59 * g + 0.11 * b;
      y = (y - 128) * 1.12 + 128;
      r = g = b = y;
    } else if (filtro === "sepia") {
      const nr = 0.393 * r + 0.769 * g + 0.189 * b;
      const ng = 0.349 * r + 0.686 * g + 0.168 * b;
      const nb = 0.272 * r + 0.534 * g + 0.131 * b;
      r = nr * 0.95 + 8;
      g = ng * 0.93 + 6;
      b = nb * 0.9;
    } else if (filtro === "vintage") {
      const y = 0.3 * r + 0.59 * g + 0.11 * b;
      r = (r * 0.78 + y * 0.22) * 0.86 + 34;
      g = (g * 0.78 + y * 0.22) * 0.82 + 26;
      b = (b * 0.78 + y * 0.22) * 0.72 + 22;
      const x = p % w;
      const yy = (p / w) | 0;
      const v = 1 - 0.42 * Math.pow(Math.hypot(x - cx, yy - cy) / rmax, 2.2);
      r *= v;
      g *= v;
      b *= v;
    }
    d[i] = r < 0 ? 0 : r > 255 ? 255 : r;
    d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
    d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
  }
  return datos;
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
  const sticker = { on: false, x: 0.76, y: 0.6, s: 0.62 };
  // las capas del personaje para pegar en la foto, precargadas
  const imgsSticker = (opts.stickerCapas || []).map((src) => {
    const i = new Image();
    i.src = src;
    return i;
  });

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
            : `<div class="visor-sticker oculto" id="visor-sticker">${opts.stickerHtml || ""}</div>
               <div class="visor-filtros" id="visor-filtros">
                 ${FILTROS.map((f) => `<button class="chip-filtro" data-filtro="${f.id}">${f.nombre}</button>`).join("")}
               </div>`
        }
      </div>
      <div class="lente-lateral">
        <button class="boton-icono" id="lente-volver" aria-label="Back"><i class="glifo g-atras"></i></button>
        ${esPedido ? "" : `<button class="boton-icono boton-sticker" id="lente-sticker" aria-label="Add ${escaparHtml(Personaje.nombre())} to the photo">${opts.stickerMini || ""}</button>`}
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
    if (filtro !== "pixel") {
      // liso: se dibuja mas grande y se filtra
      const [lw, lh] = VIVO_LISO;
      if (lienzo.width !== lw) {
        lienzo.width = lw;
        lienzo.height = lh;
      }
      vctx.save();
      if (frontal) {
        vctx.translate(lw, 0);
        vctx.scale(-1, 1);
      }
      vctx.drawImage(video, r.sx, r.sy, r.sw, r.sh, 0, 0, lw, lh);
      vctx.restore();
      if (filtro !== "color") vctx.putImageData(filtrar(vctx.getImageData(0, 0, lw, lh), filtro), 0, 0);
      return;
    }
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
    tramar(datos, niveles);
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
    rl.classList.toggle("lisa", filtro !== "pixel");
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

  /** La foto final: el visor (pixel) o un cuadro grande del video (liso), con el sticker encima. */
  function fotoFinal() {
    const copia = document.createElement("canvas");
    if (filtro === "pixel") {
      copia.width = ANCHO_FOTO;
      copia.height = ALTO_FOTO;
      copia.getContext("2d").drawImage(lienzo, 0, 0);
    } else {
      const [fw, fh] = FOTO_LISA;
      copia.width = fw;
      copia.height = fh;
      const c = copia.getContext("2d", { willReadFrequently: true });
      const r = recorte43(video.videoWidth, video.videoHeight);
      c.save();
      if (frontal) {
        c.translate(fw, 0);
        c.scale(-1, 1);
      }
      c.imageSmoothingQuality = "high";
      c.drawImage(video, r.sx, r.sy, r.sw, r.sh, 0, 0, fw, fh);
      c.restore();
      if (filtro !== "color") c.putImageData(filtrar(c.getImageData(0, 0, fw, fh), filtro), 0, 0);
    }
    pegarSticker(copia);
    return copia;
  }

  function pegarSticker(canvasFoto) {
    if (!sticker.on || !imgsSticker.length) return;
    const imgs = imgsSticker;
    if (!imgs.every((i) => i.complete && i.naturalWidth)) return;
    const c = canvasFoto.getContext("2d");
    const lado = sticker.s * canvasFoto.height;
    const x = sticker.x * canvasFoto.width - lado / 2;
    const y = sticker.y * canvasFoto.height - lado / 2;
    c.save();
    c.imageSmoothingEnabled = !opts.stickerPixel;
    for (const i of imgs) c.drawImage(i, x, y, lado, lado);
    c.restore();
  }

  function sacarFoto() {
    if (congelado || !video.videoWidth) return;
    Sonido.sonar("obturador");
    vibrar(25);
    destellar();
    const copia = fotoFinal();
    setTimeout(() => {
      if (vivo) mostrarRevelado(copia);
    }, 160);
  }

  async function guardarRevelado() {
    if (guardando) return;
    guardando = true;
    const rl = $("revelado-lienzo");
    // las lisas van en jpeg (pesan 10 veces menos); las pixel, png
    const dataUrl = filtro === "pixel" ? rl.toDataURL("image/png") : rl.toDataURL("image/jpeg", 0.86);
    let foto = { dataUrl, dia: claveDelDia(), lugar, tipo: tipoFoto, filtro };
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
      let lista;
      if (filtro === "pixel") {
        lista = fotoTramada(img, img.naturalWidth, img.naturalHeight);
      } else {
        const [fw, fh] = FOTO_LISA;
        lista = document.createElement("canvas");
        lista.width = fw;
        lista.height = fh;
        const c = lista.getContext("2d", { willReadFrequently: true });
        const r = recorte43(img.naturalWidth, img.naturalHeight);
        c.drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, fw, fh);
        if (filtro !== "color") c.putImageData(filtrar(c.getImageData(0, 0, fw, fh), filtro), 0, 0);
      }
      pegarSticker(lista);
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
    lienzo.classList.toggle("lisa", filtro !== "pixel");
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

  const stickerEl = $("visor-sticker");
  function ubicarSticker() {
    if (!stickerEl) return;
    stickerEl.style.left = `${sticker.x * 100}%`;
    stickerEl.style.top = `${sticker.y * 100}%`;
    stickerEl.style.height = `${sticker.s * 100}%`;
    stickerEl.style.width = `${sticker.s * 75}%`; // el visor es 4:3: el sticker queda cuadrado
  }
  if (stickerEl) {
    ubicarSticker();
    $("lente-sticker").addEventListener("click", () => {
      sticker.on = !sticker.on;
      stickerEl.classList.toggle("oculto", !sticker.on);
      $("lente-sticker").classList.toggle("activo", sticker.on);
      Sonido.sonar("tocar");
    });
    // arrastrar con un dedo, agrandar/achicar con dos (o con la ruedita)
    const dedos = new Map();
    let inicio = null;
    const visorEl = $("visor");
    stickerEl.addEventListener("pointerdown", (ev) => {
      stickerEl.setPointerCapture(ev.pointerId);
      dedos.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      inicio = { ...sticker, dedos: new Map(dedos) };
      ev.preventDefault();
    });
    stickerEl.addEventListener("pointermove", (ev) => {
      if (!dedos.has(ev.pointerId) || !inicio) return;
      dedos.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      const r = visorEl.getBoundingClientRect();
      const ps = [...dedos.values()];
      const ps0 = [...inicio.dedos.values()];
      if (ps.length >= 2 && ps0.length >= 2) {
        const d = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
        const d0 = Math.hypot(ps0[0].x - ps0[1].x, ps0[0].y - ps0[1].y) || 1;
        sticker.s = Math.min(1.2, Math.max(0.2, inicio.s * (d / d0)));
      } else if (ps.length === 1 && ps0.length >= 1) {
        sticker.x = Math.min(1, Math.max(0, inicio.x + (ps[0].x - ps0[0].x) / r.width));
        sticker.y = Math.min(1.1, Math.max(0, inicio.y + (ps[0].y - ps0[0].y) / r.height));
      }
      ubicarSticker();
    });
    const soltar = (ev) => {
      dedos.delete(ev.pointerId);
      inicio = { ...sticker, dedos: new Map(dedos) };
    };
    stickerEl.addEventListener("pointerup", soltar);
    stickerEl.addEventListener("pointercancel", soltar);
    stickerEl.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      sticker.s = Math.min(1.2, Math.max(0.2, sticker.s * (ev.deltaY < 0 ? 1.08 : 0.93)));
      ubicarSticker();
    }, { passive: false });
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
