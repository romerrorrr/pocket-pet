/**
 * pesca.js
 * =========
 * v24: el segundo minijuego de la tele, LAKE FISHING. El personaje pesca
 * desde un muelle en el West Lake (de dia o de noche, segun la hora).
 *
 *   1. tocar: tira la caña (el corcho cae en el agua)
 *   2. cuando el corcho se hunde y sale "!", tocar rapido
 *      (EASY 1 s · NORMAL 0,7 s · HARD 0,5 s)
 *   3. una barrita con una marca que va y viene: tocar cuando la marca
 *      esta en lo verde. Los peces raros tienen lo verde mas chico.
 *
 *   carpa +1 · dorado +2 · koi +4 · koi dorado +10 (muy raro) · sandalia y hoja 0
 *
 * La partida dura 60 s. Hay un record por dificultad. El arte sale de
 * tools/pesca_arte.py; el personaje se dibuja con sus capas (y su ropa),
 * sentado en la punta del muelle.
 */

const DURACION_MS = 60000;
const CLAVE_RECORD = "baozi_record_pesca_";
const CLAVE_DIFICULTAD = "baozi_dificultad_pesca";
const MW = 360;
const MH = 160;

export const DIFICULTADES_PESCA = {
  easy: { nombre: "EASY", ventana: 1200, vel: 0.6, zona: 1.6, intentos: 3 },
  normal: { nombre: "NORMAL", ventana: 900, vel: 0.85, zona: 1.3, intentos: 2 },
  hard: { nombre: "HARD", ventana: 600, vel: 1.15, zona: 1, intentos: 1 },
};

export const PECES = [
  { id: "carpa", nombre: "Carp", puntos: 1, peso: 45, zona: 0.34, vel: 1 },
  { id: "dorado", nombre: "Goldfish", puntos: 2, peso: 25, zona: 0.26, vel: 1.1 },
  { id: "koi", nombre: "Koi", puntos: 4, peso: 10, zona: 0.18, vel: 1.2 },
  { id: "koi_dorado", nombre: "Golden koi", puntos: 10, peso: 3, zona: 0.11, vel: 1.45 },
  { id: "sandalia", nombre: "An old sandal…", puntos: 0, peso: 8, zona: 0.42, vel: 0.9 },
  { id: "hoja", nombre: "A lotus leaf…", puntos: 0, peso: 9, zona: 0.42, vel: 0.9 },
];
export const pezPorId = (id) => PECES.find((p) => p.id === id) || null;

export function leerRecordPesca(dif = null) {
  if (!dif) return Math.max(...Object.keys(DIFICULTADES_PESCA).map((d) => leerRecordPesca(d)));
  try {
    return Number(localStorage.getItem(CLAVE_RECORD + dif)) || 0;
  } catch (e) {
    return 0;
  }
}

function guardarRecord(dif, n) {
  try {
    localStorage.setItem(CLAVE_RECORD + dif, String(n));
  } catch (e) {
    /* nada */
  }
}

function leerDificultad() {
  try {
    const d = localStorage.getItem(CLAVE_DIFICULTAD);
    return DIFICULTADES_PESCA[d] ? d : "normal";
  } catch (e) {
    return "normal";
  }
}

function elegirPez(noche, azar = Math.random) {
  const tabla = PECES.map((p) => ({ p, peso: p.id === "koi_dorado" && noche ? p.peso * 2 : p.peso }));
  let r = azar() * tabla.reduce((s, x) => s + x.peso, 0);
  for (const x of tabla) {
    r -= x.peso;
    if (r < 0) return x.p;
  }
  return PECES[0];
}

/**
 * contenedor: donde se arma. opts:
 *   arte(rel), capas: [src] del personaje sentado (con su ropa), pies (fila de los pies)
 *   noche: bool, sonar(n), vibrar(ms)
 *   alTerminar({ puntos, peces, record, nuevoRecord, dificultad })
 */
