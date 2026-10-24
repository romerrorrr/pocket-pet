/**
 * ritmo.js
 * =========
 * v29: RADIO BEATS, minijuego de la tele. Suena una de las estaciones de
 * la radio del cuarto y caen comiditas (dumpling, bao, onigiri) en tres
 * carriles, una por cada nota de la melodia: las graves a la izquierda,
 * las agudas a la derecha. Hay que tocar el carril cuando la comida llega
 * a su circulo.
 *
 *   PERFECT +3 · GOOD +1 (por el combo: x2 a las 10 seguidas, x3 a las 20, x4 a las 30)
 *
 * EASY / NORMAL / HARD cambian cuantas notas se juegan (las muy seguidas
 * se saltean; en EASY solo las que caen en el pulso), lo rapido que caen y cuanto perdona el tiempo. Hay un
 * record por cancion y dificultad. Las notas usan el reloj del audio, asi
 * no se desfasan.
 *
 * v33, SYNC: con auriculares bluetooth el sonido llega tarde (200-300 ms)
 * y el iPhone no lo avisa. Un metronomo, ella toca con cada click, y la
 * diferencia (la mediana, sin los toques sueltos) queda como el ajuste
 * del juego. Es de este telefono: no viaja en el backup.
 */
import { sonidoHabilitado } from "./sonido.js";
import { leerRecordDe, guardarRecordDe, leerDificultadDe, guardarDificultadDe, NOMBRES_DIFICULTAD, lienzoPixel, imagen, lista, flotante, multiplicador, HTML_VOLVER, cablearVolver } from "./juegoComun.js";

const CLAVE = "baozi_record_ritmo"; // + "_<cancion>" (+ "_<dif>")
const CLAVE_CANCION = "baozi_ritmo_cancion";
const ALTO = 195;
const Y_TOQUE = 160;
const ANCHO_CARRIL = 38;
const SEPARACION = 41;
const ADELANTO = 2.2; // segundos hasta la primera nota de la cancion

export const DIFICULTADES_RITMO = {
  easy: { separacion: 0.55, caida: 2.2, perfecto: 0.09, bien: 0.17, enTiempo: true },
  normal: { separacion: 0.27, caida: 1.7, perfecto: 0.07, bien: 0.14 },
  hard: { separacion: 0.18, caida: 1.25, perfecto: 0.055, bien: 0.11 },
};

const COMIDAS = ["comida/comida_dumpling.png", "comida/comida_bao.png", "comida/comida_onigiri.png"];
const COLORES = ["rgb(232,142,160)", "rgb(244,238,226)", "rgb(246,200,92)"];

// el ajuste (s): lo que tarda en llegar el sonido + lo que tarda el dedo
const CLAVE_AJUSTE = "baozi_ritmo_ajuste";
export const AJUSTE_MIN = -0.1;
export const AJUSTE_MAX = 0.45;
const BPM_AJUSTE = 80;
const GOLPES_AJUSTE = 20;
const CALENTAMIENTO = 4; // los primeros clicks son para escuchar

export function leerAjusteRitmo() {
  try {
    const v = localStorage.getItem(CLAVE_AJUSTE);
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(AJUSTE_MAX, Math.max(AJUSTE_MIN, n)) : null;
  } catch (e) {
    return null;
  }
}

function guardarAjusteRitmo(v) {
  try {
    if (v == null) localStorage.removeItem(CLAVE_AJUSTE);
    else localStorage.setItem(CLAVE_AJUSTE, v.toFixed(3));
  } catch (e) {
    /* nada */
  }
}

/**
 * Los toques (reloj del audio) contra los clicks -> { ajuste, usados } o
 * null si no alcanzan o salieron muy desparejos. Cada toque va con el
 * ultimo click que sono (hasta 150 ms antes de tocar: el que se adelanta).
 */
export function calcularAjuste(toques, tiempos, { calentamiento = CALENTAMIENTO } = {}) {
  const intervalo = tiempos.length > 1 ? tiempos[1] - tiempos[0] : 60 / BPM_AJUSTE;
  const desfases = [];
  for (const t of toques) {
    let k = -1;
    for (let i = 0; i < tiempos.length; i++) if (tiempos[i] <= t + 0.15) k = i;
    if (k < calentamiento) continue;
    const d = t - tiempos[k];
    if (d >= -0.15 && d < intervalo - 0.15) desfases.push(d);
  }
  if (desfases.length < 6) return null;
  const orden = [...desfases].sort((a, b) => a - b);
  const mediana = orden[Math.floor(orden.length / 2)];
  const cerca = desfases.filter((d) => Math.abs(d - mediana) <= 0.08);
  if (cerca.length < 5) return null;
  const media = cerca.reduce((a, b) => a + b, 0) / cerca.length;
  return { ajuste: Math.min(AJUSTE_MAX, Math.max(AJUSTE_MIN, media)), usados: cerca.length };
}

