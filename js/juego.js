/**
 * juego.js
 * =========
 * El minijuego de la tele: SNACK RAIN. Cae comida del techo y el
 * personaje la atrapa con la boca. Se mueve arrastrando el dedo (o con
 * las flechas) o inclinando el telefono (v29: como un volante; antes
 * sacudir atrapaba sola la comida y tocarla tambien, y eso le quitaba la
 * gracia: ahora solo cuenta lo que cae en la boca).
 *
 *   comida comun  +1 (por el combo: x2 a las 5 seguidas, x3 a las 10, x4 a las 16)
 *   bao dorado    +5, raro
 *   chile         pica: se pierde un corazon (3 corazones), atrapado O tocado
 *
 * Antes de empezar se elige la dificultad (EASY / NORMAL / HARD): cambia
 * lo rapido que cae, cada cuanto sale algo y cuantos chiles hay. Hay un
 * record por dificultad. Termina a los 40 s o sin corazones.
 */

import { HTML_VOLVER, cablearVolver, crearPausa } from "./juegoComun.js";

const DURACION_MS = 40000;
const CORAZONES = 3;
const CLAVE_RECORD = "baozi_record_juego"; // + "_easy" / "_hard" (normal usa la clave de siempre)
const CLAVE_DIFICULTAD = "baozi_dificultad_juego";

// velocidad: fraccion del alto por segundo (arranca en v0, llega a v0 + dv al final)
// cada: ms entre comida y comida (de cada0 a cada1); chile: probabilidad (de ch0 a ch0 + dch)
export const DIFICULTADES = {
  easy: { nombre: "EASY", v0: 0.32, dv: 0.3, cada0: 760, cada1: 430, ch0: 0.1, dch: 0.1 },
  normal: { nombre: "NORMAL", v0: 0.46, dv: 0.46, cada0: 620, cada1: 320, ch0: 0.14, dch: 0.14 },
  hard: { nombre: "HARD", v0: 0.62, dv: 0.62, cada0: 500, cada1: 250, ch0: 0.18, dch: 0.16 },
};

const BUENAS = [
  "comida/comida_manzana.png",
  "comida/comida_naranja.png",
  "comida/comida_bao.png",
  "comida/comida_onigiri.png",
  "comida/comida_dumpling.png",
  "comida/comida_grillo1.png",
];
const DORADO = "comida/juego_bao_dorado.png";
const CHILE = "comida/juego_chile.png";

const claveRecord = (dif) => (dif === "normal" ? CLAVE_RECORD : `${CLAVE_RECORD}_${dif}`);

/** El record de una dificultad (sin dificultad: el mejor de todas). */
export function leerRecord(dif = null) {
  if (!dif) return Math.max(...Object.keys(DIFICULTADES).map((d) => leerRecord(d)));
  try {
    return Number(localStorage.getItem(claveRecord(dif))) || 0;
  } catch (e) {
    return 0;
  }
}

function guardarRecord(dif, n) {
  try {
    localStorage.setItem(claveRecord(dif), String(n));
  } catch (e) {
    /* nada */
  }
}

function leerDificultad() {
  try {
    const d = localStorage.getItem(CLAVE_DIFICULTAD);
    return DIFICULTADES[d] ? d : "normal";
  } catch (e) {
    return "normal";
  }
}

function multiplicador(combo) {
  return combo >= 16 ? 4 : combo >= 10 ? 3 : combo >= 5 ? 2 : 1;
}

/**
 * contenedor: donde se arma. opts:
 *   arte(rel)                 ruta de un asset
 *   sprite(ojo, boca)         html del personaje con esa cara
 *   cambiarCara(el, ojo, boca)
 *   sonar(nombre), vibrar(ms)
 *   alTerminar({ puntos, atrapadas, record, nuevoRecord })
 *   alSalir()                 volvio antes de empezar (sin jugar)
 *   bannerMotion (html opcional para pedir el permiso de movimiento)
 *   alElegir()                v35 (F31): se llama DENTRO del toque que elige la
 *                             dificultad (ahi se pide el permiso del sensor); si
 *                             devuelve una promesa, la cuenta espera a que termine
 *   alEmpezar()               v35 (F37): en el "GO!" y al volver de una pausa
 *                             (ahi se recalibra el volante)
 */
