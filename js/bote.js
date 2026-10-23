/**
 * bote.js
 * ========
 * v29: BOAT RIDE, minijuego de la tele. El personaje va en un bote de
 * remos por el West Lake (de dia o de noche, segun la hora). El bote
 * avanza solo; tocar arriba o abajo del bote lo cambia de carril (hay
 * tres). Hay que juntar los farolitos que flotan y esquivar los lotos:
 * cada loto cuesta un corazon (hay tres). Cada vez va mas rapido.
 *
 *   farolito +1 · farolito dorado +5 (raro) · el record es la distancia
 *
 * El bote es nuevo (tools/juegos_arte.py), no el del final.
 */
import { leerRecordDe, guardarRecordDe, leerDificultadDe, htmlDificultad, cablearDificultad, lienzoPixel, imagen, lista, flotante } from "./juegoComun.js";

const CLAVE = "baozi_record_bote";
const ALTO = 160;
const HORIZONTE = 66;
const CARRILES = [100, 124, 148]; // linea de flotacion de cada carril
const BX = 26; // donde va el bote (borde izquierdo)
const BOTE_W = 84;
const FLOTA = 20; // fila del dibujo del bote que queda a la altura del agua
const METROS_POR_PX = 1 / 3;
const CORAZONES = 3;

export const DIFICULTADES_BOTE = {
  easy: { v0: 34, dv: 30, cada: 74, rampa: 70 },
  normal: { v0: 44, dv: 40, cada: 60, rampa: 60 },
  hard: { v0: 56, dv: 52, cada: 50, rampa: 50 },
};

export const leerRecordBote = (dif = null) => leerRecordDe(CLAVE, dif);

/**
 * opts: arte, sprite(ojo, boca), cambiarCara, sonar, vibrar, noche,
 *       alTerminar({ puntos (metros), faroles, record, nuevoRecord, dificultad })
 */