export const claveRecordRitmo = (cancion) => `${CLAVE}_${cancion}`;
export const leerRecordRitmo = (cancion = null, dif = null) => {
  if (cancion) return leerRecordDe(claveRecordRitmo(cancion), dif);
  return 0;
};

/**
 * Las notas que se juegan: una por nota de la melodia, salteando las que
 * quedan mas cerca que `separacion` de la anterior. Carril por altura.
 */
export function notasDelJuego(melodia, paso, separacion, enTiempo = false) {
  const frecs = [...new Set(melodia.map((n) => n.frec))].sort((a, b) => a - b);
  const carril = (f) => Math.min(2, Math.floor((frecs.indexOf(f) / Math.max(1, frecs.length)) * 3));
  const notas = [];
  let ultima = -Infinity;
  let ultimoCarril = -1;
  let repetidas = 0;
  for (const n of melodia) {
    const t = n.inicio * paso;
    if (t - ultima < separacion - 1e-6) continue;
    if (enTiempo && n.inicio % 2 !== 0) continue; // EASY: solo las que caen en el pulso
    let c = carril(n.frec);
    // no mas de 4 seguidas en el mismo carril (se aburre el dedo)
    repetidas = c === ultimoCarril ? repetidas + 1 : 0;
    if (repetidas >= 4) {
      c = (c + 1) % 3;
      repetidas = 0;
    }
    notas.push({ t, carril: c });
    ultima = t;
    ultimoCarril = c;
  }
  return notas;
}

/**
 * opts: arte, sprite, cambiarCara, sonar, vibrar,
 *       musica: { estacionesParaJugar(), tocarParaJuego(escena, {adelanto}), estacionActual() },
 *       alTerminar({ puntos, perfectos, buenos, fallados, total, record, nuevoRecord, dificultad, cancion, nombreCancion }),
 *       alSalir() (volvio sin jugar)
 */
