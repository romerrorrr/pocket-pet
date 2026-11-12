/**
 * faroles.js
 * ==========
 * v54: LANTERNS ON THE LAKE, un juego de la tele, tranquilo, de noche en el
 * West Lake.
 * v57 (rom: "se ve lindo pero no entendi como se juega ni como es divertido"):
 * ahora es como el viborita. Ella guia su farol con el dedo, y cada farol
 * suelto que toca se suma DETRAS, en una fila brillante que la sigue. Los
 * botes cortan la fila: los faroles de la cola se sueltan y vuelven a flotar
 * (se pueden juntar de nuevo). Los dorados suman 3. Al final (60 s) toda la
 * fila sube al cielo; los puntos son cuantos faroles hay en la fila.
 * Antes de empezar, una tarjetita de 3 pasos explica como se juega.
 *
 * El fondo es el lago de noche de la pesca (assets/pesca/fondo_noche.png).
 */

import { HTML_VOLVER, cablearVolver, crearPausa, blindarToques, htmlDificultad, cablearDificultad, leerDificultadDe, leerRecordDe, guardarRecordDe, lienzoPixel, imagen, lista } from "./juegoComun.js";

const CLAVE = "baozi_record_faroles";
const ALTO = 160;
const DURACION_MS = 60000;
const PASO = 10; // distancia entre faroles de la fila (px del lienzo)
export const DIFICULTADES_FAROLES = {
  easy: { botes: 1, vel: 0.8 },
  normal: { botes: 2, vel: 1 },
  hard: { botes: 3, vel: 1.3 },
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

/** Donde corta un bote la fila: el primer farol (desde la cabeza) que toca. -1 si ninguno. (logica pura, para pruebas) */
export function dondeCorta(fila, bote) {
  for (let i = 0; i < fila.length; i++) {
    const f = fila[i];
    if (Math.abs(bote.x - f.x) < bote.w / 2 + 3 && f.y > bote.y - 6 && f.y < bote.y + 9) return i;
  }
  return -1;
}

const HTML_COMO = `
  <div class="far-como">
    <div><b>1</b><span class="far-ico yo">♥</span>Drag your finger: your lantern follows it</div>
    <div><b>2</b><span class="far-ico fila">● ● ●</span>Touch loose lanterns: they join your line</div>
    <div><b>3</b><span class="far-ico bote">▬</span>Boats cut the line! Keep it long and safe</div>
  </div>`;

/**
 * opts: arte, sprite, cambiarCara, sonar, vibrar,
 *       alTerminar({ puntos, faroles, record, nuevoRecord, dificultad }), alSalir()
 */
export function iniciarFaroles(contenedor, opts) {
  const { arte, sonar = () => {}, vibrar = () => {}, alTerminar = () => {}, alSalir = () => {} } = opts;
  let dif = leerDificultadDe(CLAVE);
  let D = DIFICULTADES_FAROLES[dif];
  contenedor.innerHTML = `
    <div class="pantalla-juego pantalla-faroles" id="area-faroles">
      ${HTML_VOLVER}
      <div class="juego-hud">
        <span class="juego-chip far-chip-fila" id="far-puntos">♥ 0</span>
        <span class="juego-chip" id="far-tiempo">60</span>
      </div>
      <div class="juego-record" id="far-record">LANTERNS ON THE LAKE</div>
      <div class="far-deseo oculto" id="far-deseo"></div>
      <div class="far-aviso oculto" id="far-aviso"></div>
      ${htmlDificultad("LANTERNS ON THE LAKE", CLAVE, dif).replace('<div class="juego-dificultad-botones">', HTML_COMO + '<div class="juego-dificultad-botones">')}
    </div>`;
  const $ = (id) => contenedor.querySelector(`#${id}`);
  const area = $("area-faroles");
  blindarToques(area);
  const L = lienzoPixel(area, ALTO, "juego-lienzo faroles-lienzo");
  const ctx = L.ctx;
  const fondo = imagen(arte("pesca/fondo_noche.png"));

  const st = {
    estado: "eligiendo", // eligiendo | jugando | subiendo | fin
    yo: { x: 60, y: 120, tx: 60, ty: 120, escudo: 0 },
    camino: [], // por donde paso la cabeza (lo mas nuevo primero)
    fila: [], // los faroles que la siguen: { x, y, oro }
    sueltos: [], // { x, y, vx, fase, oro }
    botes: [], // { x, y, v, w }
    chispas: [],
    juntados: 0, // cuantos junto en total (para los deseos)
    mejorFila: 0,
    t0: 0,
    tFin: 0,
    proximo: 0,
    vivo: true,
    raf: 0,
    deseos: [...DESEOS].sort(() => Math.random() - 0.5),
  };
  const pausa = crearPausa(area, { activa: () => st.vivo && st.estado === "jugando" });

  cablearVolver(contenedor, () => {
    if (!st.vivo) return;
    if (st.estado === "eligiendo") alSalir();
    else terminar(true);
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
    st.yo = { x: L.W * 0.2, y: 120, tx: L.W * 0.2, ty: 120, escudo: 0 };
    st.camino = [{ x: st.yo.x, y: st.yo.y }];
    st.fila = [];
    st.botes = Array.from({ length: D.botes }, (_, i) => ({ x: (L.W / D.botes) * i + Math.random() * 40, y: 82 + i * (64 / D.botes) + Math.random() * 6, v: (i % 2 ? -1 : 1) * (14 + Math.random() * 8) * D.vel, w: 30 }));
    for (let i = 0; i < 6; i++) soltarUno(true);
    sonar("tocar");
    aviso("Gather the loose lanterns ♥", 2600);
  }

  function soltarUno(alInicio = false) {
    const oro = Math.random() < 0.1;
    st.sueltos.push({ x: alInicio ? 40 + Math.random() * (L.W - 70) : Math.random() < 0.5 ? -8 : L.W + 8, y: AGUA_Y + 14 + Math.random() * (ALTO - AGUA_Y - 24), vx: (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 5), fase: Math.random() * 6.28, oro });
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
    st.yo.ty = Math.max(AGUA_Y + 8, Math.min(ALTO - 4, y));
  };
  area.addEventListener("pointerdown", mover);
  area.addEventListener("pointermove", (e) => {
    if (e.buttons || e.pointerType === "touch") mover(e);
  });

  function cartelito(id, texto, ms) {
    const el = $(id);
    if (!el) return;
    el.textContent = texto;
    el.classList.remove("oculto");
    clearTimeout(el._t);
    el._t = setTimeout(() => el && el.classList.add("oculto"), ms);
  }
  const aviso = (t, ms = 1600) => cartelito("far-aviso", t, ms);
  const deseo = () => cartelito("far-deseo", st.deseos[st.juntados % st.deseos.length], 1800);

  /** Ubica la fila sobre el camino de la cabeza, a PASO de distancia uno de otro. */
  function acomodarFila() {
    const c = st.camino;
    let seg = 0; // segmento actual del camino (c[seg] -> c[seg+1])
    let recorrido = 0; // distancia hasta c[seg]
    for (let n = 0; n < st.fila.length; n++) {
      const meta = (n + 1) * PASO;
      while (seg < c.length - 1) {
        const l = Math.hypot(c[seg + 1].x - c[seg].x, c[seg + 1].y - c[seg].y);
        if (recorrido + l >= meta) break;
        recorrido += l;
        seg++;
      }
      if (seg >= c.length - 1) break; // el camino todavia es corto: se quedan donde estan
      const a = c[seg];
      const b = c[seg + 1];
      const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const k = (meta - recorrido) / l;
      const f = st.fila[n];
      f.x += (a.x + (b.x - a.x) * k - f.x) * 0.5;
      f.y += (a.y + (b.y - a.y) * k - f.y) * 0.5;
    }
    // recortar el camino (no hace falta mas que el largo de la fila)
    const largo = (st.fila.length + 3) * PASO;
    let d = 0;
    for (let k = 1; k < c.length; k++) {
      d += Math.hypot(c[k].x - c[k - 1].x, c[k].y - c[k - 1].y);
      if (d > largo) {
        c.length = k + 1;
        break;
      }
    }
  }

  /** Corta la fila desde i: esos faroles se sueltan y vuelven a flotar. */
  function cortar(i) {
    const sueltan = st.fila.splice(i);
    for (const [k, f] of sueltan.entries()) st.sueltos.push({ x: f.x, y: f.y, vx: (k % 2 ? -1 : 1) * (14 + Math.random() * 10), vy: (Math.random() - 0.5) * 16, fase: Math.random() * 6.28, oro: f.oro, recien: 1 });
    st.yo.escudo = 1.2;
    sonar("no");
    vibrar([30, 40, 30]);
    aviso(sueltan.length === 1 ? "A boat! One lantern floated away" : `A boat! ${sueltan.length} lanterns floated away`);
  }

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


  function cuadro() {
    if (!st.vivo) return;
    st.raf = requestAnimationFrame(cuadro);
    if (pausa.pausado()) return;
    const ahora = pausa.ahora();
    const dt = Math.min(0.05, (ahora - (cuadro.prev || ahora)) / 1000);
    cuadro.prev = ahora;
    L.medir();
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
      const yo = st.yo;
      yo.x += (yo.tx - yo.x) * Math.min(1, dt * 5);
      yo.y += (yo.ty - yo.y) * Math.min(1, dt * 5);
      if (yo.escudo > 0) yo.escudo -= dt;
      const ult = st.camino[0];
      if (!ult || Math.hypot(ult.x - yo.x, ult.y - yo.y) > 0.8) st.camino.unshift({ x: yo.x, y: yo.y });
      acomodarFila();
      // los sueltos
      if (t > st.proximo && st.sueltos.length < 7) {
        soltarUno();
        st.proximo = t + 900 + Math.random() * 900;
      }
      for (const f of st.sueltos) {
        f.x += f.vx * dt * D.vel;
        f.fase += dt;
        f.y += Math.sin(f.fase) * 3 * dt;
        f.y = Math.max(AGUA_Y + 10, Math.min(ALTO - 4, f.y));
        if (f.recien) {
          f.recien = Math.max(0, f.recien - dt);
          f.y += (f.vy || 0) * dt;
          if (!f.recien) f.vx = Math.sign(f.vx) * (3 + Math.random() * 5); // ya se alejaron: vuelven a flotar tranquilos
        }
      }
      st.sueltos = st.sueltos.filter((f) => f.x > -20 && f.x < L.W + 20);
      // juntar: se suman a la cola
      for (const f of st.sueltos) {
        if (!f.recien && Math.hypot(f.x - yo.x, f.y - yo.y) < 13) {
          f.juntado = true;
          const cola = st.fila[st.fila.length - 1] || yo;
          for (let k = 0; k < (f.oro ? 3 : 1); k++) st.fila.push({ x: cola.x, y: cola.y, oro: f.oro });
          st.juntados += 1;
          st.mejorFila = Math.max(st.mejorFila, st.fila.length);
          for (let k = 0; k < 6; k++) st.chispas.push({ x: f.x, y: f.y - 6, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 20, vida: 0.6 });
          sonar(f.oro ? "hallazgo" : "tocar");
          vibrar(f.oro ? [15, 30, 15] : 10);
          if (f.oro) aviso("Golden lantern: +3!", 1300);
          else if (st.juntados % 4 === 1) deseo();
        }
      }
      st.sueltos = st.sueltos.filter((f) => !f.juntado);
      // los botes
      for (const b of st.botes) {
        b.x += b.v * dt;
        if (b.x < -b.w) b.x = L.W + b.w;
        if (b.x > L.W + b.w) b.x = -b.w;
      }
      if (yo.escudo <= 0) {
        for (const b of st.botes) {
          // la cabeza: pierde los 2 ultimos (o nada si no tiene)
          if (Math.abs(b.x - yo.x) < b.w / 2 + 2 && yo.y > b.y - 6 && yo.y < b.y + 9) {
            if (st.fila.length) cortar(Math.max(0, st.fila.length - 2));
            else {
              yo.escudo = 1.2;
              sonar("no");
              vibrar(30);
            }
            break;
          }
          const i = dondeCorta(st.fila, b);
          if (i >= 0) {
            cortar(i);
            break;
          }
        }
      }
      $("far-puntos").textContent = `♥ ${st.fila.length}`;
      if (resta <= 0) terminar();
    } else if (st.estado === "subiendo") {
      // al final: toda la fila sube al cielo
      const k = (ahora - st.tFin) / 1000;
      st.yo.y -= dt * 40 * Math.min(1, k);
      st.fila.forEach((f, i) => {
        if (k > i * 0.05) f.y -= dt * (36 + (i % 3) * 6);
        f.x += Math.sin(ahora / 400 + i) * dt * 6;
      });
    }

    // dibujar (de atras para adelante)
    const tt = ahora;
    const cosas = [
      ...st.botes.map((b) => ({ y: b.y + 4, f: () => bote(b, tt) })),
      ...st.sueltos.map((f) => ({ y: f.y, f: () => { if (!f.recien || Math.floor(tt / 120) % 2) farol(f.x, f.y, tt, { oro: f.oro }); } })),
      ...st.fila.map((f) => ({ y: f.y, f: () => farol(f.x, f.y, tt, { oro: f.oro }) })),
    ];
    if (st.estado !== "eligiendo")
      cosas.push({
        y: st.yo.y,
        f: () => {
          const parpadea = st.yo.escudo > 0 && Math.floor(st.yo.escudo * 8) % 2 === 0;
          farol(st.yo.x, st.yo.y, tt, { grande: true, apagado: parpadea });
          const hx = Math.round(st.yo.x) - 2;
          const hy = Math.round(st.yo.y) - 24 + (Math.floor(tt / 400) % 2);
          ctx.fillStyle = "rgb(246,150,180)";
          [[0, 0], [1, 0], [3, 0], [4, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [1, 2], [2, 2], [3, 2], [2, 3]].forEach(([dx, dy]) => ctx.fillRect(hx + dx, hy + dy, 1, 1));
        },
      });
    // el hilito de luz que une la fila
    if (st.fila.length) {
      ctx.strokeStyle = "rgba(255,210,140,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(st.yo.x) + 0.5, Math.round(st.yo.y) - 5.5);
      for (const f of st.fila) ctx.lineTo(Math.round(f.x) + 0.5, Math.round(f.y) - 5.5);
      ctx.stroke();
    }
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

  function terminar(apurado = false) {
    if (!st.vivo || st.estado === "fin" || st.estado === "subiendo") return;
    const puntos = st.fila.length;
    const record = leerRecordFaroles(dif);
    const nuevoRecord = puntos > record;
    if (nuevoRecord) guardarRecordDe(CLAVE, dif, puntos);
    st.estado = "subiendo";
    st.tFin = pausa.ahora();
    if (puntos && !apurado) aviso(`${puntos} lantern${puntos === 1 ? "" : "s"} rise to the sky ♥`, 2400);
    setTimeout(
      () => {
        if (!st.vivo) return;
        st.estado = "fin";
        alTerminar({ puntos, faroles: puntos, record: Math.max(record, puntos), nuevoRecord, dificultad: dif });
      },
      apurado || !puntos ? 300 : 2600,
    );
  }

  return {
    destruir() {
      st.vivo = false;
      cancelAnimationFrame(st.raf);
      pausa.destruir();
    },
    terminar,
    _estado: () => ({ estado: st.estado, puntos: st.fila.length, fila: st.fila.length, juntados: st.juntados, sueltos: st.sueltos.length }),
    // para las pruebas: lleva el farol encima del suelto mas cercano (y aparta los botes)
    _irAlMasCercano() {
      const f = st.sueltos.find((x) => !x.recien);
      if (!f) return false;
      st.yo.x = st.yo.tx = f.x;
      st.yo.y = st.yo.ty = f.y;
      st.botes.forEach((b) => (b.y = -50));
      return true;
    },
    // para las pruebas: un bote pasa por el medio de la fila
    _boteEnLaFila() {
      if (st.fila.length < 2) return false;
      const f = st.fila[Math.floor(st.fila.length / 2)];
      const b = st.botes[0];
      if (!b) return false;
      b.x = f.x;
      b.y = f.y - 2;
      b.v = 0;
      st.yo.escudo = 0;
      return true;
    },
  };
}
