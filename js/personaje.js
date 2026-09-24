/**
 * personaje.js
 * =============
 * Con quien juega ella: Baozi (pixel, negro de puas) o Mantou (su gatita
 * blanca, pixel desde el dibujo de rom). Se elige una sola vez, al principio.
 *
 * Los dos comparten los mismos estados y el mismo lienzo (96 px de juego,
 * la cabeza siempre en el mismo lugar: tools/dibujos.py), asi que el resto
 * del juego no necesita saber cual es: pide las capas de una cara con
 * capas(archivoOjo, archivoBoca, pose) y listo.
 *
 * Baozi: cuerpo + ojos + boca en pixel (assets/caras/).
 * Mantou: cuerpo sin cara + una capa de cara, todo en pixel (assets/mantou/,
 *   generado por tools/mantou_pixel.py desde el dibujo de rom).
 */

import { FIGURAS } from "./personajes_datos.js";

const CLAVE = "baozi_personaje";
export const IDS = ["baozi", "mantou"];
export const NOMBRES = { baozi: "Baozi", mantou: "Mantou" };

// Las caras de Mantou que ya existen (assets/mantou/cara_<estado>.png).
// Agregar aca cada una que dibuje rom (y en sw.js).
export const CARAS_MANTOU = new Set(["neutral", "feliz", "euforico", "cansada", "dormida", "triste", "enferma", "comiendo", "aburrido", "asqueado", "asustado", "curioso", "enamorado", "hambriento", "sorprendido"]);
// Mientras falte una cara, la mas parecida que ya exista (y si no, la neutral).
const PARECIDAS = { cansada: "dormida", aburrido: "cansada", decepcionado: "triste", enamorado: "feliz", euforico: "feliz", comiendo: "sorprendido", asustado: "sorprendido", curioso: "sorprendido", hambriento: "neutral", asqueado: "neutral" };

let id = "baozi";
// el accesorio que le regalo un amigo y tiene puesto (amigos.js): o null
let accesorio = null;
try {
  const guardado = localStorage.getItem(CLAVE);
  if (IDS.includes(guardado)) id = guardado;
} catch (e) {
  /* sin almacenamiento: Baozi */
}

export const actual = () => id;
export const esMantou = () => id === "mantou";
export const nombre = (quien = id) => NOMBRES[quien] || "Baozi";
export const figura = (pose = "parado", quien = id) => FIGURAS.personajes[quien][pose === "parado" ? "parado" : "sentado"];
export const estilo = (quien = id) => FIGURAS.personajes[quien].estilo;

export function elegir(nuevo) {
  if (!IDS.includes(nuevo)) return;
  id = nuevo;
  try {
    localStorage.setItem(CLAVE, nuevo);
  } catch (e) {
    /* queda en memoria */
  }
}

export function ponerAccesorio(a) {
  accesorio = typeof a === "string" && /^[a-z]+$/.test(a) ? a : null;
}
export const accesorioPuesto = () => accesorio;

/** Al cargar un guardado (o un backup): lo del guardado manda. */
export function restaurar(desdeGuardado) {
  if (IDS.includes(desdeGuardado)) elegir(desdeGuardado);
}

/** Reemplaza "Baozi" por el nombre del personaje de ella en un texto de la interfaz. */
export function conNombre(texto) {
  return id === "baozi" ? texto : String(texto).replace(/\bBaozi\b/g, nombre());
}

/**
 * Que estado de cara es un par de archivos de Baozi (ojo_*, boca_*).
 * Sirve para Mantou, que tiene una sola capa de cara por estado.
 */
export function estadoDeArchivos(archivoOjo = "", archivoBoca = "") {
  const ojo = archivoOjo.replace(/\.png$/, "");
  const boca = archivoBoca.replace(/\.png$/, "");
  if (ojo === "ojo_dormida") return "dormida";
  if (ojo === "ojo_enferma") return "enferma";
  const esp = ojo.match(/^ojo_especial_(\w+)$/);
  if (esp) return esp[1] === "decepcionado" ? "triste" : esp[1];
  if (boca === "boca_especial_sorprendido") return "comiendo";
  if (ojo === "ojo_base_energia_baja") return "cansada";
  if (boca === "boca_base_feliz") return "feliz";
  if (boca === "boca_base_triste") return "triste";
  return "neutral";
}

/** Archivo de cara de Mantou para un estado (la neutral si todavia no esta dibujada). */
export function caraMantou(estado) {
  let e = estado;
  for (let i = 0; i < 3 && !CARAS_MANTOU.has(e); i++) e = PARECIDAS[e] || "neutral";
  return `mantou/cara_${CARAS_MANTOU.has(e) ? e : "neutral"}.png`;
}

/**
 * Las capas (de abajo hacia arriba) de una cara: [{ src, tipo }].
 * pose: "parado" | "sentado" | "dormido". Rutas relativas a assets/.
 * El personaje de ella lleva arriba de todo su accesorio, si tiene uno puesto.
 */
export function capas(archivoOjo, archivoBoca, pose = "parado", quien = id) {
  const lista = capasBase(archivoOjo, archivoBoca, pose, quien);
  if (accesorio && quien === id) lista.push({ src: `amigos/acc_${accesorio}.png`, tipo: "accesorio" });
  return lista;
}

function capasBase(archivoOjo, archivoBoca, pose, quien) {
  if (quien === "mantou") {
    const cuerpo = pose === "parado" ? "mantou/cuerpo.png" : "mantou/cuerpo_sentado.png";
    return [
      { src: cuerpo, tipo: "cuerpo" },
      { src: caraMantou(estadoDeArchivos(archivoOjo, archivoBoca)), tipo: "cara" },
    ];
  }
  const cuerpo = pose === "dormido" ? "caras/cuerpo_dormido.png" : pose === "sentado" ? "caras/cuerpo_sentado.png" : "caras/cuerpo.png";
  return [
    { src: cuerpo, tipo: "cuerpo" },
    { src: `caras/${archivoOjo}`, tipo: "ojos" },
    { src: `caras/${archivoBoca}`, tipo: "boca" },
  ];
}