export function iniciarJuego(contenedor, opts) {
  const { arte, sprite, cambiarCara, sonar = () => {}, vibrar = () => {}, alTerminar = () => {}, alSalir = () => {} } = opts;
  let dif = leerDificultad();
  let D = DIFICULTADES[dif];
  let record = leerRecord(dif);
  contenedor.innerHTML = `
    <div class="pantalla-juego con-cuarto" id="area-minijuego">
      ${HTML_VOLVER}
      <div class="juego-hud">
        <span class="juego-chip" id="juego-puntos">0</span>
        <span class="juego-chip juego-combo oculto" id="juego-combo">x2</span>
        <span class="juego-corazones" id="juego-corazones">${"<i></i>".repeat(CORAZONES)}</span>
        <span class="juego-chip" id="minijuego-tiempo">40</span>
      </div>
      <div class="juego-record" id="juego-record">BEST ${record}</div>
      <div class="juego-cielo" id="juego-cielo"></div>
      <div class="juego-personaje" id="caja-cara-minijuego">${sprite("ojo_base_energia_alta.png", "boca_base_feliz.png")}</div>
      ${opts.bannerMotion || ""}
      <div class="pista-minijuego" id="juego-pista">Drag or tilt to move · catch the snacks · avoid the chili!</div>
      <div class="juego-cuenta oculto" id="juego-cuenta">3</div>
      <div class="juego-dificultad" id="juego-dificultad">
        <div class="juego-dificultad-titulo">SNACK RAIN</div>
        <div class="juego-dificultad-botones">
          ${Object.entries(DIFICULTADES)
            .map(([id, d]) => `<button class="boton ${id === dif ? "" : "boton-fantasma"}" data-dificultad="${id}">${d.nombre}<small>best ${leerRecord(id)}</small></button>`)
            .join("")}
        </div>
      </div>
    </div>`;

  const area = contenedor.querySelector("#area-minijuego");
  const cielo = contenedor.querySelector("#juego-cielo");
  const pj = contenedor.querySelector("#caja-cara-minijuego");
  const $ = (id) => contenedor.querySelector(`#${id}`);

  const st = {
    x: 0.5, // donde esta el personaje (0..1 del ancho)
    objetivo: 0.5,
    puntos: 0,
    atrapadas: 0,
    combo: 0,
    corazones: CORAZONES,
    items: [],
    empezo: 0,
    ultimo: 0,
    proximo: 0,
    vivo: true,
    terminado: false,
    caraHasta: 0,
  };
  let contando = false; // la cuenta 3-2-1

  // v35 (F33): segundo plano / telefono bloqueado / vertical -> pausa. Al
  // seguir se corren el principio y la proxima comida (el reloj es el del rAF)
  const pausa = crearPausa(area, {
    activa: () => st.vivo && !st.terminado && (st.empezo > 0 || contando),
    alSeguir: (ms) => {
      if (st.empezo) {
        st.empezo += ms;
        st.proximo += ms;
      }
      if (st.caraHasta) st.caraHasta += ms;
      st.ultimo = 0;
      if (st.empezo && opts.alEmpezar) opts.alEmpezar();
    },
  });

  // ---- controles ----
  const mover = (clientX) => {
    const r = area.getBoundingClientRect();
    st.objetivo = Math.min(0.94, Math.max(0.06, (clientX - r.left) / r.width));
  };
  let dedoHasta = 0; // mientras arrastra el dedo, la inclinacion no manda
  area.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    dedoHasta = performance.now() + 1200;
    mover(e.clientX);
  });
  // v35 (F42): al soltar el dedo, el volante sigue desde ahi (main recentra la base)
  const soltarDedo = () => {
    dedoHasta = Math.min(dedoHasta, performance.now() + 250);
  };
  area.addEventListener("pointerup", soltarDedo);
  area.addEventListener("pointercancel", soltarDedo);
  area.addEventListener("pointermove", (e) => {
    if (e.buttons || e.pointerType === "touch") {
      dedoHasta = performance.now() + 1200;
      mover(e.clientX);
    }
  });
  const teclas = (e) => {
    if (e.key === "ArrowLeft") st.objetivo = Math.max(0.06, st.objetivo - 0.12);
    if (e.key === "ArrowRight") st.objetivo = Math.min(0.94, st.objetivo + 0.12);
  };
  window.addEventListener("keydown", teclas);

  cablearVolver(contenedor, () => {
    if (!st.vivo || st.terminado) return;
    if (!st.empezo) alSalir(); // eligiendo o en la cuenta regresiva: todavia no jugo
    else terminar();
  });

  // ---- caras ----
  function cara(ojo, boca, ms = 380) {
    const el = pj.querySelector(".sprite-cara");
    cambiarCara(el, ojo, boca);
    st.caraHasta = performance.now() + ms;
  }

  // ---- items ----
  function nuevoItem(t) {
    const avance = Math.min(1, (t - st.empezo) / DURACION_MS);
    const r = Math.random();
    const tipo = r < D.ch0 + avance * D.dch ? "chile" : r < D.ch0 + 0.07 + avance * D.dch ? "dorado" : "buena";
    const src = tipo === "chile" ? CHILE : tipo === "dorado" ? DORADO : BUENAS[Math.floor(Math.random() * BUENAS.length)];
    const el = document.createElement("img");
    el.className = `juego-item ${tipo}`;
    el.src = arte(src);
    el.alt = "";
    el.draggable = false;
    const item = { el, tipo, x: 0.08 + Math.random() * 0.84, y: -0.12, v: D.v0 + avance * D.dv + Math.random() * 0.08, giro: (Math.random() - 0.5) * 40 };
    cielo.appendChild(el);
    st.items.push(item);
  }

  function quitar(item, clase = "") {
    st.items = st.items.filter((i) => i !== item);
    if (clase) {
      item.el.classList.add(clase);
      setTimeout(() => item.el.remove(), 300);
    } else item.el.remove();
  }

  function flotante(texto, x, clase = "") {
    const f = document.createElement("div");
    f.className = `juego-flota ${clase}`;
    f.textContent = texto;
    f.style.left = `${x * 100}%`;
    cielo.appendChild(f);
    setTimeout(() => f.remove(), 700);
  }

  function atrapar(item) {
    if (!st.vivo || st.terminado) return;
    if (item.tipo === "chile") {
      st.corazones -= 1;
      st.combo = 0;
      sonar("no");
      vibrar([30, 40, 30]);
      cara("ojo_especial_asqueado.png", "boca_especial_asqueado.png", 700);
      pj.classList.remove("pica");
      void pj.offsetWidth;
      pj.classList.add("pica");
      flotante("HOT!", item.x, "mal");
      quitar(item, "comido");
      pintarHud();
      if (st.corazones <= 0) terminar();
      return;
    }
    st.combo += 1;
    const base = item.tipo === "dorado" ? 5 : 1;
    const gana = base * multiplicador(st.combo);
    st.puntos += gana;
    st.atrapadas += 1;
    sonar("atrapar");
    vibrar(15);
    cara("ojo_base_energia_alta.png", "boca_especial_sorprendido.png", 260);
    flotante(`+${gana}`, item.x, item.tipo === "dorado" ? "oro" : "");
    quitar(item, "comido");
    pintarHud();
  }

  /** v29: inclinar el telefono mueve al personaje (posicion 0..1), salvo mientras usa el dedo. */
  function inclinar(objetivo) {
    if (performance.now() < dedoHasta || !Number.isFinite(objetivo)) return;
    st.objetivo = Math.min(0.94, Math.max(0.06, objetivo));
  }

  function pintarHud() {
    $("juego-puntos").textContent = String(st.puntos);
    const m = multiplicador(st.combo);
    const c = $("juego-combo");
    c.textContent = `x${m}`;
    c.classList.toggle("oculto", m < 2);
    const cs = [...$("juego-corazones").children];
    cs.forEach((h, i) => h.classList.toggle("vacio", i >= st.corazones));
  }

  // ---- bucle ----
  function cuadro(t) {
    if (!st.vivo) return;
    requestAnimationFrame(cuadro);
    if (!st.empezo) return;
    if (pausa.pausado()) {
      st.ultimo = 0;
      return;
    }
    const dt = Math.min(50, t - (st.ultimo || t)) / 1000;
    st.ultimo = t;
    if (st.terminado) return;
    const restante = Math.max(0, DURACION_MS - (t - st.empezo));
    $("minijuego-tiempo").textContent = String(Math.ceil(restante / 1000));
    if (restante <= 0) {
      terminar();
      return;
    }
    // el personaje sigue al dedo, con un poquito de inercia
    st.x += (st.objetivo - st.x) * Math.min(1, dt * 12);
    pj.style.left = `${st.x * 100}%`;
    pj.classList.toggle("mira-izq", st.objetivo < st.x - 0.01);
    if (st.caraHasta && t > st.caraHasta) {
      st.caraHasta = 0;
      cambiarCara(pj.querySelector(".sprite-cara"), "ojo_base_energia_alta.png", "boca_base_feliz.png");
    }
    // nuevos
    if (t > st.proximo) {
      nuevoItem(t);
      const avance = Math.min(1, (t - st.empezo) / DURACION_MS);
      st.proximo = t + D.cada0 - avance * (D.cada0 - D.cada1) + Math.random() * 200;
    }
    // caer y chocar con la boca (la boca del personaje esta a ~80% del alto)
    for (const it of [...st.items]) {
      it.y += it.v * dt;
      // top = el centro de la comida (el lienzo se centra en su punto)
      it.el.style.transform = `translate(-50%, -50%) rotate(${it.giro * it.y}deg)`;
      it.el.style.left = `${it.x * 100}%`;
      it.el.style.top = `${it.y * 100}%`;
      if (it.y > 0.7 && it.y < 0.88 && Math.abs(it.x - st.x) < 0.08) {
        atrapar(it);
      } else if (it.y > 1.12) {
        if (it.tipo !== "chile") st.combo = 0;
        quitar(it);
        pintarHud();
      }
    }
  }

  function terminar() {
    if (st.terminado) return;
    st.terminado = true;
    pausa.destruir();
    const nuevoRecord = st.puntos > record;
    if (nuevoRecord) guardarRecord(dif, st.puntos);
    for (const it of st.items) it.el.remove();
    st.items = [];
    setTimeout(() => {
      detener();
      alTerminar({ puntos: st.puntos, atrapadas: st.atrapadas, record: Math.max(record, st.puntos), nuevoRecord, dificultad: dif });
    }, 400);
  }

  function detener() {
    st.vivo = false;
    pausa.destruir();
    window.removeEventListener("keydown", teclas);
  }

  // cuenta regresiva 3-2-1, despues de elegir la dificultad
  function arrancar() {
    if (!st.vivo || st.terminado) return;
    const cuenta = $("juego-cuenta");
    cuenta.classList.remove("oculto");
    contando = true;
    let n = 3;
    const tic = setInterval(() => {
      if (!st.vivo || st.terminado) {
        clearInterval(tic);
        return;
      }
      if (pausa.pausado()) return; // en pausa la cuenta espera
      n -= 1;
      if (n > 0) cuenta.textContent = String(n);
      else {
        clearInterval(tic);
        contando = false;
        cuenta.textContent = "GO!";
        setTimeout(() => cuenta.remove(), 500);
        st.empezo = performance.now();
        st.proximo = st.empezo + 200;
        // F37: el volante toma como "derecho" la postura de ahora, no la de cuando abrio el juego
        if (opts.alEmpezar) opts.alEmpezar();
        const pista = $("juego-pista");
        if (pista) setTimeout(() => pista.classList.add("oculto"), 3500);
      }
    }, 600);
  }
  for (const b of contenedor.querySelectorAll("[data-dificultad]")) {
    b.addEventListener("pointerdown", (e) => e.stopPropagation());
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      dif = b.dataset.dificultad;
      D = DIFICULTADES[dif];
      record = leerRecord(dif);
      try {
        localStorage.setItem(CLAVE_DIFICULTAD, dif);
      } catch (err) {
        /* nada */
      }
      $("juego-record").textContent = `${D.nombre} · BEST ${record}`;
      $("juego-dificultad").remove();
      sonar("tocar");
      // F31: el permiso del sensor se pide aca, dentro de este toque (el
      // cartel de dificultad tapaba el boton del permiso)
      let espera = null;
      try {
        espera = opts.alElegir ? opts.alElegir() : null;
      } catch (err) {
        espera = null;
      }
      if (espera && typeof espera.then === "function") espera.then(arrancar, arrancar);
      else arrancar();
    });
  }
  requestAnimationFrame(cuadro);

  return {
    detener,
    inclinar,
    terminar,
    estado: () => st,
    /** v35 (F42): si ahora manda el dedo (main recentra el volante para que siga desde aca). */
    usandoDedo: () => performance.now() < dedoHasta,
    _pausado: () => pausa.pausado(),
  };
}