export function iniciarPesca(contenedor, opts) {
  const { arte, capas = [], pies = 62, noche = false, sonar = () => {}, vibrar = () => {}, alTerminar = () => {} } = opts;
  let dif = leerDificultad();
  let D = DIFICULTADES_PESCA[dif];
  contenedor.innerHTML = `
    <div class="pantalla-pesca" id="area-pesca">
      <canvas class="pesca-lienzo" id="pesca-lienzo" width="${MW}" height="${MH}"></canvas>
      <div class="juego-hud">
        <span class="juego-chip" id="pesca-puntos">0</span>
        <span class="juego-chip" id="pesca-cuantos">FISH 0</span>
        <span class="juego-chip" id="pesca-tiempo">60</span>
      </div>
      <div class="pista-minijuego" id="pesca-pista">Tap to cast</div>
      <div class="pesca-barra oculto" id="pesca-barra" aria-hidden="true"><i id="pesca-zona"></i><b id="pesca-marca"></b></div>
      <div class="pesca-cartel oculto" id="pesca-cartel"></div>
      <div class="juego-dificultad" id="pesca-dificultad">
        <div class="juego-dificultad-titulo">LAKE FISHING</div>
        <div class="juego-dificultad-botones">
          ${Object.entries(DIFICULTADES_PESCA)
            .map(([id, d]) => `<button class="boton ${id === dif ? "" : "boton-fantasma"}" data-dificultad-pesca="${id}">${d.nombre}<small>best ${leerRecordPesca(id)}</small></button>`)
            .join("")}
        </div>
      </div>
    </div>`;

  const $ = (id) => contenedor.querySelector(`#${id}`);
  const area = $("area-pesca");
  const lienzo = $("pesca-lienzo");
  const m = lienzo.getContext("2d");
  m.imageSmoothingEnabled = false;

  const imgs = {};
  const img = (src) => {
    if (!imgs[src]) {
      const i = new Image();
      i.src = src;
      imgs[src] = i;
    }
    return imgs[src];
  };
  const listo = (i) => i && i.complete && i.naturalWidth > 0;
  const fondo = img(arte(`pesca/fondo_${noche ? "noche" : "dia"}.png`));
  const capasImg = capas.map((src) => img(src));
  for (const p of PECES) img(arte(`pesca/pez_${p.id}.png`));

  // el personaje se arma una vez en su lienzo de 96x96
  const pj = document.createElement("canvas");
  pj.width = 96;
  pj.height = 96;
  const pjx = pj.getContext("2d");
  let pjListo = false;
  const armarPersonaje = () => {
    if (pjListo || !capasImg.every(listo)) return;
    pjx.clearRect(0, 0, 96, 96);
    for (const c of capasImg) pjx.drawImage(c, 0, 0);
    pjListo = true;
  };

  const PJ_X = 86; // centro del personaje, en la punta del muelle
  const PIE = 124;
  const MANO = [PJ_X + 12, PIE - 26];
  const PUNTA = [PJ_X + 62, PIE - 66];

  const st = {
    estado: "eligiendo", // eligiendo | listo | tirando_linea | esperando | pica | tirando | atrapado | escapo | fin
    empezo: 0,
    puntos: 0,
    peces: [],
    corcho: null, // { x, y }
    t: 0, // cuando empezo el estado actual
    picaEn: 0,
    pez: null,
    zona: [0.4, 0.6],
    intentos: 0,
    salto: null, // { pez, t0 }
    sombras: [0, 1, 2].map((i) => ({ x: 170 + i * 60, y: 100 + i * 17, v: 6 + i * 3, dir: i % 2 ? -1 : 1 })),
    vivo: true,
    forzado: null,
  };

  const pista = (t) => {
    $("pesca-pista").textContent = t;
  };
  const cartel = (t, ms = 1100) => {
    const c = $("pesca-cartel");
    c.textContent = t;
    c.classList.remove("oculto");
    clearTimeout(cartel._t);
    cartel._t = setTimeout(() => c.classList.add("oculto"), ms);
  };
  const cambiar = (estado, ahora = performance.now()) => {
    st.estado = estado;
    st.t = ahora;
  };

  // ---- elegir la dificultad ----
  for (const b of contenedor.querySelectorAll("[data-dificultad-pesca]")) {
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      dif = b.dataset.dificultadPesca;
      D = DIFICULTADES_PESCA[dif];
      try {
        localStorage.setItem(CLAVE_DIFICULTAD, dif);
      } catch (err) {
        /* nada */
      }
      $("pesca-dificultad").remove();
      st.empezo = performance.now();
      cambiar("listo");
      sonar("tocar");
    });
  }

  // ---- el toque ----
  const tocar = () => {
    const ahora = performance.now();
    if (st.estado === "listo") {
      const x = 175 + Math.random() * 130;
      const y = 92 + Math.random() * 40;
      st.corcho = { x, y };
      cambiar("tirando_linea", ahora);
      sonar("tocar");
      pista("Wait for the !");
    } else if (st.estado === "esperando") {
      cartel("Too soon! Wait for the !");
      st.corcho = null;
      cambiar("listo", ahora);
      pista("Tap to cast");
      sonar("no");
    } else if (st.estado === "pica") {
      st.intentos = D.intentos;
      const ancho = Math.min(0.6, st.pez.zona * D.zona);
      const c = 0.2 + Math.random() * (0.6 - ancho) + ancho / 2;
      st.zona = [c - ancho / 2, c + ancho / 2];
      const z = $("pesca-zona");
      z.style.left = `${st.zona[0] * 100}%`;
      z.style.width = `${ancho * 100}%`;
      $("pesca-barra").classList.remove("oculto");
      cambiar("tirando", ahora);
      pista("Tap when the line is in the green!");
      vibrar(20);
      sonar("enganche");
    } else if (st.estado === "tirando") {
      const p = marca(ahora);
      if (p >= st.zona[0] && p <= st.zona[1]) atrapar(ahora);
      else {
        st.intentos -= 1;
        if (st.intentos <= 0) escapar(ahora, "It got away…");
        else {
          sonar("no");
          cartel("Almost! One more try");
        }
      }
    }
  };
  area.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    e.preventDefault();
    tocar();
  });

  const marca = (ahora) => 0.5 + 0.5 * Math.sin(((ahora - st.t) / 1000) * Math.PI * 2 * D.vel * st.pez.vel - Math.PI / 2);

  function atrapar(ahora) {
    const pez = st.pez;
    st.puntos += pez.puntos;
    st.peces.push(pez.id);
    $("pesca-puntos").textContent = st.puntos;
    $("pesca-cuantos").textContent = `FISH ${st.peces.filter((id) => pezPorId(id).puntos > 0).length}`;
    $("pesca-barra").classList.add("oculto");
    st.salto = { pez, t0: ahora, desde: { ...st.corcho } };
    st.corcho = null;
    cambiar("atrapado", ahora);
    if (pez.puntos > 0) {
      sonar(pez.puntos >= 4 ? "hallazgo" : "hito");
      vibrar(pez.puntos >= 4 ? [20, 40, 20] : 25);
      cartel(`+${pez.puntos} ${pez.nombre}!`, 1300);
    } else {
      sonar("mimo");
      cartel(pez.nombre, 1300);
    }
    pista("Tap to cast");
  }

  function escapar(ahora, texto) {
    $("pesca-barra").classList.add("oculto");
    st.corcho = null;
    st.pez = null;
    cambiar("escapo", ahora);
    cartel(texto);
    sonar("no");
    pista("Tap to cast");
  }

  // ---- el dibujo ----
  function dibujar(ahora) {
    m.clearRect(0, 0, MW, MH);
    if (listo(fondo)) m.drawImage(fondo, 0, 0);
    // sombras de peces que pasean
    m.fillStyle = noche ? "rgba(10,14,40,0.55)" : "rgba(40,84,112,0.6)";
    for (const s of st.sombras) {
      s.x += (s.dir * s.v) / 60;
      if (s.x > 350 || s.x < 150) s.dir *= -1;
      const x = Math.round(s.x);
      const y = Math.round(s.y + Math.sin(ahora / 900 + s.v) * 2);
      m.fillRect(x - 5, y - 1, 11, 3);
      m.fillRect(x - 4, y - 2, 9, 5);
      m.fillRect(s.dir > 0 ? x - 8 : x + 6, y - 1, 3, 3);
    }
    // el personaje, mirando al lago
    armarPersonaje();
    if (pjListo) m.drawImage(pj, PJ_X - 48, PIE - pies + (Math.floor(ahora / 800) % 2 && st.estado !== "tirando" ? 0 : -1));
    // la caña (se dobla un poquito cuando tira)
    const tira = st.estado === "tirando" ? Math.sin(ahora / 60) * 1.5 + 3 : 0;
    const punta = [PUNTA[0], PUNTA[1] + tira];
    m.strokeStyle = "rgb(110,78,52)";
    m.lineWidth = 1;
    linea(MANO, punta, "rgb(110,78,52)");
    linea([MANO[0] + 1, MANO[1]], [punta[0] + 1, punta[1]], "rgb(88,60,40)");
    // la linea y el corcho
    let c = st.corcho;
    if (st.estado === "tirando_linea") {
      const t = Math.min(1, (ahora - st.t) / 450);
      c = { x: punta[0] + (st.corcho.x - punta[0]) * t, y: punta[1] + (st.corcho.y - punta[1]) * t - Math.sin(t * Math.PI) * 26 };
      if (t >= 1) {
        cambiar("esperando", ahora);
        st.picaEn = ahora + 1200 + Math.random() * 3300;
      }
    }
    if (c) {
      let cy = c.y;
      if (st.estado === "esperando") cy += Math.floor(ahora / 500) % 2;
      if (st.estado === "pica") cy += 2;
      if (st.estado === "tirando") cy += 1 + (Math.floor(ahora / 90) % 2);
      // linea que cuelga
      const pasos = 24;
      for (let i = 0; i <= pasos; i++) {
        const t = i / pasos;
        const x = punta[0] + (c.x - punta[0]) * t;
        const y = punta[1] + (cy - punta[1]) * t + Math.sin(t * Math.PI) * (st.estado === "tirando" ? 2 : 6);
        m.fillStyle = noche ? "rgba(200,200,230,0.8)" : "rgba(250,250,250,0.9)";
        m.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
      const x = Math.round(c.x);
      const y = Math.round(cy);
      m.fillStyle = "rgb(226,58,58)";
      m.fillRect(x - 1, y - 4, 3, 3);
      m.fillStyle = "rgb(250,250,250)";
      m.fillRect(x - 1, y - 1, 3, 2);
      m.fillStyle = noche ? "rgba(170,180,230,0.7)" : "rgba(210,236,240,0.9)";
      const onda = st.estado === "pica" ? 3 + (Math.floor(ahora / 120) % 3) : 3;
      m.fillRect(x - onda - 1, y + 1, onda * 2 + 3, 1);
      // el "!"
      if (st.estado === "pica") {
        const bx = x - 4;
        const by = y - 17 + (Math.floor(ahora / 150) % 2);
        m.fillStyle = "rgb(24,22,30)";
        m.fillRect(bx - 1, by - 1, 10, 11);
        m.fillStyle = "rgb(252,248,238)";
        m.fillRect(bx, by, 8, 9);
        m.fillStyle = "rgb(214,70,64)";
        m.fillRect(bx + 3, by + 1, 2, 5);
        m.fillRect(bx + 3, by + 7, 2, 1);
      }
    }
    // el pez que salta del agua al muelle
    if (st.salto) {
      const t = Math.min(1, (ahora - st.salto.t0) / 700);
      const d = st.salto.desde;
      const x = d.x + (PJ_X + 30 - d.x) * t;
      const y = d.y + (PIE - 60 - d.y) * t - Math.sin(t * Math.PI) * 30;
      const p = img(arte(`pesca/pez_${st.salto.pez.id}.png`));
      if (listo(p)) {
        m.save();
        m.translate(Math.round(x), Math.round(y));
        m.scale(-1, 1); // la cabeza para el lado del personaje
        m.drawImage(p, -11, -6);
        m.restore();
      }
      if (ahora - st.salto.t0 > 1300) st.salto = null;
    }
  }

  function linea(a, b, color) {
    m.fillStyle = color;
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
    for (let i = 0; i <= n; i++) {
      const t = n ? i / n : 0;
      m.fillRect(Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), 1, 1);
    }
  }

  // ---- el tiempo ----
  function paso() {
    if (!st.vivo) return;
    const ahora = performance.now(); // (el mismo reloj que los toques)
    if (st.estado !== "eligiendo" && st.estado !== "fin") {
      const queda = Math.max(0, DURACION_MS - (ahora - st.empezo));
      $("pesca-tiempo").textContent = Math.ceil(queda / 1000);
      if (queda <= 0) {
        terminar();
        return;
      }
      if (st.estado === "esperando" && ahora >= st.picaEn) {
        st.pez = st.forzado ? pezPorId(st.forzado) : elegirPez(noche);
        st.forzado = null;
        cambiar("pica", ahora);
        vibrar(40);
        sonar("encuentro");
      } else if (st.estado === "pica" && ahora - st.t > D.ventana) {
        escapar(ahora, "Too slow! It got away…");
      } else if (st.estado === "tirando") {
        $("pesca-marca").style.left = `${marca(ahora) * 100}%`;
        if (ahora - st.t > 7000) escapar(ahora, "It got tired and swam away…");
      } else if ((st.estado === "atrapado" && ahora - st.t > 900) || (st.estado === "escapo" && ahora - st.t > 600)) {
        cambiar("listo", ahora);
      }
    }
    dibujar(ahora);
    requestAnimationFrame(paso);
  }
  requestAnimationFrame(paso);

  function terminar() {
    if (st.estado === "fin") return;
    st.vivo = false;
    cambiar("fin");
    const record = leerRecordPesca(dif);
    const nuevoRecord = st.puntos > record;
    if (nuevoRecord) guardarRecord(dif, st.puntos);
    alTerminar({ puntos: st.puntos, peces: st.peces.slice(), record: Math.max(record, st.puntos), nuevoRecord, dificultad: dif });
  }

  // encuadre: el lienzo cubre la pantalla (como el cuarto), sin deformar
  const encuadrar = () => {
    const r = area.getBoundingClientRect();
    const s = Math.max(r.width / MW, r.height / MH);
    lienzo.style.width = `${MW * s}px`;
    lienzo.style.height = `${MH * s}px`;
  };
  encuadrar();
  window.addEventListener("resize", encuadrar);

  return {
    terminar,
    destruir: () => {
      st.vivo = false;
      window.removeEventListener("resize", encuadrar);
    },
    // para los tests: que pique ya (y que pez)
    _picarYa: (id) => {
      st.forzado = id;
      st.picaEn = 0;
    },
    _estado: () => ({ estado: st.estado, puntos: st.puntos, peces: st.peces.slice(), zona: st.zona.slice() }),
  };
}
