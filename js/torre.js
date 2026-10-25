/**
 * torre.js
 * =========
 * v29: STEAMER STACK, minijuego de la tele. Una vaporera de bambu va y
 * viene arriba de la torre; tocar la suelta. Lo que queda afuera de la de
 * abajo se corta y se cae, asi que la torre se va angostando. Si cae
 * justa (PERFECT) no se corta nada, y tres PERFECT seguidos la agrandan un
 * poquito. Si no toca nada de la de abajo, se cae y termina.
 *
 *   cada piso +1 · PERFECT +2
 *
 * Record por dificultad (EASY / NORMAL / HARD: lo rapido que va y cuanto
 * perdona el PERFECT).
 */
import { leerRecordDe, guardarRecordDe, leerDificultadDe, htmlDificultad, cablearDificultad, lienzoPixel, flotante, HTML_VOLVER, cablearVolver, crearPausa } from "./juegoComun.js";

const CLAVE = "baozi_record_torre";
const ALTO = 195; // pixeles de arte de alto (en un telefono, ~2 px de pantalla cada uno)
const MESA = 181; // donde apoya el primer piso
const TH = 16; // alto de un piso

export const DIFICULTADES_TORRE = {
  easy: { v0: 58, dv: 3, vmax: 120, tol: 4, base: 78 },
  normal: { v0: 76, dv: 4, vmax: 160, tol: 3, base: 70 },
  hard: { v0: 100, dv: 5, vmax: 200, tol: 2, base: 62 },
};

export const leerRecordTorre = (dif = null) => leerRecordDe(CLAVE, dif);

const C = {
  borde: "rgb(82,56,32)",
  claro: "rgb(232,196,128)",
  bambu: "rgb(214,170,96)",
  aro: "rgb(176,128,64)",
  aroLuz: "rgb(204,158,88)",
  bao: "rgb(250,246,236)",
  baoSombra: "rgb(226,218,202)",
  mesa: "rgb(96,62,40)",
  mesaLuz: "rgb(128,86,56)",
  mesaOsc: "rgb(70,44,28)",
};

function piso(ctx, x, y, w, alfa = 1) {
  x = Math.round(x);
  y = Math.round(y);
  w = Math.max(1, Math.round(w));
  ctx.globalAlpha = alfa;
  ctx.fillStyle = C.borde;
  ctx.fillRect(x, y, w, TH);
  if (w > 2) {
    ctx.fillStyle = C.claro;
    ctx.fillRect(x + 1, y + 1, w - 2, TH - 2);
    ctx.fillStyle = C.bambu;
    for (let i = x + 3; i < x + w - 2; i += 4) ctx.fillRect(i, y + 4, 1, TH - 8);
    ctx.fillStyle = C.aro;
    ctx.fillRect(x + 1, y + 1, w - 2, 3);
    ctx.fillRect(x + 1, y + TH - 4, w - 2, 3);
    ctx.fillStyle = C.aroLuz;
    ctx.fillRect(x + 1, y + 1, w - 2, 1);
    ctx.fillRect(x + 1, y + TH - 4, w - 2, 1);
  }
  ctx.clearRect(x, y, 1, 1);
  ctx.clearRect(x + w - 1, y, 1, 1);
  ctx.globalAlpha = 1;
}

function baos(ctx, x, y, w, t) {
  const n = Math.max(1, Math.floor((w - 6) / 15));
  const paso = w / n;
  for (let k = 0; k < n; k++) {
    const cx = Math.round(x + paso * (k + 0.5));
    const filas = [2, 4, 5, 5];
    filas.forEach((a, j) => {
      ctx.fillStyle = j === 0 ? C.baoSombra : C.bao;
      ctx.fillRect(cx - a, y - 4 + j, a * 2 + 1, 1);
    });
    ctx.fillStyle = C.baoSombra;
    ctx.fillRect(cx, y - 4, 1, 1);
    // vapor
    if (k % 2 === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      for (let j = 0; j < 6; j++) {
        const fase = Math.floor(t / 180 + j + k) % 2;
        ctx.fillRect(cx + (fase ? 1 : -1), y - 7 - j * 2 - (Math.floor(t / 300) % 2), 1, 1);
      }
    }
  }
}

