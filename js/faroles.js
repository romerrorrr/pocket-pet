/**
 * faroles.js
 * ==========
 * v54: LANTERNS ON THE LAKE, un juego de la tele, tranquilo. De noche en el
 * West Lake: ella guia su farol arrastrando el dedo y junta los faroles que
 * flotan sueltos (cada uno trae un deseo cortito). Los botes y las hojas de
 * loto le apagan la llamita un momento y le hacen perder dos faroles. Hay
 * faroles dorados que valen 5. Dura 60 s.
 *
 * El fondo es el lago de noche de la pesca (assets/pesca/fondo_noche.png).
 */

import { HTML_VOLVER, cablearVolver, crearPausa, blindarToques, htmlDificultad, cablearDificultad, leerDificultadDe, leerRecordDe, guardarRecordDe, lienzoPixel, imagen, lista } from "./juegoComun.js";

const CLAVE = "baozi_record_faroles";
const ALTO = 160;
const DURACION_MS = 60000;
export const DIFICULTADES_FAROLES = {
  easy: { botes: 1, hojas: 2, vel: 0.8 },
  normal: { botes: 2, hojas: 3, vel: 1 },
  hard: { botes: 3, hojas: 4, vel: 1.3 },
};
export const leerRecordFaroles = (dif = null) => leerRecordDe(CLAVE, dif);

export const DESEOS = [
  "“More walks by the lake.”",
  "“Dumplings every Sunday.”",
  "“A trip to Colombia, together.”",
  "“That Baozi never stops smiling.”",
  "“Good tea and slow mornings.”",
  "“Lots of photos of us.”",
  "“A little garden on our balcony.”",
  "“To dance in the kitchen.”",
  "“That Grandma is proud of us.”",
  "“Rain on the window and a movie.”",
  "“To always find our way home.”",
  "“A cat. Or two.”",
];

const AGUA_Y = 64; // donde empieza el agua en el fondo (160 de alto)

/**
 * opts: arte, sprite, cambiarCara, sonar, vibrar,
 *       alTerminar({ puntos, faroles, record, nuevoRecord, dificultad }), alSalir()
 */
