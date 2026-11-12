/**
 * restaurante.js
 * ==============
 * v54: Baozi's Dumpling Shop. Un puestito en la calle Hefang que se abre
 * desde el cartelito rojo del cuarto. Ella lo pidio ("uno de cocina").
 *
 *   - La pantalla del local: lo de hoy, el menu (lo que falta, con candado),
 *     las mejoras que se compran con monedas y "Open the shop".
 *   - El turno: 90 s. Llegan clientes con un pedido de 1 o 2 cosas y una
 *     barra de paciencia. Lo que va al vapor (bao, jiaozi) se pone en una
 *     vaporera libre y se cocina; tocando la vaporera lista pasa al plato.
 *     Lo demas (te, Longjing, pastel de osmanto, mooncake) va directo al
 *     plato. Tocando al cliente se le sirve: si el plato es su pedido, paga
 *     (mas propina si no espero mucho). El tacho vacia el plato.
 *   - Las recetas nuevas salen sellando lugares: Longjing (longjing), pastel
 *     de osmanto (el Jardin Botanico) y mooncake (Three Pools Mirroring the Moon).
 *   - Monedas: el primer turno del dia paga todo lo que se gano; los
 *     siguientes, un tercio (como los otros juegos, que no se "farmee").
 *   - Lo que sobra en el plato y es comida de la heladera, va a la heladera.
 *
 * La logica (Restaurante) no toca el DOM: se prueba en test/unit_v54.mjs.
 */

import { HTML_VOLVER, cablearVolver, crearPausa, blindarToques } from "./juegoComun.js";

export const TURNO_MS = 90000;

/** La comida del local. vapor: va a la vaporera. heladera: el id de la tienda (si sobra, va a la heladera). */
export const PLATOS = {
  bao: { nombre: "Bao", precio: 6, vapor: true },
  jiaozi: { nombre: "Jiaozi", precio: 6, vapor: true },
  te: { nombre: "Tea", precio: 3 },
  longjing: { nombre: "Longjing tea", precio: 5, lugar: "longjing", heladera: "longjing" },
  osmanto: { nombre: "Osmanthus cake", precio: 7, lugar: "botanico", heladera: "osmanto" },
  luna: { nombre: "Mooncake", precio: 8, lugar: "santan", heladera: "luna" },
};
export const ORDEN_MENU = ["bao", "jiaozi", "te", "longjing", "osmanto", "luna"];

export const MEJORAS = [
  { id: "vapor2", nombre: "Second steamer", texto: "Cook two things at once", precio: 120 },
  { id: "faroles", nombre: "Lanterns outside", texto: "Customers wait a little longer", precio: 90 },
  { id: "fuego", nombre: "Faster fire", texto: "Steaming takes half the time", precio: 150 },
  { id: "lugar4", nombre: "Fourth spot", texto: "Up to 4 customers at a time", precio: 200 },
];

/**
 * Los clientes que no son amigos (assets/restaurante/cliente_<id>.png y _saludo.png).
 * Vacio por ahora: rom los va a dibujar. Mientras, comen los amigos de Baozi.
 * Formato: { id, nombre, gracias: ["...", "..."] }
 */
export const CLIENTES = [];
/** Lo que dicen los amigos de Baozi cuando vienen a comer (pagan el doble). */
export const GRACIAS_AMIGOS = {
  usagi: "Quiet, warm, perfect. Thank you.",
  mimi: "Earth food is the best food. Photo for my album!",
  ruchong: "It's… it's so good. Can I paint it?",
  chagee: "Bravo, chef! Bravo!",
};

export const VAPOR_MS = 4000;
const PACIENCIA_MS = 24000;
const PROB_AMIGO = 0.15;