// ------------------------------------------------------------------
// v29: el volante (inclinar el telefono)
// ------------------------------------------------------------------

/**
 * Cuanto esta inclinado el telefono hacia la derecha de la PANTALLA, en g
 * (+ = el borde derecho baja). ax/ay/az: accelerationIncludingGravity;
 * angulo: screen.orientation.angle (0, 90, 180, 270).
 * Devuelve { lateral, arriba }: arriba sirve para saber la convencion de
 * signos del telefono (algunos la dan al reves).
 */
export function ejesDePantalla(ax, ay, az, angulo = 90) {
  const g = 9.81;
  const a = ((Math.round(angulo / 90) * 90) % 360 + 360) % 360;
  const der = { 0: [1, 0], 90: [0, -1], 180: [-1, 0], 270: [0, 1] }[a];
  const arr = { 0: [0, 1], 90: [1, 0], 180: [0, -1], 270: [-1, 0] }[a];
  const vertical = (ax * arr[0] + ay * arr[1]) / g;
  return { lateral: -(ax * der[0] + ay * der[1]) / g, arriba: vertical + az / g, vertical, z: az / g };
}

// v35 (F36): la convencion de signos es del telefono (no de la postura):
// cuando se pudo saber seguro, queda guardada para la proxima.
const CLAVE_SIGNO = "baozi_volante_signo";
function signoGuardado() {
  try {
    const s = Number(localStorage.getItem(CLAVE_SIGNO));
    return s === 1 || s === -1 ? s : null;
  } catch (e) {
    return null;
  }
}
function guardarSigno(s) {
  try {
    localStorage.setItem(CLAVE_SIGNO, String(s));
  } catch (e) {
    /* nada */
  }
}

