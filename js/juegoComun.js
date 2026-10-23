/**
 * juegoComun.js
 * ==============
 * v29: lo que comparten los minijuegos nuevos de la tele (torre.js,
 * ritmo.js, bote.js): el record por dificultad, la dificultad elegida, el
 * cartel para elegirla, el lienzo pixel que cubre la pantalla y las
 * imagenes.
 */

export const NOMBRES_DIFICULTAD = { easy: "EASY", normal: "NORMAL", hard: "HARD" };

export function leerRecordDe(clave, dif = null) {
  if (!dif) return Math.max(...Object.keys(NOMBRES_DIFICULTAD).map((d) => leerRecordDe(clave, d)));
  try {
    return Number(localStorage.getItem(`${clave}_${dif}`)) || 0;
  } catch (e) {
    return 0;
  }
}

export function guardarRecordDe(clave, dif, n) {
  try {
    localStorage.setItem(`${clave}_${dif}`, String(n));
  } catch (e) {
    /* nada */
  }
}

export function leerDificultadDe(clave) {
  try {
    const d = localStorage.getItem(`${clave}_dif`);
    return NOMBRES_DIFICULTAD[d] ? d : "normal";
  } catch (e) {
    return "normal";
  }
}

export function guardarDificultadDe(clave, dif) {
  try {
    localStorage.setItem(`${clave}_dif`, dif);
  } catch (e) {
    /* nada */
  }
}

/** El cartel de elegir dificultad (mismo que Snack Rain y la pesca). */
export function htmlDificultad(titulo, clave, actual, unidad = "") {
  return `
    <div class="juego-dificultad" data-cartel-dificultad>
      <div class="juego-dificultad-titulo">${titulo}</div>
      <div class="juego-dificultad-botones">
        ${Object.entries(NOMBRES_DIFICULTAD)
          .map(([id, n]) => `<button class="boton ${id === actual ? "" : "boton-fantasma"}" data-elegir-dificultad="${id}">${n}<small>best ${leerRecordDe(clave, id)}${unidad}</small></button>`)
          .join("")}
      </div>
    </div>`;
}

/** Cablea el cartel: al elegir, guarda la dificultad, saca el cartel y llama alElegir(dif). */
export function cablearDificultad(contenedor, clave, alElegir) {
  for (const b of contenedor.querySelectorAll("[data-elegir-dificultad]")) {
    b.addEventListener("pointerdown", (e) => e.stopPropagation());
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      const dif = b.dataset.elegirDificultad;
      guardarDificultadDe(clave, dif);
      const cartel = contenedor.querySelector("[data-cartel-dificultad]");
      if (cartel) cartel.remove();
      alElegir(dif);
    });
  }
}

/**
 * Un lienzo pixel que cubre el area: ALTO pixeles de alto y el ancho que
 * pida la pantalla (asi nada importante queda cortado en un telefono mas
 * angosto). Devuelve { lienzo, ctx, W, H, escala, medir }.
 */
export function lienzoPixel(area, alto, clase = "juego-lienzo") {
  const lienzo = document.createElement("canvas");
  lienzo.className = clase;
  area.appendChild(lienzo);
  const ctx = lienzo.getContext("2d");
  const r = { lienzo, ctx, W: 0, H: alto, escala: 1 };
  r.medir = () => {
    const caja = area.getBoundingClientRect();
    const w = caja.width || 844;
    const h = caja.height || 390;
    r.escala = h / alto;
    r.W = Math.max(300, Math.round(w / r.escala));
    if (lienzo.width !== r.W || lienzo.height !== alto) {
      lienzo.width = r.W;
      lienzo.height = alto;
    }
    lienzo.style.width = `${r.W * r.escala}px`;
    lienzo.style.height = `${alto * r.escala}px`;
    ctx.imageSmoothingEnabled = false;
  };
  r.medir();
  return r;
}

const cache = {};
export function imagen(src) {
  if (!cache[src]) {
    const i = new Image();
    i.src = src;
    cache[src] = i;
  }
  return cache[src];
}
export const lista = (i) => !!i && i.complete && i.naturalWidth > 0;

/** Texto que sube y se desvanece (el mismo de Snack Rain). xPct/yPct: 0..100 */
export function flotante(capa, texto, xPct, yPct, clase = "") {
  const f = document.createElement("div");
  f.className = `juego-flota ${clase}`;
  f.textContent = texto;
  f.style.left = `${xPct}%`;
  f.style.top = `${yPct}%`;
  capa.appendChild(f);
  setTimeout(() => f.remove(), 700);
}

/** Multiplicador por combo (igual que Snack Rain). */
export function multiplicador(combo) {
  return combo >= 30 ? 4 : combo >= 20 ? 3 : combo >= 10 ? 2 : 1;
}