export function iniciarRitmo(contenedor, opts) {
  const { arte, sprite, cambiarCara, musica, sonar = () => {}, vibrar = () => {}, alTerminar = () => {}, alSalir = () => {} } = opts;
  const canciones = musica.estacionesParaJugar();
  let cancion = (() => {
    try {
      const c = localStorage.getItem(CLAVE_CANCION);
      if (canciones.some((x) => x.id === c)) return c;
    } catch (e) {
      /* nada */
    }
    const radio = musica.estacionActual && musica.estacionActual();
    return radio && canciones.some((x) => x.id === radio.id) ? radio.id : canciones[0].id;
  })();
  let dif = leerDificultadDe(CLAVE);
  let D = DIFICULTADES_RITMO[dif];
  const nombreDe = (id) => (canciones.find((c) => c.id === id) || {}).nombre || "";

  contenedor.innerHTML = `
    <div class="pantalla-juego pantalla-ritmo con-cuarto" id="area-ritmo">
      ${HTML_VOLVER}
      <div class="juego-hud">
        <span class="juego-chip" id="ritmo-puntos">0</span>
        <span class="juego-chip juego-combo oculto" id="ritmo-combo">x2</span>
      </div>
      <div class="juego-record" id="ritmo-record">RADIO BEATS</div>
      <div class="juego-personaje ritmo-personaje" id="ritmo-personaje">${sprite("ojo_base_energia_alta.png", "boca_base_feliz.png")}</div>
      <div class="juego-cielo" id="ritmo-capa"></div>
      <div class="pista-minijuego" id="ritmo-pista">Tap the lane when the snack reaches its circle</div>
      <div class="juego-dificultad" id="ritmo-cartel">
        <div class="juego-dificultad-titulo">RADIO BEATS</div>
        <div class="ritmo-canciones">
          ${canciones.map((c) => `<button class="boton chico ${c.id === cancion ? "" : "boton-fantasma"}" data-cancion="${c.id}">♪ ${c.nombre}</button>`).join("")}
        </div>
        <div class="juego-dificultad-botones" id="ritmo-dificultades"></div>
        <div class="ritmo-sync" id="ritmo-sync"></div>
      </div>
    </div>`;
  const $ = (id) => contenedor.querySelector(`#${id}`);
  const area = $("area-ritmo");
  const L = lienzoPixel(area, ALTO, "juego-lienzo ritmo-lienzo");
  const ctx = L.ctx;
  const comidas = COMIDAS.map((c) => imagen(arte(c)));

  function pintarDificultades() {
    $("ritmo-dificultades").innerHTML = Object.entries(NOMBRES_DIFICULTAD)
      .map(([id, n]) => `<button class="boton ${id === dif ? "" : "boton-fantasma"}" data-elegir-dificultad="${id}">${n}<small>best ${leerRecordRitmo(cancion, id)}</small></button>`)
      .join("");
    for (const b of contenedor.querySelectorAll("[data-elegir-dificultad]")) {
      b.addEventListener("pointerdown", (e) => e.stopPropagation());
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        dif = b.dataset.elegirDificultad;
        guardarDificultadDe(CLAVE, dif);
        empezar();
      });
    }
  }
  pintarDificultades();

  // v33: el ajuste de sincronia (sin sonido no hay nada que ajustar)
  let ajuste = leerAjusteRitmo();
  function pintarSync() {
    const caja = $("ritmo-sync");
    if (!caja) return;
    if (!sonidoHabilitado() || !musica.metronomo) {
      caja.innerHTML = "";
      return;
    }
    caja.innerHTML =
      ajuste == null
        ? `<button class="boton chico boton-fantasma" type="button" id="btn-ritmo-sync">♪ Sync</button><span>Bluetooth headphones? Sync once.</span>`
        : `<button class="boton chico boton-fantasma" type="button" id="btn-ritmo-sync">♪ Sync again</button><span>Synced (${Math.round(ajuste * 1000)} ms)</span><button class="ritmo-sync-quitar" type="button" id="btn-ritmo-sync-quitar">reset</button>`;
    for (const b of caja.querySelectorAll("button")) b.addEventListener("pointerdown", (e) => e.stopPropagation());
    $("btn-ritmo-sync").addEventListener("click", (e) => {
      e.stopPropagation();
      abrirAjuste();
    });
    const quitar = $("btn-ritmo-sync-quitar");
    if (quitar) {
      quitar.addEventListener("click", (e) => {
        e.stopPropagation();
        ajuste = null;
        guardarAjusteRitmo(null);
        sonar("tocar");
        pintarSync();
      });
    }
  }
  pintarSync();

  function abrirAjuste() {
    const cartel = $("ritmo-cartel");
    if (cartel) cartel.classList.add("oculto");
    const panel = document.createElement("div");
    panel.className = "juego-dificultad ritmo-ajuste";
    panel.id = "ritmo-ajuste";
    area.appendChild(panel);
    const puntos = GOLPES_AJUSTE - CALENTAMIENTO;
    const cerrar = () => {
      soltarAjuste();
      panel.remove();
      if (cartel) cartel.classList.remove("oculto");
      pintarSync();
    };
    const empezarAjuste = () => {
      const toques = [];
      panel.innerHTML = `
        <div class="juego-dificultad-titulo">SYNC</div>
        <div class="ritmo-ajuste-texto" id="ritmo-ajuste-texto">Listen to the clicks…</div>
        <div class="ritmo-ajuste-puntos" aria-hidden="true">${"<i></i>".repeat(puntos)}</div>
        <div class="juego-dificultad-botones"><button class="boton boton-fantasma" type="button" id="btn-ajuste-cancelar">Cancel</button></div>`;
      const btnCancelar = panel.querySelector("#btn-ajuste-cancelar");
      btnCancelar.addEventListener("pointerdown", (e) => e.stopPropagation());
      btnCancelar.addEventListener("click", (e) => {
        e.stopPropagation();
        cerrar();
      });
      st.metro = musica.metronomo({ bpm: BPM_AJUSTE, golpes: GOLPES_AJUSTE });
      if (!st.metro) {
        cerrar();
        return;
      }
      const m = st.metro;
      const texto = panel.querySelector("#ritmo-ajuste-texto");
      const marcas = panel.querySelectorAll(".ritmo-ajuste-puntos i");
      const aviso = m.tiempos[CALENTAMIENTO] - 60 / BPM_AJUSTE / 2;
      const cuandoAviso = Math.max(0, (aviso - m.reloj()) * 1000);
      st.timerAjuste = setTimeout(() => {
        texto.textContent = "Now tap anywhere, right on each click ♪";
      }, cuandoAviso);
      const toque = (e) => {
        if (e.target.closest("button")) return;
        e.preventDefault();
        e.stopPropagation();
        const t = m.reloj();
        if (t < aviso) return;
        toques.push(t);
        const i = Math.min(marcas.length, toques.length) - 1;
        if (marcas[i]) marcas[i].classList.add("hecho");
        vibrar(8);
      };
      panel.addEventListener("pointerdown", toque);
      st.teclaAjuste = (e) => {
        if (e.key === " " || e.key === "Enter") toque({ target: panel, preventDefault() {}, stopPropagation() {} });
      };
      const fin = (m.tiempos[m.tiempos.length - 1] - m.reloj() + 0.7) * 1000;
      st.timerAjuste2 = setTimeout(() => {
        panel.removeEventListener("pointerdown", toque);
        if (st.metro === m) {
          m.detener();
          st.metro = null;
        }
        const r = calcularAjuste(toques, m.tiempos);
        if (r) {
          ajuste = r.ajuste;
          guardarAjusteRitmo(ajuste);
          sonar("guardado");
        } else sonar("no");
        panel.innerHTML = `
          <div class="juego-dificultad-titulo">${r ? "SYNCED ♪" : "HMM…"}</div>
          <div class="ritmo-ajuste-texto">${r ? `Your sound arrives ${Math.round(r.ajuste * 1000)} ms late. The game knows now ♥` : "The taps were a bit uneven. Want to try again?"}</div>
          <div class="juego-dificultad-botones">
            ${r ? "" : `<button class="boton boton-fantasma" type="button" id="btn-ajuste-otra">Try again</button>`}
            <button class="boton" type="button" id="btn-ajuste-listo">${r ? "Let's play" : "Cancel"}</button>
          </div>`;
        for (const b of panel.querySelectorAll("button")) b.addEventListener("pointerdown", (e) => e.stopPropagation());
        panel.querySelector("#btn-ajuste-listo").addEventListener("click", (e) => {
          e.stopPropagation();
          cerrar();
        });
        const otra = panel.querySelector("#btn-ajuste-otra");
        if (otra) {
          otra.addEventListener("click", (e) => {
            e.stopPropagation();
            empezarAjuste();
          });
        }
      }, fin);
    };
    empezarAjuste();
  }

  for (const b of contenedor.querySelectorAll("[data-cancion]")) {
    b.addEventListener("pointerdown", (e) => e.stopPropagation());
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      cancion = b.dataset.cancion;
      try {
        localStorage.setItem(CLAVE_CANCION, cancion);
      } catch (err) {
        /* nada */
      }
      for (const x of contenedor.querySelectorAll("[data-cancion]")) x.classList.toggle("boton-fantasma", x.dataset.cancion !== cancion);
      sonar("tocar");
      pintarDificultades();
    });
  }

  const st = {
    estado: "eligiendo", // eligiendo | jugando | fin
    juego: null, // lo que devuelve tocarParaJuego
    notas: [], // { t, carril, hecha: null | "perfecto" | "bien" | "fallo" }
    puntos: 0,
    combo: 0,
    perfectos: 0,
    buenos: 0,
    fallados: 0,
    destellos: [0, 0, 0],
    fin: 0,
    caraHasta: 0,
    vivo: true,
    metro: null, // el metronomo del ajuste, mientras suena
    timerAjuste: 0,
    timerAjuste2: 0,
    teclaAjuste: null,
  };

  function soltarAjuste() {
    if (st.metro) st.metro.detener();
    st.metro = null;
    st.teclaAjuste = null;
    clearTimeout(st.timerAjuste);
    clearTimeout(st.timerAjuste2);
  }

  function empezar() {
    D = DIFICULTADES_RITMO[dif];
    const cartel = $("ritmo-cartel");
    if (cartel) cartel.remove();
    st.juego = musica.tocarParaJuego(cancion, { adelanto: ADELANTO });
    if (!st.juego) {
      terminar();
      return;
    }
    st.notas = notasDelJuego(st.juego.melodia, st.juego.paso, D.separacion, !!D.enTiempo).map((n) => ({ ...n, t: n.t + st.juego.t0, hecha: null }));
    st.fin = st.juego.t0 + st.juego.duracion + 0.8;
    st.estado = "jugando";
    $("ritmo-record").textContent = `♪ ${nombreDe(cancion).toUpperCase()} · BEST ${leerRecordRitmo(cancion, dif)}`;
    if (!st.juego.conAudio) $("ritmo-pista").textContent = "Turn the sound on to hear the song ♪";
    setTimeout(() => {
      const p = $("ritmo-pista");
      if (p) p.classList.add("oculto");
    }, 5000);
  }

  cablearVolver(contenedor, () => {
    if (!st.vivo) return;
    soltarAjuste();
    if (st.estado === "eligiendo") alSalir();
    else terminar();
  });

  // con sonido: el ajuste de ella si sincronizo; si no, lo que dice el navegador
  const desfase = () => (st.juego.conAudio && ajuste != null ? ajuste : st.juego.latencia);
  const ahora = () => (st.juego ? st.juego.reloj() - desfase() : 0);
  const centroCarril = (c) => L.W / 2 + (c - 1) * SEPARACION;

  function cara(ojo, boca, ms = 500) {
    const el = contenedor.querySelector("#ritmo-personaje .sprite-cara");
    if (el) cambiarCara(el, ojo, boca);
    st.caraHasta = performance.now() + ms;
  }

  function tocar(carril) {
    if (st.estado !== "jugando") return;
    const t = ahora();
    let mejor = null;
    for (const n of st.notas) {
      if (n.hecha || n.carril !== carril) continue;
      const d = Math.abs(n.t - t);
      if (d <= D.bien && (!mejor || d < Math.abs(mejor.t - t))) mejor = n;
      if (n.t - t > D.bien) break;
    }
    st.destellos[carril] = performance.now();
    const xPct = (centroCarril(carril) / L.W) * 100;
    if (!mejor) {
      // tocar sin nada: no suma, y corta el combo (si no, se gana tocando sin parar)
      if (st.combo > 0) st.combo = 0;
      pintarHud();
      return;
    }
    const perfecto = Math.abs(mejor.t - t) <= D.perfecto;
    mejor.hecha = perfecto ? "perfecto" : "bien";
    st.combo += 1;
    const gana = (perfecto ? 3 : 1) * multiplicador(st.combo);
    st.puntos += gana;
    if (perfecto) st.perfectos += 1;
    else st.buenos += 1;
    vibrar(perfecto ? 15 : 8);
    flotante($("ritmo-capa"), perfecto ? "PERFECT" : "GOOD", xPct, 62, perfecto ? "oro" : "");
    if (perfecto && st.combo % 10 === 0) cara("ojo_especial_euforico.png", "boca_especial_euforico.png", 800);
    pintarHud();
  }

  function pintarHud() {
    $("ritmo-puntos").textContent = st.puntos.toLocaleString("en-US");
    const m = multiplicador(st.combo);
    const c = $("ritmo-combo");
    c.textContent = st.combo >= 5 ? `${st.combo} COMBO${m > 1 ? ` x${m}` : ""}` : "";
    c.classList.toggle("oculto", st.combo < 5);
  }

  area.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    e.preventDefault();
    const r = area.getBoundingClientRect();
    const x = (e.clientX - r.left) / L.escala;
    let carril = 0;
    let dist = Infinity;
    for (let c = 0; c < 3; c++) {
      const d = Math.abs(x - centroCarril(c));
      if (d < dist) {
        dist = d;
        carril = c;
      }
    }
    tocar(carril);
  });
  const teclas = (e) => {
    if (st.teclaAjuste) {
      st.teclaAjuste(e);
      return;
    }
    const k = { ArrowLeft: 0, a: 0, ArrowDown: 1, s: 1, ArrowRight: 2, d: 2 }[e.key];
    if (k !== undefined) tocar(k);
  };
  window.addEventListener("keydown", teclas);

  let ultimoPulso = -1;
  function cuadro() {
    if (!st.vivo) return;
    requestAnimationFrame(cuadro);
    const t = ahora();
    if (st.caraHasta && performance.now() > st.caraHasta) {
      st.caraHasta = 0;
      const el = contenedor.querySelector("#ritmo-personaje .sprite-cara");
      if (el) cambiarCara(el, "ojo_base_energia_alta.png", "boca_base_feliz.png");
    }
    if (st.estado === "jugando") {
      for (const n of st.notas) {
        if (n.hecha) continue;
        if (t - n.t > D.bien) {
          n.hecha = "fallo";
          st.fallados += 1;
          st.combo = 0;
          flotante($("ritmo-capa"), "MISS", (centroCarril(n.carril) / L.W) * 100, 62, "mal");
          if (st.fallados % 4 === 1) cara("ojo_especial_decepcionado.png", "boca_especial_decepcionado.png", 450);
          pintarHud();
        } else break;
      }
      // el personaje baila a tempo (una vez por negra)
      const pulso = Math.floor((t - st.juego.t0) / (st.juego.paso * 2));
      if (pulso !== ultimoPulso && pulso >= 0) {
        ultimoPulso = pulso;
        const pj = $("ritmo-personaje");
        if (pj) pj.classList.toggle("baile-b", pulso % 2 === 1);
      }
      if (t > st.fin) terminar();
    }
    dibujar(t);
  }

  function dibujar(t) {
    if (L.lienzo.width !== L.W) L.medir();
    ctx.clearRect(0, 0, L.W, ALTO);
    const ya = performance.now();
    for (let c = 0; c < 3; c++) {
      const x = Math.round(centroCarril(c) - ANCHO_CARRIL / 2);
      ctx.fillStyle = "rgba(20,18,20,0.55)";
      ctx.fillRect(x, 0, ANCHO_CARRIL, ALTO);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(x, 0, 1, ALTO);
      ctx.fillRect(x + ANCHO_CARRIL - 1, 0, 1, ALTO);
      // el circulo
      const brilla = ya - st.destellos[c] < 120;
      aro(Math.round(centroCarril(c)), Y_TOQUE, 13, brilla ? "rgb(255,255,255)" : COLORES[c], brilla);
    }
    if (st.estado !== "jugando") return;
    const arriba = -14;
    for (const n of st.notas) {
      if (n.hecha === "perfecto" || n.hecha === "bien") continue;
      const falta = n.t - t;
      if (falta > D.caida) break;
      const y = Math.round(Y_TOQUE - (falta / D.caida) * (Y_TOQUE - arriba));
      if (y > ALTO + 20) continue;
      const img = comidas[n.carril];
      ctx.globalAlpha = n.hecha === "fallo" ? 0.35 : 1;
      if (lista(img)) ctx.drawImage(img, Math.round(centroCarril(n.carril)) - 32, y - 32);
      ctx.globalAlpha = 1;
    }
  }

  function aro(cx, cy, r, color, lleno) {
    for (let a = 0; a < 360; a += 4) {
      const rad = (a * Math.PI) / 180;
      ctx.fillStyle = "rgb(30,28,30)";
      ctx.fillRect(Math.round(cx + (r + 2) * Math.cos(rad)), Math.round(cy + (r + 2) * Math.sin(rad)), 1, 1);
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), 1, 1);
      ctx.fillRect(Math.round(cx + (r + 1) * Math.cos(rad)), Math.round(cy + (r + 1) * Math.sin(rad)), 1, 1);
    }
    if (lleno) {
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(cx - r + 3, cy - r + 3, 2 * r - 5, 2 * r - 5);
    }
  }
  requestAnimationFrame(cuadro);

  function terminar() {
    if (!st.vivo) return;
    st.vivo = false;
    st.estado = "fin";
    soltarAjuste();
    window.removeEventListener("keydown", teclas);
    window.removeEventListener("resize", L.medir);
    if (st.juego) st.juego.detener();
    const record = leerRecordRitmo(cancion, dif);
    const nuevoRecord = st.puntos > record;
    if (nuevoRecord) guardarRecordDe(claveRecordRitmo(cancion), dif, st.puntos);
    alTerminar({
      puntos: st.puntos,
      perfectos: st.perfectos,
      buenos: st.buenos,
      fallados: st.fallados,
      total: st.notas.length,
      record: Math.max(record, st.puntos),
      nuevoRecord,
      dificultad: dif,
      cancion,
      nombreCancion: nombreDe(cancion),
    });
  }
  window.addEventListener("resize", L.medir);

  return {
    terminar,
    destruir: () => {
      st.vivo = false;
      soltarAjuste();
      window.removeEventListener("keydown", teclas);
      window.removeEventListener("resize", L.medir);
      if (st.juego) st.juego.detener();
    },
    // para las pruebas
    _tocar: (carril) => tocar(carril),
    _metro: () => (st.metro ? { tiempos: st.metro.tiempos, ahora: st.metro.reloj() } : null),
    _estado: () => ({ desfase: st.juego ? desfase() : null, estado: st.estado, puntos: st.puntos, combo: st.combo, perfectos: st.perfectos, buenos: st.buenos, fallados: st.fallados, total: st.notas.length, ahora: ahora(), proximas: st.notas.filter((n) => !n.hecha).slice(0, 3).map((n) => ({ t: n.t, carril: n.carril })) }),
  };
}
