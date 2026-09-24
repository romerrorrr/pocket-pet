/**
 * juego.js
 * =========
 * El minijuego de la tele: SNACK RAIN. Cae comida del techo y el
 * personaje la atrapa con la boca. Se mueve arrastrando el dedo (o con
 * las flechas); tocar una comida tambien la atrapa, y sacudir el
 * telefono atrapa la que esta mas abajo.
 *
 *   comida comun  +1 (por el combo: x2 a las 5 seguidas, x3 a las 10, x4 a las 16)
 *   bao dorado    +5, raro
 *   chile         pica: se pierde un corazon (3 corazones)
 *
 * Termina a los 40 s o sin corazones. Guarda el record.
 */

const DURACION_MS = 40000;
const CORAZONES = 3;
const CLAVE_RECORD = "baozi_record_juego";

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

export function leerRecord() {
  try {
    return Number(localStorage.getItem(CLAVE_RECORD)) || 0;
  } catch (e) {
    return 0;
  }
}

function guardarRecord(n) {
  try {
    localStorage.setItem(CLAVE_RECORD, String(n));
  } catch (e) {
    /* nada */
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
 *   bannerMotion (html opcional para pedir el permiso de movimiento)
 */
export function iniciarJuego(contenedor, opts) {
  const { arte, sprite, cambiarCara, sonar = () => {}, vibrar = () => {}, alTerminar = () => {} } = opts;
  const record = leerRecord();
  contenedor.innerHTML = `
    <div class="pantalla-juego con-cuarto" id="area-minijuego">
      <div class="juego-hud">
        <span class="juego-chip" id="juego-puntos">0</span>
        <span class="juego-chip juego-combo oculto" id="juego-combo">x2</span>
        <span class="juego-corazones" id="juego-corazones">${"<i></i>".repeat(CORAZONES)}</span>
        <span class="juego-chip" id="minijuego-tiempo">40</span>
      </div>
      <div class="juego-record">BEST ${record}</div>
      <div class="juego-cielo" id="juego-cielo"></div>
      <div class="juego-personaje" id="caja-cara-minijuego">${sprite("ojo_base_energia_alta.png", "boca_base_feliz.png")}</div>
      ${opts.bannerMotion || ""}
      <div class="pista-minijuego" id="juego-pista">Drag to move · catch the snacks · avoid the chili!</div>
      <div class="juego-cuenta" id="juego-cuenta">3</div>
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

  // ---- controles ----
  const mover = (clientX) => {
    const r = area.getBoundingClientRect();
    st.objetivo = Math.min(0.94, Math.max(0.06, (clientX - r.left) / r.width));
  };
  area.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".juego-item, button")) return;
    mover(e.clientX);
  });
  area.addEventListener("pointermove", (e) => {
    if (e.buttons || e.pointerType === "touch") mover(e.clientX);
  });
  const teclas = (e) => {
    if (e.key === "ArrowLeft") st.objetivo = Math.max(0.06, st.objetivo - 0.12);
    if (e.key === "ArrowRight") st.objetivo = Math.min(0.94, st.objetivo + 0.12);
  };
  window.addEventListener("keydown", teclas);

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
    const tipo = r < 0.12 + avance * 0.14 ? "chile" : r < 0.19 + avance * 0.14 ? "dorado" : "buena";
    const src = tipo === "chile" ? CHILE : tipo === "dorado" ? DORADO : BUENAS[Math.floor(Math.random() * BUENAS.length)];
    const el = document.createElement("img");
    el.className = `juego-item ${tipo}`;
    el.src = arte(src);
    el.alt = "";
    el.draggable = false;
    const item = { el, tipo, x: 0.08 + Math.random() * 0.84, y: -0.12, v: 0.28 + avance * 0.34 + Math.random() * 0.08, giro: (Math.random() - 0.5) * 40 };
    el.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (item.tipo === "chile") quitar(item, "aplastado");
      else atrapar(item);
    });
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

  /** Para la sacudida: atrapa la comida (no chile) que esta mas abajo. */
  function atraparPrimera() {
    const buenas = st.items.filter((i) => i.tipo !== "chile").sort((a, b) => b.y - a.y);
    if (buenas[0]) atrapar(buenas[0]);
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
      st.proximo = t + 720 - avance * 380 + Math.random() * 220;
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
    const nuevoRecord = st.puntos > record;
    if (nuevoRecord) guardarRecord(st.puntos);
    for (const it of st.items) it.el.remove();
    st.items = [];
    setTimeout(() => {
      detener();
      alTerminar({ puntos: st.puntos, atrapadas: st.atrapadas, record: Math.max(record, st.puntos), nuevoRecord });
    }, 400);
  }

  function detener() {
    st.vivo = false;
    window.removeEventListener("keydown", teclas);
  }

  // cuenta regresiva 3-2-1
  const cuenta = $("juego-cuenta");
  let n = 3;
  const tic = setInterval(() => {
    n -= 1;
    if (!st.vivo) {
      clearInterval(tic);
      return;
    }
    if (n > 0) cuenta.textContent = String(n);
    else {
      clearInterval(tic);
      cuenta.textContent = "GO!";
      setTimeout(() => cuenta.remove(), 500);
      st.empezo = performance.now();
      st.proximo = st.empezo + 200;
      const pista = $("juego-pista");
      if (pista) setTimeout(() => pista.classList.add("oculto"), 3500);
    }
  }, 600);
  requestAnimationFrame(cuadro);

  return { detener, atraparPrimera, terminar, estado: () => st };
}
