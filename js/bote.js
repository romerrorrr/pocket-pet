/**
 * bote.js
 * ========
 * v29: BOAT RIDE, minijuego de la tele. El personaje va en un bote de
 * remos por el West Lake (de dia o de noche, segun la hora). El bote
 * avanza solo; tocar el agua lleva el bote a ese carril (hay tres,
 * marcados con boyas). Hay que juntar los farolitos que flotan y esquivar
 * los lotos: cada loto cuesta un corazon (hay tres). Cada vez va mas rapido.
 *
 *   farolito +1 · farolito dorado +5 (raro) · el record es la distancia
 *
 * v31 (rom: "al cambiar de carril es muy facil pegarse con el loto, o hay
 * momentos que es imposible cambiar de carril sin chocarse"):
 *   - Los lotos vienen en filas, con agua libre entre una y otra: siempre da
 *     el tiempo de cambiar de carril (lo que tarda en pasar el bote, mas un
 *     respiro que se agranda con la velocidad).
 *   - Un loto solo pega si lo choca la proa (de frente). Si el bote se
 *     cruza de carril y el loto ya estaba al costado, lo roza y no pasa nada.
 *   - Los farolitos se juntan en el carril mas cercano, tambien mientras se
 *     cambia de carril.
 *   - Carriles mas separados y marcados con boyas: se ve en cual va cada cosa.
 *
 * El bote es nuevo (tools/juegos_arte.py), no el del final.
 */
import { leerRecordDe, guardarRecordDe, leerDificultadDe, htmlDificultad, cablearDificultad, lienzoPixel, imagen, lista, flotante, HTML_VOLVER, cablearVolver } from "./juegoComun.js";

const CLAVE = "baozi_record_bote";
const ALTO = 168;
const HORIZONTE = 66;
const SEP = 28; // entre carril y carril (un farolito mide 27 de alto: no se pisan)
const CARRILES = [96, 96 + SEP, 96 + 2 * SEP]; // linea de flotacion de cada carril
const BOYAS = [CARRILES[0] + SEP / 2, CARRILES[1] + SEP / 2]; // las sogas entre carriles
const BX = 26; // donde va el bote (borde izquierdo)
const BOTE_W = 84;
const FLOTA = 20; // fila del dibujo del bote que queda a la altura del agua
const CASCO = [BX + 6, BX + BOTE_W - 6]; // lo que ocupa el casco a lo largo
const PROA = CASCO[1]; // un loto que cruza esta linea en el carril del bote, choca
const ANCHO_LOTO = 10; // medio ancho del loto (para la proa)
const PASO_FAROLES = 26; // entre farolito y farolito de una tira
const METROS_POR_PX = 1 / 3;
const CORAZONES = 3;

// v0 + dv: la velocidad (px/s) al empezar y lo que suma en `rampa` segundos.
// respiro: segundos entre que una fila de lotos pasa la proa y llega la
// siguiente (reaccionar y cambiar de carril tarda ~0,6 s).
export const DIFICULTADES_BOTE = {
  easy: { v0: 40, dv: 40, rampa: 70, respiro: 1.3, oro: 0.08 },
  normal: { v0: 50, dv: 55, rampa: 70, respiro: 0.95, oro: 0.07 },
  hard: { v0: 62, dv: 70, rampa: 60, respiro: 0.72, oro: 0.06 },
};

export const leerRecordBote = (dif = null) => leerRecordDe(CLAVE, dif);

/** El carril que corresponde a una altura de la pantalla (en pixeles de juego). */
export function carrilDeAltura(y) {
  // cada carril se ve un poco arriba de su linea de flotacion (las cosas flotan encima)
  let mejor = 0;
  for (let i = 1; i < CARRILES.length; i++) if (Math.abs(y - (CARRILES[i] - 8)) < Math.abs(y - (CARRILES[mejor] - 8))) mejor = i;
  return mejor;
}

/**
 * opts: arte, sprite(ojo, boca), cambiarCara, sonar, vibrar, noche,
 *       alTerminar({ puntos (metros), faroles, record, nuevoRecord, dificultad }), alSalir() (volvio sin jugar)
 */
