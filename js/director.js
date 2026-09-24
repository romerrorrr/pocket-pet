/**
 * director.js
 * ============
 * El panel secreto de rom. Se abre con 5 toques rapidos sobre el reloj
 * de la pantalla principal + el PIN de config.js. Desde aca:
 *   - armar / desarmar el final
 *   - probar el GPS ahi donde esta parado (¿cuenta como "en el lago"?)
 *   - ensayar todo (no guarda nada)
 *   - que Baozi pida la foto ya / arrancar la secuencia ya (emergencia)
 *   - la lista de chequeos del dia D
 *
 * Todo en ingles como el resto de la interfaz, pero sin nada "tierno":
 * si ella lo llegara a ver, parece una pantalla de configuracion.
 */

import * as Grabacion from "./grabacion.js";
import { guardarVideoEnGaleria } from "./galeria.js";
import * as Final from "./final.js";

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

/** Teclado de PIN. alOk() si acierta, alSalir() si vuelve. */
export function renderPin(contenedor, { alOk, alSalir }) {
  let pin = "";
  contenedor.innerHTML = `
    <div class="pantalla-pin">
      <div class="encabezado-vista">
        <button class="boton-volver" id="pin-volver" aria-label="Back"><i class="glifo g-atras"></i></button>
        <div class="titulo-vista">Settings</div>
      </div>
      <div class="pin-puntos" id="pin-puntos">····</div>
      <div class="pin-teclado">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "borrar"].map((k) => (k === "" ? `<span></span>` : k === "borrar" ? `<button class="tecla-pin" data-k="borrar" aria-label="Delete"><i class="glifo g-atras"></i></button>` : `<button class="tecla-pin" data-k="${k}">${k}</button>`)).join("")}
      </div>
    </div>`;
  const puntos = contenedor.querySelector("#pin-puntos");
  const pintar = () => (puntos.textContent = "●".repeat(pin.length) + "·".repeat(Math.max(0, 4 - pin.length)));
  contenedor.querySelector("#pin-volver").addEventListener("click", alSalir);
  for (const b of contenedor.querySelectorAll(".tecla-pin")) {
    b.addEventListener("click", () => {
      const k = b.dataset.k;
      if (k === "borrar") pin = pin.slice(0, -1);
      else if (pin.length < 8) pin += k;
      pintar();
      if (pin.length >= 4 && Final.pinCorrecto(pin)) {
        alOk();
      } else if (pin.length >= 8) {
        puntos.classList.add("error");
        setTimeout(() => {
          pin = "";
          puntos.classList.remove("error");
          pintar();
        }, 500);
      }
    });
  }
}

/**
 * acciones = { pedirYa, probarGPS, ensayar, empezarYa, cerrar, sonidoHabilitado }
 */