const claveDia = (t) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export class Restaurante {
  constructor() {
    this.turnos = 0; // cuantos turnos abrio en total
    this.mejoras = new Set();
    this.mejorTurno = 0; // lo maximo ganado en un turno
    this.hoy = { dia: null, turnos: 0, felices: 0, ganado: 0 };
  }

  tiene(m) {
    return this.mejoras.has(m);
  }

  /** Lo que se puede cocinar, segun los lugares sellados (Set de ids). */
  menu(sellados = new Set()) {
    return ORDEN_MENU.filter((id) => !PLATOS[id].lugar || sellados.has(PLATOS[id].lugar));
  }

  vaporeras() {
    return this.tiene("vapor2") ? 2 : 1;
  }
  lugares() {
    return this.tiene("lugar4") ? 4 : 3;
  }
  msVapor() {
    return this.tiene("fuego") ? VAPOR_MS / 2 : VAPOR_MS;
  }
  msPaciencia() {
    return this.tiene("faroles") ? PACIENCIA_MS * 1.3 : PACIENCIA_MS;
  }

  /** Compra una mejora con la tienda (sus monedas). true si se pudo. */
  comprar(id, tienda) {
    const m = MEJORAS.find((x) => x.id === id);
    if (!m || this.tiene(id) || !tienda || tienda.monedas < m.precio) return false;
    tienda.monedas -= m.precio;
    this.mejoras.add(id);
    return true;
  }

  _alDia(ahora) {
    const d = claveDia(ahora);
    if (this.hoy.dia !== d) this.hoy = { dia: d, turnos: 0, felices: 0, ganado: 0 };
  }

  /** ¿El proximo turno de hoy paga todo? */
  primeroDeHoy(ahora = Date.now()) {
    this._alDia(ahora);
    return this.hoy.turnos === 0;
  }

  /**
   * Cierra un turno: cuanto se gano en el local (ganado) y cuanto de eso se
   * cobra de verdad (el primero del dia, todo; los siguientes, un tercio).
   */
  cerrarTurno({ ganado = 0, felices = 0 } = {}, ahora = Date.now()) {
    this._alDia(ahora);
    const g = Math.max(0, Math.floor(ganado));
    const paga = this.hoy.turnos === 0 ? g : Math.floor(g / 3);
    this.hoy.turnos += 1;
    this.hoy.felices += Math.max(0, felices);
    this.hoy.ganado += paga;
    this.turnos += 1;
    const record = g > this.mejorTurno;
    if (record) this.mejorTurno = g;
    return { paga, record };
  }

  aObjeto() {
    return { turnos: this.turnos, mejoras: [...this.mejoras], mejorTurno: this.mejorTurno, hoy: { ...this.hoy } };
  }

  static desdeObjeto(d) {
    const r = new Restaurante();
    if (!d || typeof d !== "object") return r;
    r.turnos = Number.isFinite(d.turnos) && d.turnos > 0 ? Math.floor(d.turnos) : 0;
    r.mejoras = new Set((Array.isArray(d.mejoras) ? d.mejoras : []).filter((id) => MEJORAS.some((m) => m.id === id)));
    r.mejorTurno = Number.isFinite(d.mejorTurno) && d.mejorTurno > 0 ? Math.floor(d.mejorTurno) : 0;
    const h = d.hoy || {};
    if (typeof h.dia === "string") r.hoy = { dia: h.dia, turnos: Math.max(0, Math.floor(h.turnos) || 0), felices: Math.max(0, Math.floor(h.felices) || 0), ganado: Math.max(0, Math.floor(h.ganado) || 0) };
    return r;
  }
}

/** ¿El plato (lista de ids) es exactamente el pedido (lista de ids)? */
export function esElPedido(plato, pedido) {
  if (plato.length !== pedido.length) return false;
  const a = [...plato].sort().join();
  const b = [...pedido].sort().join();
  return a === b;
}

/** Un pedido al azar: 1 cosa (55 %) o 2, del menu. */
export function pedidoAlAzar(menu, azar = Math.random) {
  const una = () => menu[Math.floor(azar() * menu.length)];
  return azar() < 0.55 ? [una()] : [una(), una()];
}

/** Lo que paga un pedido: los precios + propina (hasta 3 si no espero nada). */
export function pagoDe(pedido, fraccionPaciencia, amigo = false) {
  const base = pedido.reduce((s, id) => s + (PLATOS[id] ? PLATOS[id].precio : 0), 0);
  const propina = Math.round(3 * Math.max(0, Math.min(1, fraccionPaciencia)));
  return (base + propina) * (amigo ? 2 : 1);
}