/**
 * opts: arte, sprite(ojo, boca), cambiarCara(el, ojo, boca), sonar, vibrar,
 *       alTerminar({ puntos, pisos, record, nuevoRecord, dificultad }), alSalir() (volvio sin jugar)
 */
export function iniciarTorre(contenedor, opts) {
  const { sprite, cambiarCara, sonar = () => {}, vibrar = () => {}, alTerminar = () => {}, alSalir = () => {} } = opts;
  let dif = leerDificultadDe(CLAVE);
  let D = DIFICULTADES_TORRE[dif];
  contenedor.innerHTML = `
    <div class="pantalla-juego pantalla-torre con-cuarto" id="area-torre">
      ${HTML_VOLVER}
      <div class="juego-hud">
        <span class="juego-chip" id="torre-puntos">0</span>
        <span class="juego-chip juego-combo oculto" id="torre-combo">PERFECT x2</span>
      </div>
      <div class="juego-record" id="torre-record">STEAMER STACK</div>
      <div class="juego-personaje torre-personaje" id="torre-personaje">${sprite("ojo_base_energia_alta.png", "boca_base_feliz.png")}</div>
      <div class="juego-cielo" id="torre-capa"></div>
      <div class="pista-minijuego" id="torre-pista">Tap to drop the steamer · line it up!</div>
      ${htmlDificultad("STEAMER STACK", CLAVE, dif)}
    </div>`;
  const $ = (id) => contenedor.querySelector(`#${id}`);
  const area = $("area-torre");
  const L = lienzoPixel(area, ALTO, "juego-lienzo torre-lienzo");
  const ctx = L.ctx;

  const st = {
    estado: "eligiendo", // eligiendo | moviendo | cayendo | fin
    pisos: [], // { x, w } de abajo para arriba
    mov: null, // { x, w, dir, v }
    pedazos: [], // { x, y, w, vy, vx, alfa }
    puntos: 0,
    seguidos: 0,
    cam: 0,
    camObj: 0,
    t0: 0,
    caraHasta: 0,
    vivo: true,
  };
  const cx = () => L.W / 2;
  // F33: segundo plano / vertical -> la vaporera se queda quieta hasta que toque
  const pausa = crearPausa(area, { activa: () => st.vivo && (st.estado === "moviendo" || st.estado === "cayendo") });

  function cara(ojo, boca, ms = 600) {
    const el = contenedor.querySelector("#torre-personaje .sprite-cara");
    if (el) cambiarCara(el, ojo, boca);
    st.caraHasta = performance.now() + ms;
  }

  function nuevoMovil() {
    const arriba = st.pisos[st.pisos.length - 1];
    const n = st.pisos.length;
    const desdeIzq = n % 2 === 1;
    const amp = Math.min(L.W / 2 - 10, 110);
    st.mov = {
      w: arriba.w,
      x: desdeIzq ? cx() - amp - arriba.w / 2 : cx() + amp - arriba.w / 2,
      dir: desdeIzq ? 1 : -1,
      v: Math.min(D.vmax, D.v0 + (n - 1) * D.dv),
      min: cx() - amp - arriba.w / 2,
      max: cx() + amp - arriba.w / 2,
    };
    st.estado = "moviendo";
  }

  function empezar(d) {
    dif = d;
    D = DIFICULTADES_TORRE[dif];
    $("torre-record").textContent = `${dif.toUpperCase()} · BEST ${leerRecordTorre(dif)}`;
    st.pisos = [{ x: cx() - D.base / 2, w: D.base }];
    st.t0 = performance.now();
    sonar("tocar");
    nuevoMovil();
  }
  cablearDificultad(contenedor, CLAVE, empezar);
  cablearVolver(contenedor, () => {
    if (!st.vivo) return;
    if (st.estado === "eligiendo") alSalir();
    else terminar();
  });

  function soltar() {
    if (st.estado !== "moviendo" || pausa.pausado()) return;
    const m = st.mov;
    const abajo = st.pisos[st.pisos.length - 1];
    const izq = Math.max(m.x, abajo.x);
    const der = Math.min(m.x + m.w, abajo.x + abajo.w);
    const encima = der - izq;
    const yMundo = MESA - (st.pisos.length + 1) * TH;
    if (encima < 1) {
      // no toca nada: se cae entera
      st.pedazos.push({ x: m.x, y: yMundo, w: m.w, vy: 0, vx: m.dir * 20, alfa: 1 });
      st.mov = null;
      st.estado = "fin";
      sonar("no");
      vibrar([30, 40, 30]);
      cara("ojo_especial_decepcionado.png", "boca_especial_decepcionado.png", 99999);
      flotante($("torre-capa"), "Oops!", 50, 30, "mal");
      setTimeout(terminar, 1400);
      return;
    }
    const xPct = ((izq + encima / 2) / L.W) * 100;
    const yPct = ((yMundo + st.cam) / ALTO) * 100 - 8;
    if (Math.abs(m.x - abajo.x) <= D.tol) {
      st.seguidos += 1;
      let w = abajo.w;
      let x = abajo.x;
      if (st.seguidos >= 3 && st.seguidos % 3 === 0 && w < D.base) {
        x -= 2;
        w = Math.min(D.base, w + 4);
      }
      st.pisos.push({ x, w });
      st.puntos += 2;
      sonar("atrapar");
      vibrar(25);
      cara("ojo_especial_euforico.png", "boca_especial_euforico.png", 700);
      flotante($("torre-capa"), st.seguidos >= 2 ? `PERFECT x${st.seguidos}` : "PERFECT!", xPct, yPct, "oro");
    } else {
      st.seguidos = 0;
      if (m.x < abajo.x) st.pedazos.push({ x: m.x, y: yMundo, w: abajo.x - m.x, vy: 0, vx: -25, alfa: 1 });
      else st.pedazos.push({ x: abajo.x + abajo.w, y: yMundo, w: m.x + m.w - (abajo.x + abajo.w), vy: 0, vx: 25, alfa: 1 });
      st.pisos.push({ x: Math.round(izq), w: Math.max(1, Math.round(encima)) });
      st.puntos += 1;
      sonar("tocar");
      vibrar(12);
      if (encima < abajo.w * 0.6) cara("ojo_especial_sorprendido.png", "boca_especial_sorprendido.png", 500);
      flotante($("torre-capa"), "+1", xPct, yPct);
    }
    pintarHud();
    if (st.pisos.length >= 4) {
      const p = $("torre-pista");
      if (p) p.classList.add("oculto");
    }
    nuevoMovil();
  }

  function pintarHud() {
    $("torre-puntos").textContent = String(st.puntos);
    const c = $("torre-combo");
    c.textContent = `PERFECT x${st.seguidos}`;
    c.classList.toggle("oculto", st.seguidos < 2);
  }

  area.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    e.preventDefault();
    soltar();
  });
  const teclas = (e) => {
    if (e.key === " " || e.key === "Enter") soltar();
  };
  window.addEventListener("keydown", teclas);

  // ---- el bucle ----
  let ultimo = 0;
  function cuadro(t) {
    if (!st.vivo) return;
    requestAnimationFrame(cuadro);
    if (pausa.pausado()) {
      ultimo = 0;
      return;
    }
    const dt = Math.min(50, t - (ultimo || t)) / 1000;
    ultimo = t;
    if (st.caraHasta && t > st.caraHasta) {
      st.caraHasta = 0;
      const el = contenedor.querySelector("#torre-personaje .sprite-cara");
      if (el) cambiarCara(el, "ojo_base_energia_alta.png", "boca_base_feliz.png");
    }
    if (st.estado === "moviendo" && st.mov) {
      const m = st.mov;
      m.x += m.dir * m.v * dt;
      if (m.x > m.max) {
        m.x = m.max;
        m.dir = -1;
      } else if (m.x < m.min) {
        m.x = m.min;
        m.dir = 1;
      }
    }
    for (const p of st.pedazos) {
      p.vy += 420 * dt;
      p.y += p.vy * dt;
      p.x += p.vx * dt;
      p.alfa = Math.max(0, p.alfa - dt * 0.8);
    }
    st.pedazos = st.pedazos.filter((p) => p.alfa > 0 && p.y + st.cam < ALTO + 40);
    // camara: que la punta de la torre quede a ~90 px del techo
    const punta = MESA - (st.pisos.length + 1) * TH;
    st.camObj = Math.max(0, 70 - punta);
    st.cam += (st.camObj - st.cam) * Math.min(1, dt * 5);
    dibujar(t);
  }

  function dibujar(t) {
    if (L.lienzo.width !== L.W) L.medir();
    ctx.clearRect(0, 0, L.W, ALTO);
    const cam = Math.round(st.cam);
    // la mesa
    const mx = Math.round(cx() - 95);
    ctx.fillStyle = C.mesa;
    ctx.fillRect(mx, MESA + cam, 190, ALTO);
    ctx.fillStyle = C.mesaLuz;
    ctx.fillRect(mx, MESA + cam, 190, 2);
    ctx.fillStyle = C.mesaOsc;
    ctx.fillRect(mx, MESA + cam + 2, 190, 1);
    st.pisos.forEach((p, i) => piso(ctx, p.x, MESA - (i + 1) * TH + cam, p.w));
    const arriba = st.pisos[st.pisos.length - 1];
    if (arriba && st.estado !== "eligiendo") baos(ctx, arriba.x, MESA - st.pisos.length * TH + cam, arriba.w, t);
    if (st.mov) {
      const y = MESA - (st.pisos.length + 1) * TH + cam - 10;
      piso(ctx, st.mov.x, y, st.mov.w);
      // guias: donde caeria
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      for (let yy = y + TH; yy < y + TH + 10; yy += 3) {
        ctx.fillRect(Math.round(st.mov.x), yy, 1, 1);
        ctx.fillRect(Math.round(st.mov.x + st.mov.w - 1), yy, 1, 1);
      }
    }
    for (const p of st.pedazos) piso(ctx, p.x, p.y + cam, p.w, p.alfa);
  }
  requestAnimationFrame(cuadro);

  function terminar() {
    if (!st.vivo) return;
    st.vivo = false;
    pausa.destruir();
    window.removeEventListener("keydown", teclas);
    window.removeEventListener("resize", L.medir);
    const record = leerRecordTorre(dif);
    const nuevoRecord = st.puntos > record;
    if (nuevoRecord) guardarRecordDe(CLAVE, dif, st.puntos);
    alTerminar({ puntos: st.puntos, pisos: Math.max(0, st.pisos.length - 1), record: Math.max(record, st.puntos), nuevoRecord, dificultad: dif });
  }
  window.addEventListener("resize", L.medir);

  return {
    terminar,
    destruir: () => {
      st.vivo = false;
      pausa.destruir();
      window.removeEventListener("keydown", teclas);
      window.removeEventListener("resize", L.medir);
    },
    // para las pruebas: poner la que se mueve justo encima (o corrida) y soltar
    _soltarCorrida: (corrida = 0) => {
      if (st.estado !== "moviendo") return false;
      st.mov.x = st.pisos[st.pisos.length - 1].x + corrida;
      soltar();
      return true;
    },
    _estado: () => ({ estado: st.estado, puntos: st.puntos, pisos: st.pisos.map((p) => ({ ...p })), seguidos: st.seguidos, mov: st.mov ? { x: st.mov.x, w: st.mov.w } : null }),
  };
}