export function iniciarBote(contenedor, opts) {
  const { arte, sprite, cambiarCara, noche = false, sonar = () => {}, vibrar = () => {}, alTerminar = () => {} } = opts;
  let dif = leerDificultadDe(CLAVE);
  let D = DIFICULTADES_BOTE[dif];
  const momento = noche ? "noche" : "dia";
  contenedor.innerHTML = `
    <div class="pantalla-juego pantalla-bote ${noche ? "de-noche" : ""}" id="area-bote">
      <div class="juego-hud">
        <span class="juego-chip bote-chip-farol"><img src="${arte("juegos/farol.png")}" alt="" draggable="false" /><b id="bote-faroles">0</b></span>
        <span class="juego-corazones" id="bote-corazones">${"<i></i>".repeat(CORAZONES)}</span>
        <span class="juego-chip bote-metros" id="bote-metros">0 m</span>
      </div>
      <div class="juego-record" id="bote-record">BOAT RIDE</div>
      <div class="bote-personaje" id="bote-personaje">${sprite("ojo_base_energia_alta.png", "boca_base_feliz.png")}</div>
      <div class="juego-cielo" id="bote-capa"></div>
      <div class="pista-minijuego" id="bote-pista">Tap above or below the boat to row · collect the lanterns</div>
      ${htmlDificultad("BOAT RIDE", CLAVE, dif, " m")}
    </div>`;
  const $ = (id) => contenedor.querySelector(`#${id}`);
  const area = $("area-bote");
  const fondo = lienzoPixel(area, ALTO, "juego-lienzo bote-lienzo bote-atras");
  const frente = lienzoPixel(area, ALTO, "juego-lienzo bote-lienzo bote-frente");
  const pjEl = $("bote-personaje");
  area.insertBefore(fondo.lienzo, pjEl);
  area.insertBefore(frente.lienzo, pjEl.nextSibling);

  const img = {
    cielo: imagen(arte(`juegos/lago_cielo_${momento}.png`)),
    agua: imagen(arte(`juegos/lago_agua_${momento}.png`)),
    atras: imagen(arte("juegos/bote_atras.png")),
    adelante: imagen(arte("juegos/bote_adelante.png")),
    farol: imagen(arte("juegos/farol.png")),
    oro: imagen(arte("juegos/farol_oro.png")),
    loto: imagen(arte("juegos/loto.png")),
    hoja: imagen(arte("juegos/loto_hoja.png")),
  };

  const st = {
    estado: "eligiendo", // eligiendo | remando | fin
    carril: 1,
    y: CARRILES[1], // linea de flotacion actual (se mueve suave entre carriles)
    cosas: [], // { tipo: farol|oro|loto, carril, x, hecha }
    olas: [],
    recorrido: 0, // px
    proxima: 120,
    faroles: 0,
    corazones: CORAZONES,
    invulnerable: 0,
    t0: 0,
    caraHasta: 0,
    vivo: true,
  };
  // olitas del agua (se mueven con el bote, mas rapido las de mas cerca)
  for (let i = 0; i < 46; i++) st.olas.push({ x: Math.random() * 420, y: HORIZONTE + 4 + Math.random() * (ALTO - HORIZONTE - 6), largo: 2 + Math.floor(Math.random() * 5) });

  const velocidad = () => D.v0 + D.dv * Math.min(1, (performance.now() - st.t0) / 1000 / D.rampa);

  function cara(ojo, boca, ms = 600) {
    const el = pjEl.querySelector(".sprite-cara");
    if (el) cambiarCara(el, ojo, boca);
    st.caraHasta = performance.now() + ms;
  }

  cablearDificultad(contenedor, CLAVE, (d) => {
    dif = d;
    D = DIFICULTADES_BOTE[dif];
    $("bote-record").textContent = `${dif.toUpperCase()} · BEST ${leerRecordBote(dif)} m`;
    st.t0 = performance.now();
    st.estado = "remando";
    sonar("tocar");
    setTimeout(() => {
      const p = $("bote-pista");
      if (p) p.classList.add("oculto");
    }, 5000);
  });

  function remar(dir) {
    if (st.estado !== "remando") return;
    const n = Math.max(0, Math.min(2, st.carril + dir));
    if (n === st.carril) return;
    st.carril = n;
    sonar("tocar");
    vibrar(8);
  }

  area.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    e.preventDefault();
    const r = area.getBoundingClientRect();
    const y = (e.clientY - r.top) / fondo.escala;
    remar(y < st.y - FLOTA / 2 ? -1 : 1);
  });
  const teclas = (e) => {
    if (e.key === "ArrowUp") remar(-1);
    if (e.key === "ArrowDown") remar(1);
  };
  window.addEventListener("keydown", teclas);

  // ---- lo que aparece ----
  function aparecer(W) {
    const x = W + 20;
    const r = Math.random();
    const carriles = [0, 1, 2].sort(() => Math.random() - 0.5);
    if (r < 0.32) {
      st.cosas.push({ tipo: Math.random() < 0.07 ? "oro" : "farol", carril: carriles[0], x });
    } else if (r < 0.62) {
      st.cosas.push({ tipo: "loto", carril: carriles[0], x });
    } else if (r < 0.88) {
      st.cosas.push({ tipo: "loto", carril: carriles[0], x });
      st.cosas.push({ tipo: Math.random() < 0.07 ? "oro" : "farol", carril: carriles[1], x: x + (Math.random() < 0.5 ? 0 : 18) });
    } else {
      // dos lotos: siempre queda un carril libre
      st.cosas.push({ tipo: "loto", carril: carriles[0], x });
      st.cosas.push({ tipo: "loto", carril: carriles[1], x: x + 6 });
    }
  }

  function chocar(c) {
    if (c.tipo === "loto") {
      if (performance.now() < st.invulnerable) return;
      c.hecha = true;
      st.corazones -= 1;
      st.invulnerable = performance.now() + 1300;
      sonar("no");
      vibrar([30, 40, 30]);
      cara("ojo_especial_asustado.png", "boca_especial_asustado.png", 800);
      flotante($("bote-capa"), "Bonk!", ((BX + BOTE_W / 2) / fondo.W) * 100, ((st.y - 40) / ALTO) * 100, "mal");
      pintarHud();
      if (st.corazones <= 0) {
        st.estado = "fin";
        cara("ojo_especial_decepcionado.png", "boca_especial_decepcionado.png", 99999);
        setTimeout(terminar, 1300);
      }
      return;
    }
    c.hecha = true;
    const gana = c.tipo === "oro" ? 5 : 1;
    st.faroles += gana;
    sonar(gana > 1 ? "hallazgo" : "atrapar");
    vibrar(gana > 1 ? [15, 30, 15] : 12);
    if (gana > 1) cara("ojo_especial_euforico.png", "boca_especial_euforico.png", 700);
    flotante($("bote-capa"), `+${gana}`, ((BX + BOTE_W * 0.7) / fondo.W) * 100, ((st.y - 36) / ALTO) * 100, gana > 1 ? "oro" : "");
    pintarHud();
  }

  function pintarHud() {
    $("bote-faroles").textContent = String(st.faroles);
    [...$("bote-corazones").children].forEach((h, i) => h.classList.toggle("vacio", i >= st.corazones));
    $("bote-metros").textContent = `${Math.floor(st.recorrido * METROS_POR_PX)} m`;
  }

  // ---- el bucle ----
  let ultimo = 0;
  function cuadro(t) {
    if (!st.vivo) return;
    requestAnimationFrame(cuadro);
    const dt = Math.min(50, t - (ultimo || t)) / 1000;
    ultimo = t;
    if (st.caraHasta && performance.now() > st.caraHasta) {
      st.caraHasta = 0;
      const el = pjEl.querySelector(".sprite-cara");
      if (el) cambiarCara(el, "ojo_base_energia_alta.png", "boca_base_feliz.png");
    }
    const W = fondo.W;
    const v = st.estado === "remando" ? velocidad() : st.estado === "fin" ? 0 : 12;
    // el bote va hacia su carril
    const objetivo = CARRILES[st.carril];
    st.y += (objetivo - st.y) * Math.min(1, dt * 12);
    for (const o of st.olas) {
      o.x -= v * (0.45 + ((o.y - HORIZONTE) / (ALTO - HORIZONTE)) * 0.8) * dt;
      if (o.x < -8) {
        o.x = W + Math.random() * 30;
        o.y = HORIZONTE + 4 + Math.random() * (ALTO - HORIZONTE - 6);
      }
    }
    if (st.estado === "remando") {
      st.recorrido += v * dt;
      st.proxima -= v * dt;
      if (st.proxima <= 0) {
        aparecer(W);
        st.proxima = D.cada * (0.75 + Math.random() * 0.6);
      }
      for (const c of st.cosas) c.x -= v * dt;
      // choques: el bote ocupa de BX+10 a BX+74 y esta en su carril (si ya llego)
      const enCarril = Math.abs(st.y - CARRILES[st.carril]) < 7 ? st.carril : -1;
      for (const c of st.cosas) {
        if (c.hecha || c.carril !== enCarril) continue;
        if (c.x > BX + 10 && c.x < BX + BOTE_W - 8) chocar(c);
      }
      st.cosas = st.cosas.filter((c) => c.x > -30 && !(c.hecha && c.tipo !== "loto"));
      pintarHud();
    }
    dibujar(t);
  }

  function dibujarCosa(m, c, t) {
    const wl = CARRILES[c.carril];
    const x = Math.round(c.x);
    const vaiven = Math.floor(t / 400 + c.x / 30) % 2;
    if (c.tipo === "loto") {
      if (lista(img.hoja)) m.drawImage(img.hoja, x + 4, wl - 4);
      if (lista(img.loto)) m.drawImage(img.loto, x - 12, wl - 10);
      if (c.hecha) {
        m.fillStyle = "rgba(255,255,255,0.6)";
        m.fillRect(x - 8, wl + 1, 16, 1);
      }
    } else {
      const i = c.tipo === "oro" ? img.oro : img.farol;
      if (lista(i)) m.drawImage(i, x - 12, wl - 23 + vaiven);
    }
  }

  function dibujar(t) {
    for (const L of [fondo, frente]) if (L.lienzo.width !== L.W) L.medir();
    const W = fondo.W;
    const a = fondo.ctx;
    const f = frente.ctx;
    a.clearRect(0, 0, W, ALTO);
    f.clearRect(0, 0, W, ALTO);
    // cielo y montañas (si la pantalla es mas ancha, se estira la ultima columna)
    if (lista(img.cielo)) {
      a.drawImage(img.cielo, 0, 0);
      if (W > img.cielo.naturalWidth) a.drawImage(img.cielo, img.cielo.naturalWidth - 1, 0, 1, img.cielo.naturalHeight, img.cielo.naturalWidth, 0, W - img.cielo.naturalWidth, img.cielo.naturalHeight);
    }
    if (lista(img.agua)) a.drawImage(img.agua, 0, 0, 1, img.agua.naturalHeight, 0, HORIZONTE, W, ALTO - HORIZONTE);
    a.fillStyle = noche ? "rgba(120,140,200,0.55)" : "rgba(222,242,246,0.75)";
    for (const o of st.olas) a.fillRect(Math.round(o.x), Math.round(o.y), o.largo, 1);
    // el bote, su carril y lo de los otros carriles (lo de mas abajo va adelante)
    const carrilBote = CARRILES.reduce((m, y, i) => (Math.abs(y - st.y) < Math.abs(CARRILES[m] - st.y) ? i : m), 0);
    for (const c of st.cosas) dibujarCosa(c.carril <= carrilBote ? a : f, c, t);
    const parpadeo = performance.now() < st.invulnerable && Math.floor(performance.now() / 110) % 2 === 0;
    const balanceo = st.estado === "remando" ? Math.floor(t / 500) % 2 : 0;
    const by = Math.round(st.y - FLOTA + balanceo);
    if (!parpadeo) {
      if (lista(img.atras)) a.drawImage(img.atras, BX, by);
      if (lista(img.adelante)) f.drawImage(img.adelante, BX, by);
    }
    // estela
    if (st.estado === "remando") {
      f.fillStyle = noche ? "rgba(160,180,230,0.6)" : "rgba(230,246,250,0.85)";
      for (let i = 0; i < 4; i++) f.fillRect(BX - 4 - i * 7, Math.round(st.y) + 1 + (i % 2), 5, 1);
    }
    // el personaje, sentado en el bote (entre las dos capas)
    const s = fondo.escala;
    const lado = Math.round(56 * s);
    pjEl.style.width = `${lado}px`;
    pjEl.style.height = `${lado}px`;
    pjEl.style.left = `${Math.round((BX + 20) * s)}px`;
    pjEl.style.top = `${Math.round((by - 23) * s)}px`;
    pjEl.style.visibility = parpadeo ? "hidden" : "visible";
  }
  requestAnimationFrame(cuadro);

  function terminar() {
    if (!st.vivo) return;
    st.vivo = false;
    window.removeEventListener("keydown", teclas);
    window.removeEventListener("resize", fondo.medir);
    window.removeEventListener("resize", frente.medir);
    const metros = Math.floor(st.recorrido * METROS_POR_PX);
    const record = leerRecordBote(dif);
    const nuevoRecord = metros > record;
    if (nuevoRecord) guardarRecordDe(CLAVE, dif, metros);
    alTerminar({ puntos: metros, faroles: st.faroles, record: Math.max(record, metros), nuevoRecord, dificultad: dif });
  }
  window.addEventListener("resize", fondo.medir);
  window.addEventListener("resize", frente.medir);

  return {
    terminar,
    destruir: () => {
      st.vivo = false;
      window.removeEventListener("keydown", teclas);
      window.removeEventListener("resize", fondo.medir);
      window.removeEventListener("resize", frente.medir);
    },
    // para las pruebas: poner algo en un carril, delante del bote
    _poner: (tipo, carril, x = BX + BOTE_W + 40) => st.cosas.push({ tipo, carril, x }),
    _remar: (dir) => remar(dir),
    _estado: () => ({ estado: st.estado, carril: st.carril, faroles: st.faroles, corazones: st.corazones, metros: Math.floor(st.recorrido * METROS_POR_PX), cosas: st.cosas.length }),
  };
}