// ------------------------------------------------------------------
// La pantalla
// ------------------------------------------------------------------

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/**
 * opts:
 *   arte(ruta), sprite(ojo, boca), cambiarCara(el, ojo, boca), sonar(n), vibrar(ms)
 *   reg: Restaurante, tienda: Tienda, sellados: Set, amigos: [{ id, nombre }] (los que ya conocio)
 *   nombre: el de la mascota ("Baozi" / "Mantou")
 *   guardar(), alSalir(), alCerrarTurno({ paga, felices, record, sobras })
 */
export function abrirRestaurante(contenedor, opts) {
  const { arte, sprite, cambiarCara, sonar = () => {}, vibrar = () => {}, reg, tienda, sellados = new Set(), amigos = [], nombre = "Baozi", guardar = () => {}, alSalir = () => {}, alCerrarTurno = () => {} } = opts;
  let turno = null; // el turno en curso (o null: la pantalla del local)
  let vivo = true;
  const imgPlato = (id, cl = "") => `<img class="rest-comida ${cl}" src="${arte(`restaurante/plato_${id}.png`)}" alt="${esc(PLATOS[id].nombre)}" draggable="false" />`;

  // ---------------- la pantalla del local ----------------
  function local(mensaje = "") {
    if (turno) terminarSinCerrar();
    const menu = reg.menu(sellados);
    const h = reg.primeroDeHoy() ? null : reg.hoy;
    const faltan = ORDEN_MENU.filter((id) => !menu.includes(id));
    contenedor.innerHTML = `
      <div class="pantalla-rest local">
        ${HTML_VOLVER}
        <div class="rest-titulo"><span>${esc(nombre).toUpperCase()}'S DUMPLING SHOP</span><span class="rest-monedas"><img src="${arte("tienda/moneda.png")}" alt="" draggable="false" /><b id="rest-monedas">${tienda.monedas}</b></span></div>
        <div class="rest-paneles">
          <div class="papel rest-panel">
            <div class="rest-sub">TODAY</div>
            <div class="rest-hoy">${
              h
                ? `${h.felices} happy customer${h.felices === 1 ? "" : "s"} · +${h.ganado} coins<br><small>Next shift pays a third. The first one of each day pays it all.</small>`
                : `The shop is ready.${reg.turnos ? "" : `<br><small>Customers come with an order. Steam the buns, pour the tea, and tap them to serve.</small>`}`
            }</div>
            ${mensaje ? `<div class="rest-aviso">${esc(mensaje)}</div>` : ""}
            <div class="rest-sub">MENU</div>
            <div class="rest-menu">${ORDEN_MENU.map((id) => `<span class="rest-ficha ${menu.includes(id) ? "" : "bloq"}" title="${esc(PLATOS[id].nombre)}">${imgPlato(id)}</span>`).join("")}</div>
            ${faltan.length ? `<div class="rest-nota">${faltan.map((id) => `${esc(PLATOS[id].nombre)}: stamp ${esc(opts.nombreLugar ? opts.nombreLugar(PLATOS[id].lugar) : PLATOS[id].lugar)}`).join(" · ")}</div>` : ""}
            <button class="boton rest-abrir" id="btn-rest-abrir" type="button">Open the shop ♥</button>
          </div>
          <div class="papel rest-panel">
            <div class="rest-sub">IMPROVE THE SHOP</div>
            ${MEJORAS.map(
              (m) => `
              <div class="rest-mejora">
                <div><b>${esc(m.nombre)}</b><small>${esc(m.texto)}</small></div>
                ${
                  reg.tiene(m.id)
                    ? `<span class="rest-tuya">✓ YOURS</span>`
                    : `<button class="boton boton-fantasma rest-comprar" type="button" data-mejora="${m.id}" ${tienda.monedas < m.precio ? "disabled" : ""}><img src="${arte("tienda/moneda.png")}" alt="" draggable="false" />${m.precio}</button>`
                }
              </div>`,
            ).join("")}
          </div>
        </div>
      </div>`;
    const area = contenedor.querySelector(".pantalla-rest");
    blindarToques(area);
    cablearVolver(contenedor, () => {
      if (vivo) alSalir();
    });
    contenedor.querySelector("#btn-rest-abrir").addEventListener("click", () => {
      sonar("tocar");
      empezar();
    });
    for (const b of contenedor.querySelectorAll("[data-mejora]")) {
      b.addEventListener("click", () => {
        if (reg.comprar(b.dataset.mejora, tienda)) {
          sonar("hallazgo");
          vibrar(25);
          guardar();
          local(`${MEJORAS.find((m) => m.id === b.dataset.mejora).nombre}: done!`);
        } else sonar("no");
      });
    }
  }

  // ---------------- el turno ----------------
  function empezar() {
    const menu = reg.menu(sellados);
    contenedor.innerHTML = `
      <div class="pantalla-rest turno">
        <img class="rest-calle" src="${arte("restaurante/calle.png")}" alt="" draggable="false" />
        ${HTML_VOLVER}
        <div class="rest-hud">
          <span class="juego-chip"><img src="${arte("tienda/moneda.png")}" alt="" draggable="false" /><b id="rest-ganado">0</b></span>
          <span class="juego-chip" id="rest-felices">♥ 0</span>
          <span class="rest-esp"></span>
          <span class="juego-chip" id="rest-reloj">1:30</span>
        </div>
        <div class="rest-clientes" id="rest-clientes" style="--lugares:${reg.lugares()}">
          ${Array.from({ length: reg.lugares() }, (_, i) => `<button class="rest-lugar vacio" type="button" data-lugar="${i}"></button>`).join("")}
        </div>
        <img class="rest-mostrador" src="${arte("restaurante/mostrador.png")}" alt="" draggable="false" />
        <div class="rest-baozi" id="rest-baozi">${sprite("ojo_base_energia_alta.png", "boca_base_feliz.png")}</div>
        <div class="rest-barra">
          <div class="rest-vaporeras">
            ${Array.from({ length: reg.vaporeras() }, (_, i) => `<button class="rest-vapor" type="button" data-vapor="${i}"><span class="rest-vapor-dentro"></span><span class="rest-vapor-t"><i></i></span><span class="rest-vapor-listo">READY!</span></button>`).join("")}
          </div>
          <div class="rest-plato-caja">
            <button class="rest-plato" id="rest-plato" type="button" aria-label="Your plate"></button>
            <button class="rest-tacho" id="rest-tacho" type="button" aria-label="Empty the plate">✕</button>
          </div>
          <div class="rest-ings">
            ${menu.map((id) => `<button class="rest-ing" type="button" data-ing="${id}">${imgPlato(id)}<small>${esc(PLATOS[id].nombre).toUpperCase()}</small></button>`).join("")}
          </div>
        </div>
        <div class="pista-minijuego" id="rest-pista">Tap the food · ${PLATOS.bao.nombre} and ${PLATOS.jiaozi.nombre} go in the steamer</div>
        <div class="rest-cartel oculto" id="rest-cartel"></div>
      </div>`;
    const $ = (id) => contenedor.querySelector(`#${id}`);
    const area = contenedor.querySelector(".pantalla-rest");
    blindarToques(area);
    const pausa = crearPausa(area, { activa: () => !!turno && turno.estado === "abierto" });
    turno = {
      estado: "abierto",
      menu,
      t0: pausa.ahora(),
      lugares: Array.from({ length: reg.lugares() }, () => null),
      vapores: Array.from({ length: reg.vaporeras() }, () => null), // { id, desde }
      plato: [],
      ganado: 0,
      felices: 0,
      idos: 0,
      proximo: 600,
      pausa,
      raf: 0,
      caraHasta: 0,
    };
    cablearVolver(contenedor, () => {
      if (!turno) return;
      if (turno.ganado || turno.felices) cerrar();
      else local();
    });

    const cara = (ojo, boca, ms = 900) => {
      const el = contenedor.querySelector("#rest-baozi .sprite-cara");
      if (el) cambiarCara(el, ojo, boca);
      turno.caraHasta = pausa.ahora() + ms;
    };
    const cartel = (t, ms = 1400) => {
      const c = $("rest-cartel");
      if (!c) return;
      c.textContent = t;
      c.classList.remove("oculto");
      clearTimeout(cartel.tm);
      cartel.tm = setTimeout(() => c && c.classList.add("oculto"), ms);
    };

    function dibujarPlato() {
      $("rest-plato").innerHTML = turno.plato.map((id) => imgPlato(id)).join("");
      $("rest-plato").classList.toggle("lleno", turno.plato.length >= 3);
    }

    function ponerEnPlato(id) {
      if (turno.plato.length >= 3) {
        sonar("no");
        cartel("The plate is full!");
        return false;
      }
      turno.plato.push(id);
      dibujarPlato();
      return true;
    }

    // la comida
    for (const b of contenedor.querySelectorAll("[data-ing]")) {
      b.addEventListener("click", () => {
        if (!turno || turno.estado !== "abierto") return;
        const id = b.dataset.ing;
        if (PLATOS[id].vapor) {
          const i = turno.vapores.findIndex((v) => !v);
          if (i < 0) {
            sonar("no");
            cartel(turno.vapores.length > 1 ? "Both steamers are busy!" : "The steamer is busy!");
            return;
          }
          turno.vapores[i] = { id, desde: pausa.ahora() };
          const v = contenedor.querySelector(`[data-vapor="${i}"]`);
          v.querySelector(".rest-vapor-dentro").innerHTML = imgPlato(id);
          v.classList.add("cocinando");
          sonar("tocar");
        } else if (ponerEnPlato(id)) sonar("tocar");
      });
    }
    // las vaporeras
    for (const v of contenedor.querySelectorAll("[data-vapor]")) {
      v.addEventListener("click", () => {
        if (!turno || turno.estado !== "abierto") return;
        const i = Number(v.dataset.vapor);
        const x = turno.vapores[i];
        if (!x) return;
        if (pausa.ahora() - x.desde < reg.msVapor()) {
          sonar("no");
          cartel("Not ready yet…", 900);
          return;
        }
        if (!ponerEnPlato(x.id)) return;
        turno.vapores[i] = null;
        v.classList.remove("cocinando", "listo");
        v.querySelector(".rest-vapor-dentro").innerHTML = "";
        sonar("tocar");
      });
    }
    $("rest-tacho").addEventListener("click", () => {
      if (!turno || !turno.plato.length) return;
      turno.plato = [];
      dibujarPlato();
      sonar("mimo");
    });
    // los clientes
    for (const b of contenedor.querySelectorAll("[data-lugar]")) {
      b.addEventListener("click", () => {
        if (!turno || turno.estado !== "abierto") return;
        const i = Number(b.dataset.lugar);
        const c = turno.lugares[i];
        if (!c || c.yendose) return;
        if (!turno.plato.length) {
          cartel("Put their order on the plate first", 1200);
          return;
        }
        if (!esElPedido(turno.plato, c.pedido)) {
          sonar("no");
          vibrar(30);
          b.classList.remove("no");
          void b.offsetWidth;
          b.classList.add("no");
          decirCliente(i, "That's not my order!");
          return;
        }
        const resto = 1 - (pausa.ahora() - c.desde) / c.paciencia;
        const pago = pagoDe(c.pedido, resto, c.amigo);
        turno.ganado += pago;
        turno.felices += 1;
        turno.plato = [];
        dibujarPlato();
        $("rest-ganado").textContent = turno.ganado;
        $("rest-felices").textContent = `♥ ${turno.felices}`;
        sonar(c.amigo || pago >= 12 ? "hallazgo" : "hito");
        vibrar(20);
        cara("ojo_especial_euforico.png", "boca_especial_euforico.png");
        decirCliente(i, c.gracias, `+${pago}`);
        c.yendose = pausa.ahora();
        b.classList.add("feliz");
      });
    }

    function decirCliente(i, texto, monedas = "") {
      const b = contenedor.querySelector(`[data-lugar="${i}"]`);
      if (!b) return;
      const g = b.querySelector(".rest-dice");
      if (!g) return;
      g.innerHTML = `${esc(texto)}${monedas ? ` <b>${esc(monedas)}</b>` : ""}`;
      g.classList.remove("oculto");
      clearTimeout(g.tm);
      g.tm = setTimeout(() => g.classList.add("oculto"), 1500);
    }

    function llegaAlguien(ahora) {
      const libres = turno.lugares.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
      if (!libres.length) return;
      const i = libres[Math.floor(Math.random() * libres.length)];
      const enMesa = new Set(turno.lugares.filter(Boolean).map((c) => c.quien));
      const amigosLibres = amigos.filter((a) => !enMesa.has(a.id));
      let c;
      const libresC = CLIENTES.filter((x) => !enMesa.has(x.id));
      if (amigosLibres.length && (!libresC.length || Math.random() < PROB_AMIGO)) {
        // los amigos que Baozi ya conoce pagan el doble y llevan su cartelito
        const a = amigosLibres[Math.floor(Math.random() * amigosLibres.length)];
        c = { quien: a.id, nombre: a.nombre, src: arte(`npcs/npc_${a.id}.png`), srcFeliz: arte(`npcs/npc_${a.id}_saludo.png`), amigo: !!a.conocido, gracias: GRACIAS_AMIGOS[a.id] || "Thank you, chef!" };
      } else if (libresC.length) {
        const x = libresC[Math.floor(Math.random() * libresC.length)];
        c = { quien: x.id, nombre: x.nombre, src: arte(`restaurante/cliente_${x.id}.png`), srcFeliz: arte(`restaurante/cliente_${x.id}_saludo.png`), amigo: false, gracias: x.gracias[Math.floor(Math.random() * x.gracias.length)] };
      }
      if (!c) return; // (todos en la mesa)
      c.pedido = pedidoAlAzar(turno.menu);
      c.desde = ahora;
      c.paciencia = reg.msPaciencia() * (c.pedido.length > 1 ? 1.25 : 1);
      turno.lugares[i] = c;
      const b = contenedor.querySelector(`[data-lugar="${i}"]`);
      b.classList.remove("vacio", "feliz", "enojado", "no");
      b.innerHTML = `
        <img class="rest-cliente" src="${c.src}" alt="${esc(c.nombre)}" draggable="false" />
        <span class="rest-pedido">${c.pedido.map((id) => imgPlato(id)).join("")}</span>
        <span class="rest-paciencia"><i></i></span>
        ${c.amigo ? `<span class="rest-amigo">♥ ${esc(c.nombre)}</span>` : ""}
        <span class="rest-dice oculto"></span>`;
      b.setAttribute("aria-label", `${c.nombre}: ${c.pedido.map((id) => PLATOS[id].nombre).join(" and ")}`);
      sonar("tocar");
    }

    function vaciarLugar(i) {
      turno.lugares[i] = null;
      const b = contenedor.querySelector(`[data-lugar="${i}"]`);
      if (!b) return;
      b.classList.add("vacio");
      b.classList.remove("feliz", "enojado", "no");
      b.innerHTML = "";
      b.removeAttribute("aria-label");
    }

    function cuadro() {
      if (!vivo || !turno || turno.estado !== "abierto") return;
      turno.raf = requestAnimationFrame(cuadro);
      if (pausa.pausado()) return;
      const ahora = pausa.ahora();
      const t = ahora - turno.t0;
      const resta = Math.max(0, TURNO_MS - t);
      const s = Math.ceil(resta / 1000);
      const reloj = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
      const r = $("rest-reloj");
      if (r && r.textContent !== reloj) r.textContent = reloj;
      if (r) r.classList.toggle("apurado", s <= 10);
      // llegan clientes (no en los ultimos 8 s)
      if (t >= turno.proximo && resta > 8000) {
        llegaAlguien(ahora);
        turno.proximo = t + 4200 + Math.random() * 3600;
      }
      // la paciencia
      turno.lugares.forEach((c, i) => {
        if (!c) return;
        const b = contenedor.querySelector(`[data-lugar="${i}"]`);
        if (c.yendose) {
          if (ahora - c.yendose > 1300) vaciarLugar(i);
          return;
        }
        const f = Math.max(0, 1 - (ahora - c.desde) / c.paciencia);
        const bar = b && b.querySelector(".rest-paciencia i");
        if (bar) {
          bar.style.width = `${Math.round(f * 100)}%`;
          bar.className = f > 0.5 ? "" : f > 0.25 ? "medio" : "poco";
        }
        if (f <= 0) {
          turno.idos += 1;
          c.yendose = ahora;
          b.classList.add("enojado");
          decirCliente(i, "I'll come back later…");
          sonar("mimo");
          cara("ojo_especial_decepcionado.png", "boca_especial_decepcionado.png");
        }
      });
      // las vaporeras
      turno.vapores.forEach((x, i) => {
        const v = contenedor.querySelector(`[data-vapor="${i}"]`);
        if (!v) return;
        if (!x) return;
        const f = Math.min(1, (ahora - x.desde) / reg.msVapor());
        const bar = v.querySelector(".rest-vapor-t i");
        if (bar) bar.style.width = `${Math.round(f * 100)}%`;
        if (f >= 1 && !v.classList.contains("listo")) {
          v.classList.add("listo");
          sonar("hito");
        }
      });
      if (turno.caraHasta && ahora > turno.caraHasta) {
        turno.caraHasta = 0;
        const el = contenedor.querySelector("#rest-baozi .sprite-cara");
        if (el) cambiarCara(el, "ojo_base_energia_alta.png", "boca_base_feliz.png");
      }
      if (resta <= 0) cerrar();
    }
    turno.raf = requestAnimationFrame(cuadro);
    setTimeout(() => {
      const p = $("rest-pista");
      if (p) p.classList.add("oculto");
    }, 6000);
  }

  function terminarSinCerrar() {
    if (!turno) return;
    cancelAnimationFrame(turno.raf);
    turno.pausa.destruir();
    turno = null;
  }

  function cerrar() {
    if (!turno || turno.estado !== "abierto") return;
    turno.estado = "cerrado";
    cancelAnimationFrame(turno.raf);
    const sobras = turno.plato.map((id) => PLATOS[id].heladera).filter(Boolean);
    const { ganado, felices, idos } = turno;
    const { paga, record } = reg.cerrarTurno({ ganado, felices });
    turno.pausa.destruir();
    turno = null;
    alCerrarTurno({ paga, felices, record, sobras, ganado });
    guardar();
    const area = contenedor.querySelector(".pantalla-rest");
    if (!area) return;
    const fin = document.createElement("div");
    fin.className = "rest-fin";
    fin.innerHTML = `
      <div class="papel rest-fin-carta">
        <div class="rest-sub">${record && ganado ? "BEST SHIFT EVER!" : "SHOP CLOSED"}</div>
        <div class="rest-fin-titulo">${felices ? `${felices} happy customer${felices === 1 ? "" : "s"}!` : "A quiet day…"}</div>
        <div class="rest-fin-texto">${idos ? `${idos} left hungry · ` : ""}The shop made ${ganado} coins${paga !== ganado ? ` · you keep ${paga}` : ""}${sobras.length ? ` · leftovers went to the fridge` : ""}</div>
        <div class="rest-fin-monedas"><img src="${arte("tienda/moneda.png")}" alt="" draggable="false" />+${paga}</div>
        <button class="boton" id="btn-rest-volver" type="button">Back to the shop</button>
      </div>`;
    area.appendChild(fin);
    sonar(felices ? "hallazgo" : "mimo");
    fin.querySelector("#btn-rest-volver").addEventListener("click", () => {
      sonar("tocar");
      local();
    });
  }

  local();
  return {
    destruir() {
      vivo = false;
      terminarSinCerrar();
    },
    // para las pruebas
    _turno: () => turno,
    _cerrar: () => cerrar(),
  };
}