/**
 * Convierte lecturas del acelerometro en una posicion 0..1. Las primeras
 * lecturas calibran: como lo esta agarrando ella es "derecho", y de ahi se
 * saca tambien el signo. ~17 grados de inclinacion = de punta a punta
 * (v35, F42: antes 25, era mucho).
 *
 * v35 (F36): el signo. La inclinacion "lateral" esta bien para cualquier
 * postura (el borde derecho baja = derecha, con la pantalla para arriba o
 * para abajo); lo unico que cambia es la convencion del telefono (algunos
 * dan la gravedad al reves). Se saca del eje vertical de la PANTALLA: nadie
 * juega con el telefono cabeza abajo, asi que si ese eje marca algo claro
 * (|vertical| >= 0,3 g) su signo es la convencion, y queda guardada. Antes
 * se sumaba z: acostada boca arriba con la pantalla mirando al piso, z
 * daba vuelta el signo y el volante quedaba invertido. Si la pantalla esta
 * casi horizontal (no se puede saber), se usa la guardada; si no hay, se
 * supone la pantalla para arriba (signo de z).
 *
 * recalibrar(): vuelve a tomar la postura de ahora como "derecho" (en el GO!).
 * centrarEn(pos): mueve la base para que la inclinacion de ahora sea `pos`
 * (al soltar el dedo el personaje no salta a donde dice el telefono).
 */
