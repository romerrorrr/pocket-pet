/**
 * decorar.js
 * ===========
 * v49: decorar una pagina del diario. Ella pone stickers (y los mueve,
 * gira, agranda o saca), elige el papel, la cinta, la tinta y para que
 * lado se inclina la pagina. Lo que se ve aca es la misma polaroid del
 * diario (R.htmlPolaroid), agrandada: lo que queda es lo que ve despues.
 *
 * abrirDecorar(contenedor, opts) -> { destruir }
 * opts: entrada (la del diario, no se toca), estilo inicial,
 *       catalogo: { stickers: [{ id, nombre, grupo, html, lado? }], grupos: [{ id, nombre, html }] },
 *       htmlPagina(estilo) -> html de la polaroid con ese estilo,
 *       sonar(n), alCambiar(estilo) (para retomar si se redibuja),
 *       alListo(estilo), alPalabras(estilo)
 */

import { ANCHO_PAGINA, MAX_STICKERS, TAM_MIN, TAM_MAX, DESBORDE, PAPELES, CINTAS, TINTAS, limpiarEstilo } from "./estiloDiario.js";

const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const copia = (e) => JSON.parse(JSON.stringify(e));
const vacio = () => ({ papel: null, cinta: null, tinta: null, giro: null, stickers: [] });