export function iniciarBote(contenedor, opts) {
  const { arte, sprite, cambiarCara, noche = false, sonar = () => {}, vibrar = () => {}, alTerminar = () => {}, alSalir = () => {} } = opts;
  let dif = leerDificultadDe(CLAVE);
  let D = DIFICULTADES_BOTE[dif];
  const momento = noche ? "noche" : "dia";
  contenedor.innerHTML = `
    <div class="pantalla-juego pantalla-bote ${noche ? "de-noche" : ""}" id="area-bote">
      ${HTML_VOLVER}
      <div class="juego-hud">
        <span class="juego-chip bote-chip-farol"><img src="${arte("juegos/farol.png")}" alt="" draggable="false" /><b id="bote-faroles">0</b></span>
        <span class="juego-corazones" id="bote-corazones">${"<i></i>".repeat(CORAZONES)}</span>
        <span class="juego-chip bote-metros" id="bote-metros">0 m</span>
      </div>
      <div class="juego-record" id="bote-record">BOAT RIDE</div>
      <div class="bote-personaje" id="bote-personaje">${sprite("ojo_base_energia_alta.png", "boca_base_feliz.png")}</div>
      <div class="juego-cielo" id="bote-capa"></div>
      <div class="pista-minijuego" id="bote-pista">Tap the lane you want to row to · collect the lanterns · dodge the lotus</div>
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
    cosas: [], // { tipo: farol|oro|loto, carril, x, hecha, cruzo }
    olas: [],
    recorrido: 0, // px
    proxima: 140,
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
  const carrilCercano = () => carrilDeAltura(st.y - 8);
  const enSuCarril = () => Math.abs(st.y - CARRILES[st.carril]) < 6;

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
    }, 6000);
  });

  cablearVolver(contenedor, () => {
    if (!st.vivo) return;
    if (st.estado === "eligiendo") alSalir();
    else terminar();
  });

  /** Al carril n (tocando el agua: directo; con las flechas: de a uno). */
  function irA(n) {
    if (st.estado !== "remando") return;
    n = Math.max(0, Math.min(CARRILES.length - 1, n));
    if (n === st.carril) return;
    st.carril = n;
    sonar("tocar");
    vibrar(8);
  }

  area.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    e.preventDefault();
    const r = area.getBoundingClientRect();
    irA(carrilDeAltura((e.clientY - r.top) / fondo.escala));
  });
  const teclas = (e) => {
    if (e.key === "ArrowUp") irA(st.carril - 1);
    if (e.key === "ArrowDown") irA(st.carril + 1);
  };
  window.addEventListener("keydown", teclas);

  // ---- lo que aparece: filas, con agua libre entre una y otra ----
  const farol = () => (Math.random() < D.oro ? "oro" : "farol");

  /** Pone una fila a partir de x. Devuelve lo que ocupa a lo largo (para la proxima). */
  function aparecer(x) {
    const orden = [0, 1, 2].sort(() => Math.random() - 0.5);
    const r = Math.random();
    if (r < 0.3) {
      // una tira de farolitos en un carril
      const n = 2 + Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) st.cosas.push({ tipo: farol(), carril: orden[0], x: x + k * PASO_FAROLES });
      return (n - 1) * PASO_FAROLES;
    }
    if (r < 0.65) {
      // un loto, y a veces un farolito en otro carril
      st.cosas.push({ tipo: "loto", carril: orden[0], x });
      if (Math.random() < 0.6) st.cosas.push({ tipo: farol(), carril: orden[1], x });
      return 0;
    }
    // dos lotos: el carril libre suele traer el premio
    st.cosas.push({ tipo: "loto", carril: orden[0], x });
    st.cosas.push({ tipo: "loto", carril: orden[1], x });
    if (Math.random() < 0.75) st.cosas.push({ tipo: farol(), carril: orden[2], x });
    return 0;
  }

  /**
   * Cuanta agua dejar hasta la proxima fila. Un loto que ya paso la proa no
   * pega mas, asi que alcanza con el respiro (que crece con la velocidad):
   * siempre da para llegar al carril libre de la fila que viene.
   */
  const distanciaHastaLaProxima = (largo, v) => largo + 2 * ANCHO_LOTO + 16 + v * D.respiro * (1 + Math.random() * 0.6);

  function chocar(c) {
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
  }

  function juntar(c) {
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
    st.y += (CARRILES[st.carril] - st.y) * Math.min(1, dt * 12);
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
        const largo = aparecer(W + 16);
        st.proxima = distanciaHastaLaProxima(largo, v);
      }
      for (const c of st.cosas) c.x -= v * dt;
      const cerca = carrilCercano();
      for (const c of st.cosas) {
        if (c.hecha) continue;
        if (c.tipo === "loto") {
          // pega solo de frente: cuando cruza la proa, si el bote ya esta en ese carril
          if (!c.cruzo && c.x - ANCHO_LOTO <= PROA) {
            c.cruzo = true;
            if (c.carril === st.carril && enSuCarril()) chocar(c);
          }
        } else if (c.carril === cerca && c.x > CASCO[0] && c.x < CASCO[1] + 6) {
          juntar(c);
        }
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
      // su reflejo en el agua: ayuda a ver en que carril flota
      m.fillStyle = noche ? "rgba(255,190,110,0.35)" : "rgba(255,240,200,0.45)";
      m.fillRect(x - 5, wl + 1, 10, 1);
      const i = c.tipo === "oro" ? img.oro : img.farol;
      if (lista(i)) m.drawImage(i, x - 12, wl - 23 + vaiven);
    }
  }

  /** Las sogas con boyas entre carril y carril (corren con el agua). */
  function dibujarBoyas(m) {
    const soga = noche ? "rgba(150,170,220,0.35)" : "rgba(30,70,96,0.28)";
    const desde = -((st.recorrido * 0.95) % 44);
    for (const y of BOYAS) {
      m.fillStyle = soga;
      for (let x = Math.round(desde); x < fondo.W; x += 4) m.fillRect(x, y, 2, 1);
      for (let x = Math.round(desde); x < fondo.W; x += 44) {
        const roja = Math.round((x - desde) / 44 + y) % 2 === 0;
        m.fillStyle = "rgb(30,28,30)";
        m.fillRect(x - 2, y - 2, 5, 4);
        m.fillStyle = roja ? "rgb(214,72,72)" : "rgb(244,238,226)";
        m.fillRect(x - 1, y - 1, 3, 2);
        m.fillStyle = noche ? "rgba(150,170,220,0.4)" : "rgba(255,255,255,0.45)";
        m.fillRect(x - 1, y + 2, 3, 1);
      }
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
    dibujarBoyas(a);
    // el bote, su carril y lo de los otros carriles (lo de mas abajo va adelante)
    const carrilBote = carrilCercano();
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
    _remar: (dir) => irA(st.carril + dir),
    _ir: (n) => irA(n),
    _estado: () => ({ estado: st.estado, carril: st.carril, y: st.y, faroles: st.faroles, corazones: st.corazones, metros: Math.floor(st.recorrido * METROS_POR_PX), cosas: st.cosas.length, lotos: st.cosas.filter((c) => c.tipo === "loto").map((c) => ({ carril: c.carril, x: Math.round(c.x) })) }),
  };
}
