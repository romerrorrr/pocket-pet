/**
 * nuestroMes.js
 * ==============
 * v50: "Our month". El primer dia de cada mes Baozi le entrega un librito
 * del mes que paso: los numeros, como se sintio (un calendario con sus
 * fotos y sus caritas), los lugares nuevos y las fotos. Todo sale de lo
 * que la app ya guardaba (el diario, las fotos, los lugares): no inventa
 * nada.
 *
 * resumenDelMes(mes, datos) es puro (sin DOM): lo usan el librito y los tests.
 * abrirLibrito(contenedor, resumen, opts) arma las paginas.
 */

const MESES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const PUNTOS_ANIMO = { genial: 4, bien: 3, normal: 2, cansada: 1, triste: 1 };
export const ORDEN_ANIMOS = ["genial", "bien", "normal", "cansada", "triste"];

export const nombreDelMes = (mes) => MESES[Number(mes.slice(5, 7)) - 1] || "";
export const mesDe = (clave) => String(clave).slice(0, 7);

/** El mes anterior a una clave de dia ("2026-11-11" -> "2026-10"). */
export function mesAnterior(clave) {
  const [y, m] = clave.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

/** El mes que sigue ("2026-12" -> "2027-01"). */
export function mesSiguiente(mes) {
  const [y, m] = mes.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

const escrita = (e) => !!e && (!!e.animo || !!(e.texto && e.texto.trim()));

/**
 * El resumen de un mes ("AAAA-MM").
 * datos: { entradas: [entradas del diario], fotosDelDia(clave) -> [{ dataUrl }], nombreLugar(id), arteLugar(id), lugares: ids de lugares con sticker }
 * Devuelve null si ese mes casi no hubo nada (menos de 3 dias con algo).
 */
export function resumenDelMes(mes, datos) {
  const { entradas = [], fotosDelDia = () => [], nombreLugar = (id) => id, arteLugar = () => null, conSticker = () => false } = datos;
  const delMes = entradas.filter((e) => e && typeof e.fecha === "string" && e.fecha.startsWith(mes)).sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  const conAlgo = delMes.filter((e) => e.pasos > 0 || (e.lugares || []).length || escrita(e) || e.fotos > 0 || e.cuidados > 0 || e.juegos > 0);
  if (conAlgo.length < 3) return null;

  const [y, m] = mes.split("-").map(Number);
  const diasDelMes = new Date(y, m, 0).getDate();
  const primerDia = (new Date(y, m - 1, 1).getDay() + 6) % 7; // lunes = 0
  const porFecha = new Map(delMes.map((e) => [e.fecha, e]));

  let pasos = 0;
  let paginas = 0;
  let fotos = 0;
  let juegos = 0;
  const lugares = [];
  const amigos = new Set();
  const conteo = { genial: 0, bien: 0, normal: 0, cansada: 0, triste: 0 };
  const dias = [];
  let racha = 0;
  let mejorRacha = 0;
  for (let d = 1; d <= diasDelMes; d++) {
    const clave = `${mes}-${String(d).padStart(2, "0")}`;
    const e = porFecha.get(clave);
    const susFotos = fotosDelDia(clave) || [];
    const nuevos = e ? (e.lugares || []) : [];
    if (e) {
      pasos += e.pasos || 0;
      juegos += e.juegos || 0;
      for (const l of nuevos) if (!lugares.includes(l)) lugares.push(l);
      for (const n of e.npcs || []) amigos.add(n);
      if (escrita(e)) paginas += 1;
      if (e.animo && conteo[e.animo] != null) conteo[e.animo] += 1;
    }
    fotos += susFotos.length;
    racha = e && escrita(e) ? racha + 1 : 0;
    mejorRacha = Math.max(mejorRacha, racha);
    const foto = susFotos.length ? susFotos[0].dataUrl : nuevos.length ? arteLugar(nuevos[0]) : null;
    dias.push({ d, clave, animo: (e && e.animo) || null, foto, propia: !!susFotos.length, sticker: nuevos.find((l) => conSticker(l)) || null });
  }

  // el mejor dia: el mas lindo de animo, con palabras, fotos y lo que ella decoro
  let mejor = null;
  let puntos = -1;
  for (const e of delMes) {
    if (!escrita(e)) continue;
    const st = (e.estilo && e.estilo.stickers && e.estilo.stickers.length) || 0;
    const p = (PUNTOS_ANIMO[e.animo] || 0) * 10 + (e.texto && e.texto.trim() ? 8 : 0) + Math.min(st, 6) * 2 + ((fotosDelDia(e.fecha) || []).length ? 5 : 0) + ((e.lugares || []).length ? 4 : 0);
    if (p > puntos) {
      puntos = p;
      mejor = e;
    }
  }
  const diaMejor = mejor ? dias.find((x) => x.clave === mejor.fecha) : null;
  const mejorDia = mejor
    ? { clave: mejor.fecha, d: Number(mejor.fecha.slice(8)), animo: mejor.animo, texto: (mejor.texto || "").trim(), foto: diaMejor && diaMejor.foto }
    : null;

  // las fotos del mes: hasta 4, de dias distintos y repartidas
  const conFoto = dias.filter((x) => x.foto);
  const elegidas = [];
  if (conFoto.length <= 4) elegidas.push(...conFoto);
  else for (let k = 0; k < 4; k++) elegidas.push(conFoto[Math.round((k * (conFoto.length - 1)) / 3)]);

  const animoMasComun = ORDEN_ANIMOS.reduce((a, b) => (conteo[b] > conteo[a] ? b : a), "bien");
  return {
    mes,
    nombre: nombreDelMes(mes),
    siguiente: nombreDelMes(mesSiguiente(mes)),
    pasos,
    paginas,
    fotos,
    juegos,
    mejorRacha,
    lugares: lugares.map((id) => ({ id, nombre: nombreLugar(id), sticker: conSticker(id) })),
    primerLugar: lugares.length ? nombreLugar(lugares[0]) : null,
    amigos: [...amigos],
    conteo,
    diasConAnimo: ORDEN_ANIMOS.reduce((s, a) => s + conteo[a], 0),
    animoMasComun,
    dias,
    primerDia,
    mejorDia,
    fotosDestacadas: elegidas.map((x) => ({ foto: x.foto, d: x.d, propia: x.propia })),
  };
}

// ------------------------------------------------------------------
// El librito (DOM)
// ------------------------------------------------------------------

const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const mil = (n) => Number(n || 0).toLocaleString("en-US");
const NOMBRE_ANIMO = { genial: "Amazing", bien: "Good", normal: "Okay", cansada: "Tired", triste: "Sad" };
const COLOR_ANIMO = { genial: "rgb(250,190,90)", bien: "rgb(150,206,120)", normal: "rgb(190,200,214)", cansada: "rgb(170,150,210)", triste: "rgb(120,150,200)" };
const corto = (mes, d) => `${nombreDelMes(mes).slice(0, 3).toUpperCase()} ${d}`;

/**
 * opts: { carita(animo) -> html, baozi(cara) -> html, sticker(id) -> src, alCerrar(), sonar(n) }
 * Devuelve { destruir }.
 */
export function abrirLibrito(contenedor, r, opts = {}) {
  const { carita = () => "", baozi = () => "", sticker = () => "", alCerrar = () => {}, sonar = () => {} } = opts;
  const pags = [];
  // 1. portada
  pags.push(`
    <div class="mes-pagina mes-portada">
      <div class="mes-baozi">${baozi("euforico")}</div>
      <div class="mes-texto">
        <div class="mes-titulo">OUR ${esc(r.nombre.toUpperCase())}</div>
        <div class="mes-sub">Baozi made you a little book about our month ♥</div>
        <div class="mes-pista">tap to turn the page ›</div>
      </div>
    </div>`);
  // 2. los numeros
  const chips = [
    [mil(r.pasos), "steps together"],
    [r.lugares.length, r.lugares.length ? `new ${r.lugares.length === 1 ? "place" : "places"} — the first one was ${esc(r.primerLugar)}` : "new places — next month!"],
    [r.paginas, `diary ${r.paginas === 1 ? "page" : "pages"}${r.mejorRacha > 1 ? ` · best streak ${r.mejorRacha} days` : ""}`],
    [r.fotos, `${r.fotos === 1 ? "photo" : "photos"}${r.juegos ? ` · ${r.juegos} ${r.juegos === 1 ? "game" : "games"} played` : ""}`],
  ];
  pags.push(`
    <div class="mes-pagina mes-numeros">
      <div class="mes-baozi chico">${baozi("feliz")}</div>
      <div class="mes-texto">
        <div class="mes-titulo">${esc(r.nombre.toUpperCase())} IN NUMBERS</div>
        <div class="mes-chips">${chips.map(([n, t]) => `<div class="mes-chip papel-chip"><b>${n}</b><span>${t}</span></div>`).join("")}</div>
      </div>
    </div>`);
  // 3. como se sintio
  const celdas =
    ["M", "T", "W", "T", "F", "S", "S"].map((d) => `<div class="mes-dsem">${d}</div>`).join("") +
    `<div></div>`.repeat(r.primerDia) +
    r.dias
      .map(
        (x) => `<div class="mes-dia ${x.foto ? "con-foto" : ""}">
          ${x.foto ? `<img class="mes-dia-foto ${x.propia ? "" : "arte"}" src="${x.foto}" alt="" draggable="false" />` : ""}
          <span class="mes-dia-n">${x.d}</span>
          ${x.animo ? `<span class="mes-dia-cara">${carita(x.animo)}</span>` : ""}
          ${x.sticker ? `<img class="mes-dia-sticker" src="${sticker(x.sticker)}" alt="" draggable="false" />` : ""}
        </div>`,
      )
      .join("");
  const total = r.diasConAnimo || 1;
  const barra = ORDEN_ANIMOS.filter((a) => r.conteo[a])
    .map((a) => `<i style="width:${((r.conteo[a] / total) * 100).toFixed(1)}%;background:${COLOR_ANIMO[a]}"></i>`)
    .join("");
  const leyenda = ORDEN_ANIMOS.filter((a) => r.conteo[a])
    .map((a) => `<span><i style="background:${COLOR_ANIMO[a]}"></i>${NOMBRE_ANIMO[a]} ${r.conteo[a]}</span>`)
    .join("");
  const mejor = r.mejorDia;
  pags.push(`
    <div class="mes-pagina mes-animos">
      <div class="mes-calendario">${celdas}</div>
      <div class="mes-lado">
        <div class="mes-titulo">HOW ${esc(r.nombre.toUpperCase())} FELT</div>
        ${r.diasConAnimo ? `<div class="mes-barra">${barra}</div><div class="mes-leyenda">${leyenda}</div>` : `<div class="mes-sub">You didn't write pages this month — that's okay ♥</div>`}
        ${
          mejor
            ? `<div class="mes-mejor">
                ${mejor.foto ? `<img class="mes-mejor-foto" src="${mejor.foto}" alt="" draggable="false" />` : ""}
                ${mejor.animo ? `<span class="mes-mejor-cara">${carita(mejor.animo)}</span>` : ""}
                <div class="mes-mejor-t"><b>THE BEST DAY · ${esc(nombreDelMes(r.mes).toUpperCase())} ${mejor.d}</b>${mejor.texto ? `“${esc(mejor.texto)}”` : esc(NOMBRE_ANIMO[mejor.animo] || "")}</div>
              </div>`
            : ""
        }
      </div>
    </div>`);
  // 4. los lugares y los amigos
  pags.push(`
    <div class="mes-pagina mes-lugares">
      <div class="mes-texto">
        <div class="mes-titulo">${r.lugares.length ? "WHERE WE WENT" : "OUR LITTLE WORLD"}</div>
        ${
          r.lugares.length
            ? `<div class="mes-stickers">${r.lugares
                .slice(0, 8)
                .map((l) => `<div class="mes-sticker">${l.sticker ? `<img src="${sticker(l.id)}" alt="" draggable="false" />` : `<span class="mes-sin-sticker">✿</span>`}<span>${esc(l.nombre)}</span></div>`)
                .join("")}</div>
               ${r.lugares.length > 8 ? `<div class="mes-sub">…and ${r.lugares.length - 8} more!</div>` : ""}`
            : `<div class="mes-sub">No new places this month. Next month, let's find one together!</div>`
        }
        ${r.amigos.length ? `<div class="mes-sub">${r.amigos.length === 1 ? "A friend came to visit" : `${r.amigos.length} friends came to visit`} ♥</div>` : ""}
      </div>
    </div>`);
  // 5. las fotos
  const pos = [[0, 22, -5], [118, 0, 3], [236, 30, -2], [64, 120, 4]];
  pags.push(`
    <div class="mes-pagina mes-fotos noche">
      <div class="mes-collage">${r.fotosDestacadas
        .map((f, k) => `<figure class="mes-polaroid" style="left:${pos[k][0]}px;top:${pos[k][1]}px;transform:rotate(${pos[k][2]}deg)"><img class="${f.propia ? "" : "arte"}" src="${f.foto}" alt="" draggable="false" /><figcaption>${corto(r.mes, f.d)}</figcaption></figure>`)
        .join("")}</div>
      <div class="mes-texto">
        <div class="mes-titulo">THANK YOU FOR ${esc(r.nombre.toUpperCase())}</div>
        <div class="mes-sub">See you in ${esc(r.siguiente)} ♥ — Baozi</div>
        <button class="boton" type="button" data-mes-cerrar>Close the book</button>
      </div>
    </div>`);

  contenedor.innerHTML = `
    <div class="pantalla-mes" id="pantalla-mes">
      <button class="boton-volver mes-volver" type="button" data-mes-cerrar aria-label="Close">×</button>
      <div class="mes-hoja" id="mes-hoja"></div>
      <div class="mes-puntos">${pags.map((_, i) => `<i data-p="${i}"></i>`).join("")}</div>
    </div>`;
  const hoja = contenedor.querySelector("#mes-hoja");
  let i = 0;
  let vivo = true;
  const mostrar = () => {
    hoja.innerHTML = pags[i];
    for (const p of contenedor.querySelectorAll(".mes-puntos i")) p.classList.toggle("on", Number(p.dataset.p) === i);
  };
  contenedor.querySelector("#pantalla-mes").addEventListener("click", (e) => {
    if (!vivo) return;
    if (e.target.closest("[data-mes-cerrar]")) {
      vivo = false;
      sonar("tocar");
      alCerrar();
      return;
    }
    // tocar la mitad izquierda vuelve, la derecha avanza
    const caja = contenedor.querySelector("#pantalla-mes").getBoundingClientRect();
    const atras = e.clientX < caja.left + caja.width * 0.28 && i > 0;
    const sig = atras ? i - 1 : Math.min(pags.length - 1, i + 1);
    if (sig === i) return;
    i = sig;
    sonar("tocar");
    mostrar();
  });
  mostrar();
  return {
    destruir() {
      vivo = false;
    },
    _pagina: () => i,
  };
}