export class Volante {
  constructor({ rango = 0.3, calibrar = 8, signo = undefined } = {}) {
    this.rango = rango;
    this.calibrar = calibrar;
    this.signoConocido = signo === undefined ? signoGuardado() : signo;
    this.signo = this.signoConocido || 1;
    this.seguro = false; // si el signo salio de una lectura clara
    this.recalibrar();
  }

  recalibrar() {
    this.faltan = this.calibrar;
    this.suma = 0;
    this.sumaVertical = 0;
    this.sumaZ = 0;
    this.n = 0;
    this.base = 0;
    this.suave = null;
  }

  /** La posicion de ahora pasa a ser `pos` (0..1), sin mover nada. */
  centrarEn(pos) {
    if (this.faltan > 0 || this.suave === null || !Number.isFinite(pos)) return;
    const f = Math.max(-1, Math.min(1, (pos - 0.5) / 0.44));
    const quiero = f * this.rango;
    this.base += this.suave - quiero;
    this.suave = quiero;
  }

  /** Devuelve la posicion (0..1) o null mientras calibra. */
  leer(ax, ay, az, angulo) {
    if (![ax, ay, az].every(Number.isFinite)) return null;
    const { lateral, vertical, z } = ejesDePantalla(ax, ay, az, angulo);
    if (this.faltan > 0) {
      this.suma += lateral;
      this.sumaVertical += vertical;
      this.sumaZ += z;
      this.n++;
      this.faltan--;
      if (this.faltan === 0) {
        const ver = this.sumaVertical / this.n;
        if (Math.abs(ver) >= 0.3) {
          this.signo = ver < 0 ? -1 : 1;
          this.seguro = true;
          if (this.signo !== this.signoConocido) guardarSigno(this.signo);
          this.signoConocido = this.signo;
        } else if (this.signoConocido) this.signo = this.signoConocido;
        else this.signo = this.sumaZ / this.n < 0 ? -1 : 1;
        this.base = (this.suma / this.n) * this.signo;
      }
      return null;
    }
    const v = lateral * this.signo - this.base;
    this.suave = this.suave === null ? v : this.suave + (v - this.suave) * 0.35;
    const f = Math.max(-1, Math.min(1, this.suave / this.rango));
    return 0.5 + f * 0.44;
  }
}
