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
 */
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
  };

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
    if (st.estado === "eligiendo") alSalir();
    else terminar();
  });

  const ahora = () => (st.juego ? st.juego.reloj() - st.juego.latencia : 0);
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
      window.removeEventListener("keydown", teclas);
      window.removeEventListener("resize", L.medir);
      if (st.juego) st.juego.detener();
    },
    // para las pruebas
    _tocar: (carril) => tocar(carril),
    _estado: () => ({ estado: st.estado, puntos: st.puntos, combo: st.combo, perfectos: st.perfectos, buenos: st.buenos, fallados: st.fallados, total: st.notas.length, ahora: ahora(), proximas: st.notas.filter((n) => !n.hecha).slice(0, 3).map((n) => ({ t: n.t, carril: n.carril })) }),
  };
}
