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

import {
  ANCHO_FOTO, ALTO_FOTO, recorte43, medirNiveles, tramar, fotoTramada,
  guardarFoto, abrirCaptura, cargarImagen,
} from "./camara.js";
import { claveDelDia } from "./diario.js";
import * as Sonido from "./sonido.js";
import { vibrar } from "./actuadores.js";

const MS_ENTRE_CUADROS = 45; // ~22 fps: de sobra para pixel art, y cuida la bateria
const MS_REVELADO_PEDIDO = 1900;

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
    titulo = "BAOZI LENS",
    alGuardar = () => {},
    alSalir = () => {},
  } = opts;
  let frontal = !!opts.frontal;
  const esPedido = modo === "pedido";

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
      </div>
      <div class="lente-lateral">
        <button class="boton-icono" id="lente-volver" aria-label="Back"><i class="glifo g-atras"></i></button>
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
    $("revelado-lienzo").getContext("2d").drawImage(fuenteLienzo, 0, 0);
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

  function sacarFoto() {
    if (congelado || !video.videoWidth) return;
    Sonido.sonar("obturador");
    vibrar(25);
    destellar();
    const copia = document.createElement("canvas");
    copia.width = ANCHO_FOTO;
    copia.height = ALTO_FOTO;
    copia.getContext("2d").drawImage(lienzo, 0, 0);
    setTimeout(() => {
      if (vivo) mostrarRevelado(copia);
    }, 160);
  }

  async function guardarRevelado() {
    if (guardando) return;
    guardando = true;
    const dataUrl = $("revelado-lienzo").toDataURL("image/png");
    let foto = { dataUrl, dia: claveDelDia(), lugar, tipo: tipoFoto };
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
      const tramada = fotoTramada(img, img.naturalWidth, img.naturalHeight);
      vctx.drawImage(tramada, 0, 0);
      ocultarAviso();
      mostrarRevelado(tramada);
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