export async function renderDirector(contenedor, acciones) {
  const fase = Final.fase();
  const puedeArmar = fase === "dormido";
  const puedeDesarmar = fase === "armado" || fase === "pedido";
  const antes = fase === "dormido" || fase === "armado" || fase === "pedido";
  contenedor.innerHTML = `
    <div class="pantalla-director">
      <div class="encabezado-vista">
        <button class="boton-volver" id="dir-cerrar" aria-label="Back"><i class="glifo g-atras"></i></button>
        <div class="titulo-vista">Director</div>
      </div>
      <div class="director-cuerpo">
        <div class="director-col">
          <div class="director-estado fase-${fase}">${esc(Final.descripcionFase())}</div>
          <div class="director-botones">
            ${puedeArmar ? `<button class="boton" id="dir-armar">Arm it</button>` : ""}
            ${puedeDesarmar ? `<button class="boton boton-fantasma" id="dir-desarmar">Disarm</button>` : ""}
            <button class="boton boton-fantasma" id="dir-gps"><i class="glifo g-pin"></i> Test location here</button>
            <div class="director-gps" id="dir-gps-resultado"></div>
            <button class="boton boton-fantasma" id="dir-permisos"><i class="glifo g-camara"></i> Allow camera + mic</button>
            <button class="boton boton-fantasma" id="dir-probar-video">Test video (5 s)</button>
            <div class="director-gps" id="dir-video-resultado"></div>
            <button class="boton boton-fantasma" id="dir-ensayo">Rehearse everything</button>
            ${antes ? `<button class="boton boton-fantasma" id="dir-pedir">Ask for the photo now</button>` : ""}
            ${antes ? `<button class="boton boton-fantasma" id="dir-ya">Start the sequence now</button>` : ""}
            <button class="boton boton-peligro" id="dir-reset">Reset the ending</button>
          </div>
        </div>
        <div class="director-col">
          <div class="director-sub">Day-of checklist</div>
          <ul class="director-chequeos" id="dir-chequeos"><li>Checking…</li></ul>
        </div>
      </div>
    </div>`;
  const $ = (id) => contenedor.querySelector(`#${id}`);
  $("dir-cerrar").addEventListener("click", acciones.cerrar);
  const armar = $("dir-armar");
  if (armar) armar.addEventListener("click", () => { Final.armar(); renderDirector(contenedor, acciones); });
  const desarmar = $("dir-desarmar");
  if (desarmar) desarmar.addEventListener("click", () => { Final.desarmar(); renderDirector(contenedor, acciones); });
  $("dir-gps").addEventListener("click", () => acciones.probarGPS($("dir-gps-resultado")));
  $("dir-ensayo").addEventListener("click", acciones.ensayar);
  // v21: permisos para el video del final (se vuelven a revisar antes de la secuencia)
  $("dir-permisos").addEventListener("click", async () => {
    const b = $("dir-permisos");
    b.disabled = true;
    const r = await Grabacion.pedirPermisos();
    b.textContent = `Camera: ${r.camara ? "OK" : "NO"} · Mic: ${r.microfono ? "OK" : "NO"}`;
    b.disabled = false;
    pintarChequeos();
  });
  // v21.1: una prueba de 5 s para escuchar si el video trae sonido
  $("dir-probar-video").addEventListener("click", async () => {
    const b = $("dir-probar-video");
    const res = $("dir-video-resultado");
    b.disabled = true;
    const r = await Grabacion.pedirPermisos({ dejarMicAbierto: true });
    const ok = await Grabacion.empezar({ ensayo: true });
    if (!ok) {
      res.textContent = "Couldn't record here.";
      b.disabled = false;
      return;
    }
    let n = 5;
    b.textContent = `Recording… ${n}`;
    const tic = setInterval(() => {
      n -= 1;
      if (n > 0) b.textContent = `Recording… ${n}`;
    }, 1000);
    setTimeout(async () => {
      clearInterval(tic);
      await Grabacion.detener();
      const v = await Grabacion.ultimoVideo({ ensayo: true });
      b.textContent = "Test video (5 s)";
      b.disabled = false;
      if (!v) {
        res.textContent = "Nothing was recorded.";
        return;
      }
      res.innerHTML = `${v.conAudio && r.microfono ? "With sound: OK" : "NO SOUND — the mic is not allowed"} · <button class="boton chico boton-galeria" type="button" id="dir-guardar-prueba">Save to Photos</button>`;
      $("dir-guardar-prueba").addEventListener("click", () => guardarVideoEnGaleria(v.blob, "prueba-video"));
      pintarChequeos();
    }, 5000);
  });

  // Los botones que no tienen vuelta atras piden un segundo toque.
  const conConfirmacion = (boton, texto, fn) => {
    if (!boton) return;
    let seguro = false;
    boton.addEventListener("click", () => {
      if (!seguro) {
        seguro = true;
        boton.textContent = texto;
        return;
      }
      fn();
    });
  };
  conConfirmacion($("dir-pedir"), "Tap again: Baozi asks now", acciones.pedirYa);
  conConfirmacion($("dir-ya"), "Tap again to start it", acciones.empezarYa);
  conConfirmacion($("dir-reset"), "Tap again to reset", () => {
    Final.reiniciarTodo();
    renderDirector(contenedor, acciones);
  });

  async function pintarChequeos() {
    const lista = await Final.chequeos({ sonidoHabilitado: acciones.sonidoHabilitado() });
    const ul = $("dir-chequeos");
    if (!ul) return;
    ul.innerHTML = lista
      .map(([ok, texto]) => `<li class="${ok ? "ok" : "ojo"}"><i class="glifo ${ok ? "g-check" : "g-exclama"}"></i><span>${esc(texto)}</span></li>`)
      .join("");
  }
  await pintarChequeos();
}