export function abrirDecorar(contenedor, opts) {
  const { catalogo = { stickers: [], grupos: [] }, htmlPagina, sonar = () => {}, alCambiar = () => {}, alListo = () => {}, alPalabras = () => {} } = opts;
  let estilo = { ...vacio(), ...copia(opts.estilo || {}) };
  estilo.stickers = estilo.stickers || [];
  const historia = []; // estilos anteriores (para "Undo")
  let elegido = -1; // el sticker seleccionado
  let pestana = "stickers";
  let grupo = (catalogo.grupos[0] && catalogo.grupos[0].id) || null;
  let k = 1; // escala de la pagina en pantalla
  let vivo = true;
  const porId = new Map(catalogo.stickers.map((s) => [s.id, s]));

  contenedor.innerHTML = `
    <div class="pantalla-decorar" id="pantalla-decorar">
      <div class="decorar-izq">
        <div class="decorar-escenario" id="dec-escenario"><div class="decorar-escala" id="dec-escala"></div></div>
        <div class="decorar-manijas" id="dec-manijas" aria-label="Sticker">
          <button type="button" data-accion="girar" aria-label="Rotate">↻</button>
          <button type="button" data-accion="menos" aria-label="Smaller">−</button>
          <button type="button" data-accion="mas" aria-label="Bigger">+</button>
          <button type="button" data-accion="frente" aria-label="Bring to front">⤒</button>
          <button type="button" data-accion="quitar" class="quitar" aria-label="Remove">✕</button>
        </div>
      </div>
      <div class="decorar-der">
        <div class="decorar-tabs" role="tablist">
          ${[["stickers", "Stickers"], ["papel", "Paper"], ["cinta", "Tape"], ["tinta", "Ink"], ["palabras", "Words"]]
            .map(([id, n]) => `<button type="button" class="tab-decorar" data-tab="${id}" role="tab">${n}</button>`)
            .join("")}
        </div>
        <div class="papel decorar-panel" id="dec-panel"></div>
        <div class="decorar-pie">
          <span class="decorar-ayuda" id="dec-ayuda"></span>
          <button type="button" class="boton boton-fantasma chico" id="dec-deshacer">Undo</button>
          <button type="button" class="boton chico" id="dec-listo">✓ Done</button>
        </div>
      </div>
    </div>`;

  const $ = (id) => contenedor.querySelector(`#${id}`);
  const escenario = $("dec-escenario");
  const escala = $("dec-escala");
  const manijas = $("dec-manijas");

  // ---- cambios (con deshacer) ----
  const guardarParaDeshacer = () => {
    historia.push(copia(estilo));
    if (historia.length > 40) historia.shift();
  };
  const cambio = () => {
    alCambiar(copia(estilo));
    $("dec-deshacer").disabled = !historia.length;
  };

  // ---- la pagina ----
  function pintarPagina() {
    escala.innerHTML = htmlPagina(copia(estilo));
    const fig = escala.querySelector(".polaroid");
    if (!fig) return;
    // la pagina entra entera en su lugar, lo mas grande posible
    const W = escenario.clientWidth;
    const H = escenario.clientHeight;
    const alto = fig.offsetHeight || 300;
    k = Math.max(0.6, Math.min(1.7, (H - 28) / (alto + 16), (W - 28) / (ANCHO_PAGINA + 24)));
    escala.style.transform = `scale(${k})`;
    escala.style.left = `${Math.round((W - ANCHO_PAGINA * k) / 2)}px`;
    escala.style.top = `${Math.max(14, Math.round((H - alto * k) / 2))}px`;
    marcarElegido();
  }

  function marcarElegido() {
    for (const el of escala.querySelectorAll(".sticker-pagina")) el.classList.toggle("elegido", Number(el.dataset.sticker) === elegido);
    manijas.classList.toggle("activas", elegido >= 0);
    for (const b of manijas.querySelectorAll("button")) b.disabled = elegido < 0;
    $("dec-ayuda").textContent =
      elegido >= 0 ? "Drag it to move it. Use the buttons to turn, resize or remove it." : estilo.stickers.length ? "Tap a sticker on the page to move it, or add more." : "Tap a sticker to put it on the page.";
  }

  const altoPagina = () => {
    const fig = escala.querySelector(".polaroid");
    return fig ? fig.offsetHeight : 300;
  };
  const acomodar = (st) => {
    const m = st.s / 2 - DESBORDE;
    st.x = Math.round(Math.max(m, Math.min(ANCHO_PAGINA - m, st.x)) * 10) / 10;
    st.y = Math.round(Math.max(m, Math.min(altoPagina() - m, st.y)) * 10) / 10;
  };

  // ---- arrastrar los stickers ----
  let arrastre = null;
  escenario.addEventListener("pointerdown", (e) => {
    const el = e.target.closest(".sticker-pagina");
    if (!el) {
      if (elegido >= 0) {
        elegido = -1;
        marcarElegido();
      }
      return;
    }
    e.preventDefault();
    const i = Number(el.dataset.sticker);
    if (!estilo.stickers[i]) return;
    elegido = i;
    marcarElegido();
    arrastre = { id: e.pointerId, el, i, x0: e.clientX, y0: e.clientY, sx: estilo.stickers[i].x, sy: estilo.stickers[i].y, antes: copia(estilo), movio: false };
    try {
      el.setPointerCapture(e.pointerId);
    } catch (err) {
      /* nada */
    }
  });
  escenario.addEventListener("pointermove", (e) => {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    const dx = (e.clientX - arrastre.x0) / k;
    const dy = (e.clientY - arrastre.y0) / k;
    if (!arrastre.movio && Math.hypot(dx, dy) < 2) return;
    arrastre.movio = true;
    const st = estilo.stickers[arrastre.i];
    st.x = arrastre.sx + dx;
    st.y = arrastre.sy + dy;
    acomodar(st);
    arrastre.el.style.left = `${st.x}px`;
    arrastre.el.style.top = `${st.y}px`;
  });
  const soltar = (e) => {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    if (arrastre.movio) {
      historia.push(arrastre.antes);
      cambio();
    }
    arrastre = null;
  };
  escenario.addEventListener("pointerup", soltar);
  escenario.addEventListener("pointercancel", soltar);

  // ---- los botones del sticker elegido ----
  manijas.addEventListener("click", (e) => {
    const b = e.target.closest("[data-accion]");
    const st = estilo.stickers[elegido];
    if (!b || !st) return;
    guardarParaDeshacer();
    const a = b.dataset.accion;
    if (a === "girar") st.r = (st.r + 15) % 360;
    else if (a === "menos") st.s = Math.max(TAM_MIN, Math.round(st.s / 1.18));
    else if (a === "mas") st.s = Math.min(TAM_MAX, Math.round(st.s * 1.18));
    else if (a === "frente") {
      estilo.stickers.push(...estilo.stickers.splice(elegido, 1));
      elegido = estilo.stickers.length - 1;
    } else if (a === "quitar") {
      estilo.stickers.splice(elegido, 1);
      elegido = -1;
      sonar("tocar");
    }
    if (estilo.stickers[elegido]) acomodar(estilo.stickers[elegido]);
    pintarPagina();
    cambio();
  });

  // ---- el panel de la derecha ----
  const muestra = (grupoAttr, id, actual, contenido, titulo) =>
    `<button type="button" class="op-decorar ${id === actual ? "puesto" : ""}" data-${grupoAttr}="${id ?? ""}" aria-pressed="${id === actual}" title="${esc(titulo)}">${contenido}</button>`;

  function pintarPanel() {
    for (const t of contenedor.querySelectorAll(".tab-decorar")) {
      t.classList.toggle("activa", t.dataset.tab === pestana);
      t.setAttribute("aria-selected", String(t.dataset.tab === pestana));
    }
    const panel = $("dec-panel");
    if (pestana === "stickers") {
      const lista = catalogo.stickers.filter((s) => !grupo || s.grupo === grupo);
      panel.innerHTML = `
        <div class="grupos-decorar">${catalogo.grupos
          .map((g) => `<button type="button" class="grupo-decorar ${g.id === grupo ? "activo" : ""}" data-grupo="${esc(g.id)}">${g.html}</button>`)
          .join("")}</div>
        <div class="grilla-decorar">${lista
          .map((s) => `<button type="button" class="celda-sticker" data-poner="${esc(s.id)}" aria-label="${esc(s.nombre || s.id)}">${s.html}</button>`)
          .join("")}</div>
        ${estilo.stickers.length >= MAX_STICKERS ? `<div class="aviso-decorar">That's ${MAX_STICKERS} stickers — the page is full! Remove one to add another.</div>` : ""}`;
    } else if (pestana === "papel") {
      panel.innerHTML = `
        <div class="fila-decorar"><span class="etiqueta-decorar">Paper</span><div class="ops-decorar">
          ${muestra("papel", null, estilo.papel, `<i class="muestra-papel-def"></i>`, "Notebook default")}
          ${PAPELES.map((p) => muestra("papel", p.id, estilo.papel, `<i style="background:${p.color}"></i>`, p.nombre)).join("")}
        </div></div>
        <div class="fila-decorar"><span class="etiqueta-decorar">Tilt</span><div class="ops-decorar">
          ${muestra("giro", null, estilo.giro, `<i class="muestra-giro"></i>`, "As it was")}
          ${muestra("giro", -2, estilo.giro, `<i class="muestra-giro" style="transform:rotate(-6deg)"></i>`, "Left")}
          ${muestra("giro", 0, estilo.giro, `<i class="muestra-giro" style="transform:none"></i>`, "Straight")}
          ${muestra("giro", 2, estilo.giro, `<i class="muestra-giro" style="transform:rotate(6deg)"></i>`, "Right")}
        </div></div>`;
    } else if (pestana === "cinta") {
      panel.innerHTML = `
        <div class="fila-decorar"><span class="etiqueta-decorar">Tape</span><div class="ops-decorar">
          ${muestra("cinta", null, estilo.cinta, `<i class="muestra-cinta muestra-cinta-def"></i>`, "As it was")}
          ${CINTAS.map((c) => muestra("cinta", c.id, estilo.cinta, `<i class="muestra-cinta muestra-cinta-${c.id}">${c.id === "ninguna" ? "none" : ""}</i>`, c.nombre)).join("")}
        </div></div>`;
    } else if (pestana === "tinta") {
      panel.innerHTML = `
        <div class="fila-decorar"><span class="etiqueta-decorar">Ink</span><div class="ops-decorar">
          ${muestra("tinta", null, estilo.tinta, `<i class="muestra-tinta-def">Aa</i>`, "As it was")}
          ${TINTAS.map((t) => muestra("tinta", t.id, estilo.tinta, `<i class="muestra-tinta" style="color:${t.color}">Aa</i>`, t.nombre)).join("")}
        </div></div>
        <div class="nota-decorar">The color of the words you wrote that day.</div>`;
    } else {
      const ent = opts.entrada || {};
      panel.innerHTML = `
        <div class="palabras-decorar">
          ${ent.texto ? `<div class="cita-decorar">“${esc(ent.texto)}”</div>` : `<div class="nota-decorar">You haven't written anything for this day yet.</div>`}
          <button type="button" class="boton" id="dec-palabras">✎ ${ent.texto || ent.animo ? "Edit the words and mood" : "Write this day's page"}</button>
        </div>`;
      $("dec-palabras").addEventListener("click", () => {
        sonar("tocar");
        alPalabras(copia(estilo));
      });
    }
  }

  contenedor.querySelector(".decorar-tabs").addEventListener("click", (e) => {
    const t = e.target.closest("[data-tab]");
    if (!t || t.dataset.tab === pestana) return;
    sonar("tocar");
    pestana = t.dataset.tab;
    pintarPanel();
  });

  $("dec-panel").addEventListener("click", (e) => {
    const g = e.target.closest("[data-grupo]");
    if (g) {
      grupo = g.dataset.grupo;
      sonar("tocar");
      pintarPanel();
      return;
    }
    const p = e.target.closest("[data-poner]");
    if (p) {
      if (estilo.stickers.length >= MAX_STICKERS) {
        sonar("no");
        pintarPanel();
        return;
      }
      const def = porId.get(p.dataset.poner);
      if (!def) return;
      guardarParaDeshacer();
      const s = def.grupo === "extras" ? 30 : def.grupo === "amigos" ? 46 : def.grupo === "lugares" ? 40 : 60;
      const n = estilo.stickers.length;
      const st = { id: def.id, x: ANCHO_PAGINA / 2 + ((n * 23) % 50) - 25, y: 60 + ((n * 17) % 40) - 20, s, r: 0 };
      acomodar(st);
      estilo.stickers.push(st);
      elegido = estilo.stickers.length - 1;
      sonar("tocar");
      pintarPagina();
      if (estilo.stickers.length >= MAX_STICKERS) pintarPanel();
      cambio();
      return;
    }
    for (const campo of ["papel", "cinta", "tinta", "giro"]) {
      const b = e.target.closest(`[data-${campo}]`);
      if (!b) continue;
      const crudo = b.dataset[campo];
      const v = crudo === "" ? null : campo === "giro" ? Number(crudo) : crudo;
      if (estilo[campo] === v) return;
      guardarParaDeshacer();
      estilo[campo] = v;
      sonar("tocar");
      pintarPagina();
      pintarPanel();
      cambio();
      return;
    }
  });

  $("dec-deshacer").addEventListener("click", () => {
    if (!historia.length) return;
    estilo = historia.pop();
    elegido = -1;
    sonar("tocar");
    pintarPagina();
    pintarPanel();
    cambio();
  });
  $("dec-listo").addEventListener("click", () => {
    if (!vivo) return;
    alListo(limpiarEstilo(estilo));
  });

  const alRedimensionar = () => {
    if (vivo) pintarPagina();
  };
  window.addEventListener("resize", alRedimensionar);

  pintarPagina();
  pintarPanel();
  $("dec-deshacer").disabled = true;
  // las imagenes de la pagina pueden cambiar su alto al cargar: se reacomoda una vez
  setTimeout(alRedimensionar, 250);

  return {
    destruir() {
      vivo = false;
      window.removeEventListener("resize", alRedimensionar);
    },
    _estilo: () => copia(estilo), // para los tests
  };
}
