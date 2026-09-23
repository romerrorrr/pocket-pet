/**
 * arte.js
 * ========
 * Un solo lugar que sabe donde vive el arte. Todo el resto pide
 * arte("menu/menu_feed.png") en vez de armar rutas a mano: asi el
 * preview autocontenido (bundle.py) reemplaza SOLO esta funcion por
 * una que devuelve data URIs, sin reescribir strings por todo el codigo.
 */

export const ART = "assets";

export function arte(rel) {
  return `${ART}/${rel}`;
}