export function iniciarFaroles(contenedor, opts) {
  const { arte, sprite, sonar = () => {}, vibrar = () => {}, alTerminar = () => {}, alSalir = () => {} } = opts;
  let dif = leerDificultadDe(CLAVE);
  let D = DIFICULTADES_FAROLES[dif];
  contenedor.innerHTML = `
    <div class="pantalla-juego pantalla-faroles" id="area-faroles">
      ${HTML_VOLVER}
      <div class="juego-hud">
        <span class="juego-chip" id="far-puntos">0</span>
        <span class="juego-chip" id="far-tiempo">60</span>
      </div>
      <div class="juego-record" id="far-record">LANTERNS ON THE LAKE</div>
      <div class="far-deseo oculto" id="far-deseo"></div>
      <div class="pista-minijuego" id="far-pista">Drag to guide your lantern · gather the others · don't bump the boats</div>
      ${htmlDificultad("LANTERNS ON THE LAKE", CLAVE, dif)}
    </div>`;
  const $ = (id) => contenedor.querySelector(`#${id}`);
  const area = $("area-faroles");
  blindarToques(area);
  const L = lienzoPixel(area, ALTO, "juego-lienzo faroles-lienzo");
  const ctx = L.ctx;
  const fondo = imagen(arte("pesca/fondo_noche.png"));

  const st = {
    estado: "eligiendo", // eligiendo | jugando | fin
    yo: { x: 60, y: 120, tx: 60, ty: 120, apagado: 0 },
    sueltos: [], // { x, y, vx, fase, oro }
    botes: [], // { x, y, v, w }
    hojas: [], // { x, y, r, vx }
    chispas: [], // { x, y, vy, vida }
    puntos: 0,
    juntados: 0,
    t0: 0,
    proximo: 0,
    vivo: true,
    raf: 0,
    deseos: [...DESEOS].sort(() => Math.random() - 0.5),
  };
  const pausa = crearPausa(area, { activa: () => st.vivo && st.estado === "jugando" });

  cablearVolver(contenedor, () => {
    if (!st.vivo) return;
    if (st.estado === "eligiendo") alSalir();
    else terminar();
  });
  cablearDificultad(contenedor, CLAVE, (d) => {
    dif = d;
    D = DIFICULTADES_FAROLES[dif];
    $("far-record").textContent = `${dif.toUpperCase()} · BEST ${leerRecordFaroles(dif)}`;
    empezar();
  });

  function empezar() {
    L.medir();
    st.estado = "jugando";
    st.t0 = pausa.ahora();
    st.yo = { x: L.W * 0.2, y: 128, tx: L.W * 0.2, ty: 128, apagado: 0 };
    st.botes = Array.from({ length: D.botes }, (_, i) => ({ x: Math.random() * L.W, y: 84 + i * 24 + Math.random() * 6, v: (Math.random() < 0.5 ? -1 : 1) * (12 + Math.random() * 10) * D.vel, w: 30 }));
    st.hojas = Array.from({ length: D.hojas }, () => ({ x: Math.random() * L.W, y: 78 + Math.random() * 74, r: 6 + Math.random() * 3, vx: (Math.random() - 0.5) * 4 }));
    for (let i = 0; i < 5; i++) soltarUno(true);
    sonar("tocar");
    setTimeout(() => {
      const p = $("far-pista");
      if (p) p.classList.add("oculto");
    }, 5000);
  }

  function soltarUno(alInicio = false) {
    const oro = Math.random() < 0.1;
    st.sueltos.push({ x: alInicio ? 30 + Math.random() * (L.W - 60) : Math.random() < 0.5 ? -8 : L.W + 8, y: AGUA_Y + 12 + Math.random() * (ALTO - AGUA_Y - 22), vx: (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 5), fase: Math.random() * 6.28, oro });
  }

  // el dedo: el farol va hacia donde esta el dedo (suave)
  function aMundo(e) {
    const r = L.lienzo.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * L.W, ((e.clientY - r.top) / r.height) * ALTO];
  }
  const mover = (e) => {
    if (st.estado !== "jugando") return;
    const [x, y] = aMundo(e);
    st.yo.tx = Math.max(6, Math.min(L.W - 6, x));
    st.yo.ty = Math.max(AGUA_Y + 6, Math.min(ALTO - 6, y));
  };
  area.addEventListener("pointerdown", mover);
  area.addEventListener("pointermove", (e) => {
    if (e.buttons || e.pointerType === "touch") mover(e);
  });

  function deseo() {
    const t = st.deseos[st.juntados % st.deseos.length];
    const el = $("far-deseo");
    if (!el) return;
    el.textContent = t;
    el.classList.remove("oculto");
    clearTimeout(deseo.t);
    deseo.t = setTimeout(() => el && el.classList.add("oculto"), 1800);
  }

  // ---- dibujar ----
  function farol(x, y, t, { oro = false, apagado = false, grande = false } = {}) {
    const s = grande ? 1.3 : 1;
    const w = Math.round(9 * s);
    const h = Math.round(11 * s);
    const bx = Math.round(x - w / 2);
    const by = Math.round(y - h + Math.sin(t / 500 + x) * 1);
    const luz = apagado ? 0.15 : 0.9 + 0.1 * Math.sin(t / 180 + x);
    // el reflejo en el agua
    ctx.globalAlpha = 0.25 * luz;
    ctx.fillStyle = oro ? "rgb(255,220,120)" : "rgb(255,170,100)";
    for (let k = 0; k < 4; k++) ctx.fillRect(bx + 1 - (k % 2), by + h + 2 + k * 2, w - 2 + (k % 2) * 2, 1);
    // el resplandor
    ctx.globalAlpha = 0.18 * luz;
    ctx.beginPath();
    ctx.arc(x, by + h / 2, 14 * s, 0, 6.29);
    ctx.fill();
    ctx.globalAlpha = 1;
    // el farol
    ctx.fillStyle = "rgb(70,30,30)";
    ctx.fillRect(bx, by - 1, w, 1);
    ctx.fillRect(bx, by + h, w, 1);
    ctx.fillStyle = apagado ? "rgb(120,80,70)" : oro ? "rgb(250,200,70)" : "rgb(220,70,60)";
    ctx.fillRect(bx, by, w, h);
    ctx.fillStyle = apagado ? "rgb(150,110,90)" : oro ? "rgb(255,246,200)" : "rgb(255,214,140)";
    ctx.fillRect(bx + 2, by + 2, w - 4, h - 4);
    ctx.fillStyle = apagado ? "rgb(100,70,60)" : oro ? "rgb(220,160,40)" : "rgb(180,50,46)";
    ctx.fillRect(bx + w - 2, by + 1, 1, h - 2);
    // la base flotante
    ctx.fillStyle = "rgb(110,72,50)";
    ctx.fillRect(bx - 1, by + h + 1, w + 2, 1);
  }

  function bote(b, t) {
    const x = Math.round(b.x);
    const y = Math.round(b.y + Math.sin(t / 600 + b.x / 30));
    const izq = b.v < 0;
    ctx.fillStyle = "rgb(40,30,34)";
    ctx.fillRect(x - b.w / 2, y, b.w, 4);
    ctx.fillRect(x - b.w / 2 + 2, y + 4, b.w - 4, 2);
    ctx.fillStyle = "rgb(90,60,44)";
    ctx.fillRect(x - b.w / 2 + 1, y + 1, b.w - 2, 2);
    // el toldo del bote de West Lake
    ctx.fillStyle = "rgb(30,26,36)";
    ctx.fillRect(x - 7, y - 6, 14, 6);
    ctx.fillStyle = "rgb(60,56,80)";
    ctx.fillRect(x - 6, y - 5, 12, 4);
    // la lucecita del bote
    ctx.fillStyle = "rgb(255,220,140)";
    ctx.fillRect(x + (izq ? -b.w / 2 + 2 : b.w / 2 - 3), y - 3, 1, 2);
    // la estela
    ctx.fillStyle = "rgba(180,200,240,0.4)";
    ctx.fillRect(izq ? x + b.w / 2 : x - b.w / 2 - 6, y + 5, 6, 1);
  }

  function hoja(h) {
    const x = Math.round(h.x);
    const y = Math.round(h.y);
    ctx.fillStyle = "rgb(30,60,40)";
    ctx.beginPath();
    ctx.ellipse(x, y, h.r + 1, (h.r + 1) / 2.2, 0, 0, 6.29);
    ctx.fill();
    ctx.fillStyle = "rgb(60,110,70)";
    ctx.beginPath();
    ctx.ellipse(x, y, h.r, h.r / 2.2, 0, 0, 6.29);
    ctx.fill();
    ctx.fillStyle = "rgb(30,60,40)";
    ctx.fillRect(x, y - 1, Math.round(h.r), 1);
  }

  function cuadro() {
    if (!st.vivo) return;
    st.raf = requestAnimationFrame(cuadro);
    if (pausa.pausado()) return;
    const ahora = pausa.ahora();
    const dt = Math.min(0.05, (ahora - (cuadro.prev || ahora)) / 1000);
    cuadro.prev = ahora;
    L.medir();
    // el fondo, cubriendo el ancho (pegado abajo)
    ctx.fillStyle = "rgb(16,18,40)";
    ctx.fillRect(0, 0, L.W, ALTO);
    if (lista(fondo)) {
      const k = Math.max(L.W / fondo.naturalWidth, ALTO / fondo.naturalHeight);
      const w = fondo.naturalWidth * k;
      ctx.drawImage(fondo, (L.W - w) / 2, ALTO - fondo.naturalHeight * k, w, fondo.naturalHeight * k);
    }
    ctx.fillStyle = "rgba(10,10,30,0.25)";
    ctx.fillRect(0, 0, L.W, ALTO);

    if (st.estado === "jugando") {
      const t = ahora - st.t0;
      const resta = Math.max(0, DURACION_MS - t);
      const s = Math.ceil(resta / 1000);
      const el = $("far-tiempo");
      if (el && el.textContent !== String(s)) el.textContent = String(s);
      // mi farol sigue al dedo
      const yo = st.yo;
      yo.x += (yo.tx - yo.x) * Math.min(1, dt * 5);
      yo.y += (yo.ty - yo.y) * Math.min(1, dt * 5);
      if (yo.apagado > 0) yo.apagado -= dt;
      // los sueltos
      if (t > st.proximo && st.sueltos.length < 8) {
        soltarUno();
        st.proximo = t + 1100 + Math.random() * 900;
      }
      for (const f of st.sueltos) {
        f.x += f.vx * dt * D.vel;
        f.fase += dt;
        f.y += Math.sin(f.fase) * 3 * dt;
      }
      st.sueltos = st.sueltos.filter((f) => f.x > -20 && f.x < L.W + 20);
      // juntar
      if (yo.apagado <= 0) {
        for (const f of st.sueltos) {
          if (Math.hypot(f.x - yo.x, f.y - yo.y) < 14) {
            f.juntado = true;
            const n = f.oro ? 5 : 1;
            st.puntos += n;
            st.juntados += 1;
            for (let k = 0; k < 6; k++) st.chispas.push({ x: f.x, y: f.y - 6, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 20, vida: 0.6 });
            sonar(f.oro ? "hallazgo" : "tocar");
            vibrar(f.oro ? [15, 30, 15] : 10);
            if (f.oro || st.juntados % 3 === 1) deseo();
          }
        }
        st.sueltos = st.sueltos.filter((f) => !f.juntado);
      }
      // los botes y las hojas
      for (const b of st.botes) {
        b.x += b.v * dt;
        if (b.x < -b.w) b.x = L.W + b.w;
        if (b.x > L.W + b.w) b.x = -b.w;
      }
      for (const h of st.hojas) {
        h.x += h.vx * dt;
        if (h.x < -10) h.x = L.W + 10;
        if (h.x > L.W + 10) h.x = -10;
      }
      if (yo.apagado <= 0) {
        const choca = st.botes.some((b) => Math.abs(b.x - yo.x) < b.w / 2 + 2 && yo.y > b.y - 6 && yo.y < b.y + 10) || st.hojas.some((h) => Math.hypot((h.x - yo.x) / 1, (h.y - yo.y) * 2) < h.r + 2);
        if (choca) {
          yo.apagado = 1.4;
          st.puntos = Math.max(0, st.puntos - 2);
          sonar("no");
          vibrar(40);
        }
      }
      $("far-puntos").textContent = st.puntos;
      if (resta <= 0) terminar();
    }

    // dibujar (de atras para adelante)
    const tt = ahora;
    const cosas = [
      ...st.hojas.map((h) => ({ y: h.y, f: () => hoja(h) })),
      ...st.botes.map((b) => ({ y: b.y + 4, f: () => bote(b, tt) })),
      ...st.sueltos.map((f) => ({ y: f.y, f: () => farol(f.x, f.y, tt, { oro: f.oro }) })),
    ];
    if (st.estado !== "eligiendo")
      cosas.push({
        y: st.yo.y,
        f: () => {
          farol(st.yo.x, st.yo.y, tt, { grande: true, apagado: st.yo.apagado > 0 && Math.floor(st.yo.apagado * 8) % 2 === 0 });
          // un corazoncito arriba: este es el de ella
          const hx = Math.round(st.yo.x) - 2;
          const hy = Math.round(st.yo.y) - 24 + (Math.floor(tt / 400) % 2);
          ctx.fillStyle = "rgb(246,150,180)";
          [[0, 0], [1, 0], [3, 0], [4, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [1, 2], [2, 2], [3, 2], [2, 3]].forEach(([dx, dy]) => ctx.fillRect(hx + dx, hy + dy, 1, 1));
        },
      });
    cosas.sort((a, b) => a.y - b.y).forEach((c) => c.f());
    for (const c of st.chispas) {
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vida -= dt;
      ctx.fillStyle = `rgba(255,220,140,${Math.max(0, c.vida * 1.6)})`;
      ctx.fillRect(Math.round(c.x), Math.round(c.y), 1, 1);
    }
    st.chispas = st.chispas.filter((c) => c.vida > 0);
  }
  st.raf = requestAnimationFrame(cuadro);

  function terminar() {
    if (st.estado === "fin" || !st.vivo) return;
    st.estado = "fin";
    const record = leerRecordFaroles(dif);
    const nuevoRecord = st.puntos > record;
    if (nuevoRecord) guardarRecordDe(CLAVE, dif, st.puntos);
    setTimeout(() => {
      if (!st.vivo) return;
      alTerminar({ puntos: st.puntos, faroles: st.juntados, record: Math.max(record, st.puntos), nuevoRecord, dificultad: dif });
    }, 900);
  }

  return {
    destruir() {
      st.vivo = false;
      cancelAnimationFrame(st.raf);
      pausa.destruir();
    },
    terminar,
    _estado: () => ({ estado: st.estado, puntos: st.puntos, juntados: st.juntados, sueltos: st.sueltos.length }),
    // para las pruebas: lleva el farol encima del suelto mas cercano
    _irAlMasCercano() {
      const f = st.sueltos[0];
      if (!f) return false;
      st.yo.x = st.yo.tx = f.x;
      st.yo.y = st.yo.ty = f.y;
      st.yo.apagado = 0;
      st.botes.forEach((b) => (b.y = -50));
      st.hojas.forEach((h) => (h.y = -50));
      return true;
    },
  };
}
