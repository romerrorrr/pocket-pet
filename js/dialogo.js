/**
 * dialogo.js
 * ===========
 * Texto que se escribe letra por letra, como en un RPG de Game Boy. Un
 * toque mientras escribe lo completa; el siguiente toque avanza. Lo
 * usan Baozi (el primer arranque, la busqueda) y todo el final — que
 * nadie se pierda una linea por leer lento, y que nadie la saltee por
 * tocar de nervios.
 */

import * as Sonido from "./sonido.js";

const MS_POR_LETRA = 32;

/**
 * Escribe `texto` dentro de `el`. Devuelve { completar(), escribiendo() }.
 * opts.alTerminar se llama una sola vez cuando el texto queda completo.
 */
export function escribir(el, texto, opts = {}) {
  const { alTerminar = () => {}, sonido = true, velocidad = MS_POR_LETRA } = opts;
  const letras = Array.from(texto);
  let i = 0;
  let timer = 0;
  let listo = false;

  el.textContent = "";
  el.setAttribute("aria-label", texto);

  const terminar = () => {
    if (listo) return;
    listo = true;
    clearTimeout(timer);
    el.textContent = texto;
    alTerminar();
  };

  const paso = () => {
    if (listo) return;
    i += 1;
    el.textContent = letras.slice(0, i).join("");
    const letra = letras[i - 1];
    if (sonido && letra && letra.trim() && i % 2 === 0) Sonido.sonar("tecla");
    if (i >= letras.length) {
      terminar();
      return;
    }
    // pausas naturales en la puntuacion
    const pausa = /[.,!?…—]/.test(letra) ? velocidad * 7 : velocidad;
    timer = setTimeout(paso, pausa);
  };

  if (!letras.length) terminar();
  else timer = setTimeout(paso, 120);

  return {
    completar: terminar,
    escribiendo: () => !listo,
    cancelar: () => {
      listo = true;
      clearTimeout(timer);
    },
  };
}

/** Reemplaza {nombre} y limpia espacios dobles si el nombre esta vacio. */
export function conNombre(texto, nombre) {
  return String(texto || "")
    .replace(/\{nombre\}/g, nombre || "")
    .replace(/\s+([,.!?…])/g, "$1")
    .replace(/^[,\s]+/, "")
    .trim()
    .replace(/^\p{Ll}/u, (c) => c.toUpperCase()); // "friend, take…" -> "Friend, take…"
}
